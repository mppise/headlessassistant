// Serves the widget bundle — the only asset the agent server exposes publicly.

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const widgetRouter = express.Router();

widgetRouter.get('/headless-assistant.js', (req, res) =>
  res.sendFile(path.join(__dirname, '..', 'lib', 'headless-assistant.js')));
