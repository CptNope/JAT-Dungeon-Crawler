<?php

namespace App\Support;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

/**
 * Boards are cached for a few seconds under a stamp. Changing the stamp drops them all at once, on any cache
 * store. (Cache::increment was not used: the database store will not increment a key that does not exist yet.)
 */
class Boards
{
    public static function stamp(): string
    {
        return (string) Cache::get('hd:boards', '0');
    }

    public static function changed(): void
    {
        Cache::forever('hd:boards', Str::random(10));
    }
}
