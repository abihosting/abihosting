require("./all/global");
const func = require("./all/place");
const readline = require("readline");
const welcome = JSON.parse(fs.readFileSync("./all/database/welcome.json"));
const axios = require("axios");
const { botConnected } = require('./all/function');
const yargs = require('yargs/yargs');
const _ = require('lodash');
const usePairingCode = true;

const question = (text) => {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    return new Promise((resolve) => {
        rl.question(text, resolve);
    });
};

async function startSession() {
    const store = makeInMemoryStore({ logger: pino().child({ level: 'silent', stream: 'store' }) });
    const { state, saveCreds } = await useMultiFileAuthState(`./session`);
    const { version, isLatest } = await fetchLatestBaileysVersion();

    const connectionOptions = {
        version,
        keepAliveIntervalMs: 30000,
        printQRInTerminal: !usePairingCode,
        logger: pino({ level: "silent" }),
        auth: state,
        browser: ["Android", "Safari", "20.0.04"],
        getMessage: async (key) => {
            if (store) {
                const msg = await store.loadMessage(key.remoteJid, key.id, undefined);
                return msg?.message || undefined;
            }
            return {
                conversation: 'WhatsApp Bot - Official'
            };
        }
    };

    const bot = func.makeWASocket(connectionOptions);
    
    if (usePairingCode && !bot.authState.creds.registered) {
        const phoneNumber = await question(color('Enter WhatsApp number starting with 62:\n', 'red'));
        const code = await bot.requestPairingCode(phoneNumber.trim());
        console.log(`${chalk.redBright('Your Pairing Code')} : ${code}`);
    }
    
    store?.bind(bot.ev);

    bot.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const reason = new Boom(lastDisconnect?.error)?.output.statusCode;
            console.log(color(lastDisconnect.error, 'deeppink'));
            
            if (lastDisconnect.error == 'Error: Stream Errored (unknown)') {
                process.exit();
            } else if (reason === DisconnectReason.badSession) {
                console.log(color(`Bad Session File, Please Delete Session and Scan Again`));
                process.exit();
            } else if (reason === DisconnectReason.connectionClosed) {
                console.log(color('[SYSTEM]', 'white'), color('Connection closed, reconnecting...', 'deeppink'));
                process.exit();
            } else if (reason === DisconnectReason.connectionLost) {
                console.log(color('[SYSTEM]', 'white'), color('Connection lost, trying to reconnect', 'deeppink'));
                process.exit();
            } else if (reason === DisconnectReason.connectionReplaced) {
                console.log(color('Connection Replaced, Another New Session Opened, Please Close Current Session First'));
                bot.logout();
            } else if (reason === DisconnectReason.loggedOut) {
                console.log(color(`Device Logged Out, Please Scan Again And Run.`));
                bot.logout();
            } else if (reason === DisconnectReason.restartRequired) {
                console.log(color('Restart Required, Restarting...'));
                await startSession();
            } else if (reason === DisconnectReason.timedOut) {
                console.log(color('Connection TimedOut, Reconnecting...'));
                startSession();
            }
        } else if (connection === "connecting") {
            console.log(color('Connecting...'));
        } else if (connection === "open") {
            botConnected(bot);
            let connectionText = `*Bot Connected*\nConnected To ${bot.user.id.split(":")[0]}`;
            bot.sendMessage(global.owner+"@s.whatsapp.net", {text: connectionText});
            console.log(color('Bot successfully connected to WhatsApp'));
        }
    });

    bot.ev.on('call', async (user) => {
        if (!global.anticall) return;
        let botNumber = await bot.decodeJid(bot.user.id);
        for (let call of user) {
            if (call.isGroup == false) {
                if (call.status == "offer") {
                    let sendcall = await bot.sendMessage(call.from, {
                        text: `@${call.from.split("@")[0]} Sorry, you will be blocked because anti-call feature is active`,
                        contextInfo: {
                            mentionedJid: [call.from],
                            externalAdReply: {
                                thumbnailUrl: "https://example.com/image.jpg",
                                title: "｢ CALL DETECTED ｣",
                                previewType: "PHOTO"
                            }
                        }
                    }, {quoted: null});
                    bot.sendContact(call.from, [global.owner], "Call or VC = Block", sendcall);
                    await sleep(8000);
                    await bot.updateBlockStatus(call.from, "block");
                }
            }
        }
    });

    bot.ev.on('messages.upsert', async (chatUpdate) => {
        try {
            let m = chatUpdate.messages[0];
            if (!m.message) return;
            m.message = (Object.keys(m.message)[0] === 'ephemeralMessage') ? m.message.ephemeralMessage.message : m.message;
            if (m.key && m.key.remoteJid === 'status@broadcast') return bot.readMessages([m.key]);
            if (!bot.public && m.key.remoteJid !== global.owner+"@s.whatsapp.net" && !m.key.fromMe && chatUpdate.type === 'notify') return;
            if (m.key.id.startsWith('BAE5') && m.key.id.length === 16) return;
            if (global.autoread) bot.readMessages([m.key]);
            m = func.smsg(bot, m, store);
            require("./botHandler")(bot, m, store);
        } catch (err) {
            console.log(err);
        }
    });

    bot.ev.on('group-participants.update', async (update) => {
        if (!welcome.includes(update.id)) return;
        let botNumber = await bot.decodeJid(bot.user.id);
        if (update.participants.includes(botNumber)) return;
        
        try {
            let metadata = await bot.groupMetadata(update.id);
            let groupName = metadata.subject;
            let participants = update.participants;
            
            for (let num of participants) {
                let check = update.author !== num && update.author.length > 1;
                let tag = check ? [update.author, num] : [num];
                
                try {
                    ppuser = await bot.profilePictureUrl(num, 'image');
                } catch {
                    ppuser = 'https://example.com/image.jpg';
                }
                
                if (update.action == 'add') {
                    bot.sendMessage(update.id, {
                        text: check ? `@${update.author.split("@")[0]} added @${num.split("@")[0]} to this group` 
                              : `Hello @${num.split("@")[0]}, welcome to *${groupName}*`,
                        contextInfo: {
                            mentionedJid: [...tag],
                            externalAdReply: { 
                                thumbnailUrl: ppuser,
                                title: '© Welcome Message',
                                body: '',
                                renderLargerThumbnail: true,
                                sourceUrl: "https://whatsapp.com",
                                mediaType: 1
                            }
                        }
                    });
                }
                
                if (update.action == 'remove') {
                    bot.sendMessage(update.id, {
                        text: check ? `@${update.author.split("@")[0]} removed @${num.split("@")[0]} from this group`
                              : `Goodbye @${num.split("@")[0]}`,
                        contextInfo: {
                            mentionedJid: [...tag],
                            externalAdReply: {
                                thumbnailUrl: ppuser,
                                title: '© Leaving Message',
                                body: '',
                                renderLargerThumbnail: true,
                                sourceUrl: "https://whatsapp.com",
                                mediaType: 1
                            }
                        }
                    });
                }
                
                if (update.action == "promote") {
                    bot.sendMessage(update.id, {
                        text: `@${update.author.split("@")[0]} promoted @${num.split("@")[0]} as group admin`,
                        contextInfo: {
                            mentionedJid: [...tag],
                            externalAdReply: {
                                thumbnailUrl: ppuser,
                                title: '© Promote Message',
                                body: '',
                                renderLargerThumbnail: true,
                                sourceUrl: "https://whatsapp.com",
                                mediaType: 1
                            }
                        }
                    });
                }
                
                if (update.action == "demote") {
                    bot.sendMessage(update.id, {
                        text: `@${update.author.split("@")[0]} demoted @${num.split("@")[0]} from admin`,
                        contextInfo: {
                            mentionedJid: [...tag],
                            externalAdReply: {
                                thumbnailUrl: ppuser,
                                title: '© Demote Message',
                                body: '',
                                renderLargerThumbnail: true,
                                sourceUrl: "https://whatsapp.com",
                                mediaType: 1
                            }
                        }
                    });
                }
            }
        } catch (err) {
            console.log(err);
        }
    });

    bot.public = true;
    bot.ev.on('creds.update', saveCreds);
    return bot;
}

startSession();

process.on('uncaughtException', function (err) {
    console.log('Caught exception: ', err);
});