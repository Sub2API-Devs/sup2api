/**
 * services/pluginEval/evalOutput.ts
 *
 * 2.1.316 新增：plugin eval 输出位置（--output 基目录安全检查）与模拟录制的落盘
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-af1hzzme.js (19)
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

//@ chunk-af1hzzme.js:313115-314333 placement
async function resolveEvalTargetPlugin(target, isPluginRoot, trust, cwdOverride) {
  let targetPath = path.resolve(getCwd(), target);
  await (isPluginRoot === undefined
    ? checkRepoAuthoredPath(getCwd(), target, "target")
    : checkRepoAuthoredPathFromCwd(target, cwdOverride));
  try {
    targetPath = await realpathKeepingPromptFile(targetPath);
  } catch (error) {
    if (!isFsInaccessible(error))
      logForDebugging(
        `plugin eval: could not resolve ${escapeNonAscii(targetPath)} to find its plugin: ${errorMessage(error)}`,
        {
          level: "warn",
        },
      );
    return {
      targetDir: targetPath,
      targetIsCaseFile: !isPluginRoot && isMagicDocsPromptFile(path.basename(targetPath)),
      pluginRoot: isPluginRoot ? targetPath : null,
      untrustedManifestDir: null,
      targetResolved: false,
      enclosingVerdict: null,
    };
  }
  if (isPluginRoot)
    return {
      targetDir: targetPath,
      targetIsCaseFile: false,
      pluginRoot: targetPath,
      untrustedManifestDir: null,
      targetResolved: true,
      enclosingVerdict: null,
    };
  let targetIsCaseFile = isMagicDocsPromptFile(path.basename(targetPath));
  let targetDir = targetIsCaseFile ? path.dirname(targetPath) : targetPath;
  if (!targetIsCaseFile) trust.consentRoot ??= targetDir;
  let targetWithin = await resolveTargetWithin(targetDir, trust);
  let resolved = path.resolve(await realCwd(trust), target);
  let targetReal = targetIsCaseFile ? path.dirname(resolved) : resolved;
  let nearestSkillDir = null;
  if (targetReal !== targetDir) {
    let nearestSkillFolder = await findNearestSkillFolder(
      targetReal,
      await resolveTargetWithin(targetReal, trust),
      trust,
      Number.POSITIVE_INFINITY,
    );
    if (nearestSkillFolder !== null)
      nearestSkillDir = await realpath(nearestSkillFolder).catch(() => nearestSkillFolder);
  }
  nearestSkillDir ??= await findNearestSkillFolder(targetDir, targetWithin, trust, Number.POSITIVE_INFINITY);
  let skillDirTrusted =
    nearestSkillDir !== null && (await getCachedPluginDirVerdict(nearestSkillDir, trust, "core"));
  if (nearestSkillDir === null && targetIsCaseFile) {
    let parentPluginDir = await resolveParentPluginDir(targetDir, trust, "tree", targetWithin);
    return {
      targetDir,
      targetIsCaseFile,
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
    targetDir,
    targetIsCaseFile,
    pluginRoot: skillDirTrusted ? nearestSkillDir : null,
    untrustedManifestDir: nearestSkillDir !== null && !skillDirTrusted ? nearestSkillDir : null,
    targetResolved: true,
    enclosingVerdict:
      nearestSkillDir === null ? await resolveParentPluginDir(targetDir, trust, "core") : null,
  };
}
//@ chunk-af1hzzme.js:314333-314410 placement
class EscapesBaseError extends Error {
  constructor(message) {
    super(message);
    this.name = "EscapesBaseError";
  }
}
//@ chunk-af1hzzme.js:314410-315048 placement
async function ensureOutputBase(
  baseDir,
  segments,
  createdDirs,
  { vetOwnership = null, create = true, absentEndsChain = false } = {},
) {
  if (create)
    await mkdir(baseDir, {
      recursive: true,
    });
  let baseStats = await lstat(baseDir);
  if (baseStats.isSymbolicLink())
    throw new EscapesBaseError(`output base ${baseDir} is a symlink \u2014 refusing to write beneath it`);
  if (vetOwnership !== null) {
    let ownershipProblem = await checkWritableByOthers(baseStats, baseDir, vetOwnership, baseDir);
    if (ownershipProblem)
      throw new EscapesBaseError(
        `output base ${baseDir} ${ownershipProblem.message} \u2014 refusing to write beneath a directory you did not name (pass --output-dir, or name the directory itself as the target)`,
      );
  }
  let baseReal = await realpath(baseDir).catch(() => {
    return;
  });
  let dir = baseDir;
  for (let segment of segments) {
    dir = path.join(dir, segment);
    if (create)
      try {
        await mkdir(dir, {
          mode: 493,
        });
        createdDirs.push(dir);
      } catch (error) {
        if (getErrnoCode(error) !== "EEXIST") throw error;
      }
    if (!(await checkOutputLocation(dir, baseDir, baseReal, vetOwnership, !create && absentEndsChain)))
      return;
  }
}
//@ chunk-af1hzzme.js:315048-315162 placement
/**
 * 从深到浅删除空目录，遇到无法删除的目录即停止。
 */
