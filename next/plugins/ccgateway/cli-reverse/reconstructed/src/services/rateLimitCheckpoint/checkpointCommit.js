/**
 * services/rateLimitCheckpoint/checkpointCommit.ts
 *
 * 2.1.316 新增：限流检查点提交
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-qznkkbq5.js (6)
 * attribution: placement 6
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { relative, isAbsolute, join } from "path";
import { homedir } from "os";
import { lstat, readdir, readFile, mkdtemp, mkdir, rm } from "fs/promises";
import { truncateToLength } from "../../utils/stringUtils.js";
import {
  getContinueInFlight,
  publishContinueResult,
  setContinueInFlight,
} from "../../commands/continue/continueState.js";
import { isTaskToolsEnabled, listTasks, getTaskListId } from "../../utils/tasks.js";
import { logFeatureOk, logFeatureSad } from "../analytics/featureTelemetry.js";
import { fromEnum } from "../analytics/safeMetadata.js";
import { logEvent } from "../analytics/index.js";
import { getIsNonInteractiveSession, getSessionId } from "../../bootstrap/state.js";
import { isRemoteSessionAvailable } from "../../remote/remoteMode.js";
import { isPolicyAllowed } from "../policyLimits/policyEvidence.js";
import { findGitRoot, isCurrentDirectoryBareGitRepo, getGitDir, gitExe } from "../../utils/git.js";
import { getCwd } from "../../utils/cwd.js";
import { nativeRealpathLong } from "../../utils/windowsUncPaths.js";
import { GIT_SAFE_GLOBAL_ARGS, GIT_ALLOW_PROTOCOL_VALUE } from "../../utils/git/gitSafeEnv.js";
import { getRemoteHostSessionCount } from "../../commands/insights.js";
import { execFileNoThrowWithCwd } from "../../utils/execFileNoThrow.js";
import { isGitTransientState } from "../../utils/commitAttribution.js";
import { readFlagWithOverride } from "../analytics/flagOverrides.js";
import { resolveTempDir } from "../../utils/git/builderGit/gitEnv.js";
import { isENOENT, errorMessage } from "../../utils/errors.js";
import { isPathConfigDir } from "../../utils/envUtils.js";
import { buildCheckpointNote, pruneOldCheckpointRefs } from "./checkpointRefs.js";
import { assertDirChainReal } from "../../utils/fsSafety/atomicWriteStaging.js";
import { readJsonFile_2 } from "../../utils/file.js";
import { appendGitExclude } from "../../utils/git/gitExclude.js";
import { logForDebugging } from "../../utils/debug.js";

//@ chunk-qznkkbq5.js:6771-6863 placement
/**
 * RESUME.md 在仓库里的相对路径，检查点把这份「续做说明」作为额外文件提交。
 */
var RESUME_FILE_PATH = ".claude/RESUME.md";
var REFS_CLAUDE_CHECKPOINT = "refs/claude/checkpoint-";
var GIT_COMMAND_TIMEOUT_MS = 30000;
var MAX_CHECKPOINT_FILES = 25000;
var MAX_CHECKPOINT_BYTES = 2147483648;
var MAX_CHECKPOINT_LINE_CHARS = 500;
//@ chunk-qznkkbq5.js:6863-7014 placement
function sanitizeCheckpointLine(line) {
  let replaced = line.replace(
    /[\x00-\x1f\x7f-\x9f\u061c\u200b-\u200f\u2028-\u202e\u2066-\u2069\ufeff]+/g,
    " ",
  );
  return replaced.length > MAX_CHECKPOINT_LINE_CHARS
    ? `${truncateToLength(replaced, MAX_CHECKPOINT_LINE_CHARS)}\u2026`
    : replaced;
}
//@ chunk-qznkkbq5.js:7014-7108 placement
var TENGU_VIRTUAL_PINE = "tengu_virtual_pine";
var TENGU_COPPER_SLUICE = "tengu_copper_sluice";
var CLAUDE_CHECKPOINT_INDEX = "claude-checkpoint-index-";
var CHECKPOINT_INDEX_MAX_AGE_SECONDS = 1209600;
//@ chunk-qznkkbq5.js:7108-7628 placement
/**
 * 同一时间只运行一次：无 todo 时从任务列表读取，然后提交 git 检查点；成功记 ok 与 tengu_rl_checkpoint_a1_shown，否则按跳过原因记 sad。
 */
