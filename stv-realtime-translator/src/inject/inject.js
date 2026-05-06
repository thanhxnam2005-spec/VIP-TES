/**
 * Browser Screen Translator v2.0.0
 * Auto-translate web pages from Chinese, English, Japanese, Korean to Vietnamese
 * Uses Google Translate API for multi-language support
 */

function g(i) { return document.getElementById(i); }
function q(i) { return document.querySelectorAll(i); }

function checkOverflow(el, stl) {
	stl = stl || getComputedStyle(el);
	var curOverflow = stl.overflow;
	if (curOverflow == "auto" || curOverflow == "hidden") return false;
	return el.clientWidth < el.scrollWidth || el.clientHeight < el.scrollHeight;
}

function isIgnore(el) {
	if (el.id == "surf-menubar" || el.id == "mainbar") return true;
	return false;
}

function showBtn() {
	var btn = document.createElement("button");
	btn.setAttribute("style", "display:block;position:fixed;bottom:20%;right:5px;width:40px;height:40px;background-color:#eaeaea80;border-radius:50%;font-size:12px;text-align:center;z-index:99999999;");
	btn.innerHTML = "Dịch";
	btn.onclick = function() { realtimeTranslate(true, true); }
	document.body.appendChild(btn);
}

var setting = {
	enable: true,
	heightauto: true,
	widthauto: false,
	scaleauto: true,
	enableajax: false,
	enablescript: true,
	strictarial: false,
	targetLang: "vi",
	translateMode: "google"
}

var namedata = "";
var namedatacache = null;

function replaceName(text) {
	var t = text;
	if (namedatacache) {
		for (var i = 0; i < namedatacache.length; i++) {
			t = t.replace(namedatacache[i][0], namedatacache[i][1]);
		}
		return t;
	}
	namedatacache = [];
	var n = namedata.split("\n");
	for (var i = 0; i < n.length; i++) {
		var m = n[i].trim().split("=");
		if (m[0] && m[1]) {
			var r = new RegExp(m[0], "g");
			namedatacache.push([r, m[1]]);
			t = t.replace(r, m[1]);
		}
	}
	return t;
}

chrome.storage.sync.get([
	"enable", "heightauto", "widthauto", "scaleauto",
	"enableajax", "enablescript", "strictarial",
	"delaytrans", "delaymutation", "showbtn",
	"namedata", "excludes", "targetLang", "translateMode"
], function(result) {
	for (var settingName in result) {
		if (settingName == "delaytrans") {
			translateDelay = parseInt(result[settingName]);
		} else if (settingName == "delaymutation") {
			deferDelay = parseInt(result[settingName]);
		} else if (settingName == "showbtn") {
			if (result[settingName] == "true") showBtn();
		} else if (settingName == "namedata") {
			namedata = result[settingName];
		} else if (settingName == "targetLang") {
			setting.targetLang = result[settingName] || "vi";
		} else if (settingName == "translateMode") {
			setting.translateMode = result[settingName] || "google";
		} else if (settingName == "excludes") {
			if (setting.enable) {
				var pageDomain = location.hostname;
				var excludes = result[settingName].split("\n").map(function(e) { return e.trim(); }).filter(function(e) { return e.length > 0; });
				if (excludes.indexOf(pageDomain) >= 0) {
					setting.enable = false;
					console.log("[BST] Page excluded: " + pageDomain);
				}
			}
		} else {
			if (result[settingName] == "false") {
				setting[settingName] = false;
			} else {
				setting[settingName] = true;
			}
		}
	}
	startScript();
});

// --- Language Detection ---
// Chinese: CJK Unified Ideographs
var chineseRegex = /[\u3400-\u9FBF]/;
// Foreign text: Chinese, Japanese (Hiragana, Katakana), Korean
var foreignRegex = /[\u3400-\u9FBF\u3040-\u309F\u30A0-\u30FF\uAC00-\uD7AF]/;
// English/Latin text (non-Vietnamese detection)
var englishRegex = /[a-zA-Z]{3,}/;
// Vietnamese specific characters
var vietnameseRegex = /[àáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵđ]/i;

/**
 * Check if text is foreign (non-Vietnamese) and needs translation
 */
function isForeignText(text) {
	if (!text || text.trim().length < 2) return false;
	var trimmed = text.trim();

	// If contains Chinese/Japanese/Korean characters → foreign
	if (foreignRegex.test(trimmed)) return true;

	// If mostly English (no Vietnamese diacritics) → foreign
	var words = trimmed.split(/\s+/);
	if (words.length >= 2) {
		var englishWords = words.filter(function(w) { return englishRegex.test(w); });
		var vietWords = words.filter(function(w) { return vietnameseRegex.test(w); });
		// If has English words and no Vietnamese → foreign
		if (englishWords.length >= 2 && vietWords.length === 0) return true;
		// If ratio of English words is high
		if (englishWords.length > words.length * 0.5 && vietWords.length === 0) return true;
	}

	return false;
}

