# 🔴 SISTEM PELAPORAN KENDALA TOBK - GANESHA OPERATION 🔴
### Aplikasi Berbasis Google Apps Script (HTML Service + Tailwind CSS + Telegram Bot API)

Aplikasi ini dibuat khusus untuk memfasilitasi pelaporan kendala teknis Try Out Berbasis Komputer (TOBK) bagi siswa Ganesha Operation dan tindak lanjut (follow-up) oleh tim admin/helpdesk secara terpusat, cepat, dan otomatis.

> 📁 **Lokasi Project Terpisah:** `C:\Users\goLPM\tobk-kendala-appscript\`  
> *(Proyek ini 100% independen dan terpisah dari project dashboard GO / Next.js).*

---

## 🚀 Fitur Utama Sesuai Kebutuhan

1. **Migrasi Data Excel ke Google Spreadsheet**
   - Data dari file `MASTER DATA SD.xlsx` (818 baris data siswa) telah diekstraksi ke format siap pakai: `data_siswa.csv`.
   - Siap di-import langsung ke sheet **`Data_Siswa`** pada Google Spreadsheet.

2. **Form Pelaporan Kendala Siswa Interaktif & Dinamis**
   - **Filter Nama Kota:** Sumenep, Pamekasan, Sampang, Bangkalan (Semadura).
   - **Filter Nama Unit:** Unit Agus Salim, Unit Jokotole, Unit Parteker, Unit Imam Bonjol, Unit Cempaka.
   - **Filter Jenjang Pendidikan:** SD, SMP, SMA/SMK (Pill selector modern).
   - **Asal Sekolah:** Dropdown / input pencarian otomatis sesuai jenjang yang dipilih.
   - **Nama Siswa & No. HP:** Dilengkapi pencarian otomatis (*auto-complete / search*) dari master data siswa sehingga No. HP dan asal sekolah otomatis terisi saat siswa memilih namanya.
   - **Kode Tiket Laporan:** Ter-generate otomatis dengan format unik (contoh: `TOBK-261029-A7F2`).
   - **Nama Mapel Sesuai Aturan Jenjang:**
     - Jenjang **SD & SMP**: `Bahasa Indonesia`, `Matematika`
     - Jenjang **SMA/SMK**: `TPS`, `Literasi`
   - **Kode TOBK:** Dropdown rekomendasi (TOBK 1 TKA SD, TOBK 2 TKA SD, TOBK UTBK SNBT, dll.) atau input bebas.
   - **Uraian Kendala:** Textarea kendala dilengkapi tombol *quick-tag* (Soal tidak muncul, Token error, Timer bermasalah, Force close, Gagal submit).

3. **Notifikasi Real-Time ke Grup Telegram**
   - Begitu siswa klik **KIRIM LAPORAN**, bot Telegram langsung mengirim pesan format HTML ke grup helpdesk dengan informasi lengkap:
     - 🎫 Kode Tiket
     - 👤 Nama Siswa, Sekolah, Jenjang, Kota & Unit
     - 📱 Nomor WhatsApp siswa (klik langsung membuka chat WA)
     - 📚 Mapel & Kode TOBK
     - ⚠️ Detail kendala yang dihadapi
     - ⏳ Status awal: *Menunggu Follow Up*

4. **Dashboard Admin & Rekapitulasi Follow Up**
   - **Proteksi PIN Admin:** Dashboard dapat dikunci dengan PIN (Default: `1984`, dapat diubah via Pengaturan).
   - **Metrik Rekap:** Total Laporan Masuk, Jumlah Belum Follow Up (Pending), Jumlah Sudah Follow Up (Selesai), serta Persentase Penyelesaian.
   - **Filter & Pencarian:** Filter status (Semua / Belum / Selesai), filter jenjang, dan pencarian cepat berdasarkan nama, sekolah, no HP, atau kode tiket.
   - **Aksi Follow Up Admin:**
     - Modal pencatatan solusi tindak lanjut & nama petugas admin.
     - Status otomatis berubah menjadi *Selesai Follow Up*.
     - **Tombol WhatsApp Langsung:** Admin cukup klik tombol WA pada laporan siswa, aplikasi akan membuka WhatsApp dengan pesan solusi yang sudah terisi otomatis (menggunakan kode tiket, nama siswa, dan catatan solusi).

5. **Tampilan Modern Khas Ganesha Operation**
   - Responsif (ramah diakses lewat HP siswa maupun laptop admin).
   - Desain modern bernuansa **Merah GO (#C41230)**, **Kuning Emas (#F59E0B)**, dan **Putih Bersih (#FFFFFF)**.
   - Menggunakan Tailwind CSS CDN, FontAwesome Icons, dan SweetAlert2 untuk notifikasi modal interaktif.

---

## 📁 Struktur File Project

```
C:\Users\goLPM\tobk-kendala-appscript\
├── Code.gs             -> Kode Backend Google Apps Script (V8)
├── Index.html          -> Halaman Frontend Lengkap (Form + Dashboard + Settings)
├── appsscript.json     -> Konfigurasi Manifest Apps Script
├── data_siswa.csv      -> Hasil konversi master data 818 siswa dari Excel
└── README.md           -> Panduan deployment dan penggunaan
```

---

## 🛠️ Langkah-Langkah Pemasangan di Google Apps Script

### Langkah 1: Buat Google Spreadsheet Baru
1. Buka [Google Spreadsheet](https://sheets.new) di browser Anda.
2. Beri nama spreadsheet, misalnya: **`DATABASE KENDALA TOBK - GANESHA OPERATION`**.

### Langkah 2: Import Data Siswa (`data_siswa.csv`)
1. Di Google Spreadsheet, klik menu **File** > **Import**.
2. Pilih tab **Upload** (Unggah), lalu pilih file:
   `C:\Users\goLPM\tobk-kendala-appscript\data_siswa.csv`
3. Pada opsi impor:
   - *Lokasi impor*: Pilih **Sisipkan sheet baru** (Insert new sheet).
   - *Tipe pemisah*: Pilih **Otomatis** atau **Koma**.
4. Ubah nama sheet hasil impor tersebut menjadi: **`Data_Siswa`**.

### Langkah 3: Buka Google Apps Script Editor
1. Pada spreadsheet yang sama, klik menu **Ekstensi** > **Apps Script**.
2. Pada panel kiri:
   - Buka file **`Code.gs`**, hapus isinya, lalu *copy-paste* seluruh isi file `Code.gs` dari folder project.
   - Buat file HTML baru: klik ikon **+** di sebelah *Files* > pilih **HTML** > beri nama **`Index`** (tanpa ekstensi .html).
   - Buka file **`Index.html`**, hapus isinya, lalu *copy-paste* seluruh isi file `Index.html` dari folder project.
   - *(Opsional)* Jika ingin mengatur manifest, buka **Project Settings** (ikon gerigi) > centang **Show "appsscript.json" manifest file in editor** > perbarui isi `appsscript.json`.

### Langkah 4: Inisialisasi Sheet Otomatis
1. Di editor Apps Script, pada dropdown fungsi di atas, pilih fungsi **`setupSpreadsheet`**.
2. Klik tombol **Run (Jalankan)**.
3. Berikan izin otorisasi (*Review Permissions* > Akun Google Anda > *Advanced* > *Go to ... (unsafe)* > *Allow*).
4. Fungsi ini akan otomatis membuat sheet **`Laporan_Kendala`** dan **`Pengaturan`** lengkap dengan header warna merah & kuning khas GO.

### Langkah 5: Setup Bot Telegram (Untuk Notifikasi Grup)
1. Buat bot di Telegram via **@BotFather**:
   - Ketik `/newbot`, ikuti langkahnya sampai mendapatkan **Bot Token** (contoh: `7123456789:AAH...`).
2. Buat grup Telegram untuk tim helpdesk TOBK GO (atau gunakan grup yang sudah ada).
3. Masukkan bot yang baru dibuat ke dalam grup tersebut dan jadikan sebagai **Administrator**.
4. Dapatkan **Chat ID** grup (bisa menggunakan bot `@userinfobot` atau `@RawDataBot` dimasukkan ke grup, chat ID grup biasanya diawali tanda minus `-100...`).
5. Masukkan Bot Token & Chat ID ke aplikasi:
   - Bisa langsung diisi pada tab **Pengaturan** (ikon gerigi) di web app, atau
   - Diisi langsung pada sheet **`Pengaturan`** di spreadsheet Anda.

### Langkah 6: Deploy Sebagai Web App
1. Di pojok kanan atas Apps Script, klik tombol biru **Terapkan (Deploy)** > **Deployment Baru (New Deployment)**.
2. Klik ikon gerigi di sebelah *Pilih jenis* > pilih **Aplikasi Web (Web app)**.
3. Konfigurasi:
   - **Deskripsi**: `Sistem Pelaporan Kendala TOBK GO v1.0`
   - **Jalankan sebagai (Execute as)**: **Saya (Email Anda)**
   - **Siapa yang memiliki akses (Who has access)**: **Siapa saja (Anyone)**
4. Klik **Deploy**. Salin URL Web App yang dihasilkan.
5. URL tersebut siap dibagikan ke siswa dan admin!

---

## 📱 Panduan Alur Kerja

```
[ Siswa Menemukan Kendala ]
            │
            ▼
[ Buka Web App -> Isi Form ]
 (Filter Kota, Unit, Jenjang SD/SMP/SMA, Sekolah, Siswa, Mapel, Kendala)
            │
            ├─────────────────────────────────────────────────┐
            ▼                                                 ▼
[ Tersimpan di Sheet 'Laporan_Kendala' ]       [ Notifikasi Masuk ke Grup Telegram ]
            │                                                 │
            └────────────────────────┬────────────────────────┘
                                     ▼
                          [ Admin Buka Dashboard ]
                   (Cek Rekap, Jumlah Pending vs Selesai)
                                     │
                                     ▼
                          [ Klik 'Follow Up' ]
                     (Tulis Catatan Solusi / Perbaikan)
                                     │
                                     ▼
                         [ Klik 'Kirim WA Siswa' ]
                     (Kirim Konfirmasi Solusi ke WhatsApp Siswa)
```

Aplikasi siap digunakan secara mandiri dan dapat diintegrasikan kapan saja sesuai kebutuhan operasional Ganesha Operation.
