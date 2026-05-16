// [CHG-001] Infrastructure loader — reads tool-registry.json, imports all handlers,
// and exports TOOLS, executeTool(), and getStatusMessage() for lib/agent.js.

import fs   from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT      = path.join(__dirname, '..');

const registry = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'tools', 'tool-registry.json'), 'utf8'),
);

// Map<name, { execute, statusMessage }>
const _handlers = new Map();

// Build TOOLS array from schema.json files
export const TOOLS = registry.map((entry) => {
  const schema = JSON.parse(fs.readFileSync(path.join(ROOT, entry.schema), 'utf8'));
  if (schema.function?.name !== entry.name) {
    throw new Error(
      `[tool-loader] schema name mismatch: registry="${entry.name}" schema="${schema.function?.name}"`,
    );
  }
  return schema;
});

// Dynamically import all handlers (top-level await — Node ESM)
await Promise.all(
  registry.map(async (entry) => {
    const mod = await import(path.join(ROOT, entry.handler));
    if (typeof mod.execute !== 'function') {
      throw new Error(`[tool-loader] handler for "${entry.name}" must export execute()`);
    }
    _handlers.set(entry.name, { execute: mod.execute, statusMessage: entry.statusMessage });
  }),
);

export async function executeTool(name, args, context) {
  const handler = _handlers.get(name);
  if (!handler) throw new Error(`Unknown tool: ${name}`);
  return handler.execute(args, context);
}

export function getStatusMessage(name) {
  return _handlers.get(name)?.statusMessage ?? 'Fetching your information…';
}
