<?php

declare(strict_types=1);

/*
 * Vercel serverless entrypoint for the vercel-php (bref/vercel-php) runtime.
 * Every request is rewritten here by backend/vercel.json.
 *
 * Two runtime details have to be corrected before Laravel sees the request:
 *
 * 1. php-cgi derives SCRIPT_NAME/PATH_INFO from the rewritten URI. Because this
 *    file lives in /api, a request to /api/dashboard becomes SCRIPT_NAME
 *    =/api/index.php with PATH_INFO=/dashboard, and Symfony takes /api as the
 *    front controller's base URL and strips it, so Laravel only ever routes
 *    /dashboard and answers 404. Presenting the request as if public/index.php
 *    had been requested directly makes the base URL resolve to an empty string,
 *    which hands Laravel the untouched path.
 *
 * 2. Vercel's filesystem is read-only outside of /tmp, so Laravel's writable
 *    paths have to be redirected. Otherwise the package manifest cannot be
 *    written ("The bootstrap/cache directory must be present and writable") and
 *    error logging fails while reporting that error. The log channel is forced
 *    to stderr because a file channel can only fail on this platform.
 *
 * Environment variables that are already set always win over these defaults,
 * except for LOG_CHANNEL.
 */

$_SERVER['SCRIPT_NAME'] = '/index.php';
$_SERVER['PHP_SELF'] = '/index.php';
$_SERVER['ORIG_SCRIPT_NAME'] = '/index.php';

$env = static function (string $key, string $value, bool $force = false): void {
    if (! $force && getenv($key) !== false && getenv($key) !== '') {
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

// A file log channel cannot work on the read-only filesystem, and stderr is
// what reaches the function logs.
$env('LOG_CHANNEL', 'stderr', force: true);

// Never render framework stack traces to API clients.
$env('APP_DEBUG', 'false', force: true);

if (! is_dir('/tmp/cache/views')) {
    @mkdir('/tmp/cache/views', 0777, true);
}

ini_set('display_errors', '0');
ini_set('log_errors', '1');
error_reporting(E_ALL & ~E_DEPRECATED & ~E_USER_DEPRECATED);

if (isset($_GET['__diag'])) {
    header('Content-Type: application/json');

    $raw = file_get_contents('php://input');

    echo json_encode([
        'method' => $_SERVER['REQUEST_METHOD'] ?? null,
        'content_length_env' => $_SERVER['CONTENT_LENGTH'] ?? null,
        'content_type_env' => $_SERVER['CONTENT_TYPE'] ?? null,
        'http_content_type' => $_SERVER['HTTP_CONTENT_TYPE'] ?? null,
        'http_content_length' => $_SERVER['HTTP_CONTENT_LENGTH'] ?? null,
        'raw_input_len' => strlen((string) $raw),
        'raw_input_head' => substr((string) $raw, 0, 150),
        'post_keys' => array_keys($_POST),
        'php_ini_loaded' => php_ini_loaded_file(),
        'enable_post_data_reading' => ini_get('enable_post_data_reading'),
    ], JSON_PRETTY_PRINT);
    exit;
}

require __DIR__.'/../public/index.php';

