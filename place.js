const { makeInMemoryStore, makeWASocket, useSingleFileAuthState, delay } = require('@adiwajshing/baileys');
const pino = require('pino');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const crypto = require('crypto');

// Inisialisasi store
const store = makeInMemoryStore({ logger: pino().child({ level: 'silent', stream: 'store' }) });
const makeid = crypto.randomBytes(3).toString('hex');

// Konfigurasi bot
const config = {
    name: 'GroupGuardBot',
    prefix: '!',
    admins: ['6281234567890@s.whatsapp.net'], // Ganti dengan nomor admin
    groupRules: {
        default: `📜 PERATURAN GRUP 📜
1. Dilarang spam atau flood pesan
2. Dilarang konten SARA/pornografi
3. Dilarang promosi tanpa izin admin
4. Harap menjaga sopan santun
5. Dilarang mengirim link berbahaya`
    },
    bannedWords: ['kasar1', 'kasar2', 'promosi', 'scam', 'penipuan'],
    maxWarnings: 3,
    welcomeMessage: '👋 Selamat datang @user di grup kami! Silakan baca peraturan grup dengan mengetik !rules',
    goodbyeMessage: '👋 @user telah meninggalkan grup'
};

// Inisialisasi koneksi WhatsApp
const { state, saveState } = useSingleFileAuthState('./auth_info.json');
const sock = makeWASocket({
    auth: state,
    printQRInTerminal: true,
    logger: pino({ level: 'silent' })
});

// Fungsi utilitas
const getBuffer = async (url, options) => {
    try {
        options = options || {};
        const res = await axios({
            method: "get",
            url,
            headers: {
                'DNT': 1,
                'Upgrade-Insecure-Request': 1
            },
            ...options,
            responseType: 'arraybuffer'
        });
        return res.data;
    } catch (e) {
        console.log(`Error in getBuffer: ${e}`);
    }
};

// Simpan session
sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === 'close') {
        const shouldReconnect = (lastDisconnect.error)?.output?.statusCode !== 401;
        if (shouldReconnect) {
            console.log(chalk.yellow('Koneksi terputus, mencoba menghubungkan kembali...'));
            setTimeout(() => initializeWhatsApp(), 5000);
        }
    } else if (connection === 'open') {
        console.log(chalk.green('Bot berhasil terhubung!'));
    }
});

sock.ev.on('creds.update', saveState);

// Fungsi untuk memproses pesan
async function processMessage(m) {
    if (!m.message) return;
    
    try {
        const chatId = m.key.remoteJid;
        const isGroup = chatId.endsWith('@g.us');
        const sender = m.key.participant || m.key.remoteJid;
        const isAdmin = config.admins.includes(sender) || (isGroup && await isGroupAdmin(chatId, sender));
        
        // Hanya proses pesan grup
        if (!isGroup) return;
        
        const messageType = Object.keys(m.message)[0];
        let body = m.message[messageType].text || m.message[messageType].caption || '';
        
        // Deteksi perintah
        if (body.startsWith(config.prefix)) {
            const command = body.split(' ')[0].slice(config.prefix.length).toLowerCase();
            const args = body.split(' ').slice(1);
            
            switch(command) {
                case 'rules':
                    await sendRules(chatId);
                    break;
                case 'warn':
                    if (isAdmin && m.message.extendedTextMessage?.contextInfo?.mentionedJid) {
                        await warnUser(chatId, m.message.extendedTextMessage.contextInfo.mentionedJid[0]);
                    }
                    break;
                case 'kick':
                    if (isAdmin && m.message.extendedTextMessage?.contextInfo?.mentionedJid) {
                        await kickUser(chatId, m.message.extendedTextMessage.contextInfo.mentionedJid[0]);
                    }
                    break;
                case 'add':
                    case 'invite':
                    if (isAdmin && args.length > 0) {
                        await addUser(chatId, args[0] + '@s.whatsapp.net');
                    }
                    break;
                case 'promote':
                    if (isAdmin && m.message.extendedTextMessage?.contextInfo?.mentionedJid) {
                        await promoteUser(chatId, m.message.extendedTextMessage.contextInfo.mentionedJid[0]);
                    }
                    break;
                case 'demote':
                    if (isAdmin && m.message.extendedTextMessage?.contextInfo?.mentionedJid) {
                        await demoteUser(chatId, m.message.extendedTextMessage.contextInfo.mentionedJid[0]);
                    }
                    break;
                case 'help':
                    await sendHelp(chatId);
                    break;
            }
        }
        
        // Deteksi kata terlarang (hanya untuk non-admin)
        if (!isAdmin) {
            const containsBannedWord = config.bannedWords.some(word => 
                body.toLowerCase().includes(word.toLowerCase())
            );
            
            if (containsBannedWord) {
                await warnUser(chatId, sender);
            }
            
            // Deteksi link
            if (body.includes('http://') || body.includes('https://')) {
                await sock.sendMessage(chatId, { 
                    text: `⚠️ @${sender.split('@')[0]} dilarang mengirim link tanpa izin admin!`,
                    mentions: [sender]
                });
                await sock.sendMessage(chatId, { 
                    text: `Admin, ada anggota yang mengirim link! @${sender.split('@')[0]}`,
                    mentions: config.admins
                });
            }
        }
    } catch (error) {
        console.error('Error processing message:', error);
    }
}

// Fungsi bantuan
async function isGroupAdmin(groupId, userId) {
    try {
        const metadata = await sock.groupMetadata(groupId);
        return metadata.participants.find(p => p.id === userId)?.admin !== undefined;
    } catch (error) {
        console.error('Error checking group admin:', error);
        return false;
    }
}

async function sendRules(chatId) {
    const groupRules = config.groupRules[chatId] || config.groupRules.default;
    await sock.sendMessage(chatId, { text: groupRules });
}

async function warnUser(chatId, userId) {
    // Implementasi sistem warning
    const warnings = store.get(`${chatId}:${userId}:warnings`) || 0;
    const newWarnings = warnings + 1;
    
    store.set(`${chatId}:${userId}:warnings`, newWarnings);
    
    await sock.sendMessage(chatId, { 
        text: `⚠️ Peringatan ${newWarnings}/${config.maxWarnings} untuk @${userId.split('@')[0]}\n` +
              `Alasan: Mengirim konten terlarang`,
        mentions: [userId]
    });
    
    if (newWarnings >= config.maxWarnings) {
        await kickUser(chatId, userId);
    }
}

async function kickUser(chatId, userId) {
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

async function addUser(chatId, phoneNumber) {
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

async function promoteUser(chatId, userId) {
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

async function demoteUser(chatId, userId) {
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

async function sendHelp(chatId) {
    const helpText = `🛠️ *Daftar Perintah Bot* 🛠️
${config.prefix}rules - Menampilkan peraturan grup
${config.prefix}warn @user - Memberi peringatan ke anggota
${config.prefix}kick @user - Mengeluarkan anggota dari grup
${config.prefix}add 628xxx - Menambahkan anggota ke grup
${config.prefix}promote @user - Menjadikan anggota sebagai admin
${config.prefix}demote @user - Mencabut status admin
${config.prefix}help - Menampilkan menu bantuan`;

    await sock.sendMessage(chatId, { text: helpText });
}

// Event handler
sock.ev.on('messages.upsert', async ({ messages }) => {
    for (const m of messages) {
        await processMessage(m);
    }
});

sock.ev.on('group-participants.update', async ({ id, participants, action }) => {
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
});

// Bind store
store.bind(sock.ev);