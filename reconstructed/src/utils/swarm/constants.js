/**
 * utils/swarm/constants.ts
 *
 * 团队常量：team-lead 名、成员名格式、tmux 会话/窗口名、socket 名、teammate 命令 env 名
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/swarm/constants.ts
 * pieces: chunk-qg0af0yq.js (3)
 * attribution: fingerprint 3
 */

/**
 * 团队常量：TEAM_LEAD="team-lead"、成员名正则、不可用提示、tmux 会话 claude-swarm / 窗口 swarm-view、pane 占位命令 cat。
 */
//@ chunk-qg0af0yq.js:18766-18956 fingerprint = SWARM_SESSION_NAME (0.322)
var TEAM_LEAD = "team-lead",
  USER = "user",
  SYSTEM = "system",
  TEAMMATE_NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/,
  TEAMMATES_UNAVAILABLE_MESSAGE = "Teammates are not available in this session.",
  CLAUDE_SWARM = "claude-swarm",
  SWARM_VIEW = "swarm-view",
  TMUX = "tmux",
  CAT = "cat";
/**
 * 外部 swarm tmux socket 名：claude-swarm-<pid>。
 */
//@ chunk-qg0af0yq.js:18956-19007 fingerprint = getSwarmSocketName (1)
function getSwarmSocketName() {
  return `claude-swarm-${process.pid}`;
}
/**
 * 指定 pane 型 teammate 启动命令的环境变量名 CLAUDE_CODE_TEAMMATE_COMMAND。
 */
//@ chunk-qg0af0yq.js:19007-19046 fingerprint = TEAMMATE_COMMAND_ENV_VAR (1)
var TEAMMATE_COMMAND_ENV_VAR = "CLAUDE_CODE_TEAMMATE_COMMAND";

export {
  getSwarmSocketName,
  TEAMMATE_NAME_PATTERN,
  TEAM_LEAD,
  USER,
  SYSTEM,
  TMUX,
  CLAUDE_SWARM,
  SWARM_VIEW,
  CAT,
  TEAMMATES_UNAVAILABLE_MESSAGE,
  TEAMMATE_COMMAND_ENV_VAR,
};
