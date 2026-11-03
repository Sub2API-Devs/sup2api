/**
 * components/PromptInput/useSwarmBanner.ts
 *
 * 多代理（swarm）横幅：显示 "View teammates: tmux -L …" 与当前查看的队友颜色。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/PromptInput/useSwarmBanner.ts
 * pieces: chunk-0e8j1zzj.js (5), chunk-7s4yj2r0.js (1)
 * attribution: fingerprint 2, layout 3, placement 1
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
import { useAppState, useAppStoreDirect } from "../../state/AppState.js";
import { Q } from "../../../vendor/react/cjs/react.production.js";

//@ chunk-0e8j1zzj.js:13825-14564 fingerprint = useSwarmBanner (0.733)
function useSwarmBanner({ state, teamContext, insideTmux }) {
  if (isTeammate() && !isInProcessTeammate()) {
    let agentName = getAgentName();
    if (agentName && getTeamName())
      return {
        agent: {
          text: `@${agentName}`,
          bgColor: toThemeColor(teamContext?.selfAgentColor ?? getTeammateColor()),
        },
        tmuxHint: null,
      };
  }
  if (teamContext?.teammates && Object.keys(teamContext.teammates).length > 1) {
    let viewedTeammate = getViewedTeammateTask_2(state);
    let viewedColor = toThemeColor(viewedTeammate?.identity.color);
    let inProcessMode = isInProcessEnabled();
    let nativePanes = getCachedDetectionResult()?.isNative ?? false;
    if (insideTmux === false && !inProcessMode && !nativePanes)
      return {
        agent: null,
        tmuxHint: {
          text: `View teammates: \`tmux -L ${getSwarmSocketName()} a\``,
          bgColor: viewedColor,
        },
      };
    if ((insideTmux === true || inProcessMode || nativePanes) && viewedTeammate)
      return {
        agent: {
          text: `@${viewedTeammate.identity.agentName}`,
          bgColor: viewedColor,
        },
        tmuxHint: null,
      };
  }
  let active = getActiveAgentForInput(state);
  if (active.type === "named_agent") {
    let task = active.task;
    let name;
    for (let [n, id] of state.agentNameRegistry)
      if (id === task.id) {
        name = n;
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
  return {
    agent: null,
    tmuxHint: null,
  };
}
//@ chunk-0e8j1zzj.js:14564-14800 layout
/**
 * 读取 AppState 计算提示框上方的会话横幅（会话标题或代理名与颜色）。
 */
function useSessionBanner(o) {
  let standaloneAgentContext = useAppState((u) => u.standaloneAgentContext);
  let remoteSessionName = useAppState((u) => u.remoteSessionName);
  let agent = useAppState((u) => u.agent);
  let appStoreDirect = useAppStoreDirect();
  return useStableBanner(
    computeSessionBanner({
      state: appStoreDirect.getState(),
      standaloneAgentContext,
      remoteSessionName,
      agent,
      hideSessionTitle: o?.hideSessionTitle,
    }),
  );
}
//@ chunk-0e8j1zzj.js:14800-15217 layout
/**
 * 计算会话横幅：有会话名或独立代理颜色时显示标题，否则显示代理名，颜色取用户覆盖或代理定义的颜色。
 */
function computeSessionBanner({ state, standaloneAgentContext, remoteSessionName, agent, hideSessionTitle }) {
  let u = agent
    ? state.agentDefinitions.activeAgents.find((activeAgent) => activeAgent.agentType === agent)
    : undefined;
  let i = swarmBannerName({
    standaloneAgentContext,
    remoteSessionName,
  });
  let color = standaloneAgentContext?.color;
  if (!hideSessionTitle && (i || color))
    return {
      text: i || agent || "",
      bgColor: toThemeColor(
        getEffectiveAgentColor({
          userOverride: color,
          agentDefinitionColor: u?.color,
        }),
        "promptBorder",
      ),
    };
  if (agent)
    return {
      text: agent,
      bgColor: toThemeColor(u?.color, "promptBorder"),
    };
  return null;
}
//@ chunk-0e8j1zzj.js:15217-15326 layout
function useStableBanner(o) {
  let text = o?.text;
  let bgColor = o?.bgColor;
  return Q(
    () =>
      text !== undefined && bgColor !== undefined
        ? {
            text,
            bgColor,
          }
        : null,
    [text, bgColor],
  );
}
//@ chunk-0e8j1zzj.js:15326-15402 fingerprint = toThemeColor (1)
function toThemeColor(colorName, fallback = "cyan_FOR_SUBAGENTS_ONLY") {
  return colorName && AGENT_COLOR_NAMES.includes(colorName)
    ? AGENT_COLOR_TO_THEME_COLOR[colorName]
    : fallback;
}
//@ chunk-7s4yj2r0.js:227-317 placement
/**
 * 函数 swarmBannerName（远端会话名或独立代理名）；位于「new in 2.1.316 (2.1.88 has no file at this path)」模块。
 */
function swarmBannerName(t) {
  if (getTeamName()) return;
  return t.remoteSessionName ?? t.standaloneAgentContext?.name;
}
export { useSwarmBanner, useStableBanner, useSessionBanner };
