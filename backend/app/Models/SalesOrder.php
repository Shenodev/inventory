<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\SalesOrderStatus;
use Database\Factories\SalesOrderFactory;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $customer_id
 * @property SalesOrderStatus $status
 * @property string $total_price
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Customer $customer
 * @property-read Collection<int, SalesOrderItem> $items
 * @property-read Collection<int, ReturnEntry> $returns
 * @property-read Collection<int, Transaction> $transactions
 */
class SalesOrder extends Model
{
    /** @use HasFactory<SalesOrderFactory> */
    use HasFactory;

    /** @var list<string> */
    protected $fillable = [
        'customer_id',
        'status',
        'total_price',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'status' => SalesOrderStatus::class,
            'total_price' => 'decimal:2',
        ];
    }

    /**
     * @return BelongsTo<Customer, $this>
     */
    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    /**
     * @return HasMany<SalesOrderItem, $this>
     */
    public function items(): HasMany
    {
        return $this->hasMany(SalesOrderItem::class, 'so_id');
    }

    /**
     * @return HasMany<ReturnEntry, $this>
     */
    public function returns(): HasMany
    {
        return $this->hasMany(ReturnEntry::class);
    }

    /**
     * @return MorphMany<Transaction, $this>
     */
    public function transactions(): MorphMany
    {
        return $this->morphMany(Transaction::class, 'reference');
    }

    public function isReserved(): bool
    {
        return $this->status === SalesOrderStatus::Reserved;
    }

    public function isShipped(): bool
    {
        return $this->status === SalesOrderStatus::Shipped;
    }

    public function isCancelled(): bool
    {
        return $this->status === SalesOrderStatus::Cancelled;
    }
}
