const TelegramBot = require('node-telegram-bot-api');
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
    const menu = `🤖 <b>Asentum Remote Controller (Docker/Maxlayer Edition)</b>\n\n` +
                 `/start_node - Menyalakan Node Asentum (Direct Exec)\n` +
                 `/set_wallet &lt;alamat_wallet&gt; - Ikat Alamat Dompet Kripto\n` +
                 `/status     - Cek Status Node Asli\n` +
                 `/stop_bot   - Mematikan Bot Jarak Jauh`;
    bot.sendMessage(msg.chat.id, menu, { parse_mode: 'HTML' });
});

// PERBAIKAN TOTAL: Menjalankan installer dan langsung memicu biner di latar belakang tanpa systemd
bot.onText(/\/start_node/, (msg) => {
    if (!isOwner(msg)) return;
    bot.sendMessage(msg.chat.id, '⏳ Mendownload paket dan memicu biner node Asentum di latar belakang Maxlayer...');
    
    // 1. Buat folder manual. 2. Jalankan download installer resmi.
    exec('mkdir -p /opt/asentum/data && mkdir -p /opt/asentum/chain && curl -fsSL https://asentum.com | bash', (err) => {
        // Abaikan eror systemd, kita paksa jalankan biner pembungkusnya langsung
        setTimeout(() => {
            exec('/opt/asentum/chain/asentum-validator start --validator > /app/node.log 2>&1 &', (binErr) => {
                if (binErr) {
                    bot.sendMessage(msg.chat.id, `❌ Gagal memicu biner langsung: ${binErr.message}`);
                }
            });
        }, 5000); // Jeda 5 detik memberi waktu ekstra bagi ekstraksi komponen
    });
    
    bot.sendMessage(msg.chat.id, '✅ Perintah eksekusi langsung dipicu! Mohon tunggu 3 menit agar sinkronisasi awal selesai, lalu gunakan /set_wallet.');
});

bot.onText(/\/set_wallet([\s\S]+)/, (msg, match) => {
    if (!isOwner(msg)) return;
    const userWallet = match.trim();
    
    if (!userWallet || userWallet.includes('<alamat_wallet>')) {
        bot.sendMessage(msg.chat.id, '❌ Format salah. Tulis seperti ini:\n<code>/set_wallet ase184mtgn...</code>', { parse_mode: 'HTML' });
        return;
    }

    const targetDir = '/opt/asentum/data';
    const targetFile = path.join(targetDir, 'validator-key.json');

    try {
        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
        }
        const keyStructure = { address: userWallet, status: "Incentivized Node Active" };
        fs.writeFileSync(targetFile, JSON.stringify(keyStructure, null, 2), 'utf8');
        bot.sendMessage(msg.chat.id, `✅ <b>Alamat Dompet Berhasil Diikat!</b>\n\nAlamat terikat:\n<code>${userWallet}</code>`, { parse_mode: 'HTML' });
    } catch (err) {
        bot.sendMessage(msg.chat.id, `❌ Gagal menulis berkas konfigurasi dompet: ${err.message}`);
    }
});

bot.onText(/\/status/, (msg) => {
    if (!isOwner(msg)) return;
    
    // Memeriksa biner proses 'asentum-validator' secara independen dari systemd
    exec('ps aux | grep -v grep | grep -v "node index.js" | grep -e asentum -e validator', (err, stdout) => {
        let isRunning = stdout.trim().length > 0;
        
        if (isRunning) {
            let responseMsg = `🟢 <b>Node Aktif!</b>\n\n`;
            const keyPath = '/opt/asentum/data/validator-key.json';
            let addressFound = "Belum diatur. Gunakan perintah /set_wallet [alamat_anda]";
            
            if (fs.existsSync(keyPath)) {
                try {
                    const keyData = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
                    addressFound = keyData.address || "Format terikat";
                } catch (e) {
                    addressFound = "Gagal memproses berkas JSON identitas.";
                }
            }
            responseMsg += `📌 <b>Wallet Penerima Poin:</b>\n<code>${addressFound}</code>\n\n💡 <i>Info Dokumen: Butuh waktu ~2 jam (1 epoch jaringan) agar node Anda masuk ke dalam set komite aktif di explorer!</i>`;
            bot.sendMessage(msg.chat.id, responseMsg, { parse_mode: 'HTML' });
        } else {
            bot.sendMessage(msg.chat.id, '🔴 <b>Node Mati / Tidak Terdeteksi di Latar Belakang Maxlayer.</b>\nSilakan ketik /start_node untuk mencoba memicu kembali.', { parse_mode: 'HTML' });
        }
    });
});

bot.onText(/\/stop_bot/, async (msg) => {
    if (!isOwner(msg)) return;
    await bot.sendMessage(msg.chat.id, '🛑 Menghentikan proses biner dan mematikan bot...');
    exec('pkill -f asentum && pkill -f validator', () => {
        bot.stopPolling().then(() => { process.exit(0); });
    });
});

console.log('[+] Bot Edisi Kontainer Maxlayer Tanpa Systemd Aktif...');
