# Generator ATP (versi mandiri)

Aplikasi web untuk membuat Alur Tujuan Pembelajaran (ATP) Kurikulum Merdeka. Guru mengisi identitas, menekan satu tombol, lalu mengunduh hasilnya sebagai file Word. Bisa dibuka siapa saja lewat alamat website, tanpa akun Claude.

## Isi paket

- `index.html`: tampilan aplikasi
- `api/generate.js`: fungsi server yang memanggil Claude (kunci API tersimpan di sini, aman dari pengguna)
- `vercel.json` dan `package.json`: pengaturan untuk hosting Vercel

## Yang Anda perlukan

1. **Kunci API Anthropic.** Daftar di https://console.anthropic.com, isi saldo, lalu buat kunci di menu API Keys. Kunci diawali `sk-ant-`. Jangan bagikan kunci ini ke siapa pun.
2. **Akun GitHub** (gratis): https://github.com
3. **Akun Vercel** (gratis untuk pemakaian kecil): https://vercel.com, daftar dengan akun GitHub.

## Langkah pemasangan

1. Buka https://github.com/new, buat repository baru bernama `generator-atp` (pilih Private).
2. Di halaman repository, klik **uploading an existing file**, lalu unggah semua isi folder ini: `index.html`, `package.json`, `vercel.json`, dan folder `api` (berisi `generate.js`). Klik **Commit changes**.
3. Buka https://vercel.com/new, pilih repository `generator-atp`, lalu klik **Import**.
4. Sebelum menekan Deploy, buka bagian **Environment Variables** dan tambahkan:
   - Name: `ANTHROPIC_API_KEY`, Value: kunci API Anda
   - Name: `KODE_AKSES`, Value: kata sandi bebas buatan Anda (misalnya `guru2026`). Ini opsional tetapi sangat disarankan agar orang asing tidak memakai saldo Anda.
5. Klik **Deploy**. Setelah selesai, Vercel memberi alamat seperti `generator-atp.vercel.app`.
6. Buka alamat itu, isi identitas, dan coba buat satu ATP.

## Cara guru memakai

- Buka alamat website, isi nama, sekolah, mata pelajaran, fase, dan kelas.
- Kalau ada kode akses, kolom kode muncul setelah percobaan pertama. Masukkan kode dari Anda.
- Tekan **Buat ATP sekarang**, tunggu sekitar setengah menit, periksa hasilnya, lalu tekan **Unduh Word**.

## Biaya

Setiap ATP yang dibuat memakai saldo API Anda. Satu ATP biasanya hanya beberapa ratus rupiah, tetapi harga bisa berubah. Cek harga terbaru di https://www.anthropic.com/pricing dan pantau pemakaian di console.anthropic.com. Untuk membatasi biaya, atur batas pengeluaran bulanan di console dan jangan sebarkan `KODE_AKSES` ke luar lingkungan sekolah.

## Mengganti model

Secara bawaan aplikasi memakai model `claude-sonnet-5-5`. Untuk menggantinya, tambahkan Environment Variable `ANTHROPIC_MODEL` di Vercel dengan nama model lain, lalu Redeploy.

## Kalau ada masalah

- **"Kunci API belum dipasang di server":** Environment Variable `ANTHROPIC_API_KEY` belum ada. Tambahkan di Vercel (Settings, Environment Variables), lalu Redeploy.
- **"Layanan AI menolak permintaan":** biasanya saldo API habis atau kunci salah. Cek di console.anthropic.com.
- **"Kode akses salah":** kode yang dimasukkan tidak sama dengan `KODE_AKSES` di Vercel.
- **Waktu habis:** coba tekan tombol sekali lagi.

Hasil ATP dibuat oleh AI. Guru tetap perlu memeriksa dan menyesuaikannya dengan Capaian Pembelajaran resmi sebelum dipakai.
