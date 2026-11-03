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
import { win32, win32 as win32_2, win32 as win32_3, win32 as win32_4, win32 as win32_5 } from "path";
import { lstat, lstat as lstat_2, lstat as lstat_3 } from "fs/promises";
import { ge } from "../identity.js";
import { getPlatform } from "../platform.js";
import { env } from "../env.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { rg } from "../../../vendor/@anthropic-ai/sandbox-runtime/dist/sandbox/windows-sandbox-utils.js";
import { TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS, errorMessage } from "../errors.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, U, E, Ue, T, o, zg, A } from "../../../vendor/zod/v4/classic/schemas.js";
import { logForDebugging } from "../debug.js";
import { oD } from "../../../vendor/@anthropic-ai/sandbox-runtime/dist/sandbox/sandbox-utils.js";
import { Qn } from "../pathClassification.js";
import { logFeatureSad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { execFileNoThrow } from "../execFileNoThrow.js";
import { x2 } from "../claudeInChrome/windowsAppPaths.js";
import { Rke } from "../fsJunctions.js";
import { reportSandboxErrorUnderStandIn } from "./sandboxErrors.js";
import { jsonStringify, jsonParse } from "../slowOperations.js";
import { normalizeGitPathArg } from "../permissions/filesystem.js";
import { QM, _le } from "../findExecutable.js";

//@ chunk-fq0cr76a.js:858597-858672 placement
var Qae = /\\.|\[(?:\\.|[^\]\\])*\]/gs,
  ele = /^(?:\\.|[^\\.*+?^$()[\]{}|])*$/s;
/**
 * 修正正则中的字符类：无法编译的方括号片段转义为字面量。
 */
//@ chunk-fq0cr76a.js:858672-858838 placement
function escapeInvalidCharClasses(e) {
  return e.replace(Qae, (n) => {
    if (n.startsWith("\\") || !ele.test(n.slice(1, -1))) return n;
    try {
      return (new RegExp(n), n);
    } catch {
      return `\\[${n.slice(1, -1)}\\]`;
    }
  });
}
//@ chunk-fq0cr76a.js:858838-858886 placement
var wv = ge({ hasBeenOn: !1 }, (e) => {
  e.hasBeenOn = !1;
});
/**
 * Windows 沙箱开关（CLAUDE_CODE_NANKEEN_KESTREL / tengu_nankeen_kestrel）。
 */
//@ chunk-fq0cr76a.js:858886-859049 placement
function isWindowsSandboxEnabled() {
  if (getPlatform() !== "windows") return !1;
  if (env.CLAUDE_CODE_NANKEEN_KESTREL) return ((wv.hasBeenOn = !0), !0);
  let e = getFeatureValue_CACHED_MAY_BE_STALE("tengu_nankeen_kestrel", !1);
  return ((wv.hasBeenOn ||= e), e);
}
//@ chunk-fq0cr76a.js:859049-859084 placement
function Oai() {
  return wv.hasBeenOn;
}
//@ chunk-fq0cr76a.js:859084-859112 placement
var CLAUDECODESANDBOX = "ClaudeCodeSandbox";
//@ chunk-fq0cr76a.js:859112-859172 placement
function tD() {
  return { exe: process.execPath, prependArgs: [rg] };
}
//@ chunk-fq0cr76a.js:859172-859369 placement
function formatProfileForgetHint() {
  return `To take it back, close every Claude Code session and run "${process.execPath}" ${rg} profile forget in a terminal; sandboxed commands then read nothing in your user profile.`;
}
//@ chunk-fq0cr76a.js:859369-859514 placement
var SECLOGON_ACCESS_DENIED_RE =
  /(CreateProcessWithLogonW\([^)\n]{0,256}\): .{0,512}?\(0x80070005\)) \u2014 ensure the Secondary Logon service \(seclogon\) is running\./;
//@ chunk-fq0cr76a.js:859514-859547 placement
function Av(e) {
  return SECLOGON_ACCESS_DENIED_RE.test(e);
}
/**
 * 生成 Windows 沙箱不可用时的补救说明（/sandbox install、管理员信任 CA 等，约 3 KB）。
 */
