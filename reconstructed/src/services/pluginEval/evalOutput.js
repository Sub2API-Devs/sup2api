/**
 * services/pluginEval/evalOutput.ts
 *
 * 2.1.316 新增：plugin eval 输出位置（--output 基目录安全检查）与模拟录制的落盘
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-qchp9vrd.js (19)
 * attribution: placement 19
 */
import path, {
  default as path_2,
  default as path_3,
  default as path_4,
  default as path_5,
  default as path_6,
  default as path_7,
  default as path_8,
  default as path_9,
  default as path_10,
  default as path_11,
  default as path_12,
  default as path_13,
  default as path_14,
  default as path_15,
  default as path_16,
  default as path_17,
  default as path_18,
} from "path";
import {
  realpath,
  realpath as realpath_2,
  realpath as realpath_3,
  realpath as realpath_4,
  realpath as realpath_5,
  realpath as realpath_6,
  realpath as realpath_7,
  realpath as realpath_8,
  realpath as realpath_9,
  mkdir,
  mkdir as mkdir_2,
  mkdir as mkdir_3,
  mkdir as mkdir_4,
  mkdir as mkdir_5,
  lstat,
  lstat as lstat_2,
  lstat as lstat_3,
  lstat as lstat_4,
  lstat as lstat_5,
  lstat as lstat_6,
  lstat as lstat_7,
  lstat as lstat_8,
  lstat as lstat_9,
  lstat as lstat_10,
  lstat as lstat_11,
  lstat as lstat_12,
  rmdir,
  rmdir as rmdir_2,
  rm as rm_2,
  rm as rm_2_2,
  rm as rm_3,
  rm as rm_4,
  rm as rm_5,
  readdir,
  readdir as readdir_2,
  readdir as readdir_3,
  readdir as readdir_4,
  readdir as readdir_5,
  readdir as readdir_6,
  readdir as readdir_7,
  readdir as readdir_8,
  readdir as readdir_9,
  readdir as readdir_10,
} from "fs/promises";
import {
  createHash,
  createHash as createHash_2,
  createHash as createHash_3,
  createHash as createHash_4,
} from "crypto";
import { getCwd } from "../../utils/cwd.js";
import { checkRepoAuthoredPath } from "../../cli/handlers/pluginEval/mockGuards.js";
import { Fa, openRegularFileSafely, getFileIdentity } from "./safeFiles.js";
import {
  realpathKeepingPromptFile,
  isMagicDocsPromptFile,
  Cr,
  Ar,
  findNearestSkillFolder,
  getCachedPluginDirVerdict,
  resolveParentPluginDir,
  checkWritableByOthers,
  ft,
} from "./caseDiscovery.js";
import {
  isFsInaccessible,
  errorMessage,
  getErrnoCode,
  isENOENT,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
} from "../../utils/errors.js";
import { logForDebugging } from "../../utils/debug.js";
import { escapeNonAscii } from "../../utils/resultError.js";
import { PLUGIN_ROOT_MARKERS } from "../../utils/plugins/commandSource.js";
import { toEvalPathError, hr, Cn, isFromEvalDirFlag } from "./evalDir.js";
import { getPlatform } from "../../utils/platform.js";
import { shellQuoteArgs } from "../../utils/bash/bashPipeCommand.js";
import { MOCK_RECORDINGS } from "./mocks/pluginMcpEnumeration.js";
import { plural } from "../../utils/stringUtils.js";
import { getFileKind } from "../../utils/fileKind.js";
import { Jo } from "./mocks/mockRecordings.js";
import { openNoFollow_2 } from "../../utils/fsSafety/hardenedRead.js";
import { stripControlChars } from "../../utils/settings/writeQueues.js";

