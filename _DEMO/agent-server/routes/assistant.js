// POST /ask-assistant — collections agent with tool calling.
//
// SSE event types emitted:
//   data: {"status":"..."}   during tool execution
//   data: {"message":"..."}  final answer chunks
//   data: [DONE]

import express from 'express';
import { getAccessToken, callAiCore } from '../lib/ai-core.js';
import { TOOLS, buildMessages, handleToolCalls } from '../lib/agent.js';

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
  const { message, history = [] } = req.body;
  if (!message || typeof message !== 'string' || !message.trim())
    return res.status(400).json({ error: 'message is required' });

  res.setHeader('Content-Type',  'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection',    'keep-alive');
  res.flushHeaders();

  const send = makeSenders(res);

  try {
    const token    = await getAccessToken();
    const messages = buildMessages(history, message);

    // Turn 1 — non-streaming with tools; detect whether the model wants to call one
    const turn1  = await callAiCore(token, { messages, stream: false, tools: TOOLS, tool_choice: 'auto' });
    const choice = turn1.choices?.[0];

    if (choice?.finish_reason === 'tool_calls') {
      await handleToolCalls(token, messages, choice, send);
    } else {
      send.chunk(choice?.message?.content ?? '');
    }

    send.done();
    res.end();
  } catch (err) {
    console.error('[/ask-assistant]', err);
    send.error('An unexpected error occurred. Please try again.');
    res.end();
  }
});
