# Webhook Vinzhub Fish It Discord to WhatsApp

Sebuah bot yang menghubungkan Webhook Discord dengan WhatsApp untuk meneruskan pesan embed dari channel Discord ke nomor WhatsApp tertentu secara real-time.

## 🚀 Fitur

- **Real-time Message Forwarding**: Meneruskan pesan embed dari Discord ke WhatsApp secara otomatis
- **WhatsApp Integration**: Menggunakan Baileys untuk koneksi WhatsApp Web
- **Discord Bot**: Monitor channel Discord untuk pesan baru dengan embed
- **Vinzhub Fish It Integration**: Khusus untuk meneruskan notifikasi fishing dari Vinzhub
- **Auto Reconnection**: Otomatis reconnect jika koneksi terputus
- **QR Code Login**: Login WhatsApp menggunakan QR code
- **Message Formatting**: Konversi format Discord embed ke format WhatsApp yang readable

## 📋 Prerequisites

- Node.js (versi 16 atau lebih tinggi)
- npm atau yarn
- Discord Bot Token
- Discord Channel ID
- Nomor WhatsApp target
- Akun Vinzhub Fish It
- Discord Server dengan permission admin/manage webhooks

## 🎣 Tentang Vinzhub Fish It

Vinzhub Fish It adalah platform fishing game yang dapat mengirim notifikasi ke Discord melalui webhook ketika:
- Player berhasil menangkap ikan
- Mendapatkan ikan langka/legendary
- Mencapai milestone tertentu
- Event fishing khusus

Bot ini secara khusus dirancang untuk meneruskan notifikasi fishing dari Vinzhub ke WhatsApp, sehingga Anda tidak perlu selalu membuka Discord untuk melihat hasil fishing terbaru.

## 🛠️ Instalasi

1. **Clone repository**
   ```bash
   git clone <repository-url>
   cd Webhook
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Buat file `.env`**
   ```bash
   cp .env.example .env
   ```

4. **Konfigurasi environment variables**
   Edit file `.env` dengan informasi berikut:
   ```env
   DISCORD_TOKEN=your_discord_bot_token
   CHANNEL_ID=your_discord_channel_id
   TARGET_WA=your_whatsapp_number
   ```

## ⚙️ Konfigurasi

### Discord Bot Setup

1. Buat aplikasi Discord di [Discord Developer Portal](https://discord.com/developers/applications)
2. Buat bot dan copy token
3. Invite bot ke server dengan permission:
   - Read Messages
   - Send Messages
   - Read Message History
   - View Channels

### Discord Webhook Setup

1. **Buat Webhook Discord**
   - Buka server Discord Anda
   - Klik kanan pada channel yang ingin dimonitor
   - Pilih "Edit Channel" → "Integrations" → "Webhooks"
   - Klik "Create Webhook"
   - Copy **Webhook URL** (akan digunakan di Vinzhub)

2. **Konfigurasi Vinzhub**
   - Buka game Fish It
   - Run script vinzhub nya
   - Masuk ke menu "Webhook"
   - Tambahkan URL Discord Webhook:
     - **Webhook URL**: Paste URL webhook yang sudah dibuat
     - **Enable Notifications**: Ubah menjadi TRUE
     - **Test Webhook**: Klik untuk tes webhook terkonek atau tidak
     - **Rarity Filter**: Pilih rarity sesukamu

3. **Test Webhook**
   - Lakukan aktivitas mancing
   - Cek apakah pesan muncul di channel Discord
   - Pastikan format embed sesuai dengan yang diharapkan bot

### Environment Variables

| Variable | Deskripsi | Contoh |
|----------|-----------|--------|
| `DISCORD_TOKEN` | Token bot Discord | `XXXXXXzNDU2NzgXXXXXXXMzQ1Njc4OTA.GhIjKl.XXXXXXXXXXXX` |
| `CHANNEL_ID` | ID channel Discord yang akan dimonitor | `1234567890123456789` |
| `TARGET_WA` | Nomor WhatsApp target (tanpa + dan @) | `6281234567890` |

## 🚀 Menjalankan Bot

```bash
npm start
```

### Langkah-langkah:

1. **Jalankan aplikasi**
   ```bash
   npm start
   ```

2. **Scan QR Code**
   - QR code akan muncul di terminal
   - Scan dengan WhatsApp di ponsel Anda
   - Tunggu hingga muncul pesan "✅ Bot berhasil tersambung!"

3. **Bot siap digunakan**
   - Bot akan mulai memonitor channel Discord
   - Pesan embed baru akan otomatis diteruskan ke WhatsApp

## 📁 Struktur Project

```
Webhook/
├── index.js              # File utama aplikasi
├── package.json          # Dependencies dan scripts
├── .env                  # Environment variables (buat sendiri)
├── session/              # Session WhatsApp (auto-generated)
└── README.md            # Dokumentasi
```

## 🔧 Dependencies

- **@whiskeysockets/baileys**: WhatsApp Web API
- **discord.js**: Discord Bot API
- **@hapi/boom**: HTTP error handling
- **pino**: Logging
- **qrcode-terminal**: QR code display
- **dotenv**: Environment variables

## 📱 Cara Kerja

1. **WhatsApp Connection**: Bot menggunakan Baileys untuk koneksi WhatsApp Web
2. **Discord Monitoring**: Bot memonitor channel Discord untuk pesan baru
3. **Message Processing**: Pesan embed Discord dikonversi ke format WhatsApp
4. **Message Forwarding**: Pesan dikirim ke nomor WhatsApp target

## 🎯 Format Pesan

Bot akan mengkonversi Discord embed menjadi format WhatsApp. Untuk Vinzhub Fish It, format pesan akan seperti ini:

### Contoh Notifikasi Fishing:
```
> ```🎣 Fish Caught!```

