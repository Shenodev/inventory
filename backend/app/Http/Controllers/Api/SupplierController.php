<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\StoreSupplierRequest;
use App\Http\Requests\Api\UpdateSupplierRequest;
use App\Models\Supplier;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;

class SupplierController extends Controller
{
    public function index(): JsonResponse
    {
        $suppliers = Supplier::query()
            ->withCount('purchaseOrders as purchase_order_count')
            ->orderBy('name')
            ->get();

        return response()->json([
            'suppliers' => $suppliers
                ->map(fn (Supplier $supplier): array => $this->present($supplier))
                ->all(),
        ]);
    }

    public function store(StoreSupplierRequest $request): JsonResponse
    {
        $supplier = Supplier::query()
            ->create($request->validated())
            ->loadCount('purchaseOrders as purchase_order_count');

        return response()->json([
            'message' => 'Supplier created.',
            'supplier' => $this->present($supplier),
        ], JsonResponse::HTTP_CREATED);
    }

    public function show(Supplier $supplier): JsonResponse
    {
        $supplier->loadCount('purchaseOrders as purchase_order_count');

        return response()->json([
            'supplier' => $this->present($supplier),
        ]);
    }

    public function update(UpdateSupplierRequest $request, Supplier $supplier): JsonResponse
    {
        $supplier = tap($supplier, function (Supplier $supplier) use ($request): void {
            $supplier->update($request->validated());
        })->loadCount('purchaseOrders as purchase_order_count');

        return response()->json([
            'message' => 'Supplier updated.',
            'supplier' => $this->present($supplier),
        ]);
    }

    public function destroy(Supplier $supplier): JsonResponse
    {
        try {
            $supplier->delete();
        } catch (QueryException $e) {
            if ((string) ($e->errorInfo[1] ?? '') === '1451') {
                return response()->json([
                    'message' => "Cannot delete supplier #{$supplier->id}: it has purchase orders attached.",
                ], JsonResponse::HTTP_CONFLICT);
            }

            throw $e;
        }

        return response()->json([
            'message' => 'Supplier deleted.',
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function present(Supplier $supplier): array
    {
        return [
            'id' => $supplier->id,
            'name' => $supplier->name,
            'email' => $supplier->email,
            'phone' => $supplier->phone,
            'purchase_order_count' => (int) $supplier->purchase_order_count,
            'created_at' => $supplier->created_at?->toIso8601String(),
            'updated_at' => $supplier->updated_at?->toIso8601String(),
        ];
    }
}
