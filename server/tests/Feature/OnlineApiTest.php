<?php

namespace Tests\Feature;

use App\Models\Entry;
use App\Models\Player;
use App\Support\Week;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OnlineApiTest extends TestCase
{
    use RefreshDatabase;

    private function join(string $name = ''): array
    {
        return $this->postJson('/api/v1/players', $name === '' ? [] : ['name' => $name])->assertCreated()->json();
    }

    private function send(array $who, array $line)
    {
        return $this->withToken($who['token'])->putJson('/api/v1/me/entry', $line + ['best' => 1, 'cls' => 'mage', 'lvl' => 5, 'para' => 0]);
    }

    public function test_status_reports_the_week(): void
    {
        $r = $this->getJson('/api/v1/status')->assertOk()->assertJson(['ok' => true, 'week' => Week::key()]);
        $this->assertStringContainsString('no-store', (string) $r->headers->get('Cache-Control'));
    }

    public function test_a_player_joins_and_gets_a_token_once(): void
    {
        $p = $this->join('Maren');
        $this->assertSame('Maren', $p['name']);
        $this->assertGreaterThanOrEqual(32, strlen($p['token']));
        $this->assertDatabaseHas('players', ['id' => $p['id'], 'name' => 'Maren']);
        $this->assertDatabaseMissing('players', ['token_hash' => $p['token']]); // only the hash is kept
        $this->withToken($p['token'])->getJson('/api/v1/me')->assertOk()->assertExactJson(['id' => $p['id'], 'name' => 'Maren']);
    }

    public function test_a_player_without_a_name_gets_a_placeholder(): void
    {
        $this->assertMatchesRegularExpression('/^Delver \d{4}$/', $this->join()['name']);
    }

    public function test_bad_names_are_refused(): void
    {
        foreach (['x', 'this name is far too long', '<script>', 'Sh1t Lord', 'Admin'] as $bad) {
            $this->postJson('/api/v1/players', ['name' => $bad])->assertStatus(422);
        }
        $p = $this->join('Brannoc');
        $this->withToken($p['token'])->patchJson('/api/v1/me', ['name' => 'fuckface'])->assertStatus(422);
        $this->withToken($p['token'])->patchJson('/api/v1/me', ['name' => "  O'Dell   the 2nd "])->assertOk()->assertJson(['name' => "O'Dell the 2nd"]);
    }

    public function test_scores_need_a_valid_token(): void
    {
        $this->putJson('/api/v1/me/entry', ['best' => 3, 'cls' => 'mage', 'lvl' => 5])->assertStatus(401);
        $this->withToken(str_repeat('x', 48))->putJson('/api/v1/me/entry', ['best' => 3, 'cls' => 'mage', 'lvl' => 5])->assertStatus(401);
    }

    public function test_depth_only_ever_rises(): void
    {
        $p = $this->join('Deep');
        $this->send($p, ['best' => 12])->assertOk()->assertJsonPath('data.best', 12);
        $this->send($p, ['best' => 7, 'lvl' => 9])->assertOk()->assertJsonPath('data.best', 12)->assertJsonPath('data.lvl', 9);
        $this->send($p, ['best' => 15])->assertOk()->assertJsonPath('data.best', 15);
    }

    public function test_out_of_range_scores_are_refused(): void
    {
        $p = $this->join('Cheat');
        $this->send($p, ['best' => 999999])->assertStatus(422);
        $this->send($p, ['lvl' => 61])->assertStatus(422);
        $this->send($p, ['cls' => 'wizard'])->assertStatus(422);
        $this->send($p, ['week' => Week::key(), 'time' => 3])->assertStatus(422);            // nobody seals a rift in 3 seconds
        $this->send($p, ['week' => Week::key(), 'time' => 200, 'ghost' => 'DROP TABLE'])->assertStatus(422);
    }

    public function test_a_weekly_time_is_kept_only_when_it_is_faster_and_for_this_week(): void
    {
        $p = $this->join('Swift');
        $wk = Week::key();
        $this->send($p, ['week' => $wk, 'time' => 300.44, 'ghost' => '1.10.12,1.11.12', 'gcls' => 'mage'])->assertOk()->assertJsonPath('data.time', 300.4)->assertJsonPath('data.ghost', '1');
        $this->send($p, ['week' => $wk, 'time' => 320, 'ghost' => '1.1.1'])->assertOk()->assertJsonPath('data.time', 300.4);
        $this->send($p, ['week' => '1999-W1', 'time' => 100, 'ghost' => '1.2.2'])->assertOk()->assertJsonPath('data.time', 300.4);
        $this->send($p, ['week' => $wk, 'time' => 250.5, 'ghost' => '1.3.3'])->assertOk()->assertJsonPath('data.time', 250.5);
        $this->getJson("/api/v1/players/{$p['id']}/entry")->assertOk()->assertJson(['exists' => true, 'data' => ['ghost' => '1.3.3', 'gcls' => 'mage', 'week' => $wk]]);
    }

    public function test_a_new_week_clears_last_weeks_time(): void
    {
        $p = $this->join('Old');
        Entry::create(['player_id' => $p['id'], 'best' => 20, 'cls' => 'mage', 'lvl' => 30, 'para' => 0, 'week' => '2001-W5', 'time' => 99.0, 'ghost' => '1.1.1', 'gcls' => 'mage']);
        $this->send($p, ['best' => 20])->assertOk()->assertJsonPath('data.week', Week::key())->assertJsonPath('data.time', null)->assertJsonPath('data.ghost', '');
    }

    public function test_boards_are_ordered_and_carry_names_but_not_ghost_paths(): void
    {
        $wk = Week::key();
        $a = $this->join('Asha');
        $b = $this->join('Brom');
        $c = $this->join('Cole');
        $this->send($a, ['best' => 10, 'week' => $wk, 'time' => 400, 'ghost' => '1.1.1']);
        $this->send($b, ['best' => 30, 'week' => $wk, 'time' => 200, 'ghost' => '1.2.2']);
        $this->send($c, ['best' => 20]);

        $deep = $this->getJson('/api/v1/board?kind=deep')->assertOk()->json('rows');
        $this->assertSame(['Brom', 'Cole', 'Asha'], array_column($deep, 'name'));
        $this->assertSame([30, 20, 10], array_column($deep, 'best'));

        $week = $this->getJson('/api/v1/board?kind=week&week='.$wk)->assertOk()->json('rows');
        $this->assertSame(['Brom', 'Asha'], array_column($week, 'name'));
        $this->assertSame(['1', '1'], array_column($week, 'ghost'));
        $this->assertSame($b['id'], $week[0]['id']);

        // a new score shows up straight away, not after the cache runs out
        $this->send($c, ['best' => 20, 'week' => $wk, 'time' => 100]);
        $this->assertSame('Cole', $this->getJson('/api/v1/board?kind=week')->json('rows.0.name'));
    }

    public function test_names_can_be_looked_up_by_id(): void
    {
        $a = $this->join('Asha');
        $b = $this->join('Brom');
        $this->getJson("/api/v1/players?ids={$a['id']},{$b['id']},nobody")->assertOk()->assertExactJson(['names' => [$a['id'] => 'Asha', $b['id'] => 'Brom']]);
    }

    public function test_an_unknown_player_has_no_entry(): void
    {
        $this->getJson('/api/v1/players/abcdefghijkl/entry')->assertOk()->assertExactJson(['exists' => false, 'data' => null]);
    }

    public function test_only_listed_websites_may_call_the_api_from_a_browser(): void
    {
        $this->getJson('/api/v1/status', ['Origin' => 'https://cptnope.github.io'])->assertHeader('Access-Control-Allow-Origin', 'https://cptnope.github.io');
        // another site is never named in the reply, so its visitors' browsers refuse to hand it the answer
        $other = $this->getJson('/api/v1/status', ['Origin' => 'https://evil.example'])->headers->get('Access-Control-Allow-Origin');
        $this->assertNotSame('https://evil.example', $other);
        $this->assertNotSame('*', $other);
    }

    public function test_the_front_page_answers_without_a_database_session(): void
    {
        $this->get('/')->assertOk()->assertJsonPath('service', 'Hearthdeep online');
        $this->assertSame(0, Player::count());
    }
}
