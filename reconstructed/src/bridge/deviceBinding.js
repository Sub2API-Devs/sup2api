/**
 * bridge/deviceBinding.ts
 *
 * 设备绑定（本机为云会话提供工具）的拒绝原因与提示文本（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-s61vbvea.js (24)
 * attribution: placement 24
 */
import path, {
  parse as parse_2,
  parse as parse_3,
  parse as parse_4,
  isAbsolute,
  isAbsolute as isAbsolute_2,
  isAbsolute as isAbsolute_3,
  isAbsolute as isAbsolute_4,
  isAbsolute as isAbsolute_5,
  isAbsolute as isAbsolute_6,
  isAbsolute as isAbsolute_7,
  isAbsolute as isAbsolute_8,
  isAbsolute as isAbsolute_9,
  isAbsolute as isAbsolute_10,
  isAbsolute as isAbsolute_11,
  isAbsolute as isAbsolute_12,
  isAbsolute as isAbsolute_13,
  isAbsolute as isAbsolute_14,
  isAbsolute as isAbsolute_15,
  resolve,
  resolve as resolve_2,
  resolve as resolve_3,
  resolve as resolve_4,
  resolve as resolve_5,
  resolve as resolve_6,
  resolve as resolve_7,
  resolve as resolve_8,
  resolve as resolve_9,
  resolve as resolve_10,
  resolve as resolve_11,
} from "path";
import {
  homedir,
  homedir as homedir_2,
  homedir as homedir_3,
  homedir as homedir_4,
  homedir as homedir_5,
  homedir as homedir_6,
  homedir as homedir_7,
} from "os";
import {
  realpathSync,
  realpathSync as realpathSync_2,
  realpathSync as realpathSync_3,
  realpathSync as realpathSync_4,
  realpathSync as realpathSync_5,
} from "fs";
import { isWslMntRoot } from "../utils/teleport/remoteTaskLabels.js";
import { getClaudeConfigDir } from "../utils/envUtils.js";
import { findCanonicalGitRoot } from "../utils/git.js";
import { getPlatform as getPlatform_2 } from "../utils/platform.js";
import { rc } from "../utils/pathClassification.js";
import { isCaseInsensitivePlatform } from "../utils/pathCaseFolding.js";

/**
 * 设备绑定被拒原因文案表（--project 会话、home 目录、自托管池等）
 */
//@ chunk-s61vbvea.js:493469-496714 placement
var DEVICE_BINDING_REFUSAL_TEXTS = {
    project: "a --project session cannot be bound yet",
    launched_from_home:
      "this folder is never bound because it or its repository is your home directory, is in a hidden folder there, or is another such place \u2014 start from a project folder such as ~/code/my-app",
    endpoint: "the new session-create endpoint is off for this client",
    pool: "self-hosted pool sessions are never bound",
    environment:
      "only sessions in an Anthropic cloud environment can be bound, and this session's environment is not one",
    correlation: "a session with a correlation id is never bound",
    profile:
      "a Console-profile sign-in has no trusted-device token to bind with (the token belongs to a claude.ai login)",
    gate: "the device feature flag was off or unreadable at create time",
    egress: "device traffic is disallowed here, or that check failed",
    account: "no stored claude.ai login on this machine (run /login)",
    account_mismatch: "the host's token is for a different account than this machine's (claude /logout)",
    no_device_proof:
      "no trusted-device token here, and this machine was not given one (an organization that does not require trusted devices gives none; otherwise try again, and --debug logs why)",
    trusted_devices_off:
      "trusted devices are not switched on for this account, so this machine has no device token to bind with",
    enrollment_paused:
      "no trusted-device token here, and enrolling new trusted devices is temporarily disabled; try again later",
    register: "registering this machine as a device failed",
    no_keychain: "this Mac account has no login keychain to keep a device key in",
    limit_reached: "this account has reached its device limit",
    registration_unavailable: "device registration is unavailable to this account",
    device_revoked:
      "this machine was removed from your account's devices on claude.ai (to register it again, run claude --cloud without -p from a project folder here and choose Yes when asked)",
    sign: "signing the bind attestation failed",
    create_refused: "the server refused it (server-side bind flag likely off)",
    target_device_unsupported:
      "the server refused the binding (not turned on for your organization, or not possible in this session's environment)",
    target_device_requires_account:
      "binding needs a claude.ai account login, and this session was created without one",
    invalid_target_device_id: "this machine's stored device id is malformed, so the server rejected it",
    bind_attestation_stale: "this machine's clock is too far off",
    untrusted_device: "the server does not trust this machine's device token",
    bound_session_unattested_write: "the server refused an initial event or field sent with the bind",
    device_unknown: "the server did not recognize this device, even after registering it again",
    silent_drop: "the server accepted the create but ignored the bind",
  },
  JF = {
    session_unreadable: "the session could not be read to check its binding (re-attach to retry)",
    other_device: "this session is bound to another device (a different machine or config directory)",
    no_device_here: "this machine holds no device registration for this account",
    local_device_unreadable: "this machine's device registration could not be read",
    session_unbound: "this session was created without a device binding",
    device_tools_off: "device tools are switched off for this client",
  },
  QF = { ...DEVICE_BINDING_REFUSAL_TEXTS, ...JF };
