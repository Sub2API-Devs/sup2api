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
import { warnPinnedHelper, C6e, runManagedHelperWithoutProjectEnv, flt } from "./managedHelpers.js";
import { getSettings_DEPRECATED, getSettingsForSourceTightenOnly } from "../settings/settings.js";
import {
  getConfiguredProxyAuthHelper,
  _setProxyAuthHelperConfig,
  clearProxyAuthHelperCache,
} from "../proxy.js";
import { checkHasTrustDialogAccepted } from "../config.js";

/**
 * 从设置配置 proxyAuthHelper（项目/本地设置来源受限）。
 */
//@ chunk-ez5bvzy2.js:327-621 placement
function configureProxyAuthHelperFromSettings() {
  let e = warnPinnedHelper("proxyAuthHelper", (getSettings_DEPRECATED() || {}).proxyAuthHelper),
    r = getConfiguredProxyAuthHelper() !== e;
  if (
    (_setProxyAuthHelperConfig({
      helper: e,
      fromProjectOrLocal:
        getSettingsForSourceTightenOnly("projectSettings")?.proxyAuthHelper === e ||
        getSettingsForSourceTightenOnly("localSettings")?.proxyAuthHelper === e ||
        C6e("proxyAuthHelper"),
      trustAccepted: checkHasTrustDialogAccepted,
      startHelper: runManagedHelperWithoutProjectEnv,
      readAsHelperStarts: flt,
    }),
    r)
  )
    clearProxyAuthHelperCache();
}

export { configureProxyAuthHelperFromSettings };
