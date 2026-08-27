require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const { initDatabase, getPool } = require('./database');
const rutaAdmin = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3000;

const DATA_DIR = path.join(__dirname, 'data');
const FRONTEND_DIR = path.join(__dirname, '..', 'frontend');

const FILE_KEGIATAN = path.join(DATA_DIR, 'kegiatan.json');
const FILE_DONASI = path.join(DATA_DIR, 'donasi.json');

app.use(cors());
app.use(express.json());
app.use(express.static(FRONTEND_DIR));

/* ---------------- util baca JSON (khusus data statis: kegiatan & info rekening) ---------------- */
function bacaJSON(filePath, defaultValue) {
  try {
    if (!fs.existsSync(filePath)) return defaultValue;
    const isi = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(isi);
  } catch (err) {
    console.error(`Gagal membaca ${filePath}:`, err.message);
    return defaultValue;
  }
}

/* ---------------- API: KEGIATAN ---------------- */
app.get('/api/kegiatan', (req, res) => {
  const data = bacaJSON(FILE_KEGIATAN, []);
  res.json(data);
});

/* ---------------- API: DONASI (info rekening) ---------------- */
app.get('/api/donasi', (req, res) => {
  const data = bacaJSON(FILE_DONASI, { bank: [], ewallet: [] });
  res.json(data);
});

/* ---------------- API: FORMULIR KONTAK (tersimpan di database MySQL) ---------------- */
app.post('/api/kontak', async (req, res) => {
  try {
    const { nama, kontak, perihal, pesan } = req.body || {};

    if (!nama || !kontak || !pesan) {
      return res.status(400).json({ sukses: false, pesan: 'Nama, kontak, dan pesan wajib diisi.' });
    }

    const pool = getPool();
    await pool.query(
      'INSERT INTO pesan_kontak (nama, kontak, perihal, pesan) VALUES (?, ?, ?, ?)',
      [
        String(nama).trim(),
        String(kontak).trim(),
        perihal ? String(perihal).trim() : 'Pertanyaan Umum',
        String(pesan).trim(),
      ]
    );

    res.status(201).json({ sukses: true, pesan: 'Pesan berhasil diterima. Jazakumullahu khairan.' });
  } catch (err) {
    console.error('Gagal menyimpan pesan kontak:', err.message);
    res.status(500).json({ sukses: false, pesan: 'Terjadi kesalahan pada server. Coba lagi beberapa saat.' });
  }
});

/* ---------------- API: KONFIRMASI DONASI (tersimpan di database MySQL) ---------------- */
app.post('/api/donasi/konfirmasi', async (req, res) => {
  try {
    const { nama, whatsapp, metode, jumlah, catatan } = req.body || {};

    if (!nama || !whatsapp || !metode || !jumlah) {
      return res.status(400).json({ sukses: false, pesan: 'Nama, WhatsApp, metode, dan nominal wajib diisi.' });
    }

    const pool = getPool();
    await pool.query(
      `INSERT INTO konfirmasi_donasi (nama, whatsapp, metode, jumlah, catatan, status)
       VALUES (?, ?, ?, ?, ?, 'menunggu_verifikasi')`,
      [
        String(nama).trim(),
        String(whatsapp).trim(),
        String(metode).trim(),
        Number(jumlah) || 0,
        catatan ? String(catatan).trim() : '',
      ]
    );

    res.status(201).json({
      sukses: true,
      pesan: 'Konfirmasi donasi diterima, JazakumuLlahu khairan. Panitia akan memverifikasi segera.',
    });
  } catch (err) {
    console.error('Gagal menyimpan konfirmasi donasi:', err.message);
    res.status(500).json({ sukses: false, pesan: 'Terjadi kesalahan pada server. Coba lagi beberapa saat.' });
  }
});

/* ---------------- API: DASHBOARD ADMIN ---------------- */
app.use('/api/admin', rutaAdmin);

/* ---------------- fallback: arahkan rute non-API ke frontend ---------------- */
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(FRONTEND_DIR, 'index.html'), (err) => {
    if (err) next(err);
  });
});

/* ---------------- mulai server (tunggu database MySQL siap dulu) ---------------- */
async function mulaiServer() {
  await initDatabase();

  app.listen(PORT, () => {
    console.log(`Musholla Halimatussadiyah — server berjalan di http://localhost:${PORT}`);
    console.log(`Dashboard admin panitia: http://localhost:${PORT}/dashboard.html`);
  });
}

mulaiServer().catch((err) => {
  console.error('\n❌ Server gagal dijalankan karena database bermasalah.');
  console.error('   Pastikan XAMPP (MySQL) sudah "Start", lalu coba jalankan ulang "npm start".\n');
  process.exit(1);
});
