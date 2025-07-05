/*
Official Script Recode By YourBotName
Credit: [YourName] - [YourTeam]
*/

module.exports = async (bot, m, store) => {
    try {
        const body = (m.mtype === 'conversation') ? m.message.conversation : 
                    (m.mtype == 'imageMessage') ? m.message.imageMessage.caption : 
                    (m.mtype == 'videoMessage') ? m.message.videoMessage.caption : 
                    (m.mtype == 'extendedTextMessage') ? m.message.extendedTextMessage.text : 
                    (m.mtype == 'buttonsResponseMessage') ? m.message.buttonsResponseMessage.selectedButtonId : 
                    (m.mtype == 'listResponseMessage') ? m.message.listResponseMessage.singleSelectReply.selectedRowId : 
                    (m.mtype === 'interactiveResponseMessage') ? JSON.parse(m.message.interactiveResponseMessage.nativeFlowResponseMessage.paramsJson).id : 
                    (m.mtype == 'templateButtonReplyMessage') ? m.message.templateButtonReplyMessage.selectedId : 
                    (m.mtype === 'messageContextInfo') ? (m.message.buttonsResponseMessage?.selectedButtonId || m.message.listResponseMessage?.singleSelectReply.selectedRowId || m.text) : '';

        //========== DATABASE ===========//
        const antibot = JSON.parse(fs.readFileSync('./all/database/antibot.json'));
        const antilink = JSON.parse(fs.readFileSync('./all/database/antilink.json'));
        const welcome = JSON.parse(fs.readFileSync('./all/database/welcome.json'));
        const premium = JSON.parse(fs.readFileSync("./all/database/premium.json"));
        const owner2 = JSON.parse(fs.readFileSync("./all/database/owner.json"));
        const isPremium = premium.includes(m.sender);

        //========= CONFIGURATION ==========//
        const budy = (typeof m.text == 'string' ? m.text : '');
        const isOwner = owner2.includes(m.sender) ? true : m.sender == global.owner+"@s.whatsapp.net" ? true : m.fromMe ? true : false;
        const prefix = '.';
        const isCmd = body.startsWith(prefix);
        const command = isCmd ? body.slice(prefix.length).trim().split(' ').shift().toLowerCase() : "";
        const cmd = prefix + command;
        const args = body.trim().split(/ +/).slice(1);
        const text = q = args.join(" ");
        const botNumber = await bot.decodeJid(bot.user.id);
        const isGroup = m.chat.endsWith('@g.us');
        const senderNumber = m.sender.split('@')[0];
        const pushname = m.pushName || `${senderNumber}`;
        const groupMetadata = m.isGroup ? await bot.groupMetadata(m.chat).catch(e => {}) : {};
        const participant_bot = m.isGroup ? groupMetadata?.participants.find((v) => v.id == botNumber) : {};
        const participant_sender = m.isGroup ? groupMetadata?.participants.find((v) => v.id == m.sender) : {};
        const isBotAdmin = participant_bot?.admin !== null ? true : false;
        const isAdmin = participant_sender?.admin !== null ? true : false;
        const quoted = m.quoted ? m.quoted : m;
        const mime = (quoted.msg || quoted).mimetype || '';
        const qmsg = (quoted.msg || quoted);

        //=========== MESSAGE LOG ===========//
        if (isCmd) {
            console.log(chalk.yellow.bgCyan.bold(global.namabot), color(`[ MESSAGE ]`, `blue`), color(`FROM`, `blue`), color(`${senderNumber}`, `blue`), color(`Text :`, `blue`), color(`${cmd}`, `white`));
        }

        //========= ANTILINK =========//
        if (antilink.includes(m.chat)) {
            if (!isBotAdmin) return;
            if (!isAdmin && !isOwner && !m.fromMe) {
                const link = /chat.whatsapp.com|buka tautaniniuntukbergabungkegrupwhatsapp/gi;
                if (link.test(m.text)) {
                    const gclink = (`https://chat.whatsapp.com/` + await bot.groupInviteCode(m.chat));
                    const isLinkThisGc = new RegExp(gclink, 'i');
                    const isgclink = isLinkThisGc.test(m.text);
                    if (isgclink) return;
                    
                    const delet = m.key.participant;
                    const bang = m.key.id;
                    
                    await bot.sendMessage(m.chat, {
                        text: `@${m.sender.split("@")[0]} Your message was deleted because anti-link feature is active for other groups!`, 
                        contextInfo: {
                            mentionedJid: [m.sender], 
                            externalAdReply: {
                                thumbnailUrl: ppuser, 
                                title: "Group Link Detected", 
                                body: "Powered By "+global.namabot, 
                                previewType: "PHOTO"
                            }
                        }
                    }, {quoted: m});
                    
                    await bot.sendMessage(m.chat, { 
                        delete: { 
                            remoteJid: m.chat, 
                            fromMe: false, 
                            id: bang, 
                            participant: delet 
                        }
                    });
                }
            }
        }

        switch (command) {
            case "menu": {
                let simbol = global.simbol;
                let menu = `╭──〔 BOT INFORMATION 〕
│ Greeting : *${ucapan()}*
│ Hi : @${m.sender.split("@")[0]}!
│ Bot Name : *${global.namabot}*
│ Uptime : *${runtime(process.uptime())}*
│ Version : *${global.version}*
╰─────────────────

╭──〔 OWNER MENU 〕
│ ${simbol} .addowner
│ ${simbol} .delowner
│ ${simbol} .addprem
│ ${simbol} .delprem
│ ${simbol} .kick
│ ${simbol} .promote
│ ${simbol} .demote
│ ${simbol} .hidetag
╰─────────────────

╭──〔 MAIN MENU 〕
│ ${simbol} .tiktok
│ ${simbol} .igmp4
│ ${simbol} .tourl
│ ${simbol} .infogempa
│ ${simbol} .cekkodepos
│ ${simbol} .ceknik
╰─────────────────`;

                bot.sendMessage(m.chat, {
                    text: menu, 
                    contextInfo: { 
                        mentionedJid: [m.sender], 
                        externalAdReply: {
                            thumbnail: fs.readFileSync("./media/Menu.jpg"), 
                            title: `© ${global.namabot} - ${global.version}`, 
                            body: `Runtime : ${runtime(process.uptime())}`,  
                            sourceUrl: global.domain, 
                            previewType: "PHOTO"
                        }
                    }
                }, {quoted: m});
                break;
            }

            case "addowner": {
                if (!isOwner) return m.reply(global.msg.owner);
                if (m.quoted || text) {
                    let target = m.mentionedJid[0] ? m.mentionedJid[0] : 
                               text ? text.replace(/[^0-9]/g, '')+'@s.whatsapp.net' : 
                               m.quoted ? m.quoted.sender : '';
                    
                    if (owner2.includes(target) || target == global.owner) return m.reply(`Number ${target.split("@")[0]} is already in Owner database`);
                    if (target == botNumber) return m.reply("Cannot add bot number to additional Owner database");
                    
                    let check = await bot.onWhatsApp(`${target.split("@")[0]}`);
                    if (check.length < 1) return m.reply(`Number ${target.split("@")[0]} is not registered on WhatsApp`);
                    
                    owner2.push(target);
                    fs.writeFileSync("./all/database/owner.json", JSON.stringify(owner2, null, 2));
                    m.reply(`*Successfully Added Owner ✅*\nNumber ${target.split("@")[0]} has been added to Owner database`);
                } else {
                    m.reply("@tag/6283XXX");
                }
                break;
            }

            case "tiktok": {
                if (!text) return m.reply("Please provide TikTok URL");
                if (!text.includes('tiktok.com')) return m.reply("Invalid TikTok URL");
                
                try {
                    let res = await fetch(`https://api.tikdownloader.com/api?url=${encodeURIComponent(text)}`);
                    let data = await res.json();
                    
                    if (data.video) {
                        await bot.sendMessage(m.chat, { 
                            video: { url: data.video }, 
                            caption: `TikTok Video Download\n\nOriginal URL: ${text}`
                        }, { quoted: m });
                    } else {
                        m.reply("Failed to download TikTok video");
                    }
                } catch (e) {
                    m.reply(`Error: ${e.message}`);
                }
                break;
            }

            case "infogempa": {
                let res = await fetch('https://data.bmkg.go.id/DataMKG/TEWS/autogempa.json');
                let data = await res.json();
                let gempa = data.Infogempa.gempa;
                
                let result = `乂 *EARTHQUAKE INFO*  
                
❃ *Time:* ${gempa.DateTime}
❃ *Coordinates:* ${gempa.Coordinates}
❃ *Magnitude:* ${gempa.Magnitude}
❃ *Depth:* ${gempa.Kedalaman}
❃ *Region:* ${gempa.Wilayah}
❃ *Potential:* ${gempa.Potensi}`;

                m.reply(result);
                break;
            }

            // Add more commands here...

            default:
                if (budy.startsWith('$')) {
                    if (!isOwner) return;
                    exec(budy.slice(2), (err, stdout) => {
                        if(err) return bot.sendMessage(m.chat, {text: err.toString()}, {quoted: m});
                        if (stdout) return bot.sendMessage(m.chat, {text: util.format(stdout)}, {quoted: m});
                    }
                }
        }
    } catch (e) {
        console.log(e);
        bot.sendMessage(`${global.owner}@s.whatsapp.net`, {
            text: `${util.format(e)}\n\nCommand From : ${m.sender.split("@")[0]}`
        }, {quoted: m});
    }
};

let file = require.resolve(__filename);
fs.watchFile(file, () => {
    fs.unwatchFile(file);
    console.log(chalk.redBright(`Update ${__filename}`));
    delete require.cache[file];
    require(file);
});

//========== CPANEL MANAGEMENT ==========//
case "1gb": {
    if (!isPremium && !isOwner) return m.reply(global.msg.owner);
    let t = text.split(',');
    if (t.length < 2) return m.reply(`*Wrong format!*\nUsage: ${prefix + command} username,number`);
    
    let username = t[0];
    let target = t[1] + '@s.whatsapp.net';
    let name = username + " 1GB";
    let egg = global.egg;
    let loc = global.loc;
    let memo = "1125";
    let cpu = "30";
    let disk = "1125";
    let email = username + "1398@gmail.com";
    let panelImage = "https://example.com/panel.jpg";

    if (!target) return;
    let check = await bot.onWhatsApp(target.split('@')[0]);
    if (!check || check.length < 1) return m.reply(`Number ${target.split("@")[0]} is not registered on WhatsApp`);

    let password = username + crypto.randomBytes(2).toString('hex');
    
    // Create user
    let userRes = await fetch(global.domain + "/api/application/users", {
        method: "POST",
        headers: {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "Authorization": "Bearer " + global.apikey
        },
        body: JSON.stringify({
            "email": email,
            "username": username,
            "first_name": username,
            "last_name": username,
            "language": "en",
            "password": password
        })
    });
    
    let userData = await userRes.json();
    if (userData.errors) return m.reply(JSON.stringify(userData.errors[0], null, 2));
    
    // Get egg configuration
    let eggRes = await fetch(global.domain + "/api/application/nests/5/eggs/" + egg, {
        method: "GET",
        headers: {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "Authorization": "Bearer " + global.apikey
        }
    });
    let eggData = await eggRes.json();
    let startup_cmd = eggData.attributes.startup;

    // Create server
    let serverRes = await fetch(global.domain + "/api/application/servers", {
        method: "POST",
        headers: {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "Authorization": "Bearer " + global.apikey,
        },
        body: JSON.stringify({
            "name": name,
            "description": "Created by WhatsApp Bot",
            "user": userData.attributes.id,
            "egg": parseInt(egg),
            "docker_image": "ghcr.io/parkervcp/yolks:nodejs_19",
            "startup": startup_cmd,
            "environment": {
                "INST": "npm",
                "USER_UPLOAD": "0",
                "AUTO_UPDATE": "0",
                "CMD_RUN": "npm start"
            },
            "limits": {
                "memory": memo,
                "swap": 0,
                "disk": disk,
                "io": 500,
                "cpu": cpu
            },
            "feature_limits": {
                "databases": 5,
                "backups": 5,
                "allocations": 1
            },
            deploy: {
                locations: [parseInt(loc)],
                dedicated_ip: false,
                port_range: [],
            }
        })
    });

    let serverData = await serverRes.json();
    if (serverData.errors) return m.reply(JSON.stringify(serverData.errors[0], null, 2));

    // Send panel info to user
    let panelInfo = `*YOUR PANEL DETAILS:*

👤 Username: ${username}
🔐 Password: ${password}
🌐 Panel URL: ${global.domain}

*NOTE:*
- Save this information carefully
- Owner will only send this once`;

    await bot.sendMessage(target, {
        image: { url: panelImage },
        caption: panelInfo
    }, { quoted: m });

    m.reply(`✅ *Panel successfully created and sent to ${target.split('@')[0]}*`);
    break;
}

//========== MEDIA DOWNLOADERS ==========//
case "igdl": case "instagram": {
    if (!text) return m.reply("Please provide Instagram URL");
    if (!text.includes('instagram.com')) return m.reply("Invalid Instagram URL");

    try {
        let res = await fetch(`https://api.instagram.com/download?url=${encodeURIComponent(text)}`);
        let data = await res.json();
        
        if (data.media) {
            if (data.media.type === 'image') {
                await bot.sendMessage(m.chat, {
                    image: { url: data.media.url },
                    caption: `Instagram Download\n\nOriginal URL: ${text}`
                }, { quoted: m });
            } else if (data.media.type === 'video') {
                await bot.sendMessage(m.chat, {
                    video: { url: data.media.url },
                    caption: `Instagram Download\n\nOriginal URL: ${text}`
                }, { quoted: m });
            }
        } else {
            m.reply("Failed to download Instagram media");
        }
    } catch (e) {
        m.reply(`Error: ${e.message}`);
    }
    break;
}

//========== GROUP MANAGEMENT ==========//
case "setwelcome": {
    if (!isGroup) return m.reply(global.msg.group);
    if (!isAdmin && !isOwner) return m.reply(global.msg.admin);
    
    if (!welcome.includes(m.chat)) {
        welcome.push(m.chat);
        fs.writeFileSync('./all/database/welcome.json', JSON.stringify(welcome, null, 2));
        m.reply("Welcome message activated for this group!");
    } else {
        m.reply("Welcome message was already active for this group!");
    }
    break;
}

case "delwelcome": {
    if (!isGroup) return m.reply(global.msg.group);
    if (!isAdmin && !isOwner) return m.reply(global.msg.admin);
    
    if (welcome.includes(m.chat)) {
        welcome.splice(welcome.indexOf(m.chat), 1);
        fs.writeFileSync('./all/database/welcome.json', JSON.stringify(welcome, null, 2));
        m.reply("Welcome message deactivated for this group!");
    } else {
        m.reply("Welcome message wasn't active for this group!");
    }
    break;
}

//========== UTILITIES ==========//
case "sticker": case "s": {
    if (!m.quoted) return m.reply("Reply to an image/video to convert to sticker");
    if (!/image|video/.test(mime)) return m.reply("Only image/video can be converted to sticker");
    
    let media = await m.quoted.download();
    let sticker = await bot.sendMessage(m.chat, {
        sticker: media
    }, { quoted: m });
    break;
}

case "toimg": {
    if (!m.quoted) return m.reply("Reply to a sticker to convert to image");
    if (!m.quoted.sticker) return m.reply("That's not a sticker");
    
    let media = await m.quoted.download();
    let image = await bot.sendMessage(m.chat, {
        image: media
    }, { quoted: m });
    break;
}

//========== OWNER TOOLS ==========//
case "broadcast": case "bc": {
    if (!isOwner) return m.reply(global.msg.owner);
    if (!text) return m.reply("Please provide a message to broadcast");
    
    let chats = await bot.chats.all();
    let success = 0, failed = 0;
    
    for (let chat of chats) {
        try {
            await bot.sendMessage(chat.id, { text: `*BROADCAST MESSAGE*\n\n${text}` });
            success++;
        } catch (e) {
            failed++;
        }
        await delay(2000); // Prevent rate limiting
    }
    
    m.reply(`Broadcast completed!\nSuccess: ${success}\nFailed: ${failed}`);
    break;
}

case "eval": case ">": {
    if (!isOwner) return m.reply(global.msg.owner);
    try {
        let evaled = await eval(text);
        if (typeof evaled !== 'string') evaled = require('util').inspect(evaled);
        m.reply(evaled);
    } catch (e) {
        m.reply(`Error: ${e}`);
    }
    break;
}

//========== HELP SECTION ==========//
case "help": {
    let helpText = `*${global.namabot} COMMANDS*

*Owner Commands:*
.owner - Show owner info
.addowner - Add new owner
.delowner - Remove owner
.broadcast - Broadcast message
.eval - Evaluate code

*Group Commands:*
.setwelcome - Enable welcome message
.delwelcome - Disable welcome message
.kick - Remove member
.promote - Make admin
.demote - Remove admin

*Download Commands:*
.tiktok - Download TikTok video
.igdl - Download Instagram media
.sticker - Convert to sticker
.toimg - Convert sticker to image

*Panel Commands:*
.1gb - Create 1GB panel
.2gb - Create 2GB panel
.3gb - Create 3GB panel
... (up to 10gb)

Type ${prefix}menu to see full menu`;
    
    bot.sendMessage(m.chat, { text: helpText }, { quoted: m });
    break;
}

//========== AUTO RESPONSE ==========//
default:
    if (!isCmd) {
        // Auto response to keywords
        const autoResponses = {
            "hi|hello|hey": "Hello there! How can I help you?",
            "thanks|thank you": "You're welcome!",
            "bot name": `My name is ${global.namabot}`,
            "owner": `My owner is ${global.namaowner}`
        };
        
        for (const [pattern, response] of Object.entries(autoResponses)) {
            if (new RegExp(pattern, "i").test(body)) {
                m.reply(response);
                break;
            }
        }
    }
}

