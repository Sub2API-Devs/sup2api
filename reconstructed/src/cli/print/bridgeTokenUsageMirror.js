/**
 * cli/print/bridgeTokenUsageMirror.ts
 *
 * 2.1.316 新增：把令牌用量增量镜像到 Remote Control 桥（按 worker epoch 去重）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-0sfjpx19.js (5)
 * attribution: placement 5
 */
import { bridgeHostState } from "../../bridge/bridgeHostState.js";
import { ZERO_TOKEN_USAGE } from "../../bootstrap/stateSlices.js";
import { getSpentTokens } from "../../cost-tracker.js";
import { logError } from "../../utils/log.js";
import { queuedNotificationCapabilities } from "../../services/queuedNotifications/queuedNotifications.js";
import {
  buildSystemInitMessage,
  buildRemoteSystemInitFields,
  ASK_USER_QUESTION_UNANSWERED_V1,
} from "../../utils/messages/systemInit.js";
import { getDisableSlashCommands } from "../../bootstrap/state.js";
import { bridgeAdvertisedCommands } from "../../commands.js";
import { dropSyncedClashes } from "../../utils/commandPredicates.js";
import {
  getFastModeState,
  getFastModeUnavailableReasonCode,
  getFastRejectedReason,
} from "../../utils/fastMode.js";
import { resolveEffortLevelOrNull } from "../../bridge/applyFlagSettings.js";
import { viewTeammateOutput } from "../../components/teams/TeamsDialog.js";

//@ chunk-0sfjpx19.js:45722-45986 placement = combineUsage (1)
/**
 * 把 usage 乘系数后累加到总计（输入、输出、缓存读、缓存写四项）。旧版名 combineUsage 不确切，属成本统计。
 */
function addScaledUsage(total, factor, usage) {
  return {
    inputTokens: total.inputTokens + factor * usage.inputTokens,
    outputTokens: total.outputTokens + factor * usage.outputTokens,
    cacheReadInputTokens: total.cacheReadInputTokens + factor * usage.cacheReadInputTokens,
    cacheCreationInputTokens: total.cacheCreationInputTokens + factor * usage.cacheCreationInputTokens,
  };
}
//@ chunk-0sfjpx19.js:45986-46088 placement = combineUsage (1)
/**
 * 把 usage 转成 [输入, 输出, 缓存读, 缓存写] 元组。属成本统计。
 */
function usageToTuple(usage) {
  return [usage.inputTokens, usage.outputTokens, usage.cacheReadInputTokens, usage.cacheCreationInputTokens];
}
//@ chunk-0sfjpx19.js:46088-46936 placement
/**
 * 计算自上次以来的令牌用量增量并经 REPL/SDK 宿主句柄发出。
 */
function mirrorTokenUsageToBridge() {
  try {
    let e = bridgeHostState();
    let n = e.replHandle ?? e.sdkHostedHandle;
    let r = (e.tokenUsageMirror ??= {
      seen: ZERO_TOKEN_USAGE,
      bridged: ZERO_TOKEN_USAGE,
      sessionId: undefined,
      epoch: undefined,
      base: ZERO_TOKEN_USAGE,
      sent: ZERO_TOKEN_USAGE,
    });
    let total = getSpentTokens();
    let usage = addScaledUsage(total, -1, r.seen);
    r.seen = total;
    let y = n?.workerEpoch?.();
    if (!n || n.outboundOnly || !y) return;
    if (r.sessionId !== y.sessionId) {
      r.sent = r.bridged;
      r.base = r.bridged;
    } else if (r.epoch !== y.epoch) r.base = r.sent;
    r.sessionId = y.sessionId;
    r.epoch = y.epoch;
    r.bridged = addScaledUsage(r.bridged, 1, usage);
    let _ = usageToTuple(r.bridged);
    if (!e.replHandle && !n.getJoinedProjectThread?.() && !e.projectFilesDoor?.()) return;
    if (usageToTuple(r.sent).every((w, S) => w === _[S])) return;
    let b = addScaledUsage(r.bridged, -1, r.base);
    if (
      n.reportInternalMetadata?.({
        cumulative_input_tokens: b.inputTokens,
        cumulative_output_tokens: b.outputTokens,
        cumulative_cache_read_tokens: b.cacheReadInputTokens,
        cumulative_cache_write_tokens: b.cacheCreationInputTokens,
      })
    )
      r.sent = r.bridged;
  } catch (error) {
    logError(error);
  }
}
//@ chunk-0sfjpx19.js:46936-47440 placement
function buildBridgeContextSnapshot({
  session,
  tools,
  model,
  permissionMode,
  commands,
  agents,
  loadedSkills,
  mcpCommands,
  fastMode,
  effortValue,
  messagesInView,
}) {
  let T = queuedNotificationCapabilities(tools, session, messagesInView);
  return buildSystemInitMessage({
    ...buildRemoteSystemInitFields(),
    additionalDirectories: undefined,
    tools: [],
    mcpClients: [],
    model,
    permissionMode,
    commands: getDisableSlashCommands() ? [] : bridgeAdvertisedCommands(commands),
    agents,
    skills: dropSyncedClashes(loadedSkills, mcpCommands),
    plugins: [],
    pluginErrors: [],
    pluginWarnings: [],
    mcpServerErrors: [],
    fastModeState: getFastModeState(model, fastMode),
    fastModeDisabledReason:
      getFastModeUnavailableReasonCode(model) ?? getFastRejectedReason(model, fastMode) ?? undefined,
    effort: resolveEffortLevelOrNull(model, effortValue),
    viewMode: viewTeammateOutput(),
    capabilities: [...T, ASK_USER_QUESTION_UNANSWERED_V1],
  });
}
//@ chunk-0sfjpx19.js:47479-47509 placement
var CAFFEINATE_TIMEOUT_SECONDS = 300;
var CAFFEINATE_RESTART_INTERVAL_MS = 240000;
var SLEEP_RELEASE_DELAY_MS = 30000;
export {
  SLEEP_RELEASE_DELAY_MS,
  CAFFEINATE_TIMEOUT_SECONDS,
  CAFFEINATE_RESTART_INTERVAL_MS,
  buildBridgeContextSnapshot,
  mirrorTokenUsageToBridge,
};