async function commitCheckpointOnce(request) {
  let continueInFlight = getContinueInFlight();
  if (continueInFlight !== null) return continueInFlight;
  publishContinueResult(null);
  let inFlight = (async () => {
    let todos = request.todos;
    if (todos.length === 0 && isTaskToolsEnabled())
      try {
        todos = (await listTasks(getTaskListId())).map((task) => ({
          content: task.subject,
          status: task.status,
          activeForm: task.activeForm ?? task.subject,
        }));
      } catch {}
    return commitRateLimitCheckpoint({
      todos,
      trigger: request.trigger,
    });
  })();
  setContinueInFlight(inFlight);
  let result;
  try {
    result = await inFlight;
  } finally {
    setContinueInFlight(null);
  }
  publishContinueResult(result);
  if (result.committed) {
    logFeatureOk("usage_limit_checkpoint_commit", {
      trigger: fromEnum(request.trigger),
    });
    logEvent("tengu_rl_checkpoint_a1_shown", {});
  } else
    logFeatureSad("usage_limit_checkpoint_commit", result.skipReason, {
      trigger: fromEnum(request.trigger),
    });
  return result;
}
//@ chunk-qznkkbq5.js:7628-7719 placement
/**
 * 路径包含判断：child 等于 parent 或位于 parent 之下且不是绝对路径逃逸。
 */
function isPathInside(child, parent) {
  if (child === parent) return true;
  let relativePath = relative(parent, child);
  return relativePath !== "" && !relativePath.startsWith("..") && !isAbsolute(relativePath);
}
//@ chunk-qznkkbq5.js:7719-14166 placement
/**
 * 达到限流时把工作区提交为检查点（排除非交互/远程工作区等情况）。
 */
