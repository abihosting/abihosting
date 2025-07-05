const fs = require('fs');
const path = require('path');
const os = require('os');
const cheerio = require('cheerio');
const axios = require('axios');
const { spawn } = require('child_process');
const FormData = require('form-data');
const chalk = require('chalk');

// Set FFmpeg path
try {
    const ffmpegPath = require('ffmpeg-static');
    process.env.FFMPEG_PATH = ffmpegPath;
} catch (error) {
    console.error(chalk.red('Error setting FFmpeg path:'), error);
    process.exit(1);
}

// Ensure media directory exists
const mediaDir = path.join(__dirname, '../media');
if (!fs.existsSync(mediaDir)) {
    fs.mkdirSync(mediaDir, { recursive: true });
}

/**
 * FFmpeg wrapper for media conversion
 * @param {Buffer} buffer Input media buffer
 * @param {Array} args FFmpeg arguments
 * @param {String} inputExt Input file extension
 * @param {String} outputExt Output file extension
 * @returns {Promise<Buffer>} Converted media buffer
 */
function ffmpeg(buffer, args = [], inputExt = '', outputExt = '') {
    return new Promise(async (resolve, reject) => {
        try {
            const tempId = Date.now();
            const inputFile = path.join(mediaDir, `${tempId}.${inputExt}`);
            const outputFile = path.join(mediaDir, `${tempId}.${outputExt}`);

            await fs.promises.writeFile(inputFile, buffer);

            const ffmpegProcess = spawn(process.env.FFMPEG_PATH, [
                '-y',
                '-i', inputFile,
                ...args,
                outputFile
            ], {
                stdio: 'ignore'
            });

            ffmpegProcess.on('error', (err) => {
                cleanupFiles([inputFile, outputFile]);
                reject(new Error(`FFmpeg error: ${err.message}`));
            });

            ffmpegProcess.on('close', async (code) => {
                try {
                    if (code !== 0) {
                        cleanupFiles([inputFile, outputFile]);
                        return reject(new Error(`FFmpeg process exited with code ${code}`));
                    }

                    const result = await fs.promises.readFile(outputFile);
                    cleanupFiles([inputFile, outputFile]);
                    resolve(result);
                } catch (err) {
                    cleanupFiles([inputFile, outputFile]);
                    reject(err);
                }
            });
        } catch (err) {
            reject(err);
        }
    });
}

/**
 * Convert audio to WhatsApp playable format (MP3)
 * @param {Buffer} buffer Audio buffer
 * @param {String} ext Input file extension
 * @returns {Promise<Buffer>} Converted MP3 buffer
 */
function toAudio(buffer, ext) {
    return ffmpeg(buffer, [
        '-vn',              // No video
        '-ac', '2',        // 2 audio channels
        '-b:a', '128k',    // 128k bitrate
        '-ar', '44100',    // 44.1kHz sample rate
        '-f', 'mp3'        // MP3 format
    ], ext, 'mp3');
}

/**
 * Convert audio to WhatsApp PTT format (Opus)
 * @param {Buffer} buffer Audio buffer
 * @param {String} ext Input file extension
 * @returns {Promise<Buffer>} Converted Opus buffer
 */
function toPTT(buffer, ext) {
    return ffmpeg(buffer, [
        '-vn',                  // No video
        '-c:a', 'libopus',      // Opus codec
        '-b:a', '128k',         // 128k bitrate
        '-vbr', 'on',           // Variable bitrate
        '-compression_level', '10', // Max compression
        '-f', 'opus'            // Opus format
    ], ext, 'opus');
}

/**
 * Convert video to WhatsApp optimized format (MP4)
 * @param {String|Buffer} input File path or buffer
 * @returns {Promise<Object>} Conversion result
 */
async function toVideo(input) {
    try {
        let inputPath;
        let isTempFile = false;

        // Handle Buffer input
        if (Buffer.isBuffer(input)) {
            const tempId = Date.now();
            inputPath = path.join(mediaDir, `${tempId}.webp`);
            await fs.promises.writeFile(inputPath, input);
            isTempFile = true;
        } else if (typeof input === 'string') {
            inputPath = input;
        } else {
            throw new Error('Input must be either a Buffer or file path');
        }

        const form = new FormData();
        form.append('new-image-url', '');
        form.append('new-image', fs.createReadStream(inputPath));

        // First request to upload the file
        const uploadResponse = await axios({
            method: 'post',
            url: 'https://s6.ezgif.com/webp-to-mp4',
            data: form,
            headers: {
                ...form.getHeaders(),
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            },
            maxContentLength: Infinity,
            maxBodyLength: Infinity
        });

        const $ = cheerio.load(uploadResponse.data);
        const fileToken = $('input[name="file"]').attr('value');
        if (!fileToken) {
            throw new Error('Failed to get file token from upload response');
        }

        const convertForm = new FormData();
        convertForm.append('file', fileToken);
        convertForm.append('convert', 'Convert WebP to MP4!');

        // Second request to process conversion
        const convertResponse = await axios({
            method: 'post',
            url: `https://ezgif.com/webp-to-mp4/${fileToken}`,
            data: convertForm,
            headers: {
                ...convertForm.getHeaders(),
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            },
            maxContentLength: Infinity,
            maxBodyLength: Infinity
        });

        const resultPage = cheerio.load(convertResponse.data);
        const videoSrc = resultPage('div#output > p.outfile > video > source').attr('src');
        
        if (!videoSrc) {
            throw new Error('Failed to get converted video URL');
        }

        const resultUrl = 'https:' + videoSrc;

        // Clean up temp file if we created one
        if (isTempFile) {
            cleanupFiles([inputPath]);
        }

        return {
            status: true,
            message: "Conversion successful",
            result: resultUrl
        };
    } catch (error) {
        console.error(chalk.red('Error in toVideo:'), error);
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

module.exports = {
    ffmpeg,
    toAudio,
    toPTT,
    toVideo,
    cleanupFiles
};

// Example usage:
// const { toAudio } = require('./converter');
// const fs = require('fs');
// 
// async function test() {
//     const audioBuffer = fs.readFileSync('input.mp3');
//     const whatsappAudio = await toAudio(audioBuffer, 'mp3');
//     fs.writeFileSync('output.mp3', whatsappAudio);
// }
// 
// test().catch(console.error);

const { toAudio, toVideo } = require('./converter');
const fs = require('fs');

// Contoh konversi audio
async function convertAudio() {
    try {
        const input = fs.readFileSync('input.ogg');
        const output = await toAudio(input, 'ogg');
        fs.writeFileSync('output.mp3', output);
        console.log('Audio converted successfully!');
    } catch (error) {
        console.error('Conversion failed:', error);
    }
}

// Contoh konversi video
async function convertVideo() {
    try {
        const input = fs.readFileSync('animation.webp');
        const { result } = await toVideo(input);
        console.log('Video converted:', result);
    } catch (error) {
        console.error('Conversion failed:', error);
    }
}

convertAudio();
convertVideo();