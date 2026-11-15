// Fungsi server (Vercel). Kunci API dibaca dari environment variable, tidak pernah dikirim ke browser.
// Prompt disusun di sini supaya endpoint ini tidak bisa dipakai orang lain sebagai "Claude gratis".

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5';
const FASE = { A: ['I', 'II'], B: ['III', 'IV'], C: ['V', 'VI'], D: ['VII', 'VIII', 'IX'], E: ['X'], F: ['XI', 'XII'] };

function bersih(s, max) {
  return String(s || '').replace(/[\r\n"\\]/g, ' ').trim().slice(0, max);
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Metode tidak diizinkan.' });
    return;
  }
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    res.status(500).json({ error: 'Kunci API belum dipasang di server.' });
    return;
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (e) { body = {}; }
  }
  body = body || {};

  // Kode akses opsional untuk membatasi pemakai (dan biaya).
  const kode = process.env.KODE_AKSES;
  if (kode && String(body.kode || '') !== kode) {
    res.status(401).json({ error: 'Kode akses salah.' });
    return;
  }

  const mapel = bersih(body.mapel, 80);
  const fase = String(body.fase || '');
  const kelas = String(body.kelas || '');
  const tahun = bersih(body.tahun, 12);
  if (!mapel || !FASE[fase] || !FASE[fase].includes(kelas)) {
    res.status(400).json({ error: 'Mata pelajaran, fase, atau kelas tidak valid.' });
    return;
  }

  const prompt =
    'Buatkan Alur Tujuan Pembelajaran (ATP) Kurikulum Merdeka untuk mata pelajaran "' + mapel + '", Fase ' + fase +
    ', Kelas ' + kelas + ', tahun ajaran ' + tahun + '. ' +
    'Ikuti Capaian Pembelajaran resmi dari Kemendikdasmen/BSKAP untuk mata pelajaran dan fase tersebut. ' +
    'Susun 5 sampai 8 bab/materi pokok yang berurutan dan terbagi ke Semester 1 dan Semester 2. ' +
    'Tiap bab punya 3 sampai 5 tujuan pembelajaran (TP) berawalan kata kerja operasional, diberi nomor sesuai bab (misalnya 1.1, 1.2). ' +
    'Alokasi JP tiap bab realistis untuk satu tahun ajaran. Kolom elemen diisi elemen/strand mata pelajaran tersebut. Gunakan bahasa Indonesia. ' +
    'Balas HANYA dengan JSON tanpa teks lain, dengan bentuk: ' +
    '{"cp":"paragraf capaian pembelajaran fase","rows":[{"sem":"1","el":"nama elemen","bab":"Bab 1: judul","jp":"18","tp":["1.1 ...","1.2 ..."]}]}. ' +
    'Nilai sem hanya "1" atau "2"; jp hanya angka.';

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 6000,
        messages: [{ role: 'user', content: prompt }]
      })
    });
    const data = await r.json();
    if (!r.ok) {
      res.status(502).json({ error: 'Layanan AI menolak permintaan.', detail: data && data.error && data.error.message });
      return;
    }
    const text = (data.content || []).map(function (b) { return b.text || ''; }).join('');
    const a = text.indexOf('{');
    const b = text.lastIndexOf('}');
    if (a < 0 || b < a) throw new Error('format');
    const hasil = JSON.parse(text.slice(a, b + 1));
    if (typeof hasil.cp !== 'string' || !Array.isArray(hasil.rows) || !hasil.rows.length) throw new Error('format');
    res.status(200).json(hasil);
  } catch (e) {
    res.status(502).json({ error: 'Gagal menyusun ATP. Coba lagi.' });
  }
};
