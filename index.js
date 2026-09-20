const {TelegramBot} = require('node-telegram-bot-api');
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
    const menu = `🤖 <b>Asentum Remote Controller (Aman 100%)</b>\n\n` +
                 `/start_node - Menyalakan Node Asentum\n` +
                 `/set_wallet &lt;alamat_wallet&gt; - Atur Alamat Dompet Penerima Poin\n` +
                 `/status     - Cek Status Node & Akun\n` +
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
    bot.sendMessage(msg.chat.id, '✅ Perintah instalasi dipicu! Silakan atur alamat dompet Anda menggunakan perintah /set_wallet.');
});

// FITUR AMAN: HANYA MENGISI ALAMAT WALLET (TANPA PRIVATE KEY)
bot.onText(/\/set_wallet (.+)/, (msg, match) => {
    if (!isOwner(msg)) return;
    const userWallet = match.trim();
    const targetDir = '/opt/asentum/data';
    const targetFile = path.join(targetDir, 'validator-key.json');

    bot.sendMessage(msg.chat.id, '⏳ Menyinkronkan alamat dompet Anda ke konfigurasi node...');

    try {
        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
        }

        // Menyimpan alamat dompet Anda secara langsung agar dikenali oleh explorer jaringan
        const keyStructure = {
            address: userWallet,
            status: "Incentivized Node Active"
        };

        fs.writeFileSync(targetFile, JSON.stringify(keyStructure, null, 2), 'utf8');
        bot.sendMessage(msg.chat.id, `✅ <b>Alamat Dompet Berhasil Diikat!</b>\n\nAlamat: <code>${userWallet}</code>\nNode Anda sekarang melacak poin untuk dompet ini. Silakan cek /status.`, { parse_mode: 'HTML' });
    } catch (err) {
        bot.sendMessage(msg.chat.id, `❌ Gagal mengonfigurasi wallet: ${err.message}`);
    }
});

bot.onText(/\/status/, (msg) => {
    if (!isOwner(msg)) return;
    exec('systemctl is-active asentum-validator || ps aux | grep -e asentum -e validator | grep -v grep', (err, stdout) => {
        let isRunning = stdout.includes('active') || stdout.trim().length > 0;
        if (isRunning) {
            let responseMsg = `🟢 <b>Node Aktif!</b>\n\n`;
            const keyPath = '/opt/asentum/data/validator-key.json';
            let addressFound = "Belum diatur. Gunakan perintah /set_wallet [alamat_anda]";
            
            if (fs.existsSync(keyPath)) {
                try {
                    const keyData = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
                    addressFound = keyData.address || "Format tidak diketahui";
                } catch (e) {
                    addressFound = "Gagal memproses file konfigurasi.";
                }
            }
            responseMsg += `📌 <b>Wallet Penerima Poin:</b>\n<code>${addressFound}</code>\n\n<i>Poin otomatis bertambah di dasbor web Asentum Anda jika node memproses blok!</i>`;
            bot.sendMessage(msg.chat.id, responseMsg, { parse_mode: 'HTML' });
        } else {
            bot.sendMessage(msg.chat.id, '🔴 <b>Node Mati / Tidak Terdeteksi.</b>');
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

console.log('[+] Bot Teroptimasi (100% Aman Tanpa Private Key) Aktif...');
