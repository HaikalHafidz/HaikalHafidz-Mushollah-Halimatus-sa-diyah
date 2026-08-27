CREATE DATABASE IF NOT EXISTS `musholla_halimatussadiyah`
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE `musholla_halimatussadiyah`;

-- Akun admin/panitia yang bisa login ke dashboard.html
CREATE TABLE IF NOT EXISTS `admins` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `nama` VARCHAR(191) NOT NULL,
  `username` VARCHAR(100) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `peran` VARCHAR(100) NOT NULL DEFAULT 'Admin Panitia',
  `dibuat_pada` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Konfirmasi transfer donasi yang dikirim jamaah lewat donasi.html
CREATE TABLE IF NOT EXISTS `konfirmasi_donasi` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `nama` VARCHAR(191) NOT NULL,
  `whatsapp` VARCHAR(50) NOT NULL,
  `metode` VARCHAR(50) NOT NULL,
  `jumlah` BIGINT NOT NULL DEFAULT 0,
  `catatan` TEXT NULL,
  `status` VARCHAR(30) NOT NULL DEFAULT 'menunggu_verifikasi',
  `catatan_admin` TEXT NULL,
  `diverifikasi_oleh` VARCHAR(191) NULL,
  `waktu` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `waktu_verifikasi` DATETIME NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Pesan masuk dari formulir kontak (kontak.html)
CREATE TABLE IF NOT EXISTS `pesan_kontak` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `nama` VARCHAR(191) NOT NULL,
  `kontak` VARCHAR(191) NOT NULL,
  `perihal` VARCHAR(100) DEFAULT 'Pertanyaan Umum',
  `pesan` TEXT NOT NULL,
  `sudah_dibaca` TINYINT(1) NOT NULL DEFAULT 0,
  `waktu` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Jejak aktivitas admin (audit trail) untuk dashboard
CREATE TABLE IF NOT EXISTS `aktivitas_log` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `admin_nama` VARCHAR(191) NOT NULL,
  `aksi` VARCHAR(255) NOT NULL,
  `detail` TEXT NULL,
  `waktu` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
