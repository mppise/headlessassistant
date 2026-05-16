import { fileURLToPath } from 'url';
import path from 'path';
import express from 'express';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.static(__dirname));

app.listen(PORT, () => {
  console.warn(`Payment portal  →  http://localhost:${PORT}`);
  console.warn(`  GET  /               index.html`);
  console.warn(`  GET  /headless-assistant.config.json`);
});
