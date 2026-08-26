/* =========================================================
   Musholla Halimatussadiyah — main.js
   Menghubungkan frontend ke Backend API (Express).
   Jika backend belum berjalan (mis. file dibuka langsung),
   otomatis memakai data cadangan supaya tampilan tetap utuh.
   ========================================================= */

const API_BASE = (() => {
  // Jika situs diakses lewat file:// atau host statis tanpa backend,
  // fetch ke /api akan gagal dan kode akan jatuh ke data cadangan.
  return window.location.origin && window.location.protocol.startsWith('http')
    ? '/api'
    : 'http://localhost:3000/api';
})();

/* ---------- Data cadangan (dipakai bila API tidak terjangkau) ---------- */
const CADANGAN_KEGIATAN = [
  { hari: "Senin", nama: "TPA Anak-anak", jam: "16.00 – 17.30 WIB", mulai: "16:00", selesai: "17:30", pengisi: "Ustadzah TPA", deskripsi: "Belajar membaca Al-Qur'an, iqro, hafalan surat pendek, dan adab sehari-hari untuk anak-anak sekitar musholla." },
  { hari: "Selasa", nama: "Pengajian Kaum Ibu", jam: "13.00 – 15.00 WIB", mulai: "13:00", selesai: "15:00", pengisi: "Ustadzah Pembina", deskripsi: "Kajian rutin siang untuk jamaah ibu-ibu, membahas fiqih harian, akhlak, dan tadabbur Al-Qur'an." },
  { hari: "Rabu", nama: "TPA Anak-anak", jam: "16.00 – 17.30 WIB", mulai: "16:00", selesai: "17:30", pengisi: "Ustadzah TPA", deskripsi: "Belajar membaca Al-Qur'an, iqro, hafalan surat pendek, dan adab sehari-hari untuk anak-anak sekitar musholla." },
  { hari: "Kamis", nama: "Malam Jumat: Yasin & Sholawat", jam: "Ba'da Maghrib", mulai: "18:00", selesai: "19:30", pengisi: "Jamaah & Remaja Musholla", deskripsi: "Pembacaan Yasin, tahlil, dan sholawat bersama diiringi rebana, dilanjutkan tausiyah singkat." },
  { hari: "Jumat", nama: "TPA Anak-anak", jam: "16.00 – 17.30 WIB", mulai: "16:00", selesai: "17:30", pengisi: "Ustadzah TPA", deskripsi: "Belajar membaca Al-Qur'an, iqro, hafalan surat pendek, dan adab sehari-hari untuk anak-anak sekitar musholla." },
  { hari: "Sabtu", nama: "Malam Ahad: Majelis Sholawat", jam: "Ba'da Isya", mulai: "19:30", selesai: "21:00", pengisi: "Dipimpin Habib", deskripsi: "Majelis dzikir dan sholawat bulanan yang dipimpin langsung oleh Habib, terbuka untuk seluruh warga." },
  { hari: "Ahad", nama: "Libur / Kegiatan Insidental", jam: "—", mulai: null, selesai: null, pengisi: "—", deskripsi: "Tidak ada kegiatan rutin. Informasi kegiatan insidental akan diumumkan lewat media sosial musholla." }
];

const CADANGAN_DONASI = {
  bank: [
    { bank: "Bank BSI (Syariah Indonesia)", no: "XXXX-XXXX-XXXX", atasNama: "Panitia Musholla Halimatussadiyah" },
    { bank: "Bank Mandiri", no: "XXXX-XXXX-XXXX", atasNama: "Panitia Musholla Halimatussadiyah" }
  ],
  ewallet: [
    { nama: "DANA", no: "08XX-XXXX-XXXX" },
    { nama: "GoPay", no: "08XX-XXXX-XXXX" },
    { nama: "OVO", no: "08XX-XXXX-XXXX" }
  ]
};

/* ---------- Nav mobile ---------- */
function pasangNavMobile(){
  const tombol = document.querySelector('.tombol-menu');
  const nav = document.querySelector('.nav-utama');
  if(!tombol || !nav) return;
  tombol.addEventListener('click', () => {
    const terbuka = nav.classList.toggle('terbuka');
    tombol.setAttribute('aria-expanded', terbuka ? 'true' : 'false');
  });
  nav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
    nav.classList.remove('terbuka');
    tombol.setAttribute('aria-expanded', 'false');
  }));
}

