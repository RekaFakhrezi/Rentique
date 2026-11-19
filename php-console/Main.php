<?php
declare(strict_types=1);
date_default_timezone_set('Asia/Jakarta');

function println(string $text): void { echo $text, PHP_EOL; }
function echoPrint(string $text): void { echo $text; }
function javaPrintf(string $format, mixed ...$args): void {
    $index = 0;
    $format = preg_replace_callback('/%,\.0f|%s|%d/', function ($match) use (&$index, &$args) {
        if ($match[0] === '%,.0f') {
            $args[$index] = number_format($args[$index], 0, '.', ',');
            $index++;
            return '%s';
        }
        $index++;
        return $match[0];
    }, $format);
    printf($format, ...$args);
}

// 1. ABSTRACT CLASS: kelas induk tidak dibuat langsung menjadi objek.
abstract class User {
    private static int $nextId = 1;
    private int $userId;
    private string $name;
    private string $email;
    private string $password;
    private string $phone;
    private string $address;
    private DateTimeImmutable $createdAt;

    // Constructor: mengisi data awal ketika objek dibuat.
    public function __construct(string $name, string $email, string $password) {
        $this->userId = self::$nextId++;
        $this->name = $name;
        $this->email = $email;
        $this->password = $password;
        $this->phone = "";
        $this->address = "";
        $this->createdAt = new DateTimeImmutable();
    }

    // Login sederhana untuk latihan; tidak terhubung ke database.
    public function login(string $email, string $password) : bool {
        return $this->email === $email && $this->password === $password;
    }

    // Method ini meminta input hanya jika dipanggil.
    public function updateProfile() : void {
        
        echoPrint("Nama baru: ");
        $this->name = rtrim(fgets(STDIN), "\r\n");
        echoPrint("Nomor telepon: ");
        $this->phone = rtrim(fgets(STDIN), "\r\n");
        echoPrint("Alamat: ");
        $this->address = rtrim(fgets(STDIN), "\r\n");
        // System.in tidak ditutup agar tetap dapat dipakai program.
    }

    public function getName() : string { return $this->name; }
    abstract public function getRole() : string;
}

// 2. INHERITANCE: Customer mewarisi User.
class Customer extends User {
    private array $rentals = [];

    public function __construct(string $name, string $email, string $password) {
        parent::__construct($name, $email, $password);
    }

    public function createRental() : Rental {
        $rental = new Rental($this);
        $this->rentals[] = $rental;
        return $rental;
    }

    public function viewRentalHistory() : array {
        return $this->rentals;
    }

    // OVERRIDING: mengisi method abstrak dari User.

    public function getRole() : string { return "Customer"; }
}

class Admin extends User {
    private array $managedLogs = [];
    // Daftar sederhana agar addClothing benar-benar menyimpan objek baju.
    private array $inventory = [];

    public function __construct(string $name, string $email, string $password) {
        parent::__construct($name, $email, $password);
    }

    public function addClothing(?Clothing $c) : void {
        if ($c == null || in_array($c, $this->inventory, true)) {
            throw new InvalidArgumentException("Baju kosong atau sudah terdaftar.");
        }
        $this->inventory[] = $c;
        $log = new InventoryLog($c, $this, "DAFTAR", $c->getStock(), "Stok awal");
        $this->managedLogs[] = $log;
        $log->record();
    }

    // qty positif menambah stok; qty negatif mengurangi stok.
    public function adjustStock(?Clothing $c, int $qty, string $note) : void {
        if (!in_array($c, $this->inventory, true) || $qty == 0 || $qty == -2147483648) {
            throw new InvalidArgumentException("Baju belum terdaftar atau jumlah tidak valid.");
        }
        if ($qty > 0) $c->increaseStock($qty);
        else $c->reduceStock(-$qty);
        $log = new InventoryLog($c, $this, "PENYESUAIAN", $qty, $note);
        $this->managedLogs[] = $log;
        $log->record();
    }

    public function processReturn(RentalReturn $r) : void {
        $r->finalizeReturn();
        foreach ($r->getRental()->getItems() as $item) {
            $log = new InventoryLog($item->getClothing(), $this,
                    "PENGEMBALIAN", $item->getQuantity(), "Baju dikembalikan");
            $this->managedLogs[] = $log;
            $log->record();
        }
    }

