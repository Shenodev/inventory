<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class VerifyWebhookSignature
{
    /**
     * Verify HMAC-SHA256 webhook signature.
     * Expects header X-Webhook-Signature: sha256=<hex> and env WEBHOOK_SECRET.
     * Use with ->middleware('webhook.signature')
     */
    public function handle(Request $request, Closure $next): Response
    {
        $secret = (string) config('app.webhook_secret', env('WEBHOOK_SECRET', ''));

        if ($secret === '') {
            // No secret configured -> reject all webhook calls in production
            if (app()->environment('production')) {
                return response()->json(['message' => 'Webhook not configured.'], 503);
            }
            return $next($request);
        }

        $signature = $request->header('X-Webhook-Signature', '');
        $payload = $request->getContent();

        // Expect sha256=<hex>
        $expected = 'sha256=' . hash_hmac('sha256', $payload, $secret);

        if ($signature === '' || ! hash_equals($expected, $signature)) {
            return response()->json(['message' => 'Invalid webhook signature.'], 401);
        }

        // Optional timestamp replay protection
        $timestamp = $request->header('X-Webhook-Timestamp');
        if ($timestamp !== null && is_numeric($timestamp)) {
            $age = time() - (int) $timestamp;
            if ($age < -300 || $age > 300) {
                return response()->json(['message' => 'Webhook timestamp out of range.'], 401);
            }
        }

        return $next($request);
    }
}
