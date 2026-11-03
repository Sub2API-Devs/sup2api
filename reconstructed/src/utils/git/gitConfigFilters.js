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
import { GIT_SAFE_GLOBAL_ARGS } from "./gitSafeEnv.js";
import { getRemoteHostSessionCount } from "../../commands/insights.js";
import { keepsRefsInReftable } from "./gitFilesystem.js";

//@ chunk-8t9z960d.js:450-510 placement
var FILTER_DRIVER_CONFIG_KEY_RE = /^filter\.(.*)\.(?:clean|smudge|process|required)$/is;
//@ chunk-8t9z960d.js:510-590 placement
/**
 * 归一化用于比较的名字（NFKD 去重音、转小写）。
 */
function foldForCompare(e) {
  return e
    .normalize("NFKD")
    .replace(/\p{M}+/gu, "")
    .toLowerCase();
}
//@ chunk-8t9z960d.js:590-692 placement
/**
 * 从 filter.<名>.* 键中取驱动名。
 */
function filterDriverNames(e) {
  return uniq(
    Array.from(e).flatMap((n) => {
      let r = FILTER_DRIVER_CONFIG_KEY_RE.exec(n)?.[1];
      return r === undefined ? [] : [r];
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
/**
 * git trace 输出上限、超时，以及强制关闭的 GIT_TRACE* 环境变量表。
 */
var GIT_TRACE_ENV_VARS = 1048576;
var MAX_TRACE_OUTPUT_BYTES = 5000;
var R8o = Object.fromEntries(
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
);
var UNSAFE_CONFIG_HINT =
  "if that setting is yours, move it to your global git config; if you don't recognize it, remove it from the repository's config, since a tool or checkout you don't trust may have written it";
//@ chunk-8t9z960d.js:1382-1911 placement
function describeGitConfigUnreadable(e) {
  switch (e.reason) {
    case "config_unreadable":
      return "git's configuration for the repository could not be read in full";
    case "conditional_include":
      return "the repository's own git config has a conditional include (includeIf), so what a spawn there would load cannot be determined";
    case "unsafe_key":
      return `the repository's own git config sets ${e.lfsKey === undefined ? e.key : `${e.key}, an entry git-lfs reads as ${e.lfsKey}`}, which names a program git-lfs would run for any LFS path, on checkout and on status alike (${UNSAFE_CONFIG_HINT})`;
  }
}
//@ chunk-8t9z960d.js:1911-2054 placement = readHeadAndTail (0.802)
var GIT_INCLUDEIF_PATH_PATTERN = /^includeif\..*\.path$/s;
var INCLUDEIF_PATH_RE =
  /lfs.customtransfer..+?.path|^lfs\.(?:.*\.)?standalonetransferagent$|^lfs\.extension\./su;
var LABEL_HEAD_TAIL = {
  head: 60,
  tail: 40,
};
//@ chunk-8t9z960d.js:2054-2090 placement
function summarizeGitConfigKeys(e) {
  return printableLabel(redactSshUserinfo(e), LABEL_HEAD_TAIL);
}
//@ chunk-8t9z960d.js:2090-2353 placement
/**
 * 生成覆盖仓库 filter 驱动的 -c 参数。
 */
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
    return {
      ok: false,
      reason: "filter_name_unrepresentable",
    };
  return {
    ok: true,
    args: isFilterConfigKey(o).flatMap(([i, u]) => ["-c", `${i}=${u}`]),
  };
}
//@ chunk-8t9z960d.js:2353-2411 placement
/**
 * 运行 git（stdin 关闭）并返回结果。
 */
function runGitQuietStdin(e, n) {
  return execFileNoThrowWithCwd(gitExe(), e, {
    ...n,
    stdin: "ignore",
  });
}
//@ chunk-8t9z960d.js:2411-2980 placement
async function listGitFilters(
  cwd,
  { repository: n = [], pin: r, envPins: o = {}, base: i, run: u = runGitQuietStdin } = {},
) {
  let s = {
    args: n,
    envPins: o,
    base: i,
    pin: n.length > 0 ? undefined : (r ?? resolveGitDirsOrPlaceholder(cwd)),
    run: u,
  };
  let t = await listGitConfig(cwd, "--local", s);
  if (t === null)
    return {
      ok: false,
      reason: "config_unreadable",
    };
  let f = await listGitConfig(cwd, "--worktree", s);
  if (f === null)
    return {
      ok: false,
      reason: "config_unreadable",
    };
  let d = [...t, ...f];
  for (let c of d) {
    let [a] = c;
    if (GIT_INCLUDEIF_PATH_PATTERN.test(foldForCompare(a)))
      return {
        ok: false,
        reason: "conditional_include",
      };
    for (let l of uniq([a, ...gitConfigKeysOf(c)]))
      if (INCLUDEIF_PATH_RE.test(l) || INCLUDEIF_PATH_RE.test(foldForCompare(l)))
        return {
          ok: false,
          reason: "unsafe_key",
          key: summarizeGitConfigKeys(a),
          ...(l === a
            ? {}
            : {
                lfsKey: summarizeGitConfigKeys(l),
              }),
        };
  }
  return {
    ok: true,
    entries: d,
  };
}
//@ chunk-8t9z960d.js:2980-3646 placement
async function readGitConfigScoped(
  dir,
  n,
  {
    envPins,
    base,
    repository,
    buildInvocation = (s, { dir, env }) => ({
      file: gitExe(),
      args: [...s],
      cwd: dir,
      env,
    }),
  },
) {
  let invocation = buildInvocation(
    [...GIT_SAFE_GLOBAL_ARGS, "config", "--includes", "--null", "--show-scope", "--get-regexp", n],
    {
      dir,
      env: getRemoteHostSessionCount(envPins, {
        base,
        repository,
      }),
    },
  );
  let t = await execFileNoThrowWithCwd(invocation.file, invocation.args, {
    cwd: invocation.cwd,
    env: invocation.env,
    extendEnv: false,
    timeout: MAX_TRACE_OUTPUT_BYTES,
    preserveOutputOnError: false,
    stdin: "ignore",
  });
  if (t.code !== 0)
    return (t.exitCode === 1 || t.exitCode === 129) && !t.timedOut && !t.maxBufferExceeded ? [] : null;
  let parts = t.stdout.split("\x00");
  let d = [];
  for (let c = 0; c + 1 < parts.length; c += 2) {
    let a = parts[c];
    let l = parts[c + 1] ?? "";
    let index = l.indexOf(`
`);
    if ((a === "system" || a === "global" || a === "command") && index !== -1)
      d.push([l.slice(0, index), l.slice(index + 1)]);
  }
  return d;
}
//@ chunk-8t9z960d.js:3646-4682 placement
async function listGitConfig(cwd, n, { args, envPins, base, pin, run }) {
  let { code, stdout, stderr, maxBufferExceeded } = await run(
    [...args, ...GIT_SAFE_GLOBAL_ARGS, "config", n, "--includes", "-z", "--list"],
    {
      cwd,
      env: getRemoteHostSessionCount(
        {
          ...envPins,
          ...R8o,
        },
        {
          repository: pin,
          base,
        },
      ),
      ...(base !== undefined && {
        extendEnv: false,
      }),
      timeout: MAX_TRACE_OUTPUT_BYTES,
      maxBuffer: GIT_TRACE_ENV_VARS,
    },
  );
  if (maxBufferExceeded === true || Buffer.byteLength(stdout) >= GIT_TRACE_ENV_VARS) return null;
  let replaced = stderr.replace(/\n+$/, "");
  let l = replaced.search(/^fatal: /m);
  let g = l === -1 ? replaced : replaced.slice(l);
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
    .flatMap((line) => {
      let index = line.indexOf("=");
      return index === -1 ? [] : [line.slice(0, index).trim()];
    });
}
//@ chunk-8t9z960d.js:4818-4865 placement
/**
 * 序列器状态文件名（CHERRY_PICK_HEAD、REVERT_HEAD）与相关计数上限。
 */
var SEQUENCER_STATE_FILES = ["CHERRY_PICK_HEAD", "REVERT_HEAD"];
var SEQUENCER_STATE_COUNT = 2;
//@ chunk-8t9z960d.js:4865-5111 placement
/**
 * reftable 仓库中用 show-ref --exists 检查哪些 ref 存在。
 */
async function findExistingRefs(e, n, r) {
  let o = new Set();
  if (n.length === 0 || !(await keepsRefsInReftable(e))) return o;
  let results = await Promise.all(n.map((s) => r(["show-ref", "--exists", s])));
  let u = false;
  for (let [s, t] of results.entries())
    if (t === 0) o.add(n[s]);
    else if (t !== SEQUENCER_STATE_COUNT) u = true;
  return o.size === 0 && u ? null : o;
}
export {
  buildFilterNeutralizingArgs,
  findExistingRefs,
  SEQUENCER_STATE_FILES,
  listGitFilters,
  describeGitConfigUnreadable,
  runGitQuietStdin,
  isFilterConfigKey,
  filterDriverNames,
  foldForCompare,
  summarizeGitConfigKeys,
  UNSAFE_CONFIG_HINT,
  readGitConfigScoped,
  R8o,
};
