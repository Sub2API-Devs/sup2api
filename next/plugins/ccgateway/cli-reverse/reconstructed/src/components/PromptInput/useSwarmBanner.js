/**
 * components/PromptInput/useSwarmBanner.ts
 *
 * 多代理（swarm）横幅：显示 "View teammates: tmux -L …" 与当前查看的队友颜色。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/PromptInput/useSwarmBanner.ts
 * pieces: chunk-8prszgkd.js (5), chunk-ya7t8whx.js (1)
 * attribution: fingerprint 2, layout 3, placement 1
 */
import {
  getTeamName,
  isTeammate,
  isInProcessTeammate,
  getAgentName,
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
import { useMemo } from "../../../vendor/react/cjs/react.production.js";

//@ chunk-ya7t8whx.js:227-317 placement
/**
 * 函数 swarmBannerName（远端会话名或独立代理名）；位于「new in 2.1.316 (2.1.88 has no file at this path)」模块。
 */
function swarmBannerName(props) {
  if (getTeamName()) return;
  return props.remoteSessionName ?? props.standaloneAgentContext?.name;
}
//@ chunk-8prszgkd.js:14092-14812 fingerprint (2.1.88 match: useSwarmBanner, 0.716)
function useSwarmBanner({ state, teamContext, insideTmux }) {
  if (isTeammate() && !isInProcessTeammate()) {
    let agentName = getAgentName();
    if (agentName && getTeamName())
      return {
        agent: {
          text: `@${agentName}`,
          bgColor: toThemeColor(getTeammateColor()),
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
//@ chunk-8prszgkd.js:14812-15048 layout
/**
 * 读取 AppState 计算提示框上方的会话横幅（会话标题或代理名与颜色）。
 */
function useSessionBanner(props) {
  let standaloneAgentContext = useAppState((state) => state.standaloneAgentContext);
  let remoteSessionName = useAppState((state) => state.remoteSessionName);
  let agent = useAppState((state) => state.agent);
  let appStoreDirect = useAppStoreDirect();
  return useStableBanner(
    computeSessionBanner({
      state: appStoreDirect.getState(),
      standaloneAgentContext,
      remoteSessionName,
      agent,
      hideSessionTitle: props?.hideSessionTitle,
    }),
  );
}
//@ chunk-8prszgkd.js:15048-15465 layout
/**
 * 计算会话横幅：有会话名或独立代理颜色时显示标题，否则显示代理名，颜色取用户覆盖或代理定义的颜色。
 */
function computeSessionBanner({ state, standaloneAgentContext, remoteSessionName, agent, hideSessionTitle }) {
  let agentDefinition = agent
    ? state.agentDefinitions.activeAgents.find((activeAgent) => activeAgent.agentType === agent)
    : undefined;
  let bannerName = swarmBannerName({
    standaloneAgentContext,
    remoteSessionName,
  });
  let color = standaloneAgentContext?.color;
  if (!hideSessionTitle && (bannerName || color))
    return {
      text: bannerName || agent || "",
      bgColor: toThemeColor(
        getEffectiveAgentColor({
          userOverride: color,
          agentDefinitionColor: agentDefinition?.color,
        }),
        "promptBorder",
      ),
    };
  if (agent)
    return {
      text: agent,
      bgColor: toThemeColor(agentDefinition?.color, "promptBorder"),
    };
  return null;
}
//@ chunk-8prszgkd.js:15465-15574 layout
function useStableBanner(banner) {
  let text = banner?.text;
  let bgColor = banner?.bgColor;
  return useMemo(
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
//@ chunk-8prszgkd.js:15574-15650 fingerprint (2.1.88 match: toThemeColor, 1)
function toThemeColor(colorName, fallback = "cyan_FOR_SUBAGENTS_ONLY") {
  return colorName && AGENT_COLOR_NAMES.includes(colorName)
    ? AGENT_COLOR_TO_THEME_COLOR[colorName]
    : fallback;
}
export { useSwarmBanner, useStableBanner, useSessionBanner };
