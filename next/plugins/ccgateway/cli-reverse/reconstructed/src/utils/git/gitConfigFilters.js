/**
 * utils/git/gitConfigFilters.ts
 *
 * git filter 配置与 trace 变量（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-c036pnbt.js (16)
 * attribution: placement 16
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { normalizeCaseForComparison_2 } from "../permissions/filesystem.js";
import { printableLabel } from "../printableName.js";
import { redactSshUserinfo } from "../redaction/urlRedaction.js";
import { execFileNoThrowWithCwd } from "../execFileNoThrow.js";
import { gitExe } from "../git.js";
import { resolveGitDirsOrPlaceholder } from "./gitDirResolution.js";
import { GIT_SAFE_GLOBAL_ARGS } from "./gitSafeEnv.js";
import { getRemoteHostSessionCount } from "../../commands/insights.js";
import { keepsRefsInReftable } from "./gitFilesystem.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-c036pnbt.js:450-510 placement
var FILTER_DRIVER_CONFIG_KEY_RE = /^filter\.(.*)\.(?:clean|smudge|process|required)$/is;
//@ chunk-c036pnbt.js:510-590 placement
/**
 * 归一化用于比较的名字（NFKD 去重音、转小写）。
 */
function foldForCompare(text) {
  return text
    .normalize("NFKD")
    .replace(/\p{M}+/gu, "")
    .toLowerCase();
}
//@ chunk-c036pnbt.js:590-692 placement
/**
 * 从 filter.<名>.* 键中取驱动名。
 */
function filterDriverNames(configKeys) {
  return normalizeCaseForComparison_2(
    Array.from(configKeys).flatMap((key) => {
      let driverName = FILTER_DRIVER_CONFIG_KEY_RE.exec(key)?.[1];
      return driverName === undefined ? [] : [driverName];
    }),
  );
}
//@ chunk-c036pnbt.js:692-844 placement
function isFilterConfigKey(driverNames) {
  return driverNames.flatMap((driverName) => [
    [`filter.${driverName}.clean`, ""],
    [`filter.${driverName}.smudge`, ""],
    [`filter.${driverName}.process`, ""],
    [`filter.${driverName}.required`, "false"],
  ]);
}
//@ chunk-c036pnbt.js:844-1382 placement
/**
 * git trace 输出上限、超时，以及强制关闭的 GIT_TRACE* 环境变量表。
 */
var GIT_TRACE_ENV_VARS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var MAX_TRACE_OUTPUT_BYTES;
var TRACE_ENV_VARS;
var UNSAFE_CONFIG_HINT;
deferInit("chunk-c036pnbt.js:844", () => {
  GIT_TRACE_ENV_VARS = 1048576;
  MAX_TRACE_OUTPUT_BYTES = 5000;
  TRACE_ENV_VARS = Object.fromEntries(
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
    ].map((varName) => [varName, "0"]),
  );
  UNSAFE_CONFIG_HINT =
    "if that setting is yours, move it to your global git config; if you don't recognize it, remove it from the repository's config, since a tool or checkout you don't trust may have written it";
});
//@ chunk-c036pnbt.js:1382-1911 placement
function describeGitConfigUnreadable(failure) {
  switch (failure.reason) {
    case "config_unreadable":
      return "git's configuration for the repository could not be read in full";
    case "conditional_include":
      return "the repository's own git config has a conditional include (includeIf), so what a spawn there would load cannot be determined";
    case "unsafe_key":
      return `the repository's own git config sets ${failure.lfsKey === undefined ? failure.key : `${failure.key}, an entry git-lfs reads as ${failure.lfsKey}`}, which names a program git-lfs would run for any LFS path, on checkout and on status alike (${UNSAFE_CONFIG_HINT})`;
  }
}
//@ chunk-c036pnbt.js:1911-2054 placement (2.1.88 match: readHeadAndTail, 0.802)
var GIT_INCLUDEIF_PATH_PATTERN = /^includeif\..*\.path$/s;
var INCLUDEIF_PATH_RE =
  /lfs.customtransfer..+?.path|^lfs\.(?:.*\.)?standalonetransferagent$|^lfs\.extension\./su;
