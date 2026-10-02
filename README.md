
## Menjalankan lokal dan deploy

Dari folder root project:

```bash
npm run dev
```

Command tersebut menjalankan backend di `http://localhost:4001` dan frontend di `http://localhost:5173`. Buka alamat frontend untuk mengedit dan menguji perubahan secara lokal. Tekan `Ctrl+C` untuk menghentikan keduanya.

Setelah perubahan lokal siap dipublikasikan ke Vercel:

```bash
npm run deploy
```

Command deploy akan menjalankan build, lalu membuat production deployment ke project `elbro1/kmi-web` dengan Vercel CLI. Pastikan akun Vercel yang sedang aktif memiliki akses ke project tersebut dan environment variables Supabase sudah tersedia di project Vercel. Jika belum login, jalankan `npx vercel login` terlebih dahulu.
