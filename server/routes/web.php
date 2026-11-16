<?php

use Illuminate\Support\Facades\Route;

// This server only speaks JSON under /api. The front page says so, for anyone who opens it in a browser.
Route::get('/', fn () => response()->json([
    'service' => 'Hearthdeep online',
    'api' => url('/api/v1/status'),
    'play' => 'https://cptnope.github.io/JAT-Dungeon-Crawler/',
]));