//@ chunk-qchp9vrd.js:311651-312869 placement
async function resolveEvalTargetPlugin(e, n, r, a) {
  let resolved = path_2.resolve(getCwd(), e);
  await (n === void 0 ? checkRepoAuthoredPath(getCwd(), e, "target") : Fa(e, a));
  try {
    resolved = await realpathKeepingPromptFile(resolved);
  } catch (error) {
    if (!isFsInaccessible(error))
      logForDebugging(
        `plugin eval: could not resolve ${escapeNonAscii(resolved)} to find its plugin: ${errorMessage(error)}`,
        { level: "warn" },
      );
    return {
      targetDir: resolved,
      targetIsCaseFile: !n && isMagicDocsPromptFile(path_2.basename(resolved)),
      pluginRoot: n ? resolved : null,
      untrustedManifestDir: null,
      targetResolved: !1,
      enclosingVerdict: null,
    };
  }
  if (n)
    return {
      targetDir: resolved,
      targetIsCaseFile: !1,
      pluginRoot: resolved,
      untrustedManifestDir: null,
      targetResolved: !0,
      enclosingVerdict: null,
    };
  let h = isMagicDocsPromptFile(path_2.basename(resolved)),
    w = h ? path_2.dirname(resolved) : resolved;
  if (!h) r.consentRoot ??= w;
  let b = await Cr(w, r),
    resolved_2 = path_2.resolve(await Ar(r), e),
    R = h ? path_2.dirname(resolved_2) : resolved_2,
    S = null;
  if (R !== w) {
    let N = await findNearestSkillFolder(R, await Cr(R, r), r, Number.POSITIVE_INFINITY);
    if (N !== null) S = await realpath(N).catch(() => N);
  }
  S ??= await findNearestSkillFolder(w, b, r, Number.POSITIVE_INFINITY);
  let T = S !== null && (await getCachedPluginDirVerdict(S, r, "core"));
  if (S === null && h) {
    let N = await resolveParentPluginDir(w, r, "tree", b);
    return {
      targetDir: w,
      targetIsCaseFile: h,
      pluginRoot: N.adopted,
      untrustedManifestDir: N.refused,
      targetResolved: !0,
      enclosingVerdict: { adopted: null, refused: null, namedOnly: N.namedOnly },
    };
  }
  return {
    targetDir: w,
    targetIsCaseFile: h,
    pluginRoot: T ? S : null,
    untrustedManifestDir: S !== null && !T ? S : null,
    targetResolved: !0,
    enclosingVerdict: S === null ? await resolveParentPluginDir(w, r, "core") : null,
  };
}
//@ chunk-qchp9vrd.js:312869-312946 placement
class EscapesBaseError extends Error {
  constructor(e) {
    super(e);
    this.name = "EscapesBaseError";
  }
}
//@ chunk-qchp9vrd.js:312946-313584 placement
async function ensureOutputBase(
  e,
  n,
  r,
  { vetOwnership: a = null, create: s = !0, absentEndsChain: h = !1 } = {},
) {
  if (s) await mkdir(e, { recursive: !0 });
  let w = await lstat(e);
  if (w.isSymbolicLink())
    throw new EscapesBaseError(`output base ${e} is a symlink \u2014 refusing to write beneath it`);
  if (a !== null) {
    let R = await checkWritableByOthers(w, e, a, e);
    if (R)
      throw new EscapesBaseError(
        `output base ${e} ${R.message} \u2014 refusing to write beneath a directory you did not name (pass --output-dir, or name the directory itself as the target)`,
      );
  }
  let b = await realpath(e).catch(() => {
      return;
    }),
    y = e;
  for (let R of n) {
    if (((y = path_2.join(y, R)), s))
      try {
        (await mkdir(y, { mode: 493 }), r.push(y));
      } catch (error) {
        if (getErrnoCode(error) !== "EEXIST") throw error;
      }
    if (!(await checkOutputLocation(y, e, b, a, !s && h))) return;
  }
}
/**
 * 从深到浅删除空目录，遇到无法删除的目录即停止。
 */
//@ chunk-qchp9vrd.js:313584-313698 placement
async function removeEmptyDirs(e) {
  for (let n = e.length - 1; n >= 0; n--) {
    let r = e[n];
    try {
      await rmdir(r);
    } catch (error) {
      if (isENOENT(error)) continue;
      return;
    }
  }
}
//@ chunk-qchp9vrd.js:313698-314073 placement
async function checkOutputLocation(e, n, r, a, s = !1) {
  let h;
  try {
    let w = await lstat(e);
    h = w.isSymbolicLink()
      ? "is a symlink"
      : !w.isDirectory()
        ? "is not a directory"
        : a === null
          ? void 0
          : (await checkWritableByOthers(w, e, a, n))?.message;
  } catch (error) {
    if (s && isENOENT(error)) return !1;
    h = `could not be examined (${errorMessage(error)})`;
  }
  if (h !== void 0) throw new EscapesBaseError(`output location ${e} ${h} \u2014 refusing to write there`);
  return (await checkInsideOutputBase(e, n, "output location", r), !0);
}
/**
 * 判断目录中是否存在插件组件（.claude-plugin 以外的组件目录或文件）。
 */
