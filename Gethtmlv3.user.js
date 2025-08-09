// ==UserScript==
// @name         Nawa HTML Grabber UI Draggable
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  ページのHTML取得UI。ボタンとパネルをドラッグ移動可能に、モバイル対応も済み。
// @author       nawa-helper
// @match        *://*/*
// @grant        GM_addStyle
// @grant        none
// @run-at       document-idle
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
    user-select:none;
    touch-action:none;
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
    user-select:none;
    touch-action:none;
  }
  .nawa-panel header {
    display:flex;align-items:center;justify-content:space-between;padding:10px 12px;border-bottom:1px solid #eee;
    background: linear-gradient(180deg,#fafafa,#fff);
    cursor: grab;
    user-select:none;
    touch-action:none;
  }
  .nawa-controls { display:flex; gap:8px; align-items:center; }
  .nawa-controls button { padding:6px 10px; border-radius:8px; border:1px solid #e6e6e6; background:#fafafa; cursor:pointer; user-select:none; }
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

  // header (ドラッグ用ハンドル)
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

  /* ------------------ drag & drop logic ------------------ */

  function makeDraggable(target, storageKey) {
    let dragging = false;
    let offsetX = 0;
    let offsetY = 0;

    function onMouseDown(e) {
      dragging = true;
      offsetX = e.clientX - target.offsetLeft;
      offsetY = e.clientY - target.offsetTop;
      target.style.cursor = 'grabbing';
      e.preventDefault();
    }

    function onMouseMove(e) {
      if (!dragging) return;
      target.style.left = (e.clientX - offsetX) + 'px';
      target.style.top = (e.clientY - offsetY) + 'px';
    }

    function onMouseUp() {
      if (dragging) {
        dragging = false;
        target.style.cursor = 'grab';
        savePos();
      }
    }

    function onTouchStart(e) {
      dragging = true;
      const touch = e.touches[0];
      offsetX = touch.clientX - target.offsetLeft;
      offsetY = touch.clientY - target.offsetTop;
      e.preventDefault();
    }

    function onTouchMove(e) {
      if (!dragging) return;
      const touch = e.touches[0];
      target.style.left = (touch.clientX - offsetX) + 'px';
      target.style.top = (touch.clientY - offsetY) + 'px';
    }

    function onTouchEnd() {
      if (dragging) {
        dragging = false;
        savePos();
      }
    }

    function savePos() {
      localStorage.setItem(storageKey, JSON.stringify({
        left: target.style.left,
        top: target.style.top
      }));
    }

    function restorePos() {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const pos = JSON.parse(saved);
        if (pos.left) target.style.left = pos.left;
        if (pos.top) target.style.top = pos.top;
      }
    }

    // style調整（ドラッグ対象はfixedかabsolute推奨）
    if (getComputedStyle(target).position !== 'fixed' && getComputedStyle(target).position !== 'absolute') {
      target.style.position = 'fixed';
    }
    target.style.cursor = 'grab';
    restorePos();

    // イベント登録
    target.addEventListener('mousedown', onMouseDown);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);

    target.addEventListener('touchstart', onTouchStart, { passive: false });
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('touchend', onTouchEnd);
  }

  // mainBtnをドラッグ可能に（画面右下付近）
  mainBtn.style.right = mainBtn.style.right || '18px';
  mainBtn.style.bottom = mainBtn.style.bottom || '18px';
  mainBtn.style.left = 'auto';
  mainBtn.style.top = 'auto';
  makeDraggable(mainBtn, 'nawaMainBtnPos');

  // panelは右下に表示。ドラッグはheader（ヘッダー部分）だけで行うように制限しやすいのでheaderにドラッグ付ける
  panel.style.right = panel.style.right || '18px';
  panel.style.bottom = panel.style.bottom || '86px';
  panel.style.left = 'auto';
  panel.style.top = 'auto';
  makeDraggable(header, 'nawaPanelPos');

  // 位置復元用にheaderに移動量を反映
  function updatePanelPosFromHeader() {
    const rect = header.getBoundingClientRect();
    panel.style.left = rect.left + 'px';
    panel.style.top = rect.top + 'px';
    panel.style.right = 'auto';
    panel.style.bottom = 'auto';
  }

  // ドラッグ中にパネル本体の位置も更新
  function syncPanelWithHeader() {
    const rect = header.getBoundingClientRect();
    panel.style.left = rect.left + 'px';
    panel.style.top = rect.top + 'px';
    panel.style.right = 'auto';
    panel.style.bottom = 'auto';
  }

  // headerのmousemove/touchmoveイベントを監視してパネルも追従させる
  header.addEventListener('mousedown', () => {
    const onMove = (e) => syncPanelWithHeader();
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', () => {
      document.removeEventListener('mousemove', onMove);
    }, { once: true });
  });
  header.addEventListener('touchstart', () => {
    const onMove = (e) => syncPanelWithHeader();
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('touchend', () => {
      document.removeEventListener('touchmove', onMove);
    }, { once: true });
  });

  // パネルの位置をheaderの位置に同期して復元する処理
  const savedPanelPosRaw = localStorage.getItem('nawaPanelPos');
  if (savedPanelPosRaw) {
    const pos = JSON.parse(savedPanelPosRaw);
    if (pos.left && pos.top) {
      panel.style.left = pos.left;
      panel.style.top = pos.top;
      panel.style.right = 'auto';
      panel.style.bottom = 'auto';
      // headerも合わせる
      header.style.left = pos.left;
      header.style.top = pos.top;
    }
  }

  /* ------------------ 以下は元のUIロジック ------------------ */

  // helper関数
  function setStatus(s) {
    status.textContent = s;
  }

  let mode = 'page'; // 'page' | 'select'
  let lastHtml = '';
  let selectionActive = false;
  let highlightedEl = null;
  const status = header.querySelector('#nawa-status');
  const textArea = panel.querySelector('#nawa-text');

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
    e.preventDefault();
    e.stopPropagation();
    const target = e.target;
    if (!target) return;
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
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'h') {
      e.preventDefault();
      panel.style.display === 'none' ? openPanel() : closePanel();
    }
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 's') {
      e.preventDefault();
      setMode('select');
      if (panel.style.display === 'none') openPanel();
    }
  });

  // auto-remove highlight on unload
  window.addEventListener('beforeunload', () => {
    if (highlightedEl) highlightedEl.classList.remove('nawa-highlight');
  });

})();
