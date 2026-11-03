/**
 * utils/git/submoduleInspection.ts
 *
 * 2.1.316 新增：检查单个子模块目录（.git 文件、gitdir 位置、嵌套仓库）；从 ls-files 输出中收集 gitlink 路径等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-rvr0tzz9.js (30)
 * attribution: placement 30
 */
import { join, resolve, dirname, sep, isAbsolute } from "path";
import { realpath, lstat, opendir, open } from "fs/promises";
import { finished } from "stream/promises";
import { constants } from "fs";
import { withTimeout } from "../sleep.js";
import { printableLabel } from "../printableName.js";
import { buildGitEnvForRepo } from "./gitDirResolution.js";
import { resolveGitDir, rawPointerPathIsUnsafe, GIT_CONFIG_MAX_BYTES } from "./gitFilesystem.js";
import { limitConcurrency } from "../concurrencyLimit.js";
import { execFileNoThrowWithCwd } from "../execFileNoThrow.js";
import { gitExe } from "../git.js";
import { GIT_SAFE_GLOBAL_ARGS, SAFE_GIT_ENV_CONSTANTS } from "./gitSafeEnv.js";
import { buildSafeGitInvocation } from "./gitSafeInvocation.js";
import { safeSpawn } from "../safeSpawn.js";
import { foldName, INVISIBLE_FORMAT_CHAR_RE } from "../permissions/protectedDirNames.js";
import { isOnForeignMount } from "../networkPaths.js";
import { getErrnoCode } from "../errors.js";
import { rejectSeparatorPath } from "../gitSafeExec.js";
import { getRemoteHostSessionCount } from "../../commands/insights.js";
import { buildFilterNeutralizingArgs } from "./gitConfigFilters.js";
import { hasDotSegment } from "../pathClassification.js";
import { getPlatform } from "../platform.js";

//@ chunk-rvr0tzz9.js:917-1017 placement
var SUBMODULE_DEADLINE_MS = 15000;
var MAX_SUBMODULES = 512;
var MAX_DEPTH = 8;
var MAX_GITMODULES_BYTES = 1e6;
var MAX_POINTER_BYTES = 4096;
var MAX_PATH_LENGTH = 4096;
var MAX_OUTPUT_BYTES = 8388608;
var MAX_LINE_BYTES = 74 + 4 * MAX_PATH_LENGTH;
var DEADLINE_REASON = "submodule inspection deadline";
//@ chunk-rvr0tzz9.js:1017-1200 placement
/**
 * 在截止时间内检查子模块是否有改动（超时/不可读视为无法验证）。
 */
async function inspectSubmodules(e, t) {
  let deadlineMs = t?.deadlineMs ?? SUBMODULE_DEADLINE_MS;
  try {
    return await withTimeout(inspectSubmodulesUnsafe(e, deadlineMs), deadlineMs, DEADLINE_REASON);
  } catch (error) {
    return {
      kind: "unverifiable",
      reason: error instanceof Error && error.message === DEADLINE_REASON ? "timeout" : "unreadable",
    };
  }
}
//@ chunk-rvr0tzz9.js:1200-1405 placement
/**
 * 把检查结果转为改动列表。
 */
function submoduleChanges(e) {
  if (e.kind === "unverifiable")
    return {
      kind: "unverifiable",
      reason: e.reason,
      path: e.path,
    };
  let t = [...e.withTrackedChanges, ...e.withUntrackedFiles];
  return t.length > 0
    ? {
        kind: "changes",
        paths: t,
      }
    : undefined;
}
//@ chunk-rvr0tzz9.js:1405-2534 placement
/**
 * 描述子模块改动或无法验证的原因。
 */