/* ---------- Reveal saat scroll ---------- */
function pasangReveal(){
  const elemen = document.querySelectorAll('.reveal');
  if(!('IntersectionObserver' in window) || elemen.length === 0){
    elemen.forEach(el => el.classList.add('terlihat'));
    return;
  }
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if(entry.isIntersecting){
        entry.target.classList.add('terlihat');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });
  elemen.forEach(el => observer.observe(el));
}

/* ---------- Modal pratonton (dipakai untuk foto galeri & video YouTube) ---------- */
function pasangModalMedia(){
  const modal = document.getElementById('modal-media');
  const konten = document.getElementById('modal-media-konten');
  const tombolTutup = document.getElementById('modal-media-tutup');
  if(!modal || !konten) return;

  function bukaModal(html){
    konten.innerHTML = html;
    modal.classList.add('terbuka');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }
  function tutupModal(){
    modal.classList.remove('terbuka');
    modal.setAttribute('aria-hidden', 'true');
    konten.innerHTML = ''; // hentikan video yang sedang diputar
    document.body.style.overflow = '';
  }

  // Foto galeri (Galeri Sekilas) — buka versi besar saat diklik
  document.querySelectorAll('.galeri-foto').forEach(tombol => {
    tombol.addEventListener('click', () => {
      const urlBesar = tombol.getAttribute('data-full');
      const alt = tombol.querySelector('img')?.getAttribute('alt') || '';
      bukaModal(`<img src="${urlBesar}" alt="${alt}">`);
    });
  });

  // Kartu video YouTube — putar langsung di pop-up
  document.querySelectorAll('[data-youtube]').forEach(kartu => {
    kartu.addEventListener('click', () => {
      const idVideo = kartu.getAttribute('data-youtube');
      bukaModal(`
        <div class="modal-media__video-bungkus">
          <iframe src="https://www.youtube.com/embed/${idVideo}?autoplay=1&rel=0" title="Pemutar video YouTube" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>
        </div>
      `);
    });
  });

  tombolTutup?.addEventListener('click', tutupModal);
  modal.addEventListener('click', (e) => { if(e.target === modal) tutupModal(); });
  document.addEventListener('keydown', (e) => { if(e.key === 'Escape') tutupModal(); });
}

/* ---------- Ambil data dari API dengan fallback ---------- */
async function ambilData(endpoint, cadangan){
  try{
    const res = await fetch(`${API_BASE}${endpoint}`, { headers: { 'Accept': 'application/json' } });
    if(!res.ok) throw new Error('Respons API tidak OK');
    return await res.json();
  }catch(err){
    console.warn(`[Musholla] API ${endpoint} belum terjangkau, memakai data cadangan.`, err.message);
    return cadangan;
  }
}

/* ---------- Render strip jadwal mingguan (elemen tanda tangan) ---------- */
function renderStripMinggu(list, containerSelector){
  const wadah = document.querySelector(containerSelector);
  if(!wadah) return;
  const HARI_AKTIF = ["Senin","Selasa","Rabu","Kamis","Jumat","Sabtu"];
  wadah.innerHTML = list.map(k => `
    <div class="hari-kolom ${HARI_AKTIF.includes(k.hari) ? 'aktif' : ''}">
      <span class="nama-hari">${k.hari}</span>
      <span class="isi-kegiatan">${k.hari === 'Ahad' ? 'Tidak ada kegiatan rutin' : k.nama}</span>
    </div>
  `).join('');
}

