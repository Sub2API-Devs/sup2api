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
import path from "path";
import { realpath, mkdir, lstat, rmdir, rm as rm_2, readdir } from "fs/promises";
import { createHash } from "crypto";
import { getCwd } from "../../utils/cwd.js";
import { checkRepoAuthoredPath } from "../../cli/handlers/pluginEval/mockGuards.js";
import { checkRepoAuthoredPathFromCwd, openRegularFileSafely, getFileIdentity } from "./safeFiles.js";
import {
  realpathKeepingPromptFile,
  isMagicDocsPromptFile,
  resolveTargetWithin,
  realCwd,
  findNearestSkillFolder,
  getCachedPluginDirVerdict,
  resolveParentPluginDir,
  checkWritableByOthers,
  isSameOrInside,
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
import { toEvalPathError, SKIPPED_SUBDIR_NAMES, displayDir, isFromEvalDirFlag } from "./evalDir.js";
import { getPlatform } from "../../utils/platform.js";
import { shellQuoteArgs } from "../../utils/bash/bashPipeCommand.js";
import { MOCK_RECORDINGS } from "./mocks/pluginMcpEnumeration.js";
import { plural } from "../../utils/stringUtils.js";
import { getFileKind } from "../../utils/fileKind.js";
import { RECORDING_FILE_RE } from "./mocks/mockRecordings.js";
import { openNoFollow_2 } from "../../utils/fsSafety/hardenedRead.js";
import { stripControlChars } from "../../utils/settings/writeQueues.js";

//@ chunk-qchp9vrd.js:311651-312869 placement
async function resolveEvalTargetPlugin(e, n, r, a) {
  let resolved = path.resolve(getCwd(), e);
  await (n === undefined ? checkRepoAuthoredPath(getCwd(), e, "target") : checkRepoAuthoredPathFromCwd(e, a));
  try {
    resolved = await realpathKeepingPromptFile(resolved);
  } catch (error) {
    if (!isFsInaccessible(error))
      logForDebugging(
        `plugin eval: could not resolve ${escapeNonAscii(resolved)} to find its plugin: ${errorMessage(error)}`,
        {
          level: "warn",
        },
      );
    return {
      targetDir: resolved,
      targetIsCaseFile: !n && isMagicDocsPromptFile(path.basename(resolved)),
      pluginRoot: n ? resolved : null,
      untrustedManifestDir: null,
      targetResolved: false,
      enclosingVerdict: null,
    };
  }
  if (n)
    return {
      targetDir: resolved,
      targetIsCaseFile: false,
      pluginRoot: resolved,
      untrustedManifestDir: null,
      targetResolved: true,
      enclosingVerdict: null,
    };
  let h = isMagicDocsPromptFile(path.basename(resolved));
  let w = h ? path.dirname(resolved) : resolved;
  if (!h) r.consentRoot ??= w;
  let targetWithin = await resolveTargetWithin(w, r);
  let resolved_2 = path.resolve(await realCwd(r), e);
  let R = h ? path.dirname(resolved_2) : resolved_2;
  let S = null;
  if (R !== w) {
    let nearestSkillFolder = await findNearestSkillFolder(
      R,
      await resolveTargetWithin(R, r),
      r,
      Number.POSITIVE_INFINITY,
    );
    if (nearestSkillFolder !== null) S = await realpath(nearestSkillFolder).catch(() => nearestSkillFolder);
  }
  S ??= await findNearestSkillFolder(w, targetWithin, r, Number.POSITIVE_INFINITY);
  let T = S !== null && (await getCachedPluginDirVerdict(S, r, "core"));
  if (S === null && h) {
    let parentPluginDir = await resolveParentPluginDir(w, r, "tree", targetWithin);
    return {
      targetDir: w,
      targetIsCaseFile: h,
      pluginRoot: parentPluginDir.adopted,
      untrustedManifestDir: parentPluginDir.refused,
      targetResolved: true,
      enclosingVerdict: {
        adopted: null,
        refused: null,
        namedOnly: parentPluginDir.namedOnly,
      },
    };
  }
  return {
    targetDir: w,
    targetIsCaseFile: h,
    pluginRoot: T ? S : null,
    untrustedManifestDir: S !== null && !T ? S : null,
    targetResolved: true,
    enclosingVerdict: S === null ? await resolveParentPluginDir(w, r, "core") : null,
  };
}
//@ chunk-qchp9vrd.js:312869-312946 placement
class EscapesBaseError extends Error {
  constructor(message) {
    super(message);
    this.name = "EscapesBaseError";
  }
}
//@ chunk-qchp9vrd.js:312946-313584 placement
async function ensureOutputBase(
  e,
  segments,
  r,
  { vetOwnership: a = null, create: s = true, absentEndsChain: h = false } = {},
) {
  if (s)
    await mkdir(e, {
      recursive: true,
    });
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
  });
  let y = e;
  for (let R of segments) {
    y = path.join(y, R);
    if (s)
      try {
        await mkdir(y, {
          mode: 493,
        });
        r.push(y);
      } catch (error) {
        if (getErrnoCode(error) !== "EEXIST") throw error;
      }
    if (!(await checkOutputLocation(y, e, b, a, !s && h))) return;
  }
}
//@ chunk-qchp9vrd.js:313584-313698 placement
/**
 * 从深到浅删除空目录，遇到无法删除的目录即停止。
 */
