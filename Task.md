# Task Breakdown & Development Phases
## Project: Sistem Rekrutmen STAS-RG (Golden Candidate & Oprec)

Dokumen ini berisi urutan pekerjaan (*task breakdown*) yang dibagi per fase (Phase) untuk memandu pengembangan proyek secara *full-stack*. 

**⚠️ ATURAN WAJIB (GROUND RULES):**
Setiap kali menyelesaikan sebuah fase pengembangan utama, **WAJIB** melakukan pembuatan *test* (Unit Test / Integration Test) dan menjalankan perintah build (`npm run build` atau `yarn build`) untuk memastikan tidak ada *error* saat aplikasi dikompilasi ke *production*.

---

### Phase 1: Setup Lingkungan & Infrastruktur (Environment Setup)
*Fase ini fokus pada persiapan alat kerja, repositori, dan koneksi ke pihak ketiga (Supabase).*
- [ ] **Inisiasi Repositori:** Buat *folder* proyek, inisiasi Git, dan siapkan kerangka *frontend/backend* (misalnya menggunakan `npx create-next-app@latest`).
- [ ] **Konfigurasi Supabase:** Buat proyek di dasbor Supabase. Dapatkan `URL` dan `ANON_KEY`. Siapkan Supabase Storage dengan membuat *bucket* khusus (misal: `documents`) dan atur *policy* agar bisa menerima file PDF maksimal 5MB.
- [ ] **Inisiasi Prisma ORM:** Install Prisma (`npm i -D prisma`), jalankan `npx prisma init`. Hubungkan `DATABASE_URL` ke PostgreSQL bawaan Supabase (Connection Pooling).
- [ ] **Konfigurasi Environment Variables:** Buat file `.env` yang berisi *keys* untuk database, auth, dan konfigurasi API lainnya.

### Phase 2: Backend & Database Implementation
*Fase pembuatan fondasi data dan logika server (berdasarkan PRD Backend).*
- [ ] **Desain Schema & Migrasi:** Salin skema Prisma dari dokumen PRD BE. Jalankan `npx prisma db push` atau `npx prisma migrate dev` untuk membangun tabel di database.
- [ ] **Setup Middleware & Auth API:** Buat rute untuk Register/Login. Jika memakai Supabase Auth, siapkan utilitas untuk membaca *token* sesi pengguna di sisi *server*.
- [ ] **Pembuatan Endpoint Candidate:** Buat API untuk melayani pendaftaran profil (`POST /api/candidate/profile`) dan *apply* oprec (`POST /api/candidate/apply-oprec`).
- [ ] **Pembuatan Endpoint Admin:** Buat API khusus *dashboard* admin (`GET`, `PATCH`) lengkap dengan validasi otorisasi (hanya yang memiliki role `ADMIN` yang bisa mengakses).
- [ ] **Endpoint Storage / Upload:** Buat modul integrasi dengan Supabase Storage untuk mengunggah CV dan Transkrip. Tambahkan pengecekan format (PDF) dan limit ukuran (5MB).
- [ ] **✅ MANDATORY TESTING & BUILD:** 
  - Buat *Unit Test* (misal dengan Jest/Supertest) untuk menguji validasi Endpoint dan Role Auth.
  - Jalankan kompilasi awal server untuk memastikan *routing* tidak *crash*.

### Phase 3: Frontend Foundation & UI Components
*Fase penyiapan tampilan dasar sebelum menghubungkan data.*
- [ ] **Setup Styling & Library:** Konfigurasi Tailwind CSS (atau UI *library* seperti Shadcn UI / MUI) untuk komponen desain.
- [ ] **Layouting Master:** Buat tata letak utama (Navbar, Footer, Sidebar untuk Admin, pembungkus halaman).
- [ ] **Pembuatan Halaman Autentikasi:** Buat UI untuk form *Login* dan *Register*, lengkapi dengan validasi *input* (email format, minimum panjang *password*).
- [ ] **Setup State Management:** Siapkan *Context* atau Zustand/Redux untuk menyimpan status *User* (*apakah sedang login, role-nya apa*).

