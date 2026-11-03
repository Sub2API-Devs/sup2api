/**
 * utils/git/gitConfigFilters.ts
 *
 * git filter 配置与 trace 变量（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-8t9z960d.js (16)
 * attribution: placement 16
 */
import { uniq } from "../collections.js";
import { printableLabel } from "../printableName.js";
import { redactSshUserinfo } from "../redaction/urlRedaction.js";
import { execFileNoThrowWithCwd } from "../execFileNoThrow.js";
import { gitExe } from "../git.js";
import { resolveGitDirsOrPlaceholder } from "./gitDirResolution.js";
import { freeze } from "./gitSafeEnv.js";
import { getRemoteHostSessionCount } from "../../commands/insights.js";
import { keepsRefsInReftable } from "./gitFilesystem.js";

//@ chunk-8t9z960d.js:450-510 placement
var T = /^filter\.(.*)\.(?:clean|smudge|process|required)$/is;
//@ chunk-8t9z960d.js:510-590 placement
function Mwn(e) {
  return e
    .normalize("NFKD")
    .replace(/\p{M}+/gu, "")
    .toLowerCase();
}
/**
 * 从 filter.<名>.* 键中取驱动名。
 */
//@ chunk-8t9z960d.js:590-692 placement
function filterDriverNames(e) {
  return uniq(
    Array.from(e).flatMap((n) => {
      let r = T.exec(n)?.[1];
      return r === void 0 ? [] : [r];
    }),
  );
}
//@ chunk-8t9z960d.js:692-844 placement
function isFilterConfigKey(e) {
  return e.flatMap((n) => [
    [`filter.${n}.clean`, ""],
    [`filter.${n}.smudge`, ""],
    [`filter.${n}.process`, ""],
    [`filter.${n}.required`, "false"],
  ]);
}
//@ chunk-8t9z960d.js:844-1382 placement
var GIT_TRACE_ENV_VARS = 1048576,
  C = 5000,
  fromEntries = Object.fromEntries(
    [
      "GIT_TRACE",
      "GIT_TRACE_SETUP",
      "GIT_TRACE_PACKET",
      "GIT_TRACE_PACKFILE",
      "GIT_TRACE_PACK_ACCESS",
      "GIT_TRACE_PERFORMANCE",
      "GIT_TRACE_SHALLOW",
      "GIT_TRACE_CURL",
      "GIT_TRACE_REFS",
      "GIT_TRACE_FSMONITOR",
      "GIT_TRACE_WORKING_TREE_ENCODING",
      "GIT_TRACE2",
      "GIT_TRACE2_EVENT",
      "GIT_TRACE2_PERF",
    ].map((e) => [e, "0"]),
  ),
  x8o =
    "if that setting is yours, move it to your global git config; if you don't recognize it, remove it from the repository's config, since a tool or checkout you don't trust may have written it";
//@ chunk-8t9z960d.js:1382-1911 placement
function describeGitConfigUnreadable(e) {
  switch (e.reason) {
    case "config_unreadable":
      return "git's configuration for the repository could not be read in full";
    case "conditional_include":
      return "the repository's own git config has a conditional include (includeIf), so what a spawn there would load cannot be determined";
    case "unsafe_key":
      return `the repository's own git config sets ${e.lfsKey === void 0 ? e.key : `${e.key}, an entry git-lfs reads as ${e.lfsKey}`}, which names a program git-lfs would run for any LFS path, on checkout and on status alike (${x8o})`;
  }
}
//@ chunk-8t9z960d.js:1911-2054 placement = readHeadAndTail (0.802)
var GIT_INCLUDEIF_PATH_PATTERN = /^includeif\..*\.path$/s,
  m = /lfs.customtransfer..+?.path|^lfs\.(?:.*\.)?standalonetransferagent$|^lfs\.extension\./su,
  w = { head: 60, tail: 40 };
//@ chunk-8t9z960d.js:2054-2090 placement
function summarizeGitConfigKeys(e) {
  return printableLabel(redactSshUserinfo(e), w);
}
/**
 * 生成覆盖仓库 filter 驱动的 -c 参数。
 */
