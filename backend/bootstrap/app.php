<?php

use App\Http\Middleware\EnsureRole;
use App\Http\Middleware\SecurityHeaders;
use App\Http\Middleware\VerifyWebhookSignature;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;

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

        // Never leak stack traces or SQL to clients; always surface the error
        // class/message to the log channel so runtime failures are diagnosable
        // regardless of environment. Only 5xx are intercepted here: 401/403
        // (auth/RBAC) and other 4xx must keep Laravel's default rendering so
        // unauthenticated/forbidden responses carry the correct status.
        $exceptions->render(function (Throwable $e, Request $request): ?JsonResponse {
            if (! $request->is('api/*')) {
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
