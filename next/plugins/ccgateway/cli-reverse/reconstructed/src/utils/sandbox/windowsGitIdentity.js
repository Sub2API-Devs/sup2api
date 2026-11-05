/**
 * utils/sandbox/windowsGitIdentity.ts
 *
 * 2.1.316 新增：Windows 沙箱 git 身份
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (11)
 * attribution: placement 11
 */
import { win32, join } from "path";
import { open, rm, lstat } from "fs/promises";
import { randomUUID } from "crypto";
import { isUncOrDevicePath } from "../pathClassification.js";
import { SandboxManager } from "./sandbox-adapter.js";
import { getPathsForPermissionCheck } from "../fsOperations.js";
import { isPathInSandboxWriteAllowlist } from "../permissions/pathValidation.js";
import { memoizeAlias } from "../../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:3129525-3129549 placement
var NON_CONTROL_TEXT_RE = /^[^\p{Cc}]+$/u;
//@ chunk-5xgkngpb.js:3129549-3129655 placement
function pickSafeGitIdentity(identity) {
  return ["name", "email"].flatMap((field) => {
    let value = identity[field];
    return value !== null && NON_CONTROL_TEXT_RE.test(value) ? [[field, value]] : [];
  });
}
//@ chunk-5xgkngpb.js:3129655-3129783 placement
function formatGitUserSection(globalGitIdentity) {
  let quote = (value) => `"${value.replace(/[\\"]/g, "\\$&")}"`;
  return ["[user]", ...globalGitIdentity.map(([key, value]) => `	${key} = ${quote(value)}`), ""].join(`
`);
}
//@ chunk-5xgkngpb.js:3129783-3129987 placement
function getGitIdentityUnsafeReason(sandboxGitConfigPath) {
  if (isUncOrDevicePath(sandboxGitConfigPath) || !win32.isAbsolute(sandboxGitConfigPath))
    return "not_local_and_absolute";
  if (SandboxManager.storedDenyListsMayBeShort()) return "deny_lists_may_be_short";
  return getPathsForPermissionCheck(sandboxGitConfigPath).some((path) =>
    isPathInSandboxWriteAllowlist(path, [path]),
  )
    ? "sandbox_may_write"
    : undefined;
}
//@ chunk-5xgkngpb.js:3129987-3130182 placement
var readGlobalGitIdentity; // deferred: uses readGlobalGitConfigValue (../git.js) of its import cycle while loading; runs once the cycle is complete
var getSandboxGitConfigPath;
var OWNER_RIGHTS_SID;
deferInit("chunk-5xgkngpb.js:3129987", () => {
  readGlobalGitIdentity = memoizeAlias(async (cwd) => {
    let [globalGitConfigValue, globalGitConfigValue_2] = await Promise.all([
      readGlobalGitConfigValue("user.name", cwd),
      readGlobalGitConfigValue("user.email", cwd),
    ]);
    return pickSafeGitIdentity({
      name: globalGitConfigValue,
      email: globalGitConfigValue_2,
    });
  });
  getSandboxGitConfigPath = memoizeAlias((content, randomId) =>
    join(tmpdir(), `claude-sandbox-${randomId()}.gitconfig`),
  );
  OWNER_RIGHTS_SID = "S-1-3-4";
});
//@ chunk-5xgkngpb.js:3130182-3130809 placement
async function provisionWindowsGitIdentity(configPath) {
  let windowsSandboxUserStatus = await getWindowsSandboxUserStatusAsync({
    srtWin: rgRunner(),
  });
  let sid = windowsSandboxUserStatus.groupSid ?? windowsSandboxUserStatus.sid;
  if (!windowsSandboxUserStatus.provisioned) {
    logFeatureSad("sandbox_windows_git_identity", "not_provisioned");
    return false;
  }
  if (sid === undefined || !USER_SID_RE.test(sid)) {
    logFeatureSad("sandbox_windows_git_identity", "unexpected_sid");
    return false;
  }
  let result = await execFileNoThrow(
    win32.join(systemRootDir(), "System32", "icacls.exe"),
    [configPath, "/inheritance:r", "/grant:r", `*${OWNER_RIGHTS_SID}:(F)`, `*${sid}:(R)`, "/L"],
    {
      timeout: 15000,
      cwd: systemRootDir(),
      preserveOutputOnError: true,
    },
  );
  if (result.code !== 0) {
    logForDebugging(
      `[sandbox] icacls ${configPath} exited ${result.exitCode ?? "with no exit code"}: ${result.stderr || result.stdout}`,
      {
        level: "warn",
      },
    );
    logFeatureSad("sandbox_windows_git_identity", result.timedOut ? "icacls_timeout" : "icacls_failed");
  }
  return result.code === 0;
}
//@ chunk-5xgkngpb.js:3130809-3130869 placement (2.1.88 match: getFileIdentity, 0.795)
function getFileIdentity_6({ dev, ino }) {
  return isSentinelInode(ino) ? undefined : `${dev}:${ino}`;
}
//@ chunk-5xgkngpb.js:3130869-3131278 placement
/**
 * 独占创建沙箱用的 git 配置文件并设置 Windows 访问权限，确认文件未被替换且为空后写入内容，返回文件标识；任何一步异常都打点并放弃。
 */
async function writeSandboxGitConfig(configPath, content) {
  await using handle = await open(configPath, "wx");
  registerCleanup(() =>
    rm(configPath, {
      force: true,
    }),
  );
  if (!(await provisionWindowsGitIdentity(configPath))) return;
  let [openedStat, pathStat] = await Promise.all([
    handle.stat({
      bigint: true,
    }),
    lstat(configPath, {
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
  await handle.writeFile(content);
  logFeatureOk("sandbox_windows_git_identity");
  return getFileIdentity_6(openedStat);
}
//@ chunk-5xgkngpb.js:3131278-3131294 placement
var sandboxGitConfigWriter; // deferred: uses writeSandboxGitConfig of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:3131278", () => {
  sandboxGitConfigWriter = memoizeAlias(writeSandboxGitConfig);
});
//@ chunk-5xgkngpb.js:3131294-3131988 placement
async function prepareSandboxGitGlobalConfig(cwd, randomId = randomUUID) {
  try {
    let globalGitIdentity = await readGlobalGitIdentity(cwd);
    if (globalGitIdentity.length < 2) readGlobalGitIdentity.cache.delete(cwd);
    let content = formatGitUserSection(globalGitIdentity);
    let sandboxGitConfigPath = getSandboxGitConfigPath(content, randomId);
    let gitIdentityUnsafeReason = getGitIdentityUnsafeReason(sandboxGitConfigPath);
    if (gitIdentityUnsafeReason !== undefined) {
      getSandboxGitConfigPath.cache.delete(content);
      logFeatureSad("sandbox_windows_git_identity", gitIdentityUnsafeReason);
      return;
    }
    let identity = await sandboxGitConfigWriter(sandboxGitConfigPath, content);
    if (identity === undefined) return;
    let currentIdentity = await lstat(sandboxGitConfigPath, {
      bigint: true,
    }).then(getFileIdentity_6, () => {
      return;
    });
    if (identity !== currentIdentity) {
      getSandboxGitConfigPath.cache.delete(content);
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
//@ chunk-5xgkngpb.js:3133037-3133104 placement
/**
 * stripTrailingSlashIfLong：长度大于 1 时去掉末尾斜杠。
 */
function stripTrailingSlashIfLong(denyPath) {
  return denyPath.length > 1 && denyPath.endsWith("/") ? denyPath.slice(0, -1) : denyPath;
}
export { stripTrailingSlashIfLong, prepareSandboxGitGlobalConfig };
