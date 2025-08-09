// ==UserScript==
// @name         Get HTML Code with Draggable Button
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Get page HTML with a draggable button (mouse & touch support)
// @author       なわ
// @match        *://*/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // ===== ボタン作成 =====
    const btn = document.createElement('button');
    btn.id = 'get-html-btn';
    btn.innerText = 'Get HTML';
    btn.style.position = 'fixed';
    btn.style.top = '10px';
    btn.style.left = '10px';
    btn.style.zIndex = 99999;
    btn.style.padding = '6px 12px';
    btn.style.background = '#ff9800';
    btn.style.color = '#fff';
    btn.style.border = 'none';
    btn.style.borderRadius = '8px';
    btn.style.cursor = 'grab';
    document.body.appendChild(btn);

    // ===== 保存された位置を復元 =====
    const savedPos = JSON.parse(localStorage.getItem('getHtmlBtnPos') || '{}');
    if (savedPos.left) btn.style.left = savedPos.left;
    if (savedPos.top) btn.style.top = savedPos.top;

    // ===== ドラッグ機能（マウス） =====
    let isDragging = false;
    let offsetX, offsetY;

    btn.addEventListener('mousedown', (e) => {
        isDragging = true;
        offsetX = e.clientX - btn.offsetLeft;
        offsetY = e.clientY - btn.offsetTop;
        btn.style.cursor = 'grabbing';
        e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        btn.style.left = (e.clientX - offsetX) + 'px';
        btn.style.top = (e.clientY - offsetY) + 'px';
    });

    document.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            btn.style.cursor = 'grab';
            localStorage.setItem('getHtmlBtnPos', JSON.stringify({
                left: btn.style.left,
                top: btn.style.top
            }));
        }
    });

    // ===== ドラッグ機能（タッチ / iOS対応） =====
    btn.addEventListener('touchstart', (e) => {
        isDragging = true;
        const touch = e.touches[0];
        offsetX = touch.clientX - btn.offsetLeft;
        offsetY = touch.clientY - btn.offsetTop;
        e.preventDefault();
    });

    document.addEventListener('touchmove', (e) => {
        if (!isDragging) return;
        const touch = e.touches[0];
        btn.style.left = (touch.clientX - offsetX) + 'px';
        btn.style.top = (touch.clientY - offsetY) + 'px';
    });

    document.addEventListener('touchend', () => {
        if (isDragging) {
            isDragging = false;
            localStorage.setItem('getHtmlBtnPos', JSON.stringify({
                left: btn.style.left,
                top: btn.style.top
            }));
        }
    });

    // ===== HTML取得機能 =====
    btn.addEventListener('click', () => {
        const html = document.documentElement.outerHTML;
        const blob = new Blob([html], {type: 'text/html'});
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = (document.title || 'page') + '.html';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });

})();
