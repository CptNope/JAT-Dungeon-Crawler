<?php

use App\Http\Controllers\BoardController;
use App\Http\Controllers\EntryController;
use App\Http\Controllers\PlayerController;
use App\Http\Controllers\RoomController;
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

    // Party rooms. Each player asks about twice a second, so the limit is counted per player, not per address:
    // friends on the same Wi-Fi share one address.
    Route::middleware([PlayerToken::class, 'throttle:party'])->prefix('rooms/{code}')->where(['code' => '[a-z0-9]{5}'])->group(function () {
        Route::post('sync', [RoomController::class, 'sync']);
        Route::post('emit', [RoomController::class, 'emit'])->middleware('throttle:party-talk');
        Route::post('leave', [RoomController::class, 'leave']);
    });
});
