/*!
 * ChatPilot embeddable widget.
 * Usage on a client's website:
 *   <script src="https://YOUR-DOMAIN/widget.js" data-client="their-slug-or-id"></script>
 *
 * Renders inside a Shadow DOM so it never collides with the host site's CSS,
 * and never leaks styles onto the host page either.
 */
(function () {
  var scriptTag = document.currentScript;
  if (!scriptTag) return;

  var clientId = scriptTag.getAttribute('data-client');
  if (!clientId) {
    console.warn('[ChatPilot widget] missing data-client attribute on the script tag.');
    return;
  }

  var apiBase;
  try {
    apiBase = new URL(scriptTag.src).origin;
  } catch (e) {
    console.warn('[ChatPilot widget] could not resolve API base URL.');
    return;
  }

  var state = { open: false, config: null, conversation: [] };

  var host = document.createElement('div');
  host.id = 'chatpilot-widget-host';
  document.body.appendChild(host);
  var shadow = host.attachShadow({ mode: 'open' });

  var style = document.createElement('style');
  style.textContent =
    ':host, *{box-sizing:border-box;}' +
    '.cp-launcher{position:fixed;bottom:24px;right:24px;width:60px;height:60px;border-radius:50%;' +
    'background:var(--cp-accent,#d4ff00);border:none;cursor:pointer;box-shadow:0 10px 30px rgba(0,0,0,0.25);' +
    'z-index:2147483000;display:flex;align-items:center;justify-content:center;font-size:26px;transition:transform .15s;}' +
    '.cp-launcher:hover{transform:scale(1.06);}' +
    '.cp-panel{position:fixed;bottom:96px;right:24px;width:360px;max-width:calc(100vw - 32px);height:520px;' +
    'max-height:calc(100vh - 140px);background:#111;color:#f5f5f0;border-radius:20px;overflow:hidden;' +
    'display:none;flex-direction:column;box-shadow:0 30px 80px rgba(0,0,0,0.45);z-index:2147483000;' +
    'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;border:1px solid #222;}' +
    '.cp-panel.open{display:flex;}' +
    '.cp-header{padding:16px 18px;border-bottom:1px solid #222;display:flex;align-items:center;gap:10px;}' +
    '.cp-avatar{width:34px;height:34px;border-radius:50%;background:var(--cp-accent,#d4ff00);' +
    'display:flex;align-items:center;justify-content:center;color:#000;font-weight:700;font-size:14px;flex-shrink:0;}' +
    '.cp-title{font-weight:600;font-size:14px;}' +
    '.cp-sub{font-size:11px;color:#999;}' +
    '.cp-close{margin-left:auto;background:none;border:none;color:#999;font-size:18px;cursor:pointer;}' +
    '.cp-messages{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:10px;}' +
    '.cp-msg{max-width:85%;padding:10px 14px;border-radius:14px;font-size:13.5px;line-height:1.5;}' +
    '.cp-msg.bot{background:#1a1a1a;border:1px solid #262626;align-self:flex-start;border-bottom-left-radius:4px;}' +
    '.cp-msg.user{background:var(--cp-accent,#d4ff00);color:#000;align-self:flex-end;border-bottom-right-radius:4px;font-weight:500;}' +
    '.cp-typing span{display:inline-block;width:6px;height:6px;margin-right:3px;background:#888;border-radius:50%;' +
    'animation:cpTyping 1.4s infinite ease-in-out;}' +
    '.cp-typing span:nth-child(2){animation-delay:.2s}.cp-typing span:nth-child(3){animation-delay:.4s}' +
    '@keyframes cpTyping{0%,80%,100%{opacity:.3;transform:scale(.7)}40%{opacity:1;transform:scale(1)}}' +
    '.cp-inputrow{padding:12px;border-top:1px solid #222;display:flex;gap:8px;}' +
    '.cp-inputrow input{flex:1;background:#1a1a1a;border:1px solid #262626;color:#f5f5f0;padding:10px 14px;' +
    'border-radius:100px;font-size:13px;outline:none;}' +
    '.cp-inputrow input:focus{border-color:var(--cp-accent,#d4ff00);}' +
    '.cp-send{background:var(--cp-accent,#d4ff00);border:none;width:38px;height:38px;border-radius:50%;cursor:pointer;font-size:15px;}' +
    '.cp-leadbar{padding:8px 14px;border-top:1px solid #222;}' +
    '.cp-leadbtn{width:100%;background:transparent;border:1px solid #333;color:#ccc;padding:8px;border-radius:10px;' +
    'font-size:12px;cursor:pointer;}' +
    '.cp-leadbtn:hover{border-color:var(--cp-accent,#d4ff00);color:var(--cp-accent,#d4ff00);}' +
    '.cp-leadform{padding:14px;border-top:1px solid #222;display:none;flex-direction:column;gap:8px;}' +
    '.cp-leadform.open{display:flex;}' +
    '.cp-leadform input,.cp-leadform textarea{background:#1a1a1a;border:1px solid #262626;color:#f5f5f0;' +
    'padding:9px 12px;border-radius:10px;font-size:13px;outline:none;font-family:inherit;}' +
    '.cp-leadform input:focus,.cp-leadform textarea:focus{border-color:var(--cp-accent,#d4ff00);}' +
    '.cp-leadform button{background:var(--cp-accent,#d4ff00);color:#000;border:none;padding:10px;' +
    'border-radius:10px;font-weight:600;font-size:13px;cursor:pointer;}' +
    '.cp-footer{padding:7px 14px;text-align:center;border-top:1px solid #1a1a1a;}' +
    '.cp-footer a{font-size:10.5px;color:#666;text-decoration:none;letter-spacing:.2px;}' +
    '.cp-footer a:hover{color:var(--cp-accent,#d4ff00);}' +
    '.cp-bubble{position:fixed;bottom:96px;right:24px;max-width:240px;background:#151515;color:#f5f5f0;' +
    'border:1px solid #262626;border-radius:16px 16px 4px 16px;padding:12px 34px 12px 14px;font-size:13px;' +
    'line-height:1.4;box-shadow:0 20px 50px rgba(0,0,0,0.4);cursor:pointer;z-index:2147482999;' +
    'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;animation:cpBubbleIn .25s ease;}' +
    '@keyframes cpBubbleIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}' +
    '.cp-bubble-close{position:absolute;top:6px;right:8px;background:none;border:none;color:#777;' +
    'font-size:13px;cursor:pointer;line-height:1;padding:2px;}' +
    '.cp-bubble-close:hover{color:#ccc;}' +
    '.cp-launcher-dot{position:fixed;bottom:70px;right:22px;width:14px;height:14px;border-radius:50%;' +
    'background:#ff4d4f;border:2px solid #0a0a0a;z-index:2147483001;display:none;}' +
    '.cp-launcher-dot.show{display:block;}';
  shadow.appendChild(style);

  var wrap = document.createElement('div');
  wrap.innerHTML =
    '<button class="cp-launcher" id="cpLauncher" aria-label="Open chat">💬</button>' +
    '<div class="cp-launcher-dot" id="cpLauncherDot"></div>' +
    '<div class="cp-panel" id="cpPanel">' +
    '  <div class="cp-header">' +
    '    <div class="cp-avatar" id="cpAvatar">?</div>' +
    '    <div><div class="cp-title" id="cpTitle">Chat</div><div class="cp-sub">Usually replies instantly</div></div>' +
    '    <button class="cp-close" id="cpClose">✕</button>' +
    '  </div>' +
    '  <div class="cp-messages" id="cpMessages"></div>' +
    '  <div class="cp-leadform" id="cpLeadForm">' +
    '    <input type="text" id="cpLeadName" placeholder="Your name" />' +
    '    <input type="text" id="cpLeadContact" placeholder="Email or phone" />' +
    '    <textarea id="cpLeadMessage" rows="2" placeholder="What do you need? (optional)"></textarea>' +
    '    <button id="cpLeadSubmit">Send my details</button>' +
    '  </div>' +
    '  <div class="cp-leadbar"><button class="cp-leadbtn" id="cpLeadToggle">📩 Leave your details — we will get back to you</button></div>' +
    '  <div class="cp-inputrow"><input type="text" id="cpInput" placeholder="Type a message..." autocomplete="off" />' +
    '    <button class="cp-send" id="cpSend">→</button></div>' +
    '  <div class="cp-footer"><a href="' + apiBase + '/" target="_blank" rel="noopener">⚡ Powered by ChatPilot</a></div>' +
    '</div>';
  shadow.appendChild(wrap);

  var launcher = shadow.getElementById('cpLauncher');
  var launcherDot = shadow.getElementById('cpLauncherDot');
  var panel = shadow.getElementById('cpPanel');
  var closeBtn = shadow.getElementById('cpClose');
  var messagesEl = shadow.getElementById('cpMessages');
  var input = shadow.getElementById('cpInput');
  var sendBtn = shadow.getElementById('cpSend');
  var titleEl = shadow.getElementById('cpTitle');
  var avatarEl = shadow.getElementById('cpAvatar');
  var leadToggle = shadow.getElementById('cpLeadToggle');
  var leadForm = shadow.getElementById('cpLeadForm');
  var leadSubmit = shadow.getElementById('cpLeadSubmit');
  var bubbleEl = null;
  var bubbleTimer = null;

  function setAccent(color) {
    host.style.setProperty('--cp-accent', color || '#d4ff00');
  }

  function addMessage(role, text) {
    var div = document.createElement('div');
    div.className = 'cp-msg ' + role;
    div.textContent = text;
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function showTyping() {
    var div = document.createElement('div');
    div.className = 'cp-msg bot';
    div.id = 'cpTypingIndicator';
    div.innerHTML = '<span class="cp-typing"><span></span><span></span><span></span></span>';
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function removeTyping() {
    var t = shadow.getElementById('cpTypingIndicator');
    if (t) t.remove();
  }

  function showBubble(text) {
    if (state.open || bubbleEl) return;
    bubbleEl = document.createElement('div');
    bubbleEl.className = 'cp-bubble';
    bubbleEl.id = 'cpBubble';
    var closeBtn2 = document.createElement('button');
    closeBtn2.className = 'cp-bubble-close';
    closeBtn2.setAttribute('aria-label', 'Dismiss');
    closeBtn2.textContent = '✕';
    closeBtn2.addEventListener('click', function (e) {
      e.stopPropagation();
      hideBubble();
    });
    var textNode = document.createElement('div');
    textNode.textContent = text;
    bubbleEl.appendChild(textNode);
    bubbleEl.appendChild(closeBtn2);
    bubbleEl.addEventListener('click', function () {
      hideBubble();
      openPanel();
    });
    shadow.appendChild(bubbleEl);
    launcherDot.classList.add('show');

    bubbleTimer = setTimeout(hideBubble, 14000);
  }

  function hideBubble() {
    if (bubbleTimer) {
      clearTimeout(bubbleTimer);
      bubbleTimer = null;
    }
    if (bubbleEl) {
      bubbleEl.remove();
      bubbleEl = null;
    }
  }

  function loadConfig() {
    return fetch(apiBase + '/api/widget/' + encodeURIComponent(clientId) + '/config')
      .then(function (res) {
        if (!res.ok) throw new Error('config fetch failed');
        return res.json();
      })
      .then(function (cfg) {
        state.config = cfg;
        titleEl.textContent = cfg.businessName || 'Chat';
        avatarEl.textContent = (cfg.businessName || 'C').trim().charAt(0).toUpperCase();
        setAccent(cfg.brandColor);
        addMessage('bot', cfg.greeting || 'Hi 👋 how can we help?');

        // Proactively invite engagement after a few seconds, like most
        // commercial chat widgets — but only once, and never if the
        // visitor has already opened the chat by then.
        setTimeout(function () {
          showBubble(cfg.greeting || 'Hi 👋 how can we help?');
        }, 3500);
      })
      .catch(function (e) {
        console.warn('[ChatPilot widget] failed to load config for client "' + clientId + '"', e);
      });
  }

  function openPanel() {
    state.open = true;
    panel.classList.add('open');
    launcherDot.classList.remove('show');
    hideBubble();
  }

  function sendMessage(text) {
    text = (text || '').trim();
    if (!text) return;
    addMessage('user', text);
    input.value = '';
    state.conversation.push({ role: 'user', content: text });
    showTyping();

    fetch(apiBase + '/api/widget/' + encodeURIComponent(clientId) + '/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: state.conversation })
    })
      .then(function (res) {
        return res.json().then(function (data) {
          return { ok: res.ok, data: data };
        });
      })
      .then(function (result) {
        removeTyping();
        if (!result.ok || !result.data.reply) {
          addMessage('bot', "Sorry, I'm having trouble responding right now. Please use the details form below and we'll get back to you.");
          return;
        }
        addMessage('bot', result.data.reply);
        state.conversation.push({ role: 'assistant', content: result.data.reply });
      })
      .catch(function () {
        removeTyping();
        addMessage('bot', "Sorry, I'm having trouble connecting. Please leave your details below and we'll reach out.");
      });
  }

  launcher.addEventListener('click', function () {
    if (state.open) {
      state.open = false;
      panel.classList.remove('open');
      return;
    }
    openPanel();
    if (!state.config) loadConfig();
  });
  closeBtn.addEventListener('click', function () {
    state.open = false;
    panel.classList.remove('open');
  });
  sendBtn.addEventListener('click', function () {
    sendMessage(input.value);
  });
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') sendMessage(input.value);
  });

  leadToggle.addEventListener('click', function () {
    leadForm.classList.toggle('open');
  });
  leadSubmit.addEventListener('click', function () {
    var name = shadow.getElementById('cpLeadName').value.trim();
    var contact = shadow.getElementById('cpLeadContact').value.trim();
    var message = shadow.getElementById('cpLeadMessage').value.trim();
    if (!name || !contact) {
      alert('Please share your name and an email or phone number.');
      return;
    }
    var isEmail = contact.indexOf('@') !== -1;
    leadSubmit.disabled = true;
    leadSubmit.textContent = 'Sending...';

    fetch(apiBase + '/api/widget/' + encodeURIComponent(clientId) + '/lead', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: name,
        email: isEmail ? contact : '',
        phone: isEmail ? '' : contact,
        message: message
      })
    })
      .then(function (res) {
        if (!res.ok) throw new Error('lead failed');
        leadForm.innerHTML = '<div style="color:#d4ff00;font-size:13px;padding:6px 0;">Thanks! We have your details and will be in touch soon. ✅</div>';
      })
      .catch(function () {
        leadSubmit.disabled = false;
        leadSubmit.textContent = 'Send my details';
        alert('Something went wrong sending your details. Please try again.');
      });
  });

  // Load config right away (not just on open) so the proactive greeting
  // bubble can appear even before the visitor clicks the launcher.
  loadConfig();
})();
