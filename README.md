
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

Command deploy akan menjalankan build, lalu membuat production deployment dengan Vercel CLI. Pada penggunaan pertama, `npx vercel` akan meminta login dan menghubungkan folder project ke project Vercel. Pastikan environment variables Supabase sudah tersedia di project Vercel.