    public function getRole() : string { return "Admin"; }
}

// 3. ENCAPSULATION: atribut private diakses melalui method.
abstract class Clothing {
    private int $clothingId;
    private string $clothingName;
    private string $size;
    private string $color;
    private float $rentalPricePerDay = 0.0;
    private int $stock;
    private string $condition;
    private string $description;
    private ClothingCategory $category;

    public function __construct(int $id, string $name, string $size, string $color, float $price, int $stock, ?ClothingCategory $category) {
        if ($stock < 0 || $category == null) {
            throw new InvalidArgumentException("Stok atau kategori tidak valid.");
        }
        $this->clothingId = $id;
        $this->clothingName = $name;
        $this->size = $size;
        $this->color = $color;
        $this->setRentalPricePerDay($price);
        $this->stock = $stock;
        $this->category = $category;
        $this->condition = "Baik";
        $this->description = "";
    }

    public function isAvailable(int $qty) : bool { return $qty > 0 && $this->stock >= $qty; }

    public function reduceStock(int $qty) : void {
        if (!$this->isAvailable($qty)) {
            throw new InvalidArgumentException("Jumlah tidak valid atau stok tidak cukup.");
        }
        $this->stock -= $qty;
    }

    public function increaseStock(int $qty) : void {
        if ($qty <= 0 || $this->stock > 2147483647 - $qty) {
            throw new InvalidArgumentException("Penambahan stok tidak valid.");
        }
        $this->stock += $qty;
    }

    // Getter dan setter yang digunakan oleh contoh program.
    public function getClothingName() : string { return $this->clothingName; }
    public function getRentalPricePerDay() : float { return $this->rentalPricePerDay; }
    public function getStock() : int { return $this->stock; }
    public function setRentalPricePerDay(float $price) : void {
        if (!is_finite($price) || $price < 0) {
            throw new InvalidArgumentException("Tarif harus angka nonnegatif.");
        }
        $this->rentalPricePerDay = $price;
    }
}

class ClothingCategory {
    private int $categoryId;
    private string $categoryName;
    private string $description;

    public function __construct(int $id, string $name, string $description) {
        $this->categoryId = $id;
        $this->categoryName = $name;
        $this->description = $description;
    }

    public function getCategoryId() : int { return $this->categoryId; }
    public function getCategoryName() : string { return $this->categoryName; }
    public function getDescription() : string { return $this->description; }
    public function setCategoryName(string $name) : void { $this->categoryName = $name; }
    public function setDescription(string $description) : void { $this->description = $description; }
}

// Kelas anak menyimpan ciri khusus; tidak menghitung harga sewa.
class Dress extends Clothing {
    private string $dressStyle;

    public function __construct(int $id, string $name, string $size, string $color, float $price, int $stock, ?ClothingCategory $category, string $style) {
        parent::__construct($id, $name, $size, $color, $price, $stock, $category);
        $this->dressStyle = $style;
    }

    public function getDressStyle() : string { return $this->dressStyle; }
}

class Suit extends Clothing {
    private float $dryCleaningFee = 0.0;

    public function __construct(int $id, string $name, string $size, string $color, float $price, int $stock, ?ClothingCategory $category, float $fee) {
        parent::__construct($id, $name, $size, $color, $price, $stock, $category);
        if (!is_finite($fee) || $fee < 0) {
            throw new InvalidArgumentException("Biaya cuci tidak valid.");
        }
        $this->dryCleaningFee = $fee;
    }

    public function getDryCleaningFee() : float { return $this->dryCleaningFee; }
}

class Costume extends Clothing {
    private string $theme;
    private float $accessoryFee = 0.0;

    public function __construct(int $id, string $name, string $size, string $color, float $price, int $stock, ?ClothingCategory $category, string $theme, float $fee) {
        parent::__construct($id, $name, $size, $color, $price, $stock, $category);
        if (!is_finite($fee) || $fee < 0) {
            throw new InvalidArgumentException("Biaya aksesori tidak valid.");
        }
        $this->theme = $theme;
        $this->accessoryFee = $fee;
    }

