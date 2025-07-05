require("./module");
require("../settings");
require("./color");
require("./exif");

// Konfigurasi utama
const config = {
    name: "GlobalGroupBot",
    prefix: "#",
    admins: ["6281234567890@s.whatsapp.net"], // Ganti dengan nomor admin
    owner: "6289876543210@s.whatsapp.net", // Ganti dengan nomor owner
    sessionName: "global-session",
    modulPath: "./modules",
    tmpPath: "./tmp",
    groupRules: {
        default: `📜 PERATURAN GRUP 📜
1. Dilarang spam atau flood pesan
2. Dilarang konten SARA/pornografi
3. Dilarang promosi tanpa izin admin
4. Harap menjaga sopan santun
5. Dilarang mengirim link berbahaya`
    },
    autoRead: true,
    autoreaction: false,
    autobio: false,
    antibadword: true,
    antilink: true,
    autotype: false,
    autodownload: true,
    autoviewonce: true
};

// Inisialisasi global
global.config = config;
global.baileysVersion = require("@whiskeysockets/baileys/package.json").version;
global.logger = require("./system/logger");
global.database = require("./system/database");
global.functions = require("./system/functions");
global.commands = new Map();
global.events = new Map();
global.tmp = (path) => join(config.tmpPath, path);

// Load modules
async function loadModules() {
    try {
        const modules = fs.readdirSync(config.modulPath).filter(file => file.endsWith('.js'));
        
        for (const file of modules) {
            const module = require(join(config.modulPath, file));
            if (module.command) {
                global.commands.set(module.command, module);
                logger.load(`Module ${chalk.green(module.command)} loaded`);
            }
            if (module.event) {
                global.events.set(module.event, module);
                logger.load(`Event ${chalk.blue(module.event)} loaded`);
            }
        }
        
        logger.info(`Successfully loaded ${chalk.green(commands.size)} commands and ${chalk.blue(events.size)} events`);
    } catch (error) {
        logger.error(`Error loading modules: ${error}`);
    }
}

// Inisialisasi WhatsApp
async function initWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState(config.sessionName);
    
    const sock = makeWASocket({
        version: global.baileysVersion,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: true,
        auth: state,
        browser: Browsers.macOS(config.name),
        getMessage: async (key) => {
            return database.getMessage(key.remoteJid, key.id) || {};
        }
    });

    // Event handler koneksi
    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect.error)?.output?.statusCode !== DisconnectReason.loggedOut;
            logger.warn(`Connection closed, reconnecting...`);
            if (shouldReconnect) {
                setTimeout(initWhatsApp, 5000);
            }
        } else if (connection === 'open') {
            logger.info(`Connected as ${sock.user?.name || sock.user?.id}`);
        }
    });

    // Simpan kredensial
    sock.ev.on('creds.update', saveCreds);

    // Event handler pesan
    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type !== 'notify') return;
        
        for (const msg of messages) {
            try {
                await processMessage(sock, msg);
            } catch (error) {
                logger.error(`Error processing message: ${error}`);
            }
        }
    });

    // Event handler grup
    sock.ev.on('group-participants.update', async ({ id, participants, action }) => {
        const event = global.events.get('group-participants.update');
        if (event) await event.execute({ sock, id, participants, action });
    });

    // Event handler update grup
    sock.ev.on('groups.update', async (updates) => {
        const event = global.events.get('groups.update');
        if (event) await event.execute({ sock, updates });
    });

    // Event handler call
    sock.ev.on('call', async (call) => {
        const event = global.events.get('call');
        if (event) await event.execute({ sock, call });
    });

    return sock;
}

// Proses pesan utama
async function processMessage(sock, m) {
    if (!m.message || m.key.fromMe) return;
    
    const chatId = m.key.remoteJid;
    const isGroup = chatId?.endsWith('@g.us');
    const sender = m.key.participant || m.key.remoteJid;
    const user = sender.split('@')[0];
    const body = m.message.conversation || m.message.extendedTextMessage?.text || '';
    
    // Auto read
    if (config.autoRead) {
        await sock.readMessages([m.key]);
    }

    // Auto download media
    if (config.autodownload && m.message?.imageMessage) {
        await downloadMedia(sock, m);
    }

    // Auto viewonce
    if (config.autoviewonce && m.message?.viewOnceMessage) {
        await sock.sendMessage(chatId, { text: `View once message from @${user}` }, { quoted: m });
    }

    // Proses perintah
    if (body.startsWith(config.prefix)) {
        const command = body.split(' ')[0].slice(config.prefix.length).toLowerCase();
        const args = body.split(' ').slice(1);
        
        const cmd = global.commands.get(command);
        if (cmd) {
            try {
                await cmd.execute({ sock, m, chatId, isGroup, sender, user, body, args });
            } catch (error) {
                logger.error(`Error executing command ${command}: ${error}`);
                await sock.sendMessage(chatId, { text: `Terjadi error saat menjalankan perintah` });
            }
        }
    }
    
    // Moderasi otomatis
    if (isGroup) {
        const isAdmin = config.admins.includes(sender) || 
                      (await isGroupAdmin(sock, chatId, sender));
        
        if (!isAdmin) {
            // Anti badword
            if (config.antibadword && containsBadWord(body)) {
                await warnUser(sock, chatId, sender);
            }
            
            // Anti link
            if (config.antilink && containsLink(body)) {
                await sock.sendMessage(chatId, { 
                    text: `⚠️ @${user} dilarang mengirim link tanpa izin admin!`,
                    mentions: [sender]
                });
            }
        }
    }
}

// Fungsi bantuan
async function isGroupAdmin(sock, chatId, userId) {
    try {
        const metadata = await sock.groupMetadata(chatId);
        return metadata.participants.find(p => p.id === userId)?.admin !== undefined;
    } catch (error) {
        logger.error(`Error checking admin status: ${error}`);
        return false;
    }
}

function containsBadWord(text) {
    const badWords = ["kasar1", "kasar2", "promosi", "scam", "penipuan"];
    return badWords.some(word => text.toLowerCase().includes(word.toLowerCase()));
}

function containsLink(text) {
    return text.includes('http://') || text.includes('https://');
}

async function downloadMedia(sock, m) {
    try {
        const type = Object.keys(m.message)[0].replace('Message', '');
        const buffer = await sock.downloadMediaMessage(m);
        const filename = `${config.tmpPath}/${Date.now()}.${type}`;
        await fs.promises.writeFile(filename, buffer);
        logger.info(`Media saved to ${filename}`);
    } catch (error) {
        logger.error(`Error downloading media: ${error}`);
    }
}

// Main function
async function startBot() {
    try {
        logger.info(`Starting ${config.name} bot...`);
        await loadModules();
        await initWhatsApp();
        logger.info(`Bot is ready!`);
    } catch (error) {
        logger.error(`Error starting bot: ${error}`);
        process.exit(1);
    }
}

// Hot reload
let file = require.resolve(__filename);
fs.watchFile(file, () => {
    fs.unwatchFile(file);
    console.log(chalk.redBright(`Update ${__filename}`));
    delete require.cache[file];
    require(file);
});

// Start the bot
startBot();