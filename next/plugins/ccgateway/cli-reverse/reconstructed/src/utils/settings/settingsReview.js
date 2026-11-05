/**
 * utils/settings/settingsReview.ts
 *
 * 2.1.316 新增。设置改动审阅（暂存、接受）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-n0hwmqka.js (38)
 * attribution: placement 36, layout 1, affinity 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { join, dirname, basename } from "path";
import { homedir } from "os";
import { randomBytes } from "crypto";
import { lstat, unlink, open, stat, readdir, realpath } from "fs/promises";
import { constants } from "fs";
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  objectSchema,
  stringSchema,
  _enum,
  literal,
  array,
  record,
  unknown,
} from "../../../vendor/zod/v4/classic/schemas.js";
import { EDITABLE_SETTING_SOURCES } from "./constants.js";
import {
  normalizeCaseForComparison,
  isClaudeSettingsPath,
  isJsonSpelling,
  isManagedSettingsDropInPath,
  managedDropInDirSpellingsAsync,
} from "../permissions/filesystem.js";
import {
  getSettingsFilePathForSource,
  resolveSettingsWritePath,
  MAX_SETTINGS_JSON_BYTES,
} from "./settings.js";
import { getFileReader } from "../fileStore.js";
import {
  isENOENT,
  getErrnoCode,
  errorMessage,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
} from "../errors.js";
import { readFileChecked, isFileTooLargeError } from "../fileRead.js";
import { pinWriteTarget } from "../fsSafety/pathRevalidation.js";
import {
  SymlinkWriteRefusedError,
  stagingPathFor,
  verifyStagingDir,
  HardLinkWriteRefusedError,
  StagingDirTamperedError,
} from "../fsSafety/atomicWriteStaging.js";
import { ATOMIC_WRITE_DIRNAME, ATOMIC_WRITE_ERRNOS, shouldWriteInPlace } from "../plugins/safeCopy.js";
import { computeContentHash } from "../commitAttribution.js";
import { detectLineEndingsForString, readJsonFile_2 } from "../file.js";
import { writeNewFile, retryFsOp } from "../atomicPublishWrite.js";
import { markInternalWrite } from "../../cli/headlessCloud/attachServe.js";
import { logForDebugging } from "../debug.js";
import { logError } from "../log.js";
import { settingsChangeDetector } from "./changeDetector.js";
import { getPlatform } from "../platform.js";
import { jsonParse, jsonStringify } from "../slowOperations.js";
import { isDesktopTopSession } from "../entrypointKinds.js";
import { hasHostAttestedDialog, isHostAttestedWrite } from "../../components/permissions/hooks.js";
import { isHeadlessHostSession } from "../sessionShape.js";
import { foldPathSegments } from "../plugins/pluginCachePaths.js";
import { expandPath } from "../path.js";
import { managedFileSettingsDirs } from "./managedFileSettings.js";
import { wslInheritsSettings } from "./mdm/settings.js";
import { getSessionId } from "../../bootstrap/state.js";
import { logFeatureBad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { scanForContext } from "../readEditContext.js";
import { isNonWslUncPath, isNetworkOrSpecialPath } from "../networkPaths.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-n0hwmqka.js:6075-6156 placement
/**
 * stripBomAndCarriageReturns：去掉 BOM 与裸回车。
 */
function stripBomAndCarriageReturns(text) {
  return (text.startsWith("\uFEFF") ? text.slice(1) : text).replaceAll(
    `\r
`,
    `
`,
  );
}
//@ chunk-n0hwmqka.js:6156-6662 placement
/**
 * 设置审阅暂存的常量与结构：存储版本、条目上限、提议内容大小上限、临时提议文件名、过期时间、来源遥测名，以及条目与存储的 schema。
 */
