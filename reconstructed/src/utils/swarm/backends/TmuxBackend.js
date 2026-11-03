/**
 * utils/swarm/backends/TmuxBackend.ts
 *
 * tmux pane 后端：在 leader 窗口内分屏（leader 占 30%）或在外部 claude-swarm 会话里平铺；设置边框颜色/标题，respawn-pane 运行 teammate 命令
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/swarm/backends/TmuxBackend.ts
 * pieces: chunk-27ewfych.js (6)
 * attribution: affinity 1, fingerprint 1, layout 2, facade-exports 2
 */
import { getUserTmuxSocket, isTmuxAvailable, isInsideTmux, getLeaderPaneId } from "./detection.js";
import { execFileNoThrow } from "../../execFileNoThrow.js";
import { TMUX, getSwarmSocketName, CLAUDE_SWARM, SWARM_VIEW, CAT } from "../constants.js";
import { prefixCgroupJoinCommand } from "../../toolCgroup.js";
import { SwarmPaneError, assertNoControlChars } from "../teamHelpers.js";
import { createMutex } from "../../promiseQueue.js";
import { logFeatureBad } from "../../../services/analytics/featureTelemetry.js";
import { logForDebugging } from "../../debug.js";
import { count } from "../../collections.js";
import { withLaunchValuesOfHybridConnection } from "../../managedEnvApply.js";

//@ chunk-27ewfych.js:583-890 affinity
/**
 * 分屏失败的提示文案（空间不足时建议减少并发、放大终端或改用同进程 teammate）。
 */
function formatPaneCreateError(stderr) {
  let n = `Failed to create teammate pane: ${stderr}`;
  let lower = stderr.toLowerCase();
  return lower.includes("no space") || lower.includes("too small")
    ? `${n} \u2014 no room for another tmux split. Spawn fewer concurrent teammates, enlarge your terminal if running inside tmux, or switch to in-process teammates via /config.`
    : n;
}
//@ chunk-27ewfych.js:890-1032 fingerprint = getTmuxColorName (1)
function getTmuxColorName(color) {
  return {
    red: "red",
    blue: "blue",
    green: "green",
    yellow: "yellow",
    purple: "magenta",
    orange: "colour208",
    pink: "colour205",
    cyan: "cyan",
  }[color];
}
//@ chunk-27ewfych.js:1032-1095 layout
/**
 * 在 leader 所在 tmux socket 上执行 tmux 命令。
 */
function runTmuxInLeaderSocket(args) {
  let userTmuxSocket = getUserTmuxSocket();
  let a = userTmuxSocket ? ["-S", userTmuxSocket, ...args] : args;
  return execFileNoThrow(TMUX, a);
}
//@ chunk-27ewfych.js:1095-1146 layout
/**
 * 在外部 swarm socket（-L claude-swarm-<pid>）上执行 tmux 命令。
 */
function runTmuxInSwarmSocket(args, options) {
  return execFileNoThrow(TMUX, ["-L", getSwarmSocketName(), ...args], options);
}
//@ chunk-27ewfych.js:1146-1403 facade-exports
/**
 * 在 pane 中运行 teammate 命令：设 remain-on-exit=failed 后 respawn-pane -k。
 */
async function respawnPaneWithCommand(socketArgs, paneId, command, options) {
  await execFileNoThrow(
    TMUX,
    [...socketArgs, "set-option", "-p", "-t", paneId, "remain-on-exit", "failed"],
    options,
  );
  let s = await execFileNoThrow(
    TMUX,
    [...socketArgs, "respawn-pane", "-k", "-t", paneId, "--", prefixCgroupJoinCommand("agent", command)],
    options,
  );
  if (s.code !== 0) throw new SwarmPaneError(`Failed to send command to pane ${paneId}: ${s.stderr}`);
}
//@ chunk-27ewfych.js:1403-7315 facade-exports = TmuxBackend (0.901)
/**
 * tmux 后端：在 tmux 内时在 leader 窗口分屏（首个 teammate 横向 70%，之后交替纵横分割并 main-vertical 布局）；不在 tmux 时在外部 claude-swarm:swarm-view 窗口平铺；分屏有锁串行化。
 */