### Phase 4: Frontend - Sisi Kandidat (User Facing)
*Fase pembuatan halaman yang akan diakses oleh mahasiswa pelamar.*
- [ ] **Halaman Landing / Informasi Role:** Buat halaman publik yang menampilkan penjelasan spesifik mengenai **Mahasiswa Riset** dan **Mahasiswa Magang**.
- [ ] **Form Profil / Golden Candidate:** Buat formulir multi-langkah (*multi-step form*) atau form panjang untuk mengisi kelengkapan data (NIM, Prodi, Role Interest, dll). Hubungkan tombol "Simpan" ke API `/api/candidate/profile`.
- [ ] **Komponen Upload File:** Buat *dropzone* atau input file khusus untuk CV & Transkrip yang memberi tahu batas ukuran 5MB ke *user* sebelum diunggah. Hubungkan ke API Upload.
- [ ] **Halaman Pendaftaran Oprec:** Buat halaman khusus yang tombolnya hanya muncul jika status Oprec sedang dibuka. Saat diklik, panggil API `/api/candidate/apply-oprec`.
- [ ] **✅ MANDATORY TESTING & BUILD:**
  - Buat komponen *Test* (React Testing Library/Cypress) untuk memastikan form validasi berjalan dengan baik (misal: *user* tidak bisa submit jika CV belum diunggah).
  - Jalankan `npm run build` untuk memverifikasi komponen React/Next.js bebas *error*.

### Phase 5: Frontend - Dashboard Admin
*Fase pembuatan back-office untuk seleksi pelamar oleh STAS-RG.*
- [ ] **Halaman Tabel Kandidat:** Buat antarmuka tabel menggunakan *Data Grid* atau tabel standar. Tambahkan *filter* (Berdasarkan Batch Oprec, Status, dan Role Interest).
- [ ] **Integrasi API Admin:** Hubungkan tabel dengan API `GET /api/admin/candidates`. Pastikan data `isGoldenCandidate` ditampilkan sebagai *Badge* khusus.
- [ ] **Halaman Detail Kandidat & Dokumen:** Buat modal atau halaman terpisah ketika admin mengklik salah satu nama. Tampilkan profil lengkap beserta tombol *Download/Preview* CV dan Portofolio.
- [ ] **Fungsi Update Status & Proyek:** Buat tombol *dropdown* aksi untuk mengubah status pelamar (*Seleksi Berkas, Wawancara 1, dll*). Tambahkan *input text* untuk "Assigned Project" yang muncul saat status diubah menjadi "DITERIMA".
- [ ] **✅ MANDATORY TESTING & BUILD:**
  - Buat *Test* interaksi Admin (memastikan *request patch* terkirim saat klik tombol *update*).
  - Jalankan `npm run build`.

### Phase 6: Finalisasi, Notifikasi & Deployment
*Fase penyelesaian akhir dan pengunggahan ke server production.*
- [ ] **(Opsional) Integrasi Notifikasi:** Jika pihak Lab menyediakan, pasang API Gateway Email/WhatsApp agar terkirim otomatis saat status kandidat berubah ke "DITERIMA" atau saat masa pendaftaran dibuka.
- [ ] **End-to-End (E2E) Testing:** Lakukan simulasi alur lengkap: Mendaftar $\rightarrow$ Mengisi Profil $\rightarrow$ Daftar Oprec $\rightarrow$ Admin Login $\rightarrow$ Admin Terima Pelamar.
- [ ] **✅ FINAL BUILD & DEPLOYMENT:** 
  - Eksekusi langkah build final `npm run build`.
  - Jika berhasil, dorong (*deploy*) ke *platform hosting* seperti Vercel (jika menggunakan Next.js) atau Railway/Render untuk Backend.
  - Verifikasi *Environment Variables* di *server production*.