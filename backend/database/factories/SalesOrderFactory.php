<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\SalesOrderStatus;
use App\Models\Customer;
use App\Models\SalesOrder;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<SalesOrder>
 */
class SalesOrderFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'customer_id' => Customer::factory(),
            'status' => SalesOrderStatus::Reserved,
            'total_price' => 0,
        ];
    }

    public function reserved(): static
    {
        return $this->state(fn (): array => ['status' => SalesOrderStatus::Reserved]);
    }

    public function shipped(): static
    {
        return $this->state(fn (): array => ['status' => SalesOrderStatus::Shipped]);
    }

    public function cancelled(): static
    {
        return $this->state(fn (): array => ['status' => SalesOrderStatus::Cancelled]);
    }
}
