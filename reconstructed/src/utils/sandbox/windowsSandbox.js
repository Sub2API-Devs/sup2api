/**
 * utils/sandbox/windowsSandbox.ts
 *
 * 2.1.316 新增：Windows 沙箱（srt-win）：开关、一次性安装提示、文件夹 ACL 授权给沙箱组、deny 列表写入与校验
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-fq0cr76a.js (52)
 * attribution: placement 52
 */
import { win32 } from "path";
import { lstat } from "fs/promises";
import { identity as identity_2 } from "../identity.js";
import { getPlatform } from "../platform.js";
import { env } from "../env.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { SRT_WIN_DISPATCH_ARG1 } from "../../../vendor/@anthropic-ai/sandbox-runtime/dist/sandbox/windows-sandbox-utils.js";
import { TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS, errorMessage } from "../errors.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, _enum, E, union, literal, string, zg, array } from "../../../vendor/zod/v4/classic/schemas.js";
import { logForDebugging } from "../debug.js";
import { stripExtendedPathPrefix } from "../../../vendor/@anthropic-ai/sandbox-runtime/dist/sandbox/sandbox-utils.js";
import { isUncOrDevicePath } from "../pathClassification.js";
import { logFeatureSad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { execFileNoThrow } from "../execFileNoThrow.js";
import { systemRootDir } from "../claudeInChrome/windowsAppPaths.js";
import { realpathNativeLongSync } from "../fsJunctions.js";
import { reportSandboxErrorUnderStandIn } from "./sandboxErrors.js";
import { jsonStringify, jsonParse } from "../slowOperations.js";
import { normalizeGitPathArg } from "../permissions/filesystem.js";
import { arraysEqualByIndex, isSameArray } from "../findExecutable.js";

//@ chunk-fq0cr76a.js:858597-858672 placement
var REGEX_TOKEN_OR_CLASS_RE = /\\.|\[(?:\\.|[^\]\\])*\]/gs;
var LITERAL_REGEX_RE = /^(?:\\.|[^\\.*+?^$()[\]{}|])*$/s;
//@ chunk-fq0cr76a.js:858672-858838 placement
/**
 * 修正正则中的字符类：无法编译的方括号片段转义为字面量。
 */
function escapeInvalidCharClasses(e) {
  return e.replace(REGEX_TOKEN_OR_CLASS_RE, (n) => {
    if (n.startsWith("\\") || !LITERAL_REGEX_RE.test(n.slice(1, -1))) return n;
    try {
      new RegExp(n);
      return n;
    } catch {
      return `\\[${n.slice(1, -1)}\\]`;
    }
  });
}
//@ chunk-fq0cr76a.js:858838-858886 placement
var windowsSandboxToggleState = identity_2(
  {
    hasBeenOn: false,
  },
  (e) => {
    e.hasBeenOn = false;
  },
);
//@ chunk-fq0cr76a.js:858886-859049 placement
/**
 * Windows 沙箱开关（CLAUDE_CODE_NANKEEN_KESTREL / tengu_nankeen_kestrel）。
 */
function isWindowsSandboxEnabled() {
  if (getPlatform() !== "windows") return false;
  if (env.CLAUDE_CODE_NANKEEN_KESTREL) {
    windowsSandboxToggleState.hasBeenOn = true;
    return true;
  }
  let featureValue_CACHED_MAY_BE_STALE = getFeatureValue_CACHED_MAY_BE_STALE("tengu_nankeen_kestrel", false);
  windowsSandboxToggleState.hasBeenOn ||= featureValue_CACHED_MAY_BE_STALE;
  return featureValue_CACHED_MAY_BE_STALE;
}
//@ chunk-fq0cr76a.js:859049-859084 placement
/**
 * hasWindowsSandboxBeenOn：Windows 沙箱是否曾启用。
 */
function hasWindowsSandboxBeenOn() {
  return windowsSandboxToggleState.hasBeenOn;
}
//@ chunk-fq0cr76a.js:859084-859112 placement
var CLAUDECODESANDBOX = "ClaudeCodeSandbox";
//@ chunk-fq0cr76a.js:859112-859172 placement
/**
 * rgRunner：用 Bun 直接执行脚本的启动信息。
 */
function rgRunner() {
  return {
    exe: process.execPath,
    prependArgs: [SRT_WIN_DISPATCH_ARG1],
  };
}
//@ chunk-fq0cr76a.js:859172-859369 placement
function formatProfileForgetHint() {
  return `To take it back, close every Claude Code session and run "${process.execPath}" ${SRT_WIN_DISPATCH_ARG1} profile forget in a terminal; sandboxed commands then read nothing in your user profile.`;
}
//@ chunk-fq0cr76a.js:859369-859514 placement
var SECLOGON_ACCESS_DENIED_RE =
  /(CreateProcessWithLogonW\([^)\n]{0,256}\): .{0,512}?\(0x80070005\)) \u2014 ensure the Secondary Logon service \(seclogon\) is running\./;
//@ chunk-fq0cr76a.js:859514-859547 placement
/**
 * isSeclogonAccessDenied：seclogon 访问被拒。
 */
function isSeclogonAccessDenied(e) {
  return SECLOGON_ACCESS_DENIED_RE.test(e);
}
//@ chunk-fq0cr76a.js:859547-862760 placement
/**
 * 生成 Windows 沙箱不可用时的补救说明（/sandbox install、管理员信任 CA 等，约 3 KB）。
 */
