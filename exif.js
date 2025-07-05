const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const ffmpeg = require('fluent-ffmpeg');
const webp = require('node-webpmux');
const chalk = require('chalk');

// Validasi dependensi
try {
    ffmpeg.setFfmpegPath(require('ffmpeg-static'));
} catch (error) {
    console.error(chalk.red('Error setting ffmpeg path:'), error);
    process.exit(1);
}

/**
 * Convert image to WebP format
 * @param {Buffer} media Image buffer
 * @returns {Promise<Buffer>} WebP buffer
 */
async function imageToWebp(media) {
    const tmpFileOut = path.join(os.tmpdir(), `${crypto.randomBytes(6).readUIntLE(0, 6).toString(36)}.webp`);
    const tmpFileIn = path.join(os.tmpdir(), `${crypto.randomBytes(6).readUIntLE(0, 6).toString(36)}.jpg`);
    
    try {
        fs.writeFileSync(tmpFileIn, media);
        
        await new Promise((resolve, reject) => {
            ffmpeg(tmpFileIn)
                .on('error', reject)
                .on('end', () => resolve(true))
                .addOutputOptions([
                    '-vcodec', 'libwebp',
                    '-vf', `scale='min(320,iw)':min'(320,ih)':force_original_aspect_ratio=decrease,fps=15, pad=320:320:-1:-1:color=white@0.0, split [a][b]; [a] palettegen=reserve_transparent=on:transparency_color=ffffff [p]; [b][p] paletteuse`
                ])
                .toFormat('webp')
                .save(tmpFileOut);
        });

        const buff = fs.readFileSync(tmpFileOut);
        return buff;
    } catch (error) {
        console.error(chalk.red('Error in imageToWebp:'), error);
        throw error;
    } finally {
        cleanupFiles([tmpFileIn, tmpFileOut]);
    }
}

/**
 * Convert video to WebP format
 * @param {Buffer} media Video buffer
 * @returns {Promise<Buffer>} WebP buffer
 */
async function videoToWebp(media) {
    const tmpFileOut = path.join(os.tmpdir(), `${crypto.randomBytes(6).readUIntLE(0, 6).toString(36)}.webp`);
    const tmpFileIn = path.join(os.tmpdir(), `${crypto.randomBytes(6).readUIntLE(0, 6).toString(36)}.mp4`);
    
    try {
        fs.writeFileSync(tmpFileIn, media);
        
        await new Promise((resolve, reject) => {
            ffmpeg(tmpFileIn)
                .on('error', reject)
                .on('end', () => resolve(true))
                .addOutputOptions([
                    '-vcodec', 'libwebp',
                    '-vf', `scale='min(320,iw)':min'(320,ih)':force_original_aspect_ratio=decrease,fps=15, pad=320:320:-1:-1:color=white@0.0, split [a][b]; [a] palettegen=reserve_transparent=on:transparency_color=ffffff [p]; [b][p] paletteuse`,
                    '-loop', '0',
                    '-ss', '00:00:00',
                    '-t', '00:00:05',
                    '-preset', 'default',
                    '-an',
                    '-vsync', '0'
                ])
                .toFormat('webp')
                .save(tmpFileOut);
        });

        const buff = fs.readFileSync(tmpFileOut);
        return buff;
    } catch (error) {
        console.error(chalk.red('Error in videoToWebp:'), error);
        throw error;
    } finally {
        cleanupFiles([tmpFileIn, tmpFileOut]);
    }
}

/**
 * Add EXIF metadata to image WebP
 * @param {Buffer} media Image buffer
 * @param {Object} metadata Sticker metadata
 * @param {String} metadata.packname Sticker pack name
 * @param {String} metadata.author Sticker author
 * @param {Array} [metadata.categories] Sticker categories
 * @returns {Promise<String>} Path to output file
 */
async function writeExifImg(media, metadata) {
    const tmpFileIn = path.join(os.tmpdir(), `${crypto.randomBytes(6).readUIntLE(0, 6).toString(36)}.webp`);
    const tmpFileOut = path.join(os.tmpdir(), `${crypto.randomBytes(6).readUIntLE(0, 6).toString(36)}.webp`);
    
    try {
        const wMedia = await imageToWebp(media);
        fs.writeFileSync(tmpFileIn, wMedia);

        if (metadata.packname || metadata.author) {
            const img = new webp.Image();
            const json = {
                "sticker-pack-name": metadata.packname || "",
                "sticker-pack-publisher": metadata.author || "",
                "emojis": metadata.categories || [""]
            };

            const exifAttr = Buffer.from([
                0x49, 0x49, 0x2A, 0x00, 0x08, 0x00, 0x00, 0x00, 
                0x01, 0x00, 0x41, 0x57, 0x07, 0x00, 0x00, 0x00, 
                0x00, 0x00, 0x16, 0x00, 0x00, 0x00
            ]);
            
            const jsonBuff = Buffer.from(JSON.stringify(json), "utf-8");
            const exif = Buffer.concat([exifAttr, jsonBuff]);
            exif.writeUIntLE(jsonBuff.length, 14, 4);

            await img.load(tmpFileIn);
            img.exif = exif;
            await img.save(tmpFileOut);

            return tmpFileOut;
        }
        return tmpFileIn;
    } catch (error) {
        console.error(chalk.red('Error in writeExifImg:'), error);
        throw error;
    } finally {
        cleanupFiles([tmpFileIn]);
    }
}

