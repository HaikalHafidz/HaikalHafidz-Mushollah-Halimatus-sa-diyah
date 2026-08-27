/**
 * Musholla Halimatussadiyah — Lapisan Database (MySQL via XAMPP)
 * ------------------------------------------------------------------
 * Menyimpan seluruh data operasional situs di database MySQL yang
 * dijalankan lewat XAMPP (Apache + MySQL + phpMyAdmin).
 *
 * Tabel:
 *   admins           -> akun admin/panitia yang bisa login ke dashboard.html
 *   konfirmasi_donasi-> konfirmasi transfer donasi dari jamaah (status verifikasi)
 *   pesan_kontak     -> pesan masuk dari formulir kontak
 *   aktivitas_log    -> jejak aktivitas admin (audit trail) untuk dashboard
 *
 * PENTING — CARA MENYIAPKAN XAMPP:
 *   1. Buka XAMPP Control Panel, klik "Start" pada modul Apache & MySQL.
 *   2. Tidak perlu membuat database secara manual — kode ini akan membuat
 *      database & tabel di atas secara OTOMATIS saat pertama kali server
 *      dijalankan (npm start). Anda tetap bisa melihatnya lewat
 *      http://localhost/phpmyadmin setelah server berjalan.
 *   3. Salin file backend/.env.example menjadi backend/.env, lalu sesuaikan
 *      bila konfigurasi MySQL Anda berbeda dari default XAMPP
 *      (host=localhost, user=root, password kosong, database=musholla_halimatussadiyah).
 *
 * Database & tabel dibuat otomatis saat server pertama kali dijalankan
 * (npm start) lewat fungsi initDatabase() di bawah ini.
 */

require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = Number(process.env.DB_PORT) || 3306;
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_NAME = process.env.DB_NAME || 'musholla_halimatussadiyah';

let pool = null;

/* ---------------------------------------------- PASTIKAN DATABASE ADA */
async function pastikanDatabaseAda() {
  // Koneksi sementara TANPA memilih database, khusus untuk membuat
  // database bila belum ada (mirip menjalankan "CREATE DATABASE" di phpMyAdmin).
  const koneksiAwal = await mysql.createConnection({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
  });

  await koneksiAwal.query(
    `CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  );
  await koneksiAwal.end();
}

/* -------------------------------------------------------------- SKEMA */
async function buatSkema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS admins (
      id INT AUTO_INCREMENT PRIMARY KEY,
      nama VARCHAR(191) NOT NULL,
      username VARCHAR(100) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      peran VARCHAR(100) NOT NULL DEFAULT 'Admin Panitia',
      dibuat_pada DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS konfirmasi_donasi (
      id INT AUTO_INCREMENT PRIMARY KEY,
      nama VARCHAR(191) NOT NULL,
      whatsapp VARCHAR(50) NOT NULL,
      metode VARCHAR(50) NOT NULL,
      jumlah BIGINT NOT NULL DEFAULT 0,
      catatan TEXT NULL,
      status VARCHAR(30) NOT NULL DEFAULT 'menunggu_verifikasi',
      catatan_admin TEXT NULL,
      diverifikasi_oleh VARCHAR(191) NULL,
      waktu DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      waktu_verifikasi DATETIME NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS pesan_kontak (
      id INT AUTO_INCREMENT PRIMARY KEY,
      nama VARCHAR(191) NOT NULL,
      kontak VARCHAR(191) NOT NULL,
      perihal VARCHAR(100) DEFAULT 'Pertanyaan Umum',
      pesan TEXT NOT NULL,
      sudah_dibaca TINYINT(1) NOT NULL DEFAULT 0,
      waktu DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS aktivitas_log (
      id INT AUTO_INCREMENT PRIMARY KEY,
      admin_nama VARCHAR(191) NOT NULL,
      aksi VARCHAR(255) NOT NULL,
      detail TEXT NULL,
      waktu DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
}

/* ------------------------------------------------- SEED AKUN ADMIN --
   Dibuat otomatis hanya jika tabel admins masih kosong (instalasi baru).
   Kredensial default DICETAK SEKALI di terminal saat server start —
   WAJIB langsung diganti oleh masing-masing admin lewat menu
   "Ganti Password" di dashboard.
------------------------------------------------------------------- */
function buatKataSandiAcak() {
  return Math.random().toString(36).slice(-5) + Math.random().toString(36).slice(-3).toUpperCase();
}

async function seedAdminJikaKosong() {
  const [rows] = await pool.query('SELECT COUNT(*) AS n FROM admins');
  if (rows[0].n > 0) return null;

  const akunDefault = [
    { nama: 'Admin Panitia 1', username: 'panitia1' },
    { nama: 'Admin Panitia 2', username: 'panitia2' },
    { nama: 'Admin Panitia 3', username: 'panitia3' },
  ];

  const kredensialUntukDicetak = [];
  for (const akun of akunDefault) {
    const passwordAwal = buatKataSandiAcak();
    const hash = await bcrypt.hash(passwordAwal, 10);
    await pool.query(
      'INSERT INTO admins (nama, username, password_hash, peran) VALUES (?, ?, ?, ?)',
      [akun.nama, akun.username, hash, 'Admin Panitia']
    );
    kredensialUntukDicetak.push({ ...akun, passwordAwal });
  }

  return kredensialUntukDicetak;
}

/* ------------------------------------------------------ INISIALISASI */
async function initDatabase() {
  if (pool) return pool;

  try {
    await pastikanDatabaseAda();
  } catch (err) {
    console.error('\n❌ Gagal terhubung ke MySQL. Pastikan modul MySQL di XAMPP Control Panel sudah "Start".');
    console.error(`   Detail: ${err.message}\n`);
    throw err;
  }

  pool = mysql.createPool({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    // Supaya kolom DATETIME dikembalikan sebagai string 'YYYY-MM-DD HH:mm:ss'
    // (memudahkan format tanggal di dashboard.js seperti sebelumnya).
    dateStrings: true,
  });

  await buatSkema();

  const kredensialBaru = await seedAdminJikaKosong();
  if (kredensialBaru) {
    console.log('\n========================================================');
    console.log(' 3 akun admin dashboard dibuat otomatis (SEKALI TAMPIL).');
    console.log(' Segera catat & ganti password lewat menu di dashboard:');
    kredensialBaru.forEach((a) => {
      console.log(`   - ${a.nama} | username: ${a.username} | password: ${a.passwordAwal}`);
    });
    console.log('========================================================\n');
  }

  console.log(`✅ Terhubung ke database MySQL "${DB_NAME}" di ${DB_HOST}:${DB_PORT} (XAMPP).`);

  return pool;
}

function getPool() {
  if (!pool) {
    throw new Error('Database belum diinisialisasi. Panggil initDatabase() terlebih dahulu di server.js.');
  }
  return pool;
}

module.exports = { initDatabase, getPool };