//@ chunk-fq0cr76a.js:859547-862760 placement
function describeWindowsSandboxRemedy(e, n) {
  if (getPlatform() !== "windows") return e;
  let replaced = e.replace(/\s*Windows sandbox needs a one-time install[\s\S]*$/, ""),
    s = n?.omitCcRemedy ? "" : "Run /sandbox install, or see https://code.claude.com/docs/en/sandboxing.",
    h = n?.omitCcRemedy
      ? ""
      : "Ask your administrator to trust the sandbox CA \u2014 see https://code.claude.com/docs/en/sandboxing.",
    match =
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
  if (!Av(e)) return trimmed;
  let w = `Windows refused to start this copy of Claude Code (${process.execPath}) as the sandbox account`;
  if (n?.programPermissionAdded)
    return `${w}, even though Claude Code gave the sandbox-runtime-users group read and execute permission on that file. Security software or a Windows policy may be blocking it; ask your administrator. (Details: ${trimmed})`;
  let R = /[\\/]WindowsApps[\\/]/i.test(process.execPath)
    ? "Permissions inside a Windows app package cannot be changed, so use"
    : `Its owner or an administrator can: in PowerShell or Command Prompt (not Git Bash, which rewrites /grant), run icacls "${process.execPath}" /grant sandbox-runtime-users:RX (then restart Claude Code). Otherwise use`;
  return `${w}, and Claude Code ${n?.programPermissionAdded === !1 ? "could not give" : "did not try to give"} the sandbox-runtime-users group read and execute permission on that file. ${R} a copy of Claude Code on a local disk where every user can run it, such as under Program Files. (Details: ${trimmed})`;
}
//@ chunk-fq0cr76a.js:862821-862915 placement
var AM = 131072,
  R0 = 262144,
  vM = 6,
  nle = ["open_to_read", "open_to_write", "final_path", "read", "write"];
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
  constructor(e) {
    super(`the path leads to ${e}`, "a path led to another folder");
    this.reached = e;
  }
}
//@ chunk-fq0cr76a.js:863206-863258 placement
var rle = DoctorLazy(() => u({ step: U(nle), windowsError: E() })),
  A0;
//@ chunk-fq0cr76a.js:863258-863642 placement
function getWindowsFolderSecurity() {
  if (getPlatform() !== "windows") return null;
  if (A0 === void 0) {
    let e = typeof Bun > "u" ? void 0 : Bun.ant?.windowsFolderSecurity;
    if (e === void 0)
      (logForDebugging(
        "[win32-folder-security] this runtime has no Bun.ant.windowsFolderSecurity, so folder permissions can be neither read nor changed. Run Claude Code on the @anthropic-ai/bun-internal version pinned in package.json.",
      ),
        (A0 = null));
    else A0 = toExtendedLengthPath(e);
  }
  return A0;
}
//@ chunk-fq0cr76a.js:863642-864073 placement
function toExtendedLengthPath(e) {
  return {
    open(n, r) {
      let { handle: handle, finalPath: finalPath } = withFolderSecurityError(() => e.open(n, (r & R0) !== 0));
      try {
        if (wM(finalPath) !== wM(`\\\\?\\${win32_3.resolve(n)}`))
          throw new PathLeadsElsewhereError(finalPath);
        return BigInt(handle);
      } catch (error) {
        throw (e.close(handle), error);
      }
    },
    readPermissions(n) {
      if (Rv(n)) throw new WindowsFolderSecurityError("read", vM);
      return withFolderSecurityError(() => e.readPermissions(Number(n)));
    },
    writePermissions(n, r) {
      if (Rv(n)) throw new WindowsFolderSecurityError("write", vM);
      withFolderSecurityError(() => e.writePermissions(Number(n), r));
    },
    close(n) {
      if (!Rv(n)) e.close(Number(n));
    },
  };
}
//@ chunk-fq0cr76a.js:864073-864193 placement
function withFolderSecurityError(e) {
  try {
    return e();
  } catch (error) {
    let { data: r } = rle().safeParse(error);
    throw r === void 0 ? error : new WindowsFolderSecurityError(r.step, r.windowsError);
  }
}
//@ chunk-fq0cr76a.js:864193-864256 placement
function wM(e) {
  return e.replace(/[A-Z]/g, (n) => n.toLowerCase());
}
//@ chunk-fq0cr76a.js:864256-864299 placement
function Rv(e) {
  return e <= 0n || e > 0xffffffffn;
}
//@ chunk-fq0cr76a.js:864367-864404 placement
var Aor = /^S-1-5-21-\d+-\d+-\d+-\d+$/;
/**
 * 让沙箱组能读取 Claude Code 可执行文件（应用包内无法修改时说明）。
 */
