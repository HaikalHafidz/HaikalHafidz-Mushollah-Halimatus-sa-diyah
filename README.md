# Musholla Halimatussadiyah Website

[![Node.js](https://img.shields.io/badge/Node.js-18.x-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.x-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![MySQL](https://img.shields.io/badge/MySQL-8.x-4479A1?logo=mysql&logoColor=white)](https://www.mysql.com/)
[![XAMPP](https://img.shields.io/badge/XAMPP-8.x-FB7A24?logo=xampp&logoColor=white)](https://www.apachefriends.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

> **Sistem website profil, jadwal kegiatan, dan donasi untuk Musholla Halimatussadiyah** — dilengkapi dengan dashboard admin untuk memantau aktivitas, verifikasi donasi, dan mengelola pesan kontak.

---

## 📋 Daftar Isi

- [Fitur Utama](#-fitur-utama)
- [Teknologi](#-teknologi)
- [Struktur Folder](#-struktur-folder)
- [Panduan Instalasi](#-panduan-instalasi)
- [Endpoint API](#-endpoint-api)
- [Yang Wajib Dilengkapi](#-yang-wajib-dilengkapi)
- [Menjalankan Tanpa Backend](#-menjalankan-tanpa-backend)
- [Deployment](#-deployment)
- [Kontribusi](#-kontribusi)
- [Lisensi](#-lisensi)

---

## ✨ Fitur Utama

### 🏠 Situs Publik
| Halaman | Fungsi |
|---------|--------|
| **Beranda** | Profil singkat musholla |
| **Kegiatan** | Jadwal kegiatan mingguan (dapat diperbarui) |
| **Donasi** | Metode donasi (bank/e-wallet/QRIS) + form konfirmasi |
| **Kontak** | Formulir kontak untuk jamaah |

### 👨‍💼 Dashboard Admin (3 Akun Panitia)
| Fitur | Deskripsi |
|-------|-----------|
| **Ringkasan** | Total donasi, pesan, aktivitas admin, grafik donasi per bulan |
| **Manajemen Donasi** | Filter status, cari per nama/WA, verifikasi/tolak |
| **Pesan Kontak** | Tandai sudah dibaca |
| **Log Aktivitas** | Jejak aksi admin sebagai audit trail |
| **Pengaturan Akun** | Ganti password masing-masing admin |

---

## 🛠 Teknologi

### Frontend
- **HTML5**, **CSS3**, **JavaScript** (Vanilla)
- **Chart.js** – grafik dashboard
- **Axios** – komunikasi API

### Backend
- **Node.js** + **Express.js**
- **MySQL** (via XAMPP)
- **JWT** – autentikasi admin
- **dotenv** – konfigurasi lingkungan

---
