const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = Number(process.env.PORT || 8080);
const ROOT = path.resolve(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT, 'public');
const DATA_FILE = path.resolve(ROOT, process.env.DATA_FILE || './data/foods.json');
const UPLOAD_DIR = path.join(PUBLIC_DIR, 'uploads', 'foods');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin1234';
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const sessions = new Set();

function readJson() {
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}
function writeJson(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}
function send(res, status, body, headers = {}) {
  const data = typeof body === 'string' ? body : JSON.stringify(body);
  res.writeHead(status, { 'Content-Type': typeof body === 'string' ? 'text/plain; charset=utf-8' : 'application/json; charset=utf-8', ...headers });
  res.end(data);
}
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', c => { body += c; if (body.length > 3_000_000) reject(new Error('Body too large')); });
    req.on('end', () => {
      if (!body) return resolve({});
      try { resolve(JSON.parse(body)); } catch (e) { reject(e); }
    });
  });
}
function readRawBody(req, maxBytes = 8_000_000) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;
    req.on('data', c => {
      total += c.length;
      if (total > maxBytes) { reject(new Error('Image is too large. Max 8MB.')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}
function safeSlug(value) {
  return String(value || 'food').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'food';
}
function parseMultipartImage(buffer, contentType) {
  const boundaryMatch = /boundary=(?:(?:\")([^\"]+)(?:\")|([^;]+))/i.exec(contentType || '');
  if (!boundaryMatch) throw new Error('Invalid multipart form data.');
  const boundary = Buffer.from('--' + (boundaryMatch[1] || boundaryMatch[2]));
  const parts = [];
  let start = buffer.indexOf(boundary);
  while (start !== -1) {
    const next = buffer.indexOf(boundary, start + boundary.length);
    if (next === -1) break;
    const part = buffer.slice(start + boundary.length + 2, next - 2);
    const split = part.indexOf(Buffer.from('\r\n\r\n'));
    if (split > -1) parts.push({ header: part.slice(0, split).toString('utf8'), body: part.slice(split + 4) });
    start = next;
  }
  const filePart = parts.find(p => /name="image"/i.test(p.header) && /filename="/i.test(p.header));
  if (!filePart) throw new Error('No image file uploaded.');
  const filename = /filename="([^"]*)"/i.exec(filePart.header)?.[1] || 'image';
  const mime = /Content-Type:\s*([^\r\n]+)/i.exec(filePart.header)?.[1]?.trim().toLowerCase() || '';
  const extMap = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif', 'image/svg+xml': '.svg' };
  const ext = extMap[mime] || path.extname(filename).toLowerCase();
  if (!['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg'].includes(ext)) throw new Error('Only jpg, png, webp, gif, svg images are allowed.');
  const slugPart = parts.find(p => /name="slug"/i.test(p.header));
  const slug = safeSlug(slugPart ? slugPart.body.toString('utf8').trim() : path.basename(filename, ext));
  return { slug, ext: ext === '.jpeg' ? '.jpg' : ext, data: filePart.body };
}
function token() {
  const raw = crypto.randomBytes(24).toString('hex');
  const sig = crypto.createHmac('sha256', JWT_SECRET).update(raw).digest('hex').slice(0, 24);
  return `${raw}.${sig}`;
}
function isAuthed(req) {
  const auth = req.headers.authorization || '';
  const t = auth.replace('Bearer ', '');
  return sessions.has(t);
}
function contentType(file) {
  const ext = path.extname(file).toLowerCase();
  return ({'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'application/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.gif':'image/gif','.webmanifest':'application/manifest+json; charset=utf-8'})[ext] || 'application/octet-stream';
}
function serveStatic(req, res) {
  const clean = decodeURIComponent(req.url.split('?')[0]);
  let file = clean === '/' ? '/index.html' : clean;
  const abs = path.normalize(path.join(PUBLIC_DIR, file));
  if (!abs.startsWith(PUBLIC_DIR)) return send(res, 403, 'Forbidden');
  fs.readFile(abs, (err, data) => {
    if (err) {
      const fallback = path.join(PUBLIC_DIR, 'index.html');
      if (!clean.startsWith('/api/') && fs.existsSync(fallback)) {
        res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8'});
        return res.end(fs.readFileSync(fallback));
      }
      return send(res, 404, 'Not found');
    }
    res.writeHead(200, {'Content-Type': contentType(abs), 'Cache-Control': abs.endsWith('index.html') ? 'no-store' : 'public, max-age=3600'});
    res.end(data);
  });
}
function normalizeFood(input, existing = {}) {
  const now = new Date().toISOString();
  return {
    id: input.id || existing.id || crypto.randomUUID(),
    categoryId: input.categoryId || existing.categoryId || 'meal',
    image: input.image || existing.image || '',
    nameVi: input.nameVi || existing.nameVi || '',
    nameEn: input.nameEn || existing.nameEn || '',
    nameKo: input.nameKo || existing.nameKo || '',
    pronunciationKo: input.pronunciationKo || existing.pronunciationKo || '',
    shortIntro: input.shortIntro || existing.shortIntro || '',
    ingredients: input.ingredients || existing.ingredients || '',
    howToEat: input.howToEat || existing.howToEat || '',
    priceMin: Number(input.priceMin ?? existing.priceMin ?? 0),
    priceMax: Number(input.priceMax ?? existing.priceMax ?? 0),
    currency: input.currency || existing.currency || 'VND',
    spicyLevel: Number(input.spicyLevel ?? existing.spicyLevel ?? 0),
    hasCilantro: Boolean(input.hasCilantro ?? existing.hasCilantro ?? false),
    dietTags: Array.isArray(input.dietTags) ? input.dietTags : (existing.dietTags || []),
    region: input.region || existing.region || '',
    orderPhraseVi: input.orderPhraseVi || existing.orderPhraseVi || '',
    orderPhraseKo: input.orderPhraseKo || existing.orderPhraseKo || '',
    keywords: Array.isArray(input.keywords) ? input.keywords : String(input.keywords || existing.keywords || '').split(',').map(s => s.trim()).filter(Boolean),
    restaurants: Array.isArray(input.restaurants) ? input.restaurants : (existing.restaurants || []),
    featured: Boolean(input.featured ?? existing.featured ?? false),
    published: Boolean(input.published ?? existing.published ?? true),
    updatedAt: now,
    createdAt: existing.createdAt || now
  };
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    if (url.pathname === '/api/health') return send(res, 200, { ok: true, time: new Date().toISOString() });
    if (url.pathname === '/api/data' && req.method === 'GET') {
      const data = readJson();
      const q = (url.searchParams.get('q') || '').trim().toLowerCase();
      const category = url.searchParams.get('category');
      const foods = data.foods.filter(f => f.published !== false).filter(f => !category || f.categoryId === category).filter(f => {
        if (!q) return true;
        return [f.nameVi, f.nameEn, f.nameKo, f.pronunciationKo, f.shortIntro, ...(f.keywords || [])].join(' ').toLowerCase().includes(q);
      });
      return send(res, 200, { categories: data.categories, foods });
    }
    if (url.pathname === '/api/admin/login' && req.method === 'POST') {
      const body = await parseBody(req);
      if (body.password !== ADMIN_PASSWORD) return send(res, 401, { error: 'Invalid password' });
      const t = token(); sessions.add(t);
      return send(res, 200, { token: t });
    }
    if (url.pathname === '/api/admin/data' && req.method === 'GET') {
      if (!isAuthed(req)) return send(res, 401, { error: 'Unauthorized' });
      return send(res, 200, readJson());
    }
    if (url.pathname === '/api/admin/food' && req.method === 'POST') {
      if (!isAuthed(req)) return send(res, 401, { error: 'Unauthorized' });
      const body = await parseBody(req);
      const data = readJson();
      const index = data.foods.findIndex(f => f.id === body.id);
      if (index >= 0) data.foods[index] = normalizeFood(body, data.foods[index]);
      else data.foods.unshift(normalizeFood(body));
      writeJson(data);
      return send(res, 200, { ok: true, food: index >= 0 ? data.foods[index] : data.foods[0] });
    }

    if (url.pathname === '/api/admin/upload-image' && req.method === 'POST') {
      if (!isAuthed(req)) return send(res, 401, { error: 'Unauthorized' });
      const raw = await readRawBody(req);
      const image = parseMultipartImage(raw, req.headers['content-type']);
      const filename = `${image.slug}-${Date.now()}${image.ext}`;
      const abs = path.join(UPLOAD_DIR, filename);
      fs.writeFileSync(abs, image.data);
      return send(res, 200, { ok: true, image: `/uploads/foods/${filename}` });
    }
    if (url.pathname.startsWith('/api/admin/food/') && req.method === 'DELETE') {
      if (!isAuthed(req)) return send(res, 401, { error: 'Unauthorized' });
      const id = decodeURIComponent(url.pathname.split('/').pop());
      const data = readJson();
      data.foods = data.foods.filter(f => f.id !== id);
      writeJson(data);
      return send(res, 200, { ok: true });
    }
    return serveStatic(req, res);
  } catch (e) {
    return send(res, 500, { error: e.message });
  }
});

server.listen(PORT, () => console.log(`Vietnam Food Guide running at http://localhost:${PORT}`));
