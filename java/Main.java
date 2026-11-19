import java.util.*;
import java.time.*;
import java.time.temporal.ChronoUnit;

// 1. ABSTRACT CLASS: kelas induk tidak dibuat langsung menjadi objek.
abstract class User {
    private static int nextId = 1;
    private int userId;
    private String name;
    private String email;
    private String password;
    private String phone;
    private String address;
    private LocalDateTime createdAt;

    // Constructor: mengisi data awal ketika objek dibuat.
    public User(String name, String email, String password) {
        this.userId = nextId++;
        this.name = name;
        this.email = email;
        this.password = password;
        this.phone = "";
        this.address = "";
        this.createdAt = LocalDateTime.now();
    }

    // Login sederhana untuk latihan; tidak terhubung ke database.
    public boolean login(String email, String password) {
        return this.email.equals(email) && this.password.equals(password);
    }

    // Method ini meminta input hanya jika dipanggil.
    public void updateProfile() {
        Scanner input = new Scanner(System.in);
        System.out.print("Nama baru: ");
        name = input.nextLine();
        System.out.print("Nomor telepon: ");
        phone = input.nextLine();
        System.out.print("Alamat: ");
        address = input.nextLine();
        // System.in tidak ditutup agar tetap dapat dipakai program.
    }

    public String getName() { return name; }
    public abstract String getRole();
}

// 2. INHERITANCE: Customer mewarisi User.
class Customer extends User {
    private List<Rental> rentals = new ArrayList<>();

    public Customer(String name, String email, String password) {
        super(name, email, password);
    }

    public Rental createRental() {
        Rental rental = new Rental(this);
        rentals.add(rental);
        return rental;
    }

    public List<Rental> viewRentalHistory() {
        return Collections.unmodifiableList(rentals);
    }

    // OVERRIDING: mengisi method abstrak dari User.
    @Override
    public String getRole() { return "Customer"; }
}

class Admin extends User {
    private List<InventoryLog> managedLogs = new ArrayList<>();
    // Daftar sederhana agar addClothing benar-benar menyimpan objek baju.
    private List<Clothing> inventory = new ArrayList<>();

    public Admin(String name, String email, String password) {
        super(name, email, password);
    }

    public void addClothing(Clothing c) {
        if (c == null || inventory.contains(c)) {
            throw new IllegalArgumentException("Baju kosong atau sudah terdaftar.");
        }
        inventory.add(c);
        InventoryLog log = new InventoryLog(c, this, "DAFTAR", c.getStock(), "Stok awal");
        managedLogs.add(log);
        log.record();
    }

    // qty positif menambah stok; qty negatif mengurangi stok.
    public void adjustStock(Clothing c, int qty, String note) {
        if (!inventory.contains(c) || qty == 0 || qty == Integer.MIN_VALUE) {
            throw new IllegalArgumentException("Baju belum terdaftar atau jumlah tidak valid.");
        }
        if (qty > 0) c.increaseStock(qty);
        else c.reduceStock(-qty);
        InventoryLog log = new InventoryLog(c, this, "PENYESUAIAN", qty, note);
        managedLogs.add(log);
        log.record();
    }

    public void processReturn(RentalReturn r) {
        r.finalizeReturn();
        for (RentalItem item : r.getRental().getItems()) {
            InventoryLog log = new InventoryLog(item.getClothing(), this,
                    "PENGEMBALIAN", item.getQuantity(), "Baju dikembalikan");
            managedLogs.add(log);
            log.record();
        }
    }

    @Override
    public String getRole() { return "Admin"; }
}

// 3. ENCAPSULATION: atribut private diakses melalui method.
abstract class Clothing {
    private int clothingId;
    private String clothingName;
    private String size;
    private String color;
    private double rentalPricePerDay;
    private int stock;
    private String condition;
    private String description;
    private ClothingCategory category;

    public Clothing(int id, String name, String size, String color,
                    double price, int stock, ClothingCategory category) {
        if (stock < 0 || category == null) {
            throw new IllegalArgumentException("Stok atau kategori tidak valid.");
        }
        this.clothingId = id;
        this.clothingName = name;
        this.size = size;
        this.color = color;
        setRentalPricePerDay(price);
        this.stock = stock;
        this.category = category;
        this.condition = "Baik";
        this.description = "";
    }

    public boolean isAvailable(int qty) { return qty > 0 && stock >= qty; }

    public void reduceStock(int qty) {
        if (!isAvailable(qty)) {
            throw new IllegalArgumentException("Jumlah tidak valid atau stok tidak cukup.");
        }
        stock -= qty;
    }

