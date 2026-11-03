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
import { freeze, freeze_2 } from "./gitSafeEnv.js";
import { buildSafeGitInvocation } from "./gitSafeInvocation.js";
import { safeSpawn } from "../safeSpawn.js";
import { foldName, INVISIBLE_FORMAT_CHAR_RE } from "../permissions/protectedDirNames.js";
import { isOnForeignMount } from "../networkPaths.js";
import { getErrnoCode } from "../errors.js";
import { Xlo } from "../gitSafeExec.js";
import { getRemoteHostSessionCount } from "../../commands/insights.js";
import { buildFilterNeutralizingArgs } from "./gitConfigFilters.js";
import { cl } from "../pathClassification.js";
import { getPlatform } from "../platform.js";

//@ chunk-rvr0tzz9.js:917-1017 placement
var SUBMODULE_DEADLINE_MS = 15000,
  MAX_SUBMODULES = 512,
  MAX_DEPTH = 8,
  MAX_GITMODULES_BYTES = 1e6,
  MAX_POINTER_BYTES = 4096,
  MAX_PATH_LENGTH = 4096,
  MAX_OUTPUT_BYTES = 8388608,
  MAX_LINE_BYTES = 74 + 4 * MAX_PATH_LENGTH,
  DEADLINE_REASON = "submodule inspection deadline";
/**
 * 在截止时间内检查子模块是否有改动（超时/不可读视为无法验证）。
 */
//@ chunk-rvr0tzz9.js:1017-1200 placement
async function inspectSubmodules(e, t) {
  let n = t?.deadlineMs ?? SUBMODULE_DEADLINE_MS;
  try {
    return await withTimeout(inspectSubmodulesUnsafe(e, n), n, DEADLINE_REASON);
  } catch (error) {
    return {
      kind: "unverifiable",
      reason: error instanceof Error && error.message === DEADLINE_REASON ? "timeout" : "unreadable",
    };
  }
}
/**
 * 把检查结果转为改动列表。
 */
//@ chunk-rvr0tzz9.js:1200-1405 placement
function submoduleChanges(e) {
  if (e.kind === "unverifiable") return { kind: "unverifiable", reason: e.reason, path: e.path };
  let t = [...e.withTrackedChanges, ...e.withUntrackedFiles];
  return t.length > 0 ? { kind: "changes", paths: t } : void 0;
}
/**
 * 描述子模块改动或无法验证的原因。
 */
//@ chunk-rvr0tzz9.js:1405-2534 placement
function describeSubmoduleChanges(e) {
  if (e.kind === "changes") {
    let filtered = e.paths.slice(0, 3).map(A).filter(Boolean),
      i = e.paths.length - filtered.length;
    return `changes inside ${e.paths.length === 1 ? "submodule" : "submodules"} ${filtered.join(", ")}${i > 0 ? ` and ${i} more` : ""}`;
  }
  let t = e.path === void 0 ? void 0 : A(e.path) || void 0;
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
      return t === void 0
        ? "its submodules' state could not be read"
        : `the state of submodule ${t} could not be read`;
    case "timeout":
      return "inspecting its submodules took too long";
  }
}
//@ chunk-rvr0tzz9.js:2534-2559 placement
var de = { head: 24, tail: 16 };
//@ chunk-rvr0tzz9.js:2559-2589 placement
function A(e) {
  return printableLabel(e, de);
}
/**
 * 子模块检查的实际逻辑（gitmodules、ls-files、各子模块状态）。
 */
//@ chunk-rvr0tzz9.js:2589-3483 placement
async function inspectSubmodulesUnsafe(e, t) {
  let n = { repository: [], env: buildGitEnvForRepo(e), deadlineMs: t },
    i = await j3r(e, n);
  if (typeof i === "string") return { kind: "unverifiable", reason: i };
  if (i.length === 0) return { kind: "verified", withTrackedChanges: [], withUntrackedFiles: [] };
  let o = await listSubmodulePaths(e, n);
  if (typeof o === "string") return { kind: "unverifiable", reason: o };
  let s = await resolveGitDir(e);
  if (s === null) return { kind: "unverifiable", reason: "unreadable" };
  let r;
  try {
    r = join(await realpath(s), "modules");
  } catch {
    return { kind: "unverifiable", reason: "unreadable" };
  }
  let d = { lexical: join(s, "modules"), real: r },
    c = new Set(o),
    a = limitConcurrency(MAX_DEPTH, (g) =>
      c.has(g) ? inspectSubmodule(e, g, d, n) : classifySubmoduleDir(e, g),
    ),
    results = await Promise.all(i.map((g) => a(g))),
    u = [],
    f = [];
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
        return { kind: "unverifiable", reason: p.unverifiable, path: w };
    }
  }
  return { kind: "verified", withTrackedChanges: u, withUntrackedFiles: f };
}
/**
 * 读 .gitmodules 中的子模块路径。
 */
