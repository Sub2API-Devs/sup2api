/**
 * hooks/notifs/specs/settingsNotices.ts
 *
 * 2.1.316 新增。启动通知：设置类。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (4)
 * attribution: placement 4
 */
import { getIsRemoteMode, getTeammateAgentId } from "../../../bootstrap/state.js";
import { isUnattendedBgSession } from "../../../utils/concurrentSessions.js";
import { managedSettingsUrl, MANAGED_SETTINGS_NOTICE } from "../../../components/ManagedSettingsNotice.js";
import { getGlobalConfig } from "../../../utils/config.js";
import { createSystemMessage, createInformationalSystemMessage } from "../../../utils/messages.js";
import { markManagedSettingsNoticeSeen } from "../../../services/remoteManagedSettings/loginNotice.js";
import { checkAndInstallOfficialMarketplace } from "../../../utils/plugins/officialMarketplaceStartupCheck.js";
import { logSetupIssues } from "../../../utils/notifications/setupIssues.js";
import { logError } from "../../../utils/log.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../../services/analytics/growthbook.js";
import { printableName } from "../../../utils/printableName.js";
import { getOtelHeadersHelperLastFailure, onOtelHeadersHelperFailure } from "../../../utils/auth.js";
import { isPlanBypass } from "../../../utils/permissions/browserToolNames.js";
import { logFeatureOk } from "../../../services/analytics/featureTelemetry.js";

//@ chunk-18hwfzwa.js:1765355-1765711 placement
var managedSettingsNoticeNoticeSpec = {
  id: "managed-settings-notice",
  deps: (h) => [h.hasBgAttacher, h.hasOpenDialog],
  setup() {
    return ({ hasOpenDialog, isRemoteSession, storageV5, transcript }) => {
      if (
        hasOpenDialog ||
        getIsRemoteMode() ||
        isRemoteSession ||
        isUnattendedBgSession() ||
        getTeammateAgentId() !== undefined
      )
        return;
      let ee = managedSettingsUrl();
      if (ee === undefined || getGlobalConfig().managedSettingsNoticeSeenOrg === ee) return;
      transcript.apply({
        type: "append",
        messages: [createSystemMessage(MANAGED_SETTINGS_NOTICE, "notice")],
      });
      markManagedSettingsNoticeSeen(ee, "transcript", storageV5);
    };
  },
};
//@ chunk-18hwfzwa.js:1771932-1772329 placement
var officialMarketplaceCheckNoticeSpec = {
  id: "official-marketplace-check",
  deps: (h) => [h.store, h.storageV5],
  setup() {
    let h = false;
    return ({ store, storageV5 }) => {
      if (getIsRemoteMode() || h) return;
      h = true;
      checkAndInstallOfficialMarketplace(storageV5)
        .then((L) => {
          let ee = !L.installed && L.skipped && L.reason === "unknown" ? 1 : 0;
          logSetupIssues("plugins", ee);
          store.setState((ke) => {
            if (ke.setupIssues.marketplaceIssueCount === ee) return ke;
            return {
              ...ke,
              setupIssues: {
                ...ke.setupIssues,
                marketplaceIssueCount: ee,
              },
            };
          });
        })
        .catch(logError);
    };
  },
};
//@ chunk-18hwfzwa.js:1772329-1772761 placement
var OTEL_HEADERS_HELPER_FAILED = "otel-headers-helper-failed";
var otelHeadersHelperFailedNoticeSpec = {
  id: OTEL_HEADERS_HELPER_FAILED,
  deps: (h) => [h.addNotification, h.growthBookVersion],
  setup() {
    let h = false;
    return ({ addNotification }) => {
      if (!getFeatureValue_CACHED_MAY_BE_STALE("tengu_quirky_teacup", true)) return;
      function D(otelHeadersHelperLastFailure) {
        if (h) return;
        h = true;
        addNotification({
          key: OTEL_HEADERS_HELPER_FAILED,
          kind: "warning",
          color: "warning",
          priority: "high",
          timeoutMs: 30000,
          text: `otelHeadersHelper failed; telemetry is not being exported. See /status: ${printableName(otelHeadersHelperLastFailure, 120)}`,
        });
      }
      let otelHeadersHelperLastFailure = getOtelHeadersHelperLastFailure();
      if (otelHeadersHelperLastFailure !== null) D(otelHeadersHelperLastFailure);
      return onOtelHeadersHelperFailure(D);
    };
  },
};
//@ chunk-18hwfzwa.js:1772761-1773348 placement
/**
 * 启动通知规格：以 bypass permissions 启动的会话进入计划模式时，延迟片刻提示计划模式不会在编辑前询问。
 */
var PLAN_BYPASS_NOTICE_DELAY_MS = 800;
var PLAN_BYPASS_NOTICE_TEXT =
  "Session was started with bypass permissions, so plan mode won't ask before most edits or commands. Start a new session without bypass permissions for prompts in plan mode.";
var planModeBypassNoticeSpec = {
  id: "plan-mode-bypass-notice",
  deps: (h) => [h.permissionMode, h.isBypassPermissionsModeAvailable, h.transcript, h.clock],
  setup() {
    let h = false;
    return ({ permissionMode, isBypassPermissionsModeAvailable, transcript, clock }) => {
      if (h || getIsRemoteMode()) return;
      if (!isPlanBypass(permissionMode, isBypassPermissionsModeAvailable)) return;
      return clock.setTimeout(() => {
        h = true;
        logFeatureOk("mode_plan_bypass_notice");
        transcript.apply({
          type: "append",
          messages: [
            {
              ...createInformationalSystemMessage(PLAN_BYPASS_NOTICE_TEXT, "notice"),
              persist: false,
            },
          ],
        });
      }, PLAN_BYPASS_NOTICE_DELAY_MS);
    };
  },
};
export {
  managedSettingsNoticeNoticeSpec,
  officialMarketplaceCheckNoticeSpec,
  otelHeadersHelperFailedNoticeSpec,
  planModeBypassNoticeSpec,
};
