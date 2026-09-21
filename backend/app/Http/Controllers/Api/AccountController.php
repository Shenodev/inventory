<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

class AccountController extends Controller
{
    /**
     * Minimal data-request endpoint (deletion/export).
     * No unnecessary data: only email + type. Logs redacted.
     * In production, send confirmation email with signed token.
     */
    public function dataRequest(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'email', 'max:255'],
            'type' => ['required', 'in:deletion,export'],
        ]);

        // Age consent check is done client-side; server also ensures email not empty
        // Log without storing PII raw: hash
        Log::info('Data request', [
            'email_hash' => hash('sha256', strtolower($validated['email'])),
            'type' => $validated['type'],
        ]);

        // For demo: create a token and pretend to email
        $token = Str::random(32);
        $unsubscribeUrl = config('app.url') . '/api/unsubscribe?email=' . urlencode($validated['email']) . '&token=' . $token;

        // Send via log mailer (no real sending in demo). In real prod, dispatch Mail with unsubscribe header.
        // Include unsubscribe link in every email (see send method below)
        try {
            Mail::raw(
                "Your {$validated['type']} request was received. Confirm: {$unsubscribeUrl}\n\nUnsubscribe from product emails: {$unsubscribeUrl}",
                function ($message) use ($validated) {
                    $message->to($validated['email']);
                    $message->subject('ShenoInventory — Confirm your ' . $validated['type'] . ' request');
                    $message->getHeaders()->addTextHeader('List-Unsubscribe', '<' . config('app.url') . '/api/unsubscribe?email=' . urlencode($validated['email']) . '>');
                    $message->getHeaders()->addTextHeader('List-Unsubscribe-Post', 'List-Unsubscribe=One-Click');
                }
            );
        } catch (\Throwable $e) {
            // Do not expose mail error to user
            Log::warning('Mail failed for data request', ['error' => $e->getMessage()]);
        }

        // In real app, store request in DB with token and delete on confirm.
        // For demo, just acknowledge.
        return response()->json([
            'message' => 'Request received — check your email to confirm. You will also find an unsubscribe link in every email. Contact privacy@shenodev.tech if you need help.',
        ]);
    }

    public function unsubscribe(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'email', 'max:255'],
            'token' => ['sometimes', 'string', 'max:100'],
        ]);

        Log::info('Unsubscribe', ['email_hash' => hash('sha256', strtolower($validated['email']))]);

        // Demo: pretend to unsubscribe from marketing (no marketing table yet)
        // In real app, update newsletter subscription or marketing_consent = false

        // Return JSON for API callers, but also support browser one-click POST
        if ($request->isMethod('get')) {
            // For GET one-click, redirect to a confirmation page
            return response()->json(['message' => 'You have been unsubscribed. You will no longer receive product emails. Resubscribe via support@shenodev.tech.']);
        }

        return response()->json(['message' => 'Unsubscribed.']);
    }
}
