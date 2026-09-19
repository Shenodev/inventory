<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\StoreCustomerRequest;
use App\Models\Customer;
use Illuminate\Http\JsonResponse;

class CustomerController extends Controller
{
    public function index(): JsonResponse
    {
        $customers = Customer::query()
            ->withCount('salesOrders as sales_order_count')
            ->orderBy('name')
            ->get();

        return response()->json([
            'customers' => $customers
                ->map(fn (Customer $customer): array => $this->present($customer))
                ->all(),
        ]);
    }

    public function store(StoreCustomerRequest $request): JsonResponse
    {
        $customer = Customer::query()
            ->create($request->validated())
            ->loadCount('salesOrders as sales_order_count');

        return response()->json([
            'message' => 'Customer created.',
            'customer' => $this->present($customer),
        ], JsonResponse::HTTP_CREATED);
    }

    /**
     * @return array<string, mixed>
     */
    private function present(Customer $customer): array
    {
        return [
            'id' => $customer->id,
            'name' => $customer->name,
            'email' => $customer->email,
            'phone' => $customer->phone,
            'sales_order_count' => (int) $customer->sales_order_count,
            'created_at' => $customer->created_at?->toIso8601String(),
            'updated_at' => $customer->updated_at?->toIso8601String(),
        ];
    }
}
