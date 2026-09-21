<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\AdjustStockRequest;
use App\Http\Requests\Api\UpdateProductRequest;
use App\Models\Product;
use App\Services\InventoryService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProductController extends Controller
{
    public function __construct(private readonly InventoryService $inventory)
    {
    }

    public function index(Request $request): JsonResponse
    {
        $query = $request->string('q')->trim()->toString() ?: null;
        $barcode = $request->string('barcode')->trim()->toString() ?: null;

        if ($barcode !== null && $barcode !== '') {
            $product = Product::query()->where('barcode', $barcode)->first();

            if ($product === null) {
                return response()->json(['products' => []]);
            }

            $found = $this->inventory->productsWithAvailability()->firstWhere('id', $product->id);

            return response()->json([
                'products' => $found ? [$this->inventory->present($found)] : [],
            ]);
        }

        $products = $this->inventory->productsWithAvailability();

        if ($query !== null && $query !== '') {
            $needle = strtolower($query);
            $products = $products->filter(fn (Product $p): bool =>
                str_contains(strtolower($p->name), $needle)
                || str_contains(strtolower($p->sku), $needle)
                || ($p->barcode !== null && str_contains(strtolower($p->barcode), $needle))
                || ($p->location !== null && str_contains(strtolower($p->location), $needle))
            )->values();
        }

        return response()->json([
            'products' => $products
                ->map(fn (Product $product): array => $this->inventory->present($product))
                ->all(),
        ]);
    }

    public function lookup(Request $request): JsonResponse
    {
        $barcode = $request->string('barcode')->trim()->toString();

        if ($barcode === '') {
            return response()->json(['message' => 'barcode is required.'], 422);
        }

        $product = Product::query()->where('barcode', $barcode)->first();

        if ($product === null) {
            // Also try SKU match for flexibility
            $product = Product::query()->where('sku', $barcode)->first();
        }

        if ($product === null) {
            return response()->json(['message' => 'Product not found for barcode.'], 404);
        }

        $hydrated = $this->inventory->productsWithAvailability()->firstWhere('id', $product->id);

        return response()->json([
            'product' => $this->inventory->present($hydrated ?? $product),
        ]);
    }

    public function update(UpdateProductRequest $request, Product $product): JsonResponse
    {
        $validated = $request->validated();

        if (array_key_exists('location', $validated)) {
            $product->location = $validated['location'];
        }

        if (array_key_exists('barcode', $validated)) {
            $product->barcode = $validated['barcode'];
        }

        if (array_key_exists('name', $validated)) {
            $product->name = $validated['name'];
        }

        if (array_key_exists('sku', $validated)) {
            $product->sku = $validated['sku'];
        }

        $product->save();

        $updated = $this->inventory->productsWithAvailability()->firstWhere('id', $product->id) ?? $product;

        return response()->json([
            'message' => 'Product updated.',
            'product' => $this->inventory->present($updated),
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
