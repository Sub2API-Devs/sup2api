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
import {
  objectSchema,
  _enum,
  numberSchema,
  union,
  literal,
  stringSchema,
  nullSchema,
  array,
} from "../../../vendor/zod/v4/classic/schemas.js";
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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-fq0cr76a.js:858597-858672 placement
var REGEX_TOKEN_OR_CLASS_RE = /\\.|\[(?:\\.|[^\]\\])*\]/gs;
var LITERAL_REGEX_RE = /^(?:\\.|[^\\.*+?^$()[\]{}|])*$/s;
//@ chunk-fq0cr76a.js:858672-858838 placement
/**
 * 修正正则中的字符类：无法编译的方括号片段转义为字面量。
 */
function escapeInvalidCharClasses(pattern) {
  return pattern.replace(REGEX_TOKEN_OR_CLASS_RE, (token) => {
    if (token.startsWith("\\") || !LITERAL_REGEX_RE.test(token.slice(1, -1))) return token;
    try {
      new RegExp(token);
      return token;
    } catch {
      return `\\[${token.slice(1, -1)}\\]`;
    }
  });
}
//@ chunk-fq0cr76a.js:858838-858886 placement
var windowsSandboxToggleState; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-fq0cr76a.js:858838", () => {
  windowsSandboxToggleState = identity_2(
    {
      hasBeenOn: false,
    },
    (state) => {
      state.hasBeenOn = false;
    },
  );
});
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
function isSeclogonAccessDenied(message) {
  return SECLOGON_ACCESS_DENIED_RE.test(message);
}
//@ chunk-fq0cr76a.js:859547-862760 placement
/**
 * 生成 Windows 沙箱不可用时的补救说明（/sandbox install、管理员信任 CA 等，约 3 KB）。
 */
