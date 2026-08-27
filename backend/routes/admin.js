/**
 * Rute API untuk dashboard admin panitia (dashboard.html)
 * Semua rute di sini butuh login (kecuali /login) — lihat middleware wajibLogin.
 *
 * Menggunakan MySQL (mysql2/promise) lewat backend/database.js — dijalankan
 * di atas XAMPP. Semua query bersifat async/await.
 */
const express = require('express');
const bcrypt = require('bcryptjs');
const { getPool } = require('../database');
const { buatToken, wajibLogin } = require('../middleware/auth');

const router = express.Router();

// Konfirmasi donasi dianggap "delay" (terhambat) bila masih menunggu verifikasi
// lebih dari batas jam berikut sejak dikirim jamaah.
const BATAS_JAM_DELAY = 48;

async function catatAktivitas(adminNama, aksi, detail = '') {
  const pool = getPool();
  await pool.query(
    'INSERT INTO aktivitas_log (admin_nama, aksi, detail) VALUES (?, ?, ?)',
    [adminNama, aksi, detail]
  );
}

/* ============================== LOGIN ============================== */
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ sukses: false, pesan: 'Username dan password wajib diisi.' });
    }

    const pool = getPool();
    const [rows] = await pool.query('SELECT * FROM admins WHERE username = ?', [
      String(username).trim(),
    ]);
    const admin = rows[0];

    if (!admin || !(await bcrypt.compare(password, admin.password_hash))) {
      return res.status(401).json({ sukses: false, pesan: 'Username atau password salah.' });
    }

    const token = buatToken(admin);
    await catatAktivitas(admin.nama, 'Login ke dashboard');

    res.json({
      sukses: true,
      token,
      admin: { id: admin.id, nama: admin.nama, username: admin.username, peran: admin.peran },
    });
  } catch (err) {
    console.error('Gagal login admin:', err.message);
    res.status(500).json({ sukses: false, pesan: 'Terjadi kesalahan pada server. Coba lagi beberapa saat.' });
  }
});

// Semua rute di bawah ini wajib membawa token admin yang sah
router.use(wajibLogin);

/* ============================ PROFIL ADMIN =========================== */
router.get('/profil', (req, res) => {
  res.json({ sukses: true, admin: req.admin });
});

router.post('/ganti-password', async (req, res) => {
  try {
    const { passwordLama, passwordBaru } = req.body || {};
    if (!passwordLama || !passwordBaru || passwordBaru.length < 6) {
      return res.status(400).json({
        sukses: false,
        pesan: 'Password lama wajib diisi dan password baru minimal 6 karakter.',
      });
    }

    const pool = getPool();
    const [rows] = await pool.query('SELECT * FROM admins WHERE id = ?', [req.admin.id]);
    const admin = rows[0];

    if (!admin || !(await bcrypt.compare(passwordLama, admin.password_hash))) {
      return res.status(401).json({ sukses: false, pesan: 'Password lama tidak sesuai.' });
    }

    const hashBaru = await bcrypt.hash(passwordBaru, 10);
    await pool.query('UPDATE admins SET password_hash = ? WHERE id = ?', [hashBaru, admin.id]);
    await catatAktivitas(admin.nama, 'Mengganti password akun sendiri');

    res.json({ sukses: true, pesan: 'Password berhasil diganti.' });
  } catch (err) {
    console.error('Gagal mengganti password:', err.message);
    res.status(500).json({ sukses: false, pesan: 'Terjadi kesalahan pada server. Coba lagi beberapa saat.' });
  }
});

