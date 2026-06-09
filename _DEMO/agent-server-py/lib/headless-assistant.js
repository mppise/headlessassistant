/**
 * HeadlessAssistant — Zero-dependency embeddable chat widget
 * Spec: ./SPECS/components/c01-headless-assistant/
 * License: Apache-2.0
 */
(function (global) {
  'use strict';

  // ─── 1. CONSTANTS ────────────────────────────────────────────────────────────

  const LS_HISTORY_KEY = 'ha_history';
  const LS_USER_KEY = 'ha_user_id';
  const LS_QUOTA_THRESHOLD = 2 * 1024 * 1024; // 2MB
  const MAX_MESSAGE_LENGTH = 4000;
  const MAX_TURNS_MIN = 1;
  const MAX_TURNS_MAX = 100;
  const TOAST_DURATION_MS = 8000;
  const STREAM_DONE_SENTINEL = '[DONE]';

  const DEFAULTS = {
    max_turns: 10,
    response_field: 'message',
    stream_mode: 'sse',
    theme: {
      primary_color: '#4F46E5',
      background_color: '#FFFFFF',
      font_family: 'system-ui, sans-serif',
      font_size: '14px',
      header_title: 'Assistant',
      placeholder_text: 'Type a message…',
      avatar_url: null,
      border_radius: '12px',
    },
  };

  const ALLOWED_TAGS = new Set([
    'p',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'ul',
    'ol',
    'li',
    'table',
    'thead',
    'tbody',
    'tr',
    'th',
    'td',
    'a',
    'strong',
    'em',
    'br',
    'div',
    'span',
  ]);

  const ALLOWED_ATTRS = {
    a: ['href'],
    th: ['colspan', 'rowspan'],
    td: ['colspan', 'rowspan'],
    div: ['class'],
    span: ['class'],
  };

  // ─── 2. ConfigLoader ─────────────────────────────────────────────────────────

  // [C01-F03] Validate and merge config with defaults
  function mergeDefaults(cfg) {
    const out = Object.assign({}, DEFAULTS, {
      ai_endpoint: cfg.ai_endpoint,
      bearer_token: cfg.bearer_token,
    });

    if (typeof cfg.max_turns === 'number') {
      out.max_turns = Math.min(MAX_TURNS_MAX, Math.max(MAX_TURNS_MIN, Math.round(cfg.max_turns)));
    }
    if (typeof cfg.customer_id === 'string' && cfg.customer_id.trim()) out.customer_id = cfg.customer_id.trim();
    if (typeof cfg.user_name === 'string' && cfg.user_name.trim()) out.user_name = cfg.user_name.trim();
    if (typeof cfg.response_field === 'string') out.response_field = cfg.response_field;
    out.stream_field = typeof cfg.stream_field === 'string' ? cfg.stream_field : out.response_field;
    if (typeof cfg.container === 'string') out.container = cfg.container;
    if (cfg.stream_mode === 'json' || cfg.stream_mode === 'sse') out.stream_mode = cfg.stream_mode;

    out.theme = Object.assign({}, DEFAULTS.theme, cfg.theme || {});
    return out;
  }

  function validateConfig(cfg) {
    if (!cfg.ai_endpoint || typeof cfg.ai_endpoint !== 'string')
      return 'Missing required field: ai_endpoint';
    if (!cfg.bearer_token || typeof cfg.bearer_token !== 'string')
      return 'Missing required field: bearer_token';
    return null;
  }

  // [C01-F01] Fetch config JSON from URL
  async function fetchConfig(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Config fetch failed: ' + res.status);
    return res.json();
  }

  // ─── 3. IdentityManager ──────────────────────────────────────────────────────

  // [C01-F04] Read or generate anonymous user UUID
  function getOrCreateUserId(configUser) {
    if (configUser) return configUser;
    let id = localStorage.getItem(LS_USER_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(LS_USER_KEY, id);
    }
    return id;
  }

  // ─── 4. HistoryManager ───────────────────────────────────────────────────────

  // [C01-F07] Read full history from localStorage
  function readHistory() {
    try {
      const raw = localStorage.getItem(LS_HISTORY_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  // [C01-F14] Append a turn; guard against quota overflow
  function appendHistory(turn) {
    const history = readHistory();
    history.push(turn);
    writeHistory(history);
  }

  function writeHistory(history) {
    const serialized = JSON.stringify(history);
    // Guard: if serialized size exceeds threshold, prune oldest 20%
    if (serialized.length > LS_QUOTA_THRESHOLD) {
      const pruneCount = Math.ceil(history.length * 0.2);
      return writeHistory(history.slice(pruneCount));
    }
    try {
      localStorage.setItem(LS_HISTORY_KEY, serialized);
    } catch (e) {
      if (e.name === 'QuotaExceededError' && history.length > 1) {
        const pruneCount = Math.ceil(history.length * 0.2);
        writeHistory(history.slice(pruneCount));
      } else {
        console.warn('[HeadlessAssistant] Could not write history to localStorage:', e.message);
      }
    }
  }

  // [C01-F13] Trim history to max_turns for API
  function trimHistory(history, maxTurns) {
    if (history.length <= maxTurns) return history;
    return history.slice(history.length - maxTurns);
  }

  // [C01-F15] Clear history and user ID
  function clearHistory() {
    localStorage.removeItem(LS_HISTORY_KEY);
    localStorage.removeItem(LS_USER_KEY);
  }

  // ─── 5. MarkdownRenderer ─────────────────────────────────────────────────────

  // [C01-F12] Convert markdown to HTML (headings, paragraphs, tables, lists, bold, italic, links, cards)
  function renderMarkdown(text) {
    if (!text) return '';
    let html = text;

    // Cards: ```card ... ``` fences — key: value lines become labeled rows
    html = html.replace(/```card\s*\n([\s\S]*?)```/g, (_, body) => {
      const rows = body.trim().split('\n').filter(l => l.trim());
      let card = '<div class="ha-card">';
      rows.forEach((line) => {
        const colon = line.indexOf(':');
        if (colon === -1) {
          card += '<div class="ha-card-row"><span class="ha-card-value">' + renderInline(line.trim()) + '</span></div>';
        } else {
          const key = line.slice(0, colon).trim();
          const val = line.slice(colon + 1).trim();
          card += '<div class="ha-card-row"><span class="ha-card-label">' + escapeHtml(key) + '</span><span class="ha-card-value">' + renderInline(val) + '</span></div>';
        }
      });
      card += '</div>';
      return card;
    });

    // Process block elements in order: tables → headings → lists → paragraphs → inline

    // Tables: detect blocks with pipe characters
    html = html.replace(
      /^(\|.+\|)\n(\|[-| :]+\|)\n((?:\|.+\|\n?)*)/gm,
      (match, header, sep, body) => {
        const headerCells = parseTableRow(header);
        const bodyCells = body.trim().split('\n').map(parseTableRow);
        let t = '<table><thead><tr>';
        headerCells.forEach((c) => {
          t += '<th>' + renderInline(c) + '</th>';
        });
        t += '</tr></thead><tbody>';
        bodyCells.forEach((row) => {
          t += '<tr>';
          row.forEach((c) => {
            t += '<td>' + renderInline(c) + '</td>';
          });
          t += '</tr>';
        });
        t += '</tbody></table>';
        return t;
      },
    );

    // Headings
    html = html.replace(/^#{6}\s+(.+)$/gm, (_, t) => '<h6>' + renderInline(t) + '</h6>');
    html = html.replace(/^#{5}\s+(.+)$/gm, (_, t) => '<h5>' + renderInline(t) + '</h5>');
    html = html.replace(/^#{4}\s+(.+)$/gm, (_, t) => '<h4>' + renderInline(t) + '</h4>');
    html = html.replace(/^#{3}\s+(.+)$/gm, (_, t) => '<h3>' + renderInline(t) + '</h3>');
    html = html.replace(/^#{2}\s+(.+)$/gm, (_, t) => '<h2>' + renderInline(t) + '</h2>');
    html = html.replace(/^#{1}\s+(.+)$/gm, (_, t) => '<h1>' + renderInline(t) + '</h1>');

    // Unordered lists — group consecutive lines starting with - or *
    html = html.replace(/(^[-*]\s+.+$(\n[-*]\s+.+$)*)/gm, (block) => {
      const items = block
        .split('\n')
        .filter((l) => l.trim())
        .map((l) => {
          return '<li>' + renderInline(l.replace(/^[-*]\s+/, '')) + '</li>';
        });
      return '<ul>' + items.join('') + '</ul>';
    });

    // Ordered lists — group consecutive lines starting with number.
    html = html.replace(/(^\d+\.\s+.+$(\n\d+\.\s+.+$)*)/gm, (block) => {
      const items = block
        .split('\n')
        .filter((l) => l.trim())
        .map((l) => {
          return '<li>' + renderInline(l.replace(/^\d+\.\s+/, '')) + '</li>';
        });
      return '<ol>' + items.join('') + '</ol>';
    });

    // Paragraphs: double newline separated blocks not already tagged
    const blocks = html.split(/\n{2,}/);
    html = blocks
      .map((block) => {
        block = block.trim();
        if (!block) return '';
        if (/^<(h[1-6]|ul|ol|table|li|tr|th|td|div)/.test(block)) return block;
        return '<p>' + renderInline(block.replace(/\n/g, ' ')) + '</p>';
      })
      .join('');

    return html;
  }

  function parseTableRow(row) {
    return row
      .split('|')
      .slice(1, -1)
      .map((c) => c.trim());
  }

  function renderInline(text) {
    // Bold
    text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    // Italic
    text = text.replace(/\*(.+?)\*/g, '<em>$1</em>');
    text = text.replace(/_(.+?)_/g, '<em>$1</em>');
    // Links — [text](url)
    text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, url) => {
      const safe = sanitizeHref(url);
      if (!safe) return escapeHtml(label);
      return (
        '<a href="' +
        safe +
        '" target="_blank" rel="noopener noreferrer">' +
        escapeHtml(label) +
        '</a>'
      );
    });
    return text;
  }

  function sanitizeHref(url) {
    const trimmed = url.trim().toLowerCase();
    if (trimmed.startsWith('javascript:') || trimmed.startsWith('data:')) return null;
    return url.trim();
  }

  function escapeHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // ─── 6. XSSSanitizer ─────────────────────────────────────────────────────────

  // [C01-F13] Allowlist-based HTML sanitizer
  function sanitizeHtml(html) {
    const parser = new DOMParser();
    const doc = parser.parseFromString('<body>' + html + '</body>', 'text/html');
    sanitizeNode(doc.body);
    return doc.body.innerHTML;
  }

  function sanitizeNode(node) {
    const children = Array.from(node.childNodes);
    children.forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) return;
      if (child.nodeType !== Node.ELEMENT_NODE) {
        node.removeChild(child);
        return;
      }
      const tag = child.tagName.toLowerCase();
      if (!ALLOWED_TAGS.has(tag)) {
        // Replace disallowed element with its text content only
        const text = document.createTextNode(child.textContent);
        node.replaceChild(text, child);
        return;
      }
      // Strip disallowed attributes
      const allowedForTag = ALLOWED_ATTRS[tag] || [];
      Array.from(child.attributes).forEach((attr) => {
        if (!allowedForTag.includes(attr.name)) {
          child.removeAttribute(attr.name);
        }
      });
      // Enforce <a> safety
      if (tag === 'a') {
        const href = child.getAttribute('href');
        if (href) {
          const safe = sanitizeHref(href);
          if (!safe) {
            child.removeAttribute('href');
          } else {
            child.setAttribute('href', safe);
          }
        }
        child.setAttribute('target', '_blank');
        child.setAttribute('rel', 'noopener noreferrer');
      }
      sanitizeNode(child);
    });
  }

  // ─── 7. APIClient ─────────────────────────────────────────────────────────────

  // [C01-F08] Resolve dot-notation field path in an object
  function resolveField(obj, path) {
    const parts = path.split('.').slice(0, 5);
    let cur = obj;
    for (const part of parts) {
      if (cur === null || cur === undefined) return '';
      cur = cur[part];
    }
    return typeof cur === 'string' ? cur : '';
  }

  // [C01-F09] Full JSON response
  async function fetchFullResponse(config, body) {
    const res = await fetch(config.ai_endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + config.bearer_token,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw Object.assign(new Error('API error'), { status: res.status, type: 'api' });
    const json = await res.json();
    return resolveField(json, config.response_field);
  }

  // [C01-F10] SSE streaming response via fetch + ReadableStream
  async function fetchStreamResponse(config, body, onChunk, onDone, onError) {
    let res;
    try {
      res = await fetch(config.ai_endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + config.bearer_token,
        },
        body: JSON.stringify(body),
      });
    } catch (e) {
      onError({ type: 'network', message: e.message });
      return;
    }

    if (!res.ok) {
      onError({ type: 'api', status: res.status });
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let accumulated = '';
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split('\n\n');
        buffer = events.pop(); // keep incomplete event in buffer
        for (const event of events) {
          if (!event.trim()) continue;
          const dataLine = event.split('\n').find((l) => l.startsWith('data:'));
          if (!dataLine) continue;
          const data = dataLine.slice(5).trim();
          if (data === STREAM_DONE_SENTINEL) {
            onDone(accumulated);
            return;
          }
          try {
            const json = JSON.parse(data);
            // [C01-F11] Use stream_field (may differ from response_field)
            const chunk = resolveField(json, config.stream_field);
            if (chunk) {
              accumulated += chunk;
              onChunk(accumulated);
            }
          } catch {
            // unparseable chunk — skip silently per spec
          }
        }
      }
      onDone(accumulated);
    } catch {
      onError({ type: 'stream', accumulated });
    }
  }

  // ─── 8. UIBuilder ─────────────────────────────────────────────────────────────

  function buildCSS(theme) {
    return `
.ha-widget {
  --ha-primary-color: ${theme.primary_color};
  --ha-background-color: ${theme.background_color};
  --ha-font-family: ${theme.font_family};
  --ha-font-size: ${theme.font_size};
  --ha-border-radius: ${theme.border_radius};
  --ha-bubble-user-bg: var(--ha-primary-color);
  --ha-bubble-assistant-bg: #F3F4F6;
  --ha-text-color: #111827;
  --ha-header-bg: var(--ha-primary-color);
  font-family: var(--ha-font-family);
  font-size: var(--ha-font-size);
  color: var(--ha-text-color);
  box-sizing: border-box;
}
.ha-widget *, .ha-widget *::before, .ha-widget *::after { box-sizing: inherit; }

/* Floating bubble */
.ha-floating .ha-bubble {
  position: fixed;
  bottom: 24px; right: 24px;
  width: 56px; height: 56px;
  border-radius: 50%;
  background: var(--ha-primary-color);
  color: #fff;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(0,0,0,0.18);
  z-index: 9999;
  border: none;
  transition: transform 0.15s ease;
}
.ha-floating .ha-bubble:hover { transform: scale(1.07); }

/* Panel */
.ha-panel {
  display: flex; flex-direction: column;
  background: var(--ha-background-color);
  border-radius: var(--ha-border-radius);
  box-shadow: 0 8px 32px rgba(0,0,0,0.18);
  overflow: hidden;
}
.ha-floating .ha-panel {
  position: fixed;
  bottom: 96px; right: 24px;
  width: 460px; height: 660px;
  z-index: 9998;
}
.ha-floating .ha-panel[aria-hidden="true"] { display: none; }
.ha-inline .ha-panel { width: 100%; height: 100%; min-height: 400px; }
.ha-inline[style*="display: none"] { display: none !important; }

/* Header */
.ha-header {
  display: flex; align-items: center; gap: 8px;
  padding: 12px 16px;
  background: var(--ha-header-bg);
  color: #fff;
  flex-shrink: 0;
}
.ha-header-title { flex: 1; font-weight: 600; font-size: 15px; }
.ha-header button {
  background: none; border: none; color: #fff;
  cursor: pointer; padding: 4px; border-radius: 4px;
  display: flex; align-items: center; justify-content: center;
  opacity: 0.85;
}
.ha-header button:hover { opacity: 1; background: rgba(255,255,255,0.15); }

/* Messages */
.ha-messages {
  flex: 1; overflow-y: auto;
  padding: 16px;
  display: flex; flex-direction: column; gap: 12px;
}

/* Chat bubbles */
.ha-msg-row {
  display: flex; align-items: flex-end; gap: 8px;
}
.ha-msg-row--user { justify-content: flex-end; }
.ha-msg-row--assistant { justify-content: flex-start; }

.ha-avatar {
  width: 28px; height: 28px; border-radius: 50%;
  background: var(--ha-primary-color); color: #fff;
  display: flex; align-items: center; justify-content: center;
  font-size: 12px; font-weight: 700; flex-shrink: 0;
  overflow: hidden;
}
.ha-avatar img { width: 100%; height: 100%; object-fit: cover; }

.ha-bubble-msg {
  max-width: 75%;
  padding: 10px 14px;
  border-radius: var(--ha-border-radius);
  line-height: 1.5;
  word-break: break-word;
}
.ha-msg-row--user .ha-bubble-msg {
  background: var(--ha-bubble-user-bg);
  color: #fff;
  border-bottom-right-radius: 4px;
}
.ha-msg-row--assistant .ha-bubble-msg {
  background: var(--ha-bubble-assistant-bg);
  color: var(--ha-text-color);
  border-bottom-left-radius: 4px;
}

/* Markdown content in assistant bubble */
.ha-bubble-msg p { margin: 0 0 8px; }
.ha-bubble-msg p:last-child { margin-bottom: 0; }
.ha-bubble-msg h1,.ha-bubble-msg h2,.ha-bubble-msg h3,
.ha-bubble-msg h4,.ha-bubble-msg h5,.ha-bubble-msg h6 {
  margin: 8px 0 4px; font-weight: 600;
}
.ha-bubble-msg h1 { font-size: 1.2em; }
.ha-bubble-msg h2 { font-size: 1.1em; }
.ha-bubble-msg h3,.ha-bubble-msg h4,.ha-bubble-msg h5,.ha-bubble-msg h6 { font-size: 1em; }
.ha-bubble-msg ul,.ha-bubble-msg ol { margin: 4px 0 4px 18px; padding: 0; }
.ha-bubble-msg li { margin-bottom: 2px; }
.ha-bubble-msg table { border-collapse: collapse; width: 100%; font-size: 0.9em; margin: 8px 0; }
.ha-bubble-msg th,.ha-bubble-msg td {
  border: 1px solid #d1d5db; padding: 6px 10px; text-align: left;
}
.ha-bubble-msg th { background: rgba(0,0,0,0.05); font-weight: 600; }
.ha-bubble-msg a { color: var(--ha-primary-color); }
.ha-msg-row--user .ha-bubble-msg a { color: #fff; text-decoration: underline; }
.ha-bubble-msg strong { font-weight: 600; }
.ha-bubble-msg em { font-style: italic; }

/* Card blocks */
.ha-bubble-msg .ha-card {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 10px 14px;
  margin: 6px 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
}
.ha-bubble-msg .ha-card-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 8px;
}
.ha-bubble-msg .ha-card-label {
  font-size: 0.8em;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  flex-shrink: 0;
}
.ha-bubble-msg .ha-card-value {
  font-weight: 600;
  color: #111827;
  text-align: right;
}

/* Typing indicator */
.ha-typing { padding: 12px 16px !important; }
.ha-typing span {
  display: inline-block; width: 7px; height: 7px;
  border-radius: 50%; background: #9ca3af;
  margin-right: 4px;
  animation: ha-dot-pulse 0.4s ease-in-out infinite alternate;
}
.ha-typing span:nth-child(2) { animation-delay: 0.15s; }
.ha-typing span:nth-child(3) { animation-delay: 0.30s; }
@keyframes ha-dot-pulse {
  from { opacity: 0.3; transform: scale(0.85); }
  to   { opacity: 1;   transform: scale(1); }
}

/* Error indicator appended to interrupted stream */
.ha-error-indicator {
  display: inline-block; margin-left: 6px;
  font-size: 0.85em; opacity: 0.8;
}

/* Input row */
.ha-input-row {
  display: flex; align-items: flex-end; gap: 8px;
  padding: 12px 16px;
  border-top: 1px solid #e5e7eb;
  flex-shrink: 0;
}
.ha-input {
  flex: 1; resize: none; border: 1px solid #d1d5db;
  border-radius: 8px; padding: 8px 12px;
  font-family: var(--ha-font-family); font-size: var(--ha-font-size);
  line-height: 1.5; max-height: 120px; overflow-y: auto;
  outline: none; color: var(--ha-text-color);
  background: #fff;
}
.ha-input:focus { border-color: var(--ha-primary-color); }
.ha-input:disabled { background: #f9fafb; cursor: not-allowed; }
.ha-btn-send {
  width: 38px; height: 38px; border-radius: 8px;
  background: var(--ha-primary-color); color: #fff; border: none;
  cursor: pointer; display: flex; align-items: center; justify-content: center;
  flex-shrink: 0; transition: opacity 0.15s;
}
.ha-btn-send:disabled { opacity: 0.4; cursor: not-allowed; }
.ha-btn-send:not(:disabled):hover { opacity: 0.88; }

/* Toast */
.ha-toast {
  display: flex; align-items: center; gap: 8px;
  margin: 0 12px 8px;
  padding: 10px 14px;
  background: #FEF2F2; border: 1px solid #FECACA;
  border-radius: 8px; font-size: 0.9em; color: #B91C1C;
  flex-shrink: 0;
}
.ha-toast-message { flex: 1; }
.ha-btn-retry {
  background: #B91C1C; color: #fff; border: none;
  border-radius: 6px; padding: 4px 10px; cursor: pointer;
  font-size: 0.85em; white-space: nowrap;
}
.ha-btn-retry:hover { background: #991B1B; }
.ha-btn-dismiss {
  background: none; border: none; color: #B91C1C;
  cursor: pointer; padding: 2px 4px; font-size: 1em;
}

/* Config error */
.ha-config-error {
  padding: 16px;
  background: #FEF2F2; border: 1px solid #FECACA;
  border-radius: var(--ha-border-radius);
  color: #B91C1C; font-size: 0.9em;
  font-family: var(--ha-font-family);
}
`;
  }

  // [C01-F05, C01-F06] Build widget DOM
  function buildWidgetHTML(config) {
    return `
<div class="ha-bubble" role="button" aria-label="Open assistant" tabindex="0">
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M20 2H4C2.9 2 2 2.9 2 4v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" fill="currentColor"/>
  </svg>
</div>
<div class="ha-panel" id="ha-panel" aria-hidden="true" role="dialog" aria-label="${escapeHtml(config.theme.header_title)}">
  <div class="ha-header">
    <span class="ha-header-title">${escapeHtml(config.theme.header_title)}</span>
    <button class="ha-btn-clear" aria-label="Clear history" title="Clear conversation history">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </button>
    <button class="ha-btn-close" aria-label="Close assistant">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>
    </button>
  </div>
  <div class="ha-messages" id="ha-messages" role="log" aria-live="polite" aria-label="Conversation"></div>
  <div class="ha-input-row">
    <textarea
      class="ha-input"
      id="ha-input"
      placeholder="${escapeHtml(config.theme.placeholder_text)}"
      rows="1"
      aria-label="Chat message"
      maxlength="${MAX_MESSAGE_LENGTH}"
    ></textarea>
    <button class="ha-btn-send" id="ha-btn-send" aria-label="Send message">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </button>
  </div>
</div>`;
  }

  function buildMessageRow(role, htmlContent, avatarHTML) {
    const row = document.createElement('div');
    row.className = `ha-msg-row ha-msg-row--${role}`;

    if (role === 'assistant') {
      const avatar = document.createElement('div');
      avatar.className = 'ha-avatar';
      avatar.innerHTML = avatarHTML;
      row.appendChild(avatar);
    }

    const bubble = document.createElement('div');
    bubble.className = 'ha-bubble-msg';
    bubble.innerHTML = htmlContent;
    row.appendChild(bubble);
    return row;
  }

  function buildTypingIndicator(avatarHTML) {
    const row = document.createElement('div');
    row.className = 'ha-msg-row ha-msg-row--assistant';
    row.id = 'ha-typing';

    const avatar = document.createElement('div');
    avatar.className = 'ha-avatar';
    avatar.innerHTML = avatarHTML;

    const bubble = document.createElement('div');
    bubble.className = 'ha-bubble-msg ha-typing';
    bubble.innerHTML = '<span></span><span></span><span></span>';

    row.appendChild(avatar);
    row.appendChild(bubble);
    return row;
  }

  // ─── 9. ThemeEngine ───────────────────────────────────────────────────────────

  // [C01-F20, C01-F21] Inject CSS custom properties on widget root
  function applyTheme(root, theme) {
    root.style.setProperty('--ha-primary-color', theme.primary_color);
    root.style.setProperty('--ha-background-color', theme.background_color);
    root.style.setProperty('--ha-font-family', theme.font_family);
    root.style.setProperty('--ha-font-size', theme.font_size);
    root.style.setProperty('--ha-border-radius', theme.border_radius);
  }

  // ─── 10. EventController ─────────────────────────────────────────────────────

  function bindEvents(widget, config, state) {
    const panel = widget.querySelector('#ha-panel');
    const bubble = widget.querySelector('.ha-bubble');
    const messagesEl = widget.querySelector('#ha-messages');
    const input = widget.querySelector('#ha-input');
    const sendBtn = widget.querySelector('#ha-btn-send');
    const clearBtn = widget.querySelector('.ha-btn-clear');
    const closeBtn = widget.querySelector('.ha-btn-close');

    // [C01-F05] Bubble click — open panel
    if (bubble) {
      bubble.addEventListener('click', () => openPanel(widget, panel, bubble, input));
      bubble.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') openPanel(widget, panel, bubble, input);
      });
    }

    // [C01-F16] Close button
    closeBtn.addEventListener('click', () => {
      if (state.isFloating) {
        panel.setAttribute('aria-hidden', 'true');
        if (bubble) bubble.style.display = '';
      } else {
        widget.style.display = 'none';
      }
    });

    // [C01-F15] Clear history button
    clearBtn.addEventListener('click', () => {
      clearHistory();
      state.customerId = crypto.randomUUID();
      localStorage.setItem(LS_USER_KEY, state.customerId);
      messagesEl.innerHTML = '';
    });

    // [C01-F08] Send on Enter (no shift), or send button click
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (!state.inFlight) handleSend(widget, config, state);
      }
    });
    sendBtn.addEventListener('click', () => {
      if (!state.inFlight) handleSend(widget, config, state);
    });

    // Auto-resize textarea
    input.addEventListener('input', () => {
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 120) + 'px';
    });

    // Focus trap inside panel (floating mode only)
    if (state.isFloating) {
      panel.addEventListener('keydown', (e) => {
        if (e.key !== 'Tab') return;
        const focusable = Array.from(
          panel.querySelectorAll('textarea, button:not([disabled])'),
        ).filter((el) => el.offsetParent !== null);
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      });
    }
  }

  function openPanel(widget, panel, bubble, input) {
    panel.removeAttribute('aria-hidden');
    if (bubble) bubble.style.display = 'none';
    scrollToBottom(widget.querySelector('#ha-messages'));
    setTimeout(() => input.focus(), 50);
  }

  // ─── 11. WidgetController ────────────────────────────────────────────────────

  async function handleSend(widget, config, state) {
    const input = widget.querySelector('#ha-input');
    const sendBtn = widget.querySelector('#ha-btn-send');
    const messagesEl = widget.querySelector('#ha-messages');

    const message = input.value.trim();
    if (!message) return;

    // Set in-flight state
    state.inFlight = true;
    state.pendingMessage = message;
    input.value = '';
    input.style.height = 'auto';
    input.disabled = true;
    sendBtn.disabled = true;
    dismissToast(widget);

    // Append user message bubble
    appendMessageBubble(widget, 'user', escapeHtml(message), null);

    // Show typing indicator
    const typingEl = buildTypingIndicator(state.avatarHTML);
    messagesEl.appendChild(typingEl);
    scrollToBottom(messagesEl);

    const history = readHistory();
    const trimmedHistory = trimHistory(history, config.max_turns);
    const body = { customer_id: state.customerId, message, history: trimmedHistory };

    if (config.stream_mode === 'json') {
      // [C01-F09] Full JSON
      try {
        const content = await fetchFullResponse(config, body);
        finishAssistantResponse(widget, config, state, typingEl, content);
        appendHistory({ role: 'user', content: message });
        appendHistory({ role: 'assistant', content });
      } catch (e) {
        removeTypingIndicator(messagesEl, typingEl);
        const errMsg =
          e.type === 'api'
            ? 'Something went wrong. Please try again.'
            : 'Could not reach the server. Please check your connection.';
        showToast(widget, errMsg, state);
      }
    } else {
      // [C01-F10, C01-F11] SSE streaming
      let streamingBubble = null;

      await fetchStreamResponse(
        config,
        body,
        // onChunk
        (accumulated) => {
          if (typingEl.parentNode) typingEl.parentNode.removeChild(typingEl);
          if (!streamingBubble) {
            streamingBubble = appendMessageBubble(widget, 'assistant', '', state.avatarHTML);
          }
          const rendered = sanitizeHtml(renderMarkdown(accumulated));
          streamingBubble.querySelector('.ha-bubble-msg').innerHTML = rendered;
          scrollToBottom(messagesEl);
        },
        // onDone
        (accumulated) => {
          if (typingEl.parentNode) typingEl.parentNode.removeChild(typingEl);
          if (!streamingBubble) {
            appendMessageBubble(
              widget,
              'assistant',
              sanitizeHtml(renderMarkdown(accumulated)),
              state.avatarHTML,
            );
          }
          appendHistory({ role: 'user', content: message });
          appendHistory({ role: 'assistant', content: accumulated });
          resetInput(input, sendBtn, state);
          scrollToBottom(messagesEl);
        },
        // onError — [C01-F17, C01-F18, C01-F19]
        (err) => {
          removeTypingIndicator(messagesEl, typingEl);
          if (err.type === 'stream' && err.accumulated) {
            // [C01-F19] Show partial with error indicator
            if (!streamingBubble) {
              streamingBubble = appendMessageBubble(widget, 'assistant', '', state.avatarHTML);
            }
            const partial = sanitizeHtml(renderMarkdown(err.accumulated));
            streamingBubble.querySelector('.ha-bubble-msg').innerHTML =
              partial +
              '<span class="ha-error-indicator" aria-label="Response interrupted">⚠ Response interrupted</span>';
          }
          const errMsg =
            err.type === 'network'
              ? 'Could not reach the server. Please check your connection.'
              : 'Something went wrong. Please try again.';
          showToast(widget, errMsg, state);
        },
      );
    }

    function finishAssistantResponse(widget, config, state, typingEl, content) {
      const messagesEl = widget.querySelector('#ha-messages');
      removeTypingIndicator(messagesEl, typingEl);
      appendMessageBubble(
        widget,
        'assistant',
        sanitizeHtml(renderMarkdown(content)),
        state.avatarHTML,
      );
      resetInput(widget.querySelector('#ha-input'), widget.querySelector('#ha-btn-send'), state);
      scrollToBottom(messagesEl);
    }
  }

  function appendMessageBubble(widget, role, htmlContent, avatarHTML) {
    const messagesEl = widget.querySelector('#ha-messages');
    const row = buildMessageRow(role, htmlContent, avatarHTML || 'A');
    messagesEl.appendChild(row);
    scrollToBottom(messagesEl);
    return row;
  }

  function removeTypingIndicator(messagesEl, typingEl) {
    if (typingEl && typingEl.parentNode === messagesEl) {
      messagesEl.removeChild(typingEl);
    }
  }

  function resetInput(input, sendBtn, state) {
    input.disabled = false;
    sendBtn.disabled = false;
    state.inFlight = false;
    state.pendingMessage = null;
  }

  function scrollToBottom(el) {
    if (el) el.scrollTop = el.scrollHeight;
  }

  // ─── Toast ────────────────────────────────────────────────────────────────────

  // [C01-F17, C01-F18] Show toast with retry
  function showToast(widget, message, state) {
    dismissToast(widget);
    const panel = widget.querySelector('#ha-panel');
    const input = widget.querySelector('#ha-input');
    const sendBtn = widget.querySelector('#ha-btn-send');

    const toast = document.createElement('div');
    toast.className = 'ha-toast';
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.innerHTML = `
      <span class="ha-toast-message">${escapeHtml(message)}</span>
      <button class="ha-btn-retry">Try again</button>
      <button class="ha-btn-dismiss" aria-label="Dismiss">&times;</button>
    `;

    // Insert toast above input row
    const inputRow = panel.querySelector('.ha-input-row');
    panel.insertBefore(toast, inputRow);

    // [C01-F20] Retry re-sends pending message
    toast.querySelector('.ha-btn-retry').addEventListener('click', () => {
      dismissToast(widget);
      if (state.pendingMessage) {
        input.value = state.pendingMessage;
        state.inFlight = false;
        input.disabled = false;
        sendBtn.disabled = false;
        handleSend(widget, state._config, state);
      }
    });

    toast.querySelector('.ha-btn-dismiss').addEventListener('click', () => {
      dismissToast(widget);
      resetInput(input, sendBtn, state);
    });

    // Auto-dismiss after TOAST_DURATION_MS
    state._toastTimer = setTimeout(() => {
      dismissToast(widget);
      resetInput(input, sendBtn, state);
    }, TOAST_DURATION_MS);
  }

  function dismissToast(widget) {
    const existing = widget.querySelector('.ha-toast');
    if (existing) existing.parentNode.removeChild(existing);
  }

  // ─── Session resume ───────────────────────────────────────────────────────────

  // [C01-F07] Render stored history on mount
  function resumeSession(widget, state) {
    const history = readHistory();
    const messagesEl = widget.querySelector('#ha-messages');
    history.forEach((turn) => {
      const html =
        turn.role === 'assistant'
          ? sanitizeHtml(renderMarkdown(turn.content))
          : escapeHtml(turn.content);
      appendMessageBubble(
        widget,
        turn.role,
        html,
        turn.role === 'assistant' ? state.avatarHTML : null,
      );
    });
    scrollToBottom(messagesEl);
  }

  // ─── 12. Bootstrap ────────────────────────────────────────────────────────────

  let _mountedWidget = null;

  // [C01-F22] Render config error inline
  function renderConfigError(container, message) {
    const el = document.createElement('div');
    el.className = 'ha-config-error';
    el.setAttribute('role', 'alert');
    el.textContent = message;
    container.appendChild(el);
  }

  // Core mount function shared by auto-init and manual init
  async function mount(rawConfig, containerEl) {
    if (_mountedWidget) {
      console.warn('[HeadlessAssistant] Already mounted. Call destroy() first.');
      return;
    }

    // [C01-F03] Merge & validate config
    const config = mergeDefaults(rawConfig);
    const validationError = validateConfig(config);

    // Determine mount target
    let mountTarget = document.body;
    let isFloating = true;

    if (containerEl) {
      mountTarget = containerEl;
      isFloating = false;
    } else if (config.container) {
      const sel = document.querySelector(config.container);
      if (!sel) {
        renderConfigError(
          document.body,
          'Assistant configuration is incomplete: container element not found.',
        );
        return;
      }
      mountTarget = sel;
      isFloating = false;
    }

    if (validationError) {
      renderConfigError(
        mountTarget,
        'Assistant configuration is incomplete. Contact the site administrator.',
      );
      return;
    }

    // [C01-F04] Resolve user identity
    const customerId = getOrCreateUserId(config.customer_id);

    // Inject CSS
    const styleTag = document.createElement('style');
    styleTag.textContent = buildCSS(config.theme);
    document.head.appendChild(styleTag);

    // Build widget root
    const widget = document.createElement('div');
    widget.className = 'ha-widget ' + (isFloating ? 'ha-floating' : 'ha-inline');
    widget.id = 'ha-widget-root';
    widget.innerHTML = buildWidgetHTML(config);

    // [C01-F20, C01-F21] Apply theme CSS variables
    applyTheme(widget, config.theme);

    mountTarget.appendChild(widget);

    // Avatar HTML for reuse
    const avatarHTML = config.theme.avatar_url
      ? `<img src="${escapeHtml(config.theme.avatar_url)}" alt="Assistant avatar">`
      : 'A';

    const state = {
      isFloating,
      customerId,
      inFlight: false,
      pendingMessage: null,
      avatarHTML,
      _config: config,
      _toastTimer: null,
      _styleTag: styleTag,
    };

    // [C01-F07] Restore history
    resumeSession(widget, state);

    // Greet on a fresh session — personalised if user_name is set, generic otherwise
    if (readHistory().length === 0) {
      const greeting = config.user_name
        ? `Hi ${escapeHtml(config.user_name.split(/\s+/)[0])}! How can I help you today?`
        : 'Hi! How can I help you today?';
      appendMessageBubble(widget, 'assistant', greeting, avatarHTML);
    }

    // [C01-F05/F06] Inline: panel is visible immediately; floating: panel hidden
    if (!isFloating) {
      const panel = widget.querySelector('#ha-panel');
      panel.removeAttribute('aria-hidden');
    }

    // Wire all events
    bindEvents(widget, config, state);

    _mountedWidget = { widget, state, styleTag };
  }

  // [C01-F01] Auto-init
  async function autoInit() {
    const script = document.currentScript || document.querySelector('script[data-config]');
    if (!script) return;
    const configUrl = script.getAttribute('data-config');
    if (!configUrl) return;

    try {
      const rawConfig = await fetchConfig(configUrl);
      await mount(rawConfig, null);
    } catch (e) {
      console.error('[HeadlessAssistant] Config load failed:', e.message);
      renderConfigError(document.body, 'Could not load assistant configuration.');
    }
  }

  // [C01-F02] Public API
  const HeadlessAssistant = {
    // Manual init
    init: async function (config) {
      await mount(config, null);
    },

    // [C01-F15 programmatic] Clear history and reset panel
    clearHistory: function () {
      clearHistory();
      if (_mountedWidget) {
        const messagesEl = _mountedWidget.widget.querySelector('#ha-messages');
        if (messagesEl) messagesEl.innerHTML = '';
        _mountedWidget.state.customerId = crypto.randomUUID();
        localStorage.setItem(LS_USER_KEY, _mountedWidget.state.customerId);
      }
    },

    // destroy() — unmount widget and clean up
    destroy: function () {
      if (!_mountedWidget) return;
      const { widget, state, styleTag } = _mountedWidget;
      if (state._toastTimer) clearTimeout(state._toastTimer);
      if (widget.parentNode) widget.parentNode.removeChild(widget);
      if (styleTag.parentNode) styleTag.parentNode.removeChild(styleTag);
      _mountedWidget = null;
    },
  };

  // Expose global
  global.HeadlessAssistant = HeadlessAssistant;

  // [C01-F23] Auto-init on DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoInit);
  } else {
    autoInit();
  }
})(typeof window !== 'undefined' ? window : this);
