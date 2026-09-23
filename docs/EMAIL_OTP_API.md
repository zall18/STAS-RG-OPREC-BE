# Dokumentasi API: Sistem OTP & Email Transaksional (Gmail SMTP)

Sistem backend STAS-RG telah dilengkapi dengan modul pengiriman email resmi menggunakan **Gmail SMTP (`nodemailer`)** untuk menangani verifikasi OTP (One-Time Password) pada alur pendaftaran kandidat, verifikasi keamanan, serta alur lupa dan reset kata sandi baik untuk **Kandidat** maupun **Administrator**.

---

## 1. Ringkasan Endpoint

| Method | Endpoint | Fungsi | Akses |
| :---: | :--- | :--- | :---: |
| `POST` | `/api/auth/send-otp` | Mengirim kode OTP 6-digit ke email pemohon | Publik |
| `POST` | `/api/auth/verify-otp` | Memverifikasi apakah kode OTP valid (pre-check) | Publik |
| `POST` | `/api/auth/register` | Pendaftaran akun kandidat baru dengan validasi OTP | Publik |
| `POST` | `/api/auth/forgot-password` | Meminta kode OTP untuk reset kata sandi | Publik |
| `POST` | `/api/auth/reset-password` | Menetapkan kata sandi baru menggunakan verifikasi OTP | Publik |

---

## 2. Rincian Endpoint

### 2.1. Mengirim Kode OTP (`POST /api/auth/send-otp`)
Digunakan oleh Frontend saat pengguna menekan tombol **"Kirim OTP"** pada form pendaftaran atau verifikasi.

* **Request Body**:
  ```json
  {
    "email": "pendaftar@kampus.ac.id",
    "purpose": "REGISTRATION"
  }
  ```
  * `purpose` bersifat opsional, bernilai:
    * `"REGISTRATION"` *(default)*: Memvalidasi bahwa email belum pernah terdaftar sebelumnya (menolak dengan `409 Conflict` jika sudah terdaftar).
    * `"PASSWORD_RESET"`: Digunakan untuk alur lupa password.
    * `"ADMIN_VERIFY"`: Digunakan untuk verifikasi akses administrator.

* **Response Berhasil (`200 OK`)**:
  ```json
  {
    "success": true,
    "message": "Kode OTP berhasil dikirimkan ke pendaftar@kampus.ac.id",
    "data": {
      "cooldownSeconds": 60
    }
  }
  ```

* **Proteksi Cooldown Rate-Limit (`429 Too Many Requests`)**:
  Jika pengguna menekan tombol kirim ulang sebelum 60 detik berlalu:
  ```json
  {
    "success": false,
    "message": "Harap tunggu 45 detik sebelum meminta kode OTP kembali"
  }
  ```

---

### 2.2. Verifikasi Mandiri Kode OTP (`POST /api/auth/verify-otp`)
Digunakan untuk mengecek kebenaran OTP di Frontend sebelum pengguna melanjutkan ke langkah berikutnya (misal multistep form).

* **Request Body**:
  ```json
  {
    "email": "pendaftar@kampus.ac.id",
    "otp": "849201",
    "purpose": "REGISTRATION"
  }
  ```

* **Response Berhasil (`200 OK`)**:
  ```json
  {
    "success": true,
    "message": "Kode OTP valid"
  }
  ```

* **Response Gagal (`400 Bad Request`)**:
  ```json
  {
    "success": false,
    "message": "Kode OTP salah. Sisa kesempatan: 3 kali"
  }
  ```

---

### 2.3. Pendaftaran Kandidat Baru (`POST /api/auth/register`)
Endpoint pendaftaran yang sekarang mengintegrasikan verifikasi kode OTP.

* **Request Body**:
  ```json
  {
    "email": "pendaftar@kampus.ac.id",
    "password": "PasswordPendaftar123!",
    "otp": "849201"
  }
  ```

* **Response Berhasil (`201 Created`)**:
  ```json
  {
    "success": true,
    "message": "Registrasi berhasil",
    "data": {
      "user": {
        "id": "c1f7b0c9-8d19-4a3e-b41a-112233445566",
        "email": "pendaftar@kampus.ac.id",
        "role": "CANDIDATE",
        "createdAt": "2026-09-23T10:25:00.000Z"
      },
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
  }
  ```

