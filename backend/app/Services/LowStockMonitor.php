<?php

declare(strict_types=1);

namespace App\Services;

use App\Mail\LowStockAlert;
use App\Models\Product;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

/**
 * Sends admin alerts when a product's available stock drops to or below its
 * reorder point. A product is only alerted once per low-stock episode: the
 * timestamp is cleared again once stock is back above the threshold, so a
 * later drop re-alerts.
 */
class LowStockMonitor
{
    public function evaluate(Product $product, int $available): void
    {
        $threshold = $product->min_stock ?? config('inventory.low_stock_threshold');

        if ($available > $threshold) {
            if ($product->low_stock_notified_at !== null) {
                $product->low_stock_notified_at = null;
                $product->save();
            }

            return;
        }

        if ($product->low_stock_notified_at !== null) {
            return;
        }

        try {
            Mail::send(new LowStockAlert($product, $available));
            $product->low_stock_notified_at = now();
            $product->save();
        } catch (\Throwable $e) {
            Log::warning('Low-stock alert failed', [
                'product' => $product->id,
                'error' => $e->getMessage(),
            ]);
        }
    }
}
