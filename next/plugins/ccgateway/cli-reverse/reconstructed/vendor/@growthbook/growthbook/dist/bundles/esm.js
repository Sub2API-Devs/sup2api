/**
 * @growthbook/growthbook/dist/bundles/esm.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @growthbook/growthbook@1.6.1
 * pieces: chunk-exfmq47h.js (131)
 * attribution: esm-layout 25, esm-fingerprint 106
 */
import { promiseTimeout, getAutoExperimentChangeType } from "./esm.min.js";

//@ chunk-exfmq47h.js:6969-7027 esm-layout
function subscribe() {
  let value = null;
  return {
    get: () => value,
    set: (value_2) => {
      value = value_2;
    },
  };
}
//@ chunk-exfmq47h.js:7064-7235 esm-fingerprint
var polyfills$1 = {
  fetch: globalThis.fetch ? globalThis.fetch.bind(globalThis) : undefined,
  SubtleCrypto: globalThis.crypto ? globalThis.crypto.subtle : undefined,
  EventSource: globalThis.EventSource,
};
//@ chunk-exfmq47h.js:7235-7259 esm-layout
function getPolyfills() {
  return polyfills$1;
}
//@ chunk-exfmq47h.js:7259-7393 esm-fingerprint
function hashFnv32a(str) {
  let hval = 2166136261;
  let l = str.length;
  for (let i = 0; i < l; i++) {
    hval ^= str.charCodeAt(i);
    hval += (hval << 1) + (hval << 4) + (hval << 7) + (hval << 8) + (hval << 24);
  }
  return hval >>> 0;
}
//@ chunk-exfmq47h.js:7393-7497 esm-fingerprint
function hash(seed, value, version) {
  if (version === 2) return (hashFnv32a(hashFnv32a(seed + value) + "") % 1e4) / 1e4;
  if (version === 1) return (hashFnv32a(value + seed) % 1000) / 1000;
  return null;
}
//@ chunk-exfmq47h.js:7497-7555 esm-layout
function getEqualWeights(n) {
  if (n <= 0) return [];
  return Array(n).fill(1 / n);
}
//@ chunk-exfmq47h.js:7555-7595 esm-layout
function inRange(n_2, range) {
  return n_2 >= range[0] && n_2 < range[1];
}
//@ chunk-exfmq47h.js:7595-7680 esm-layout
function inNamespace(hashValue, namespace) {
  let n = hash("__" + namespace[0], hashValue, 1);
  if (n === null) return false;
  return n >= namespace[1] && n < namespace[2];
}
//@ chunk-exfmq47h.js:7680-7756 esm-layout
function chooseVariation(n_2, ranges) {
  for (let i = 0; i < ranges.length; i++) if (inRange(n_2, ranges[i])) return i;
  return -1;
}
//@ chunk-exfmq47h.js:7756-7868 esm-fingerprint
function getUrlRegExp(regexString) {
  try {
    let escaped = regexString.replace(/([^\\])\//g, "$1\\/");
    return new RegExp(escaped);
  } catch (e) {
    console.error(e);
    return;
  }
}
//@ chunk-exfmq47h.js:7868-8053 esm-fingerprint
function isURLTargeted(url, targets) {
  if (!targets.length) return false;
  let hasIncludeRules = false;
  let isIncluded = false;
  for (let i = 0; i < targets.length; i++) {
    let match = _evalURLTarget(url, targets[i].type, targets[i].pattern);
    if (targets[i].include === false) {
      if (match) return false;
    } else {
      hasIncludeRules = true;
      if (match) isIncluded = true;
    }
  }
  return isIncluded || !hasIncludeRules;
}
//@ chunk-exfmq47h.js:8053-8253 esm-fingerprint
function _evalSimpleUrlPart(actual, pattern, isPath) {
  try {
    let escaped = pattern.replace(/[*.+?^${}()|[\]\\]/g, "\\$&").replace(/_____/g, ".*");
    if (isPath) escaped = "\\/?" + escaped.replace(/(^\/|\/$)/g, "") + "\\/?";
    return new RegExp("^" + escaped + "$", "i").test(actual);
  } catch (e) {
    return false;
  }
}
//@ chunk-exfmq47h.js:8253-8590 esm-fingerprint
function _evalSimpleUrlTarget(actual, pattern) {
  try {
    let expected = new URL(
      pattern.replace(/^([^:/?]*)\./i, "https://$1.").replace(/\*/g, "_____"),
      "https://_____",
    );
    let comps = [
      [actual.host, expected.host, false],
      [actual.pathname, expected.pathname, true],
    ];
    if (expected.hash) comps.push([actual.hash, expected.hash, false]);
    expected.searchParams.forEach((v, k) => {
      comps.push([actual.searchParams.get(k) || "", v, false]);
    });
    return !comps.some((data) => !_evalSimpleUrlPart(data[0], data[1], data[2]));
  } catch (e) {
    return false;
  }
}
//@ chunk-exfmq47h.js:8590-8814 esm-fingerprint
function _evalURLTarget(url, type, pattern) {
  try {
    let parsed = new URL(url, "https://_");
    if (type === "regex") {
      let regex = getUrlRegExp(pattern);
      if (!regex) return false;
      return regex.test(parsed.href) || regex.test(parsed.href.substring(parsed.origin.length));
    } else if (type === "simple") return _evalSimpleUrlTarget(parsed, pattern);
    return false;
  } catch (e) {
    return false;
  }
}
//@ chunk-exfmq47h.js:8814-9026 esm-fingerprint
function getBucketRanges(numVariations, coverage, weights) {
  coverage = coverage === undefined ? 1 : coverage;
  if (coverage < 0) coverage = 0;
  else if (coverage > 1) coverage = 1;
  let equal = getEqualWeights(numVariations);
  weights = weights || equal;
  if (weights.length !== numVariations) weights = equal;
  let totalWeight = weights.reduce((w_2, sum) => sum + w_2, 0);
  if (totalWeight < 0.99 || totalWeight > 1.01) weights = equal;
  let cumulative = 0;
  return weights.map((w_2) => {
    let start = cumulative;
    cumulative += w_2;
    return [start, start + coverage * w_2];
  });
}
//@ chunk-exfmq47h.js:9026-9298 esm-fingerprint
function getQueryStringOverride(id, url, numVariations) {
  if (!url) return null;
  let search = url.split("?")[1];
  if (!search) return null;
  let match = search
    .replace(/#.*/, "")
    .split("&")
    .map((kv) => kv.split("=", 2))
    .filter((_ref) => {
      let [k] = _ref;
      return k === id;
    })
    .map((_ref2) => {
      let [, v] = _ref2;
      return parseInt(v);
    });
  if (match.length > 0 && match[0] >= 0 && match[0] < numVariations) return match[0];
  return null;
}
//@ chunk-exfmq47h.js:9298-9365 esm-layout
function isIncluded(include) {
  try {
    return include();
  } catch (e) {
    console.error(e);
    return false;
  }
}
//@ chunk-exfmq47h.js:9365-9423 esm-fingerprint
var base64ToBuf = (b) => Uint8Array.from(atob(b), (c) => c.charCodeAt(0));
//@ chunk-exfmq47h.js:9423-9824 esm-fingerprint
async function decrypt(encryptedString, decryptionKey, subtle) {
  decryptionKey = decryptionKey || "";
  subtle = subtle || (globalThis.crypto && globalThis.crypto.subtle) || polyfills$1.SubtleCrypto;
  if (!subtle) throw Error("No SubtleCrypto implementation found");
  try {
    let key = await subtle.importKey(
      "raw",
      base64ToBuf(decryptionKey),
      {
        name: "AES-CBC",
        length: 128,
      },
      true,
      ["encrypt", "decrypt"],
    );
    let [iv, cipherText] = encryptedString.split(".");
    let plainTextBuffer = await subtle.decrypt(
      {
        name: "AES-CBC",
        iv: base64ToBuf(iv),
      },
      key,
      base64ToBuf(cipherText),
    );
    return new TextDecoder().decode(plainTextBuffer);
  } catch (e) {
    throw Error("Failed to decrypt");
  }
}
//@ chunk-exfmq47h.js:9824-9896 esm-fingerprint
function toString(input) {
  if (typeof input === "string") return input;
  return JSON.stringify(input);
}
//@ chunk-exfmq47h.js:9896-10119 esm-fingerprint
function paddedVersionString(input) {
  if (typeof input === "number") input = input + "";
  if (!input || typeof input !== "string") input = "0";
  let parts = input.replace(/(^v|\+.*$)/g, "").split(/[-.]/);
  if (parts.length === 3) parts.push("~");
  return parts.map((v) => (v.match(/^[0-9]+$/) ? v.padStart(5, " ") : v)).join("-");
}
//@ chunk-exfmq47h.js:10119-10176 esm-fingerprint
function loadSDKVersion() {
  let version;
  try {
    version = "1.6.1";
  } catch (e) {
    version = "";
  }
  return version;
}
//@ chunk-exfmq47h.js:10176-10411 esm-fingerprint
function mergeQueryStrings(oldUrl, newUrl) {
  let currUrl;
  let redirectUrl;
  try {
    currUrl = new URL(oldUrl);
    redirectUrl = new URL(newUrl);
  } catch (e) {
    console.error(`Unable to merge query strings: ${e}`);
    return newUrl;
  }
  currUrl.searchParams.forEach((value, key) => {
    if (redirectUrl.searchParams.has(key)) return;
    redirectUrl.searchParams.set(key, value);
  });
  return redirectUrl.toString();
}
//@ chunk-exfmq47h.js:10855-11896 esm-layout
var cacheSettings = {
  staleTTL: 60000,
  maxAge: 14400000,
  cacheKey: "gbFeaturesCache",
  backgroundSync: true,
  maxEntries: 10,
  disableIdleStreams: false,
  idleStreamInterval: 20000,
  disableCache: false,
};
var polyfills = getPolyfills();
var helpers = {
  fetchFeaturesCall: (_ref) => {
    let { host, clientKey, headers } = _ref;
    return polyfills.fetch(`${host}/api/features/${clientKey}`, {
      headers,
    });
  },
  fetchRemoteEvalCall: (_ref2) => {
    let { host, clientKey, payload, headers } = _ref2;
    let options = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
      body: JSON.stringify(payload),
    };
    return polyfills.fetch(`${host}/api/eval/${clientKey}`, options);
  },
  eventSourceCall: (_ref3) => {
    let { host, clientKey, headers } = _ref3;
    if (headers)
      return new polyfills.EventSource(`${host}/sub/${clientKey}`, {
        headers,
      });
    return new polyfills.EventSource(`${host}/sub/${clientKey}`);
  },
  startIdleListener: () => {
    let idleTimeout;
    if (!(typeof window !== "undefined" && typeof document !== "undefined")) return;
    let onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        window.clearTimeout(idleTimeout);
        onVisible();
      } else if (document.visibilityState === "hidden")
        idleTimeout = window.setTimeout(onHidden, cacheSettings.idleStreamInterval);
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  },
  stopIdleListener: () => {},
};
//@ chunk-exfmq47h.js:11896-11977 esm-fingerprint
try {
  if (globalThis.localStorage) polyfills.localStorage = globalThis.localStorage;
} catch (error) {}
//@ chunk-exfmq47h.js:11977-12042 esm-layout
var subscribedInstances = new Map();
var cacheInitialized = false;
var cache = new Map();
var activeFetches = new Map();
var streams = new Map();
var supportsSSE = new Set();
//@ chunk-exfmq47h.js:12042-12077 esm-layout
function setPolyfills(overrides) {
  Object.assign(polyfills, overrides);
}
//@ chunk-exfmq47h.js:12077-12139 esm-fingerprint
function configureCache(overrides) {
  Object.assign(cacheSettings, overrides);
  if (!cacheSettings.backgroundSync) clearAutoRefresh();
}
//@ chunk-exfmq47h.js:12139-12316 esm-fingerprint
async function refreshFeatures(_ref4) {
  let { instance, timeout, skipCache, allowStale, backgroundSync } = _ref4;
  if (!backgroundSync) cacheSettings.backgroundSync = false;
  return fetchFeaturesWithCache({
    instance,
    allowStale,
    timeout,
    skipCache,
  });
}
//@ chunk-exfmq47h.js:12316-12385 esm-fingerprint
function subscribe_2(instance) {
  let key = getKey(instance);
  let subs = subscribedInstances.get(key) || new Set();
  subs.add(instance);
  subscribedInstances.set(key, subs);
}
//@ chunk-exfmq47h.js:12385-12429 esm-fingerprint
function unsubscribe(instance) {
  subscribedInstances.forEach((s) => s.delete(instance));
}
//@ chunk-exfmq47h.js:12429-12496 esm-fingerprint
function onHidden() {
  streams.forEach((channel) => {
    if (!channel) return;
    channel.state = "idle";
    disableChannel(channel);
  });
}
//@ chunk-exfmq47h.js:12496-12575 esm-fingerprint
function onVisible() {
  streams.forEach((channel) => {
    if (!channel) return;
    if (channel.state !== "idle") return;
    enableChannel(channel);
  });
}
//@ chunk-exfmq47h.js:12575-12721 esm-fingerprint
async function updatePersistentCache() {
  try {
    if (!polyfills.localStorage) return;
    await polyfills.localStorage.setItem(cacheSettings.cacheKey, JSON.stringify(Array.from(cache.entries())));
  } catch (error) {}
}
//@ chunk-exfmq47h.js:12721-13151 esm-fingerprint
async function fetchFeaturesWithCache(_ref5) {
  let { instance, allowStale, timeout, skipCache } = _ref5;
  let key = getKey(instance);
  let cacheKey = getCacheKey(instance);
  let now = new Date();
  let minStaleAt = new Date(now.getTime() - cacheSettings.maxAge + cacheSettings.staleTTL);
  await initializeCache();
  let existing = !cacheSettings.disableCache && !skipCache ? cache.get(cacheKey) : undefined;
  if (existing && (allowStale || existing.staleAt > now) && existing.staleAt > minStaleAt) {
    if (existing.sse) supportsSSE.add(key);
    if (existing.staleAt < now) fetchFeatures(instance);
    else startAutoRefresh(instance);
    return {
      data: existing.data,
      success: true,
      source: "cache",
    };
  } else
    return (
      (await promiseTimeout(fetchFeatures(instance), timeout)) || {
        data: null,
        success: false,
        source: "timeout",
        error: Error("Timeout"),
      }
    );
}
//@ chunk-exfmq47h.js:13151-13209 esm-fingerprint
function getKey(instance) {
  let [apiHost, clientKey] = instance.getApiInfo();
  return `${apiHost}||${clientKey}`;
}
//@ chunk-exfmq47h.js:13209-13500 esm-fingerprint
function getCacheKey(instance) {
  let baseKey = getKey(instance);
  if (!("isRemoteEval" in instance) || !instance.isRemoteEval()) return baseKey;
  let attributes = instance.getAttributes();
  let cacheKeyAttributes = instance.getCacheKeyAttributes() || Object.keys(instance.getAttributes());
  let ca = {};
  cacheKeyAttributes.forEach((key) => {
    ca[key] = attributes[key];
  });
  let fv = instance.getForcedVariations();
  let url = instance.getUrl();
  return `${baseKey}||${JSON.stringify({
    ca,
    fv,
    url,
  })}`;
}
//@ chunk-exfmq47h.js:13500-13854 esm-fingerprint
async function initializeCache() {
  if (cacheInitialized) return;
  cacheInitialized = true;
  try {
    if (polyfills.localStorage) {
      let value = await polyfills.localStorage.getItem(cacheSettings.cacheKey);
      if (!cacheSettings.disableCache && value) {
        let parsed = JSON.parse(value);
        if (parsed && Array.isArray(parsed))
          parsed.forEach((_ref6) => {
            let [key, data] = _ref6;
            cache.set(key, {
              ...data,
              staleAt: new Date(data.staleAt),
            });
          });
        cleanupCache();
      }
    }
  } catch (error) {}
  if (!cacheSettings.disableIdleStreams) {
    let cleanupFn = helpers.startIdleListener();
    if (cleanupFn) helpers.stopIdleListener = cleanupFn;
  }
}
//@ chunk-exfmq47h.js:13854-14091 esm-fingerprint
function cleanupCache() {
  let entriesWithTimestamps = Array.from(cache.entries())
    .map((_ref7) => {
      let [key, value] = _ref7;
      return {
        key,
        staleAt: value.staleAt.getTime(),
      };
    })
    .sort((a, b) => a.staleAt - b.staleAt);
  let entriesToRemoveCount = Math.min(Math.max(0, cache.size - cacheSettings.maxEntries), cache.size);
  for (let i = 0; i < entriesToRemoveCount; i++) cache.delete(entriesWithTimestamps[i].key);
}
//@ chunk-exfmq47h.js:14091-14379 esm-fingerprint
function onNewFeatureData(key, cacheKey, data) {
  let version = data.dateUpdated || "";
  let staleAt = new Date(Date.now() + cacheSettings.staleTTL);
  let existing = !cacheSettings.disableCache ? cache.get(cacheKey) : undefined;
  if (existing && version && existing.version === version) {
    existing.staleAt = staleAt;
    updatePersistentCache();
    return;
  }
  if (!cacheSettings.disableCache) {
    cache.set(cacheKey, {
      data,
      version,
      staleAt,
      sse: supportsSSE.has(key),
    });
    cleanupCache();
  }
  updatePersistentCache();
  let instances = subscribedInstances.get(key);
  if (instances) instances.forEach((instance) => refreshInstance(instance, data));
}
//@ chunk-exfmq47h.js:14379-14440 esm-fingerprint
async function refreshInstance(instance, data) {
  await instance.setPayload(data || instance.getPayload());
}
//@ chunk-exfmq47h.js:14440-15178 esm-fingerprint
async function fetchFeatures(instance) {
  let { apiHost, apiRequestHeaders } = instance.getApiHosts();
  let clientKey = instance.getClientKey();
  let remoteEval = "isRemoteEval" in instance && instance.isRemoteEval();
  let key = getKey(instance);
  let cacheKey = getCacheKey(instance);
  let promise = activeFetches.get(cacheKey);
  if (!promise) {
    promise = (
      remoteEval
        ? helpers.fetchRemoteEvalCall({
            host: apiHost,
            clientKey,
            payload: {
              attributes: instance.getAttributes(),
              forcedVariations: instance.getForcedVariations(),
              forcedFeatures: Array.from(instance.getForcedFeatures().entries()),
              url: instance.getUrl(),
            },
            headers: apiRequestHeaders,
          })
        : helpers.fetchFeaturesCall({
            host: apiHost,
            clientKey,
            headers: apiRequestHeaders,
          })
    )
      .then((res) => {
        if (!res.ok) throw Error(`HTTP error: ${res.status}`);
        if (res.headers.get("x-sse-support") === "enabled") supportsSSE.add(key);
        return res.json();
      })
      .then((data) => {
        onNewFeatureData(key, cacheKey, data);
        startAutoRefresh(instance);
        activeFetches.delete(cacheKey);
        return {
          data,
          success: true,
          source: "network",
        };
      })
      .catch((e) => {
        activeFetches.delete(cacheKey);
        return {
          data: null,
          source: "error",
          success: false,
          error: e,
        };
      });
    activeFetches.set(cacheKey, promise);
  }
  return promise;
}
//@ chunk-exfmq47h.js:15178-15709 esm-fingerprint
function startAutoRefresh(instance) {
  let forceSSE = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
  let key = getKey(instance);
  let cacheKey = getCacheKey(instance);
  let { streamingHost, streamingHostRequestHeaders } = instance.getApiHosts();
  let clientKey = instance.getClientKey();
  if (forceSSE) supportsSSE.add(key);
  if (cacheSettings.backgroundSync && supportsSSE.has(key) && polyfills.EventSource) {
    if (streams.has(key)) return;
    let channel = {
      src: null,
      host: streamingHost,
      clientKey,
      headers: streamingHostRequestHeaders,
      cb: (event) => {
        try {
          if (event.type === "features-updated") {
            let instances = subscribedInstances.get(key);
            if (instances)
              instances.forEach((instance) => {
                fetchFeatures(instance);
              });
          } else if (event.type === "features") {
            let json = JSON.parse(event.data);
            onNewFeatureData(key, cacheKey, json);
          }
          channel.errors = 0;
        } catch (e) {
          onSSEError(channel);
        }
      },
      errors: 0,
      state: "active",
    };
    streams.set(key, channel);
    enableChannel(channel);
  }
}
//@ chunk-exfmq47h.js:15709-15957 esm-fingerprint
function onSSEError(channel) {
  if (channel.state === "idle") return;
  channel.errors++;
  if (channel.errors > 3 || (channel.src && channel.src.readyState === 2)) {
    let delay = Math.pow(3, channel.errors - 3) * (1000 + Math.random() * 1000);
    disableChannel(channel);
    setTimeout(
      () => {
        if (["idle", "active"].includes(channel.state)) return;
        enableChannel(channel);
      },
      Math.min(delay, 300000),
    );
  }
}
//@ chunk-exfmq47h.js:15957-16092 esm-fingerprint
function disableChannel(channel) {
  if (!channel.src) return;
  channel.src.onopen = null;
  channel.src.onerror = null;
  channel.src.close();
  channel.src = null;
  if (channel.state === "active") channel.state = "disabled";
}
//@ chunk-exfmq47h.js:16092-16346 esm-fingerprint
function enableChannel(channel) {
  channel.src = helpers.eventSourceCall({
    host: channel.host,
    clientKey: channel.clientKey,
    headers: channel.headers,
  });
  channel.state = "active";
  channel.src.addEventListener("features", channel.cb);
  channel.src.addEventListener("features-updated", channel.cb);
  channel.src.onerror = () => onSSEError(channel);
  channel.src.onopen = () => {
    channel.errors = 0;
  };
}
//@ chunk-exfmq47h.js:16346-16382 esm-layout
function destroyChannel(channel, key) {
  disableChannel(channel);
  streams.delete(key);
}
//@ chunk-exfmq47h.js:16382-16455 esm-fingerprint
function clearAutoRefresh() {
  supportsSSE.clear();
  streams.forEach(destroyChannel);
  subscribedInstances.clear();
  helpers.stopIdleListener();
}
//@ chunk-exfmq47h.js:16455-16596 esm-fingerprint
function startStreaming(instance, options) {
  if (options.streaming) {
    if (!instance.getClientKey()) throw Error("Must specify clientKey to enable streaming");
    if (options.payload) startAutoRefresh(instance, true);
    subscribe_2(instance);
  }
}
//@ chunk-exfmq47h.js:16596-16681 esm-fingerprint
var validAttributeName = /^[a-zA-Z:_][a-zA-Z0-9:_.-]*$/;
var nullController = {
  revert: function () {},
};
var elements = new Map();
var mutations = new Set();
//@ chunk-exfmq47h.js:16681-16831 esm-fingerprint
function getObserverInit(attr) {
  return attr === "html"
    ? {
        childList: true,
        subtree: true,
        attributes: true,
        characterData: true,
      }
    : {
        childList: false,
        subtree: false,
        attributes: true,
        attributeFilter: [attr],
      };
}
//@ chunk-exfmq47h.js:16831-16917 esm-fingerprint
function getElementRecord(element) {
  var record = elements.get(element);
  if (!record) {
    record = {
      element,
      attributes: {},
    };
    elements.set(element, record);
  }
  return record;
}
//@ chunk-exfmq47h.js:16917-17614 esm-fingerprint
function createElementPropertyRecord(el, attr, getCurrentValue, setValue, mutationRunner) {
  var currentValue = getCurrentValue(el);
  var record = {
    isDirty: false,
    originalValue: currentValue,
    virtualValue: currentValue,
    mutations: [],
    el,
    _positionTimeout: null,
    observer: new MutationObserver(function () {
      if (attr === "position" && record._positionTimeout) return;
      else if (attr === "position")
        record._positionTimeout = setTimeout(function () {
          record._positionTimeout = null;
        }, 1000);
      var currentValue = getCurrentValue(el);
      if (
        attr === "position" &&
        currentValue.parentNode === record.virtualValue.parentNode &&
        currentValue.insertBeforeNode === record.virtualValue.insertBeforeNode
      )
        return;
      if (currentValue === record.virtualValue) return;
      record.originalValue = currentValue;
      mutationRunner(record);
    }),
    mutationRunner,
    setValue,
    getCurrentValue,
  };
  if (attr === "position" && el.parentNode)
    record.observer.observe(el.parentNode, {
      childList: true,
      subtree: true,
      attributes: false,
      characterData: false,
    });
  else record.observer.observe(el, getObserverInit(attr));
  return record;
}
//@ chunk-exfmq47h.js:17614-17831 esm-fingerprint
function queueIfNeeded(val, record) {
  var currentVal = record.getCurrentValue(record.el);
  record.virtualValue = val;
  if (val && typeof val !== "string") {
    if (
      !currentVal ||
      val.parentNode !== currentVal.parentNode ||
      val.insertBeforeNode !== currentVal.insertBeforeNode
    ) {
      record.isDirty = true;
      runDOMUpdates();
    }
  } else if (val !== currentVal) {
    record.isDirty = true;
    runDOMUpdates();
  }
}
//@ chunk-exfmq47h.js:17831-17935 esm-fingerprint
function htmlMutationRunner(record) {
  var val = record.originalValue;
  record.mutations.forEach(function (m) {
    return (val = m.mutate(val));
  });
  queueIfNeeded(getTransformedHTML(val), record);
}
//@ chunk-exfmq47h.js:17935-18109 esm-fingerprint
function classMutationRunner(record) {
  var val = new Set(record.originalValue.split(/\s+/).filter(Boolean));
  record.mutations.forEach(function (m) {
    return m.mutate(val);
  });
  queueIfNeeded(Array.from(val).filter(Boolean).join(" "), record);
}
//@ chunk-exfmq47h.js:18109-18209 esm-fingerprint
function attrMutationRunner(record) {
  var val = record.originalValue;
  record.mutations.forEach(function (m) {
    return (val = m.mutate(val));
  });
  queueIfNeeded(val, record);
}
//@ chunk-exfmq47h.js:18209-18417 esm-fingerprint
function _loadDOMNodes(selectors) {
  var { parentSelector, insertBeforeSelector } = selectors;
  var parentNode = document.querySelector(parentSelector);
  if (!parentNode) return null;
  var insertBeforeNode = insertBeforeSelector ? document.querySelector(insertBeforeSelector) : null;
  if (insertBeforeSelector && !insertBeforeNode) return null;
  return {
    parentNode,
    insertBeforeNode,
  };
}
//@ chunk-exfmq47h.js:18417-18528 esm-fingerprint
function positionMutationRunner(record) {
  var val = record.originalValue;
  record.mutations.forEach(function (m) {
    var selectors = m.mutate();
    var newNodes = _loadDOMNodes(selectors);
    val = newNodes || val;
  });
  queueIfNeeded(val, record);
}
//@ chunk-exfmq47h.js:18528-18606 esm-fingerprint
var getHTMLValue = function (el) {
  return el.innerHTML;
};
var setHTMLValue = function (el, value) {
  return (el.innerHTML = value);
};
//@ chunk-exfmq47h.js:18606-18687 esm-fingerprint
/**
 * DOM 节点 html 属性的懒缓存访问（innerHTML 读写），第三方 DOM 实现代码，被误归到 AskUserQuestion/prompt。
 */