---

### 2.4. Lupa Kata Sandi (`POST /api/auth/forgot-password`)
Digunakan oleh Kandidat atau Administrator yang lupa kata sandi akunnya.

* **Request Body**:
  ```json
  {
    "email": "user@stas-rg.ac.id"
  }
  ```

* **Response Berhasil (`200 OK`)**:
  ```json
  {
    "success": true,
    "message": "Kode OTP reset kata sandi telah dikirim ke email Anda. Kode berlaku selama 5 menit."
  }
  ```
  *(Catatan Keamanan: Jika email tidak ditemukan, sistem tetap mengembalikan respons sukses generik guna mencegah Enumerasi Akun oleh peretas).*

---

### 2.5. Reset Kata Sandi Baru (`POST /api/auth/reset-password`)
Menetapkan password baru setelah kode OTP diverifikasi.

* **Request Body**:
  ```json
  {
    "email": "user@stas-rg.ac.id",
    "otp": "849201",
    "newPassword": "NewSecurePassword2026!"
  }
  ```

* **Response Berhasil (`200 OK`)**:
  ```json
  {
    "success": true,
    "message": "Kata sandi berhasil diperbarui. Silakan login kembali dengan kata sandi baru Anda."
  }
  ```
  *Sistem otomatis mengirimkan email notifikasi konfirmasi keamanan ke inbox pengguna.*

---

### 2.6. Konfirmasi & Aktivasi Akun Administrator (`POST` & `GET /api/auth/confirm-admin`)
Digunakan untuk mengaktifkan akun administrator baru yang berstatus `PENDING_CONFIRMATION`. Akun admin baru **tidak dapat login** (mendapat `403 Forbidden`) sebelum mengonfirmasi tautan aktivasi email.

* **Metode 1: API JSON (`POST /api/auth/confirm-admin`)**:
  * **Request Body**:
    ```json
    {
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
    ```
  * **Response Berhasil (`200 OK`)**:
    ```json
    {
      "success": true,
      "message": "Akun administrator Anda berhasil diaktifkan! Silakan masuk ke portal admin.",
      "data": {
        "email": "admin.baru@stas-rg.ac.id"
      }
    }
    ```

* **Metode 2: Direct Browser Click (`GET /api/auth/confirm-admin?token=...`)**:
  * Ketika admin mengklik tombol pada email secara langsung di peramban web, backend otomatis memvalidasi token, mengaktifkan akun, dan me-redirect browser ke halaman login frontend:
    `${FRONTEND_URL}/auth/login?confirmed=true&email=admin.baru@stas-rg.ac.id`

---

## 3. Fitur Otomatis untuk Administrator (`Admin Management`)
Ketika administrator membuat akun admin baru melalui `POST /api/admin/admins`:
1. Akun admin baru otomatis dibuat dengan role `ADMIN` dan status `isActive: false` (Pending Confirmation).
2. Sistem secara otomatis membuat token aktivasi berdurasi 24 jam dan mengirimkan **Email Undangan & Aktivasi Resmi (Kartu Visual dengan Tombol CTA Interaktif)** ke inbox admin baru.
3. Admin baru **tidak bisa login** sampai akun berhasil dikonfirmasi. Jika mencoba login sebelumnya, sistem menolak dengan pesan `403 Forbidden`: *"Akun Anda belum dikonfirmasi atau sedang dinonaktifkan"*.
4. Setelah mengklik tombol `[ 🚀 KONFIRMASI & AKTIFKAN AKUN ADMIN ]`, akun berubah menjadi aktif (`isActive: true`) dan admin dapat masuk ke dashboard.

---

## 4. Konfigurasi Lingkungan (`.env`)
Pengaturan akun Gmail pengirim disimpan secara modular pada file `.env`:

```env
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER="izallstorage28@gmail.com"
SMTP_PASS="xpoqxcainahavdru"
SMTP_FROM="STAS-RG Recruitment <izallstorage28@gmail.com>"
```
Jika di masa depan Anda ingin mengganti akun Gmail pengirim, cukup ubah nilai `SMTP_USER`, `SMTP_PASS`, dan `SMTP_FROM` pada file `.env` tanpa perlu mengubah kode program.
