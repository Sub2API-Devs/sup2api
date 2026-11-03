/**
 * utils/relaunchHomeTrust.ts
 *
 * 2.1.316 新增：重启时继承主目录信任（CLAUDE_CODE_RELAUNCH_HOME_TRUST）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-29yq8nq5.js (3)
 * attribution: placement 3
 */
import { homedir } from "os";
import { getProcessStartTimeAsync } from "./processIdentity.js";
import { env } from "./env.js";
import { getPlatform } from "./platform.js";
import { isSameRealPath } from "./fsJunctions.js";
import { getOriginalCwd } from "../bootstrap/state.js";

//@ chunk-29yq8nq5.js:399-441 placement
var CLAUDE_CODE_RELAUNCH_HOME_TRUST = "CLAUDE_CODE_RELAUNCH_HOME_TRUST";
//@ chunk-29yq8nq5.js:441-549 placement
/**
 * 生成重启时继承主目录信任的环境变量（当前 pid:进程启动时间）。
 */
async function relaunchHomeTrustEnv() {
  let processStartTime = await getProcessStartTimeAsync(process.pid);
  if (processStartTime === undefined) return {};
  return {
    [CLAUDE_CODE_RELAUNCH_HOME_TRUST]: `${process.pid}:${processStartTime}`,
  };
}
//@ chunk-29yq8nq5.js:549-824 placement
/**
 * 重启后是否继承主目录信任：环境变量 CLAUDE_CODE_RELAUNCH_HOME_TRUST 为"pid:启动时间"，pid 须是父进程（Windows）或自身，原始 cwd 须是主目录，且进程启动时间与记录一致。
 */
async function inheritsRelaunchHomeTrust() {
  let match = /^(\d{1,10}):(.{1,64})$/.exec(env.CLAUDE_CODE_RELAUNCH_HOME_TRUST ?? "");
  if (!match) return false;
  let e = getPlatform() === "windows" ? process.ppid : process.pid;
  if (Number(match[1]) !== e) return false;
  if (!isSameRealPath(getOriginalCwd(), homedir())) return false;
  let processStartTime = await getProcessStartTimeAsync(e, {
    skipCache: true,
  });
  return processStartTime !== undefined && processStartTime === match[2];
}
export { inheritsRelaunchHomeTrust, CLAUDE_CODE_RELAUNCH_HOME_TRUST, relaunchHomeTrustEnv };
