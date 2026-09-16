<?php

declare(strict_types=1);

if (isset($_GET['__diag'])) {
    header('Content-Type: application/json');

    require __DIR__.'/../vendor/autoload.php';

    $originalUri = $_SERVER['REQUEST_URI'] ?? null;
    $_SERVER['REQUEST_URI'] = '/api/dashboard';
    $probe = Illuminate\Http\Request::capture();
    $probePathInfo = $probe->getPathInfo();
    $probeBaseUrl = $probe->getBaseUrl();
    $_SERVER['REQUEST_URI'] = $originalUri;

    $app = require __DIR__.'/../bootstrap/app.php';
    $routes = [];
    foreach ($app->make('router')->getRoutes() as $route) {
        $routes[] = $route->methods()[0].' '.$route->uri();
    }

    echo json_encode([
        'php' => PHP_VERSION,
        'REQUEST_URI' => $originalUri,
        'SCRIPT_NAME' => $_SERVER['SCRIPT_NAME'] ?? null,
        'DOCUMENT_ROOT' => $_SERVER['DOCUMENT_ROOT'] ?? null,
        'NOW_ENTRYPOINT' => $_SERVER['NOW_ENTRYPOINT'] ?? null,
        'base_path' => $app->basePath(),
        'probe_baseUrl' => $probeBaseUrl,
        'probe_pathInfo' => $probePathInfo,
        'routes_api_exists' => file_exists(__DIR__.'/../routes/api.php'),
        'routes_api_sha1' => file_exists(__DIR__.'/../routes/api.php') ? sha1_file(__DIR__.'/../routes/api.php') : null,
        'bootstrap_app_sha1' => sha1_file(__DIR__.'/../bootstrap/app.php'),
        'routes_loaded' => $routes,
        'user_dir' => array_values(array_diff(scandir(__DIR__.'/..') ?: [], ['.', '..'])),
        'bootstrap_cache' => array_map('basename', glob(__DIR__.'/../bootstrap/cache/*.php') ?: []),
        'tmp_cache' => array_map('basename', glob('/tmp/cache/*') ?: []),
    ], JSON_PRETTY_PRINT);
    exit;
}

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

require __DIR__.'/../public/index.php';
