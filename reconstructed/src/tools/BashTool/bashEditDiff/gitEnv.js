/**
 * tools/BashTool/bashEditDiff/gitEnv.ts
 *
 * 2.1.316 新增：bashEditDiff 运行 git 的环境
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (7)
 * attribution: placement 7
 */
import { sep } from "path";
import { SandboxManager } from "../../../utils/sandbox/sandbox-adapter.js";
import { getPlatform } from "../../../utils/platform.js";
import { buildSafeGitInvocation } from "../../../utils/git/gitSafeInvocation.js";
import { getBashEditDiffDir } from "../../../utils/sandbox/userTempRoot.js";
import { shellQuoteArgs } from "../../../utils/bash/bashPipeCommand.js";

//@ chunk-e6aww6q8.js:4771420-4772117 placement
async function buildSnapshotGitEnv(e, n, r) {
  let [s, ...h] = e;
  if (s === undefined) return null;
  if (!SandboxManager.isSandboxingEnabled())
    return {
      file: s,
      args: h,
      env: n,
      wrapped: false,
    };
  if (getPlatform() === "windows") return null;
  if (SandboxManager.getConfig() === undefined) return null;
  try {
    await SandboxManager.ensureInitializedForWrap();
    let safeGitInvocation = buildSafeGitInvocation(s, h, n);
    let filesystem = SandboxManager.getConfig()?.filesystem;
    if (safeGitInvocation === null || !filesystem) return null;
    let bashEditDiffDir = getBashEditDiffDir();
    let L = {
      filesystem: {
        allowWrite: [r],
        denyWrite: filesystem.denyWrite.filter(
          (Z) => Z !== bashEditDiffDir && !Z.startsWith(bashEditDiffDir + sep),
        ),
        denyRead: filesystem.denyRead,
        allowRead: [...(filesystem.allowRead ?? []), r],
      },
      allowNestedUserNamespaces: false,
    };
    let G = shellQuoteArgs(["env", "-u", "GIT_CONFIG_COUNT", s, ...safeGitInvocation.args]);
    let q = await SandboxManager.wrapWithSandbox(G, "/bin/sh", L);
    if (q === G) return null;
    return {
      file: "/bin/sh",
      args: ["-c", q],
      env: safeGitInvocation.env,
      wrapped: true,
    };
  } catch {
    return null;
  }
}
//@ chunk-e6aww6q8.js:4772117-4772232 placement
/**
 * 若 git 命令是在沙箱包装中运行的，执行后清理沙箱（只清理其自身临时区）。
 */
function cleanupSandboxAfterGit(snapshotGitEnv) {
  if (!snapshotGitEnv.wrapped) return;
  try {
    SandboxManager.cleanupAfterCommand(undefined, undefined, {
      wroteOnlyItsOwnScratch: true,
    });
  } catch {}
}
//@ chunk-e6aww6q8.js:4772232-4772288 placement
class OwnClientPromptState {
  ownClientSentPrompt = false;
  countedReasons = new Set();
}
//@ chunk-e6aww6q8.js:4772288-4772393 placement
/**
 * 若提示来源以 claude_code_ 开头，则标记本会话的提示由 Claude Code 客户端自己发送。
 */
function markOwnClientPrompt(e, clientPlatform) {
  if (typeof clientPlatform === "string" && clientPlatform.startsWith("claude_code_"))
    e.get(OwnClientPromptState).ownClientSentPrompt = true;
}
//@ chunk-e6aww6q8.js:4772393-4772429 placement
/**
 * 差异大小上限：文件数 5、单文件行数 200、总行数 400、总字符 64000（另含 SHARED_READ_SPACING_MS 等常量）。
 */
var MAX_DIFF_FILES = 5;
var SHARED_READ_SPACING_MS = 200;
var MAX_DIFF_LINES = 400;
var MAX_DIFF_CHARS = 64000;
//@ chunk-e6aww6q8.js:4772429-4772546 placement
/**
 * 判断差异的总行数与总字符数是否都在上限内。
 */
function isDiffSmallEnough(e) {
  let n = 0;
  let r = 0;
  for (let s of e) {
    n += s.lines.length;
    for (let line of s.lines) r += line.length;
  }
  return n <= MAX_DIFF_LINES && r <= MAX_DIFF_CHARS;
}
//@ chunk-e6aww6q8.js:4772546-4772679 placement
/**
 * bashEditDiff 常量：git 步骤超时（Windows 2s/其他 750ms）、并发间隔、读树超时、输出缓冲、批量大小、排除文件内容、单文件/索引大小上限、失败次数阈值等。
 */
var GIT_STEP_TIMEOUT_MS = getPlatform() === "windows" ? 2000 : 750;
var DIFF_RETRY_COUNT = 3;
var SHARED_READ_SPACING_MS_2 = 50;
var GIT_INDEX_TIMEOUT_MS = 1e4;
var DIFF_TIMEOUT_MS = 2000;
var DEFAULT_GIT_MAX_BUFFER = 5000000;
var MAX_PATHS_BATCH_CHARS = 28000;
var SNAPSHOT_EXCLUDE_CONTENT = 65536;
var MAX_SNAPSHOT_FILE_BYTES = 20000000;
var MAX_INDEX_BYTES = 256000000;
var MAX_SNAPSHOT_FAILURES = 2;
var MAX_ALTERNATE_DEPTH = 5;
export {
  markOwnClientPrompt,
  OwnClientPromptState,
  MAX_SNAPSHOT_FAILURES,
  SHARED_READ_SPACING_MS_2,
  SHARED_READ_SPACING_MS,
  GIT_STEP_TIMEOUT_MS,
  MAX_DIFF_FILES,
  isDiffSmallEnough,
  DIFF_TIMEOUT_MS,
  SNAPSHOT_EXCLUDE_CONTENT,
  MAX_INDEX_BYTES,
  GIT_INDEX_TIMEOUT_MS,
  buildSnapshotGitEnv,
  cleanupSandboxAfterGit,
  MAX_ALTERNATE_DEPTH,
  MAX_SNAPSHOT_FILE_BYTES,
  MAX_PATHS_BATCH_CHARS,
  DIFF_RETRY_COUNT,
  DEFAULT_GIT_MAX_BUFFER,
};