var REVIEW_STORE_VERSION; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var MAX_REVIEW_ENTRIES;
var MAX_PROPOSED_BYTES;
var PROPOSED_FILE_INFIX;
var PROPOSED_SUFFIX_PATTERN;
var STALE_PROPOSAL_MS;
var SOURCE_TELEMETRY_NAMES;
var REVIEW_ENTRY_SCHEMA;
var REVIEW_STORE_SCHEMA;
deferInit("chunk-n0hwmqka.js:6156", () => {
  REVIEW_STORE_VERSION = 1;
  MAX_REVIEW_ENTRIES = 64;
  MAX_PROPOSED_BYTES = 1048576;
  PROPOSED_FILE_INFIX = ".proposed-";
  PROPOSED_SUFFIX_PATTERN = /^[0-9a-f]{8}$/;
  STALE_PROPOSAL_MS = 900000;
  SOURCE_TELEMETRY_NAMES = {
    userSettings: "user_settings",
    projectSettings: "project_settings",
    localSettings: "local_settings",
    flagSettings: "policy_settings",
    policySettings: "policy_settings",
  };
  REVIEW_ENTRY_SCHEMA = DoctorLazy(() =>
    objectSchema({
      id: stringSchema().min(1),
      path: stringSchema().min(1),
      resolvedPath: stringSchema().min(1),
      baseSha256: stringSchema().nullable(),
      proposedSha256: stringSchema(),
      proposedContent: stringSchema(),
      stagedAt: stringSchema(),
      by: objectSchema({
        tool: _enum(["Write", "Edit"]),
        origin: _enum(["local", "served"]),
        sessionId: stringSchema(),
      }),
    }),
  );
  REVIEW_STORE_SCHEMA = DoctorLazy(() =>
    objectSchema({
      version: literal(REVIEW_STORE_VERSION),
      entries: array(REVIEW_ENTRY_SCHEMA()),
    }),
  );
});
//@ chunk-n0hwmqka.js:6662-6732 placement
function settingsReviewStorePath() {
  return join(homedir(), ".claude", "state", "settings-review.json");
}
//@ chunk-n0hwmqka.js:6732-6779 layout
var SETTING_SOURCES_BY_PRIORITY; // deferred: uses EDITABLE_SETTING_SOURCES (./constants.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-n0hwmqka.js:6732", () => {
  SETTING_SOURCES_BY_PRIORITY = ["policySettings", "flagSettings", ...EDITABLE_SETTING_SOURCES];
});
//@ chunk-n0hwmqka.js:6779-6869 placement
/**
 * settingsSourceForPathByPriority：按优先级找路径对应的设置源。
 */
