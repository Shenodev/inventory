<?php

declare(strict_types=1);

namespace App\Providers;

use App\Models\Product;
use App\Policies\FinancialPolicy;
use App\Policies\ProductPolicy;
use App\Support\AivenSsl;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Str;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        AivenSsl::applyCaCertificate();

        $this->configureRateLimiting();
        $this->registerPolicies();
    }

    private function configureRateLimiting(): void
    {
        RateLimiter::for('api', function (Request $request): Limit {
            $key = (string) ($request->user()?->getAuthIdentifier() ?? $request->ip());

            return Limit::perMinute(60)->by($key);
        });

        RateLimiter::for('login', function (Request $request): Limit {
            $email = Str::lower((string) $request->input('email'));

            return Limit::perMinutes(15, 5)
                ->by($email.'|'.$request->ip())
                ->response(fn (Request $request, array $headers): JsonResponse => response()->json(
                    ['message' => 'Too many login attempts. Try again in 15 minutes.'],
                    JsonResponse::HTTP_TOO_MANY_REQUESTS,
                    $headers,
                ));
        });
    }

    private function registerPolicies(): void
    {
        Gate::policy(Product::class, ProductPolicy::class);
        // FinancialPolicy is checked via Gate::allows('viewOverview') explicitly
        Gate::define('viewFinancials', fn (\App\Models\User $user) => (new FinancialPolicy())->viewOverview($user));
    }
}