//@ chunk-rvr0tzz9.js:3483-3746 placement
async function listSubmodulePaths(e, t) {
  let n = await statEntry(join(e, ".gitmodules"), MAX_GITMODULES_BYTES);
  switch (n.kind) {
    case "absent":
      return [];
    case "directory":
    case "other":
      return "unreadable";
    case "file":
      break;
  }
  let i = await gitConfigFromStdin(n.text, "^submodule\\..*\\.path$", e, t);
  return i === "unreadable" ? i : dedupeSubmodulePaths(i.map((o) => o.value));
}
/**
 * 用 git config --file - 读取配置。
 */
//@ chunk-rvr0tzz9.js:3746-4232 placement
async function gitConfigFromStdin(e, t, n, { repository: repository, env: env, deadlineMs: deadlineMs }) {
  let r = await execFileNoThrowWithCwd(
      gitExe(),
      [...repository, ...freeze, "config", "--file", "-", "--no-includes", "-z", "--get-regexp", t],
      { cwd: n, env: env, input: e, timeout: deadlineMs, preserveOutputOnError: !1 },
    ),
    d = r.exitCode === 1 && r.error === void 0 && !r.timedOut && !r.maxBufferExceeded;
  if (r.code !== 0 && !d) return "unreadable";
  let c = [];
  for (let a of r.stdout.split("\x00")) {
    if (a === "") continue;
    let index = a.indexOf(`
`);
    if (index === -1) return "unreadable";
    c.push({ key: a.slice(0, index), value: a.slice(index + 1) });
  }
  return c;
}
//@ chunk-rvr0tzz9.js:4232-4279 placement
async function j3r(e, t) {
  return listGitlinks(e, t, "160000");
}
//@ chunk-rvr0tzz9.js:4279-4326 placement
async function ali(e, t) {
  return listGitlinks(e, t, "120000");
}
/**
 * 列出索引中的 gitlink（子模块）条目。
 */
//@ chunk-rvr0tzz9.js:4326-4654 placement
async function listGitlinks(e, t, n) {
  let i = [...t.repository, ...freeze, "ls-files", "-s", "-z"],
    o = await execFileNoThrowWithCwd(gitExe(), i, {
      cwd: e,
      env: t.env,
      timeout: t.deadlineMs,
      maxBuffer: MAX_OUTPUT_BYTES,
      preserveOutputOnError: !1,
      stdin: "ignore",
    });
  if (o.maxBufferExceeded) return streamGitlinks(e, i, t, n);
  if (o.code !== 0) return "unreadable";
  let s = new GitlinkCollector(n);
  return (s.push(Buffer.from(o.stdout, "utf8")), s.end());
}
/**
 * 输出过大时流式读取 gitlink。
 */
//@ chunk-rvr0tzz9.js:4654-5202 placement
async function streamGitlinks(e, t, { env: env, deadlineMs: deadlineMs }, o) {
  let s = buildSafeGitInvocation(gitExe(), t, env),
    r = new GitlinkCollector(o);
  try {
    let d = safeSpawn(gitExe(), s?.args ?? t, {
      cwd: e,
      env: s?.env ?? env,
      timeout: deadlineMs,
      stdin: "ignore",
      stdout: "pipe",
      stderr: "ignore",
    });
    d.stdout?.on("data", (f) => {
      if (r.push(Buffer.isBuffer(f) ? f : Buffer.from(f, "utf8")) !== void 0) d.kill();
    });
    let c = d.stdout ? finished(d.stdout).catch(() => {}) : Promise.resolve(),
      a = await d,
      l = !a.timedOut && !a.isCanceled && a.signal === void 0 && a.exitCode === 0;
    if (!l) d.stdout?.destroy();
    await c;
    let end = r.end();
    if (typeof end === "string") return end;
    return l ? end : "unreadable";
  } catch {
    return "unreadable";
  }
}
/**
 * 从 ls-files 输出中收集 gitlink 路径。
 */
