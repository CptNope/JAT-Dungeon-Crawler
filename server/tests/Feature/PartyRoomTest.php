<?php

namespace Tests\Feature;

use App\Http\Controllers\RoomController;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PartyRoomTest extends TestCase
{
    use RefreshDatabase;

    private function join(string $name): array
    {
        return $this->postJson('/api/v1/players', ['name' => $name])->assertCreated()->json();
    }

    private function sync(array $who, string $room, array $presence = [], ?int $since = null)
    {
        return $this->withToken($who['token'])->postJson("/api/v1/rooms/$room/sync", ['presence' => $presence, 'since' => $since]);
    }

    public function test_friends_in_a_room_see_each_other_and_where_they_are(): void
    {
        $a = $this->join('Asha');
        $b = $this->join('Brom');
        $this->sync($a, 'abc12', ['cls' => 'mage', 'lvl' => 12, 'sc' => 'town', 'x' => 40.25, 'z' => 31, 'hp' => 80])->assertOk()->assertJsonCount(1, 'peers');
        $peers = $this->sync($b, 'abc12', ['cls' => 'ranger', 'lvl' => 7, 'sc' => 'town', 'x' => 10, 'z' => 12, 'hp' => 100])->assertOk()->json('peers');

        $this->assertSame(['Asha', 'Brom'], array_column($peers, 'name'));
        $this->assertSame($a['id'], $peers[0]['id']);
        $this->assertSame(['cls' => 'mage', 'lvl' => 12, 'sc' => 'town', 'x' => 40.25, 'hp' => 80], array_intersect_key($peers[0]['presence'], array_flip(['cls', 'lvl', 'sc', 'x', 'hp'])));
        $this->sync($a, 'zzz99')->assertOk()->assertJsonCount(1, 'peers'); // another room is another party
    }

    public function test_what_a_browser_sends_is_cleaned(): void
    {
        $a = $this->join('Asha');
        $p = $this->sync($a, 'abc12', ['cls' => 'dragon', 'lvl' => 9999, 'sc' => '<script>', 'x' => -50, 'z' => 'north', 'hp' => 400, 'evil' => 'payload', 'rift' => ['fl' => 2, 'done' => 1, 't' => 88.84]])->assertOk()->json('peers.0.presence');
        $this->assertSame('warrior', $p['cls']);
        $this->assertSame(60, $p['lvl']);
        $this->assertSame('', $p['sc']);
        $this->assertEquals(0, $p['x']);
        $this->assertNull($p['z']);
        $this->assertEquals(100, $p['hp']);
        $this->assertArrayNotHasKey('evil', $p);
        $this->assertEquals(['fl' => 2, 'done' => true, 't' => 88.84], $p['rift']);
        $this->sync($a, 'abc12', ['sc' => 'rift:HD-4-SB-1A2B3C:2'])->assertJsonPath('peers.0.presence.sc', 'rift:HD-4-SB-1A2B3C:2');
    }

    public function test_a_call_to_a_rift_reaches_the_others_once(): void
    {
        $a = $this->join('Asha');
        $b = $this->join('Brom');
        $this->sync($a, 'abc12');
        $cursor = $this->sync($b, 'abc12')->json('cursor');

        $this->withToken($a['token'])->postJson('/api/v1/rooms/abc12/emit', ['data' => ['k' => 'go', 'code' => 'HD-4-SB-1A2B3C']])->assertCreated();
        $this->withToken($a['token'])->postJson('/api/v1/rooms/abc12/emit', ['data' => ['k' => 'done', 't' => 151.26]])->assertCreated();

        $heard = $this->sync($b, 'abc12', [], $cursor)->assertOk()->json();
        $this->assertSame([['k' => 'go', 'code' => 'HD-4-SB-1A2B3C'], ['k' => 'done', 't' => 151.3]], array_column($heard['messages'], 'data'));
        $this->assertSame([$a['id'], $a['id']], array_column($heard['messages'], 'by'));
        $this->sync($b, 'abc12', [], $heard['cursor'])->assertJsonCount(0, 'messages');   // not told twice

        $c = $this->join('Cole');                                                       // a late arrival does not hear old calls
        $this->sync($c, 'abc12')->assertJsonCount(0, 'messages')->assertJsonPath('cursor', $heard['cursor']);
    }

    public function test_only_members_can_speak_and_only_in_the_games_own_words(): void
    {
        $a = $this->join('Asha');
        $b = $this->join('Brom');
        $this->sync($a, 'abc12');
        $this->withToken($b['token'])->postJson('/api/v1/rooms/abc12/emit', ['data' => ['k' => 'done', 't' => 100]])->assertStatus(403);
        foreach ([['k' => 'chat', 'text' => 'hello'], ['k' => 'go', 'code' => '<img src=x>'], ['k' => 'done', 't' => 'fast'], 'plain string'] as $bad) {
            $this->withToken($a['token'])->postJson('/api/v1/rooms/abc12/emit', ['data' => $bad])->assertStatus(422);
        }
        $this->sync($a, 'NOT-A-CODE')->assertStatus(404);
        $this->flushHeaders()->postJson('/api/v1/rooms/abc12/sync', [])->assertStatus(401); // flushHeaders: the test client was still carrying Asha's token
    }

    public function test_leaving_or_going_quiet_takes_you_out_of_the_room(): void
    {
        $a = $this->join('Asha');
        $b = $this->join('Brom');
        $c = $this->join('Cole');
        foreach ([$a, $b, $c] as $p) {
            $this->sync($p, 'abc12');
        }
        $this->withToken($b['token'])->postJson('/api/v1/rooms/abc12/leave')->assertOk();
        $this->assertSame(['Asha', 'Cole'], array_column($this->sync($a, 'abc12')->json('peers'), 'name'));

        \Illuminate\Support\Facades\DB::table('room_members')->where('player_id', $c['id'])->update(['seen_ms' => (int) (microtime(true) * 1000) - 11000]); // Cole closed the tab
        $this->assertSame(['Asha'], array_column($this->sync($a, 'abc12')->json('peers'), 'name'));

        \Illuminate\Support\Facades\DB::table('room_members')->where('player_id', $c['id'])->update(['seen_ms' => 1]);
        $this->assertGreaterThanOrEqual(1, RoomController::sweep());
        $this->assertDatabaseMissing('room_members', ['player_id' => $c['id']]);
    }

    public function test_a_room_holds_eight(): void
    {
        $players = array_map(fn ($i) => $this->join("Delver $i"), range(1, 9));
        foreach (array_slice($players, 0, 8) as $p) {
            $this->sync($p, 'full1')->assertOk();
        }
        $this->sync($players[8], 'full1')->assertStatus(409);
        $this->sync($players[0], 'full1')->assertOk()->assertJsonCount(8, 'peers'); // those inside carry on
    }
}
