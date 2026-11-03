/**
 * services/rateLimitCheckpoint/checkpointCommit.ts
 *
 * 2.1.316 新增：限流检查点提交
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-89f54s6c.js (6)
 * attribution: placement 6
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
import { writeFileAtomic } from "../../utils/file.js";
import { appendGitExclude } from "../../utils/git/gitExclude.js";
import { logForDebugging } from "../../utils/debug.js";

//@ chunk-89f54s6c.js:6351-6443 placement
/**
 * RESUME.md 在仓库里的相对路径，检查点把这份「续做说明」作为额外文件提交。
 */
var RESUME_FILE_PATH = ".claude/RESUME.md";
var REFS_CLAUDE_CHECKPOINT = "refs/claude/checkpoint-";
var GIT_COMMAND_TIMEOUT_MS = 30000;
var MAX_CHECKPOINT_FILES = 25000;
var MAX_CHECKPOINT_BYTES = 2147483648;
var MAX_CHECKPOINT_LINE_CHARS = 500;
//@ chunk-89f54s6c.js:6443-6595 placement
function sanitizeCheckpointLine(i) {
  let replaced = i.replace(/[\x00-\x1f\x7f-\x9f\u061c\u200b-\u200f\u2028-\u202e\u2066-\u2069\ufeff]+/g, " ");
  return replaced.length > MAX_CHECKPOINT_LINE_CHARS
    ? `${truncateToLength(replaced, MAX_CHECKPOINT_LINE_CHARS)}\u2026`
    : replaced;
}
//@ chunk-89f54s6c.js:6595-6689 placement
var TENGU_VIRTUAL_PINE = "tengu_virtual_pine";
var TENGU_COPPER_SLUICE = "tengu_copper_sluice";
var CLAUDE_CHECKPOINT_INDEX = "claude-checkpoint-index-";
var CHECKPOINT_INDEX_MAX_AGE_SECONDS = 1209600;
//@ chunk-89f54s6c.js:6689-7209 placement
/**
 * 同一时间只运行一次：无 todo 时从任务列表读取，然后提交 git 检查点；成功记 ok 与 tengu_rl_checkpoint_a1_shown，否则按跳过原因记 sad。
 */
async function commitCheckpointOnce(i) {
  let continueInFlight = getContinueInFlight();
  if (continueInFlight !== null) return continueInFlight;
  publishContinueResult(null);
  let inFlight = (async () => {
    let todos = i.todos;
    if (todos.length === 0 && isTaskToolsEnabled())
      try {
        todos = (await listTasks(getTaskListId())).map((h) => ({
          content: h.subject,
          status: h.status,
          activeForm: h.activeForm ?? h.subject,
        }));
      } catch {}
    return commitRateLimitCheckpoint({
      todos,
      trigger: i.trigger,
    });
  })();
  setContinueInFlight(inFlight);
  let s;
  try {
    s = await inFlight;
  } finally {
    setContinueInFlight(null);
  }
  publishContinueResult(s);
  if (s.committed) {
    logFeatureOk("usage_limit_checkpoint_commit", {
      trigger: fromEnum(i.trigger),
    });
    logEvent("tengu_rl_checkpoint_a1_shown", {});
  } else
    logFeatureSad("usage_limit_checkpoint_commit", s.skipReason, {
      trigger: fromEnum(i.trigger),
    });
  return s;
}
//@ chunk-89f54s6c.js:7209-7300 placement
/**
 * 路径包含判断：child 等于 parent 或位于 parent 之下且不是绝对路径逃逸。
 */
function isPathInside(i, o) {
  if (i === o) return true;
  let r = relative(o, i);
  return r !== "" && !r.startsWith("..") && !isAbsolute(r);
}
//@ chunk-89f54s6c.js:7300-13743 placement
/**
 * 达到限流时把工作区提交为检查点（排除非交互/远程工作区等情况）。
 */
