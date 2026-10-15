# 🚀 Panduan Lengkap Setup CI/CD Backend (GitHub Actions & VPS Docker)

Dokumen ini menjelaskan alur kerja dan langkah demi langkah konfigurasi **CI/CD (Continuous Integration & Continuous Deployment)** otomatis untuk backend STAS-RG.

---

## 📌 1. Cara Kerja Alur CI/CD

```text
[ Developer ] -- git push origin main --> [ GitHub Repository ]
                                                    │
                 ┌──────────────────────────────────┴──────────────────────────────────┐
                 │                                                                     │
                 ▼                                                                     ▼
        [ Job 1: CI (Test & Build) ]                                        [ Job 2: CD (Deploy) ]
   1. Install dependencies (`npm ci`)                                (Hanya jalan jika Job 1 SUKSES)
   2. Prisma generate client                                                           │
   3. Kompilasi TypeScript (`npm run build`)                                           ▼
   4. Jalankan 84 Test Case (`npm test`)                              Koneksi via SSH ke VPS Server
   5. Uji Build Dockerfile                                                             │
                 │                                                                     ▼
                 └───────────────────────────┬─────────────────────────────────────────┘
                                             │
                                             ▼
                                  [ Server VPS / Cloud ]
                           1. `git pull origin main`
                           2. `docker compose up -d --build`
                           3. Health Check `curl http://localhost:5001/api/health`
                           4. Server aktif & ter-update otomatis! 🎉
```

---

## 🔑 2. Langkah 1: Persiapan SSH Key di VPS

Agar GitHub Actions diizinkan masuk dan menjalankan perintah di VPS kamu tanpa memasukkan password:

### A. Buat Pasangan Kunci SSH (SSH Keypair)
Jalankan perintah ini di komputer lokal atau di dalam server VPS:
```bash
ssh-keygen -t ed25519 -C "github-actions-stasrg" -f ~/.ssh/github_actions_stasrg
```
*(Tekan Enter dua kali saat diminta passphrase agar tidak memakai password).*

Perintah ini akan menghasilkan 2 file:
1. `github_actions_stasrg` (Ini adalah **Private Key** $\rightarrow$ akan dimasukkan ke GitHub Secrets).
2. `github_actions_stasrg.pub` (Ini adalah **Public Key** $\rightarrow$ dimasukkan ke VPS).

### B. Masukkan Public Key ke VPS
Di server VPS kamu, buka file `~/.ssh/authorized_keys`:
```bash
cat github_actions_stasrg.pub >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
chmod 700 ~/.ssh
```

---

## 💻 3. Langkah 2: Setup Project Pertama Kali di VPS

Login ke server VPS kamu, lalu:

1. **Pastikan Docker & Docker Compose sudah terpasang di VPS**:
   ```bash
   docker --version
   docker compose version
   git --version
   ```

2. **Clone Repository ke VPS**:
   Misal kita letakkan di folder `/var/www/stasrg-be` atau `~/stasrg-be`:
   ```bash
   # Contoh clone ke home directory:
   cd ~
   git clone https://github.com/zall18/STAS-RG-OPREC-BE.git stasrg-be
   cd stasrg-be
   ```

3. **Buat file `.env` di dalam folder project VPS**:
   ```bash
   nano .env
   ```
   *Salin isi `.env` produksi kamu (DATABASE_URL, JWT_SECRET, SMTP Gmail, dll), lalu simpan (`Ctrl+O`, `Enter`, `Ctrl+X`).*

4. **Uji coba nyalakan Docker pertama kali**:
   ```bash
   docker compose up -d --build
   ```
   Periksa apakah kontainer sudah aktif:
   ```bash
   docker ps
   curl http://localhost:5001/api/health
   ```
   *(Harus mengembalikan response `{"status":"ok"}`).*

---

## ⚙️ 4. Langkah 3: Masukkan Secrets di GitHub Repository

Buka repositori GitHub kamu di browser:
👉 **`https://github.com/zall18/STAS-RG-OPREC-BE/settings/secrets/actions`**

Klik tombol **"New repository secret"**, lalu tambahkan 5 variabel rahasia berikut:

| Nama Secret | Nilai / Value | Contoh |
| :--- | :--- | :--- |
| `VPS_HOST` | IP Publik VPS atau Domain server | `103.187.145.22` atau `api.stas-rg.ac.id` |
| `VPS_USERNAME` | Username login SSH VPS | `ubuntu` atau `root` |
| `VPS_SSH_KEY` | Isi seluruh teks dari file **Private Key** (`github_actions_stasrg`) | Mulai dari `-----BEGIN OPENSSH PRIVATE KEY-----` sampai `-----END OPENSSH PRIVATE KEY-----` |
| `VPS_PORT` | Port SSH server kamu | `22` (default) |
| `VPS_DEPLOY_PATH` | Lokasi path absolut folder project di VPS | `/root/stasrg-be` atau `/home/ubuntu/stasrg-be` |

---

## 🧪 5. Langkah 4: Uji Coba Deployment Otomatis

Sekarang kamu tidak perlu lagi membuka terminal VPS setiap kali ada update kodingan. Cukup:

1. Buat perubahan kode di lokal.
2. Commit dan push ke GitHub:
   ```bash
   git add .
   git commit -m "feat: update fitur baru"
   git push origin main
   ```
3. Buka tab **"Actions"** di repositori GitHub kamu:
   - Kamu akan melihat alur kerja **Backend CI/CD Pipeline** sedang berjalan secara real-time.
   - GitHub Actions akan menguji kode kamu $\rightarrow$ jika lolos, langsung deploy otomatis ke VPS! 🚀

---

## 🛠️ Troubleshooting (Kendala yang Sering Terjadi)

1. **Error: Host key verification failed / SSH Connection refused**
   - Pastikan port SSH di VPS terbuka di firewall (`ufw allow 22` atau panel cloud hosting).
   - Pastikan IP `VPS_HOST` dan `VPS_USERNAME` sudah tepat.

2. **Error: Permission denied (publickey)**
   - Periksa apakah seluruh isi Private Key sudah disalin lengkap ke `VPS_SSH_KEY` (termasuk baris `BEGIN` dan `END`).
   - Pastikan permissions di VPS: `chmod 600 ~/.ssh/authorized_keys`.

3. **Error: File .env tidak ditemukan saat deploy**
   - File `.env` tidak di-commit ke GitHub demi keamanan. Pastikan kamu sudah membuat file `.env` manual satu kali di folder project VPS (`VPS_DEPLOY_PATH`).
