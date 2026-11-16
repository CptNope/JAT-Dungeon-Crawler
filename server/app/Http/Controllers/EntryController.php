<?php

namespace App\Http\Controllers;

use App\Models\Entry;
use App\Support\Week;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Validation\Rule;

class EntryController extends Controller
{
    /** One player's line in full, ghost path included. */
    public function show(string $id): JsonResponse
    {
        $entry = Entry::find($id);

        return $entry
            ? response()->json(['exists' => true, 'data' => $entry->toGame(true)])
            : response()->json(['exists' => false, 'data' => null]);
    }

    /**
     * The game sends its whole line after a run. The server decides what to keep: depth only ever rises, a
     * weekly time is kept only if it is for the week the server says it is and beats the stored one, and a
     * new week clears last week's time.
     */
    public function update(Request $request): JsonResponse
    {
        $lim = config('hearthdeep.limits');
        $classes = config('hearthdeep.classes');
        $data = $request->validate([
            'best' => ['required', 'integer', 'min:0', 'max:'.$lim['best']],
            'cls' => ['required', Rule::in($classes)],
            'lvl' => ['required', 'integer', 'min:1', 'max:'.$lim['level']],
            'para' => ['nullable', 'integer', 'min:0', 'max:'.$lim['paragon']],
            'week' => ['nullable', 'string', 'regex:/^\d{4}-W\d{1,2}$/'],
            'time' => ['nullable', 'numeric', 'min:'.$lim['time_min'], 'max:'.$lim['time_max']],
            'ghost' => ['nullable', 'string', 'max:'.$lim['ghost_chars'], 'regex:/^[0-9.,\-]*$/'],
            'gcls' => ['nullable', Rule::in([...$classes, ''])],
        ]);

        $player = $request->attributes->get('player');
        $now = Week::key();
        $entry = Entry::firstOrNew(['player_id' => $player->id]);

        $entry->best = max((int) $entry->best, (int) $data['best']);
        $entry->cls = $data['cls'];
        $entry->lvl = (int) $data['lvl'];
        $entry->para = (int) ($data['para'] ?? 0);
        if ($entry->week !== $now) {
            $entry->week = $now;
            $entry->time = null;
            $entry->ghost = null;
            $entry->gcls = null;
        }
        $time = isset($data['time']) ? round((float) $data['time'], 1) : null;
        if ($time !== null && ($data['week'] ?? '') === $now && ($entry->time === null || $time < $entry->time)) {
            $entry->time = $time;
            $entry->ghost = ($data['ghost'] ?? '') !== '' ? $data['ghost'] : null;
            $entry->gcls = ($data['gcls'] ?? '') !== '' ? $data['gcls'] : $data['cls'];
        }
        $entry->save();
        Cache::increment('hd:boards');

        return response()->json(['exists' => true, 'data' => $entry->toGame(false)]);
    }
}
