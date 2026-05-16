const accountId = document.getElementById('nav-account-id').textContent.replace('Account #', '').trim();
const userName = document.getElementById('nav-user-name').textContent.trim();

HeadlessAssistant.init({
  ai_endpoint: 'http://localhost:3000/ask-assistant',
  bearer_token: 'demo-local',
  customer_id: accountId,
  user_name: userName,
  max_turns: 10,
  stream_mode: 'sse',
  response_field: 'message',
  stream_field: 'message',
  theme: {
    primary_color: '#CC0000',
    header_title: 'Hi, ' + userName,
    placeholder_text: 'Ask about invoices, payments, or coverage…',
    border_radius: '12px',
  },
});
