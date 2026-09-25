<?php

use App\Http\Middleware\CacheApiReads;
use App\Http\Middleware\EnsureRole;
use App\Http\Middleware\SecurityHeaders;
use App\Http\Middleware\VerifyWebhookSignature;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;
use Laravel\Sanctum\Http\Middleware\CheckAbilities;
use Laravel\Sanctum\Http\Middleware\CheckForAnyAbility;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->throttleApi();

        // Requests reach us through Vercel's proxy; trust its forwarded proto
        // headers so isSecure()/Secure cookies and client IPs behave correctly.
        $middleware->trustProxies(at: '*');

        // Global security headers on every response
        $middleware->append(SecurityHeaders::class);

        // Named aliases for RBAC and webhook verification
        $middleware->alias([
            'role' => EnsureRole::class,
            'webhook.signature' => VerifyWebhookSignature::class,
            'cache.reads' => CacheApiReads::class,
            'abilities' => CheckAbilities::class,
            'ability' => CheckForAnyAbility::class,
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

        // Only 5xx are intercepted here: 401/403 (auth/RBAC), 422 (validation)
        // and other 4xx must keep their default rendering so the correct status
        // code survives to the client. HttpResponseException carries a fully
        // rendered response (e.g. the custom 429 from the login limiter or a
        // validation error), so hand it back untouched.
        $exceptions->render(function (Throwable $e, Request $request): ?Response {
            if (! $request->is('api/*')) {
                return null;
            }

            if ($e instanceof HttpResponseException) {
                return $e->getResponse();
            }

            if ($e instanceof ValidationException) {
                return null;
            }

            if ($e instanceof HttpExceptionInterface) {
                $status = $e->getStatusCode();
            } elseif ($e instanceof AuthenticationException) {
                $status = 401;
            } elseif ($e instanceof AuthorizationException) {
                $status = 403;
            } else {
                $status = 500;
            }

            if ($status < 500) {
                return null;
            }

            try {
                Log::error('Unhandled exception', [
                    'class' => get_class($e),
                    'exception' => $e->getMessage(),
                    'file' => $e->getFile(),
                    'line' => $e->getLine(),
                    'path' => $request->path(),
                    // never log sensitive payload
                ]);
            } catch (Throwable $logError) {
                // A broken log channel must never supersede the real
                // error response or mask the original exception.
            }

            return response()->json(['message' => 'Internal server error.'], 500);
        });
    })->create();
