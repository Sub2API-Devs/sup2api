/**
 * @azure/core-rest-pipeline/dist/esm/util/tokenCycler.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @azure/core-rest-pipeline@1.21.0
 * pieces: chunk-b5df2wx1.js (3)
 * attribution: esm-fingerprint 3
 */
import { delay_3 } from "../../../../core-util/dist/esm/delay.js";

//@ chunk-b5df2wx1.js:63072-63158 esm-fingerprint
var DEFAULT_CYCLER_OPTIONS = {
  forcedRefreshWindowInMs: 1000,
  retryIntervalInMs: 3000,
  refreshWindowInMs: 120000,
};
//@ chunk-b5df2wx1.js:63158-63414 esm-fingerprint
async function beginRefresh(getAccessToken, retryIntervalInMs, refreshTimeout) {
  async function tryGetAccessToken() {
    if (Date.now() < refreshTimeout)
      try {
        return await getAccessToken();
      } catch (_a) {
        return null;
      }
    else {
      let finalToken = await getAccessToken();
      if (finalToken === null) throw Error("Failed to refresh access token.");
      return finalToken;
    }
  }
  let token = await tryGetAccessToken();
  while (token === null) {
    await delay_3(retryIntervalInMs);
    token = await tryGetAccessToken();
  }
  return token;
}
//@ chunk-b5df2wx1.js:63414-64307 esm-fingerprint
function createTokenCycler(credential, tokenCyclerOptions) {
  let refreshWorker = null;
  let token = null;
  let tenantId;
  let options = Object.assign(Object.assign({}, DEFAULT_CYCLER_OPTIONS), tokenCyclerOptions);
  let cycler = {
    get isRefreshing() {
      return refreshWorker !== null;
    },
    get shouldRefresh() {
      var _a;
      if (cycler.isRefreshing) return false;
      if (
        (token === null || token === undefined ? undefined : token.refreshAfterTimestamp) &&
        token.refreshAfterTimestamp < Date.now()
      )
        return true;
      return (
        ((_a = token === null || token === undefined ? undefined : token.expiresOnTimestamp) !== null &&
        _a !== undefined
          ? _a
          : 0) -
          options.refreshWindowInMs <
        Date.now()
      );
    },
    get mustRefresh() {
      return token === null || token.expiresOnTimestamp - options.forcedRefreshWindowInMs < Date.now();
    },
  };
  function refresh(scopes, getTokenOptions) {
    var _a;
    if (!cycler.isRefreshing)
      refreshWorker = beginRefresh(
        () => credential.getToken(scopes, getTokenOptions),
        options.retryIntervalInMs,
        (_a = token === null || token === undefined ? undefined : token.expiresOnTimestamp) !== null &&
          _a !== undefined
          ? _a
          : Date.now(),
      )
        .then((_token) => {
          refreshWorker = null;
          token = _token;
          tenantId = getTokenOptions.tenantId;
          return token;
        })
        .catch((reason) => {
          refreshWorker = null;
          token = null;
          tenantId = undefined;
          throw reason;
        });
    return refreshWorker;
  }
  return async (scopes, tokenOptions) => {
    let hasClaimChallenge = Boolean(tokenOptions.claims);
    let tenantIdChanged = tenantId !== tokenOptions.tenantId;
    if (hasClaimChallenge) token = null;
    if (tenantIdChanged || hasClaimChallenge || cycler.mustRefresh) return refresh(scopes, tokenOptions);
    if (cycler.shouldRefresh) refresh(scopes, tokenOptions);
    return token;
  };
}
export { createTokenCycler };
