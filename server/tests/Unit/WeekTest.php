<?php

namespace Tests\Unit;

use App\Support\Week;
use Carbon\CarbonImmutable;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

class WeekTest extends TestCase
{
    /** Expected values come from running the game's own weekKey() in JavaScript on the same instants. */
    public static function instants(): array
    {
        return [
            ['2026-01-01T00:00:00Z', '2026-W1'],
            ['2026-01-03T23:59:59Z', '2026-W2'],
            ['2026-01-04T00:00:00Z', '2026-W2'],
            ['2026-11-16T05:25:00Z', '2026-W47'],
            ['2026-12-31T23:59:59Z', '2026-W53'],
            ['2027-01-01T00:00:01Z', '2027-W1'],
            ['2024-02-29T12:00:00Z', '2024-W9'],
            ['2023-01-01T00:00:00Z', '2023-W1'],
            ['2023-01-07T23:59:59.999Z', '2023-W2'],
            ['2023-01-08T00:00:00Z', '2023-W2'],
        ];
    }

    #[DataProvider('instants')]
    public function test_it_matches_the_games_week_key(string $instant, string $expected): void
    {
        $this->assertSame($expected, Week::key(CarbonImmutable::parse($instant)));
    }

    public function test_it_ignores_the_servers_own_time_zone(): void
    {
        $this->assertSame('2026-W2', Week::key(CarbonImmutable::parse('2026-01-03 19:30:00', 'America/New_York')));
    }
}