//@ chunk-qchp9vrd.js:314073-314212 placement
async function hasPluginComponents(e) {
  for (let n of PLUGIN_ROOT_MARKERS) {
    if (n === ".claude-plugin") continue;
    if ((await lstat(path_2.join(e, n)).catch(() => null)) !== null) return !0;
  }
  return !1;
}
//@ chunk-qchp9vrd.js:314212-314510 placement
async function checkInsideOutputBase(e, n, r, a) {
  let s, h;
  try {
    [s, h] = await Promise.all([realpath(e), a ?? realpath(n)]);
  } catch (error) {
    throw new EscapesBaseError(
      `${r} ${e} could not be resolved (${errorMessage(error)}) \u2014 refusing to write there`,
    );
  }
  if (!ft(s, h))
    throw new EscapesBaseError(
      `${r} ${e} resolves to ${s}, outside ${h} \u2014 refusing to write there (is it a symlink?)`,
    );
}
//@ chunk-qchp9vrd.js:314510-315130 placement
async function resolveEvalDirSource(e, n) {
  if (n.source === "default") return n;
  let r;
  try {
    (await checkRepoAuthoredPath(
      e,
      n.segments.join(path_2.sep),
      n.source === "flag" ? "--eval-dir" : "the manifest's experimental.evals",
    ),
      (r = await realpath(path_2.join(e, ...n.segments))));
  } catch (error) {
    if (error instanceof TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS) throw error;
    return n;
  }
  let relativePath = path_2.relative(e, r),
    parts = relativePath.split(path_2.sep);
  if (
    !toEvalPathError(e, r) ||
    parts.length !== n.segments.length ||
    parts.some((w, b) => w.toLowerCase() !== n.segments[b].toLowerCase())
  )
    return n;
  if (relativePath === n.segments.join(path_2.sep)) return n;
  let h = e;
  for (let segment of n.segments) {
    h = path_2.join(h, segment);
    try {
      if ((await lstat(h)).isSymbolicLink()) return n;
    } catch {
      return n;
    }
  }
  if (parts.some((w) => hr.has(w))) return n;
  return { ...n, dir: relativePath, segments: parts };
}
//@ chunk-qchp9vrd.js:315130-315435 placement
function describeEvalDirScanScope(e, n, r) {
  let a = Fg(toDisplayRelativePath(n));
  return a === null
    ? `Only ${e} was scanned; run claude plugin eval against the plugin directory ${n}${r.source === "flag" ? ` (with --eval-dir ${Cn(r)})` : ""} to scan the whole plugin.
`
    : `Only ${e} was scanned; run \`claude plugin eval ${a}${isFromEvalDirFlag(r)}\` to scan the whole plugin.
`;
}
//@ chunk-qchp9vrd.js:315435-315529 placement
function Fg(e) {
  if (getPlatform() !== "windows") return shellQuoteArgs([e]);
  return /^[A-Za-z0-9_./:\\-]+$/.test(e) ? e : null;
}
//@ chunk-qchp9vrd.js:315529-315734 placement
function toDisplayRelativePath(e) {
  let relativePath = path_2.relative(getCwd(), e);
  if (relativePath === "") return ".";
  if (path_2.isAbsolute(relativePath)) return relativePath;
  let r = getPlatform() === "windows" ? relativePath.replaceAll("\\", "/") : relativePath;
  return r === ".." || r.startsWith("./") || r.startsWith("../") ? r : `./${r}`;
}
/**
 * 计算评测输出目录重叠检查要使用的根目录集合。
 */
