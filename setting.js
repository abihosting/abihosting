require("./all/module.js");

//========== Setting Owner ==========//
global.owner = "6281234567890,6289876543210";
global.namaowner = "YOUR_HOSTING";
global.namaowner2 = "YOUR_HOSTING";
//======== Setting Bot & Link ========//
global.namabot = "YOUR_PANEL";
global.namabot2 = "YOUR_PANEL";
global.version = "V1.0";
global.foother = "YOUR_PANEL";
global.packname = "Created By";
global.author = "YOUR_PANEL";
//========== Setting Foto ===========//
global.imgreply = "https://example.com/image.jpg";
global.imgmenu = fs.readFileSync("./media/Menu.jpg");
global.imgslide = "https://example.com/image.jpg";
global.imgpanel = fs.readFileSync("./media/Panel.jpg");
global.tampilanMenu = "v1";
global.simbol = "⬡";
//========== Setting Panel ==========//
global.egg = "1";
global.loc = "1";
global.domain = "https://yourdomain.com";
global.apikey = "your_ptla_api_key";
global.capikey = "your_ptlc_api_key";
//========== Setting Api ==========//
global.apimaulana = "YOUR_API_KEY";
//========= Setting Message =========//
global.msg = {
    "error": "Error occurred",
    "done": "Done ✅", 
    "wait": "⏳ Processing...", 
    "group": "This command is only for groups", 
    "private": "This command is only for private chat", 
    "admin": "This command is only for group admins", 
    "adminbot": "This command can only be used when bot is admin", 
    "owner": "This command is only for bot owner", 
    "developer": "This command is only for bot developers!"
};

let file = require.resolve(__filename);
fs.watchFile(file, () => {
    fs.unwatchFile(file);
    console.log(chalk.redBright(`Update ${__filename}`));
    delete require.cache[file];
    require(file);
});