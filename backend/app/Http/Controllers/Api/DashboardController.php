<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Enums\OrderStatus;
use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\OrderItem;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    private const RECENT_SOLD_LIMIT = 5;

    public function __invoke(): JsonResponse
    {
        // The three headline aggregates are answered in a single round trip
        // instead of three, which matters because every request from the
        // serverless runtime needs its own connection to the database.
        $stats = DB::selectOne(
            'select
                (select coalesce(sum(products.total_stock), 0) from products) as total_stock,
                (select coalesce(sum(orders.total), 0) from orders
                    where orders.status = ?) as revenue,
                (select count(*) from orders
                    where orders.status = ?) as reserved_orders',
            [OrderStatus::Sold->value, OrderStatus::Reserved->value],
        );

        $recentlySold = Order::query()
            ->with([
                'customer:id,name',
                'items:id,order_id,product_id,quantity,unit_price',
                'items.product:id,name',
            ])
            ->where('status', OrderStatus::Sold->value)
            ->latest('id')
            ->limit(self::RECENT_SOLD_LIMIT)
            ->get()
            ->map(fn (Order $order): array => [
                'id' => $order->id,
                'customer' => [
                    'id' => $order->customer?->id,
                    'name' => $order->customer?->name,
                ],
                'total' => $order->total,
                'sold_at' => $order->updated_at?->toIso8601String(),
                'items' => $order->items
                    ->map(fn (OrderItem $item): array => [
                        'product_id' => $item->product_id,
                        'product_name' => $item->product?->name,
                        'quantity' => $item->quantity,
                        'unit_price' => $item->unit_price,
                    ])
                    ->all(),
            ])
            ->all();

        return response()->json([
            'total_products_in_stock' => (int) $stats->total_stock,
            'total_revenue' => number_format((float) $stats->revenue, 2, '.', ''),
            'reserved_orders' => (int) $stats->reserved_orders,
            'recently_sold' => $recentlySold,
        ]);
    }
}