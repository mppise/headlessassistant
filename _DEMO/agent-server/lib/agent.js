// Collections agent — tool definitions and agentic loop.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { executeTool } from './mock-data.js';
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

export const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'get_customer_summary',
      description: "Returns a combined summary of the patient's account: open invoices, credit memos, total balance, overdue count, and contact details. Best first call for general balance inquiries.",
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_open_items',
      description: 'Retrieve open invoices and/or credit memos for the current patient.',
      parameters: {
        type: 'object',
        properties: {
          Scenario: {
            type: 'string',
            enum: ['D', 'I', 'C'],
            description: '"D" = invoices + credit memos (default). "I" = invoices only. "C" = credit memos only.',
          },
          minDate: { type: 'string', description: 'ISO date (YYYY-MM-DD) — earliest document date filter.' },
          maxDate: { type: 'string', description: 'ISO date (YYYY-MM-DD) — latest document date filter.' },
          $top:    { type: 'integer', description: 'Max records to return.' },
          $skip:   { type: 'integer', description: 'Records to skip (pagination).' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_customer_details',
      description: 'Retrieve full business partner details: address, email, phone, payment cards on file, bank accounts, and company billing information.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_paid_bills',
      description: "Retrieve the patient's payment history.",
      parameters: {
        type: 'object',
        properties: {
          status:   { type: 'string', enum: ['9', '2'], description: '"9" = cleared/paid (default). "2" = payment received but not yet cleared.' },
          fromDate: { type: 'string', description: 'ISO date (YYYY-MM-DD) — start of date range.' },
          toDate:   { type: 'string', description: 'ISO date (YYYY-MM-DD) — end of date range.' },
          $top:     { type: 'integer', description: 'Max records to return.' },
          $skip:    { type: 'integer', description: 'Records to skip (pagination).' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_payer_info',
      description: 'Retrieve payer (insurance or third-party biller) information for one or more ship-to customer numbers. If no customers are specified, returns payers for the current account.',
      parameters: {
        type: 'object',
        properties: {
          customers: {
            type: 'array',
            description: 'List of ship-to customer numbers to look up payers for. Omit to use the current account.',
            items: {
              type: 'object',
              properties: {
                Origin: { type: 'string', description: 'Origin system, e.g. "vantus".' },
                Customer: { type: 'string', description: 'Ship-to customer number.' },
              },
              required: ['Customer'],
            },
          },
        },
        required: [],
      },
    },
  },
];

const STATUS_MESSAGES = {
  get_customer_summary: 'Pulling together your account summary…',
  get_open_items:       'Retrieving your open invoices…',
  get_customer_details: 'Fetching your account details…',
  get_paid_bills:       'Looking up your payment history…',
  get_payer_info:       'Checking payer information…',
};

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
  send.status(STATUS_MESSAGES[fn.name] ?? 'Fetching your information…');
  let content;
  try {
    const result = await executeTool(fn.name, { ...eppDefaults(), ...args });
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
