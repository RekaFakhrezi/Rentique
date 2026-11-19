<?php
declare(strict_types=1);

namespace Rentique\Repositories;

use PDO;
use PDOStatement;
use Throwable;

class Repository
{
    public function __construct(protected PDO $db) {}

    public function query(string $sql, array $params = []): PDOStatement
    {
        $statement = $this->db->prepare($sql);
        $statement->execute($params);
        return $statement;
    }

    public function rows(string $sql, array $params = []): array
    {
        return $this->query($sql, $params)->fetchAll(PDO::FETCH_ASSOC);
    }

    public function one(string $sql, array $params = []): ?array
    {
        return $this->query($sql, $params)->fetch(PDO::FETCH_ASSOC) ?: null;
    }

    /** Table and column names here are selected by repository code. */
    protected function insert(string $table, array $fields): int
    {
        $columns = implode(', ', array_keys($fields));
        $marks = implode(', ', array_fill(0, count($fields), '?'));
        return (int) $this->query("INSERT INTO $table ($columns) VALUES ($marks) RETURNING id", array_values($fields))->fetchColumn();
    }

    public function transaction(callable $action, bool $readOnly = false): mixed
    {
        $this->db->beginTransaction();
        try {
            if ($readOnly) {
                $this->db->exec('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY');
            }
            $result = $action();
            $this->db->commit();
            return $result;
        } catch (Throwable $error) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            throw $error;
        }
    }
}
