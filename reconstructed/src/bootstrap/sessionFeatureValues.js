/**
 * bootstrap/sessionFeatureValues.ts
 *
 * 会话级特性取值类（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-vqdc30xc.js (4)
 * attribution: placement 4
 */
import { SessionRootSlot } from "./sessionSlices.js";
import { getRootSession } from "./state.js";

/**
 * 会话级特性取值缓存：按会话固定下来的 GrowthBook/环境开关、探测失败计数、一次性日志标记等字段集合。clear() 把所有字段重置为 undefined。
 */
//@ chunk-vqdc30xc.js:229-1901 placement
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
    for (let o of Object.keys(this)) this[o] = void 0;
  }
}
//@ chunk-vqdc30xc.js:1901-1927 placement
var K9t = new SessionRootSlot(() => new SessionFeatureValues());
//@ chunk-vqdc30xc.js:1927-1960 placement
function Ao() {
  return K9t.of(getRootSession());
}
//@ chunk-vqdc30xc.js:1960-1996 placement
function kAi() {
  return K9t.peek(getRootSession());
}

export { Ao, K9t, kAi };
