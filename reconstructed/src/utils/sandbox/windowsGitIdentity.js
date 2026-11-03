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
import { win32, join } from "path";
import { open, rm as rm_2, lstat } from "fs/promises";
import { randomUUID } from "crypto";
import { isUncOrDevicePath } from "../pathClassification.js";
import { SandboxManager } from "./sandbox-adapter.js";
import { getPathsForPermissionCheck } from "../fsOperations.js";
import { isPathInSandboxWriteAllowlist } from "../permissions/pathValidation.js";
import { io } from "../../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import { readGlobalGitConfigValue } from "../git.js";
import { tmpdir } from "../tempDir.js";
import { getWindowsSandboxUserStatusAsync } from "../../../vendor/@anthropic-ai/sandbox-runtime/dist/sandbox/windows-sandbox-utils.js";
import { rgRunner, USER_SID_RE } from "./windowsSandbox.js";
import { logFeatureSad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { execFileNoThrow } from "../execFileNoThrow.js";
import { systemRootDir } from "../claudeInChrome/windowsAppPaths.js";
import { logForDebugging } from "../debug.js";
import { isSentinelInode } from "../slowOperations.js";
import { registerCleanup } from "../cleanupRegistry.js";
import { errorMessage } from "../errors.js";

//@ chunk-e6aww6q8.js:3045428-3045452 placement
var NON_CONTROL_TEXT_RE = /^[^\p{Cc}]+$/u;
//@ chunk-e6aww6q8.js:3045452-3045558 placement
function pickSafeGitIdentity(e) {
  return ["name", "email"].flatMap((n) => {
    let r = e[n];
    return r !== null && NON_CONTROL_TEXT_RE.test(r) ? [[n, r]] : [];
  });
}
//@ chunk-e6aww6q8.js:3045558-3045686 placement
function formatGitUserSection(globalGitIdentity) {
  let n = (r) => `"${r.replace(/[\\"]/g, "\\$&")}"`;
  return ["[user]", ...globalGitIdentity.map(([r, s]) => `	${r} = ${n(s)}`), ""].join(`
`);
}
//@ chunk-e6aww6q8.js:3045686-3045890 placement
function getGitIdentityUnsafeReason(sandboxGitConfigPath) {
  if (isUncOrDevicePath(sandboxGitConfigPath) || !win32.isAbsolute(sandboxGitConfigPath))
    return "not_local_and_absolute";
  if (SandboxManager.storedDenyListsMayBeShort()) return "deny_lists_may_be_short";
  return getPathsForPermissionCheck(sandboxGitConfigPath).some((n) => isPathInSandboxWriteAllowlist(n, [n]))
    ? "sandbox_may_write"
    : undefined;
}
//@ chunk-e6aww6q8.js:3045890-3046085 placement
var readGlobalGitIdentity = io(async (cwd) => {
  let [globalGitConfigValue, globalGitConfigValue_2] = await Promise.all([
    readGlobalGitConfigValue("user.name", cwd),
    readGlobalGitConfigValue("user.email", cwd),
  ]);
  return pickSafeGitIdentity({
    name: globalGitConfigValue,
    email: globalGitConfigValue_2,
  });
});
var getSandboxGitConfigPath = io((e, n) => join(tmpdir(), `claude-sandbox-${n()}.gitconfig`));
var OWNER_RIGHTS_SID = "S-1-3-4";
//@ chunk-e6aww6q8.js:3046085-3046712 placement
async function provisionWindowsGitIdentity(e) {
  let windowsSandboxUserStatus = await getWindowsSandboxUserStatusAsync({
    srtWin: rgRunner(),
  });
  let r = windowsSandboxUserStatus.groupSid ?? windowsSandboxUserStatus.sid;
  if (!windowsSandboxUserStatus.provisioned) {
    logFeatureSad("sandbox_windows_git_identity", "not_provisioned");
    return false;
  }
  if (r === undefined || !USER_SID_RE.test(r)) {
    logFeatureSad("sandbox_windows_git_identity", "unexpected_sid");
    return false;
  }
  let s = await execFileNoThrow(
    win32.join(systemRootDir(), "System32", "icacls.exe"),
    [e, "/inheritance:r", "/grant:r", `*${OWNER_RIGHTS_SID}:(F)`, `*${r}:(R)`, "/L"],
    {
      timeout: 15000,
      cwd: systemRootDir(),
      preserveOutputOnError: true,
    },
  );
  if (s.code !== 0) {
    logForDebugging(
      `[sandbox] icacls ${e} exited ${s.exitCode ?? "with no exit code"}: ${s.stderr || s.stdout}`,
      {
        level: "warn",
      },
    );
    logFeatureSad("sandbox_windows_git_identity", s.timedOut ? "icacls_timeout" : "icacls_failed");
  }
  return s.code === 0;
}
//@ chunk-e6aww6q8.js:3046712-3046772 placement = getFileIdentity (0.794)
function getFileIdentity_6({ dev, ino }) {
  return isSentinelInode(ino) ? undefined : `${dev}:${ino}`;
}
//@ chunk-e6aww6q8.js:3046772-3047181 placement
/**
 * 独占创建沙箱用的 git 配置文件并设置 Windows 访问权限，确认文件未被替换且为空后写入内容，返回文件标识；任何一步异常都打点并放弃。
 */
async function writeSandboxGitConfig(e, n) {
  await using handle = await open(e, "wx");
  registerCleanup(() =>
    rm_2(e, {
      force: true,
    }),
  );
  if (!(await provisionWindowsGitIdentity(e))) return;
  let [openedStat, pathStat] = await Promise.all([
    handle.stat({
      bigint: true,
    }),
    lstat(e, {
      bigint: true,
    }),
  ]);
  if (getFileIdentity_6(openedStat) === undefined) {
    logFeatureSad("sandbox_windows_git_identity", "no_file_identity");
    return;
  }
  if (getFileIdentity_6(openedStat) !== getFileIdentity_6(pathStat) || openedStat.size !== 0n) {
    logFeatureSad("sandbox_windows_git_identity", "replaced");
    return;
  }
  await handle.writeFile(n);
  logFeatureOk("sandbox_windows_git_identity");
  return getFileIdentity_6(openedStat);
}
//@ chunk-e6aww6q8.js:3047181-3047197 placement
var sandboxGitConfigWriter = io(writeSandboxGitConfig);
//@ chunk-e6aww6q8.js:3047197-3047891 placement
async function prepareSandboxGitGlobalConfig(cwd, n = randomUUID) {
  try {
    let globalGitIdentity = await readGlobalGitIdentity(cwd);
    if (globalGitIdentity.length < 2) readGlobalGitIdentity.cache.delete(cwd);
    let s = formatGitUserSection(globalGitIdentity);
    let sandboxGitConfigPath = getSandboxGitConfigPath(s, n);
    let gitIdentityUnsafeReason = getGitIdentityUnsafeReason(sandboxGitConfigPath);
    if (gitIdentityUnsafeReason !== undefined) {
      getSandboxGitConfigPath.cache.delete(s);
      logFeatureSad("sandbox_windows_git_identity", gitIdentityUnsafeReason);
      return;
    }
    let S = await sandboxGitConfigWriter(sandboxGitConfigPath, s);
    if (S === undefined) return;
    let w = await lstat(sandboxGitConfigPath, {
      bigint: true,
    }).then(getFileIdentity_6, () => {
      return;
    });
    if (S !== w) {
      getSandboxGitConfigPath.cache.delete(s);
      logFeatureSad("sandbox_windows_git_identity", "replaced");
      return;
    }
    return sandboxGitConfigPath.replaceAll("\\", "/");
  } catch (error) {
    readGlobalGitIdentity.cache.delete(cwd);
    logForDebugging(
      `[sandbox] could not prepare a global config for git (${errorMessage(error)}). Sandboxed git commands will not see your global user.name and user.email, so a commit may fail unless the repository sets them.`,
      {
        level: "warn",
      },
    );
    logFeatureSad("sandbox_windows_git_identity", "threw");
    return;
  }
}
//@ chunk-e6aww6q8.js:3048940-3049007 placement
/**
 * stripTrailingSlashIfLong：长度大于 1 时去掉末尾斜杠。
 */
function stripTrailingSlashIfLong(denyPath) {
  return denyPath.length > 1 && denyPath.endsWith("/") ? denyPath.slice(0, -1) : denyPath;
}
export { stripTrailingSlashIfLong, prepareSandboxGitGlobalConfig };
