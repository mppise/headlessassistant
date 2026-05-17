// SAP AI Core client — OAuth2 token cache and chat completions wrapper.

// Read lazily so dotenv in server.js is guaranteed to have run first.
function cfg() {
  return {
    authUrl:       process.env.AICORE_AUTH_URL,
    baseUrl:       process.env.AICORE_BASE_URL,
    deploymentId:  process.env.AICORE_LLM_DEPLOYMENT_ID,
    model:         process.env.AICORE_LLM_MODEL        || 'gpt-4o',
    resourceGroup: process.env.AICORE_RESOURCE_GROUP   || 'default',
    apiVersion:    process.env.AICORE_API_VERSION       || '2024-02-01',
    clientId:      process.env.AICORE_CLIENT_ID,
    clientSecret:  process.env.AICORE_CLIENT_SECRET,
  };
}

let _cachedToken    = null;
let _tokenExpiresAt = 0;

export async function getAccessToken() {
  if (_cachedToken && Date.now() < _tokenExpiresAt - 60_000) return _cachedToken;
  const { authUrl, clientId, clientSecret } = cfg();
  const body = new URLSearchParams({
    grant_type:    'client_credentials',
    client_id:     clientId,
    client_secret: clientSecret,
  });
  const res = await fetch(`${authUrl}/oauth/token`, {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body,
  });
  if (!res.ok) throw new Error(`AI Core OAuth2 error ${res.status}: ${await res.text()}`);
  const data      = await res.json();
  _cachedToken    = data.access_token;
  _tokenExpiresAt = Date.now() + data.expires_in * 1000;
  return _cachedToken;
}

// Returns parsed JSON when stream:false, raw Response when stream:true.
export async function callAiCore(token, overrides) {
  const { baseUrl, deploymentId, apiVersion, resourceGroup, model } = cfg();
  const aiUrl = `${baseUrl}/v2/inference/deployments/${deploymentId}/chat/completions?api-version=${apiVersion}`;

  const aiRes = await fetch(aiUrl, {
    method: 'POST',
    headers: {
      'Authorization':     `Bearer ${token}`,
      'Content-Type':      'application/json',
      'AI-Resource-Group': resourceGroup,
    },
    body: JSON.stringify({ model, max_tokens: 1024, temperature: 0.4, ...overrides }),
  });

  if (!aiRes.ok) throw new Error(`AI Core ${aiRes.status}: ${await aiRes.text()}`);
  return overrides.stream ? aiRes : aiRes.json();
}

// Proxies an AI Core SSE response to the browser via send.chunk(). Returns total chars streamed.
export async function streamResponse(aiRes, send) {
  const decoder = new TextDecoder();
  let buffer = '';
  let totalChars = 0;
  for await (const rawChunk of aiRes.body) {
    buffer += decoder.decode(rawChunk, { stream: true });
    const events = buffer.split('\n\n');
    buffer = events.pop();
    for (const event of events) {
      const line = event.trim();
      if (!line.startsWith('data:')) continue;
      const payload = line.slice(5).trim();
      if (payload === '[DONE]') continue;
      let parsed;
      try { parsed = JSON.parse(payload); } catch { continue; }
      const content = parsed?.choices?.[0]?.delta?.content;
      if (content) { send.chunk(content); totalChars += content.length; }
    }
  }
  return totalChars;
}
