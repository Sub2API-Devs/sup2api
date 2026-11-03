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
import { Pke } from "./fsJunctions.js";
import { getOriginalCwd } from "../bootstrap/state.js";

//@ chunk-29yq8nq5.js:399-441 placement
var CLAUDE_CODE_RELAUNCH_HOME_TRUST = "CLAUDE_CODE_RELAUNCH_HOME_TRUST";
/**
 * 生成重启时继承主目录信任的环境变量（当前 pid:进程启动时间）。
 */
//@ chunk-29yq8nq5.js:441-549 placement
async function relaunchHomeTrustEnv() {
  let r = await getProcessStartTimeAsync(process.pid);
  if (r === void 0) return {};
  return { [CLAUDE_CODE_RELAUNCH_HOME_TRUST]: `${process.pid}:${r}` };
}
/**
 * 重启后是否继承主目录信任：环境变量 CLAUDE_CODE_RELAUNCH_HOME_TRUST 为"pid:启动时间"，pid 须是父进程（Windows）或自身，原始 cwd 须是主目录，且进程启动时间与记录一致。
 */
//@ chunk-29yq8nq5.js:549-824 placement
async function inheritsRelaunchHomeTrust() {
  let match = /^(\d{1,10}):(.{1,64})$/.exec(env.CLAUDE_CODE_RELAUNCH_HOME_TRUST ?? "");
  if (!match) return !1;
  let e = getPlatform() === "windows" ? process.ppid : process.pid;
  if (Number(match[1]) !== e) return !1;
  if (!Pke(getOriginalCwd(), homedir())) return !1;
  let t = await getProcessStartTimeAsync(e, { skipCache: !0 });
  return t !== void 0 && t === match[2];
}

export { inheritsRelaunchHomeTrust, CLAUDE_CODE_RELAUNCH_HOME_TRUST, relaunchHomeTrustEnv };
