// Collections agent — tool definitions and agentic loop.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { tools as TOOLS, callTool, getStatusMessage } from './mcp-client.js'; // [CHG-002]
import { callAiCore, streamResponse } from './ai-core.js';
import { log, err } from './logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const SYSTEM_PROMPT = fs.readFileSync(path.join(__dirname, 'system-prompt.txt'), 'utf8');

export function buildMessages(history, userMessage) {
  return [
    { role: 'system', content: SYSTEM_PROMPT },
    ...history.map(({ role, content }) => ({ role, content: String(content) })),
    { role: 'user', content: userMessage.trim() },
  ];
}

async function runToolCall(toolCall, send, context) {
  const { id, function: fn } = toolCall;
  const args = JSON.parse(fn.arguments || '{}');
  const statusMsg = getStatusMessage(fn.name);
  send.status(statusMsg);
  const start = Date.now();
  log('[mcp]', `→ ${fn.name}  "${statusMsg}"  args=${fn.arguments}`);
  let content;
  try {
    const result = await callTool(fn.name, args, context);
    log('[mcp]', `← ${fn.name}  ${Date.now() - start}ms  result=${result.slice(0, 120)}${result.length > 120 ? '…' : ''}`);
    content = JSON.stringify(result);
  } catch (e) {
    err('[mcp]', `← ${fn.name}  ${Date.now() - start}ms  ERROR: ${e.message}`);
    content = JSON.stringify({ error: `Tool ${fn.name} failed — please try again.` });
  }
  return { role: 'tool', tool_call_id: id, content };
}

export async function handleToolCalls(token, messages, choice, send, context = {}) {
  const toolCalls = choice.message.tool_calls;
  messages.push({ role: 'assistant', content: null, tool_calls: toolCalls });
  const toolResults = await Promise.all(toolCalls.map((tc) => runToolCall(tc, send, context)));
  for (const result of toolResults) messages.push(result);
  const t2start = Date.now();
  log('[ai-core]', `turn-2  streaming...`);
  const turn2Res = await callAiCore(token, { messages, stream: true });
  const chars = await streamResponse(turn2Res, send);
  log('[ai-core]', `turn-2  ${Date.now() - t2start}ms  chars=${chars}`);
}