function describeSubmoduleChanges(e) {
  if (e.kind === "changes") {
    let filtered = e.paths.slice(0, 3).map(printableShortLabel).filter(Boolean);
    let i = e.paths.length - filtered.length;
    return `changes inside ${e.paths.length === 1 ? "submodule" : "submodules"} ${filtered.join(", ")}${i > 0 ? ` and ${i} more` : ""}`;
  }
  let t = e.path === undefined ? undefined : printableShortLabel(e.path) || undefined;
  switch (e.reason) {
    case "nested_repository":
      return `${t ?? "a directory"} is a separate git repository inside the worktree, not a submodule checkout`;
    case "gitdir_outside_modules":
      return `submodule ${t ?? "checkout"} points at a git directory outside this worktree's own, or its object alternates or config lead somewhere this worktree cannot vouch for`;
    case "unconfigured_gitlink":
      return `${t ?? "a directory"} is a nested repository recorded in the index but not a configured submodule`;
    case "nested_submodules":
      return `submodule ${t ?? "checkout"} holds submodules of its own, which can't be inspected`;
    case "too_many":
      return `it records more than ${MAX_SUBMODULES} submodules, too many to inspect`;
    case "unreadable":
      return t === undefined
        ? "its submodules' state could not be read"
        : `the state of submodule ${t} could not be read`;
    case "timeout":
      return "inspecting its submodules took too long";
  }
}
//@ chunk-rvr0tzz9.js:2534-2559 placement
var LABEL_HEAD_TAIL = {
  head: 24,
  tail: 16,
};
//@ chunk-rvr0tzz9.js:2559-2589 placement
function printableShortLabel(path) {
  return printableLabel(path, LABEL_HEAD_TAIL);
}
//@ chunk-rvr0tzz9.js:2589-3483 placement
/**
 * 子模块检查的实际逻辑（gitmodules、ls-files、各子模块状态）。
 */
async function inspectSubmodulesUnsafe(e, deadlineMs) {
  let n = {
    repository: [],
    env: buildGitEnvForRepo(e),
    deadlineMs,
  };
  let i = await listGitlinkEntries(e, n);
  if (typeof i === "string")
    return {
      kind: "unverifiable",
      reason: i,
    };
  if (i.length === 0)
    return {
      kind: "verified",
      withTrackedChanges: [],
      withUntrackedFiles: [],
    };
  let o = await listSubmodulePaths(e, n);
  if (typeof o === "string")
    return {
      kind: "unverifiable",
      reason: o,
    };
  let gitDir = await resolveGitDir(e);
  if (gitDir === null)
    return {
      kind: "unverifiable",
      reason: "unreadable",
    };
  let real;
  try {
    real = join(await realpath(gitDir), "modules");
  } catch {
    return {
      kind: "unverifiable",
      reason: "unreadable",
    };
  }
  let d = {
    lexical: join(gitDir, "modules"),
    real,
  };
  let c = new Set(o);
  let a = limitConcurrency(MAX_DEPTH, (g) =>
    c.has(g) ? inspectSubmodule(e, g, d, n) : classifySubmoduleDir(e, g),
  );
  let results = await Promise.all(i.map((g) => a(g)));
  let u = [];
  let f = [];
  for (let [g, p] of results.entries()) {
    let w = i[g];
    switch (p) {
      case "absent":
      case "clean":
        break;
      case "tracked":
        u.push(w);
        break;
      case "untracked":
        f.push(w);
        break;
      default:
        return {
          kind: "unverifiable",
          reason: p.unverifiable,
          path: w,
        };
    }
  }
  return {
    kind: "verified",
    withTrackedChanges: u,
    withUntrackedFiles: f,
  };
}
//@ chunk-rvr0tzz9.js:3483-3746 placement
/**
 * 读 .gitmodules 中的子模块路径。
 */
async function listSubmodulePaths(cwd, t) {
  let n = await statEntry(join(cwd, ".gitmodules"), MAX_GITMODULES_BYTES);
  switch (n.kind) {
    case "absent":
      return [];
    case "directory":
    case "other":
      return "unreadable";
    case "file":
      break;
  }
  let i = await gitConfigFromStdin(n.text, "^submodule\\..*\\.path$", cwd, t);
  return i === "unreadable" ? i : dedupeSubmodulePaths(i.map((o) => o.value));
}
//@ chunk-rvr0tzz9.js:3746-4232 placement
/**
 * 用 git config --file - 读取配置。
 */