class TmuxBackend {
  type = "tmux";
  displayName = "tmux";
  cachedLeaderWindowTarget = null;
  firstPaneUsedForExternal = false;
  paneCreationLock = createMutex();
  async isAvailable() {
    return isTmuxAvailable();
  }
  async isRunningInside() {
    return isInsideTmux();
  }
  async createTeammatePaneInSwarmView(name, color) {
    let releaseLock = await this.paneCreationLock.acquire();
    try {
      if (await this.isRunningInside()) return await this.createTeammatePaneWithLeader(name, color);
      return await this.createTeammatePaneExternal(name, color);
    } finally {
      releaseLock();
    }
  }
  async sendCommandToPane(paneId, command, a = false) {
    try {
      assertNoControlChars(command);
    } catch (error) {
      logFeatureBad("swarm_pane_spawn", "swarm_pane_command_control_chars");
      throw error;
    }
    let userTmuxSocket = getUserTmuxSocket();
    let socketArgs = a ? ["-L", getSwarmSocketName()] : userTmuxSocket ? ["-S", userTmuxSocket] : [];
    await respawnPaneWithCommand(socketArgs, paneId, command);
  }
  async setPaneBorderColor(paneId, color, useExternalSession = false) {
    let tmuxColor = getTmuxColorName(color);
    let runTmux = useExternalSession ? runTmuxInSwarmSocket : runTmuxInLeaderSocket;
    await runTmux(["set-option", "-p", "-t", paneId, "window-style", `bg=default,fg=${tmuxColor}`]);
    await runTmux(["set-option", "-p", "-t", paneId, "pane-border-style", `fg=${tmuxColor}`]);
    await runTmux(["set-option", "-p", "-t", paneId, "pane-active-border-style", `fg=${tmuxColor}`]);
  }
  async setPaneTitle(paneId, name, color, useExternalSession = false) {
    let tmuxColor = getTmuxColorName(color);
    let runTmux = useExternalSession ? runTmuxInSwarmSocket : runTmuxInLeaderSocket;
    await runTmux(["select-pane", "-t", paneId, "-T", name]);
    await runTmux([
      "set-option",
      "-p",
      "-t",
      paneId,
      "pane-border-format",
      `#[fg=${tmuxColor},bold] #{pane_title} #[default]`,
    ]);
  }
  async enablePaneBorderStatus(windowTarget, useExternalSession = false) {
    let target = windowTarget || (await this.getCurrentWindowTarget());
    if (!target) return;
    await (useExternalSession ? runTmuxInSwarmSocket : runTmuxInLeaderSocket)([
      "set-option",
      "-w",
      "-t",
      target,
      "pane-border-status",
      "top",
    ]);
  }
  async killPane(paneId, useExternalSession = false) {
    return (
      (await (useExternalSession ? runTmuxInSwarmSocket : runTmuxInLeaderSocket)(["kill-pane", "-t", paneId]))
        .code === 0
    );
  }
  async getCurrentPaneId() {
    let leaderPane = getLeaderPaneId();
    if (leaderPane) return leaderPane;
    let result = await runTmuxInLeaderSocket(["display-message", "-p", "#{pane_id}"]);
    if (result.code !== 0) {
      logForDebugging(`[TmuxBackend] Failed to get current pane ID (exit ${result.code}): ${result.stderr}`);
      return null;
    }
    return result.stdout.trim();
  }
  async getCurrentWindowTarget() {
    if (this.cachedLeaderWindowTarget) return this.cachedLeaderWindowTarget;
    let leaderPane = getLeaderPaneId();
    let args = ["display-message"];
    if (leaderPane) args.push("-t", leaderPane);
    args.push("-p", "#{window_id}");
    let result = await runTmuxInLeaderSocket(args);
    if (result.code !== 0) {
      logForDebugging(
        `[TmuxBackend] Failed to get current window target (exit ${result.code}): ${result.stderr}`,
      );
      return null;
    }
    this.cachedLeaderWindowTarget = result.stdout.trim();
    return this.cachedLeaderWindowTarget;
  }
  async getCurrentWindowPaneCount(windowTarget, useSwarmSocket = false) {
    let target = windowTarget || (await this.getCurrentWindowTarget());
    if (!target) return null;
    let args = ["list-panes", "-t", target, "-F", "#{pane_id}"];
    let result = useSwarmSocket ? await runTmuxInSwarmSocket(args) : await runTmuxInLeaderSocket(args);
    if (result.code !== 0) {
      logForDebugging(
        `[TmuxBackend] Failed to get pane count for ${target} (exit ${result.code}): ${result.stderr}`,
        {
          level: "error",
        },
      );
      if (target === this.cachedLeaderWindowTarget) this.cachedLeaderWindowTarget = null;
      return null;
    }
    return count(
      result.stdout.trim().split(`
`),
      Boolean,
    );
  }
  async hasSessionInSwarm(sessionName) {
    return (await runTmuxInSwarmSocket(["has-session", "-t", sessionName])).code === 0;
  }
  async createExternalSwarmSession() {
    if (!(await this.hasSessionInSwarm(CLAUDE_SWARM))) {
      let result = await runTmuxInSwarmSocket(
        ["new-session", "-d", "-s", CLAUDE_SWARM, "-n", SWARM_VIEW, "-P", "-F", "#{pane_id}", "--", CAT],
        {
          useCwd: true,
          toolCgroupClass: "agent",
          env: withLaunchValuesOfHybridConnection(process.env),
          extendEnv: false,
        },
      );
      if (result.code !== 0)
        throw new SwarmPaneError(`Failed to create swarm session: ${result.stderr || "Unknown error"}`);
      let paneId = result.stdout.trim();
      let windowTarget = `${CLAUDE_SWARM}:${SWARM_VIEW}`;
      logForDebugging(
        `[TmuxBackend] Created external swarm session with window ${windowTarget}, pane ${paneId}`,
      );
      this.firstPaneUsedForExternal = false;
      return {
        windowTarget,
        paneId,
      };
    }
    let filtered = (
      await runTmuxInSwarmSocket(["list-windows", "-t", CLAUDE_SWARM, "-F", "#{window_name}"])
    ).stdout
      .trim()
      .split(
        `
`,
      )
      .filter(Boolean);
    let windowTarget = `${CLAUDE_SWARM}:${SWARM_VIEW}`;
    if (filtered.includes(SWARM_VIEW)) {
      let filtered = (
        await runTmuxInSwarmSocket(["list-panes", "-t", windowTarget, "-F", "#{pane_id}"])
      ).stdout
        .trim()
        .split(
          `
`,
        )
        .filter(Boolean);
      return {
        windowTarget,
        paneId: filtered[0] || "",
      };
    }
    let createResult = await runTmuxInSwarmSocket([
      "new-window",
      "-t",
      CLAUDE_SWARM,
      "-n",
      SWARM_VIEW,
      "-P",
      "-F",
      "#{pane_id}",
      "--",
      CAT,
    ]);
    if (createResult.code !== 0)
      throw new SwarmPaneError(
        `Failed to create swarm-view window: ${createResult.stderr || "Unknown error"}`,
      );
    this.firstPaneUsedForExternal = false;
    return {
      windowTarget,
      paneId: createResult.stdout.trim(),
    };
  }
  async createTeammatePaneWithLeader(teammateName, teammateColor) {
    let currentPaneId = await this.getCurrentPaneId();
    let windowTarget = await this.getCurrentWindowTarget();
    if (!currentPaneId || !windowTarget)
      throw new SwarmPaneError("Could not determine current tmux pane/window");
    let paneCount = await this.getCurrentWindowPaneCount(windowTarget);
    if (paneCount === null) throw new SwarmPaneError("Could not determine pane count for current window");
    let isFirstTeammate = paneCount === 1;
    let splitResult;
    if (isFirstTeammate)
      splitResult = await runTmuxInLeaderSocket([
        "split-window",
        "-d",
        "-t",
        currentPaneId,
        "-h",
        "-l",
        "70%",
        "-P",
        "-F",
        "#{pane_id}",
        "--",
        CAT,
      ]);
    else {
      let sliced = (
        await runTmuxInLeaderSocket(["list-panes", "-t", windowTarget, "-F", "#{pane_id}"])
      ).stdout
        .trim()
        .split(
          `
`,
        )
        .filter(Boolean)
        .slice(1);
      let teammateCount = sliced.length;
      let splitVertically = teammateCount % 2 === 1;
      let targetPaneIndex = Math.floor((teammateCount - 1) / 2);
      let targetPane = sliced[targetPaneIndex] || sliced.at(-1);
      splitResult = await runTmuxInLeaderSocket([
        "split-window",
        "-d",
        "-t",
        targetPane,
        splitVertically ? "-v" : "-h",
        "-P",
        "-F",
        "#{pane_id}",
        "--",
        CAT,
      ]);
    }
    if (splitResult.code !== 0) throw new SwarmPaneError(formatPaneCreateError(splitResult.stderr));
    let paneId = splitResult.stdout.trim();
    logForDebugging(`[TmuxBackend] Created teammate pane for ${teammateName}: ${paneId}`);
    await this.setPaneBorderColor(paneId, teammateColor);
    await this.setPaneTitle(paneId, teammateName, teammateColor);
    await this.rebalancePanesWithLeader(windowTarget);
    return {
      paneId,
      isFirstTeammate,
    };
  }
  async createTeammatePaneExternal(teammateName, teammateColor) {
    let { windowTarget, paneId: firstPaneId } = await this.createExternalSwarmSession();
    let paneCount = await this.getCurrentWindowPaneCount(windowTarget, true);
    if (paneCount === null) throw new SwarmPaneError("Could not determine pane count for swarm window");
    let isFirstTeammate = !this.firstPaneUsedForExternal && paneCount === 1;
    let paneId;
    if (isFirstTeammate) {
      paneId = firstPaneId;
      this.firstPaneUsedForExternal = true;
      logForDebugging(`[TmuxBackend] Using initial pane for first teammate ${teammateName}: ${paneId}`);
      await this.enablePaneBorderStatus(windowTarget, true);
    } else {
      let filtered = (
        await runTmuxInSwarmSocket(["list-panes", "-t", windowTarget, "-F", "#{pane_id}"])
      ).stdout
        .trim()
        .split(
          `
`,
        )
        .filter(Boolean);
      let teammateCount = filtered.length;
      let splitVertically = teammateCount % 2 === 1;
      let targetPaneIndex = Math.floor((teammateCount - 1) / 2);
      let targetPane = filtered[targetPaneIndex] || filtered.at(-1);
      let splitResult = await runTmuxInSwarmSocket([
        "split-window",
        "-d",
        "-t",
        targetPane,
        splitVertically ? "-v" : "-h",
        "-P",
        "-F",
        "#{pane_id}",
        "--",
        CAT,
      ]);
      if (splitResult.code !== 0) throw new SwarmPaneError(formatPaneCreateError(splitResult.stderr));
      paneId = splitResult.stdout.trim();
      logForDebugging(`[TmuxBackend] Created teammate pane for ${teammateName}: ${paneId}`);
    }
    await this.setPaneBorderColor(paneId, teammateColor, true);
    await this.setPaneTitle(paneId, teammateName, teammateColor, true);
    await this.rebalancePanesTiled(windowTarget);
    return {
      paneId,
      isFirstTeammate,
    };
  }
  async rebalancePanesWithLeader(windowTarget) {
    let filtered = (
      await runTmuxInLeaderSocket(["list-panes", "-t", windowTarget, "-F", "#{pane_id}"])
    ).stdout
      .trim()
      .split(
        `
`,
      )
      .filter(Boolean);
    if (filtered.length <= 2) return;
    await runTmuxInLeaderSocket(["select-layout", "-t", windowTarget, "main-vertical"]);
    let leaderPane = filtered[0];
    await runTmuxInLeaderSocket(["resize-pane", "-t", leaderPane, "-x", "30%"]);
    logForDebugging(`[TmuxBackend] Rebalanced ${filtered.length - 1} teammate panes with leader`);
  }
  async rebalancePanesTiled(windowTarget) {
    let filtered = (await runTmuxInSwarmSocket(["list-panes", "-t", windowTarget, "-F", "#{pane_id}"])).stdout
      .trim()
      .split(
        `
`,
      )
      .filter(Boolean);
    if (filtered.length <= 1) return;
    await runTmuxInSwarmSocket(["select-layout", "-t", windowTarget, "tiled"]);
    logForDebugging(`[TmuxBackend] Rebalanced ${filtered.length} teammate panes with tiled layout`);
  }
}
export { respawnPaneWithCommand };
