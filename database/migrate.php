<?php
declare(strict_types=1);

require dirname(__DIR__).'/backend/bootstrap.php';
if (PHP_SAPI !== 'cli') {
    exit(1);
}

$db = Rentique\Config\Database::connect();
$db->exec(file_get_contents(__DIR__.'/schema.sql'));
echo "Skema Rentique terpasang.\n";