async function removeEmptyDirs(e) {
  for (let j = e.length - 1; j >= 0; j--) {
    let r = e[j];
    try {
      await rmdir(r);
    } catch (error) {
      if (isENOENT(error)) continue;
      return;
    }
  }
}
//@ chunk-qchp9vrd.js:313698-314073 placement
async function checkOutputLocation(e, n, r, a, s = false) {
  let h;
  try {
    let w = await lstat(e);
    h = w.isSymbolicLink()
      ? "is a symlink"
      : !w.isDirectory()
        ? "is not a directory"
        : a === null
          ? undefined
          : (await checkWritableByOthers(w, e, a, n))?.message;
  } catch (error) {
    if (s && isENOENT(error)) return false;
    h = `could not be examined (${errorMessage(error)})`;
  }
  if (h !== undefined) throw new EscapesBaseError(`output location ${e} ${h} \u2014 refusing to write there`);
  await checkInsideOutputBase(e, n, "output location", r);
  return true;
}
//@ chunk-qchp9vrd.js:314073-314212 placement
/**
 * 判断目录中是否存在插件组件（.claude-plugin 以外的组件目录或文件）。
 */
async function hasPluginComponents(e) {
  for (let n of PLUGIN_ROOT_MARKERS) {
    if (n === ".claude-plugin") continue;
    if ((await lstat(path.join(e, n)).catch(() => null)) !== null) return true;
  }
  return false;
}
//@ chunk-qchp9vrd.js:314212-314510 placement
async function checkInsideOutputBase(e, n, r, a) {
  let s;
  let h;
  try {
    [s, h] = await Promise.all([realpath(e), a ?? realpath(n)]);
  } catch (error) {
    throw new EscapesBaseError(
      `${r} ${e} could not be resolved (${errorMessage(error)}) \u2014 refusing to write there`,
    );
  }
  if (!isSameOrInside(s, h))
    throw new EscapesBaseError(
      `${r} ${e} resolves to ${s}, outside ${h} \u2014 refusing to write there (is it a symlink?)`,
    );
}
//@ chunk-qchp9vrd.js:314510-315130 placement
async function resolveEvalDirSource(e, n) {
  if (n.source === "default") return n;
  let r;
  try {
    await checkRepoAuthoredPath(
      e,
      n.segments.join(path.sep),
      n.source === "flag" ? "--eval-dir" : "the manifest's experimental.evals",
    );
    r = await realpath(path.join(e, ...n.segments));
  } catch (error) {
    if (error instanceof TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS) throw error;
    return n;
  }
  let relativePath = path.relative(e, r);
  let parts = relativePath.split(path.sep);
  if (
    !toEvalPathError(e, r) ||
    parts.length !== n.segments.length ||
    parts.some((w, b) => w.toLowerCase() !== n.segments[b].toLowerCase())
  )
    return n;
  if (relativePath === n.segments.join(path.sep)) return n;
  let h = e;
  for (let segment of n.segments) {
    h = path.join(h, segment);
    try {
      if ((await lstat(h)).isSymbolicLink()) return n;
    } catch {
      return n;
    }
  }
  if (parts.some((w) => SKIPPED_SUBDIR_NAMES.has(w))) return n;
  return {
    ...n,
    dir: relativePath,
    segments: parts,
  };
}
//@ chunk-qchp9vrd.js:315130-315435 placement
function describeEvalDirScanScope(targetDir, pluginRoot, r) {
  let a = shellSafePath(toDisplayRelativePath(pluginRoot));
  return a === null
    ? `Only ${targetDir} was scanned; run claude plugin eval against the plugin directory ${pluginRoot}${r.source === "flag" ? ` (with --eval-dir ${displayDir(r)})` : ""} to scan the whole plugin.
`
    : `Only ${targetDir} was scanned; run \`claude plugin eval ${a}${isFromEvalDirFlag(r)}\` to scan the whole plugin.
`;
}
//@ chunk-qchp9vrd.js:315435-315529 placement
/**
 * 把路径转成可安全放进命令行的形式（Windows 下检查字符）。
 */
