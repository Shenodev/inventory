<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Enums\OrderStatus;
use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\OrderItem;
use Illuminate\Http\JsonResponse;

class OrderController extends Controller
{
    public function reserved(): JsonResponse
    {
        return $this->linesFor(OrderStatus::Reserved, 'reserved');
    }

    public function sold(): JsonResponse
    {
        return $this->linesFor(OrderStatus::Sold, 'sold');
    }

    private function linesFor(OrderStatus $status, string $key): JsonResponse
    {
        $orders = Order::query()
            ->with([
                'customer:id,name',
                'items.product:id,name,total_stock',
            ])
            ->where('status', $status->value)
            ->latest('created_at')
            ->latest('id')
            ->get();

        $lines = $orders
            ->flatMap(fn (Order $order) => $order->items->map(fn (OrderItem $item): array => [
                'order_id' => $order->id,
                'ordered_at' => $order->created_at?->toIso8601String(),
                'customer_name' => $order->customer?->name,
                'product_id' => $item->product_id,
                'product_name' => $item->product?->name,
                'quantity' => $item->quantity,
                'price' => $item->unit_price,
                'line_total' => number_format((float) $item->unit_price * $item->quantity, 2, '.', ''),
                'remaining_stock' => $item->product?->total_stock,
            ]))
            ->values()
            ->all();

        return response()->json([$key => $lines]);
    }
}
