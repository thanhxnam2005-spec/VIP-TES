// Novel Studio Shield - Background Service Worker

chrome.runtime.onMessageExternal.addListener((request, sender, sendResponse) => {
  if (request.type === "PING") {
    sendResponse({ ok: true, version: chrome.runtime.getManifest().version });
    return false;
  }

  if (request.type === "FETCH") {
    handleFetch(request)
      .then(res => sendResponse({ ok: true, ...res }))
      .catch(err => sendResponse({ ok: false, error: err.message }));
    return true; 
  }
});

async function handleFetch({ url, waitSelector, clickSelector, timeout = 15000 }) {
  if (!url || !url.startsWith('http')) {
    throw new Error("URL không hợp lệ. Chỉ hỗ trợ các liên kết bắt đầu bằng http/https.");
  }

  // Ensure strings are not undefined
  const safeWaitSelector = waitSelector || null;
  const safeClickSelector = clickSelector || null;

  const tab = await chrome.tabs.create({ url, active: false });
  const tabId = tab.id;

  try {
    await waitForLoad(tabId, timeout);

    await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
        window.chrome = { runtime: {} };
      }
    });

    await delay(1000 + Math.random() * 1000);
    
    // Human behavior & Lazy load trigger
    await chrome.scripting.executeScript({
      target: { tabId },
      func: async () => {
        window.scrollTo({ top: document.body.scrollHeight / 2, behavior: 'smooth' });
        await new Promise(r => setTimeout(r, 500));
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
        await new Promise(r => setTimeout(r, 800));
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });

    if (safeClickSelector) {
      await chrome.scripting.executeScript({
        target: { tabId },
        args: [safeClickSelector],
        func: (sel) => {
          if (!sel) return;
          const el = document.querySelector(sel);
          if (el) el.click();
        }
      });
      await delay(1000);
    }

    let timedOut = false;
    if (safeWaitSelector) {
      timedOut = await waitForSelector(tabId, safeWaitSelector, timeout);
    } else {
      await delay(1500);
    }

    const results = await chrome.scripting.executeScript({
      target: { tabId },
      args: [safeWaitSelector],
      func: (sel) => {
        const html = document.documentElement.outerHTML;
        let contentText = "";
        if (sel) {
          const el = document.querySelector(sel);
          if (el) contentText = el.innerText;
        } else {
          contentText = document.body.innerText;
        }
        return { html, contentText };
      }
    });

    return { ...results[0].result, timedOut };

  } finally {
    if (tabId) chrome.tabs.remove(tabId).catch(() => {});
  }
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

function waitForLoad(tabId, timeout) {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, timeout);
    function listener(id, info) {
      if (id === tabId && info.status === "complete") {
        chrome.tabs.onUpdated.removeListener(listener);
        clearTimeout(timer);
        resolve();
      }
    }
    chrome.tabs.onUpdated.addListener(listener);
  });
}

async function waitForSelector(tabId, selector, timeout) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      const res = await chrome.scripting.executeScript({
        target: { tabId },
        args: [selector],
        func: (sel) => !!document.querySelector(sel)
      });
      if (res[0].result) return false;
    } catch (e) {}
    await delay(1000);
  }
  return true; 
}