function countChild(node) {
	var c = node.children.length;
	for (var i = 0; i < node.children.length; i++) {
		c += countChild(node.children[i]);
	}
	return c;
}

function removeOverflow() {
	if (setting.heightauto || setting.widthauto)
		q("div:not([calculated]), nav, main:not([calculated]), section:not([calculated])").forEach(function(e) {
			e.setAttribute("calculated", "true");
			var stl = getComputedStyle(e);
			if (checkOverflow(e, stl) && !isIgnore(e)) {
				if (setting.heightauto) {
					if (stl.maxHeight == 'none') e.style.maxHeight = (parseInt(stl.height) * 2) + "px";
					if (parseInt(stl.height) + "px" == stl.height) e.style.minHeight = stl.height;
					if (stl.overflowY != 'auto' && stl.overflowY != 'scroll') e.style.height = "auto";
				}
				if (setting.widthauto) {
					if (parseInt(stl.width) + "px" == stl.width) e.style.minWidth = stl.width;
					e.style.width = "auto";
				}
			}
			if (e.tagName == "NAV") {
				e.style.fontSize = (parseInt(stl.fontSize) * 0.75) + "px";
				e.style.overflow = 'hidden';
			}
		});

	if (setting.scaleauto)
		q("pp:not([calculated]),a:not([calculated]),label:not([calculated])," +
			"button:not([calculated]), [type=\"submit\"]:not([calculated])," +
			"li:not([calculated]), span:not([calculated]), i:not([calculated])," +
			"h3:not([calculated]),h2:not([calculated]),h1:not([calculated]),h4:not([calculated])").forEach(function(e) {
			e.setAttribute("calculated", "true");
			if (checkOverflow(e) && !isIgnore(e)) {
				var stl = getComputedStyle(e);
				var fontsize = parseInt(stl.fontSize);
				var multiply = 1;
				if (fontsize > 26) multiply = 5;
				else if (fontsize > 22) multiply = 3;
				else if (fontsize >= 16) multiply = 2;
				else if (fontsize > 14) multiply = 2;

				if (fontsize - multiply < 10) e.style.fontSize = "10px";
				else e.style.fontSize = (fontsize - multiply) + "px";

				if (checkOverflow(e)) {
					if (fontsize - multiply * 2 < 10) {
						e.style.fontSize = "10px";
						e.style.textOverflow = 'ellipsis';
					} else e.style.fontSize = (fontsize - multiply * 2) + "px";
				}
			}
		});
}

var realtimeTranslateLock = false;

function recurTraver(node, arr, tarr) {
	if (!node) return;
	for (var i = 0; i < node.childNodes.length; i++) {
		if (node.childNodes[i].nodeType == 3) {
			var textContent = node.childNodes[i].textContent;
			if (textContent && textContent.trim().length > 0 && isForeignText(textContent)) {
				arr.push(node.childNodes[i]);
				tarr.push(textContent);
			}
		} else {
			if (node.childNodes[i].tagName != "SCRIPT" && node.childNodes[i].tagName != "STYLE")
				recurTraver(node.childNodes[i], arr, tarr);
		}
	}
	if (node.shadowRoot) {
		monitorShadowRootMutation(node.shadowRoot);
		recurTraver(node.shadowRoot, arr, tarr);
	}
}

function translatePlaceholder(arr, tarr) {
	var listNode = q("input[type=\"submit\"], [placeholder], [title]");
	for (var i = 0; i < listNode.length; i++) {
		var flag = false;
		var nodeid = 0;
		if (listNode[i].type == "submit" && listNode[i].value && isForeignText(listNode[i].value)) {
			if (!flag) { flag = true; arr.push(listNode[i]); nodeid = arr.length - 1; }
			tarr.push(nodeid + "<obj>btnval<obj>" + listNode[i].value);
		}
		if (listNode[i].placeholder && isForeignText(listNode[i].placeholder)) {
			if (!flag) { flag = true; arr.push(listNode[i]); nodeid = arr.length - 1; }
			tarr.push(nodeid + "<obj>plchd<obj>" + listNode[i].placeholder);
		}
		if (listNode[i].title && isForeignText(listNode[i].title)) {
			if (!flag) { flag = true; arr.push(listNode[i]); nodeid = arr.length - 1; }
			tarr.push(nodeid + "<obj>title<obj>" + listNode[i].title);
		}
	}
}

var isForeignPage = false;
try {
	isForeignPage = isForeignText(document.title);
} catch (e) {}

