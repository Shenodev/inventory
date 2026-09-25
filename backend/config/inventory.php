<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Inventory settings
    |--------------------------------------------------------------------------
    |
    | low_stock_threshold is the fallback reorder point used when a product
    | has no explicit min_stock value. It matches the frontend's
    | LOW_STOCK_THRESHOLD so backend alerts and UI badges agree.
    |
    */

    'low_stock_threshold' => (int) env('LOW_STOCK_THRESHOLD', 10),

    /*
    |--------------------------------------------------------------------------
    | API response cache
    |--------------------------------------------------------------------------
    |
    | How long a successful authenticated GET response is served from the
    | cache (Redis) before the database is queried again. A write bumps each
    | user's cache epoch so stale entries are bypassed immediately and simply
    | expire naturally. Keep in sync with the web app's sessionStorage cache
    | (apps/web/src/app/core/http/api-cache.interceptor.ts, 30_000 ms).
    |
    */

    'api_cache_ttl' => (int) env('API_CACHE_TTL', 30),

];