async function gitConfigFromStdin(input, t, cwd, { repository, env, deadlineMs }) {
  let r = await execFileNoThrowWithCwd(
    gitExe(),
    [
      ...repository,
      ...GIT_SAFE_GLOBAL_ARGS,
      "config",
      "--file",
      "-",
      "--no-includes",
      "-z",
      "--get-regexp",
      t,
    ],
    {
      cwd,
      env,
      input,
      timeout: deadlineMs,
      preserveOutputOnError: false,
    },
  );
  let d = r.exitCode === 1 && r.error === undefined && !r.timedOut && !r.maxBufferExceeded;
  if (r.code !== 0 && !d) return "unreadable";
  let c = [];
  for (let a of r.stdout.split("\x00")) {
    if (a === "") continue;
    let index = a.indexOf(`
`);
    if (index === -1) return "unreadable";
    c.push({
      key: a.slice(0, index),
      value: a.slice(index + 1),
    });
  }
  return c;
}
//@ chunk-rvr0tzz9.js:4232-4279 placement
/**
 * 列出索引中的 gitlink（子模块）条目。
 */
async function listGitlinkEntries(e, t) {
  return listGitlinks(e, t, "160000");
}
//@ chunk-rvr0tzz9.js:4279-4326 placement
/**
 * 列出索引中的符号链接条目。
 */
async function listSymlinkEntries(e, t) {
  return listGitlinks(e, t, "120000");
}
//@ chunk-rvr0tzz9.js:4326-4654 placement
/**
 * 列出索引中的 gitlink（子模块）条目。
 */
async function listGitlinks(cwd, t, n) {
  let i = [...t.repository, ...GIT_SAFE_GLOBAL_ARGS, "ls-files", "-s", "-z"];
  let o = await execFileNoThrowWithCwd(gitExe(), i, {
    cwd,
    env: t.env,
    timeout: t.deadlineMs,
    maxBuffer: MAX_OUTPUT_BYTES,
    preserveOutputOnError: false,
    stdin: "ignore",
  });
  if (o.maxBufferExceeded) return streamGitlinks(cwd, i, t, n);
  if (o.code !== 0) return "unreadable";
  let s = new GitlinkCollector(n);
  s.push(Buffer.from(o.stdout, "utf8"));
  return s.end();
}
//@ chunk-rvr0tzz9.js:4654-5202 placement
/**
 * 输出过大时流式读取 gitlink。
 */
async function streamGitlinks(cwd, t, { env, deadlineMs }, o) {
  let safeGitInvocation = buildSafeGitInvocation(gitExe(), t, env);
  let r = new GitlinkCollector(o);
  try {
    let d = safeSpawn(gitExe(), safeGitInvocation?.args ?? t, {
      cwd,
      env: safeGitInvocation?.env ?? env,
      timeout: deadlineMs,
      stdin: "ignore",
      stdout: "pipe",
      stderr: "ignore",
    });
    d.stdout?.on("data", (f) => {
      if (r.push(Buffer.isBuffer(f) ? f : Buffer.from(f, "utf8")) !== undefined) d.kill();
    });
    let c = d.stdout ? finished(d.stdout).catch(() => {}) : Promise.resolve();
    let a = await d;
    let l = !a.timedOut && !a.isCanceled && a.signal === undefined && a.exitCode === 0;
    if (!l) d.stdout?.destroy();
    await c;
    let u = r.end();
    if (typeof u === "string") return u;
    return l ? u : "unreadable";
  } catch {
    return "unreadable";
  }
}
//@ chunk-rvr0tzz9.js:5202-6433 placement
/**
 * 从 ls-files 输出中收集 gitlink 路径。
 */
