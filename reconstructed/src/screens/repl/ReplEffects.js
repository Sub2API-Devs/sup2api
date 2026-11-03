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
import { useTheme_2 } from "../../components/design-system/ThemeProvider.js";
import { P, init_react_production } from "../../../vendor/react/cjs/react.production.js";
import { refreshUnusedResetIfNeeded } from "../../services/startupAnnouncements.js";
import { onGrowthBookRefresh } from "../../services/analytics/growthbook.js";
import { hasLeftProactivityBaseline } from "../../utils/permissions/permissions.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
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
import { alwaysFalse as alwaysFalse_2 } from "../../Tool.js";
import { cycleAllTeammateModes } from "../../components/teams/TeamsDialog.js";
import { getProactivityPolicyVerdict } from "../../utils/permissions/permissionSetup.js";

//@ chunk-18hwfzwa.js:207654-207782 placement
/**
 * 开启时运行一次，并在 GrowthBook 刷新时再次运行凭证相关检查。
 */
function useFlagRefreshEffect({ enabled }) {
  let { credentials, storageV5 } = useTheme_2();
  P(() => {
    if (!enabled) return;
    let L = () => refreshUnusedResetIfNeeded(credentials, storageV5);
    L();
    return onGrowthBookRefresh(L);
  }, [credentials, enabled, storageV5]);
}
//@ chunk-18hwfzwa.js:221010-221064 placement
function selectToolPermissionContextMode3(Ao) {
  return Ao.toolPermissionContext.mode;
}
//@ chunk-18hwfzwa.js:221064-221108 placement
function selectProactivityLevel(Bo) {
  return Bo.proactivityLevel;
}
//@ chunk-18hwfzwa.js:221108-221161 placement
function selectHasProactivityBaseline(Ro) {
  return hasLeftProactivityBaseline(Ro.toolPermissionContext);
}
//@ chunk-18hwfzwa.js:221161-221200 placement = _temp (1)
function selectMcpClients(s) {
  return s.mcp.clients;
}
//@ chunk-18hwfzwa.js:221200-221216 placement
function noopEffect() {}
//@ chunk-18hwfzwa.js:221216-221226 placement
var EMPTY_PROMPTS = [];
//@ chunk-18hwfzwa.js:221226-222453 placement
function ReplEffects(props) {
  let $ = w(25);
  let { chrome, mcpClients, initialMessages, isRemoteSession } = props;
  let { storageV5 } = useTheme_2();
  let activePlugins = useActivePlugins();
  let toolPermissionMode = useAppState(selectToolPermissionContextMode3);
  let appState = useAppState(selectProactivityLevel);
  let appState_2 = useAppState(selectHasProactivityBaseline);
  let hasComplianceTaint = useHasComplianceTaint("hipaa");
  let appState_3 = useAppState(selectMcpClients);
  let mcpClients_2 = isRemoteSession ? EMPTY_PROMPTS : appState_3;
  useKickOffCheckAndDisableAutoModeIfNeeded();
  const enabled = !isRemoteSession;
  let It;
  if ($[0] !== enabled) {
    It = {
      enabled,
    };
    $[0] = enabled;
    $[1] = It;
  } else It = $[1];
  useManagePlugins(It);
  const enabled_2 = !isRemoteSession;
  let Et;
  if ($[2] !== enabled_2) {
    Et = {
      enabled: enabled_2,
    };
    $[2] = enabled_2;
    $[3] = Et;
  } else Et = $[3];
  shouldArmPluginMonitors(Et);
  const enabled_3 = !isRemoteSession;
  let Lt;
  if ($[4] !== enabled_3) {
    Lt = {
      enabled: enabled_3,
    };
    $[4] = enabled_3;
    $[5] = Lt;
  } else Lt = $[5];
  useFlagRefreshEffect(Lt);
  useTaskListSubscription();
  let oo;
  let Xt;
  if ($[6] !== activePlugins || $[7] !== isRemoteSession || $[8] !== storageV5) {
    oo = () => {
      if (isRemoteSession) {
        return;
      }
      performStartupChecks(activePlugins, storageV5);
    };
    Xt = [activePlugins, isRemoteSession, storageV5];
    $[6] = activePlugins;
    $[7] = isRemoteSession;
    $[8] = storageV5;
    $[9] = oo;
    $[10] = Xt;
  } else {
    oo = $[9];
    Xt = $[10];
  }
  P(oo, Xt);
  let io;
  if ($[11] !== storageV5) {
    io = [storageV5];
    $[11] = storageV5;
    $[12] = io;
  } else io = $[12];
  P(noopEffect, io);
  let so;
  if ($[13] === MEMO_CACHE_SENTINEL) {
    so = [];
    $[13] = so;
  } else so = $[13];
  useTimeout(logTerminalProbe, 500, so);
  usePromptsFromClaudeInChrome(isRemoteSession ? EMPTY_PROMPTS : mcpClients, toolPermissionMode);
  let po;
  if ($[14] !== appState_2 || $[15] !== toolPermissionMode || $[16] !== appState) {
    po = () => {
      savePermissionMode(nextTeammateMode(toolPermissionMode, appState, appState_2));
    };
    $[14] = appState_2;
    $[15] = toolPermissionMode;
    $[16] = appState;
    $[17] = po;
  } else po = $[17];
  let ao;
  if (
    $[18] !== appState_2 ||
    $[19] !== toolPermissionMode ||
    $[20] !== appState ||
    $[21] !== hasComplianceTaint
  ) {
    ao = [toolPermissionMode, appState, appState_2, hasComplianceTaint];
    $[18] = appState_2;
    $[19] = toolPermissionMode;
    $[20] = appState;
    $[21] = hasComplianceTaint;
    $[22] = ao;
  } else ao = $[22];
  P(po, ao);
  const enabled_4 = !isRemoteSession;
  let bo;
  if ($[23] !== enabled_4) {
    bo = {
      enabled: enabled_4,
    };
    $[23] = enabled_4;
    $[24] = bo;
  } else bo = $[24];
  useSwarmInitialization(initialMessages, bo);
  useIdeLogging(mcpClients_2);
  useIdeSelection(mcpClients_2, chrome.offerIdeSelection);
  return null;
}
//@ chunk-18hwfzwa.js:222453-222457 placement
init_react_production();
//@ chunk-18hwfzwa.js:222457-222662 placement
function setTranscriptMessages(store, x, sticky, tokenCount) {
  store.setState((ee) => {
    let ke = ee.transcripts[x] ?? INITIAL_IN_PROGRESS_STATE;
    let Re = mergeTaskProgressUpdate(ke, {
      tokenCount,
    });
    if (Re === ke && ke.messages === sticky) return ee;
    return {
      ...ee,
      transcripts: {
        ...ee.transcripts,
        [x]: {
          ...Re,
          messages: sticky,
        },
      },
    };
  });
}
//@ chunk-18hwfzwa.js:222662-222734 placement
function transcriptMessagesStore(h) {
  return {
    messages: useAppState((D) => D.transcripts[h]?.messages ?? EMPTY_MESSAGES),
  };
}
//@ chunk-e6aww6q8.js:1297008-1297111 placement
/**
 * 切换队友模式（受主动性策略限制时回到 default）。
 */
function nextTeammateMode(e, appState, appState_2) {
  if (!alwaysFalse_2()) return cycleAllTeammateModes(e, appState, appState_2);
  if (appState_2 && getProactivityPolicyVerdict(appState, e, undefined) !== undefined) return "default";
  return e;
}
export { setTranscriptMessages, transcriptMessagesStore, ReplEffects };
