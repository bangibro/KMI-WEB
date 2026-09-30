# WEB KMI - Request Postingan

Project ini memakai **Supabase sebagai database online**. Tidak ada SQLite atau PostgreSQL lokal sebagai database aplikasi.

Alur utama:

```text
WEB KMI
├─ Masuk sebagai User  -> form request -> token browser -> progress
└─ Masuk sebagai Admin -> Supabase Auth -> dashboard -> kelola request
```

## Arsitektur

- Supabase Auth: login email/password dan JWT.
- Supabase Database: PostgreSQL managed oleh Supabase.
- Supabase Storage: bucket `uploads` untuk avatar dan gambar hasil.
- Backend Node.js: API tipis yang memvalidasi token request dan role admin. `SUPABASE_SERVICE_ROLE_KEY` hanya berada di server.
- React + Tailwind: frontend multi-user.

## Setup Supabase Dashboard

1. Buat project baru di Supabase.
2. Buka **SQL Editor > New query**.
3. Salin seluruh isi `supabase/schema.sql`, tempel, lalu klik **Run**. Schema baru ini menyederhanakan tabel menjadi `divisions`, `profiles`, `requests`, dan `activity_logs`.
4. **Peringatan:** schema tersebut menghapus tabel versi lama sebelum membuat struktur baru. Jalankan hanya setelah data lama tidak diperlukan atau sudah dicadangkan.
   Jika schema sudah pernah dijalankan, jalankan migration `supabase/migrations/20260930_add_division_passwords.sql` di SQL Editor sebelum menjalankan seed.
5. Buka **Project Settings > API**. Salin:
   - Project URL
   - `anon` / publishable key
   - `service_role` / secret key (server saja, jangan masukkan frontend atau Git)
6. Aktifkan **Authentication > Providers > Email**.

Schema otomatis membuat tabel, trigger profile, activity log, dan RLS. Role admin yang tersedia:

- `super_admin`
- `admin_bidang`
- `pic_staff`

## Konfigurasi PowerShell

```powershell
cd C:\Users\alias\Documents\CODING\WEB_KMI
Copy-Item .env.example .env
notepad .env
```

Isi `.env`:

```env
SUPABASE_URL=https://PROJECT_REF.supabase.co
SUPABASE_ANON_KEY=isi-anon-key
SUPABASE_SERVICE_ROLE_KEY=isi-service-role-key
PORT=4001
```

Jangan pernah commit `.env` atau membocorkan service role key.

## Seed akun demo

Setelah SQL selesai dan `.env` terisi:

```powershell
npm install
npm run seed
npm start
```

Seed membuat 10 badan/bidang/unit organisasi terbaru dan akun admin berikut di Supabase Auth + `profiles`:

| Email | Role | Password |
|---|---|---|
| admin@kmi.id (username: `admin`) | super_admin | admin123 |

Bidang secara default tidak memakai password, sehingga user langsung masuk setelah memilih bidang. Setelah login sebagai admin, buka tombol **Password Bidang** untuk mengatur password masing-masing bidang dan mengaktifkan/nonaktifkan password. Jika diaktifkan, user harus memasukkan password sebelum membuka halaman request. Seed tetap menyiapkan password awal `kmi123` jika admin ingin mengaktifkannya.

API aktif di `http://localhost:4001`.

Untuk frontend development, buka PowerShell kedua:

```powershell
cd C:\Users\alias\Documents\CODING\WEB_KMI\frontend
npm install
npm run dev
```

Buka `http://localhost:5173`. Vite mem-proxy `/api` ke backend port 4001.
Perintah `npm start` dari folder `frontend` juga menjalankan Vite pada port yang sama.
Halaman User dan Admin memperbarui request/status otomatis setiap 8 detik tanpa tombol Refresh. Notifikasi juga disinkronkan antar-tab browser; buka halaman User agar perubahan status menjadi `Selesai` dapat terdeteksi dan ditampilkan sebagai notifikasi untuk BaUBi terkait.

