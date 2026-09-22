<?php

use App\Http\Middleware\EnsureRole;
use App\Http\Middleware\SecurityHeaders;
use App\Http\Middleware\VerifyWebhookSignature;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->throttleApi();

        // Global security headers on every response
        $middleware->append(SecurityHeaders::class);

        // Named aliases for RBAC and webhook verification
        $middleware->alias([
            'role' => EnsureRole::class,
            'webhook.signature' => VerifyWebhookSignature::class,
        ]);

        // Rate limiters are registered in AppServiceProvider::boot() where the
        // facade root is available. They cannot be registered here because this
        // closure runs while the HTTP kernel is being resolved, before the
        // application has bootstrapped facades.

        // This is an API-only application. Laravel defaults guests to the "login"
        // named route, which does not exist here, so the auth middleware would
        // blow up while building the redirect instead of returning a 401.
        $middleware->redirectGuestsTo(fn (): ?string => null);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request, Throwable $e): bool => $request->is('api/*') || $request->expectsJson(),
        );

        // Never leak stack traces or SQL to clients in production
        $exceptions->render(function (Throwable $e, Request $request) {
            if ($request->is('api/*') && app()->environment('production')) {
                $status = method_exists($e, 'getStatusCode') ? $e->getStatusCode() : 500;
                if ($status >= 500) {
                    Log::error('Unhandled exception', [
                        'exception' => $e->getMessage(),
                        'path' => $request->path(),
                        // never log sensitive payload
                    ]);

                    return response()->json(['message' => 'Internal server error.'], 500);
                }
            }

            return null;
        });
    })->create();
