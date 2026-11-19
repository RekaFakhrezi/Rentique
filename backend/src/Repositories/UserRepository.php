<?php
declare(strict_types=1);

namespace Rentique\Repositories;

use DomainException;
use PDOException;
use Rentique\Models\User;

final class UserRepository extends Repository
{
    public function model(int $id, bool $lock = false): User
    {
        $row = $this->one('SELECT id,name,email,phone,address,role FROM users WHERE id = ?' . ($lock ? ' FOR UPDATE' : ''), [$id]);
        if (!$row) {
            throw new DomainException('Pengguna tidak ditemukan.', 404);
        }
        return User::fromRow($row);
    }

    public function authenticate(string $email, string $password): ?array
    {
        $row = $this->one('SELECT * FROM users WHERE email = ?', [strtolower(trim($email))]);
        if (!$row) {
            return null;
        }
        $user = User::fromRow($row);
        return $user->login($email, $password) ? $user->toArray() : null;
    }

    public function find(int $id): ?array
    {
        $row = $this->one('SELECT id,name,email,phone,address,role FROM users WHERE id = ?', [$id]);
        return $row ? User::fromRow($row)->toArray() : null;
    }

    public function update(int $id, array $input): array
    {
        try {
            return $this->transaction(function () use ($id, $input) {
                $user = $this->model($id, true);
                $fields = $input + $user->toArray();
                $user->updateProfile($fields['name'], $fields['email'], $fields['phone'], $fields['address']);
                $row = $user->toArray();
                $this->query('UPDATE users SET name=?, email=?, phone=?, address=?, updated_at=now() WHERE id=?',
                    [$row['name'], $row['email'], $row['phone'], $row['address'], $id]);
                return $row;
            });
        } catch (PDOException $e) {
            if ($e->getCode() === '23505') {
                throw new DomainException('Alamat email sudah digunakan.', 409);
            }
            throw $e;
        }
    }

    public function customers(): array
    {
        return $this->rows("SELECT u.id,u.name,u.email,u.phone,u.address,u.created_at,count(r.id)::integer AS rental_count
            FROM users u LEFT JOIN rentals r ON r.customer_id=u.id
            WHERE u.role='CUSTOMER' GROUP BY u.id ORDER BY u.name,u.id");
    }
}
