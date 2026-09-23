# Panduan Lengkap Docker: STAS-RG Recruitment Backend

Panduan ini disusun khusus untuk memahami konsep dasar Docker, struktur konfigurasi yang telah disiapkan, serta cara menjalankan backend STAS-RG di dalam kontainer Docker.

---

## 1. Konsep Dasar Docker (Untuk Pemula)

Sering mendengar kalimat *"Di laptop saya kodingannya jalan kok, tapi kenapa di server atau laptop teman malah error?"* — Docker diciptakan untuk menyelesaikan masalah ini selamanya.

* **Analogi Sederhana**:
  Bayangkan Anda ingin mengirim makanan lengkap dengan kulkas, kompor, dan koki pribadinya ke mana pun. Docker membungkus aplikasi Anda bersama sistem operasi (Linux Alpine), runtime (Node.js 20), library, dan konfigurasinya ke dalam sebuah **kontainer**.
  Aplikasi yang berjalan di dalam kontainer akan berperilaku **100% sama persis** di Windows, MacOS, Linux, maupun server Cloud (AWS, Railway, VPS, dll).

### Istilah Kunci:
1. **`Dockerfile`**: Resep / cetak biru (blueprint) berisi instruksi langkah demi langkah untuk merakit aplikasi Anda.
2. **`Image`**: Hasil masakan/cetakan jadi dari `Dockerfile`. Bersifat beku (*read-only* template).
3. **`Container`**: Bentuk hidup dari `Image` yang sedang berjalan aktif sebagai proses mandiri.
4. **`.dockerignore`**: Mirip dengan `.gitignore`. Mencegah file lokal berat (seperti `node_modules` laptop) atau file sensitif terangkut ke dalam Image.
5. **`Docker Compose`**: Alat untuk mengorkestrasi satu atau lebih kontainer dengan konfigurasi siap pakai cukup dengan 1 perintah saja.

---

## 2. Bedah Konfigurasi yang Telah Dibuat

### 2.1. Multi-Stage Build di `Dockerfile`
File [`Dockerfile`](../Dockerfile) menggunakan teknik industri modern bernama **Multi-Stage Build**:
* **Tahap 1 (`builder`)**: Menggunakan `node:20-alpine`, menginstal dependensi lengkap, menjalankan `npx prisma generate`, dan mengompilasi TypeScript (`npm run build`).
* **Tahap 2 (`runner`)**: Hanya mengambil folder `dist` dan dependensi produksi (`--only=production`). 
  * **Keuntungan**: Ukuran image menjadi sangat kecil (hemat memori dan cepat didownload), serta jauh lebih aman karena *source code* mentah dan *devDependencies* dibuang.
  * **Keamanan**: Menjalankan aplikasi dengan user `USER node` (non-root), mencegah potensi eksploitasi privilege di server.

### 2.2. Berkas `docker-compose.yml`
File [`docker-compose.yml`](../docker-compose.yml) memetakan port `5001:5001`, menghubungkan file environment `.env`, dan mengotomatiskan restart jika server mengalami kendala.

---

## 3. Cara Menjalankan Aplikasi dengan Docker

### Syarat Awal (Prerequisite):
Pastikan aplikasi **Docker Desktop** di Windows Anda sudah dibuka dan statusnya aktif (*running*, ikon paus di taskbar tidak merah/oranye).

### Langkah 1: Jalankan Kontainer (Sangat Mudah)
Buka terminal di folder backend `BE`, lalu jalankan:

```bash
docker compose up --build
```

> [!TIP]
> * Flag `--build` memastikan Docker membuat ulang image jika Anda baru saja mengubah kode sumber.
> * Jika ingin kontainer berjalan di latar belakang (tanpa menahan layar terminal), tambahkan flag `-d`:
>   ```bash
>   docker compose up -d --build
>   ```

### Langkah 2: Uji Aplikasi
Buka peramban web atau Postman dan akses:
* Healthcheck: `http://localhost:5001/api/health`
* Status Seleksi: `http://localhost:5001/api/public/oprec-status`

---

## 4. Perintah-Perintah Penting yang Sering Digunakan

| Perintah | Fungsi |
| :--- | :--- |
| `docker compose up -d` | Menjalankan kontainer di latar belakang (*background/detached mode*) |
| `docker compose logs -f` | Melihat log output terminal aplikasi secara *real-time* (tekan `Ctrl+C` untuk keluar) |
| `docker compose ps` | Melihat daftar kontainer yang sedang aktif dan port-nya |
| `docker compose down` | Menghentikan dan membersihkan kontainer |
| `docker compose restart` | Merestart ulang kontainer tanpa rebuild |
| `docker exec -it stasrg-backend sh` | Masuk ke dalam terminal Linux di dalam kontainer untuk inspeksi |
| `docker system prune -f` | Membersihkan cache dan image lama yang tidak terpakai agar SSD lega |

---

## 5. Cara Mengubah Environment Variable di Docker
Docker membaca konfigurasi dari file `.env` lokal Anda:
* Jika ingin mengubah email Gmail, database URL, atau secret key, cukup ubah file `.env` di komputer Anda, lalu jalankan:
  ```bash
  docker compose restart
  ```