//@ chunk-rvr0tzz9.js:5202-6433 placement
class GitlinkCollector {
  prefix;
  paths = new Set();
  record = "none";
  pending = [];
  pendingBytes = 0;
  verdict = void 0;
  constructor(e) {
    this.prefix = `${e} `;
  }
  push(e) {
    let t = 0;
    while (this.verdict === void 0 && t < e.length) {
      let index = e.indexOf(0, t),
        i = index === -1 ? e.length : index;
      if ((this.append(e.subarray(t, i)), index === -1)) break;
      (this.completeRecord(), (t = index + 1));
    }
    return this.verdict;
  }
  end() {
    if (this.verdict !== void 0) return this.verdict;
    if (this.record !== "none") return "unreadable";
    return dedupeSubmodulePaths([...this.paths]);
  }
  append(e) {
    if (e.length === 0 || this.record === "other") return;
    if ((this.pending.push(e), (this.pendingBytes += e.length), this.record === "none"))
      this.record = "undecided";
    if (this.record === "undecided" && this.pendingBytes >= this.prefix.length) {
      let t = this.pending.length === 1 ? e : Buffer.concat(this.pending);
      if (t.toString("latin1", 0, this.prefix.length) === this.prefix)
        ((this.record = "listed"), (this.pending = [t]));
      else ((this.record = "other"), (this.pending = []));
    }
    if (this.record === "listed" && this.pendingBytes > MAX_LINE_BYTES) this.verdict = "unreadable";
  }
  completeRecord() {
    if (this.record === "listed" && this.verdict === void 0) {
      let str = Buffer.concat(this.pending).toString("utf8"),
        index = str.indexOf("\t");
      if (index === -1) this.verdict = "unreadable";
      else if ((this.paths.add(str.slice(index + 1)), this.paths.size > MAX_SUBMODULES))
        this.verdict = "too_many";
    }
    ((this.record = "none"), (this.pending = []), (this.pendingBytes = 0));
  }
}
//@ chunk-rvr0tzz9.js:6433-6579 placement
function dedupeSubmodulePaths(e) {
  let t = new Set();
  for (let n of e) {
    if (n.includes("\uFFFD") || !isSafeSubmodulePath(n)) return "unreadable";
    if ((t.add(n), t.size > MAX_SUBMODULES)) return "too_many";
  }
  return [...t];
}
//@ chunk-rvr0tzz9.js:6579-6820 placement
function isSafeSubmodulePath(e) {
  if (e.length === 0 || e.length > MAX_PATH_LENGTH) return !1;
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
/**
 * 检查单个子模块目录（.git 文件、gitdir 位置、嵌套仓库）。
 */
//@ chunk-rvr0tzz9.js:6820-8634 placement
async function inspectSubmodule(e, t, n, i) {
  let { deadlineMs: deadlineMs } = i,
    s = await walkSubmodulePath(e, t);
  if (s.kind !== "directory") return s.kind === "absent" ? "absent" : { unverifiable: "unreadable" };
  let path = s.path,
    d = await statEntry(join(path, ".git"), MAX_POINTER_BYTES);
  switch (d.kind) {
    case "absent":
      return isDirEmpty(path);
    case "directory":
      return { unverifiable: "nested_repository" };
    case "other":
      return { unverifiable: "unreadable" };
    case "file":
      break;
  }
  let trimmed = d.text.trim();
  if (!trimmed.startsWith("gitdir:")) return { unverifiable: "unreadable" };
  let trimmed_2 = trimmed.slice(7).trim();
  if (trimmed_2 === "" || isOnForeignMount(trimmed_2, path))
    return { unverifiable: "gitdir_outside_modules" };
  let l = resolve(path, trimmed_2);
  if (!T(l, n.lexical) && !T(l, n.real)) return { unverifiable: "gitdir_outside_modules" };
  if (rawPointerPathIsUnsafe(trimmed_2, path)) return { unverifiable: "gitdir_outside_modules" };
  let u;
  try {
    u = await realpath(l);
  } catch {
    return { unverifiable: "unreadable" };
  }
  if (!T(u, n.real)) return { unverifiable: "gitdir_outside_modules" };
  try {
    return (await lstat(join(u, "commondir")), { unverifiable: "gitdir_outside_modules" });
  } catch (error) {
    if (getErrnoCode(error) !== "ENOENT") return { unverifiable: "unreadable" };
  }
  let f = join(u, "objects"),
    g = await checkModuleGitDir(f, 0, new Set([f]));
  if (g !== void 0) return { unverifiable: g };
  let p = [join(u, "config"), join(u, "config.worktree")],
    w = new Set(p);
  for (let m of p) {
    let B = await checkModuleConfig(m, e, i, 0, w);
    if (B !== void 0) return { unverifiable: B };
  }
  let G = Xlo(dirname(path));
  if (G === null) return { unverifiable: "unreadable" };
  let x = { GIT_CEILING_DIRECTORIES: G, GIT_COMMON_DIR: u },
    O = {
      repository: [`--git-dir=${u}`, `--work-tree=${path}`],
      env: getRemoteHostSessionCount(x),
      deadlineMs: deadlineMs,
    };
  if (await anySubmoduleCheckedOut(path, O)) return { unverifiable: "nested_submodules" };
  let R = await buildFilterNeutralizingArgs(path, { repository: O.repository, envPins: x });
  if (!R.ok) return { unverifiable: "unreadable" };
  let C = await execFileNoThrowWithCwd(gitExe(), [...O.repository, ...R.args, ...freeze, ...freeze_2], {
    cwd: path,
    env: getRemoteHostSessionCount(x, { userLocale: !0 }),
    timeout: deadlineMs,
    preserveOutputOnError: !1,
  });
  if (C.code !== 0) return { unverifiable: "unreadable" };
  let filtered = C.stdout
    .split(
      `
`,
    )
    .filter((m) => m.length > 0);
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
      return { unverifiable: "unconfigured_gitlink" };
    case "unreadable":
      return { unverifiable: "unreadable" };
  }
}
//@ chunk-rvr0tzz9.js:8837-8879 placement
function T(e, t) {
  return e.startsWith(t + sep);
}
//@ chunk-rvr0tzz9.js:8879-8943 placement
var he = 5,
  be = 10,
  v = 16,
  pe = /^[A-Za-z]:(?![\\/])/,
  me = /^(?:\.\.\/+)*/;
