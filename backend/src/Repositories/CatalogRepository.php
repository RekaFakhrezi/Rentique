<?php
declare(strict_types=1);

namespace Rentique\Repositories;

use DomainException;
use InvalidArgumentException;
use Rentique\Models\Clothing;
use Rentique\Models\Fields;
use Rentique\Models\InventoryLog;

final class CatalogRepository extends Repository
{
    private const SELECT_CLOTHING = 'SELECT c.*, k.name AS category_name, k.description AS category_description
        FROM clothings c JOIN clothing_categories k ON k.id=c.category_id';

    public function categories(): array
    {
        return $this->rows('SELECT id,name,description FROM clothing_categories ORDER BY name');
    }

    public function category(int $id): array
    {
        return $this->one('SELECT * FROM clothing_categories WHERE id=?', [$id])
            ?? throw new InvalidArgumentException('Kategori tidak ditemukan.');
    }

    public function clothing(int $id, bool $includeInactive = false, bool $lock = false): Clothing
    {
        $sql = self::SELECT_CLOTHING . ' WHERE c.id=?' . ($includeInactive ? '' : ' AND c.is_active')
            . ($lock ? ' FOR UPDATE OF c' : '');
        $row = $this->one($sql, [$id]);
        if (!$row) {
            throw new DomainException('Pakaian tidak ditemukan.', 404);
        }
        return Clothing::fromRow($row);
    }

    /** Load rows in the same global order in checkout and return transactions. */
    public function byIds(array $ids, bool $includeInactive, bool $lock): array
    {
        if (!$ids) { return []; }
        $marks = implode(',', array_fill(0, count($ids), '?'));
        $sql = self::SELECT_CLOTHING . " WHERE c.id IN ($marks)" . ($includeInactive ? '' : ' AND c.is_active')
            . ' ORDER BY c.id' . ($lock ? ' FOR UPDATE OF c' : '');
        $clothes = [];
        foreach ($this->rows($sql, array_values($ids)) as $row) {
            $clothes[(int) $row['id']] = Clothing::fromRow($row);
        }
        return $clothes;
    }

    public function list(array $filters, bool $admin): array
    {
        $includeInactive = $admin && filter_var($filters['include_inactive'] ?? false, FILTER_VALIDATE_BOOLEAN);
        $where = $includeInactive ? [] : ['c.is_active'];
        $args = [];
        if (($filters['search'] ?? '') !== '') {
            $search = Fields::text($filters['search'], 'Pencarian', 180, false);
            $where[] = "strpos(lower(c.name || ' ' || c.color || ' ' || c.description), lower(?)) > 0";
            $args[] = $search;
        }
        foreach (['category_id','type','size'] as $field) {
            if (($filters[$field] ?? '') === '') { continue; }
            $where[] = "c.$field = ?";
            $args[] = $field === 'category_id' ? Fields::integer($filters[$field], 'Kategori', 1)
                : Fields::text($filters[$field], $field, 60);
        }
        if (isset($filters['available']) && $filters['available'] !== '') {
            $available = filter_var($filters['available'], FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
            if ($available === null) { throw new InvalidArgumentException('Filter ketersediaan tidak valid.'); }
            $where[] = $available ? 'c.stock > 0 AND c.is_active' : '(c.stock = 0 OR NOT c.is_active)';
        }
        $sort = match ($filters['sort'] ?? '') {
            'price_asc' => 'c.rental_price_per_day ASC,c.id', 'price_desc' => 'c.rental_price_per_day DESC,c.id',
            'name' => 'c.name,c.id', 'newest' => 'c.created_at DESC,c.id DESC',
            default => 'c.id',
        };
        $sql = self::SELECT_CLOTHING . ($where ? ' WHERE ' . implode(' AND ', $where) : '') . " ORDER BY $sort";
        return array_map(static fn($row) => Clothing::fromRow($row)->toArray(), $this->rows($sql, $args));
    }

    public function save(Clothing $clothing): int
    {
        $row = $clothing->toArray();
        $id = $row['id'];
        unset($row['id'], $row['is_active'], $row['category_name']);
        if (!$id) { return $this->insert('clothings', $row); }
        $sets = implode(',', array_map(static fn($key) => "$key=?", array_keys($row)));
        $this->query("UPDATE clothings SET $sets,updated_at=now() WHERE id=?", [...array_values($row), $id]);
        return $id;
    }

    public function saveStock(Clothing $clothing): void
    {
        $this->query('UPDATE clothings SET stock=?,updated_at=now() WHERE id=?', [$clothing->getStock(), $clothing->getClothingId()]);
    }

    public function deactivate(int $id): void
    {
        $this->query('UPDATE clothings SET is_active=false,updated_at=now() WHERE id=?', [$id]);
    }

    public function log(InventoryLog $log): void { $this->insert('inventory_logs', $log->record()); }

    public function logs(): array
    {
        return $this->rows("SELECT l.*,c.name AS clothing_name,coalesce(u.name,'Sistem') AS actor_name
            FROM inventory_logs l JOIN clothings c ON c.id=l.clothing_id
            LEFT JOIN users u ON u.id=coalesce(l.actor_id,l.admin_id) ORDER BY l.created_at DESC,l.id DESC");
    }

    public function lowStock(): array
    {
        $rows = $this->rows(self::SELECT_CLOTHING . ' WHERE c.is_active AND c.stock <= 2 ORDER BY c.stock,c.id');
        return array_map(static fn($row) => Clothing::fromRow($row)->toArray(), $rows);
    }
}