//========== ERROR HANDLING ==========//
} catch (e) {
    console.error('Error in handler:', e);
    bot.sendMessage(m.chat, {
        text: `An error occurred: ${e.message}\n\nPlease report this to the owner.`
    }, { quoted: m });
    
    // Send error to owner
    bot.sendMessage(global.owner + '@s.whatsapp.net', {
        text: `*ERROR REPORT*\n\nCommand: ${command}\nFrom: ${m.sender}\n\nError: ${e.stack}`
    });
}

// Helper function for delay
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Helper function to get greeting based on time
function ucapan() {
    const hour = new Date().getHours();
    if (hour >= 4 && hour < 10) return 'Good morning';
    if (hour >= 10 && hour < 15) return 'Good afternoon';
    if (hour >= 15 && hour < 18) return 'Good evening';
    return 'Good night';
}

// Helper function to format runtime
function runtime(seconds) {
    seconds = Math.floor(seconds);
    const days = Math.floor(seconds / (3600 * 24));
    const hours = Math.floor((seconds % (3600 * 24)) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    return `${days}d ${hours}h ${minutes}m ${secs}s`;
}

let file = require.resolve(__filename);
fs.watchFile(file, () => {
    fs.unwatchFile(file);
    console.log(chalk.redBright(`Updated ${__filename}`));
    delete require.cache[file];
    require(file);
});

//========== ADVANCED MEDIA TOOLS ==========//
case "enhance": {
    if (!m.quoted || !/image/.test(mime)) return m.reply("Reply to a blurry image to enhance it");
    
    try {
        let media = await m.quoted.download();
        let enhanced = await fetch('https://api.deepai.org/api/torch-srgan', {
            method: 'POST',
            headers: { 'api-key': 'your-deepai-api-key' },
            body: { image: media }
        }).then(res => res.json());
        
        await bot.sendMessage(m.chat, {
            image: { url: enhanced.output_url },
            caption: "Enhanced image using AI"
        }, { quoted: m });
    } catch (e) {
        m.reply("Failed to enhance image: " + e.message);
    }
    break;
}

case "translate": {
    if (!text && !m.quoted) return m.reply("Reply to a message or provide text to translate");
    let targetLang = args[0] || 'en';
    let content = text ? text : m.quoted.text;
    
    try {
        let translation = await fetch(`https://api.cognitive.microsofttranslator.com/translate?api-version=3.0&to=${targetLang}`, {
            method: 'POST',
            headers: { 
                'Ocp-Apim-Subscription-Key': 'your-azure-key',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify([{ Text: content }])
        }).then(res => res.json());
        
        m.reply(`Translation (${targetLang}):\n${translation[0].translations[0].text}`);
    } catch (e) {
        m.reply("Translation failed: " + e.message);
    }
    break;
}

//========== AI CHAT FEATURES ==========//
case "ai": case "ask": {
    if (!text) return m.reply("Please provide your question");
    
    try {
        let aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${global.openaiKey}`
            },
            body: JSON.stringify({
                model: "gpt-3.5-turbo",
                messages: [{role: "user", content: text}],
                temperature: 0.7
            })
        }).then(res => res.json());
        
        m.reply(aiResponse.choices[0].message.content.trim());
    } catch (e) {
        m.reply("AI service error: " + e.message);
    }
    break;
}

//========== PAYMENT SYSTEM ==========//
case "premium": {
    let premiumInfo = `*PREMIUM SUBSCRIPTION*

💰 Benefits:
- Priority support
- Access to all features
- Higher limits

💳 Payment Methods:
1. Dana: 081234567890 (YourName)
2. OVO: 081234567890
3. Bank Transfer: BCA 1234567890

After payment, send proof to owner with command:
.paid <amount> <payment method> <screenshot>`;
    
    await bot.sendMessage(m.chat, {
        text: premiumInfo,
        contextInfo: {
            externalAdReply: {
                title: "Upgrade to Premium",
                body: "Unlock all features",
                thumbnail: fs.readFileSync("./media/premium.jpg"),
                sourceUrl: global.domain
            }
        }
    }, { quoted: m });
    break;
}

case "paid": {
    if (!m.quoted || !/image/.test(mime)) return m.reply("Please include payment proof screenshot");
    
    let [amount, method] = args;
    if (!amount || !method) return m.reply("Format: .paid <amount> <payment method>");
    
    let media = await m.quoted.download();
    await bot.sendMessage(global.owner + '@s.whatsapp.net', {
        text: `*NEW PAYMENT*\n\nFrom: ${m.sender.split('@')[0]}\nAmount: ${amount}\nMethod: ${method}`,
        image: media
    });
    
    m.reply("Payment proof received! We'll verify and activate your premium within 1 hour.");
    break;
}

//========== DATABASE BACKUP SYSTEM ==========//
case "backup": {
    if (!isOwner) return m.reply(global.msg.owner);
    
    let timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    let backupFile = `./backups/backup-${timestamp}.zip`;
    
    // Create backup
    let backup = await require('child_process').execSync(`zip -r ${backupFile} ./all/database`);
    
    await bot.sendMessage(m.chat, {
        document: { url: backupFile },
        fileName: `bot-backup-${timestamp}.zip`,
        mimetype: 'application/zip',
        caption: `Backup created at ${new Date().toLocaleString()}`
    });
    
    fs.unlinkSync(backupFile); // Clean up
    break;
}

//========== AUTOMATION TOOLS ==========//
case "autoreply": {
    if (!isOwner) return m.reply(global.msg.owner);
    
    if (args[0] === 'on') {
        global.autoReply = true;
        m.reply("Auto-reply activated");
    } else if (args[0] === 'off') {
        global.autoReply = false;
        m.reply("Auto-reply deactivated");
    } else {
        m.reply("Usage: .autoreply <on/off>");
    }
    break;
}

//========== SERVER MONITORING ==========//
case "status": {
    if (!isOwner) return m.reply(global.msg.owner);
    
    let cpuUsage = await getCpuUsage();
    let memUsage = process.memoryUsage();
    let diskUsage = await getDiskUsage();
    let uptime = runtime(process.uptime());
    
    let statusMsg = `*SERVER STATUS*\n
🖥️ CPU: ${cpuUsage}%
🧠 RAM: ${(memUsage.rss / 1024 / 1024).toFixed(2)}MB
💾 Disk: ${diskUsage}%
⏳ Uptime: ${uptime}
🌐 Bot: ${global.namabot} ${global.version}`;
    
    m.reply(statusMsg);
    break;
}

// Helper functions for status
function getCpuUsage() {
    return new Promise(resolve => {
        require('os-utils').cpuUsage(resolve);
    });
}

function getDiskUsage() {
    return require('diskusage').check('/').then(info => {
        return Math.round((info.total - info.free) / info.total * 100);
    });
}

//========== SCHEDULED MESSAGES ==========//
case "schedule": {
    if (!isOwner) return m.reply(global.msg.owner);
    
    let [time, ...message] = args;
    if (!time || !message.length) return m.reply("Format: .schedule <HH:MM> <message>");
    
    let [hours, minutes] = time.split(':').map(Number);
    let now = new Date();
    let targetTime = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        hours,
        minutes
    );
    
    if (targetTime < now) targetTime.setDate(targetTime.getDate() + 1);
    
    let delay = targetTime - now;
    global.scheduledMessages = global.scheduledMessages || [];
    
    let timer = setTimeout(() => {
        bot.sendMessage(m.chat, { text: message.join(' ') });
    }, delay);
    
    global.scheduledMessages.push(timer);
    m.reply(`Message scheduled for ${targetTime.toLocaleString()}`);
    break;
}

//========== SECURITY FEATURES ==========//
case "antidelete": {
    if (!isGroup) return m.reply(global.msg.group);
    if (!isBotAdmin) return m.reply(global.msg.adminbot);
    
    if (args[0] === 'on') {
        global.antiDelete = m.chat;
        m.reply("Anti-delete activated in this group");
    } else if (args[0] === 'off') {
        global.antiDelete = null;
        m.reply("Anti-delete deactivated");
    } else {
        m.reply("Usage: .antidelete <on/off>");
    }
    break;
}

// Handle deleted messages
if (global.antiDelete && m.message?.protocolMessage?.key && m.message.protocolMessage.type === 0) {
    let deletedMsg = await store.loadMessage(m.chat, m.message.protocolMessage.key.id);
    if (deletedMsg) {
        let sender = deletedMsg.key.participant || deletedMsg.key.remoteJid;
        bot.sendMessage(m.chat, {
            text: `@${sender.split('@')[0]} deleted a message:\n\n${deletedMsg.message.conversation || "Media message"}`,
            mentions: [sender]
        });
    }
}

//========== GAME FEATURES ==========//
case "quiz": {
    let questions = [
        {
            question: "What's the capital of France?",
            options: ["London", "Paris", "Berlin", "Madrid"],
            answer: 1
        },
        // Add more questions...
    ];
    
    let currentQuestion = questions[Math.floor(Math.random() * questions.length)];
    let quizMsg = await bot.sendMessage(m.chat, {
        text: `*QUIZ TIME*\n\n${currentQuestion.question}\n\n` +
              currentQuestion.options.map((o,i) => `${i+1}. ${o}`).join('\n'),
        footer: "Reply with the number of your answer"
    });
    
    // Store quiz state
    global.quizzes = global.quizzes || {};
    global.quizzes[quizMsg.key.id] = {
        answer: currentQuestion.answer,
        timestamp: Date.now()
    };
    
    // Auto-cleanup after 2 minutes
    setTimeout(() => {
        delete global.quizzes[quizMsg.key.id];
    }, 120000);
    break;
}

// Handle quiz answers
if (global.quizzes && m.quoted) {
    let quizId = m.quoted.key.id;
    if (global.quizzes[quizId]) {
        let userAnswer = parseInt(text);
        let correctAnswer = global.quizzes[quizId].answer + 1;
        
        if (userAnswer === correctAnswer) {
            m.reply("🎉 Correct answer!");
        } else {
            m.reply(`❌ Wrong! The correct answer was ${correctAnswer}`);
        }
        
        delete global.quizzes[quizId];
    }
}

//========== FILE MANAGEMENT ==========//
case "getfile": {
    if (!isOwner) return m.reply(global.msg.owner);
    
    let filePath = args[0];
    if (!filePath || !fs.existsSync(filePath)) return m.reply("File not found");
    
    let fileExt = filePath.split('.').pop().toLowerCase();
    let mimeTypes = {
        'jpg': 'image/jpeg',
        'png': 'image/png',
        'mp4': 'video/mp4',
        'pdf': 'application/pdf',
        // Add more types...
    };
    
    await bot.sendMessage(m.chat, {
        document: { url: filePath },
        fileName: filePath.split('/').pop(),
        mimetype: mimeTypes[fileExt] || 'application/octet-stream'
    });
    break;
}

//========== MULTI-LANGUAGE SUPPORT ==========//
case "language": case "lang": {
    let languages = {
        'en': 'English',
        'id': 'Indonesian',
        'es': 'Spanish'
        // Add more languages...
    };
    
    if (!args[0]) {
        let langList = Object.entries(languages).map(([code, name]) => `- ${code}: ${name}`).join('\n');
        m.reply(`Available languages:\n\n${langList}\n\nUsage: .lang <code>`);
    } else {
        let langCode = args[0].toLowerCase();
        if (languages[langCode]) {
            global.userLanguage = global.userLanguage || {};
            global.userLanguage[m.sender] = langCode;
            m.reply(`Language set to ${languages[langCode]}`);
        } else {
            m.reply("Unsupported language code");
        }
    }
    break;
}

// Get localized string
function __(key, lang = 'en') {
    const strings = {
        'en': {
            'welcome': 'Welcome to the group!',
            'goodbye': 'Goodbye!'
        },
        'id': {
            'welcome': 'Selamat datang di grup!',
            'goodbye': 'Selamat tinggal!'
        }
        // Add more languages...
    };
    
    return strings[lang]?.[key] || strings['en'][key] || key;
}

//========== FINAL ERROR HANDLER ==========//
} catch (e) {
    console.error('[HANDLER ERROR]', e);
    
    // Send error to owner
    await bot.sendMessage(global.owner + '@s.whatsapp.net', {
        text: `*CRITICAL ERROR*\n\n` +
              `Command: ${command}\n` +
              `User: ${m.sender}\n` +
              `Time: ${new Date().toISOString()}\n\n` +
              `Error:\n${e.stack || e.message}`
    }).catch(console.error);
    
    // Inform user
    if (m) {
        await bot.sendMessage(m.chat, {
            text: "An unexpected error occurred. The developer has been notified."
        }, { quoted: m }).catch(console.error);
    }
}

// Auto-reload when file changes
let file = require.resolve(__filename);
fs.watchFile(file, () => {
    fs.unwatchFile(file);
    console.log(chalk.redBright(`[HOT RELOAD] Updated ${__filename}`));
    delete require.cache[file];
    require(file);
});

case "weather":
  let location = text || "Jakarta";
  let weather = await fetch(`https://api.weatherapi.com/v1/current.json?key=YOUR_KEY&q=${location}`);
  // Process and send weather data
  break;
  
// In command handler
const userLevel = getLevel(m.sender);
if (userLevel < requiredLevel) return m.reply("You don't have permission for this command");

// Load plugins dynamically
fs.readdirSync('./plugins').forEach(file => {
  let plugin = require(`./plugins/${file}`);
  plugin(bot, m, store);
});

case "transcribe":
  if (!m.quoted || !m.quoted.audio) return m.reply("Reply to a voice note");
  let audio = await m.quoted.download();
  let transcription = await speechToText(audio);
  m.reply("Transcription: " + transcription);
  break;
  
  //========== VOICE COMMAND PROCESSING ==========//
case "voicecmd": {
    if (!m.quoted || !m.quoted.audio) return m.reply("Reply to a voice message");
    
    try {
        // Download voice note
        const audioBuffer = await m.quoted.download();
        const audioFile = `./temp/voice_${Date.now()}.ogg`;
        fs.writeFileSync(audioFile, audioBuffer);
        
        // Convert to text using Whisper API
        const transcription = await fetch('https://api.openai.com/v1/audio/transcriptions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${global.openaiKey}`,
                'Content-Type': 'multipart/form-data'
            },
            body: formData.append('file', fs.createReadStream(audioFile))
                .append('model', 'whisper-1')
        }).then(res => res.json());
        
        fs.unlinkSync(audioFile); // Clean up
        
        // Process the transcribed command
        m.text = transcription.text; // Replace message text with transcription
        await module.exports(bot, m, store); // Reprocess as text command
        
    } catch (e) {
        console.error("Voice command error:", e);
        m.reply("Failed to process voice command");
    }
    break;
}

//========== REAL-TIME COLLABORATION ==========//
case "collab": {
    if (!isGroup) return m.reply(global.msg.group);
    
    const collabToken = crypto.randomBytes(8).toString('hex');
    const collabLink = `${global.domain}/collab?room=${m.chat}&token=${collabToken}`;
    
    // Store collaboration session
    global.collabSessions = global.collabSessions || {};
    global.collabSessions[m.chat] = {
        token: collabToken,
        participants: [],
        whiteboard: "",
        lastActive: Date.now()
    };
    
    await bot.sendMessage(m.chat, {
        text: `*Collaboration Session Started*\n\n` +
              `Join here: ${collabLink}\n\n` +
              `Features:\n- Shared whiteboard\n- Live document editing\n- Group coding`,
        templateButtons: [{
            urlButton: {
                displayText: "Join Collaboration",
                url: collabLink
            }
        }]
    });
    
    // Auto-close after 2 hours
    setTimeout(() => {
        if (global.collabSessions[m.chat]) {
            bot.sendMessage(m.chat, "Collaboration session has ended");
            delete global.collabSessions[m.chat];
        }
    }, 7200000);
    break;
}

//========== VIRTUAL ASSISTANT SCHEDULING ==========//
case "schedule": {
    const eventPattern = /(\d{1,2})\/(\d{1,2})\/(\d{4}) (\d{1,2}):(\d{2}) (.+)/;
    const match = text.match(eventPattern);
    
    if (!match) return m.reply("Format: .schedule DD/MM/YYYY HH:MM Event Description");
    
    const [_, day, month, year, hours, minutes, eventDesc] = match;
    const eventTime = new Date(`${year}-${month}-${day}T${hours}:${minutes}:00`);
    
    if (isNaN(eventTime.getTime())) return m.reply("Invalid date/time format");
    
    // Store in database
    global.scheduledEvents = global.scheduledEvents || [];
    global.scheduledEvents.push({
        chat: m.chat,
        time: eventTime,
        description: eventDesc,
        creator: m.sender
    });
    
    // Set reminder
    const now = new Date();
    const timeDiff = eventTime - now;
    
    if (timeDiff > 0) {
        setTimeout(async () => {
            await bot.sendMessage(m.chat, {
                text: `⏰ *Event Reminder*\n\n` +
                      `${eventDesc}\n\n` +
                      `Scheduled by: @${m.sender.split('@')[0]}`,
                mentions: [m.sender]
            });
            
            // Remove from database
            global.scheduledEvents = global.scheduledEvents.filter(e => e.time !== eventTime);
        }, timeDiff);
    }
    
    m.reply(`Event scheduled for ${eventTime.toLocaleString()}`);
    break;
}

//========== BUSINESS INTELLIGENCE DASHBOARD ==========//
case "analytics": {
    if (!isOwner) return m.reply(global.msg.owner);
    
    // Generate usage statistics
    const today = new Date().toISOString().split('T')[0];
    const stats = {
        commands: Object.keys(global.commandStats || {}).length,
        activeUsers: Object.keys(global.userStats || {}).length,
        groups: Object.keys(global.groupStats || {}).length,
        todayUsage: global.dailyStats?.[today] || 0
    };
    
    // Create chart image
    const chartUrl = await generateChart(stats);
    
    await bot.sendMessage(m.chat, {
        image: { url: chartUrl },
        caption: `📊 *Bot Analytics*\n\n` +
                 `Total Commands: ${stats.commands}\n` +
                 `Active Users: ${stats.activeUsers}\n` +
                 `Groups: ${stats.groups}\n` +
                 `Today's Usage: ${stats.todayUsage}`,
        footer: "Generated at " + new Date().toLocaleString()
    });
    break;
}

//========== BLOCKCHAIN INTEGRATION ==========//
case "crypto": {
    const action = args[0]?.toLowerCase();
    const coin = args[1]?.toUpperCase();
    
    if (!action || !coin) return m.reply("Usage: .crypto <price|pay> <BTC|ETH|etc>");
    
    if (action === "price") {
        // Get crypto price
        const priceData = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${coin.toLowerCase()}&vs_currencies=usd`);
        const price = priceData[coin.toLowerCase()]?.usd;
        
        if (!price) return m.reply("Invalid coin or API error");
        
        m.reply(`Current ${coin} price: $${price}`);
        
    } else if (action === "pay") {
        // Generate payment request
        const walletAddress = "YOUR_WALLET_ADDRESS";
        const amount = args[2] || "0.01";
        
        await bot.sendMessage(m.chat, {
            text: `*Crypto Payment Request*\n\n` +
                  `Send ${amount} ${coin} to:\n` +
                  `\`${walletAddress}\`\n\n` +
                  `After payment, reply with transaction hash`,
            footer: "Payment will be verified automatically"
        });
    }
    break;
}