var oldSend = XMLHttpRequest.prototype.send;
var translateDelay = 120;
var deferDelay = 200;
var enableRemoveOverflow = true;
if (setting.heightauto == false && setting.widthauto == false && setting.scaleauto == false) {
	enableRemoveOverflow = false;
}

function poporgn() {
	var t = "";
	for (var i = 0; i < this.childNodes.length; i++) {
		if (this.childNodes[i].nodeType == 3) {
			t += this.childNodes[i].orgn || "";
		}
	}
	this.setAttribute("title", t);
}

// --- Google Translate API (POST to avoid URL length limits with CJK) ---
function callGoogleTranslateAPI(text, targetLang) {
	return new Promise(function(resolve, reject) {
		var url = "https://translate.googleapis.com/translate_a/single";
		var params = "client=gtx&sl=auto&tl=" + encodeURIComponent(targetLang) +
			"&dt=t&q=" + encodeURIComponent(text);

		var xhr = new XMLHttpRequest();
		xhr.open("POST", url, true);
		xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
		xhr.onreadystatechange = function() {
			if (this.readyState == 4) {
				if (this.status == 200) {
					try {
						var data = JSON.parse(this.responseText);
						var translated = data[0].map(function(part) { return part[0]; }).join("");
						resolve(translated);
					} catch (e) {
						console.log("[BST] Parse error:", e);
						resolve(text);
					}
				} else {
					console.log("[BST] API status:", this.status);
					resolve(text);
				}
			}
		};
		xhr.onerror = function() {
			console.log("[BST] XHR error");
			resolve(text);
		};
		xhr.send(params);
	});
}

function splitTextToChunks(text, limit) {
	var segments = text.split("=|==|=");
	var chunks = [];
	var current = [];
	var currentLen = 0;

	for (var i = 0; i < segments.length; i++) {
		var seg = segments[i];
		if (currentLen + seg.length > limit && current.length > 0) {
			chunks.push(current.join("=|==|="));
			current = [];
			currentLen = 0;
		}
		current.push(seg);
		currentLen += seg.length + 5;
	}
	if (current.length > 0) chunks.push(current.join("=|==|="));
	return chunks;
}

async function translateWithGoogle(text, targetLang) {
	if (!text.trim()) return text;
	var chunks = splitTextToChunks(text, 2000);
	var results = [];
	for (var i = 0; i < chunks.length; i++) {
		var result = await callGoogleTranslateAPI(chunks[i], targetLang);
		results.push(result);
	}
	return results.join("");
}

async function realtimeTranslate(defered, btn) {
	if (!btn)
		if (realtimeTranslateLock || !setting.enable) return;

	realtimeTranslateLock = true;
	setTimeout(function() { realtimeTranslateLock = false; }, translateDelay);

	if (isForeignPage) attachAjaxRoot();

	var totranslist = [];
	var transtext = [];
	var currnode = document.body;
	recurTraver(q("title")[0], totranslist, transtext);
	recurTraver(currnode, totranslist, transtext);

	if (totranslist.length > 0) {
		var transtext2 = transtext.join("=|==|=");

		if (!isForeignPage) {
			// Check if page has significant foreign text
			var foreignChars = transtext2.replace(/[\s\x00-\x7F]/g, "").length;
			if (foreignChars > 50 || transtext.length > 5) {
				isForeignPage = true;
			}
		}

		try {
			// Use Google Translate API (supports all languages → target)
			var translated = await translateWithGoogle(replaceName(transtext2), setting.targetLang);
			var translateds = translated.split("=|==|=");

			for (var i = 0; i < totranslist.length; i++) {
				if (translateds[i] !== undefined) {
					totranslist[i].orgn = transtext[i];
					totranslist[i].textContent = translateds[i];
					if (totranslist[i].parentElement && !totranslist[i].parentElement.popable) {
						totranslist[i].parentElement.addEventListener("mouseenter", poporgn);
						totranslist[i].parentElement.popable = true;
					}
				}
			}

			if (isForeignPage) {
				if (enableRemoveOverflow) removeOverflow();
				invokeOnForeignPage();
			}
		} catch (err) {
			console.log("[BST] Translation error:", err);
		}
	}

	// Translate placeholders, button values, titles
	var totranslist2 = [];
	var transtext3 = [];
	translatePlaceholder(totranslist2, transtext3);

	if (totranslist2.length > 0) {
		var transtext4 = transtext3.join("=|==|=");
		try {
			var translated2 = await translateWithGoogle(transtext4, setting.targetLang);
			var translateds2 = translated2.split("=|==|=");

			for (var i = 0; i < translateds2.length; i++) {
				var obj = translateds2[i].split("<obj>");
				if (obj[1] == "title") {
					totranslist2[obj[0]].title = obj[2];
				} else if (obj[1] == "btnval") {
					totranslist2[obj[0]].value = obj[2];
				} else if (obj[1] == "plchd") {
					totranslist2[obj[0]].placeholder = obj[2];
				}
			}
		} catch (err) {
			console.log("[BST] Placeholder translate error:", err);
		}
	}
}

