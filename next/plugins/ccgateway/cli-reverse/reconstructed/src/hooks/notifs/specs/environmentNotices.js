/**
 * hooks/notifs/specs/environmentNotices.ts
 *
 * 2.1.316 新增。启动通知：环境类。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-czq1j3j2.js (5)
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

//@ chunk-czq1j3j2.js:1804153-1804683 placement
var chromeExtensionCheckNoticeSpec = {
  id: "chrome-extension-check",
  deps: (deps) => [deps.store],
  setup() {
    let isCancelled = false;
    return ({ store }) => {
      if (getIsRemoteMode() || isCancelled) return;
      isCancelled = true;
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
        .then((result) => {
          if (result) return;
          logSetupIssues("chrome", 1);
          store.setState((prev) => {
            if (prev.setupIssues.chromeExtensionIssueCount === 1) return prev;
            return {
              ...prev,
              setupIssues: {
                ...prev.setupIssues,
                chromeExtensionIssueCount: 1,
              },
            };
          });
        })
        .catch(logError);
    };
  },
};
//@ chunk-czq1j3j2.js:1804683-1804742 placement
var signinOfferNoticeSpec = {
  id: "signin-offer",
  setup() {
    return (state, actions) => {
      return;
    };
  },
};
//@ chunk-czq1j3j2.js:1804742-1805426 placement
var complianceTaintNoticeSpec = {
  id: "compliance-taint",
  deps: (ctx) => [ctx.addNotification],
  setup() {
    let complianceTaints = getComplianceTaints();
    return ({ addNotification }) => {
      if (getIsRemoteMode()) return;
      function computeTaints(complianceTaints_2) {
        let normalized = normalizeComplianceTaints(complianceTaints);
        let filtered = normalizeComplianceTaints(complianceTaints_2).filter(
          (taint) => isKnownComplianceTaint(taint) && !normalized.includes(taint),
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
      computeTaints(getComplianceTaints());
      return onComplianceTaintsChanged(computeTaints);
    };
  },
};
var complianceTaintNoticeSpec_2 = {
  id: "monitoring-notice",
  deps: (ctx) => [ctx.addNotification],
  setup() {
    let policyNotice = getPolicyNotice();
    return ({ addNotification }) => {
      if (getIsRemoteMode()) return;
      function computePolicy(policyNotice_2) {
        let becamePresent = policyNotice === null && policyNotice_2 !== null;
        policyNotice = policyNotice_2;
        if (becamePresent && policyNotice_2)
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
      computePolicy(getPolicyNotice());
      return onPolicyNoticeChanged(computePolicy);
    };
  },
};
//@ chunk-czq1j3j2.js:1805426-1806113 placement
/**
 * 启动通知"cost-threshold"：本地会话累计花费超过 5 美元且有 Console 计费权限时，弹一次花费提示对话框（记 tengu_cost_threshold_reached，确认后不再弹）。
 */
var COST_THRESHOLD_USD = 5;
var costThresholdNoticeSpec = {
  id: "cost-threshold",
  deps: (ctx) => {
    let turnAtRender = ctx.turnAtRender;
    return [
      ctx.transcript.getSnapshot(),
      turnAtRender.isLoading,
      ctx.initialMessage,
      turnAtRender.lastQueryCompletionTime,
      ctx.requestDialog,
      ctx.storageV5,
      ctx.dialogStore,
    ];
  },
  setup() {
    let acknowledged = getGlobalConfig().hasAcknowledgedCostThreshold ? false : null;
    return ({
      turn,
      turnAtRender: { isLoading, lastQueryCompletionTime },
      initialMessage,
      isRemoteSession,
      requestDialog,
      dialogStore,
      storageV5,
    }) => {
      if (isRemoteSession || isLoading || acknowledged === false) return;
      if (initialMessage !== null || (turn.isInitialMessageInFlight && lastQueryCompletionTime === 0)) return;
      if (acknowledged === null) {
        if (getTotalCostUSD() < COST_THRESHOLD_USD) return;
        logEvent("tengu_cost_threshold_reached", {});
        acknowledged = hasConsoleBillingAccess();
        if (!acknowledged) return;
      }
      if (
        getGlobalConfig().hasAcknowledgedCostThreshold ||
        dialogStore.getState().open.some((dialog) => dialog.kind === costThresholdDialogDef.kind)
      )
        return;
      acknowledgeCostThreshold(requestDialog, storageV5);
    };
  },
};
//@ chunk-czq1j3j2.js:1806451-1806816 placement
var deviceToolNoticesNoticeSpec = {
  id: "device-tool-notices",
  deps: (ctx) => [ctx.transcript, ctx.session],
  setup() {
    let lastNotice;
    return ({ transcript, session }) =>
      deviceToolNotices.of(session).subscribe((notice, notices) => {
        let notice_ = lastNotice;
        if (
          notice_ !== undefined &&
          notice_.key === notice &&
          notice_.text === notices &&
          transcript.getSnapshot().some((message) => message.uuid === notice_.uuid)
        )
          return;
        let systemMessage = createSystemMessage(
          notices,
          notice === DEVICE_MCP_NOT_NOW_NOTICE_KEY ? "notice" : "warning",
        );
        transcript.apply({
          type: "append",
          messages: [systemMessage],
        });
        lastNotice = {
          key: notice,
          text: notices,
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
