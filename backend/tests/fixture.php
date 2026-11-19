<?php
declare(strict_types=1);

use Rentique\Config\Database;

require dirname(__DIR__).'/bootstrap.php';
$schema = $argv[2] ?? '';
if (PHP_SAPI !== 'cli' || !preg_match('/^rentique_test_[0-9a-f]{24}$/D', $schema)) {
    exit(2);
}
$db = Database::connect();
if (($argv[1] ?? '') === 'create') {
    $db->exec("CREATE SCHEMA $schema");
    $db->exec("SET search_path TO $schema");
    $db->exec(file_get_contents(dirname(__DIR__,2).'/database/schema.sql'));
} elseif ($argv[1] === 'customer') {
    // Connected through the dedicated test search_path, separate from demo users.
    if ($db->query('SELECT current_schema()')->fetchColumn() !== $schema) {
        throw new LogicException('Invalid test search path.');
    }
    $db->prepare("INSERT INTO users(name,email,password_hash,role) VALUES (?,?,?,'CUSTOMER')")
        ->execute(['Pelanggan kedua','other@rentique.test', password_hash('Other123!',PASSWORD_DEFAULT)]);
} elseif ($argv[1] === 'race') {
    if ($db->query('SELECT current_schema()')->fetchColumn() !== $schema) {
        throw new LogicException('Invalid test search path.');
    }
    $user = $db->prepare('SELECT id,role,name,email,phone,address FROM users WHERE email=?');
    $user->execute([$argv[3]]);
    $actor = $user->fetch();
    $service = new Rentique\Services\RentalService($db);
    echo "ready\n";
    flush();
    $input = json_decode(fgets(STDIN), true, flags: JSON_THROW_ON_ERROR);
    try {
        $result = match ($input['operation']) {
            'create' => $service->create($input['body'], $actor['id'], $input['key']),
            'pay' => $service->pay($input['id'], $input['body'], $actor, $input['key']),
            'return' => $service->processReturn($input['id'], $input['body'], $actor),
        };
        echo json_encode(['ok' => true, 'data' => $result]);
    } catch (DomainException $error) {
        echo json_encode(['ok' => false, 'status' => $error->getCode()]);
    }
} elseif ($argv[1] === 'drop') {
    $db->exec("DROP SCHEMA $schema CASCADE");
} else {
    exit(2);
}
