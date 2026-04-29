const mqtt = require('mqtt');
const supabase = require('./supabase');
const bot = require('./bot');

// =====================
// MQTT CONFIG (HiveMQ Cloud)
// =====================
const client = mqtt.connect({
  host: "0f7a2910eda148649b0f321f7752d0cf.s1.eu.hivemq.cloud",
  port: 8883,
  protocol: "mqtts",
  username: "BinSalabim",
  password: "BinSalabim1",
  rejectUnauthorized: false // 🔥 penting biar TLS gak error
});

// =====================
// CONNECT
// =====================
client.on('connect', () => {
  console.log("✅ MQTT Connected (Cloud)");
  client.subscribe('bins/+/status');
});

// =====================
// MESSAGE HANDLER
// =====================
client.on('message', async (topic, message) => {
  try {
    const data = JSON.parse(message.toString());
    const { device_id, status } = data;

    console.log("📩 MQTT:", data);

    // =====================
    // SAVE STATUS
    // =====================
    await supabase.from('device_status').upsert({
      device_id,
      status
    });

    // =====================
    // GET DEVICE INFO
    // =====================
    const { data: device } = await supabase
      .from('devices')
      .select('location_id')
      .eq('device_id', device_id)
      .single();

    if (!device) return;

    // =====================
    // GET SUBSCRIBERS
    // =====================
    const { data: users } = await supabase
      .from('subscriptions')
      .select('*')
      .or(`target_id.eq.${device_id},target_id.eq.${device.location_id}`);

    // =====================
    // SEND NOTIF
    // =====================
    if (status === "FULL") {
      users.forEach(user => {
        if (!user.is_muted) {
          bot.sendMessage(user.chat_id, `⚠️ ${device_id} penuh!`);
        }
      });
    }

  } catch (err) {
    console.error(err);
  }
});