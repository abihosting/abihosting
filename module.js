const { makeWASocket, makeInMemoryStore, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require("@whiskeysockets/baileys");
const pino = require("pino");
const fs = require("fs");
const path = require("path");
const chalk = require("chalk");
const { Boom } = require("@hapi/boom");

// Inisialisasi store
const store = makeInMemoryStore({ logger: pino().child({ level: 'silent', stream: 'store' }) });
store.readFromFile('./baileys_store.json');
setInterval(() => {
    store.writeToFile('./baileys_store.json');
}, 10_000);

// Konfigurasi bot
const config = {
    name: "GroupGuardBot",
    prefix: "!",
    admins: ["6281234567890@s.whatsapp.net"], // Ganti dengan nomor admin
    groupRules: {
        default: `📜 PERATURAN GRUP 📜
1. Dilarang spam atau flood pesan
2. Dilarang konten SARA/pornografi
3. Dilarang promosi tanpa izin admin
4. Harap menjaga sopan santun
5. Dilarang mengirim link berbahaya`
    },
    bannedWords: ["kasar1", "kasar2", "promosi", "scam", "penipuan"],
    maxWarnings: 3,
    welcomeMessage: "👋 Selamat datang @user di grup kami! Silakan baca peraturan grup dengan mengetik !rules",
    goodbyeMessage: "👋 @user telah meninggalkan grup",
    autoReply: true,
    antiLink: true,
    antiBadword: true
};

// Fungsi utama
async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('baileys_auth_info');
    const { version } = await fetchLatestBaileysVersion();
    
    const sock = makeWASocket({
        version,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: true,
        auth: state,
        browser: Browsers.macOS("Desktop"),
        getMessage: async (key) => {
            return store.loadMessage(key.remoteJid, key.id) || {};
        }
    });

    store.bind(sock.ev);

    // Event handler koneksi
    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect.error)?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log(chalk.redBright(`Koneksi terputus, mencoba menghubungkan kembali...`));
            if (shouldReconnect) {
                setTimeout(startBot, 5000);
            }
        } else if (connection === 'open') {
            console.log(chalk.greenBright(`Bot berhasil terhubung sebagai ${sock.user?.name || sock.user?.id}`));
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
                console.error(chalk.redBright('Error processing message:'), error);
            }
        }
    });

    // Event handler update grup
    sock.ev.on('group-participants.update', async ({ id, participants, action }) => {
        try {
            if (action === 'add') {
                const welcomeMsg = config.welcomeMessage.replace('@user', `@${participants[0].split('@')[0]}`);
                await sock.sendMessage(id, { 
                    text: welcomeMsg,
                    mentions: participants
                });
            } else if (action === 'remove') {
                const goodbyeMsg = config.goodbyeMessage.replace('@user', `@${participants[0].split('@')[0]}`);
                await sock.sendMessage(id, { 
                    text: goodbyeMsg,
                    mentions: participants
                });
            }
        } catch (error) {
            console.error(chalk.redBright('Error handling group update:'), error);
        }
    });

    // Event handler update grup
    sock.ev.on('groups.update', async (updates) => {
        for (const update of updates) {
            if (update.subject) {
                console.log(chalk.yellow(`Grup ${update.id} mengganti nama menjadi: ${update.subject}`));
            }
        }
    });
}

// Fungsi proses pesan
async function processMessage(sock, m) {
    if (!m.message || m.key.fromMe) return;
    
    const chatId = m.key.remoteJid;
    const isGroup = chatId?.endsWith('@g.us');
    const sender = m.key.participant || m.key.remoteJid;
    const user = sender.split('@')[0];
    const body = m.message.conversation || m.message.extendedTextMessage?.text || '';
    
    // Dapatkan metadata grup jika pesan dari grup
    let groupMetadata;
    if (isGroup) {
        try {
            groupMetadata = await sock.groupMetadata(chatId);
        } catch (error) {
            console.error('Error getting group metadata:', error);
        }
    }
    
    // Cek apakah pengirim adalah admin
    const isAdmin = config.admins.includes(sender) || 
                   (isGroup && groupMetadata?.participants.find(p => p.id === sender)?.admin);

    // Proses perintah
    if (body.startsWith(config.prefix)) {
        const command = body.split(' ')[0].slice(config.prefix.length).toLowerCase();
        const args = body.split(' ').slice(1);
        
        switch(command) {
            case 'rules':
                await sendRules(sock, chatId);
                break;
            case 'warn':
                if (isAdmin && m.message.extendedTextMessage?.contextInfo?.mentionedJid) {
                    await warnUser(sock, chatId, m.message.extendedTextMessage.contextInfo.mentionedJid[0]);
                }
                break;
            case 'kick':
                if (isAdmin && m.message.extendedTextMessage?.contextInfo?.mentionedJid) {
                    await kickUser(sock, chatId, m.message.extendedTextMessage.contextInfo.mentionedJid[0]);
                }
                break;
            case 'add':
                if (isAdmin && args.length > 0) {
                    await addUser(sock, chatId, args[0] + '@s.whatsapp.net');
                }
                break;
            case 'promote':
                if (isAdmin && m.message.extendedTextMessage?.contextInfo?.mentionedJid) {
                    await promoteUser(sock, chatId, m.message.extendedTextMessage.contextInfo.mentionedJid[0]);
                }
                break;
            case 'demote':
                if (isAdmin && m.message.extendedTextMessage?.contextInfo?.mentionedJid) {
                    await demoteUser(sock, chatId, m.message.extendedTextMessage.contextInfo.mentionedJid[0]);
                }
                break;
            case 'help':
                await sendHelp(sock, chatId);
                break;
            case 'info':
                if (isGroup) {
                    await sendGroupInfo(sock, chatId, groupMetadata);
                }
                break;
        }
    }
    
    // Moderasi otomatis (hanya untuk non-admin)
    if (isGroup && !isAdmin) {
        // Deteksi kata terlarang
        if (config.antiBadword) {
            const containsBannedWord = config.bannedWords.some(word => 
                body.toLowerCase().includes(word.toLowerCase())
            );
            
            if (containsBannedWord) {
                await warnUser(sock, chatId, sender);
            }
        }
        
        // Deteksi link
        if (config.antiLink && (body.includes('http://') || body.includes('https://'))) {
            await sock.sendMessage(chatId, { 
                text: `⚠️ @${user} dilarang mengirim link tanpa izin admin!`,
                mentions: [sender]
            });
            await sock.sendMessage(chatId, { 
                text: `Admin, ada anggota yang mengirim link! @${user}`,
                mentions: config.admins
            });
        }
    }
}

