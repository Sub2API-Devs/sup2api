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
import {
  sep,
  sep as sep_2,
  sep as sep_3,
  sep as sep_4,
  sep as sep_5,
  sep as sep_6,
  sep as sep_7,
  sep as sep_8,
  sep as sep_9,
  sep as sep_10,
  sep as sep_11,
  sep as sep_12,
  sep as sep_13,
  sep as sep_14,
  sep as sep_15,
  sep as sep_16,
  sep as sep_17,
  sep as sep_18,
  sep as sep_19,
  sep as sep_20,
  sep as sep_21,
  sep as sep_22,
  sep as sep_23,
  sep as sep_24,
  sep as sep_25,
  sep as sep_26,
  sep as sep_27,
  sep as sep_28,
  sep as sep_29,
  sep as sep_30,
  sep as sep_31,
  sep as sep_32,
  sep as sep_33,
  sep as sep_34,
  sep as sep_35,
  sep as sep_36,
  sep as sep_37,
  sep as sep_38,
  sep as sep_39,
  sep as sep_40,
  sep as sep_41,
  sep as sep_42,
  sep as sep_43,
  sep as sep_44,
  sep as sep_45,
  sep as sep_46,
  sep as sep_47,
  sep as sep_48,
  sep as sep_49,
  sep as sep_50,
  sep as sep_51,
  sep as sep_52,
  sep as sep_53,
  sep as sep_54,
  sep as sep_55,
  sep as sep_56,
  sep as sep_57,
  sep as sep_58,
  sep as sep_59,
  sep as sep_60,
  sep as sep_61,
  sep as sep_62,
  sep as sep_63,
  sep as sep_64,
  sep as sep_65,
  sep as sep_66,
  sep as sep_67,
  sep as sep_68,
  sep as sep_69,
  sep as sep_70,
  sep as sep_71,
  sep as sep_72,
  sep as sep_73,
} from "path";
import { SandboxManager } from "../../../utils/sandbox/sandbox-adapter.js";
import { getPlatform } from "../../../utils/platform.js";
import { buildSafeGitInvocation } from "../../../utils/git/gitSafeInvocation.js";
import { getBashEditDiffDir } from "../../../utils/sandbox/userTempRoot.js";
import { shellQuoteArgs } from "../../../utils/bash/bashPipeCommand.js";

//@ chunk-e6aww6q8.js:4771420-4772117 placement
async function buildSnapshotGitEnv(e, n, r) {
  let [s, ...h] = e;
  if (s === void 0) return null;
  if (!SandboxManager.isSandboxingEnabled()) return { file: s, args: h, env: n, wrapped: !1 };
  if (getPlatform() === "windows") return null;
  if (SandboxManager.getConfig() === void 0) return null;
  try {
    await SandboxManager.ensureInitializedForWrap();
    let y = buildSafeGitInvocation(s, h, n),
      S = SandboxManager.getConfig()?.filesystem;
    if (y === null || !S) return null;
    let w = getBashEditDiffDir(),
      L = {
        filesystem: {
          allowWrite: [r],
          denyWrite: S.denyWrite.filter((Z) => Z !== w && !Z.startsWith(w + sep_71)),
          denyRead: S.denyRead,
          allowRead: [...(S.allowRead ?? []), r],
        },
        allowNestedUserNamespaces: !1,
      },
      G = shellQuoteArgs(["env", "-u", "GIT_CONFIG_COUNT", s, ...y.args]),
      wrapWithSandbox = await SandboxManager.wrapWithSandbox(G, "/bin/sh", L);
    if (wrapWithSandbox === G) return null;
    return { file: "/bin/sh", args: ["-c", wrapWithSandbox], env: y.env, wrapped: !0 };
  } catch {
    return null;
  }
}
/**
 * 若 git 命令是在沙箱包装中运行的，执行后清理沙箱（只清理其自身临时区）。
 */
//@ chunk-e6aww6q8.js:4772117-4772232 placement
function cleanupSandboxAfterGit(e) {
  if (!e.wrapped) return;
  try {
    SandboxManager.cleanupAfterCommand(void 0, void 0, { wroteOnlyItsOwnScratch: !0 });
  } catch {}
}
//@ chunk-e6aww6q8.js:4772232-4772288 placement
class $ie {
  ownClientSentPrompt = !1;
  countedReasons = new Set();
}
/**
 * 若提示来源以 claude_code_ 开头，则标记本会话的提示由 Claude Code 客户端自己发送。
 */
//@ chunk-e6aww6q8.js:4772288-4772393 placement
function markOwnClientPrompt(e, n) {
  if (typeof n === "string" && n.startsWith("claude_code_")) e.get($ie).ownClientSentPrompt = !0;
}
//@ chunk-e6aww6q8.js:4772393-4772429 placement
var zDe = 5,
  jie = 200,
  jRs = 400,
  WRs = 64000;
/**
 * 判断差异的总行数与总字符数是否都在上限内。
 */
//@ chunk-e6aww6q8.js:4772429-4772546 placement
function isDiffSmallEnough(e) {
  let n = 0,
    r = 0;
  for (let s of e) {
    n += s.lines.length;
    for (let line of s.lines) r += line.length;
  }
  return n <= jRs && r <= WRs;
}
/**
 * bashEditDiff 常量：git 步骤超时（Windows 2s/其他 750ms）、并发间隔、读树超时、输出缓冲、批量大小、排除文件内容、单文件/索引大小上限、失败次数阈值等。
 */
//@ chunk-e6aww6q8.js:4772546-4772679 placement
var GIT_STEP_TIMEOUT_MS = getPlatform() === "windows" ? 2000 : 750,
  DIFF_RETRY_COUNT = 3,
  SHARED_READ_SPACING_MS = 50,
  GIT_INDEX_TIMEOUT_MS = 1e4,
  DIFF_TIMEOUT_MS = 2000,
  DEFAULT_GIT_MAX_BUFFER = 5000000,
  MAX_PATHS_BATCH_CHARS = 28000,
  SNAPSHOT_EXCLUDE_CONTENT = 65536,
  MAX_SNAPSHOT_FILE_BYTES = 20000000,
  MAX_INDEX_BYTES = 256000000,
  MAX_SNAPSHOT_FAILURES = 2,
  MAX_ALTERNATE_DEPTH = 5;

export {
  markOwnClientPrompt,
  $ie,
  MAX_SNAPSHOT_FAILURES,
  SHARED_READ_SPACING_MS,
  jie,
  GIT_STEP_TIMEOUT_MS,
  zDe,
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