    public function getTheme() : string { return $this->theme; }
    public function getAccessoryFee() : float { return $this->accessoryFee; }
}

// 4. COMPOSITION: Rental membuat dan memiliki RentalItem.
class Rental {
    private static int $nextId = 1;
    private int $rentalId;
    private Customer $customer;
    private DateTimeImmutable $rentalDate;
    private DateTimeImmutable $plannedReturnDate;
    private ?DateTimeImmutable $actualReturnDate = null;
    private string $status;
    private float $totalPrice = 0.0;
    private DateTimeImmutable $createdAt;
    private array $items = [];
    // Tambahan untuk mencatat DP/pelunasan dan biaya pengembalian.
    private float $paidAmount = 0.0;
    private float $returnFee = 0.0;

    public function __construct(Customer $customer) {
        $this->rentalId = self::$nextId++;
        $this->customer = $customer;
        $this->rentalDate = new DateTimeImmutable("today");
        $this->plannedReturnDate = $this->rentalDate;
        $this->createdAt = new DateTimeImmutable();
        $this->status = "DRAFT";
    }

    // Parameter opsional: padanan overloading Java.

    public function addItem(?Clothing $c, int $days, int $qty = 1) : void {
        if ($this->paidAmount > 0 || $this->status === "RETURNED") {
            throw new LogicException("Isi sewa tidak dapat diubah lagi.");
        }
        if ($c == null || $days <= 0 || !$c->isAvailable($qty)) {
            throw new InvalidArgumentException("Baju, durasi, atau jumlah tidak valid.");
        }
        // Satu transaksi menggunakan satu tanggal pengembalian.
        if (!empty($this->items) && $days != $this->items[0]->getRentalDays()) {
            throw new InvalidArgumentException("Durasi semua item harus sama.");
        }
        $planned = $this->rentalDate->modify("+" . $days . " days");
        $item = new RentalItem(count($this->items) + 1, $c, $days, $qty);
        if (!is_finite($this->calculateTotal() + $item->calculateSubtotal())) {
            throw new InvalidArgumentException("Total biaya terlalu besar.");
        }
        $c->reduceStock($qty);
        $this->items[] = $item;
        $this->plannedReturnDate = $planned;
        $this->updateStatus("RENTED");
        $this->calculateTotal();
    }

    public function calculateTotal() : float {
        $this->totalPrice = 0;
        foreach ($this->items as $item) $this->totalPrice += $item->calculateSubtotal();
        return $this->totalPrice;
    }

    public function updateStatus(string $status) : void {
        if ($status !== "RENTED" && $status !== "RETURNED") {
            throw new InvalidArgumentException("Status tidak dikenal.");
        }
        if (empty($this->items) || $this->status === "RETURNED"
                || ($status === "RETURNED" && $this->actualReturnDate == null)) {
            throw new LogicException("Perubahan status tidak sesuai alur sewa.");
        }
        $this->status = $status;
    }

    // Dipakai oleh Payment; hanya pembayaran berhasil yang dicatat.
    public function recordPayment(float $amount) : void {
        if (empty($this->items) || !is_finite($amount) || $amount <= 0
                || $amount > $this->getOutstandingAmount()) {
            throw new InvalidArgumentException("Nominal pembayaran tidak valid.");
        }
        $this->paidAmount += $amount;
    }

    public function getOutstandingAmount() : float {
        return $this->calculateTotal() + $this->returnFee - $this->paidAmount;
    }

    public function completeReturn(?DateTimeImmutable $date, float $fee) : void {
        if ($this->status !== "RENTED" || $date < $this->rentalDate
                || !is_finite($fee) || $fee < 0) {
            throw new LogicException("Pengembalian tidak valid atau sudah diproses.");
        }
        foreach ($this->items as $item) $item->getClothing()->increaseStock($item->getQuantity());
        $this->actualReturnDate = $date;
        $this->returnFee = $fee;
        $this->updateStatus("RETURNED");
    }