function describeWindowsSandboxRemedy(message, options) {
  if (getPlatform() !== "windows") return message;
  let replaced = message.replace(/\s*Windows sandbox needs a one-time install[\s\S]*$/, "");
  let installRemedy = options?.omitCcRemedy
    ? ""
    : "Run /sandbox install, or see https://code.claude.com/docs/en/sandboxing.";
  let caRemedy = options?.omitCcRemedy
    ? ""
    : "Ask your administrator to trust the sandbox CA \u2014 see https://code.claude.com/docs/en/sandboxing.";
  let match =
    /do(?:es)? not match network\.allowLocalBinding[\s\S]*?installed: (?:loopback )?(open|closed); configured: (?:loopback )?(open|closed)/.exec(
      replaced,
    );
  if (match)
    return `sandbox.network.allowLocalBinding asks for local connections ${match[2] === "open" ? "on" : "off"}, but the sandbox on this machine was set up with them ${match[1] === "open" ? "on" : "off"}. Changing that needs set-up again (one elevation prompt). ${installRemedy}`.trimEnd();
  let match_2 =
    /network\.allowLocalBinding asks for loopback (open|closed), but this session verified the network fence with loopback (open|closed)/.exec(
      replaced,
    );
  if (match_2)
    return `sandbox.network.allowLocalBinding now asks for local connections ${match_2[1] === "open" ? "on" : "off"}, but this session started with them ${match_2[2] === "open" ? "on" : "off"}, and on Windows that is fixed when the sandbox is set up. Run /sandbox install to change the set-up, then restart Claude Code.`;
  let trimmed = (replaced === "" ? "Windows sandbox needs a one-time install." : replaced)
    .replace(/Re-run `srt-win install`[^.]*\./g, installRemedy)
    .replace(/Re-run the install to upgrade it in place[\s\S]*?directly\./g, installRemedy)
    .replace(
      /Use that release, or replace its install with this one: `srt-win\.exe install[^`]*`\./g,
      "Use that release of Claude Code.",
    )
    .replace(/\s*Nothing is granted or run until then\./g, "")
    .replace(
      /Re-run the install for this configuration[\s\S]*?npx (?:@anthropic-ai\/)?sandbox-runtime windows-install[^\n]*/g,
      installRemedy,
    )
    .replace(
      /Through this package: `npx (?:@anthropic-ai\/)?sandbox-runtime windows-install[^`]*`\./g,
      installRemedy,
    )
    .replace(
      /Call grantWindowsProfileRead\(\)[\s\S]*?initialize\(\) does neither itself\./g,
      options?.omitCcRemedy ? "" : `${installRemedy} ${formatProfileForgetHint()}`,
    )
    .replace(/[Rr]un `npx (?:@anthropic-ai\/)?sandbox-runtime windows-install`[^.]*\./g, installRemedy)
    .replace(/[Rr]un `srt-win user trust-ca [^`]*`[^.]*\./g, caRemedy)
    .replace(new RegExp(SECLOGON_ACCESS_DENIED_RE, "g"), "$1")
    .replaceAll("npx sandbox-runtime ", "npx @anthropic-ai/sandbox-runtime ")
    .replace(/\.\s*\.(?!\.)/g, ".")
    .replace(/  +/g, " ")
    .trim();
  if (!isSeclogonAccessDenied(message)) return trimmed;
  let reason = `Windows refused to start this copy of Claude Code (${process.execPath}) as the sandbox account`;
  if (options?.programPermissionAdded)
    return `${reason}, even though Claude Code gave the sandbox-runtime-users group read and execute permission on that file. Security software or a Windows policy may be blocking it; ask your administrator. (Details: ${trimmed})`;
  let howTo = /[\\/]WindowsApps[\\/]/i.test(process.execPath)
    ? "Permissions inside a Windows app package cannot be changed, so use"
    : `Its owner or an administrator can: in PowerShell or Command Prompt (not Git Bash, which rewrites /grant), run icacls "${process.execPath}" /grant sandbox-runtime-users:RX (then restart Claude Code). Otherwise use`;
  return `${reason}, and Claude Code ${options?.programPermissionAdded === false ? "could not give" : "did not try to give"} the sandbox-runtime-users group read and execute permission on that file. ${howTo} a copy of Claude Code on a local disk where every user can run it, such as under Program Files. (Details: ${trimmed})`;
}
//@ chunk-fq0cr76a.js:862821-862915 placement
var MAX_ACL_BYTES = 131072;
var MAX_ACL_ENTRIES_BYTES = 262144;
var MAX_ACL_CHOWN_ATTEMPTS = 6;
var NATIVE_TOOL_STEPS = ["open_to_read", "open_to_write", "final_path", "read", "write"];
//@ chunk-fq0cr76a.js:862915-863085 placement
let WindowsFolderSecurityError; // deferred: uses TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS (../errors.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-fq0cr76a.js:862915", () => {
  WindowsFolderSecurityError = class WindowsFolderSecurityError extends (
    TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS
  ) {
    step;
    windowsError;
    constructor(step, windowsError) {
      super(`${step} failed with Windows error ${windowsError}`, "a call on folder permissions failed");
      this.step = step;
      this.windowsError = windowsError;
    }
  };
});
//@ chunk-fq0cr76a.js:863085-863206 placement
let PathLeadsElsewhereError; // deferred: uses TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS (../errors.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-fq0cr76a.js:863085", () => {
  PathLeadsElsewhereError = class PathLeadsElsewhereError extends (
    TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS
  ) {
    reached;
    constructor(finalPath) {
      super(`the path leads to ${finalPath}`, "a path led to another folder");
      this.reached = finalPath;
    }
  };
});
//@ chunk-fq0cr76a.js:863206-863258 placement
var nativeToolErrorSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var nativeToolErrorPayload;
deferInit("chunk-fq0cr76a.js:863206", () => {
  nativeToolErrorSchema = DoctorLazy(() =>
    objectSchema({
      step: _enum(NATIVE_TOOL_STEPS),
      windowsError: numberSchema(),
    }),
  );
});
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
    open(path, flags) {
      let { handle, finalPath } = withFolderSecurityError(() =>
        windowsFolderSecurity.open(path, (flags & MAX_ACL_ENTRIES_BYTES) !== 0),
      );
      try {
        if (lowerAscii(finalPath) !== lowerAscii(`\\\\?\\${win32.resolve(path)}`))
          throw new PathLeadsElsewhereError(finalPath);
        return BigInt(handle);
      } catch (error) {
        windowsFolderSecurity.close(handle);
        throw error;
      }
    },
    readPermissions(handle) {
      if (isOutOfUint32Range(handle)) throw new WindowsFolderSecurityError("read", MAX_ACL_CHOWN_ATTEMPTS);
      return withFolderSecurityError(() => windowsFolderSecurity.readPermissions(Number(handle)));
    },
    writePermissions(handle, permissions) {
      if (isOutOfUint32Range(handle)) throw new WindowsFolderSecurityError("write", MAX_ACL_CHOWN_ATTEMPTS);
      withFolderSecurityError(() => windowsFolderSecurity.writePermissions(Number(handle), permissions));
    },
    close(handle) {
      if (!isOutOfUint32Range(handle)) windowsFolderSecurity.close(Number(handle));
    },
  };
}
//@ chunk-fq0cr76a.js:864073-864193 placement
function withFolderSecurityError(run) {
  try {
    return run();
  } catch (error) {
    let { data: parsed } = nativeToolErrorSchema().safeParse(error);
    throw parsed === undefined ? error : new WindowsFolderSecurityError(parsed.step, parsed.windowsError);
  }
}
//@ chunk-fq0cr76a.js:864193-864256 placement
function lowerAscii(finalPath) {
  return finalPath.replace(/[A-Z]/g, (char) => char.toLowerCase());
}
//@ chunk-fq0cr76a.js:864256-864299 placement
function isOutOfUint32Range(value) {
  return value <= 0n || value > 0xffffffffn;
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
  let executablePath = stripExtendedPathPrefix(exePath);
  if (getPlatform() !== "windows" || isUncOrDevicePath(executablePath) || !win32.isAbsolute(executablePath))
    return;
  try {
    let stats = await lstat(executablePath, {
      bigint: true,
    });
    let identity = `${stats.dev}:${stats.ino}:${stats.size}:${stats.mtimeNs}`;
    if (identity === previous?.file) return previous;
    if (!stats.isFile()) {
      logForDebugging(`[sandbox] ${executablePath} is not a regular file; its permissions are left alone`);
      logFeatureSad("sandbox_windows_exe_grant", "not_a_regular_file");
      return {
        file: identity,
        added: false,
      };
    }
    let userStatus = await getUserStatus();
    if (!userStatus.provisioned) return;
    let sid = userStatus.groupSid ?? userStatus.sid;
    if (sid === undefined || !USER_SID_RE.test(sid)) {
      logFeatureSad("sandbox_windows_exe_grant", "unexpected_sid");
      return {
        file: identity,
        added: false,
      };
    }
    let result = await execFileNoThrow(
      win32.join(systemRootDir(), "System32", "icacls.exe"),
      [executablePath, "/grant", `*${sid}:(RX)`, "/L"],
      {
        timeout: 15000,
        cwd: systemRootDir(),
        preserveOutputOnError: true,
      },
    );
    logForDebugging(
      `[sandbox] icacls ${executablePath} /grant *${sid}:(RX) /L exited ${result.exitCode ?? "with no exit code"}${result.error === undefined ? "" : ` (${result.error})`}: ${result.stderr || result.stdout}`,
    );
    if (result.code !== 0) {
      logFeatureSad("sandbox_windows_exe_grant", result.timedOut ? "icacls_timeout" : "icacls_failed");
      return {
        file: identity,
        added: false,
      };
    }
    logFeatureOk("sandbox_windows_exe_grant");
    return {
      file: identity,
      added: true,
    };
  } catch (error) {
    logForDebugging(
      `[sandbox] could not let the sandbox account run ${executablePath}: ${errorMessage(error)}`,
      {
        level: "error",
      },
    );
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
    let homeFullName = describeUnresolvableFullName(home);
    let projectFullName = describeUnresolvableFullName(project);
    let dirs = listIntermediateDirs(homeFullName, projectFullName);
    if (dirs.length === 0) {
      if (listIntermediateDirs(home, project).length > 0) {
        logParentFolderGrant(
          "no_folders_by_full_name",
          `by their full names ${project} is ${projectFullName} and ${home} is ${homeFullName}: on a network path, or the one no longer inside the other`,
        );
        return;
      }
      logForDebugging(
        `[sandbox] ${projectFullName} is not a plainly spelled folder inside ${homeFullName}, or is on a network path, so no parent folder gets an entry for the sandbox group`,
      );
      return;
    }
    let configPaths = [...configHomes];
    for (let configHome of configHomes) {
      let { real, code } = realpathNativeLongSync(configHome);
      if (real !== undefined) configPaths.push(real);
      else if (code !== "ENOENT") {
        logParentFolderGrant(
          `own_folder_unresolved_${code ?? "no_code"}`,
          `it cannot be told whether Claude Code's own folder ${configHome} is a link: ${code ?? "no error code"}`,
        );
        return;
      }
    }
    let found = configPaths.find(
      (configHome) => getRelativeSegments(...resolveWin32Pair(configHome, projectFullName)) !== undefined,
    );
    if (found !== undefined) {
      logForDebugging(
        `[sandbox] ${projectFullName} lies in Claude Code's own folder ${found}, so no parent folder gets an entry for the sandbox group; ${SANDBOX_GROUP_INHERIT_RIGHTS}`,
      );
      return;
    }
    let userStatus = await getUserStatus().catch((error) => {
      logParentFolderGrant("status_unreadable", errorMessage(error));
      return;
    });
    if (userStatus === undefined) return;
    if (!userStatus.provisioned) {
      logForDebugging(
        "[sandbox] there is no sandbox account yet, so no folder gets an entry for the sandbox group",
      );
      return;
    }
    if (userStatus.groupSid === undefined || !USER_SID_RE.test(userStatus.groupSid)) {
      logParentFolderGrant("unexpected_sid", "the sandbox group has no SID of the usual form");
      return;
    }
    let windowsFolderSecurity = getWindowsFolderSecurity();
    if (windowsFolderSecurity === null) {
      logParentFolderGrant("ffi_unavailable", "this runtime has no Bun.ant.windowsFolderSecurity");
      return;
    }
    let sidBuffer = encodeSidBuffer(userStatus.groupSid);
    let [homeParent, ...otherDirs] = dirs;
    let filtered = otherDirs
      .map((dir) => ensureSandboxGroupEntry(windowsFolderSecurity, dir, sidBuffer, sandboxGroupAceSpec))
      .filter((entryResult) => entryResult !== undefined);
    if (filtered.includes("differs_after_write")) {
      logForDebugging(
        `[sandbox] ${homeParent} gets no entry for the sandbox group, since a write further down read back differently; ${homeSandboxGroupAceSpec.without}`,
        {
          level: "error",
        },
      );
      filtered.push("home_skipped_after_bad_read_back");
    } else if (homeParent !== undefined) {
      let sandboxGroupEntry = ensureSandboxGroupEntry(
        windowsFolderSecurity,
        homeParent,
        sidBuffer,
        homeSandboxGroupAceSpec,
      );
      if (sandboxGroupEntry !== undefined) filtered.push(sandboxGroupEntry);
    }
    let failure =
      filtered.find((result) => result.endsWith("differs_after_write")) ??
      filtered.find((result) => !result.endsWith("no_list")) ??
      filtered[0];
    if (failure === undefined) logFeatureOk("sandbox_windows_parent_folder_grant");
    else logFeatureSad("sandbox_windows_parent_folder_grant", failure);
  } catch (error) {
    reportSandboxErrorUnderStandIn(error, "parentFoldersNotGranted");
    logParentFolderGrant("unexpected_error", errorMessage(error));
  }
}
//@ chunk-fq0cr76a.js:868346-868567 placement
function listIntermediateDirs(left, right) {
  if (![left, right].every(isDriveAbsolutePath)) return [];
  let [leftResolved, rightResolved] = resolveWin32Pair(left, right);
  let relativeSegments = getRelativeSegments(leftResolved, rightResolved);
  if (
    relativeSegments === undefined ||
    relativeSegments[0] === "" ||
    win32.dirname(leftResolved) === leftResolved ||
    rightResolved.split(win32.sep).some((segment) => /[. ]$|\0/.test(segment))
  )
    return [];
  return relativeSegments.map((relativeSegment, index) =>
    win32.join(leftResolved, ...relativeSegments.slice(0, index)),
  );
}
//@ chunk-fq0cr76a.js:868567-868618 placement
function isDriveAbsolutePath(path) {
  return /^[A-Za-z]:[\\/]/.test(stripExtendedPathPrefix(path));
}
//@ chunk-fq0cr76a.js:868618-868826 placement
function describeUnresolvableFullName(path) {
  if (!isDriveAbsolutePath(path)) return path;
  let { real, code } = realpathNativeLongSync(path);
  if (real === undefined)
    logForDebugging(
      `[sandbox] Windows cannot give the full name of ${path} (${code}), so the entries for the sandbox group go by that spelling`,
    );
  return real ?? path;
}
//@ chunk-fq0cr76a.js:868826-868887 placement
function resolveWin32Pair(left, right) {
  return [win32.resolve(stripExtendedPathPrefix(left)), win32.resolve(stripExtendedPathPrefix(right))];
}
//@ chunk-fq0cr76a.js:868887-869001 placement
function getRelativeSegments(from, to) {
  let relativePath = win32.relative(from, to);
  return relativePath.split(win32.sep)[0] === ".." || win32.isAbsolute(relativePath)
    ? undefined
    : relativePath.split(win32.sep);
}
//@ chunk-fq0cr76a.js:869001-869802 placement
function parseAclEntries(buffer, sid, mask) {
  let uInt16LE = buffer.readUInt16LE(2);
  let uInt32LE = buffer.readUInt32LE(16);
  if ((uInt16LE & MAX_ACL_OPERATIONS) === 0 || uInt32LE === 0) return "no_list";
  let aclEnd = uInt32LE + buffer.readUInt16LE(uInt32LE + 2);
  let uInt16LE_2 = buffer.readUInt16LE(uInt32LE + 4);
  let offset = uInt32LE + ACE_INHERIT_FLAG_BYTE;
  let inheritOnlyOffset;
  for (let j = 0; j < uInt16LE_2; j++) {
    let uInt8 = buffer.readUInt8(offset);
    let uInt8_2 = buffer.readUInt8(offset + 1);
    let uInt16LE = buffer.readUInt16LE(offset + 2);
    if (uInt16LE < SID_HEADER_SIZE || offset + uInt16LE > aclEnd)
      throw RangeError("a permission entry has an impossible size");
    if (
      uInt8 === ACE_ACCESS_DENIED_TYPE &&
      (uInt8_2 & ACE_INHERITED_FLAG) === 0 &&
      (buffer.readUInt32LE(offset + 4) & mask) >>> 0 === mask &&
      buffer.subarray(offset + SID_HEADER_SIZE, offset + uInt16LE).equals(sid)
    )
      return "present";
    if ((uInt8_2 & ACE_INHERIT_ONLY_FLAG) !== 0) inheritOnlyOffset ??= offset;
    offset += uInt16LE;
  }
  let insertAt = inheritOnlyOffset ?? offset;
  let entry = Buffer.alloc(SID_HEADER_SIZE + sid.length);
  entry.writeUInt8(ACE_ACCESS_DENIED_TYPE, 0);
  entry.writeUInt16LE(entry.length, 2);
  entry.writeUInt32LE(mask, 4);
  sid.copy(entry, SID_HEADER_SIZE);
  let header = Buffer.alloc(MAX_ACL_SID_LENGTH);
  buffer.copy(header, 0, 0, 2);
  header.writeUInt16LE(
    (uInt16LE & ACE_HEADER_SIZE) === 0 ? uInt16LE : uInt16LE | MAX_ACL_DESCRIPTOR_BYTES,
    2,
  );
  header.writeUInt32LE(MAX_ACL_SID_LENGTH, 16);
  let buffer_2 = Buffer.concat([
    header,
    buffer.subarray(uInt32LE, insertAt),
    entry,
    buffer.subarray(insertAt, offset),
  ]);
  buffer_2.writeUInt16LE(buffer_2.length - MAX_ACL_SID_LENGTH, MAX_ACL_SID_LENGTH + 2);
  buffer_2.writeUInt16LE(uInt16LE_2 + 1, MAX_ACL_SID_LENGTH + 4);
  return buffer_2;
}
//@ chunk-fq0cr76a.js:869802-869925 placement
function isFontWriteConsistent({ before, written, after }) {
  return (
    decodeFont(written).equals(decodeFont(after)) &&
    ((before.readUInt16LE(2) ^ after.readUInt16LE(2)) & (ACE_ACCESS_ALLOWED_TYPE | ACE_HEADER_SIZE)) === 0
  );
}
//@ chunk-fq0cr76a.js:869925-870008 placement (2.1.88 match: decodeFont, 0.816)
function decodeFont(buffer) {
  let cp = buffer.readUInt32LE(16);
  return buffer.subarray(cp, cp + buffer.readUInt16LE(cp + 2));
}
//@ chunk-fq0cr76a.js:870008-870232 placement
function encodeSidBuffer(groupSid) {
  let [revision, authority, ...subAuthorities] = groupSid.split("-").slice(1).map(Number);
  let buffer = Buffer.alloc(8 + 4 * subAuthorities.length);
  buffer.writeUInt8(revision ?? 0, 0);
  buffer.writeUInt8(subAuthorities.length, 1);
  buffer.writeUIntBE(authority ?? 0, 2, 6);
  for (let [index, value] of subAuthorities.entries()) buffer.writeUInt32LE(value, 8 + 4 * index);
  return buffer;
}
//@ chunk-fq0cr76a.js:870232-870383 placement
function logParentFolderGrant(code, detail) {
  logForDebugging(
    `[sandbox] no folder gets an entry for the sandbox group (${detail}); ${SANDBOX_GROUP_INHERIT_RIGHTS}`,
    {
      level: "error",
    },
  );
  logFeatureSad("sandbox_windows_parent_folder_grant", code);
}
//@ chunk-fq0cr76a.js:870383-871971 placement
function ensureSandboxGroupEntry(security, path, sid, spec) {
  try {
    let state = describeAclListState(security, path, sid, spec.mask, MAX_ACL_BYTES);
    switch (state) {
      case "present":
        logForDebugging(`[sandbox] the sandbox group ${spec.has} ${path}`);
        return;
      case "added":
        logForDebugging(`[sandbox] gave the sandbox group ${spec.name} ${path}`);
        return;
      case "no_list":
        logForDebugging(
          `[sandbox] ${path} has no permission list, which allows everyone everything; left as it is, with no entry for the sandbox group`,
          {
            level: "warn",
          },
        );
        return spec.codePrefix + state;
      case "unreadable_list":
        logForDebugging(
          `[sandbox] the permission list of ${path} is malformed or full, so it gets no entry for the sandbox group; ${spec.without}`,
          {
            level: "error",
          },
        );
        return spec.codePrefix + state;
      default:
        logForDebugging(
          `[sandbox] after an entry for the sandbox group was added to ${path}, its permissions read back differently from what was written (control word 0x${state.controlBefore.toString(16)} before, 0x${state.controlAfter.toString(16)} after); left as they are, and icacls "${path}" shows them${state.controlBefore & ~state.controlAfter & ACE_ACCESS_ALLOWED_TYPE ? `. The list is no longer protected from what the folder above hands down: icacls "${path}" /inheritance:r should protect it again (untried; it visits everything beneath)` : ""}`,
          {
            level: "error",
          },
        );
        return `${spec.codePrefix}differs_after_write`;
    }
  } catch (error) {
    if (error instanceof PathLeadsElsewhereError) {
      logForDebugging(
        `[sandbox] ${path} leads to ${error.reached}, through a link or another spelling, so it gets no entry for the sandbox group; ${spec.without}`,
        {
          level: "error",
        },
      );
      return `${spec.codePrefix}other_folder_reached`;
    }
    logForDebugging(
      `[sandbox] could not give the sandbox group ${spec.name} ${path} (${errorMessage(error)}); ${spec.without}`,
      {
        level: "error",
      },
    );
    if (error instanceof WindowsFolderSecurityError)
      return `${spec.codePrefix}${error.step}_failed_${error.windowsError}`;
    reportSandboxErrorUnderStandIn(error, "oneFolderNotGranted");
    return `${spec.codePrefix}unexpected_error`;
  }
}
//@ chunk-fq0cr76a.js:871971-872386 placement
function describeAclListState(security, path, sid, mask, flags) {
  let handle = security.open(path, flags);
  try {
    let buffer = security.readPermissions(handle);
    let result;
    try {
      result = parseAclEntries(buffer, sid, mask);
    } catch (error) {
      if (error instanceof RangeError) return "unreadable_list";
      throw error;
    }
    if (typeof result === "string") return result;
    if ((flags & MAX_ACL_ENTRIES_BYTES) !== 0) {
      security.writePermissions(handle, result);
      let permissions = security.readPermissions(handle);
      return isFontWriteConsistent({
        before: buffer,
        written: result,
        after: permissions,
      })
        ? "added"
        : {
            controlBefore: buffer.readUInt16LE(2),
            controlAfter: permissions.readUInt16LE(2),
          };
    }
  } finally {
    security.close(handle);
  }
  return describeAclListState(security, path, sid, mask, flags | MAX_ACL_ENTRIES_BYTES);
}
//@ chunk-fq0cr76a.js:872386-872775 placement
/**
 * USER_SID_PATTERN：Windows 用户 SID 正则；WINDOWS_SANDBOX_FAILURES：Windows 沙箱准备失败原因枚举；sandboxDenyState：原生 deny 状态（同一声明共 3 个绑定）。
 */
