/**
 * @growthbook/growthbook/dist/bundles/esm.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @growthbook/growthbook@1.6.1
 * pieces: chunk-aepeg2w5.js (131)
 * attribution: esm-layout 25, esm-fingerprint 106
 */
import { xs, ei } from "./esm.min.js";

//@ chunk-aepeg2w5.js:6509-6567 esm-layout
function pu() {
  let e = null;
  return {
    get: () => e,
    set: (n) => {
      e = n;
    },
  };
}
//@ chunk-aepeg2w5.js:6604-6775 esm-fingerprint
var d_ = {
  fetch: globalThis.fetch ? globalThis.fetch.bind(globalThis) : void 0,
  SubtleCrypto: globalThis.crypto ? globalThis.crypto.subtle : void 0,
  EventSource: globalThis.EventSource,
};
//@ chunk-aepeg2w5.js:6775-6799 esm-layout
function xn() {
  return d_;
}
//@ chunk-aepeg2w5.js:6799-6933 esm-fingerprint
function Dd(e) {
  let n = 2166136261,
    r = e.length;
  for (let s = 0; s < r; s++)
    ((n ^= e.charCodeAt(s)), (n += (n << 1) + (n << 4) + (n << 7) + (n << 8) + (n << 24)));
  return n >>> 0;
}
//@ chunk-aepeg2w5.js:6933-7037 esm-fingerprint
function Jo(e, n, r) {
  if (r === 2) return (Dd(Dd(e + n) + "") % 1e4) / 1e4;
  if (r === 1) return (Dd(n + e) % 1000) / 1000;
  return null;
}
//@ chunk-aepeg2w5.js:7037-7095 esm-layout
function IP(e) {
  if (e <= 0) return [];
  return Array(e).fill(1 / e);
}
//@ chunk-aepeg2w5.js:7095-7135 esm-layout
function Rs(e, n) {
  return e >= n[0] && e < n[1];
}
//@ chunk-aepeg2w5.js:7135-7220 esm-layout
function c_(e, n) {
  let r = Jo("__" + n[0], e, 1);
  if (r === null) return !1;
  return r >= n[1] && r < n[2];
}
//@ chunk-aepeg2w5.js:7220-7296 esm-layout
function f_(e, n) {
  for (let r = 0; r < n.length; r++) if (Rs(e, n[r])) return r;
  return -1;
}
//@ chunk-aepeg2w5.js:7296-7408 esm-fingerprint
function Fd(e) {
  try {
    let replaced = e.replace(/([^\\])\//g, "$1\\/");
    return new RegExp(replaced);
  } catch (error) {
    console.error(error);
    return;
  }
}
//@ chunk-aepeg2w5.js:7408-7593 esm-fingerprint
function Qo(e, n) {
  if (!n.length) return !1;
  let r = !1,
    s = !1;
  for (let h = 0; h < n.length; h++) {
    let y = FP(e, n[h].type, n[h].pattern);
    if (n[h].include === !1) {
      if (y) return !1;
    } else if (((r = !0), y)) s = !0;
  }
  return s || !r;
}
//@ chunk-aepeg2w5.js:7593-7793 esm-fingerprint
function DP(e, n, r) {
  try {
    let replaced = n.replace(/[*.+?^${}()|[\]\\]/g, "\\$&").replace(/_____/g, ".*");
    if (r) replaced = "\\/?" + replaced.replace(/(^\/|\/$)/g, "") + "\\/?";
    return new RegExp("^" + replaced + "$", "i").test(e);
  } catch (error) {
    return !1;
  }
}
//@ chunk-aepeg2w5.js:7793-8130 esm-fingerprint
function NP(e, n) {
  try {
    let r = new URL(n.replace(/^([^:/?]*)\./i, "https://$1.").replace(/\*/g, "_____"), "https://_____"),
      s = [
        [e.host, r.host, !1],
        [e.pathname, r.pathname, !0],
      ];
    if (r.hash) s.push([e.hash, r.hash, !1]);
    return (
      r.searchParams.forEach((searchParam, y) => {
        s.push([e.searchParams.get(y) || "", searchParam, !1]);
      }),
      !s.some((h) => !DP(h[0], h[1], h[2]))
    );
  } catch (error) {
    return !1;
  }
}
//@ chunk-aepeg2w5.js:8130-8354 esm-fingerprint
function FP(e, n, r) {
  try {
    let s = new URL(e, "https://_");
    if (n === "regex") {
      let h = Fd(r);
      if (!h) return !1;
      return h.test(s.href) || h.test(s.href.substring(s.origin.length));
    } else if (n === "simple") return NP(s, r);
    return !1;
  } catch (error) {
    return !1;
  }
}
//@ chunk-aepeg2w5.js:8354-8566 esm-fingerprint
function p_(e, n, r) {
  if (((n = n === void 0 ? 1 : n), n < 0)) n = 0;
  else if (n > 1) n = 1;
  let s = IP(e);
  if (((r = r || s), r.length !== e)) r = s;
  let reduced = r.reduce((S, w) => w + S, 0);
  if (reduced < 0.99 || reduced > 1.01) r = s;
  let y = 0;
  return r.map((S) => {
    let w = y;
    return ((y += S), [w, w + n * S]);
  });
}
//@ chunk-aepeg2w5.js:8566-8838 esm-fingerprint
function m_(e, n, r) {
  if (!n) return null;
  let s = n.split("?")[1];
  if (!s) return null;
  let mapped = s
    .replace(/#.*/, "")
    .split("&")
    .map((y) => y.split("=", 2))
    .filter((y) => {
      let [S] = y;
      return S === e;
    })
    .map((y) => {
      let [, S] = y;
      return parseInt(S);
    });
  if (mapped.length > 0 && mapped[0] >= 0 && mapped[0] < r) return mapped[0];
  return null;
}
//@ chunk-aepeg2w5.js:8838-8905 esm-layout
function g_(e) {
  try {
    return e();
  } catch (error) {
    return (console.error(error), !1);
  }
}
//@ chunk-aepeg2w5.js:8905-8963 esm-fingerprint
var Nd = (e) => Uint8Array.from(atob(e), (n) => n.charCodeAt(0));
//@ chunk-aepeg2w5.js:8963-9364 esm-fingerprint
async function br(e, n, r) {
  if (((n = n || ""), (r = r || (globalThis.crypto && globalThis.crypto.subtle) || d_.SubtleCrypto), !r))
    throw Error("No SubtleCrypto implementation found");
  try {
    let importKey = await r.importKey("raw", Nd(n), { name: "AES-CBC", length: 128 }, !0, [
        "encrypt",
        "decrypt",
      ]),
      [h, y] = e.split("."),
      decrypt = await r.decrypt({ name: "AES-CBC", iv: Nd(h) }, importKey, Nd(y));
    return new TextDecoder().decode(decrypt);
  } catch (error) {
    throw Error("Failed to decrypt");
  }
}
//@ chunk-aepeg2w5.js:9364-9436 esm-fingerprint
function Zo(e) {
  if (typeof e === "string") return e;
  return JSON.stringify(e);
}
//@ chunk-aepeg2w5.js:9436-9659 esm-fingerprint
function zt(e) {
  if (typeof e === "number") e = e + "";
  if (!e || typeof e !== "string") e = "0";
  let parts = e.replace(/(^v|\+.*$)/g, "").split(/[-.]/);
  if (parts.length === 3) parts.push("~");
  return parts.map((r) => (r.match(/^[0-9]+$/) ? r.padStart(5, " ") : r)).join("-");
}
//@ chunk-aepeg2w5.js:9659-9716 esm-fingerprint
function __() {
  let e;
  try {
    e = "1.6.1";
  } catch (error) {
    e = "";
  }
  return e;
}
//@ chunk-aepeg2w5.js:9716-9951 esm-fingerprint
function h_(e, n) {
  let r, s;
  try {
    ((r = new URL(e)), (s = new URL(n)));
  } catch (error) {
    return (console.error(`Unable to merge query strings: ${error}`), n);
  }
  return (
    r.searchParams.forEach((searchParam, y) => {
      if (s.searchParams.has(y)) return;
      s.searchParams.set(y, searchParam);
    }),
    s.toString()
  );
}
//@ chunk-aepeg2w5.js:10395-11436 esm-layout
var yt = {
    staleTTL: 60000,
    maxAge: 14400000,
    cacheKey: "gbFeaturesCache",
    backgroundSync: !0,
    maxEntries: 10,
    disableIdleStreams: !1,
    idleStreamInterval: 20000,
    disableCache: !1,
  },
  on = xn(),
  Nt = {
    fetchFeaturesCall: (e) => {
      let { host: host, clientKey: clientKey, headers: headers } = e;
      return on.fetch(`${host}/api/features/${clientKey}`, { headers: headers });
    },
    fetchRemoteEvalCall: (e) => {
      let { host: host, clientKey: clientKey, payload: payload, headers: headers } = e,
        y = {
          method: "POST",
          headers: { "Content-Type": "application/json", ...headers },
          body: JSON.stringify(payload),
        };
      return on.fetch(`${host}/api/eval/${clientKey}`, y);
    },
    eventSourceCall: (e) => {
      let { host: host, clientKey: clientKey, headers: headers } = e;
      if (headers) return new on.EventSource(`${host}/sub/${clientKey}`, { headers: headers });
      return new on.EventSource(`${host}/sub/${clientKey}`);
    },
    startIdleListener: () => {
      let e;
      if (!(typeof window < "u" && typeof document < "u")) return;
      let r = () => {
        if (document.visibilityState === "visible") (window.clearTimeout(e), k_());
        else if (document.visibilityState === "hidden") e = window.setTimeout(E_, yt.idleStreamInterval);
      };
      return (
        document.addEventListener("visibilitychange", r),
        () => document.removeEventListener("visibilitychange", r)
      );
    },
    stopIdleListener: () => {},
  };
//@ chunk-aepeg2w5.js:11436-11517 esm-fingerprint
try {
  if (globalThis.localStorage) on.localStorage = globalThis.localStorage;
} catch (error) {}
//@ chunk-aepeg2w5.js:11517-11582 esm-layout
var Jr = new Map(),
  y_ = !1,
  On = new Map(),
  Os = new Map(),
  Qr = new Map(),
  Zr = new Set();
//@ chunk-aepeg2w5.js:11582-11617 esm-layout
function Ps(e) {
  Object.assign(on, e);
}
//@ chunk-aepeg2w5.js:11617-11679 esm-fingerprint
function Ud(e) {
  if ((Object.assign(yt, e), !yt.backgroundSync)) GP();
}
//@ chunk-aepeg2w5.js:11679-11856 esm-fingerprint
async function S_(e) {
  let {
    instance: instance,
    timeout: timeout,
    skipCache: skipCache,
    allowStale: allowStale,
    backgroundSync: backgroundSync,
  } = e;
  if (!backgroundSync) yt.backgroundSync = !1;
  return UP({ instance: instance, allowStale: allowStale, timeout: timeout, skipCache: skipCache });
}
//@ chunk-aepeg2w5.js:11856-11925 esm-fingerprint
function LP(e) {
  let n = ti(e),
    r = Jr.get(n) || new Set();
  (r.add(e), Jr.set(n, r));
}
//@ chunk-aepeg2w5.js:11925-11969 esm-fingerprint
function v_(e) {
  Jr.forEach((n) => n.delete(e));
}
//@ chunk-aepeg2w5.js:11969-12036 esm-fingerprint
function E_() {
  Qr.forEach((e) => {
    if (!e) return;
    ((e.state = "idle"), $d(e));
  });
}
//@ chunk-aepeg2w5.js:12036-12115 esm-fingerprint
function k_() {
  Qr.forEach((e) => {
    if (!e) return;
    if (e.state !== "idle") return;
    Wd(e);
  });
}
//@ chunk-aepeg2w5.js:12115-12261 esm-fingerprint
async function b_() {
  try {
    if (!on.localStorage) return;
    await on.localStorage.setItem(yt.cacheKey, JSON.stringify(Array.from(On.entries())));
  } catch (error) {}
}
//@ chunk-aepeg2w5.js:12261-12691 esm-fingerprint
async function UP(e) {
  let { instance: instance, allowStale: allowStale, timeout: timeout, skipCache: skipCache } = e,
    y = ti(instance),
    S = Bd(instance),
    date = new Date(),
    date_2 = new Date(date.getTime() - yt.maxAge + yt.staleTTL);
  await HP();
  let x = !yt.disableCache && !skipCache ? On.get(S) : void 0;
  if (x && (allowStale || x.staleAt > date) && x.staleAt > date_2) {
    if (x.sse) Zr.add(y);
    if (x.staleAt < date) Ld(instance);
    else Kd(instance);
    return { data: x.data, success: !0, source: "cache" };
  } else
    return (
      (await xs(Ld(instance), timeout)) || {
        data: null,
        success: !1,
        source: "timeout",
        error: Error("Timeout"),
      }
    );
}
//@ chunk-aepeg2w5.js:12691-12749 esm-fingerprint
function ti(e) {
  let [n, r] = e.getApiInfo();
  return `${n}||${r}`;
}
//@ chunk-aepeg2w5.js:12749-13040 esm-fingerprint
function Bd(e) {
  let n = ti(e);
  if (!("isRemoteEval" in e) || !e.isRemoteEval()) return n;
  let attributes = e.getAttributes(),
    s = e.getCacheKeyAttributes() || Object.keys(e.getAttributes()),
    h = {};
  s.forEach((w) => {
    h[w] = attributes[w];
  });
  let forcedVariations = e.getForcedVariations(),
    url = e.getUrl();
  return `${n}||${JSON.stringify({ ca: h, fv: forcedVariations, url: url })}`;
}
//@ chunk-aepeg2w5.js:13040-13394 esm-fingerprint
async function HP() {
  if (y_) return;
  y_ = !0;
  try {
    if (on.localStorage) {
      let item = await on.localStorage.getItem(yt.cacheKey);
      if (!yt.disableCache && item) {
        let parsed = JSON.parse(item);
        if (parsed && Array.isArray(parsed))
          parsed.forEach((r) => {
            let [s, h] = r;
            On.set(s, { ...h, staleAt: new Date(h.staleAt) });
          });
        w_();
      }
    }
  } catch (error) {}
  if (!yt.disableIdleStreams) {
    let startIdleListener = Nt.startIdleListener();
    if (startIdleListener) Nt.stopIdleListener = startIdleListener;
  }
}
//@ chunk-aepeg2w5.js:13394-13631 esm-fingerprint
function w_() {
  let sorted = Array.from(On.entries())
      .map((r) => {
        let [s, h] = r;
        return { key: s, staleAt: h.staleAt.getTime() };
      })
      .sort((r, s) => r.staleAt - s.staleAt),
    min = Math.min(Math.max(0, On.size - yt.maxEntries), On.size);
  for (let r = 0; r < min; r++) On.delete(sorted[r].key);
}
//@ chunk-aepeg2w5.js:13631-13919 esm-fingerprint
function A_(e, n, r) {
  let s = r.dateUpdated || "",
    date = new Date(Date.now() + yt.staleTTL),
    y = !yt.disableCache ? On.get(n) : void 0;
  if (y && s && y.version === s) {
    ((y.staleAt = date), b_());
    return;
  }
  if (!yt.disableCache) (On.set(n, { data: r, version: s, staleAt: date, sse: Zr.has(e) }), w_());
  b_();
  let S = Jr.get(e);
  S && S.forEach((w) => BP(w, r));
}
//@ chunk-aepeg2w5.js:13919-13980 esm-fingerprint
async function BP(e, n) {
  await e.setPayload(n || e.getPayload());
}
//@ chunk-aepeg2w5.js:13980-14718 esm-fingerprint
async function Ld(e) {
  let { apiHost: apiHost, apiRequestHeaders: apiRequestHeaders } = e.getApiHosts(),
    clientKey = e.getClientKey(),
    h = "isRemoteEval" in e && e.isRemoteEval(),
    y = ti(e),
    S = Bd(e),
    w = Os.get(S);
  if (!w)
    ((w = (
      h
        ? Nt.fetchRemoteEvalCall({
            host: apiHost,
            clientKey: clientKey,
            payload: {
              attributes: e.getAttributes(),
              forcedVariations: e.getForcedVariations(),
              forcedFeatures: Array.from(e.getForcedFeatures().entries()),
              url: e.getUrl(),
            },
            headers: apiRequestHeaders,
          })
        : Nt.fetchFeaturesCall({ host: apiHost, clientKey: clientKey, headers: apiRequestHeaders })
    )
      .then((x) => {
        if (!x.ok) throw Error(`HTTP error: ${x.status}`);
        if (x.headers.get("x-sse-support") === "enabled") Zr.add(y);
        return x.json();
      })
      .then((x) => (A_(y, S, x), Kd(e), Os.delete(S), { data: x, success: !0, source: "network" }))
      .catch((x) => (Os.delete(S), { data: null, source: "error", success: !1, error: x }))),
      Os.set(S, w));
  return w;
}
//@ chunk-aepeg2w5.js:14718-15249 esm-fingerprint
function Kd(e) {
  let n = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : !1,
    r = ti(e),
    s = Bd(e),
    { streamingHost: streamingHost, streamingHostRequestHeaders: streamingHostRequestHeaders } =
      e.getApiHosts(),
    clientKey = e.getClientKey();
  if (n) Zr.add(r);
  if (yt.backgroundSync && Zr.has(r) && on.EventSource) {
    if (Qr.has(r)) return;
    let w = {
      src: null,
      host: streamingHost,
      clientKey: clientKey,
      headers: streamingHostRequestHeaders,
      cb: (R) => {
        try {
          if (R.type === "features-updated") {
            let x = Jr.get(r);
            x &&
              x.forEach((P) => {
                Ld(P);
              });
          } else if (R.type === "features") {
            let parsed = JSON.parse(R.data);
            A_(r, s, parsed);
          }
          w.errors = 0;
        } catch (error) {
          T_(w);
        }
      },
      errors: 0,
      state: "active",
    };
    (Qr.set(r, w), Wd(w));
  }
}
//@ chunk-aepeg2w5.js:15249-15497 esm-fingerprint
function T_(e) {
  if (e.state === "idle") return;
  if ((e.errors++, e.errors > 3 || (e.src && e.src.readyState === 2))) {
    let n = Math.pow(3, e.errors - 3) * (1000 + Math.random() * 1000);
    ($d(e),
      setTimeout(
        () => {
          if (["idle", "active"].includes(e.state)) return;
          Wd(e);
        },
        Math.min(n, 300000),
      ));
  }
}
//@ chunk-aepeg2w5.js:15497-15632 esm-fingerprint
function $d(e) {
  if (!e.src) return;
  if (((e.src.onopen = null), (e.src.onerror = null), e.src.close(), (e.src = null), e.state === "active"))
    e.state = "disabled";
}
//@ chunk-aepeg2w5.js:15632-15886 esm-fingerprint
function Wd(e) {
  ((e.src = Nt.eventSourceCall({ host: e.host, clientKey: e.clientKey, headers: e.headers })),
    (e.state = "active"),
    e.src.addEventListener("features", e.cb),
    e.src.addEventListener("features-updated", e.cb),
    (e.src.onerror = () => T_(e)),
    (e.src.onopen = () => {
      e.errors = 0;
    }));
}
//@ chunk-aepeg2w5.js:15886-15922 esm-layout
function KP(e, n) {
  ($d(e), Qr.delete(n));
}
//@ chunk-aepeg2w5.js:15922-15995 esm-fingerprint
function GP() {
  (Zr.clear(), Qr.forEach(KP), Jr.clear(), Nt.stopIdleListener());
}
//@ chunk-aepeg2w5.js:15995-16136 esm-fingerprint
function Ms(e, n) {
  if (n.streaming) {
    if (!e.getClientKey()) throw Error("Must specify clientKey to enable streaming");
    if (n.payload) Kd(e, !0);
    LP(e);
  }
}
//@ chunk-aepeg2w5.js:16136-16221 esm-fingerprint
var $P = /^[a-zA-Z:_][a-zA-Z0-9:_.-]*$/,
  Yd = { revert: function () {} },
  Fs = new Map(),
  qd = new Set();
//@ chunk-aepeg2w5.js:16221-16371 esm-fingerprint
function WP(e) {
  return e === "html"
    ? { childList: !0, subtree: !0, attributes: !0, characterData: !0 }
    : { childList: !1, subtree: !1, attributes: !0, attributeFilter: [e] };
}
//@ chunk-aepeg2w5.js:16371-16457 esm-fingerprint
function Us(e) {
  var n = Fs.get(e);
  if (!n) ((n = { element: e, attributes: {} }), Fs.set(e, n));
  return n;
}
//@ chunk-aepeg2w5.js:16457-17154 esm-fingerprint
function Bs(e, n, r, s, h) {
  var y = r(e),
    S = {
      isDirty: !1,
      originalValue: y,
      virtualValue: y,
      mutations: [],
      el: e,
      _positionTimeout: null,
      observer: new MutationObserver(function () {
        if (n === "position" && S._positionTimeout) return;
        else if (n === "position")
          S._positionTimeout = setTimeout(function () {
            S._positionTimeout = null;
          }, 1000);
        var w = r(e);
        if (
          n === "position" &&
          w.parentNode === S.virtualValue.parentNode &&
          w.insertBeforeNode === S.virtualValue.insertBeforeNode
        )
          return;
        if (w === S.virtualValue) return;
        ((S.originalValue = w), h(S));
      }),
      mutationRunner: h,
      setValue: s,
      getCurrentValue: r,
    };
  if (n === "position" && e.parentNode)
    S.observer.observe(e.parentNode, { childList: !0, subtree: !0, attributes: !1, characterData: !1 });
  else S.observer.observe(e, WP(n));
  return S;
}
//@ chunk-aepeg2w5.js:17154-17371 esm-fingerprint
function Ks(e, n) {
  var currentValue = n.getCurrentValue(n.el);
  if (((n.virtualValue = e), e && typeof e !== "string")) {
    if (
      !currentValue ||
      e.parentNode !== currentValue.parentNode ||
      e.insertBeforeNode !== currentValue.insertBeforeNode
    )
      ((n.isDirty = !0), O_());
  } else if (e !== currentValue) ((n.isDirty = !0), O_());
}
//@ chunk-aepeg2w5.js:17371-17475 esm-fingerprint
function zP(e) {
  var originalValue = e.originalValue;
  (e.mutations.forEach(function (mutation) {
    return (originalValue = mutation.mutate(originalValue));
  }),
    Ks(lM(originalValue), e));
}
//@ chunk-aepeg2w5.js:17475-17649 esm-fingerprint
function jP(e) {
  var n = new Set(e.originalValue.split(/\s+/).filter(Boolean));
  (e.mutations.forEach(function (mutation) {
    return mutation.mutate(n);
  }),
    Ks(Array.from(n).filter(Boolean).join(" "), e));
}
//@ chunk-aepeg2w5.js:17649-17749 esm-fingerprint
function VP(e) {
  var originalValue = e.originalValue;
  (e.mutations.forEach(function (mutation) {
    return (originalValue = mutation.mutate(originalValue));
  }),
    Ks(originalValue, e));
}
//@ chunk-aepeg2w5.js:17749-17957 esm-fingerprint
function YP(e) {
  var { parentSelector: parentSelector, insertBeforeSelector: insertBeforeSelector } = e,
    querySelector = document.querySelector(parentSelector);
  if (!querySelector) return null;
  var h = insertBeforeSelector ? document.querySelector(insertBeforeSelector) : null;
  if (insertBeforeSelector && !h) return null;
  return { parentNode: querySelector, insertBeforeNode: h };
}
//@ chunk-aepeg2w5.js:17957-18068 esm-fingerprint
function qP(e) {
  var originalValue = e.originalValue;
  (e.mutations.forEach(function (mutation) {
    var mutate = mutation.mutate(),
      h = YP(mutate);
    originalValue = h || originalValue;
  }),
    Ks(originalValue, e));
}
//@ chunk-aepeg2w5.js:18068-18146 esm-fingerprint
var XP = function (n) {
    return n.innerHTML;
  },
  JP = function (n, r) {
    return (n.innerHTML = r);
  };
/**
 * DOM 节点 html 属性的懒缓存访问（innerHTML 读写），第三方 DOM 实现代码，被误归到 AskUserQuestion/prompt。
 */
//@ chunk-aepeg2w5.js:18146-18227 esm-fingerprint
function D_(e) {
  var n = Us(e);
  if (!n.html) n.html = Bs(e, "html", XP, JP, zP);
  return n.html;
}
//@ chunk-aepeg2w5.js:18227-18459 esm-fingerprint
var QP = function (n) {
    return { parentNode: n.parentElement, insertBeforeNode: n.nextElementSibling };
  },
  ZP = function (n, r) {
    if (r.insertBeforeNode && !r.parentNode.contains(r.insertBeforeNode)) return;
    r.parentNode.insertBefore(n, r.insertBeforeNode);
  };
//@ chunk-aepeg2w5.js:18459-18556 esm-fingerprint
function F_(e) {
  var n = Us(e);
  if (!n.position) n.position = Bs(e, "position", QP, ZP, qP);
  return n.position;
}
//@ chunk-aepeg2w5.js:18556-18663 esm-fingerprint
var tM = function (n, r) {
    return r ? (n.className = r) : n.removeAttribute("class");
  },
  nM = function (n) {
    return n.className;
  };
//@ chunk-aepeg2w5.js:18663-18754 esm-fingerprint
function L_(e) {
  var n = Us(e);
  if (!n.classes) n.classes = Bs(e, "class", nM, tM, jP);
  return n.classes;
}
//@ chunk-aepeg2w5.js:18754-18936 esm-fingerprint
var rM = function (n) {
    return function (r) {
      var s;
      return (s = r.getAttribute(n)) != null ? s : null;
    };
  },
  iM = function (n) {
    return function (r, s) {
      return s !== null ? r.setAttribute(n, s) : r.removeAttribute(n);
    };
  };
//@ chunk-aepeg2w5.js:18936-19047 esm-layout
function U_(e, n) {
  var r = Us(e);
  if (!r.attributes[n]) r.attributes[n] = Bs(e, n, rM(n), iM(n), VP);
  return r.attributes[n];
}
//@ chunk-aepeg2w5.js:19047-19514 esm-fingerprint
function uM(e, n) {
  var r = Fs.get(e);
  if (!r) return;
  if (n === "html") {
    var s, h;
    ((s = r.html) == null || (h = s.observer) == null || h.disconnect(), delete r.html);
  } else if (n === "class") {
    var y, S;
    ((y = r.classes) == null || (S = y.observer) == null || S.disconnect(), delete r.classes);
  } else if (n === "position") {
    var w, R;
    ((w = r.position) == null || (R = w.observer) == null || R.disconnect(), delete r.position);
  } else {
    var x, P, F;
    ((x = r.attributes) == null || (P = x[n]) == null || (F = P.observer) == null || F.disconnect(),
      delete r.attributes[n]);
  }
}
//@ chunk-aepeg2w5.js:19514-19521 esm-layout
var Is;
//@ chunk-aepeg2w5.js:19521-19611 esm-fingerprint
function lM(e) {
  if (!Is) Is = document.createElement("div");
  return ((Is.innerHTML = e), Is.innerHTML);
}
//@ chunk-aepeg2w5.js:19611-19732 esm-fingerprint
function Ds(e, n, r) {
  if (!r.isDirty) return;
  r.isDirty = !1;
  var virtualValue = r.virtualValue;
  if (!r.mutations.length) uM(e, n);
  r.setValue(e, virtualValue);
}
//@ chunk-aepeg2w5.js:19732-19924 esm-fingerprint
function dM(e, n) {
  (e.html && Ds(n, "html", e.html),
    e.classes && Ds(n, "class", e.classes),
    e.position && Ds(n, "position", e.position),
    Object.keys(e.attributes).forEach(function (r) {
      Ds(n, r, e.attributes[r]);
    }));
}
//@ chunk-aepeg2w5.js:19924-19953 esm-layout
function O_() {
  Fs.forEach(dM);
}
//@ chunk-aepeg2w5.js:19953-20179 esm-fingerprint
function cM(e, n) {
  var r = null;
  if (e.kind === "html") r = D_(n);
  else if (e.kind === "class") r = L_(n);
  else if (e.kind === "attribute") r = U_(n, e.attribute);
  else if (e.kind === "position") r = F_(n);
  if (!r) return;
  (r.mutations.push(e), r.mutationRunner(r));
}
//@ chunk-aepeg2w5.js:20179-20448 esm-fingerprint
function fM(e, n) {
  var r = null;
  if (e.kind === "html") r = D_(n);
  else if (e.kind === "class") r = L_(n);
  else if (e.kind === "attribute") r = U_(n, e.attribute);
  else if (e.kind === "position") r = F_(n);
  if (!r) return;
  var index = r.mutations.indexOf(e);
  if (index !== -1) r.mutations.splice(index, 1);
  r.mutationRunner(r);
}
//@ chunk-aepeg2w5.js:20448-20643 esm-fingerprint
function H_(e) {
  if (e.kind === "position" && e.elements.size === 1) return;
  var n = new Set(e.elements),
    querySelectorAll = document.querySelectorAll(e.selector);
  querySelectorAll.forEach(function (s) {
    if (!n.has(s)) (e.elements.add(s), cM(e, s));
  });
}
//@ chunk-aepeg2w5.js:20643-20738 esm-fingerprint
function pM(e) {
  (e.elements.forEach(function (element) {
    return fM(e, element);
  }),
    e.elements.clear(),
    qd.delete(e));
}
//@ chunk-aepeg2w5.js:20738-20767 esm-layout
function M_() {
  qd.forEach(H_);
}
//@ chunk-aepeg2w5.js:20767-20774 esm-layout
var zd;
//@ chunk-aepeg2w5.js:20774-20966 esm-fingerprint
function mM() {
  if (typeof document > "u") return;
  if (!zd)
    zd = new MutationObserver(function () {
      M_();
    });
  (M_(),
    zd.observe(document.documentElement, { childList: !0, subtree: !0, attributes: !1, characterData: !1 }));
}
//@ chunk-aepeg2w5.js:20966-20971 esm-layout
mM();
//@ chunk-aepeg2w5.js:20971-21069 esm-fingerprint
function Ws(e) {
  if (typeof document > "u") return Yd;
  return (
    qd.add(e),
    H_(e),
    {
      revert: function () {
        pM(e);
      },
    }
  );
}
//@ chunk-aepeg2w5.js:21069-21148 esm-fingerprint
function jd(e, n) {
  return Ws({ kind: "html", elements: new Set(), mutate: n, selector: e });
}
//@ chunk-aepeg2w5.js:21148-21231 esm-fingerprint
function B_(e, n) {
  return Ws({ kind: "position", elements: new Set(), mutate: n, selector: e });
}
//@ chunk-aepeg2w5.js:21231-21311 esm-fingerprint
function oi(e, n) {
  return Ws({ kind: "class", elements: new Set(), mutate: n, selector: e });
}
//@ chunk-aepeg2w5.js:21311-21618 esm-fingerprint
function Ns(e, n, r) {
  if (!$P.test(n)) return Yd;
  if (n === "class" || n === "className")
    return oi(e, function (s) {
      var h = r(Array.from(s).join(" "));
      if ((s.clear(), !h)) return;
      h.split(/\s+/g)
        .filter(Boolean)
        .forEach(function (y) {
          return s.add(y);
        });
    });
  return Ws({ kind: "attribute", attribute: n, elements: new Set(), mutate: r, selector: e });
}
//@ chunk-aepeg2w5.js:21618-22416 esm-fingerprint
function gM(e) {
  var {
    selector: selector,
    action: action,
    value: s,
    attribute: attribute,
    parentSelector: parentSelector,
    insertBeforeSelector: insertBeforeSelector,
  } = e;
  if (attribute === "html") {
    if (action === "append")
      return jd(selector, function (w) {
        return w + (s != null ? s : "");
      });
    else if (action === "set")
      return jd(selector, function () {
        return s != null ? s : "";
      });
  } else if (attribute === "class") {
    if (action === "append")
      return oi(selector, function (w) {
        if (s) w.add(s);
      });
    else if (action === "remove")
      return oi(selector, function (w) {
        if (s) w.delete(s);
      });
    else if (action === "set")
      return oi(selector, function (w) {
        if ((w.clear(), s)) w.add(s);
      });
  } else if (attribute === "position") {
    if (action === "set" && parentSelector)
      return B_(selector, function () {
        return { insertBeforeSelector: insertBeforeSelector, parentSelector: parentSelector };
      });
  } else if (action === "append")
    return Ns(selector, attribute, function (w) {
      return w !== null ? w + (s != null ? s : "") : s != null ? s : "";
    });
  else if (action === "set")
    return Ns(selector, attribute, function () {
      return s != null ? s : "";
    });
  else if (action === "remove")
    return Ns(selector, attribute, function () {
      return null;
    });
  return Yd;
}
//@ chunk-aepeg2w5.js:22416-22490 esm-fingerprint
var _M = { html: jd, classes: oi, attribute: Ns, position: B_, declarative: gM },
  K_ = _M;
//@ chunk-aepeg2w5.js:22490-22500 esm-layout
var Xd = {};
//@ chunk-aepeg2w5.js:22500-22773 esm-fingerprint
function Yn(e, n, r) {
  r = r || {};
  for (let [s, h] of Object.entries(n))
    switch (s) {
      case "$or":
        if (!G_(e, h, r)) return !1;
        break;
      case "$nor":
        if (G_(e, h, r)) return !1;
        break;
      case "$and":
        if (!EM(e, h, r)) return !1;
        break;
      case "$not":
        if (Yn(e, h, r)) return !1;
        break;
      default:
        if (!ii(h, hM(e, s), r)) return !1;
    }
  return !0;
}
//@ chunk-aepeg2w5.js:22773-22912 esm-fingerprint
function hM(e, n) {
  let parts = n.split("."),
    s = e;
  for (let h = 0; h < parts.length; h++)
    if (s && typeof s === "object" && parts[h] in s) s = s[parts[h]];
    else return null;
  return s;
}
//@ chunk-aepeg2w5.js:22912-23000 esm-fingerprint
function yM(e) {
  if (!Xd[e]) Xd[e] = new RegExp(e.replace(/([^\\])\//g, "$1\\/"));
  return Xd[e];
}
//@ chunk-aepeg2w5.js:23000-23298 esm-fingerprint
function ii(e, n, r) {
  if (typeof e === "string") return n + "" === e;
  if (typeof e === "number") return n * 1 === e;
  if (typeof e === "boolean") return n !== null && !!n === e;
  if (e === null) return n === null;
  if (Array.isArray(e) || !$_(e)) return JSON.stringify(n) === JSON.stringify(e);
  for (let key in e) if (!vM(key, n, e[key], r)) return !1;
  return !0;
}
//@ chunk-aepeg2w5.js:23298-23397 esm-fingerprint
function $_(e) {
  let keys = Object.keys(e);
  return keys.length > 0 && keys.filter((r) => r[0] === "$").length === keys.length;
}
//@ chunk-aepeg2w5.js:23397-23577 esm-fingerprint
function bM(e) {
  if (e === null) return "null";
  if (Array.isArray(e)) return "array";
  let n = typeof e;
  if (["string", "number", "boolean", "object", "undefined"].includes(n)) return n;
  return "unknown";
}
//@ chunk-aepeg2w5.js:23577-23730 esm-layout
function SM(e, n, r) {
  if (!Array.isArray(e)) return !1;
  let s = $_(n) ? (h) => ii(n, h, r) : (h) => Yn(h, n, r);
  for (let h = 0; h < e.length; h++) if (e[h] && s(e[h])) return !0;
  return !1;
}
//@ chunk-aepeg2w5.js:23730-23822 esm-fingerprint
function js(e, n) {
  if (Array.isArray(e)) return e.some((r) => n.includes(r));
  return n.includes(e);
}
//@ chunk-aepeg2w5.js:23822-24832 esm-fingerprint
function vM(e, n, r, s) {
  switch (e) {
    case "$veq":
      return zt(n) === zt(r);
    case "$vne":
      return zt(n) !== zt(r);
    case "$vgt":
      return zt(n) > zt(r);
    case "$vgte":
      return zt(n) >= zt(r);
    case "$vlt":
      return zt(n) < zt(r);
    case "$vlte":
      return zt(n) <= zt(r);
    case "$eq":
      return n === r;
    case "$ne":
      return n !== r;
    case "$lt":
      return n < r;
    case "$lte":
      return n <= r;
    case "$gt":
      return n > r;
    case "$gte":
      return n >= r;
    case "$exists":
      return r ? n != null : n == null;
    case "$in":
      if (!Array.isArray(r)) return !1;
      return js(n, r);
    case "$inGroup":
      return js(n, s[r] || []);
    case "$notInGroup":
      return !js(n, s[r] || []);
    case "$nin":
      if (!Array.isArray(r)) return !1;
      return !js(n, r);
    case "$not":
      return !ii(r, n, s);
    case "$size":
      if (!Array.isArray(n)) return !1;
      return ii(r, n.length, s);
    case "$elemMatch":
      return SM(n, r, s);
    case "$all":
      if (!Array.isArray(n)) return !1;
      for (let h = 0; h < r.length; h++) {
        let y = !1;
        for (let S = 0; S < n.length; S++)
          if (ii(r[h], n[S], s)) {
            y = !0;
            break;
          }
        if (!y) return !1;
      }
      return !0;
    case "$regex":
      try {
        return yM(r).test(n);
      } catch (error) {
        return !1;
      }
    case "$type":
      return bM(n) === r;
    default:
      return (console.error("Unknown operator: " + e), !1);
  }
}
//@ chunk-aepeg2w5.js:24832-24934 esm-layout
function G_(e, n, r) {
  if (!n.length) return !0;
  for (let s = 0; s < n.length; s++) if (Yn(e, n[s], r)) return !0;
  return !1;
}
//@ chunk-aepeg2w5.js:24934-25015 esm-layout
function EM(e, n, r) {
  for (let s = 0; s < n.length; s++) if (!Yn(e, n[s], r)) return !1;
  return !0;
}
//@ chunk-aepeg2w5.js:25015-25065 esm-fingerprint
var FEATURE_EVALUATED_EVENT = "Feature Evaluated",
  wM = "Experiment Viewed";
//@ chunk-aepeg2w5.js:25065-25275 esm-fingerprint
function getForcedFeatureValues(e) {
  let n = new Map();
  if (e.global.forcedFeatureValues)
    e.global.forcedFeatureValues.forEach((forcedFeatureValue, s) => n.set(s, forcedFeatureValue));
  if (e.user.forcedFeatureValues)
    e.user.forcedFeatureValues.forEach((forcedFeatureValue, s) => n.set(s, forcedFeatureValue));
  return n;
}
//@ chunk-aepeg2w5.js:25275-25552 esm-fingerprint
function getForcedVariations(e) {
  if (e.global.forcedVariations && e.user.forcedVariations)
    return { ...e.global.forcedVariations, ...e.user.forcedVariations };
  else if (e.global.forcedVariations) return e.global.forcedVariations;
  else if (e.user.forcedVariations) return e.user.forcedVariations;
  else return {};
}
//@ chunk-aepeg2w5.js:25552-25598 esm-layout
async function eo(e) {
  try {
    await e();
  } catch (error) {}
}
//@ chunk-aepeg2w5.js:25598-26240 esm-fingerprint
function W_(e, n, r) {
  if (e.user.trackedExperiments) {
    let h = qs(n, r);
    if (e.user.trackedExperiments.has(h)) return [];
    e.user.trackedExperiments.add(h);
  }
  if (e.user.enableDevMode && e.user.devLogs)
    e.user.devLogs.push({
      experiment: n,
      result: r,
      timestamp: Date.now().toString(),
      logType: "experiment",
    });
  let s = [];
  if (e.global.trackingCallback) {
    let trackingCallback = e.global.trackingCallback;
    s.push(eo(() => trackingCallback(n, r, e.user)));
  }
  if (e.user.trackingCallback) {
    let trackingCallback = e.user.trackingCallback;
    s.push(eo(() => trackingCallback(n, r)));
  }
  if (e.global.eventLogger) {
    let eventLogger = e.global.eventLogger;
    s.push(
      eo(() =>
        eventLogger(
          wM,
          { experimentId: n.key, variationId: r.key, hashAttribute: r.hashAttribute, hashValue: r.hashValue },
          e.user,
        ),
      ),
    );
  }
  return s;
}
//@ chunk-aepeg2w5.js:26240-26910 esm-fingerprint
function CM(e, n, r) {
  if (e.user.trackedFeatureUsage) {
    let json = JSON.stringify(r.value);
    if (e.user.trackedFeatureUsage[n] === json) return;
    if (((e.user.trackedFeatureUsage[n] = json), e.user.enableDevMode && e.user.devLogs))
      e.user.devLogs.push({ featureKey: n, result: r, timestamp: Date.now().toString(), logType: "feature" });
  }
  if (e.global.onFeatureUsage) {
    let onFeatureUsage = e.global.onFeatureUsage;
    eo(() => onFeatureUsage(n, r, e.user));
  }
  if (e.user.onFeatureUsage) {
    let onFeatureUsage = e.user.onFeatureUsage;
    eo(() => onFeatureUsage(n, r));
  }
  if (e.global.eventLogger) {
    let eventLogger = e.global.eventLogger;
    eo(() =>
      eventLogger(
        FEATURE_EVALUATED_EVENT,
        {
          feature: n,
          source: r.source,
          value: r.value,
          ruleId: r.source === "defaultValue" ? "$default" : r.ruleId || "",
          variationId: r.experimentResult ? r.experimentResult.key : "",
        },
        e.user,
      ),
    );
  }
}
//@ chunk-aepeg2w5.js:26910-29050 esm-fingerprint
function evaluateFeature(e, n) {
  if (n.stack.evaluatedFeatures.has(e)) return getFeatureResult(n, e, null, "cyclicPrerequisite");
  (n.stack.evaluatedFeatures.add(e), (n.stack.id = e));
  let r = getForcedFeatureValues(n);
  if (r.has(e)) return getFeatureResult(n, e, r.get(e), "override");
  if (!n.global.features || !n.global.features[e]) return getFeatureResult(n, e, null, "unknownFeature");
  let s = n.global.features[e];
  if (s.rules) {
    let h = new Set(n.stack.evaluatedFeatures);
    e: for (let rule of s.rules) {
      if (rule.parentConditions)
        for (let parentCondition of rule.parentConditions) {
          n.stack.evaluatedFeatures = new Set(h);
          let x = evaluateFeature(parentCondition.id, n);
          if (x.source === "cyclicPrerequisite") return getFeatureResult(n, e, null, "cyclicPrerequisite");
          let P = { value: x.value };
          if (!Yn(P, parentCondition.condition || {})) {
            if (parentCondition.gate) return getFeatureResult(n, e, null, "prerequisite");
            continue e;
          }
        }
      if (rule.filters && V_(rule.filters, n)) continue;
      if ("force" in rule) {
        if (rule.condition && !j_(rule.condition, n)) continue;
        if (
          !RM(
            n,
            rule.seed || e,
            rule.hashAttribute,
            n.user.saveStickyBucketAssignmentDoc && !rule.disableStickyBucketing
              ? rule.fallbackAttribute
              : void 0,
            rule.range,
            rule.coverage,
            rule.hashVersion,
          )
        )
          continue;
        if (rule.tracks)
          rule.tracks.forEach((track) => {
            if (!W_(n, track.experiment, track.result).length && n.global.saveDeferredTrack)
              n.global.saveDeferredTrack({ experiment: track.experiment, result: track.result });
          });
        return getFeatureResult(n, e, rule.force, "force", rule.id);
      }
      if (!rule.variations) continue;
      let S = { variations: rule.variations, key: rule.key || e };
      if ("coverage" in rule) S.coverage = rule.coverage;
      if (rule.weights) S.weights = rule.weights;
      if (rule.hashAttribute) S.hashAttribute = rule.hashAttribute;
      if (rule.fallbackAttribute) S.fallbackAttribute = rule.fallbackAttribute;
      if (rule.disableStickyBucketing) S.disableStickyBucketing = rule.disableStickyBucketing;
      if (rule.bucketVersion !== void 0) S.bucketVersion = rule.bucketVersion;
      if (rule.minBucketVersion !== void 0) S.minBucketVersion = rule.minBucketVersion;
      if (rule.namespace) S.namespace = rule.namespace;
      if (rule.meta) S.meta = rule.meta;
      if (rule.ranges) S.ranges = rule.ranges;
      if (rule.name) S.name = rule.name;
      if (rule.phase) S.phase = rule.phase;
      if (rule.seed) S.seed = rule.seed;
      if (rule.hashVersion) S.hashVersion = rule.hashVersion;
      if (rule.filters) S.filters = rule.filters;
      if (rule.condition) S.condition = rule.condition;
      let { result: w } = runExperiment(S, e, n);
      if ((n.global.onExperimentEval && n.global.onExperimentEval(S, w), w.inExperiment && !w.passthrough))
        return getFeatureResult(n, e, w.value, "experiment", rule.id, S, w);
    }
  }
  return getFeatureResult(n, e, s.defaultValue === void 0 ? null : s.defaultValue, "defaultValue");
}
//@ chunk-aepeg2w5.js:29050-31779 esm-fingerprint
function runExperiment(e, n, r) {
  let key = e.key,
    h = e.variations.length;
  if (h < 2) return { result: ze(r, e, -1, !1, n) };
  if (r.global.enabled === !1 || r.user.enabled === !1) return { result: ze(r, e, -1, !1, n) };
  if (((e = xM(e, r)), e.urlPatterns && !Qo(r.user.url || "", e.urlPatterns)))
    return { result: ze(r, e, -1, !1, n) };
  let y = m_(key, r.user.url || "", h);
  if (y !== null) return { result: ze(r, e, y, !1, n) };
  let S = getForcedVariations(r);
  if (key in S) {
    let q = S[key];
    return { result: ze(r, e, q, !1, n) };
  }
  if (e.status === "draft" || e.active === !1) return { result: ze(r, e, -1, !1, n) };
  let { hashAttribute: hashAttribute, hashValue: hashValue } = wr(
    r,
    e.hashAttribute,
    r.user.saveStickyBucketAssignmentDoc && !e.disableStickyBucketing ? e.fallbackAttribute : void 0,
  );
  if (!hashValue) return { result: ze(r, e, -1, !1, n) };
  let x = -1,
    P = !1,
    F = !1;
  if (r.user.saveStickyBucketAssignmentDoc && !e.disableStickyBucketing) {
    let { variation: variation, versionIsBlocked: versionIsBlocked } = MM({
      ctx: r,
      expKey: e.key,
      expBucketVersion: e.bucketVersion,
      expHashAttribute: e.hashAttribute,
      expFallbackAttribute: e.fallbackAttribute,
      expMinBucketVersion: e.minBucketVersion,
      expMeta: e.meta,
    });
    ((P = variation >= 0), (x = variation), (F = !!versionIsBlocked));
  }
  if (!P) {
    if (e.filters) {
      if (V_(e.filters, r)) return { result: ze(r, e, -1, !1, n) };
    } else if (e.namespace && !c_(hashValue, e.namespace)) return { result: ze(r, e, -1, !1, n) };
    if (e.include && !g_(e.include)) return { result: ze(r, e, -1, !1, n) };
    if (e.condition && !j_(e.condition, r)) return { result: ze(r, e, -1, !1, n) };
    if (e.parentConditions) {
      let q = new Set(r.stack.evaluatedFeatures);
      for (let parentCondition of e.parentConditions) {
        r.stack.evaluatedFeatures = new Set(q);
        let re = evaluateFeature(parentCondition.id, r);
        if (re.source === "cyclicPrerequisite") return { result: ze(r, e, -1, !1, n) };
        let se = { value: re.value };
        if (!Yn(se, parentCondition.condition || {})) return { result: ze(r, e, -1, !1, n) };
      }
    }
    if (e.groups && !PM(e.groups, r)) return { result: ze(r, e, -1, !1, n) };
  }
  if (e.url && !OM(e.url, r)) return { result: ze(r, e, -1, !1, n) };
  let L = Jo(e.seed || key, hashValue, e.hashVersion || 1);
  if (L === null) return { result: ze(r, e, -1, !1, n) };
  if (!P) {
    let q = e.ranges || p_(h, e.coverage === void 0 ? 1 : e.coverage, e.weights);
    x = f_(L, q);
  }
  if (F) return { result: ze(r, e, -1, !1, n, void 0, !0) };
  if (x < 0) return { result: ze(r, e, -1, !1, n) };
  if ("force" in e) return { result: ze(r, e, e.force === void 0 ? -1 : e.force, !1, n) };
  if (r.global.qaMode || r.user.qaMode) return { result: ze(r, e, -1, !1, n) };
  if (e.status === "stopped") return { result: ze(r, e, -1, !1, n) };
  let G = ze(r, e, x, !0, n, L, P);
  if (r.user.saveStickyBucketAssignmentDoc && !e.disableStickyBucketing) {
    let {
      changed: changed,
      key: key,
      doc: doc,
    } = DM(r, hashAttribute, Zo(hashValue), { [ec(e.key, e.bucketVersion)]: G.key });
    if (changed)
      ((r.user.stickyBucketAssignmentDocs = r.user.stickyBucketAssignmentDocs || {}),
        (r.user.stickyBucketAssignmentDocs[key] = doc),
        r.user.saveStickyBucketAssignmentDoc(doc));
  }
  let j = W_(r, e, G);
  if (j.length === 0 && r.global.saveDeferredTrack) r.global.saveDeferredTrack({ experiment: e, result: G });
  let ee = !j.length ? void 0 : j.length === 1 ? j[0] : Promise.all(j).then(() => {});
  return (
    "changeId" in e && e.changeId && r.global.recordChangeId && r.global.recordChangeId(e.changeId),
    { result: G, trackingCall: ee }
  );
}
//@ chunk-aepeg2w5.js:31779-31941 esm-fingerprint
function getFeatureResult(e, n, r, s, h, y, S) {
  let w = { value: r, on: !!r, off: !r, source: s, ruleId: h || "" };
  if (y) w.experiment = y;
  if (S) w.experimentResult = S;
  if (s !== "override") CM(e, n, w);
  return w;
}
//@ chunk-aepeg2w5.js:31941-32014 esm-fingerprint
function z_(e) {
  return { ...e.user.attributes, ...e.user.attributeOverrides };
}
//@ chunk-aepeg2w5.js:32014-32075 esm-fingerprint
function j_(e, n) {
  return Yn(z_(n), e, n.global.savedGroups || {});
}
//@ chunk-aepeg2w5.js:32075-32256 esm-fingerprint
function V_(e, n) {
  return e.some((r) => {
    let { hashValue: hashValue } = wr(n, r.attribute);
    if (!hashValue) return !0;
    let h = Jo(r.seed, hashValue, r.hashVersion || 2);
    if (h === null) return !0;
    return !r.ranges.some((range) => Rs(h, range));
  });
}
//@ chunk-aepeg2w5.js:32256-32450 esm-fingerprint
function RM(e, n, r, s, h, y, S) {
  if (!h && y === void 0) return !0;
  if (!h && y === 0) return !1;
  let { hashValue: hashValue } = wr(e, r, s);
  if (!hashValue) return !1;
  let R = Jo(n, hashValue, S || 1);
  if (R === null) return !1;
  return h ? Rs(R, h) : y !== void 0 ? R <= y : !0;
}
//@ chunk-aepeg2w5.js:32450-32940 esm-fingerprint
function ze(e, n, r, s, h, y, S) {
  let w = !0;
  if (r < 0 || r >= n.variations.length) ((r = 0), (w = !1));
  let { hashAttribute: hashAttribute, hashValue: hashValue } = wr(
      e,
      n.hashAttribute,
      e.user.saveStickyBucketAssignmentDoc && !n.disableStickyBucketing ? n.fallbackAttribute : void 0,
    ),
    P = n.meta ? n.meta[r] : {},
    F = {
      key: P.key || "" + r,
      featureId: h,
      inExperiment: w,
      hashUsed: s,
      variationId: r,
      value: n.variations[r],
      hashAttribute: hashAttribute,
      hashValue: hashValue,
      stickyBucketUsed: !!S,
    };
  if (P.name) F.name = P.name;
  if (y !== void 0) F.bucket = y;
  if (P.passthrough) F.passthrough = P.passthrough;
  return F;
}
//@ chunk-aepeg2w5.js:32940-33081 esm-fingerprint
function xM(e, n) {
  let key = e.key,
    overrides = n.global.overrides;
  if (overrides && overrides[key]) {
    if (((e = Object.assign({}, e, overrides[key])), typeof e.url === "string")) e.url = Fd(e.url);
  }
  return e;
}
//@ chunk-aepeg2w5.js:33081-33212 esm-fingerprint
function wr(e, n, r) {
  let s = n || "id",
    h = "",
    y = z_(e);
  if (y[s]) h = y[s];
  if (!h && r) {
    if (y[r]) h = y[r];
    if (h) s = r;
  }
  return { hashAttribute: s, hashValue: h };
}
//@ chunk-aepeg2w5.js:33212-33373 esm-fingerprint
function OM(e, n) {
  let url = n.user.url;
  if (!url) return !1;
  let replaced = url.replace(/^https?:\/\//, "").replace(/^[^/]*\//, "/");
  if (e.test(url)) return !0;
  if (e.test(replaced)) return !0;
  return !1;
}
//@ chunk-aepeg2w5.js:33373-33472 esm-fingerprint
function PM(e, n) {
  let r = n.global.groups || {};
  for (let s = 0; s < e.length; s++) if (r[e[s]]) return !0;
  return !1;
}
//@ chunk-aepeg2w5.js:33472-33889 esm-fingerprint
function MM(e) {
  let {
    ctx: ctx,
    expKey: expKey,
    expBucketVersion: expBucketVersion,
    expHashAttribute: expHashAttribute,
    expFallbackAttribute: expFallbackAttribute,
    expMinBucketVersion: expMinBucketVersion,
    expMeta: expMeta,
  } = e;
  ((expBucketVersion = expBucketVersion || 0),
    (expMinBucketVersion = expMinBucketVersion || 0),
    (expHashAttribute = expHashAttribute || "id"),
    (expMeta = expMeta || []));
  let R = ec(expKey, expBucketVersion),
    x = IM(ctx, expHashAttribute, expFallbackAttribute);
  if (expMinBucketVersion > 0)
    for (let L = 0; L <= expMinBucketVersion; L++) {
      let G = ec(expKey, L);
      if (x[G] !== void 0) return { variation: -1, versionIsBlocked: !0 };
    }
  let P = x[R];
  if (P === void 0) return { variation: -1 };
  let index = expMeta.findIndex((L) => L.key === P);
  if (index < 0) return { variation: -1 };
  return { variation: index };
}
//@ chunk-aepeg2w5.js:33889-33933 esm-layout
function ec(e, n) {
  return ((n = n || 0), `${e}__${n}`);
}
//@ chunk-aepeg2w5.js:33933-33969 esm-layout
function rc(e, n) {
  return `${e}||${n}`;
}
//@ chunk-aepeg2w5.js:33969-34386 esm-fingerprint
function IM(e, n, r) {
  if (!e.user.stickyBucketAssignmentDocs) return {};
  let { hashAttribute: hashAttribute, hashValue: hashValue } = wr(e, n),
    y = rc(hashAttribute, Zo(hashValue)),
    { hashAttribute: hashAttribute_2, hashValue: hashValue_2 } = wr(e, r),
    R = hashValue_2 ? rc(hashAttribute_2, Zo(hashValue_2)) : null,
    x = {};
  if (R && e.user.stickyBucketAssignmentDocs[R])
    Object.assign(x, e.user.stickyBucketAssignmentDocs[R].assignments || {});
  if (e.user.stickyBucketAssignmentDocs[y])
    Object.assign(x, e.user.stickyBucketAssignmentDocs[y].assignments || {});
  return x;
}
//@ chunk-aepeg2w5.js:34386-34682 esm-fingerprint
function DM(e, n, r, s) {
  let h = rc(n, r),
    y =
      e.user.stickyBucketAssignmentDocs && e.user.stickyBucketAssignmentDocs[h]
        ? e.user.stickyBucketAssignmentDocs[h].assignments || {}
        : {},
    S = { ...y, ...s },
    w = JSON.stringify(y) !== JSON.stringify(S);
  return { key: h, doc: { attributeName: n, attributeValue: r, assignments: S }, changed: w };
}
//@ chunk-aepeg2w5.js:34682-35107 esm-fingerprint
function NM(e, n) {
  let r = new Set(),
    s = n && n.features ? n.features : e.global.features || {},
    h = n && n.experiments ? n.experiments : e.global.experiments || [];
  return (
    Object.keys(s).forEach((y) => {
      let S = s[y];
      if (S.rules) {
        for (let rule of S.rules)
          if (rule.variations) {
            if ((r.add(rule.hashAttribute || "id"), rule.fallbackAttribute)) r.add(rule.fallbackAttribute);
          }
      }
    }),
    h.map((y) => {
      if ((r.add(y.hashAttribute || "id"), y.fallbackAttribute)) r.add(y.fallbackAttribute);
    }),
    Array.from(r)
  );
}
//@ chunk-aepeg2w5.js:35107-35176 esm-fingerprint
async function Y_(e, n, r) {
  let s = oc(e, r);
  return n.getAllAssignments(s);
}
//@ chunk-aepeg2w5.js:35176-35271 esm-fingerprint
function oc(e, n) {
  let r = {};
  return (
    NM(e, n).forEach((h) => {
      let { hashValue: hashValue } = wr(e, h);
      r[h] = Zo(hashValue);
    }),
    r
  );
}
//@ chunk-aepeg2w5.js:35271-35752 esm-fingerprint
async function q_(e, n, r) {
  if (((e = { ...e }), e.encryptedFeatures)) {
    try {
      e.features = JSON.parse(await br(e.encryptedFeatures, n, r));
    } catch (error) {
      console.error(error);
    }
    delete e.encryptedFeatures;
  }
  if (e.encryptedExperiments) {
    try {
      e.experiments = JSON.parse(await br(e.encryptedExperiments, n, r));
    } catch (error) {
      console.error(error);
    }
    delete e.encryptedExperiments;
  }
  if (e.encryptedSavedGroups) {
    try {
      e.savedGroups = JSON.parse(await br(e.encryptedSavedGroups, n, r));
    } catch (error) {
      console.error(error);
    }
    delete e.encryptedSavedGroups;
  }
  return e;
}
//@ chunk-aepeg2w5.js:35752-36003 esm-fingerprint
function X_(e) {
  let n = e.apiHost || "https://cdn.growthbook.io";
  return {
    apiHost: n.replace(/\/*$/, ""),
    streamingHost: (e.streamingHost || n).replace(/\/*$/, ""),
    apiRequestHeaders: e.apiHostRequestHeaders,
    streamingHostRequestHeaders: e.streamingHostRequestHeaders,
  };
}
//@ chunk-aepeg2w5.js:36003-36075 esm-fingerprint
function qs(e, n) {
  return n.hashAttribute + n.hashValue + e.key + n.variationId;
}
//@ chunk-aepeg2w5.js:36075-36129 esm-layout
var to = typeof window < "u" && typeof document < "u",
  FM = __();
//@ chunk-aepeg2w5.js:36129-50738 esm-fingerprint
class Js {
  constructor(e) {
    if (
      ((e = e || {}),
      (this.version = FM),
      (this._options = this.context = e),
      (this._renderer = e.renderer || null),
      (this._trackedExperiments = new Set()),
      (this._completedChangeIds = new Set()),
      (this._trackedFeatures = {}),
      (this.debug = !!e.debug),
      (this._subscriptions = new Set()),
      (this.ready = !1),
      (this._assigned = new Map()),
      (this._activeAutoExperiments = new Map()),
      (this._triggeredExpKeys = new Set()),
      (this._initialized = !1),
      (this._redirectedUrl = ""),
      (this._deferredTrackingCalls = new Map()),
      (this._autoExperimentsAllowed = !e.disableExperimentsOnLoad),
      (this._destroyCallbacks = []),
      (this.logs = []),
      (this.log = this.log.bind(this)),
      (this._saveDeferredTrack = this._saveDeferredTrack.bind(this)),
      (this._fireSubscriptions = this._fireSubscriptions.bind(this)),
      (this._recordChangedId = this._recordChangedId.bind(this)),
      e.remoteEval)
    ) {
      if (e.decryptionKey) throw Error("Encryption is not available for remoteEval");
      if (!e.clientKey) throw Error("Missing clientKey");
      let n = !1;
      try {
        n = !!new URL(e.apiHost || "").hostname.match(/growthbook\.io$/i);
      } catch (error) {}
      if (n) throw Error("Cannot use remoteEval on GrowthBook Cloud");
    } else if (e.cacheKeyAttributes) throw Error("cacheKeyAttributes are only used for remoteEval");
    if (e.stickyBucketService) {
      let stickyBucketService = e.stickyBucketService;
      this._saveStickyBucketAssignmentDoc = (r) => stickyBucketService.saveAssignments(r);
    }
    if (e.plugins) for (let plugin of e.plugins) plugin(this);
    if (e.features) this.ready = !0;
    if (to && e.enableDevMode) ((window._growthbook = this), document.dispatchEvent(new Event("gbloaded")));
    if (e.experiments) ((this.ready = !0), this._updateAllAutoExperiments());
    if (this._options.stickyBucketService && this._options.stickyBucketAssignmentDocs)
      for (let key in this._options.stickyBucketAssignmentDocs) {
        let r = this._options.stickyBucketAssignmentDocs[key];
        if (r) this._options.stickyBucketService.saveAssignments(r).catch(() => {});
      }
    if (this.ready) this.refreshStickyBuckets(this.getPayload());
  }
  async setPayload(e) {
    this._payload = e;
    let n = await q_(e, this._options.decryptionKey);
    if (((this._decryptedPayload = n), await this.refreshStickyBuckets(n), n.features))
      this._options.features = n.features;
    if (n.savedGroups) this._options.savedGroups = n.savedGroups;
    if (n.experiments) ((this._options.experiments = n.experiments), this._updateAllAutoExperiments());
    ((this.ready = !0), this._render());
  }
  initSync(e) {
    this._initialized = !0;
    let payload = e.payload;
    if (payload.encryptedExperiments || payload.encryptedFeatures)
      throw Error("initSync does not support encrypted payloads");
    if (this._options.stickyBucketService && !this._options.stickyBucketAssignmentDocs)
      this._options.stickyBucketAssignmentDocs = this.generateStickyBucketAssignmentDocsSync(
        this._options.stickyBucketService,
        payload,
      );
    if (((this._payload = payload), (this._decryptedPayload = payload), payload.features))
      this._options.features = payload.features;
    if (payload.experiments)
      ((this._options.experiments = payload.experiments), this._updateAllAutoExperiments());
    return ((this.ready = !0), Ms(this, e), this);
  }
  async init(e) {
    if (((this._initialized = !0), (e = e || {}), e.cacheSettings)) Ud(e.cacheSettings);
    if (e.payload) return (await this.setPayload(e.payload), Ms(this, e), { success: !0, source: "init" });
    else {
      let { data: n, ...r } = await this._refresh({ ...e, allowStale: !0 });
      return (Ms(this, e), await this.setPayload(n || {}), r);
    }
  }
  async loadFeatures(e) {
    ((e = e || {}),
      await this.init({
        skipCache: e.skipCache,
        timeout: e.timeout,
        streaming:
          (this._options.backgroundSync ?? !0) && (e.autoRefresh || this._options.subscribeToChanges),
      }));
  }
  async refreshFeatures(e) {
    let _refresh = await this._refresh({ ...(e || {}), allowStale: !1 });
    if (_refresh.data) await this.setPayload(_refresh.data);
  }
  getApiInfo() {
    return [this.getApiHosts().apiHost, this.getClientKey()];
  }
  getApiHosts() {
    return X_(this._options);
  }
  getClientKey() {
    return this._options.clientKey || "";
  }
  getPayload() {
    return this._payload || { features: this.getFeatures(), experiments: this.getExperiments() };
  }
  getDecryptedPayload() {
    return this._decryptedPayload || this.getPayload();
  }
  isRemoteEval() {
    return this._options.remoteEval || !1;
  }
  getCacheKeyAttributes() {
    return this._options.cacheKeyAttributes;
  }
  async _refresh(e) {
    let { timeout: timeout, skipCache: skipCache, allowStale: allowStale, streaming: streaming } = e;
    if (!this._options.clientKey) throw Error("Missing clientKey");
    return S_({
      instance: this,
      timeout: timeout,
      skipCache: skipCache || this._options.disableCache,
      allowStale: allowStale,
      backgroundSync: streaming ?? this._options.backgroundSync ?? !0,
    });
  }
  _render() {
    if (this._renderer)
      try {
        this._renderer();
      } catch (error) {
        console.error("Failed to render", error);
      }
  }
  setFeatures(e) {
    ((this._options.features = e), (this.ready = !0), this._render());
  }
  async setEncryptedFeatures(e, n, r) {
    let s = await br(e, n || this._options.decryptionKey, r);
    this.setFeatures(JSON.parse(s));
  }
  setExperiments(e) {
    ((this._options.experiments = e), (this.ready = !0), this._updateAllAutoExperiments());
  }
  async setEncryptedExperiments(e, n, r) {
    let s = await br(e, n || this._options.decryptionKey, r);
    this.setExperiments(JSON.parse(s));
  }
  async setAttributes(e) {
    if (((this._options.attributes = e), this._options.stickyBucketService))
      await this.refreshStickyBuckets();
    if (this._options.remoteEval) {
      await this._refreshForRemoteEval();
      return;
    }
    (this._render(), this._updateAllAutoExperiments());
  }
  async updateAttributes(e) {
    return this.setAttributes({ ...this._options.attributes, ...e });
  }
  async setAttributeOverrides(e) {
    if (((this._options.attributeOverrides = e), this._options.stickyBucketService))
      await this.refreshStickyBuckets();
    if (this._options.remoteEval) {
      await this._refreshForRemoteEval();
      return;
    }
    (this._render(), this._updateAllAutoExperiments());
  }
  async setForcedVariations(e) {
    if (((this._options.forcedVariations = e || {}), this._options.remoteEval)) {
      await this._refreshForRemoteEval();
      return;
    }
    (this._render(), this._updateAllAutoExperiments());
  }
  setForcedFeatures(e) {
    ((this._options.forcedFeatureValues = e), this._render());
  }
  async setURL(e) {
    if (e === this._options.url) return;
    if (((this._options.url = e), (this._redirectedUrl = ""), this._options.remoteEval)) {
      (await this._refreshForRemoteEval(), this._updateAllAutoExperiments(!0));
      return;
    }
    this._updateAllAutoExperiments(!0);
  }
  getAttributes() {
    return { ...this._options.attributes, ...this._options.attributeOverrides };
  }
  getForcedVariations() {
    return this._options.forcedVariations || {};
  }
  getForcedFeatures() {
    return this._options.forcedFeatureValues || new Map();
  }
  getStickyBucketAssignmentDocs() {
    return this._options.stickyBucketAssignmentDocs || {};
  }
  getUrl() {
    return this._options.url || "";
  }
  getFeatures() {
    return this._options.features || {};
  }
  getExperiments() {
    return this._options.experiments || [];
  }
  getCompletedChangeIds() {
    return Array.from(this._completedChangeIds);
  }
  subscribe(e) {
    return (
      this._subscriptions.add(e),
      () => {
        this._subscriptions.delete(e);
      }
    );
  }
  async _refreshForRemoteEval() {
    if (!this._options.remoteEval) return;
    if (!this._initialized) return;
    let _refresh = await this._refresh({ allowStale: !1 });
    if (_refresh.data) await this.setPayload(_refresh.data);
  }
  getAllResults() {
    return new Map(this._assigned);
  }
  onDestroy(e) {
    this._destroyCallbacks.push(e);
  }
  isDestroyed() {
    return !!this._destroyed;
  }
  destroy() {
    if (
      ((this._destroyed = !0),
      this._destroyCallbacks.forEach((_destroyCallback) => {
        try {
          _destroyCallback();
        } catch (error) {
          console.error(error);
        }
      }),
      this._subscriptions.clear(),
      this._assigned.clear(),
      this._trackedExperiments.clear(),
      this._completedChangeIds.clear(),
      this._deferredTrackingCalls.clear(),
      (this._trackedFeatures = {}),
      (this._destroyCallbacks = []),
      (this._payload = void 0),
      (this._saveStickyBucketAssignmentDoc = void 0),
      v_(this),
      (this.logs = []),
      to && window._growthbook === this)
    )
      delete window._growthbook;
    (this._activeAutoExperiments.forEach((_activeAutoExperiment) => {
      _activeAutoExperiment.undo();
    }),
      this._activeAutoExperiments.clear(),
      this._triggeredExpKeys.clear());
  }
  setRenderer(e) {
    this._renderer = e;
  }
  forceVariation(e, n) {
    if (
      ((this._options.forcedVariations = this._options.forcedVariations || {}),
      (this._options.forcedVariations[e] = n),
      this._options.remoteEval)
    ) {
      this._refreshForRemoteEval();
      return;
    }
    (this._updateAllAutoExperiments(), this._render());
  }
  run(e) {
    let { result: n } = runExperiment(e, null, this._getEvalContext());
    return (this._fireSubscriptions(e, n), n);
  }
  triggerExperiment(e) {
    if ((this._triggeredExpKeys.add(e), !this._options.experiments)) return null;
    return this._options.experiments
      .filter((experiment) => experiment.key === e)
      .map((r) => this._runAutoExperiment(r))
      .filter((r) => r !== null);
  }
  triggerAutoExperiments() {
    ((this._autoExperimentsAllowed = !0), this._updateAllAutoExperiments(!0));
  }
  _getEvalContext() {
    return {
      user: this._getUserContext(),
      global: this._getGlobalContext(),
      stack: { evaluatedFeatures: new Set() },
    };
  }
  _getUserContext() {
    return {
      attributes: this._options.user
        ? { ...this._options.user, ...this._options.attributes }
        : this._options.attributes,
      enableDevMode: this._options.enableDevMode,
      blockedChangeIds: this._options.blockedChangeIds,
      stickyBucketAssignmentDocs: this._options.stickyBucketAssignmentDocs,
      url: this._getContextUrl(),
      forcedVariations: this._options.forcedVariations,
      forcedFeatureValues: this._options.forcedFeatureValues,
      attributeOverrides: this._options.attributeOverrides,
      saveStickyBucketAssignmentDoc: this._saveStickyBucketAssignmentDoc,
      trackingCallback: this._options.trackingCallback,
      onFeatureUsage: this._options.onFeatureUsage,
      devLogs: this.logs,
      trackedExperiments: this._trackedExperiments,
      trackedFeatureUsage: this._trackedFeatures,
    };
  }
  _getGlobalContext() {
    return {
      features: this._options.features,
      experiments: this._options.experiments,
      log: this.log,
      enabled: this._options.enabled,
      qaMode: this._options.qaMode,
      savedGroups: this._options.savedGroups,
      groups: this._options.groups,
      overrides: this._options.overrides,
      onExperimentEval: this._subscriptions.size > 0 ? this._fireSubscriptions : void 0,
      recordChangeId: this._recordChangedId,
      saveDeferredTrack: this._saveDeferredTrack,
      eventLogger: this._options.eventLogger,
    };
  }
  _runAutoExperiment(e, n) {
    let r = this._activeAutoExperiments.get(e);
    if (e.manual && !this._triggeredExpKeys.has(e.key) && !r) return null;
    let _isAutoExperimentBlockedByContext = this._isAutoExperimentBlockedByContext(e),
      h,
      y;
    if (_isAutoExperimentBlockedByContext) h = ze(this._getEvalContext(), e, -1, !1, "");
    else
      (({ result: h, trackingCall: y } = runExperiment(e, null, this._getEvalContext())),
        this._fireSubscriptions(e, h));
    let json = JSON.stringify(h.value);
    if (!n && h.inExperiment && r && r.valueHash === json) return h;
    if (r) this._undoActiveAutoExperiment(e);
    if (h.inExperiment) {
      let w = ei(e);
      if (w === "redirect" && h.value.urlRedirect && e.urlPatterns) {
        let R = e.persistQueryString ? h_(this._getContextUrl(), h.value.urlRedirect) : h.value.urlRedirect;
        if (Qo(R, e.urlPatterns))
          return (this.log("Skipping redirect because original URL matches redirect URL", { id: e.key }), h);
        this._redirectedUrl = R;
        let { navigate: navigate, delay: delay } = this._getNavigateFunction();
        if (navigate)
          if (to)
            Promise.all([
              ...(y ? [xs(y, this._options.maxNavigateDelay ?? 1000)] : []),
              new Promise((F) => window.setTimeout(F, this._options.navigateDelay ?? delay)),
            ]).then(() => {
              try {
                navigate(R);
              } catch (error) {
                console.error(error);
              }
            });
          else
            try {
              navigate(R);
            } catch (error) {
              console.error(error);
            }
      } else if (w === "visual") {
        let R = this._options.applyDomChangesCallback
          ? this._options.applyDomChangesCallback(h.value)
          : this._applyDOMChanges(h.value);
        if (R) this._activeAutoExperiments.set(e, { undo: R, valueHash: json });
      }
    }
    return h;
  }
  _undoActiveAutoExperiment(e) {
    let n = this._activeAutoExperiments.get(e);
    if (n) (n.undo(), this._activeAutoExperiments.delete(e));
  }
  _updateAllAutoExperiments(e) {
    if (!this._autoExperimentsAllowed) return;
    let n = this._options.experiments || [],
      r = new Set(n);
    this._activeAutoExperiments.forEach((_activeAutoExperiment, h) => {
      if (!r.has(h)) (_activeAutoExperiment.undo(), this._activeAutoExperiments.delete(h));
    });
    for (let s of n) {
      let _runAutoExperiment = this._runAutoExperiment(s, e);
      if (
        _runAutoExperiment !== null &&
        _runAutoExperiment !== void 0 &&
        _runAutoExperiment.inExperiment &&
        ei(s) === "redirect"
      )
        break;
    }
  }
  _fireSubscriptions(e, n) {
    let key = e.key,
      s = this._assigned.get(key);
    if (!s || s.result.inExperiment !== n.inExperiment || s.result.variationId !== n.variationId)
      (this._assigned.set(key, { experiment: e, result: n }),
        this._subscriptions.forEach((_subscription) => {
          try {
            _subscription(e, n);
          } catch (error) {
            console.error(error);
          }
        }));
  }
  _recordChangedId(e) {
    this._completedChangeIds.add(e);
  }
  isOn(e) {
    return this.evalFeature(e).on;
  }
  isOff(e) {
    return this.evalFeature(e).off;
  }
  getFeatureValue(e, n) {
    let r = this.evalFeature(e).value;
    return r === null ? n : r;
  }
  feature(e) {
    return this.evalFeature(e);
  }
  evalFeature(e) {
    return evaluateFeature(e, this._getEvalContext());
  }
  log(e, n) {
    if (!this.debug) return;
    if (this._options.log) this._options.log(e, n);
    else console.log(e, n);
  }
  getDeferredTrackingCalls() {
    return Array.from(this._deferredTrackingCalls.values());
  }
  setDeferredTrackingCalls(e) {
    this._deferredTrackingCalls = new Map(
      e.filter((n) => n && n.experiment && n.result).map((n) => [qs(n.experiment, n.result), n]),
    );
  }
  async fireDeferredTrackingCalls() {
    if (!this._options.trackingCallback) return;
    let e = [];
    (this._deferredTrackingCalls.forEach((_deferredTrackingCall) => {
      if (!_deferredTrackingCall || !_deferredTrackingCall.experiment || !_deferredTrackingCall.result)
        console.error("Invalid deferred tracking call", { call: _deferredTrackingCall });
      else
        e.push(
          this._options.trackingCallback(_deferredTrackingCall.experiment, _deferredTrackingCall.result),
        );
    }),
      this._deferredTrackingCalls.clear(),
      await Promise.all(e));
  }
  setTrackingCallback(e) {
    ((this._options.trackingCallback = e), this.fireDeferredTrackingCalls());
  }
  setEventLogger(e) {
    this._options.eventLogger = e;
  }
  async logEvent(e, n) {
    if (this._destroyed) {
      console.error("Cannot log event to destroyed GrowthBook instance");
      return;
    }
    if (this._options.enableDevMode)
      this.logs.push({ eventName: e, properties: n, timestamp: Date.now().toString(), logType: "event" });
    if (this._options.eventLogger)
      try {
        await this._options.eventLogger(e, n || {}, this._getUserContext());
      } catch (error) {
        console.error(error);
      }
    else console.error("No event logger configured");
  }
  _saveDeferredTrack(e) {
    this._deferredTrackingCalls.set(qs(e.experiment, e.result), e);
  }
  _getContextUrl() {
    return this._options.url || (to ? window.location.href : "");
  }
  _isAutoExperimentBlockedByContext(e) {
    let n = ei(e);
    if (n === "visual") {
      if (this._options.disableVisualExperiments) return !0;
      if (this._options.disableJsInjection) {
        if (e.variations.some((variation) => variation.js)) return !0;
      }
    } else if (n === "redirect") {
      if (this._options.disableUrlRedirectExperiments) return !0;
      try {
        let r = new URL(this._getContextUrl());
        for (let variation of e.variations) {
          if (!variation || !variation.urlRedirect) continue;
          let h = new URL(variation.urlRedirect);
          if (this._options.disableCrossOriginUrlRedirectExperiments) {
            if (h.protocol !== r.protocol) return !0;
            if (h.host !== r.host) return !0;
          }
        }
      } catch (error) {
        return (this.log("Error parsing current or redirect URL", { id: e.key, error: error }), !0);
      }
    } else return !0;
    if (e.changeId && (this._options.blockedChangeIds || []).includes(e.changeId)) return !0;
    return !1;
  }
  getRedirectUrl() {
    return this._redirectedUrl;
  }
  _getNavigateFunction() {
    if (this._options.navigate) return { navigate: this._options.navigate, delay: 0 };
    else if (to)
      return {
        navigate: (e) => {
          window.location.replace(e);
        },
        delay: 100,
      };
    return { navigate: null, delay: 0 };
  }
  _applyDOMChanges(e) {
    if (!to) return;
    let n = [];
    if (e.css) {
      let element = document.createElement("style");
      ((element.innerHTML = e.css), document.head.appendChild(element), n.push(() => element.remove()));
    }
    if (e.js) {
      let element = document.createElement("script");
      if (((element.innerHTML = e.js), this._options.jsInjectionNonce))
        element.nonce = this._options.jsInjectionNonce;
      (document.head.appendChild(element), n.push(() => element.remove()));
    }
    if (e.domMutations)
      e.domMutations.forEach((domMutation) => {
        n.push(K_.declarative(domMutation).revert);
      });
    return () => {
      n.forEach((r) => r());
    };
  }
  async refreshStickyBuckets(e) {
    if (this._options.stickyBucketService) {
      let _getEvalContext = this._getEvalContext(),
        r = await Y_(_getEvalContext, this._options.stickyBucketService, e);
      this._options.stickyBucketAssignmentDocs = r;
    }
  }
  generateStickyBucketAssignmentDocsSync(e, n) {
    if (!("getAllAssignmentsSync" in e)) {
      console.error("generating StickyBucketAssignmentDocs docs requires StickyBucketServiceSync");
      return;
    }
    let _getEvalContext = this._getEvalContext(),
      s = oc(_getEvalContext, n);
    return e.getAllAssignmentsSync(s);
  }
  inDevMode() {
    return !!this._options.enableDevMode;
  }
}

export { pu, xn, Ps, Nt, Js };
