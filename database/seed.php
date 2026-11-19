<?php
declare(strict_types=1);

use Rentique\Config\Database;

require dirname(__DIR__).'/backend/bootstrap.php';
if (PHP_SAPI !== 'cli') {
    exit(1);
}

$db = Database::connect();
$db->beginTransaction();
try {
    // Demo IDs 1–12 are reserved on a freshly migrated showcase database.
    $db->exec('LOCK TABLE clothings IN SHARE ROW EXCLUSIVE MODE');
    $user = $db->prepare('INSERT INTO users(name,email,password_hash,role,phone,address)
        VALUES (?,?,?,?,?,?) ON CONFLICT (email) DO NOTHING');
    foreach ([
        ['Admin Rentique','admin@rentique.test','Admin123!','ADMIN','',''],
        ['Reka Putri','customer@rentique.test','Customer123!','CUSTOMER','0812-0000-0012','Bandung, Jawa Barat'],
    ] as [$name,$email,$password,$role,$phone,$address]) {
        $user->execute([$name,$email,password_hash($password,PASSWORD_DEFAULT),$role,$phone,$address]);
    }
    $adminId = $db->query("SELECT id FROM users WHERE email='admin@rentique.test'")->fetchColumn();
    $category = $db->prepare('INSERT INTO clothing_categories(name,description) VALUES (?,?) ON CONFLICT(name) DO NOTHING');
    foreach (['Formal'=>'Busana untuk acara resmi.', 'Pesta'=>'Gaun dan busana perayaan.', 'Panggung'=>'Kostum untuk pertunjukan dan pesta tema.'] as $name=>$description) {
        $category->execute([$name,$description]);
    }
    $categories = $db->query('SELECT name,id FROM clothing_categories')->fetchAll(PDO::FETCH_KEY_PAIR);
    $products = [
        [1,'Jas Standar','SUIT','Formal','L','Hitam',100000,3,'suit',null,20000,null,null,'Jas hitam berpotongan klasik dengan dua kancing, disertai celana senada.'],
        [2,'Jas Premium','SUIT','Formal','L','Biru',250000,2,'jas-premium',null,30000,null,null,'Setelan biru maritim dengan bahu terstruktur untuk resepsi dan acara resmi.'],
        [3,'Dress Pesta','DRESS','Pesta','M','Merah',150000,2,'dress','A-Line',null,null,null,'Gaun merah bersiluet A-line dengan rok panjang yang bergerak ringan saat dikenakan.'],
        [4,'Kostum Bajak Laut','COSTUME','Panggung','L','Cokelat',80000,2,'costume',null,null,'Bajak Laut',15000,'Mantel kapten dengan kemeja beraksen ruffle dan topi untuk panggung bertema bajak laut.'],
        [5,'Slip Dress Sage','DRESS','Pesta','S','Hijau sage',145000,4,'slip-sage','Slip dress',null,null,null,'Gaun satin hijau lembut dengan tali tipis dan jatuh kain yang mengalir.'],
        [6,'Gaun Malam Onyx','DRESS','Formal','M','Hitam',185000,3,'gaun-hitam','Column',null,null,null,'Gaun hitam panjang untuk jamuan malam, dengan potongan ramping dan kilau satin.'],
        [7,'Jas Linen Pasir','SUIT','Formal','M','Beige',165000,4,'jas-linen',null,25000,null,null,'Sepasang jas dan celana linen warna pasir untuk acara siang hari.'],
        [8,'Gaun Kerajaan','COSTUME','Panggung','M','Zamrud',165000,2,'gaun-kerajaan',null,null,'Kerajaan',20000,'Gaun panggung berwarna zamrud dengan lengan panjang dan rok lebar.'],
        [9,'Dress Plisket Champagne','DRESS','Pesta','L','Champagne',175000,3,'dress-champagne','Pleated',null,null,null,'Lipatan halus berwarna champagne memberi tekstur pada gaun pesta ini.'],
        [10,'Tuksedo Arang','SUIT','Formal','XL','Arang',240000,2,'tuxedo',null,30000,null,null,'Setelan malam berwarna arang dengan kerah satin untuk acara formal.'],
        [11,'Kostum Pangeran','COSTUME','Panggung','L','Biru malam',135000,2,'pangeran',null,null,'Pangeran',15000,'Mantel seremonial brokat biru malam untuk pertunjukan berlatar kerajaan.'],
        [12,'Kostum Balerina','COSTUME','Panggung','S','Merah muda',95000,3,'balerina',null,null,'Balet',10000,'Kostum tari dengan rok tulle berlapis berwarna merah muda lembut.'],
    ];
    $insert = $db->prepare('INSERT INTO clothings(id,name,type,category_id,size,color,rental_price_per_day,stock,
        image_url,dress_style,dry_cleaning_fee,theme,accessory_fee,description) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        ON CONFLICT(id) DO NOTHING RETURNING id');
    $log = $db->prepare("INSERT INTO inventory_logs (clothing_id, admin_id, actor_id, change_type, quantity_changed, notes)
        VALUES (?,?,?,'INITIAL',?,'Registrasi stok koleksi awal')");
    foreach ($products as [$id,$name,$type,$cat,$size,$color,$price,$stock,$image,$style,$clean,$theme,$fee,$desc]) {
        $insert->execute([$id,$name,$type,$categories[$cat],$size,$color,$price,$stock,"/images/$image.webp",$style,$clean,$theme,$fee,$desc]);
        if ($insert->fetchColumn() !== false) {
            $log->execute([$id,$adminId,$adminId,$stock]);
        }
    }
    $db->exec("SELECT setval(pg_get_serial_sequence('clothings','id'), GREATEST((SELECT max(id) FROM clothings), (SELECT last_value FROM clothings_id_seq)))");
    $db->commit();
    echo "Koleksi demo siap.\n";
} catch (Throwable $error) {
    $db->rollBack();
    throw $error;
}