    public void increaseStock(int qty) {
        if (qty <= 0 || stock > Integer.MAX_VALUE - qty) {
            throw new IllegalArgumentException("Penambahan stok tidak valid.");
        }
        stock += qty;
    }

    // Getter dan setter yang digunakan oleh contoh program.
    public String getClothingName() { return clothingName; }
    public double getRentalPricePerDay() { return rentalPricePerDay; }
    public int getStock() { return stock; }
    public void setRentalPricePerDay(double price) {
        if (!Double.isFinite(price) || price < 0) {
            throw new IllegalArgumentException("Tarif harus angka nonnegatif.");
        }
        rentalPricePerDay = price;
    }
}

class ClothingCategory {
    private int categoryId;
    private String categoryName;
    private String description;

    public ClothingCategory(int id, String name, String description) {
        this.categoryId = id;
        this.categoryName = name;
        this.description = description;
    }

    public int getCategoryId() { return categoryId; }
    public String getCategoryName() { return categoryName; }
    public String getDescription() { return description; }
    public void setCategoryName(String name) { categoryName = name; }
    public void setDescription(String description) { this.description = description; }
}

// Kelas anak menyimpan ciri khusus; tidak menghitung harga sewa.
class Dress extends Clothing {
    private String dressStyle;

    public Dress(int id, String name, String size, String color, double price,
                 int stock, ClothingCategory category, String style) {
        super(id, name, size, color, price, stock, category);
        this.dressStyle = style;
    }

    public String getDressStyle() { return dressStyle; }
}

class Suit extends Clothing {
    private double dryCleaningFee;

    public Suit(int id, String name, String size, String color, double price,
                int stock, ClothingCategory category, double fee) {
        super(id, name, size, color, price, stock, category);
        if (!Double.isFinite(fee) || fee < 0) {
            throw new IllegalArgumentException("Biaya cuci tidak valid.");
        }
        this.dryCleaningFee = fee;
    }

    public double getDryCleaningFee() { return dryCleaningFee; }
}

class Costume extends Clothing {
    private String theme;
    private double accessoryFee;

    public Costume(int id, String name, String size, String color, double price,
                   int stock, ClothingCategory category, String theme, double fee) {
        super(id, name, size, color, price, stock, category);
        if (!Double.isFinite(fee) || fee < 0) {
            throw new IllegalArgumentException("Biaya aksesori tidak valid.");
        }
        this.theme = theme;
        this.accessoryFee = fee;
    }

    public String getTheme() { return theme; }
    public double getAccessoryFee() { return accessoryFee; }
}

// 4. COMPOSITION: Rental membuat dan memiliki RentalItem.
class Rental {
    private static int nextId = 1;
    private int rentalId;
    private Customer customer;
    private LocalDate rentalDate;
    private LocalDate plannedReturnDate;
    private LocalDate actualReturnDate;
    private String status;
    private double totalPrice;
    private LocalDateTime createdAt;
    private List<RentalItem> items = new ArrayList<>();
    // Tambahan untuk mencatat DP/pelunasan dan biaya pengembalian.
    private double paidAmount;
    private double returnFee;

    public Rental(Customer customer) {
        this.rentalId = nextId++;
        this.customer = customer;
        this.rentalDate = LocalDate.now();
        this.plannedReturnDate = rentalDate;
        this.createdAt = LocalDateTime.now();
        this.status = "DRAFT";
    }

    // OVERLOADING: nama sama, jumlah parameter berbeda.
    public void addItem(Clothing c, int days) {
        addItem(c, days, 1);
    }

    public void addItem(Clothing c, int days, int qty) {
        if (paidAmount > 0 || status.equals("RETURNED")) {
            throw new IllegalStateException("Isi sewa tidak dapat diubah lagi.");
        }
        if (c == null || days <= 0 || !c.isAvailable(qty)) {
            throw new IllegalArgumentException("Baju, durasi, atau jumlah tidak valid.");
        }
        // Satu transaksi menggunakan satu tanggal pengembalian.
        if (!items.isEmpty() && days != items.get(0).getRentalDays()) {
            throw new IllegalArgumentException("Durasi semua item harus sama.");
        }
        LocalDate planned = rentalDate.plusDays(days);
        RentalItem item = new RentalItem(items.size() + 1, c, days, qty);
        if (!Double.isFinite(calculateTotal() + item.calculateSubtotal())) {
            throw new IllegalArgumentException("Total biaya terlalu besar.");
        }
        c.reduceStock(qty);
        items.add(item);
        plannedReturnDate = planned;
        updateStatus("RENTED");
        calculateTotal();
    }