async function removeEmptyDirs(createdDirs) {
  for (let j = createdDirs.length - 1; j >= 0; j--) {
    let dir = createdDirs[j];
    try {
      await rmdir(dir);
    } catch (error) {
      if (isENOENT(error)) continue;
      return;
    }
  }
}
//@ chunk-af1hzzme.js:315162-315537 placement
async function checkOutputLocation(dirPath, baseDir, baseReal, vetOwnership, allowAbsent = false) {
  let problem;
  try {
    let dirStats = await lstat(dirPath);
    problem = dirStats.isSymbolicLink()
      ? "is a symlink"
      : !dirStats.isDirectory()
        ? "is not a directory"
        : vetOwnership === null
          ? undefined
          : (await checkWritableByOthers(dirStats, dirPath, vetOwnership, baseDir))?.message;
  } catch (error) {
    if (allowAbsent && isENOENT(error)) return false;
    problem = `could not be examined (${errorMessage(error)})`;
  }
  if (problem !== undefined)
    throw new EscapesBaseError(`output location ${dirPath} ${problem} \u2014 refusing to write there`);
  await checkInsideOutputBase(dirPath, baseDir, "output location", baseReal);
  return true;
}
//@ chunk-af1hzzme.js:315537-315676 placement
/**
 * 判断目录中是否存在插件组件（.claude-plugin 以外的组件目录或文件）。
 */
async function hasPluginComponents(pluginDir) {
  for (let marker of PLUGIN_ROOT_MARKERS) {
    if (marker === ".claude-plugin") continue;
    if ((await lstat(path.join(pluginDir, marker)).catch(() => null)) !== null) return true;
  }
  return false;
}
//@ chunk-af1hzzme.js:315676-315974 placement
async function checkInsideOutputBase(dirPath, baseDir, label, baseReal) {
  let dirReal;
  let baseRealPath;
  try {
    [dirReal, baseRealPath] = await Promise.all([realpath(dirPath), baseReal ?? realpath(baseDir)]);
  } catch (error) {
    throw new EscapesBaseError(
      `${label} ${dirPath} could not be resolved (${errorMessage(error)}) \u2014 refusing to write there`,
    );
  }
  if (!isSameOrInside(dirReal, baseRealPath))
    throw new EscapesBaseError(
      `${label} ${dirPath} resolves to ${dirReal}, outside ${baseRealPath} \u2014 refusing to write there (is it a symlink?)`,
    );
}
//@ chunk-af1hzzme.js:315974-316594 placement
async function resolveEvalDirSource(pluginRoot, evalDirSource) {
  if (evalDirSource.source === "default") return evalDirSource;
  let dirReal;
  try {
    await checkRepoAuthoredPath(
      pluginRoot,
      evalDirSource.segments.join(path.sep),
      evalDirSource.source === "flag" ? "--eval-dir" : "the manifest's experimental.evals",
    );
    dirReal = await realpath(path.join(pluginRoot, ...evalDirSource.segments));
  } catch (error) {
    if (error instanceof TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS) throw error;
    return evalDirSource;
  }
  let relativePath = path.relative(pluginRoot, dirReal);
  let parts = relativePath.split(path.sep);
  if (
    !toEvalPathError(pluginRoot, dirReal) ||
    parts.length !== evalDirSource.segments.length ||
    parts.some((part, index) => part.toLowerCase() !== evalDirSource.segments[index].toLowerCase())
  )
    return evalDirSource;
  if (relativePath === evalDirSource.segments.join(path.sep)) return evalDirSource;
  let currentPath = pluginRoot;
  for (let segment of evalDirSource.segments) {
    currentPath = path.join(currentPath, segment);
    try {
      if ((await lstat(currentPath)).isSymbolicLink()) return evalDirSource;
    } catch {
      return evalDirSource;
    }
  }
  if (parts.some((part) => SKIPPED_SUBDIR_NAMES.has(part))) return evalDirSource;
  return {
    ...evalDirSource,
    dir: relativePath,
    segments: parts,
  };
}
//@ chunk-af1hzzme.js:316594-316899 placement
function describeEvalDirScanScope(targetDir, absolutePath, evalDirSource) {
  let quotedPluginRoot = shellSafePath(toDisplayRelativePath(absolutePath));
  return quotedPluginRoot === null
    ? `Only ${targetDir} was scanned; run claude plugin eval against the plugin directory ${absolutePath}${evalDirSource.source === "flag" ? ` (with --eval-dir ${displayDir(evalDirSource)})` : ""} to scan the whole plugin.
`
    : `Only ${targetDir} was scanned; run \`claude plugin eval ${quotedPluginRoot}${isFromEvalDirFlag(evalDirSource)}\` to scan the whole plugin.
`;
}
//@ chunk-af1hzzme.js:316899-316993 placement
/**
 * 把路径转成可安全放进命令行的形式（Windows 下检查字符）。
 */
