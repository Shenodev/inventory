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

];
