<?php

namespace App\Http\Controllers;

use App\Models\Player;
use App\Support\Boards;
use App\Support\Names;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class PlayerController extends Controller
{
    /** A new player. The token in the reply is shown once and never again; the browser keeps it. */
    public function store(Request $request): JsonResponse
    {
        $name = Names::clean((string) $request->input('name', ''));
        if ($name !== '' && ! Names::allowed($name)) {
            return response()->json(['message' => 'That name cannot be used. Try 2 to 16 letters or numbers.'], 422);
        }
        $token = Str::random(48);
        $player = Player::create([
            'id' => Str::lower(Str::random(12)),
            'token_hash' => hash('sha256', $token),
            'name' => $name !== '' ? $name : Names::fallback(),
        ]);

        return response()->json(['id' => $player->id, 'name' => $player->name, 'token' => $token], 201);
    }

    public function me(Request $request): JsonResponse
    {
        $player = $request->attributes->get('player');

        return response()->json(['id' => $player->id, 'name' => $player->name]);
    }

    public function rename(Request $request): JsonResponse
    {
        $player = $request->attributes->get('player');
        $name = Names::clean((string) $request->input('name', ''));
        if (! Names::allowed($name)) {
            return response()->json(['message' => 'That name cannot be used. Try 2 to 16 letters or numbers.'], 422);
        }
        $player->update(['name' => $name]);
        Boards::changed();

        return response()->json(['id' => $player->id, 'name' => $player->name]);
    }

    /** Names for a handful of ids, for the places the game shows a player it did not get from a board. */
    public function names(Request $request): JsonResponse
    {
        $ids = array_slice(array_filter(explode(',', (string) $request->query('ids', ''))), 0, 50);

        return response()->json(['names' => Player::whereIn('id', $ids)->pluck('name', 'id')]);
    }
}
