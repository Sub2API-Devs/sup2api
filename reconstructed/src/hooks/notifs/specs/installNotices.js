/**
 * hooks/notifs/specs/installNotices.ts
 *
 * 2.1.316 新增。启动通知：安装类。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (4)
 * attribution: placement 4
 */
import { logFeatureOk } from "../../../services/analytics/featureTelemetry.js";
import { isEnvTruthy } from "../../../utils/envUtils.js";
import { readUpdateResult } from "../../../utils/nativeInstaller/updateResult.js";
import {
  oauthExpiryWarningNoticeSpec,
  reservedSkillNamesNoticeSpec,
  namesNotShownNoticeSpec,
} from "./configNotices.js";
import { subagentConfigWarningNoticeSpec } from "./subagentConfigWarning.js";
import { getMarketplacePluginTipToShow, recordShownTip } from "../../../services/tips/tipScheduler.js";
import { getIsRemoteMode } from "../../../bootstrap/state.js";
import { checkInstall } from "../../../utils/nativeInstaller/installer.js";
import { logForDebugging } from "../../../utils/debug.js";
import { logSetupIssues } from "../../../utils/notifications/setupIssues.js";
import { logError } from "../../../utils/log.js";

//@ chunk-18hwfzwa.js:1749887-1750354 placement
var NO_PERMISSIONS = "no_permissions";
var sudoNpmInstallNoticeSpec = {
  id: "sudo-npm-install",
  maxImpressions: 1,
  onShown: () => logFeatureOk("sudo_npm_install_notice"),
  compute: async (h) => {
    if (isEnvTruthy(process.env.DISABLE_INSTALLATION_CHECKS)) return null;
    let updateResult = await readUpdateResult(h?.storageV5);
    if (
      updateResult?.path !== "npm-global" ||
      updateResult.outcome !== "failed" ||
      updateResult.status !== NO_PERMISSIONS
    )
      return null;
    return {
      key: "sudo-npm-install",
      segments: [
        {
          text: "Claude Code can't auto-update",
          color: "warning",
        },
        {
          text: " \xB7 run `claude doctor`",
          dim: true,
        },
      ],
      priority: "high",
      timeoutMs: 15000,
    };
  },
};
//@ chunk-18hwfzwa.js:1750354-1751044 placement
/**
 * 安装相关启动通知规格的列表（本构建中多个规格为 null），含 OAuth 过期警告、署名提示、子代理配置警告与市场插件推荐等。
 */
var INSTALL_NOTICE_SPEC_A = null;
var INSTALL_NOTICE_SPEC_B = null;
var INSTALL_NOTICE_SPEC_C = null;
var INSTALL_NOTICE_SPEC_D = null;
var INSTALL_NOTICE_SPEC_E = null;
var INSTALL_NOTICE_SPEC_F = null;
var INSTALL_NOTICE_SPEC_G = null;
var attributionProjectNoticeSpec = require("./chunk-x08x6vab.js").attributionProjectNoticeSpec;
var COMPUTED_NOTICE_SPECS = [
  ...(INSTALL_NOTICE_SPEC_A ? [INSTALL_NOTICE_SPEC_A] : []),
  ...(INSTALL_NOTICE_SPEC_B ? [INSTALL_NOTICE_SPEC_B] : []),
  ...(INSTALL_NOTICE_SPEC_C ? [INSTALL_NOTICE_SPEC_C] : []),
  ...(INSTALL_NOTICE_SPEC_D ? [INSTALL_NOTICE_SPEC_D] : []),
  ...(INSTALL_NOTICE_SPEC_F ? [INSTALL_NOTICE_SPEC_F] : []),
  ...(INSTALL_NOTICE_SPEC_G ? [INSTALL_NOTICE_SPEC_G] : []),
  ...(INSTALL_NOTICE_SPEC_E ? [INSTALL_NOTICE_SPEC_E] : []),
  oauthExpiryWarningNoticeSpec,
  ...(attributionProjectNoticeSpec ? [attributionProjectNoticeSpec] : []),
  sudoNpmInstallNoticeSpec,
  reservedSkillNamesNoticeSpec,
  namesNotShownNoticeSpec,
  subagentConfigWarningNoticeSpec,
  {
    id: "marketplace-plugin-suggestion",
    compute: async (h) => {
      if (!h) return null;
      let marketplacePluginTipToShow = await getMarketplacePluginTipToShow({
        session: h.session,
        theme: "dark",
        storageV5: h.storageV5,
        credentials: h.credentials,
      });
      let pluginId = marketplacePluginTipToShow?.pluginId;
      if (!marketplacePluginTipToShow || !pluginId) return null;
      recordShownTip(marketplacePluginTipToShow, "startup", h.storageV5);
      return {
        key: "marketplace-plugin-suggestion",
        kind: "upsell",
        segments: [
          {
            text: `plugin suggestion: ${pluginId}`,
            color: "suggestion",
          },
          {
            text: " \xB7 /plugin",
            dim: true,
          },
        ],
        priority: "low",
      };
    },
  },
];
//@ chunk-18hwfzwa.js:1762535-1762579 placement
var installIssuesNoticeSpec = {
  id: "install-issues",
  setup: () => runInstallCheck,
};
//@ chunk-18hwfzwa.js:1762579-1762777 placement
function runInstallCheck() {
  if (getIsRemoteMode()) return;
  checkInstall()
    .then((h) => {
      let x = 0;
      for (let D of h)
        if (D.type === "path") x++;
        else
          logForDebugging(`install check: ${D.message}`, {
            level: D.type === "error" ? "error" : "info",
          });
      logSetupIssues("install", x);
    })
    .catch(logError);
}
export { COMPUTED_NOTICE_SPECS, installIssuesNoticeSpec };
