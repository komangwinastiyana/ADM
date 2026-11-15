// api/generate.js — Vercel Serverless Function (Node.js)
// Kunci Gemini dibaca dari Environment Variable GEMINI_API_KEY, tidak pernah dikirim ke browser.
const API = 'https://generativelanguage.googleapis.com/v1beta/';
const MAX_PROMPT = 24000;
const LIMIT = 30;                 // maksimal permintaan per IP
const WINDOW = 10 * 60 * 1000;    // dalam 10 menit (pembatas sederhana, per instance server)
const hits = new Map();
let modelCache = { name: null, at: 0 };

const fail = (status, msg) => { const e = new Error(msg); e.status = status; return e; };
const sleep = ms => new Promise(r => setTimeout(r, ms));

function limited(ip) {
  const now = Date.now();
  const arr = (hits.get(ip) || []).filter(t => now - t < WINDOW);
  arr.push(now);
  hits.set(ip, arr);
  if (hits.size > 5000) hits.clear();
  return arr.length > LIMIT;
}

// Pilih model Gemini Flash stabil terbaru yang tersedia untuk kunci ini.
async function pickModel(key) {
  if (process.env.GEMINI_MODEL) return process.env.GEMINI_MODEL;
  if (modelCache.name && Date.now() - modelCache.at < 6 * 3600 * 1000) return modelCache.name;
  const r = await fetch(API + 'models?pageSize=200', { headers: { 'x-goog-api-key': key } });
  const j = await r.json().catch(() => ({}));
  if (r.status === 400 || r.status === 401 || r.status === 403) throw fail(502, 'Kunci API Gemini di server ditolak. Periksa GEMINI_API_KEY.');
  if (r.status === 429) throw fail(429, 'Kuota Gemini sedang penuh. Tunggu beberapa menit lalu coba lagi.');
  if (!r.ok) throw fail(502, 'Tidak bisa mengambil daftar model Gemini (kode ' + r.status + ').');
  const semua = (j.models || [])
    .filter(m => (m.supportedGenerationMethods || []).includes('generateContent'))
    .map(m => String(m.name || '').replace(/^models\//, ''));
  const teks = semua.filter(n => /^gemini-/.test(n) && !/(image|tts|live|audio|embedding|vision|robotics|computer|learnlm)/i.test(n));
  const versi = n => { const v = n.match(/gemini-(\d+(?:\.\d+)?)/); return v ? parseFloat(v[1]) : 0; };
  const urut = a => a.slice().sort((x, y) => versi(y) - versi(x) || x.length - y.length);
  const stabil = teks.filter(n => !/(preview|exp|latest)/i.test(n));
  const flash = stabil.filter(n => /flash/i.test(n));
  const pilihan = urut(flash.filter(n => !/lite/i.test(n)))[0] || urut(flash)[0] || urut(stabil)[0] || urut(teks)[0];
  if (!pilihan) throw fail(502, 'Tidak ada model Gemini yang bisa dipakai untuk kunci ini.');
  modelCache = { name: pilihan, at: Date.now() };
  return pilihan;
}

async function generate(key, prompt) {
  for (let attempt = 0; attempt < 2; attempt++) {
    const model = await pickModel(key);
    const r = await fetch(API + 'models/' + model + ':generateContent', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0.4, maxOutputTokens: 16000 }
      })
    });
    const j = await r.json().catch(() => ({}));
    const m = (j.error && j.error.message) || '';
    if (r.status === 404 && attempt === 0) { modelCache.name = null; continue; }
    if (r.status === 503 && attempt === 0) { await sleep(1500); continue; }
    if (r.status === 401 || r.status === 403 || (r.status === 400 && /api key/i.test(m))) throw fail(502, 'Kunci API Gemini di server ditolak. Periksa GEMINI_API_KEY.');
    if (r.status === 400) throw fail(502, 'Permintaan ke Gemini ditolak: ' + m.slice(0, 150));
    if (r.status === 429) throw fail(429, 'Kuota Gemini sedang penuh. Tunggu beberapa menit lalu coba lagi.');
    if (!r.ok) throw fail(502, 'Layanan Gemini sedang bermasalah (kode ' + r.status + '). Coba lagi.');
    const parts = ((((j.candidates || [])[0] || {}).content || {}).parts) || [];
    const text = parts.map(x => x.text || '').join('');
    const i1 = text.indexOf('{'), i2 = text.lastIndexOf('}');
    if (i1 < 0 || i2 < i1) throw fail(502, 'Hasil AI tidak terbaca. Coba klik sekali lagi.');
    try { return JSON.parse(text.slice(i1, i2 + 1)); }
    catch (e) { throw fail(502, 'Hasil AI terpotong atau tidak valid. Coba klik sekali lagi.'); }
  }
  throw fail(502, 'Gagal menghubungi Gemini. Coba lagi.');
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Metode tidak diizinkan.' });
  const key = process.env.GEMINI_API_KEY;
  if (!key) return res.status(500).json({ error: 'GEMINI_API_KEY belum diatur di server. Tambahkan di Environment Variables hosting, lalu deploy ulang.' });
  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  const prompt = body && typeof body.prompt === 'string' ? body.prompt : '';
  if (!prompt.trim()) return res.status(400).json({ error: 'Permintaan kosong.' });
  if (prompt.length > MAX_PROMPT) return res.status(413).json({ error: 'Permintaan terlalu panjang.' });
  const ip = (String(req.headers['x-forwarded-for'] || '').split(',')[0].trim()) || (req.socket && req.socket.remoteAddress) || 'x';
  if (limited(ip)) return res.status(429).json({ error: 'Terlalu banyak permintaan. Tunggu beberapa menit lalu coba lagi.' });
  try {
    const data = await generate(key, prompt);
    return res.status(200).json({ data });
  } catch (e) {
    return res.status(e.status || 502).json({ error: e.message || 'Terjadi kesalahan di server.' });
  }
};