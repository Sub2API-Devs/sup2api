/**
 * commands/color/setColor.ts
 *
 * 2.1.316 新增。设置会话颜色并同步到桥接会话。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-p7w1d1hp.js (3)
 * attribution: placement 3
 */
import { isTeammate } from "../../utils/teammate.js";
import { AGENT_COLOR_NAMES, getEffectiveAgentColor } from "../../tools/AgentTool/agentColorManager.js";
import { RESET_ALIASES } from "./color.js";
import { getSessionId } from "../../bootstrap/state.js";
import { getTranscriptPath, saveAgentColor } from "../../utils/sessionStorage.js";
import { updateStandaloneAgentContext } from "../../utils/standaloneAgent.js";
import { syncJobColor, getOwnJobShortId } from "../../services/daemon/jobState.js";
import { getReplBridgeHandle } from "../../bridge/replBridgeHandle.js";
import { getBridgeTokenOverride, getBridgeBaseUrlOverride } from "../../bridge/bridgeConfig.js";

//@ chunk-p7w1d1hp.js:607-682 placement
async function call(onDone, context, args) {
  return (onDone(await performSetColor(args, context), { display: "system" }), null);
}
/**
 * 设置会话颜色并同步到桥接会话。
 */
//@ chunk-p7w1d1hp.js:682-1404 placement = call (0.7)
async function performSetColor(n, e) {
  if (isTeammate())
    return "Cannot set color: This session is a teammate. Teammate colors are assigned by the team leader.";
  let o = n?.trim() ?? "",
    t = o === "" ? AGENT_COLOR_NAMES[Math.floor(Math.random() * AGENT_COLOR_NAMES.length)] : o.toLowerCase(),
    included = RESET_ALIASES.includes(t);
  if (!included && !AGENT_COLOR_NAMES.includes(t)) {
    let colorList = AGENT_COLOR_NAMES.join(", ");
    return `Invalid color "${t}". Available colors: ${colorList}, default`;
  }
  let sessionId = getSessionId(),
    fullPath = getTranscriptPath(),
    i = included ? "default" : t,
    l = included ? void 0 : t;
  (await saveAgentColor(sessionId, i, fullPath, e.storageV5),
    e.setAppState((prev) => updateStandaloneAgentContext(prev, { color: l })));
  let appState = e.getAppState(),
    g = appState.agent
      ? appState.agentDefinitions.activeAgents.find((prev) => prev.agentType === appState.agent)
      : void 0;
  return (
    syncJobColor(
      getOwnJobShortId(),
      getEffectiveAgentColor({ userOverride: l, agentDefinitionColor: g?.color }),
      e.storageV5,
    ),
    syncBridgeSessionColor(i, e.credentials),
    included ? "Session color reset to default" : `Session color set to: ${t}`
  );
}
/**
 * 把会话颜色同步到桥接会话标签
 */
//@ chunk-p7w1d1hp.js:1404-1626 placement
function syncBridgeSessionColor(n, e) {
  let o = getReplBridgeHandle()?.bridgeSessionId;
  if (!o) return;
  let t = getBridgeTokenOverride();
  import("./chunk-3eyvtwsv.js").then(({ updateBridgeSessionColorTag: updateBridgeSessionColorTag }) =>
    updateBridgeSessionColorTag(o, n, AGENT_COLOR_NAMES, {
      baseUrl: getBridgeBaseUrlOverride(),
      getAccessToken: t ? () => t : void 0,
      credentials: e,
    }).catch(() => {}),
  );
}

export { performSetColor };