Penetapan PIC dilakukan otomatis secara acak saat request baru dikirim, menggunakan rotasi 8 orang tanpa pengulangan sampai satu putaran selesai. Jalankan migration `supabase/migrations/20260930_pic_rotation.sql` sekali di SQL Editor. Jika PIC sedang sibuk, Admin dapat memakai tombol **Ubah PIC** pada detail request untuk mengambil PIC berikutnya sesuai rotasi.

Jika muncul `fetch failed` saat request dibuat atau PIC diubah, backend akan mencoba ulang koneksi Supabase hingga tiga kali. Jika tetap gagal, periksa koneksi internet dan status project Supabase, lalu coba kembali; error `function assign_random_pic does not exist` berarti migration PIC belum dijalankan.

User publik tidak membuat akun. Setelah request dikirim, token acak disimpan di browser yang digunakan dan hanya token itu yang dipakai untuk mengambil progress request tersebut. Jangan hapus site data browser jika ingin melihat progress yang sama.

Status yang digunakan hanya `Menunggu`, `Diproses`, dan `Selesai`. Jenis postingan yang tersedia hanya `Feed`, `Story`, dan `Reels`. Request yang berubah menjadi `Selesai` otomatis masuk arsip. User tetap dapat melihat request terarsip dan membuka link hasil postingannya selama 30 hari sejak diarsipkan. Backend menghapus arsip yang lebih lama dari 30 hari secara otomatis. Jalankan migration `supabase/migrations/20260930_auto_archive_completed.sql` sekali di SQL Editor agar aturan ini juga berlaku untuk perubahan langsung di database.

Untuk build production:

```powershell
cd C:\Users\alias\Documents\CODING\WEB_KMI\frontend
npm run build
cd ..
npm start
```

## Deploy ke Vercel

Karena aplikasi ini terdiri dari React/Vite dan Express, deploy production dilakukan dalam dua service:

### 1. Deploy backend Express

Gunakan Render, Railway, Fly.io, atau server Node.js lain. Saat membuat service backend:

- Root directory: folder root project, bukan `frontend`.
- Build command: `npm install`
- Start command: `npm start`
- Tambahkan environment variable:
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `JWT_SECRET` jika masih dipakai oleh konfigurasi server Anda
  - `PORT` biasanya diisi otomatis oleh provider
- Catat URL HTTPS backend, misalnya `https://antrean-konten-api.onrender.com`.

Pastikan migration Supabase sudah dijalankan, terutama `20260930_pic_rotation.sql` dan `20260930_auto_archive_completed.sql`.

### 2. Deploy frontend ke Vercel

1. Push project ke GitHub.
2. Di Vercel pilih **Add New Project**, lalu pilih repository tersebut.
3. Isi **Root Directory** dengan `frontend`.
4. Framework preset: **Vite**.
5. Build command: `npm run build`.
6. Output directory: `dist`.
7. Tambahkan environment variable:

   ```text
   VITE_API_URL=https://antrean-konten-api.onrender.com
   ```

   Ganti nilainya dengan URL backend production Anda, tanpa garis miring `/` di bagian akhir.
8. Klik **Deploy**.

File `frontend/vercel.json` sudah disiapkan agar refresh pada halaman SPA tidak menghasilkan 404. Jangan masukkan `SUPABASE_SERVICE_ROLE_KEY` ke environment variable Vercel karena key tersebut hanya boleh berada di backend.

Setelah deploy, buka URL Vercel dan uji login Admin, pembuatan request, assignment PIC, notifikasi, serta refresh halaman. Jika browser memblokir request karena CORS, pastikan backend dapat diakses melalui HTTPS dan provider backend mengizinkan origin domain Vercel.

## Catatan RLS

RLS adalah lapisan keamanan database. Backend tetap menerapkan pemeriksaan role agar error dapat dikembalikan dengan jelas. `service_role` hanya digunakan server untuk operasi terkontrol dan melewati RLS; frontend tidak pernah menerima key tersebut.