//@ chunk-qchp9vrd.js:315734-316025 placement
function resolveOverlapRoots(e) {
  let {
    scopeDir: scopeDir,
    scopeIsNamedDirectory: scopeIsNamedDirectory,
    trustedRoot: trustedRoot,
    otherManifestDir: otherManifestDir,
    adoptedAbove: adoptedAbove,
  } = e;
  return {
    pluginRoot: trustedRoot,
    overlapRoot: trustedRoot ?? otherManifestDir ?? scopeDir,
    overlapBase:
      trustedRoot === null && otherManifestDir !== null && ft(scopeDir, otherManifestDir)
        ? path_2.relative(otherManifestDir, scopeDir).split(path_2.sep).filter(Boolean)
        : [],
    overlapAdvisory:
      trustedRoot === null &&
      otherManifestDir !== null &&
      !(scopeIsNamedDirectory && otherManifestDir === scopeDir) &&
      otherManifestDir !== adoptedAbove,
  };
}
/**
 * 描述评测目录的来源：--eval-dir、manifest（提示可覆盖）或默认值。
 */
//@ chunk-qchp9vrd.js:316025-316206 placement
function describeEvalDirSource(e) {
  switch (e.source) {
    case "flag":
      return "from --eval-dir";
    case "manifest":
      return `from ${escapeNonAscii(e.manifestPath)}; pass --eval-dir to override`;
    case "default":
      return "the default";
  }
}
/**
 * 把本次运行的模拟录制写到输出目录（只覆盖本运行写的文件）。
 */
//@ chunk-qchp9vrd.js:316206-318414 placement
async function writeMockRecordings(e, n, r) {
  let joined = path_2.join(e, MOCK_RECORDINGS);
  if (
    (await checkRepoAuthoredPath(e, MOCK_RECORDINGS, "mock recordings"),
    !n.cases.some((b) =>
      [...b.runs, ...(b.runs_without ?? [])].some(
        (y) => y.mocks !== void 0 && y.mocks.servers.some((server) => server.withheld !== !0),
      ),
    ))
  ) {
    try {
      await lstat(joined);
    } catch (error) {
      if (isENOENT(error)) return;
      throw error;
    }
    throw new EscapesBaseError(
      `${escapeNonAscii(joined)} was not written by this run (it served no mocks) \u2014 nothing there is to be adopted`,
    );
  }
  let h = new Map();
  for (let b of n.cases.flatMap((y) => [...y.runs, ...(y.runs_without ?? [])])) {
    let y = new Set();
    for (let R of b.mockRecordings ?? []) {
      if (y.has(R.server)) continue;
      let joined = path_2.join(MOCK_RECORDINGS, R.server, R.file),
        T = h.get(joined);
      if (T === void 0) h.set(joined, { rec: R, adoptDirs: new Set([R.adoptDir]) });
      else if (T.rec.answerHash === R.answerHash) T.adoptDirs.add(R.adoptDir);
      else y.add(R.server);
    }
  }
  if (!r && (await writeAdoptInstructions(joined))) await rm_2(joined, { recursive: !0, force: !0 });
  try {
    await mkdir(joined, { mode: 493 });
  } catch (error) {
    if (getErrnoCode(error) === "EEXIST")
      throw new EscapesBaseError(
        `${joined} already exists and was not written by this run \u2014 nothing there is to be adopted; remove it and rerun`,
      );
    throw error;
  }
  if (h.size === 0) {
    await rmdir(joined);
    return;
  }
  let flattened = [...h].flatMap(([b, { rec: y, adoptDirs: R }]) => [
    `${escapeNonAscii(path_2.join(e, b))}  sha256=${createHash("sha256").update(y.json).digest("hex")}`,
    ...[...R].map((S) => `    -> ${escapeNonAscii(`${S}${path_2.sep}`)}`),
  ]);
  try {
    let b = new Set();
    for (let [R, { rec: S }] of h) {
      if (!b.has(S.server)) (await ensureOutputBase(e, [MOCK_RECORDINGS, S.server], []), b.add(S.server));
      await writeOutputFile(path_2.join(e, R), S.json, !0);
    }
    let y = new Map([[joined, new Set(b)]]);
    for (let [R, { rec: S }] of h) {
      let joined_2 = path_2.join(joined, S.server),
        N = y.get(joined_2) ?? new Set();
      (N.add(path_2.basename(R)), y.set(joined_2, N));
    }
    for (let [R, S] of y) {
      if (!(await lstat(R)).isDirectory())
        throw new EscapesBaseError(
          `${escapeNonAscii(R)} is no longer the directory this run created \u2014 something else is writing into ${escapeNonAscii(joined)}`,
        );
      for (let T of await readdir(R))
        if (!S.has(T))
          throw new EscapesBaseError(
            `${escapeNonAscii(path_2.join(R, T))} was not written by this run \u2014 something else is writing into ${escapeNonAscii(joined)}`,
          );
    }
    for (let [R, { rec: S }] of h)
      if (!(await fileHasExactContent(path_2.join(e, R), S.json)))
        throw new EscapesBaseError(
          `${escapeNonAscii(path_2.join(e, R))} no longer holds what this run wrote \u2014 something else is writing into ${escapeNonAscii(joined)}`,
        );
    await writeOutputFile(
      path_2.join(joined, "ADOPT.txt"),
      `${MOCK_RECORDING_REPLAY_HINT}

${flattened.join(`
`)}
`,
      !0,
    );
  } catch (error) {
    throw (await rm_2(joined, { recursive: !0, force: !0 }).catch(() => {}), error);
  }
  ze(
    `${h.size} new agent-mock ${plural(h.size, "recording")} under ${joined} (listed in ADOPT.txt there). ${MOCK_RECORDING_REPLAY_HINT}`,
  );
  for (let b of flattened) ze(`  ${b}`);
}
//@ chunk-qchp9vrd.js:318414-318742 placement
var MOCK_RECORDING_REPLAY_HINT =
  "To replay one on later runs (no model call), copy the file into the .replay/ directory shown after it - the one beside the mock that produced it. Each line carries the sha256 of the file as written; check the copy you take against the hash printed to the terminal (this file sits where the workload could still write):";
