// POST /ask-assistant — collections agent with tool calling.
//
// SSE event types emitted:
//   data: {"status":"..."}   during tool execution
//   data: {"message":"..."}  final answer chunks
//   data: [DONE]

import express from 'express';
import { getAccessToken, callAiCore } from '../lib/ai-core.js';
import { tools as TOOLS } from '../lib/mcp-client.js'; // [CHG-002]
import { buildMessages, handleToolCalls } from '../lib/agent.js';
import { log, err } from '../lib/logger.js';

export const assistantRouter = express.Router();

function makeSenders(res) {
  return {
    chunk:  (text) => res.write(`data: ${JSON.stringify({ message: text })}\n\n`),
    status: (text) => res.write(`data: ${JSON.stringify({ status: text })}\n\n`),
    done:   ()     => res.write('data: [DONE]\n\n'),
    error:  (msg)  => {
      res.write(`data: ${JSON.stringify({ error: msg })}\n\n`);
      res.write('data: [DONE]\n\n');
    },
  };
}

assistantRouter.post('/ask-assistant', async (req, res) => {
  const { message, history = [], context = {} } = req.body;
  if (!message || typeof message !== 'string' || !message.trim())
    return res.status(400).json({ error: 'message is required' });

  const start = Date.now();
  log('[request]', `message="${message.slice(0, 80)}${message.length > 80 ? '…' : ''}"  history=${history.length} turns  context=${JSON.stringify(context)}`);

  res.setHeader('Content-Type',  'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection',    'keep-alive');
  res.flushHeaders();

  const send = makeSenders(res);

  try {
    const token    = await getAccessToken();
    const messages = buildMessages(history, message);

    const t1start = Date.now();
    const turn1   = await callAiCore(token, { messages, stream: false, tools: TOOLS, tool_choice: 'auto' });
    const choice  = turn1.choices?.[0];
    const usage   = turn1.usage;
    log('[ai-core]', `turn-1  ${Date.now() - t1start}ms  finish=${choice?.finish_reason}  tokens=${usage?.total_tokens ?? '?'}  (prompt=${usage?.prompt_tokens ?? '?'} + completion=${usage?.completion_tokens ?? '?'})`);

    if (choice?.finish_reason === 'tool_calls') {
      const toolNames = choice.message.tool_calls.map((tc) => tc.function.name).join(', ');
      log('[agent]', `tool_calls: ${toolNames}`);
      await handleToolCalls(token, messages, choice, send, context);
    } else {
      const content = choice?.message?.content ?? '';
      log('[agent]', `direct answer  chars=${content.length}`);
      send.chunk(content);
    }

    log('[done]', `total=${Date.now() - start}ms`);
    send.done();
    res.end();
  } catch (e) {
    err('[error]', e.message);
    send.error('An unexpected error occurred. Please try again.');
    res.end();
  }
});
