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
  shouldEnableClaudeInChrome as shouldEnableClaudeInChrome_2,
  isChromeExtensionInstalled,
} from "../../../utils/claudeInChrome/setup.js";
import { isClaudeAISubscriber } from "../../../utils/auth.js";
import { logSetupIssues } from "../../../utils/notifications/setupIssues.js";
import { isAntBuild } from "../../../utils/envUtils.js";
import { logError } from "../../../utils/log.js";
import {
  getComplianceTaints,
  normalizeComplianceTaints,
  isKnownComplianceTaint,
  POLICY_LIMITED_NOTICE,
  onComplianceTaintsChanged,
} from "../../../services/policyLimits/complianceTaints.js";
import { getPolicyNotice, onPolicyNoticeChanged } from "../../../services/policyLimits/cacheStamp.js";
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
    let h = false;
    return ({ store }) => {
      if (getIsRemoteMode() || h) return;
      h = true;
      let chromeFlag = getChromeFlagOverride();
      let globalConfig = getGlobalConfig();
      if (
        !(
          chromeFlag === true ||
          env.CLAUDE_CODE_ENABLE_CFC ||
          globalConfig.claudeInChromeDefaultEnabled === true
        ) ||
        !shouldEnableClaudeInChrome_2(chromeFlag)
      )
        return;
      if (globalConfig.chromeExtension?.pairedDeviceId) return;
      if (!isClaudeAISubscriber()) {
        logSetupIssues("chrome", 1);
        return;
      }
      if (isAntBuild()) return;
      isChromeExtensionInstalled()
        .then((ke) => {
          if (ke) return;
          logSetupIssues("chrome", 1);
          store.setState((Re) => {
            if (Re.setupIssues.chromeExtensionIssueCount === 1) return Re;
            return {
              ...Re,
              setupIssues: {
                ...Re.setupIssues,
                chromeExtensionIssueCount: 1,
              },
            };
          });
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
    let complianceTaints = getComplianceTaints();
    return ({ addNotification }) => {
      if (getIsRemoteMode()) return;
      function D(complianceTaints_2) {
        let ee = normalizeComplianceTaints(complianceTaints);
        let filtered = normalizeComplianceTaints(complianceTaints_2).filter(
          (Re) => isKnownComplianceTaint(Re) && !ee.includes(Re),
        );
        complianceTaints = complianceTaints_2;
        if (filtered.length > 0)
          addNotification({
            key: "compliance-taint",
            kind: "event",
            priority: "immediate",
            requeueOnPreempt: true,
            text: `${POLICY_LIMITED_NOTICE} \xB7 /status`,
          });
      }
      D(getComplianceTaints());
      return onComplianceTaintsChanged(D);
    };
  },
};
var complianceTaintNoticeSpec_2 = {
  id: "monitoring-notice",
  deps: (h) => [h.addNotification],
  setup() {
    let policyNotice = getPolicyNotice();
    return ({ addNotification }) => {
      if (getIsRemoteMode()) return;
      function D(policyNotice_2) {
        let ee = policyNotice === null && policyNotice_2 !== null;
        policyNotice = policyNotice_2;
        if (ee && policyNotice_2)
          addNotification({
            key: "monitoring-notice",
            kind: "event",
            priority: "immediate",
            requeueOnPreempt: true,
            text: policyNotice_2.url
              ? `${policyNotice_2.text} \xB7 ${policyNotice_2.url}`
              : policyNotice_2.text,
          });
      }
      D(getPolicyNotice());
      return onPolicyNoticeChanged(D);
    };
  },
};
//@ chunk-18hwfzwa.js:1758165-1758852 placement
/**
 * 启动通知"cost-threshold"：本地会话累计花费超过 5 美元且有 Console 计费权限时，弹一次花费提示对话框（记 tengu_cost_threshold_reached，确认后不再弹）。
 */
var COST_THRESHOLD_USD = 5;
var costThresholdNoticeSpec = {
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
    let h = getGlobalConfig().hasAcknowledgedCostThreshold ? false : null;
    return ({
      turn,
      turnAtRender: { isLoading, lastQueryCompletionTime },
      initialMessage,
      isRemoteSession,
      requestDialog,
      dialogStore,
      storageV5,
    }) => {
      if (isRemoteSession || isLoading || h === false) return;
      if (initialMessage !== null || (turn.isInitialMessageInFlight && lastQueryCompletionTime === 0)) return;
      if (h === null) {
        if (getTotalCostUSD() < COST_THRESHOLD_USD) return;
        logEvent("tengu_cost_threshold_reached", {});
        h = hasConsoleBillingAccess();
        if (!h) return;
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
    return ({ transcript, session }) =>
      deviceToolNotices.of(session).subscribe((L, ee) => {
        let ke = h;
        if (
          ke !== undefined &&
          ke.key === L &&
          ke.text === ee &&
          transcript.getSnapshot().some((Be) => Be.uuid === ke.uuid)
        )
          return;
        let systemMessage = createSystemMessage(
          ee,
          L === DEVICE_MCP_NOT_NOW_NOTICE_KEY ? "notice" : "warning",
        );
        transcript.apply({
          type: "append",
          messages: [systemMessage],
        });
        h = {
          key: L,
          text: ee,
          uuid: systemMessage.uuid,
        };
      });
  },
};
export {
  deviceToolNoticesNoticeSpec,
  chromeExtensionCheckNoticeSpec,
  signinOfferNoticeSpec,
  complianceTaintNoticeSpec,
  complianceTaintNoticeSpec_2,
  costThresholdNoticeSpec,
};
