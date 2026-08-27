require('dotenv').config();
const jwt = require('jsonwebtoken');

// Ganti nilai ini lewat environment variable JWT_SECRET saat di-hosting produksi.
const JWT_SECRET = process.env.JWT_SECRET || 'ganti-rahasia-ini-saat-produksi-musholla-halimatussadiyah';
const MASA_BERLAKU_TOKEN = '12h';

function buatToken(admin) {
  return jwt.sign(
    { id: admin.id, username: admin.username, nama: admin.nama, peran: admin.peran },
    JWT_SECRET,
    { expiresIn: MASA_BERLAKU_TOKEN }
  );
}

function wajibLogin(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ sukses: false, pesan: 'Sesi admin tidak ditemukan. Silakan login kembali.' });
  }

  try {
    req.admin = jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    return res.status(401).json({ sukses: false, pesan: 'Sesi admin sudah kedaluwarsa. Silakan login kembali.' });
  }
}

module.exports = { buatToken, wajibLogin, JWT_SECRET };
