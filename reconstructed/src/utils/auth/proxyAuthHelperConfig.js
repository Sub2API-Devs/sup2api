/**
 * utils/auth/proxyAuthHelperConfig.ts
 *
 * 2.1.316 新增。从设置配置 proxyAuthHelper（项目/本地设置来源受限）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-ez5bvzy2.js (1)
 * attribution: placement 1
 */
import {
  warnPinnedHelper,
  isHookedMergeAnswer,
  runManagedHelperWithoutProjectEnv,
  managedHelperSettingsGate,
} from "./managedHelpers.js";
import { getSettings_DEPRECATED, getSettingsForSourceTightenOnly } from "../settings/settings.js";
import {
  getConfiguredProxyAuthHelper,
  _setProxyAuthHelperConfig,
  clearProxyAuthHelperCache,
} from "../proxy.js";
import { checkHasTrustDialogAccepted } from "../config.js";

//@ chunk-ez5bvzy2.js:327-621 placement
/**
 * 从设置配置 proxyAuthHelper（项目/本地设置来源受限）。
 */
function configureProxyAuthHelperFromSettings() {
  let e = warnPinnedHelper("proxyAuthHelper", (getSettings_DEPRECATED() || {}).proxyAuthHelper);
  let r = getConfiguredProxyAuthHelper() !== e;
  _setProxyAuthHelperConfig({
    helper: e,
    fromProjectOrLocal:
      getSettingsForSourceTightenOnly("projectSettings")?.proxyAuthHelper === e ||
      getSettingsForSourceTightenOnly("localSettings")?.proxyAuthHelper === e ||
      isHookedMergeAnswer("proxyAuthHelper"),
    trustAccepted: checkHasTrustDialogAccepted,
    startHelper: runManagedHelperWithoutProjectEnv,
    readAsHelperStarts: managedHelperSettingsGate,
  });
  if (r) clearProxyAuthHelperCache();
}
export { configureProxyAuthHelperFromSettings };