//@ chunk-fq0cr76a.js:864404-865519 placement
async function grantExecutableReadToSandboxGroup({
  exePath: exePath,
  previous: previous,
  getUserStatus: getUserStatus,
}) {
  let s = oD(exePath);
  if (getPlatform() !== "windows" || Qn(s) || !win32_4.isAbsolute(s)) return;
  try {
    let h = await lstat_3(s, { bigint: !0 }),
      y = `${h.dev}:${h.ino}:${h.size}:${h.mtimeNs}`;
    if (y === previous?.file) return previous;
    if (!h.isFile())
      return (
        logForDebugging(`[sandbox] ${s} is not a regular file; its permissions are left alone`),
        logFeatureSad("sandbox_windows_exe_grant", "not_a_regular_file"),
        { file: y, added: !1 }
      );
    let b = await getUserStatus();
    if (!b.provisioned) return;
    let S = b.groupSid ?? b.sid;
    if (S === void 0 || !Aor.test(S))
      return (logFeatureSad("sandbox_windows_exe_grant", "unexpected_sid"), { file: y, added: !1 });
    let w = await execFileNoThrow(
      win32_4.join(x2(), "System32", "icacls.exe"),
      [s, "/grant", `*${S}:(RX)`, "/L"],
      { timeout: 15000, cwd: x2(), preserveOutputOnError: !0 },
    );
    if (
      (logForDebugging(
        `[sandbox] icacls ${s} /grant *${S}:(RX) /L exited ${w.exitCode ?? "with no exit code"}${w.error === void 0 ? "" : ` (${w.error})`}: ${w.stderr || w.stdout}`,
      ),
      w.code !== 0)
    )
      return (
        logFeatureSad("sandbox_windows_exe_grant", w.timedOut ? "icacls_timeout" : "icacls_failed"),
        { file: y, added: !1 }
      );
    return (logFeatureOk("sandbox_windows_exe_grant"), { file: y, added: !0 });
  } catch (error) {
    logForDebugging(`[sandbox] could not let the sandbox account run ${s}: ${errorMessage(error)}`, {
      level: "error",
    });
    return;
  }
}
//@ chunk-fq0cr76a.js:865519-866237 placement
var MAX_PARENT_FOLDERS = 32,
  ole = 128,
  BM = 1048576,
  ale = 4,
  lle = 256,
  UM = 1024,
  FM = 4096,
  IM = 0,
  cle = 8,
  ule = 16,
  kp = 20,
  dle = 8,
  N0 = 8,
  Iv =
    "sandboxed PowerShell commands may start in the drive's root, Node may fail with EPERM, and in Git Bash cd .. and mkdir -p with a full path may fail",
  fle = {
    mask: MAX_PARENT_FOLDERS | ole | BM,
    has: "may already enter, and read the attributes of,",
    name: "the right to enter, and to read the attributes of,",
    without: Iv,
    codePrefix: "",
  },
  NM = {
    mask: MAX_PARENT_FOLDERS | BM,
    has: "already has the traverse and synchronize rights (X and S in icacls) on",
    name: "the traverse and synchronize rights (X and S in icacls) on",
    without:
      "in the sandbox, Node 20 and older releases of Node 22 may fail with EPERM, and in Git Bash mkdir -p with a full path may fail",
    codePrefix: "home_",
  };
/**
 * 给项目/主目录的上级文件夹添加沙箱组的进入/读属性权限（可用环境变量关闭）。
 */
