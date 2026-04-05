/*! cookie-consent.bundle.js (order-agnostic) */
(function (w, d) {
  "use strict";

  // =========================================================
  // 0) Stub（先行呼び出し対策）
  //    - すでに CookieConsent がある場合でも、initキューは必ず保持
  // =========================================================
  var existing = w.CookieConsent;
  var queue = existing && Array.isArray(existing._q) ? existing._q : [];
  var CC = existing && typeof existing === "object" ? existing : {};

  // 先にグローバルを確実に作る（これで init 先呼び出しでも落ちない）
  CC._q = queue;

  // "ready" 判定（本体準備できたら true）
  CC._ready = false;

  // 先に呼ばれた init をキューに積むスタブ
  if (typeof CC.init !== "function") {
    CC.init = function (opts) {
      CC._q.push(opts || {});
      // 本体が既に準備済みなら即フラッシュ
      if (CC._ready && typeof CC._flush === "function") CC._flush();
    };
  }

  w.CookieConsent = CC;

  // =========================================================
  // 1) 本体（ここから下）
  // =========================================================

  var DEFAULTS = {
    cookieName: "cookie_consent",
    days: 180,
    position: "bottom", // "bottom" | "top"
    policyUrl: "/privacy.html",
    message:
      "当サイトでは、サイト運営に必要なCookieに加え、利便性向上・アクセス解析等のCookieを使用する場合があります。必要なCookieのみを許可することもできます。詳しくはプライバシーポリシーをご確認ください。",
    labels: {
      all: "全て同意する",
      essential: "必要なCookieのみ",
    },
    // GA4（任意）
    ga4: {
      measurementId: "", // "G-XXXX"
    },
    // 「全て同意する」時にだけ読み込む（Google以外の）任意スクリプト
    // 例: [{ src:"https://example.com/a.js", async:true }, { inline:"console.log('ok')" }]
    optionalScripts: [],
  };

  function isPlainObject(v) {
    return !!v && typeof v === "object" && !Array.isArray(v);
  }

  function deepMerge(a, b) {
    var out = isPlainObject(a) ? a : {};
    for (var k in b) {
      if (!Object.prototype.hasOwnProperty.call(b, k)) continue;
      var bv = b[k];
      if (isPlainObject(bv)) out[k] = deepMerge(out[k], bv);
      else out[k] = bv;
    }
    return out;
  }

  function setCookie(name, value, days) {
    var expires = "";
    if (typeof days === "number") {
      var date = new Date();
      date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
      expires = "; expires=" + date.toUTCString();
    }
    d.cookie =
      name +
      "=" +
      encodeURIComponent(value) +
      expires +
      "; path=/; SameSite=Lax";
  }

  function getCookie(name) {
    var nameEQ = name + "=";
    var ca = d.cookie.split(";");
    for (var i = 0; i < ca.length; i++) {
      var c = ca[i].trim();
      if (c.indexOf(nameEQ) === 0)
        return decodeURIComponent(c.substring(nameEQ.length));
    }
    return null;
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function escapeAttr(str) {
    return String(str).replace(/"/g, "&quot;");
  }

  function injectStyle(css) {
    if (d.querySelector('style[data-cookie-consent-style="1"]')) return;
    var style = d.createElement("style");
    style.setAttribute("data-cookie-consent-style", "1");
    style.textContent = css;
    d.head.appendChild(style);
  }

  function cssForBanner(position) {
    var top = position === "top";
    return (
      ".c-cookie{position:fixed;left:0;right:0;" +
      (top ? "top:0;bottom:auto;" : "bottom:0;top:auto;") +
      "z-index:9999;padding:16px;background:rgba(0,0,0,.85);color:#fff;display:none}" +
      ".c-cookie__inner{max-width:960px;margin:0 auto;display:grid;gap:12px}" +
      ".c-cookie__text{margin:0;line-height:1.6;font-size:14px}" +
      ".c-cookie__link{color:#fff;text-decoration:underline;margin-left:6px}" +
      ".c-cookie__actions{display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap}" +
      ".c-cookie__btn{appearance:none;border:1px solid rgba(255,255,255,.7);background:transparent;color:#fff;padding:10px 14px;border-radius:6px;font-size:14px;cursor:pointer}" +
      ".c-cookie__btn--all{background:#fff;color:#000;border-color:#fff}" +
      ".c-cookie__btn:focus-visible{outline:2px solid #fff;outline-offset:2px}"
    );
  }

  function ensureGtagBase() {
    w.dataLayer = w.dataLayer || [];
    if (typeof w.gtag !== "function") {
      w.gtag = function () {
        w.dataLayer.push(arguments);
      };
    }
  }

  function loadScript(src, async) {
    var s = d.createElement("script");
    s.src = src;
    if (async !== false) s.async = true;
    d.head.appendChild(s);
  }

  function initGa4(opts) {
    var mid =
      opts.ga4 && opts.ga4.measurementId
        ? String(opts.ga4.measurementId).trim()
        : "";
    if (!mid) return;

    ensureGtagBase();

    // default: 必要なCookieのみ（= denied）
    w.gtag("consent", "default", {
      ad_storage: "denied",
      analytics_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
      functionality_storage: "granted",
      security_storage: "granted",
      wait_for_update: 500,
    });

    // gtag.js は常時ロード（「必要のみ」でも cookieless に寄せるため）
    loadScript(
      "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(mid),
      true,
    );

    w.gtag("js", new Date());
    w.gtag("config", mid);
  }

  function updateConsentAll() {
    if (typeof w.gtag !== "function") return;
    w.gtag("consent", "update", {
      analytics_storage: "granted",
      ad_storage: "granted",
      ad_user_data: "granted",
      ad_personalization: "granted",
      functionality_storage: "granted",
      security_storage: "granted",
    });
  }

  function updateConsentEssentialOnly() {
    if (typeof w.gtag !== "function") return;
    w.gtag("consent", "update", {
      analytics_storage: "denied",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
      functionality_storage: "granted",
      security_storage: "granted",
    });
  }

  function activateOptionalScripts(opts) {
    var list = Array.isArray(opts.optionalScripts) ? opts.optionalScripts : [];
    if (!list.length) return;

    for (var i = 0; i < list.length; i++) {
      var item = list[i] || {};
      if (item.src) {
        loadScript(String(item.src), item.async !== false);
      } else if (item.inline) {
        var inline = d.createElement("script");
        inline.text = String(item.inline);
        d.head.appendChild(inline);
      }
    }
  }

  function ensureBanner(opts) {
    var banner = d.getElementById("cookie-consent");
    if (banner) return banner;

    banner = d.createElement("div");
    banner.id = "cookie-consent";
    banner.className = "c-cookie";
    banner.setAttribute("role", "dialog");
    banner.setAttribute("aria-live", "polite");
    banner.setAttribute("aria-label", "Cookieの同意");

    var policy = opts.policyUrl || "/privacy.html";

    banner.innerHTML =
      '<div class="c-cookie__inner">' +
      '  <p class="c-cookie__text">' +
      escapeHtml(opts.message) +
      '    <a class="c-cookie__link" href="' +
      escapeAttr(policy) +
      '">プライバシーポリシー</a>' +
      "  </p>" +
      '  <div class="c-cookie__actions">' +
      '    <button type="button" class="c-cookie__btn c-cookie__btn--essential" data-cookie-action="essential">' +
      escapeHtml(opts.labels.essential) +
      "    </button>" +
      '    <button type="button" class="c-cookie__btn c-cookie__btn--all" data-cookie-action="all">' +
      escapeHtml(opts.labels.all) +
      "    </button>" +
      "  </div>" +
      "</div>";

    d.body.appendChild(banner);
    return banner;
  }

  function runInit(userOpts) {
    var opts = deepMerge(deepMerge({}, DEFAULTS), userOpts || {});

    // 先にGA4 consent default を確定
    initGa4(opts);

    // head/body がまだなら待つ（順序どうでもOKにする要）
    if (!d.head || !d.body) {
      // すでに待機登録済みなら二重に積まない
      scheduleWhenReady(function () {
        runInit(opts);
      });
      return;
    }

    injectStyle(cssForBanner(opts.position));
    var banner = ensureBanner(opts);

    function show() {
      banner.style.display = "block";
    }
    function hide() {
      banner.style.display = "none";
    }

    function applyState(state) {
      if (state === "all") {
        updateConsentAll();
        activateOptionalScripts(opts);
      } else {
        updateConsentEssentialOnly();
      }
    }

    // click handler（重複登録防止）
    if (!banner.__ccBound) {
      banner.__ccBound = true;
      banner.addEventListener("click", function (e) {
        var t = e.target;
        if (!(t instanceof Element)) return;

        var act = t.getAttribute("data-cookie-action");
        if (act === "all") {
          setCookie(opts.cookieName, "all", opts.days);
          applyState("all");
          hide();
        } else if (act === "essential") {
          setCookie(opts.cookieName, "essential", opts.days);
          applyState("essential");
          hide();
        }
      });
    }

    // initial
    var saved = getCookie(opts.cookieName);
    if (saved === "all") {
      applyState("all");
      hide();
    } else if (saved === "essential") {
      applyState("essential");
      hide();
    } else {
      // 未選択：必要のみ（default denied）で開始し、バナー表示
      show();
    }

    // reset API
    w.CookieConsentReset = function () {
      setCookie(opts.cookieName, "", -1);
      updateConsentEssentialOnly();
      show();
    };
  }

  // DOMがまだでも確実に実行するための待機キュー
  var readyQueue = [];
  var readyHooked = false;
  function scheduleWhenReady(fn) {
    readyQueue.push(fn);
    if (readyHooked) return;
    readyHooked = true;

    var flush = function () {
      // head/body が揃ってからフラッシュ
      if (!d.head || !d.body) return;
      var q = readyQueue.slice();
      readyQueue.length = 0;
      for (var i = 0; i < q.length; i++) {
        try {
          q[i]();
        } catch (e) {
          /* no-op */
        }
      }
    };

    // 既に揃っていれば即
    if (d.readyState === "complete" || d.readyState === "interactive") {
      flush();
    } else {
      d.addEventListener("DOMContentLoaded", flush, { once: true });
    }

    // 念のため load でも
    w.addEventListener("load", flush, { once: true });
  }

  // =========================================================
  // 2) flush（キューに積まれた init を全て処理）
  // =========================================================
  CC._flush = function () {
    // まとめて処理。複数 init が呼ばれていたら、順に適用（最後の設定が最後に反映）
    while (CC._q.length) {
      var opts = CC._q.shift();
      runInit(opts);
    }
  };

  CC._ready = true;

  // 本体準備完了：キューがあれば流す
  CC._flush();
})(window, document);