class GitlinkCollector {
  prefix;
  paths = new Set();
  record = "none";
  pending = [];
  pendingBytes = 0;
  verdict = undefined;
  constructor(e) {
    this.prefix = `${e} `;
  }
  push(e) {
    let t = 0;
    while (this.verdict === undefined && t < e.length) {
      let index = e.indexOf(0, t);
      let i = index === -1 ? e.length : index;
      this.append(e.subarray(t, i));
      if (index === -1) break;
      this.completeRecord();
      t = index + 1;
    }
    return this.verdict;
  }
  end() {
    if (this.verdict !== undefined) return this.verdict;
    if (this.record !== "none") return "unreadable";
    return dedupeSubmodulePaths([...this.paths]);
  }
  append(e) {
    if (e.length === 0 || this.record === "other") return;
    this.pending.push(e);
    this.pendingBytes += e.length;
    if (this.record === "none") this.record = "undecided";
    if (this.record === "undecided" && this.pendingBytes >= this.prefix.length) {
      let t = this.pending.length === 1 ? e : Buffer.concat(this.pending);
      if (t.toString("latin1", 0, this.prefix.length) === this.prefix) {
        this.record = "listed";
        this.pending = [t];
      } else {
        this.record = "other";
        this.pending = [];
      }
    }
    if (this.record === "listed" && this.pendingBytes > MAX_LINE_BYTES) this.verdict = "unreadable";
  }
  completeRecord() {
    if (this.record === "listed" && this.verdict === undefined) {
      let str = Buffer.concat(this.pending).toString("utf8");
      let index = str.indexOf("\t");
      if (index === -1) this.verdict = "unreadable";
      else {
        this.paths.add(str.slice(index + 1));
        if (this.paths.size > MAX_SUBMODULES) this.verdict = "too_many";
      }
    }
    this.record = "none";
    this.pending = [];
    this.pendingBytes = 0;
  }
}
//@ chunk-rvr0tzz9.js:6433-6579 placement
function dedupeSubmodulePaths(e) {
  let t = new Set();
  for (let n of e) {
    if (n.includes("\uFFFD") || !isSafeSubmodulePath(n)) return "unreadable";
    t.add(n);
    if (t.size > MAX_SUBMODULES) return "too_many";
  }
  return [...t];
}
//@ chunk-rvr0tzz9.js:6579-6820 placement
function isSafeSubmodulePath(e) {
  if (e.length === 0 || e.length > MAX_PATH_LENGTH) return false;
  return e.split("/").every((t) => {
    let n = foldName(t);
    return (
      t.replace(/[. ]+$/, "") !== "" &&
      n !== ".git" &&
      n !== "git~1" &&
      !INVISIBLE_FORMAT_CHAR_RE.test(t) &&
      [...t].every((i) => i !== "\\" && i !== ":" && i !== ";" && i > "\x1F" && i !== "\x7F")
    );
  });
}
//@ chunk-rvr0tzz9.js:6820-8634 placement
/**
 * 检查单个子模块目录（.git 文件、gitdir 位置、嵌套仓库）。
 */
