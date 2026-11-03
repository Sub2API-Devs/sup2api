/**
 * utils/settings/settingsReview.ts
 *
 * 2.1.316 新增。设置改动审阅（暂存、接受）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-6zvepy0r.js (37)
 * attribution: placement 36, affinity 1
 */
import { join, dirname, basename } from "path";
import { homedir } from "os";
import { randomBytes } from "crypto";
import { lstat, unlink, open, stat, readdir, realpath } from "fs/promises";
import { constants } from "fs";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, string, _enum, literal, array, record, unknown } from "../../../vendor/zod/v4/classic/schemas.js";
import {
  normalizeCaseForComparison,
  isClaudeSettingsPath,
  isJsonSpelling,
  isManagedSettingsDropInPath,
  managedDropInDirSpellingsAsync,
} from "../permissions/filesystem.js";
import { SETTING_SOURCES_BY_PRIORITY } from "./constants.js";
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
import { detectLineEndingsForString, writeFileAtomic } from "../file.js";
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

//@ chunk-6zvepy0r.js:6076-6157 placement
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
//@ chunk-6zvepy0r.js:6157-6663 placement
/**
 * 设置审阅暂存的常量与结构：存储版本、条目上限、提议内容大小上限、临时提议文件名、过期时间、来源遥测名，以及条目与存储的 schema。
 */
var REVIEW_STORE_VERSION = 1;
var MAX_REVIEW_ENTRIES = 64;
var MAX_PROPOSED_BYTES = 1048576;
var PROPOSED_FILE_INFIX = ".proposed-";
var PROPOSED_SUFFIX_PATTERN = /^[0-9a-f]{8}$/;
var STALE_PROPOSAL_MS = 900000;
var SOURCE_TELEMETRY_NAMES = {
  userSettings: "user_settings",
  projectSettings: "project_settings",
  localSettings: "local_settings",
  flagSettings: "policy_settings",
  policySettings: "policy_settings",
};
var REVIEW_ENTRY_SCHEMA = DoctorLazy(() =>
  u({
    id: string().min(1),
    path: string().min(1),
    resolvedPath: string().min(1),
    baseSha256: string().nullable(),
    proposedSha256: string(),
    proposedContent: string(),
    stagedAt: string(),
    by: u({
      tool: _enum(["Write", "Edit"]),
      origin: _enum(["local", "served"]),
      sessionId: string(),
    }),
  }),
);
var REVIEW_STORE_SCHEMA = DoctorLazy(() =>
  u({
    version: literal(REVIEW_STORE_VERSION),
    entries: array(REVIEW_ENTRY_SCHEMA()),
  }),
);
//@ chunk-6zvepy0r.js:6663-6733 placement
function settingsReviewStorePath() {
  return join(homedir(), ".claude", "state", "settings-review.json");
}
//@ chunk-6zvepy0r.js:6780-6870 placement
/**
 * settingsSourceForPathByPriority：按优先级找路径对应的设置源。
 */