function settingsSourceForPathByPriority(settingsPath) {
  let normalizedPath = normalizeCaseForComparison(settingsPath);
  return SETTING_SOURCES_BY_PRIORITY.find((source) => {
    let settingsFilePathForSource = getSettingsFilePathForSource(source);
    return (
      settingsFilePathForSource !== undefined &&
      normalizeCaseForComparison(settingsFilePathForSource) === normalizedPath
    );
  });
}
//@ chunk-n0hwmqka.js:6869-6946 placement
async function resolveSettingsSourceForPath(settingsPath) {
  let writeTarget;
  try {
    writeTarget = await resolveSettingsWriteTarget(settingsPath);
  } catch {
    return settingsSourceForPathByPriority(settingsPath);
  }
  return settingsSourceForPath(settingsPath, writeTarget);
}
//@ chunk-n0hwmqka.js:6946-7117 placement
async function settingsSourceForPath(settingsPath, writeTarget) {
  let byPriority = settingsSourceForPathByPriority(settingsPath);
  if (byPriority !== undefined) return byPriority;
  let normalizedTarget = normalizeCaseForComparison(writeTarget);
  for (let source of SETTING_SOURCES_BY_PRIORITY) {
    let settingsFilePathForSource = getSettingsFilePathForSource(source);
    if (settingsFilePathForSource === undefined) continue;
    try {
      if (
        normalizeCaseForComparison(await resolveSettingsWriteTarget(settingsFilePathForSource)) ===
        normalizedTarget
      )
        return source;
    } catch {}
  }
  return;
}
//@ chunk-n0hwmqka.js:7117-7265 placement
function decodedFileText(decoded) {
  let hasBom = decoded.content.startsWith("\uFEFF");
  return {
    text: hasBom ? decoded.content.slice(1) : decoded.content,
    encoding: decoded.encoding,
    bom: hasBom,
    lineEndings: decoded.lineEndings,
  };
}
//@ chunk-n0hwmqka.js:7265-9587 placement
function settingsReviewStore(options) {
  return {
    readStore: async () => {
      try {
        return await getFileReader().read(settingsReviewStorePath());
      } catch (error) {
        if (isENOENT(error)) return;
        throw error;
      }
    },
    writeStore: async (content) => {
      let storePath = settingsReviewStorePath();
      await getFileReader().mkdir(dirname(storePath), 448);
      await getFileReader().atomicWrite(storePath, content, 384);
    },
    deleteStore: async () => {
      try {
        await getFileReader().delete(settingsReviewStorePath());
      } catch (error) {
        if (!isENOENT(error)) throw error;
      }
    },
    readTarget: async (key) => {
      try {
        return decodedFileText(
          await readFileChecked(await resolveSettingsWritePath(key), MAX_SETTINGS_JSON_BYTES),
        ).text;
      } catch (error) {
        if (isENOENT(error)) return null;
        throw error;
      }
    },
    writeTarget: async ({ path, resolvedPath, baseSha256, content, blockedOnceWritten }) => {
      let target;
      try {
        target = await pinWriteTarget(resolvedPath, [resolvedPath], {
          createParents: true,
        });
      } catch (error) {
        if (error instanceof SymlinkWriteRefusedError) return "redirected";
        throw error;
      }
      let baseName = basename(resolvedPath);
      let siblingSuffix = `${PROPOSED_FILE_INFIX}${randomBytes(4).toString("hex")}`;
      let stagingDir = join(dirname(resolvedPath), ATOMIC_WRITE_DIRNAME);
      let stagedPath = join(dirname(target.ioPath), `${baseName}${siblingSuffix}`);
      let stagedWritten = false;
      try {
        stagedPath = stagingPathFor(stagingDir, target.ioPath, siblingSuffix, false);
        let stagedAwayFromTarget = dirname(stagedPath) !== dirname(target.ioPath);
        await cleanupStaleProposals(dirname(stagedPath), baseName);
        let readCurrent = async () => {
          let decoded;
          try {
            decoded = await target.readExisting(MAX_SETTINGS_JSON_BYTES);
          } catch (error) {
            if (isFileTooLargeError(error)) return "changed";
            throw error;
          }
          let current = decoded === null ? null : decodedFileText(decoded);
          return (current === null ? null : computeContentHash(current.text)) === baseSha256
            ? current
            : "changed";
        };
        let currentAtWrite = await readCurrent();
        if (currentAtWrite === "changed") return "changed";
        let encoding = currentAtWrite?.encoding ?? "utf8";
        let textToWrite =
          (currentAtWrite?.bom ? "\uFEFF" : "") +
          detectLineEndingsForString(content, currentAtWrite?.lineEndings ?? "LF");
        let buffer = Buffer.from(textToWrite, encoding);
        await writeNewFile(stagedPath, buffer, 384);
        stagedWritten = true;
        let finalStagedPath = stagedAwayFromTarget
          ? stagedPath
          : join(dirname(resolvedPath), `${baseName}${siblingSuffix}`);
        if (await blockedOnceWritten(finalStagedPath)) return "blocked";
        if ((await readCurrent()) === "changed") return "changed";
        let verified = await verifyStagedFile(stagedPath, finalStagedPath, buffer);
        if (verified === null) return "tampered";
        await target.recheckBeforeWrite();
        let stagedStat = await lstat(stagedPath).catch(() => null);
        if (
          stagedStat === null ||
          stagedStat.isSymbolicLink() ||
          stagedStat.ino !== verified.ino ||
          stagedStat.dev !== verified.dev
        )
          return "tampered";
        if (stagedAwayFromTarget) verifyStagingDir(stagingDir);
        try {
          await retryFsOp(stagedPath, target.ioPath);
          stagedWritten = false;
        } catch (error) {
          if (!ATOMIC_WRITE_ERRNOS.has(getErrnoCode(error) ?? "")) throw error;
          await readJsonFile_2(target.ioPath, textToWrite, {
            encoding,
            stagingDir,
            refuseHardLinkedInPlace: true,
          });
        }
        let source = await settingsSourceForPath(path, resolvedPath);
        let sourcePath = source === undefined ? undefined : getSettingsFilePathForSource(source);
        if (sourcePath !== undefined) markInternalWrite(sourcePath);
        return "written";
      } catch (error) {
        if (error instanceof HardLinkWriteRefusedError) return "hard_linked";
        if (error instanceof SymlinkWriteRefusedError) return "redirected";
        if (error instanceof StagingDirTamperedError) return "tampered";
        throw error;
      } finally {
        if (stagedWritten)
          await unlink(stagedPath).catch((error) => {
            logForDebugging(
              `settings review store: could not remove the proposal sibling (${errorMessage(error)}); the next accept of this file sweeps it`,
              {
                level: "warn",
              },
            );
          });
        await target.close();
      }
    },
    locate: resolveSettingsWriteTarget,
    isSettingsFile: async (path) =>
      isClaudeSettingsPath(path) ||
      (isJsonSpelling(path) && isManagedSettingsDropInPath(path, await managedDropInSpellings())),
    configChangeBlocked: async (settingsPath, resolvedPath, context) => {
      let source = await settingsSourceForPath(settingsPath, resolvedPath);
      if (source === undefined) return false;
      if (options?.configChangeHookGate === undefined) {
        logError(Error("settings review store: ConfigChange hook gate not wired"));
        return true;
      }
      return options.configChangeHookGate(SOURCE_TELEMETRY_NAMES[source], context);
    },
    afterApplied: async (settingsPath, resolvedPath) => {
      let source = await settingsSourceForPath(settingsPath, resolvedPath);
      if (source !== undefined) settingsChangeDetector.notifyChange(source);
    },
    now: () => new Date(),
  };
}
//@ chunk-n0hwmqka.js:9587-9973 placement
/**
 * 校验暂存的提议文件：不是链接、普通文件且只有一个硬链接、内容哈希与提议一致、与目标路径是同一 inode，通过时返回 dev/ino。
 */
