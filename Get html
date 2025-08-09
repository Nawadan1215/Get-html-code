// ==UserScript==
// @name         Nawa HTML Grabber UI
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  ページのHTMLを簡単に取得・表示・コピー・ダウンロード・要素選択できる軽量UI
// @author       nawa-helper
// @match        *://*/*
// @grant        GM_addStyle
// @grant        none
// @run-at       document-idle
// @license      MIT
// ==/UserScript==

(function () {
  'use strict';

  /* ------------------ styles ------------------ */
  const css = `
  .nawa-ui-btn {
    position: fixed;
    right: 18px;
    bottom: 18px;
    z-index: 2147483646;
    background:#0b84ff;
    color:#fff;
    border-radius:50%;
    width:56px;height:56px;
    border:none;
    display:flex;align-items:center;justify-content:center;
    font-weight:700;box-shadow:0 6px 18px rgba(0,0,0,0.2);
    cursor:pointer;
  }
  .nawa-panel {
    position: fixed;
    right: 18px;
    bottom: 86px;
    width: 720px;
    max-width: calc(100% - 40px);
    max-height: 70vh;
    background: #ffffff;
    color: #222;
    z-index: 2147483646;
    border-radius: 12px;
    box-shadow: 0 10px 30px rgba(0,0,0,0.25);
    overflow: hidden;
    display: flex;
    flex-direction: column;
    font-family: Inter, system-ui, -apple-system, "Helvetica Neue", Arial;
  }
  .nawa-panel header {
    display:flex;align-items:center;justify-content:space-between;padding:10px 12px;border-bottom:1px solid #eee;
    background: linear-gradient(180deg,#fafafa,#fff);
  }
  .nawa-controls { display:flex; gap:8px; align-items:center; }
  .nawa-controls button { padding:6px 10px; border-radius:8px; border:1px solid #e6e6e6; background:#fafafa; cursor:pointer; }
  .nawa-panel .body { padding:10px; overflow:auto; flex:1; background:#f7f9fc; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, "Roboto Mono", "Helvetica Neue", monospace; font-size:13px; }
  .nawa-panel .footer { padding:10px;border-top:1px solid #eee; display:flex; gap:8px; justify-content:flex-end; background:#fff; }
  .nawa-textarea { width:100%; height:100%; min-height:240px; border: none; background: transparent; resize: vertical; color: #111; outline: none; }
  .nawa-small { font-size:12px; opacity:0.8 }
  .nawa-highlight { outline: 3px dashed rgba(255,165,0,0.9) !important; background: rgba(255,235,205,0.2) !important; }
  .nawa-badge { background:#0b84ff;color:#fff;padding:4px 8px;border-radius:8px;font-size:12px }
  `;

  // inject style
  if (typeof GM_addStyle === 'function') {
    GM_addStyle(css);
  } else {
    const s = document.createElement('style');
    s.textContent = css;
    document.head.appendChild(s);
  }

  /* ------------------ helper DOM ------------------ */
  function el(tag, props = {}, ...children) {
    const e = document.createElement(tag);
    Object.entries(props).forEach(([k, v]) => {
      if (k === 'class') e.className = v;
      else if (k === 'html') e.innerHTML = v;
      else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v);
    });
    children.forEach(c => {
      if (c == null) return;
      e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return e;
  }

  // main button
  const mainBtn = el('button', { class: 'nawa-ui-btn', title: 'HTML Grabber' }, 'HTML');
  document.body.appendChild(mainBtn);

  // panel (hidden initially)
  const panel = el('div', { class: 'nawa-panel', style: 'display:none' });

  // header
  const header = el('header', {},
    el('div', {}, el('strong', {}, 'HTML Grabber')),
    el('div', { class: 'nawa-controls' },
      el('button', { id: 'nawa-mode-page', onclick: () => setMode('page') }, 'ページ全体'),
      el('button', { id: 'nawa-mode-select', onclick: () => setMode('select') }, '要素選択'),
      el('span', { class: 'nawa-badge', id: 'nawa-status' }, '準備OK')
    )
  );

  // body (textarea)
  const body = el('div', { class: 'body' },
    el('textarea', { id: 'nawa-text', class: 'nawa-textarea', readonly: true })
  );

  // footer buttons
  const footer = el('div', { class: 'footer' },
    el('button', { id: 'nawa-copy' }, 'コピー'),
    el('button', { id: 'nawa-download' }, 'ダウンロード'),
    el('button', { id: 'nawa-refresh' }, '更新'),
    el('button', { id: 'nawa-close' }, '閉じる')
  );

  panel.appendChild(header);
  panel.appendChild(body);
  panel.appendChild(footer);
  document.body.appendChild(panel);

  /* ------------------ logic ------------------ */
  let mode = 'page'; // 'page' | 'select'
  let lastHtml = '';
  let selectionActive = false;
  let highlightedEl = null;
  const status = header.querySelector('#nawa-status');
  const textArea = panel.querySelector('#nawa-text');

  function setStatus(s) {
    status.textContent = s;
  }

  function setMode(m) {
    mode = m;
    setStatus(m === 'page' ? 'ページモード' : '要素選択モード');
    // update button styles
    header.querySelectorAll('button').forEach(btn => btn.style.opacity = '1');
    if (m === 'page') {
      header.querySelector('#nawa-mode-select').style.opacity = '0.6';
    } else {
      header.querySelector('#nawa-mode-page').style.opacity = '0.6';
    }
    if (m === 'page') {
      deactivateSelection();
      refreshPageHtml();
    } else {
      activateSelection();
    }
  }

  function openPanel() {
    panel.style.display = 'flex';
    refreshPageHtml();
  }
  function closePanel() {
    panel.style.display = 'none';
    deactivateSelection();
  }

  mainBtn.addEventListener('click', () => {
    panel.style.display === 'none' ? openPanel() : closePanel();
  });

  panel.querySelector('#nawa-close').addEventListener('click', closePanel);

  // refresh page HTML (include doctype)
  function getPageHTML() {
    // capture doctype
    let doctype = '';
    const dt = [...document.childNodes].find(n => n.nodeType === Node.DOCUMENT_TYPE_NODE);
    if (dt) {
      doctype = `<!DOCTYPE ${dt.name}${dt.publicId ? ` PUBLIC "${dt.publicId}"` : ''}${dt.systemId ? ` "${dt.systemId}"` : ''}>\n`;
    }
    // use outerHTML of documentElement to capture current DOM state
    const html = document.documentElement.outerHTML;
    return doctype + html;
  }

  function refreshPageHtml() {
    try {
      const html = getPageHTML();
      lastHtml = html;
      textArea.value = html;
      setStatus('取得完了 — サイズ: ' + Math.round(new Blob([html]).size / 1024) + ' KB');
    } catch (e) {
      textArea.value = `取得失敗: ${e.message}`;
      setStatus('エラー');
      console.error(e);
    }
  }

  panel.querySelector('#nawa-refresh').addEventListener('click', () => {
    if (mode === 'page') refreshPageHtml();
  });

  // copy
  panel.querySelector('#nawa-copy').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(textArea.value);
      setStatus('クリップボードにコピーしました');
      flashTemporary(status, 'green');
    } catch (e) {
      setStatus('コピー失敗（ブラウザの権限を確認して）');
      console.error(e);
      flashTemporary(status, 'red');
    }
  });

  // download as file
  panel.querySelector('#nawa-download').addEventListener('click', () => {
    const name = (document.location.hostname || 'page') + '-' + (new Date()).toISOString().replace(/[:.]/g, '-') + '.html';
    const blob = new Blob([textArea.value], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setStatus('ダウンロード開始');
  });

  function flashTemporary(node, color) {
    const old = node.style.background;
    node.style.transition = 'background 0.2s';
    node.style.background = color === 'green' ? 'rgba(0,200,0,0.1)' : 'rgba(200,0,0,0.08)';
    setTimeout(() => node.style.background = old, 700);
  }

  /* ------------------ element selection mode ------------------ */
  function activateSelection() {
    if (selectionActive) return;
    selectionActive = true;
    setStatus('要素選択: ホバー→クリックで抽出、Escで終了');
    document.addEventListener('mousemove', onMouseMove, true);
    document.addEventListener('click', onClickSelect, true);
    document.addEventListener('keydown', onKeyDown, true);
  }

  function deactivateSelection() {
    if (!selectionActive) return;
    selectionActive = false;
    setStatus('選択解除');
    document.removeEventListener('mousemove', onMouseMove, true);
    document.removeEventListener('click', onClickSelect, true);
    document.removeEventListener('keydown', onKeyDown, true);
    if (highlightedEl) {
      highlightedEl.classList.remove('nawa-highlight');
      highlightedEl = null;
    }
  }

  function onMouseMove(e) {
    const elUnder = e.target;
    if (elUnder === panel || panel.contains(elUnder) || elUnder === mainBtn) {
      // don't highlight the UI elements
      if (highlightedEl) {
        highlightedEl.classList.remove('nawa-highlight');
        highlightedEl = null;
      }
      return;
    }
    if (highlightedEl && highlightedEl !== elUnder) {
      highlightedEl.classList.remove('nawa-highlight');
      highlightedEl = null;
    }
    if (elUnder && elUnder.nodeType === 1) {
      highlightedEl = elUnder;
      highlightedEl.classList.add('nawa-highlight');
    }
  }

  function onClickSelect(e) {
    if (!selectionActive) return;
    // prevent links/forms from activating
    e.preventDefault();
    e.stopPropagation();
    const target = e.target;
    if (!target) return;
    // avoid capturing our UI
    if (panel.contains(target) || target === mainBtn) return;
    const html = target.outerHTML;
    textArea.value = html;
    lastHtml = html;
    setStatus('要素取得: ' + describeElement(target));
    deactivateSelection();
  }

  function onKeyDown(e) {
    if (e.key === 'Escape') {
      deactivateSelection();
      setMode('page');
    }
  }

  function describeElement(el) {
    let s = el.tagName.toLowerCase();
    if (el.id) s += `#${el.id}`;
    if (el.classList && el.classList.length) s += `.${[...el.classList].slice(0,3).join('.')}`;
    return s;
  }

  // initial mode
  setMode('page');

  // keyboard shortcuts
  window.addEventListener('keydown', (e) => {
    // Ctrl+Shift+H toggle panel
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'h') {
      e.preventDefault();
      panel.style.display === 'none' ? openPanel() : closePanel();
    }
    // Ctrl+Shift+S => element select
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 's') {
      e.preventDefault();
      setMode('select');
      if (panel.style.display === 'none') openPanel();
    }
  });

  // auto-hide when leaving page to avoid lingering highlight class if any
  window.addEventListener('beforeunload', () => {
    if (highlightedEl) highlightedEl.classList.remove('nawa-highlight');
  });

})();