var LABEL_HEAD_TAIL = {
  head: 60,
  tail: 40,
};
//@ chunk-c036pnbt.js:2054-2090 placement
function summarizeGitConfigKeys(value) {
  return printableLabel(redactSshUserinfo(value), LABEL_HEAD_TAIL);
}
//@ chunk-c036pnbt.js:2090-2353 placement
/**
 * 生成覆盖仓库 filter 驱动的 -c 参数。
 */
async function buildFilterNeutralizingArgs(cwd, options = {}) {
  let listing = await listGitFilters(cwd, options);
  if (!listing.ok) return listing;
  let driverNames = filterDriverNames(listing.entries.map(([key]) => key));
  if (
    driverNames.some(
      (driverName) =>
        driverName.includes("=") ||
        driverName.includes(`
`),
    )
  )
    return {
      ok: false,
      reason: "filter_name_unrepresentable",
    };
  return {
    ok: true,
    args: isFilterConfigKey(driverNames).flatMap(([key, value]) => ["-c", `${key}=${value}`]),
  };
}
//@ chunk-c036pnbt.js:2353-2411 placement
/**
 * 运行 git（stdin 关闭）并返回结果。
 */
function runGitQuietStdin(args, execOptions) {
  return execFileNoThrowWithCwd(gitExe(), args, {
    ...execOptions,
    stdin: "ignore",
  });
}
//@ chunk-c036pnbt.js:2411-2980 placement
async function listGitFilters(
  cwd,
  { repository = [], pin, envPins = {}, base, run = runGitQuietStdin } = {},
) {
  let scopedOptions = {
    args: repository,
    envPins,
    base,
    pin: repository.length > 0 ? undefined : (pin ?? resolveGitDirsOrPlaceholder(cwd)),
    run,
  };
  let localEntries = await listGitConfig(cwd, "--local", scopedOptions);
  if (localEntries === null)
    return {
      ok: false,
      reason: "config_unreadable",
    };
  let worktreeEntries = await listGitConfig(cwd, "--worktree", scopedOptions);
  if (worktreeEntries === null)
    return {
      ok: false,
      reason: "config_unreadable",
    };
  let entries = [...localEntries, ...worktreeEntries];
  for (let entry of entries) {
    let [key] = entry;
    if (GIT_INCLUDEIF_PATH_PATTERN.test(foldForCompare(key)))
      return {
        ok: false,
        reason: "conditional_include",
      };
    for (let keyCandidate of normalizeCaseForComparison_2([key, ...gitConfigKeysOf(entry)]))
      if (INCLUDEIF_PATH_RE.test(keyCandidate) || INCLUDEIF_PATH_RE.test(foldForCompare(keyCandidate)))
        return {
          ok: false,
          reason: "unsafe_key",
          key: summarizeGitConfigKeys(key),
          ...(keyCandidate === key
            ? {}
            : {
                lfsKey: summarizeGitConfigKeys(keyCandidate),
              }),
        };
  }
  return {
    ok: true,
    entries,
  };
}
//@ chunk-c036pnbt.js:2980-3646 placement
async function readGitConfigScoped(
  dir,
  keyPattern,
  {
    envPins,
    base,
    repository,
    buildInvocation = (args, { dir, env }) => ({
      file: gitExe(),
      args: [...args],
      cwd: dir,
      env,
    }),
  },
) {
  let invocation = buildInvocation(
    [...GIT_SAFE_GLOBAL_ARGS, "config", "--includes", "--null", "--show-scope", "--get-regexp", keyPattern],
    {
      dir,
      env: getRemoteHostSessionCount(envPins, {
        base,
        repository,
      }),
    },
  );
  let result = await execFileNoThrowWithCwd(invocation.file, invocation.args, {
    cwd: invocation.cwd,
    env: invocation.env,
    extendEnv: false,
    timeout: MAX_TRACE_OUTPUT_BYTES,
    preserveOutputOnError: false,
    stdin: "ignore",
  });
  if (result.code !== 0)
    return (result.exitCode === 1 || result.exitCode === 129) && !result.timedOut && !result.maxBufferExceeded
      ? []
      : null;
  let parts = result.stdout.split("\x00");
  let pairs = [];
  for (let index = 0; index + 1 < parts.length; index += 2) {
    let scope = parts[index];
    let keyAndValue = parts[index + 1] ?? "";
    let index_2 = keyAndValue.indexOf(`
`);
    if ((scope === "system" || scope === "global" || scope === "command") && index_2 !== -1)
      pairs.push([keyAndValue.slice(0, index_2), keyAndValue.slice(index_2 + 1)]);
  }
  return pairs;
}
//@ chunk-c036pnbt.js:3646-4682 placement
async function listGitConfig(cwd, scope, { args, envPins, base, pin, run }) {
  let { code, stdout, stderr, maxBufferExceeded } = await run(
    [...args, ...GIT_SAFE_GLOBAL_ARGS, "config", scope, "--includes", "-z", "--list"],
    {
      cwd,
      env: getRemoteHostSessionCount(
        {
          ...envPins,
          ...TRACE_ENV_VARS,
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
  let fatalIndex = replaced.search(/^fatal: /m);
  let fatalText = fatalIndex === -1 ? replaced : replaced.slice(fatalIndex);
  if (
    code === 128 &&
    /^fatal: unable to read config file '[^\n]*config(?:\.worktree)?': No such file or directory$/.test(
      fatalText,
    )
  )
    return [];
  if (
    scope === "--worktree" &&
    code === 128 &&
    /^fatal: --worktree cannot be used with multiple working trees unless the config\nextension worktreeConfig is enabled\. Please read "CONFIGURATION FILE"\nsection in "git help worktree" for details$/.test(
      fatalText,
    )
  )
    return [];
  if (scope === "--worktree" && code === 129 && /unknown option `worktree'/.test(stderr)) return [];
  if (code !== 0) return null;
  let mapped = stdout
    .split("\x00")
    .filter((line) => line !== "")
    .map((line) => {
      let index = line.indexOf(`
`);
      return index === -1 ? [line, null] : [line.slice(0, index), line.slice(index + 1)];
    });
  return mapped.some(([key]) => key.includes("\uFFFD")) ? null : mapped;
}
//@ chunk-c036pnbt.js:4682-4818 placement
function gitConfigKeysOf([key, value]) {
  return (value === null ? key : `${key}=${value}`)
    .split(
      `
`,
    )
    .flatMap((line) => {
      let index = line.indexOf("=");
      return index === -1 ? [] : [line.slice(0, index).trim()];
    });
}
//@ chunk-c036pnbt.js:4818-4865 placement
/**
 * 序列器状态文件名（CHERRY_PICK_HEAD、REVERT_HEAD）与相关计数上限。
 */
var SEQUENCER_STATE_FILES = ["CHERRY_PICK_HEAD", "REVERT_HEAD"];
var SEQUENCER_STATE_COUNT = 2;
//@ chunk-c036pnbt.js:4865-5111 placement
/**
 * reftable 仓库中用 show-ref --exists 检查哪些 ref 存在。
 */
async function findExistingRefs(cwd, refNames, runGit) {
  let found = new Set();
  if (refNames.length === 0 || !(await keepsRefsInReftable(cwd))) return found;
  let results = await Promise.all(refNames.map((refName) => runGit(["show-ref", "--exists", refName])));
  let anyFailed = false;
  for (let [index, exitCode] of results.entries())
    if (exitCode === 0) found.add(refNames[index]);
    else if (exitCode !== SEQUENCER_STATE_COUNT) anyFailed = true;
  return found.size === 0 && anyFailed ? null : found;
}
export {
  listGitFilters,
  describeGitConfigUnreadable,
  runGitQuietStdin,
  isFilterConfigKey,
  filterDriverNames,
  foldForCompare,
  summarizeGitConfigKeys,
  UNSAFE_CONFIG_HINT,
  readGitConfigScoped,
  findExistingRefs,
  SEQUENCER_STATE_FILES,
  buildFilterNeutralizingArgs,
  TRACE_ENV_VARS,
};