    public function getRentalId() : int { return $this->rentalId; }
    public function getCustomer() : Customer { return $this->customer; }
    public function getRentalDate() : DateTimeImmutable { return $this->rentalDate; }
    public function getPlannedReturnDate() : DateTimeImmutable { return $this->plannedReturnDate; }
    public function getStatus() : string { return $this->status; }
    public function getItems() : array { return $this->items; }
}

class RentalItem {
    private int $rentalItemId;
    private Clothing $clothing;
    private int $quantity;
    private int $rentalDays;
    private float $pricePerDay = 0.0;
    private float $subtotal = 0.0;
    private float $additionalFee = 0.0;

    public function __construct(int $id, ?Clothing $c, int $days, int $qty) {
        if ($c == null || $days <= 0 || $qty <= 0) {
            throw new InvalidArgumentException("Data item tidak valid.");
        }
        $this->rentalItemId = $id;
        $this->clothing = $c;
        $this->quantity = $qty;
        $this->rentalDays = $days;
        // Salin tarif saat transaksi dibuat, bukan membaca tarif terbaru terus-menerus.
        $this->pricePerDay = $c->getRentalPricePerDay();
        $this->additionalFee = 0;
        // Biaya tambahan sekali per baju, bukan per hari.
        if ($c instanceof Suit) {
            $this->additionalFee = $c->getDryCleaningFee() * $qty;
        } else if ($c instanceof Costume) {
            $this->additionalFee = $c->getAccessoryFee() * $qty;
        }
        if (!is_finite($this->calculateSubtotal())) {
            throw new InvalidArgumentException("Subtotal terlalu besar.");
        }
    }

    public function calculateSubtotal() : float {
        $this->subtotal = $this->pricePerDay * $this->rentalDays * $this->quantity + $this->additionalFee;
        return $this->subtotal;
    }

    public function getClothing() : Clothing { return $this->clothing; }
    public function getQuantity() : int { return $this->quantity; }
    public function getRentalDays() : int { return $this->rentalDays; }
    public function getPricePerDay() : float { return $this->pricePerDay; }
    public function getAdditionalFee() : float { return $this->additionalFee; }
}

class InventoryLog {
    private static int $nextId = 1;
    private int $inventoryLogId;
    private Clothing $clothing;
    private Admin $admin;
    private string $changeType;
    private int $quantityChanged;
    private string $notes;
    private DateTimeImmutable $createdAt;

    public function __construct(?Clothing $c, Admin $admin, string $type, int $qty, string $notes) {
        $this->inventoryLogId = self::$nextId++;
        $this->clothing = $c;
        $this->admin = $admin;
        $this->changeType = $type;
        $this->quantityChanged = $qty;
        $this->notes = $notes;
        $this->createdAt = new DateTimeImmutable();
    }

    public function record() : void {
        println("Log " . $this->inventoryLogId . " | " . $this->changeType . " | "
                . $this->clothing->getClothingName() . " | jumlah: " . $this->quantityChanged
                . " | admin: " . $this->admin->getName() . " | " . $this->notes);
    }
}

// 5. ABSTRACT METHOD dan POLYMORPHISM pada pembayaran.
abstract class Payment {
    private static int $nextId = 1;
    private int $paymentId;
    private Rental $rental;
    private ?DateTimeImmutable $paymentDate = null;
    private float $amount = 0.0;
    private string $paymentStatus;

    public function __construct(?Rental $rental, float $amount) {
        if ($rental == null || !is_finite($amount) || $amount <= 0) {
            throw new InvalidArgumentException("Data pembayaran tidak valid.");
        }
        $this->paymentId = self::$nextId++;
        $this->rental = $rental;
        $this->amount = $amount;
        $this->paymentStatus = "PENDING";
    }

    abstract public function processPayment() : bool;
    abstract public function getPaymentMethod() : string;

    // Bagian yang sama untuk semua metode pembayaran, cukup ditulis sekali.
    protected function finishPayment() : bool {
        if ($this->paymentStatus === "PAID") return false;
        if (empty($this->rental->getItems()) || $this->amount > $this->rental->getOutstandingAmount()) {
            return false;
        }
        $this->rental->recordPayment($this->amount);
        $this->paymentDate = new DateTimeImmutable();
        $this->paymentStatus = "PAID";
        javaPrintf( "%s berhasil (simulasi): Rp%,.0f\n",
                $this->getPaymentMethod(), $this->amount);
        return true;
    }