    public double calculateTotal() {
        totalPrice = 0;
        for (RentalItem item : items) totalPrice += item.calculateSubtotal();
        return totalPrice;
    }

    public void updateStatus(String status) {
        if (!status.equals("RENTED") && !status.equals("RETURNED")) {
            throw new IllegalArgumentException("Status tidak dikenal.");
        }
        if (items.isEmpty() || this.status.equals("RETURNED")
                || (status.equals("RETURNED") && actualReturnDate == null)) {
            throw new IllegalStateException("Perubahan status tidak sesuai alur sewa.");
        }
        this.status = status;
    }

    // Dipakai oleh Payment; hanya pembayaran berhasil yang dicatat.
    public void recordPayment(double amount) {
        if (items.isEmpty() || !Double.isFinite(amount) || amount <= 0
                || amount > getOutstandingAmount()) {
            throw new IllegalArgumentException("Nominal pembayaran tidak valid.");
        }
        paidAmount += amount;
    }

    public double getOutstandingAmount() {
        return calculateTotal() + returnFee - paidAmount;
    }

    public void completeReturn(LocalDate date, double fee) {
        if (!status.equals("RENTED") || date.isBefore(rentalDate)
                || !Double.isFinite(fee) || fee < 0) {
            throw new IllegalStateException("Pengembalian tidak valid atau sudah diproses.");
        }
        for (RentalItem item : items) item.getClothing().increaseStock(item.getQuantity());
        actualReturnDate = date;
        returnFee = fee;
        updateStatus("RETURNED");
    }

    public int getRentalId() { return rentalId; }
    public Customer getCustomer() { return customer; }
    public LocalDate getRentalDate() { return rentalDate; }
    public LocalDate getPlannedReturnDate() { return plannedReturnDate; }
    public String getStatus() { return status; }
    public List<RentalItem> getItems() { return Collections.unmodifiableList(items); }
}

class RentalItem {
    private int rentalItemId;
    private Clothing clothing;
    private int quantity;
    private int rentalDays;
    private double pricePerDay;
    private double subtotal;
    private double additionalFee;

    public RentalItem(int id, Clothing c, int days, int qty) {
        if (c == null || days <= 0 || qty <= 0) {
            throw new IllegalArgumentException("Data item tidak valid.");
        }
        this.rentalItemId = id;
        this.clothing = c;
        this.quantity = qty;
        this.rentalDays = days;
        // Salin tarif saat transaksi dibuat, bukan membaca tarif terbaru terus-menerus.
        this.pricePerDay = c.getRentalPricePerDay();
        this.additionalFee = 0;
        // Biaya tambahan sekali per baju, bukan per hari.
        if (c instanceof Suit) {
            this.additionalFee = ((Suit) c).getDryCleaningFee() * qty;
        } else if (c instanceof Costume) {
            this.additionalFee = ((Costume) c).getAccessoryFee() * qty;
        }
        if (!Double.isFinite(calculateSubtotal())) {
            throw new IllegalArgumentException("Subtotal terlalu besar.");
        }
    }

    public double calculateSubtotal() {
        subtotal = pricePerDay * rentalDays * quantity + additionalFee;
        return subtotal;
    }

    public Clothing getClothing() { return clothing; }
    public int getQuantity() { return quantity; }
    public int getRentalDays() { return rentalDays; }
    public double getPricePerDay() { return pricePerDay; }
    public double getAdditionalFee() { return additionalFee; }
}

class InventoryLog {
    private static int nextId = 1;
    private int inventoryLogId;
    private Clothing clothing;
    private Admin admin;
    private String changeType;
    private int quantityChanged;
    private String notes;
    private LocalDateTime createdAt;

    public InventoryLog(Clothing c, Admin admin, String type, int qty, String notes) {
        this.inventoryLogId = nextId++;
        this.clothing = c;
        this.admin = admin;
        this.changeType = type;
        this.quantityChanged = qty;
        this.notes = notes;
        this.createdAt = LocalDateTime.now();
    }

    public void record() {
        System.out.println("Log " + inventoryLogId + " | " + changeType + " | "
                + clothing.getClothingName() + " | jumlah: " + quantityChanged
                + " | admin: " + admin.getName() + " | " + notes);
    }
}