async function inspectSubmodule(e, t, n, i) {
  let { deadlineMs } = i;
  let s = await walkSubmodulePath(e, t);
  if (s.kind !== "directory")
    return s.kind === "absent"
      ? "absent"
      : {
          unverifiable: "unreadable",
        };
  let path = s.path;
  let d = await statEntry(join(path, ".git"), MAX_POINTER_BYTES);
  switch (d.kind) {
    case "absent":
      return isDirEmpty(path);
    case "directory":
      return {
        unverifiable: "nested_repository",
      };
    case "other":
      return {
        unverifiable: "unreadable",
      };
    case "file":
      break;
  }
  let trimmed = d.text.trim();
  if (!trimmed.startsWith("gitdir:"))
    return {
      unverifiable: "unreadable",
    };
  let trimmed_2 = trimmed.slice(7).trim();
  if (trimmed_2 === "" || isOnForeignMount(trimmed_2, path))
    return {
      unverifiable: "gitdir_outside_modules",
    };
  let l = resolve(path, trimmed_2);
  if (!isPathUnder(l, n.lexical) && !isPathUnder(l, n.real))
    return {
      unverifiable: "gitdir_outside_modules",
    };
  if (rawPointerPathIsUnsafe(trimmed_2, path))
    return {
      unverifiable: "gitdir_outside_modules",
    };
  let u;
  try {
    u = await realpath(l);
  } catch {
    return {
      unverifiable: "unreadable",
    };
  }
  if (!isPathUnder(u, n.real))
    return {
      unverifiable: "gitdir_outside_modules",
    };
  try {
    await lstat(join(u, "commondir"));
    return {
      unverifiable: "gitdir_outside_modules",
    };
  } catch (error) {
    if (getErrnoCode(error) !== "ENOENT")
      return {
        unverifiable: "unreadable",
      };
  }
  let f = join(u, "objects");
  let g = await checkModuleGitDir(f, 0, new Set([f]));
  if (g !== undefined)
    return {
      unverifiable: g,
    };
  let p = [join(u, "config"), join(u, "config.worktree")];
  let w = new Set(p);
  for (let m of p) {
    let B = await checkModuleConfig(m, e, i, 0, w);
    if (B !== undefined)
      return {
        unverifiable: B,
      };
  }
  let G = rejectSeparatorPath(dirname(path));
  if (G === null)
    return {
      unverifiable: "unreadable",
    };
  let x = {
    GIT_CEILING_DIRECTORIES: G,
    GIT_COMMON_DIR: u,
  };
  let O = {
    repository: [`--git-dir=${u}`, `--work-tree=${path}`],
    env: getRemoteHostSessionCount(x),
    deadlineMs,
  };
  if (await anySubmoduleCheckedOut(path, O))
    return {
      unverifiable: "nested_submodules",
    };
  let filterNeutralizingArgs = await buildFilterNeutralizingArgs(path, {
    repository: O.repository,
    envPins: x,
  });
  if (!filterNeutralizingArgs.ok)
    return {
      unverifiable: "unreadable",
    };
  let C = await execFileNoThrowWithCwd(
    gitExe(),
    [...O.repository, ...filterNeutralizingArgs.args, ...GIT_SAFE_GLOBAL_ARGS, ...SAFE_GIT_ENV_CONSTANTS],
    {
      cwd: path,
      env: getRemoteHostSessionCount(x, {
        userLocale: true,
      }),
      timeout: deadlineMs,
      preserveOutputOnError: false,
    },
  );
  if (C.code !== 0)
    return {
      unverifiable: "unreadable",
    };
  let filtered = C.stdout
    .split(
      `
`,
    )
    .filter((line) => line.length > 0);
  if (filtered.some((m) => !m.startsWith("??"))) return "tracked";
  return filtered.length > 0 ? "untracked" : "clean";
}
//@ chunk-rvr0tzz9.js:8634-8837 placement
async function classifySubmoduleDir(e, t) {
  let n = await inspectSubmoduleDir(e, t);
  switch (n) {
    case "absent":
    case "untracked":
      return n;
    case "repository":
      return {
        unverifiable: "unconfigured_gitlink",
      };
    case "unreadable":
      return {
        unverifiable: "unreadable",
      };
  }
}
//@ chunk-rvr0tzz9.js:8837-8879 placement
function isPathUnder(e, t) {
  return e.startsWith(t + sep);
}
//@ chunk-rvr0tzz9.js:8879-8943 placement
var MAX_GITDIR_POINTER_DEPTH = 5;
var MAX_SUBMODULE_NESTING = 10;
var MAX_GITDIR_POINTER_ENTRIES = 16;
var DRIVE_PATH_WITHOUT_SEP_RE = /^[A-Za-z]:(?![\\/])/;
var LEADING_PARENT_SEGMENTS_RE = /^(?:\.\.\/+)*/;
//@ chunk-rvr0tzz9.js:8943-9046 placement
function isUnsafeGitdirPointer(e, t) {
  return (
    e.includes("\uFFFD") ||
    DRIVE_PATH_WITHOUT_SEP_RE.test(e) ||
    hasDotSegment(isAbsolute(e) ? e : e.replace(LEADING_PARENT_SEGMENTS_RE, "")) ||
    isOnForeignMount(e, t) ||
    rawPointerPathIsUnsafe(e, t)
  );
}
//@ chunk-rvr0tzz9.js:9046-9886 placement
/**
 * 检查子模块 gitdir 必须在 .git/modules 内。
 */
