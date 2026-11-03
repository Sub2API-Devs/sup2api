/**
 * utils/auth/personProxyAuthHelper.ts
 *
 * 2.1.316 新增。为特定命令只运行个人与策略来源的代理认证助手。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-rehfzw2n.js (10)
 * attribution: placement 10
 */
import { Ar } from "../../../runtime/bun-runtime.js";
import { isSameConfigDir } from "../envUtils.js";
import { credentialsStoreFor } from "../secureStorage/credentialsFileStore.js";
import { getSettingsForSource, getSettingsForSourceTightenOnly } from "../settings/settings.js";
import { isSettingSourceEnabled } from "../settings/constants.js";
import { checkHasTrustDialogAccepted } from "../config.js";
import { runManagedHelperWithoutProjectEnv, managedHelperSettingsGate } from "./managedHelpers.js";
import { isProviderManagedByHost } from "../entrypointKinds.js";
import {
  _setProxyAuthHelperConfig,
  getProxyUrlWithSource,
  parseProxyUrl,
  configureGlobalAgents,
} from "../proxy.js";
import { getIsNonInteractiveSession } from "../../bootstrap/state.js";
import { restoreGatewayAuthForFastPath } from "./gatewayAuthFastPath.js";
import { applyExtraCACertsFromConfig } from "../caCertsConfig.js";
import { loadExtraCACerts } from "../caCerts.js";
import { loadMTLSClientMaterial } from "../mtls.js";
import { loadHostCredentials } from "../hostCredsFile.js";
import { unsettledBy } from "../../daemon/workerEnding.js";

//@ chunk-rehfzw2n.js:692-703 placement
/**
 * 空对象的默认导出（占位模块内容）。
 */
var emptyDefaultExport = {};
//@ chunk-rehfzw2n.js:703-899 placement
Ar(emptyDefaultExport, {
  default: () => emptyDefaultExport,
  earlyCredentialsOf: () => earlyCredentialsOf,
  hostProxyAuthConfigured: () => hostProxyAuthConfigured,
  personProxyAuthHelper: () => personProxyAuthHelper,
  proxyAgentsInstalled: () => proxyAgentsInstalled,
  sessionFactsRestored: () => sessionFactsRestored,
  signInRestored: () => signInRestored,
});
//@ chunk-rehfzw2n.js:899-983 placement
function earlyCredentialsOf(e) {
  return e?.backend !== undefined && isSameConfigDir(e.configHome)
    ? credentialsStoreFor(e?.backend)
    : undefined;
}
//@ chunk-rehfzw2n.js:983-1338 placement
/**
 * 为特定命令只运行个人与策略来源的代理认证助手。
 */
function personProxyAuthHelper() {
  let proxyAuthHelper = getSettingsForSource("policySettings")?.proxyAuthHelper;
  let proxyAuthHelper_2 = isSettingSourceEnabled("userSettings")
    ? getSettingsForSource("userSettings")?.proxyAuthHelper
    : undefined;
  return {
    helper: proxyAuthHelper ?? proxyAuthHelper_2,
    fromProjectOrLocal:
      proxyAuthHelper === undefined &&
      proxyAuthHelper_2 !== undefined &&
      (getSettingsForSourceTightenOnly("projectSettings")?.proxyAuthHelper === proxyAuthHelper_2 ||
        getSettingsForSourceTightenOnly("localSettings")?.proxyAuthHelper === proxyAuthHelper_2),
    trustAccepted: checkHasTrustDialogAccepted,
    sources: "personAndPolicy",
    startHelper: runManagedHelperWithoutProjectEnv,
    readAsHelperStarts: managedHelperSettingsGate,
  };
}
//@ chunk-rehfzw2n.js:1338-1409 placement
/**
 * 提示：本项目设置的 proxy helper 不会由该命令运行。
 */
var PROXY_HELPER_SKIPPED_NOTE = `a proxy helper set by this project is not run by this command
`;
//@ chunk-rehfzw2n.js:1409-1613 placement
function hostProxyAuthConfigured() {
  let e = isProviderManagedByHost();
  let r =
    e &&
    Boolean(process.stderr.isTTY) &&
    (getSettingsForSource("projectSettings")?.proxyAuthHelper !== undefined ||
      getSettingsForSource("localSettings")?.proxyAuthHelper !== undefined);
  if (e) _setProxyAuthHelperConfig(personProxyAuthHelper());
  if (r) process.stderr.write(PROXY_HELPER_SKIPPED_NOTE);
}
//@ chunk-rehfzw2n.js:1613-1670 placement
/**
 * 代理设置被拒绝时的错误文本。
 */
var PROXY_HELPER_REFUSED_MESSAGE = "Error: the proxy setting named above is refused.";
//@ chunk-rehfzw2n.js:1670-1768 placement
function proxyAgentsInstalled() {
  let proxyUrlWithSource = getProxyUrlWithSource();
  let r = proxyUrlWithSource !== undefined && !parseProxyUrl(proxyUrlWithSource.value);
  configureGlobalAgents();
  return r
    ? {
        reason: PROXY_HELPER_REFUSED_MESSAGE,
        kind: "lasting",
      }
    : null;
}
//@ chunk-rehfzw2n.js:1768-1852 placement
function signInRestored(e) {
  let r = Boolean(process.stderr.isTTY) || !getIsNonInteractiveSession();
  return restoreGatewayAuthForFastPath(earlyCredentialsOf(e), () => r);
}
//@ chunk-rehfzw2n.js:1852-2065 placement
async function sessionFactsRestored(e) {
  let r = await Promise.resolve()
    .then(applyExtraCACertsFromConfig)
    .then(() => Promise.all([loadExtraCACerts(), loadMTLSClientMaterial()]))
    .then(loadHostCredentials)
    .then(hostProxyAuthConfigured)
    .then(() => signInRestored(e))
    .then(() => null, unsettledBy);
  let t = await Promise.resolve().then(proxyAgentsInstalled).catch(unsettledBy);
  return r ?? t;
}
export { sessionFactsRestored };
