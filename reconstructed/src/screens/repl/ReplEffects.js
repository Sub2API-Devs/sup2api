/**
 * screens/repl/ReplEffects.tsx
 *
 * 2.1.316 新增。REPL 副作用集合。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (11)
 * attribution: placement 11
 */
import { Me } from "../../components/design-system/ThemeProvider.js";
import { P, j } from "../../../vendor/react/cjs/react.production.js";
import { lxs } from "../../services/startupAnnouncements.js";
import { onGrowthBookRefresh } from "../../services/analytics/growthbook.js";
import { hasLeftProactivityBaseline } from "../../utils/permissions/permissions.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { useActivePlugins, useAppState } from "../../state/AppState.js";
import { P7 } from "../../components/LogoV2/LogoV2.js";
import { useKickOffCheckAndDisableAutoModeIfNeeded } from "../../utils/permissions/bypassPermissionsKillswitch.js";
import { useManagePlugins } from "../../hooks/useManagePlugins.js";
import { shouldArmPluginMonitors } from "../../utils/plugins/pluginMonitors.js";
import { C_o } from "../../hooks/useTasksV2.js";
import { performStartupChecks } from "../../utils/plugins/performStartupChecks.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { useTimeout } from "../../ink/hooks/useTerminalHooks.js";
import { logTerminalProbe } from "../../utils/terminalProbe.js";
import { usePromptsFromClaudeInChrome } from "../../hooks/usePromptsFromClaudeInChrome.js";
import { savePermissionMode } from "../../utils/sessionStorage.js";
import { nextTeammateMode } from "./_new/nextTeammateMode.js";
import { useSwarmInitialization } from "../../hooks/useSwarmInitialization.js";
import { useIdeLogging } from "../../hooks/useIdeLogging.js";
import { useIdeSelection } from "../../hooks/useIdeSelection.js";
import { h2t, dnt } from "../../state/inProgressToolUses.js";
import { mergeTaskProgressUpdate } from "../../services/AgentSummary/agentSummary.js";

/**
 * 开启时运行一次，并在 GrowthBook 刷新时再次运行凭证相关检查。
 */
//@ chunk-18hwfzwa.js:207654-207782 placement
function useFlagRefreshEffect({ enabled: enabled }) {
  let { credentials: credentials, storageV5: storageV5 } = Me();
  P(() => {
    if (!enabled) return;
    let L = () => lxs(credentials, storageV5);
    return (L(), onGrowthBookRefresh(L));
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
function KFt(Ro) {
  return hasLeftProactivityBaseline(Ro.toolPermissionContext);
}
//@ chunk-18hwfzwa.js:221161-221200 placement = _temp (1)
function selectMcpClients(s) {
  return s.mcp.clients;
}
//@ chunk-18hwfzwa.js:221200-221216 placement
function QFt() {}
//@ chunk-18hwfzwa.js:221216-221226 placement
var UQ = [];
//@ chunk-18hwfzwa.js:221226-222453 placement
function ReplEffects(h) {
  let $ = w(25),
    {
      chrome: chrome,
      mcpClients: mcpClients,
      initialMessages: initialMessages,
      isRemoteSession: isRemoteSession,
    } = h,
    { storageV5: storageV5 } = Me(),
    Re = useActivePlugins(),
    Be = useAppState(selectToolPermissionContextMode3),
    He = useAppState(selectProactivityLevel),
    We = useAppState(KFt),
    ze = P7("hipaa"),
    Xe = useAppState(selectMcpClients),
    rt = isRemoteSession ? UQ : Xe;
  useKickOffCheckAndDisableAutoModeIfNeeded();
  const kt = !isRemoteSession;
  let It;
  if ($[0] !== kt) ((It = { enabled: kt }), ($[0] = kt), ($[1] = It));
  else It = $[1];
  useManagePlugins(It);
  const Ot = !isRemoteSession;
  let Et;
  if ($[2] !== Ot) ((Et = { enabled: Ot }), ($[2] = Ot), ($[3] = Et));
  else Et = $[3];
  shouldArmPluginMonitors(Et);
  const Dt = !isRemoteSession;
  let Lt;
  if ($[4] !== Dt) ((Lt = { enabled: Dt }), ($[4] = Dt), ($[5] = Lt));
  else Lt = $[5];
  (useFlagRefreshEffect(Lt), C_o());
  let oo, Xt;
  if ($[6] !== Re || $[7] !== isRemoteSession || $[8] !== storageV5)
    ((oo = () => {
      if (isRemoteSession) {
        return;
      }
      performStartupChecks(Re, storageV5);
    }),
      (Xt = [Re, isRemoteSession, storageV5]),
      ($[6] = Re),
      ($[7] = isRemoteSession),
      ($[8] = storageV5),
      ($[9] = oo),
      ($[10] = Xt));
  else ((oo = $[9]), (Xt = $[10]));
  P(oo, Xt);
  let io;
  if ($[11] !== storageV5) ((io = [storageV5]), ($[11] = storageV5), ($[12] = io));
  else io = $[12];
  P(QFt, io);
  let so;
  if ($[13] === MEMO_CACHE_SENTINEL) ((so = []), ($[13] = so));
  else so = $[13];
  (useTimeout(logTerminalProbe, 500, so),
    usePromptsFromClaudeInChrome(isRemoteSession ? UQ : mcpClients, Be));
  let po;
  if ($[14] !== We || $[15] !== Be || $[16] !== He)
    ((po = () => {
      savePermissionMode(nextTeammateMode(Be, He, We));
    }),
      ($[14] = We),
      ($[15] = Be),
      ($[16] = He),
      ($[17] = po));
  else po = $[17];
  let ao;
  if ($[18] !== We || $[19] !== Be || $[20] !== He || $[21] !== ze)
    ((ao = [Be, He, We, ze]), ($[18] = We), ($[19] = Be), ($[20] = He), ($[21] = ze), ($[22] = ao));
  else ao = $[22];
  P(po, ao);
  const co = !isRemoteSession;
  let bo;
  if ($[23] !== co) ((bo = { enabled: co }), ($[23] = co), ($[24] = bo));
  else bo = $[24];
  return (
    useSwarmInitialization(initialMessages, bo),
    useIdeLogging(rt),
    useIdeSelection(rt, chrome.offerIdeSelection),
    null
  );
}
//@ chunk-18hwfzwa.js:222453-222457 placement
j();
//@ chunk-18hwfzwa.js:222457-222662 placement
function setTranscriptMessages(h, x, D, L) {
  h.setState((ee) => {
    let ke = ee.transcripts[x] ?? h2t,
      Re = mergeTaskProgressUpdate(ke, { tokenCount: L });
    if (Re === ke && ke.messages === D) return ee;
    return { ...ee, transcripts: { ...ee.transcripts, [x]: { ...Re, messages: D } } };
  });
}
//@ chunk-18hwfzwa.js:222662-222734 placement
function ug(h) {
  return { messages: useAppState((D) => D.transcripts[h]?.messages ?? dnt) };
}

export { setTranscriptMessages, ug, ReplEffects };
