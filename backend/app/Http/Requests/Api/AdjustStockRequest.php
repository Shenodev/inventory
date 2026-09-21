<?php

declare(strict_types=1);

namespace App\Http\Requests\Api;

use App\Enums\StockMovementType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class AdjustStockRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'type' => ['required', Rule::in([
                StockMovementType::In->value,
                StockMovementType::Out->value,
            ])],
            'quantity' => ['required', 'integer', 'min:1', 'max:1000000'],
            'note' => ['nullable', 'string', 'max:255', 'not_regex:/<[^>]*>/'],
        ];
    }

    public function movementType(): StockMovementType
    {
        return StockMovementType::from((string) $this->string('type'));
    }
}
