<?php

namespace App\Http\Controllers;

use App\Models\Player;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Party rooms: a handful of friends who share a five-character code, see each other walking the village and the
 * same rift, and can call each other into a rift. Each browser asks "who is here and what was said?" about twice
 * a second and says where it is in the same request, so this runs on ordinary PHP with no WebSocket server.
 * Players still fight their own monsters; nothing here touches combat or scores.
 */
class RoomController extends Controller
{
    private const ALIVE_MS = 10000;     // not heard from for this long: gone

    private const MAX_MEMBERS = 8;

    /** Say where I am; hear who else is here and anything said since I last asked. */
    public function sync(Request $request, string $code): JsonResponse
    {
        $me = $request->attributes->get('player');
        $now = (int) floor(microtime(true) * 1000);
        $alive = $now - self::ALIVE_MS;

        $mine = DB::table('room_members')->where('room', $code)->where('player_id', $me->id)->first();
        if (! $mine || $mine->seen_ms < $alive) {
            $others = DB::table('room_members')->where('room', $code)->where('seen_ms', '>=', $alive)->where('player_id', '!=', $me->id)->count();
            if ($others >= self::MAX_MEMBERS) {
                return response()->json(['message' => 'That party is full.'], 409);
            }
        }
        DB::table('room_members')->updateOrInsert(
            ['room' => $code, 'player_id' => $me->id],
            ['presence' => json_encode($this->presence($request->input('presence'))), 'seen_ms' => $now],
        );

        $members = DB::table('room_members')->where('room', $code)->where('seen_ms', '>=', $alive)->orderBy('id')->limit(self::MAX_MEMBERS + 1)->get();
        $names = Player::whereIn('id', $members->pluck('player_id'))->pluck('name', 'id');

        // the first call hears nothing old: it is told where "now" is and asks from there next time
        $since = $request->input('since');
        if ($since === null) {
            $cursor = (int) DB::table('room_messages')->where('room', $code)->max('id');
            $messages = collect();
        } else {
            $messages = DB::table('room_messages')->where('room', $code)->where('id', '>', (int) $since)->orderBy('id')->limit(50)->get();
            $cursor = $messages->isEmpty() ? (int) $since : (int) $messages->last()->id;
        }

        if (random_int(1, 40) === 1) {
            $this->sweep($now);
        }

        return response()->json([
            'peers' => $members->map(fn ($m) => ['id' => $m->player_id, 'name' => $names[$m->player_id] ?? '', 'age' => max(0, $now - (int) $m->seen_ms), 'presence' => json_decode((string) $m->presence, true) ?: (object) []])->values(),
            'messages' => $messages->map(fn ($m) => ['id' => $m->id, 'by' => $m->player_id, 'data' => json_decode($m->data, true)])->values(),
            'cursor' => $cursor,
        ]);
    }

    /** Say something to the room. Only the two things the game says are accepted. */
    public function emit(Request $request, string $code): JsonResponse
    {
        $me = $request->attributes->get('player');
        $data = $request->input('data');
        $kind = is_array($data) ? ($data['k'] ?? null) : null;
        if ($kind === 'go' && is_string($data['code'] ?? null) && preg_match('/^HD-\d{1,2}-[SBHEGLVDF]{1,3}-[0-9A-Z]{1,8}$/', $data['code'])) {
            $clean = ['k' => 'go', 'code' => $data['code']];           // "come into this rift"
        } elseif ($kind === 'done' && is_numeric($data['t'] ?? null) && $data['t'] > 0 && $data['t'] < 100000) {
            $clean = ['k' => 'done', 't' => round((float) $data['t'], 1)]; // "I sealed it in this long"
        } else {
            return response()->json(['message' => 'Not something a party can say.'], 422);
        }
        $now = (int) floor(microtime(true) * 1000);
        $member = DB::table('room_members')->where('room', $code)->where('player_id', $me->id)->where('seen_ms', '>=', $now - self::ALIVE_MS)->exists();
        if (! $member) {
            return response()->json(['message' => 'You are not in that party.'], 403);
        }
        $id = DB::table('room_messages')->insertGetId(['room' => $code, 'player_id' => $me->id, 'data' => json_encode($clean), 'sent_ms' => $now]);

        return response()->json(['id' => $id], 201);
    }

    public function leave(Request $request, string $code): JsonResponse
    {
        DB::table('room_members')->where('room', $code)->where('player_id', $request->attributes->get('player')->id)->delete();

        return response()->json(['ok' => true]);
    }

    /** Clear out members and messages nobody will ask about again. */
    public static function sweep(?int $now = null): int
    {
        $now ??= (int) floor(microtime(true) * 1000);

        return DB::table('room_members')->where('seen_ms', '<', $now - 60000)->delete()
            + DB::table('room_messages')->where('sent_ms', '<', $now - 120000)->delete();
    }

    /** Keep only the fields the game draws from, each inside sane bounds. Everything else a client sends is dropped. */
    private function presence(mixed $in): array
    {
        if (! is_array($in)) {
            return [];
        }
        $num = fn ($v, $lo, $hi) => is_numeric($v) ? max($lo, min($hi, round((float) $v, 2))) : null;
        $out = [
            'cls' => in_array($in['cls'] ?? null, config('hearthdeep.classes'), true) ? $in['cls'] : 'warrior',
            'lvl' => (int) ($num($in['lvl'] ?? 1, 1, config('hearthdeep.limits.level')) ?? 1),
            'para' => (int) ($num($in['para'] ?? 0, 0, config('hearthdeep.limits.paragon')) ?? 0),
            'sc' => is_string($in['sc'] ?? null) && preg_match('/^(town|rift:[A-Za-z0-9-]{1,24}:\d{1,2})$/', $in['sc']) ? $in['sc'] : '',
            'x' => $num($in['x'] ?? null, 0, 200),
            'z' => $num($in['z'] ?? null, 0, 200),
            'f' => $num($in['f'] ?? null, -7, 7),
            'vx' => $num($in['vx'] ?? 0, -20, 20) ?? 0,   // tiles a second: lets the others draw this hero where they are by now
            'vz' => $num($in['vz'] ?? 0, -20, 20) ?? 0,
            'hp' => $num($in['hp'] ?? null, 0, 100),
            'rift' => null,
        ];
        if (is_array($in['rift'] ?? null)) {
            $out['rift'] = ['fl' => (int) ($num($in['rift']['fl'] ?? 1, 1, 99) ?? 1), 'done' => (bool) ($in['rift']['done'] ?? false), 't' => $num($in['rift']['t'] ?? null, 0, 100000)];
        }

        return $out;
    }
}