function attachAjax() {
	var oldSend2 = XMLHttpRequest.prototype.send;
	XMLHttpRequest.prototype.send = function() {
		this.onloadend = function() {
			if (this.responseText && this.responseText.length > 10) {
				document.dispatchEvent(new CustomEvent('CallTranslator', {}));
			}
		}
		oldSend2.apply(this, arguments);
	}
}

function attachAjaxRoot() {
	if (!setting.enableajax) return;
	var script = document.createElement('script');
	script.textContent = attachAjax.toString() + "attachAjax()";
	(document.head || document.documentElement).appendChild(script);
	script.remove();
	document.addEventListener('CallTranslator', function() {
		setTimeout(realtimeTranslate, 0);
	});
	attachAjaxRoot = function() {};
}

function monitorShadowRootMutation(shadowRoot) {
	if (shadowRoot.attachedMutationObserver) return;
	if (setting.enablescript) {
		var MutationLock = false;
		var DeferedCheck = false;
		const observer = new MutationObserver(function(mutationsList) {
			if (MutationLock) {
				if (!DeferedCheck) DeferedCheck = true;
				return;
			}
			MutationLock = true;
			setTimeout(function() {
				MutationLock = false;
				if (DeferedCheck) {
					DeferedCheck = false;
					realtimeTranslate();
				}
			}, deferDelay);
			realtimeTranslate();
		});
		observer.observe(shadowRoot, { childList: true, subtree: true, characterData: true });
		shadowRoot.attachedMutationObserver = true;
	}
}

function invokeOnForeignPage() {
	if (setting.enablescript) {
		var MutationLock = false;
		var DeferedCheck = false;
		const observer = new MutationObserver(function(mutationsList) {
			if (MutationLock) {
				if (!DeferedCheck) DeferedCheck = true;
				return;
			}
			MutationLock = true;
			setTimeout(function() {
				MutationLock = false;
				if (DeferedCheck) {
					DeferedCheck = false;
					realtimeTranslate();
				}
			}, deferDelay);
			realtimeTranslate();
		});
		observer.observe(document.body, { childList: true, subtree: true, characterData: true });
	}

	// Apply font fix for translated pages
	var css = document.createElement("style");
	if (setting.strictarial) {
		css.textContent = ':not(i){font-family: "Segoe UI", Roboto, Arial, sans-serif !important;word-break:break-word;text-overflow:ellipsis;}';
	} else {
		css.textContent = ':not(i){font-family: "Segoe UI", Roboto, Arial, sans-serif;word-break:break-word;text-overflow:ellipsis;}';
	}
	document.head.appendChild(css);

	window.invokeOnForeignPage = function() {}
}

function startScript() {
	if (!setting.enable) return;
	console.log("%c🌐 Browser Screen Translator v2.0.0", "color:#4CAF50;font-size:14px");
	setTimeout(realtimeTranslate, 500);
}

// --- Message Listener (context menu, copy original, etc.) ---
chrome.runtime.onMessage.addListener(function(message, sender, callback) {
	if (message == "copySelected") {
		var s = window.getSelection();
		if (!s || s.rangeCount == 0) { callback({}); return; }

		var range = s.getRangeAt(0);
		var container = range.commonAncestorContainer;
		var orgText = "";

		function getOriginalText(node) {
			if (node.nodeType == 3) {
				if (node.orgn) orgText += node.orgn;
				else orgText += node.textContent;
			} else {
				for (var i = 0; i < node.childNodes.length; i++) {
					getOriginalText(node.childNodes[i]);
				}
			}
		}

		if (container.nodeType == 3) {
			orgText = container.orgn || container.textContent;
		} else {
			getOriginalText(container);
		}
		callback({ value: orgText });
	}

	if (message == "copyName") {
		var s = window.getSelection();
		if (!s || s.rangeCount == 0) { callback({}); return; }
		var range = s.getRangeAt(0);
		var container = range.commonAncestorContainer;
		var chi = "";
		var vi = s.toString();

		if (container.nodeType == 3) {
			chi = container.orgn || "";
		}
		callback({ chi: chi, vi: vi });
	}

	if (message && message.type == "translateImage") {
		// Image translation placeholder
		console.log("[BST] Image translate requested:", message.imageUrl);
	}
});