function describeWindowsSandboxRemedy(e, n) {
  if (getPlatform() !== "windows") return e;
  let replaced = e.replace(/\s*Windows sandbox needs a one-time install[\s\S]*$/, "");
  let s = n?.omitCcRemedy ? "" : "Run /sandbox install, or see https://code.claude.com/docs/en/sandboxing.";
  let h = n?.omitCcRemedy
    ? ""
    : "Ask your administrator to trust the sandbox CA \u2014 see https://code.claude.com/docs/en/sandboxing.";
  let match =
    /do(?:es)? not match network\.allowLocalBinding[\s\S]*?installed: (?:loopback )?(open|closed); configured: (?:loopback )?(open|closed)/.exec(
      replaced,
    );
  if (match)
    return `sandbox.network.allowLocalBinding asks for local connections ${match[2] === "open" ? "on" : "off"}, but the sandbox on this machine was set up with them ${match[1] === "open" ? "on" : "off"}. Changing that needs set-up again (one elevation prompt). ${s}`.trimEnd();
  let match_2 =
    /network\.allowLocalBinding asks for loopback (open|closed), but this session verified the network fence with loopback (open|closed)/.exec(
      replaced,
    );
  if (match_2)
    return `sandbox.network.allowLocalBinding now asks for local connections ${match_2[1] === "open" ? "on" : "off"}, but this session started with them ${match_2[2] === "open" ? "on" : "off"}, and on Windows that is fixed when the sandbox is set up. Run /sandbox install to change the set-up, then restart Claude Code.`;
  let trimmed = (replaced === "" ? "Windows sandbox needs a one-time install." : replaced)
    .replace(/Re-run `srt-win install`[^.]*\./g, s)
    .replace(/Re-run the install to upgrade it in place[\s\S]*?directly\./g, s)
    .replace(
      /Use that release, or replace its install with this one: `srt-win\.exe install[^`]*`\./g,
      "Use that release of Claude Code.",
    )
    .replace(/\s*Nothing is granted or run until then\./g, "")
    .replace(
      /Re-run the install for this configuration[\s\S]*?npx (?:@anthropic-ai\/)?sandbox-runtime windows-install[^\n]*/g,
      s,
    )
    .replace(/Through this package: `npx (?:@anthropic-ai\/)?sandbox-runtime windows-install[^`]*`\./g, s)
    .replace(
      /Call grantWindowsProfileRead\(\)[\s\S]*?initialize\(\) does neither itself\./g,
      n?.omitCcRemedy ? "" : `${s} ${formatProfileForgetHint()}`,
    )
    .replace(/[Rr]un `npx (?:@anthropic-ai\/)?sandbox-runtime windows-install`[^.]*\./g, s)
    .replace(/[Rr]un `srt-win user trust-ca [^`]*`[^.]*\./g, h)
    .replace(new RegExp(SECLOGON_ACCESS_DENIED_RE, "g"), "$1")
    .replaceAll("npx sandbox-runtime ", "npx @anthropic-ai/sandbox-runtime ")
    .replace(/\.\s*\.(?!\.)/g, ".")
    .replace(/  +/g, " ")
    .trim();
  if (!isSeclogonAccessDenied(e)) return trimmed;
  let w = `Windows refused to start this copy of Claude Code (${process.execPath}) as the sandbox account`;
  if (n?.programPermissionAdded)
    return `${w}, even though Claude Code gave the sandbox-runtime-users group read and execute permission on that file. Security software or a Windows policy may be blocking it; ask your administrator. (Details: ${trimmed})`;
  let R = /[\\/]WindowsApps[\\/]/i.test(process.execPath)
    ? "Permissions inside a Windows app package cannot be changed, so use"
    : `Its owner or an administrator can: in PowerShell or Command Prompt (not Git Bash, which rewrites /grant), run icacls "${process.execPath}" /grant sandbox-runtime-users:RX (then restart Claude Code). Otherwise use`;
  return `${w}, and Claude Code ${n?.programPermissionAdded === false ? "could not give" : "did not try to give"} the sandbox-runtime-users group read and execute permission on that file. ${R} a copy of Claude Code on a local disk where every user can run it, such as under Program Files. (Details: ${trimmed})`;
}
//@ chunk-fq0cr76a.js:862821-862915 placement
var MAX_ACL_BYTES = 131072;
var MAX_ACL_ENTRIES_BYTES = 262144;
var MAX_ACL_CHOWN_ATTEMPTS = 6;
var NATIVE_TOOL_STEPS = ["open_to_read", "open_to_write", "final_path", "read", "write"];
//@ chunk-fq0cr76a.js:862915-863085 placement
class WindowsFolderSecurityError extends TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS {
  step;
  windowsError;
  constructor(e, n) {
    super(`${e} failed with Windows error ${n}`, "a call on folder permissions failed");
    this.step = e;
    this.windowsError = n;
  }
}
//@ chunk-fq0cr76a.js:863085-863206 placement
class PathLeadsElsewhereError extends TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS {
  reached;
  constructor(finalPath) {
    super(`the path leads to ${finalPath}`, "a path led to another folder");
    this.reached = finalPath;
  }
}
//@ chunk-fq0cr76a.js:863206-863258 placement
var nativeToolErrorSchema = DoctorLazy(() =>
  u({
    step: _enum(NATIVE_TOOL_STEPS),
    windowsError: E(),
  }),
);
var nativeToolErrorPayload;
//@ chunk-fq0cr76a.js:863258-863642 placement
function getWindowsFolderSecurity() {
  if (getPlatform() !== "windows") return null;
  if (nativeToolErrorPayload === undefined) {
    let windowsFolderSecurity = typeof Bun === "undefined" ? undefined : Bun.ant?.windowsFolderSecurity;
    if (windowsFolderSecurity === undefined) {
      logForDebugging(
        "[win32-folder-security] this runtime has no Bun.ant.windowsFolderSecurity, so folder permissions can be neither read nor changed. Run Claude Code on the @anthropic-ai/bun-internal version pinned in package.json.",
      );
      nativeToolErrorPayload = null;
    } else nativeToolErrorPayload = toExtendedLengthPath(windowsFolderSecurity);
  }
  return nativeToolErrorPayload;
}
//@ chunk-fq0cr76a.js:863642-864073 placement
function toExtendedLengthPath(windowsFolderSecurity) {
  return {
    open(n, r) {
      let { handle, finalPath } = withFolderSecurityError(() =>
        windowsFolderSecurity.open(n, (r & MAX_ACL_ENTRIES_BYTES) !== 0),
      );
      try {
        if (lowerAscii(finalPath) !== lowerAscii(`\\\\?\\${win32.resolve(n)}`))
          throw new PathLeadsElsewhereError(finalPath);
        return BigInt(handle);
      } catch (error) {
        windowsFolderSecurity.close(handle);
        throw error;
      }
    },
    readPermissions(n) {
      if (isOutOfUint32Range(n)) throw new WindowsFolderSecurityError("read", MAX_ACL_CHOWN_ATTEMPTS);
      return withFolderSecurityError(() => windowsFolderSecurity.readPermissions(Number(n)));
    },
    writePermissions(n, r) {
      if (isOutOfUint32Range(n)) throw new WindowsFolderSecurityError("write", MAX_ACL_CHOWN_ATTEMPTS);
      withFolderSecurityError(() => windowsFolderSecurity.writePermissions(Number(n), r));
    },
    close(n) {
      if (!isOutOfUint32Range(n)) windowsFolderSecurity.close(Number(n));
    },
  };
}
//@ chunk-fq0cr76a.js:864073-864193 placement
function withFolderSecurityError(e) {
  try {
    return e();
  } catch (error) {
    let { data: r } = nativeToolErrorSchema().safeParse(error);
    throw r === undefined ? error : new WindowsFolderSecurityError(r.step, r.windowsError);
  }
}
//@ chunk-fq0cr76a.js:864193-864256 placement
function lowerAscii(finalPath) {
  return finalPath.replace(/[A-Z]/g, (n) => n.toLowerCase());
}
//@ chunk-fq0cr76a.js:864256-864299 placement
function isOutOfUint32Range(e) {
  return e <= 0n || e > 0xffffffffn;
}
//@ chunk-fq0cr76a.js:864367-864404 placement
/**
 * USER_SID_RE：Windows 用户 SID 格式。
 */
var USER_SID_RE = /^S-1-5-21-\d+-\d+-\d+-\d+$/;
//@ chunk-fq0cr76a.js:864404-865519 placement
/**
 * 让沙箱组能读取 Claude Code 可执行文件（应用包内无法修改时说明）。
 */
async function grantExecutableReadToSandboxGroup({ exePath, previous, getUserStatus }) {
  let s = stripExtendedPathPrefix(exePath);
  if (getPlatform() !== "windows" || isUncOrDevicePath(s) || !win32.isAbsolute(s)) return;
  try {
    let h = await lstat(s, {
      bigint: true,
    });
    let y = `${h.dev}:${h.ino}:${h.size}:${h.mtimeNs}`;
    if (y === previous?.file) return previous;
    if (!h.isFile()) {
      logForDebugging(`[sandbox] ${s} is not a regular file; its permissions are left alone`);
      logFeatureSad("sandbox_windows_exe_grant", "not_a_regular_file");
      return {
        file: y,
        added: false,
      };
    }
    let userStatus = await getUserStatus();
    if (!userStatus.provisioned) return;
    let S = userStatus.groupSid ?? userStatus.sid;
    if (S === undefined || !USER_SID_RE.test(S)) {
      logFeatureSad("sandbox_windows_exe_grant", "unexpected_sid");
      return {
        file: y,
        added: false,
      };
    }
    let w = await execFileNoThrow(
      win32.join(systemRootDir(), "System32", "icacls.exe"),
      [s, "/grant", `*${S}:(RX)`, "/L"],
      {
        timeout: 15000,
        cwd: systemRootDir(),
        preserveOutputOnError: true,
      },
    );
    logForDebugging(
      `[sandbox] icacls ${s} /grant *${S}:(RX) /L exited ${w.exitCode ?? "with no exit code"}${w.error === undefined ? "" : ` (${w.error})`}: ${w.stderr || w.stdout}`,
    );
    if (w.code !== 0) {
      logFeatureSad("sandbox_windows_exe_grant", w.timedOut ? "icacls_timeout" : "icacls_failed");
      return {
        file: y,
        added: false,
      };
    }
    logFeatureOk("sandbox_windows_exe_grant");
    return {
      file: y,
      added: true,
    };
  } catch (error) {
    logForDebugging(`[sandbox] could not let the sandbox account run ${s}: ${errorMessage(error)}`, {
      level: "error",
    });
    return;
  }
}
//@ chunk-fq0cr76a.js:865519-866237 placement
/**
 * MAX_PARENT_FOLDERS：向上查找父目录的上限；ACE_INHERIT_ONLY_MASK：仅继承 ACE 掩码；MAX_ACL_OPERATIONS：ACL 操作上限（同一声明共 15 个绑定）。
 */
var MAX_PARENT_FOLDERS_2 = 32;
var MAX_PARENT_FOLDERS = 128;
var ACE_INHERIT_ONLY_MASK = 1048576;
var MAX_ACL_OPERATIONS = 4;
var MAX_ACL_DESCRIPTOR_BYTES = 256;
var ACE_HEADER_SIZE = 1024;
var ACE_ACCESS_ALLOWED_TYPE = 4096;
var ACE_ACCESS_DENIED_TYPE = 0;
var ACE_INHERITED_FLAG = 8;
var ACE_INHERIT_ONLY_FLAG = 16;
var MAX_ACL_SID_LENGTH = 20;
var ACE_INHERIT_FLAG_BYTE = 8;
var SID_HEADER_SIZE = 8;
var SANDBOX_GROUP_INHERIT_RIGHTS =
  "sandboxed PowerShell commands may start in the drive's root, Node may fail with EPERM, and in Git Bash cd .. and mkdir -p with a full path may fail";
var sandboxGroupAceSpec = {
  mask: MAX_PARENT_FOLDERS_2 | MAX_PARENT_FOLDERS | ACE_INHERIT_ONLY_MASK,
  has: "may already enter, and read the attributes of,",
  name: "the right to enter, and to read the attributes of,",
  without: SANDBOX_GROUP_INHERIT_RIGHTS,
  codePrefix: "",
};
var homeSandboxGroupAceSpec = {
  mask: MAX_PARENT_FOLDERS_2 | ACE_INHERIT_ONLY_MASK,
  has: "already has the traverse and synchronize rights (X and S in icacls) on",
  name: "the traverse and synchronize rights (X and S in icacls) on",
  without:
    "in the sandbox, Node 20 and older releases of Node 22 may fail with EPERM, and in Git Bash mkdir -p with a full path may fail",
  codePrefix: "home_",
};
//@ chunk-fq0cr76a.js:866237-868346 placement
/**
 * 给项目/主目录的上级文件夹添加沙箱组的进入/读属性权限（可用环境变量关闭）。
 */
async function grantParentFoldersToSandboxGroup({ project, home, configHomes, getUserStatus }) {
  if (getPlatform() !== "windows") return;
  try {
    if (env.CLAUDE_CODE_SANDBOX_LEAVE_PARENT_FOLDERS_ALONE) {
      logParentFolderGrant("switched_off", "CLAUDE_CODE_SANDBOX_LEAVE_PARENT_FOLDERS_ALONE is set");
      return;
    }
    let h = describeUnresolvableFullName(home);
    let y = describeUnresolvableFullName(project);
    let b = listIntermediateDirs(h, y);
    if (b.length === 0) {
      if (listIntermediateDirs(home, project).length > 0) {
        logParentFolderGrant(
          "no_folders_by_full_name",
          `by their full names ${project} is ${y} and ${home} is ${h}: on a network path, or the one no longer inside the other`,
        );
        return;
      }
      logForDebugging(
        `[sandbox] ${y} is not a plainly spelled folder inside ${h}, or is on a network path, so no parent folder gets an entry for the sandbox group`,
      );
      return;
    }
    let S = [...configHomes];
    for (let configHome of configHomes) {
      let { real, code } = realpathNativeLongSync(configHome);
      if (real !== undefined) S.push(real);
      else if (code !== "ENOENT") {
        logParentFolderGrant(
          `own_folder_unresolved_${code ?? "no_code"}`,
          `it cannot be told whether Claude Code's own folder ${configHome} is a link: ${code ?? "no error code"}`,
        );
        return;
      }
    }
    let found = S.find((Z) => getRelativeSegments(...resolveWin32Pair(Z, y)) !== undefined);
    if (found !== undefined) {
      logForDebugging(
        `[sandbox] ${y} lies in Claude Code's own folder ${found}, so no parent folder gets an entry for the sandbox group; ${SANDBOX_GROUP_INHERIT_RIGHTS}`,
      );
      return;
    }
    let R = await getUserStatus().catch((error) => {
      logParentFolderGrant("status_unreadable", errorMessage(error));
      return;
    });
    if (R === undefined) return;
    if (!R.provisioned) {
      logForDebugging(
        "[sandbox] there is no sandbox account yet, so no folder gets an entry for the sandbox group",
      );
      return;
    }
    if (R.groupSid === undefined || !USER_SID_RE.test(R.groupSid)) {
      logParentFolderGrant("unexpected_sid", "the sandbox group has no SID of the usual form");
      return;
    }
    let windowsFolderSecurity = getWindowsFolderSecurity();
    if (windowsFolderSecurity === null) {
      logParentFolderGrant("ffi_unavailable", "this runtime has no Bun.ant.windowsFolderSecurity");
      return;
    }
    let O = encodeSidBuffer(R.groupSid);
    let [L, ...V] = b;
    let filtered = V.map((Z) =>
      ensureSandboxGroupEntry(windowsFolderSecurity, Z, O, sandboxGroupAceSpec),
    ).filter((Z) => Z !== undefined);
    if (filtered.includes("differs_after_write")) {
      logForDebugging(
        `[sandbox] ${L} gets no entry for the sandbox group, since a write further down read back differently; ${homeSandboxGroupAceSpec.without}`,
        {
          level: "error",
        },
      );
      filtered.push("home_skipped_after_bad_read_back");
    } else if (L !== undefined) {
      let sandboxGroupEntry = ensureSandboxGroupEntry(windowsFolderSecurity, L, O, homeSandboxGroupAceSpec);
      if (sandboxGroupEntry !== undefined) filtered.push(sandboxGroupEntry);
    }
    let q =
      filtered.find((Z) => Z.endsWith("differs_after_write")) ??
      filtered.find((Z) => !Z.endsWith("no_list")) ??
      filtered[0];
    if (q === undefined) logFeatureOk("sandbox_windows_parent_folder_grant");
    else logFeatureSad("sandbox_windows_parent_folder_grant", q);
  } catch (error) {
    reportSandboxErrorUnderStandIn(error, "parentFoldersNotGranted");
    logParentFolderGrant("unexpected_error", errorMessage(error));
  }
}
//@ chunk-fq0cr76a.js:868346-868567 placement
function listIntermediateDirs(e, n) {
  if (![e, n].every(isDriveAbsolutePath)) return [];
  let [r, s] = resolveWin32Pair(e, n);
  let relativeSegments = getRelativeSegments(r, s);
  if (
    relativeSegments === undefined ||
    relativeSegments[0] === "" ||
    win32.dirname(r) === r ||
    s.split(win32.sep).some((y) => /[. ]$|\0/.test(y))
  )
    return [];
  return relativeSegments.map((relativeSegment, b) => win32.join(r, ...relativeSegments.slice(0, b)));
}
//@ chunk-fq0cr76a.js:868567-868618 placement
function isDriveAbsolutePath(e) {
  return /^[A-Za-z]:[\\/]/.test(stripExtendedPathPrefix(e));
}
//@ chunk-fq0cr76a.js:868618-868826 placement
function describeUnresolvableFullName(e) {
  if (!isDriveAbsolutePath(e)) return e;
  let { real, code } = realpathNativeLongSync(e);
  if (real === undefined)
    logForDebugging(
      `[sandbox] Windows cannot give the full name of ${e} (${code}), so the entries for the sandbox group go by that spelling`,
    );
  return real ?? e;
}
//@ chunk-fq0cr76a.js:868826-868887 placement
function resolveWin32Pair(e, n) {
  return [win32.resolve(stripExtendedPathPrefix(e)), win32.resolve(stripExtendedPathPrefix(n))];
}
//@ chunk-fq0cr76a.js:868887-869001 placement
function getRelativeSegments(e, n) {
  let relativePath = win32.relative(e, n);
  return relativePath.split(win32.sep)[0] === ".." || win32.isAbsolute(relativePath)
    ? undefined
    : relativePath.split(win32.sep);
}
//@ chunk-fq0cr76a.js:869001-869802 placement
function parseAclEntries(e, n, r) {
  let uInt16LE = e.readUInt16LE(2);
  let uInt32LE = e.readUInt32LE(16);
  if ((uInt16LE & MAX_ACL_OPERATIONS) === 0 || uInt32LE === 0) return "no_list";
  let y = uInt32LE + e.readUInt16LE(uInt32LE + 2);
  let uInt16LE_2 = e.readUInt16LE(uInt32LE + 4);
  let S = uInt32LE + ACE_INHERIT_FLAG_BYTE;
  let w;
  for (let j = 0; j < uInt16LE_2; j++) {
    let uInt8 = e.readUInt8(S);
    let uInt8_2 = e.readUInt8(S + 1);
    let uInt16LE = e.readUInt16LE(S + 2);
    if (uInt16LE < SID_HEADER_SIZE || S + uInt16LE > y)
      throw RangeError("a permission entry has an impossible size");
    if (
      uInt8 === ACE_ACCESS_DENIED_TYPE &&
      (uInt8_2 & ACE_INHERITED_FLAG) === 0 &&
      (e.readUInt32LE(S + 4) & r) >>> 0 === r &&
      e.subarray(S + SID_HEADER_SIZE, S + uInt16LE).equals(n)
    )
      return "present";
    if ((uInt8_2 & ACE_INHERIT_ONLY_FLAG) !== 0) w ??= S;
    S += uInt16LE;
  }
  let R = w ?? S;
  let D = Buffer.alloc(SID_HEADER_SIZE + n.length);
  D.writeUInt8(ACE_ACCESS_DENIED_TYPE, 0);
  D.writeUInt16LE(D.length, 2);
  D.writeUInt32LE(r, 4);
  n.copy(D, SID_HEADER_SIZE);
  let O = Buffer.alloc(MAX_ACL_SID_LENGTH);
  e.copy(O, 0, 0, 2);
  O.writeUInt16LE((uInt16LE & ACE_HEADER_SIZE) === 0 ? uInt16LE : uInt16LE | MAX_ACL_DESCRIPTOR_BYTES, 2);
  O.writeUInt32LE(MAX_ACL_SID_LENGTH, 16);
  let buffer = Buffer.concat([O, e.subarray(uInt32LE, R), D, e.subarray(R, S)]);
  buffer.writeUInt16LE(buffer.length - MAX_ACL_SID_LENGTH, MAX_ACL_SID_LENGTH + 2);
  buffer.writeUInt16LE(uInt16LE_2 + 1, MAX_ACL_SID_LENGTH + 4);
  return buffer;
}
//@ chunk-fq0cr76a.js:869802-869925 placement
function isFontWriteConsistent({ before, written, after }) {
  return (
    decodeFont(written).equals(decodeFont(after)) &&
    ((before.readUInt16LE(2) ^ after.readUInt16LE(2)) & (ACE_ACCESS_ALLOWED_TYPE | ACE_HEADER_SIZE)) === 0
  );
}
//@ chunk-fq0cr76a.js:869925-870008 placement = decodeFont (0.816)
function decodeFont(e) {
  let cp = e.readUInt32LE(16);
  return e.subarray(cp, cp + e.readUInt16LE(cp + 2));
}
//@ chunk-fq0cr76a.js:870008-870232 placement
function encodeSidBuffer(groupSid) {
  let [n, r, ...s] = groupSid.split("-").slice(1).map(Number);
  let h = Buffer.alloc(8 + 4 * s.length);
  h.writeUInt8(n ?? 0, 0);
  h.writeUInt8(s.length, 1);
  h.writeUIntBE(r ?? 0, 2, 6);
  for (let [y, b] of s.entries()) h.writeUInt32LE(b, 8 + 4 * y);
  return h;
}
//@ chunk-fq0cr76a.js:870232-870383 placement
function logParentFolderGrant(e, n) {
  logForDebugging(
    `[sandbox] no folder gets an entry for the sandbox group (${n}); ${SANDBOX_GROUP_INHERIT_RIGHTS}`,
    {
      level: "error",
    },
  );
  logFeatureSad("sandbox_windows_parent_folder_grant", e);
}
//@ chunk-fq0cr76a.js:870383-871971 placement
function ensureSandboxGroupEntry(windowsFolderSecurity, n, r, s) {
  try {
    let h = describeAclListState(windowsFolderSecurity, n, r, s.mask, MAX_ACL_BYTES);
    switch (h) {
      case "present":
        logForDebugging(`[sandbox] the sandbox group ${s.has} ${n}`);
        return;
      case "added":
        logForDebugging(`[sandbox] gave the sandbox group ${s.name} ${n}`);
        return;
      case "no_list":
        logForDebugging(
          `[sandbox] ${n} has no permission list, which allows everyone everything; left as it is, with no entry for the sandbox group`,
          {
            level: "warn",
          },
        );
        return s.codePrefix + h;
      case "unreadable_list":
        logForDebugging(
          `[sandbox] the permission list of ${n} is malformed or full, so it gets no entry for the sandbox group; ${s.without}`,
          {
            level: "error",
          },
        );
        return s.codePrefix + h;
      default:
        logForDebugging(
          `[sandbox] after an entry for the sandbox group was added to ${n}, its permissions read back differently from what was written (control word 0x${h.controlBefore.toString(16)} before, 0x${h.controlAfter.toString(16)} after); left as they are, and icacls "${n}" shows them${h.controlBefore & ~h.controlAfter & ACE_ACCESS_ALLOWED_TYPE ? `. The list is no longer protected from what the folder above hands down: icacls "${n}" /inheritance:r should protect it again (untried; it visits everything beneath)` : ""}`,
          {
            level: "error",
          },
        );
        return `${s.codePrefix}differs_after_write`;
    }
  } catch (error) {
    if (error instanceof PathLeadsElsewhereError) {
      logForDebugging(
        `[sandbox] ${n} leads to ${error.reached}, through a link or another spelling, so it gets no entry for the sandbox group; ${s.without}`,
        {
          level: "error",
        },
      );
      return `${s.codePrefix}other_folder_reached`;
    }
    logForDebugging(
      `[sandbox] could not give the sandbox group ${s.name} ${n} (${errorMessage(error)}); ${s.without}`,
      {
        level: "error",
      },
    );
    if (error instanceof WindowsFolderSecurityError)
      return `${s.codePrefix}${error.step}_failed_${error.windowsError}`;
    reportSandboxErrorUnderStandIn(error, "oneFolderNotGranted");
    return `${s.codePrefix}unexpected_error`;
  }
}
//@ chunk-fq0cr76a.js:871971-872386 placement
function describeAclListState(e, n, r, s, h) {
  let y = e.open(n, h);
  try {
    let permissions = e.readPermissions(y);
    let S;
    try {
      S = parseAclEntries(permissions, r, s);
    } catch (error) {
      if (error instanceof RangeError) return "unreadable_list";
      throw error;
    }
    if (typeof S === "string") return S;
    if ((h & MAX_ACL_ENTRIES_BYTES) !== 0) {
      e.writePermissions(y, S);
      let permissions_2 = e.readPermissions(y);
      return isFontWriteConsistent({
        before: permissions,
        written: S,
        after: permissions_2,
      })
        ? "added"
        : {
            controlBefore: permissions.readUInt16LE(2),
            controlAfter: permissions_2.readUInt16LE(2),
          };
    }
  } finally {
    e.close(y);
  }
  return describeAclListState(e, n, r, s, h | MAX_ACL_ENTRIES_BYTES);
}
//@ chunk-fq0cr76a.js:872386-872775 placement
/**
 * USER_SID_PATTERN：Windows 用户 SID 正则；WINDOWS_SANDBOX_FAILURES：Windows 沙箱准备失败原因枚举；sandboxDenyState：原生 deny 状态（同一声明共 3 个绑定）。
 */
