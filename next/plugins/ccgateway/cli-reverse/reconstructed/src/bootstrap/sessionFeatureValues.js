/**
 * bootstrap/sessionFeatureValues.ts
 *
 * 会话级特性取值类（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-bfve2jm9.js (4)
 * attribution: placement 4
 */
import { SessionRootSlot } from "./sessionSlices.js";
import { getRootSession } from "./state.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-bfve2jm9.js:262-1960 placement
/**
 * 会话级特性取值缓存：按会话固定下来的 GrowthBook/环境开关、探测失败计数、一次性日志标记等字段集合。clear() 把所有字段重置为 undefined。
 */
class SessionFeatureValues {
  pinnedFeatureValues;
  reminderFold;
  echoWireToolInputs;
  idleObservationFence;
  maxSubagentSpawnDepthFromGrowthBook;
  composerWithRedesign;
  removalWaiverRulesClear;
  settingsChangesUnfinished;
  managedSourcesReadErrorLogged;
  decstbmRendererEnabled;
  wrapFitEnabled;
  forkSubagentEnabledSource;
  bashFirstDescriptionTrimmed;
  bashFirstDescriptionTrimmedCompiledOnly;
  coordinatorReadOnlyBashEnabled;
  coordinatorWorkerOutputTrees;
  bashActFirstEnabled;
  promptAblation;
  defaultFileReadingLimits;
  suggestRolloutEnabled;
  sendUserFileDeferred;
  sessionStartWorkflowSizeGuideline;
  totalTokensReminderClientDataReported;
  silentTurnReminderTurns;
  clientDataCapabilityLogged;
  sharedMemoryServedViaTools;
  tetherLiveGate;
  tetherZdrSeen;
  threadsEnvOptIn;
  keptReminderDelivery;
  keptReminderRetired;
  hiddenToolEntriesFieldRefused;
  hiddenToolEntriesHeaderRefused;
  hiddenToolEntriesProbeFailures;
  clearAtProbeFailures;
  threadsProbeFailures;
  thinkingDisplayProbeFailures;
  keptReminderOkLogged;
  retiredClassifierSideCallsLogged;
  localClassifierSwitchedOffLogged;
  artifactReplPathEnabled;
  artifactPreviewBrowserSearch;
  artifactPreviewBrowser;
  artifactPreviewEmulator;
  artifactPreviewEngine;
  sandboxedAttemptGateEnabled;
  commandNetworkListsOffered;
  replGateOn;
  replGateSource;
  replTypedEvents;
  replDrawShare;
  replConversationResumed;
  machinesSectionShown;
  bashTeachesHeredocOnStdin;
  attributionAnnouncementEnabled;
  autoModeContextEnabled;
  serverClassifierShadowEnabled;
  thirdPartyServerClassifierEnabled;
  userServerClassifierSwitch;
  betasSwitchSetAside;
  shellDescription;
  agentProxyNote;
  keptDeferredToolsEnabled;
  convertedSkillsAsPlugins;
  convertedSkillsSkillsListAsks;
  convertedSkillsSkillsListPin;
  servedOnFacts;
  segmentedTranscript;
  clear() {
    for (let key of Object.keys(this)) this[key] = undefined;
  }
}
//@ chunk-bfve2jm9.js:1960-1986 placement
/**
 * 按根会话缓存 SessionFeatureValues 的 SessionRootSlot；of() 首次访问时建实例，peek() 只读窥视。
 */
var SESSION_FEATURE_VALUES_SLOT; // deferred: uses SessionRootSlot (./sessionSlices.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-bfve2jm9.js:1960", () => {
  SESSION_FEATURE_VALUES_SLOT = new SessionRootSlot(() => new SessionFeatureValues());
});
//@ chunk-bfve2jm9.js:1986-2019 placement
/**
 * 取当前根会话的特性取值缓存（getSessionFeatureValues），GrowthBook/环境开关按会话固定下来的入口；全项目 70 多处调用。
 */
function getSessionFeatureValues() {
  return SESSION_FEATURE_VALUES_SLOT.of(getRootSession());
}
//@ chunk-bfve2jm9.js:2019-2055 placement
/**
 * 只读窥视会话特性取值缓存：会话尚未建立该槽时返回 undefined，不会创建。
 */
function peekSessionFeatureValues() {
  return SESSION_FEATURE_VALUES_SLOT.peek(getRootSession());
}
export { getSessionFeatureValues, SESSION_FEATURE_VALUES_SLOT, peekSessionFeatureValues };
