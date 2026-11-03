/**
 * utils/sandbox/windowsGitIdentity.ts
 *
 * 2.1.316 新增：Windows 沙箱 git 身份
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (11)
 * attribution: placement 11
 */
import {
  win32,
  win32 as win32_2,
  win32 as win32_3,
  win32 as win32_4,
  win32 as win32_5,
  win32 as win32_6,
  win32 as win32_7,
  win32 as win32_8,
  join,
  join as join_2,
  join as join_3,
  join as join_4,
  join as join_5,
  join as join_6,
  join as join_7,
  join as join_8,
  join as join_9,
  join as join_10,
  join as join_11,
  join as join_12,
  join as join_13,
  join as join_14,
  join as join_15,
  join as join_16,
  join as join_17,
  join as join_18,
  join as join_19,
  join as join_20,
  join as join_21,
  join as join_22,
  join as join_23,
  join as join_24,
  join as join_25,
  join as join_26,
  join as join_27,
  join as join_28,
  join as join_29,
  join as join_30,
  join as join_31,
  join as join_32,
  join as join_33,
  join as join_34,
  join as join_35,
  join as join_36,
  join as join_37,
  join as join_38,
  join as join_40,
  join as join_41,
  join as join_42,
  join as join_43,
  join as join_44,
  join as join_45,
  join as join_46,
  join as join_47,
  join as join_48,
  join as join_49,
  join as join_50,
  join as join_51,
  join as join_52,
  join as join_53,
  join as join_54,
  join as join_55,
  join as join_56,
  join as join_57,
  join as join_58,
  join as join_59,
  join as join_60,
  join as join_61,
  join as join_62,
  join as join_63,
  join as join_64,
  join as join_65,
  join as join_66,
  join as join_67,
  join as join_68,
  join as join_69,
  join as join_70,
  join as join_71,
  join as join_72,
  join as join_73,
  join as join_74,
  join as join_75,
  join as join_76,
  join as join_77,
  join as join_78,
  join as join_79,
  join as join_80,
  join as join_81,
  join as join_82,
  join as join_84,
  join as join_85,
  join as join_86,
  join as join_87,
  join as join_88,
  join as join_89,
  join as join_90,
  join as join_91,
  join as join_92,
  join as join_93,
  join as join_94,
  join as join_95,
  join as join_96,
  join as join_97,
  join as join_98,
  join as join_99,
  join as join_100,
  join as join_101,
  join as join_102,
  join as join_103,
  join as join_104,
  join as join_105,
  join as join_106,
  join as join_107,
  join as join_108,
  join as join_109,
  join as join_110,
  join as join_111,
  join as join_112,
  join as join_113,
  join as join_114,
  join as join_115,
  join as join_116,
  join as join_117,
  join as join_118,
  join as join_119,
  join as join_120,
  join as join_121,
  join as join_122,
  join as join_123,
  join as join_124,
  join as join_125,
  join as join_126,
  join as join_127,
  join as join_128,
  join as join_129,
} from "path";
import {
  open,
  open as open_2,
  open as open_3,
  open as open_4,
  open as open_5,
  open as open_6,
  open as open_7,
  open as open_8,
  open as open_9,
  open as open_10,
  open as open_11,
  open as open_12,
  open as open_13,
  open as open_14,
  open as open_15,
  open as open_16,
  open as open_17,
  open as open_18,
  open as open_19,
  open as open_20,
  open as open_21,
  open as open_22,
  open as open_23,
  open as open_24,
  open as open_25,
  open as open_26,
  open as open_27,
  rm as rm_2,
  rm as rm_2_2,
  rm as rm_3,
  rm as rm_4,
  rm as rm_5,
  rm as rm_6,
  rm as rm_7,
  rm as rm_8,
  rm as rm_9,
  rm as rm_10,
  rm as rm_11,
  rm as rm_12,
  rm as rm_13,
  rm as rm_14,
  rm as rm_15,
  rm as rm_16,
  rm as rm_17,
  rm as rm_18,
  rm as rm_19,
  rm as rm_20,
  rm as rm_21,
  rm as rm_22,
  rm as rm_23,
  rm as rm_24,
  rm as rm_25,
  rm as rm_26,
  rm as rm_27,
  lstat,
  lstat as lstat_2,
  lstat as lstat_3,
  lstat as lstat_4,
  lstat as lstat_5,
  lstat as lstat_6,
  lstat as lstat_7,
  lstat as lstat_8,
  lstat as lstat_9,
  lstat as lstat_10,
  lstat as lstat_11,
  lstat as lstat_12,
  lstat as lstat_13,
  lstat as lstat_14,
  lstat as lstat_15,
  lstat as lstat_16,
  lstat as lstat_17,
  lstat as lstat_18,
  lstat as lstat_19,
  lstat as lstat_20,
  lstat as lstat_21,
  lstat as lstat_22,
  lstat as lstat_23,
  lstat as lstat_24,
  lstat as lstat_25,
  lstat as lstat_26,
  lstat as lstat_27,
  lstat as lstat_28,
  lstat as lstat_29,
  lstat as lstat_30,
  lstat as lstat_31,
  lstat as lstat_32,
  lstat as lstat_33,
  lstat as lstat_34,
  lstat as lstat_35,
  lstat as lstat_36,
  lstat as lstat_37,
  lstat as lstat_38,
  lstat as lstat_39,
  lstat as lstat_40,
  lstat as lstat_41,
  lstat as lstat_42,
  lstat as lstat_43,
} from "fs/promises";
import {
  randomUUID,
  randomUUID as randomUUID_2,
  randomUUID as randomUUID_3,
  randomUUID as randomUUID_4,
  randomUUID as randomUUID_5,
  randomUUID as randomUUID_6,
  randomUUID as randomUUID_7,
  randomUUID as randomUUID_8,
  randomUUID as randomUUID_9,
  randomUUID as randomUUID_10,
  randomUUID as randomUUID_11,
  randomUUID as randomUUID_12,
  randomUUID as randomUUID_13,
  randomUUID as randomUUID_14,
  randomUUID as randomUUID_15,
  randomUUID as randomUUID_16,
  randomUUID as randomUUID_17,
  randomUUID as randomUUID_18,
  randomUUID as randomUUID_19,
  randomUUID as randomUUID_20,
  randomUUID as randomUUID_21,
  randomUUID as randomUUID_22,
  randomUUID as randomUUID_23,
  randomUUID as randomUUID_24,
  randomUUID as randomUUID_25,
  randomUUID as randomUUID_26,
  randomUUID as randomUUID_27,
  randomUUID as randomUUID_28,
  randomUUID as randomUUID_29,
  randomUUID as randomUUID_30,
  randomUUID as randomUUID_31,
  randomUUID as randomUUID_32,
  randomUUID as randomUUID_33,
  randomUUID as randomUUID_34,
  randomUUID as randomUUID_35,
  randomUUID as randomUUID_36,
  randomUUID as randomUUID_37,
  randomUUID as randomUUID_38,
  randomUUID as randomUUID_39,
  randomUUID as randomUUID_40,
  randomUUID as randomUUID_41,
  randomUUID as randomUUID_42,
  randomUUID as randomUUID_43,
  randomUUID as randomUUID_44,
  randomUUID as randomUUID_45,
  randomUUID as randomUUID_46,
  randomUUID as randomUUID_47,
  randomUUID as randomUUID_48,
  randomUUID as randomUUID_49,
  randomUUID as randomUUID_50,
} from "crypto";
import { Qn } from "../pathClassification.js";
import { SandboxManager } from "./sandbox-adapter.js";
import { getPathsForPermissionCheck } from "../fsOperations.js";
import { isPathInSandboxWriteAllowlist } from "../permissions/pathValidation.js";
import { io } from "../../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import { readGlobalGitConfigValue } from "../git.js";
import { tmpdir } from "../tempDir.js";
import { Pot } from "../../../vendor/@anthropic-ai/sandbox-runtime/dist/sandbox/windows-sandbox-utils.js";
import { tD, Aor } from "./windowsSandbox.js";
import { logFeatureSad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { execFileNoThrow } from "../execFileNoThrow.js";
import { x2 } from "../claudeInChrome/windowsAppPaths.js";
import { logForDebugging } from "../debug.js";
import { isSentinelInode } from "../slowOperations.js";
import { registerCleanup } from "../cleanupRegistry.js";
import { errorMessage } from "../errors.js";

//@ chunk-e6aww6q8.js:3045428-3045452 placement
var ovr = /^[^\p{Cc}]+$/u;
//@ chunk-e6aww6q8.js:3045452-3045558 placement
function pickSafeGitIdentity(e) {
  return ["name", "email"].flatMap((n) => {
    let r = e[n];
    return r !== null && ovr.test(r) ? [[n, r]] : [];
  });
}
//@ chunk-e6aww6q8.js:3045558-3045686 placement
function formatGitUserSection(e) {
  let n = (r) => `"${r.replace(/[\\"]/g, "\\$&")}"`;
  return ["[user]", ...e.map(([r, s]) => `	${r} = ${n(s)}`), ""].join(`
`);
}
//@ chunk-e6aww6q8.js:3045686-3045890 placement
function getGitIdentityUnsafeReason(e) {
  if (Qn(e) || !win32_4.isAbsolute(e)) return "not_local_and_absolute";
  if (SandboxManager.storedDenyListsMayBeShort()) return "deny_lists_may_be_short";
  return getPathsForPermissionCheck(e).some((n) => isPathInSandboxWriteAllowlist(n, [n]))
    ? "sandbox_may_write"
    : void 0;
}
//@ chunk-e6aww6q8.js:3045890-3046085 placement
var readGlobalGitIdentity = io(async (e) => {
    let [n, r] = await Promise.all([
      readGlobalGitConfigValue("user.name", e),
      readGlobalGitConfigValue("user.email", e),
    ]);
    return pickSafeGitIdentity({ name: n, email: r });
  }),
  getSandboxGitConfigPath = io((e, n) => join_81(tmpdir(), `claude-sandbox-${n()}.gitconfig`)),
  OWNER_RIGHTS_SID = "S-1-3-4";
//@ chunk-e6aww6q8.js:3046085-3046712 placement
async function provisionWindowsGitIdentity(e) {
  let n = await Pot({ srtWin: tD() }),
    r = n.groupSid ?? n.sid;
  if (!n.provisioned) return (logFeatureSad("sandbox_windows_git_identity", "not_provisioned"), !1);
  if (r === void 0 || !Aor.test(r))
    return (logFeatureSad("sandbox_windows_git_identity", "unexpected_sid"), !1);
  let s = await execFileNoThrow(
    win32_4.join(x2(), "System32", "icacls.exe"),
    [e, "/inheritance:r", "/grant:r", `*${OWNER_RIGHTS_SID}:(F)`, `*${r}:(R)`, "/L"],
    { timeout: 15000, cwd: x2(), preserveOutputOnError: !0 },
  );
  if (s.code !== 0)
    (logForDebugging(
      `[sandbox] icacls ${e} exited ${s.exitCode ?? "with no exit code"}: ${s.stderr || s.stdout}`,
      { level: "warn" },
    ),
      logFeatureSad("sandbox_windows_git_identity", s.timedOut ? "icacls_timeout" : "icacls_failed"));
  return s.code === 0;
}
//@ chunk-e6aww6q8.js:3046712-3046772 placement = getFileIdentity (0.794)
function getFileIdentity_6({ dev: dev, ino: ino }) {
  return isSentinelInode(ino) ? void 0 : `${dev}:${ino}`;
}
/**
 * 独占创建沙箱用的 git 配置文件并设置 Windows 访问权限，确认文件未被替换且为空后写入内容，返回文件标识；任何一步异常都打点并放弃。
 */
//@ chunk-e6aww6q8.js:3046772-3047181 placement
async function writeSandboxGitConfig(e, n) {
  await using handle = await open_17(e, "wx");
  if ((registerCleanup(() => rm_18(e, { force: !0 })), !(await provisionWindowsGitIdentity(e)))) return;
  let [openedStat, pathStat] = await Promise.all([handle.stat({ bigint: !0 }), lstat_28(e, { bigint: !0 })]);
  if (getFileIdentity_6(openedStat) === void 0) {
    logFeatureSad("sandbox_windows_git_identity", "no_file_identity");
    return;
  }
  if (getFileIdentity_6(openedStat) !== getFileIdentity_6(pathStat) || openedStat.size !== 0n) {
    logFeatureSad("sandbox_windows_git_identity", "replaced");
    return;
  }
  return (
    await handle.writeFile(n),
    logFeatureOk("sandbox_windows_git_identity"),
    getFileIdentity_6(openedStat)
  );
}
//@ chunk-e6aww6q8.js:3047181-3047197 placement
var pvr = io(writeSandboxGitConfig);
//@ chunk-e6aww6q8.js:3047197-3047891 placement
async function prepareSandboxGitGlobalConfig(e, n = randomUUID_31) {
  try {
    let r = await readGlobalGitIdentity(e);
    if (r.length < 2) readGlobalGitIdentity.cache.delete(e);
    let s = formatGitUserSection(r),
      h = getSandboxGitConfigPath(s, n),
      y = getGitIdentityUnsafeReason(h);
    if (y !== void 0) {
      (getSandboxGitConfigPath.cache.delete(s), logFeatureSad("sandbox_windows_git_identity", y));
      return;
    }
    let S = await pvr(h, s);
    if (S === void 0) return;
    let w = await lstat_28(h, { bigint: !0 }).then(getFileIdentity_6, () => {
      return;
    });
    if (S !== w) {
      (getSandboxGitConfigPath.cache.delete(s), logFeatureSad("sandbox_windows_git_identity", "replaced"));
      return;
    }
    return h.replaceAll("\\", "/");
  } catch (error) {
    (readGlobalGitIdentity.cache.delete(e),
      logForDebugging(
        `[sandbox] could not prepare a global config for git (${errorMessage(error)}). Sandboxed git commands will not see your global user.name and user.email, so a commit may fail unless the repository sets them.`,
        { level: "warn" },
      ),
      logFeatureSad("sandbox_windows_git_identity", "threw"));
    return;
  }
}
//@ chunk-e6aww6q8.js:3048940-3049007 placement
function iCe(e) {
  return e.length > 1 && e.endsWith("/") ? e.slice(0, -1) : e;
}

export { iCe, prepareSandboxGitGlobalConfig };
