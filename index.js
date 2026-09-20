const TelegramBot} = require('node-telegram-bot-api');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// KONFIGURASI UTAMA
const TOKEN = '8885582629:AAHnpfXC9Oo2mp1qiQzYM5v4QKNctzThsf8';
const USER_ID_PRIBADI = 6769005722;

const bot = new TelegramBot(TOKEN, { polling: true });

function isOwner(msg) {
    if (msg.from.id !== USER_ID_PRIBADI) {
        bot.sendMessage(msg.chat.id, '⛔ Akses ditolak!');
        return false;
    }
    return true;
}

bot.onText(/\/start/, (msg) => {
    if (!isOwner(msg)) return;
    const menu = `🤖 <b>Asentum Remote Controller Ready</b>\n\n` +
                 `/start_node - Menyalakan Node Asentum\n` +
                 `/status     - Cek Status & Copy Node Address\n` +
                 `/stop_bot   - Matikan Bot & Node`;
    bot.sendMessage(msg.chat.id, menu, { parse_mode: 'HTML' });
});

bot.onText(/\/start_node/, (msg) => {
    if (!isOwner(msg)) return;
    bot.sendMessage(msg.chat.id, '⏳ Menyalakan node Asentum di latar belakang...');
    
    exec('curl -fsSL https://asentum.com | bash', (err) => {
        if (err) {
            bot.sendMessage(msg.chat.id, `❌ Gagal: ${err.message}`);
            return;
        }
    });
    bot.sendMessage(msg.chat.id, '✅ Node dijalankan! Tunggu 1-2 menit lalu ketik /status untuk menyalin Node Address Anda.');
});

// FITUR BARU: OTOMATIS MENAMPILKAN NODE ADDRESS JIKA AKTIF
bot.onText(/\/status/, (msg) => {
    if (!isOwner(msg)) return;
    
    exec('ps aux | grep -e asentum -e validator | grep -v grep', (err, stdout) => {
        if (stdout.trim()) {
            let responseMsg = `🟢 <b>Node Aktif!</b>\n\nDetail proses:\n<code>${stdout}</code>\n\n`;
            
            // Mencari file data wallet Asentum (Biasanya disimpan di folder ~/.asentum/ atau direktori lokal node)
            // Kita akan mencoba membaca file address.txt atau config bawaan Asentum
            const searchPaths = [
                path.join(process.env.HOME || '/root', '.asentum', 'node_address.txt'),
                path.join(process.env.HOME || '/root', '.asentum', 'wallet.json'),
                'node.log' // Cadangan jika address tertulis di log
            ];
            
            let addressFound = "Belum terdeteksi. Pastikan Anda sudah menyelesaikan setup wallet via log kontainer.";
            
            for (let filePath of searchPaths) {
                if (fs.existsSync(filePath)) {
                    try {
                        const fileData = fs.readFileSync(filePath, 'utf8');
                        // Cari pola alamat dompet kripto Asentum (misal regex atau teks mentah jika file hanya berisi alamat)
                        if (fileData.trim()) {
                            addressFound = fileData.trim();
                            break;
                        }
                    } catch (e) {
                        // Gagal membaca satu file, lanjut ke file berikutnya
                    }
                }
            }
            
            responseMsg += `📌 <b>Node Address Anda (Klik untuk Salin):</b>\n<code>${addressFound}</code>\n\n<i>Salin alamat di atas lalu tempel ke Asentum Airdrop Dashboard!</i>`;
            bot.sendMessage(msg.chat.id, responseMsg, { parse_mode: 'HTML' });
            
        } else {
            bot.sendMessage(msg.chat.id, '🔴 <b>Node Mati / Tidak Terdeteksi.</b>');
        }
    });
});

bot.onText(/\/stop_bot/, async (msg) => {
    if (!isOwner(msg)) return;
    await bot.sendMessage(msg.chat.id, '🛑 Menghentikan proses dan mematikan bot...');
    exec('pkill -f asentum && pkill -f validator', () => {
        bot.stopPolling().then(() => { process.exit(0); });
    });
});

console.log('[+] Bot Telegram Teroptimasi (Node Address Reader) Aktif...');