async function commitRateLimitCheckpoint(i) {
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
  let gitRoot = findGitRoot(getCwd());
  if (gitRoot === null)
    return {
      committed: false,
      skipReason: "not_git",
    };
  if (isCurrentDirectoryBareGitRepo() !== false)
    return {
      committed: false,
      skipReason: "bare_repo",
    };
  let r = nativeRealpathLong(gitRoot);
  let s = nativeRealpathLong(homedir());
  if (r === null || s === null || isPathInside(s, r))
    return {
      committed: false,
      skipReason: "gitroot_uncontained",
    };
  let sessionId = getSessionId();
  let sliced = sessionId.slice(0, 8);
  let h = `${REFS_CLAUDE_CHECKPOINT}${sliced}`;
  let n = [...GIT_SAFE_GLOBAL_ARGS];
  let R;
  let _;
  try {
    let gitDir = await getGitDir(gitRoot);
    if (gitDir === null)
      return {
        committed: false,
        skipReason: "not_git",
      };
    let C = nativeRealpathLong(gitDir);
    if (C === null || !isPathInside(C, r))
      return {
        committed: false,
        skipReason: "gitdir_uncontained",
      };
    if (
      (await lstat(join(gitDir, "commondir")).catch((error) => {
        if (error.code === "ENOENT") return null;
        throw error;
      })) !== null
    )
      return {
        committed: false,
        skipReason: "gitdir_uncontained",
      };
    for (let e of [
      "objects",
      "refs",
      join("refs", "claude"),
      "logs",
      join("logs", "refs"),
      join("logs", "refs", "claude"),
      "packed-refs",
      "reftable",
    ]) {
      let E = await lstat(join(gitDir, e)).catch((error) => {
        if (error.code === "ENOENT") return null;
        throw error;
      });
      if (E !== null && E.isSymbolicLink())
        return {
          committed: false,
          skipReason: "gitdir_uncontained",
        };
    }
    let le = await readdir(join(gitDir, "objects"), {
      withFileTypes: true,
    }).catch((error) => {
      if (error.code === "ENOENT") return [];
      throw error;
    });
    for (let e of le)
      if (e.isSymbolicLink())
        return {
          committed: false,
          skipReason: "gitdir_uncontained",
        };
    let remoteHostSessionCount = getRemoteHostSessionCount({
      GIT_COMMON_DIR: gitDir,
      GIT_WORK_TREE: gitRoot,
      GIT_ALLOW_PROTOCOL: GIT_ALLOW_PROTOCOL_VALUE,
      GIT_NO_LAZY_FETCH: "1",
      GIT_NO_REPLACE_OBJECTS: "1",
      GIT_TERMINAL_PROMPT: "0",
    });
    if (
      (await lstat(join(gitDir, "info", "sparse-checkout")).catch((error) => {
        if (error.code === "ENOENT") return null;
        throw error;
      })) !== null
    ) {
      let e = await execFileNoThrowWithCwd(
        gitExe(),
        [...n, "config", "--type=bool", "--get", "core.sparseCheckout"],
        {
          cwd: gitRoot,
          env: remoteHostSessionCount,
          timeout: GIT_COMMAND_TIMEOUT_MS,
        },
      );
      if (e.code === 0 && e.stdout.trim() === "true")
        return {
          committed: false,
          skipReason: "sparse_checkout",
        };
    }
    let ue = await lstat(join(gitDir, "lfs")).catch((error) => {
      if (error.code === "ENOENT") return null;
      throw error;
    });
    let W = join(gitRoot, ".gitattributes");
    let P = await lstat(W).catch((error) => {
      if (error.code === "ENOENT") return null;
      throw error;
    });
    let me = P !== null && P.isFile() && P.size <= 65536 ? await readFile(W, "utf-8").catch(() => "") : "";
    if (ue !== null || /\bfilter\s*=\s*lfs\b/.test(me))
      return {
        committed: false,
        skipReason: "content_filters",
      };
    let j = await isGitTransientState(
      gitDir,
      async (e) =>
        (
          await execFileNoThrowWithCwd(gitExe(), [...n, ...e], {
            cwd: gitRoot,
            env: remoteHostSessionCount,
            timeout: GIT_COMMAND_TIMEOUT_MS,
          })
        ).exitCode,
    );
    if (j === null)
      return {
        committed: false,
        skipReason: "git_error",
      };
    if (j)
      return {
        committed: false,
        skipReason: "sequencer_in_progress",
      };
    let U = await execFileNoThrowWithCwd(gitExe(), [...n, "rev-parse", "--verify", "HEAD"], {
      cwd: gitRoot,
      env: remoteHostSessionCount,
      timeout: GIT_COMMAND_TIMEOUT_MS,
    });
    if (U.code !== 0)
      return {
        committed: false,
        skipReason: "no_head",
      };
    let trimmed = U.stdout.trim();
    let pe = (e, E) =>
      execFileNoThrowWithCwd(gitExe(), [...GIT_SAFE_GLOBAL_ARGS, ...e], {
        cwd: E.cwd,
        env: remoteHostSessionCount,
        input: E.input,
        timeout: GIT_COMMAND_TIMEOUT_MS,
      });
    let flagWithOverride = readFlagWithOverride(TENGU_VIRTUAL_PINE, {
      safe: true,
    });
    if (flagWithOverride) {
      _ = await mkdtemp(join(resolveTempDir(), `${CLAUDE_CHECKPOINT_INDEX}${process.pid}-`));
      R = join(_, "index");
    } else R = join(gitDir, `claude-checkpoint-index.${process.pid}`);
    let env = {
      ...remoteHostSessionCount,
      GIT_INDEX_FILE: R,
    };
    let I = flagWithOverride ? ["-c", "core.splitIndex=false"] : [];
    let he = flagWithOverride ? ["--exclude", `${CLAUDE_CHECKPOINT_INDEX}[0-9]*-??????/`] : [];
    if (
      (
        await execFileNoThrowWithCwd(gitExe(), [...n, ...I, "read-tree", trimmed], {
          cwd: gitRoot,
          env,
          timeout: GIT_COMMAND_TIMEOUT_MS,
        })
      ).code !== 0
    )
      return {
        committed: false,
        skipReason: "git_error",
      };
    let [J, X] = await Promise.all([
      execFileNoThrowWithCwd(gitExe(), [...n, ...I, "ls-files", "-z", "--cached"], {
        cwd: gitRoot,
        env,
        maxBuffer: 33554432,
        timeout: GIT_COMMAND_TIMEOUT_MS,
      }),
      execFileNoThrowWithCwd(gitExe(), [...n, ...I, "ls-files", "-z", "-o", "--exclude-standard", ...he], {
        cwd: gitRoot,
        env,
        maxBuffer: 33554432,
        timeout: GIT_COMMAND_TIMEOUT_MS,
      }),
    ]);
    if (J.code !== 0 || X.code !== 0)
      return {
        committed: false,
        skipReason: "git_error",
      };
    let filtered = J.stdout.split("\x00").filter((e) => e.length > 0);
    let filtered_2 = X.stdout.split("\x00").filter((e) => e.length > 0);
    if (filtered.length + filtered_2.length > MAX_CHECKPOINT_FILES)
      return {
        committed: false,
        skipReason: "too_large",
      };
    let O = [];
    let N = [];
    let V = 0;
    let Z = async (e, E) => {
      if (
        e.includes(`
`) ||
        e.includes("\r") ||
        e.includes('"') ||
        e.includes("\\")
      )
        return;
      if (e.split("/").some((S) => S === "." || S === "..")) return;
      let x;
      try {
        x = await lstat(join(gitRoot, e));
      } catch (error) {
        if (E && isENOENT(error)) O.push(e);
        return;
      }
      if (!x.isFile()) return;
      let se = nativeRealpathLong(join(gitRoot, e));
      if (se === null || !isPathInside(se, r)) return;
      V += x.size;
      let mode = (x.mode & 64) !== 0 ? "100755" : "100644";
      N.push({
        path: e,
        mode,
      });
    };
    await Promise.all([...filtered.map((e) => Z(e, true)), ...filtered_2.map((e) => Z(e, false))]);
    if (V > MAX_CHECKPOINT_BYTES)
      return {
        committed: false,
        skipReason: "too_large",
      };
    let A = join(gitRoot, ".claude");
    let F = !isPathConfigDir(A);
    let checkpointNote = buildCheckpointNote({
      sessionId,
      ref: h,
      trigger: i.trigger,
      todos: i.todos,
    });
    try {
      if (F) await assertDirChainReal(gitRoot, A);
      await mkdir(A, {
        recursive: true,
      });
      await writeFileAtomic(join(gitRoot, ".claude", "RESUME.md"), checkpointNote, {
        encoding: "utf-8",
        allowSymlink: !F,
        checkParentDir: F,
      });
    } catch {
      return {
        committed: false,
        skipReason: "resume_write_refused",
      };
    }
    let ee = await execFileNoThrowWithCwd(gitExe(), [...n, "hash-object", "-w", "--stdin"], {
      cwd: gitRoot,
      env: remoteHostSessionCount,
      input: checkpointNote,
      timeout: GIT_COMMAND_TIMEOUT_MS,
    });
    if (ee.code !== 0)
      return {
        committed: false,
        skipReason: "git_error",
      };
    let trimmed_2 = ee.stdout.trim();
    let G = [];
    if (N.length > 0) {
      let e = await execFileNoThrowWithCwd(
        gitExe(),
        [...n, "hash-object", "-w", "--no-filters", "--stdin-paths"],
        {
          cwd: gitRoot,
          env: remoteHostSessionCount,
          input:
            N.map((E) => E.path).join(`
`) +
            `
`,
          maxBuffer: 8388608,
          timeout: 4 * GIT_COMMAND_TIMEOUT_MS,
        },
      );
      if (e.code !== 0)
        return {
          committed: false,
          skipReason: "git_error",
        };
      G = e.stdout
        .split(
          `
`,
        )
        .filter((line) => line.length > 0);
      if (G.length !== N.length)
        return {
          committed: false,
          skipReason: "git_error",
        };
    }
    let joined = [...N.map((e, E) => `${e.mode} ${G[E]}	${e.path}`), `100644 ${trimmed_2}	${RESUME_FILE_PATH}`]
      .join(`
`);
    if (
      (
        await execFileNoThrowWithCwd(gitExe(), [...n, ...I, "update-index", "--add", "--index-info"], {
          cwd: gitRoot,
          env,
          input:
            joined +
            `
`,
          timeout: GIT_COMMAND_TIMEOUT_MS,
        })
      ).code !== 0
    )
      return {
        committed: false,
        skipReason: "git_error",
      };
    if (O.length > 0) {
      if (
        (
          await execFileNoThrowWithCwd(
            gitExe(),
            [...n, ...I, "update-index", "--force-remove", "-z", "--stdin"],
            {
              cwd: gitRoot,
              env,
              input: O.join("\x00"),
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
    let te = await execFileNoThrowWithCwd(gitExe(), [...n, ...I, "write-tree"], {
      cwd: gitRoot,
      env,
      timeout: GIT_COMMAND_TIMEOUT_MS,
    });
    if (te.code !== 0)
      return {
        committed: false,
        skipReason: "git_error",
      };
    let trimmed_3 = te.stdout.trim();
    let oe = await execFileNoThrowWithCwd(
      gitExe(),
      [
        ...n,
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
        cwd: gitRoot,
        env: remoteHostSessionCount,
        timeout: GIT_COMMAND_TIMEOUT_MS,
      },
    );
    if (oe.code !== 0)
      return {
        committed: false,
        skipReason: "git_error",
      };
    let trimmed_4 = oe.stdout.trim();
    if (
      (await lstat(join(gitDir, "commondir")).catch((error) => {
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
          [...n, "-c", "core.logAllRefUpdates=false", "update-ref", "--no-deref", h, trimmed_4],
          {
            cwd: gitRoot,
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
    let re = `/${RESUME_FILE_PATH}`;
    await appendGitExclude(gitDir, (e) =>
      e.toString("utf-8").split(/\r?\n/).includes(re)
        ? null
        : `${re}
`,
    ).catch(() => {});
    await pruneOldCheckpointRefs(gitRoot, C, h, pe, remoteHostSessionCount).catch((error) => {
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
      ref: h,
      resumePath: RESUME_FILE_PATH,
      commitSha: trimmed_4,
    };
  } catch {
    return {
      committed: false,
      skipReason: "git_error",
    };
  } finally {
    if (_ !== undefined)
      await rm(_, {
        recursive: true,
        force: true,
      }).catch(() => {});
    else if (R !== undefined)
      await rm(R, {
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
};