/* ========================= RINGKASAN DASHBOARD ======================== */
router.get('/ringkasan', async (req, res) => {
  try {
    const pool = getPool();
    const [semuaDonasi] = await pool.query('SELECT * FROM konfirmasi_donasi ORDER BY waktu DESC');

    const batasDelayMs = BATAS_JAM_DELAY * 60 * 60 * 1000;
    const sekarang = Date.now();

    let totalTerverifikasi = 0;
    let jumlahTerverifikasi = 0;
    let jumlahMenunggu = 0;
    let jumlahDelay = 0;
    let jumlahDitolak = 0;

    const perMetode = {};
    const perBulan = {};

    semuaDonasi.forEach((d) => {
      perMetode[d.metode] = (perMetode[d.metode] || 0) + 1;

      if (d.status === 'terverifikasi') {
        totalTerverifikasi += Number(d.jumlah);
        jumlahTerverifikasi += 1;
        const bulan = d.waktu.slice(0, 7); // YYYY-MM
        perBulan[bulan] = (perBulan[bulan] || 0) + Number(d.jumlah);
      } else if (d.status === 'ditolak') {
        jumlahDitolak += 1;
      } else {
        // menunggu_verifikasi -> cek apakah sudah lewat batas jadi "delay"
        const waktuMasuk = new Date(d.waktu.replace(' ', 'T')).getTime();
        const lamaMenunggu = sekarang - waktuMasuk;
        if (lamaMenunggu > batasDelayMs) {
          jumlahDelay += 1;
        } else {
          jumlahMenunggu += 1;
        }
      }
    });

    const [[{ n: pesanBelumDibaca }]] = await pool.query(
      'SELECT COUNT(*) AS n FROM pesan_kontak WHERE sudah_dibaca = 0'
    );
    const [[{ n: totalPesan }]] = await pool.query('SELECT COUNT(*) AS n FROM pesan_kontak');

    const grafikBulanan = Object.keys(perBulan)
      .sort()
      .slice(-6)
      .map((bulan) => ({ bulan, total: perBulan[bulan] }));

    res.json({
      sukses: true,
      ringkasan: {
        totalDonasiMasuk: totalTerverifikasi,
        jumlahDonasiTerverifikasi: jumlahTerverifikasi,
        jumlahMenungguVerifikasi: jumlahMenunggu,
        jumlahDelayPembayaran: jumlahDelay,
        jumlahDitolak: jumlahDitolak,
        totalKonfirmasiMasuk: semuaDonasi.length,
        pesanBelumDibaca,
        totalPesan,
        perMetode,
        grafikBulanan,
        batasJamDelay: BATAS_JAM_DELAY,
      },
    });
  } catch (err) {
    console.error('Gagal mengambil ringkasan dashboard:', err.message);
    res.status(500).json({ sukses: false, pesan: 'Terjadi kesalahan pada server. Coba lagi beberapa saat.' });
  }
});

/* ============================ DATA DONASI ============================ */
// GET /api/admin/donasi?status=menunggu_verifikasi|terverifikasi|ditolak|delay&cari=
router.get('/donasi', async (req, res) => {
  try {
    const { status, cari } = req.query;
    const pool = getPool();
    const [rows] = await pool.query('SELECT * FROM konfirmasi_donasi ORDER BY waktu DESC');

    const batasDelayMs = BATAS_JAM_DELAY * 60 * 60 * 1000;
    const sekarang = Date.now();

    let daftar = rows.map((d) => {
      let statusTampil = d.status;
      if (d.status === 'menunggu_verifikasi') {
        const waktuMasuk = new Date(d.waktu.replace(' ', 'T')).getTime();
        if (sekarang - waktuMasuk > batasDelayMs) statusTampil = 'delay';
      }
      return { ...d, status_tampil: statusTampil };
    });

    if (status) {
      daftar = daftar.filter((d) => d.status_tampil === status);
    }
    if (cari) {
      const q = String(cari).toLowerCase();
      daftar = daftar.filter(
        (d) => d.nama.toLowerCase().includes(q) || d.whatsapp.toLowerCase().includes(q)
      );
    }

    res.json({ sukses: true, data: daftar });
  } catch (err) {
    console.error('Gagal mengambil data donasi:', err.message);
    res.status(500).json({ sukses: false, pesan: 'Terjadi kesalahan pada server. Coba lagi beberapa saat.' });
  }
});

