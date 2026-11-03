/**
 * @azure/identity/dist/esm/msal/nodeFlows/msalPlugins.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @azure/identity@4.10.1
 * pieces: chunk-mrx6y2r5.js (4)
 * attribution: esm-layout 2, esm-fingerprint 2
 */
import { MSAL_CACHE, NOCAE, CAE } from "../../constants.js";

//@ chunk-mrx6y2r5.js:22705-22719 esm-layout
var Os = void 0;
//@ chunk-mrx6y2r5.js:22719-22733 esm-layout
var Yc = void 0;
//@ chunk-mrx6y2r5.js:22733-24316 esm-fingerprint
function hm(e) {
  var t, r, n, o, i, s, a;
  let c = {
    cache: {},
    broker: {
      isEnabled:
        (r = (t = e.brokerOptions) === null || t === void 0 ? void 0 : t.enabled) !== null && r !== void 0
          ? r
          : !1,
      enableMsaPassthrough:
        (o = (n = e.brokerOptions) === null || n === void 0 ? void 0 : n.legacyEnableMsaPassthrough) !==
          null && o !== void 0
          ? o
          : !1,
      parentWindowHandle: (i = e.brokerOptions) === null || i === void 0 ? void 0 : i.parentWindowHandle,
    },
  };
  if ((s = e.tokenCachePersistenceOptions) === null || s === void 0 ? void 0 : s.enabled) {
    if (Os === void 0)
      throw Error(
        [
          "Persistent token caching was requested, but no persistence provider was configured.",
          "You must install the identity-cache-persistence plugin package (`npm install --save @azure/identity-cache-persistence`)",
          "and enable it by importing `useIdentityPlugin` from `@azure/identity` and calling",
          "`useIdentityPlugin(cachePersistencePlugin)` before using `tokenCachePersistenceOptions`.",
        ].join(" "),
      );
    let l = e.tokenCachePersistenceOptions.name || MSAL_CACHE;
    ((c.cache.cachePlugin = Os(Object.assign({ name: `${l}.${NOCAE}` }, e.tokenCachePersistenceOptions))),
      (c.cache.cachePluginCae = Os(Object.assign({ name: `${l}.${CAE}` }, e.tokenCachePersistenceOptions))));
  }
  if ((a = e.brokerOptions) === null || a === void 0 ? void 0 : a.enabled) {
    if (Yc === void 0)
      throw Error(
        [
          "Broker for WAM was requested to be enabled, but no native broker was configured.",
          "You must install the identity-broker plugin package (`npm install --save @azure/identity-broker`)",
          "and enable it by importing `useIdentityPlugin` from `@azure/identity` and calling",
          "`useIdentityPlugin(createNativeBrokerPlugin())` before using `enableBroker`.",
        ].join(" "),
      );
    c.broker.nativeBrokerPlugin = Yc.broker;
  }
  return c;
}
//@ chunk-mrx6y2r5.js:24316-24356 esm-fingerprint
var Wc = { generatePluginConfiguration: hm };

export { Wc };
