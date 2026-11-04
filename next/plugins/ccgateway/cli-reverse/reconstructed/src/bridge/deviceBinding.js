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
import path, { parse, isAbsolute, resolve } from "path";
import { homedir } from "os";
import { realpathSync } from "fs";
import { isWslMntRoot } from "../utils/teleport/remoteTaskLabels.js";
import { getClaudeConfigDir } from "../utils/envUtils.js";
import { findCanonicalGitRoot } from "../utils/git.js";
import { getPlatform as getPlatform_2 } from "../utils/platform.js";
import { hasBackslash } from "../utils/pathClassification.js";
import { isCaseInsensitivePlatform } from "../utils/pathCaseFolding.js";

//@ chunk-s61vbvea.js:493469-496714 placement
/**
 * 设备绑定被拒原因文案表（--project 会话、home 目录、自托管池等）
 */
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
};
var DEVICE_BINDING_STATUS_REFUSAL_TEXTS = {
  session_unreadable: "the session could not be read to check its binding (re-attach to retry)",
  other_device: "this session is bound to another device (a different machine or config directory)",
  no_device_here: "this machine holds no device registration for this account",
  local_device_unreadable: "this machine's device registration could not be read",
  session_unbound: "this session was created without a device binding",
  device_tools_off: "device tools are switched off for this client",
};
var DEVICE_BINDING_REFUSAL_TEXTS_ALL = {
  ...DEVICE_BINDING_REFUSAL_TEXTS,
  ...DEVICE_BINDING_STATUS_REFUSAL_TEXTS,
};
//@ chunk-s61vbvea.js:496714-496757 placement
/**
 * 判断某个字符串是否属于已知的设备绑定拒绝原因（用于决定是否按远端未绑定提示）。
 */
function isKnownDeviceBindingRefusal(refusalText) {
  return Object.hasOwn(DEVICE_BINDING_REFUSAL_TEXTS, refusalText);
}
//@ chunk-s61vbvea.js:496757-496966 placement
function formatUnboundSessionNotice(reason) {
  return reason === "trusted_devices_off"
    ? `This session began unbound (no local commands): ${deviceBindingRefusalText(reason)}`
    : `Start a new session to attach this machine; this one began unbound (no local commands): ${deviceBindingRefusalText(reason)}`;
}
//@ chunk-s61vbvea.js:496966-497166 placement
function classifyDeviceBindingBlocker(error) {
  switch (error) {
    case "project":
    case "launched_from_home":
    case "endpoint":
    case "pool":
    case "environment":
    case "target_device_unsupported":
    case "correlation":
    case "profile":
      return false;
    default:
      return true;
  }
}
//@ chunk-s61vbvea.js:497166-497195 placement
/**
 * 取设备绑定拒绝原因对应的用户可见文案（合并两组合文本）；未知原因返回 undefined。
 */
function deviceBindingRefusalText(refusalText) {
  return DEVICE_BINDING_REFUSAL_TEXTS_ALL[refusalText];
}
//@ chunk-s61vbvea.js:497195-497250 placement
var NOT_BOUND_PREFIX = "Not bound to this machine (local tools off): ";
//@ chunk-s61vbvea.js:497250-497351 placement
function isDeviceRevokedError(refusalText) {
  let detail =
    refusalText === "device_revoked"
      ? "removed from claude.ai devices"
      : deviceBindingRefusalText(refusalText);
  return `${NOT_BOUND_PREFIX}${detail}`;
}
//@ chunk-s61vbvea.js:497351-497479 placement
var LOCAL_TOOLS_OFF_PREFIX = "Local tools off in this window: ";
var RUNS_IN_APPROVED_FOLDER_TEXT = "run in this session's approved folder, not in this window";
var LOCAL_TOOLS_IN_APPROVED_FOLDER_TEXT = `Local tools ${RUNS_IN_APPROVED_FOLDER_TEXT}`;
//@ chunk-s61vbvea.js:497479-497841 placement
/**
 * 按设备绑定状态（detached / other_state / unreadable / unstated）给出"本地工具为何不可用"的说明尾句；n 为"重新开会话"的位置描述。
 */
