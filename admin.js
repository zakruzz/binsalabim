const express = require('express');
const supabase = require('./supabase');
const path = require('path');

const app = express();

app.use(express.json());
app.use(require('cors')());

const PORT = process.env.PORT || 3000;
const ADMIN_KEY = "12345";

//
// 🌐 SERVE WEB ADMIN (TIDAK PERLU API KEY)
//
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

//
// 🔐 MIDDLEWARE API KEY (HANYA UNTUK API)
//
app.use((req, res, next) => {
  // skip halaman utama
  if (req.path === '/') return next();

  if (req.headers['x-api-key'] !== ADMIN_KEY) {
    return res.status(403).send("Forbidden");
  }
  next();
});

//
// ➕ TAMBAH DEVICE
//
app.post('/device', async (req, res) => {
  try {
    const { device_id, name, location_id } = req.body;

    const { data, error } = await supabase
      .from('devices')
      .insert({ device_id, name, location_id })
      .select();

    if (error) throw error;

    res.json(data);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

//
// 📋 GET DEVICES
//
app.get('/devices', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('devices')
      .select('device_id, name, owner_token, location_id');

    if (error) throw error;

    res.json(data);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

//
// 📍 TAMBAH LOCATION
//
app.post('/location', async (req, res) => {
  try {
    const { name } = req.body;

    const { data, error } = await supabase
      .from('locations')
      .insert({ name });

    if (error) throw error;

    res.json(data);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

//
// 🚀 RUN SERVER
//
app.listen(PORT, () => {
  console.log(`🌐 Server running on port ${PORT}`);
});