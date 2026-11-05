/**
 * commands/color/setColor.ts
 *
 * 2.1.316 新增。设置会话颜色并同步到桥接会话。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-4cv18f2g.js (3)
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

//@ chunk-4cv18f2g.js:607-682 placement
async function call(onDone, context, args) {
  onDone(await performSetColor(args, context), {
    display: "system",
  });
  return null;
}
//@ chunk-4cv18f2g.js:682-1404 placement (2.1.88 match: call, 0.7)
/**
 * 设置会话颜色并同步到桥接会话。
 */
async function performSetColor(args, context) {
  if (isTeammate())
    return "Cannot set color: This session is a teammate. Teammate colors are assigned by the team leader.";
  let requestedColor = args?.trim() ?? "";
  let requested =
    requestedColor === ""
      ? AGENT_COLOR_NAMES[Math.floor(Math.random() * AGENT_COLOR_NAMES.length)]
      : requestedColor.toLowerCase();
  let included = RESET_ALIASES.includes(requested);
  if (!included && !AGENT_COLOR_NAMES.includes(requested)) {
    let colorList = AGENT_COLOR_NAMES.join(", ");
    return `Invalid color "${requested}". Available colors: ${colorList}, default`;
  }
  let sessionId = getSessionId();
  let fullPath = getTranscriptPath();
  let agentColor = included ? "default" : requested;
  let suffix = included ? undefined : requested;
  await saveAgentColor(sessionId, agentColor, fullPath, context.storageV5);
  context.setAppState((prev) =>
    updateStandaloneAgentContext(prev, {
      color: suffix,
    }),
  );
  let appState = context.getAppState();
  let agentDef = appState.agent
    ? appState.agentDefinitions.activeAgents.find((prev) => prev.agentType === appState.agent)
    : undefined;
  syncJobColor(
    getOwnJobShortId(),
    getEffectiveAgentColor({
      userOverride: suffix,
      agentDefinitionColor: agentDef?.color,
    }),
    context.storageV5,
  );
  syncBridgeSessionColor(agentColor, context.credentials);
  return included ? "Session color reset to default" : `Session color set to: ${requested}`;
}
//@ chunk-4cv18f2g.js:1404-1626 placement
/**
 * 把会话颜色同步到桥接会话标签
 */
function syncBridgeSessionColor(session, credentials) {
  let bridgeSessionId = getReplBridgeHandle()?.bridgeSessionId;
  if (!bridgeSessionId) return;
  let bridgeTokenOverride = getBridgeTokenOverride();
  import("../../bridge/createSession.js").then(({ updateBridgeSessionColorTag }) =>
    updateBridgeSessionColorTag(bridgeSessionId, session, AGENT_COLOR_NAMES, {
      baseUrl: getBridgeBaseUrlOverride(),
      getAccessToken: bridgeTokenOverride ? () => bridgeTokenOverride : undefined,
      credentials,
    }).catch(() => {}),
  );
}
export { performSetColor, call };
