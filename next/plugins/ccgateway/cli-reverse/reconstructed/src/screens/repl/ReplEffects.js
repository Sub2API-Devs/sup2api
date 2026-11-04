/**
 * screens/repl/ReplEffects.tsx
 *
 * 2.1.316 新增。REPL 副作用集合。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (11), chunk-e6aww6q8.js (1)
 * attribution: placement 12
 */
import { alwaysFalse as alwaysFalse_2 } from "../../Tool.js";
import { cycleAllTeammateModes } from "../../components/teams/TeamsDialog.js";
import { getProactivityPolicyVerdict } from "../../utils/permissions/permissionSetup.js";
import { useTheme_2 } from "../../components/design-system/ThemeProvider.js";
import { useEffect, init_react_production } from "../../../vendor/react/cjs/react.production.js";
import { refreshUnusedResetIfNeeded } from "../../services/startupAnnouncements.js";
import { onGrowthBookRefresh } from "../../services/analytics/growthbook.js";
import { hasLeftProactivityBaseline } from "../../utils/permissions/permissions.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { useActivePlugins, useAppState } from "../../state/AppState.js";
import { useHasComplianceTaint } from "../../components/LogoV2/LogoV2.js";
import { useKickOffCheckAndDisableAutoModeIfNeeded } from "../../utils/permissions/bypassPermissionsKillswitch.js";
import { useManagePlugins } from "../../hooks/useManagePlugins.js";
import { shouldArmPluginMonitors } from "../../utils/plugins/pluginMonitors.js";
import { useTaskListSubscription } from "../../hooks/useTasksV2.js";
import { performStartupChecks } from "../../utils/plugins/performStartupChecks.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { useTimeout } from "../../ink/hooks/useTerminalHooks.js";
import { logTerminalProbe } from "../../utils/terminalProbe.js";
import { usePromptsFromClaudeInChrome } from "../../hooks/usePromptsFromClaudeInChrome.js";
import { savePermissionMode } from "../../utils/sessionStorage.js";
import { useSwarmInitialization } from "../../hooks/useSwarmInitialization.js";
import { useIdeLogging } from "../../hooks/useIdeLogging.js";
import { useIdeSelection } from "../../hooks/useIdeSelection.js";
import { INITIAL_IN_PROGRESS_STATE, EMPTY_MESSAGES } from "../../state/inProgressToolUses.js";
import { mergeTaskProgressUpdate } from "../../services/AgentSummary/agentSummary.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-e6aww6q8.js:1297008-1297111 placement
/**
 * 切换队友模式（受主动性策略限制时回到 default）。
 */
function nextTeammateMode(mode, appState, appState_2) {
  if (!alwaysFalse_2()) return cycleAllTeammateModes(mode, appState, appState_2);
  if (appState_2 && getProactivityPolicyVerdict(appState, mode, undefined) !== undefined) return "default";
  return mode;
}
//@ chunk-18hwfzwa.js:207654-207782 placement
/**
 * 开启时运行一次，并在 GrowthBook 刷新时再次运行凭证相关检查。
 */
