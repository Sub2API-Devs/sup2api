/**
 * utils/swarm/backends/ITermBackend.ts
 *
 * iTerm2 pane 后端：用 it2 CLI 分屏创建 teammate pane、发命令、关闭 pane
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/swarm/backends/ITermBackend.ts
 * pieces: chunk-vdskh52v.js (4)
 * attribution: sole-consumer 1, file-local 1, fingerprint 2
 */
import { execFileNoThrow } from "../../execFileNoThrow.js";
import { getIt2Command, isInITerm2, isIt2CliAvailable } from "./detection.js";
import { env } from "../../env.js";
import { createMutex } from "../../promiseQueue.js";
import { logForDebugging } from "../../debug.js";
import { SwarmPaneError, assertNoControlChars } from "../teamHelpers.js";
import { logFeatureBad } from "../../../services/analytics/featureTelemetry.js";

//@ chunk-vdskh52v.js:1125-1158 sole-consumer
function c(e) {
  return execFileNoThrow(getIt2Command(), e);
}
//@ chunk-vdskh52v.js:1158-1253 file-local
function parseSplitOutput(output) {
  let match = output.match(/Created new pane:\s*(.+)/);
  if (match && match[1]) return match[1].trim();
  return "";
}
/**
 * 从 ITERM_SESSION_ID 取 leader 会话 ID（冒号后部分）。
 */
//@ chunk-vdskh52v.js:1253-1372 fingerprint = getLeaderSessionId (1)
function getLeaderSessionId() {
  let itermSessionId = env.ITERM_SESSION_ID;
  if (!itermSessionId) return null;
  let colonIndex = itermSessionId.indexOf(":");
  if (colonIndex === -1) return null;
  return itermSessionId.slice(colonIndex + 1);
}
/**
 * iTerm2 后端：首个 teammate 从 leader 会话垂直分屏，之后从上一个 teammate 分屏；目标会话已死时剪除并重试；发命令前先发 Ctrl-U 清行；不支持边框颜色/标题。
 */
//@ chunk-vdskh52v.js:1372-3907 fingerprint = ITermBackend (0.923)
class ITermBackend {
  type = "iterm2";
  displayName = "iTerm2";
  teammateSessionIds = [];
  firstPaneUsed = !1;
  paneCreationLock = createMutex();
  async isAvailable() {
    let e = isInITerm2();
    if ((logForDebugging(`[ITermBackend] isAvailable check: inITerm2=${e}`), !e))
      return (logForDebugging("[ITermBackend] isAvailable: false (not in iTerm2)"), !1);
    let s = await isIt2CliAvailable();
    return (logForDebugging(`[ITermBackend] isAvailable: ${s} (it2 CLI ${s ? "found" : "not found"})`), s);
  }
  async isRunningInside() {
    let e = isInITerm2();
    return (logForDebugging(`[ITermBackend] isRunningInside: ${e}`), e);
  }
  async createTeammatePaneInSwarmView(e, s) {
    logForDebugging(`[ITermBackend] createTeammatePaneInSwarmView called for ${e} with color ${s}`);
    let acquire = await this.paneCreationLock.acquire();
    try {
      while (!0) {
        let n = !this.firstPaneUsed;
        logForDebugging(
          `[ITermBackend] Creating pane: isFirstTeammate=${n}, existingPanes=${this.teammateSessionIds.length}`,
        );
        let r, a;
        if (n) {
          let l = getLeaderSessionId();
          if (l)
            ((r = ["session", "split", "-v", "-s", l]),
              logForDebugging(`[ITermBackend] First split from leader session: ${l}`));
          else
            ((r = ["session", "split", "-v"]),
              logForDebugging("[ITermBackend] First split from active session (no leader ID)"));
        } else if (((a = this.teammateSessionIds.at(-1)), a))
          ((r = ["session", "split", "-s", a]),
            logForDebugging(`[ITermBackend] Subsequent split from teammate session: ${a}`));
        else
          ((r = ["session", "split"]),
            logForDebugging("[ITermBackend] Subsequent split from active session (no teammate ID)"));
        let d = await c(r);
        if (d.code !== 0) {
          if (a) {
            let l = await c(["session", "list"]);
            if (l.code === 0 && !l.stdout.includes(a)) {
              logForDebugging(
                `[ITermBackend] Split failed targeting dead session ${a}, pruning and retrying: ${d.stderr}`,
              );
              let index = this.teammateSessionIds.indexOf(a);
              if (index !== -1) this.teammateSessionIds.splice(index, 1);
              if (this.teammateSessionIds.length === 0) this.firstPaneUsed = !1;
              continue;
            }
          }
          throw new SwarmPaneError(`Failed to create iTerm2 split pane: ${d.stderr}`);
        }
        let u = parseSplitOutput(d.stdout);
        if (!u) throw Error(`Failed to parse session ID from split output: ${d.stdout}`);
        if ((logForDebugging(`[ITermBackend] Created teammate pane for ${e}: ${u}`), n))
          this.firstPaneUsed = !0;
        return (this.teammateSessionIds.push(u), { paneId: u, isFirstTeammate: n });
      }
    } finally {
      acquire();
    }
  }
  async sendCommandToPane(e, s, o) {
    try {
      assertNoControlChars(s);
    } catch (error) {
      throw (logFeatureBad("swarm_pane_spawn", "swarm_pane_command_control_chars"), error);
    }
    let n = e ? ["-s", e] : [];
    await c(["session", "send", ...n, "\x15"]);
    let r = await c(["session", "run", ...n, s]);
    if (r.code !== 0) throw new SwarmPaneError(`Failed to send command to iTerm2 pane ${e}: ${r.stderr}`);
  }
  async setPaneBorderColor(e, s, o) {}
  async setPaneTitle(e, s, o, n) {}
  async enablePaneBorderStatus(e, s) {}
  async killPane(e, s) {
    let o = await c(["session", "close", "-f", "-s", e]),
      index = this.teammateSessionIds.indexOf(e);
    if (index !== -1) this.teammateSessionIds.splice(index, 1);
    if (this.teammateSessionIds.length === 0) this.firstPaneUsed = !1;
    return o.code === 0;
  }
}
