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
let discordClient = null
let keepAliveInterval = null
let reconnectAttempts = 0
const MAX_RECONNECT_ATTEMPTS = 5

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

// Fungsi untuk mengecek apakah pesan harus dikirim berdasarkan rarity
const shouldSendMessage = (embed) => {
  // Cari field rarity dalam embed
  const rarityField = embed.fields.find(field => 
    field.name.toLowerCase().includes('rarity') || 
    field.name.toLowerCase().includes('rare')
  );
  
  if (!rarityField) {
    // Jika tidak ada field rarity, kirim pesan (default behavior)
    return true;
  }
  
  const rarity = rarityField.value.toLowerCase().trim();
  
  // Jangan kirim jika rarity adalah "uncommon" atau "rare"
  if (rarity === 'uncommon' || rarity === 'rare') {
    console.log(`🚫 Pesan tidak dikirim karena rarity: ${rarity}`);
    return false;
  }
  return true;
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent // butuh diaktifkan di Dev Portal jika diperlukan
  ],
  // Tambahkan konfigurasi untuk mencegah timeout
  ws: {
    properties: {
      $browser: "Discord iOS"
    }
  }
});

client.once('ready', async () => {
  console.log(`✅ Login sebagai ${client.user.tag}`);
  discordClient = client;
  reconnectAttempts = 0; // Reset reconnect attempts

  // Start keep-alive mechanism
  startKeepAlive();

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
      
      // Cek apakah pesan harus dikirim berdasarkan rarity
      if (!shouldSendMessage(latestData)) {
        console.log('🚫 Data terbaru tidak dikirim karena filter rarity.');
        return;
      }
      
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

  // Cek apakah pesan harus dikirim berdasarkan rarity
  if (!shouldSendMessage(payload)) {
    return; // Keluar dari fungsi jika tidak boleh dikirim
  }

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

// Keep-alive mechanism untuk mencegah bot mati
function startKeepAlive() {
  if (keepAliveInterval) {
    clearInterval(keepAliveInterval);
  }
  
  keepAliveInterval = setInterval(async () => {
    try {
      if (client.isReady()) {
        // Ping server untuk menjaga koneksi aktif
        await client.guilds.fetch();
        console.log('💓 Keep-alive: Bot masih aktif');
      } else {
        console.log('⚠️ Bot tidak ready, mencoba reconnect...');
        await reconnectDiscord();
      }
    } catch (error) {
      console.error('❌ Keep-alive error:', error.message);
      await reconnectDiscord();
    }
  }, 30000); // Ping setiap 30 detik
}

// Fungsi untuk reconnect Discord
async function reconnectDiscord() {
  if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    console.error('❌ Maksimum reconnect attempts tercapai, restarting bot...');
    process.exit(1);
  }
  
  reconnectAttempts++;
  console.log(`🔄 Mencoba reconnect Discord (attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);
  
  try {
    if (client.isReady()) {
      client.destroy();
    }
    
    // Tunggu sebentar sebelum reconnect
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    await client.login(DISCORD_TOKEN);
  } catch (error) {
    console.error('❌ Gagal reconnect Discord:', error.message);
    
    // Coba lagi setelah delay yang lebih lama
    setTimeout(() => reconnectDiscord(), 10000);
  }
}

// Event handler untuk menangani error dan reconnection
client.on('error', error => {
  console.error('❌ Discord client error:', error);
});

client.on('disconnect', () => {
  console.log('⚠️ Discord client terputus, mencoba reconnect...');
  reconnectDiscord();
});

client.on('reconnecting', () => {
  console.log('🔄 Discord client reconnecting...');
});

client.on('shardDisconnect', (event, id) => {
  console.log(`⚠️ Shard ${id} terputus:`, event.reason);
  reconnectDiscord();
});

client.on('shardReconnecting', (id) => {
  console.log(`🔄 Shard ${id} reconnecting...`);
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('🛑 Menerima SIGINT, shutting down gracefully...');
  if (keepAliveInterval) {
    clearInterval(keepAliveInterval);
  }
  if (client.isReady()) {
    client.destroy();
  }
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('🛑 Menerima SIGTERM, shutting down gracefully...');
  if (keepAliveInterval) {
    clearInterval(keepAliveInterval);
  }
  if (client.isReady()) {
    client.destroy();
  }
  process.exit(0);
});

// Start WhatsApp bot
async function initializeBot() {
  console.log("🔄 Memulai WhatsApp bot...");
  whatsappSocket = await startBot();

  // Start Discord client setelah WhatsApp berhasil dimulai
  if (!client.isReady()) {
    console.log("🚀 Memulai Discord client...");
    try {
      await client.login(DISCORD_TOKEN);
    } catch (error) {
      console.error('❌ Gagal login Discord:', error.message);
      // Retry setelah 10 detik
      setTimeout(() => initializeBot(), 10000);
    }
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  // Restart bot setelah error
  setTimeout(() => {
    console.log('🔄 Restarting bot setelah uncaught exception...');
    process.exit(1);
  }, 5000);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  // Restart bot setelah error
  setTimeout(() => {
    console.log('🔄 Restarting bot setelah unhandled rejection...');
    process.exit(1);
  }, 5000);
});

initializeBot()