function useFlagRefreshEffect({ enabled }) {
  let { credentials, storageV5 } = useTheme_2();
  useEffect(() => {
    if (!enabled) return;
    let refresh = () => refreshUnusedResetIfNeeded(credentials, storageV5);
    refresh();
    return onGrowthBookRefresh(refresh);
  }, [credentials, enabled, storageV5]);
}
//@ chunk-18hwfzwa.js:221010-221064 placement
function selectToolPermissionContextMode3(state) {
  return state.toolPermissionContext.mode;
}
//@ chunk-18hwfzwa.js:221064-221108 placement
function selectProactivityLevel(state) {
  return state.proactivityLevel;
}
//@ chunk-18hwfzwa.js:221108-221161 placement
function selectHasProactivityBaseline(state) {
  return hasLeftProactivityBaseline(state.toolPermissionContext);
}
//@ chunk-18hwfzwa.js:221161-221200 placement (2.1.88 match: _temp, 1)
function selectMcpClients(s) {
  return s.mcp.clients;
}
//@ chunk-18hwfzwa.js:221200-221216 placement
function noopEffect() {}
//@ chunk-18hwfzwa.js:221216-221226 placement
var EMPTY_PROMPTS = [];
//@ chunk-18hwfzwa.js:221226-222453 placement
function ReplEffects(props) {
  let $ = useMemoCache(25);
  let { chrome, mcpClients, initialMessages, isRemoteSession } = props;
  let { storageV5 } = useTheme_2();
  let activePlugins = useActivePlugins();
  let appState = useAppState(selectToolPermissionContextMode3);
  let appState_2 = useAppState(selectProactivityLevel);
  let appState_3 = useAppState(selectHasProactivityBaseline);
  let hasComplianceTaint = useHasComplianceTaint("hipaa");
  let appState_4 = useAppState(selectMcpClients);
  let mcpClients_2 = isRemoteSession ? EMPTY_PROMPTS : appState_4;
  useKickOffCheckAndDisableAutoModeIfNeeded();
  const enabled = !isRemoteSession;
  let pluginOptions;
  if ($[0] !== enabled) {
    pluginOptions = {
      enabled,
    };
    $[0] = enabled;
    $[1] = pluginOptions;
  } else pluginOptions = $[1];
  useManagePlugins(pluginOptions);
  const enabled_2 = !isRemoteSession;
  let monitorOptions;
  if ($[2] !== enabled_2) {
    monitorOptions = {
      enabled: enabled_2,
    };
    $[2] = enabled_2;
    $[3] = monitorOptions;
  } else monitorOptions = $[3];
  shouldArmPluginMonitors(monitorOptions);
  const enabled_3 = !isRemoteSession;
  let flagOptions;
  if ($[4] !== enabled_3) {
    flagOptions = {
      enabled: enabled_3,
    };
    $[4] = enabled_3;
    $[5] = flagOptions;
  } else flagOptions = $[5];
  useFlagRefreshEffect(flagOptions);
  useTaskListSubscription();
  let startupChecksEffect;
  let startupChecksDeps;
  if ($[6] !== activePlugins || $[7] !== isRemoteSession || $[8] !== storageV5) {
    startupChecksEffect = () => {
      if (isRemoteSession) {
        return;
      }
      performStartupChecks(activePlugins, storageV5);
    };
    startupChecksDeps = [activePlugins, isRemoteSession, storageV5];
    $[6] = activePlugins;
    $[7] = isRemoteSession;
    $[8] = storageV5;
    $[9] = startupChecksEffect;
    $[10] = startupChecksDeps;
  } else {
    startupChecksEffect = $[9];
    startupChecksDeps = $[10];
  }
  useEffect(startupChecksEffect, startupChecksDeps);
  let storageDeps;
  if ($[11] !== storageV5) {
    storageDeps = [storageV5];
    $[11] = storageV5;
    $[12] = storageDeps;
  } else storageDeps = $[12];
  useEffect(noopEffect, storageDeps);
  let emptyDeps;
  if ($[13] === MEMO_CACHE_SENTINEL) {
    emptyDeps = [];
    $[13] = emptyDeps;
  } else emptyDeps = $[13];
  useTimeout(logTerminalProbe, 500, emptyDeps);
  usePromptsFromClaudeInChrome(isRemoteSession ? EMPTY_PROMPTS : mcpClients, appState);
  let saveModeEffect;
  if ($[14] !== appState_3 || $[15] !== appState || $[16] !== appState_2) {
    saveModeEffect = () => {
      savePermissionMode(nextTeammateMode(appState, appState_2, appState_3));
    };
    $[14] = appState_3;
    $[15] = appState;
    $[16] = appState_2;
    $[17] = saveModeEffect;
  } else saveModeEffect = $[17];
  let saveModeDeps;
  if ($[18] !== appState_3 || $[19] !== appState || $[20] !== appState_2 || $[21] !== hasComplianceTaint) {
    saveModeDeps = [appState, appState_2, appState_3, hasComplianceTaint];
    $[18] = appState_3;
    $[19] = appState;
    $[20] = appState_2;
    $[21] = hasComplianceTaint;
    $[22] = saveModeDeps;
  } else saveModeDeps = $[22];
  useEffect(saveModeEffect, saveModeDeps);
  const enabled_4 = !isRemoteSession;
  let swarmOptions;
  if ($[23] !== enabled_4) {
    swarmOptions = {
      enabled: enabled_4,
    };
    $[23] = enabled_4;
    $[24] = swarmOptions;
  } else swarmOptions = $[24];
  useSwarmInitialization(initialMessages, swarmOptions);
  useIdeLogging(mcpClients_2);
  useIdeSelection(mcpClients_2, chrome.offerIdeSelection);
  return null;
}
//@ chunk-18hwfzwa.js:222453-222457 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-18hwfzwa.js:222453", () => {
  init_react_production();
});
//@ chunk-18hwfzwa.js:222457-222662 placement
function setTranscriptMessages(store, agentId, sticky, tokenCount) {
  store.setState((state) => {
    let entry = state.transcripts[agentId] ?? INITIAL_IN_PROGRESS_STATE;
    let next = mergeTaskProgressUpdate(entry, {
      tokenCount,
    });
    if (next === entry && entry.messages === sticky) return state;
    return {
      ...state,
      transcripts: {
        ...state.transcripts,
        [agentId]: {
          ...next,
          messages: sticky,
        },
      },
    };
  });
}
//@ chunk-18hwfzwa.js:222662-222734 placement
function transcriptMessagesStore(agentId) {
  return {
    messages: useAppState((state) => state.transcripts[agentId]?.messages ?? EMPTY_MESSAGES),
  };
}
export { setTranscriptMessages, transcriptMessagesStore, ReplEffects };
