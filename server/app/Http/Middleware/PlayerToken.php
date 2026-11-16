<?php

namespace App\Http\Middleware;

use App\Models\Player;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/** Finds the player a request's bearer token belongs to, or answers 401. */
class PlayerToken
{
    public function handle(Request $request, Closure $next): Response
    {
        $token = (string) $request->bearerToken();
        $player = strlen($token) >= 32 ? Player::where('token_hash', hash('sha256', $token))->first() : null;
        if (! $player) {
            return response()->json(['message' => 'Unknown or missing player token.'], 401);
        }
        $request->attributes->set('player', $player);

        return $next($request);
    }
}
