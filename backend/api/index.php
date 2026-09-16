<?php

declare(strict_types=1);

/*
 * Vercel serverless entrypoint for the vercel-php (bref/vercel-php) runtime.
 * Every request is rewritten here by backend/vercel.json.
 *
 * Vercel's filesystem is read-only outside of /tmp, so Laravel's writable
 * paths have to be redirected before the framework boots. Otherwise the
 * package manifest cannot be written ("The bootstrap/cache directory must be
 * present and writable") and error logging fails while reporting that error.
 *
 * Values explicitly set in the environment always win.
 */

$env = static function (string $key, string $value): void {
    if (getenv($key) !== false && getenv($key) !== '') {
        return;
    }

    putenv("{$key}={$value}");
    $_ENV[$key] = $value;
    $_SERVER[$key] = $value;
};

$env('APP_CONFIG_CACHE', '/tmp/cache/config.php');
$env('APP_EVENTS_CACHE', '/tmp/cache/events.php');
$env('APP_PACKAGES_CACHE', '/tmp/cache/packages.php');
$env('APP_ROUTES_CACHE', '/tmp/cache/routes.php');
$env('APP_SERVICES_CACHE', '/tmp/cache/services.php');
$env('VIEW_COMPILED_PATH', '/tmp/cache/views');
$env('LOG_CHANNEL', 'stderr');

if (! is_dir('/tmp/cache/views')) {
    @mkdir('/tmp/cache/views', 0777, true);
}

ini_set('display_errors', '0');
ini_set('log_errors', '1');
error_reporting(E_ALL & ~E_DEPRECATED & ~E_USER_DEPRECATED);

if (isset($_GET['__diag'])) {
    header('Content-Type: application/json');

    require __DIR__.'/../vendor/autoload.php';

    $app = require __DIR__.'/../bootstrap/app.php';
    $kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);
    $kernel->bootstrap();

    $routes = [];
    foreach ($app->make('router')->getRoutes() as $route) {
        $routes[] = $route->methods()[0].' '.$route->uri();
    }

    $request = Illuminate\Http\Request::capture();
    $response = $kernel->handle($request);

    echo json_encode([
        'request_uri' => $_SERVER['REQUEST_URI'] ?? null,
        'script_name' => $_SERVER['SCRIPT_NAME'] ?? null,
        'script_filename' => $_SERVER['SCRIPT_FILENAME'] ?? null,
        'php_self' => $_SERVER['PHP_SELF'] ?? null,
        'orig_script_name' => $_SERVER['ORIG_SCRIPT_NAME'] ?? null,
        'path_info_env' => $_SERVER['PATH_INFO'] ?? null,
        'document_root' => $_SERVER['DOCUMENT_ROOT'] ?? null,
        'base_path' => $app->basePath(),
        'computed_baseUrl' => $request->getBaseUrl(),
        'computed_pathInfo' => $request->getPathInfo(),
        'response_status' => $response->getStatusCode(),
        'response_len' => strlen((string) $response->getContent()),
        'routes_loaded' => $routes,
    ], JSON_PRETTY_PRINT);
    exit;
}

require __DIR__.'/../public/index.php';