async function verifyStagedFile(stagedPath, targetPath, expectedContent) {
  try {
    let isWindows = getPlatform() === "windows";
    if (isWindows && (await lstat(stagedPath)).isSymbolicLink()) return null;
    let fileHandle = await open(stagedPath, constants.O_RDONLY | (isWindows ? 0 : constants.O_NOFOLLOW));
    try {
      let stats = await fileHandle.stat();
      if (!stats.isFile() || stats.nlink !== 1) return null;
      if (computeContentHash(await fileHandle.readFile()) !== computeContentHash(expectedContent))
        return null;
      let targetStat = await stat(targetPath);
      return targetStat.dev === stats.dev && targetStat.ino === stats.ino
        ? {
            dev: stats.dev,
            ino: stats.ino,
          }
        : null;
    } finally {
      await fileHandle.close();
    }
  } catch {
    return null;
  }
}
//@ chunk-n0hwmqka.js:9973-10204 placement
async function cleanupStaleProposals(dir, baseName) {
  let names;
  try {
    names = await readdir(dir);
  } catch {
    return;
  }
  let prefix = `${baseName}${PROPOSED_FILE_INFIX}`;
  let staleBefore = Date.now() - STALE_PROPOSAL_MS;
  for (let name of names) {
    if (!name.startsWith(prefix) || !PROPOSED_SUFFIX_PATTERN.test(name.slice(prefix.length))) continue;
    try {
      if ((await lstat(join(dir, name))).mtimeMs < staleBefore) await unlink(join(dir, name));
    } catch {}
  }
}
//@ chunk-n0hwmqka.js:10334-10377 affinity
async function resolveSettingsWriteTarget(key) {
  return realpathAllowMissing(await resolveSettingsWritePath(key));
}
//@ chunk-n0hwmqka.js:10377-10489 placement
async function realpathAllowMissing(path) {
  try {
    return await realpath(path);
  } catch (error) {
    if (!isENOENT(error) || dirname(path) === path) throw error;
    return join(await realpathAllowMissing(dirname(path)), basename(path));
  }
}
//@ chunk-n0hwmqka.js:10489-10524 placement
async function managedDropInSpellings() {
  return managedDropInDirSpellingsAsync(realpathAllowMissing);
}
//@ chunk-n0hwmqka.js:10524-10699 placement
async function readReviewEntries(deps) {
  let raw = await deps.readStore();
  if (raw === undefined) return [];
  let parsed;
  try {
    parsed = jsonParse(raw);
  } catch {
    parsed = undefined;
  }
  let result = REVIEW_STORE_SCHEMA().safeParse(parsed);
  if (!result.success) throw new ReviewStoreMalformedError();
  return result.data.entries;
}
//@ chunk-n0hwmqka.js:10699-10804 placement
class ReviewStoreMalformedError extends Error {
  constructor() {
    super("settings review store: malformed or of an unknown version");
  }
}
//@ chunk-n0hwmqka.js:10804-10905 placement
async function isSettingsEntry(entry, deps) {
  return (await deps.isSettingsFile(entry.path)) || (await deps.isSettingsFile(entry.resolvedPath));
}
//@ chunk-n0hwmqka.js:10905-11032 placement
async function writeReviewEntries(entries, deps) {
  if (entries.length === 0) {
    await deps.deleteStore();
    return;
  }
  await deps.writeStore(
    jsonStringify(
      {
        version: REVIEW_STORE_VERSION,
        entries,
      },
      null,
      2,
    ) +
      `
`,
  );
}
//@ chunk-n0hwmqka.js:11032-11733 placement
async function stageSettingsProposal(change, deps = settingsReviewStore()) {
  let reviewEntries = await readReviewEntries(deps);
  let target = await deps.readTarget(change.path);
  let proposedContent = stripBomAndCarriageReturns(change.proposedContent);
  let entry = {
    id: randomBytes(6).toString("hex"),
    path: change.path,
    resolvedPath: await deps.locate(change.path),
    baseSha256: target === null ? null : computeContentHash(target),
    proposedSha256: computeContentHash(proposedContent),
    proposedContent,
    stagedAt: deps.now().toISOString(),
    by: change.by,
  };
  let normalizedPath = normalizeCaseForComparison(entry.path);
  let normalizedResolvedPath = normalizeCaseForComparison(entry.resolvedPath);
  let nextEntries = [
    ...reviewEntries.filter(
      (reviewEntry) =>
        normalizeCaseForComparison(reviewEntry.path) !== normalizedPath &&
        normalizeCaseForComparison(reviewEntry.resolvedPath) !== normalizedResolvedPath,
    ),
    entry,
  ];
  let droppedCount = 0;
  while (nextEntries.length > MAX_REVIEW_ENTRIES || jsonStringify(nextEntries).length > MAX_PROPOSED_BYTES) {
    let index = nextEntries.findIndex(
      (otherEntry) => otherEntry !== entry && otherEntry.by.sessionId === entry.by.sessionId,
    );
    if (index === -1) throw Error("settings review store: no room, proposal not staged");
    nextEntries.splice(index, 1);
    droppedCount++;
  }
  if (droppedCount > 0)
    logForDebugging(`settings review store: full, dropped the ${droppedCount} oldest pending proposal(s)`, {
      level: "warn",
    });
  await writeReviewEntries(nextEntries, deps);
  return entry;
}
//@ chunk-n0hwmqka.js:11733-12738 placement
async function acceptSettingsProposal(change, deps = settingsReviewStore()) {
  let entry = (await readReviewEntries(deps)).find((entry) => entry.id === change.id);
  if (entry === undefined || !(await isSettingsEntry(entry, deps))) return "gone";
  if (
    jsonStringify(entry) !== jsonStringify(change) ||
    computeContentHash(entry.proposedContent) !== entry.proposedSha256
  )
    return "stale";
  if ((await deps.locate(entry.path)) !== entry.resolvedPath) return "redirected";
  let target = await deps.readTarget(entry.resolvedPath);
  if ((target === null ? null : computeContentHash(target)) !== entry.baseSha256) return "conflict";
  let result;
  try {
    result = await deps.writeTarget({
      path: entry.path,
      resolvedPath: entry.resolvedPath,
      baseSha256: entry.baseSha256,
      content: entry.proposedContent,
      blockedOnceWritten: (writtenPath) =>
        deps.configChangeBlocked(entry.path, entry.resolvedPath, writtenPath),
    });
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    if (errnoCode === "EACCES" || errnoCode === "EPERM" || errnoCode === "EROFS" || errnoCode === "EBUSY")
      return "not_writable";
    throw error;
  }
  switch (result) {
    case "changed":
      return "conflict";
    case "redirected":
    case "hard_linked":
    case "blocked":
    case "tampered":
      return result;
    case "written":
      break;
  }
  await deps.afterApplied(entry.path, entry.resolvedPath);
  try {
    let reviewEntries = await readReviewEntries(deps);
    await writeReviewEntries(
      reviewEntries.filter((reviewEntry) => reviewEntry.id !== entry.id),
      deps,
    );
  } catch (error) {
    logForDebugging(
      `settings review store: applied, but the store could not be updated (${errorMessage(error)})`,
      {
        level: "warn",
      },
    );
  }
  return "applied";
}
//@ chunk-n0hwmqka.js:12738-12866 placement
/**
 * 从审阅存储中删除一条暂存的设置提议，返回是否删除。
 */
