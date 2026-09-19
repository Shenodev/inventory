<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\TransactionType;
use Database\Factories\TransactionFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property TransactionType $type
 * @property string $amount
 * @property string|null $reference_type
 * @property int|null $reference_id
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Model|null $reference
 */
class Transaction extends Model
{
    /** @use HasFactory<TransactionFactory> */
    use HasFactory;

    /** @var list<string> */
    protected $fillable = [
        'type',
        'amount',
        'reference_type',
        'reference_id',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'type' => TransactionType::class,
            'amount' => 'decimal:2',
        ];
    }

    /**
     * @return MorphTo<Model, $this>
     */
    public function reference(): MorphTo
    {
        return $this->morphTo();
    }
}