// Fungsi bantuan
async function sendRules(sock, chatId) {
    const groupRules = config.groupRules[chatId] || config.groupRules.default;
    await sock.sendMessage(chatId, { text: groupRules });
}

async function warnUser(sock, chatId, userId) {
    const user = userId.split('@')[0];
    const warnings = (store.get(`${chatId}:${userId}:warnings`) || 0) + 1;
    
    store.set(`${chatId}:${userId}:warnings`, warnings);
    
    await sock.sendMessage(chatId, { 
        text: `⚠️ Peringatan ${warnings}/${config.maxWarnings} untuk @${user}\nAlasan: Mengirim konten terlarang`,
        mentions: [userId]
    });
    
    if (warnings >= config.maxWarnings) {
        await kickUser(sock, chatId, userId);
    }
}

async function kickUser(sock, chatId, userId) {
    try {
        await sock.groupParticipantsUpdate(chatId, [userId], 'remove');
        await sock.sendMessage(chatId, { 
            text: `🚫 @${userId.split('@')[0]} telah dikeluarkan dari grup karena melanggar peraturan`,
            mentions: [userId]
        });
        store.set(`${chatId}:${userId}:warnings`, 0);
    } catch (error) {
        console.error('Error kicking user:', error);
    }
}

async function addUser(sock, chatId, phoneNumber) {
    try {
        await sock.groupParticipantsUpdate(chatId, [phoneNumber], 'add');
        await sock.sendMessage(chatId, { 
            text: `✅ @${phoneNumber.split('@')[0]} telah diundang ke grup`,
            mentions: [phoneNumber]
        });
    } catch (error) {
        console.error('Error adding user:', error);
    }
}

async function promoteUser(sock, chatId, userId) {
    try {
        await sock.groupParticipantsUpdate(chatId, [userId], 'promote');
        await sock.sendMessage(chatId, { 
            text: `👑 @${userId.split('@')[0]} sekarang menjadi admin grup`,
            mentions: [userId]
        });
    } catch (error) {
        console.error('Error promoting user:', error);
    }
}

async function demoteUser(sock, chatId, userId) {
    try {
        await sock.groupParticipantsUpdate(chatId, [userId], 'demote');
        await sock.sendMessage(chatId, { 
            text: `🔻 @${userId.split('@')[0]} tidak lagi menjadi admin grup`,
            mentions: [userId]
        });
    } catch (error) {
        console.error('Error demoting user:', error);
    }
}

async function sendHelp(sock, chatId) {
    const helpText = `🛠️ *Daftar Perintah Bot* 🛠️
${config.prefix}rules - Menampilkan peraturan grup
${config.prefix}warn @user - Memberi peringatan ke anggota
${config.prefix}kick @user - Mengeluarkan anggota dari grup
${config.prefix}add 628xxx - Menambahkan anggota ke grup
${config.prefix}promote @user - Menjadikan anggota sebagai admin
${config.prefix}demote @user - Mencabut status admin
${config.prefix}info - Menampilkan info grup
${config.prefix}help - Menampilkan menu bantuan`;

    await sock.sendMessage(chatId, { text: helpText });
}

async function sendGroupInfo(sock, chatId, metadata) {
    const infoText = `📌 *Info Grup* 📌
Nama: ${metadata.subject}
Dibuat: ${new Date(metadata.creation * 1000).toLocaleString()}
Pemilik: @${metadata.owner.split('@')[0]}
Total Anggota: ${metadata.participants.length}
Deskripsi: ${metadata.desc || 'Tidak ada'}`;

    await sock.sendMessage(chatId, { 
        text: infoText,
        mentions: [metadata.owner]
    });
}

// Mulai bot
startBot().catch(err => {
    console.error(chalk.redBright('Error starting bot:'), err);
    process.exit(1);
});

module.exports = {
    command: "rules",
    description: "Tampilkan peraturan grup",
    async execute({ sock, chatId }) {
        await sock.sendMessage(chatId, { 
            text: global.config.groupRules.default 
        });
    }
};