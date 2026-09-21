<?php

use App\Http\Middleware\EnsureRole;
use App\Http\Middleware\SecurityHeaders;
use App\Http\Middleware\VerifyWebhookSignature;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;

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

        // Rate limiters (shared store via database/cache when scaled)
        RateLimiter::for('login', function (Request $request) {
            $email = strtolower((string) $request->input('email', ''));
            $key = 'login:'.($email !== '' ? $email : $request->ip());
            return Limit::perMinutes(15, 5)->by($key)->response(function () {
                return response()->json(['message' => 'Too many login attempts. Try again in 15 minutes.'], 429);
            });
        });
        RateLimiter::for('api', function (Request $request) {
            return Limit::perMinute(60)->by($request->user()?->getAuthIdentifier() ?? $request->ip());
        });

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
                    \Illuminate\Support\Facades\Log::error('Unhandled exception', [
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