function shellSafePath(displayRelativePath) {
  if (getPlatform() !== "windows") return shellQuoteArgs([displayRelativePath]);
  return /^[A-Za-z0-9_./:\\-]+$/.test(displayRelativePath) ? displayRelativePath : null;
}
//@ chunk-qchp9vrd.js:315529-315734 placement
function toDisplayRelativePath(e) {
  let relativePath = path.relative(getCwd(), e);
  if (relativePath === "") return ".";
  if (path.isAbsolute(relativePath)) return relativePath;
  let r = getPlatform() === "windows" ? relativePath.replaceAll("\\", "/") : relativePath;
  return r === ".." || r.startsWith("./") || r.startsWith("../") ? r : `./${r}`;
}
//@ chunk-qchp9vrd.js:315734-316025 placement
/**
 * 计算评测输出目录重叠检查要使用的根目录集合。
 */
function resolveOverlapRoots(e) {
  let { scopeDir, scopeIsNamedDirectory, trustedRoot, otherManifestDir, adoptedAbove } = e;
  return {
    pluginRoot: trustedRoot,
    overlapRoot: trustedRoot ?? otherManifestDir ?? scopeDir,
    overlapBase:
      trustedRoot === null && otherManifestDir !== null && isSameOrInside(scopeDir, otherManifestDir)
        ? path.relative(otherManifestDir, scopeDir).split(path.sep).filter(Boolean)
        : [],
    overlapAdvisory:
      trustedRoot === null &&
      otherManifestDir !== null &&
      !(scopeIsNamedDirectory && otherManifestDir === scopeDir) &&
      otherManifestDir !== adoptedAbove,
  };
}
//@ chunk-qchp9vrd.js:316025-316206 placement
/**
 * 描述评测目录的来源：--eval-dir、manifest（提示可覆盖）或默认值。
 */
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
//@ chunk-qchp9vrd.js:316206-318414 placement
/**
 * 把本次运行的模拟录制写到输出目录（只覆盖本运行写的文件）。
 */