// 5. ABSTRACT METHOD dan POLYMORPHISM pada pembayaran.
abstract class Payment {
    private static int nextId = 1;
    private int paymentId;
    private Rental rental;
    private LocalDateTime paymentDate;
    private double amount;
    private String paymentStatus;

    public Payment(Rental rental, double amount) {
        if (rental == null || !Double.isFinite(amount) || amount <= 0) {
            throw new IllegalArgumentException("Data pembayaran tidak valid.");
        }
        this.paymentId = nextId++;
        this.rental = rental;
        this.amount = amount;
        this.paymentStatus = "PENDING";
    }

    public abstract boolean processPayment();
    public abstract String getPaymentMethod();

    // Bagian yang sama untuk semua metode pembayaran, cukup ditulis sekali.
    protected boolean finishPayment() {
        if (paymentStatus.equals("PAID")) return false;
        if (rental.getItems().isEmpty() || amount > rental.getOutstandingAmount()) {
            return false;
        }
        rental.recordPayment(amount);
        paymentDate = LocalDateTime.now();
        paymentStatus = "PAID";
        System.out.printf(Locale.US, "%s berhasil (simulasi): Rp%,.0f%n",
                getPaymentMethod(), amount);
        return true;
    }

    public double getAmount() { return amount; }
    public String getPaymentStatus() { return paymentStatus; }
}

class CashPayment extends Payment {
    private double cashReceived;

    public CashPayment(Rental rental, double amount, double cashReceived) {
        super(rental, amount);
        this.cashReceived = cashReceived;
    }

    @Override
    public boolean processPayment() {
        if (!Double.isFinite(cashReceived) || cashReceived < getAmount()) return false;
        if (!finishPayment()) return false;
        System.out.printf(Locale.US, "Kembalian: Rp%,.0f%n", cashReceived - getAmount());
        return true;
    }

    @Override
    public String getPaymentMethod() { return "Tunai"; }
}

class TransferPayment extends Payment {
    private String bankName;

    public TransferPayment(Rental rental, double amount, String bankName) {
        super(rental, amount);
        this.bankName = bankName;
    }

    @Override
    public boolean processPayment() {
        if (bankName == null || bankName.trim().isEmpty()) return false;
        // Simulasi latihan: tidak memanggil layanan bank.
        return finishPayment();
    }

    @Override
    public String getPaymentMethod() { return "Transfer " + bankName; }
}

class EWalletPayment extends Payment {
    private String provider;

    public EWalletPayment(Rental rental, double amount, String provider) {
        super(rental, amount);
        this.provider = provider;
    }

    @Override
    public boolean processPayment() {
        if (provider == null || provider.trim().isEmpty()) return false;
        // Simulasi latihan: tidak memanggil layanan dompet digital.
        return finishPayment();
    }

    @Override
    public String getPaymentMethod() { return "E-Wallet " + provider; }
}

class Invoice {
    private int invoiceId;
    private Rental rental;
    private String invoiceNumber;
    private LocalDateTime issueDate;
    private double totalAmount;

    public Invoice(Rental rental) {
        this.invoiceId = rental.getRentalId();
        this.rental = rental;
        this.issueDate = LocalDateTime.now();
        this.totalAmount = rental.calculateTotal();
        this.invoiceNumber = generateInvoiceNumber();
    }

    public String generateInvoiceNumber() { return "INV-" + invoiceId; }

    public void print() {
        System.out.println("\n=== INVOICE " + invoiceNumber + " ===");
        System.out.println("Customer: " + rental.getCustomer().getName());
        for (RentalItem item : rental.getItems()) {
            System.out.printf(Locale.US, "%s | %d baju x %d hari x Rp%,.0f"
                            + " + biaya Rp%,.0f = Rp%,.0f%n",
                    item.getClothing().getClothingName(), item.getQuantity(),
                    item.getRentalDays(), item.getPricePerDay(),
                    item.getAdditionalFee(), item.calculateSubtotal());
        }
        System.out.printf(Locale.US, "Total sewa: Rp%,.0f%n", totalAmount);
        System.out.println("Denda pengembalian, jika ada, dicatat terpisah.");
    }
}

class RentalReturn {
    private int returnId;
    private Rental rental;
    private LocalDateTime returnDate;
    private String conditionOnReturn;
    private double totalFee;
    private String notes;

    public RentalReturn(Rental rental, LocalDateTime date, String condition, String notes) {
        if (rental == null || date == null || date.toLocalDate().isBefore(rental.getRentalDate())) {
            throw new IllegalArgumentException("Tanggal pengembalian tidak valid.");
        }
        this.returnId = rental.getRentalId();
        this.rental = rental;
        this.returnDate = date;
        this.conditionOnReturn = condition;
        this.notes = notes;
    }

