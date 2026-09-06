# Backend Product Requirements Document (PRD)
## Sistem Rekrutmen STAS-RG

### 1. Overview
Dokumen ini mendefinisikan spesifikasi teknis khusus untuk sisi Backend (BE) dari Sistem Rekrutmen STAS-RG. API ini akan melayani frontend untuk fitur registrasi *Golden Candidate*, pendaftaran Oprec, serta *dashboard* manajemen bagi Admin.

### 2. Tech Stack Core
- **Runtime/Framework:** Node.js dengan Express.js (atau *Next.js API Routes*)
- **Database:** PostgreSQL
- **ORM:** Prisma ORM
- **Authentication & Storage:** Supabase Auth & Supabase Storage

### 3. Database Schema (Prisma Model Draft)
Berikut adalah rancangan awal skema relasional menggunakan Prisma untuk memisahkan entitas *User*, *Profil*, dan *Riwayat Pendaftaran (Oprec)*.

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum UserRole {
  ADMIN
  CANDIDATE
}

enum RoleInterest {
  RISET
  MAGANG
}

enum SelectionStatus {
  PENDING
  SELEKSI_BERKAS
  WAWANCARA_1
  WAWANCARA_2
  DITERIMA
}

model User {
  id        String   @id @default(uuid())
  email     String   @unique
  role      UserRole @default(CANDIDATE)
  createdAt DateTime @default(now())

  profile   CandidateProfile?
}

model CandidateProfile {
  id               String       @id @default(uuid())
  userId           String       @unique
  user             User         @relation(fields: [userId], references: [id])
  
  fullName         String
  universitas      String
  nim              String
  programStudi     String
  roleInterest     RoleInterest
  cvUrl            String
  transkripUrl     String?
  ipk              Float?
  semester         Int?
  portfolioUrl     String
  pengalaman       String?      @db.Text
  isGoldenCandidate Boolean     @default(false)

  createdAt        DateTime     @default(now())
  updatedAt        DateTime     @updatedAt

  oprecRecords     OprecRegistration[]
}

model OprecRegistration {
  id               String           @id @default(uuid())
  candidateId      String
  candidate        CandidateProfile @relation(fields: [candidateId], references: [id])
  batchName        String           // e.g., "Oprec Batch 1 - 2026"
  status           SelectionStatus  @default(PENDING)
  assignedProject  String?          // Diisi admin jika status DITERIMA
  
  appliedAt        DateTime         @default(now())
  updatedAt        DateTime         @updatedAt
}
```

### 4. API Endpoints Specification

#### 4.1. Auth & User Management
*   `POST /api/auth/register` 
    *   Mendaftarkan akun baru (jika tidak menggunakan Supabase Auth *client-side* murni).
*   `POST /api/auth/login` 
    *   Otentikasi dan *retrieve* sesi.

#### 4.2. Candidate Endpoints
*   `POST /api/candidate/profile`
    *   **Deskripsi:** Membuat atau memperbarui (*upsert*) data profil pelamar.
    *   **Payload:** `fullName, universitas, nim, programStudi, roleInterest, cvUrl, transkripUrl, ipk, semester, portfolioUrl, pengalaman`
    *   **Logic:** Jika dikirim di luar masa aktif Oprec, flag `isGoldenCandidate` otomatis bernilai `true`.
*   `GET /api/candidate/profile`
    *   **Deskripsi:** Mengambil detail profil user yang sedang *login*.
*   `POST /api/candidate/apply-oprec`
    *   **Deskripsi:** Mendaftarkan diri (*submit*) ke batch Oprec yang sedang aktif.
    *   **Payload:** `batchName`
    *   **Validasi:** Backend mengecek kelengkapan data di `CandidateProfile`. Jika ada *field* wajib yang kosong, API menolak *request* (400 Bad Request).

#### 4.3. Upload / Storage Endpoints
*   `POST /api/upload/document`
    *   **Deskripsi:** Mengunggah file CV atau Transkrip ke Supabase Storage.
    *   **Validasi *MIME Type*:** WAJIB `application/pdf`.
    *   **Validasi Ukuran:** Maksimal 5MB (`5 * 1024 * 1024` bytes).
    *   **Response:** Mengembalikan *public URL* dokumen yang berhasil diunggah.

#### 4.4. Admin Endpoints (Protected: ADMIN Role Only)
*   `GET /api/admin/candidates`
    *   **Deskripsi:** Mengambil *list* pelamar untuk ditampilkan di tabel.
    *   **Query Params:** `?batch=xxx&status=xxx&isGolden=true|false`
*   `GET /api/admin/candidates/:id`
    *   **Deskripsi:** Menampilkan detail lengkap satu pelamar (termasuk dokumen dan portofolio).
*   `PATCH /api/admin/candidates/:registrationId/status`
    *   **Deskripsi:** Memperbarui tahapan seleksi (misal dari *SELEKSI_BERKAS* ke *WAWANCARA_1*).
    *   **Payload:** `status`
*   `PATCH /api/admin/candidates/:registrationId/project`
    *   **Deskripsi:** Menambahkan alokasi nama proyek untuk pelamar.
    *   **Aturan Bisnis:** *Endpoint* ini hanya memproses *request* jika `status` pendaftaran saat ini adalah `DITERIMA`.

### 5. Aturan Bisnis & *Constraints* Khusus Backend
1.  **Isolasi Oprec:** Setiap kali ada pendaftaran Oprec baru, sistem tidak membuat profil baru, melainkan hanya menambahkan baris data ke tabel `OprecRegistration` yang berelasi ke profil kandidat yang sama.
2.  **Keamanan Endpoint:** Setiap *endpoint* yang berawalan `/api/admin/*` harus divalidasi menggunakan *middleware* untuk memastikan token JWT yang dikirim memiliki otorisasi level `ADMIN`.
3.  **Penanganan File Eksternal:** Backend tidak menyimpan file PDF ke dalam database *relational*, melainkan hanya menyimpan string URL hasil *upload* dari Supabase Storage.

### 6. Rencana Ekstensi (Integrasi Notifikasi - Opsional)
*   **Email:** Dapat menggunakan SMTP internal Lab atau layanan API pihak ketiga.
*   **WhatsApp:** Integrasi API WA (seperti Fonnte, Watzap, atau *library open-source* Baileys) dapat ditempatkan di *event listener* yang ter-<i>trigger</i> otomatis setiap kali fungsi `PATCH status` dijalankan oleh Admin.