var USER_SID_PATTERN_2 = /^S-1-5-21-\d+-\d+-\d+-\d+$/;
var USER_SID_PATTERN = [
  "bad_request",
  "user_in_sandbox_group",
  "account_not_in_sandbox_group",
  "grant_root_unresolved",
];
var WINDOWS_SANDBOX_FAILURES = DoctorLazy(() =>
  union([
    u({
      version: literal(1),
      off: string(),
    }),
    u({
      version: literal(1),
      off: zg(),
      stands: array(E()),
      handedBack: array(
        u({
          id: E(),
          why: string(),
        }),
      ),
      tally: u({
        inPlace: E(),
        planted: E(),
        laid: E(),
        pushedDown: E(),
        guarded: E(),
        extrasSkipped: E(),
        ms: E(),
      }),
    }),
  ]),
);
var sandboxDenyState = {
  denyRead: new Map(),
  denyWrite: new Map(),
};
//@ chunk-fq0cr76a.js:872775-873377 placement
function getSandboxUserStatus() {
  let e =
    getPlatform() === "windows" && typeof Bun !== "undefined"
      ? Bun.ant?.windowsSandboxDeniesArg?.()
      : undefined;
  if (typeof e !== "string") return;
  return async (n) => {
    let r = await execFileNoThrow(rgRunner().exe, [e], {
      input: jsonStringify(n),
      timeout: n.deadlineMs + 2000,
      cwd: systemRootDir(),
      preserveOutputOnError: true,
      maxBuffer: 1e6,
      waitForExitAfterKill: true,
    });
    if (r.code !== 0 || r.stderr !== "")
      logForDebugging(
        `[sandbox] the sub-command for Windows deny entries ${r.exitCode === undefined ? `was killed or never ran (${r.error ?? "no more is known"})` : `exited ${r.exitCode}`}${r.stderr && `: ${r.stderr}`}`,
      );
    if (r.code !== 0) throw Error("the sub-command was killed or did not exit with 0");
    return jsonParse(r.stdout);
  };
}
//@ chunk-fq0cr76a.js:873377-873731 placement
function describeLocalConnectionsOff(e, n) {
  let { data: r } = WINDOWS_SANDBOX_FAILURES().safeParse(e);
  if (r === undefined) return;
  if (r.off !== null)
    return {
      off: USER_SID_PATTERN.find((h) => h === r.off) ?? "off_unknown",
    };
  let s = [...r.stands, ...r.handedBack.map((h) => h.id)];
  return s.length === n.size && new Set(s).size === n.size && s.every((h) => n.has(h))
    ? {
        off: undefined,
        handedBack: new Map(r.handedBack.map((h) => [h.id, h.why])),
        tally: r.tally,
      }
    : undefined;
}
//@ chunk-fq0cr76a.js:873731-874155 placement
function splitDenyLists(lists, configured, expand) {
  return ["denyRead", "denyWrite"]
    .flatMap((s) =>
      lists[s].map((spelling) => ({
        list: s,
        spelling,
      })),
    )
    .filter(({ spelling }) => !configured.has(spelling) && !/[*?[\]{}]/.test(spelling))
    .flatMap(({ list, spelling }) => {
      let [y, ...b] = expand(spelling);
      return y === undefined || b.length > 0
        ? []
        : [
            {
              list,
              spelling,
              path: y,
            },
          ];
    })
    .map(({ list, spelling, path }, id) => ({
      id,
      list,
      spelling,
      path: /[\\/]$/.test(spelling) && !/[\\/]$/.test(path) ? `${path}\\` : path,
      refuse: list === "denyRead" ? "read" : "write",
    }));
}
//@ chunk-fq0cr76a.js:874155-874357 placement
function collectDenyPaths(e, n) {
  let mapped = e.map((s) => [s.list, s.spelling, n(s)]);
  return {
    denyRead: new Map(mapped.flatMap(([s, h, y]) => (s === "denyRead" ? [[h, y]] : []))),
    denyWrite: new Map(mapped.flatMap(([s, h, y]) => (s === "denyWrite" ? [[h, y]] : []))),
  };
}
//@ chunk-fq0cr76a.js:874357-874614 placement
function describeDeniesNotRenewed(e, atStart, r = "") {
  logForDebugging(
    `[sandbox] Windows: Bun's sub-command did not write the deny entries (${e}${r}); ${atStart ? "srt-win writes them all" : "they were not renewed before this command"}`,
    {
      level: "warn",
    },
  );
  logFeatureSad("sandbox_windows_native_denies", e, {
    at_start: atStart,
  });
  return sandboxDenyState;
}
//@ chunk-fq0cr76a.js:874614-875681 placement
/**
 * 用 Bun 子命令写入 Windows deny 条目并核对（账号异常、回答不可读）。
 */
