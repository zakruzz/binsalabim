const TelegramBot = require('node-telegram-bot-api');
const supabase = require('./supabase');
require('dotenv').config();

const bot = new TelegramBot(process.env.TELEGRAM_TOKEN, {
  polling: true
});

// reset webhook (biar bersih)
bot.deleteWebHook();

module.exports = bot;

//
// START
//
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;

  await supabase.from('users').upsert({
    chat_id: chatId
  });

  bot.sendMessage(chatId, `
👋 BinSalabim Bot Aktif!

Gunakan:
/subscribe BIN_001
/subscribe Gedung_A
/help
`);
});

//
// HELP
//
bot.onText(/\/help/, (msg) => {
  bot.sendMessage(msg.chat.id, `
📖 Commands:

/subscribe <id>
/unsubscribe <id>
/list
/mute <id>
/unmute <id>
/status <device_id>

🔐 Rename:
/rename BIN_001 TOKEN NamaBaru
`);
});

//
// SUBSCRIBE
//
bot.onText(/\/subscribe (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const input = match[1];

  // cek device
  const { data: device } = await supabase
    .from('devices')
    .select('*')
    .eq('device_id', input)
    .single();

  if (device) {
    await supabase.from('subscriptions').insert({
      chat_id: chatId,
      target_type: 'DEVICE',
      target_id: input
    });

    return bot.sendMessage(chatId, `✅ Subscribe ke device ${input}`);
  }

  // cek location
  const { data: location } = await supabase
    .from('locations')
    .select('*')
    .eq('name', input)
    .single();

  if (location) {
    await supabase.from('subscriptions').insert({
      chat_id: chatId,
      target_type: 'LOCATION',
      target_id: location.id.toString()
    });

    return bot.sendMessage(chatId, `✅ Subscribe ke lokasi ${input}`);
  }

  bot.sendMessage(chatId, "❌ Device/Lokasi tidak ditemukan");
});

//
// UNSUBSCRIBE
//
bot.onText(/\/unsubscribe (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const input = match[1];

  await supabase
    .from('subscriptions')
    .delete()
    .eq('chat_id', chatId)
    .eq('target_id', input);

  bot.sendMessage(chatId, `❌ Unsubscribe dari ${input}`);
});

//
// LIST
//
bot.onText(/\/list/, async (msg) => {
  const chatId = msg.chat.id;

  const { data } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('chat_id', chatId);

  if (!data || data.length === 0) {
    return bot.sendMessage(chatId, "Belum ada subscription");
  }

  let text = "📦 Subscription kamu:\n";

  for (let sub of data) {
    if (sub.target_type === "LOCATION") {
      const { data: loc } = await supabase
        .from('locations')
        .select('name')
        .eq('id', sub.target_id)
        .single();

      text += `- ${loc?.name || sub.target_id} (LOCATION) ${sub.is_muted ? '🔕' : '🔔'}\n`;
    } else {
      text += `- ${sub.target_id} (DEVICE) ${sub.is_muted ? '🔕' : '🔔'}\n`;
    }
  }

  bot.sendMessage(chatId, text);
});

//
// MUTE
//
bot.onText(/\/mute (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const input = match[1];

  await supabase
    .from('subscriptions')
    .update({ is_muted: true })
    .eq('chat_id', chatId)
    .eq('target_id', input);

  bot.sendMessage(chatId, `🔕 ${input} di-mute`);
});

//
// UNMUTE
//
bot.onText(/\/unmute (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const input = match[1];

  await supabase
    .from('subscriptions')
    .update({ is_muted: false })
    .eq('chat_id', chatId)
    .eq('target_id', input);

  bot.sendMessage(chatId, `🔔 ${input} aktif`);
});

//
// STATUS
//
bot.onText(/\/status (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const deviceId = match[1];

  const { data } = await supabase
    .from('device_status')
    .select('*')
    .eq('device_id', deviceId)
    .single();

  if (!data) {
    return bot.sendMessage(chatId, "❌ Device tidak ditemukan");
  }

  bot.sendMessage(chatId, `
📊 ${deviceId}
Status: ${data.status}
`);
});

//
// RENAME (SECURE WITH TOKEN)
//
bot.onText(/\/rename (.+) (.+) (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const deviceId = match[1];
  const token = match[2];
  const newName = match[3];

  const { data: device } = await supabase
    .from('devices')
    .select('*')
    .eq('device_id', deviceId)
    .single();

  if (!device) {
    return bot.sendMessage(chatId, "❌ Device tidak ditemukan");
  }

  if (device.owner_token !== token) {
    return bot.sendMessage(chatId, "❌ Token salah");
  }

  await supabase
    .from('devices')
    .update({ name: newName })
    .eq('device_id', deviceId);

  bot.sendMessage(chatId, `✏️ ${deviceId} jadi "${newName}"`);
});