async function checkModuleGitDir(e, t, n) {
  if (t > MAX_GITDIR_POINTER_DEPTH || n.size > MAX_GITDIR_POINTER_ENTRIES) return "gitdir_outside_modules";
  try {
    if (!(await lstat(e)).isDirectory()) return "gitdir_outside_modules";
  } catch {
    return "unreadable";
  }
  let i = join(e, "info");
  try {
    if (!(await lstat(i)).isDirectory()) return "gitdir_outside_modules";
  } catch (error) {
    return isNotFoundCode(getErrnoCode(error)) ? undefined : "unreadable";
  }
  try {
    await lstat(join(i, "http-alternates"));
    return "gitdir_outside_modules";
  } catch (error) {
    if (!isNotFoundCode(getErrnoCode(error))) return "unreadable";
  }
  let o = await statEntry(join(i, "alternates"), MAX_POINTER_BYTES);
  switch (o.kind) {
    case "absent":
      return;
    case "directory":
    case "other":
      return "unreadable";
    case "file":
      break;
  }
  let s = 0;
  for (let line of o.text.split(`
`)) {
    if (line === "" || line.startsWith("#")) continue;
    s++;
    if (s > MAX_GITDIR_POINTER_ENTRIES || line.startsWith('"') || isUnsafeGitdirPointer(line, e))
      return "gitdir_outside_modules";
    let d;
    try {
      d = await realpath(resolve(e, line));
    } catch (error) {
      if (isNotFoundCode(getErrnoCode(error))) continue;
      return "unreadable";
    }
    if (n.has(d)) continue;
    n.add(d);
    let c = await checkModuleGitDir(d, t + 1, n);
    if (c !== undefined) return c;
  }
  return;
}
//@ chunk-rvr0tzz9.js:9886-9978 placement
var SUBMODULE_UNSAFE_CONFIG_RE =
  "^(include\\.path|includeif\\..*\\.path|core\\.excludesfile|core\\.attributesfile)$";
//@ chunk-rvr0tzz9.js:9978-10749 placement
/**
 * 检查子模块配置是否含危险项。
 */
