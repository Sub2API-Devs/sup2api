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
import { wt } from "../../remote/remoteMode.js";
import { isPolicyAllowed } from "../policyLimits/policyEvidence.js";
import { findGitRoot, isCurrentDirectoryBareGitRepo, getGitDir, gitExe } from "../../utils/git.js";
import { getCwd } from "../../utils/cwd.js";
import { Tm } from "../../utils/windowsUncPaths.js";
import { freeze, kMe } from "../../utils/git/gitSafeEnv.js";
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
var D = ".claude/RESUME.md",
  REFS_CLAUDE_CHECKPOINT = "refs/claude/checkpoint-",
  w = 30000,
  Pe = 25000,
  ve = 2147483648,
  ce = 500;
//@ chunk-89f54s6c.js:6443-6595 placement
function sanitizeCheckpointLine(i) {
  let replaced = i.replace(/[\x00-\x1f\x7f-\x9f\u061c\u200b-\u200f\u2028-\u202e\u2066-\u2069\ufeff]+/g, " ");
  return replaced.length > ce ? `${truncateToLength(replaced, ce)}\u2026` : replaced;
}
//@ chunk-89f54s6c.js:6595-6689 placement
var TENGU_VIRTUAL_PINE = "tengu_virtual_pine",
  TENGU_COPPER_SLUICE = "tengu_copper_sluice",
  CLAUDE_CHECKPOINT_INDEX = "claude-checkpoint-index-",
  Fe = 1209600;
/**
 * 同一时间只运行一次：无 todo 时从任务列表读取，然后提交 git 检查点；成功记 ok 与 tengu_rl_checkpoint_a1_shown，否则按跳过原因记 sad。
 */
//@ chunk-89f54s6c.js:6689-7209 placement
async function commitCheckpointOnce(i) {
  let o = getContinueInFlight();
  if (o !== null) return o;
  publishContinueResult(null);
  let r = (async () => {
    let todos = i.todos;
    if (todos.length === 0 && isTaskToolsEnabled())
      try {
        todos = (await listTasks(getTaskListId())).map((h) => ({
          content: h.subject,
          status: h.status,
          activeForm: h.activeForm ?? h.subject,
        }));
      } catch {}
    return commitRateLimitCheckpoint({ todos: todos, trigger: i.trigger });
  })();
  setContinueInFlight(r);
  let s;
  try {
    s = await r;
  } finally {
    setContinueInFlight(null);
  }
  if ((publishContinueResult(s), s.committed))
    (logFeatureOk("usage_limit_checkpoint_commit", { trigger: fromEnum(i.trigger) }),
      logEvent("tengu_rl_checkpoint_a1_shown", {}));
  else logFeatureSad("usage_limit_checkpoint_commit", s.skipReason, { trigger: fromEnum(i.trigger) });
  return s;
}
//@ chunk-89f54s6c.js:7209-7300 placement
function H(i, o) {
  if (i === o) return !0;
  let r = relative(o, i);
  return r !== "" && !r.startsWith("..") && !isAbsolute(r);
}
/**
 * 达到限流时把工作区提交为检查点（排除非交互/远程工作区等情况）。
 */
