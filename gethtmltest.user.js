// ==UserScript==
// @name         Draggable Get HTML Button with iOS Support
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  ドラッグ可能でiOSのタッチ操作にも対応したGet HTMLボタン
// @match        *://*/*
// @grant        none
// ==/UserScript==

(function() {
  'use strict';

  const btn = document.createElement('button');
  btn.textContent = 'Get HTML';
  btn.style.position = 'fixed';
  btn.style.top = '20px';
  btn.style.left = '20px';
  btn.style.zIndex = 999999;
  btn.style.padding = '8px 12px';
  btn.style.backgroundColor = '#f39c12';
  btn.style.color = 'white';
  btn.style.border = 'none';
  btn.style.borderRadius = '6px';
  btn.style.cursor = 'grab';
  document.body.appendChild(btn);

  let dragging = false;
  let offsetX, offsetY;

  // マウス用ドラッグ開始
  btn.addEventListener('mousedown', e => {
    dragging = true;
    offsetX = e.clientX - btn.offsetLeft;
    offsetY = e.clientY - btn.offsetTop;
    btn.style.cursor = 'grabbing';
    e.preventDefault();
  });

  // マウス移動
  document.addEventListener('mousemove', e => {
    if (!dragging) return;
    btn.style.left = (e.clientX - offsetX) + 'px';
    btn.style.top = (e.clientY - offsetY) + 'px';
  });

  // マウス終了
  document.addEventListener('mouseup', () => {
    if (dragging) {
      dragging = false;
      btn.style.cursor = 'grab';
      localStorage.setItem('btnPos', JSON.stringify({left: btn.style.left, top: btn.style.top}));
    }
  });

  // タッチ用ドラッグ開始
  btn.addEventListener('touchstart', e => {
    dragging = true;
    const touch = e.touches[0];
    offsetX = touch.clientX - btn.offsetLeft;
    offsetY = touch.clientY - btn.offsetTop;
    e.preventDefault();
  });

  // タッチ移動
  document.addEventListener('touchmove', e => {
    if (!dragging) return;
    const touch = e.touches[0];
    btn.style.left = (touch.clientX - offsetX) + 'px';
    btn.style.top = (touch.clientY - offsetY) + 'px';
  }, { passive: false });

  // タッチ終了
  document.addEventListener('touchend', () => {
    if (dragging) {
      dragging = false;
      localStorage.setItem('btnPos', JSON.stringify({left: btn.style.left, top: btn.style.top}));
    }
  });

  // 位置復元
  const saved = localStorage.getItem('btnPos');
  if (saved) {
    const pos = JSON.parse(saved);
    if (pos.left) btn.style.left = pos.left;
    if (pos.top) btn.style.top = pos.top;
  }

  // ボタンクリック（ドラッグ中は無効化）
  btn.addEventListener('click', e => {
    if (dragging) return;
    const html = document.documentElement.outerHTML;
    const blob = new Blob([html], {type: 'text/html'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'page.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
  });

})();
