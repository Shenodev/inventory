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
 *    error logging fails while reporting that error.
 *
 * Environment variables that are already set always win over these defaults.
 */

$_SERVER['SCRIPT_NAME'] = '/index.php';
$_SERVER['PHP_SELF'] = '/index.php';
$_SERVER['ORIG_SCRIPT_NAME'] = '/index.php';

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
