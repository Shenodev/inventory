<?php

declare(strict_types=1);

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateProductRequest extends FormRequest
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
        $productId = $this->route('product')?->id ?? $this->route('product');

        return [
            'location' => ['nullable', 'string', 'max:100'],
            'barcode' => ['nullable', 'string', 'max:50', Rule::unique('products', 'barcode')->ignore($productId)],
            'name' => ['sometimes', 'string', 'max:255'],
            'sku' => ['sometimes', 'string', 'max:50', Rule::unique('products', 'sku')->ignore($productId)],
        ];
    }
}
