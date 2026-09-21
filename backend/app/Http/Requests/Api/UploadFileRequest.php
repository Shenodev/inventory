<?php

declare(strict_types=1);

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\File;

class UploadFileRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('update', \App\Models\Product::class) ?? false;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            // Strict allowlist: images + csv only, 5 MB cap. Extension proves nothing — mimes + magic bytes checked.
            'file' => ['required', 'file', 'max:5120', 'mimes:jpg,jpeg,png,webp,csv'],
            'purpose' => ['required', 'string', 'in:product_image,import'],
        ];
    }

    public function messages(): array
    {
        return [
            'file.max' => 'File must be smaller than 5 MB.',
        ];
    }
}