    public function getAmount() : float { return $this->amount; }
    public function getPaymentStatus() : string { return $this->paymentStatus; }
}

class CashPayment extends Payment {
    private float $cashReceived = 0.0;

    public function __construct(?Rental $rental, float $amount, float $cashReceived) {
        parent::__construct($rental, $amount);
        $this->cashReceived = $cashReceived;
    }

    public function processPayment() : bool {
        if (!is_finite($this->cashReceived) || $this->cashReceived < $this->getAmount()) return false;
        if (!$this->finishPayment()) return false;
        javaPrintf( "Kembalian: Rp%,.0f\n", $this->cashReceived - $this->getAmount());
        return true;
    }

    public function getPaymentMethod() : string { return "Tunai"; }
}

class TransferPayment extends Payment {
    private ?string $bankName;

    public function __construct(?Rental $rental, float $amount, ?string $bankName) {
        parent::__construct($rental, $amount);
        $this->bankName = $bankName;
    }

    public function processPayment() : bool {
        if ($this->bankName == null || trim($this->bankName) === "") return false;
        // Simulasi latihan: tidak memanggil layanan bank.
        return $this->finishPayment();
    }

    public function getPaymentMethod() : string { return "Transfer " . $this->bankName; }
}

class EWalletPayment extends Payment {
    private ?string $provider;

    public function __construct(?Rental $rental, float $amount, ?string $provider) {
        parent::__construct($rental, $amount);
        $this->provider = $provider;
    }

    public function processPayment() : bool {
        if ($this->provider == null || trim($this->provider) === "") return false;
        // Simulasi latihan: tidak memanggil layanan dompet digital.
        return $this->finishPayment();
    }

    public function getPaymentMethod() : string { return "E-Wallet " . $this->provider; }
}

class Invoice {
    private int $invoiceId;
    private Rental $rental;
    private string $invoiceNumber;
    private DateTimeImmutable $issueDate;
    private float $totalAmount = 0.0;

    public function __construct(?Rental $rental) {
        $this->invoiceId = $rental->getRentalId();
        $this->rental = $rental;
        $this->issueDate = new DateTimeImmutable();
        $this->totalAmount = $rental->calculateTotal();
        $this->invoiceNumber = $this->generateInvoiceNumber();
    }

    public function generateInvoiceNumber() : string { return "INV-" . $this->invoiceId; }

    public function print() : void {
        println("\n=== INVOICE " . $this->invoiceNumber . " ===");
        println("Customer: " . $this->rental->getCustomer()->getName());
        foreach ($this->rental->getItems() as $item) {
            javaPrintf( "%s | %d baju x %d hari x Rp%,.0f"
                            . " + biaya Rp%,.0f = Rp%,.0f\n",
                    $item->getClothing()->getClothingName(), $item->getQuantity(),
                    $item->getRentalDays(), $item->getPricePerDay(),
                    $item->getAdditionalFee(), $item->calculateSubtotal());
        }
        javaPrintf( "Total sewa: Rp%,.0f\n", $this->totalAmount);
        println("Denda pengembalian, jika ada, dicatat terpisah.");
    }
}

class RentalReturn {
    private int $returnId;
    private Rental $rental;
    private DateTimeImmutable $returnDate;
    private string $conditionOnReturn;
    private float $totalFee = 0.0;
    private string $notes;

    public function __construct(?Rental $rental, ?DateTimeImmutable $date, string $condition, string $notes) {
        if ($rental == null || $date == null || $date->setTime(0, 0) < $rental->getRentalDate()) {
            throw new InvalidArgumentException("Tanggal pengembalian tidak valid.");
        }
        $this->returnId = $rental->getRentalId();
        $this->rental = $rental;
        $this->returnDate = $date;
        $this->conditionOnReturn = $condition;
        $this->notes = $notes;
    }

    public function calculateTotalFee() : float {
        $lateDays = (int) $this->rental->getPlannedReturnDate()->diff($this->returnDate->setTime(0, 0))->format("%r%a");
        // Asumsi contoh: Rp10.000 per hari per transaksi; belum ada denda kerusakan.
        $this->totalFee = max(0, $lateDays) * 10000.0;
        return $this->totalFee;
    }

