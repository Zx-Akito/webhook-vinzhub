import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion
} from "@whiskeysockets/baileys"
import pino from "pino"
import { Boom } from "@hapi/boom"
import qrcode from "qrcode-terminal"
import express from "express"

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
    }
  })

  sock.ev.on("messages.upsert", async (m) => {
    const msg = m.messages[0]
    if (!msg.message || msg.key.fromMe) return

    const from = msg.key.remoteJid
    const text =
      msg.message.conversation ||
      msg.message.extendedTextMessage?.text ||
      ""

    console.log(`[Pesan dari ${from}]: ${text}`)
  })

  return sock
}

// Global variable untuk menyimpan socket instance
let whatsappSocket = null

// Setup Express server untuk webhook
const app = express()
const PORT = process.env.PORT || 4100

// Middleware
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Webhook endpoint untuk menerima data dari external services
app.post('/webhook', async (req, res) => {
  try {
    console.log('📥 Webhook received:', JSON.stringify(req.body, null, 2))
    
    const { message, phoneNumber, type = 'text' } = req.body
    
    if (!message || !phoneNumber) {
      return res.status(400).json({ 
        success: false, 
        error: 'Message dan phoneNumber diperlukan' 
      })
    }

    // Kirim pesan melalui WhatsApp
    if (whatsappSocket) {
      const targetJid = phoneNumber.includes('@') ? phoneNumber : `${phoneNumber}@s.whatsapp.net`
      
      let messageContent
      if (type === 'text') {
        messageContent = { text: message }
      } else if (type === 'image' && req.body.imageUrl) {
        messageContent = { 
          image: { url: req.body.imageUrl },
          caption: message 
        }
      } else if (type === 'document' && req.body.documentUrl) {
        messageContent = { 
          document: { url: req.body.documentUrl },
          mimetype: req.body.mimetype || 'application/octet-stream',
          fileName: req.body.fileName || 'document'
        }
      } else {
        messageContent = { text: message }
      }

      await whatsappSocket.sendMessage(targetJid, messageContent)
      
      res.json({ 
        success: true, 
        message: 'Pesan berhasil dikirim',
        target: targetJid
      })
    } else {
      res.status(503).json({ 
        success: false, 
        error: 'WhatsApp bot belum terhubung' 
      })
    }
  } catch (error) {
    console.error('❌ Webhook error:', error)
    res.status(500).json({ 
      success: false, 
      error: error.message 
    })
  }
})

// Endpoint untuk mendapatkan status bot
app.get('/status', (req, res) => {
  res.json({
    success: true,
    status: whatsappSocket ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  })
})

// Endpoint untuk mengirim pesan broadcast
app.post('/broadcast', async (req, res) => {
  try {
    const { message, phoneNumbers, type = 'text' } = req.body
    
    if (!message || !phoneNumbers || !Array.isArray(phoneNumbers)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Message dan phoneNumbers (array) diperlukan' 
      })
    }

    if (!whatsappSocket) {
      return res.status(503).json({ 
        success: false, 
        error: 'WhatsApp bot belum terhubung' 
      })
    }

    const results = []
    
    for (const phoneNumber of phoneNumbers) {
      try {
        const targetJid = phoneNumber.includes('@') ? phoneNumber : `${phoneNumber}@s.whatsapp.net` 
        await whatsappSocket.sendMessage(targetJid, message)
        results.push({ phoneNumber: targetJid, status: 'success' })
      } catch (error) {
        results.push({ 
          phoneNumber, 
          status: 'failed', 
          error: error.message 
        })
      }
    }

    res.json({ 
      success: true, 
      message: 'Broadcast selesai',
      results 
    })
  } catch (error) {
    console.error('❌ Broadcast error:', error)
    res.status(500).json({ 
      success: false, 
      error: error.message 
    })
  }
})

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  })
})

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Webhook server berjalan di port ${PORT}`)
  console.log(`📡 Webhook URL: http://localhost:${PORT}/webhook`)
  console.log(`📊 Status URL: http://localhost:${PORT}/status`)
  console.log(`📢 Broadcast URL: http://localhost:${PORT}/broadcast`)
})

// Start WhatsApp bot
async function initializeBot() {
  whatsappSocket = await startBot()
}

initializeBot()
