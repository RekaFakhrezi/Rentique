<?php
declare(strict_types=1);
namespace Rentique\Config;

use PDO;
use RuntimeException;

final class Database
{
    public static function connect(): PDO
    {
        $host = getenv('DB_HOST') ?: 'localhost';
        $name = getenv('DB_NAME') ?: 'rentique';
        $port = getenv('DB_PORT') ?: '5432';
        $sslmode = getenv('DB_SSLMODE') ?: 'require';
        if (!in_array($sslmode, ['disable','prefer','require','verify-ca','verify-full'], true)) {
            throw new RuntimeException('Invalid database configuration.');
        }
        $pdo = new PDO("pgsql:host=$host;port=$port;dbname=$name;sslmode=$sslmode;connect_timeout=5",
            getenv('DB_USER') ?: 'rentique', getenv('DB_PASSWORD') ?: '',
            [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
             PDO::ATTR_EMULATE_PREPARES => false, PDO::ATTR_STRINGIFY_FETCHES => false]);
        $pdo->exec("SET TIME ZONE 'Asia/Jakarta'");
        return $pdo;
    }
}