async function writeWindowsDenyEntries({ lists, configured, grantRoots, user, atStart, write, expand }) {
  try {
    let { sid, groupSid } = user;
    if (
      sid === undefined ||
      groupSid === undefined ||
      !USER_SID_PATTERN_2.test(sid) ||
      !USER_SID_PATTERN_2.test(groupSid) ||
      !user.inSandboxGroup
    )
      return describeDeniesNotRenewed("unexpected_account", atStart);
    let R = splitDenyLists(lists, configured, expand);
    if (R.length === 0) return collectDenyPaths([], () => true);
    let D = describeLocalConnectionsOff(
      await write({
        version: 1,
        groupSid,
        accountSid: sid,
        entries: R.map(({ id, path, refuse }) => ({
          id,
          path,
          refuse,
        })),
        grantRoots,
        deadlineMs: atStart ? 60000 : 1e4,
      }),
      new Set(R.map((V) => V.id)),
    );
    if (D === undefined) return describeDeniesNotRenewed("unreadable_answer", atStart);
    if (D.off !== undefined) return describeDeniesNotRenewed(D.off, atStart);
    let { handedBack, tally } = D;
    if (atStart || tally.planted + tally.laid > 0) {
      logForDebugging(
        `[sandbox] Windows deny entries written by Bun's sub-command: ${jsonStringify(tally)}; left to srt-win: ${jsonStringify(R.flatMap((V) => (handedBack.has(V.id) ? [[V.path, handedBack.get(V.id)]] : [])))}`,
      );
      logFeatureOk("sandbox_windows_native_denies", {
        at_start: atStart,
        sent: R.length,
        handed_back: handedBack.size,
        in_place: tally.inPlace,
        planted: tally.planted,
        laid: tally.laid,
        pushed_down: tally.pushedDown,
        guarded: tally.guarded,
        extras_skipped: tally.extrasSkipped,
        ms: tally.ms,
      });
    }
    return collectDenyPaths(R, (V) =>
      handedBack.get(V.id) === "deadline" ? undefined : !handedBack.has(V.id),
    );
  } catch (error) {
    return describeDeniesNotRenewed("threw", atStart, `: ${errorMessage(error)}`);
  }
}
//@ chunk-fq0cr76a.js:875681-875802 placement
/**
 * 判断 Windows 原生拒绝列表是否全部已应用（每个条目都有结果，或被回调认可为可忽略）。
 */
