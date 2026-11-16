<?php

namespace App\Support;

use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;

/**
 * The game's week label, e.g. "2026-W47". It must match weekKey() in src/5f-modes.js exactly, because the
 * Weekly Rift's floors are seeded from it: this is a port of that formula, quirks included, not ISO-8601 weeks.
 */
class Week
{
    public static function key(?CarbonInterface $at = null): string
    {
        $d = CarbonImmutable::instance($at ?? now())->utc();
        $jan1 = CarbonImmutable::create($d->year, 1, 1, 0, 0, 0, 'UTC');
        $days = ($d->getTimestampMs() - $jan1->getTimestampMs()) / 86400000;
        $week = (int) ceil(($days + $jan1->dayOfWeek + 1) / 7);

        return $d->year.'-W'.$week;
    }
}
