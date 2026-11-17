<?php

namespace Tests\Feature;

use App\Http\Controllers\DailyController;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class DailyRiftTest extends TestCase
{
    use RefreshDatabase;

    private const CODE = 'HD-4-SB-1A2B3C';

    private function join(string $name): array
    {
        return $this->postJson('/api/v1/players', ['name' => $name])->assertCreated()->json();
    }

    private function send(array $who, float $time, array $over = [])
    {
        return $this->withToken($who['token'])->putJson('/api/v1/me/daily', $over + ['day' => DailyController::days()[0], 'code' => self::CODE, 'time' => $time, 'cls' => 'mage', 'lvl' => 20]);
    }

    private function board(string $code = self::CODE, ?string $day = null): array
    {
        return $this->getJson('/api/v1/daily?code='.$code.($day ? '&day='.$day : ''))->assertOk()->json('rows');
    }

    public function test_todays_board_is_fastest_first_and_keeps_each_players_best(): void
    {
        $a = $this->join('Asha');
        $b = $this->join('Brom');
        $this->send($a, 300.26)->assertOk()->assertJsonPath('time', 300.3);
        $this->send($b, 200)->assertOk();
        $this->send($a, 350)->assertOk()->assertJsonPath('time', 300.3);   // slower: the held time stands
        $this->assertSame([['Brom', 200.0], ['Asha', 300.3]], array_map(fn ($r) => [$r['name'], (float) $r['time']], $this->board()));
        $this->send($a, 150.5)->assertOk();                                 // faster: replaces it, and shows at once
        $rows = $this->board();
        $this->assertSame(['Asha', 'Brom'], array_column($rows, 'name'));
        $this->assertSame(['id', 'name', 'time', 'cls', 'lvl'], array_keys($rows[0]));
        $this->assertDatabaseCount('daily_times', 2);
    }

    public function test_times_are_filed_by_day_and_code(): void
    {
        $a = $this->join('Asha');
        $this->send($a, 100, ['code' => 'HD-4-EG-ZZZZZZ'])->assertOk();    // not the code honest games ask for
        $this->assertSame([], $this->board());
        $this->assertCount(1, $this->board('HD-4-EG-ZZZZZZ'));
        $this->send($a, 120, ['day' => DailyController::days()[1]])->assertOk(); // a run begun yesterday evening
        $this->assertSame([], $this->board());
        $this->assertCount(1, $this->board(self::CODE, DailyController::days()[1]));
    }

    public function test_bad_or_stale_times_are_refused(): void
    {
        $a = $this->join('Asha');
        $this->send($a, 100, ['day' => '2020-1-1'])->assertStatus(422);      // not today or yesterday
        $this->send($a, 5)->assertStatus(422);                                // impossibly fast
        $this->send($a, 100, ['code' => 'DROP TABLE'])->assertStatus(422);
        $this->send($a, 100, ['cls' => 'wizard'])->assertStatus(422);
        $this->flushHeaders()->putJson('/api/v1/me/daily', ['day' => DailyController::days()[0], 'code' => self::CODE, 'time' => 100, 'cls' => 'mage', 'lvl' => 5])->assertStatus(401);
        $this->getJson('/api/v1/daily')->assertStatus(422);                   // a board needs a code
        $this->getJson('/api/v1/status')->assertJsonPath('daily', true);
    }

    public function test_old_days_are_pruned_and_removed_players_take_their_times_with_them(): void
    {
        $a = $this->join('Asha');
        $b = $this->join('Brom');
        $this->send($a, 100)->assertOk();
        $this->send($b, 110)->assertOk();
        DB::table('daily_times')->where('player_id', $a['id'])->update(['created_at' => now()->subDays(20)]);
        $this->artisan('hearthdeep:prune')->expectsOutputToContain('Removed 1 Daily Rift time')->assertExitCode(0);
        $this->assertSame(['Brom'], array_column($this->board(), 'name'));
        $this->artisan('hearthdeep:remove', ['id' => $b['id']])->assertExitCode(0);
        $this->assertSame([], $this->board());
    }
}
