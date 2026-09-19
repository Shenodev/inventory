<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Enums\PurchaseOrderStatus;
use App\Enums\SalesOrderStatus;
use App\Enums\TransactionType;
use App\Models\Customer;
use App\Models\Product;
use App\Models\PurchaseOrder;
use App\Models\PurchaseOrderItem;
use App\Models\ReturnEntry;
use App\Models\SalesOrder;
use App\Models\SalesOrderItem;
use App\Models\Supplier;
use App\Models\Transaction;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class ExpansionSeeder extends Seeder
{
    /**
     * @var list<array{name: string, email: string, phone: string}>
     */
    private const SUPPLIERS = [
        ['name' => 'Northwind Manufacturing', 'email' => 'purchasing@northwind-supply.com', 'phone' => '+1-206-555-0198'],
        ['name' => 'Aurora Importers', 'email' => 'sales@aurora-imports.com', 'phone' => '+1-312-555-0147'],
        ['name' => 'Blue Harbor Wholesale', 'email' => 'orders@blueharbor.ca', 'phone' => '+1-604-555-0132'],
        ['name' => 'Cascade Distribution Co.', 'email' => 'hello@cascade-distribution.com', 'phone' => '+1-503-555-0115'],
        ['name' => 'Iron Peak Traders', 'email' => 'trade@ironpeaktraders.co.uk', 'phone' => '+44-20-5555-0145'],
        ['name' => 'Summit Logistics Supplies', 'email' => 'info@summit-supplies.de', 'phone' => '+49-89-5555-0123'],
        ['name' => 'Apex Goods Group', 'email' => 'reorders@apexgoods.com', 'phone' => '+1-646-555-0167'],
        ['name' => 'Terra Materials Ltd', 'email' => 'contact@terramaterials.com.au', 'phone' => '+61-2-5555-0142'],
    ];

    /**
     * @var list<string>
     */
    private const RETURN_REASONS = [
        'Damaged during delivery',
        'Wrong item shipped',
        'Customer changed mind',
        'Defective product',
        'Size / variant mismatch',
    ];

    /**
     * Generic ledger entries with no order reference.
     *
     * @var list<array{type: TransactionType, amount: float}>
     */
    private const OPERATING_TRANSACTIONS = [
        ['type' => TransactionType::Expense, 'amount' => 1850.00],
        ['type' => TransactionType::Expense, 'amount' => 420.75],
        ['type' => TransactionType::Expense, 'amount' => 1290.00],
        ['type' => TransactionType::Income, 'amount' => 960.00],
    ];

    public function run(): void
    {
        if (PurchaseOrder::query()->exists() || SalesOrder::query()->exists()) {
            $this->command?->warn('Expansion tables already contain data; skipping ExpansionSeeder.');

            return;
        }

        /** @var Collection<int, Product> $products */
        $products = Product::query()->get();

        /** @var Collection<int, Customer> $customers */
        $customers = Customer::query()->get();

        if ($products->isEmpty() || $customers->isEmpty()) {
            $this->command?->error('Products and customers must be seeded before ExpansionSeeder can run.');

            return;
        }

        DB::transaction(function () use ($products, $customers): void {
            $this->seedSuppliers();

            $purchaseOrders = $this->seedPurchaseOrders($products);
            $salesOrders = $this->seedSalesOrders($customers, $products);

            $this->seedReturns($salesOrders);

            $this->seedTransactions($purchaseOrders, $salesOrders);
        });

        $this->command?->info(sprintf(
            'Expansion data seeded: %d suppliers, %d purchase orders, %d sales orders, %d returns, %d transactions.',
            Supplier::query()->count(),
            PurchaseOrder::query()->count(),
            SalesOrder::query()->count(),
            ReturnEntry::query()->count(),
            Transaction::query()->count(),
        ));
    }

    private function seedSuppliers(): void
    {
        foreach (self::SUPPLIERS as $supplier) {
            Supplier::query()->updateOrCreate(
                ['email' => $supplier['email']],
                [
                    'name' => $supplier['name'],
                    'phone' => $supplier['phone'],
                ],
            );
        }
    }

    /**
     * @param  Collection<int, Product>  $products
     * @return Collection<int, PurchaseOrder>
     */
    private function seedPurchaseOrders(Collection $products): Collection
    {
        $statuses = array_merge(
            array_fill(0, 7, PurchaseOrderStatus::Received),
            array_fill(0, 3, PurchaseOrderStatus::Pending),
        );

        shuffle($statuses);

        $mapped = collect($statuses)->map(function (PurchaseOrderStatus $status) use ($products): PurchaseOrder {
            $supplier = Supplier::query()->inRandomOrder()->firstOrFail();
            $placedAt = now()->subDays(random_int(0, 120))->subMinutes(random_int(0, 1439));

            $selections = [];
            $total = 0.0;

            foreach ($this->pick($products, 1, 4) as $product) {
                /** @var Product $product */
                $quantity = random_int(20, 120);
                $unitCost = round((float) $product->price * fake()->randomFloat(2, 0.55, 0.70), 2);

                $selections[] = ['product' => $product, 'quantity' => $quantity, 'unitCost' => $unitCost];
                $total += $unitCost * $quantity;
            }

            $purchaseOrder = PurchaseOrder::query()->create([
                'supplier_id' => $supplier->id,
                'status' => $status,
                'total_cost' => round($total, 2),
                'created_at' => $placedAt,
                'updated_at' => $placedAt,
            ]);

            foreach ($selections as $selection) {
                PurchaseOrderItem::query()->create([
                    'po_id' => $purchaseOrder->id,
                    'product_id' => $selection['product']->id,
                    'quantity' => $selection['quantity'],
                    'unit_cost' => $selection['unitCost'],
                    'created_at' => $placedAt,
                    'updated_at' => $placedAt,
                ]);
            }

            return $purchaseOrder;
        });

        return new Collection($mapped->all());
    }

    /**
     * @param  Collection<int, Customer>  $customers
     * @param  Collection<int, Product>  $products
     * @return Collection<int, SalesOrder>
     */
    private function seedSalesOrders(Collection $customers, Collection $products): Collection
    {
        $statuses = array_merge(
            array_fill(0, 5, SalesOrderStatus::Shipped),
            array_fill(0, 4, SalesOrderStatus::Reserved),
            array_fill(0, 3, SalesOrderStatus::Cancelled),
        );

        shuffle($statuses);

        $mapped = collect($statuses)->map(function (SalesOrderStatus $status) use ($customers, $products): SalesOrder {
            $customer = $customers->random();
            $placedAt = now()->subDays(random_int(0, 90))->subMinutes(random_int(0, 1439));

            $selections = [];
            $total = 0.0;

            foreach ($this->pick($products, 1, 5) as $product) {
                /** @var Product $product */
                $quantity = random_int(1, 8);

                $selections[] = ['product' => $product, 'quantity' => $quantity];
                $total += (float) $product->price * $quantity;
            }

            $salesOrder = SalesOrder::query()->create([
                'customer_id' => $customer->id,
                'status' => $status,
                'total_price' => round($total, 2),
                'created_at' => $placedAt,
                'updated_at' => $placedAt,
            ]);

            foreach ($selections as $selection) {
                SalesOrderItem::query()->create([
                    'so_id' => $salesOrder->id,
                    'product_id' => $selection['product']->id,
                    'quantity' => $selection['quantity'],
                    'unit_price' => $selection['product']->price,
                    'created_at' => $placedAt,
                    'updated_at' => $placedAt,
                ]);
            }

            return $salesOrder;
        });

        return new Collection($mapped->all());
    }

    /**
     * @param  Collection<int, SalesOrder>  $salesOrders
     */
    private function seedReturns(Collection $salesOrders): void
    {
        $shipped = $salesOrders->filter(fn (SalesOrder $salesOrder): bool => $salesOrder->isShipped());

        foreach ($shipped->random(min(5, $shipped->count())) as $salesOrder) {
            $item = $salesOrder->items->random();
            $quantity = random_int(1, min(3, max(1, $item->quantity)));

            ReturnEntry::query()->create([
                'sales_order_id' => $salesOrder->id,
                'product_id' => $item->product_id,
                'quantity' => $quantity,
                'reason' => fake()->randomElement(self::RETURN_REASONS),
            ]);
        }
    }

    /**
     * @param  Collection<int, PurchaseOrder>  $purchaseOrders
     * @param  Collection<int, SalesOrder>  $salesOrders
     */
    private function seedTransactions(Collection $purchaseOrders, Collection $salesOrders): void
    {
        $salesOrders
            ->filter(fn (SalesOrder $salesOrder): bool => $salesOrder->isShipped())
            ->each(function (SalesOrder $salesOrder): void {
                Transaction::query()->create([
                    'type' => TransactionType::Income,
                    'amount' => $salesOrder->total_price,
                    'reference_type' => $salesOrder->getMorphClass(),
                    'reference_id' => $salesOrder->id,
                ]);
            });

        $purchaseOrders
            ->filter(fn (PurchaseOrder $purchaseOrder): bool => $purchaseOrder->isReceived())
            ->each(function (PurchaseOrder $purchaseOrder): void {
                Transaction::query()->create([
                    'type' => TransactionType::Expense,
                    'amount' => $purchaseOrder->total_cost,
                    'reference_type' => $purchaseOrder->getMorphClass(),
                    'reference_id' => $purchaseOrder->id,
                ]);
            });

        foreach (self::OPERATING_TRANSACTIONS as $transaction) {
            Transaction::query()->create($transaction);
        }
    }

    /**
     * @template T of \Illuminate\Database\Eloquent\Model
     *
     * @param  Collection<int, T>  $collection
     * @return Collection<int, T>
     */
    private function pick(Collection $collection, int $min, int $max): Collection
    {
        /** @var Collection<int, T>|T $picked */
        $picked = $collection->random(random_int($min, $max));

        return $picked instanceof Collection ? $picked : collect([$picked]);
    }
}