/**
 * Add EXIF metadata to video WebP
 * @param {Buffer} media Video buffer
 * @param {Object} metadata Sticker metadata
 * @param {String} metadata.packname Sticker pack name
 * @param {String} metadata.author Sticker author
 * @param {Array} [metadata.categories] Sticker categories
 * @returns {Promise<String>} Path to output file
 */
async function writeExifVid(media, metadata) {
    const tmpFileIn = path.join(os.tmpdir(), `${crypto.randomBytes(6).readUIntLE(0, 6).toString(36)}.webp`);
    const tmpFileOut = path.join(os.tmpdir(), `${crypto.randomBytes(6).readUIntLE(0, 6).toString(36)}.webp`);
    
    try {
        const wMedia = await videoToWebp(media);
        fs.writeFileSync(tmpFileIn, wMedia);

        if (metadata.packname || metadata.author) {
            const img = new webp.Image();
            const json = {
                "sticker-pack-name": metadata.packname || "",
                "sticker-pack-publisher": metadata.author || "",
                "emojis": metadata.categories || [""]
            };

            const exifAttr = Buffer.from([
                0x49, 0x49, 0x2A, 0x00, 0x08, 0x00, 0x00, 0x00, 
                0x01, 0x00, 0x41, 0x57, 0x07, 0x00, 0x00, 0x00, 
                0x00, 0x00, 0x16, 0x00, 0x00, 0x00
            ]);
            
            const jsonBuff = Buffer.from(JSON.stringify(json), "utf-8");
            const exif = Buffer.concat([exifAttr, jsonBuff]);
            exif.writeUIntLE(jsonBuff.length, 14, 4);

            await img.load(tmpFileIn);
            img.exif = exif;
            await img.save(tmpFileOut);

            return tmpFileOut;
        }
        return tmpFileIn;
    } catch (error) {
        console.error(chalk.red('Error in writeExifVid:'), error);
        throw error;
    } finally {
        cleanupFiles([tmpFileIn]);
    }
}

/**
 * Universal EXIF metadata writer for both image and video
 * @param {Object} media Media object
 * @param {Buffer} media.data Media buffer
 * @param {String} media.mimetype Media mimetype
 * @param {Object} metadata Sticker metadata
 * @returns {Promise<String>} Path to output file
 */
async function writeExif(media, metadata) {
    try {
        let wMedia;
        if (/webp/.test(media.mimetype)) {
            wMedia = media.data;
        } else if (/image/.test(media.mimetype)) {
            wMedia = await imageToWebp(media.data);
        } else if (/video/.test(media.mimetype)) {
            wMedia = await videoToWebp(media.data);
        } else {
            throw new Error('Unsupported media type');
        }

        const tmpFileIn = path.join(os.tmpdir(), `${crypto.randomBytes(6).readUIntLE(0, 6).toString(36)}.webp`);
        const tmpFileOut = path.join(os.tmpdir(), `${crypto.randomBytes(6).readUIntLE(0, 6).toString(36)}.webp`);
        
        fs.writeFileSync(tmpFileIn, wMedia);

        if (metadata.packname || metadata.author) {
            const img = new webp.Image();
            const json = {
                "sticker-pack-name": metadata.packname || "",
                "sticker-pack-publisher": metadata.author || "",
                "emojis": metadata.categories || [""]
            };

            const exifAttr = Buffer.from([
                0x49, 0x49, 0x2A, 0x00, 0x08, 0x00, 0x00, 0x00, 
                0x01, 0x00, 0x41, 0x57, 0x07, 0x00, 0x00, 0x00, 
                0x00, 0x00, 0x16, 0x00, 0x00, 0x00
            ]);
            
            const jsonBuff = Buffer.from(JSON.stringify(json), "utf-8");
            const exif = Buffer.concat([exifAttr, jsonBuff]);
            exif.writeUIntLE(jsonBuff.length, 14, 4);

            await img.load(tmpFileIn);
            img.exif = exif;
            await img.save(tmpFileOut);

            cleanupFiles([tmpFileIn]);
            return tmpFileOut;
        }
        return tmpFileIn;
    } catch (error) {
        console.error(chalk.red('Error in writeExif:'), error);
        throw error;
    }
}

/**
 * Clean up temporary files
 * @param {Array<String>} files Array of file paths
 */
function cleanupFiles(files) {
    files.forEach(file => {
        if (fs.existsSync(file)) {
            try {
                fs.unlinkSync(file);
            } catch (err) {
                console.error(chalk.yellow(`Error deleting temp file ${file}:`), err);
            }
        }
    });
}

// Export functions
module.exports = {
    imageToWebp,
    videoToWebp,
    writeExifImg,
    writeExifVid,
    writeExif
};

// Hot reload
const currentFile = require.resolve(__filename);
fs.watchFile(currentFile, () => {
    fs.unwatchFile(currentFile);
    console.log(chalk.redBright(`Updated ${__filename}`));
    delete require.cache[currentFile];
    require(currentFile);
});

const { imageToWebp, writeExifImg } = require('./exif');

// Contoh penggunaan
async function createSticker(imageBuffer) {
    try {
        const stickerPath = await writeExifImg(imageBuffer, {
            packname: "My Sticker Pack",
            author: "My Name",
            categories: ["😊", "👍"]
        });
        
        const stickerBuffer = fs.readFileSync(stickerPath);
        return stickerBuffer;
    } catch (error) {
        console.error('Failed to create sticker:', error);
    }
}