async function discardSettingsProposal(id, deps = settingsReviewStore()) {
  let reviewEntries = await readReviewEntries(deps);
  let filtered = reviewEntries.filter((reviewEntry) => reviewEntry.id !== id);
  if (filtered.length === reviewEntries.length) return false;
  await writeReviewEntries(filtered, deps);
  return true;
}
//@ chunk-n0hwmqka.js:12866-13104 placement
/**
 * 只保留在给定时间之后暂存的设置提议，返回删除的条数。
 */
async function pruneReviewEntriesBefore(cutoffDate, deps = settingsReviewStore()) {
  let reviewEntries = await readReviewEntries(deps);
  let time = deps.now().getTime();
  let filtered = reviewEntries.filter((reviewEntry) => {
    let timestamp = Date.parse(reviewEntry.stagedAt);
    return Number.isFinite(timestamp) && timestamp >= cutoffDate.getTime() && timestamp <= time;
  });
  if (filtered.length !== reviewEntries.length || reviewEntries.length === 0)
    await writeReviewEntries(filtered, deps);
  return reviewEntries.length - filtered.length;
}
//@ chunk-n0hwmqka.js:13104-13563 placement
/**
 * 比较设置文件新旧内容的顶层键，列出新增、删除、修改的键；新内容非 JSON 或替换了非 JSON 文件时给出相应说明。
 */
