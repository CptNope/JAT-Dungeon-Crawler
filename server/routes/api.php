<?php

use App\Http\Controllers\BoardController;
use App\Http\Controllers\EntryController;
use App\Http\Controllers\PlayerController;
use App\Http\Middleware\PlayerToken;
use Illuminate\Support\Facades\Route;

// Hearthdeep's online API. Limits are per visitor address: generous for play, tight for making new players.
Route::prefix('v1')->group(function () {
    Route::middleware('throttle:120,1')->group(function () {
        Route::get('status', [BoardController::class, 'status']);
        Route::get('board', [BoardController::class, 'index']);
        Route::get('players', [PlayerController::class, 'names']);
        Route::get('players/{id}/entry', [EntryController::class, 'show'])->where('id', '[a-z0-9]{6,16}');
    });

    Route::post('players', [PlayerController::class, 'store'])->middleware('throttle:12,60');

    Route::middleware([PlayerToken::class, 'throttle:40,1'])->group(function () {
        Route::get('me', [PlayerController::class, 'me']);
        Route::patch('me', [PlayerController::class, 'rename']);
        Route::put('me/entry', [EntryController::class, 'update']);
    });
});