/* ---------- Status kegiatan langsung (sedang berlangsung / berikutnya) ---------- */
function renderStatusKegiatan(list, containerSelector){
  const wadah = document.querySelector(containerSelector);
  if(!wadah) return;

  const URUTAN_HARI = ["Ahad","Senin","Selasa","Rabu","Kamis","Jumat","Sabtu"];

  const keMenit = (jam) => {
    if(!jam) return null;
    const [j, m] = jam.split(':').map(Number);
    return (j * 60) + m;
  };

  function tampilkanStatus(){
    const sekarang = new Date();
    const hariIni = URUTAN_HARI[sekarang.getDay()];
    const menitSekarang = (sekarang.getHours() * 60) + sekarang.getMinutes();

    // 1) Cek apakah ada kegiatan yang sedang berlangsung sekarang
    const kegiatanHariIni = list.find(k => k.hari === hariIni && k.mulai && k.selesai);
    if(kegiatanHariIni){
      const mulai = keMenit(kegiatanHariIni.mulai);
      const selesai = keMenit(kegiatanHariIni.selesai);
      if(menitSekarang >= mulai && menitSekarang <= selesai){
        wadah.classList.remove('tidak-aktif');
        wadah.innerHTML = `<span class="titik"></span> Sedang berlangsung sekarang: <strong>${kegiatanHariIni.nama}</strong> (${kegiatanHariIni.jam})`;
        return;
      }
    }

    // 2) Tidak ada yang sedang berlangsung — cari kegiatan berikutnya, mulai dari hari ini
    const idxHariIni = URUTAN_HARI.indexOf(hariIni);
    for(let i = 0; i < 7; i++){
      const idx = (idxHariIni + i) % 7;
      const namaHari = URUTAN_HARI[idx];
      const kandidat = list.find(k => k.hari === namaHari && k.mulai && k.selesai);
      if(!kandidat) continue;

      if(i === 0){
        const mulai = keMenit(kandidat.mulai);
        if(menitSekarang >= mulai) continue; // kegiatan hari ini sudah lewat, cari hari berikutnya
        wadah.classList.add('tidak-aktif');
        wadah.innerHTML = `<span class="titik"></span> Kegiatan berikutnya: <strong>${kandidat.nama}</strong> — Hari ini, ${kandidat.jam}`;
        return;
      }

      wadah.classList.add('tidak-aktif');
      wadah.innerHTML = `<span class="titik"></span> Kegiatan berikutnya: <strong>${kandidat.nama}</strong> — ${namaHari}, ${kandidat.jam}`;
      return;
    }

    wadah.classList.add('tidak-aktif');
    wadah.innerHTML = `<span class="titik"></span> Belum ada jadwal kegiatan mendatang.`;
  }

  tampilkanStatus();
  setInterval(tampilkanStatus, 60000); // perbarui tiap menit agar tetap "live"
}

/* ---------- Render daftar kegiatan detail ---------- */
function renderDaftarKegiatan(list, containerSelector){
  const wadah = document.querySelector(containerSelector);
  if(!wadah) return;
  const aktif = list.filter(k => k.hari !== 'Ahad');
  wadah.innerHTML = aktif.map(k => `
    <div class="kartu-kegiatan reveal">
      <div class="kk-waktu">
        <span class="hr">${k.hari}</span>
        <span class="jam">${k.jam}</span>
      </div>
      <div>
        <h3>${k.nama}</h3>
        <p style="margin-bottom:6px;">${k.deskripsi}</p>
        <span style="font-size:.82rem;font-weight:700;color:var(--hijau-700);">Pengisi: ${k.pengisi}</span>
      </div>
    </div>
  `).join('');
  pasangReveal();
}

/* ---------- Render info donasi ---------- */
function renderDonasi(data, bankSelector, ewalletSelector){
  const wadahBank = document.querySelector(bankSelector);
  const wadahEwallet = document.querySelector(ewalletSelector);
  if(wadahBank){
    wadahBank.innerHTML = data.bank.map(b => `
      <div class="baris-rekening">
        <div>
          <span class="nama-bank">${b.bank}</span><br>
          <span class="no">${b.no}</span>
        </div>
        <button class="btn-salin" data-salin="${b.no}">Salin</button>
      </div>
      <p style="font-size:.82rem;margin:-4px 0 14px;">a.n. ${b.atasNama}</p>
    `).join('');
  }
  if(wadahEwallet){
    wadahEwallet.innerHTML = data.ewallet.map(e => `
      <div class="baris-rekening">
        <div>
          <span class="nama-bank">${e.nama}</span><br>
          <span class="no">${e.no}</span>
        </div>
        <button class="btn-salin" data-salin="${e.no}">Salin</button>
      </div>
    `).join('');
  }
  pasangSalin();
}

function pasangSalin(){
  document.querySelectorAll('[data-salin]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const teks = btn.getAttribute('data-salin');
      try{
        await navigator.clipboard.writeText(teks);
        const asli = btn.textContent;
        btn.textContent = 'Tersalin!';
        setTimeout(() => btn.textContent = asli, 1600);
      }catch(e){ /* clipboard tidak tersedia, abaikan diam-diam */ }
    });
  });
}

