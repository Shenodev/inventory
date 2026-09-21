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

    'allowed_methods' => ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],

    'allowed_origins' => $origins,

    'allowed_origins_patterns' => [],

    // Keep header allowlist tight — Authorization for Bearer, Content-Type for JSON,
    // X-Requested-With for legacy, plus webhook signature headers
    'allowed_headers' => ['Accept', 'Authorization', 'Content-Type', 'Origin', 'X-Requested-With', 'X-Webhook-Signature', 'X-Webhook-Timestamp', 'X-Webhook-Event'],

    'exposed_headers' => ['X-RateLimit-Limit', 'X-RateLimit-Remaining'],

    'max_age' => 86400,

    // Refresh token is httpOnly cookie; cross-origin cookie needs credentials.
    // Origins are strictly allowlisted above, never "*".
    'supports_credentials' => true,

];
