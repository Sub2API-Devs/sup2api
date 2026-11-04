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
function runIt2(splitArgs) {
  return execFileNoThrow(getIt2Command(), splitArgs);
}
//@ chunk-vdskh52v.js:1158-1253 file-local
function parseSplitOutput(output) {
  let match = output.match(/Created new pane:\s*(.+)/);
  if (match && match[1]) return match[1].trim();
  return "";
}
//@ chunk-vdskh52v.js:1253-1372 fingerprint (2.1.88 match: getLeaderSessionId, 1)
/**
 * 从 ITERM_SESSION_ID 取 leader 会话 ID（冒号后部分）。
 */
function getLeaderSessionId() {
  let itermSessionId = env.ITERM_SESSION_ID;
  if (!itermSessionId) return null;
  let colonIndex = itermSessionId.indexOf(":");
  if (colonIndex === -1) return null;
  return itermSessionId.slice(colonIndex + 1);
}
//@ chunk-vdskh52v.js:1372-3907 fingerprint (2.1.88 match: ITermBackend, 0.923)
/**
 * iTerm2 后端：首个 teammate 从 leader 会话垂直分屏，之后从上一个 teammate 分屏；目标会话已死时剪除并重试；发命令前先发 Ctrl-U 清行；不支持边框颜色/标题。
 */
class ITermBackend {
  type = "iterm2";
  displayName = "iTerm2";
  teammateSessionIds = [];
  firstPaneUsed = false;
  paneCreationLock = createMutex();
  async isAvailable() {
    let inITerm2 = isInITerm2();
    logForDebugging(`[ITermBackend] isAvailable check: inITerm2=${inITerm2}`);
    if (!inITerm2) {
      logForDebugging("[ITermBackend] isAvailable: false (not in iTerm2)");
      return false;
    }
    let it2Available = await isIt2CliAvailable();
    logForDebugging(
      `[ITermBackend] isAvailable: ${it2Available} (it2 CLI ${it2Available ? "found" : "not found"})`,
    );
    return it2Available;
  }
  async isRunningInside() {
    let result = isInITerm2();
    logForDebugging(`[ITermBackend] isRunningInside: ${result}`);
    return result;
  }
  async createTeammatePaneInSwarmView(name, color) {
    logForDebugging(`[ITermBackend] createTeammatePaneInSwarmView called for ${name} with color ${color}`);
    let releaseLock = await this.paneCreationLock.acquire();
    try {
      while (true) {
        let isFirstTeammate = !this.firstPaneUsed;
        logForDebugging(
          `[ITermBackend] Creating pane: isFirstTeammate=${isFirstTeammate}, existingPanes=${this.teammateSessionIds.length}`,
        );
        let splitArgs;
        let targetedTeammateId;
        if (isFirstTeammate) {
          let leaderSessionId = getLeaderSessionId();
          if (leaderSessionId) {
            splitArgs = ["session", "split", "-v", "-s", leaderSessionId];
            logForDebugging(`[ITermBackend] First split from leader session: ${leaderSessionId}`);
          } else {
            splitArgs = ["session", "split", "-v"];
            logForDebugging("[ITermBackend] First split from active session (no leader ID)");
          }
        } else {
          targetedTeammateId = this.teammateSessionIds.at(-1);
          if (targetedTeammateId) {
            splitArgs = ["session", "split", "-s", targetedTeammateId];
            logForDebugging(`[ITermBackend] Subsequent split from teammate session: ${targetedTeammateId}`);
          } else {
            splitArgs = ["session", "split"];
            logForDebugging("[ITermBackend] Subsequent split from active session (no teammate ID)");
          }
        }
        let splitResult = await runIt2(splitArgs);
        if (splitResult.code !== 0) {
          if (targetedTeammateId) {
            let listResult = await runIt2(["session", "list"]);
            if (listResult.code === 0 && !listResult.stdout.includes(targetedTeammateId)) {
              logForDebugging(
                `[ITermBackend] Split failed targeting dead session ${targetedTeammateId}, pruning and retrying: ${splitResult.stderr}`,
              );
              let idx = this.teammateSessionIds.indexOf(targetedTeammateId);
              if (idx !== -1) this.teammateSessionIds.splice(idx, 1);
              if (this.teammateSessionIds.length === 0) this.firstPaneUsed = false;
              continue;
            }
          }
          throw new SwarmPaneError(`Failed to create iTerm2 split pane: ${splitResult.stderr}`);
        }
        let paneId = parseSplitOutput(splitResult.stdout);
        if (!paneId) throw Error(`Failed to parse session ID from split output: ${splitResult.stdout}`);
        logForDebugging(`[ITermBackend] Created teammate pane for ${name}: ${paneId}`);
        if (isFirstTeammate) this.firstPaneUsed = true;
        this.teammateSessionIds.push(paneId);
        return {
          paneId,
          isFirstTeammate,
        };
      }
    } finally {
      releaseLock();
    }
  }
  async sendCommandToPane(paneId, command, _useExternalSession) {
    try {
      assertNoControlChars(command);
    } catch (error) {
      logFeatureBad("swarm_pane_spawn", "swarm_pane_command_control_chars");
      throw error;
    }
    let args = paneId ? ["-s", paneId] : [];
    await runIt2(["session", "send", ...args, "\x15"]);
    let result = await runIt2(["session", "run", ...args, command]);
    if (result.code !== 0)
      throw new SwarmPaneError(`Failed to send command to iTerm2 pane ${paneId}: ${result.stderr}`);
  }
  async setPaneBorderColor(_paneId, _color, _useExternalSession) {}
  async setPaneTitle(_paneId, _name, _color, _useExternalSession) {}
  async enablePaneBorderStatus(_windowTarget, _useExternalSession) {}
  async killPane(paneId, _useExternalSession) {
    let result = await runIt2(["session", "close", "-f", "-s", paneId]);
    let idx = this.teammateSessionIds.indexOf(paneId);
    if (idx !== -1) this.teammateSessionIds.splice(idx, 1);
    if (this.teammateSessionIds.length === 0) this.firstPaneUsed = false;
    return result.code === 0;
  }
}
export { ITermBackend };
