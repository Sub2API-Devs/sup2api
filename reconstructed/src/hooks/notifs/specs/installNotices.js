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
var NO_PERMISSIONS = "no_permissions",
  B_t = {
    id: "sudo-npm-install",
    maxImpressions: 1,
    onShown: () => logFeatureOk("sudo_npm_install_notice"),
    compute: async (h) => {
      if (isEnvTruthy(process.env.DISABLE_INSTALLATION_CHECKS)) return null;
      let x = await readUpdateResult(h?.storageV5);
      if (x?.path !== "npm-global" || x.outcome !== "failed" || x.status !== NO_PERMISSIONS) return null;
      return {
        key: "sudo-npm-install",
        segments: [
          { text: "Claude Code can't auto-update", color: "warning" },
          { text: " \xB7 run `claude doctor`", dim: !0 },
        ],
        priority: "high",
        timeoutMs: 15000,
      };
    },
  };
/**
 * 安装相关启动通知规格的列表（本构建中多个规格为 null），含 OAuth 过期警告、署名提示、子代理配置警告与市场插件推荐等。
 */
//@ chunk-18hwfzwa.js:1750354-1751044 placement
var H_t = null,
  U_t = null,
  W_t = null,
  j_t = null,
  q_t = null,
  $_t = null,
  V_t = null,
  attributionProjectNoticeSpec = require("./chunk-x08x6vab.js").attributionProjectNoticeSpec,
  COMPUTED_NOTICE_SPECS = [
    ...(H_t ? [H_t] : []),
    ...(U_t ? [U_t] : []),
    ...(W_t ? [W_t] : []),
    ...(j_t ? [j_t] : []),
    ...($_t ? [$_t] : []),
    ...(V_t ? [V_t] : []),
    ...(q_t ? [q_t] : []),
    oauthExpiryWarningNoticeSpec,
    ...(attributionProjectNoticeSpec ? [attributionProjectNoticeSpec] : []),
    B_t,
    reservedSkillNamesNoticeSpec,
    namesNotShownNoticeSpec,
    subagentConfigWarningNoticeSpec,
    {
      id: "marketplace-plugin-suggestion",
      compute: async (h) => {
        if (!h) return null;
        let x = await getMarketplacePluginTipToShow({
            session: h.session,
            theme: "dark",
            storageV5: h.storageV5,
            credentials: h.credentials,
          }),
          D = x?.pluginId;
        if (!x || !D) return null;
        return (
          recordShownTip(x, "startup", h.storageV5),
          {
            key: "marketplace-plugin-suggestion",
            kind: "upsell",
            segments: [
              { text: `plugin suggestion: ${D}`, color: "suggestion" },
              { text: " \xB7 /plugin", dim: !0 },
            ],
            priority: "low",
          }
        );
      },
    },
  ];
//@ chunk-18hwfzwa.js:1762535-1762579 placement
var installIssuesNoticeSpec = { id: "install-issues", setup: () => runInstallCheck };
//@ chunk-18hwfzwa.js:1762579-1762777 placement
function runInstallCheck() {
  if (getIsRemoteMode()) return;
  checkInstall()
    .then((h) => {
      let x = 0;
      for (let D of h)
        if (D.type === "path") x++;
        else logForDebugging(`install check: ${D.message}`, { level: D.type === "error" ? "error" : "info" });
      logSetupIssues("install", x);
    })
    .catch(logError);
}

export { COMPUTED_NOTICE_SPECS, installIssuesNoticeSpec };
