<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\TransactionType;
use App\Models\SalesOrder;
use App\Models\Transaction;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Transaction>
 */
class TransactionFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'type' => fake()->randomElement(TransactionType::cases()),
            'amount' => fake()->randomFloat(2, 10, 5000),
            'reference_type' => SalesOrder::class,
            'reference_id' => SalesOrder::factory(),
        ];
    }

    public function income(): static
    {
        return $this->state(fn (): array => ['type' => TransactionType::Income]);
    }

    public function expense(): static
    {
        return $this->state(fn (): array => ['type' => TransactionType::Expense]);
    }
}
