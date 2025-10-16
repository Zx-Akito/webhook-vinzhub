# Webhook WhatsApp Bot Guide

## Instalasi

1. Install dependencies:
```bash
npm install
```

2. Jalankan aplikasi:
```bash
npm start
```

## Endpoints yang Tersedia

### 1. Webhook Endpoint
**URL:** `POST http://localhost:3000/webhook`

Mengirim pesan WhatsApp melalui webhook.

**Request Body:**
```json
{
  "message": "Halo dari webhook!",
  "phoneNumber": "6281234567890",
  "type": "text"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Pesan berhasil dikirim",
  "target": "6281234567890@s.whatsapp.net"
}
```

**Parameter:**
- `message` (required): Teks pesan yang akan dikirim
- `phoneNumber` (required): Nomor telepon tujuan (dengan atau tanpa @s.whatsapp.net)
- `type` (optional): Tipe pesan ("text", "image", "document")
- `imageUrl` (optional): URL gambar jika type = "image"
- `documentUrl` (optional): URL dokumen jika type = "document"
- `mimetype` (optional): MIME type untuk dokumen
- `fileName` (optional): Nama file untuk dokumen

### 2. Status Endpoint
**URL:** `GET http://localhost:3000/status`

Mengecek status koneksi WhatsApp bot.

**Response:**
```json
{
  "success": true,
  "status": "connected",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

### 3. Broadcast Endpoint
**URL:** `POST http://localhost:3000/broadcast`

Mengirim pesan ke multiple nomor telepon.

**Request Body:**
```json
{
  "message": "Pesan broadcast",
  "phoneNumbers": ["6281234567890", "6289876543210"],
  "type": "text"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Broadcast selesai",
  "results": [
    {
      "phoneNumber": "6281234567890@s.whatsapp.net",
      "status": "success"
    },
    {
      "phoneNumber": "6289876543210@s.whatsapp.net",
      "status": "success"
    }
  ]
}
```

### 4. Health Check
**URL:** `GET http://localhost:3000/health`

Mengecek kesehatan server.

**Response:**
```json
{
  "status": "OK",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "uptime": 3600
}
```

## Contoh Penggunaan

### Mengirim Pesan Text
```bash
curl -X POST http://localhost:3000/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Halo dari webhook!",
    "phoneNumber": "6281234567890"
  }'
```

### Mengirim Gambar
```bash
curl -X POST http://localhost:3000/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Lihat gambar ini!",
    "phoneNumber": "6281234567890",
    "type": "image",
    "imageUrl": "https://example.com/image.jpg"
  }'
```

### Mengirim Dokumen
```bash
curl -X POST http://localhost:3000/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Dokumen terlampir",
    "phoneNumber": "6281234567890",
    "type": "document",
    "documentUrl": "https://example.com/document.pdf",
    "mimetype": "application/pdf",
    "fileName": "document.pdf"
  }'
```

### Broadcast Pesan
```bash
curl -X POST http://localhost:3000/broadcast \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Pesan untuk semua",
    "phoneNumbers": ["6281234567890", "6289876543210", "6285555555555"]
  }'
```

## Catatan Penting

1. **Nomor Telepon:** Gunakan format internasional tanpa tanda + (contoh: 6281234567890)
2. **Koneksi:** Pastikan WhatsApp bot sudah terhubung sebelum mengirim pesan
3. **Rate Limiting:** Hindari mengirim pesan terlalu cepat untuk mencegah spam
4. **Security:** Tambahkan autentikasi jika webhook akan diakses dari internet

## Environment Variables

- `PORT`: Port untuk webhook server (default: 3000)

## Troubleshooting

1. **Bot tidak terhubung:** Scan QR code yang muncul di terminal
2. **Pesan tidak terkirim:** Periksa format nomor telepon dan status bot
3. **Webhook error:** Periksa log di terminal untuk detail error