function describeSettingsChange(currentContent, content) {
  let parseSettings = (content) => {
    if (content === null) return {};
    try {
      let parsed = record(stringSchema(), unknown()).safeParse(
        jsonParse(stripBomAndCarriageReturns(content)),
      );
      return parsed.success ? parsed.data : undefined;
    } catch {
      return;
    }
  };
  let currentSettings = parseSettings(currentContent);
  let proposedSettings = parseSettings(content);
  if (proposedSettings === undefined) return ["not valid JSON"];
  if (currentSettings === undefined) return ["replaces a file that was not valid JSON"];
  let changes = [];
  for (let key of new Set([...Object.keys(currentSettings), ...Object.keys(proposedSettings)]))
    if (!(key in currentSettings)) changes.push(`adds ${key}`);
    else if (!(key in proposedSettings)) changes.push(`removes ${key}`);
    else if (jsonStringify(currentSettings[key]) !== jsonStringify(proposedSettings[key]))
      changes.push(`changes ${key}`);
  return changes;
}
//@ chunk-n0hwmqka.js:13563-13621 placement
function shouldStageSettingsWrite({ session, served }) {
  return !served && isDesktopTopSession() && hasHostAttestedDialog(session);
}
//@ chunk-n0hwmqka.js:13621-13767 placement
/**
 * 决定未获批准的设置写入走哪条路：卡片确认、云端不适用或稍后审阅。
 */
function settingsWriteRoute({ session, served, cause }) {
  if (cause !== "unapproved") return cause;
  if (
    shouldStageSettingsWrite({
      session,
      served,
    })
  )
    return "card";
  return !served && isHeadlessHostSession() ? "cloud" : "review";
}
//@ chunk-n0hwmqka.js:13767-15739 placement
function settingsNotAppliedMessage(filePath, cause) {
  switch (cause) {
    case "card":
      return `Not applied: ${filePath} was NOT modified. In the Claude desktop app, a change to a Claude Code settings file applies only when the user approves that edit on its permission card. Tell the user what you meant to change. Do not retry the edit or try to make the same change another way.`;
    case "cloud":
      return `Not applied: ${filePath} was NOT modified. A change to a Claude Code settings file applies only when a person approves it at the computer that Claude Code runs on, and a cloud session cannot take that approval. Approving the edit in this session does not apply it. The /settings-review command does not run in a cloud session, and on another computer it would not list this change. Tell the user what you meant to change. If the file is committed to a repository, the user can make the change themselves outside this session and push it. Do not retry the edit or try to make the same change another way.`;
    case "linked":
      return `Not applied: ${filePath} was NOT modified. The user approved this edit on its permission card, but this path reaches a Claude Code settings file through a symbolic link, so the approval does not apply it. Tell the user what you meant to change. Do not retry the edit or try to make the same change another way.`;
    case "policy":
      return `Not applied: ${filePath} was NOT modified. The user approved this edit on its permission card, but this path is, or may be, a managed policy settings file or the --settings file, so the approval does not apply it. Tell the user what you meant to change. Do not retry the edit or try to make the same change another way.`;
    case "review":
      return `Staged for review: ${filePath} was NOT modified. Changes to Claude Code settings files made without the owner of this computer approving them in person are held for their review; the owner applies or discards them with /settings-review, and the change takes effect only if they accept it. Do not retry the edit or try to make the same change another way.`;
  }
}
//@ chunk-n0hwmqka.js:15739-16160 placement
/**
 * 托管设置目录无法解析时拒绝写设置文件的错误，提示模型不要重试或换方式修改。
 */