//@ chunk-s61vbvea.js:496714-496757 placement
function bti(e) {
  return Object.hasOwn(DEVICE_BINDING_REFUSAL_TEXTS, e);
}
//@ chunk-s61vbvea.js:496757-496966 placement
function formatUnboundSessionNotice(e) {
  return e === "trusted_devices_off"
    ? `This session began unbound (no local commands): ${GNe(e)}`
    : `Start a new session to attach this machine; this one began unbound (no local commands): ${GNe(e)}`;
}
//@ chunk-s61vbvea.js:496966-497166 placement
function classifyDeviceBindingBlocker(e) {
  switch (e) {
    case "project":
    case "launched_from_home":
    case "endpoint":
    case "pool":
    case "environment":
    case "target_device_unsupported":
    case "correlation":
    case "profile":
      return !1;
    default:
      return !0;
  }
}
//@ chunk-s61vbvea.js:497166-497195 placement
function GNe(e) {
  return QF[e];
}
//@ chunk-s61vbvea.js:497195-497250 placement
var qf = "Not bound to this machine (local tools off): ";
//@ chunk-s61vbvea.js:497250-497351 placement
function isDeviceRevokedError(e) {
  let n = e === "device_revoked" ? "removed from claude.ai devices" : GNe(e);
  return `${qf}${n}`;
}
//@ chunk-s61vbvea.js:497351-497479 placement
var LOCAL_TOOLS_OFF_PREFIX = "Local tools off in this window: ",
  RUNS_IN_APPROVED_FOLDER_TEXT = "run in this session's approved folder, not in this window",
  LOCAL_TOOLS_IN_APPROVED_FOLDER_TEXT = `Local tools ${RUNS_IN_APPROVED_FOLDER_TEXT}`;
/**
 * 按设备绑定状态（detached / other_state / unreadable / unstated）给出"本地工具为何不可用"的说明尾句；n 为"重新开会话"的位置描述。
 */
//@ chunk-s61vbvea.js:497479-497841 placement
function describeBindingState(e, n) {
  switch (e) {
    case "detached":
      return `this session runs them in its approved folder. If that folder is disconnected, ask Claude to use it again; or start a new session ${n}`;
    case "other_state":
    case "unreadable":
    case "unstated":
      return "Claude Code cannot tell how this session is linked to this computer. Attaching again or updating Claude Code may help";
  }
}
/**
 * 附着设备时的状态提示：已连接/已请求时说明工具在批准目录运行（不弹 toast），否则拼"本窗口本地工具关闭"前缀和原因，非 detached 时弹 toast。
 */
//@ chunk-s61vbvea.js:497841-497967 placement
function getDeviceBindingStatusNotice(e) {
  return e === "connected" || e === "requested"
    ? { text: LOCAL_TOOLS_IN_APPROVED_FOLDER_TEXT, toast: !1 }
    : { text: `${LOCAL_TOOLS_OFF_PREFIX}${describeBindingState(e, "here")}`, toast: e !== "detached" };
}
/**
 * 裸云会话附着时的提示：未连接时返回"此客户端不为该会话运行工具"及原因，已连接返回 undefined。
 */
//@ chunk-s61vbvea.js:497967-498104 placement
function getBareSessionNoToolsNotice(e) {
  return e === "connected" || e === "requested"
    ? void 0
    : `This client runs no tools for this session: ${describeBindingState(e, "from this folder")}`;
}
//@ chunk-s61vbvea.js:498104-498394 placement
function formatDeviceNotBoundMessage(e) {
  if (e.startsWith(qf)) return `not bound to this computer: ${e.slice(qf.length)}`;
  if (e.startsWith(LOCAL_TOOLS_OFF_PREFIX))
    return `off in this window: ${e.slice(LOCAL_TOOLS_OFF_PREFIX.length)}`;
  if (e === LOCAL_TOOLS_IN_APPROVED_FOLDER_TEXT) return RUNS_IN_APPROVED_FOLDER_TEXT;
  for (let n of ["Start ", "This "]) if (e.startsWith(n)) return `${n.toLowerCase()}${e.slice(n.length)}`;
  return e;
}
//@ chunk-s61vbvea.js:498394-498428 placement
var REMOTE_DEVICE_NOT_BOUND = "remote-device-not-bound";
/**
 * 生成"远程设备未绑定"的高优先级警告通知（30 秒）。
 */