    public double calculateTotalFee() {
        long lateDays = ChronoUnit.DAYS.between(rental.getPlannedReturnDate(), returnDate.toLocalDate());
        // Asumsi contoh: Rp10.000 per hari per transaksi; belum ada denda kerusakan.
        totalFee = Math.max(0, lateDays) * 10000.0;
        return totalFee;
    }

    public void finalizeReturn() {
        rental.completeReturn(returnDate.toLocalDate(), calculateTotalFee());
        System.out.println("\nPengembalian: " + conditionOnReturn + " | " + notes);
        System.out.printf(Locale.US, "Denda: Rp%,.0f%n", totalFee);
    }

    public Rental getRental() { return rental; }
}

// 6. MAIN: membuat objek dan memanggil method seperti contoh di kelas.
public class Main {
    public static void main(String[] args) {
        Admin admin = new Admin("Admin Reka", "admin@contoh.test", "contoh-admin");
        Customer customer = new Customer("Reka", "reka@contoh.test", "contoh-customer");
        System.out.println("Login customer: " + customer.login("reka@contoh.test", "contoh-customer"));

        // Polymorphism: tipe induk User dapat menunjuk objek kelas anak.
        User[] pengguna = {admin, customer};
        for (User user : pengguna) {
            System.out.println(user.getName() + " berperan sebagai " + user.getRole());
        }

        ClothingCategory formal = new ClothingCategory(1, "Formal", "Baju acara resmi");
        ClothingCategory pesta = new ClothingCategory(2, "Pesta", "Baju pesta dan kostum");

        // Dua objek Suit memiliki tarif berbeda meskipun kelasnya sama.
        Suit jasStandar = new Suit(1, "Jas Standar", "L", "Hitam", 100000, 3, formal, 20000);
        Suit jasPremium = new Suit(2, "Jas Premium", "L", "Biru", 250000, 2, formal, 30000);
        Dress dress = new Dress(3, "Dress Pesta", "M", "Merah", 150000, 2, pesta, "A-Line");
        Costume kostum = new Costume(4, "Kostum Bajak Laut", "L", "Cokelat", 80000, 2, pesta, "Bajak Laut", 15000);

        admin.addClothing(jasStandar);
        admin.addClothing(jasPremium);
        admin.addClothing(dress);
        admin.addClothing(kostum);
        admin.adjustStock(jasStandar, 1, "Penambahan satu jas");

        Rental sewa = customer.createRental();
        sewa.addItem(jasStandar, 2);       // Overloading: otomatis jumlah 1.
        sewa.addItem(jasPremium, 2);
        sewa.addItem(dress, 2, 2);         // Overloading: jumlah ditentukan.
        sewa.addItem(kostum, 2);

        Invoice invoice = new Invoice(sewa);
        invoice.print();                  // Total: Rp1.525.000.

        // Polymorphism: pemanggilan sama, implementasi sesuai kelas anak.
        // Contoh DP dan pelunasan pada transaksi yang sama.
        System.out.println("\n=== PEMBAYARAN ===");
        Payment bayar1 = new CashPayment(sewa, 500000, 550000);
        Payment bayar2 = new TransferPayment(sewa, 700000, "BCA");
        Payment bayar3 = new EWalletPayment(sewa, 325000, "DANA");
        bayar1.processPayment();
        bayar2.processPayment();
        bayar3.processPayment();
        System.out.println("Tagihan sewa lunas: " + (sewa.getOutstandingAmount() == 0));

        // Simulasi kembali satu hari setelah tanggal rencana.
        RentalReturn pengembalian = new RentalReturn(sewa,
                sewa.getPlannedReturnDate().plusDays(1).atTime(10, 0),
                "Baik", "Semua baju dikembalikan lengkap");
        admin.processReturn(pengembalian);
        Payment bayarDenda = new CashPayment(sewa, sewa.getOutstandingAmount(), 10000);
        bayarDenda.processPayment();

        System.out.println("\n=== RIWAYAT SEWA ===");
        for (Rental r : customer.viewRentalHistory()) {
            System.out.println("Sewa #" + r.getRentalId() + " | " + r.getStatus());
        }
        System.out.println("Stok Jas Standar setelah kembali: " + jasStandar.getStock());
        System.out.println("Sisa tagihan: " + sewa.getOutstandingAmount());
    }
}
