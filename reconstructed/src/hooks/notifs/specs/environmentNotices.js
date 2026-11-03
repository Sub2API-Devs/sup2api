/**
 * hooks/notifs/specs/environmentNotices.ts
 *
 * 2.1.316 新增。启动通知：环境类。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (5)
 * attribution: placement 5
 */
import { getIsRemoteMode, getChromeFlagOverride, getTotalCostUSD } from "../../../bootstrap/state.js";
import { getGlobalConfig } from "../../../utils/config.js";
import { env } from "../../../utils/env.js";
import {
  shouldEnableClaudeInChrome,
  isChromeExtensionInstalled,
} from "../../../utils/claudeInChrome/setup.js";
import { isClaudeAISubscriber } from "../../../utils/auth.js";
import { logSetupIssues } from "../../../utils/notifications/setupIssues.js";
import { isAntBuild } from "../../../utils/envUtils.js";
import { logError } from "../../../utils/log.js";
import {
  getComplianceTaints,
  normalizeComplianceTaints,
  MPn,
  POLICY_LIMITED_NOTICE,
  onComplianceTaintsChanged,
} from "../../../services/policyLimits/complianceTaints.js";
import { DRt, sbi } from "../../../services/policyLimits/cacheStamp.js";
import { logEvent } from "../../../services/analytics/index.js";
import { hasConsoleBillingAccess } from "../../../utils/billing.js";
import { costThresholdDialogDef, acknowledgeCostThreshold } from "../../../components/dialogs/dialogKinds.js";
import {
  deviceToolNotices,
  DEVICE_MCP_NOT_NOW_NOTICE_KEY,
} from "../../../services/deviceMcp/deviceToolNotices.js";
import { createSystemMessage } from "../../../utils/messages.js";

//@ chunk-18hwfzwa.js:1756892-1757422 placement
var chromeExtensionCheckNoticeSpec = {
  id: "chrome-extension-check",
  deps: (h) => [h.store],
  setup() {
    let h = !1;
    return ({ store: store }) => {
      if (getIsRemoteMode() || h) return;
      h = !0;
      let D = getChromeFlagOverride(),
        L = getGlobalConfig();
      if (
        !(D === !0 || env.CLAUDE_CODE_ENABLE_CFC || L.claudeInChromeDefaultEnabled === !0) ||
        !shouldEnableClaudeInChrome(D)
      )
        return;
      if (L.chromeExtension?.pairedDeviceId) return;
      if (!isClaudeAISubscriber()) {
        logSetupIssues("chrome", 1);
        return;
      }
      if (isAntBuild()) return;
      isChromeExtensionInstalled()
        .then((ke) => {
          if (ke) return;
          (logSetupIssues("chrome", 1),
            store.setState((Re) => {
              if (Re.setupIssues.chromeExtensionIssueCount === 1) return Re;
              return { ...Re, setupIssues: { ...Re.setupIssues, chromeExtensionIssueCount: 1 } };
            }));
        })
        .catch(logError);
    };
  },
};
//@ chunk-18hwfzwa.js:1757422-1757481 placement
var signinOfferNoticeSpec = {
  id: "signin-offer",
  setup() {
    return (h, x) => {
      return;
    };
  },
};
//@ chunk-18hwfzwa.js:1757481-1758165 placement
var complianceTaintNoticeSpec = {
    id: "compliance-taint",
    deps: (h) => [h.addNotification],
    setup() {
      let h = getComplianceTaints();
      return ({ addNotification: addNotification }) => {
        if (getIsRemoteMode()) return;
        function D(L) {
          let ee = normalizeComplianceTaints(h),
            filtered = normalizeComplianceTaints(L).filter((Re) => MPn(Re) && !ee.includes(Re));
          if (((h = L), filtered.length > 0))
            addNotification({
              key: "compliance-taint",
              kind: "event",
              priority: "immediate",
              requeueOnPreempt: !0,
              text: `${POLICY_LIMITED_NOTICE} \xB7 /status`,
            });
        }
        return (D(getComplianceTaints()), onComplianceTaintsChanged(D));
      };
    },
  },
  rTt = {
    id: "monitoring-notice",
    deps: (h) => [h.addNotification],
    setup() {
      let h = DRt();
      return ({ addNotification: addNotification }) => {
        if (getIsRemoteMode()) return;
        function D(L) {
          let ee = h === null && L !== null;
          if (((h = L), ee && L))
            addNotification({
              key: "monitoring-notice",
              kind: "event",
              priority: "immediate",
              requeueOnPreempt: !0,
              text: L.url ? `${L.text} \xB7 ${L.url}` : L.text,
            });
        }
        return (D(DRt()), sbi(D));
      };
    },
  };
/**
 * 启动通知"cost-threshold"：本地会话累计花费超过 5 美元且有 Console 计费权限时，弹一次花费提示对话框（记 tengu_cost_threshold_reached，确认后不再弹）。
 */
//@ chunk-18hwfzwa.js:1758165-1758852 placement
var COST_THRESHOLD_USD = 5,
  costThresholdNoticeSpec = {
    id: "cost-threshold",
    deps: (h) => {
      let turnAtRender = h.turnAtRender;
      return [
        h.transcript.getSnapshot(),
        turnAtRender.isLoading,
        h.initialMessage,
        turnAtRender.lastQueryCompletionTime,
        h.requestDialog,
        h.storageV5,
        h.dialogStore,
      ];
    },
    setup() {
      let h = getGlobalConfig().hasAcknowledgedCostThreshold ? !1 : null;
      return ({
        turn: turn,
        turnAtRender: { isLoading: D, lastQueryCompletionTime: L },
        initialMessage: initialMessage,
        isRemoteSession: isRemoteSession,
        requestDialog: requestDialog,
        dialogStore: dialogStore,
        storageV5: storageV5,
      }) => {
        if (isRemoteSession || D || h === !1) return;
        if (initialMessage !== null || (turn.isInitialMessageInFlight && L === 0)) return;
        if (h === null) {
          if (getTotalCostUSD() < COST_THRESHOLD_USD) return;
          if ((logEvent("tengu_cost_threshold_reached", {}), (h = hasConsoleBillingAccess()), !h)) return;
        }
        if (
          getGlobalConfig().hasAcknowledgedCostThreshold ||
          dialogStore.getState().open.some((We) => We.kind === costThresholdDialogDef.kind)
        )
          return;
        acknowledgeCostThreshold(requestDialog, storageV5);
      };
    },
  };
//@ chunk-18hwfzwa.js:1759190-1759555 placement
var deviceToolNoticesNoticeSpec = {
  id: "device-tool-notices",
  deps: (h) => [h.transcript, h.session],
  setup() {
    let h;
    return ({ transcript: transcript, session: session }) =>
      deviceToolNotices.of(session).subscribe((L, ee) => {
        let ke = h;
        if (
          ke !== void 0 &&
          ke.key === L &&
          ke.text === ee &&
          transcript.getSnapshot().some((Be) => Be.uuid === ke.uuid)
        )
          return;
        let Re = createSystemMessage(ee, L === DEVICE_MCP_NOT_NOW_NOTICE_KEY ? "notice" : "warning");
        (transcript.apply({ type: "append", messages: [Re] }), (h = { key: L, text: ee, uuid: Re.uuid }));
      });
  },
};

export {
  deviceToolNoticesNoticeSpec,
  chromeExtensionCheckNoticeSpec,
  signinOfferNoticeSpec,
  complianceTaintNoticeSpec,
  rTt,
  costThresholdNoticeSpec,
};