- *Fish Name:* Golden Carp
- *Rarity:* Legendary
- *Size:* 45.2 cm
- *Weight:* 2.1 kg
- *Location:* Crystal Lake
- *XP Gained:* +150

> 🕒 *Caught At:* 15/01/2024, 14:30:25
```

### Contoh Notifikasi Rare Fish:
```
> ```🌟 Rare Fish Alert!```

- *Fish Name:* Rainbow Trout
- *Rarity:* Epic
- *Size:* 38.7 cm
- *Weight:* 1.8 kg
- *Special Ability:* Lucky Catch
- *Bonus XP:* +300

> 🕒 *Caught At:* 15/01/2024, 16:45:12
```

## 🚨 Troubleshooting

### Bot tidak bisa login WhatsApp
- Pastikan QR code di-scan dengan benar
- Coba hapus folder `session/` dan restart bot
- Pastikan nomor WhatsApp aktif

### Bot tidak menerima pesan Discord
- Pastikan bot memiliki permission yang cukup
- Periksa `CHANNEL_ID` di file `.env`
- Pastikan bot sudah di-invite ke server

### Error koneksi
- Periksa koneksi internet
- Restart aplikasi
- Periksa log error di terminal

### Webhook Vinzhub tidak berfungsi
- Pastikan webhook URL Discord sudah benar
- Cek apakah Vinzhub sudah mengirim test webhook
- Pastikan channel ID di Vinzhub sama dengan di bot
- Periksa permission webhook di Discord server

### Tidak menerima notifikasi fishing
- Pastikan Vinzhub aktif dan sedang fishing
- Cek apakah webhook sudah dikonfigurasi dengan benar di Vinzhub
- Pastikan event type yang dipilih sesuai (Fish Caught, Rare Fish, dll)
- Restart bot setelah mengubah konfigurasi Vinzhub

## 📝 Log

Bot akan menampilkan log berikut:
- `🔄 Memulai WhatsApp bot...` - Bot sedang memulai
- `📱 Scan QR ini untuk login WhatsApp` - QR code muncul
- `✅ Bot berhasil tersambung!` - WhatsApp terkoneksi
- `✅ Login sebagai BotName#1234` - Discord terkoneksi
- `🐟 Pesan baru diterima dari Username` - Pesan baru diterima
- `✅ Pesan baru berhasil dikirim ke WhatsApp` - Pesan berhasil dikirim

## 🔒 Keamanan

- Jangan share file `session/` dan `.env`
- Gunakan environment variables untuk sensitive data
- Pastikan bot hanya memiliki permission yang diperlukan

## 🤝 Contributing

1. Fork repository
2. Buat feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Buat Pull Request

## 📞 Support

Jika mengalami masalah, silakan buat issue di repository ini.