//@ chunk-8t9z960d.js:2090-2353 placement
async function buildFilterNeutralizingArgs(e, n = {}) {
  let r = await listGitFilters(e, n);
  if (!r.ok) return r;
  let o = filterDriverNames(r.entries.map(([i]) => i));
  if (
    o.some(
      (i) =>
        i.includes("=") ||
        i.includes(`
`),
    )
  )
    return { ok: !1, reason: "filter_name_unrepresentable" };
  return { ok: !0, args: isFilterConfigKey(o).flatMap(([i, u]) => ["-c", `${i}=${u}`]) };
}
//@ chunk-8t9z960d.js:2353-2411 placement
function P8o(e, n) {
  return execFileNoThrowWithCwd(gitExe(), e, { ...n, stdin: "ignore" });
}
//@ chunk-8t9z960d.js:2411-2980 placement
async function listGitFilters(
  e,
  { repository: n = [], pin: r, envPins: o = {}, base: i, run: u = P8o } = {},
) {
  let s = {
      args: n,
      envPins: o,
      base: i,
      pin: n.length > 0 ? void 0 : (r ?? resolveGitDirsOrPlaceholder(e)),
      run: u,
    },
    t = await listGitConfig(e, "--local", s);
  if (t === null) return { ok: !1, reason: "config_unreadable" };
  let f = await listGitConfig(e, "--worktree", s);
  if (f === null) return { ok: !1, reason: "config_unreadable" };
  let d = [...t, ...f];
  for (let c of d) {
    let [a] = c;
    if (GIT_INCLUDEIF_PATH_PATTERN.test(Mwn(a))) return { ok: !1, reason: "conditional_include" };
    for (let l of uniq([a, ...gitConfigKeysOf(c)]))
      if (m.test(l) || m.test(Mwn(l)))
        return {
          ok: !1,
          reason: "unsafe_key",
          key: summarizeGitConfigKeys(a),
          ...(l === a ? {} : { lfsKey: summarizeGitConfigKeys(l) }),
        };
  }
  return { ok: !0, entries: d };
}
//@ chunk-8t9z960d.js:2980-3646 placement
async function readGitConfigScoped(
  e,
  n,
  {
    envPins: envPins,
    base: base,
    repository: repository,
    buildInvocation: buildInvocation = (s, { dir: dir, env: env }) => ({
      file: gitExe(),
      args: [...s],
      cwd: dir,
      env: env,
    }),
  },
) {
  let s = buildInvocation([...freeze, "config", "--includes", "--null", "--show-scope", "--get-regexp", n], {
      dir: e,
      env: getRemoteHostSessionCount(envPins, { base: base, repository: repository }),
    }),
    t = await execFileNoThrowWithCwd(s.file, s.args, {
      cwd: s.cwd,
      env: s.env,
      extendEnv: !1,
      timeout: C,
      preserveOutputOnError: !1,
      stdin: "ignore",
    });
  if (t.code !== 0)
    return (t.exitCode === 1 || t.exitCode === 129) && !t.timedOut && !t.maxBufferExceeded ? [] : null;
  let parts = t.stdout.split("\x00"),
    d = [];
  for (let c = 0; c + 1 < parts.length; c += 2) {
    let a = parts[c],
      l = parts[c + 1] ?? "",
      index = l.indexOf(`
`);
    if ((a === "system" || a === "global" || a === "command") && index !== -1)
      d.push([l.slice(0, index), l.slice(index + 1)]);
  }
  return d;
}
//@ chunk-8t9z960d.js:3646-4682 placement
async function listGitConfig(e, n, { args: args, envPins: envPins, base: base, pin: pin, run: run }) {
  let {
    code: code,
    stdout: stdout,
    stderr: stderr,
    maxBufferExceeded: maxBufferExceeded,
  } = await run([...args, ...freeze, "config", n, "--includes", "-z", "--list"], {
    cwd: e,
    env: getRemoteHostSessionCount({ ...envPins, ...fromEntries }, { repository: pin, base: base }),
    ...(base !== void 0 && { extendEnv: !1 }),
    timeout: C,
    maxBuffer: GIT_TRACE_ENV_VARS,
  });
  if (maxBufferExceeded === !0 || Buffer.byteLength(stdout) >= GIT_TRACE_ENV_VARS) return null;
  let replaced = stderr.replace(/\n+$/, ""),
    search = replaced.search(/^fatal: /m),
    g = search === -1 ? replaced : replaced.slice(search);
  if (
    code === 128 &&
    /^fatal: unable to read config file '[^\n]*config(?:\.worktree)?': No such file or directory$/.test(g)
  )
    return [];
  if (
    n === "--worktree" &&
    code === 128 &&
    /^fatal: --worktree cannot be used with multiple working trees unless the config\nextension worktreeConfig is enabled\. Please read "CONFIGURATION FILE"\nsection in "git help worktree" for details$/.test(
      g,
    )
  )
    return [];
  if (n === "--worktree" && code === 129 && /unknown option `worktree'/.test(stderr)) return [];
  if (code !== 0) return null;
  let mapped = stdout
    .split("\x00")
    .filter((p) => p !== "")
    .map((p) => {
      let index = p.indexOf(`
`);
      return index === -1 ? [p, null] : [p.slice(0, index), p.slice(index + 1)];
    });
  return mapped.some(([p]) => p.includes("\uFFFD")) ? null : mapped;
}
//@ chunk-8t9z960d.js:4682-4818 placement
function gitConfigKeysOf([e, n]) {
  return (n === null ? e : `${e}=${n}`)
    .split(
      `
`,
    )
    .flatMap((r) => {
      let index = r.indexOf("=");
      return index === -1 ? [] : [r.slice(0, index).trim()];
    });
}
//@ chunk-8t9z960d.js:4818-4865 placement
var qot = ["CHERRY_PICK_HEAD", "REVERT_HEAD"],
  k = 2;
/**
 * reftable 仓库中用 show-ref --exists 检查哪些 ref 存在。
 */
//@ chunk-8t9z960d.js:4865-5111 placement
async function findExistingRefs(e, n, r) {
  let o = new Set();
  if (n.length === 0 || !(await keepsRefsInReftable(e))) return o;
  let results = await Promise.all(n.map((s) => r(["show-ref", "--exists", s]))),
    u = !1;
  for (let [s, t] of results.entries())
    if (t === 0) o.add(n[s]);
    else if (t !== k) u = !0;
  return o.size === 0 && u ? null : o;
}

export {
  buildFilterNeutralizingArgs,
  findExistingRefs,
  qot,
  listGitFilters,
  describeGitConfigUnreadable,
  P8o,
  isFilterConfigKey,
  filterDriverNames,
  Mwn,
  summarizeGitConfigKeys,
  x8o,
  readGitConfigScoped,
  fromEntries,
};
