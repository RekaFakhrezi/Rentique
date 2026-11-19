<?php
declare(strict_types=1);

use Rentique\Config\Database;

date_default_timezone_set('Asia/Jakarta');
spl_autoload_register(static function (string $class): void {
    if (str_starts_with($class, 'Rentique\\')) {
        $file = __DIR__.'/src/'.str_replace('\\', '/', substr($class, 9)).'.php';
        if (is_file($file)) {
            require $file;
        }
    }
});

$envFile = __DIR__.'/.env';
if (is_file($envFile)) {
    foreach (file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
        if (str_starts_with(ltrim($line), '#') || !str_contains($line, '=')) {
            continue;
        }
        [$key, $value] = explode('=', $line, 2);
        $key = trim($key);
        if (getenv($key) === false) {
            $value = trim($value);
            if (strlen($value) >= 2 && in_array($value[0], ['"', "'"], true) && $value[-1] === $value[0]) {
                $value = substr($value, 1, -1);
            }
            putenv($key.'='.$value);
        }
    }
}