//@ chunk-qchp9vrd.js:318742-319140 placement
async function writeAdoptInstructions(e) {
  try {
    if (!(await lstat(e)).isDirectory()) return !1;
  } catch (error) {
    if (isENOENT(error)) return !1;
    throw error;
  }
  let n = await readdir(e, { withFileTypes: !0 });
  for (let r of n) {
    let joined = path_2.join(e, r.name),
      s = await getFileKind(r, joined, "other");
    if (r.name === "ADOPT.txt" && s === "file") continue;
    if (s !== "dir") return !1;
    for (let h of await readdir(joined, { withFileTypes: !0 }))
      if (!Jo.test(h.name) || (await getFileKind(h, path_2.join(joined, h.name), "other")) !== "file")
        return !1;
  }
  return !0;
}
//@ chunk-qchp9vrd.js:319140-319364 placement
async function fileHasExactContent(e, n) {
  let r = await openNoFollow_2(e);
  if (!r.ok) return !1;
  try {
    let stats = await r.value.stat(),
      buffer = Buffer.from(n);
    if (!stats.isFile() || stats.size !== buffer.length) return !1;
    return (await r.value.readFile()).equals(buffer);
  } finally {
    await r.value.close();
  }
}
//@ chunk-qchp9vrd.js:319364-319722 placement
async function writeOutputFile(e, n, r) {
  let a = await openRegularFileSafely(e, r ? "create" : "write", "output file");
  try {
    if (r) await a.handle.writeFile(n);
    else {
      await a.handle.truncate(0);
      let buffer = Buffer.from(n),
        h = 0;
      while (h < buffer.length) h += (await a.handle.write(buffer, h, buffer.length - h, h)).bytesWritten;
    }
    await a.handle.close();
  } catch (error) {
    if ((await a.handle.close().catch(() => {}), a.created)) await getFileIdentity(e, a.identity);
    throw error;
  }
}
//@ chunk-qchp9vrd.js:319722-319769 placement
function ze(e) {
  process.stderr.write(
    stripControlChars(e) +
      `
`,
  );
}

export {
  resolveEvalTargetPlugin,
  ze,
  resolveOverlapRoots,
  resolveEvalDirSource,
  describeEvalDirSource,
  describeEvalDirScanScope,
  ensureOutputBase,
  EscapesBaseError,
  writeOutputFile,
  writeMockRecordings,
  removeEmptyDirs,
  hasPluginComponents,
};
