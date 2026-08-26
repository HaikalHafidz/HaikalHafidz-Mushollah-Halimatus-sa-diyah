/**
 * Dashboard Admin Panitia — Musholla Halimatussadiyah
 * ------------------------------------------------------
 * Login via /api/admin/login lalu memakai token (Bearer) untuk seluruh
 * endpoint /api/admin/*. Token disimpan di sessionStorage (hilang saat tab
 * ditutup) — admin harus login ulang setiap kali membuka dashboard.
 */
(function () {
  const API = '/api/admin';
  let TOKEN = sessionStorage.getItem('musholla_admin_token') || '';
  let ADMIN = null;

  const $ = (sel, ctx) => (ctx || document).querySelector(sel);
  const $all = (sel, ctx) => Array.from((ctx || document).querySelectorAll(sel));

  const elLoginWrap = $('#db-login-wrap');
  const elShell = $('#db-shell');
  const elLoginGalat = $('#db-login-galat');
  const elToast = $('#db-toast');

  function formatRupiah(angka) {
    return 'Rp' + Number(angka || 0).toLocaleString('id-ID');
  }

  function formatWaktu(iso) {
    if (!iso) return '—';
    const d = new Date(iso.replace(' ', 'T') + 'Z');
    return d.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
  }

  function tampilkanToast(pesan) {
    elToast.textContent = pesan;
    elToast.classList.add('tampil');
    setTimeout(() => elToast.classList.remove('tampil'), 2600);
  }

  async function panggilAPI(path, opsi = {}) {
    const res = await fetch(API + path, {
      ...opsi,
      headers: {
        'Content-Type': 'application/json',
        ...(TOKEN ? { Authorization: 'Bearer ' + TOKEN } : {}),
        ...(opsi.headers || {}),
      },
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401) {
      keluar();
      throw new Error(data.pesan || 'Sesi berakhir, silakan login kembali.');
    }
    if (!res.ok) throw new Error(data.pesan || 'Terjadi kesalahan.');
    return data;
  }

  /* ==================================================== LOGIN / LOGOUT */
  function tampilkanDashboard() {
    elLoginWrap.style.display = 'none';
    elShell.classList.add('tampil');
    $('#db-admin-nama').textContent = ADMIN.nama;
    $('#db-admin-peran').textContent = ADMIN.peran + ' · @' + ADMIN.username;
    muatSemuaData();
  }

  function keluar() {
    TOKEN = '';
    ADMIN = null;
    sessionStorage.removeItem('musholla_admin_token');
    sessionStorage.removeItem('musholla_admin_profil');
    elShell.classList.remove('tampil');
    elLoginWrap.style.display = 'flex';
  }
  window.keluar = keluar;

  $('#form-login').addEventListener('submit', async (e) => {
    e.preventDefault();
    elLoginGalat.classList.remove('tampil');
    const btn = $('#btn-login');
    btn.disabled = true;
    btn.textContent = 'Memeriksa…';

    try {
      const username = $('#login-username').value.trim();
      const password = $('#login-password').value;
      const data = await panggilAPI('/login', { method: 'POST', body: JSON.stringify({ username, password }) });
      TOKEN = data.token;
      ADMIN = data.admin;
      sessionStorage.setItem('musholla_admin_token', TOKEN);
      sessionStorage.setItem('musholla_admin_profil', JSON.stringify(ADMIN));
      tampilkanDashboard();
    } catch (err) {
      elLoginGalat.textContent = err.message;
      elLoginGalat.classList.add('tampil');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Masuk Dashboard';
    }
  });

  $('#btn-logout').addEventListener('click', keluar);

  /* ==================================================== NAVIGASI TAB */
  function pindahTab(nama) {
    $all('.db-nav button').forEach((b) => b.classList.toggle('aktif', b.dataset.tab === nama));
    $all('.db-tab').forEach((s) => (s.style.display = s.dataset.tabPanel === nama ? 'block' : 'none'));
  }
  window.pindahTab = pindahTab;

  $('#db-nav').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-tab]');
    if (btn) pindahTab(btn.dataset.tab);
  });

  /* ==================================================== RINGKASAN */
  function labelStatus(status) {
    const peta = {
      menunggu_verifikasi: ['Menunggu', 'db-status--menunggu'],
      terverifikasi: ['Terverifikasi', 'db-status--terverifikasi'],
      ditolak: ['Ditolak', 'db-status--ditolak'],
      delay: ['Delay', 'db-status--delay'],
    };
    const [teks, kelas] = peta[status] || [status, 'db-status--menunggu'];
    return `<span class="db-status ${kelas}">${teks}</span>`;
  }

  async function muatRingkasan() {
    const { ringkasan: r } = await panggilAPI('/ringkasan');

    $('#stat-total-masuk').textContent = formatRupiah(r.totalDonasiMasuk);
    $('#stat-total-masuk-ket').textContent = `${r.jumlahDonasiTerverifikasi} transaksi terverifikasi`;
    $('#stat-menunggu').textContent = r.jumlahMenungguVerifikasi;
    $('#stat-delay').textContent = r.jumlahDelayPembayaran;
    $('#stat-delay-ket').textContent = `Belum diverifikasi > ${r.batasJamDelay} jam`;
    $('#stat-pesan-belum').textContent = r.pesanBelumDibaca;
    $('#stat-pesan-total-ket').textContent = `dari ${r.totalPesan} total pesan`;

    $('#lencana-delay').textContent = r.jumlahMenungguVerifikasi + r.jumlahDelayPembayaran;
    $('#lencana-pesan').textContent = r.pesanBelumDibaca;

    const elGrafik = $('#db-grafik');
    if (!r.grafikBulanan.length) {
      elGrafik.innerHTML = '<div class="db-kosong">Belum ada data donasi terverifikasi.</div>';
    } else {
      const maks = Math.max(...r.grafikBulanan.map((b) => b.total), 1);
      elGrafik.innerHTML = r.grafikBulanan
        .map((b) => {
          const tinggi = Math.max(6, Math.round((b.total / maks) * 130));
          const [tahun, bulan] = b.bulan.split('-');
          const namaBulan = new Date(`${tahun}-${bulan}-01`).toLocaleDateString('id-ID', { month: 'short' });
          return `<div class="db-grafik-kolom">
                     <div class="db-grafik-bar" style="height:${tinggi}px" title="${formatRupiah(b.total)}"></div>
                     <span class="lbl">${namaBulan} ${tahun}</span>
                   </div>`;
        })
        .join('');
    }
  }

  /* ==================================================== DONASI */
  let cacheDonasi = [];

  function renderTabelDonasiTerbaru() {
    const tbody = $('#tabel-donasi-terbaru tbody');
    const teratas = cacheDonasi.slice(0, 5);
    if (!teratas.length) {
      tbody.innerHTML = '<tr><td colspan="5" class="db-kosong">Belum ada konfirmasi donasi.</td></tr>';
      return;
    }
    tbody.innerHTML = teratas
      .map(
        (d) => `<tr>
          <td>${d.nama}</td><td>${d.metode}</td><td>${formatRupiah(d.jumlah)}</td>
          <td>${labelStatus(d.status_tampil)}</td><td>${formatWaktu(d.waktu)}</td>
        </tr>`
      )
      .join('');
  }

  function renderTabelDonasi() {
    const statusFilter = $('#filter-status').value;
    const cari = $('#filter-cari').value.trim().toLowerCase();

    let daftar = cacheDonasi;
    if (statusFilter) daftar = daftar.filter((d) => d.status_tampil === statusFilter);
    if (cari) {
      daftar = daftar.filter(
        (d) => d.nama.toLowerCase().includes(cari) || d.whatsapp.toLowerCase().includes(cari)
      );
    }

    const tbody = $('#tabel-donasi tbody');
    if (!daftar.length) {
      tbody.innerHTML = '<tr><td colspan="8" class="db-kosong">Tidak ada data yang cocok.</td></tr>';
      return;
    }

    tbody.innerHTML = daftar
      .map((d) => {
        const bisaAksi = d.status !== 'terverifikasi';
        const aksi =
          d.status === 'terverifikasi'
            ? '<span style="color:var(--teks-muted);font-size:.8rem;">Sudah selesai</span>'
            : `<div class="db-aksi-baris">
                 <button class="verif" onclick="verifikasiDonasi(${d.id})">✔ Verifikasi</button>
                 <button class="tolak" onclick="tolakDonasi(${d.id})">✕ Tolak</button>
               </div>`;
        return `<tr>
          <td>${d.nama}</td>
          <td>${d.whatsapp}</td>
          <td>${d.metode}</td>
          <td>${formatRupiah(d.jumlah)}</td>
          <td style="white-space:normal;max-width:180px;">${d.catatan || '—'}</td>
          <td>${labelStatus(d.status_tampil)}</td>
          <td>${formatWaktu(d.waktu)}</td>
          <td>${aksi}</td>
        </tr>`;
      })
      .join('');
  }

  async function muatDonasi() {
    const { data } = await panggilAPI('/donasi');
    cacheDonasi = data;
    renderTabelDonasiTerbaru();
    renderTabelDonasi();
  }

  async function perbaruiStatusDonasi(id, status) {
    try {
      await panggilAPI(`/donasi/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
      tampilkanToast(status === 'terverifikasi' ? 'Donasi ditandai terverifikasi.' : 'Donasi ditandai ditolak.');
      await Promise.all([muatDonasi(), muatRingkasan()]);
    } catch (err) {
      tampilkanToast('Gagal: ' + err.message);
    }
  }
  window.verifikasiDonasi = (id) => perbaruiStatusDonasi(id, 'terverifikasi');
  window.tolakDonasi = (id) => {
    if (confirm('Tandai konfirmasi donasi ini sebagai ditolak?')) perbaruiStatusDonasi(id, 'ditolak');
  };

  $('#filter-status').addEventListener('change', renderTabelDonasi);
  $('#filter-cari').addEventListener('input', renderTabelDonasi);

  /* ==================================================== PESAN KONTAK */
  async function muatPesan() {
    const { data } = await panggilAPI('/pesan');
    const wrap = $('#daftar-pesan');
    if (!data.length) {
      wrap.innerHTML = '<div class="db-kosong">Belum ada pesan masuk.</div>';
      return;
    }
    wrap.innerHTML = data
      .map(
        (p) => `<div class="db-pesan-item">
          <div class="db-pesan-atas">
            <span class="db-pesan-nama ${p.sudah_dibaca ? '' : 'db-pesan-belum'}">${p.nama}</span>
            <span style="font-size:.78rem;color:var(--teks-muted);">${formatWaktu(p.waktu)}</span>
          </div>
          <div style="font-size:.82rem;color:var(--teks-muted);margin-bottom:6px;">${p.kontak} · ${p.perihal}</div>
          <p style="margin:0 0 8px;">${p.pesan}</p>
          ${
            p.sudah_dibaca
              ? ''
              : `<button class="db-btn db-btn--garis db-btn--kecil" onclick="tandaiPesanDibaca(${p.id})">Tandai sudah dibaca</button>`
          }
        </div>`
      )
      .join('');
  }

  window.tandaiPesanDibaca = async (id) => {
    try {
      await panggilAPI(`/pesan/${id}/baca`, { method: 'PATCH' });
      await Promise.all([muatPesan(), muatRingkasan()]);
    } catch (err) {
      tampilkanToast('Gagal: ' + err.message);
    }
  };

  /* ==================================================== AKTIVITAS LOG */
  async function muatAktivitas() {
    const { data } = await panggilAPI('/aktivitas?batas=40');
    const wrap = $('#daftar-aktivitas');
    if (!data.length) {
      wrap.innerHTML = '<div class="db-kosong">Belum ada aktivitas tercatat.</div>';
      return;
    }
    wrap.innerHTML = data
      .map(
        (a) => `<div class="db-log-baris">
          <span class="db-log-titik"></span>
          <div class="db-log-isi">
            <div><strong>${a.admin_nama}</strong> — ${a.aksi}</div>
            ${a.detail ? `<div style="color:var(--teks-muted);">${a.detail}</div>` : ''}
            <div class="db-log-waktu">${formatWaktu(a.waktu)}</div>
          </div>
        </div>`
      )
      .join('');
  }

  /* ==================================================== PENGATURAN */
  $('#form-ganti-password').addEventListener('submit', async (e) => {
    e.preventDefault();
    const elGalat = $('#db-ganti-galat');
    const elSukses = $('#db-ganti-sukses');
    elGalat.classList.remove('tampil');
    elSukses.classList.remove('tampil');

    try {
      const passwordLama = $('#pw-lama').value;
      const passwordBaru = $('#pw-baru').value;
      await panggilAPI('/ganti-password', { method: 'POST', body: JSON.stringify({ passwordLama, passwordBaru }) });
      elSukses.textContent = 'Password berhasil diganti.';
      elSukses.classList.add('tampil');
      e.target.reset();
    } catch (err) {
      elGalat.textContent = err.message;
      elGalat.classList.add('tampil');
    }
  });

  /* ==================================================== MUAT SEMUA */
  async function muatSemuaData() {
    try {
      await Promise.all([muatRingkasan(), muatDonasi(), muatPesan(), muatAktivitas()]);
    } catch (err) {
      tampilkanToast('Gagal memuat data: ' + err.message);
    }
  }
  window.muatSemuaData = muatSemuaData;

  /* ==================================================== INIT */
  (function init() {
    const profilTersimpan = sessionStorage.getItem('musholla_admin_profil');
    if (TOKEN && profilTersimpan) {
      try {
        ADMIN = JSON.parse(profilTersimpan);
        tampilkanDashboard();
      } catch (e) {
        keluar();
      }
    }
  })();
})();
