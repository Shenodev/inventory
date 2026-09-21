<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class WebhookController extends Controller
{
    /**
     * Generic webhook receiver — signature already verified by middleware.
     * Logs with sensitive data redacted; never log raw payload secrets.
     */
    public function handle(Request $request): JsonResponse
    {
        $event = $request->header('X-Webhook-Event', 'unknown');

        // Example: validate payload shape, never trust raw input
        $validated = $request->validate([
            'event' => ['sometimes', 'string', 'max:100'],
            'data' => ['sometimes', 'array'],
        ]);

        Log::info('Webhook received', [
            'event' => $event,
            'has_data' => isset($validated['data']),
            // never log full payload if it may contain PII/secrets
        ]);

        return response()->json(['message' => 'Webhook accepted.', 'event' => $event]);
    }
}
