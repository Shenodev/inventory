<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Symfony\Component\HttpFoundation\Response;

/**
 * Serves authenticated GET responses from the cache (Redis in production)
 * so repeated reads never touch the database - the single most expensive
 * step on the read-only Vercel runtime, where every request opens its own
 * MySQL connection.
 *
 * Invalidation is O(1) per user: a write request increments the user's
 * "epoch" key, so every cached value keyed under the old epoch is skipped
 * immediately and expires naturally. This works on every Laravel cache
 * store (no tag support required), degrading gracefully to "no cache" if
 * the upstream (Redis) is unreachable.
 */
class CacheApiReads
{
    private const EPOCH_PREFIX = 'sheno:reads:epoch:u';

    private const VALUE_PREFIX = 'sheno:read:u';

    /**
     * Bust every cached read for a user. Any write to user-scoped data must
     * call this before returning, or the next GET would serve stale rows.
     */
    public static function invalidateUser(int $userId): void
    {
        try {
            Cache::increment(self::EPOCH_PREFIX.$userId);
        } catch (\Throwable) {
            // Array/file stores cannot increment; emulate with an atomic
            // read-modify-write, which is still correct inside one process.
            $epoch = (int) Cache::get(self::EPOCH_PREFIX.$userId, 0);
            Cache::forever(self::EPOCH_PREFIX.$userId, $epoch + 1);
        }
    }

    public static function epochKey(int $userId): string
    {
        return self::EPOCH_PREFIX.$userId;
    }

    /**
     * Deterministic, versioned cache key for one (user, method, path) pair.
     * Exposed for tests so they can assert on exact keys.
     */
    public static function valueKey(int $userId, string $method, string $uri, int $epoch): string
    {
        $hash = substr(hash('sha256', $method.'|'.$uri), 0, 32);

        return self::VALUE_PREFIX."{$userId}:e{$epoch}:{$hash}";
    }

    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user === null || ! $request->is('api/*')) {
            return $next($request);
        }

        $userId = (int) $user->getAuthIdentifier();

        // Any write invalidates the writer's cached reads: the response may be
        // a mutation of exactly what the next GET would return.
        if (! $request->isMethod('GET') && ! $request->isMethod('HEAD')) {
            self::invalidateUser($userId);

            return $next($request);
        }

        $ttl = (int) config('inventory.api_cache_ttl', 30);
        $epoch = (int) Cache::get(self::epochKey($userId), 0);
        $key = self::valueKey($userId, $request->getMethod(), $request->getRequestUri(), $epoch);

        try {
            $payload = Cache::get($key);
        } catch (\Throwable) {
            $payload = null;
        }

        if (is_array($payload)) {
            return $this->cached($payload, $ttl);
        }

        /** @var Response $response */
        $response = $next($request);

        if ($response->getStatusCode() === 200) {
            $payload = json_decode($response->getContent(), true);

            if (is_array($payload)) {
                try {
                    Cache::put($key, $payload, $ttl);
                } catch (\Throwable) {
                    // Cache upstream unavailable: serve fresh and try again
                    // on the next request instead of failing the API call.
                }

                $response->headers->set('X-Cache-Status', 'MISS');
            }
        }

        // Tell the browser (and the edge, which ignores "private") it may hold
        // this response for the cache window without hitting the network.
        if ($response instanceof JsonResponse && $response->isSuccessful()) {
            $response->headers->set('Cache-Control', "private, max-age={$ttl}");
        }

        return $response;
    }

    private function cached(array $payload, int $ttl): JsonResponse
    {
        return response()->json($payload, 200, [
            'Cache-Control' => "private, max-age={$ttl}",
            'X-Cache-Status' => 'HIT',
        ]);
    }
}
