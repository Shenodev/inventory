<?php

declare(strict_types=1);

namespace App\Support;

use PDO;

/**
 * Resolves the TLS options required by Aiven MySQL connections.
 *
 * Aiven enforces TLS, so the driver must trust Aiven's CA certificate. On an
 * ephemeral filesystem (e.g. Vercel's PHP runtime) no certificate file ships
 * with the deployment, so the CA can be supplied base64-encoded through the
 * environment and materialised into the system temp directory on first use.
 */
final class AivenSsl
{
    private const CA_FILENAME = 'aiven-mysql-ca.pem';

    /**
     * Options that are safe to bake into the cached configuration.
     *
     * @return array<int, bool>
     */
    public static function basePdoOptions(): array
    {
        if (! extension_loaded('pdo_mysql')) {
            return [];
        }

        return [
            PDO::MYSQL_ATTR_SSL_VERIFY_SERVER_CERT => self::verifyServerCertificate(),
        ];
    }

    /**
     * Merge the resolved CA certificate into a database connection's options.
     */
    public static function applyCaCertificate(string $connection = 'mysql'): void
    {
        $path = self::caCertificatePath();

        if ($path === null) {
            return;
        }

        /** @var array<int, mixed> $options */
        $options = config("database.connections.{$connection}.options", []);

        $options[PDO::MYSQL_ATTR_SSL_CA] = $path;

        config(["database.connections.{$connection}.options" => $options]);
    }

    /**
     * Resolve the CA certificate to a readable local path, if configured.
     */
    public static function caCertificatePath(): ?string
    {
        $path = env('MYSQL_ATTR_SSL_CA');

        if (is_string($path) && $path !== '' && is_file($path)) {
            return $path;
        }

        $encoded = env('MYSQL_ATTR_SSL_CA_BASE64');

        if (! is_string($encoded) || $encoded === '') {
            return null;
        }

        $decoded = base64_decode($encoded, true);

        if ($decoded === false) {
            return null;
        }

        $target = sys_get_temp_dir().DIRECTORY_SEPARATOR.self::CA_FILENAME;

        if (! is_file($target) || file_get_contents($target) !== $decoded) {
            file_put_contents($target, $decoded);
        }

        return $target;
    }

    private static function verifyServerCertificate(): bool
    {
        $value = env('MYSQL_ATTR_SSL_VERIFY_SERVER_CERT', true);

        return filter_var($value, FILTER_VALIDATE_BOOL, FILTER_NULL_ON_FAILURE) ?? true;
    }
}