function areNativeDeniesComplete(e, n = () => false) {
  return (
    e !== sandboxDenyState &&
    ["denyRead", "denyWrite"].every((r) => [...e[r]].every(([s, h]) => h !== undefined || n(r, s)))
  );
}
//@ chunk-fq0cr76a.js:875802-875885 placement
/**
 * hasAnyDeniedPath：是否有启用中的读/写拒绝。
 */
function hasAnyDeniedPath(e) {
  return [...e.denyRead.values(), ...e.denyWrite.values()].some((n) => n);
}
//@ chunk-fq0cr76a.js:875885-876008 placement
/**
 * 合并原生拒绝状态：保留仍在配置中的条目，新结果覆盖旧结果。
 */
function mergeNativeDenyState(now, n, filesystem) {
  return {
    denyRead: mergeDenyMap(now.denyRead, n.denyRead, filesystem.denyRead),
    denyWrite: mergeDenyMap(now.denyWrite, n.denyWrite, filesystem.denyWrite),
  };
}
//@ chunk-fq0cr76a.js:876008-876128 placement
function mergeDenyMap(e, n, r) {
  let s = new Set(r);
  return new Map([...e, ...[...n].filter(([, h]) => h !== undefined)].filter(([h]) => s.has(h)));
}
//@ chunk-fq0cr76a.js:876128-876273 placement
/**
 * 从配置中去掉已由原生拒绝成功应用的读/写拒绝条目。
 */
