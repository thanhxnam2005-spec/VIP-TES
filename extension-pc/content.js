(function() {
  'use strict';
  let sent = false;
  let lastContentHash = '';
  let currentUrl = location.href;

  const cleanText = (text) => {
    return (text || '')
      .replace(/[\u200B\u200C\u200D\uFEFF]/g, '')
      .replace(/@Bạn đang đọc bản lưu trong hệ thống/g, '')
      .replace(/Bạn đang xem văn bản gốc chưa dịch, có thể kéo xuống cuối trang để chọn bản dịch\./g, '')
      .replace(/Đang tải nội dung chương\.\.\./g, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  };

  const isFanqie = () => location.href.includes('fanqienovel.com');

  const doExtract = () => {
    if (isFanqie()) {
      // Try multiple selectors for Fanqie content
      const selectors = ['.muye-reader-content', '.reader-content', '.article-content', '#content'];
      let box = null;
      for (const sel of selectors) {
        box = document.querySelector(sel);
        if (box && box.textContent.trim().length > 0) break;
      }
      if (!box) {
        console.log('[STV] Fanqie: No content container found');
        return '';
      }
      const clone = box.cloneNode(true);
      clone.querySelectorAll("script, style, .bottom-ad, iframe, .nav, .footer, .reader-toolbar").forEach(el => el.remove());
      let html = clone.innerHTML.replace(/<br\s*\/?>/gi, '\n').replace(/<p[^>]*>/gi, '\n').replace(/<\/p>/gi, '\n');
      const temp = document.createElement('div');
      temp.innerHTML = html;
      const text = cleanText(temp.textContent);
      console.log('[STV] Fanqie doExtract result length:', text.length);
      return text;
    }
    // STV extraction
    const box = document.querySelector('#content-container .contentbox');
    if (!box) return '';
    const inner = cleanText(box.innerText);
    let obf = '';
    box.querySelectorAll('i').forEach(el => {
      if ((el.id && el.id.startsWith('ran')) || el.id?.startsWith('exran') || el.hasAttribute('h') || el.hasAttribute('t') || el.hasAttribute('v')) {
        obf += el.textContent;
      }
    });
    obf = cleanText(obf);
    return obf.length > inner.length ? obf : inner;
  };

  const getTitle = () => {
    if (isFanqie()) {
      // Try multiple selectors for chapter title
      const titleEl = document.querySelector('.muye-reader-title, .reader-header-title, h1');
      if (titleEl) return titleEl.textContent?.trim() || '';
    }
    return (document.title || '').split(/\s+-\s+/)[0]?.trim() || '';
  };

  const sendToBackground = (content) => {
    if (content.length < 1) return;
    const newHash = content.substring(0, 100);
    if (sent && lastContentHash === newHash) return;
    sent = true;
    lastContentHash = newHash;
    const title = getTitle();
    console.log('[STV] Sending content to background, length:', content.length, 'title:', title);
    chrome.runtime.sendMessage({
      type: "STV_CONTENT_READY",
      content,
      title,
      url: location.href,
      length: content.length
    });
  };

  const findFanqieNextButton = () => {
    // Method 1: CSS selectors for known next-chapter buttons
    const cssCandidates = [
      '.page-next',
      '.muye-reader-next',
      '.reader-next',
      '.next-chapter',
      '[class*="next"]',
    ];
    for (const sel of cssCandidates) {
      const el = document.querySelector(sel);
      if (el) {
        const txt = (el.textContent || '').trim();
        // Make sure it's actually a "next" button, not random element
        if (txt.includes('下一章') || txt.includes('下一页') || txt.includes('Next') || txt === '' || el.tagName === 'A') {
          console.log('[STV] Fanqie next found via CSS selector:', sel, 'text:', txt);
          return el;
        }
      }
    }

    // Method 2: Search ALL clickable elements for Chinese "next chapter" text
    const allClickable = document.querySelectorAll('a, button, div[role="button"], span[role="button"]');
    for (const el of allClickable) {
      const txt = (el.textContent || '').trim();
      if (txt.includes('下一章') || txt.includes('下一页')) {
        console.log('[STV] Fanqie next found via text search:', txt);
        return el;
      }
    }

    // Method 3: Broader search including divs and spans
    const broader = document.querySelectorAll('a, div, button, span');
    for (const el of broader) {
      const txt = (el.textContent || '').trim();
      if (txt === '下一章' || txt === '下一页') {
        console.log('[STV] Fanqie next found via broad text match:', txt);
        return el;
      }
    }

    // Method 4: Look for navigation links around the reader area
    const readerNav = document.querySelector('.muye-reader-bar, .reader-toolbar, .reader-bottom, .bottom-bar');
    if (readerNav) {
      const links = readerNav.querySelectorAll('a, button, div, span');
      for (const el of links) {
        const txt = (el.textContent || '').trim();
        if (txt.includes('下一') || txt.includes('next')) {
          console.log('[STV] Fanqie next found in reader nav:', txt);
          return el;
        }
      }
    }

    return null;
  };

  const clickNextChapter = () => {
    if (isFanqie()) {
      const nextBtn = findFanqieNextButton();
      if (nextBtn) {
        console.log('[STV] Clicking Fanqie next button');
        sent = false;
        lastContentHash = '';
        nextBtn.click();
        return true;
      }
      console.log('[STV] ERROR: Fanqie next button not found! Trying keyboard shortcut...');
      // Fallback: Try keyboard navigation (some reader UIs support arrow keys)
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', code: 'ArrowRight', keyCode: 39, bubbles: true }));
      sent = false;
      lastContentHash = '';
      return true; // Assume it might work
    }
    // STV
    const links = document.querySelectorAll('a');
    for (const a of links) {
      const text = (a.textContent || '').trim();
      if (text.includes('Chương sau')) {
        console.log('[STV] Found STV next chapter link, clicking:', text);
        sent = false;
        lastContentHash = '';
        a.click();
        return true;
      }
    }
    return false;
  };

  const autoExtract = () => {
    const content = doExtract();
    if (content.length > 0) {
      const newHash = content.substring(0, 100);
      if (sent && lastContentHash === newHash) return;
      console.log('[STV] autoExtract found content, length:', content.length);
      sendToBackground(content);
    }
  };

  // Detect URL changes (SPA navigation) and reset sent flag
  const checkUrlChange = () => {
    if (location.href !== currentUrl) {
      console.log('[STV] URL changed from', currentUrl, 'to', location.href);
      currentUrl = location.href;
      sent = false;
      lastContentHash = '';
      // Re-poll after URL change with increasing delays
      for (let i = 0; i < 20; i++) {
        setTimeout(autoExtract, 300 + i * 500);
      }
    }
  };

  // Observe DOM changes to auto-extract when SPA navigates
  const observer = new MutationObserver(() => {
    checkUrlChange();
    setTimeout(autoExtract, 300);
  });
  if (document.body) {
    observer.observe(document.body, { childList: true, subtree: true });
  }

  // Also poll for URL changes (some SPAs change URL without DOM mutation)
  setInterval(checkUrlChange, 1500);

  const startPolling = () => {
    for (let i = 0; i < 20; i++) {
      setTimeout(autoExtract, 300 + i * 500);
    }
  };
  startPolling();

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg.type === "EXTRACT_NOW") {
      console.log('[STV] Received EXTRACT_NOW, page:', location.href);
      sent = false;
      lastContentHash = '';
      const tryExtract = (n) => {
        if (n <= 0) {
          console.log('[STV] EXTRACT_NOW failed after retries');
          sendResponse({ content: '', length: 0 });
          return;
        }
        const content = doExtract();
        if (content.length > 0) {
          console.log('[STV] EXTRACT_NOW success, length:', content.length);
          const title = getTitle();
          sendResponse({ content, title, length: content.length, url: location.href });
        } else {
          console.log('[STV] EXTRACT_NOW retry, remaining:', n - 1, 'current length:', content.length);
          setTimeout(() => tryExtract(n - 1), 300);
        }
      };
      setTimeout(() => tryExtract(25), 100);
      return true;
    }
    if (msg.type === "GO_NEXT") {
      console.log('[STV] Received GO_NEXT');
      sent = false;
      lastContentHash = '';
      const ok = clickNextChapter();
      sendResponse({ ok });
      // After clicking next, start polling for new content
      if (ok) {
        for (let i = 0; i < 25; i++) {
          setTimeout(autoExtract, 500 + i * 500);
        }
      }
      return false;
    }
  });

  console.log('[STV] Content script loaded on:', location.href);
  chrome.runtime.sendMessage({ type: "STV_PAGE_LOADED", url: location.href });
})();