function describeBindingState(state, suffix) {
  switch (state) {
    case "detached":
      return `this session runs them in its approved folder. If that folder is disconnected, ask Claude to use it again; or start a new session ${suffix}`;
    case "other_state":
    case "unreadable":
    case "unstated":
      return "Claude Code cannot tell how this session is linked to this computer. Attaching again or updating Claude Code may help";
  }
}
//@ chunk-s61vbvea.js:497841-497967 placement
/**
 * 附着设备时的状态提示：已连接/已请求时说明工具在批准目录运行（不弹 toast），否则拼"本窗口本地工具关闭"前缀和原因，非 detached 时弹 toast。
 */
function getDeviceBindingStatusNotice(state) {
  return state === "connected" || state === "requested"
    ? {
        text: LOCAL_TOOLS_IN_APPROVED_FOLDER_TEXT,
        toast: false,
      }
    : {
        text: `${LOCAL_TOOLS_OFF_PREFIX}${describeBindingState(state, "here")}`,
        toast: state !== "detached",
      };
}
//@ chunk-s61vbvea.js:497967-498104 placement
/**
 * 裸云会话附着时的提示：未连接时返回"此客户端不为该会话运行工具"及原因，已连接返回 undefined。
 */
function getBareSessionNoToolsNotice(state) {
  return state === "connected" || state === "requested"
    ? undefined
    : `This client runs no tools for this session: ${describeBindingState(state, "from this folder")}`;
}
//@ chunk-s61vbvea.js:498104-498394 placement
function formatDeviceNotBoundMessage(message) {
  if (message.startsWith(NOT_BOUND_PREFIX))
    return `not bound to this computer: ${message.slice(NOT_BOUND_PREFIX.length)}`;
  if (message.startsWith(LOCAL_TOOLS_OFF_PREFIX))
    return `off in this window: ${message.slice(LOCAL_TOOLS_OFF_PREFIX.length)}`;
  if (message === LOCAL_TOOLS_IN_APPROVED_FOLDER_TEXT) return RUNS_IN_APPROVED_FOLDER_TEXT;
  for (let prefix of ["Start ", "This "])
    if (message.startsWith(prefix)) return `${prefix.toLowerCase()}${message.slice(prefix.length)}`;
  return message;
}
//@ chunk-s61vbvea.js:498394-498428 placement
var REMOTE_DEVICE_NOT_BOUND = "remote-device-not-bound";
//@ chunk-s61vbvea.js:498428-498530 placement
/**
 * 生成"远程设备未绑定"的高优先级警告通知（30 秒）。
 */
function createDeviceNotBoundNotification(text) {
  return {
    key: REMOTE_DEVICE_NOT_BOUND,
    kind: "warning",
    text,
    color: "warning",
    priority: "high",
    timeoutMs: 30000,
  };
}
//@ chunk-s61vbvea.js:498530-498563 placement
/**
 * 本构建里恒返回 false：--project 会话不能绑定设备。
 */
async function isProjectSessionBindable(session, options) {
  return false;
}
//@ chunk-s61vbvea.js:498563-498587 placement
/**
 * 返回空对象，作为设备绑定判定的占位事实集合。
 */
function emptyBindingFacts() {
  return {};
}
//@ chunk-s61vbvea.js:498732-499073 placement
/**
 * 判断工作目录是否根目录、home 目录或配置目录，这些目录不能绑定设备
 */
