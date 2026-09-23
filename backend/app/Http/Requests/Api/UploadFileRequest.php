<?php

declare(strict_types=1);

namespace App\Http\Requests\Api;

use App\Enums\UserRole;
use App\Models\Product;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\File;

class UploadFileRequest extends FormRequest
{
    public function authorize(): bool
    {
        // product-image/uploads are a manager+ action; policy check is model-typed.
        $user = $this->user();

        return $user !== null
            && $user->hasRole(UserRole::Manager, UserRole::Admin)
            && $user->can('update', new Product());
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