//@ chunk-rvr0tzz9.js:8943-9046 placement
function isUnsafeGitdirPointer(e, t) {
  return (
    e.includes("\uFFFD") ||
    pe.test(e) ||
    cl(isAbsolute(e) ? e : e.replace(me, "")) ||
    isOnForeignMount(e, t) ||
    rawPointerPathIsUnsafe(e, t)
  );
}
/**
 * 检查子模块 gitdir 必须在 .git/modules 内。
 */
//@ chunk-rvr0tzz9.js:9046-9886 placement
async function checkModuleGitDir(e, t, n) {
  if (t > he || n.size > v) return "gitdir_outside_modules";
  try {
    if (!(await lstat(e)).isDirectory()) return "gitdir_outside_modules";
  } catch {
    return "unreadable";
  }
  let i = join(e, "info");
  try {
    if (!(await lstat(i)).isDirectory()) return "gitdir_outside_modules";
  } catch (error) {
    return isNotFoundCode(getErrnoCode(error)) ? void 0 : "unreadable";
  }
  try {
    return (await lstat(join(i, "http-alternates")), "gitdir_outside_modules");
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
  for (let r of o.text.split(`
`)) {
    if (r === "" || r.startsWith("#")) continue;
    if ((s++, s > v || r.startsWith('"') || isUnsafeGitdirPointer(r, e))) return "gitdir_outside_modules";
    let d;
    try {
      d = await realpath(resolve(e, r));
    } catch (error) {
      if (isNotFoundCode(getErrnoCode(error))) continue;
      return "unreadable";
    }
    if (n.has(d)) continue;
    n.add(d);
    let c = await checkModuleGitDir(d, t + 1, n);
    if (c !== void 0) return c;
  }
  return;
}
//@ chunk-rvr0tzz9.js:9886-9978 placement
var ye = "^(include\\.path|includeif\\..*\\.path|core\\.excludesfile|core\\.attributesfile)$";
/**
 * 检查子模块配置是否含危险项。
 */
//@ chunk-rvr0tzz9.js:9978-10749 placement
async function checkModuleConfig(e, t, n, i, o) {
  if (i > be || o.size > v) return "gitdir_outside_modules";
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
  let r = await gitConfigFromStdin(s.text, ye, t, n);
  if (r === "unreadable") return "unreadable";
  if (r.length > v) return "gitdir_outside_modules";
  let d = dirname(e);
  for (let { key: key, value: a } of r) {
    let startsWith = key.startsWith("include");
    if (
      a === "" ||
      a.startsWith("~") ||
      a.startsWith("%(prefix)/") ||
      (!startsWith && !isAbsolute(a)) ||
      isUnsafeGitdirPointer(a, d)
    )
      return "gitdir_outside_modules";
    if (!startsWith) continue;
    let u = resolve(d, a),
      f;
    try {
      f = await realpath(u);
    } catch (error) {
      if (isNotFoundCode(getErrnoCode(error))) continue;
      return "unreadable";
    }
    if (f !== u) return "gitdir_outside_modules";
    if (o.has(f)) continue;
    o.add(f);
    let g = await checkModuleConfig(f, t, n, i + 1, o);
    if (g !== void 0) return g;
  }
  return;
}
//@ chunk-rvr0tzz9.js:10749-10895 placement
async function anySubmoduleCheckedOut(e, t) {
  let n = await j3r(e, t);
  if (typeof n === "string") return !0;
  return (await Promise.all(n.map((o) => inspectSubmoduleDir(e, o)))).some((o) => o !== "absent");
}
//@ chunk-rvr0tzz9.js:10895-11138 placement
async function inspectSubmoduleDir(e, t) {
  let n = await walkSubmodulePath(e, t);
  if (n.kind !== "directory") return n.kind;
  try {
    return (await lstat(join(n.path, ".git")), "repository");
  } catch (error) {
    if (!isNotFoundCode(getErrnoCode(error))) return "unreadable";
  }
  let i = await isDirEmpty(n.path);
  return i === "absent" || i === "untracked" ? i : "unreadable";
}
//@ chunk-rvr0tzz9.js:11138-11374 placement
async function isDirEmpty(e) {
  let t;
  try {
    t = await opendir(e);
  } catch (error) {
    return isNotFoundCode(getErrnoCode(error)) ? "absent" : { unverifiable: "unreadable" };
  }
  try {
    return (await t.read()) === null ? "absent" : "untracked";
  } catch {
    return { unverifiable: "unreadable" };
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
      if (!(await lstat(n)).isDirectory()) return { kind: "absent" };
    } catch (error) {
      return isNotFoundCode(getErrnoCode(error)) ? { kind: "absent" } : { kind: "unreadable" };
    }
  }
  return { kind: "directory", path: n };
}
//@ chunk-rvr0tzz9.js:11590-11639 placement = isRealPathWithinTeamDir (1)
function isNotFoundCode(realCandidate) {
  return realCandidate === "ENOENT" || realCandidate === "ENOTDIR";
}
/**
 * 判断路径类型（目录/文件/其他/不存在）。
 */