//@ chunk-s61vbvea.js:498428-498530 placement
function createDeviceNotBoundNotification(e) {
  return {
    key: REMOTE_DEVICE_NOT_BOUND,
    kind: "warning",
    text: e,
    color: "warning",
    priority: "high",
    timeoutMs: 30000,
  };
}
//@ chunk-s61vbvea.js:498530-498563 placement
async function Tti(e, n) {
  return !1;
}
//@ chunk-s61vbvea.js:498563-498587 placement
function otr() {
  return {};
}
/**
 * 判断工作目录是否根目录、home 目录或配置目录，这些目录不能绑定设备
 */
//@ chunk-s61vbvea.js:498732-499073 placement
function classifyBindingFolder(e, n = {}, r = sH(e)) {
  let mapped = [e, ...r].map(resolvePathCached);
  if (mapped.some((x) => x === parse_4(x).root || isWslMntRoot(x))) return "folder_is_root";
  let h = isAbsolute_13(n.home ?? homedir_5()),
    y = isAbsolute_13(n.configHome ?? getClaudeConfigDir()),
    {
      home: home,
      configHome: configHome,
      foldCase: foldCase,
    } = resolveBindingRoots({ ...n, folder: mapped[0] });
  for (let x of mapped) {
    if (h && isPathInside(x, home, foldCase)) return "folder_is_home";
    if (y && (isPathInside(x, configHome, foldCase) || isPathInside(configHome, x, foldCase)))
      return "folder_holds_config";
  }
  return null;
}
//@ chunk-s61vbvea.js:499073-499148 placement
function sH(e, n = findCanonicalGitRoot) {
  let r = resolvePathCached(e),
    s = n(e) ?? e,
    h = n(r) ?? r;
  return s === h ? [h] : [s, h];
}
//@ chunk-s61vbvea.js:499148-499209 placement = setCwdState (1)
function foldCaseIf(e, n) {
  return n ? e.normalize("NFC").toLowerCase() : e;
}
//@ chunk-s61vbvea.js:499209-499342 placement
function isPathInside(e, n, r, { isAbsolute: isAbsolute, relative: relative, sep: sep } = path) {
  let S = relative(foldCaseIf(e, r), foldCaseIf(n, r));
  return S === "" || (S !== ".." && !S.startsWith(".." + sep) && !isAbsolute(S));
}
//@ chunk-s61vbvea.js:499342-499399 placement = setCwdState (0.757)
function nfcOnMacos(cwd) {
  return getPlatform_2() === "macos" ? cwd.normalize("NFC") : cwd;
}
//@ chunk-s61vbvea.js:499399-499633 placement
function realpathSafe(e, n = (r) => r()) {
  if (rc(e))
    return {
      unresolved: Object.assign(Error("realpath would read a backslash in this path as a separator"), {
        code: "EBACKSLASH",
      }),
    };
  try {
    return { resolved: nfcOnMacos(n(() => realpathSync_5.native(e))) };
  } catch (error) {
    return { unresolved: error };
  }
}
//@ chunk-s61vbvea.js:499633-499702 placement = getResolvedDir (0.798)
function resolvePathCached(filePath) {
  let n = realpathSafe(filePath);
  return "resolved" in n ? n.resolved : nfcOnMacos(resolve_8(filePath));
}
//@ chunk-s61vbvea.js:499702-499888 placement
function resolveBindingRoots({
  folder: e,
  home: n = homedir_5(),
  configHome: r = getClaudeConfigDir(),
} = {}) {
  let s = { home: resolvePathCached(n), configHome: resolvePathCached(r) };
  return {
    ...s,
    foldCase: [e, s.home, s.configHome].some((h) => isCaseInsensitivePlatform(h)),
    wholeDrive: e !== void 0 && isWslMntRoot(e),
  };
}

export {
  isDeviceRevokedError,
  formatDeviceNotBoundMessage,
  createDeviceNotBoundNotification,
  REMOTE_DEVICE_NOT_BOUND,
  classifyDeviceBindingBlocker,
  Tti,
  otr,
  GNe,
  getBareSessionNoToolsNotice,
  formatUnboundSessionNotice,
  classifyBindingFolder,
  bti,
  getDeviceBindingStatusNotice,
};
