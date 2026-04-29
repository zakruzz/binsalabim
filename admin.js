const express = require('express');
const supabase = require('./supabase');
const app = express();

app.use(express.json());
app.use(require('cors')());

// ===============================
// 🔐 LOGIN
// ===============================
app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  const { data: user } = await supabase
    .from('admin_users')
    .select('*')
    .eq('username', username)
    .eq('password', password)
    .single();

  if (!user) {
    return res.status(401).json({ error: "Login gagal" });
  }

  res.json({ token: "ADMIN123" }); // simple token
});

// ===============================
// 🔐 AUTH MIDDLEWARE
// ===============================
app.use((req, res, next) => {
  if (req.path === '/login') return next();

  if (req.headers['x-auth'] !== "ADMIN123") {
    return res.status(403).send("Unauthorized");
  }

  next();
});

// ===============================
// ➕ TAMBAH LOCATION
// ===============================
app.post('/location', async (req, res) => {
  const { name } = req.body;

  const { data, error } = await supabase
    .from('locations')
    .insert({ name })
    .select();

  if (error) return res.status(400).json(error);

  res.json(data);
});

// ===============================
// ➕ TAMBAH DEVICE
// ===============================
app.post('/device', async (req, res) => {
  const { device_id, name, location_id } = req.body;

  const { data, error } = await supabase
    .from('devices')
    .insert({ device_id, name, location_id })
    .select();

  if (error) return res.status(400).json(error);

  res.json(data);
});

// ===============================
// 📋 GET DEVICES
// ===============================
app.get('/devices', async (req, res) => {
  const { data } = await supabase
    .from('devices')
    .select('*');

  res.json(data);
});

// ===============================
// 🌐 SERVE HTML
// ===============================
const path = require('path');
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

// ===============================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("🌐 Admin API running on port", PORT);
});