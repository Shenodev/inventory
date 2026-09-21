<?php

declare(strict_types=1);

namespace App\Logging;

use Monolog\LogRecord;

class RedactSensitiveProcessor
{
    private const SENSITIVE_KEYS = [
        'password',
        'password_confirmation',
        'current_password',
        'token',
        'access_token',
        'refresh_token',
        'authorization',
        'cookie',
        'secret',
        'webhook_secret',
        'pin',
        'credit_card',
    ];

    public function __invoke(LogRecord $record): LogRecord
    {
        $record->context = $this->redact($record->context);
        $record->extra = $this->redact($record->extra);

        if (isset($record->context['request_data']) && is_array($record->context['request_data'])) {
            $record->context['request_data'] = $this->redact($record->context['request_data']);
        }

        return $record;
    }

    /**
     * @param array<string,mixed> $data
     * @return array<string,mixed>
     */
    private function redact(array $data): array
    {
        foreach ($data as $key => $value) {
            $lower = strtolower((string) $key);
            foreach (self::SENSITIVE_KEYS as $sensitive) {
                if (str_contains($lower, $sensitive)) {
                    $data[$key] = '[REDACTED]';
                    continue 2;
                }
            }
            if (is_array($value)) {
                $data[$key] = $this->redact($value);
            }
        }
        return $data;
    }
}
