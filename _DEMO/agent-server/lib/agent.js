// Collections agent — tool definitions and agentic loop.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { TOOLS, executeTool, getStatusMessage } from './tool-loader.js'; // [CHG-001]
import { callAiCore, streamResponse } from './ai-core.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const SYSTEM_PROMPT = fs.readFileSync(path.join(__dirname, 'system-prompt.txt'), 'utf8');

// EPP demo context injected into every tool call — read lazily for the same reason as ai-core.js
function eppDefaults() {
  return {
    CompCode: process.env.EPP_COMP_CODE || '1000',
    CustNum:  process.env.EPP_CUST_NUM  || '0000123456',
  };
}

export function buildMessages(history, userMessage) {
  return [
    { role: 'system', content: SYSTEM_PROMPT },
    ...history.map(({ role, content }) => ({ role, content: String(content) })),
    { role: 'user', content: userMessage.trim() },
  ];
}

async function runToolCall(toolCall, send) {
  const { id, function: fn } = toolCall;
  const args = JSON.parse(fn.arguments || '{}');
  send.status(getStatusMessage(fn.name));
  let content;
  try {
    const result = await executeTool(fn.name, args, eppDefaults());
    content = JSON.stringify(result);
  } catch (err) {
    console.error(`[tool:${fn.name}]`, err);
    content = JSON.stringify({ error: `Tool ${fn.name} failed — please try again.` });
  }
  return { role: 'tool', tool_call_id: id, content };
}

export async function handleToolCalls(token, messages, choice, send) {
  const toolCalls = choice.message.tool_calls;
  messages.push({ role: 'assistant', content: null, tool_calls: toolCalls });
  const toolResults = await Promise.all(toolCalls.map((tc) => runToolCall(tc, send)));
  for (const result of toolResults) messages.push(result);
  const turn2Res = await callAiCore(token, { messages, stream: true });
  await streamResponse(turn2Res, send);
}
