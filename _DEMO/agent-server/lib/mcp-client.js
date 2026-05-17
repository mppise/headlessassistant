// [CHG-002] MCP client — spawns mcp-server.js via stdio, connects, and exposes
// tools, callTool(), and getStatusMessage() for agent.js and routes/assistant.js.

import fs   from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Client }               from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT      = path.join(__dirname, '..');

// Load status messages from registry at startup (no network call needed)
const registry = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'tools', 'tool-registry.json'), 'utf8'),
);
const _statusMessages = new Map(registry.map((e) => [e.name, e.statusMessage]));

const transport = new StdioClientTransport({
  command: 'node',
  args:    [path.join(__dirname, 'mcp-server.js')],
  env:     { ...process.env },
});

const _client = new Client({ name: 'agent-server', version: '1.0.0' });
await _client.connect(transport);

// Fetch tool list from MCP server and map to OpenAI-compatible shape
const { tools: _mcpTools } = await _client.listTools();

export const tools = _mcpTools.map(({ name, description, inputSchema }) => ({
  type: 'function',
  function: { name, description, parameters: inputSchema },
}));

export async function callTool(name, args, context = {}) {
  const res = await _client.callTool({ name, arguments: { ...args, _context: context } });
  return res.content[0]?.text ?? '{}';
}

export function getStatusMessage(name) {
  return _statusMessages.get(name) ?? 'Fetching your information…';
}
