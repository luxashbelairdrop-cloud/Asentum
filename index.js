const {TelegramBot} = require('node-telegram-bot-api');
const { exec } = require('child_process');

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
    const menu = `🤖 <b>Asentum Termux Controller Ready</b>\n\n` +
                 `/start_node - Jalankan Node yang Sudah Ada\n` +
                 `/status     - Cek Status Node\n` +
                 `/stop_bot   - Matikan Bot & Node`;
    bot.sendMessage(msg.chat.id, menu, { parse_mode: 'HTML' });
});

// MEMICU BINER ASENTUM YANG SUDAH TERINSTAL
bot.onText(/\/start_node/, (msg) => {
    if (!isOwner(msg)) return;
    bot.sendMessage(msg.chat.id, '⏳ Menyalakan biner node Asentum di latar belakang...');
    
    // Perintah langsung menjalankan aplikasi asentum yang sudah ada tanpa install ulang
    exec('asentum-node start --validator > node.log 2>&1 &', (err) => {
        if (err) {
            bot.sendMessage(msg.chat.id, `❌ Gagal: ${err.message}`);
            return;
        }
    });
    bot.sendMessage(msg.chat.id, '✅ Node dijalankan! Silakan cek /status beberapa saat lagi.');
});

bot.onText(/\/status/, (msg) => {
    if (!isOwner(msg)) return;
    exec('ps aux | grep -e asentum -e validator | grep -v grep', (err, stdout) => {
        if (stdout.trim()) {
            bot.sendMessage(msg.chat.id, `🟢 <b>Node Aktif!</b>\n\n<code>${stdout}</code>`, { parse_mode: 'HTML' });
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

console.log('[+] Bot Telegram Teroptimasi Aktif...');