function getElementHTMLRecord(element) {
  var elementRecord = getElementRecord(element);
  if (!elementRecord.html)
    elementRecord.html = createElementPropertyRecord(
      element,
      "html",
      getHTMLValue,
      setHTMLValue,
      htmlMutationRunner,
    );
  return elementRecord.html;
}
//@ chunk-exfmq47h.js:18687-18919 esm-fingerprint
var getElementPosition = function (el) {
  return {
    parentNode: el.parentElement,
    insertBeforeNode: el.nextElementSibling,
  };
};
var setElementPosition = function (el, value) {
  if (value.insertBeforeNode && !value.parentNode.contains(value.insertBeforeNode)) return;
  value.parentNode.insertBefore(el, value.insertBeforeNode);
};
//@ chunk-exfmq47h.js:18919-19016 esm-fingerprint
function getElementPositionRecord(element) {
  var elementRecord = getElementRecord(element);
  if (!elementRecord.position)
    elementRecord.position = createElementPropertyRecord(
      element,
      "position",
      getElementPosition,
      setElementPosition,
      positionMutationRunner,
    );
  return elementRecord.position;
}
//@ chunk-exfmq47h.js:19016-19123 esm-fingerprint
var setClassValue = function (el, val) {
  return val ? (el.className = val) : el.removeAttribute("class");
};
var getClassValue = function (el) {
  return el.className;
};
//@ chunk-exfmq47h.js:19123-19214 esm-fingerprint
function getElementClassRecord(el) {
  var elementRecord = getElementRecord(el);
  if (!elementRecord.classes)
    elementRecord.classes = createElementPropertyRecord(
      el,
      "class",
      getClassValue,
      setClassValue,
      classMutationRunner,
    );
  return elementRecord.classes;
}
//@ chunk-exfmq47h.js:19214-19396 esm-fingerprint
var getAttrValue = function (attrName) {
  return function (el) {
    var _el$getAttribute;
    return (_el$getAttribute = el.getAttribute(attrName)) != null ? _el$getAttribute : null;
  };
};
var setAttrValue = function (attrName) {
  return function (el, val) {
    return val !== null ? el.setAttribute(attrName, val) : el.removeAttribute(attrName);
  };
};
//@ chunk-exfmq47h.js:19396-19507 esm-layout
function getElementAttributeRecord(el, attr) {
  var elementRecord = getElementRecord(el);
  if (!elementRecord.attributes[attr])
    elementRecord.attributes[attr] = createElementPropertyRecord(
      el,
      attr,
      getAttrValue(attr),
      setAttrValue(attr),
      attrMutationRunner,
    );
  return elementRecord.attributes[attr];
}
//@ chunk-exfmq47h.js:19507-19974 esm-fingerprint
function deleteElementPropertyRecord(el, attr) {
  var element = elements.get(el);
  if (!element) return;
  if (attr === "html") {
    var _element$html;
    var _element$html$observe;
    if (!((_element$html = element.html) == null || (_element$html$observe = _element$html.observer) == null))
      _element$html$observe.disconnect();
    delete element.html;
  } else if (attr === "class") {
    var _element$classes;
    var _element$classes$obse;
    if (!(
      (_element$classes = element.classes) == null ||
      (_element$classes$obse = _element$classes.observer) == null
    ))
      _element$classes$obse.disconnect();
    delete element.classes;
  } else if (attr === "position") {
    var _element$position;
    var _element$position$obs;
    if (!(
      (_element$position = element.position) == null ||
      (_element$position$obs = _element$position.observer) == null
    ))
      _element$position$obs.disconnect();
    delete element.position;
  } else {
    var _element$attributes;
    var _element$attributes$a;
    var _element$attributes$a2;
    if (!(
      (_element$attributes = element.attributes) == null ||
      (_element$attributes$a = _element$attributes[attr]) == null ||
      (_element$attributes$a2 = _element$attributes$a.observer) == null
    ))
      _element$attributes$a2.disconnect();
    delete element.attributes[attr];
  }
}
//@ chunk-exfmq47h.js:19974-19981 esm-layout
var transformContainer;
//@ chunk-exfmq47h.js:19981-20071 esm-fingerprint
function getTransformedHTML(html) {
  if (!transformContainer) transformContainer = document.createElement("div");
  transformContainer.innerHTML = html;
  return transformContainer.innerHTML;
}
//@ chunk-exfmq47h.js:20071-20192 esm-fingerprint
function setPropertyValue(el, attr, m) {
  if (!m.isDirty) return;
  m.isDirty = false;
  var val = m.virtualValue;
  if (!m.mutations.length) deleteElementPropertyRecord(el, attr);
  m.setValue(el, val);
}
//@ chunk-exfmq47h.js:20192-20384 esm-fingerprint
function setValue(m, el) {
  if (m.html) setPropertyValue(el, "html", m.html);
  if (m.classes) setPropertyValue(el, "class", m.classes);
  if (m.position) setPropertyValue(el, "position", m.position);
  Object.keys(m.attributes).forEach(function (attr) {
    setPropertyValue(el, attr, m.attributes[attr]);
  });
}
//@ chunk-exfmq47h.js:20384-20413 esm-layout
function runDOMUpdates() {
  elements.forEach(setValue);
}
//@ chunk-exfmq47h.js:20413-20639 esm-fingerprint
function startMutating(mutation, element) {
  var record = null;
  if (mutation.kind === "html") record = getElementHTMLRecord(element);
  else if (mutation.kind === "class") record = getElementClassRecord(element);
  else if (mutation.kind === "attribute") record = getElementAttributeRecord(element, mutation.attribute);
  else if (mutation.kind === "position") record = getElementPositionRecord(element);
  if (!record) return;
  record.mutations.push(mutation);
  record.mutationRunner(record);
}
//@ chunk-exfmq47h.js:20639-20908 esm-fingerprint
function stopMutating(mutation, el) {
  var record = null;
  if (mutation.kind === "html") record = getElementHTMLRecord(el);
  else if (mutation.kind === "class") record = getElementClassRecord(el);
  else if (mutation.kind === "attribute") record = getElementAttributeRecord(el, mutation.attribute);
  else if (mutation.kind === "position") record = getElementPositionRecord(el);
  if (!record) return;
  var index = record.mutations.indexOf(mutation);
  if (index !== -1) record.mutations.splice(index, 1);
  record.mutationRunner(record);
}
//@ chunk-exfmq47h.js:20908-21103 esm-fingerprint
function refreshElementsSet(mutation) {
  if (mutation.kind === "position" && mutation.elements.size === 1) return;
  var existingElements = new Set(mutation.elements);
  var matchingElements = document.querySelectorAll(mutation.selector);
  matchingElements.forEach(function (el) {
    if (!existingElements.has(el)) {
      mutation.elements.add(el);
      startMutating(mutation, el);
    }
  });
}
//@ chunk-exfmq47h.js:21103-21198 esm-fingerprint
function revertMutation(mutation) {
  mutation.elements.forEach(function (el) {
    return stopMutating(mutation, el);
  });
  mutation.elements.clear();
  mutations.delete(mutation);
}
//@ chunk-exfmq47h.js:21198-21227 esm-layout
function refreshAllElementSets() {
  mutations.forEach(refreshElementsSet);
}
//@ chunk-exfmq47h.js:21227-21234 esm-layout
var observer;
//@ chunk-exfmq47h.js:21234-21426 esm-fingerprint
function connectGlobalObserver() {
  if (typeof document === "undefined") return;
  if (!observer)
    observer = new MutationObserver(function () {
      refreshAllElementSets();
    });
  refreshAllElementSets();
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: false,
    characterData: false,
  });
}
//@ chunk-exfmq47h.js:21426-21431 esm-layout
connectGlobalObserver();
//@ chunk-exfmq47h.js:21431-21529 esm-fingerprint
function newMutation(m) {
  if (typeof document === "undefined") return nullController;
  mutations.add(m);
  refreshElementsSet(m);
  return {
    revert: function () {
      revertMutation(m);
    },
  };
}
//@ chunk-exfmq47h.js:21529-21608 esm-fingerprint
function html(selector, mutate) {
  return newMutation({
    kind: "html",
    elements: new Set(),
    mutate,
    selector,
  });
}
//@ chunk-exfmq47h.js:21608-21691 esm-fingerprint
function position(selector, mutate) {
  return newMutation({
    kind: "position",
    elements: new Set(),
    mutate,
    selector,
  });
}
//@ chunk-exfmq47h.js:21691-21771 esm-fingerprint
function classes(selector, mutate) {
  return newMutation({
    kind: "class",
    elements: new Set(),
    mutate,
    selector,
  });
}
//@ chunk-exfmq47h.js:21771-22078 esm-fingerprint
function attribute(selector, attribute, mutate) {
  if (!validAttributeName.test(attribute)) return nullController;
  if (attribute === "class" || attribute === "className")
    return classes(selector, function (classnames) {
      var mutatedClassnames = mutate(Array.from(classnames).join(" "));
      classnames.clear();
      if (!mutatedClassnames) return;
      mutatedClassnames
        .split(/\s+/g)
        .filter(Boolean)
        .forEach(function (c) {
          return classnames.add(c);
        });
    });
  return newMutation({
    kind: "attribute",
    attribute,
    elements: new Set(),
    mutate,
    selector,
  });
}
//@ chunk-exfmq47h.js:22078-22876 esm-fingerprint
function declarative(_ref2) {
  var { selector, action, value, attribute: attr, parentSelector, insertBeforeSelector } = _ref2;
  if (attr === "html") {
    if (action === "append")
      return html(selector, function (val) {
        return val + (value != null ? value : "");
      });
    else if (action === "set")
      return html(selector, function () {
        return value != null ? value : "";
      });
  } else if (attr === "class") {
    if (action === "append")
      return classes(selector, function (val) {
        if (value) val.add(value);
      });
    else if (action === "remove")
      return classes(selector, function (val) {
        if (value) val.delete(value);
      });
    else if (action === "set")
      return classes(selector, function (val) {
        val.clear();
        if (value) val.add(value);
      });
  } else if (attr === "position") {
    if (action === "set" && parentSelector)
      return position(selector, function () {
        return {
          insertBeforeSelector,
          parentSelector,
        };
      });
  } else if (action === "append")
    return attribute(selector, attr, function (val) {
      return val !== null ? val + (value != null ? value : "") : value != null ? value : "";
    });
  else if (action === "set")
    return attribute(selector, attr, function () {
      return value != null ? value : "";
    });
  else if (action === "remove")
    return attribute(selector, attr, function () {
      return null;
    });
  return nullController;
}
//@ chunk-exfmq47h.js:22876-22950 esm-fingerprint
var index = {
  html,
  classes,
  attribute,
  position,
  declarative,
};
var experiments = index;
//@ chunk-exfmq47h.js:22950-22960 esm-layout
var _regexCache = {};
//@ chunk-exfmq47h.js:22960-23233 esm-fingerprint
function evalCondition(obj, condition, savedGroups) {
  savedGroups = savedGroups || {};
  for (let [k, v] of Object.entries(condition))
    switch (k) {
      case "$or":
        if (!evalOr(obj, v, savedGroups)) return false;
        break;
      case "$nor":
        if (evalOr(obj, v, savedGroups)) return false;
        break;
      case "$and":
        if (!evalAnd(obj, v, savedGroups)) return false;
        break;
      case "$not":
        if (evalCondition(obj, v, savedGroups)) return false;
        break;
      default:
        if (!evalConditionValue(v, getPath(obj, k), savedGroups)) return false;
    }
  return true;
}
//@ chunk-exfmq47h.js:23233-23372 esm-fingerprint
function getPath(obj, path) {
  let parts = path.split(".");
  let current = obj;
  for (let i = 0; i < parts.length; i++)
    if (current && typeof current === "object" && parts[i] in current) current = current[parts[i]];
    else return null;
  return current;
}
//@ chunk-exfmq47h.js:23372-23460 esm-fingerprint
function getRegex(regex) {
  if (!_regexCache[regex]) _regexCache[regex] = new RegExp(regex.replace(/([^\\])\//g, "$1\\/"));
  return _regexCache[regex];
}
//@ chunk-exfmq47h.js:23460-23758 esm-fingerprint
function evalConditionValue(condition, value, savedGroups) {
  if (typeof condition === "string") return value + "" === condition;
  if (typeof condition === "number") return value * 1 === condition;
  if (typeof condition === "boolean") return value !== null && !!value === condition;
  if (condition === null) return value === null;
  if (Array.isArray(condition) || !isOperatorObject(condition))
    return JSON.stringify(value) === JSON.stringify(condition);
  for (let op in condition) if (!evalOperatorCondition(op, value, condition[op], savedGroups)) return false;
  return true;
}
//@ chunk-exfmq47h.js:23758-23857 esm-fingerprint
function isOperatorObject(obj) {
  let keys = Object.keys(obj);
  return keys.length > 0 && keys.filter((k) => k[0] === "$").length === keys.length;
}
//@ chunk-exfmq47h.js:23857-24037 esm-fingerprint
function getType(v) {
  if (v === null) return "null";
  if (Array.isArray(v)) return "array";
  let t = typeof v;
  if (["string", "number", "boolean", "object", "undefined"].includes(t)) return t;
  return "unknown";
}
//@ chunk-exfmq47h.js:24037-24190 esm-layout
function elemMatch(actual, expected, savedGroups) {
  if (!Array.isArray(actual)) return false;
  let check = isOperatorObject(expected)
    ? (v) => evalConditionValue(expected, v, savedGroups)
    : (v) => evalCondition(v, expected, savedGroups);
  for (let i = 0; i < actual.length; i++) if (actual[i] && check(actual[i])) return true;
  return false;
}
//@ chunk-exfmq47h.js:24190-24282 esm-fingerprint
function isIn(actual, expected) {
  if (Array.isArray(actual)) return actual.some((el) => expected.includes(el));
  return expected.includes(actual);
}
//@ chunk-exfmq47h.js:24282-25292 esm-fingerprint
function evalOperatorCondition(operator, actual, expected, savedGroups) {
  switch (operator) {
    case "$veq":
      return paddedVersionString(actual) === paddedVersionString(expected);
    case "$vne":
      return paddedVersionString(actual) !== paddedVersionString(expected);
    case "$vgt":
      return paddedVersionString(actual) > paddedVersionString(expected);
    case "$vgte":
      return paddedVersionString(actual) >= paddedVersionString(expected);
    case "$vlt":
      return paddedVersionString(actual) < paddedVersionString(expected);
    case "$vlte":
      return paddedVersionString(actual) <= paddedVersionString(expected);
    case "$eq":
      return actual === expected;
    case "$ne":
      return actual !== expected;
    case "$lt":
      return actual < expected;
    case "$lte":
      return actual <= expected;
    case "$gt":
      return actual > expected;
    case "$gte":
      return actual >= expected;
    case "$exists":
      return expected ? actual != null : actual == null;
    case "$in":
      if (!Array.isArray(expected)) return false;
      return isIn(actual, expected);
    case "$inGroup":
      return isIn(actual, savedGroups[expected] || []);
    case "$notInGroup":
      return !isIn(actual, savedGroups[expected] || []);
    case "$nin":
      if (!Array.isArray(expected)) return false;
      return !isIn(actual, expected);
    case "$not":
      return !evalConditionValue(expected, actual, savedGroups);
    case "$size":
      if (!Array.isArray(actual)) return false;
      return evalConditionValue(expected, actual.length, savedGroups);
    case "$elemMatch":
      return elemMatch(actual, expected, savedGroups);
    case "$all":
      if (!Array.isArray(actual)) return false;
      for (let i = 0; i < expected.length; i++) {
        let passed = false;
        for (let j = 0; j < actual.length; j++)
          if (evalConditionValue(expected[i], actual[j], savedGroups)) {
            passed = true;
            break;
          }
        if (!passed) return false;
      }
      return true;
    case "$regex":
      try {
        return getRegex(expected).test(actual);
      } catch (e) {
        return false;
      }
    case "$type":
      return getType(actual) === expected;
    default:
      console.error("Unknown operator: " + operator);
      return false;
  }
}
//@ chunk-exfmq47h.js:25292-25394 esm-layout
function evalOr(obj, conditions, savedGroups) {
  if (!conditions.length) return true;
  for (let i = 0; i < conditions.length; i++) if (evalCondition(obj, conditions[i], savedGroups)) return true;
  return false;
}
//@ chunk-exfmq47h.js:25394-25475 esm-layout
function evalAnd(obj, conditions, savedGroups) {
  for (let i = 0; i < conditions.length; i++)
    if (!evalCondition(obj, conditions[i], savedGroups)) return false;
  return true;
}
//@ chunk-exfmq47h.js:25475-25525 esm-fingerprint
var FEATURE_EVALUATED_EVENT = "Feature Evaluated";
var EVENT_EXPERIMENT_VIEWED = "Experiment Viewed";
//@ chunk-exfmq47h.js:25525-25735 esm-fingerprint
function getForcedFeatureValues(ctx) {
  let ret = new Map();
  if (ctx.global.forcedFeatureValues) ctx.global.forcedFeatureValues.forEach((v, k) => ret.set(k, v));
  if (ctx.user.forcedFeatureValues) ctx.user.forcedFeatureValues.forEach((v, k) => ret.set(k, v));
  return ret;
}
//@ chunk-exfmq47h.js:25735-26012 esm-fingerprint
function getForcedVariations(ctx) {
  if (ctx.global.forcedVariations && ctx.user.forcedVariations)
    return {
      ...ctx.global.forcedVariations,
      ...ctx.user.forcedVariations,
    };
  else if (ctx.global.forcedVariations) return ctx.global.forcedVariations;
  else if (ctx.user.forcedVariations) return ctx.user.forcedVariations;
  else return {};
}
//@ chunk-exfmq47h.js:26012-26058 esm-layout
async function safeCall(fn) {
  try {
    await fn();
  } catch (error) {}
}
//@ chunk-exfmq47h.js:26058-26700 esm-fingerprint
function onExperimentViewed(ctx, experiment, result) {
  if (ctx.user.trackedExperiments) {
    let k = getExperimentDedupeKey(experiment, result);
    if (ctx.user.trackedExperiments.has(k)) return [];
    ctx.user.trackedExperiments.add(k);
  }
  if (ctx.user.enableDevMode && ctx.user.devLogs)
    ctx.user.devLogs.push({
      experiment,
      result,
      timestamp: Date.now().toString(),
      logType: "experiment",
    });
  let calls = [];
  if (ctx.global.trackingCallback) {
    let cb = ctx.global.trackingCallback;
    calls.push(safeCall(() => cb(experiment, result, ctx.user)));
  }
  if (ctx.user.trackingCallback) {
    let cb = ctx.user.trackingCallback;
    calls.push(safeCall(() => cb(experiment, result)));
  }
  if (ctx.global.eventLogger) {
    let cb = ctx.global.eventLogger;
    calls.push(
      safeCall(() =>
        cb(
          EVENT_EXPERIMENT_VIEWED,
          {
            experimentId: experiment.key,
            variationId: result.key,
            hashAttribute: result.hashAttribute,
            hashValue: result.hashValue,
          },
          ctx.user,
        ),
      ),
    );
  }
  return calls;
}
//@ chunk-exfmq47h.js:26700-27370 esm-fingerprint
function onFeatureUsage(ctx, key, ret) {
  if (ctx.user.trackedFeatureUsage) {
    let stringifiedValue = JSON.stringify(ret.value);
    if (ctx.user.trackedFeatureUsage[key] === stringifiedValue) return;
    ctx.user.trackedFeatureUsage[key] = stringifiedValue;
    if (ctx.user.enableDevMode && ctx.user.devLogs)
      ctx.user.devLogs.push({
        featureKey: key,
        result: ret,
        timestamp: Date.now().toString(),
        logType: "feature",
      });
  }
  if (ctx.global.onFeatureUsage) {
    let cb = ctx.global.onFeatureUsage;
    safeCall(() => cb(key, ret, ctx.user));
  }
  if (ctx.user.onFeatureUsage) {
    let cb = ctx.user.onFeatureUsage;
    safeCall(() => cb(key, ret));
  }
  if (ctx.global.eventLogger) {
    let cb = ctx.global.eventLogger;
    safeCall(() =>
      cb(
        FEATURE_EVALUATED_EVENT,
        {
          feature: key,
          source: ret.source,
          value: ret.value,
          ruleId: ret.source === "defaultValue" ? "$default" : ret.ruleId || "",
          variationId: ret.experimentResult ? ret.experimentResult.key : "",
        },
        ctx.user,
      ),
    );
  }
}
//@ chunk-exfmq47h.js:27370-29510 esm-fingerprint
function evaluateFeature(id, ctx) {
  if (ctx.stack.evaluatedFeatures.has(id)) return getFeatureResult(ctx, id, null, "cyclicPrerequisite");
  ctx.stack.evaluatedFeatures.add(id);
  ctx.stack.id = id;
  let forcedValues = getForcedFeatureValues(ctx);
  if (forcedValues.has(id)) return getFeatureResult(ctx, id, forcedValues.get(id), "override");
  if (!ctx.global.features || !ctx.global.features[id])
    return getFeatureResult(ctx, id, null, "unknownFeature");
  let feature = ctx.global.features[id];
  if (feature.rules) {
    let evaluatedFeatures = new Set(ctx.stack.evaluatedFeatures);
    e: for (let rule of feature.rules) {
      if (rule.parentConditions)
        for (let parentCondition of rule.parentConditions) {
          ctx.stack.evaluatedFeatures = new Set(evaluatedFeatures);
          let parentResult = evaluateFeature(parentCondition.id, ctx);
          if (parentResult.source === "cyclicPrerequisite")
            return getFeatureResult(ctx, id, null, "cyclicPrerequisite");
          let evalObj = {
            value: parentResult.value,
          };
          if (!evalCondition(evalObj, parentCondition.condition || {})) {
            if (parentCondition.gate) return getFeatureResult(ctx, id, null, "prerequisite");
            continue e;
          }
        }
      if (rule.filters && isFilteredOut(rule.filters, ctx)) continue;
      if ("force" in rule) {
        if (rule.condition && !conditionPasses(rule.condition, ctx)) continue;
        if (
          !isIncludedInRollout(
            ctx,
            rule.seed || id,
            rule.hashAttribute,
            ctx.user.saveStickyBucketAssignmentDoc && !rule.disableStickyBucketing
              ? rule.fallbackAttribute
              : undefined,
            rule.range,
            rule.coverage,
            rule.hashVersion,
          )
        )
          continue;
        if (rule.tracks)
          rule.tracks.forEach((t) => {
            if (!onExperimentViewed(ctx, t.experiment, t.result).length && ctx.global.saveDeferredTrack)
              ctx.global.saveDeferredTrack({
                experiment: t.experiment,
                result: t.result,
              });
          });
        return getFeatureResult(ctx, id, rule.force, "force", rule.id);
      }
      if (!rule.variations) continue;
      let exp = {
        variations: rule.variations,
        key: rule.key || id,
      };
      if ("coverage" in rule) exp.coverage = rule.coverage;
      if (rule.weights) exp.weights = rule.weights;
      if (rule.hashAttribute) exp.hashAttribute = rule.hashAttribute;
      if (rule.fallbackAttribute) exp.fallbackAttribute = rule.fallbackAttribute;
      if (rule.disableStickyBucketing) exp.disableStickyBucketing = rule.disableStickyBucketing;
      if (rule.bucketVersion !== undefined) exp.bucketVersion = rule.bucketVersion;
      if (rule.minBucketVersion !== undefined) exp.minBucketVersion = rule.minBucketVersion;
      if (rule.namespace) exp.namespace = rule.namespace;
      if (rule.meta) exp.meta = rule.meta;
      if (rule.ranges) exp.ranges = rule.ranges;
      if (rule.name) exp.name = rule.name;
      if (rule.phase) exp.phase = rule.phase;
      if (rule.seed) exp.seed = rule.seed;
      if (rule.hashVersion) exp.hashVersion = rule.hashVersion;
      if (rule.filters) exp.filters = rule.filters;
      if (rule.condition) exp.condition = rule.condition;
      let { result } = runExperiment(exp, id, ctx);
      if (ctx.global.onExperimentEval) ctx.global.onExperimentEval(exp, result);
      if (result.inExperiment && !result.passthrough)
        return getFeatureResult(ctx, id, result.value, "experiment", rule.id, exp, result);
    }
  }
  return getFeatureResult(
    ctx,
    id,
    feature.defaultValue === undefined ? null : feature.defaultValue,
    "defaultValue",
  );
}
//@ chunk-exfmq47h.js:29510-32239 esm-fingerprint
function runExperiment(experiment, featureId, ctx) {
  let key = experiment.key;
  let numVariations = experiment.variations.length;
  if (numVariations < 2)
    return {
      result: getExperimentResult(ctx, experiment, -1, false, featureId),
    };
  if (ctx.global.enabled === false || ctx.user.enabled === false)
    return {
      result: getExperimentResult(ctx, experiment, -1, false, featureId),
    };
  experiment = mergeOverrides(experiment, ctx);
  if (experiment.urlPatterns && !isURLTargeted(ctx.user.url || "", experiment.urlPatterns))
    return {
      result: getExperimentResult(ctx, experiment, -1, false, featureId),
    };
  let qsOverride = getQueryStringOverride(key, ctx.user.url || "", numVariations);
  if (qsOverride !== null)
    return {
      result: getExperimentResult(ctx, experiment, qsOverride, false, featureId),
    };
  let forcedVariations = getForcedVariations(ctx);
  if (key in forcedVariations) {
    let variation = forcedVariations[key];
    return {
      result: getExperimentResult(ctx, experiment, variation, false, featureId),
    };
  }
  if (experiment.status === "draft" || experiment.active === false)
    return {
      result: getExperimentResult(ctx, experiment, -1, false, featureId),
    };
  let { hashAttribute, hashValue } = getHashAttribute(
    ctx,
    experiment.hashAttribute,
    ctx.user.saveStickyBucketAssignmentDoc && !experiment.disableStickyBucketing
      ? experiment.fallbackAttribute
      : undefined,
  );
  if (!hashValue)
    return {
      result: getExperimentResult(ctx, experiment, -1, false, featureId),
    };
  let assigned = -1;
  let foundStickyBucket = false;
  let stickyBucketVersionIsBlocked = false;
  if (ctx.user.saveStickyBucketAssignmentDoc && !experiment.disableStickyBucketing) {
    let { variation, versionIsBlocked } = getStickyBucketVariation({
      ctx,
      expKey: experiment.key,
      expBucketVersion: experiment.bucketVersion,
      expHashAttribute: experiment.hashAttribute,
      expFallbackAttribute: experiment.fallbackAttribute,
      expMinBucketVersion: experiment.minBucketVersion,
      expMeta: experiment.meta,
    });
    foundStickyBucket = variation >= 0;
    assigned = variation;
    stickyBucketVersionIsBlocked = !!versionIsBlocked;
  }
  if (!foundStickyBucket) {
    if (experiment.filters) {
      if (isFilteredOut(experiment.filters, ctx))
        return {
          result: getExperimentResult(ctx, experiment, -1, false, featureId),
        };
    } else if (experiment.namespace && !inNamespace(hashValue, experiment.namespace))
      return {
        result: getExperimentResult(ctx, experiment, -1, false, featureId),
      };
    if (experiment.include && !isIncluded(experiment.include))
      return {
        result: getExperimentResult(ctx, experiment, -1, false, featureId),
      };
    if (experiment.condition && !conditionPasses(experiment.condition, ctx))
      return {
        result: getExperimentResult(ctx, experiment, -1, false, featureId),
      };
    if (experiment.parentConditions) {
      let evaluatedFeatures = new Set(ctx.stack.evaluatedFeatures);
      for (let parentCondition of experiment.parentConditions) {
        ctx.stack.evaluatedFeatures = new Set(evaluatedFeatures);
        let parentResult = evaluateFeature(parentCondition.id, ctx);
        if (parentResult.source === "cyclicPrerequisite")
          return {
            result: getExperimentResult(ctx, experiment, -1, false, featureId),
          };
        let evalObj = {
          value: parentResult.value,
        };
        if (!evalCondition(evalObj, parentCondition.condition || {}))
          return {
            result: getExperimentResult(ctx, experiment, -1, false, featureId),
          };
      }
    }
    if (experiment.groups && !hasGroupOverlap(experiment.groups, ctx))
      return {
        result: getExperimentResult(ctx, experiment, -1, false, featureId),
      };
  }
  if (experiment.url && !urlIsValid(experiment.url, ctx))
    return {
      result: getExperimentResult(ctx, experiment, -1, false, featureId),
    };
  let n = hash(experiment.seed || key, hashValue, experiment.hashVersion || 1);
  if (n === null)
    return {
      result: getExperimentResult(ctx, experiment, -1, false, featureId),
    };
  if (!foundStickyBucket) {
    let ranges =
      experiment.ranges ||
      getBucketRanges(
        numVariations,
        experiment.coverage === undefined ? 1 : experiment.coverage,
        experiment.weights,
      );
    assigned = chooseVariation(n, ranges);
  }
  if (stickyBucketVersionIsBlocked)
    return {
      result: getExperimentResult(ctx, experiment, -1, false, featureId, undefined, true),
    };
  if (assigned < 0)
    return {
      result: getExperimentResult(ctx, experiment, -1, false, featureId),
    };
  if ("force" in experiment)
    return {
      result: getExperimentResult(
        ctx,
        experiment,
        experiment.force === undefined ? -1 : experiment.force,
        false,
        featureId,
      ),
    };
  if (ctx.global.qaMode || ctx.user.qaMode)
    return {
      result: getExperimentResult(ctx, experiment, -1, false, featureId),
    };
  if (experiment.status === "stopped")
    return {
      result: getExperimentResult(ctx, experiment, -1, false, featureId),
    };
  let result = getExperimentResult(ctx, experiment, assigned, true, featureId, n, foundStickyBucket);
  if (ctx.user.saveStickyBucketAssignmentDoc && !experiment.disableStickyBucketing) {
    let {
      changed,
      key: attrKey,
      doc,
    } = generateStickyBucketAssignmentDoc(ctx, hashAttribute, toString(hashValue), {
      [getStickyBucketExperimentKey(experiment.key, experiment.bucketVersion)]: result.key,
    });
    if (changed) {
      ctx.user.stickyBucketAssignmentDocs = ctx.user.stickyBucketAssignmentDocs || {};
      ctx.user.stickyBucketAssignmentDocs[attrKey] = doc;
      ctx.user.saveStickyBucketAssignmentDoc(doc);
    }
  }
  let trackingCalls = onExperimentViewed(ctx, experiment, result);
  if (trackingCalls.length === 0 && ctx.global.saveDeferredTrack)
    ctx.global.saveDeferredTrack({
      experiment,
      result,
    });
  let trackingCall = !trackingCalls.length
    ? undefined
    : trackingCalls.length === 1
      ? trackingCalls[0]
      : Promise.all(trackingCalls).then(() => {});
  if ("changeId" in experiment && experiment.changeId && ctx.global.recordChangeId)
    ctx.global.recordChangeId(experiment.changeId);
  return {
    result,
    trackingCall,
  };
}
//@ chunk-exfmq47h.js:32239-32401 esm-fingerprint
function getFeatureResult(ctx, key, value, source, ruleId, experiment, result) {
  let ret = {
    value,
    on: !!value,
    off: !value,
    source,
    ruleId: ruleId || "",
  };
  if (experiment) ret.experiment = experiment;
  if (result) ret.experimentResult = result;
  if (source !== "override") onFeatureUsage(ctx, key, ret);
  return ret;
}
//@ chunk-exfmq47h.js:32401-32474 esm-fingerprint
function getAttributes(ctx) {
  return {
    ...ctx.user.attributes,
    ...ctx.user.attributeOverrides,
  };
}
//@ chunk-exfmq47h.js:32474-32535 esm-fingerprint
function conditionPasses(condition, ctx) {
  return evalCondition(getAttributes(ctx), condition, ctx.global.savedGroups || {});
}
//@ chunk-exfmq47h.js:32535-32716 esm-fingerprint
function isFilteredOut(filters, ctx) {
  return filters.some((filter) => {
    let { hashValue } = getHashAttribute(ctx, filter.attribute);
    if (!hashValue) return true;
    let n = hash(filter.seed, hashValue, filter.hashVersion || 2);
    if (n === null) return true;
    return !filter.ranges.some((r) => inRange(n, r));
  });
}
//@ chunk-exfmq47h.js:32716-32910 esm-fingerprint
function isIncludedInRollout(ctx, seed, hashAttribute, fallbackAttribute, range, coverage, hashVersion) {
  if (!range && coverage === undefined) return true;
  if (!range && coverage === 0) return false;
  let { hashValue } = getHashAttribute(ctx, hashAttribute, fallbackAttribute);
  if (!hashValue) return false;
  let n = hash(seed, hashValue, hashVersion || 1);
  if (n === null) return false;
  return range ? inRange(n, range) : coverage !== undefined ? n <= coverage : true;
}
//@ chunk-exfmq47h.js:32910-33400 esm-fingerprint
function getExperimentResult(ctx, experiment, variationIndex, hashUsed, featureId, bucket, stickyBucketUsed) {
  let inExperiment = true;
  if (variationIndex < 0 || variationIndex >= experiment.variations.length) {
    variationIndex = 0;
    inExperiment = false;
  }
  let { hashAttribute, hashValue } = getHashAttribute(
    ctx,
    experiment.hashAttribute,
    ctx.user.saveStickyBucketAssignmentDoc && !experiment.disableStickyBucketing
      ? experiment.fallbackAttribute
      : undefined,
  );
  let meta = experiment.meta ? experiment.meta[variationIndex] : {};
  let res = {
    key: meta.key || "" + variationIndex,
    featureId,
    inExperiment,
    hashUsed,
    variationId: variationIndex,
    value: experiment.variations[variationIndex],
    hashAttribute,
    hashValue,
    stickyBucketUsed: !!stickyBucketUsed,
  };
  if (meta.name) res.name = meta.name;
  if (bucket !== undefined) res.bucket = bucket;
  if (meta.passthrough) res.passthrough = meta.passthrough;
  return res;
}
//@ chunk-exfmq47h.js:33400-33541 esm-fingerprint
function mergeOverrides(experiment, ctx) {
  let key = experiment.key;
  let o = ctx.global.overrides;
  if (o && o[key]) {
    experiment = Object.assign({}, experiment, o[key]);
    if (typeof experiment.url === "string") experiment.url = getUrlRegExp(experiment.url);
  }
  return experiment;
}
//@ chunk-exfmq47h.js:33541-33672 esm-fingerprint
function getHashAttribute(ctx, attr, fallback) {
  let hashAttribute = attr || "id";
  let hashValue = "";
  let attributes = getAttributes(ctx);
  if (attributes[hashAttribute]) hashValue = attributes[hashAttribute];
  if (!hashValue && fallback) {
    if (attributes[fallback]) hashValue = attributes[fallback];
    if (hashValue) hashAttribute = fallback;
  }
  return {
    hashAttribute,
    hashValue,
  };
}
//@ chunk-exfmq47h.js:33672-33833 esm-fingerprint
function urlIsValid(urlRegex, ctx) {
  let url = ctx.user.url;
  if (!url) return false;
  let pathOnly = url.replace(/^https?:\/\//, "").replace(/^[^/]*\//, "/");
  if (urlRegex.test(url)) return true;
  if (urlRegex.test(pathOnly)) return true;
  return false;
}
//@ chunk-exfmq47h.js:33833-33932 esm-fingerprint
function hasGroupOverlap(expGroups, ctx) {
  let groups = ctx.global.groups || {};
  for (let i = 0; i < expGroups.length; i++) if (groups[expGroups[i]]) return true;
  return false;
}
//@ chunk-exfmq47h.js:33932-34349 esm-fingerprint
function getStickyBucketVariation(_ref) {
  let {
    ctx,
    expKey,
    expBucketVersion,
    expHashAttribute,
    expFallbackAttribute,
    expMinBucketVersion,
    expMeta,
  } = _ref;
  expBucketVersion = expBucketVersion || 0;
  expMinBucketVersion = expMinBucketVersion || 0;
  expHashAttribute = expHashAttribute || "id";
  expMeta = expMeta || [];
  let id = getStickyBucketExperimentKey(expKey, expBucketVersion);
  let assignments = getStickyBucketAssignments(ctx, expHashAttribute, expFallbackAttribute);
  if (expMinBucketVersion > 0)
    for (let i = 0; i <= expMinBucketVersion; i++) {
      let blockedKey = getStickyBucketExperimentKey(expKey, i);
      if (assignments[blockedKey] !== undefined)
        return {
          variation: -1,
          versionIsBlocked: true,
        };
    }
  let variationKey = assignments[id];
  if (variationKey === undefined)
    return {
      variation: -1,
    };
  let variation = expMeta.findIndex((m) => m.key === variationKey);
  if (variation < 0)
    return {
      variation: -1,
    };
  return {
    variation,
  };
}
//@ chunk-exfmq47h.js:34349-34393 esm-layout
function getStickyBucketExperimentKey(experimentKey, experimentBucketVersion) {
  experimentBucketVersion = experimentBucketVersion || 0;
  return `${experimentKey}__${experimentBucketVersion}`;
}
//@ chunk-exfmq47h.js:34393-34429 esm-layout
function getStickyBucketAttributeKey(attributeName, attributeValue) {
  return `${attributeName}||${attributeValue}`;
}
//@ chunk-exfmq47h.js:34429-34846 esm-fingerprint
function getStickyBucketAssignments(ctx, expHashAttribute, expFallbackAttribute) {
  if (!ctx.user.stickyBucketAssignmentDocs) return {};
  let { hashAttribute, hashValue } = getHashAttribute(ctx, expHashAttribute);
  let hashKey = getStickyBucketAttributeKey(hashAttribute, toString(hashValue));
  let { hashAttribute: fallbackAttribute, hashValue: fallbackValue } = getHashAttribute(
    ctx,
    expFallbackAttribute,
  );
  let fallbackKey = fallbackValue
    ? getStickyBucketAttributeKey(fallbackAttribute, toString(fallbackValue))
    : null;
  let assignments = {};
  if (fallbackKey && ctx.user.stickyBucketAssignmentDocs[fallbackKey])
    Object.assign(assignments, ctx.user.stickyBucketAssignmentDocs[fallbackKey].assignments || {});
  if (ctx.user.stickyBucketAssignmentDocs[hashKey])
    Object.assign(assignments, ctx.user.stickyBucketAssignmentDocs[hashKey].assignments || {});
  return assignments;
}
//@ chunk-exfmq47h.js:34846-35142 esm-fingerprint
function generateStickyBucketAssignmentDoc(ctx, attributeName, attributeValue, assignments) {
  let key = getStickyBucketAttributeKey(attributeName, attributeValue);
  let existingAssignments =
    ctx.user.stickyBucketAssignmentDocs && ctx.user.stickyBucketAssignmentDocs[key]
      ? ctx.user.stickyBucketAssignmentDocs[key].assignments || {}
      : {};
  let newAssignments = {
    ...existingAssignments,
    ...assignments,
  };
  let changed = JSON.stringify(existingAssignments) !== JSON.stringify(newAssignments);
  return {
    key,
    doc: {
      attributeName,
      attributeValue,
      assignments: newAssignments,
    },
    changed,
  };
}
//@ chunk-exfmq47h.js:35142-35567 esm-fingerprint
function deriveStickyBucketIdentifierAttributes(ctx, data) {
  let attributes = new Set();
  let features = data && data.features ? data.features : ctx.global.features || {};
  let experiments = data && data.experiments ? data.experiments : ctx.global.experiments || [];
  Object.keys(features).forEach((id) => {
    let feature = features[id];
    if (feature.rules) {
      for (let rule of feature.rules)
        if (rule.variations) {
          attributes.add(rule.hashAttribute || "id");
          if (rule.fallbackAttribute) attributes.add(rule.fallbackAttribute);
        }
    }
  });
  experiments.map((experiment) => {
    attributes.add(experiment.hashAttribute || "id");
    if (experiment.fallbackAttribute) attributes.add(experiment.fallbackAttribute);
  });
  return Array.from(attributes);
}
//@ chunk-exfmq47h.js:35567-35636 esm-fingerprint
async function getAllStickyBucketAssignmentDocs(ctx, stickyBucketService, data) {
  let attributes = getStickyBucketAttributes(ctx, data);
  return stickyBucketService.getAllAssignments(attributes);
}
//@ chunk-exfmq47h.js:35636-35731 esm-fingerprint
function getStickyBucketAttributes(ctx, assignments) {
  let attributes = {};
  deriveStickyBucketIdentifierAttributes(ctx, assignments).forEach((attr) => {
    let { hashValue } = getHashAttribute(ctx, attr);
    attributes[attr] = toString(hashValue);
  });
  return attributes;
}
//@ chunk-exfmq47h.js:35731-36212 esm-fingerprint
async function decryptPayload(data, decryptionKey, subtle) {
  data = {
    ...data,
  };
  if (data.encryptedFeatures) {
    try {
      data.features = JSON.parse(await decrypt(data.encryptedFeatures, decryptionKey, subtle));
    } catch (e) {
      console.error(e);
    }
    delete data.encryptedFeatures;
  }
  if (data.encryptedExperiments) {
    try {
      data.experiments = JSON.parse(await decrypt(data.encryptedExperiments, decryptionKey, subtle));
    } catch (e) {
      console.error(e);
    }
    delete data.encryptedExperiments;
  }
  if (data.encryptedSavedGroups) {
    try {
      data.savedGroups = JSON.parse(await decrypt(data.encryptedSavedGroups, decryptionKey, subtle));
    } catch (e) {
      console.error(e);
    }
    delete data.encryptedSavedGroups;
  }
  return data;
}
//@ chunk-exfmq47h.js:36212-36463 esm-fingerprint
function getApiHosts(options) {
  let defaultHost = options.apiHost || "https://cdn.growthbook.io";
  return {
    apiHost: defaultHost.replace(/\/*$/, ""),
    streamingHost: (options.streamingHost || defaultHost).replace(/\/*$/, ""),
    apiRequestHeaders: options.apiHostRequestHeaders,
    streamingHostRequestHeaders: options.streamingHostRequestHeaders,
  };
}
//@ chunk-exfmq47h.js:36463-36535 esm-fingerprint
function getExperimentDedupeKey(experiment, result) {
  return result.hashAttribute + result.hashValue + experiment.key + result.variationId;
}
//@ chunk-exfmq47h.js:36535-36589 esm-layout
var isBrowser = typeof window !== "undefined" && typeof document !== "undefined";
var SDK_VERSION$1 = loadSDKVersion();
//@ chunk-exfmq47h.js:36589-51198 esm-fingerprint
class GrowthBook {
  constructor(options) {
    options = options || {};
    this.version = SDK_VERSION$1;
    this._options = this.context = options;
    this._renderer = options.renderer || null;
    this._trackedExperiments = new Set();
    this._completedChangeIds = new Set();
    this._trackedFeatures = {};
    this.debug = !!options.debug;
    this._subscriptions = new Set();
    this.ready = false;
    this._assigned = new Map();
    this._activeAutoExperiments = new Map();
    this._triggeredExpKeys = new Set();
    this._initialized = false;
    this._redirectedUrl = "";
    this._deferredTrackingCalls = new Map();
    this._autoExperimentsAllowed = !options.disableExperimentsOnLoad;
    this._destroyCallbacks = [];
    this.logs = [];
    this.log = this.log.bind(this);
    this._saveDeferredTrack = this._saveDeferredTrack.bind(this);
    this._fireSubscriptions = this._fireSubscriptions.bind(this);
    this._recordChangedId = this._recordChangedId.bind(this);
    if (options.remoteEval) {
      if (options.decryptionKey) throw Error("Encryption is not available for remoteEval");
      if (!options.clientKey) throw Error("Missing clientKey");
      let isGbHost = false;
      try {
        isGbHost = !!new URL(options.apiHost || "").hostname.match(/growthbook\.io$/i);
      } catch (e) {}
      if (isGbHost) throw Error("Cannot use remoteEval on GrowthBook Cloud");
    } else if (options.cacheKeyAttributes) throw Error("cacheKeyAttributes are only used for remoteEval");
    if (options.stickyBucketService) {
      let s = options.stickyBucketService;
      this._saveStickyBucketAssignmentDoc = (doc) => s.saveAssignments(doc);
    }
    if (options.plugins) for (let plugin of options.plugins) plugin(this);
    if (options.features) this.ready = true;
    if (isBrowser && options.enableDevMode) {
      window._growthbook = this;
      document.dispatchEvent(new Event("gbloaded"));
    }
    if (options.experiments) {
      this.ready = true;
      this._updateAllAutoExperiments();
    }
    if (this._options.stickyBucketService && this._options.stickyBucketAssignmentDocs)
      for (let key in this._options.stickyBucketAssignmentDocs) {
        let doc = this._options.stickyBucketAssignmentDocs[key];
        if (doc) this._options.stickyBucketService.saveAssignments(doc).catch(() => {});
      }
    if (this.ready) this.refreshStickyBuckets(this.getPayload());
  }
  async setPayload(payload) {
    this._payload = payload;
    let data = await decryptPayload(payload, this._options.decryptionKey);
    this._decryptedPayload = data;
    await this.refreshStickyBuckets(data);
    if (data.features) this._options.features = data.features;
    if (data.savedGroups) this._options.savedGroups = data.savedGroups;
    if (data.experiments) {
      this._options.experiments = data.experiments;
      this._updateAllAutoExperiments();
    }
    this.ready = true;
    this._render();
  }
  initSync(options) {
    this._initialized = true;
    let payload = options.payload;
    if (payload.encryptedExperiments || payload.encryptedFeatures)
      throw Error("initSync does not support encrypted payloads");
    if (this._options.stickyBucketService && !this._options.stickyBucketAssignmentDocs)
      this._options.stickyBucketAssignmentDocs = this.generateStickyBucketAssignmentDocsSync(
        this._options.stickyBucketService,
        payload,
      );
    this._payload = payload;
    this._decryptedPayload = payload;
    if (payload.features) this._options.features = payload.features;
    if (payload.experiments) {
      this._options.experiments = payload.experiments;
      this._updateAllAutoExperiments();
    }
    this.ready = true;
    startStreaming(this, options);
    return this;
  }
  async init(options) {
    this._initialized = true;
    options = options || {};
    if (options.cacheSettings) configureCache(options.cacheSettings);
    if (options.payload) {
      await this.setPayload(options.payload);
      startStreaming(this, options);
      return {
        success: true,
        source: "init",
      };
    } else {
      let { data, ...res } = await this._refresh({
        ...options,
        allowStale: true,
      });
      startStreaming(this, options);
      await this.setPayload(data || {});
      return res;
    }
  }
  async loadFeatures(options) {
    options = options || {};
    await this.init({
      skipCache: options.skipCache,
      timeout: options.timeout,
      streaming:
        (this._options.backgroundSync ?? true) && (options.autoRefresh || this._options.subscribeToChanges),
    });
  }
  async refreshFeatures(options) {
    let res = await this._refresh({
      ...(options || {}),
      allowStale: false,
    });
    if (res.data) await this.setPayload(res.data);
  }
  getApiInfo() {
    return [this.getApiHosts().apiHost, this.getClientKey()];
  }
  getApiHosts() {
    return getApiHosts(this._options);
  }
  getClientKey() {
    return this._options.clientKey || "";
  }
  getPayload() {
    return (
      this._payload || {
        features: this.getFeatures(),
        experiments: this.getExperiments(),
      }
    );
  }
  getDecryptedPayload() {
    return this._decryptedPayload || this.getPayload();
  }
  isRemoteEval() {
    return this._options.remoteEval || false;
  }
  getCacheKeyAttributes() {
    return this._options.cacheKeyAttributes;
  }
  async _refresh(_ref) {
    let { timeout, skipCache, allowStale, streaming } = _ref;
    if (!this._options.clientKey) throw Error("Missing clientKey");
    return refreshFeatures({
      instance: this,
      timeout,
      skipCache: skipCache || this._options.disableCache,
      allowStale,
      backgroundSync: streaming ?? this._options.backgroundSync ?? true,
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
  setFeatures(features) {
    this._options.features = features;
    this.ready = true;
    this._render();
  }
  async setEncryptedFeatures(encryptedString, decryptionKey, subtle) {
    let featuresJSON = await decrypt(encryptedString, decryptionKey || this._options.decryptionKey, subtle);
    this.setFeatures(JSON.parse(featuresJSON));
  }
  setExperiments(experiments) {
    this._options.experiments = experiments;
    this.ready = true;
    this._updateAllAutoExperiments();
  }
  async setEncryptedExperiments(encryptedString, decryptionKey, subtle) {
    let experimentsJSON = await decrypt(
      encryptedString,
      decryptionKey || this._options.decryptionKey,
      subtle,
    );
    this.setExperiments(JSON.parse(experimentsJSON));
  }
  async setAttributes(attributes) {
    this._options.attributes = attributes;
    if (this._options.stickyBucketService) await this.refreshStickyBuckets();
    if (this._options.remoteEval) {
      await this._refreshForRemoteEval();
      return;
    }
    this._render();
    this._updateAllAutoExperiments();
  }
  async updateAttributes(attributes) {
    return this.setAttributes({
      ...this._options.attributes,
      ...attributes,
    });
  }
  async setAttributeOverrides(overrides) {
    this._options.attributeOverrides = overrides;
    if (this._options.stickyBucketService) await this.refreshStickyBuckets();
    if (this._options.remoteEval) {
      await this._refreshForRemoteEval();
      return;
    }
    this._render();
    this._updateAllAutoExperiments();
  }
  async setForcedVariations(vars) {
    this._options.forcedVariations = vars || {};
    if (this._options.remoteEval) {
      await this._refreshForRemoteEval();
      return;
    }
    this._render();
    this._updateAllAutoExperiments();
  }
  setForcedFeatures(map) {
    this._options.forcedFeatureValues = map;
    this._render();
  }
  async setURL(url) {
    if (url === this._options.url) return;
    this._options.url = url;
    this._redirectedUrl = "";
    if (this._options.remoteEval) {
      await this._refreshForRemoteEval();
      this._updateAllAutoExperiments(true);
      return;
    }
    this._updateAllAutoExperiments(true);
  }
  getAttributes() {
    return {
      ...this._options.attributes,
      ...this._options.attributeOverrides,
    };
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
  subscribe(cb) {
    this._subscriptions.add(cb);
    return () => {
      this._subscriptions.delete(cb);
    };
  }
  async _refreshForRemoteEval() {
    if (!this._options.remoteEval) return;
    if (!this._initialized) return;
    let res = await this._refresh({
      allowStale: false,
    });
    if (res.data) await this.setPayload(res.data);
  }
  getAllResults() {
    return new Map(this._assigned);
  }
  onDestroy(cb) {
    this._destroyCallbacks.push(cb);
  }
  isDestroyed() {
    return !!this._destroyed;
  }
  destroy() {
    this._destroyed = true;
    this._destroyCallbacks.forEach((cb) => {
      try {
        cb();
      } catch (e) {
        console.error(e);
      }
    });
    this._subscriptions.clear();
    this._assigned.clear();
    this._trackedExperiments.clear();
    this._completedChangeIds.clear();
    this._deferredTrackingCalls.clear();
    this._trackedFeatures = {};
    this._destroyCallbacks = [];
    this._payload = undefined;
    this._saveStickyBucketAssignmentDoc = undefined;
    unsubscribe(this);
    this.logs = [];
    if (isBrowser && window._growthbook === this) delete window._growthbook;
    this._activeAutoExperiments.forEach((exp) => {
      exp.undo();
    });
    this._activeAutoExperiments.clear();
    this._triggeredExpKeys.clear();
  }
  setRenderer(renderer) {
    this._renderer = renderer;
  }
  forceVariation(key, variation) {
    this._options.forcedVariations = this._options.forcedVariations || {};
    this._options.forcedVariations[key] = variation;
    if (this._options.remoteEval) {
      this._refreshForRemoteEval();
      return;
    }
    this._updateAllAutoExperiments();
    this._render();
  }
  run(experiment) {
    let { result } = runExperiment(experiment, null, this._getEvalContext());
    this._fireSubscriptions(experiment, result);
    return result;
  }
  triggerExperiment(key) {
    this._triggeredExpKeys.add(key);
    if (!this._options.experiments) return null;
    return this._options.experiments
      .filter((exp) => exp.key === key)
      .map((exp) => this._runAutoExperiment(exp))
      .filter((res) => res !== null);
  }
  triggerAutoExperiments() {
    this._autoExperimentsAllowed = true;
    this._updateAllAutoExperiments(true);
  }
  _getEvalContext() {
    return {
      user: this._getUserContext(),
      global: this._getGlobalContext(),
      stack: {
        evaluatedFeatures: new Set(),
      },
    };
  }
  _getUserContext() {
    return {
      attributes: this._options.user
        ? {
            ...this._options.user,
            ...this._options.attributes,
          }
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
      onExperimentEval: this._subscriptions.size > 0 ? this._fireSubscriptions : undefined,
      recordChangeId: this._recordChangedId,
      saveDeferredTrack: this._saveDeferredTrack,
      eventLogger: this._options.eventLogger,
    };
  }
  _runAutoExperiment(experiment, forceRerun) {
    let existing = this._activeAutoExperiments.get(experiment);
    if (experiment.manual && !this._triggeredExpKeys.has(experiment.key) && !existing) return null;
    let isBlocked = this._isAutoExperimentBlockedByContext(experiment);
    let result;
    let trackingCall;
    if (isBlocked) result = getExperimentResult(this._getEvalContext(), experiment, -1, false, "");
    else {
      ({ result, trackingCall } = runExperiment(experiment, null, this._getEvalContext()));
      this._fireSubscriptions(experiment, result);
    }
    let valueHash = JSON.stringify(result.value);
    if (!forceRerun && result.inExperiment && existing && existing.valueHash === valueHash) return result;
    if (existing) this._undoActiveAutoExperiment(experiment);
    if (result.inExperiment) {
      let changeType = getAutoExperimentChangeType(experiment);
      if (changeType === "redirect" && result.value.urlRedirect && experiment.urlPatterns) {
        let url = experiment.persistQueryString
          ? mergeQueryStrings(this._getContextUrl(), result.value.urlRedirect)
          : result.value.urlRedirect;
        if (isURLTargeted(url, experiment.urlPatterns)) {
          this.log("Skipping redirect because original URL matches redirect URL", {
            id: experiment.key,
          });
          return result;
        }
        this._redirectedUrl = url;
        let { navigate, delay } = this._getNavigateFunction();
        if (navigate)
          if (isBrowser)
            Promise.all([
              ...(trackingCall ? [promiseTimeout(trackingCall, this._options.maxNavigateDelay ?? 1000)] : []),
              new Promise((resolve) => window.setTimeout(resolve, this._options.navigateDelay ?? delay)),
            ]).then(() => {
              try {
                navigate(url);
              } catch (e) {
                console.error(e);
              }
            });
          else
            try {
              navigate(url);
            } catch (e) {
              console.error(e);
            }
      } else if (changeType === "visual") {
        let undo = this._options.applyDomChangesCallback
          ? this._options.applyDomChangesCallback(result.value)
          : this._applyDOMChanges(result.value);
        if (undo)
          this._activeAutoExperiments.set(experiment, {
            undo,
            valueHash,
          });
      }
    }
    return result;
  }
  _undoActiveAutoExperiment(exp) {
    let data = this._activeAutoExperiments.get(exp);
    if (data) {
      data.undo();
      this._activeAutoExperiments.delete(exp);
    }
  }
  _updateAllAutoExperiments(forceRerun) {
    if (!this._autoExperimentsAllowed) return;
    let experiments = this._options.experiments || [];
    let keys = new Set(experiments);
    this._activeAutoExperiments.forEach((v, k) => {
      if (!keys.has(k)) {
        v.undo();
        this._activeAutoExperiments.delete(k);
      }
    });
    for (let exp of experiments) {
      let result = this._runAutoExperiment(exp, forceRerun);
      if (
        result !== null &&
        result !== undefined &&
        result.inExperiment &&
        getAutoExperimentChangeType(exp) === "redirect"
      )
        break;
    }
  }
  _fireSubscriptions(experiment, result) {
    let key = experiment.key;
    let prev = this._assigned.get(key);
    if (
      !prev ||
      prev.result.inExperiment !== result.inExperiment ||
      prev.result.variationId !== result.variationId
    ) {
      this._assigned.set(key, {
        experiment,
        result,
      });
      this._subscriptions.forEach((cb) => {
        try {
          cb(experiment, result);
        } catch (e) {
          console.error(e);
        }
      });
    }
  }
  _recordChangedId(id) {
    this._completedChangeIds.add(id);
  }
  isOn(key) {
    return this.evalFeature(key).on;
  }
  isOff(key) {
    return this.evalFeature(key).off;
  }
  getFeatureValue(key, defaultValue) {
    let value = this.evalFeature(key).value;
    return value === null ? defaultValue : value;
  }
  feature(id) {
    return this.evalFeature(id);
  }
  evalFeature(id) {
    return evaluateFeature(id, this._getEvalContext());
  }
  log(msg, ctx) {
    if (!this.debug) return;
    if (this._options.log) this._options.log(msg, ctx);
    else console.log(msg, ctx);
  }
  getDeferredTrackingCalls() {
    return Array.from(this._deferredTrackingCalls.values());
  }
  setDeferredTrackingCalls(calls) {
    this._deferredTrackingCalls = new Map(
      calls
        .filter((c) => c && c.experiment && c.result)
        .map((c) => [getExperimentDedupeKey(c.experiment, c.result), c]),
    );
  }
  async fireDeferredTrackingCalls() {
    if (!this._options.trackingCallback) return;
    let promises = [];
    this._deferredTrackingCalls.forEach((call) => {
      if (!call || !call.experiment || !call.result)
        console.error("Invalid deferred tracking call", {
          call,
        });
      else promises.push(this._options.trackingCallback(call.experiment, call.result));
    });
    this._deferredTrackingCalls.clear();
    await Promise.all(promises);
  }
  setTrackingCallback(callback) {
    this._options.trackingCallback = callback;
    this.fireDeferredTrackingCalls();
  }
  setEventLogger(logger) {
    this._options.eventLogger = logger;
  }
  async logEvent(eventName, properties) {
    if (this._destroyed) {
      console.error("Cannot log event to destroyed GrowthBook instance");
      return;
    }
    if (this._options.enableDevMode)
      this.logs.push({
        eventName,
        properties,
        timestamp: Date.now().toString(),
        logType: "event",
      });
    if (this._options.eventLogger)
      try {
        await this._options.eventLogger(eventName, properties || {}, this._getUserContext());
      } catch (e) {
        console.error(e);
      }
    else console.error("No event logger configured");
  }
  _saveDeferredTrack(data) {
    this._deferredTrackingCalls.set(getExperimentDedupeKey(data.experiment, data.result), data);
  }
  _getContextUrl() {
    return this._options.url || (isBrowser ? window.location.href : "");
  }
  _isAutoExperimentBlockedByContext(experiment) {
    let changeType = getAutoExperimentChangeType(experiment);
    if (changeType === "visual") {
      if (this._options.disableVisualExperiments) return true;
      if (this._options.disableJsInjection) {
        if (experiment.variations.some((v) => v.js)) return true;
      }
    } else if (changeType === "redirect") {
      if (this._options.disableUrlRedirectExperiments) return true;
      try {
        let current = new URL(this._getContextUrl());
        for (let v of experiment.variations) {
          if (!v || !v.urlRedirect) continue;
          let url = new URL(v.urlRedirect);
          if (this._options.disableCrossOriginUrlRedirectExperiments) {
            if (url.protocol !== current.protocol) return true;
            if (url.host !== current.host) return true;
          }
        }
      } catch (e) {
        this.log("Error parsing current or redirect URL", {
          id: experiment.key,
          error: e,
        });
        return true;
      }
    } else return true;
    if (experiment.changeId && (this._options.blockedChangeIds || []).includes(experiment.changeId))
      return true;
    return false;
  }
  getRedirectUrl() {
    return this._redirectedUrl;
  }
  _getNavigateFunction() {
    if (this._options.navigate)
      return {
        navigate: this._options.navigate,
        delay: 0,
      };
    else if (isBrowser)
      return {
        navigate: (url) => {
          window.location.replace(url);
        },
        delay: 100,
      };
    return {
      navigate: null,
      delay: 0,
    };
  }
  _applyDOMChanges(changes) {
    if (!isBrowser) return;
    let undo = [];
    if (changes.css) {
      let s = document.createElement("style");
      s.innerHTML = changes.css;
      document.head.appendChild(s);
      undo.push(() => s.remove());
    }
    if (changes.js) {
      let script = document.createElement("script");
      script.innerHTML = changes.js;
      if (this._options.jsInjectionNonce) script.nonce = this._options.jsInjectionNonce;
      document.head.appendChild(script);
      undo.push(() => script.remove());
    }
    if (changes.domMutations)
      changes.domMutations.forEach((mutation) => {
        undo.push(experiments.declarative(mutation).revert);
      });
    return () => {
      undo.forEach((fn) => fn());
    };
  }
  async refreshStickyBuckets(data) {
    if (this._options.stickyBucketService) {
      let ctx = this._getEvalContext();
      let docs = await getAllStickyBucketAssignmentDocs(ctx, this._options.stickyBucketService, data);
      this._options.stickyBucketAssignmentDocs = docs;
    }
  }
  generateStickyBucketAssignmentDocsSync(stickyBucketService, payload) {
    if (!("getAllAssignmentsSync" in stickyBucketService)) {
      console.error("generating StickyBucketAssignmentDocs docs requires StickyBucketServiceSync");
      return;
    }
    let ctx = this._getEvalContext();
    let attributes = getStickyBucketAttributes(ctx, payload);
    return stickyBucketService.getAllAssignmentsSync(attributes);
  }
  inDevMode() {
    return !!this._options.enableDevMode;
  }
}
export { subscribe, helpers, getPolyfills, setPolyfills, GrowthBook };
