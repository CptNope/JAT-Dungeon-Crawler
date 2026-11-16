<?php

// Browsers only let the game talk to this server from the origins listed in HEARTHDEEP_ORIGINS (see config/hearthdeep.php).
return [
    'paths' => ['api/*'],
    'allowed_methods' => ['GET', 'POST', 'PUT', 'PATCH', 'OPTIONS'],
    'allowed_origins' => array_values(array_filter(array_map('trim', explode(',', (string) env('HEARTHDEEP_ORIGINS', 'https://cptnope.github.io'))))),
    'allowed_origins_patterns' => [],
    'allowed_headers' => ['Content-Type', 'Authorization', 'Accept'],
    'exposed_headers' => [],
    'max_age' => 86400,
    'supports_credentials' => false,
];
