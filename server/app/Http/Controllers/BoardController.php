<?php

namespace App\Http\Controllers;

use App\Models\Entry;
use App\Support\Boards;
use App\Support\Week;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class BoardController extends Controller
{
    /** The top of a board: kind=deep for deepest descents, kind=week for this week's rift, fastest first. */
    public function index(Request $request): JsonResponse
    {
        $kind = $request->query('kind') === 'deep' ? 'deep' : 'week';
        $limit = max(1, min(50, (int) $request->query('limit', 20)));
        $week = preg_match('/^\d{4}-W\d{1,2}$/', (string) $request->query('week')) ? (string) $request->query('week') : Week::key();

        // boards are read far more than written: hold each for a few seconds, and drop them when any score changes
        $version = Boards::stamp();
        $rows = Cache::remember("hd:board:$version:$kind:$week:$limit", 15, function () use ($kind, $week, $limit) {
            // the recorded paths can be 60 KB each: a board only needs to know whether one exists
            $query = Entry::query()
                ->select(['player_id', 'best', 'cls', 'lvl', 'para', 'week', 'time', 'gcls', 'updated_at'])
                ->selectRaw('ghost IS NOT NULL as has_ghost')
                ->with('player:id,name');
            $query = $kind === 'deep'
                ? $query->where('best', '>', 0)->orderByDesc('best')->orderBy('updated_at')
                : $query->where('week', $week)->whereNotNull('time')->orderBy('time')->orderBy('updated_at');

            return $query->limit($limit)->get()->map(fn (Entry $e) => ['id' => $e->player_id, 'name' => $e->player?->name ?? ''] + $e->toGame(false))->all();
        });

        return response()->json(['kind' => $kind, 'week' => $week, 'rows' => $rows]);
    }

    public function status(): JsonResponse
    {
        return response()->json(['ok' => true, 'week' => Week::key()]);
    }
}
