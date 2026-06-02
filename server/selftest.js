const fs = require('fs');
const path = require('path');
const required = ['public/index.html','public/app.js','public/styles.css','server/server.js','data/foods.json','README.md'];
for (const file of required) {
  const abs = path.join(__dirname, '..', file);
  if (!fs.existsSync(abs)) throw new Error(`Missing ${file}`);
}
const data = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data/foods.json'), 'utf8'));
if (!Array.isArray(data.foods) || data.foods.length < 5) throw new Error('Not enough food data');
console.log('selftest ok');
