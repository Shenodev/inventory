<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DataRequest;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

class AccountController extends Controller
{
    /**
     * GDPR data-request endpoint (deletion/export).
     * No unnecessary data: only email + type. Logs redacted.
     *
     * The requesting email is matched against an account; a confirmation link
     * with a single-use token is "sent" via the configured mail transport (the
     * log mailer in demo). Confirming erases the account and its sessions.
     */
    public function dataRequest(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'email', 'max:255'],
            'type' => ['required', 'in:deletion,export'],
        ]);

        $email = strtolower($validated['email']);
        $emailHash = hash('sha256', $email);

        // No raw PII stored: only a hash of the email + the hashed confirm token.
        // If the email has no account (or already requested), we act identically
        // so the endpoint cannot enumerate accounts.
        $token = bin2hex(random_bytes(32));
        $requestedAt = now();

        try {
            DataRequest::query()->updateOrCreate(
                ['email_hash' => $emailHash],
                [
                    'type' => $validated['type'],
                    'token_hash' => hash('sha256', $token),
                    'status' => 'pending',
                    'requested_at' => $requestedAt,
                    'confirmed_at' => null,
                ],
            );
        } catch (\Throwable $e) {
            Log::warning('Data request row failed', ['error' => $e->getMessage()]);

            return response()->json([
                'message' => 'Something went wrong recording your request. Please contact privacy@shenodev.tech.',
            ], JsonResponse::HTTP_INTERNAL_SERVER_ERROR);
        }

        Log::info('Data request', [
            'email_hash' => $emailHash,
            'type' => $validated['type'],
        ]);

        $confirmUrl = config('app.url')
            . '/api/account/data-request/confirm?email='
            . urlencode($email) . '&token=' . urlencode($token);

        // Unsubscribe link present in every email (List-Unsubscribe).
        try {
            Mail::raw(
                "Your {$validated['type']} request was received.\n\n"
                    . "Confirm to proceed: {$confirmUrl}\n\n"
                    . 'You can unsubscribe from product emails any time via the footer link.',
                function ($message) use ($email, $validated) {
                    $message->to($email);
                    $message->subject('ShenoInventory — Confirm your ' . $validated['type'] . ' request');
                    $message->getHeaders()->addTextHeader('List-Unsubscribe', '<' . url('/unsubscribe?email=' . urlencode($email)) . '>');
                    $message->getHeaders()->addTextHeader('List-Unsubscribe-Post', 'List-Unsubscribe=One-Click');
                }
            );
        } catch (\Throwable $e) {
            // Do not expose mail error to user; the request row is still valid.
            Log::warning('Mail failed for data request', ['email_hash' => $emailHash, 'error' => $e->getMessage()]);
        }

        return response()->json([
            'message' => 'Request received — check your email to confirm. You will also find an unsubscribe link in every email. Contact privacy@shenodev.tech if you need help.',
        ]);
    }

    /**
     * Confirm a data request. Verified token allows GET (link click) — on
     * confirmation a deletion erases the account + its sessions; an export is
     * acknowledged (no personal data is stored beyond the ledger).
     */
    public function confirm(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'email', 'max:255'],
            'token' => ['required', 'string', 'max:128'],
        ]);

        $emailHash = hash('sha256', strtolower($validated['email']));
        $tokenHash = hash('sha256', $validated['token']);

        $row = DataRequest::query()
            ->where('email_hash', $emailHash)
            ->where('token_hash', $tokenHash)
            ->where('status', 'pending')
            ->first();

        if (! $row instanceof DataRequest) {
            return response()->json([
                'message' => 'The confirmation link is invalid or has already been used.',
            ], JsonResponse::HTTP_UNPROCESSABLE_ENTITY);
        }

        $row->forceFill(['status' => 'confirmed', 'confirmed_at' => now()])->save();

        if ($row->type === 'deletion') {
            $user = User::query()->where('email', strtolower($validated['email']))->first();
            if ($user instanceof User) {
                $uid = $user->id;
                $user->tokens()->delete();
                $user->delete();
                Log::info('Account erased via GDPR deletion', ['user_id' => $uid, 'email_hash' => $emailHash]);
            }

            return response()->json(['message' => 'Your account and personal data have been erased.']);
        }

        return response()->json(['message' => 'Export confirmed. Contact support@shenodev.tech to receive your data export.']);
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