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
            'location' => ['nullable', 'string', 'max:100', 'not_regex:/<[^>]*>/'],
            'barcode' => ['nullable', 'string', 'max:50', 'regex:/^[A-Za-z0-9\-]+$/', Rule::unique('products', 'barcode')->ignore($productId)],
            'name' => ['sometimes', 'string', 'max:255', 'not_regex:/<[^>]*>/'],
            'sku' => ['sometimes', 'string', 'max:50', 'regex:/^[A-Z0-9\-]+$/i', Rule::unique('products', 'sku')->ignore($productId)],
        ];
    }
}
