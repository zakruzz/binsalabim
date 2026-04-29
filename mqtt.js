const mqtt = require('mqtt');
const supabase = require('./supabase');
const bot = require('./bot');
require('dotenv').config();

const client = mqtt.connect(process.env.MQTT_BROKER);

client.on('connect', () => {
  console.log("MQTT Connected");
  client.subscribe('bins/+/status');
});

client.on('message', async (topic, message) => {
  try {
    const data = JSON.parse(message.toString());
    const { device_id, status } = data;

    console.log("MQTT:", data);

    // simpan status
    await supabase.from('device_status').upsert({
      device_id,
      status
    });

    // ambil location_id
    const { data: device } = await supabase
      .from('devices')
      .select('location_id')
      .eq('device_id', device_id)
      .single();

    if (!device) return;

    // ambil subscriber
    const { data: users } = await supabase
      .from('subscriptions')
      .select('*')
      .or(`target_id.eq.${device_id},target_id.eq.${device.location_id}`);

    // kirim notif
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