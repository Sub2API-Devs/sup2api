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

/**
 * 分屏失败的提示文案（空间不足时建议减少并发、放大终端或改用同进程 teammate）。
 */
//@ chunk-27ewfych.js:583-890 affinity
function formatPaneCreateError(stderr) {
  let n = `Failed to create teammate pane: ${stderr}`,
    lower = stderr.toLowerCase();
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
/**
 * 在 leader 所在 tmux socket 上执行 tmux 命令。
 */
//@ chunk-27ewfych.js:1032-1095 layout
function runTmuxInLeaderSocket(args) {
  let n = getUserTmuxSocket(),
    a = n ? ["-S", n, ...args] : args;
  return execFileNoThrow(TMUX, a);
}
/**
 * 在外部 swarm socket（-L claude-swarm-<pid>）上执行 tmux 命令。
 */
//@ chunk-27ewfych.js:1095-1146 layout
function runTmuxInSwarmSocket(args, options) {
  return execFileNoThrow(TMUX, ["-L", getSwarmSocketName(), ...args], options);
}
/**
 * 在 pane 中运行 teammate 命令：设 remain-on-exit=failed 后 respawn-pane -k。
 */
//@ chunk-27ewfych.js:1146-1403 facade-exports
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
/**
 * tmux 后端：在 tmux 内时在 leader 窗口分屏（首个 teammate 横向 70%，之后交替纵横分割并 main-vertical 布局）；不在 tmux 时在外部 claude-swarm:swarm-view 窗口平铺；分屏有锁串行化。
 */
//@ chunk-27ewfych.js:1403-7315 facade-exports = TmuxBackend (0.901)
class TmuxBackend {
  type = "tmux";
  displayName = "tmux";
  cachedLeaderWindowTarget = null;
  firstPaneUsedForExternal = !1;
  paneCreationLock = createMutex();
  async isAvailable() {
    return isTmuxAvailable();
  }
  async isRunningInside() {
    return isInsideTmux();
  }
  async createTeammatePaneInSwarmView(e, n) {
    let acquire = await this.paneCreationLock.acquire();
    try {
      if (await this.isRunningInside()) return await this.createTeammatePaneWithLeader(e, n);
      return await this.createTeammatePaneExternal(e, n);
    } finally {
      acquire();
    }
  }
  async sendCommandToPane(e, n, a = !1) {
    try {
      assertNoControlChars(n);
    } catch (error) {
      throw (logFeatureBad("swarm_pane_spawn", "swarm_pane_command_control_chars"), error);
    }
    let r = getUserTmuxSocket(),
      s = a ? ["-L", getSwarmSocketName()] : r ? ["-S", r] : [];
    await respawnPaneWithCommand(s, e, n);
  }
  async setPaneBorderColor(e, n, a = !1) {
    let r = getTmuxColorName(n),
      s = a ? runTmuxInSwarmSocket : runTmuxInLeaderSocket;
    (await s(["set-option", "-p", "-t", e, "window-style", `bg=default,fg=${r}`]),
      await s(["set-option", "-p", "-t", e, "pane-border-style", `fg=${r}`]),
      await s(["set-option", "-p", "-t", e, "pane-active-border-style", `fg=${r}`]));
  }
  async setPaneTitle(e, n, a, r = !1) {
    let s = getTmuxColorName(a),
      o = r ? runTmuxInSwarmSocket : runTmuxInLeaderSocket;
    (await o(["select-pane", "-t", e, "-T", n]),
      await o([
        "set-option",
        "-p",
        "-t",
        e,
        "pane-border-format",
        `#[fg=${s},bold] #{pane_title} #[default]`,
      ]));
  }
  async enablePaneBorderStatus(e, n = !1) {
    let a = e || (await this.getCurrentWindowTarget());
    if (!a) return;
    await (n ? runTmuxInSwarmSocket : runTmuxInLeaderSocket)([
      "set-option",
      "-w",
      "-t",
      a,
      "pane-border-status",
      "top",
    ]);
  }
  async killPane(e, n = !1) {
    return (await (n ? runTmuxInSwarmSocket : runTmuxInLeaderSocket)(["kill-pane", "-t", e])).code === 0;
  }
  async getCurrentPaneId() {
    let e = getLeaderPaneId();
    if (e) return e;
    let n = await runTmuxInLeaderSocket(["display-message", "-p", "#{pane_id}"]);
    if (n.code !== 0)
      return (
        logForDebugging(`[TmuxBackend] Failed to get current pane ID (exit ${n.code}): ${n.stderr}`),
        null
      );
    return n.stdout.trim();
  }
  async getCurrentWindowTarget() {
    if (this.cachedLeaderWindowTarget) return this.cachedLeaderWindowTarget;
    let e = getLeaderPaneId(),
      n = ["display-message"];
    if (e) n.push("-t", e);
    n.push("-p", "#{window_id}");
    let a = await runTmuxInLeaderSocket(n);
    if (a.code !== 0)
      return (
        logForDebugging(`[TmuxBackend] Failed to get current window target (exit ${a.code}): ${a.stderr}`),
        null
      );
    return ((this.cachedLeaderWindowTarget = a.stdout.trim()), this.cachedLeaderWindowTarget);
  }
  async getCurrentWindowPaneCount(e, n = !1) {
    let a = e || (await this.getCurrentWindowTarget());
    if (!a) return null;
    let r = ["list-panes", "-t", a, "-F", "#{pane_id}"],
      s = n ? await runTmuxInSwarmSocket(r) : await runTmuxInLeaderSocket(r);
    if (s.code !== 0) {
      if (
        (logForDebugging(`[TmuxBackend] Failed to get pane count for ${a} (exit ${s.code}): ${s.stderr}`, {
          level: "error",
        }),
        a === this.cachedLeaderWindowTarget)
      )
        this.cachedLeaderWindowTarget = null;
      return null;
    }
    return count(
      s.stdout.trim().split(`
`),
      Boolean,
    );
  }
  async hasSessionInSwarm(e) {
    return (await runTmuxInSwarmSocket(["has-session", "-t", e])).code === 0;
  }
  async createExternalSwarmSession() {
    if (!(await this.hasSessionInSwarm(CLAUDE_SWARM))) {
      let o = await runTmuxInSwarmSocket(
        ["new-session", "-d", "-s", CLAUDE_SWARM, "-n", SWARM_VIEW, "-P", "-F", "#{pane_id}", "--", CAT],
        {
          useCwd: !0,
          toolCgroupClass: "agent",
          env: withLaunchValuesOfHybridConnection(process.env),
          extendEnv: !1,
        },
      );
      if (o.code !== 0)
        throw new SwarmPaneError(`Failed to create swarm session: ${o.stderr || "Unknown error"}`);
      let trimmed = o.stdout.trim(),
        u = `${CLAUDE_SWARM}:${SWARM_VIEW}`;
      return (
        logForDebugging(`[TmuxBackend] Created external swarm session with window ${u}, pane ${trimmed}`),
        (this.firstPaneUsedForExternal = !1),
        { windowTarget: u, paneId: trimmed }
      );
    }
    let filtered = (
        await runTmuxInSwarmSocket(["list-windows", "-t", CLAUDE_SWARM, "-F", "#{window_name}"])
      ).stdout
        .trim()
        .split(
          `
`,
        )
        .filter(Boolean),
      r = `${CLAUDE_SWARM}:${SWARM_VIEW}`;
    if (filtered.includes(SWARM_VIEW)) {
      let filtered = (await runTmuxInSwarmSocket(["list-panes", "-t", r, "-F", "#{pane_id}"])).stdout
        .trim()
        .split(
          `
`,
        )
        .filter(Boolean);
      return { windowTarget: r, paneId: filtered[0] || "" };
    }
    let s = await runTmuxInSwarmSocket([
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
    if (s.code !== 0)
      throw new SwarmPaneError(`Failed to create swarm-view window: ${s.stderr || "Unknown error"}`);
    return ((this.firstPaneUsedForExternal = !1), { windowTarget: r, paneId: s.stdout.trim() });
  }
  async createTeammatePaneWithLeader(e, n) {
    let currentPaneId = await this.getCurrentPaneId(),
      currentWindowTarget = await this.getCurrentWindowTarget();
    if (!currentPaneId || !currentWindowTarget)
      throw new SwarmPaneError("Could not determine current tmux pane/window");
    let currentWindowPaneCount = await this.getCurrentWindowPaneCount(currentWindowTarget);
    if (currentWindowPaneCount === null)
      throw new SwarmPaneError("Could not determine pane count for current window");
    let o = currentWindowPaneCount === 1,
      i;
    if (o)
      i = await runTmuxInLeaderSocket([
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
          await runTmuxInLeaderSocket(["list-panes", "-t", currentWindowTarget, "-F", "#{pane_id}"])
        ).stdout
          .trim()
          .split(
            `
`,
          )
          .filter(Boolean)
          .slice(1),
        g = sliced.length,
        P = g % 2 === 1,
        floored = Math.floor((g - 1) / 2),
        x = sliced[floored] || sliced.at(-1);
      i = await runTmuxInLeaderSocket([
        "split-window",
        "-d",
        "-t",
        x,
        P ? "-v" : "-h",
        "-P",
        "-F",
        "#{pane_id}",
        "--",
        CAT,
      ]);
    }
    if (i.code !== 0) throw new SwarmPaneError(formatPaneCreateError(i.stderr));
    let trimmed = i.stdout.trim();
    return (
      logForDebugging(`[TmuxBackend] Created teammate pane for ${e}: ${trimmed}`),
      await this.setPaneBorderColor(trimmed, n),
      await this.setPaneTitle(trimmed, e, n),
      await this.rebalancePanesWithLeader(currentWindowTarget),
      { paneId: trimmed, isFirstTeammate: o }
    );
  }
  async createTeammatePaneExternal(e, n) {
    let { windowTarget: windowTarget, paneId: paneId } = await this.createExternalSwarmSession(),
      currentWindowPaneCount = await this.getCurrentWindowPaneCount(windowTarget, !0);
    if (currentWindowPaneCount === null)
      throw new SwarmPaneError("Could not determine pane count for swarm window");
    let o = !this.firstPaneUsedForExternal && currentWindowPaneCount === 1,
      i;
    if (o)
      ((i = paneId),
        (this.firstPaneUsedForExternal = !0),
        logForDebugging(`[TmuxBackend] Using initial pane for first teammate ${e}: ${i}`),
        await this.enablePaneBorderStatus(windowTarget, !0));
    else {
      let filtered = (
          await runTmuxInSwarmSocket(["list-panes", "-t", windowTarget, "-F", "#{pane_id}"])
        ).stdout
          .trim()
          .split(
            `
`,
          )
          .filter(Boolean),
        f = filtered.length,
        c = f % 2 === 1,
        floored = Math.floor((f - 1) / 2),
        P = filtered[floored] || filtered.at(-1),
        w = await runTmuxInSwarmSocket([
          "split-window",
          "-d",
          "-t",
          P,
          c ? "-v" : "-h",
          "-P",
          "-F",
          "#{pane_id}",
          "--",
          CAT,
        ]);
      if (w.code !== 0) throw new SwarmPaneError(formatPaneCreateError(w.stderr));
      ((i = w.stdout.trim()), logForDebugging(`[TmuxBackend] Created teammate pane for ${e}: ${i}`));
    }
    return (
      await this.setPaneBorderColor(i, n, !0),
      await this.setPaneTitle(i, e, n, !0),
      await this.rebalancePanesTiled(windowTarget),
      { paneId: i, isFirstTeammate: o }
    );
  }
  async rebalancePanesWithLeader(e) {
    let filtered = (await runTmuxInLeaderSocket(["list-panes", "-t", e, "-F", "#{pane_id}"])).stdout
      .trim()
      .split(
        `
`,
      )
      .filter(Boolean);
    if (filtered.length <= 2) return;
    await runTmuxInLeaderSocket(["select-layout", "-t", e, "main-vertical"]);
    let r = filtered[0];
    (await runTmuxInLeaderSocket(["resize-pane", "-t", r, "-x", "30%"]),
      logForDebugging(`[TmuxBackend] Rebalanced ${filtered.length - 1} teammate panes with leader`));
  }
  async rebalancePanesTiled(e) {
    let filtered = (await runTmuxInSwarmSocket(["list-panes", "-t", e, "-F", "#{pane_id}"])).stdout
      .trim()
      .split(
        `
`,
      )
      .filter(Boolean);
    if (filtered.length <= 1) return;
    (await runTmuxInSwarmSocket(["select-layout", "-t", e, "tiled"]),
      logForDebugging(`[TmuxBackend] Rebalanced ${filtered.length} teammate panes with tiled layout`));
  }
}

export { respawnPaneWithCommand };
