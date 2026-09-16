<?php

declare(strict_types=1);

/*
|--------------------------------------------------------------------------
| Cross-Origin Resource Sharing (CORS) Configuration
|--------------------------------------------------------------------------
|
| The single browser frontend is https://inventory.shenodev.tech, so that is
| the only origin allowed to call the API. Local development can add its own
| origin(s) through CORS_ALLOWED_ORIGINS (comma separated) without editing
| this file.
|
*/

$origins = array_values(array_filter(array_map(
    'trim',
    explode(',', (string) env('CORS_ALLOWED_ORIGINS', 'https://inventory.shenodev.tech')),
)));

return [

    'paths' => ['api/*'],

    'allowed_methods' => ['GET', 'POST', 'OPTIONS'],

    'allowed_origins' => $origins,

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['Accept', 'Authorization', 'Content-Type', 'Origin', 'X-Requested-With'],

    'exposed_headers' => [],

    'max_age' => 86400,

    // Authentication uses bearer tokens, never cookies, so credentials
    // (cookies / TLS client certs) must not be sent cross-origin.
    'supports_credentials' => false,

];