function dropAppliedNativeDenies(e, n) {
  return {
    ...e,
    denyRead: e.denyRead.filter((r) => n.denyRead.get(r) !== true),
    denyWrite: e.denyWrite.filter((r) => n.denyWrite.get(r) !== true),
  };
}
//@ chunk-fq0cr76a.js:876335-876439 placement
/**
 * 整理 git 的 home 与配置目录（只取绝对路径并规范化）。
 */
function getGitHomeInfo(e, n) {
  return {
    home: win32.isAbsolute(e) ? normalizeGitPathArg(e) : undefined,
    configHomes: n.filter(win32.isAbsolute).map(normalizeGitPathArg),
  };
}
//@ chunk-fq0cr76a.js:876439-876539 placement
/**
 * 判断路径是否位于 git 的 home 或任一配置目录之下。
 */
function isUnderGitHome(e, { home, configHomes }) {
  let s = normalizeGitPathArg(e);
  return (
    (home !== undefined && arraysEqualByIndex(s, home)) ||
    configHomes.some((configHome) => isSameArray(s, configHome))
  );
}
//@ chunk-fq0cr76a.js:876539-876888 placement
var HOME_AS_CWD_NOTE =
  "Claude Code's working folder is your home folder, a folder that contains it, or Claude Code's config folder. The Windows sandbox doesn't start there, because sandboxed commands from other sessions could then reach your settings and credentials. Start a new session in a project folder, or move this one there (`/cd <folder>` in a terminal)";
//@ chunk-fq0cr76a.js:876888-876912 placement
/**
 * WindowsSandboxError：Windows 沙箱错误类。
 */
class WindowsSandboxError_2 extends Error {}
export {
  rgRunner,
  CLAUDECODESANDBOX,
  formatProfileForgetHint,
  grantExecutableReadToSandboxGroup,
  describeWindowsSandboxRemedy,
  isWindowsSandboxEnabled,
  getGitHomeInfo,
  isUnderGitHome,
  isSeclogonAccessDenied,
  WindowsSandboxError_2,
  HOME_AS_CWD_NOTE,
  grantParentFoldersToSandboxGroup,
  getSandboxUserStatus,
  writeWindowsDenyEntries,
  mergeNativeDenyState,
  hasAnyDeniedPath,
  dropAppliedNativeDenies,
  areNativeDeniesComplete,
  hasWindowsSandboxBeenOn,
  USER_SID_RE,
  escapeInvalidCharClasses,
};