function shellSafePath(displayRelativePath) {
  if (getPlatform() !== "windows") return shellQuoteArgs([displayRelativePath]);
  return /^[A-Za-z0-9_./:\\-]+$/.test(displayRelativePath) ? displayRelativePath : null;
}
//@ chunk-af1hzzme.js:316993-317198 placement
function toDisplayRelativePath(absolutePath) {
  let relativePath = path.relative(getCwd(), absolutePath);
  if (relativePath === "") return ".";
  if (path.isAbsolute(relativePath)) return relativePath;
  let displayPath = getPlatform() === "windows" ? relativePath.replaceAll("\\", "/") : relativePath;
  return displayPath === ".." || displayPath.startsWith("./") || displayPath.startsWith("../")
    ? displayPath
    : `./${displayPath}`;
}
//@ chunk-af1hzzme.js:317198-317489 placement
/**
 * 计算评测输出目录重叠检查要使用的根目录集合。
 */
function resolveOverlapRoots(scope) {
  let { scopeDir, scopeIsNamedDirectory, trustedRoot, otherManifestDir, adoptedAbove } = scope;
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
//@ chunk-af1hzzme.js:317489-317670 placement
/**
 * 描述评测目录的来源：--eval-dir、manifest（提示可覆盖）或默认值。
 */
function describeEvalDirSource(evalDirSource) {
  switch (evalDirSource.source) {
    case "flag":
      return "from --eval-dir";
    case "manifest":
      return `from ${escapeNonAscii(evalDirSource.manifestPath)}; pass --eval-dir to override`;
    case "default":
      return "the default";
  }
}
//@ chunk-af1hzzme.js:317670-319878 placement
/**
 * 把本次运行的模拟录制写到输出目录（只覆盖本运行写的文件）。
 */
async function writeMockRecordings(pluginRoot, report, keepRecordings) {
  let dir = path.join(pluginRoot, MOCK_RECORDINGS);
  await checkRepoAuthoredPath(pluginRoot, MOCK_RECORDINGS, "mock recordings");
  if (
    !report.cases.some((caseReport) =>
      [...caseReport.runs, ...(caseReport.runs_without ?? [])].some(
        (run) => run.mocks !== undefined && run.mocks.servers.some((server) => server.withheld !== true),
      ),
    )
  ) {
    try {
      await lstat(dir);
    } catch (error) {
      if (isENOENT(error)) return;
      throw error;
    }
    throw new EscapesBaseError(
      `${escapeNonAscii(dir)} was not written by this run (it served no mocks) \u2014 nothing there is to be adopted`,
    );
  }
  let recordsByPath = new Map();
  for (let run of report.cases.flatMap((caseReport) => [
    ...caseReport.runs,
    ...(caseReport.runs_without ?? []),
  ])) {
    let conflictingServers = new Set();
    for (let recording of run.mockRecordings ?? []) {
      if (conflictingServers.has(recording.server)) continue;
      let joined = path.join(MOCK_RECORDINGS, recording.server, recording.file);
      let existing = recordsByPath.get(joined);
      if (existing === undefined)
        recordsByPath.set(joined, {
          rec: recording,
          adoptDirs: new Set([recording.adoptDir]),
        });
      else if (existing.rec.answerHash === recording.answerHash) existing.adoptDirs.add(recording.adoptDir);
      else conflictingServers.add(recording.server);
    }
  }
  if (!keepRecordings && (await writeAdoptInstructions(dir)))
    await rm_2(dir, {
      recursive: true,
      force: true,
    });
  try {
    await mkdir(dir, {
      mode: 493,
    });
  } catch (error) {
    if (getErrnoCode(error) === "EEXIST")
      throw new EscapesBaseError(
        `${dir} already exists and was not written by this run \u2014 nothing there is to be adopted; remove it and rerun`,
      );
    throw error;
  }
  if (recordsByPath.size === 0) {
    await rmdir(dir);
    return;
  }
  let flattened = [...recordsByPath].flatMap(([relativePath, { rec: recording, adoptDirs }]) => [
    `${escapeNonAscii(path.join(pluginRoot, relativePath))}  sha256=${createHash("sha256").update(recording.json).digest("hex")}`,
    ...[...adoptDirs].map((adoptDir) => `    -> ${escapeNonAscii(`${adoptDir}${path.sep}`)}`),
  ]);
  try {
    let createdServers = new Set();
    for (let [relativePath, { rec: recording }] of recordsByPath) {
      if (!createdServers.has(recording.server)) {
        await ensureOutputBase(pluginRoot, [MOCK_RECORDINGS, recording.server], []);
        createdServers.add(recording.server);
      }
      await writeOutputFile(path.join(pluginRoot, relativePath), recording.json, true);
    }
    let expectedFiles = new Map([[dir, new Set(createdServers)]]);
    for (let [relativePath, { rec: recording }] of recordsByPath) {
      let joined = path.join(dir, recording.server);
      let expected = expectedFiles.get(joined) ?? new Set();
      expected.add(path.basename(relativePath));
      expectedFiles.set(joined, expected);
    }
    for (let [serverDir, expected] of expectedFiles) {
      if (!(await lstat(serverDir)).isDirectory())
        throw new EscapesBaseError(
          `${escapeNonAscii(serverDir)} is no longer the directory this run created \u2014 something else is writing into ${escapeNonAscii(dir)}`,
        );
      for (let fileName of await readdir(serverDir))
        if (!expected.has(fileName))
          throw new EscapesBaseError(
            `${escapeNonAscii(path.join(serverDir, fileName))} was not written by this run \u2014 something else is writing into ${escapeNonAscii(dir)}`,
          );
    }
    for (let [relativePath, { rec: recording }] of recordsByPath)
      if (!(await fileHasExactContent(path.join(pluginRoot, relativePath), recording.json)))
        throw new EscapesBaseError(
          `${escapeNonAscii(path.join(pluginRoot, relativePath))} no longer holds what this run wrote \u2014 something else is writing into ${escapeNonAscii(dir)}`,
        );
    await writeOutputFile(
      path.join(dir, "ADOPT.txt"),
      `${MOCK_RECORDING_REPLAY_HINT}

${flattened.join(`
`)}
`,
      true,
    );
  } catch (error) {
    await rm_2(dir, {
      recursive: true,
      force: true,
    }).catch(() => {});
    throw error;
  }
  writeStderrLine(
    `${recordsByPath.size} new agent-mock ${plural(recordsByPath.size, "recording")} under ${dir} (listed in ADOPT.txt there). ${MOCK_RECORDING_REPLAY_HINT}`,
  );
  for (let summaryLine of flattened) writeStderrLine(`  ${summaryLine}`);
}
//@ chunk-af1hzzme.js:319878-320206 placement
var MOCK_RECORDING_REPLAY_HINT =
  "To replay one on later runs (no model call), copy the file into the .replay/ directory shown after it - the one beside the mock that produced it. Each line carries the sha256 of the file as written; check the copy you take against the hash printed to the terminal (this file sits where the workload could still write):";
//@ chunk-af1hzzme.js:320206-320604 placement
async function writeAdoptInstructions(dir) {
  try {
    if (!(await lstat(dir)).isDirectory()) return false;
  } catch (error) {
    if (isENOENT(error)) return false;
    throw error;
  }
  let entries = await readdir(dir, {
    withFileTypes: true,
  });
  for (let entry of entries) {
    let joined = path.join(dir, entry.name);
    let fileKind = await getFileKind(entry, joined, "other");
    if (entry.name === "ADOPT.txt" && fileKind === "file") continue;
    if (fileKind !== "dir") return false;
    for (let recording of await readdir(joined, {
      withFileTypes: true,
    }))
      if (
        !RECORDING_FILE_RE.test(recording.name) ||
        (await getFileKind(recording, path.join(joined, recording.name), "other")) !== "file"
      )
        return false;
  }
  return true;
}
//@ chunk-af1hzzme.js:320604-320828 placement
async function fileHasExactContent(filePath, json) {
  let noFollow = await openNoFollow_2(filePath);
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
//@ chunk-af1hzzme.js:320828-321186 placement
async function writeOutputFile(filePath, content, create) {
  let regularFile = await openRegularFileSafely(filePath, create ? "create" : "write", "output file");
  try {
    if (create) await regularFile.handle.writeFile(content);
    else {
      await regularFile.handle.truncate(0);
      let buffer = Buffer.from(content);
      let written = 0;
      while (written < buffer.length)
        written += (await regularFile.handle.write(buffer, written, buffer.length - written, written))
          .bytesWritten;
    }
    await regularFile.handle.close();
  } catch (error) {
    await regularFile.handle.close().catch(() => {});
    if (regularFile.created) await getFileIdentity(filePath, regularFile.identity);
    throw error;
  }
}
//@ chunk-af1hzzme.js:321186-321233 placement
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
