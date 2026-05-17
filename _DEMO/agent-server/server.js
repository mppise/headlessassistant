import { config as dotenvConfig } from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import express from 'express';
import { assistantRouter } from './routes/assistant.js';
import { widgetRouter }    from './routes/widget.js';
import { warn } from './lib/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenvConfig({ path: path.join(__dirname, '.env') });

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Allow the payment portal (different origin) to load the widget and call the API
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.use(widgetRouter);
app.use(assistantRouter);

app.listen(PORT, () => {
  warn('[server]', `Agent server  →  http://localhost:${PORT}`);
  warn('[server]', `  GET  /headless-assistant.js   widget bundle`);
  warn('[server]', `  POST /ask-assistant            collections agent`);
});