//@ chunk-fq0cr76a.js:866237-868346 placement
async function grantParentFoldersToSandboxGroup({
  project: project,
  home: home,
  configHomes: configHomes,
  getUserStatus: getUserStatus,
}) {
  if (getPlatform() !== "windows") return;
  try {
    if (env.CLAUDE_CODE_SANDBOX_LEAVE_PARENT_FOLDERS_ALONE) {
      logParentFolderGrant("switched_off", "CLAUDE_CODE_SANDBOX_LEAVE_PARENT_FOLDERS_ALONE is set");
      return;
    }
    let h = describeUnresolvableFullName(home),
      y = describeUnresolvableFullName(project),
      b = listIntermediateDirs(h, y);
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
    for (let Z of configHomes) {
      let { real: real, code: code } = Rke(Z);
      if (real !== void 0) S.push(real);
      else if (code !== "ENOENT") {
        logParentFolderGrant(
          `own_folder_unresolved_${code ?? "no_code"}`,
          `it cannot be told whether Claude Code's own folder ${Z} is a link: ${code ?? "no error code"}`,
        );
        return;
      }
    }
    let found = S.find((Z) => getRelativeSegments(...VM(Z, y)) !== void 0);
    if (found !== void 0) {
      logForDebugging(
        `[sandbox] ${y} lies in Claude Code's own folder ${found}, so no parent folder gets an entry for the sandbox group; ${Iv}`,
      );
      return;
    }
    let R = await getUserStatus().catch((Z) => {
      logParentFolderGrant("status_unreadable", errorMessage(Z));
      return;
    });
    if (R === void 0) return;
    if (!R.provisioned) {
      logForDebugging(
        "[sandbox] there is no sandbox account yet, so no folder gets an entry for the sandbox group",
      );
      return;
    }
    if (R.groupSid === void 0 || !Aor.test(R.groupSid)) {
      logParentFolderGrant("unexpected_sid", "the sandbox group has no SID of the usual form");
      return;
    }
    let D = getWindowsFolderSecurity();
    if (D === null) {
      logParentFolderGrant("ffi_unavailable", "this runtime has no Bun.ant.windowsFolderSecurity");
      return;
    }
    let O = encodeSidBuffer(R.groupSid),
      [L, ...V] = b,
      filtered = V.map((Z) => ensureSandboxGroupEntry(D, Z, O, fle)).filter((Z) => Z !== void 0);
    if (filtered.includes("differs_after_write"))
      (logForDebugging(
        `[sandbox] ${L} gets no entry for the sandbox group, since a write further down read back differently; ${NM.without}`,
        { level: "error" },
      ),
        filtered.push("home_skipped_after_bad_read_back"));
    else if (L !== void 0) {
      let Z = ensureSandboxGroupEntry(D, L, O, NM);
      if (Z !== void 0) filtered.push(Z);
    }
    let q =
      filtered.find((Z) => Z.endsWith("differs_after_write")) ??
      filtered.find((Z) => !Z.endsWith("no_list")) ??
      filtered[0];
    if (q === void 0) logFeatureOk("sandbox_windows_parent_folder_grant");
    else logFeatureSad("sandbox_windows_parent_folder_grant", q);
  } catch (error) {
    (reportSandboxErrorUnderStandIn(error, "parentFoldersNotGranted"),
      logParentFolderGrant("unexpected_error", errorMessage(error)));
  }
}
//@ chunk-fq0cr76a.js:868346-868567 placement
function listIntermediateDirs(e, n) {
  if (![e, n].every($M)) return [];
  let [r, s] = VM(e, n),
    h = getRelativeSegments(r, s);
  if (
    h === void 0 ||
    h[0] === "" ||
    win32_2.dirname(r) === r ||
    s.split(win32_2.sep).some((y) => /[. ]$|\0/.test(y))
  )
    return [];
  return h.map((y, b) => win32_2.join(r, ...h.slice(0, b)));
}
//@ chunk-fq0cr76a.js:868567-868618 placement
function $M(e) {
  return /^[A-Za-z]:[\\/]/.test(oD(e));
}
//@ chunk-fq0cr76a.js:868618-868826 placement
function describeUnresolvableFullName(e) {
  if (!$M(e)) return e;
  let { real: real, code: code } = Rke(e);
  if (real === void 0)
    logForDebugging(
      `[sandbox] Windows cannot give the full name of ${e} (${code}), so the entries for the sandbox group go by that spelling`,
    );
  return real ?? e;
}
//@ chunk-fq0cr76a.js:868826-868887 placement
function VM(e, n) {
  return [win32_2.resolve(oD(e)), win32_2.resolve(oD(n))];
}
//@ chunk-fq0cr76a.js:868887-869001 placement
function getRelativeSegments(e, n) {
  let relativePath = win32_2.relative(e, n);
  return relativePath.split(win32_2.sep)[0] === ".." || win32_2.isAbsolute(relativePath)
    ? void 0
    : relativePath.split(win32_2.sep);
}
//@ chunk-fq0cr76a.js:869001-869802 placement
function parseAclEntries(e, n, r) {
  let uInt16LE = e.readUInt16LE(2),
    uInt32LE = e.readUInt32LE(16);
  if ((uInt16LE & ale) === 0 || uInt32LE === 0) return "no_list";
  let y = uInt32LE + e.readUInt16LE(uInt32LE + 2),
    uInt16LE_2 = e.readUInt16LE(uInt32LE + 4),
    S = uInt32LE + dle,
    w;
  for (let V = 0; V < uInt16LE_2; V++) {
    let uInt8 = e.readUInt8(S),
      uInt8_2 = e.readUInt8(S + 1),
      uInt16LE = e.readUInt16LE(S + 2);
    if (uInt16LE < N0 || S + uInt16LE > y) throw RangeError("a permission entry has an impossible size");
    if (
      uInt8 === IM &&
      (uInt8_2 & cle) === 0 &&
      (e.readUInt32LE(S + 4) & r) >>> 0 === r &&
      e.subarray(S + N0, S + uInt16LE).equals(n)
    )
      return "present";
    if ((uInt8_2 & ule) !== 0) w ??= S;
    S += uInt16LE;
  }
  let R = w ?? S,
    alloc = Buffer.alloc(N0 + n.length);
  (alloc.writeUInt8(IM, 0),
    alloc.writeUInt16LE(alloc.length, 2),
    alloc.writeUInt32LE(r, 4),
    n.copy(alloc, N0));
  let alloc_2 = Buffer.alloc(kp);
  (e.copy(alloc_2, 0, 0, 2),
    alloc_2.writeUInt16LE((uInt16LE & UM) === 0 ? uInt16LE : uInt16LE | lle, 2),
    alloc_2.writeUInt32LE(kp, 16));
  let buffer = Buffer.concat([alloc_2, e.subarray(uInt32LE, R), alloc, e.subarray(R, S)]);
  return (
    buffer.writeUInt16LE(buffer.length - kp, kp + 2),
    buffer.writeUInt16LE(uInt16LE_2 + 1, kp + 4),
    buffer
  );
}
//@ chunk-fq0cr76a.js:869802-869925 placement
function isFontWriteConsistent({ before: before, written: written, after: after }) {
  return (
    decodeFont(written).equals(decodeFont(after)) &&
    ((before.readUInt16LE(2) ^ after.readUInt16LE(2)) & (FM | UM)) === 0
  );
}
//@ chunk-fq0cr76a.js:869925-870008 placement = decodeFont (0.816)
function decodeFont(e) {
  let cp = e.readUInt32LE(16);
  return e.subarray(cp, cp + e.readUInt16LE(cp + 2));
}
//@ chunk-fq0cr76a.js:870008-870232 placement
function encodeSidBuffer(e) {
  let [n, r, ...s] = e.split("-").slice(1).map(Number),
    alloc = Buffer.alloc(8 + 4 * s.length);
  (alloc.writeUInt8(n ?? 0, 0), alloc.writeUInt8(s.length, 1), alloc.writeUIntBE(r ?? 0, 2, 6));
  for (let [y, b] of s.entries()) alloc.writeUInt32LE(b, 8 + 4 * y);
  return alloc;
}
//@ chunk-fq0cr76a.js:870232-870383 placement
function logParentFolderGrant(e, n) {
  (logForDebugging(`[sandbox] no folder gets an entry for the sandbox group (${n}); ${Iv}`, {
    level: "error",
  }),
    logFeatureSad("sandbox_windows_parent_folder_grant", e));
}
//@ chunk-fq0cr76a.js:870383-871971 placement
function ensureSandboxGroupEntry(e, n, r, s) {
  try {
    let h = describeAclListState(e, n, r, s.mask, AM);
    switch (h) {
      case "present":
        logForDebugging(`[sandbox] the sandbox group ${s.has} ${n}`);
        return;
      case "added":
        logForDebugging(`[sandbox] gave the sandbox group ${s.name} ${n}`);
        return;
      case "no_list":
        return (
          logForDebugging(
            `[sandbox] ${n} has no permission list, which allows everyone everything; left as it is, with no entry for the sandbox group`,
            { level: "warn" },
          ),
          s.codePrefix + h
        );
      case "unreadable_list":
        return (
          logForDebugging(
            `[sandbox] the permission list of ${n} is malformed or full, so it gets no entry for the sandbox group; ${s.without}`,
            { level: "error" },
          ),
          s.codePrefix + h
        );
      default:
        return (
          logForDebugging(
            `[sandbox] after an entry for the sandbox group was added to ${n}, its permissions read back differently from what was written (control word 0x${h.controlBefore.toString(16)} before, 0x${h.controlAfter.toString(16)} after); left as they are, and icacls "${n}" shows them${h.controlBefore & ~h.controlAfter & FM ? `. The list is no longer protected from what the folder above hands down: icacls "${n}" /inheritance:r should protect it again (untried; it visits everything beneath)` : ""}`,
            { level: "error" },
          ),
          `${s.codePrefix}differs_after_write`
        );
    }
  } catch (error) {
    if (error instanceof PathLeadsElsewhereError)
      return (
        logForDebugging(
          `[sandbox] ${n} leads to ${error.reached}, through a link or another spelling, so it gets no entry for the sandbox group; ${s.without}`,
          { level: "error" },
        ),
        `${s.codePrefix}other_folder_reached`
      );
    if (
      (logForDebugging(
        `[sandbox] could not give the sandbox group ${s.name} ${n} (${errorMessage(error)}); ${s.without}`,
        { level: "error" },
      ),
      error instanceof WindowsFolderSecurityError)
    )
      return `${s.codePrefix}${error.step}_failed_${error.windowsError}`;
    return (reportSandboxErrorUnderStandIn(error, "oneFolderNotGranted"), `${s.codePrefix}unexpected_error`);
  }
}
//@ chunk-fq0cr76a.js:871971-872386 placement
function describeAclListState(e, n, r, s, h) {
  let open = e.open(n, h);
  try {
    let permissions = e.readPermissions(open),
      S;
    try {
      S = parseAclEntries(permissions, r, s);
    } catch (error) {
      if (error instanceof RangeError) return "unreadable_list";
      throw error;
    }
    if (typeof S === "string") return S;
    if ((h & R0) !== 0) {
      e.writePermissions(open, S);
      let permissions_2 = e.readPermissions(open);
      return isFontWriteConsistent({ before: permissions, written: S, after: permissions_2 })
        ? "added"
        : { controlBefore: permissions.readUInt16LE(2), controlAfter: permissions_2.readUInt16LE(2) };
    }
  } finally {
    e.close(open);
  }
  return describeAclListState(e, n, r, s, h | R0);
}
//@ chunk-fq0cr76a.js:872386-872775 placement
var USER_SID_PATTERN = /^S-1-5-21-\d+-\d+-\d+-\d+$/,
  gle = ["bad_request", "user_in_sandbox_group", "account_not_in_sandbox_group", "grant_root_unresolved"],
  yle = DoctorLazy(() =>
    Ue([
      u({ version: T(1), off: o() }),
      u({
        version: T(1),
        off: zg(),
        stands: A(E()),
        handedBack: A(u({ id: E(), why: o() })),
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
  ),
  jM = { denyRead: new Map(), denyWrite: new Map() };
//@ chunk-fq0cr76a.js:872775-873377 placement
function getSandboxUserStatus() {
  let e = getPlatform() === "windows" && typeof Bun < "u" ? Bun.ant?.windowsSandboxDeniesArg?.() : void 0;
  if (typeof e !== "string") return;
  return async (n) => {
    let r = await execFileNoThrow(tD().exe, [e], {
      input: jsonStringify(n),
      timeout: n.deadlineMs + 2000,
      cwd: x2(),
      preserveOutputOnError: !0,
      maxBuffer: 1e6,
      waitForExitAfterKill: !0,
    });
    if (r.code !== 0 || r.stderr !== "")
      logForDebugging(
        `[sandbox] the sub-command for Windows deny entries ${r.exitCode === void 0 ? `was killed or never ran (${r.error ?? "no more is known"})` : `exited ${r.exitCode}`}${r.stderr && `: ${r.stderr}`}`,
      );
    if (r.code !== 0) throw Error("the sub-command was killed or did not exit with 0");
    return jsonParse(r.stdout);
  };
}
//@ chunk-fq0cr76a.js:873377-873731 placement
function describeLocalConnectionsOff(e, n) {
  let { data: r } = yle().safeParse(e);
  if (r === void 0) return;
  if (r.off !== null) return { off: gle.find((h) => h === r.off) ?? "off_unknown" };
  let s = [...r.stands, ...r.handedBack.map((h) => h.id)];
  return s.length === n.size && new Set(s).size === n.size && s.every((h) => n.has(h))
    ? { off: void 0, handedBack: new Map(r.handedBack.map((h) => [h.id, h.why])), tally: r.tally }
    : void 0;
}
//@ chunk-fq0cr76a.js:873731-874155 placement
function splitDenyLists(e, n, r) {
  return ["denyRead", "denyWrite"]
    .flatMap((s) => e[s].map((h) => ({ list: s, spelling: h })))
    .filter(({ spelling: spelling }) => !n.has(spelling) && !/[*?[\]{}]/.test(spelling))
    .flatMap(({ list: list, spelling: spelling }) => {
      let [y, ...b] = r(spelling);
      return y === void 0 || b.length > 0 ? [] : [{ list: list, spelling: spelling, path: y }];
    })
    .map(({ list: list, spelling: spelling, path: path }, b) => ({
      id: b,
      list: list,
      spelling: spelling,
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
function describeDeniesNotRenewed(e, n, r = "") {
  return (
    logForDebugging(
      `[sandbox] Windows: Bun's sub-command did not write the deny entries (${e}${r}); ${n ? "srt-win writes them all" : "they were not renewed before this command"}`,
      { level: "warn" },
    ),
    logFeatureSad("sandbox_windows_native_denies", e, { at_start: n }),
    jM
  );
}
/**
 * 用 Bun 子命令写入 Windows deny 条目并核对（账号异常、回答不可读）。
 */
//@ chunk-fq0cr76a.js:874614-875681 placement
async function writeWindowsDenyEntries({
  lists: lists,
  configured: configured,
  grantRoots: grantRoots,
  user: user,
  atStart: atStart,
  write: write,
  expand: expand,
}) {
  try {
    let { sid: sid, groupSid: groupSid } = user;
    if (
      sid === void 0 ||
      groupSid === void 0 ||
      !USER_SID_PATTERN.test(sid) ||
      !USER_SID_PATTERN.test(groupSid) ||
      !user.inSandboxGroup
    )
      return describeDeniesNotRenewed("unexpected_account", atStart);
    let R = splitDenyLists(lists, configured, expand);
    if (R.length === 0) return collectDenyPaths([], () => !0);
    let D = describeLocalConnectionsOff(
      await write({
        version: 1,
        groupSid: groupSid,
        accountSid: sid,
        entries: R.map(({ id: id, path: path, refuse: refuse }) => ({ id: id, path: path, refuse: refuse })),
        grantRoots: grantRoots,
        deadlineMs: atStart ? 60000 : 1e4,
      }),
      new Set(R.map((V) => V.id)),
    );
    if (D === void 0) return describeDeniesNotRenewed("unreadable_answer", atStart);
    if (D.off !== void 0) return describeDeniesNotRenewed(D.off, atStart);
    let { handedBack: handedBack, tally: tally } = D;
    if (atStart || tally.planted + tally.laid > 0)
      (logForDebugging(
        `[sandbox] Windows deny entries written by Bun's sub-command: ${jsonStringify(tally)}; left to srt-win: ${jsonStringify(R.flatMap((V) => (handedBack.has(V.id) ? [[V.path, handedBack.get(V.id)]] : [])))}`,
      ),
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
        }));
    return collectDenyPaths(R, (V) => (handedBack.get(V.id) === "deadline" ? void 0 : !handedBack.has(V.id)));
  } catch (error) {
    return describeDeniesNotRenewed("threw", atStart, `: ${errorMessage(error)}`);
  }
}
/**
 * 判断 Windows 原生拒绝列表是否全部已应用（每个条目都有结果，或被回调认可为可忽略）。
 */
//@ chunk-fq0cr76a.js:875681-875802 placement
function areNativeDeniesComplete(e, n = () => !1) {
  return (
    e !== jM && ["denyRead", "denyWrite"].every((r) => [...e[r]].every(([s, h]) => h !== void 0 || n(r, s)))
  );
}
//@ chunk-fq0cr76a.js:875802-875885 placement
function Nv(e) {
  return [...e.denyRead.values(), ...e.denyWrite.values()].some((n) => n);
}
/**
 * 合并原生拒绝状态：保留仍在配置中的条目，新结果覆盖旧结果。
 */
//@ chunk-fq0cr76a.js:875885-876008 placement
function mergeNativeDenyState(e, n, r) {
  return {
    denyRead: mergeDenyMap(e.denyRead, n.denyRead, r.denyRead),
    denyWrite: mergeDenyMap(e.denyWrite, n.denyWrite, r.denyWrite),
  };
}
//@ chunk-fq0cr76a.js:876008-876128 placement
function mergeDenyMap(e, n, r) {
  let s = new Set(r);
  return new Map([...e, ...[...n].filter(([, h]) => h !== void 0)].filter(([h]) => s.has(h)));
}
/**
 * 从配置中去掉已由原生拒绝成功应用的读/写拒绝条目。
 */
//@ chunk-fq0cr76a.js:876128-876273 placement
function dropAppliedNativeDenies(e, n) {
  return {
    ...e,
    denyRead: e.denyRead.filter((r) => n.denyRead.get(r) !== !0),
    denyWrite: e.denyWrite.filter((r) => n.denyWrite.get(r) !== !0),
  };
}
/**
 * 整理 git 的 home 与配置目录（只取绝对路径并规范化）。
 */
//@ chunk-fq0cr76a.js:876335-876439 placement
function getGitHomeInfo(e, n) {
  return {
    home: win32_5.isAbsolute(e) ? normalizeGitPathArg(e) : void 0,
    configHomes: n.filter(win32_5.isAbsolute).map(normalizeGitPathArg),
  };
}
/**
 * 判断路径是否位于 git 的 home 或任一配置目录之下。
 */
//@ chunk-fq0cr76a.js:876439-876539 placement
function isUnderGitHome(e, { home: home, configHomes: configHomes }) {
  let s = normalizeGitPathArg(e);
  return (home !== void 0 && QM(s, home)) || configHomes.some((h) => _le(s, h));
}
//@ chunk-fq0cr76a.js:876539-876888 placement
var HOME_AS_CWD_NOTE =
  "Claude Code's working folder is your home folder, a folder that contains it, or Claude Code's config folder. The Windows sandbox doesn't start there, because sandboxed commands from other sessions could then reach your settings and credentials. Start a new session in a project folder, or move this one there (`/cd <folder>` in a terminal)";
//@ chunk-fq0cr76a.js:876888-876912 placement
class O0 extends Error {}

export {
  tD,
  CLAUDECODESANDBOX,
  formatProfileForgetHint,
  grantExecutableReadToSandboxGroup,
  describeWindowsSandboxRemedy,
  isWindowsSandboxEnabled,
  Oai,
  getGitHomeInfo,
  isUnderGitHome,
  Av,
  O0,
  HOME_AS_CWD_NOTE,
  grantParentFoldersToSandboxGroup,
  getSandboxUserStatus,
  writeWindowsDenyEntries,
  mergeNativeDenyState,
  Nv,
  dropAppliedNativeDenies,
  areNativeDeniesComplete,
  Aor,
  escapeInvalidCharClasses,
};