//@ chunk-89f54s6c.js:7300-13743 placement
async function commitRateLimitCheckpoint(i) {
  if (getIsNonInteractiveSession()) return { committed: !1, skipReason: "non_interactive" };
  if (wt()) return { committed: !1, skipReason: "remote_workspace" };
  if (!isPolicyAllowed("allow_local_checkpoint_commit")) return { committed: !1, skipReason: "policy" };
  let o = findGitRoot(getCwd());
  if (o === null) return { committed: !1, skipReason: "not_git" };
  if (isCurrentDirectoryBareGitRepo() !== !1) return { committed: !1, skipReason: "bare_repo" };
  let r = Tm(o),
    s = Tm(homedir());
  if (r === null || s === null || H(s, r)) return { committed: !1, skipReason: "gitroot_uncontained" };
  let u = getSessionId(),
    sliced = u.slice(0, 8),
    h = `${REFS_CLAUDE_CHECKPOINT}${sliced}`,
    n = [...freeze],
    R,
    _;
  try {
    let l = await getGitDir(o);
    if (l === null) return { committed: !1, skipReason: "not_git" };
    let C = Tm(l);
    if (C === null || !H(C, r)) return { committed: !1, skipReason: "gitdir_uncontained" };
    if (
      (await lstat(join(l, "commondir")).catch((e) => {
        if (e.code === "ENOENT") return null;
        throw e;
      })) !== null
    )
      return { committed: !1, skipReason: "gitdir_uncontained" };
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
      let E = await lstat(join(l, e)).catch((x) => {
        if (x.code === "ENOENT") return null;
        throw x;
      });
      if (E !== null && E.isSymbolicLink()) return { committed: !1, skipReason: "gitdir_uncontained" };
    }
    let le = await readdir(join(l, "objects"), { withFileTypes: !0 }).catch((e) => {
      if (e.code === "ENOENT") return [];
      throw e;
    });
    for (let e of le) if (e.isSymbolicLink()) return { committed: !1, skipReason: "gitdir_uncontained" };
    let k = getRemoteHostSessionCount({
      GIT_COMMON_DIR: l,
      GIT_WORK_TREE: o,
      GIT_ALLOW_PROTOCOL: kMe,
      GIT_NO_LAZY_FETCH: "1",
      GIT_NO_REPLACE_OBJECTS: "1",
      GIT_TERMINAL_PROMPT: "0",
    });
    if (
      (await lstat(join(l, "info", "sparse-checkout")).catch((e) => {
        if (e.code === "ENOENT") return null;
        throw e;
      })) !== null
    ) {
      let e = await execFileNoThrowWithCwd(
        gitExe(),
        [...n, "config", "--type=bool", "--get", "core.sparseCheckout"],
        { cwd: o, env: k, timeout: w },
      );
      if (e.code === 0 && e.stdout.trim() === "true") return { committed: !1, skipReason: "sparse_checkout" };
    }
    let ue = await lstat(join(l, "lfs")).catch((e) => {
        if (e.code === "ENOENT") return null;
        throw e;
      }),
      W = join(o, ".gitattributes"),
      P = await lstat(W).catch((e) => {
        if (e.code === "ENOENT") return null;
        throw e;
      }),
      me = P !== null && P.isFile() && P.size <= 65536 ? await readFile(W, "utf-8").catch(() => "") : "";
    if (ue !== null || /\bfilter\s*=\s*lfs\b/.test(me))
      return { committed: !1, skipReason: "content_filters" };
    let j = await isGitTransientState(
      l,
      async (e) =>
        (await execFileNoThrowWithCwd(gitExe(), [...n, ...e], { cwd: o, env: k, timeout: w })).exitCode,
    );
    if (j === null) return { committed: !1, skipReason: "git_error" };
    if (j) return { committed: !1, skipReason: "sequencer_in_progress" };
    let U = await execFileNoThrowWithCwd(gitExe(), [...n, "rev-parse", "--verify", "HEAD"], {
      cwd: o,
      env: k,
      timeout: w,
    });
    if (U.code !== 0) return { committed: !1, skipReason: "no_head" };
    let trimmed = U.stdout.trim(),
      pe = (e, E) =>
        execFileNoThrowWithCwd(gitExe(), [...freeze, ...e], {
          cwd: E.cwd,
          env: k,
          input: E.input,
          timeout: w,
        }),
      v = readFlagWithOverride(TENGU_VIRTUAL_PINE, { safe: !0 });
    if (v)
      ((_ = await mkdtemp(join(resolveTempDir(), `${CLAUDE_CHECKPOINT_INDEX}${process.pid}-`))),
        (R = join(_, "index")));
    else R = join(l, `claude-checkpoint-index.${process.pid}`);
    let y = { ...k, GIT_INDEX_FILE: R },
      I = v ? ["-c", "core.splitIndex=false"] : [],
      he = v ? ["--exclude", `${CLAUDE_CHECKPOINT_INDEX}[0-9]*-??????/`] : [];
    if (
      (
        await execFileNoThrowWithCwd(gitExe(), [...n, ...I, "read-tree", trimmed], {
          cwd: o,
          env: y,
          timeout: w,
        })
      ).code !== 0
    )
      return { committed: !1, skipReason: "git_error" };
    let [J, X] = await Promise.all([
      execFileNoThrowWithCwd(gitExe(), [...n, ...I, "ls-files", "-z", "--cached"], {
        cwd: o,
        env: y,
        maxBuffer: 33554432,
        timeout: w,
      }),
      execFileNoThrowWithCwd(gitExe(), [...n, ...I, "ls-files", "-z", "-o", "--exclude-standard", ...he], {
        cwd: o,
        env: y,
        maxBuffer: 33554432,
        timeout: w,
      }),
    ]);
    if (J.code !== 0 || X.code !== 0) return { committed: !1, skipReason: "git_error" };
    let filtered = J.stdout.split("\x00").filter((e) => e.length > 0),
      filtered_2 = X.stdout.split("\x00").filter((e) => e.length > 0);
    if (filtered.length + filtered_2.length > Pe) return { committed: !1, skipReason: "too_large" };
    let O = [],
      N = [],
      V = 0,
      Z = async (e, E) => {
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
          x = await lstat(join(o, e));
        } catch (error) {
          if (E && isENOENT(error)) O.push(e);
          return;
        }
        if (!x.isFile()) return;
        let se = Tm(join(o, e));
        if (se === null || !H(se, r)) return;
        V += x.size;
        let Re = (x.mode & 64) !== 0 ? "100755" : "100644";
        N.push({ path: e, mode: Re });
      };
    if ((await Promise.all([...filtered.map((e) => Z(e, !0)), ...filtered_2.map((e) => Z(e, !1))]), V > ve))
      return { committed: !1, skipReason: "too_large" };
    let A = join(o, ".claude"),
      F = !isPathConfigDir(A),
      Q = buildCheckpointNote({ sessionId: u, ref: h, trigger: i.trigger, todos: i.todos });
    try {
      if (F) await assertDirChainReal(o, A);
      (await mkdir(A, { recursive: !0 }),
        await writeFileAtomic(join(o, ".claude", "RESUME.md"), Q, {
          encoding: "utf-8",
          allowSymlink: !F,
          checkParentDir: F,
        }));
    } catch {
      return { committed: !1, skipReason: "resume_write_refused" };
    }
    let ee = await execFileNoThrowWithCwd(gitExe(), [...n, "hash-object", "-w", "--stdin"], {
      cwd: o,
      env: k,
      input: Q,
      timeout: w,
    });
    if (ee.code !== 0) return { committed: !1, skipReason: "git_error" };
    let trimmed_2 = ee.stdout.trim(),
      G = [];
    if (N.length > 0) {
      let e = await execFileNoThrowWithCwd(
        gitExe(),
        [...n, "hash-object", "-w", "--no-filters", "--stdin-paths"],
        {
          cwd: o,
          env: k,
          input:
            N.map((E) => E.path).join(`
`) +
            `
`,
          maxBuffer: 8388608,
          timeout: 4 * w,
        },
      );
      if (e.code !== 0) return { committed: !1, skipReason: "git_error" };
      if (
        ((G = e.stdout
          .split(
            `
`,
          )
          .filter((E) => E.length > 0)),
        G.length !== N.length)
      )
        return { committed: !1, skipReason: "git_error" };
    }
    let joined = [...N.map((e, E) => `${e.mode} ${G[E]}	${e.path}`), `100644 ${trimmed_2}	${D}`].join(`
`);
    if (
      (
        await execFileNoThrowWithCwd(gitExe(), [...n, ...I, "update-index", "--add", "--index-info"], {
          cwd: o,
          env: y,
          input:
            joined +
            `
`,
          timeout: w,
        })
      ).code !== 0
    )
      return { committed: !1, skipReason: "git_error" };
    if (O.length > 0) {
      if (
        (
          await execFileNoThrowWithCwd(
            gitExe(),
            [...n, ...I, "update-index", "--force-remove", "-z", "--stdin"],
            { cwd: o, env: y, input: O.join("\x00"), timeout: w },
          )
        ).code !== 0
      )
        return { committed: !1, skipReason: "git_error" };
    }
    let te = await execFileNoThrowWithCwd(gitExe(), [...n, ...I, "write-tree"], {
      cwd: o,
      env: y,
      timeout: w,
    });
    if (te.code !== 0) return { committed: !1, skipReason: "git_error" };
    let trimmed_3 = te.stdout.trim(),
      oe = await execFileNoThrowWithCwd(
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
        { cwd: o, env: k, timeout: w },
      );
    if (oe.code !== 0) return { committed: !1, skipReason: "git_error" };
    let trimmed_4 = oe.stdout.trim();
    if (
      (await lstat(join(l, "commondir")).catch((e) => {
        if (e.code === "ENOENT") return null;
        throw e;
      })) !== null
    )
      return { committed: !1, skipReason: "gitdir_uncontained" };
    if (
      (
        await execFileNoThrowWithCwd(
          gitExe(),
          [...n, "-c", "core.logAllRefUpdates=false", "update-ref", "--no-deref", h, trimmed_4],
          { cwd: o, env: k, timeout: w },
        )
      ).code !== 0
    )
      return { committed: !1, skipReason: "git_error" };
    let re = `/${D}`;
    return (
      await appendGitExclude(l, (e) =>
        e.toString("utf-8").split(/\r?\n/).includes(re)
          ? null
          : `${re}
`,
      ).catch(() => {}),
      await pruneOldCheckpointRefs(o, C, h, pe, k).catch((e) => {
        (logForDebugging(
          `[rateLimitCheckpoint] stopped deleting old checkpoint refs; the next checkpoint retries: ${errorMessage(e)}`,
          { level: "warn" },
        ),
          logFeatureSad("usage_limit_checkpoint_commit", "stale_ref_prune_failed"));
      }),
      { committed: !0, ref: h, resumePath: D, commitSha: trimmed_4 }
    );
  } catch {
    return { committed: !1, skipReason: "git_error" };
  } finally {
    if (_ !== void 0) await rm(_, { recursive: !0, force: !0 }).catch(() => {});
    else if (R !== void 0) await rm(R, { force: !0 }).catch(() => {});
  }
}

export { w, REFS_CLAUDE_CHECKPOINT, Fe, TENGU_COPPER_SLUICE, sanitizeCheckpointLine };
