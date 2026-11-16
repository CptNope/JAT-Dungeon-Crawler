<?php

return [

    /*
    | Websites allowed to call this API from a browser: wherever the game is served from.
    | Comma-separated origins in HEARTHDEEP_ORIGINS, each as scheme://host with no path or trailing slash.
    | A WordPress page that embeds the game in a frame does not need listing: the frame's own address is what counts.
    */
    'origins' => array_values(array_filter(array_map('trim', explode(',', (string) env('HEARTHDEEP_ORIGINS', 'https://cptnope.github.io'))))),

    // Hero classes the game can send.
    'classes' => ['warrior', 'ranger', 'mage', 'necro'],

    // Bounds a score must sit inside to be believed at all. They catch typos and crude tampering, not a determined cheat.
    'limits' => [
        'best' => 5000,          // deepest depth
        'level' => 60,
        'paragon' => 100000,
        'time_min' => 45,        // seconds: three floors and a guardian cannot be sealed faster than this
        'time_max' => 14400,
        'ghost_chars' => 60000,  // a recorded path, about 4,800 points
    ],

    /*
    | Display names containing any of these (after lower-casing and undoing common letter swaps) are refused.
    | Add to it in HEARTHDEEP_BLOCKED_WORDS, comma-separated; keep the real list out of version control if you prefer.
    */
    'blocked_words' => array_values(array_filter(array_map('trim', explode(',', strtolower((string) env('HEARTHDEEP_BLOCKED_WORDS', 'fuck,shit,cunt,bitch,nigg,fag,rape,nazi,hitler,admin,moderator')))))),

];
