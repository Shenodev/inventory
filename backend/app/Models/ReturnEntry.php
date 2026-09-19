<?php

declare(strict_types=1);

namespace App\Models;

use Database\Factories\ReturnEntryFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $sales_order_id
 * @property int $product_id
 * @property int $quantity
 * @property string|null $reason
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read SalesOrder $salesOrder
 * @property-read Product $product
 */
class ReturnEntry extends Model
{
    /** @use HasFactory<ReturnEntryFactory> */
    use HasFactory;

    /**
     * The PHP keyword `return` cannot be used as a class name, so the model is
     * named ReturnEntry while persisting to the `returns` table.
     *
     * @var string
     */
    protected $table = 'returns';

    /** @var list<string> */
    protected $fillable = [
        'sales_order_id',
        'product_id',
        'quantity',
        'reason',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'quantity' => 'integer',
        ];
    }

    /**
     * @return BelongsTo<SalesOrder, $this>
     */
    public function salesOrder(): BelongsTo
    {
        return $this->belongsTo(SalesOrder::class);
    }

    /**
     * @return BelongsTo<Product, $this>
     */
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}