//========== IOT DEVICE CONTROL ==========//
case "iot": {
    if (!isOwner) return m.reply(global.msg.owner);
    
    const [device, action] = args;
    if (!device || !action) return m.reply("Usage: .iot <device> <on|off|status>");
    
    try {
        const response = await fetch(`https://api.your-iot-service.com/control`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${global.iotKey}` },
            body: JSON.stringify({ device, action })
        });
        
        const result = await response.json();
        m.reply(`Device ${device} is now ${result.status}`);
    } catch (e) {
        m.reply(`Failed to control device: ${e.message}`);
    }
    break;
}

//========== ADVANCED AUTOMATION ==========//
case "workflow": {
    if (!isOwner) return m.reply(global.msg.owner);
    
    const workflowName = args[0];
    const workflows = {
        "backup": [
            "backup",
            "sendfile ./backups/latest.zip",
            "status"
        ],
        "maintenance": [
            "broadcast Bot going down for maintenance in 5 minutes",
            "delay 300000",
            "stop"
        ]
    };
    
    if (!workflowName) {
        return m.reply(`Available workflows:\n${Object.keys(workflows).join('\n')}`);
    }
    
    if (!workflows[workflowName]) return m.reply("Workflow not found");
    
    // Execute workflow steps
    for (const step of workflows[workflowName]) {
        if (step.startsWith("delay")) {
            const ms = parseInt(step.split(' ')[1]);
            await new Promise(resolve => setTimeout(resolve, ms));
        } else {
            m.text = prefix + step;
            await module.exports(bot, m, store);
        }
    }
    break;
}

//========== ENTERPRISE SECURITY ==========//
case "2fa": {
    if (args[0] === "setup") {
        const secret = authenticator.generateSecret();
        global.twoFASecrets = global.twoFASecrets || {};
        global.twoFASecrets[m.sender] = secret;
        
        const qrCode = await QRCode.toDataURL(authenticator.keyuri(m.sender, 'YourBot', secret));
        
        await bot.sendMessage(m.chat, {
            image: { url: qrCode },
            caption: "Scan this QR code with your 2FA app\n\n" +
                     "Or enter manually:\n" +
                     `Secret: ${secret}\n\n` +
                     "After setup, verify with: .2fa verify <code>"
        });
    } 
    else if (args[0] === "verify") {
        const code = args[1];
        if (!code) return m.reply("Please provide the 2FA code");
        
        const secret = global.twoFASecrets?.[m.sender];
        if (!secret) return m.reply("2FA not setup for your account");
        
        const verified = authenticator.verify({
            secret,
            token: code
        });
        
        if (verified) {
            global.twoFAVerified = global.twoFAVerified || [];
            global.twoFAVerified.push(m.sender);
            m.reply("2FA verification successful!");
        } else {
            m.reply("Invalid 2FA code");
        }
    }
    break;
}

// Check 2FA for sensitive commands
if (['backup', 'eval', 'broadcast'].includes(command) {
    if (!global.twoFAVerified?.includes(m.sender)) {
        return m.reply("This command requires 2FA verification. Use .2fa setup first");
    }
}

//========== SELF-HEALING SYSTEM ==========//
setInterval(() => {
    // Check memory usage
    if (process.memoryUsage().rss > 500 * 1024 * 1024) { // 500MB
        console.log("Memory usage high, restarting...");
        process.exit(1); // Let PM2 restart
    }
    
    // Check connection status
    if (!bot.connection || bot.connection === 'close') {
        console.log("Connection lost, reconnecting...");
        startSession(); // Reinitialize connection
    }
    
    // Clean up old data
    const now = Date.now();
    global.scheduledMessages = global.scheduledMessages?.filter(t => t._idleStart + t._idleTimeout > now);
    global.quizzes = global.quizzes && Object.fromEntries(
        Object.entries(global.quizzes).filter(([_, q]) => q.timestamp + 120000 > now)
    );
}, 300000); // Run every 5 minutes

//========== MULTI-BOT CLUSTERING ==========//
if (cluster.isPrimary && process.env.CLUSTER_MODE === "true") {
    // Fork workers
    const numCPUs = require('os').cpus().length;
    for (let i = 0; i < numCPUs; i++) {
        cluster.fork();
    }
    
    cluster.on('exit', (worker) => {
        console.log(`Worker ${worker.process.pid} died`);
        cluster.fork();
    });
} else {
    // Worker process
    startSession();
}

//========== FINAL ERROR HANDLER ==========//
} catch (e) {
    console.error('[CRITICAL ERROR]', e);
    
    // Automatic error reporting
    const errorReport = {
        timestamp: new Date().toISOString(),
        command: command || 'N/A',
        user: m?.sender || 'N/A',
        stack: e.stack || 'No stack trace',
        memory: process.memoryUsage()
    };
    
    // Save to error log
    fs.appendFileSync('./logs/errors.json', JSON.stringify(errorReport) + '\n');
    
    // Attempt recovery
    try {
        await bot.sendMessage(global.owner + '@s.whatsapp.net', {
            text: `🚨 *Critical Error* 🚨\n\n${e.message}\n\nSee logs for details`
        });
        
        if (m) {
            await bot.sendMessage(m.chat, {
                text: "An unexpected error occurred. Our team has been notified."
            });
        }
    } catch (recoveryError) {
        console.error("Recovery failed:", recoveryError);
    }
    
    // Restart if this is a worker process
    if (cluster.worker) process.exit(1);
}

// Auto-reload when file changes
let file = require.resolve(__filename);
fs.watchFile(file, () => {
    fs.unwatchFile(file);
    console.log(chalk.redBright(`[HOT RELOAD] Updated ${__filename}`));
    delete require.cache[file];
    require(file);
});