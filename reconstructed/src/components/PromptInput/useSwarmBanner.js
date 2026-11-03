/**
 * components/PromptInput/useSwarmBanner.ts
 *
 * 多代理（swarm）横幅：显示 "View teammates: tmux -L …" 与当前查看的队友颜色。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/PromptInput/useSwarmBanner.ts
 * pieces: chunk-0e8j1zzj.js (5)
 * attribution: fingerprint 2, layout 3
 */
import {
  isTeammate,
  isInProcessTeammate,
  getAgentName,
  getTeamName,
  getTeammateColor,
} from "../../utils/teammate.js";
import { getViewedTeammateTask_2, getActiveAgentForInput } from "../../state/selectors.js";
import { isInProcessEnabled, getCachedDetectionResult } from "../../utils/swarm/backends/registry.js";
import { getSwarmSocketName } from "../../utils/swarm/constants.js";
import {
  getAgentColor,
  getEffectiveAgentColor,
  AGENT_COLOR_NAMES,
  AGENT_COLOR_TO_THEME_COLOR,
} from "../../tools/AgentTool/agentColorManager.js";
import { useAppState, Cr } from "../../state/AppState.js";
import { uWs } from "./_new/useSwarmBanner.helpers-7s4y.js";
import { Q } from "../../../vendor/react/cjs/react.production.js";

//@ chunk-0e8j1zzj.js:13825-14564 fingerprint = useSwarmBanner (0.733)
function useSwarmBanner({ state: state, teamContext: teamContext, insideTmux: insideTmux }) {
  if (isTeammate() && !isInProcessTeammate()) {
    let store = getAgentName();
    if (store && getTeamName())
      return {
        agent: {
          text: `@${store}`,
          bgColor: toThemeColor(teamContext?.selfAgentColor ?? getTeammateColor()),
        },
        tmuxHint: null,
      };
  }
  if (teamContext?.teammates && Object.keys(teamContext.teammates).length > 1) {
    let viewedTeammate = getViewedTeammateTask_2(state),
      viewedColor = toThemeColor(viewedTeammate?.identity.color),
      inProcessMode = isInProcessEnabled(),
      k = getCachedDetectionResult()?.isNative ?? !1;
    if (insideTmux === !1 && !inProcessMode && !k)
      return {
        agent: null,
        tmuxHint: { text: `View teammates: \`tmux -L ${getSwarmSocketName()} a\``, bgColor: viewedColor },
      };
    if ((insideTmux === !0 || inProcessMode || k) && viewedTeammate)
      return {
        agent: { text: `@${viewedTeammate.identity.agentName}`, bgColor: viewedColor },
        tmuxHint: null,
      };
  }
  let active = getActiveAgentForInput(state);
  if (active.type === "named_agent") {
    let task = active.task,
      name;
    for (let [h, k] of state.agentNameRegistry)
      if (k === task.id) {
        name = h;
        break;
      }
    return {
      agent: {
        text: name ? `@${name}` : task.description,
        bgColor: getAgentColor(task.agentType) ?? "cyan_FOR_SUBAGENTS_ONLY",
      },
      tmuxHint: null,
    };
  }
  return { agent: null, tmuxHint: null };
}
/**
 * 读取 AppState 计算提示框上方的会话横幅（会话标题或代理名与颜色）。
 */
//@ chunk-0e8j1zzj.js:14564-14800 layout
function useSessionBanner(o) {
  let standaloneAgentContext = useAppState((u) => u.standaloneAgentContext),
    remoteSessionName = useAppState((u) => u.remoteSessionName),
    agent = useAppState((u) => u.agent),
    m = Cr();
  return useStableBanner(
    computeSessionBanner({
      state: m.getState(),
      standaloneAgentContext: standaloneAgentContext,
      remoteSessionName: remoteSessionName,
      agent: agent,
      hideSessionTitle: o?.hideSessionTitle,
    }),
  );
}
/**
 * 计算会话横幅：有会话名或独立代理颜色时显示标题，否则显示代理名，颜色取用户覆盖或代理定义的颜色。
 */
//@ chunk-0e8j1zzj.js:14800-15217 layout
function computeSessionBanner({
  state: state,
  standaloneAgentContext: standaloneAgentContext,
  remoteSessionName: remoteSessionName,
  agent: agent,
  hideSessionTitle: hideSessionTitle,
}) {
  let u = agent
      ? state.agentDefinitions.activeAgents.find((activeAgent) => activeAgent.agentType === agent)
      : void 0,
    i = uWs({ standaloneAgentContext: standaloneAgentContext, remoteSessionName: remoteSessionName }),
    h = standaloneAgentContext?.color;
  if (!hideSessionTitle && (i || h))
    return {
      text: i || agent || "",
      bgColor: toThemeColor(
        getEffectiveAgentColor({ userOverride: h, agentDefinitionColor: u?.color }),
        "promptBorder",
      ),
    };
  if (agent) return { text: agent, bgColor: toThemeColor(u?.color, "promptBorder") };
  return null;
}
//@ chunk-0e8j1zzj.js:15217-15326 layout
function useStableBanner(o) {
  let t = o?.text,
    d = o?.bgColor;
  return Q(() => (t !== void 0 && d !== void 0 ? { text: t, bgColor: d } : null), [t, d]);
}
//@ chunk-0e8j1zzj.js:15326-15402 fingerprint = toThemeColor (1)
function toThemeColor(colorName, fallback = "cyan_FOR_SUBAGENTS_ONLY") {
  return colorName && AGENT_COLOR_NAMES.includes(colorName)
    ? AGENT_COLOR_TO_THEME_COLOR[colorName]
    : fallback;
}

export { useSwarmBanner, useStableBanner, useSessionBanner };