let ManagedDirUnresolvedError; // deferred: uses TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS (../errors.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-n0hwmqka.js:15739", () => {
  ManagedDirUnresolvedError = class ManagedDirUnresolvedError extends (
    TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS
  ) {
    constructor(absolutePath) {
      super(
        `Not written: ${absolutePath} was NOT modified. Claude Code could not resolve where its managed settings folder is, so it cannot rule out that this path is a managed settings file, and it does not write the file. Tell the user what you meant to change. Do not retry the edit or try to make the same change another way.`,
        "settings write refused: a managed drop-in directory did not resolve",
      );
    }
  };
});
//@ chunk-n0hwmqka.js:16160-16391 placement
var STAGED_FOR_REVIEW_TEXT =
  "Staged for your review \xB7 not applied until you accept it in /settings-review";
var CLOUD_NOT_APPLIED_TEXT =
  "Not applied \xB7 a cloud session can't apply Claude's edits to settings files \xB7 if you want this change, make it outside this session";
//@ chunk-n0hwmqka.js:16391-16432 placement
/**
 * settingsWriteGateText：云端未应用或已暂存的说明。
 */
function settingsWriteGateText(stagedWording) {
  return stagedWording === "cloud" ? CLOUD_NOT_APPLIED_TEXT : STAGED_FOR_REVIEW_TEXT;
}
//@ chunk-n0hwmqka.js:16432-17008 placement
/**
 * 写文件前检查是否落在设置文件上：远程调用或未获批准时返回需审阅的路径与原因；托管目录不可解析时抛错；已覆盖的返回 undefined。
 */
async function checkSettingsWrite(context, spellings, file) {
  let isServed = context.remoteCall !== undefined;
  if (
    !shouldWriteInPlace({
      served: isServed,
    })
  )
    return;
  if (isServed) {
    let { settingsSpellings, unclassified } = await classifySettingsPaths(spellings);
    let [settingsPath] = settingsSpellings;
    if (settingsPath !== undefined)
      return {
        path: settingsPath,
        cause: "unapproved",
      };
    if (unclassified !== undefined) throw new ManagedDirUnresolvedError(file.absolutePath);
    return;
  }
  if (context.permissionSurface !== undefined) return;
  let { settingsSpellings, unclassified, dropIns } = await classifySettingsPaths(spellings);
  let [settingsPath] = settingsSpellings;
  if (settingsPath === undefined) {
    if (unclassified !== undefined) throw new ManagedDirUnresolvedError(file.absolutePath);
    return;
  }
  if (!isHostAttestedWrite(context.session, context.toolUseId, file))
    return {
      path: settingsPath,
      cause: "unapproved",
    };
  let coverage = await settingsWriteCoverage(
    file.absolutePath,
    spellings,
    settingsSpellings,
    dropIns ?? (await managedDropInSpellings()),
  );
  return coverage === "covered"
    ? undefined
    : {
        path: settingsPath,
        cause: coverage,
      };
}
//@ chunk-n0hwmqka.js:17008-17203 placement
async function classifySettingsPaths(spellings) {
  let dropIns = spellings.some(isJsonSpelling) ? await managedDropInSpellings() : undefined;
  return {
    settingsSpellings: spellings.filter(
      (spelling) =>
        isClaudeSettingsPath(spelling) ||
        (dropIns !== undefined && isManagedSettingsDropInPath(spelling, dropIns)),
    ),
    unclassified: dropIns === undefined || dropIns.allResolved ? undefined : spellings.find(isJsonSpelling),
    dropIns,
  };
}
//@ chunk-n0hwmqka.js:17203-17482 placement
async function settingsWriteCoverage(absolutePath, spellings, settingsSpellings, dropIns) {
  if (!settingsSpellings.includes(absolutePath)) return "linked";
  let filtered = spellings.filter((spelling) => spelling !== absolutePath);
  if (await touchesManagedSettings(spellings, dropIns)) return filtered.length === 0 ? "policy" : "linked";
  if (filtered.length === 0) return "covered";
  let primarySource = settingsSourceForPathByPriority(absolutePath);
  if (primarySource === undefined) return "linked";
  for (let spelling of filtered)
    if ((await resolveSettingsSourceForPath(spelling)) !== primarySource) return "linked";
  return "covered";
}
//@ chunk-n0hwmqka.js:17482-17761 placement
async function touchesManagedSettings(spellings, dropIns) {
  if (!dropIns.allResolved || !dropIns.allLocated) return true;
  let managedPaths = new Set();
  for (let managedPath of managedSettingsFiles()) {
    managedPaths.add(foldPathSegments(managedPath));
    try {
      managedPaths.add(foldPathSegments(await resolveSettingsWriteTarget(managedPath)));
    } catch {
      return true;
    }
  }
  for (let spelling of spellings) {
    let resolvedPath;
    try {
      resolvedPath = await resolveSettingsWriteTarget(spelling);
    } catch {
      return true;
    }
    if (
      isManagedSettingsDropInPath(spelling, dropIns) ||
      isManagedSettingsDropInPath(resolvedPath, dropIns) ||
      managedPaths.has(foldPathSegments(expandPath(spelling))) ||
      managedPaths.has(foldPathSegments(resolvedPath))
    )
      return true;
  }
  return false;
}
//@ chunk-n0hwmqka.js:17761-17883 placement
function managedSettingsFiles() {
  let settingsFilePathForSource = getSettingsFilePathForSource("flagSettings");
  return [
    ...managedFileSettingsDirs(wslInheritsSettings()).map((settingsDir) =>
      join(settingsDir, "managed-settings.json"),
    ),
    ...(settingsFilePathForSource === undefined ? [] : [settingsFilePathForSource]),
  ];
}
//@ chunk-n0hwmqka.js:17883-18535 placement
async function stageSettingsWrite(request) {
  let origin = request.writeCtx.remoteCall === undefined ? "local" : "served";
  let entry;
  try {
    entry = await stageSettingsProposal({
      path: request.absolutePath,
      proposedContent: request.proposedContent,
      by: {
        tool: request.tool,
        origin,
        sessionId: request.writeCtx.remoteCall?.origin.callerSessionId ?? getSessionId(),
      },
    });
  } catch (error) {
    logFeatureBad("settings_quarantine", "stage_failed");
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Could not stage this change to a Claude Code settings file for the owner's review, so nothing was written. (${errorMessage(error)})`,
      "settings review store: stage failed",
    );
  }
  logEvent("tengu_settings_change_staged", {
    origin: fromEnum(origin),
    tool: fromEnum(request.tool),
    source_kind: fromEnum(settingsSourceForPathByPriority(request.absolutePath) ?? "other"),
    key_count: describeSettingsChange(request.currentContent, request.proposedContent).length,
  });
  logFeatureOk("settings_quarantine");
  return entry;
}
//@ chunk-n0hwmqka.js:18571-18608 placement
/**
 * MAX_DIFF_CONTEXT_BYTES：diff 上下文读取字节上限；MAX_SETTINGS_FILE_BYTES：设置文件体积上限；DIFF_CONTEXT_LINES_BEFORE：diff 上下文前几行（同一声明共 4 个绑定）。
 */
