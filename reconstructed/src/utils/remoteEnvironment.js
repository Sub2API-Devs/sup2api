/**
 * utils/remoteEnvironment.ts
 *
 * 2.1.316 新增：远程环境判定
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-4vzb3taj.js (16)
 * attribution: placement 16
 */
import { isAbsolute } from "path";
import { Tm } from "./windowsUncPaths.js";
import { Qn, uncHostOf, rc } from "./pathClassification.js";
import { env } from "./env.js";
import { INITIAL_CWD_KEY } from "./cwd.js";
import {
  getRunnerDeclaredNestedRepositoryDiff,
  getRunnerDeclaredNoRepositoryCheckedOut,
} from "../bootstrap/state.js";
import { ge } from "./identity.js";
import { isOnForeignMount } from "./networkPaths.js";
import { isChildSession } from "./sessionShape.js";

/**
 * Windows 映射盘路径与其网络共享路径（同一共享时）。
 */
//@ chunk-4vzb3taj.js:458-672 placement
function mappedDriveSpellings(e) {
  if (!/^[A-Za-z]:[\\/]/.test(e)) return [];
  let r = Tm(e.slice(0, 3));
  if (r == null || !Qn(r)) return [];
  let n = Tm(e);
  if (n == null || !Qn(n)) return [];
  let t = uncHostOf(r),
    o = uncHostOf(n);
  if (t == null || o == null || t !== o) return [];
  return [e, n];
}
//@ chunk-4vzb3taj.js:672-760 placement
function mn() {
  return env.CLAUDE_CODE_REMOTE === !0 && env.CLAUDE_CODE_ENVIRONMENT_KIND === void 0;
}
//@ chunk-4vzb3taj.js:760-791 placement
function hSr() {
  return mn() || !1;
}
//@ chunk-4vzb3taj.js:791-879 placement
function op() {
  return env.CLAUDE_CODE_REMOTE === !0 && env.CLAUDE_CODE_ENVIRONMENT_KIND === "byoc";
}
//@ chunk-4vzb3taj.js:879-911 placement
function uC() {
  return mn() || op();
}
//@ chunk-4vzb3taj.js:911-993 placement
function isSelfHostedRemoteEnvironment() {
  return op() && env.CLAUDE_CODE_REMOTE_ENVIRONMENT_TYPE === "self_hosted";
}
/**
 * 远程会话工作目录同步是否接纳（not_admitted/admitted/moved_directory）。
 */
//@ chunk-4vzb3taj.js:1052-1219 placement
function workingSyncAdmission(e, r) {
  return !(
    e &&
    isSelfHostedRemoteEnvironment() &&
    Boolean(env.CLAUDE_CODE_REMOTE_SESSION_ID) &&
    !env.CLAUDE_CODE_DISABLE_WORKING_SYNC
  )
    ? "not_admitted"
    : r === INITIAL_CWD_KEY
      ? "admitted"
      : "moved_directory";
}
//@ chunk-4vzb3taj.js:1219-1253 placement
function ere() {
  return op() && getRunnerDeclaredNestedRepositoryDiff();
}
//@ chunk-4vzb3taj.js:1253-1279 placement
function kMt() {
  return INITIAL_CWD_KEY;
}
//@ chunk-4vzb3taj.js:1279-1320 placement
var s = ge(new Map(), (e) => e.clear()),
  u = 60000;
/**
 * 缓存把映射盘路径解析为网络共享路径。
 */
//@ chunk-4vzb3taj.js:1320-1493 placement
function resolveNetworkShareCached(e) {
  let r = s.get(e);
  if (r !== void 0 && (r.share !== void 0 || Date.now() - r.askedAt < u)) return r.share ?? e;
  let n = mappedDriveSpellings(e)[1];
  return (s.set(e, { share: n, askedAt: Date.now() }), n ?? e);
}
//@ chunk-4vzb3taj.js:1493-1541 placement
function rQt(e, r) {
  return isAbsolute(e) && !rc(e) && !isOnForeignMount(e, r);
}
//@ chunk-4vzb3taj.js:1541-1575 placement
function GIi() {
  return op() && getRunnerDeclaredNoRepositoryCheckedOut();
}
//@ chunk-4vzb3taj.js:1575-1638 placement
function vS() {
  return env.CLAUDE_CODE_ENVIRONMENT_KIND === "bridge";
}
//@ chunk-4vzb3taj.js:1638-1672 placement
function Ehe() {
  return vS() && !isChildSession();
}
//@ chunk-4vzb3taj.js:1672-1742 placement
function ySr(e) {
  return e.hostedWorker || (vS() && e.transportPersists !== !1);
}

export {
  mn,
  vS,
  uC,
  op,
  ere,
  workingSyncAdmission,
  GIi,
  kMt,
  resolveNetworkShareCached,
  rQt,
  mappedDriveSpellings,
  isSelfHostedRemoteEnvironment,
  ySr,
  Ehe,
  hSr,
};
