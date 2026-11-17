<?php

namespace App\Http\Controllers;

use App\Models\Player;
use App\Support\Boards;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

/**
 * The Daily Rift: one seeded rift a day, the same floors for everyone, fastest time wins.
 *
 * The game works out each day's rift code itself. The server does not repeat that calculation; it files every
 * time under the day and the code it came with, and a board is asked for by day and code. A time sent with a
 * made-up code therefore lands on a board no honest game ever asks for.
 */
class DailyController extends Controller
{
    private const CODE = '/^HD-\d{1,2}-[SBHEGLVDF]{1,3}-[0-9A-Z]{1,8}$/';

    /** Today in UTC as the game writes it, and yesterday: a run begun before midnight may finish after it. */
    public static function days(): array
    {
        $now = CarbonImmutable::now('UTC');

        return [$now->format('Y-n-j'), $now->subDay()->format('Y-n-j')];
    }

    public function index(Request $request): JsonResponse
    {
        $day = preg_match('/^\d{4}-\d{1,2}-\d{1,2}$/', (string) $request->query('day')) ? (string) $request->query('day') : self::days()[0];
        $code = (string) $request->query('code');
        if (! preg_match(self::CODE, $code)) {
            return response()->json(['message' => 'A rift code is needed.'], 422);
        }
        $limit = max(1, min(50, (int) $request->query('limit', 20)));

        $rows = Cache::remember('hd:daily:'.Boards::stamp().":$day:$code:$limit", 15, function () use ($day, $code, $limit) {
            $times = DB::table('daily_times')->where('day', $day)->where('code', $code)->orderBy('time')->orderBy('updated_at')->limit($limit)->get();
            $names = Player::whereIn('id', $times->pluck('player_id'))->pluck('name', 'id');

            return $times->map(fn ($t) => ['id' => $t->player_id, 'name' => $names[$t->player_id] ?? '', 'time' => (float) $t->time, 'cls' => $t->cls, 'lvl' => (int) $t->lvl])->all();
        });

        return response()->json(['day' => $day, 'code' => $code, 'rows' => $rows]);
    }

    /** Send a time for today's rift. Only a faster time replaces the one already held. */
    public function update(Request $request): JsonResponse
    {
        $lim = config('hearthdeep.limits');
        $data = $request->validate([
            'day' => ['required', 'string', Rule::in(self::days())],
            'code' => ['required', 'string', 'regex:'.self::CODE],
            'time' => ['required', 'numeric', 'min:'.$lim['time_min'], 'max:'.$lim['time_max']],
            'cls' => ['required', Rule::in(config('hearthdeep.classes'))],
            'lvl' => ['required', 'integer', 'min:1', 'max:'.$lim['level']],
        ]);
        $me = $request->attributes->get('player');
        $time = round((float) $data['time'], 1);
        $key = ['player_id' => $me->id, 'day' => $data['day'], 'code' => $data['code']];

        $held = DB::table('daily_times')->where($key)->first();
        if (! $held) {
            DB::table('daily_times')->insert($key + ['time' => $time, 'cls' => $data['cls'], 'lvl' => $data['lvl'], 'created_at' => now(), 'updated_at' => now()]);
        } elseif ($time < (float) $held->time) {
            DB::table('daily_times')->where('id', $held->id)->update(['time' => $time, 'cls' => $data['cls'], 'lvl' => $data['lvl'], 'updated_at' => now()]);
        }
        Boards::changed();

        return response()->json(['day' => $data['day'], 'code' => $data['code'], 'time' => $held ? min($time, (float) $held->time) : $time]);
    }
}
