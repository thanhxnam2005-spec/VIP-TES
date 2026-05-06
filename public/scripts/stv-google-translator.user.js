// ==UserScript==
// @name         STV Realtime Translator (Google Edition)
// @namespace    http://sangtacviet.com/
// @version      1.7.5
// @description  Dịch tự động trang web sử dụng Google Translate API. Tối ưu bởi thuyetthucac.
// @author       thuyetthucac
// @match        *://*/*
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    // Settings & State
    const settings = {
        enable: GM_getValue("enable", true),
        targetLang: GM_getValue("targetLang", "vi"),
        heightauto: GM_getValue("heightauto", true),
        widthauto: GM_getValue("widthauto", false),
        scaleauto: GM_getValue("scaleauto", true),
        enableajax: GM_getValue("enableajax", false),
        enablescript: GM_getValue("enablescript", true),
        strictarial: GM_getValue("strictarial", false),
        delaytrans: GM_getValue("delaytrans", 120),
        delaymutation: GM_getValue("delaymutation", 200),
    };

    GM_registerMenuCommand("Bật/Tắt dịch (" + (settings.enable ? "Bật" : "Tắt") + ")", () => {
        GM_setValue("enable", !settings.enable);
        location.reload();
    });

    GM_registerMenuCommand("Chọn ngôn ngữ đích (" + settings.targetLang + ")", () => {
        let lang = prompt("Nhập mã ngôn ngữ (vi, en, ja, ko...):", settings.targetLang);
        if (lang) {
            GM_setValue("targetLang", lang);
            location.reload();
        }
    });

    // --- Helper Functions ---
    function g(i) { return document.getElementById(i); }
    function q(i) { return document.querySelectorAll(i); }

    function checkOverflow(el, stl) {
        stl = stl || getComputedStyle(el);
        var curOverflow = stl.overflow;
        if (curOverflow == "auto" || curOverflow == "hidden") return false;
        return el.clientWidth < el.scrollWidth || el.clientHeight < el.scrollHeight;
    }

    const chineseRegex = /[\u3400-\u9FBF]/;

    // --- Google Translate API ---
    async function translateWithGoogle(text) {
        if (!text.trim()) return text;
        const chunks = splitTextToChunks(text, 4000);
        let results = [];
        
        for (const chunk of chunks) {
            results.push(await callGoogleAPI(chunk));
        }
        
        return results.join("");
    }

    function splitTextToChunks(text, limit) {
        const segments = text.split("=|==|=");
        const chunks = [];
        let current = [];
        let currentLen = 0;
        
        for (const seg of segments) {
            if (currentLen + seg.length > limit && current.length > 0) {
                chunks.push(current.join("=|==|="));
                current = [];
                currentLen = 0;
            }
            current.push(seg);
            currentLen += seg.length + 5; // 5 is separator length
        }
        if (current.length > 0) chunks.push(current.join("=|==|="));
        return chunks;
    }

    function callGoogleAPI(text) {
        return new Promise((resolve) => {
            const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${settings.targetLang}&dt=t&q=${encodeURIComponent(text)}`;
            GM_xmlhttpRequest({
                method: "GET",
                url: url,
                onload: (res) => {
                    try {
                        const data = JSON.parse(res.responseText);
                        // Google returns array of parts. Join them but preserve our delimiters.
                        const translated = data[0].map(part => part[0]).join("");
                        resolve(translated);
                    } catch (e) {
                        resolve(text);
                    }
                },
                onerror: () => resolve(text)
            });
        });
    }

    // --- Translation Logic ---
    let realtimeTranslateLock = false;

    function recurTraver(node, arr, tarr) {
        if (!node) return;
        for (let i = 0; i < node.childNodes.length; i++) {
            let child = node.childNodes[i];
            if (child.nodeType == 3) {
                if (chineseRegex.test(child.textContent)) {
                    arr.push(child);
                    tarr.push(child.textContent);
                }
            } else if (child.tagName != "SCRIPT" && child.tagName != "STYLE") {
                recurTraver(child, arr, tarr);
            }
        }
        if (node.shadowRoot) {
            monitorShadowRootMutation(node.shadowRoot);
            recurTraver(node.shadowRoot, arr, tarr);
        }
    }

    async function realtimeTranslate() {
        if (realtimeTranslateLock || !settings.enable) return;
        
        realtimeTranslateLock = true;
        setTimeout(() => { realtimeTranslateLock = false; }, settings.delaytrans);

        const totranslist = [];
        const transtext = [];
        
        // Scan title and body
        const titleNode = q("title")[0];
        if (titleNode) recurTraver(titleNode, totranslist, transtext);
        recurTraver(document.body, totranslist, transtext);

        if (totranslist.length > 0) {
            const joinedText = transtext.join("=|==|=");
            const translatedJoined = await translateWithGoogle(joinedText);
            const translateds = translatedJoined.split("=|==|=");

            for (let i = 0; i < totranslist.length; i++) {
                if (translateds[i]) {
                    totranslist[i].orgn = transtext[i];
                    totranslist[i].textContent = translateds[i].trim();
                }
            }
            
            if (settings.scaleauto || settings.heightauto || settings.widthauto) {
                removeOverflow();
            }
        }
    }

    // --- UI Fixes (Overflow & Scaling) ---
    function removeOverflow() {
        // Simplified version of the extension's overflow remover
        q("div, section, main, article").forEach(el => {
            if (el.getAttribute("data-translated-scaled")) return;
            const stl = getComputedStyle(el);
            if (checkOverflow(el, stl)) {
                if (settings.heightauto) el.style.height = "auto";
                if (settings.widthauto) el.style.width = "auto";
                el.setAttribute("data-translated-scaled", "true");
            }
        });
    }

    // --- Mutation Observer ---
    function monitorShadowRootMutation(shadowRoot) {
        if (shadowRoot._observed) return;
        const observer = new MutationObserver(() => {
            setTimeout(realtimeTranslate, settings.delaymutation);
        });
        observer.observe(shadowRoot, { childList: true, subtree: true, characterData: true });
        shadowRoot._observed = true;
    }

    function startMutationObserver() {
        const observer = new MutationObserver(() => {
            setTimeout(realtimeTranslate, settings.delaymutation);
        });
        observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    }

    // --- Init ---
    function init() {
        if (!settings.enable) return;
        
        // Initial translation
        setTimeout(realtimeTranslate, 500);
        
        if (settings.enablescript) {
            if (document.body) startMutationObserver();
            else document.addEventListener("DOMContentLoaded", startMutationObserver);
        }

        // Apply font fix
        const style = document.createElement("style");
        style.textContent = `
            :not(i):not(.fa):not(.glyphicon) { 
                font-family: "Segoe UI", Roboto, Arial, sans-serif !important; 
            }
        `;
        document.head.appendChild(style);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }

})();
