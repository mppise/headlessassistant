// [CHG-002] MCP server (stdio transport).
// Reads tool-registry.json, converts each schema.json to Zod, registers all tools,
// and dispatches to each handler.js execute(). Never imported — spawned as a child process.

import fs   from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { McpServer }           from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { convertJsonSchemaToZod } from 'zod-from-json-schema';
import { warn, err } from './logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT      = path.join(__dirname, '..');

const registry = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'tools', 'tool-registry.json'), 'utf8'),
);

const server = new McpServer({ name: 'agent-tools', version: '1.0.0' });

for (const entry of registry) {
  const schema     = JSON.parse(fs.readFileSync(path.join(ROOT, entry.schema), 'utf8'));
  const zodSchema  = convertJsonSchemaToZod(schema.function.parameters);
  const { execute } = await import(path.join(ROOT, entry.handler));

  server.tool(
    entry.name,
    schema.function.description,
    zodSchema.shape ?? {},
    async ({ _context = {}, ...args }) => {
      const start = Date.now();
      try {
        const result = await execute(args, _context);
        warn('[mcp-server]', `${entry.name}  ${Date.now() - start}ms`);
        return { content: [{ type: 'text', text: JSON.stringify(result) }] };
      } catch (e) {
        err('[mcp-server]', `${entry.name}  ${Date.now() - start}ms  ERROR: ${e.message}`);
        return {
          content: [{ type: 'text', text: JSON.stringify({ error: `Tool ${entry.name} failed — please try again.` }) }],
          isError: true,
        };
      }
    },
  );
}

const transport = new StdioServerTransport();
await server.connect(transport);