var USER_SID_PATTERN_2; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var USER_SID_PATTERN;
var WINDOWS_SANDBOX_FAILURES;
var sandboxDenyState;
deferInit("chunk-fq0cr76a.js:872386", () => {
  USER_SID_PATTERN_2 = /^S-1-5-21-\d+-\d+-\d+-\d+$/;
  USER_SID_PATTERN = [
    "bad_request",
    "user_in_sandbox_group",
    "account_not_in_sandbox_group",
    "grant_root_unresolved",
  ];
  WINDOWS_SANDBOX_FAILURES = DoctorLazy(() =>
    union([
      objectSchema({
        version: literal(1),
        off: stringSchema(),
      }),
      objectSchema({
        version: literal(1),
        off: nullSchema(),
        stands: array(numberSchema()),
        handedBack: array(
          objectSchema({
            id: numberSchema(),
            why: stringSchema(),
          }),
        ),
        tally: objectSchema({
          inPlace: numberSchema(),
          planted: numberSchema(),
          laid: numberSchema(),
          pushedDown: numberSchema(),
          guarded: numberSchema(),
          extrasSkipped: numberSchema(),
          ms: numberSchema(),
        }),
      }),
    ]),
  );
  sandboxDenyState = {
    denyRead: new Map(),
    denyWrite: new Map(),
  };
});
//@ chunk-fq0cr76a.js:872775-873377 placement
function getSandboxUserStatus() {
  let subcommand =
    getPlatform() === "windows" && typeof Bun !== "undefined"
      ? Bun.ant?.windowsSandboxDeniesArg?.()
      : undefined;
  if (typeof subcommand !== "string") return;
  return async (request) => {
    let result = await execFileNoThrow(rgRunner().exe, [subcommand], {
      input: jsonStringify(request),
      timeout: request.deadlineMs + 2000,
      cwd: systemRootDir(),
      preserveOutputOnError: true,
      maxBuffer: 1e6,
      waitForExitAfterKill: true,
    });
    if (result.code !== 0 || result.stderr !== "")
      logForDebugging(
        `[sandbox] the sub-command for Windows deny entries ${result.exitCode === undefined ? `was killed or never ran (${result.error ?? "no more is known"})` : `exited ${result.exitCode}`}${result.stderr && `: ${result.stderr}`}`,
      );
    if (result.code !== 0) throw Error("the sub-command was killed or did not exit with 0");
    return jsonParse(result.stdout);
  };
}
//@ chunk-fq0cr76a.js:873377-873731 placement
function describeLocalConnectionsOff(message, sentIds) {
  let { data: parsed } = WINDOWS_SANDBOX_FAILURES().safeParse(message);
  if (parsed === undefined) return;
  if (parsed.off !== null)
    return {
      off: USER_SID_PATTERN.find((pattern) => pattern === parsed.off) ?? "off_unknown",
    };
  let ids = [...parsed.stands, ...parsed.handedBack.map((entry) => entry.id)];
  return ids.length === sentIds.size &&
    new Set(ids).size === sentIds.size &&
    ids.every((id) => sentIds.has(id))
    ? {
        off: undefined,
        handedBack: new Map(parsed.handedBack.map((entry) => [entry.id, entry.why])),
        tally: parsed.tally,
      }
    : undefined;
}
//@ chunk-fq0cr76a.js:873731-874155 placement
function splitDenyLists(lists, configured, expand) {
  return ["denyRead", "denyWrite"]
    .flatMap((listName) =>
      lists[listName].map((spelling) => ({
        list: listName,
        spelling,
      })),
    )
    .filter(({ spelling }) => !configured.has(spelling) && !/[*?[\]{}]/.test(spelling))
    .flatMap(({ list, spelling }) => {
      let [first, ...rest] = expand(spelling);
      return first === undefined || rest.length > 0
        ? []
        : [
            {
              list,
              spelling,
              path: first,
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
function collectDenyPaths(entries, pathFor) {
  let mapped = entries.map((entry) => [entry.list, entry.spelling, pathFor(entry)]);
  return {
    denyRead: new Map(
      mapped.flatMap(([list, spelling, path]) => (list === "denyRead" ? [[spelling, path]] : [])),
    ),
    denyWrite: new Map(
      mapped.flatMap(([list, spelling, path]) => (list === "denyWrite" ? [[spelling, path]] : [])),
    ),
  };
}
//@ chunk-fq0cr76a.js:874357-874614 placement
function describeDeniesNotRenewed(reason, atStart, detail = "") {
  logForDebugging(
    `[sandbox] Windows: Bun's sub-command did not write the deny entries (${reason}${detail}); ${atStart ? "srt-win writes them all" : "they were not renewed before this command"}`,
    {
      level: "warn",
    },
  );
  logFeatureSad("sandbox_windows_native_denies", reason, {
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
    let entries = splitDenyLists(lists, configured, expand);
    if (entries.length === 0) return collectDenyPaths([], () => true);
    let answer = describeLocalConnectionsOff(
      await write({
        version: 1,
        groupSid,
        accountSid: sid,
        entries: entries.map(({ id, path, refuse }) => ({
          id,
          path,
          refuse,
        })),
        grantRoots,
        deadlineMs: atStart ? 60000 : 1e4,
      }),
      new Set(entries.map((entry) => entry.id)),
    );
    if (answer === undefined) return describeDeniesNotRenewed("unreadable_answer", atStart);
    if (answer.off !== undefined) return describeDeniesNotRenewed(answer.off, atStart);
    let { handedBack, tally } = answer;
    if (atStart || tally.planted + tally.laid > 0) {
      logForDebugging(
        `[sandbox] Windows deny entries written by Bun's sub-command: ${jsonStringify(tally)}; left to srt-win: ${jsonStringify(entries.flatMap((entry) => (handedBack.has(entry.id) ? [[entry.path, handedBack.get(entry.id)]] : [])))}`,
      );
      logFeatureOk("sandbox_windows_native_denies", {
        at_start: atStart,
        sent: entries.length,
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
    return collectDenyPaths(entries, (entry) =>
      handedBack.get(entry.id) === "deadline" ? undefined : !handedBack.has(entry.id),
    );
  } catch (error) {
    return describeDeniesNotRenewed("threw", atStart, `: ${errorMessage(error)}`);
  }
}
//@ chunk-fq0cr76a.js:875681-875802 placement
/**
 * 判断 Windows 原生拒绝列表是否全部已应用（每个条目都有结果，或被回调认可为可忽略）。
 */
function areNativeDeniesComplete(state, unregistered = () => false) {
  return (
    state !== sandboxDenyState &&
    ["denyRead", "denyWrite"].every((listName) =>
      [...state[listName]].every(([path, applied]) => applied !== undefined || unregistered(listName, path)),
    )
  );
}
//@ chunk-fq0cr76a.js:875802-875885 placement
/**
 * hasAnyDeniedPath：是否有启用中的读/写拒绝。
 */
function hasAnyDeniedPath(state) {
  return [...state.denyRead.values(), ...state.denyWrite.values()].some((applied) => applied);
}
//@ chunk-fq0cr76a.js:875885-876008 placement
/**
 * 合并原生拒绝状态：保留仍在配置中的条目，新结果覆盖旧结果。
 */
function mergeNativeDenyState(now, next, filesystem) {
  return {
    denyRead: mergeDenyMap(now.denyRead, next.denyRead, filesystem.denyRead),
    denyWrite: mergeDenyMap(now.denyWrite, next.denyWrite, filesystem.denyWrite),
  };
}
//@ chunk-fq0cr76a.js:876008-876128 placement
function mergeDenyMap(now, next, allowed) {
  let allowedSet = new Set(allowed);
  return new Map(
    [...now, ...[...next].filter(([, applied]) => applied !== undefined)].filter(([path]) =>
      allowedSet.has(path),
    ),
  );
}
//@ chunk-fq0cr76a.js:876128-876273 placement
/**
 * 从配置中去掉已由原生拒绝成功应用的读/写拒绝条目。
 */
function dropAppliedNativeDenies(filesystem, state) {
  return {
    ...filesystem,
    denyRead: filesystem.denyRead.filter((path) => state.denyRead.get(path) !== true),
    denyWrite: filesystem.denyWrite.filter((path) => state.denyWrite.get(path) !== true),
  };
}
//@ chunk-fq0cr76a.js:876335-876439 placement
/**
 * 整理 git 的 home 与配置目录（只取绝对路径并规范化）。
 */
function getGitHomeInfo(home, configHomes) {
  return {
    home: win32.isAbsolute(home) ? normalizeGitPathArg(home) : undefined,
    configHomes: configHomes.filter(win32.isAbsolute).map(normalizeGitPathArg),
  };
}
//@ chunk-fq0cr76a.js:876439-876539 placement
/**
 * 判断路径是否位于 git 的 home 或任一配置目录之下。
 */
function isUnderGitHome(path, { home, configHomes }) {
  let normalized = normalizeGitPathArg(path);
  return (
    (home !== undefined && arraysEqualByIndex(normalized, home)) ||
    configHomes.some((configHome) => isSameArray(normalized, configHome))
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