/* ---------- Modal pratonton: Galeri Foto (klik untuk perbesar) & Video YouTube (klik untuk putar) ---------- */
function pasangGaleriMedia(){
  const modal = document.getElementById('modal-media');
  const konten = document.getElementById('modal-media-konten');
  const tombolTutup = document.getElementById('modal-media-tutup');
  if(!modal || !konten) return;

  function bukaModal(html){
    konten.innerHTML = html;
    modal.classList.add('terbuka');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    tombolTutup.focus();
  }
  function tutupModal(){
    modal.classList.remove('terbuka');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    konten.innerHTML = ''; // hentikan video yang sedang diputar
  }

  // Foto (Galeri Sekilas)
  document.querySelectorAll('.galeri-foto').forEach(tombol => {
    tombol.addEventListener('click', () => {
      const src = tombol.getAttribute('data-full');
      const alt = tombol.querySelector('img')?.getAttribute('alt') || 'Foto musholla';
      bukaModal(`<img src="${src}" alt="${alt}">`);
    });
  });

  // Video YouTube (kartu dengan data-youtube="ID_VIDEO")
  document.querySelectorAll('[data-youtube]').forEach(kartu => {
    kartu.addEventListener('click', () => {
      const id = kartu.getAttribute('data-youtube');
      bukaModal(`
        <div class="modal-media__video-bungkus">
          <iframe src="https://www.youtube.com/embed/${id}?autoplay=1&rel=0"
            title="Pemutar video YouTube" allow="autoplay; encrypted-media; picture-in-picture"
            allowfullscreen></iframe>
        </div>
      `);
    });
  });

  tombolTutup?.addEventListener('click', tutupModal);
  modal.addEventListener('click', (e) => { if(e.target === modal) tutupModal(); });
  document.addEventListener('keydown', (e) => { if(e.key === 'Escape' && modal.classList.contains('terbuka')) tutupModal(); });
}

/* ---------- Kirim formulir (kontak / konfirmasi donasi) ke API ---------- */
function pasangFormulir(formSelector, endpoint, statusSelector){
  const form = document.querySelector(formSelector);
  const status = document.querySelector(statusSelector);
  if(!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    const tombolKirim = form.querySelector('button[type="submit"]');
    const labelAsli = tombolKirim.textContent;
    tombolKirim.disabled = true;
    tombolKirim.textContent = 'Mengirim...';
    try{
      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if(!res.ok) throw new Error('Gagal mengirim');
      status.textContent = 'Terkirim. Terima kasih, pesan Anda sudah kami terima.';
      status.className = 'pesan-status tampil sukses';
      form.reset();
    }catch(err){
      status.textContent = 'Backend API belum berjalan di server ini, jadi pesan belum benar-benar terkirim. Jalankan folder /backend (npm start) agar formulir ini aktif penuh.';
      status.className = 'pesan-status tampil gagal';
    }finally{
      tombolKirim.disabled = false;
      tombolKirim.textContent = labelAsli;
    }
  });
}

/* ---------- Inisialisasi per halaman ---------- */
document.addEventListener('DOMContentLoaded', async () => {
  pasangNavMobile();
  pasangReveal();
  pasangSalin();
  pasangGaleriMedia();
  pasangModalMedia();

  if(document.querySelector('[data-strip-minggu]')){
    const data = await ambilData('/kegiatan', CADANGAN_KEGIATAN);
    renderStripMinggu(data, '[data-strip-minggu]');
  }
  if(document.querySelector('[data-status-kegiatan]')){
    const data = await ambilData('/kegiatan', CADANGAN_KEGIATAN);
    renderStatusKegiatan(data, '[data-status-kegiatan]');
  }
  if(document.querySelector('[data-daftar-kegiatan]')){
    const data = await ambilData('/kegiatan', CADANGAN_KEGIATAN);
    renderDaftarKegiatan(data, '[data-daftar-kegiatan]');
  }
  if(document.querySelector('[data-donasi-bank]')){
    const data = await ambilData('/donasi', CADANGAN_DONASI);
    renderDonasi(data, '[data-donasi-bank]', '[data-donasi-ewallet]');
  }

  pasangFormulir('#form-kontak', '/kontak', '#status-kontak');
  pasangFormulir('#form-konfirmasi', '/donasi/konfirmasi', '#status-konfirmasi');
});
