(function () {
  'use strict';

  // スクリプトタグからbotIdを取得
  var currentScript = document.currentScript || (function () {
    var scripts = document.getElementsByTagName('script');
    return scripts[scripts.length - 1];
  })();

  var src = currentScript.src;
  var botId = new URL(src).searchParams.get('botId');
  if (!botId) return;

  var baseUrl = src.split('/widget.js')[0];
  var sessionKey = 'spinel_session_' + botId;
  var sessionId = sessionStorage.getItem(sessionKey) || generateUUID();
  sessionStorage.setItem(sessionKey, sessionId);

  var config = {
    primaryColor: '#6366f1',
    fontFamily: 'system-ui, sans-serif',
    position: 'bottom-right',
    welcomeMessage: 'こんにちは！何でもお気軽にご質問ください。',
    botName: 'AI アシスタント',
    showCredit: true,
  };

  var messages = [];
  var isOpen = false;
  var isLoading = false;
  var turnCount = 0;
  var MAX_TURNS = 10;

  // ボット設定を取得
  fetch(baseUrl + '/api/bots/' + botId + '/public-config')
    .then(function (r) { return r.json(); })
    .then(function (data) {
      if (data.settings) Object.assign(config, data.settings);
      init();
    })
    .catch(function () { init(); });

  function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = Math.random() * 16 | 0;
      var v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function init() {
    injectStyles();
    createWidget();
    addWelcomeMessage();
  }

  function injectStyles() {
    var style = document.createElement('style');
    style.textContent = [
      '#spinel-widget-btn{position:fixed;' + (config.position === 'bottom-left' ? 'left:20px' : 'right:20px') + ';bottom:20px;width:56px;height:56px;border-radius:50%;background:' + config.primaryColor + ';border:none;cursor:pointer;box-shadow:0 4px 20px rgba(0,0,0,0.2);z-index:99999;display:flex;align-items:center;justify-content:center;transition:transform 0.2s,box-shadow 0.2s}',
      '#spinel-widget-btn:hover{transform:scale(1.05);box-shadow:0 6px 24px rgba(0,0,0,0.25)}',
      '#spinel-widget-btn svg{width:28px;height:28px;fill:white;transition:opacity 0.2s}',
      '#spinel-chat-window{position:fixed;' + (config.position === 'bottom-left' ? 'left:20px' : 'right:20px') + ';bottom:86px;width:360px;max-height:560px;background:#fff;border-radius:16px;box-shadow:0 8px 40px rgba(0,0,0,0.18);z-index:99999;display:none;flex-direction:column;font-family:' + config.fontFamily + ';overflow:hidden}',
      '#spinel-chat-window.open{display:flex}',
      '#spinel-chat-header{background:' + config.primaryColor + ';color:#fff;padding:14px 16px;display:flex;align-items:center;justify-content:space-between;font-weight:600;font-size:14px}',
      '#spinel-chat-header .close-btn{background:none;border:none;color:rgba(255,255,255,0.8);cursor:pointer;font-size:20px;line-height:1;padding:0}',
      '#spinel-chat-header .close-btn:hover{color:#fff}',
      '#spinel-messages{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:10px;max-height:400px;scroll-behavior:smooth}',
      '.spinel-msg{max-width:80%;padding:10px 14px;border-radius:12px;font-size:13px;line-height:1.5;word-break:break-word;white-space:pre-wrap}',
      '.spinel-msg.user{background:' + config.primaryColor + ';color:#fff;align-self:flex-end;border-bottom-right-radius:4px}',
      '.spinel-msg.bot{background:#f3f4f6;color:#1f2937;align-self:flex-start;border-bottom-left-radius:4px}',
      '.spinel-msg.error{background:#fef2f2;color:#dc2626;align-self:flex-start}',
      '.spinel-typing{display:flex;gap:4px;align-items:center;padding:10px 14px;background:#f3f4f6;border-radius:12px;border-bottom-left-radius:4px;align-self:flex-start}',
      '.spinel-dot{width:7px;height:7px;background:#9ca3af;border-radius:50%;animation:spinelBounce 1.2s infinite}',
      '.spinel-dot:nth-child(2){animation-delay:0.2s}',
      '.spinel-dot:nth-child(3){animation-delay:0.4s}',
      '@keyframes spinelBounce{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-6px)}}',
      '#spinel-input-area{border-top:1px solid #e5e7eb;padding:12px;display:flex;gap:8px;background:#fff}',
      '#spinel-input{flex:1;border:1px solid #e5e7eb;border-radius:8px;padding:8px 12px;font-size:13px;outline:none;font-family:' + config.fontFamily + ';resize:none;max-height:80px}',
      '#spinel-input:focus{border-color:' + config.primaryColor + '}',
      '#spinel-send{background:' + config.primaryColor + ';color:#fff;border:none;border-radius:8px;padding:8px 14px;cursor:pointer;font-size:13px;font-weight:500;transition:opacity 0.2s;white-space:nowrap}',
      '#spinel-send:disabled{opacity:0.5;cursor:not-allowed}',
      '#spinel-credit{text-align:center;font-size:10px;color:#9ca3af;padding:6px;background:#fafafa;border-top:1px solid #f3f4f6}',
      '#spinel-credit a{color:#9ca3af;text-decoration:none}',
      '#spinel-credit a:hover{color:#6b7280}',
      '@media(max-width:420px){#spinel-chat-window{width:calc(100vw - 24px);right:12px;left:12px}}',
    ].join('');
    document.head.appendChild(style);
  }

  function createWidget() {
    // チャットボタン
    var btn = document.createElement('button');
    btn.id = 'spinel-widget-btn';
    btn.setAttribute('aria-label', 'チャットを開く');
    btn.innerHTML = '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/></svg>';
    btn.addEventListener('click', toggleChat);
    document.body.appendChild(btn);

    // チャットウィンドウ
    var win = document.createElement('div');
    win.id = 'spinel-chat-window';
    win.setAttribute('role', 'dialog');
    win.setAttribute('aria-label', config.botName);
    win.innerHTML =
      '<div id="spinel-chat-header">' +
        '<span>' + escapeHtml(config.botName) + '</span>' +
        '<button class="close-btn" onclick="document.getElementById(\'spinel-chat-window\').classList.remove(\'open\')">×</button>' +
      '</div>' +
      '<div id="spinel-messages"></div>' +
      '<div id="spinel-input-area">' +
        '<textarea id="spinel-input" placeholder="メッセージを入力..." rows="1"></textarea>' +
        '<button id="spinel-send">送信</button>' +
      '</div>' +
      (config.showCredit ? '<div id="spinel-credit"><a href="https://spinel-lab.com" target="_blank" rel="noopener">Powered by Spinel Lab</a></div>' : '');
    document.body.appendChild(win);

    // イベント
    var input = document.getElementById('spinel-input');
    var sendBtn = document.getElementById('spinel-send');
    sendBtn.addEventListener('click', sendMessage);
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });
    input.addEventListener('input', function () {
      this.style.height = 'auto';
      this.style.height = Math.min(this.scrollHeight, 80) + 'px';
    });
  }

  function addWelcomeMessage() {
    appendMessage('bot', config.welcomeMessage);
  }

  function toggleChat() {
    var win = document.getElementById('spinel-chat-window');
    isOpen = !isOpen;
    if (isOpen) {
      win.classList.add('open');
      setTimeout(function () {
        document.getElementById('spinel-input').focus();
        scrollToBottom();
      }, 50);
    } else {
      win.classList.remove('open');
    }
  }

  function appendMessage(type, text) {
    var container = document.getElementById('spinel-messages');
    var div = document.createElement('div');
    div.className = 'spinel-msg ' + type;
    div.textContent = text;
    container.appendChild(div);
    scrollToBottom();
    return div;
  }

  function showTyping() {
    var container = document.getElementById('spinel-messages');
    var div = document.createElement('div');
    div.className = 'spinel-typing';
    div.id = 'spinel-typing';
    div.innerHTML = '<div class="spinel-dot"></div><div class="spinel-dot"></div><div class="spinel-dot"></div>';
    container.appendChild(div);
    scrollToBottom();
  }

  function removeTyping() {
    var el = document.getElementById('spinel-typing');
    if (el) el.remove();
  }

  function scrollToBottom() {
    var container = document.getElementById('spinel-messages');
    if (container) container.scrollTop = container.scrollHeight;
  }

  function setLoading(state) {
    isLoading = state;
    var btn = document.getElementById('spinel-send');
    var input = document.getElementById('spinel-input');
    if (btn) btn.disabled = state;
    if (input) input.disabled = state;
  }

  function sendMessage() {
    if (isLoading) return;
    var input = document.getElementById('spinel-input');
    var text = input.value.trim();
    if (!text) return;

    if (turnCount >= MAX_TURNS) {
      appendMessage('error', 'セッションの上限に達しました。ページを再読み込みして続けてください。');
      return;
    }

    input.value = '';
    input.style.height = 'auto';
    appendMessage('user', text);
    showTyping();
    setLoading(true);

    fetch(baseUrl + '/api/chat/' + botId, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Session-ID': sessionId,
      },
      body: JSON.stringify({ message: text }),
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        removeTyping();
        if (data.error) {
          appendMessage('error', data.error);
        } else {
          appendMessage('bot', data.message);
          turnCount++;
          if (data.sessionId) sessionId = data.sessionId;
        }
      })
      .catch(function () {
        removeTyping();
        appendMessage('error', '通信エラーが発生しました。もう一度お試しください。');
      })
      .finally(function () {
        setLoading(false);
      });
  }
})();