// PATCH /api/admin/donasi/:id  { status: 'terverifikasi'|'ditolak'|'menunggu_verifikasi', catatan_admin }
router.patch('/donasi/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, catatan_admin } = req.body || {};

    const statusValid = ['menunggu_verifikasi', 'terverifikasi', 'ditolak'];
    if (status && !statusValid.includes(status)) {
      return res.status(400).json({ sukses: false, pesan: 'Status tidak valid.' });
    }

    const pool = getPool();
    const [rowsAwal] = await pool.query('SELECT * FROM konfirmasi_donasi WHERE id = ?', [id]);
    const data = rowsAwal[0];
    if (!data) return res.status(404).json({ sukses: false, pesan: 'Data donasi tidak ditemukan.' });

    await pool.query(
      `UPDATE konfirmasi_donasi
       SET status = COALESCE(?, status),
           catatan_admin = COALESCE(?, catatan_admin),
           diverifikasi_oleh = CASE WHEN ? IS NOT NULL THEN ? ELSE diverifikasi_oleh END,
           waktu_verifikasi = CASE WHEN ? IS NOT NULL THEN NOW() ELSE waktu_verifikasi END
       WHERE id = ?`,
      [
        status || null,
        catatan_admin ?? null,
        status || null,
        req.admin.nama,
        status || null,
        id,
      ]
    );

    await catatAktivitas(
      req.admin.nama,
      `Memperbarui status donasi #${id}`,
      `${data.nama} — status baru: ${status || data.status}`
    );

    const [rowsBaru] = await pool.query('SELECT * FROM konfirmasi_donasi WHERE id = ?', [id]);
    res.json({ sukses: true, data: rowsBaru[0] });
  } catch (err) {
    console.error('Gagal memperbarui status donasi:', err.message);
    res.status(500).json({ sukses: false, pesan: 'Terjadi kesalahan pada server. Coba lagi beberapa saat.' });
  }
});

/* ============================ PESAN KONTAK ============================ */
router.get('/pesan', async (req, res) => {
  try {
    const pool = getPool();
    const [daftar] = await pool.query('SELECT * FROM pesan_kontak ORDER BY waktu DESC');
    res.json({ sukses: true, data: daftar });
  } catch (err) {
    console.error('Gagal mengambil pesan kontak:', err.message);
    res.status(500).json({ sukses: false, pesan: 'Terjadi kesalahan pada server. Coba lagi beberapa saat.' });
  }
});

router.patch('/pesan/:id/baca', async (req, res) => {
  try {
    const { id } = req.params;
    const pool = getPool();
    const [rows] = await pool.query('SELECT * FROM pesan_kontak WHERE id = ?', [id]);
    const data = rows[0];
    if (!data) return res.status(404).json({ sukses: false, pesan: 'Pesan tidak ditemukan.' });

    await pool.query('UPDATE pesan_kontak SET sudah_dibaca = 1 WHERE id = ?', [id]);
    await catatAktivitas(req.admin.nama, `Menandai pesan #${id} sudah dibaca`, data.nama);

    res.json({ sukses: true });
  } catch (err) {
    console.error('Gagal menandai pesan sudah dibaca:', err.message);
    res.status(500).json({ sukses: false, pesan: 'Terjadi kesalahan pada server. Coba lagi beberapa saat.' });
  }
});

/* =========================== AKTIVITAS LOG ============================ */
router.get('/aktivitas', async (req, res) => {
  try {
    const batas = Math.min(Number(req.query.batas) || 30, 100);
    const pool = getPool();
    const [daftar] = await pool.query(
      'SELECT * FROM aktivitas_log ORDER BY waktu DESC LIMIT ?',
      [batas]
    );
    res.json({ sukses: true, data: daftar });
  } catch (err) {
    console.error('Gagal mengambil log aktivitas:', err.message);
    res.status(500).json({ sukses: false, pesan: 'Terjadi kesalahan pada server. Coba lagi beberapa saat.' });
  }
});

module.exports = router;
