/**
 * @azure/identity/dist/esm/msal/nodeFlows/msalPlugins.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @azure/identity@4.10.1
 * pieces: chunk-b5df2wx1.js (4)
 * attribution: esm-layout 2, esm-fingerprint 2
 */
import { DEFAULT_TOKEN_CACHE_NAME, CACHE_NON_CAE_SUFFIX, CAE } from "../../constants.js";

//@ chunk-b5df2wx1.js:22705-22719 esm-layout
var persistenceProvider = undefined;
//@ chunk-b5df2wx1.js:22719-22733 esm-layout
var nativeBrokerInfo = undefined;
//@ chunk-b5df2wx1.js:22733-24316 esm-fingerprint
function generatePluginConfiguration(options) {
  var _a;
  var _b;
  var _c;
  var _d;
  var _e;
  var _f;
  var _g;
  let config = {
    cache: {},
    broker: {
      isEnabled:
        (_b = (_a = options.brokerOptions) === null || _a === undefined ? undefined : _a.enabled) !== null &&
        _b !== undefined
          ? _b
          : false,
      enableMsaPassthrough:
        (_d =
          (_c = options.brokerOptions) === null || _c === undefined
            ? undefined
            : _c.legacyEnableMsaPassthrough) !== null && _d !== undefined
          ? _d
          : false,
      parentWindowHandle:
        (_e = options.brokerOptions) === null || _e === undefined ? undefined : _e.parentWindowHandle,
    },
  };
  if ((_f = options.tokenCachePersistenceOptions) === null || _f === undefined ? undefined : _f.enabled) {
    if (persistenceProvider === undefined)
      throw Error(
        [
          "Persistent token caching was requested, but no persistence provider was configured.",
          "You must install the identity-cache-persistence plugin package (`npm install --save @azure/identity-cache-persistence`)",
          "and enable it by importing `useIdentityPlugin` from `@azure/identity` and calling",
          "`useIdentityPlugin(cachePersistencePlugin)` before using `tokenCachePersistenceOptions`.",
        ].join(" "),
      );
    let cacheBaseName = options.tokenCachePersistenceOptions.name || DEFAULT_TOKEN_CACHE_NAME;
    config.cache.cachePlugin = persistenceProvider(
      Object.assign(
        {
          name: `${cacheBaseName}.${CACHE_NON_CAE_SUFFIX}`,
        },
        options.tokenCachePersistenceOptions,
      ),
    );
    config.cache.cachePluginCae = persistenceProvider(
      Object.assign(
        {
          name: `${cacheBaseName}.${CAE}`,
        },
        options.tokenCachePersistenceOptions,
      ),
    );
  }
  if ((_g = options.brokerOptions) === null || _g === undefined ? undefined : _g.enabled) {
    if (nativeBrokerInfo === undefined)
      throw Error(
        [
          "Broker for WAM was requested to be enabled, but no native broker was configured.",
          "You must install the identity-broker plugin package (`npm install --save @azure/identity-broker`)",
          "and enable it by importing `useIdentityPlugin` from `@azure/identity` and calling",
          "`useIdentityPlugin(createNativeBrokerPlugin())` before using `enableBroker`.",
        ].join(" "),
      );
    config.broker.nativeBrokerPlugin = nativeBrokerInfo.broker;
  }
  return config;
}
//@ chunk-b5df2wx1.js:24316-24356 esm-fingerprint
var msalPlugins = {
  generatePluginConfiguration,
};
export { msalPlugins };
