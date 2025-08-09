// ==UserScript==
// @name         Simple Draggable Get HTML Button
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  シンプルなドラッグ可能なGet HTMLボタン
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

  btn.addEventListener('mousedown', e => {
    dragging = true;
    offsetX = e.clientX - btn.offsetLeft;
    offsetY = e.clientY - btn.offsetTop;
    btn.style.cursor = 'grabbing';
    e.preventDefault();
  });

  document.addEventListener('mouseup', () => {
    if (dragging) {
      dragging = false;
      btn.style.cursor = 'grab';
      // 位置保存
      localStorage.setItem('btnPos', JSON.stringify({left: btn.style.left, top: btn.style.top}));
    }
  });

  document.addEventListener('mousemove', e => {
    if (!dragging) return;
    btn.style.left = (e.clientX - offsetX) + 'px';
    btn.style.top = (e.clientY - offsetY) + 'px';
  });

  // 位置復元
  const saved = localStorage.getItem('btnPos');
  if (saved) {
    const pos = JSON.parse(saved);
    if (pos.left) btn.style.left = pos.left;
    if (pos.top) btn.style.top = pos.top;
  }

  // ボタン押したらHTML取得してダウンロード
  btn.addEventListener('click', () => {
    if (dragging) return; // ドラッグ中のクリックを防止
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