function classifyBindingFolder(folder, rootAnchors = {}, candidates = bindingFolderCandidates(folder)) {
  let mapped = [folder, ...candidates].map(resolvePathCached);
  if (mapped.some((path) => path === parse(path).root || isWslMntRoot(path))) return "folder_is_root";
  let homeConfigured = isAbsolute(rootAnchors.home ?? homedir());
  let configHomeConfigured = isAbsolute(rootAnchors.configHome ?? getClaudeConfigDir());
  let { home, configHome, foldCase } = resolveBindingRoots({
    ...rootAnchors,
    folder: mapped[0],
  });
  for (let path of mapped) {
    if (homeConfigured && isPathInside(path, home, foldCase)) return "folder_is_home";
    if (
      configHomeConfigured &&
      (isPathInside(path, configHome, foldCase) || isPathInside(configHome, path, foldCase))
    )
      return "folder_holds_config";
  }
  return null;
}
//@ chunk-s61vbvea.js:499073-499148 placement
function bindingFolderCandidates(filePath, findGitRoot = findCanonicalGitRoot) {
  let path = resolvePathCached(filePath);
  let rawRoot = findGitRoot(filePath) ?? filePath;
  let resolvedRoot = findGitRoot(path) ?? path;
  return rawRoot === resolvedRoot ? [resolvedRoot] : [rawRoot, resolvedRoot];
}
//@ chunk-s61vbvea.js:499148-499209 placement (2.1.88 match: setCwdState, 1)
function foldCaseIf(cwd, foldCase) {
  return foldCase ? cwd.normalize("NFC").toLowerCase() : cwd;
}
//@ chunk-s61vbvea.js:499209-499342 placement
function isPathInside(cwd, cwd_2, foldCase, { isAbsolute, relative, sep } = path) {
  let relativePath = relative(foldCaseIf(cwd, foldCase), foldCaseIf(cwd_2, foldCase));
  return (
    relativePath === "" ||
    (relativePath !== ".." && !relativePath.startsWith(".." + sep) && !isAbsolute(relativePath))
  );
}
//@ chunk-s61vbvea.js:499342-499399 placement (2.1.88 match: setCwdState, 0.757)
function nfcOnMacos(cwd) {
  return getPlatform_2() === "macos" ? cwd.normalize("NFC") : cwd;
}
//@ chunk-s61vbvea.js:499399-499633 placement
function realpathSafe(filePath, readRealpath = (run) => run()) {
  if (hasBackslash(filePath))
    return {
      unresolved: Object.assign(Error("realpath would read a backslash in this path as a separator"), {
        code: "EBACKSLASH",
      }),
    };
  try {
    return {
      resolved: nfcOnMacos(readRealpath(() => realpathSync.native(filePath))),
    };
  } catch (error) {
    return {
      unresolved: error,
    };
  }
}
//@ chunk-s61vbvea.js:499633-499702 placement (2.1.88 match: getResolvedDir, 0.798)
function resolvePathCached(filePath) {
  let result = realpathSafe(filePath);
  return "resolved" in result ? result.resolved : nfcOnMacos(resolve(filePath));
}
//@ chunk-s61vbvea.js:499702-499888 placement
function resolveBindingRoots({
  folder,
  home: filePath = homedir(),
  configHome: filePath_2 = getClaudeConfigDir(),
} = {}) {
  let roots = {
    home: resolvePathCached(filePath),
    configHome: resolvePathCached(filePath_2),
  };
  return {
    ...roots,
    foldCase: [folder, roots.home, roots.configHome].some((path) => isCaseInsensitivePlatform(path)),
    wholeDrive: folder !== undefined && isWslMntRoot(folder),
  };
}
export {
  isDeviceRevokedError,
  formatDeviceNotBoundMessage,
  createDeviceNotBoundNotification,
  REMOTE_DEVICE_NOT_BOUND,
  classifyDeviceBindingBlocker,
  isProjectSessionBindable,
  emptyBindingFacts,
  deviceBindingRefusalText,
  getBareSessionNoToolsNotice,
  formatUnboundSessionNotice,
  classifyBindingFolder,
  isKnownDeviceBindingRefusal,
  getDeviceBindingStatusNotice,
};
