<?php

namespace App\Support;

/** Display names: what is allowed on a public leaderboard. */
class Names
{
    /** Tidy a name the way it will be stored: trimmed, single spaces. */
    public static function clean(string $name): string
    {
        return trim((string) preg_replace('/\s+/u', ' ', $name));
    }

    /** Letters, digits, spaces and a little punctuation; 2 to 16 characters; nothing from the blocked list. */
    public static function allowed(string $name): bool
    {
        if (! preg_match("/^[\\p{L}\\p{N}][\\p{L}\\p{N} '._-]{1,15}$/u", $name)) {
            return false;
        }
        $plain = strtr(mb_strtolower($name), ['0' => 'o', '1' => 'i', '3' => 'e', '4' => 'a', '5' => 's', '7' => 't', '@' => 'a', '$' => 's']);
        $plain = (string) preg_replace('/[^\p{L}]/u', '', $plain);
        foreach (config('hearthdeep.blocked_words', []) as $word) {
            if ($word !== '' && str_contains($plain, $word)) {
                return false;
            }
        }

        return true;
    }

    /** What a player is called until they choose a name. */
    public static function fallback(): string
    {
        return 'Delver '.random_int(1000, 9999);
    }
}
