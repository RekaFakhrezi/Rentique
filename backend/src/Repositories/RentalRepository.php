<?php
declare(strict_types=1);

namespace Rentique\Repositories;

use DomainException;
use Rentique\Models\Customer;
use Rentique\Models\Invoice;
use Rentique\Models\Payment;
use Rentique\Models\Rental;
use Rentique\Models\RentalItem;
use Rentique\Models\RentalReturn;

final class RentalRepository extends Repository
{
    private const SUMMARY = "SELECT r.id,r.customer_id,u.name AS customer_name,r.rental_date,r.planned_return_date,
        r.actual_return_date,r.status,r.total_price,r.return_fee,r.created_at,r.updated_at,
        coalesce((SELECT sum(p.amount) FROM payments p WHERE p.rental_id=r.id),0)::bigint AS paid_amount
        FROM rentals r JOIN users u ON u.id=r.customer_id";
    private const PAYMENT_FIELDS = 'id,rental_id,payment_method,amount,payment_status,cash_received,change_amount,bank_name,provider,payment_date,created_at';

    public function listing(?int $customerId = null, ?int $limit = null): array
    {
        $sql = self::SUMMARY . ($customerId === null ? '' : ' WHERE r.customer_id=?')
            . ' ORDER BY r.created_at DESC,r.id DESC' . ($limit === null ? '' : ' LIMIT ' . $limit);
        $rows = $this->rows($sql, $customerId === null ? [] : [$customerId]);
        foreach ($rows as &$row) {
            $row += Rental::paymentSummary((int) $row['total_price'], (int) $row['return_fee'], (int) $row['paid_amount']);
        }
        return $rows;
    }

    public function authorize(int $id, array $user, bool $lock = false): void
    {
        $sql = 'SELECT id FROM rentals WHERE id=?';
        $params = [$id];
        if ($user['role'] !== 'ADMIN') {
            $sql .= ' AND customer_id=?';
            $params[] = $user['id'];
        }
        if (!$this->one($sql . ($lock ? ' FOR UPDATE' : ''), $params)) {
            throw new DomainException('Penyewaan tidak ditemukan.', 404);
        }
    }

    /** Use after authorize(). For returns, all clothing rows are locked before stock is hydrated. */
    public function hydrate(int $id, CatalogRepository $catalog, UserRepository $users, bool $lockClothing = false): Rental
    {
        $row = $this->one(self::SUMMARY . ' WHERE r.id=?', [$id]);
        $customer = $users->model((int) $row['customer_id']);
        if (!$customer instanceof Customer) { throw new DomainException('Pelanggan tidak ditemukan.', 404); }
        $itemRows = $this->rows('SELECT * FROM rental_items WHERE rental_id=? ORDER BY id', [$id]);
        $clothings = $catalog->byIds(array_column($itemRows, 'clothing_id'), true, $lockClothing);
        $items = array_map(static fn($item) => RentalItem::restore($clothings[$item['clothing_id']], $item), $itemRows);
        return Rental::restore($customer, $row, $items);
    }

    public function findRequest(int $customerId, string $key): ?array
    {
        return $this->one('SELECT id,request_hash FROM rentals WHERE customer_id=? AND request_key=?', [$customerId,$key]);
    }

    public function create(Rental $rental, string $key, string $hash): int
    {
        $data = $rental->toArray();
        $id = $this->insert('rentals', [
            'customer_id' => $data['customer_id'], 'rental_date' => $data['rental_date'],
            'planned_return_date' => $data['planned_return_date'], 'status' => $data['status'],
            'total_price' => $data['total_price'], 'request_key' => $key, 'request_hash' => $hash,
        ]);
        foreach ($rental->getItems() as $item) {
            $this->insert('rental_items', [
                'rental_id' => $id, 'clothing_id' => $item->getClothing()->getClothingId(),
                'quantity' => $item->getQuantity(), 'rental_days' => $item->getRentalDays(),
                'price_per_day' => $item->getPricePerDay(), 'additional_fee' => $item->getAdditionalFee(),
                'subtotal' => $item->calculateSubtotal(),
            ]);
        }
        return $id;
    }

    public function issueInvoice(Rental $rental): void
    {
        $this->insert('invoices', [
            'rental_id' => $rental->getRentalId(), 'invoice_number' => (new Invoice($rental))->generateInvoiceNumber(),
            'total_amount' => $rental->calculateTotal(),
        ]);
    }

    public function invoice(Rental $rental): array
    {
        $id = $rental->getRentalId();
        $issued = $this->one('SELECT invoice_number,issue_date,total_amount FROM invoices WHERE rental_id=?', [$id])
            ?? throw new DomainException('Invoice tidak ditemukan.', 404);
        return (new Invoice($rental))->toArray($issued, $this->payments($id));
    }

    public function payments(int $rentalId): array
    {
        return $this->rows('SELECT ' . self::PAYMENT_FIELDS . ' FROM payments WHERE rental_id=? ORDER BY id', [$rentalId]);
    }

    public function paymentRequest(int $rentalId, string $key): ?array
    {
        return $this->one('SELECT request_hash,' . self::PAYMENT_FIELDS . ' FROM payments WHERE rental_id=? AND request_key=?', [$rentalId,$key]);
    }

    public function addPayment(Payment $payment, string $key, string $hash): array
    {
        $id = $this->insert('payments', $payment->toArray() + ['request_key' => $key, 'request_hash' => $hash]);
        return $this->one('SELECT ' . self::PAYMENT_FIELDS . ' FROM payments WHERE id=?', [$id]);
    }

    public function addReturn(RentalReturn $return, int $adminId): void
    {
        $fields = $return->toArray();
        unset($fields['late_days']);
        $this->insert('rental_returns', $fields + ['processed_by' => $adminId]);
        $this->query("UPDATE rentals SET actual_return_date=?,return_fee=?,status='RETURNED',updated_at=now() WHERE id=?",
            [$fields['return_date'], $fields['total_fee'], $fields['rental_id']]);
    }

    public function returnRecord(int $rentalId): array
    {
        return $this->one('SELECT rr.*,u.name AS processed_by_name,greatest(0,rr.return_date-r.planned_return_date) AS late_days
            FROM rental_returns rr JOIN rentals r ON r.id=rr.rental_id JOIN users u ON u.id=rr.processed_by
            WHERE rr.rental_id=?', [$rentalId]) ?? throw new DomainException('Pengembalian belum tercatat.', 404);
    }

    public function statistics(): array
    {
        return $this->one("SELECT
            (SELECT count(*) FROM clothings WHERE is_active) AS total_products,
            (SELECT coalesce(sum(stock),0) FROM clothings WHERE is_active) AS available_units,
            count(*) FILTER (WHERE status='RENTED') AS active_rentals,
            count(*) FILTER (WHERE status='RETURNED') AS returned_rentals,
            count(*) FILTER (WHERE status='RENTED' AND planned_return_date < (now() AT TIME ZONE 'Asia/Jakarta')::date) AS overdue_rentals,
            (SELECT coalesce(sum(amount),0)::bigint FROM payments) AS revenue,
            (coalesce(sum(total_price + return_fee),0) - (SELECT coalesce(sum(amount),0) FROM payments))::bigint AS outstanding_payments
            FROM rentals");
    }
}