async function commitRateLimitCheckpoint(request) {
  if (getIsNonInteractiveSession())
    return {
      committed: false,
      skipReason: "non_interactive",
    };
  if (isRemoteSessionAvailable())
    return {
      committed: false,
      skipReason: "remote_workspace",
    };
  if (!isPolicyAllowed("allow_local_checkpoint_commit"))
    return {
      committed: false,
      skipReason: "policy",
    };
  let baseDir = findGitRoot(getCwd());
  if (baseDir === null)
    return {
      committed: false,
      skipReason: "not_git",
    };
  if (isCurrentDirectoryBareGitRepo() !== false)
    return {
      committed: false,
      skipReason: "bare_repo",
    };
  let rootReal = nativeRealpathLong(baseDir);
  let homeReal = nativeRealpathLong(homedir());
  if (rootReal === null || homeReal === null || isPathInside(homeReal, rootReal))
    return {
      committed: false,
      skipReason: "gitroot_uncontained",
    };
  let sessionId = getSessionId();
  let sliced = sessionId.slice(0, 8);
  let refName = `${REFS_CLAUDE_CHECKPOINT}${sliced}`;
  let safeArgs = [...GIT_SAFE_GLOBAL_ARGS];
  let indexFile;
  let tempDir;
  try {
    let commonDir = await getGitDir(baseDir);
    if (commonDir === null)
      return {
        committed: false,
        skipReason: "not_git",
      };
    let gitDirReal = nativeRealpathLong(commonDir);
    if (gitDirReal === null || !isPathInside(gitDirReal, rootReal))
      return {
        committed: false,
        skipReason: "gitdir_uncontained",
      };
    if (
      (await lstat(join(commonDir, "commondir")).catch((error) => {
        if (error.code === "ENOENT") return null;
        throw error;
      })) !== null
    )
      return {
        committed: false,
        skipReason: "gitdir_uncontained",
      };
    for (let gitEntry of [
      "objects",
      "refs",
      join("refs", "claude"),
      "logs",
      join("logs", "refs"),
      join("logs", "refs", "claude"),
      "packed-refs",
      "reftable",
    ]) {
      let stats = await lstat(join(commonDir, gitEntry)).catch((error) => {
        if (error.code === "ENOENT") return null;
        throw error;
      });
      if (stats !== null && stats.isSymbolicLink())
        return {
          committed: false,
          skipReason: "gitdir_uncontained",
        };
    }
    let objectEntries = await readdir(join(commonDir, "objects"), {
      withFileTypes: true,
    }).catch((error) => {
      if (error.code === "ENOENT") return [];
      throw error;
    });
    for (let entry of objectEntries)
      if (entry.isSymbolicLink())
        return {
          committed: false,
          skipReason: "gitdir_uncontained",
        };
    let remoteHostSessionCount = getRemoteHostSessionCount({
      GIT_COMMON_DIR: commonDir,
      GIT_WORK_TREE: baseDir,
      GIT_ALLOW_PROTOCOL: GIT_ALLOW_PROTOCOL_VALUE,
      GIT_NO_LAZY_FETCH: "1",
      GIT_NO_REPLACE_OBJECTS: "1",
      GIT_TERMINAL_PROMPT: "0",
    });
    if (
      (await lstat(join(commonDir, "info", "sparse-checkout")).catch((error) => {
        if (error.code === "ENOENT") return null;
        throw error;
      })) !== null
    ) {
      let configResult = await execFileNoThrowWithCwd(
        gitExe(),
        [...safeArgs, "config", "--type=bool", "--get", "core.sparseCheckout"],
        {
          cwd: baseDir,
          env: remoteHostSessionCount,
          timeout: GIT_COMMAND_TIMEOUT_MS,
        },
      );
      if (configResult.code === 0 && configResult.stdout.trim() === "true")
        return {
          committed: false,
          skipReason: "sparse_checkout",
        };
    }
    let lfsStats = await lstat(join(commonDir, "lfs")).catch((error) => {
      if (error.code === "ENOENT") return null;
      throw error;
    });
    let gitattributesPath = join(baseDir, ".gitattributes");
    let gitattributesStats = await lstat(gitattributesPath).catch((error) => {
      if (error.code === "ENOENT") return null;
      throw error;
    });
    let gitattributesText =
      gitattributesStats !== null && gitattributesStats.isFile() && gitattributesStats.size <= 65536
        ? await readFile(gitattributesPath, "utf-8").catch(() => "")
        : "";
    if (lfsStats !== null || /\bfilter\s*=\s*lfs\b/.test(gitattributesText))
      return {
        committed: false,
        skipReason: "content_filters",
      };
    let transientState = await isGitTransientState(
      commonDir,
      async (args) =>
        (
          await execFileNoThrowWithCwd(gitExe(), [...safeArgs, ...args], {
            cwd: baseDir,
            env: remoteHostSessionCount,
            timeout: GIT_COMMAND_TIMEOUT_MS,
          })
        ).exitCode,
    );
    if (transientState === null)
      return {
        committed: false,
        skipReason: "git_error",
      };
    if (transientState)
      return {
        committed: false,
        skipReason: "sequencer_in_progress",
      };
    let headResult = await execFileNoThrowWithCwd(gitExe(), [...safeArgs, "rev-parse", "--verify", "HEAD"], {
      cwd: baseDir,
      env: remoteHostSessionCount,
      timeout: GIT_COMMAND_TIMEOUT_MS,
    });
    if (headResult.code !== 0)
      return {
        committed: false,
        skipReason: "no_head",
      };
    let trimmed = headResult.stdout.trim();
    let git = (args, options) =>
      execFileNoThrowWithCwd(gitExe(), [...GIT_SAFE_GLOBAL_ARGS, ...args], {
        cwd: options.cwd,
        env: remoteHostSessionCount,
        input: options.input,
        timeout: GIT_COMMAND_TIMEOUT_MS,
      });
    let note = readFlagWithOverride(TENGU_VIRTUAL_PINE, {
      safe: true,
    });
    if (note) {
      tempDir = await mkdtemp(join(resolveTempDir(), `${CLAUDE_CHECKPOINT_INDEX}${process.pid}-`));
      indexFile = join(tempDir, "index");
    } else indexFile = join(commonDir, `claude-checkpoint-index.${process.pid}`);
    let env = {
      ...remoteHostSessionCount,
      GIT_INDEX_FILE: indexFile,
    };
    let splitIndexArgs = note ? ["-c", "core.splitIndex=false"] : [];
    let excludeArgs = note ? ["--exclude", `${CLAUDE_CHECKPOINT_INDEX}[0-9]*-??????/`] : [];
    if (
      (
        await execFileNoThrowWithCwd(gitExe(), [...safeArgs, ...splitIndexArgs, "read-tree", trimmed], {
          cwd: baseDir,
          env,
          timeout: GIT_COMMAND_TIMEOUT_MS,
        })
      ).code !== 0
    )
      return {
        committed: false,
        skipReason: "git_error",
      };
    let [trackedResult, untrackedResult] = await Promise.all([
      execFileNoThrowWithCwd(gitExe(), [...safeArgs, ...splitIndexArgs, "ls-files", "-z", "--cached"], {
        cwd: baseDir,
        env,
        maxBuffer: 33554432,
        timeout: GIT_COMMAND_TIMEOUT_MS,
      }),
      execFileNoThrowWithCwd(
        gitExe(),
        [...safeArgs, ...splitIndexArgs, "ls-files", "-z", "-o", "--exclude-standard", ...excludeArgs],
        {
          cwd: baseDir,
          env,
          maxBuffer: 33554432,
          timeout: GIT_COMMAND_TIMEOUT_MS,
        },
      ),
    ]);
    if (trackedResult.code !== 0 || untrackedResult.code !== 0)
      return {
        committed: false,
        skipReason: "git_error",
      };
    let filtered = trackedResult.stdout.split("\x00").filter((path) => path.length > 0);
    let filtered_2 = untrackedResult.stdout.split("\x00").filter((path) => path.length > 0);
    if (filtered.length + filtered_2.length > MAX_CHECKPOINT_FILES)
      return {
        committed: false,
        skipReason: "too_large",
      };
    let removedPaths = [];
    let indexEntries = [];
    let totalBytes = 0;
    let collectEntry = async (relativePath, mayBeRemoved) => {
      if (
        relativePath.includes(`
`) ||
        relativePath.includes("\r") ||
        relativePath.includes('"') ||
        relativePath.includes("\\")
      )
        return;
      if (relativePath.split("/").some((segment) => segment === "." || segment === "..")) return;
      let stats;
      try {
        stats = await lstat(join(baseDir, relativePath));
      } catch (error) {
        if (mayBeRemoved && isENOENT(error)) removedPaths.push(relativePath);
        return;
      }
      if (!stats.isFile()) return;
      let realPath = nativeRealpathLong(join(baseDir, relativePath));
      if (realPath === null || !isPathInside(realPath, rootReal)) return;
      totalBytes += stats.size;
      let mode = (stats.mode & 64) !== 0 ? "100755" : "100644";
      indexEntries.push({
        path: relativePath,
        mode,
      });
    };
    await Promise.all([
      ...filtered.map((path) => collectEntry(path, true)),
      ...filtered_2.map((path) => collectEntry(path, false)),
    ]);
    if (totalBytes > MAX_CHECKPOINT_BYTES)
      return {
        committed: false,
        skipReason: "too_large",
      };
    let claudeDir = join(baseDir, ".claude");
    let mustCheckChain = !isPathConfigDir(claudeDir);
    let checkpointNote = buildCheckpointNote({
      sessionId,
      ref: refName,
      trigger: request.trigger,
      todos: request.todos,
    });
    try {
      if (mustCheckChain) await assertDirChainReal(baseDir, claudeDir);
      await mkdir(claudeDir, {
        recursive: true,
      });
      await readJsonFile_2(join(baseDir, ".claude", "RESUME.md"), checkpointNote, {
        encoding: "utf-8",
        allowSymlink: !mustCheckChain,
        checkParentDir: mustCheckChain,
      });
    } catch {
      return {
        committed: false,
        skipReason: "resume_write_refused",
      };
    }
    let hashResult = await execFileNoThrowWithCwd(gitExe(), [...safeArgs, "hash-object", "-w", "--stdin"], {
      cwd: baseDir,
      env: remoteHostSessionCount,
      input: checkpointNote,
      timeout: GIT_COMMAND_TIMEOUT_MS,
    });
    if (hashResult.code !== 0)
      return {
        committed: false,
        skipReason: "git_error",
      };
    let trimmed_2 = hashResult.stdout.trim();
    let hashes = [];
    if (indexEntries.length > 0) {
      let hashFilesResult = await execFileNoThrowWithCwd(
        gitExe(),
        [...safeArgs, "hash-object", "-w", "--no-filters", "--stdin-paths"],
        {
          cwd: baseDir,
          env: remoteHostSessionCount,
          input:
            indexEntries.map((entry) => entry.path).join(`
`) +
            `
`,
          maxBuffer: 8388608,
          timeout: 4 * GIT_COMMAND_TIMEOUT_MS,
        },
      );
      if (hashFilesResult.code !== 0)
        return {
          committed: false,
          skipReason: "git_error",
        };
      hashes = hashFilesResult.stdout
        .split(
          `
`,
        )
        .filter((line) => line.length > 0);
      if (hashes.length !== indexEntries.length)
        return {
          committed: false,
          skipReason: "git_error",
        };
    }
    let joined = [
      ...indexEntries.map((entry, entryIndex) => `${entry.mode} ${hashes[entryIndex]}	${entry.path}`),
      `100644 ${trimmed_2}	${RESUME_FILE_PATH}`,
    ].join(`
`);
    if (
      (
        await execFileNoThrowWithCwd(
          gitExe(),
          [...safeArgs, ...splitIndexArgs, "update-index", "--add", "--index-info"],
          {
            cwd: baseDir,
            env,
            input:
              joined +
              `
`,
            timeout: GIT_COMMAND_TIMEOUT_MS,
          },
        )
      ).code !== 0
    )
      return {
        committed: false,
        skipReason: "git_error",
      };
    if (removedPaths.length > 0) {
      if (
        (
          await execFileNoThrowWithCwd(
            gitExe(),
            [...safeArgs, ...splitIndexArgs, "update-index", "--force-remove", "-z", "--stdin"],
            {
              cwd: baseDir,
              env,
              input: removedPaths.join("\x00"),
              timeout: GIT_COMMAND_TIMEOUT_MS,
            },
          )
        ).code !== 0
      )
        return {
          committed: false,
          skipReason: "git_error",
        };
    }
    let treeResult = await execFileNoThrowWithCwd(gitExe(), [...safeArgs, ...splitIndexArgs, "write-tree"], {
      cwd: baseDir,
      env,
      timeout: GIT_COMMAND_TIMEOUT_MS,
    });
    if (treeResult.code !== 0)
      return {
        committed: false,
        skipReason: "git_error",
      };
    let trimmed_3 = treeResult.stdout.trim();
    let commitResult = await execFileNoThrowWithCwd(
      gitExe(),
      [
        ...safeArgs,
        "-c",
        "user.name=Claude Code",
        "-c",
        "user.email=noreply@anthropic.com",
        "-c",
        "commit.gpgsign=false",
        "commit-tree",
        trimmed_3,
        "-p",
        trimmed,
        "-m",
        `WIP: Claude Code rate-limit checkpoint (${sliced})`,
      ],
      {
        cwd: baseDir,
        env: remoteHostSessionCount,
        timeout: GIT_COMMAND_TIMEOUT_MS,
      },
    );
    if (commitResult.code !== 0)
      return {
        committed: false,
        skipReason: "git_error",
      };
    let trimmed_4 = commitResult.stdout.trim();
    if (
      (await lstat(join(commonDir, "commondir")).catch((error) => {
        if (error.code === "ENOENT") return null;
        throw error;
      })) !== null
    )
      return {
        committed: false,
        skipReason: "gitdir_uncontained",
      };
    if (
      (
        await execFileNoThrowWithCwd(
          gitExe(),
          [...safeArgs, "-c", "core.logAllRefUpdates=false", "update-ref", "--no-deref", refName, trimmed_4],
          {
            cwd: baseDir,
            env: remoteHostSessionCount,
            timeout: GIT_COMMAND_TIMEOUT_MS,
          },
        )
      ).code !== 0
    )
      return {
        committed: false,
        skipReason: "git_error",
      };
    let resumeIgnorePath = `/${RESUME_FILE_PATH}`;
    await appendGitExclude(commonDir, (text) =>
      text.toString("utf-8").split(/\r?\n/).includes(resumeIgnorePath)
        ? null
        : `${resumeIgnorePath}
`,
    ).catch(() => {});
    await pruneOldCheckpointRefs(baseDir, gitDirReal, refName, git, remoteHostSessionCount).catch((error) => {
      logForDebugging(
        `[rateLimitCheckpoint] stopped deleting old checkpoint refs; the next checkpoint retries: ${errorMessage(error)}`,
        {
          level: "warn",
        },
      );
      logFeatureSad("usage_limit_checkpoint_commit", "stale_ref_prune_failed");
    });
    return {
      committed: true,
      ref: refName,
      resumePath: RESUME_FILE_PATH,
      commitSha: trimmed_4,
    };
  } catch {
    return {
      committed: false,
      skipReason: "git_error",
    };
  } finally {
    if (tempDir !== undefined)
      await rm(tempDir, {
        recursive: true,
        force: true,
      }).catch(() => {});
    else if (indexFile !== undefined)
      await rm(indexFile, {
        force: true,
      }).catch(() => {});
  }
}
export {
  GIT_COMMAND_TIMEOUT_MS,
  REFS_CLAUDE_CHECKPOINT,
  CHECKPOINT_INDEX_MAX_AGE_SECONDS,
  TENGU_COPPER_SLUICE,
  sanitizeCheckpointLine,
  commitCheckpointOnce,
};
