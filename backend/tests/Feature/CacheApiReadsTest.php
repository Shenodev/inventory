<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Http\Middleware\CacheApiReads;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CacheApiReadsTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        Cache::flush();
    }

    private function user(): User
    {
        $user = new User([
            'name' => 'Cache Test',
            'email' => 'cache@example.com',
            'role' => 'operator',
        ]);
        $user->id = 5;

        return $user;
    }

    public function test_authenticated_get_response_is_cached_and_served_on_next_request(): void
    {
        Sanctum::actingAs($this->user(), ['access']);

        $response = $this->getJson('/api/auth/user');

        $cacheControl = (string) $response->headers->get('Cache-Control');
        $this->assertStringContainsString('max-age=30', $cacheControl);
        $this->assertStringContainsString('private', $cacheControl);

        $response->assertOk()
            ->assertJsonPath('user.id', 5)
            ->assertHeader('X-Cache-Status', 'MISS');

        $epoch = (int) Cache::get(CacheApiReads::epochKey(5), 0);
        $key = CacheApiReads::valueKey(5, 'GET', '/api/auth/user', $epoch);

        $this->assertTrue(Cache::has($key), 'A successful GET should be stored in the cache');

        $this->getJson('/api/auth/user')
            ->assertOk()
            ->assertHeader('X-Cache-Status', 'HIT');
    }

    public function test_invalidating_a_user_bumps_their_epoch_and_the_next_read_is_fresh(): void
    {
        Sanctum::actingAs($this->user(), ['access']);

        $this->getJson('/api/auth/user')->assertHeader('X-Cache-Status', 'MISS');

        $epochBefore = (int) Cache::get(CacheApiReads::epochKey(5), 0);

        CacheApiReads::invalidateUser(5);

        $epochAfter = (int) Cache::get(CacheApiReads::epochKey(5), 0);

        $this->assertGreaterThan($epochBefore, $epochAfter);

        // Under the new epoch the old entry is skipped, so the next GET is a fresh miss.
        $this->getJson('/api/auth/user')->assertHeader('X-Cache-Status', 'MISS');
    }

    public function test_error_responses_are_not_cached(): void
    {
        $request = Request::create('/api/auth/user', 'GET');
        $request->setUserResolver(fn (): User => $this->user());

        $middleware = new CacheApiReads;
        $middleware->handle($request, fn () => response()->json(['message' => 'nope'], 404));

        $epoch = (int) Cache::get(CacheApiReads::epochKey(5), 0);
        $key = CacheApiReads::valueKey(5, 'GET', '/api/auth/user', $epoch);

        $this->assertFalse(Cache::has($key), '4xx responses must never be cached');
    }
}
