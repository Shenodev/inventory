<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\OrderStatus;
use App\Models\Customer;
use App\Models\Order;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Order>
 */
class OrderFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'customer_id' => Customer::factory(),
            'status' => OrderStatus::Reserved,
            'total' => 0,
        ];
    }

    public function reserved(): static
    {
        return $this->state(fn (): array => ['status' => OrderStatus::Reserved]);
    }

    public function sold(): static
    {
        return $this->state(fn (): array => ['status' => OrderStatus::Sold]);
    }
}