function settingsSourceForPathByPriority(e) {
  let n = normalizeCaseForComparison(e);
  return SETTING_SOURCES_BY_PRIORITY.find((r) => {
    let settingsFilePathForSource = getSettingsFilePathForSource(r);
    return (
      settingsFilePathForSource !== undefined && normalizeCaseForComparison(settingsFilePathForSource) === n
    );
  });
}
//@ chunk-6zvepy0r.js:6870-6947 placement
async function resolveSettingsSourceForPath(e) {
  let n;
  try {
    n = await resolveSettingsWriteTarget(e);
  } catch {
    return settingsSourceForPathByPriority(e);
  }
  return settingsSourceForPath(e, n);
}
//@ chunk-6zvepy0r.js:6947-7118 placement
async function settingsSourceForPath(e, n) {
  let r = settingsSourceForPathByPriority(e);
  if (r !== undefined) return r;
  let i = normalizeCaseForComparison(n);
  for (let s of SETTING_SOURCES_BY_PRIORITY) {
    let settingsFilePathForSource = getSettingsFilePathForSource(s);
    if (settingsFilePathForSource === undefined) continue;
    try {
      if (normalizeCaseForComparison(await resolveSettingsWriteTarget(settingsFilePathForSource)) === i)
        return s;
    } catch {}
  }
  return;
}
//@ chunk-6zvepy0r.js:7118-7266 placement
function decodedFileText(e) {
  let n = e.content.startsWith("\uFEFF");
  return {
    text: n ? e.content.slice(1) : e.content,
    encoding: e.encoding,
    bom: n,
    lineEndings: e.lineEndings,
  };
}
//@ chunk-6zvepy0r.js:7266-9588 placement
function settingsReviewStore(e) {
  return {
    readStore: async () => {
      try {
        return await getFileReader().read(settingsReviewStorePath());
      } catch (error) {
        if (isENOENT(error)) return;
        throw error;
      }
    },
    writeStore: async (n) => {
      let r = settingsReviewStorePath();
      await getFileReader().mkdir(dirname(r), 448);
      await getFileReader().atomicWrite(r, n, 384);
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
      let h;
      try {
        h = await pinWriteTarget(resolvedPath, [resolvedPath], {
          createParents: true,
        });
      } catch (error) {
        if (error instanceof SymlinkWriteRefusedError) return "redirected";
        throw error;
      }
      let S = basename(resolvedPath);
      let w = `${PROPOSED_FILE_INFIX}${randomBytes(4).toString("hex")}`;
      let y = join(dirname(resolvedPath), ATOMIC_WRITE_DIRNAME);
      let b = join(dirname(h.ioPath), `${S}${w}`);
      let P = false;
      try {
        b = stagingPathFor(y, h.ioPath, w, false);
        let x = dirname(b) !== dirname(h.ioPath);
        await cleanupStaleProposals(dirname(b), S);
        let v = async () => {
          let H;
          try {
            H = await h.readExisting(MAX_SETTINGS_JSON_BYTES);
          } catch (error) {
            if (isFileTooLargeError(error)) return "changed";
            throw error;
          }
          let B = H === null ? null : decodedFileText(H);
          return (B === null ? null : computeContentHash(B.text)) === baseSha256 ? B : "changed";
        };
        let E = await v();
        if (E === "changed") return "changed";
        let encoding = E?.encoding ?? "utf8";
        let D = (E?.bom ? "\uFEFF" : "") + detectLineEndingsForString(content, E?.lineEndings ?? "LF");
        let buffer = Buffer.from(D, encoding);
        await writeNewFile(b, buffer, 384);
        P = true;
        let L = x ? b : join(dirname(resolvedPath), `${S}${w}`);
        if (await blockedOnceWritten(L)) return "blocked";
        if ((await v()) === "changed") return "changed";
        let R = await verifyStagedFile(b, L, buffer);
        if (R === null) return "tampered";
        await h.recheckBeforeWrite();
        let N = await lstat(b).catch(() => null);
        if (N === null || N.isSymbolicLink() || N.ino !== R.ino || N.dev !== R.dev) return "tampered";
        if (x) verifyStagingDir(y);
        try {
          await retryFsOp(b, h.ioPath);
          P = false;
        } catch (error) {
          if (!ATOMIC_WRITE_ERRNOS.has(getErrnoCode(error) ?? "")) throw error;
          await writeFileAtomic(h.ioPath, D, {
            encoding,
            stagingDir: y,
            refuseHardLinkedInPlace: true,
          });
        }
        let W = await settingsSourceForPath(path, resolvedPath);
        let G = W === undefined ? undefined : getSettingsFilePathForSource(W);
        if (G !== undefined) markInternalWrite(G);
        return "written";
      } catch (error) {
        if (error instanceof HardLinkWriteRefusedError) return "hard_linked";
        if (error instanceof SymlinkWriteRefusedError) return "redirected";
        if (error instanceof StagingDirTamperedError) return "tampered";
        throw error;
      } finally {
        if (P)
          await unlink(b).catch((error) => {
            logForDebugging(
              `settings review store: could not remove the proposal sibling (${errorMessage(error)}); the next accept of this file sweeps it`,
              {
                level: "warn",
              },
            );
          });
        await h.close();
      }
    },
    locate: resolveSettingsWriteTarget,
    isSettingsFile: async (n) =>
      isClaudeSettingsPath(n) ||
      (isJsonSpelling(n) && isManagedSettingsDropInPath(n, await managedDropInSpellings())),
    configChangeBlocked: async (n, r, i) => {
      let s = await settingsSourceForPath(n, r);
      if (s === undefined) return false;
      if (e?.configChangeHookGate === undefined) {
        logError(Error("settings review store: ConfigChange hook gate not wired"));
        return true;
      }
      return e.configChangeHookGate(SOURCE_TELEMETRY_NAMES[s], i);
    },
    afterApplied: async (n, r) => {
      let i = await settingsSourceForPath(n, r);
      if (i !== undefined) settingsChangeDetector.notifyChange(i);
    },
    now: () => new Date(),
  };
}
//@ chunk-6zvepy0r.js:9588-9974 placement
/**
 * 校验暂存的提议文件：不是链接、普通文件且只有一个硬链接、内容哈希与提议一致、与目标路径是同一 inode，通过时返回 dev/ino。
 */
