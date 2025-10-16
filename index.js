import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion
} from "@whiskeysockets/baileys"
import pino from "pino"
import { Boom } from "@hapi/boom"
import qrcode from "qrcode-terminal"
import { Client, GatewayIntentBits } from 'discord.js';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

const DISCORD_TOKEN = process.env.DISCORD_TOKEN; // token bot
const CHANNEL_ID = process.env.CHANNEL_ID; // id channel
const TARGET_WA = process.env.TARGET_WA; // nomor WhatsApp target

// Validasi environment variables
if (!DISCORD_TOKEN) {
  console.error('❌ DISCORD_TOKEN tidak ditemukan di file .env');
  process.exit(1);
}

if (!CHANNEL_ID) {
  console.error('❌ CHANNEL_ID tidak ditemukan di file .env');
  process.exit(1);
}

if (!TARGET_WA) {
  console.error('❌ TARGET_WA tidak ditemukan di file .env');
  process.exit(1);
}

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState("./session")
  const { version } = await fetchLatestBaileysVersion()

  const sock = makeWASocket({
    version,
    auth: state,
    logger: pino({ level: "silent" })
  })

  sock.ev.on("creds.update", saveCreds)

  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect, qr } = update

    if (qr) {
      qrcode.generate(qr, { small: true })
      console.log("📱 Scan QR ini untuk login WhatsApp")
    }

    if (connection === "close") {
      const shouldReconnect =
        lastDisconnect?.error instanceof Boom
          ? lastDisconnect.error.output.statusCode !== DisconnectReason.loggedOut
          : true
      console.log("Koneksi terputus, reconnect...", shouldReconnect)
      if (shouldReconnect) startBot()
    } else if (connection === "open") {
      console.log("✅ Bot berhasil tersambung!")
      whatsappConnected = true
      // Jalankan Discord setelah WhatsApp terkoneksi
      if (!client.isReady()) {
        console.log("🚀 Memulai Discord client...")
        client.login(DISCORD_TOKEN)
      }
    }
  })

  return sock
}

// Global variable untuk menyimpan socket instance
let whatsappSocket = null
let whatsappConnected = false

const discordEmbedToWhatsAppText = (embed) => {

  // Helper: ubah markdown Discord -> WhatsApp
  const discordToWhatsApp = text => text?.replace(/\*\*/g, '`') || '';

  const lines = [];

  // Judul
  if (embed.title) lines.push(`> \`\`\`${embed.title}\`\`\``);

  // Field utama
  for (const f of embed.fields) {
    lines.push(`- *${f.name.replace('Name', '').trim()}:* ${discordToWhatsApp(f.value)}`);
  }

  // Tambah timestamp
  if (embed.timestamp) {
    const date = new Date(embed.timestamp);
    const localTime = date.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
    lines.push(`> 🕒 *Caught At:* ${localTime}`);
  }

  return lines.join('\n');
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent // butuh diaktifkan di Dev Portal jika diperlukan
  ]
});

client.once('ready', async () => {
  console.log(`✅ Login sebagai ${client.user.tag}`);

  const channel = await client.channels.fetch(CHANNEL_ID);
  if (!channel) return console.log('Channel tidak ditemukan.');

  // Ambil pesan terbaru saja
  const messages = await channel.messages.fetch({ limit: 1 });

  const data = [];
  for (const msg of messages.values()) {
    if (msg.embeds.length > 0) {
      for (const embed of msg.embeds) {
        data.push({
          author: msg.author.username,
          title: embed.title,
          description: embed.description,
          fields: embed.fields.map(f => ({ name: f.name, value: f.value })),
          timestamp: msg.createdAt,
        });
      }
    }
  }

  console.log(`📦 Ditemukan ${data.length} pesan terbaru dengan embed.`);

  // Kirim data ke WhatsApp jika ada pesan dan WhatsApp terkoneksi
  if (data.length > 0 && whatsappSocket && whatsappConnected) {
    try {
      const latestData = data[0]; // Ambil hanya data terbaru (index 0)
      const message = discordEmbedToWhatsAppText(latestData);
      
      // Gunakan nomor WhatsApp target dari environment variable
      const targetJid = `${TARGET_WA}@s.whatsapp.net`;
      
      await whatsappSocket.sendMessage(targetJid, { text: message });
      console.log('✅ Data terbaru berhasil dikirim ke WhatsApp.');
    } catch (err) {
      console.error('❌ Gagal kirim ke WhatsApp:', err.message);
    }
  }

});

client.on('messageCreate', async message => {
  // Skip pesan dari bot sendiri
  if (message.author.id === client.user.id) return;
  
  if (message.channel.id !== CHANNEL_ID) return;
  if (message.embeds.length === 0) return;

  const embed = message.embeds[0];
  const payload = {
    author: message.author.username,
    title: embed.title,
    fields: embed.fields.map(f => ({ name: f.name, value: f.value })),
    timestamp: message.createdAt,
  };

  console.log(`🐟 Pesan baru diterima dari ${message.author.username}: ${embed.title}`);

  // Kirim data ke WhatsApp jika WhatsApp terkoneksi
  if (whatsappSocket && whatsappConnected) {
    try {
      const messageText = discordEmbedToWhatsAppText(payload);
      
      const targetJid = `${TARGET_WA}@s.whatsapp.net`;
      
      await whatsappSocket.sendMessage(targetJid, { text: messageText });
      console.log('✅ Pesan baru berhasil dikirim ke WhatsApp.');
    } catch (err) {
      console.error('❌ Gagal kirim ke WhatsApp:', err.message);
    }
  } else {
    console.log('⚠️ WhatsApp belum terkoneksi, pesan tidak dikirim.');
  }
});

// Event handler untuk menangani error dan reconnection
client.on('error', error => {
  console.error('❌ Discord client error:', error);
});

client.on('disconnect', () => {
  console.log('⚠️ Discord client terputus, mencoba reconnect...');
});

client.on('reconnecting', () => {
  console.log('🔄 Discord client reconnecting...');
});

// Start WhatsApp bot
async function initializeBot() {
  console.log("🔄 Memulai WhatsApp bot...");
  whatsappSocket = await startBot();

  if (!client.isReady()) {
    console.log("🚀 Memulai Discord client...");
    client.login(DISCORD_TOKEN);
  }
}


initializeBot()
