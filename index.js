const TelegramBot = require('node-telegram-bot-api');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// KONFIGURASI UTAMA
const TOKEN = '8885582629:AAHnpfXC9Oo2mp1qiQzYM5v4QKNctzThsf8';
const USER_ID_PRIBADI = 6769005722;

// SOLUSI UTAMA: Menggunakan inisialisasi yang didukung penuh oleh versi terbaru
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
    const menu = `🤖 <b>Asentum Remote Controller (Fix System)</b>\n\n` +
                 `/start_node - Menyalakan Node Asentum\n` +
                 `/set_wallet &lt;alamat_wallet&gt; - Ikat Alamat Dompet Kripto\n` +
                 `/status     - Cek Status Node Asli\n` +
                 `/stop_bot   - Mematikan Bot Jarak Jauh`;
    bot.sendMessage(msg.chat.id, menu, { parse_mode: 'HTML' });
});

bot.onText(/\/start_node/, (msg) => {
    if (!isOwner(msg)) return;
    bot.sendMessage(msg.chat.id, '⏳ Memulai unduhan dan instalasi node Asentum di server...');
    exec('curl -fsSL https://asentum.com | bash', (err) => {
        if (err) {
            bot.sendMessage(msg.chat.id, `❌ Gagal memicu installer: ${err.message}`);
            return;
        }
    });
    bot.sendMessage(msg.chat.id, '✅ Installer Asentum dipicu di latar belakang server! Harap tunggu 2-3 menit lalu gunakan perintah /set_wallet.');
});

bot.onText(/\/set_wallet (.+)/, (msg, match) => {
    if (!isOwner(msg)) return;
    const userWallet = match.trim();
    const targetDir = '/opt/asentum/data';
    const targetFile = path.join(targetDir, 'validator-key.json');

    bot.sendMessage(msg.chat.id, '⏳ Menyinkronkan alamat dompet Anda ke sistem...');
    try {
        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
        }
        const keyStructure = { address: userWallet, status: "Incentivized Node Active" };
        fs.writeFileSync(targetFile, JSON.stringify(keyStructure, null, 2), 'utf8');
        bot.sendMessage(msg.chat.id, `✅ <b>Alamat Dompet Berhasil Diikat!</b>\n\nAlamat: <code>${userWallet}</code>`, { parse_mode: 'HTML' });
    } catch (err) {
        bot.sendMessage(msg.chat.id, `❌ Gagal mengonfigurasi wallet: ${err.message}`);
    }
});

bot.onText(/\/status/, (msg) => {
    if (!isOwner(msg)) return;
    exec('systemctl is-active asentum-validator || ps aux | grep -v grep | grep -v "node index.js" | grep -e asentum -e validator', (err, stdout) => {
        const checkString = stdout.toLowerCase();
        let isRunning = checkString.includes('active') || (stdout.trim().length > 0 && !checkString.includes('index.js'));
        
        if (isRunning) {
            let responseMsg = `🟢 <b>Node Aktif!</b>\n\n`;
            const keyPath = '/opt/asentum/data/validator-key.json';
            let addressFound = "Belum diatur. Gunakan perintah /set_wallet [alamat_anda]";
            if (fs.existsSync(keyPath)) {
                try {
                    const keyData = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
                    addressFound = keyData.address || "Format terikat";
                } catch (e) {
                    addressFound = "Gagal memproses berkas.";
                }
            }
            responseMsg += `📌 <b>Wallet Penerima Poin:</b>\n<code>${addressFound}</code>\n\nPoin otomatis masuk jika node memproses blok!`;
            bot.sendMessage(msg.chat.id, responseMsg, { parse_mode: 'HTML' });
        } else {
            bot.sendMessage(msg.chat.id, '🔴 <b>Node Mati / Tidak Terdeteksi.</b>\nSilakan ketik /start_node untuk menghidupkan kembali.');
        }
    });
});

bot.onText(/\/stop_bot/, async (msg) => {
    if (!isOwner(msg)) return;
    await bot.sendMessage(msg.chat.id, '🛑 Menghentikan proses dan mematikan bot...');
    exec('systemctl stop asentum-validator || pkill -f asentum', () => {
        bot.stopPolling().then(() => { process.exit(0); });
    });
});

console.log('[+] Bot Anti-TypeError Kompatibel Aktif...');