async function checkModuleConfig(e, cwd, n, i, o) {
  if (i > MAX_SUBMODULE_NESTING || o.size > MAX_GITDIR_POINTER_ENTRIES) return "gitdir_outside_modules";
  let s = await statEntry(e, GIT_CONFIG_MAX_BYTES);
  switch (s.kind) {
    case "absent":
      return;
    case "directory":
    case "other":
      return "unreadable";
    case "file":
      break;
  }
  if (!/include|excludesfile|attributesfile/i.test(s.text)) return;
  let r = await gitConfigFromStdin(s.text, SUBMODULE_UNSAFE_CONFIG_RE, cwd, n);
  if (r === "unreadable") return "unreadable";
  if (r.length > MAX_GITDIR_POINTER_ENTRIES) return "gitdir_outside_modules";
  let d = dirname(e);
  for (let { key, value: a } of r) {
    let l = key.startsWith("include");
    if (
      a === "" ||
      a.startsWith("~") ||
      a.startsWith("%(prefix)/") ||
      (!l && !isAbsolute(a)) ||
      isUnsafeGitdirPointer(a, d)
    )
      return "gitdir_outside_modules";
    if (!l) continue;
    let u = resolve(d, a);
    let f;
    try {
      f = await realpath(u);
    } catch (error) {
      if (isNotFoundCode(getErrnoCode(error))) continue;
      return "unreadable";
    }
    if (f !== u) return "gitdir_outside_modules";
    if (o.has(f)) continue;
    o.add(f);
    let g = await checkModuleConfig(f, cwd, n, i + 1, o);
    if (g !== undefined) return g;
  }
  return;
}
//@ chunk-rvr0tzz9.js:10749-10895 placement
async function anySubmoduleCheckedOut(path, t) {
  let n = await listGitlinkEntries(path, t);
  if (typeof n === "string") return true;
  return (await Promise.all(n.map((o) => inspectSubmoduleDir(path, o)))).some((o) => o !== "absent");
}
//@ chunk-rvr0tzz9.js:10895-11138 placement
async function inspectSubmoduleDir(e, t) {
  let n = await walkSubmodulePath(e, t);
  if (n.kind !== "directory") return n.kind;
  try {
    await lstat(join(n.path, ".git"));
    return "repository";
  } catch (error) {
    if (!isNotFoundCode(getErrnoCode(error))) return "unreadable";
  }
  let i = await isDirEmpty(n.path);
  return i === "absent" || i === "untracked" ? i : "unreadable";
}
//@ chunk-rvr0tzz9.js:11138-11374 placement
async function isDirEmpty(path) {
  let t;
  try {
    t = await opendir(path);
  } catch (error) {
    return isNotFoundCode(getErrnoCode(error))
      ? "absent"
      : {
          unverifiable: "unreadable",
        };
  }
  try {
    return (await t.read()) === null ? "absent" : "untracked";
  } catch {
    return {
      unverifiable: "unreadable",
    };
  } finally {
    try {
      await t.close();
    } catch {}
  }
}
//@ chunk-rvr0tzz9.js:11374-11590 placement
async function walkSubmodulePath(e, t) {
  let n = e;
  for (let i of t.split("/")) {
    n = join(n, i);
    try {
      if (!(await lstat(n)).isDirectory())
        return {
          kind: "absent",
        };
    } catch (error) {
      return isNotFoundCode(getErrnoCode(error))
        ? {
            kind: "absent",
          }
        : {
            kind: "unreadable",
          };
    }
  }
  return {
    kind: "directory",
    path: n,
  };
}
//@ chunk-rvr0tzz9.js:11590-11639 placement = isRealPathWithinTeamDir (1)
function isNotFoundCode(realCandidate) {
  return realCandidate === "ENOENT" || realCandidate === "ENOTDIR";
}
//@ chunk-rvr0tzz9.js:11639-12472 placement
/**
 * 判断路径类型（目录/文件/其他/不存在）。
 */
async function statEntry(e, t) {
  let n = getPlatform() === "windows";
  let i;
  if (n)
    try {
      let s = await lstat(e, {
        bigint: true,
      });
      if (s.isDirectory())
        return {
          kind: "directory",
        };
      if (!s.isFile())
        return {
          kind: "other",
        };
      i = {
        dev: s.dev,
        ino: s.ino,
      };
    } catch (error) {
      return isNotFoundCode(getErrnoCode(error))
        ? {
            kind: "absent",
          }
        : {
            kind: "other",
          };
    }
  let o;
  try {
    o = await open(
      e,
      n ? constants.O_RDONLY : constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK,
    );
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    if (isNotFoundCode(errnoCode))
      return {
        kind: "absent",
      };
    return errnoCode === "EISDIR"
      ? {
          kind: "directory",
        }
      : {
          kind: "other",
        };
  }
  try {
    let stats = await o.stat({
      bigint: true,
    });
    if (i !== undefined && (stats.dev !== i.dev || stats.ino !== i.ino))
      return {
        kind: "other",
      };
    if (stats.isDirectory())
      return {
        kind: "directory",
      };
    if (!stats.isFile() || stats.size > BigInt(t))
      return {
        kind: "other",
      };
    let r = Number(stats.size);
    let { buffer, bytesRead } = await o.read(Buffer.alloc(r + 1), 0, r + 1, 0);
    if (bytesRead > r)
      return {
        kind: "other",
      };
    return {
      kind: "file",
      text: buffer.toString("utf8", 0, bytesRead),
    };
  } catch {
    return {
      kind: "other",
    };
  } finally {
    await o.close();
  }
}
export {
  submoduleChanges,
  inspectSubmodules,
  describeSubmoduleChanges,
  listSubmodulePaths,
  listGitlinkEntries,
  listSymlinkEntries,
};