async function verifyStagedFile(e, n, r) {
  try {
    let i = getPlatform() === "windows";
    if (i && (await lstat(e)).isSymbolicLink()) return null;
    let s = await open(e, constants.O_RDONLY | (i ? 0 : constants.O_NOFOLLOW));
    try {
      let stats = await s.stat();
      if (!stats.isFile() || stats.nlink !== 1) return null;
      if (computeContentHash(await s.readFile()) !== computeContentHash(r)) return null;
      let h = await stat(n);
      return h.dev === stats.dev && h.ino === stats.ino
        ? {
            dev: stats.dev,
            ino: stats.ino,
          }
        : null;
    } finally {
      await s.close();
    }
  } catch {
    return null;
  }
}
//@ chunk-6zvepy0r.js:9974-10205 placement
async function cleanupStaleProposals(e, n) {
  let r;
  try {
    r = await readdir(e);
  } catch {
    return;
  }
  let i = `${n}${PROPOSED_FILE_INFIX}`;
  let s = Date.now() - STALE_PROPOSAL_MS;
  for (let f of r) {
    if (!f.startsWith(i) || !PROPOSED_SUFFIX_PATTERN.test(f.slice(i.length))) continue;
    try {
      if ((await lstat(join(e, f))).mtimeMs < s) await unlink(join(e, f));
    } catch {}
  }
}
//@ chunk-6zvepy0r.js:10335-10378 affinity
async function resolveSettingsWriteTarget(key) {
  return realpathAllowMissing(await resolveSettingsWritePath(key));
}
//@ chunk-6zvepy0r.js:10378-10490 placement
async function realpathAllowMissing(e) {
  try {
    return await realpath(e);
  } catch (error) {
    if (!isENOENT(error) || dirname(e) === e) throw error;
    return join(await realpathAllowMissing(dirname(e)), basename(e));
  }
}
//@ chunk-6zvepy0r.js:10490-10525 placement
async function managedDropInSpellings() {
  return managedDropInDirSpellingsAsync(realpathAllowMissing);
}
//@ chunk-6zvepy0r.js:10525-10700 placement
async function readReviewEntries(e) {
  let n = await e.readStore();
  if (n === undefined) return [];
  let r;
  try {
    r = jsonParse(n);
  } catch {
    r = undefined;
  }
  let i = REVIEW_STORE_SCHEMA().safeParse(r);
  if (!i.success) throw new ReviewStoreMalformedError();
  return i.data.entries;
}
//@ chunk-6zvepy0r.js:10700-10805 placement
class ReviewStoreMalformedError extends Error {
  constructor() {
    super("settings review store: malformed or of an unknown version");
  }
}
//@ chunk-6zvepy0r.js:10805-10906 placement
async function isSettingsEntry(e, n) {
  return (await n.isSettingsFile(e.path)) || (await n.isSettingsFile(e.resolvedPath));
}
//@ chunk-6zvepy0r.js:10906-11033 placement
async function writeReviewEntries(e, n) {
  if (e.length === 0) {
    await n.deleteStore();
    return;
  }
  await n.writeStore(
    jsonStringify(
      {
        version: REVIEW_STORE_VERSION,
        entries: e,
      },
      null,
      2,
    ) +
      `
`,
  );
}
//@ chunk-6zvepy0r.js:11033-11734 placement
async function stageSettingsProposal(e, n = settingsReviewStore()) {
  let reviewEntries = await readReviewEntries(n);
  let target = await n.readTarget(e.path);
  let s = stripBomAndCarriageReturns(e.proposedContent);
  let f = {
    id: randomBytes(6).toString("hex"),
    path: e.path,
    resolvedPath: await n.locate(e.path),
    baseSha256: target === null ? null : computeContentHash(target),
    proposedSha256: computeContentHash(s),
    proposedContent: s,
    stagedAt: n.now().toISOString(),
    by: e.by,
  };
  let h = normalizeCaseForComparison(f.path);
  let S = normalizeCaseForComparison(f.resolvedPath);
  let w = [
    ...reviewEntries.filter(
      (reviewEntry) =>
        normalizeCaseForComparison(reviewEntry.path) !== h &&
        normalizeCaseForComparison(reviewEntry.resolvedPath) !== S,
    ),
    f,
  ];
  let y = 0;
  while (w.length > MAX_REVIEW_ENTRIES || jsonStringify(w).length > MAX_PROPOSED_BYTES) {
    let index = w.findIndex((P) => P !== f && P.by.sessionId === f.by.sessionId);
    if (index === -1) throw Error("settings review store: no room, proposal not staged");
    w.splice(index, 1);
    y++;
  }
  if (y > 0)
    logForDebugging(`settings review store: full, dropped the ${y} oldest pending proposal(s)`, {
      level: "warn",
    });
  await writeReviewEntries(w, n);
  return f;
}
//@ chunk-6zvepy0r.js:11734-12739 placement
async function acceptSettingsProposal(change, deps = settingsReviewStore()) {
  let found = (await readReviewEntries(deps)).find((S) => S.id === change.id);
  if (found === undefined || !(await isSettingsEntry(found, deps))) return "gone";
  if (
    jsonStringify(found) !== jsonStringify(change) ||
    computeContentHash(found.proposedContent) !== found.proposedSha256
  )
    return "stale";
  if ((await deps.locate(found.path)) !== found.resolvedPath) return "redirected";
  let target = await deps.readTarget(found.resolvedPath);
  if ((target === null ? null : computeContentHash(target)) !== found.baseSha256) return "conflict";
  let h;
  try {
    h = await deps.writeTarget({
      path: found.path,
      resolvedPath: found.resolvedPath,
      baseSha256: found.baseSha256,
      content: found.proposedContent,
      blockedOnceWritten: (S) => deps.configChangeBlocked(found.path, found.resolvedPath, S),
    });
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    if (errnoCode === "EACCES" || errnoCode === "EPERM" || errnoCode === "EROFS" || errnoCode === "EBUSY")
      return "not_writable";
    throw error;
  }
  switch (h) {
    case "changed":
      return "conflict";
    case "redirected":
    case "hard_linked":
    case "blocked":
    case "tampered":
      return h;
    case "written":
      break;
  }
  await deps.afterApplied(found.path, found.resolvedPath);
  try {
    let reviewEntries = await readReviewEntries(deps);
    await writeReviewEntries(
      reviewEntries.filter((reviewEntry) => reviewEntry.id !== found.id),
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
//@ chunk-6zvepy0r.js:12739-12867 placement
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
//@ chunk-6zvepy0r.js:12867-13105 placement
/**
 * 只保留在给定时间之后暂存的设置提议，返回删除的条数。
 */
async function pruneReviewEntriesBefore(cutoffDate, n = settingsReviewStore()) {
  let reviewEntries = await readReviewEntries(n);
  let time = n.now().getTime();
  let filtered = reviewEntries.filter((reviewEntry) => {
    let timestamp = Date.parse(reviewEntry.stagedAt);
    return Number.isFinite(timestamp) && timestamp >= cutoffDate.getTime() && timestamp <= time;
  });
  if (filtered.length !== reviewEntries.length || reviewEntries.length === 0)
    await writeReviewEntries(filtered, n);
  return reviewEntries.length - filtered.length;
}
//@ chunk-6zvepy0r.js:13105-13564 placement
/**
 * 比较设置文件新旧内容的顶层键，列出新增、删除、修改的键；新内容非 JSON 或替换了非 JSON 文件时给出相应说明。
 */
function describeSettingsChange(e, proposedContent) {
  let r = (h) => {
    if (h === null) return {};
    try {
      let S = record(string(), unknown()).safeParse(jsonParse(stripBomAndCarriageReturns(h)));
      return S.success ? S.data : undefined;
    } catch {
      return;
    }
  };
  let i = r(e);
  let s = r(proposedContent);
  if (s === undefined) return ["not valid JSON"];
  if (i === undefined) return ["replaces a file that was not valid JSON"];
  let f = [];
  for (let h of new Set([...Object.keys(i), ...Object.keys(s)]))
    if (!(h in i)) f.push(`adds ${h}`);
    else if (!(h in s)) f.push(`removes ${h}`);
    else if (jsonStringify(i[h]) !== jsonStringify(s[h])) f.push(`changes ${h}`);
  return f;
}
//@ chunk-6zvepy0r.js:13564-13622 placement
function shouldStageSettingsWrite({ session, served }) {
  return !served && isDesktopTopSession() && hasHostAttestedDialog(session);
}
//@ chunk-6zvepy0r.js:13622-13768 placement
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
//@ chunk-6zvepy0r.js:13768-15740 placement
function settingsNotAppliedMessage(filePath, n) {
  switch (n) {
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
//@ chunk-6zvepy0r.js:15740-16161 placement
/**
 * 托管设置目录无法解析时拒绝写设置文件的错误，提示模型不要重试或换方式修改。
 */
class ManagedDirUnresolvedError extends TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS {
  constructor(absolutePath) {
    super(
      `Not written: ${absolutePath} was NOT modified. Claude Code could not resolve where its managed settings folder is, so it cannot rule out that this path is a managed settings file, and it does not write the file. Tell the user what you meant to change. Do not retry the edit or try to make the same change another way.`,
      "settings write refused: a managed drop-in directory did not resolve",
    );
  }
}
//@ chunk-6zvepy0r.js:16161-16392 placement
var STAGED_FOR_REVIEW_TEXT =
  "Staged for your review \xB7 not applied until you accept it in /settings-review";
var CLOUD_NOT_APPLIED_TEXT =
  "Not applied \xB7 a cloud session can't apply Claude's edits to settings files \xB7 if you want this change, make it outside this session";
//@ chunk-6zvepy0r.js:16392-16433 placement
/**
 * settingsWriteGateText：云端未应用或已暂存的说明。
 */
function settingsWriteGateText(stagedWording) {
  return stagedWording === "cloud" ? CLOUD_NOT_APPLIED_TEXT : STAGED_FOR_REVIEW_TEXT;
}
//@ chunk-6zvepy0r.js:16433-17009 placement
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
    let [P] = settingsSpellings;
    if (P !== undefined)
      return {
        path: P,
        cause: "unapproved",
      };
    if (unclassified !== undefined) throw new ManagedDirUnresolvedError(file.absolutePath);
    return;
  }
  if (context.permissionSurface !== undefined) return;
  let { settingsSpellings, unclassified, dropIns } = await classifySettingsPaths(spellings);
  let [S] = settingsSpellings;
  if (S === undefined) {
    if (unclassified !== undefined) throw new ManagedDirUnresolvedError(file.absolutePath);
    return;
  }
  if (!isHostAttestedWrite(context.session, context.toolUseId, file))
    return {
      path: S,
      cause: "unapproved",
    };
  let w = await settingsWriteCoverage(
    file.absolutePath,
    spellings,
    settingsSpellings,
    dropIns ?? (await managedDropInSpellings()),
  );
  return w === "covered"
    ? undefined
    : {
        path: S,
        cause: w,
      };
}
//@ chunk-6zvepy0r.js:17009-17204 placement
async function classifySettingsPaths(spellings) {
  let n = spellings.some(isJsonSpelling) ? await managedDropInSpellings() : undefined;
  return {
    settingsSpellings: spellings.filter(
      (r) => isClaudeSettingsPath(r) || (n !== undefined && isManagedSettingsDropInPath(r, n)),
    ),
    unclassified: n === undefined || n.allResolved ? undefined : spellings.find(isJsonSpelling),
    dropIns: n,
  };
}
//@ chunk-6zvepy0r.js:17204-17483 placement
async function settingsWriteCoverage(absolutePath, spellings, settingsSpellings, i) {
  if (!settingsSpellings.includes(absolutePath)) return "linked";
  let filtered = spellings.filter((h) => h !== absolutePath);
  if (await touchesManagedSettings(spellings, i)) return filtered.length === 0 ? "policy" : "linked";
  if (filtered.length === 0) return "covered";
  let f = settingsSourceForPathByPriority(absolutePath);
  if (f === undefined) return "linked";
  for (let h of filtered) if ((await resolveSettingsSourceForPath(h)) !== f) return "linked";
  return "covered";
}
//@ chunk-6zvepy0r.js:17483-17762 placement
async function touchesManagedSettings(e, n) {
  if (!n.allResolved || !n.allLocated) return true;
  let r = new Set();
  for (let i of managedSettingsFiles()) {
    r.add(foldPathSegments(i));
    try {
      r.add(foldPathSegments(await resolveSettingsWriteTarget(i)));
    } catch {
      return true;
    }
  }
  for (let i of e) {
    let s;
    try {
      s = await resolveSettingsWriteTarget(i);
    } catch {
      return true;
    }
    if (
      isManagedSettingsDropInPath(i, n) ||
      isManagedSettingsDropInPath(s, n) ||
      r.has(foldPathSegments(expandPath(i))) ||
      r.has(foldPathSegments(s))
    )
      return true;
  }
  return false;
}
//@ chunk-6zvepy0r.js:17762-17884 placement
function managedSettingsFiles() {
  let settingsFilePathForSource = getSettingsFilePathForSource("flagSettings");
  return [
    ...managedFileSettingsDirs(wslInheritsSettings()).map((n) => join(n, "managed-settings.json")),
    ...(settingsFilePathForSource === undefined ? [] : [settingsFilePathForSource]),
  ];
}
//@ chunk-6zvepy0r.js:17884-18536 placement
async function stageSettingsWrite(e) {
  let n = e.writeCtx.remoteCall === undefined ? "local" : "served";
  let r;
  try {
    r = await stageSettingsProposal({
      path: e.absolutePath,
      proposedContent: e.proposedContent,
      by: {
        tool: e.tool,
        origin: n,
        sessionId: e.writeCtx.remoteCall?.origin.callerSessionId ?? getSessionId(),
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
    origin: fromEnum(n),
    tool: fromEnum(e.tool),
    source_kind: fromEnum(settingsSourceForPathByPriority(e.absolutePath) ?? "other"),
    key_count: describeSettingsChange(e.currentContent, e.proposedContent).length,
  });
  logFeatureOk("settings_quarantine");
  return r;
}
//@ chunk-6zvepy0r.js:18572-18609 placement
/**
 * MAX_DIFF_CONTEXT_BYTES：diff 上下文读取字节上限；MAX_SETTINGS_FILE_BYTES：设置文件体积上限；DIFF_CONTEXT_LINES_BEFORE：diff 上下文前几行（同一声明共 4 个绑定）。
 */
var MAX_DIFF_CONTEXT_BYTES = 8192;
var MAX_SETTINGS_FILE_BYTES = 10485760;
var DIFF_CONTEXT_LINES_BEFORE = 10;
var DIFF_CONTEXT_LINES_AFTER = 13;
//@ chunk-6zvepy0r.js:18609-18733 placement
/**
 * 打开文件并读取指定行附近的上下文，用于拒绝时显示 diff。
 */
async function readRejectionContext(filePath, needle, contextLines = 3) {
  let handle = await openForDiff(filePath);
  if (handle === null) return null;
  try {
    return await scanForContext(handle, needle, contextLines);
  } finally {
    await handle.close();
  }
}
//@ chunk-6zvepy0r.js:18733-18882 placement
/**
 * 为显示 diff 打开文件（跳过特殊路径与含空字节的路径，不存在返回 null）。
 */
async function openForDiff(e) {
  if (isNonWslUncPath(e) || isNetworkOrSpecialPath(e)) return null;
  if (e.includes("\x00")) return null;
  try {
    return await open(e, "r");
  } catch (error) {
    if (isENOENT(error)) return null;
    throw error;
  }
}
export {
  openForDiff,
  pruneReviewEntriesBefore,
  settingsSourceForPathByPriority,
  PROPOSED_FILE_INFIX,
  describeSettingsChange,
  discardSettingsProposal,
  acceptSettingsProposal,
  stripBomAndCarriageReturns,
  REVIEW_STORE_VERSION,
  DIFF_CONTEXT_LINES_BEFORE,
  MAX_DIFF_CONTEXT_BYTES,
  MAX_SETTINGS_FILE_BYTES,
  DIFF_CONTEXT_LINES_AFTER,
  settingsWriteGateText,
  readRejectionContext,
  settingsNotAppliedMessage,
  checkSettingsWrite,
  stageSettingsWrite,
  settingsWriteRoute,
};