    public function finalizeReturn() : void {
        $this->rental->completeReturn($this->returnDate->setTime(0, 0), $this->calculateTotalFee());
        println("\nPengembalian: " . $this->conditionOnReturn . " | " . $this->notes);
        javaPrintf( "Denda: Rp%,.0f\n", $this->totalFee);
    }

    public function getRental() : Rental { return $this->rental; }
}

// 6. MAIN: membuat objek dan memanggil method seperti contoh di kelas.
class Main {
    public static function main(array $args) : void {
        $admin = new Admin("Admin Reka", "admin@contoh.test", "contoh-admin");
        $customer = new Customer("Reka", "reka@contoh.test", "contoh-customer");
        println("Login customer: " . ($customer->login("reka@contoh.test", "contoh-customer") ? "true" : "false"));

        // Polymorphism: tipe induk User dapat menunjuk objek kelas anak.
        $pengguna = [$admin, $customer];
        foreach ($pengguna as $user) {
            println($user->getName() . " berperan sebagai " . $user->getRole());
        }

        $formal = new ClothingCategory(1, "Formal", "Baju acara resmi");
        $pesta = new ClothingCategory(2, "Pesta", "Baju pesta dan kostum");

        // Dua objek Suit memiliki tarif berbeda meskipun kelasnya sama.
        $jasStandar = new Suit(1, "Jas Standar", "L", "Hitam", 100000, 3, $formal, 20000);
        $jasPremium = new Suit(2, "Jas Premium", "L", "Biru", 250000, 2, $formal, 30000);
        $dress = new Dress(3, "Dress Pesta", "M", "Merah", 150000, 2, $pesta, "A-Line");
        $kostum = new Costume(4, "Kostum Bajak Laut", "L", "Cokelat", 80000, 2, $pesta, "Bajak Laut", 15000);

        $admin->addClothing($jasStandar);
        $admin->addClothing($jasPremium);
        $admin->addClothing($dress);
        $admin->addClothing($kostum);
        $admin->adjustStock($jasStandar, 1, "Penambahan satu jas");

        $sewa = $customer->createRental();
        $sewa->addItem($jasStandar, 2);       // Parameter opsional: otomatis jumlah 1.
        $sewa->addItem($jasPremium, 2);
        $sewa->addItem($dress, 2, 2);         // Parameter opsional: jumlah ditentukan.
        $sewa->addItem($kostum, 2);

        $invoice = new Invoice($sewa);
        $invoice->print();                  // Total: Rp1.525.000.

        // Polymorphism: pemanggilan sama, implementasi sesuai kelas anak.
        // Contoh DP dan pelunasan pada transaksi yang sama.
        println("\n=== PEMBAYARAN ===");
        $bayar1 = new CashPayment($sewa, 500000, 550000);
        $bayar2 = new TransferPayment($sewa, 700000, "BCA");
        $bayar3 = new EWalletPayment($sewa, 325000, "DANA");
        $bayar1->processPayment();
        $bayar2->processPayment();
        $bayar3->processPayment();
        println("Tagihan sewa lunas: " . ($sewa->getOutstandingAmount() == 0 ? "true" : "false"));

        // Simulasi kembali satu hari setelah tanggal rencana.
        $pengembalian = new RentalReturn($sewa,
                $sewa->getPlannedReturnDate()->modify("+1 day")->setTime(10, 0),
                "Baik", "Semua baju dikembalikan lengkap");
        $admin->processReturn($pengembalian);
        $bayarDenda = new CashPayment($sewa, $sewa->getOutstandingAmount(), 10000);
        $bayarDenda->processPayment();

        println("\n=== RIWAYAT SEWA ===");
        foreach ($customer->viewRentalHistory() as $r) {
            println("Sewa #" . $r->getRentalId() . " | " . $r->getStatus());
        }
        println("Stok Jas Standar setelah kembali: " . $jasStandar->getStock());
        println("Sisa tagihan: " . $sewa->getOutstandingAmount());
    }
}

Main::main($argv ?? []);
