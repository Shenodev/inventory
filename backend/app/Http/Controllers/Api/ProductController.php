<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\AdjustStockRequest;
use App\Models\Product;
use App\Services\InventoryService;
use Illuminate\Http\JsonResponse;

class ProductController extends Controller
{
    public function __construct(private readonly InventoryService $inventory)
    {
    }

    public function index(): JsonResponse
    {
        $products = $this->inventory->productsWithAvailability();

        return response()->json([
            'products' => $products
                ->map(fn (Product $product): array => $this->inventory->present($product))
                ->all(),
        ]);
    }

    public function adjustStock(AdjustStockRequest $request, Product $product): JsonResponse
    {
        ['product' => $updated, 'movement' => $movement] = $this->inventory->adjustStock(
            $product,
            $request->movementType(),
            $request->integer('quantity'),
            $request->string('note')->toString() ?: null,
        );

        return response()->json([
            'message' => 'Stock updated.',
            'product' => $this->inventory->present($updated),
            'movement' => [
                'id' => $movement->id,
                'type' => $movement->type->value,
                'quantity' => $movement->quantity,
                'note' => $movement->note,
                'created_at' => $movement->created_at?->toIso8601String(),
            ],
        ]);
    }
}