//@ chunk-rvr0tzz9.js:11639-12472 placement
async function statEntry(e, t) {
  let n = getPlatform() === "windows",
    i;
  if (n)
    try {
      let s = await lstat(e, { bigint: !0 });
      if (s.isDirectory()) return { kind: "directory" };
      if (!s.isFile()) return { kind: "other" };
      i = { dev: s.dev, ino: s.ino };
    } catch (error) {
      return isNotFoundCode(getErrnoCode(error)) ? { kind: "absent" } : { kind: "other" };
    }
  let o;
  try {
    o = await open(
      e,
      n ? constants.O_RDONLY : constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK,
    );
  } catch (error) {
    let r = getErrnoCode(error);
    if (isNotFoundCode(r)) return { kind: "absent" };
    return r === "EISDIR" ? { kind: "directory" } : { kind: "other" };
  }
  try {
    let stats = await o.stat({ bigint: !0 });
    if (i !== void 0 && (stats.dev !== i.dev || stats.ino !== i.ino)) return { kind: "other" };
    if (stats.isDirectory()) return { kind: "directory" };
    if (!stats.isFile() || stats.size > BigInt(t)) return { kind: "other" };
    let r = Number(stats.size),
      { buffer: buffer, bytesRead: bytesRead } = await o.read(Buffer.alloc(r + 1), 0, r + 1, 0);
    if (bytesRead > r) return { kind: "other" };
    return { kind: "file", text: buffer.toString("utf8", 0, bytesRead) };
  } catch {
    return { kind: "other" };
  } finally {
    await o.close();
  }
}

export { submoduleChanges, inspectSubmodules, describeSubmoduleChanges, listSubmodulePaths, j3r, ali };
