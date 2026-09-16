<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Enums\OrderStatus;
use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use Illuminate\Http\JsonResponse;

class DashboardController extends Controller
{
    private const RECENT_SOLD_LIMIT = 5;

    public function __invoke(): JsonResponse
    {
        $totalProductsInStock = (int) Product::query()->sum('total_stock');

        $totalRevenue = (float) Order::query()
            ->where('status', OrderStatus::Sold->value)
            ->sum('total');

        $reservedOrders = Order::query()
            ->where('status', OrderStatus::Reserved->value)
            ->count();

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
            'total_products_in_stock' => $totalProductsInStock,
            'total_revenue' => number_format($totalRevenue, 2, '.', ''),
            'reserved_orders' => $reservedOrders,
            'recently_sold' => $recentlySold,
        ]);
    }
}