var MAX_DIFF_CONTEXT_BYTES = 8192;
var MAX_SETTINGS_FILE_BYTES = 10485760;
var DIFF_CONTEXT_LINES_BEFORE = 10;
var DIFF_CONTEXT_LINES_AFTER = 13;
//@ chunk-n0hwmqka.js:18608-18732 placement
/**
 * 打开文件并读取指定行附近的上下文，用于拒绝时显示 diff。
 */
async function readRejectionContext(path, needle, contextLines = 3) {
  let handle = await openForDiff(path);
  if (handle === null) return null;
  try {
    return await scanForContext(handle, needle, contextLines);
  } finally {
    await handle.close();
  }
}
//@ chunk-n0hwmqka.js:18732-18881 placement
/**
 * 为显示 diff 打开文件（跳过特殊路径与含空字节的路径，不存在返回 null）。
 */
async function openForDiff(path) {
  if (isNonWslUncPath(path) || isNetworkOrSpecialPath(path)) return null;
  if (path.includes("\x00")) return null;
  try {
    return await open(path, "r");
  } catch (error) {
    if (isENOENT(error)) return null;
    throw error;
  }
}
export {
  settingsWriteGateText,
  readRejectionContext,
  pruneReviewEntriesBefore,
  openForDiff,
  settingsSourceForPathByPriority,
  settingsNotAppliedMessage,
  checkSettingsWrite,
  stageSettingsWrite,
  MAX_SETTINGS_FILE_BYTES,
  stripBomAndCarriageReturns,
  settingsWriteRoute,
  PROPOSED_FILE_INFIX,
  describeSettingsChange,
  discardSettingsProposal,
  acceptSettingsProposal,
  REVIEW_STORE_VERSION,
  DIFF_CONTEXT_LINES_BEFORE,
  MAX_DIFF_CONTEXT_BYTES,
  DIFF_CONTEXT_LINES_AFTER,
};