async function writeMockRecordings(e, report, r) {
  let joined = path.join(e, MOCK_RECORDINGS);
  await checkRepoAuthoredPath(e, MOCK_RECORDINGS, "mock recordings");
  if (
    !report.cases.some((b) =>
      [...b.runs, ...(b.runs_without ?? [])].some(
        (y) => y.mocks !== undefined && y.mocks.servers.some((server) => server.withheld !== true),
      ),
    )
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
  for (let b of report.cases.flatMap((y) => [...y.runs, ...(y.runs_without ?? [])])) {
    let y = new Set();
    for (let R of b.mockRecordings ?? []) {
      if (y.has(R.server)) continue;
      let joined = path.join(MOCK_RECORDINGS, R.server, R.file);
      let T = h.get(joined);
      if (T === undefined)
        h.set(joined, {
          rec: R,
          adoptDirs: new Set([R.adoptDir]),
        });
      else if (T.rec.answerHash === R.answerHash) T.adoptDirs.add(R.adoptDir);
      else y.add(R.server);
    }
  }
  if (!r && (await writeAdoptInstructions(joined)))
    await rm_2(joined, {
      recursive: true,
      force: true,
    });
  try {
    await mkdir(joined, {
      mode: 493,
    });
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
    `${escapeNonAscii(path.join(e, b))}  sha256=${createHash("sha256").update(y.json).digest("hex")}`,
    ...[...R].map((S) => `    -> ${escapeNonAscii(`${S}${path.sep}`)}`),
  ]);
  try {
    let b = new Set();
    for (let [R, { rec: S }] of h) {
      if (!b.has(S.server)) {
        await ensureOutputBase(e, [MOCK_RECORDINGS, S.server], []);
        b.add(S.server);
      }
      await writeOutputFile(path.join(e, R), S.json, true);
    }
    let y = new Map([[joined, new Set(b)]]);
    for (let [R, { rec: S }] of h) {
      let joined_2 = path.join(joined, S.server);
      let N = y.get(joined_2) ?? new Set();
      N.add(path.basename(R));
      y.set(joined_2, N);
    }
    for (let [R, S] of y) {
      if (!(await lstat(R)).isDirectory())
        throw new EscapesBaseError(
          `${escapeNonAscii(R)} is no longer the directory this run created \u2014 something else is writing into ${escapeNonAscii(joined)}`,
        );
      for (let T of await readdir(R))
        if (!S.has(T))
          throw new EscapesBaseError(
            `${escapeNonAscii(path.join(R, T))} was not written by this run \u2014 something else is writing into ${escapeNonAscii(joined)}`,
          );
    }
    for (let [R, { rec: S }] of h)
      if (!(await fileHasExactContent(path.join(e, R), S.json)))
        throw new EscapesBaseError(
          `${escapeNonAscii(path.join(e, R))} no longer holds what this run wrote \u2014 something else is writing into ${escapeNonAscii(joined)}`,
        );
    await writeOutputFile(
      path.join(joined, "ADOPT.txt"),
      `${MOCK_RECORDING_REPLAY_HINT}

${flattened.join(`
`)}
`,
      true,
    );
  } catch (error) {
    await rm_2(joined, {
      recursive: true,
      force: true,
    }).catch(() => {});
    throw error;
  }
  writeStderrLine(
    `${h.size} new agent-mock ${plural(h.size, "recording")} under ${joined} (listed in ADOPT.txt there). ${MOCK_RECORDING_REPLAY_HINT}`,
  );
  for (let b of flattened) writeStderrLine(`  ${b}`);
}
//@ chunk-qchp9vrd.js:318414-318742 placement
var MOCK_RECORDING_REPLAY_HINT =
  "To replay one on later runs (no model call), copy the file into the .replay/ directory shown after it - the one beside the mock that produced it. Each line carries the sha256 of the file as written; check the copy you take against the hash printed to the terminal (this file sits where the workload could still write):";
//@ chunk-qchp9vrd.js:318742-319140 placement
async function writeAdoptInstructions(e) {
  try {
    if (!(await lstat(e)).isDirectory()) return false;
  } catch (error) {
    if (isENOENT(error)) return false;
    throw error;
  }
  let n = await readdir(e, {
    withFileTypes: true,
  });
  for (let r of n) {
    let joined = path.join(e, r.name);
    let fileKind = await getFileKind(r, joined, "other");
    if (r.name === "ADOPT.txt" && fileKind === "file") continue;
    if (fileKind !== "dir") return false;
    for (let h of await readdir(joined, {
      withFileTypes: true,
    }))
      if (
        !RECORDING_FILE_RE.test(h.name) ||
        (await getFileKind(h, path.join(joined, h.name), "other")) !== "file"
      )
        return false;
  }
  return true;
}
//@ chunk-qchp9vrd.js:319140-319364 placement
async function fileHasExactContent(e, json) {
  let noFollow = await openNoFollow_2(e);
  if (!noFollow.ok) return false;
  try {
    let stats = await noFollow.value.stat();
    let buffer = Buffer.from(json);
    if (!stats.isFile() || stats.size !== buffer.length) return false;
    return (await noFollow.value.readFile()).equals(buffer);
  } finally {
    await noFollow.value.close();
  }
}
//@ chunk-qchp9vrd.js:319364-319722 placement
async function writeOutputFile(e, n, r) {
  let regularFile = await openRegularFileSafely(e, r ? "create" : "write", "output file");
  try {
    if (r) await regularFile.handle.writeFile(n);
    else {
      await regularFile.handle.truncate(0);
      let buffer = Buffer.from(n);
      let h = 0;
      while (h < buffer.length)
        h += (await regularFile.handle.write(buffer, h, buffer.length - h, h)).bytesWritten;
    }
    await regularFile.handle.close();
  } catch (error) {
    await regularFile.handle.close().catch(() => {});
    if (regularFile.created) await getFileIdentity(e, regularFile.identity);
    throw error;
  }
}
//@ chunk-qchp9vrd.js:319722-319769 placement
/**
 * 往 stderr 写一行（去控制字符）。
 */
function writeStderrLine(message) {
  process.stderr.write(
    stripControlChars(message) +
      `
`,
  );
}
export {
  resolveEvalTargetPlugin,
  writeStderrLine,
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
