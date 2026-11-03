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
import { join, join as join_2, dirname, basename } from "path";
import { homedir } from "os";
import { randomBytes } from "crypto";
import { lstat, unlink, open, open as open_2, stat, readdir, realpath } from "fs/promises";
import { constants } from "fs";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, o, U, T, A, pe, oe } from "../../../vendor/zod/v4/classic/schemas.js";
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
import { readFileChecked, Cj } from "../fileRead.js";
import { pinWriteTarget } from "../fsSafety/pathRevalidation.js";
import {
  SymlinkWriteRefusedError,
  stagingPathFor,
  verifyStagingDir,
  HardLinkWriteRefusedError,
  StagingDirTamperedError,
} from "../fsSafety/atomicWriteStaging.js";
import { ATOMIC_WRITE_DIRNAME, AI, shouldWriteInPlace } from "../plugins/safeCopy.js";
import { computeContentHash } from "../commitAttribution.js";
import { detectLineEndingsForString, writeFileAtomic } from "../file.js";
import { writeNewFile, retryFsOp } from "../atomicPublishWrite.js";
import { eOt } from "../../cli/headlessCloud/attachServe.js";
import { logForDebugging } from "../debug.js";
import { logError } from "../log.js";
import { settingsChangeDetector } from "./changeDetector.js";
import { getPlatform } from "../platform.js";
import { jsonParse, jsonStringify } from "../slowOperations.js";
import { isDesktopTopSession } from "../entrypointKinds.js";
import { Pmi, isHostAttestedWrite } from "../../components/permissions/hooks.js";
import { isHeadlessHostSession } from "../sessionShape.js";
import { foldPathSegments } from "../plugins/pluginCachePaths.js";
import { expandPath } from "../path.js";
import { managedFileSettingsDirs } from "./managedFileSettings.js";
import { Mne } from "./mdm/settings.js";
import { getSessionId } from "../../bootstrap/state.js";
import { logFeatureBad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { scanForContext } from "../readEditContext.js";
import { ai, n_ } from "../networkPaths.js";

//@ chunk-6zvepy0r.js:6076-6157 placement
function Dq(e) {
  return (e.startsWith("\uFEFF") ? e.slice(1) : e).replaceAll(
    `\r
`,
    `
`,
  );
}
/**
 * 设置审阅暂存的常量与结构：存储版本、条目上限、提议内容大小上限、临时提议文件名、过期时间、来源遥测名，以及条目与存储的 schema。
 */
//@ chunk-6zvepy0r.js:6157-6663 placement
var REVIEW_STORE_VERSION = 1,
  MAX_REVIEW_ENTRIES = 64,
  MAX_PROPOSED_BYTES = 1048576,
  PROPOSED_FILE_INFIX = ".proposed-",
  PROPOSED_SUFFIX_PATTERN = /^[0-9a-f]{8}$/,
  STALE_PROPOSAL_MS = 900000,
  SOURCE_TELEMETRY_NAMES = {
    userSettings: "user_settings",
    projectSettings: "project_settings",
    localSettings: "local_settings",
    flagSettings: "policy_settings",
    policySettings: "policy_settings",
  },
  REVIEW_ENTRY_SCHEMA = DoctorLazy(() =>
    u({
      id: o().min(1),
      path: o().min(1),
      resolvedPath: o().min(1),
      baseSha256: o().nullable(),
      proposedSha256: o(),
      proposedContent: o(),
      stagedAt: o(),
      by: u({ tool: U(["Write", "Edit"]), origin: U(["local", "served"]), sessionId: o() }),
    }),
  ),
  REVIEW_STORE_SCHEMA = DoctorLazy(() =>
    u({ version: T(REVIEW_STORE_VERSION), entries: A(REVIEW_ENTRY_SCHEMA()) }),
  );
//@ chunk-6zvepy0r.js:6663-6733 placement
function ce() {
  return join_2(homedir(), ".claude", "state", "settings-review.json");
}
//@ chunk-6zvepy0r.js:6780-6870 placement
function J(e) {
  let n = normalizeCaseForComparison(e);
  return SETTING_SOURCES_BY_PRIORITY.find((r) => {
    let i = getSettingsFilePathForSource(r);
    return i !== void 0 && normalizeCaseForComparison(i) === n;
  });
}
//@ chunk-6zvepy0r.js:6870-6947 placement
async function ke(e) {
  let n;
  try {
    n = await resolveSettingsWriteTarget(e);
  } catch {
    return J(e);
  }
  return settingsSourceForPath(e, n);
}
//@ chunk-6zvepy0r.js:6947-7118 placement
async function settingsSourceForPath(e, n) {
  let r = J(e);
  if (r !== void 0) return r;
  let i = normalizeCaseForComparison(n);
  for (let s of SETTING_SOURCES_BY_PRIORITY) {
    let f = getSettingsFilePathForSource(s);
    if (f === void 0) continue;
    try {
      if (normalizeCaseForComparison(await resolveSettingsWriteTarget(f)) === i) return s;
    } catch {}
  }
  return;
}
//@ chunk-6zvepy0r.js:7118-7266 placement
function decodedFileText(e) {
  let startsWith = e.content.startsWith("\uFEFF");
  return {
    text: startsWith ? e.content.slice(1) : e.content,
    encoding: e.encoding,
    bom: startsWith,
    lineEndings: e.lineEndings,
  };
}
//@ chunk-6zvepy0r.js:7266-9588 placement
function settingsReviewStore(e) {
  return {
    readStore: async () => {
      try {
        return await getFileReader().read(ce());
      } catch (error) {
        if (isENOENT(error)) return;
        throw error;
      }
    },
    writeStore: async (n) => {
      let r = ce();
      (await getFileReader().mkdir(dirname(r), 448), await getFileReader().atomicWrite(r, n, 384));
    },
    deleteStore: async () => {
      try {
        await getFileReader().delete(ce());
      } catch (error) {
        if (!isENOENT(error)) throw error;
      }
    },
    readTarget: async (n) => {
      try {
        return decodedFileText(
          await readFileChecked(await resolveSettingsWritePath(n), MAX_SETTINGS_JSON_BYTES),
        ).text;
      } catch (error) {
        if (isENOENT(error)) return null;
        throw error;
      }
    },
    writeTarget: async ({
      path: path,
      resolvedPath: resolvedPath,
      baseSha256: baseSha256,
      content: content,
      blockedOnceWritten: blockedOnceWritten,
    }) => {
      let h;
      try {
        h = await pinWriteTarget(resolvedPath, [resolvedPath], { createParents: !0 });
      } catch (error) {
        if (error instanceof SymlinkWriteRefusedError) return "redirected";
        throw error;
      }
      let S = basename(resolvedPath),
        w = `${PROPOSED_FILE_INFIX}${randomBytes(4).toString("hex")}`,
        y = join_2(dirname(resolvedPath), ATOMIC_WRITE_DIRNAME),
        b = join_2(dirname(h.ioPath), `${S}${w}`),
        P = !1;
      try {
        b = stagingPathFor(y, h.ioPath, w, !1);
        let x = dirname(b) !== dirname(h.ioPath);
        await cleanupStaleProposals(dirname(b), S);
        let v = async () => {
            let H;
            try {
              H = await h.readExisting(MAX_SETTINGS_JSON_BYTES);
            } catch (error) {
              if (Cj(error)) return "changed";
              throw error;
            }
            let B = H === null ? null : decodedFileText(H);
            return (B === null ? null : computeContentHash(B.text)) === baseSha256 ? B : "changed";
          },
          E = await v();
        if (E === "changed") return "changed";
        let O = E?.encoding ?? "utf8",
          D = (E?.bom ? "\uFEFF" : "") + detectLineEndingsForString(content, E?.lineEndings ?? "LF"),
          buffer = Buffer.from(D, O);
        (await writeNewFile(b, buffer, 384), (P = !0));
        let L = x ? b : join_2(dirname(resolvedPath), `${S}${w}`);
        if (await blockedOnceWritten(L)) return "blocked";
        if ((await v()) === "changed") return "changed";
        let R = await verifyStagedFile(b, L, buffer);
        if (R === null) return "tampered";
        await h.recheckBeforeWrite();
        let N = await lstat(b).catch(() => null);
        if (N === null || N.isSymbolicLink() || N.ino !== R.ino || N.dev !== R.dev) return "tampered";
        if (x) verifyStagingDir(y);
        try {
          (await retryFsOp(b, h.ioPath), (P = !1));
        } catch (error) {
          if (!AI.has(getErrnoCode(error) ?? "")) throw error;
          await writeFileAtomic(h.ioPath, D, { encoding: O, stagingDir: y, refuseHardLinkedInPlace: !0 });
        }
        let W = await settingsSourceForPath(path, resolvedPath),
          G = W === void 0 ? void 0 : getSettingsFilePathForSource(W);
        if (G !== void 0) eOt(G);
        return "written";
      } catch (error) {
        if (error instanceof HardLinkWriteRefusedError) return "hard_linked";
        if (error instanceof SymlinkWriteRefusedError) return "redirected";
        if (error instanceof StagingDirTamperedError) return "tampered";
        throw error;
      } finally {
        if (P)
          await unlink(b).catch((x) => {
            logForDebugging(
              `settings review store: could not remove the proposal sibling (${errorMessage(x)}); the next accept of this file sweeps it`,
              { level: "warn" },
            );
          });
        await h.close();
      }
    },
    locate: resolveSettingsWriteTarget,
    isSettingsFile: async (n) =>
      isClaudeSettingsPath(n) || (isJsonSpelling(n) && isManagedSettingsDropInPath(n, await ie())),
    configChangeBlocked: async (n, r, i) => {
      let s = await settingsSourceForPath(n, r);
      if (s === void 0) return !1;
      if (e?.configChangeHookGate === void 0)
        return (logError(Error("settings review store: ConfigChange hook gate not wired")), !0);
      return e.configChangeHookGate(SOURCE_TELEMETRY_NAMES[s], i);
    },
    afterApplied: async (n, r) => {
      let i = await settingsSourceForPath(n, r);
      if (i !== void 0) settingsChangeDetector.notifyChange(i);
    },
    now: () => new Date(),
  };
}
/**
 * 校验暂存的提议文件：不是链接、普通文件且只有一个硬链接、内容哈希与提议一致、与目标路径是同一 inode，通过时返回 dev/ino。
 */
//@ chunk-6zvepy0r.js:9588-9974 placement
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
      return h.dev === stats.dev && h.ino === stats.ino ? { dev: stats.dev, ino: stats.ino } : null;
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
  let i = `${n}${PROPOSED_FILE_INFIX}`,
    s = Date.now() - STALE_PROPOSAL_MS;
  for (let f of r) {
    if (!f.startsWith(i) || !PROPOSED_SUFFIX_PATTERN.test(f.slice(i.length))) continue;
    try {
      if ((await lstat(join_2(e, f))).mtimeMs < s) await unlink(join_2(e, f));
    } catch {}
  }
}
//@ chunk-6zvepy0r.js:10335-10378 affinity
async function resolveSettingsWriteTarget(e) {
  return realpathAllowMissing(await resolveSettingsWritePath(e));
}
//@ chunk-6zvepy0r.js:10378-10490 placement
async function realpathAllowMissing(e) {
  try {
    return await realpath(e);
  } catch (error) {
    if (!isENOENT(error) || dirname(e) === e) throw error;
    return join_2(await realpathAllowMissing(dirname(e)), basename(e));
  }
}
//@ chunk-6zvepy0r.js:10490-10525 placement
async function ie() {
  return managedDropInDirSpellingsAsync(realpathAllowMissing);
}
//@ chunk-6zvepy0r.js:10525-10700 placement
async function readReviewEntries(e) {
  let store = await e.readStore();
  if (store === void 0) return [];
  let r;
  try {
    r = jsonParse(store);
  } catch {
    r = void 0;
  }
  let safeParse = REVIEW_STORE_SCHEMA().safeParse(r);
  if (!safeParse.success) throw new ReviewStoreMalformedError();
  return safeParse.data.entries;
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
    jsonStringify({ version: REVIEW_STORE_VERSION, entries: e }, null, 2) +
      `
`,
  );
}
//@ chunk-6zvepy0r.js:11033-11734 placement
async function stageSettingsProposal(e, n = settingsReviewStore()) {
  let r = await readReviewEntries(n),
    target = await n.readTarget(e.path),
    s = Dq(e.proposedContent),
    f = {
      id: randomBytes(6).toString("hex"),
      path: e.path,
      resolvedPath: await n.locate(e.path),
      baseSha256: target === null ? null : computeContentHash(target),
      proposedSha256: computeContentHash(s),
      proposedContent: s,
      stagedAt: n.now().toISOString(),
      by: e.by,
    },
    h = normalizeCaseForComparison(f.path),
    S = normalizeCaseForComparison(f.resolvedPath),
    w = [
      ...r.filter(
        (b) => normalizeCaseForComparison(b.path) !== h && normalizeCaseForComparison(b.resolvedPath) !== S,
      ),
      f,
    ],
    y = 0;
  while (w.length > MAX_REVIEW_ENTRIES || jsonStringify(w).length > MAX_PROPOSED_BYTES) {
    let index = w.findIndex((P) => P !== f && P.by.sessionId === f.by.sessionId);
    if (index === -1) throw Error("settings review store: no room, proposal not staged");
    (w.splice(index, 1), y++);
  }
  if (y > 0)
    logForDebugging(`settings review store: full, dropped the ${y} oldest pending proposal(s)`, {
      level: "warn",
    });
  return (await writeReviewEntries(w, n), f);
}
//@ chunk-6zvepy0r.js:11734-12739 placement
async function acceptSettingsProposal(e, n = settingsReviewStore()) {
  let found = (await readReviewEntries(n)).find((S) => S.id === e.id);
  if (found === void 0 || !(await isSettingsEntry(found, n))) return "gone";
  if (
    jsonStringify(found) !== jsonStringify(e) ||
    computeContentHash(found.proposedContent) !== found.proposedSha256
  )
    return "stale";
  if ((await n.locate(found.path)) !== found.resolvedPath) return "redirected";
  let target = await n.readTarget(found.resolvedPath);
  if ((target === null ? null : computeContentHash(target)) !== found.baseSha256) return "conflict";
  let h;
  try {
    h = await n.writeTarget({
      path: found.path,
      resolvedPath: found.resolvedPath,
      baseSha256: found.baseSha256,
      content: found.proposedContent,
      blockedOnceWritten: (S) => n.configChangeBlocked(found.path, found.resolvedPath, S),
    });
  } catch (error) {
    let w = getErrnoCode(error);
    if (w === "EACCES" || w === "EPERM" || w === "EROFS" || w === "EBUSY") return "not_writable";
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
  await n.afterApplied(found.path, found.resolvedPath);
  try {
    let S = await readReviewEntries(n);
    await writeReviewEntries(
      S.filter((w) => w.id !== found.id),
      n,
    );
  } catch (error) {
    logForDebugging(
      `settings review store: applied, but the store could not be updated (${errorMessage(error)})`,
      { level: "warn" },
    );
  }
  return "applied";
}
/**
 * 从审阅存储中删除一条暂存的设置提议，返回是否删除。
 */
//@ chunk-6zvepy0r.js:12739-12867 placement
async function discardSettingsProposal(e, n = settingsReviewStore()) {
  let r = await readReviewEntries(n),
    filtered = r.filter((s) => s.id !== e);
  if (filtered.length === r.length) return !1;
  return (await writeReviewEntries(filtered, n), !0);
}
/**
 * 只保留在给定时间之后暂存的设置提议，返回删除的条数。
 */
//@ chunk-6zvepy0r.js:12867-13105 placement
async function pruneReviewEntriesBefore(e, n = settingsReviewStore()) {
  let r = await readReviewEntries(n),
    time = n.now().getTime(),
    filtered = r.filter((f) => {
      let parse = Date.parse(f.stagedAt);
      return Number.isFinite(parse) && parse >= e.getTime() && parse <= time;
    });
  if (filtered.length !== r.length || r.length === 0) await writeReviewEntries(filtered, n);
  return r.length - filtered.length;
}
/**
 * 比较设置文件新旧内容的顶层键，列出新增、删除、修改的键；新内容非 JSON 或替换了非 JSON 文件时给出相应说明。
 */
//@ chunk-6zvepy0r.js:13105-13564 placement
function describeSettingsChange(e, n) {
  let r = (h) => {
      if (h === null) return {};
      try {
        let safeParse = pe(o(), oe()).safeParse(jsonParse(Dq(h)));
        return safeParse.success ? safeParse.data : void 0;
      } catch {
        return;
      }
    },
    i = r(e),
    s = r(n);
  if (s === void 0) return ["not valid JSON"];
  if (i === void 0) return ["replaces a file that was not valid JSON"];
  let f = [];
  for (let h of new Set([...Object.keys(i), ...Object.keys(s)]))
    if (!(h in i)) f.push(`adds ${h}`);
    else if (!(h in s)) f.push(`removes ${h}`);
    else if (jsonStringify(i[h]) !== jsonStringify(s[h])) f.push(`changes ${h}`);
  return f;
}
//@ chunk-6zvepy0r.js:13564-13622 placement
function Ze({ session: session, served: served }) {
  return !served && isDesktopTopSession() && Pmi(session);
}
/**
 * 决定未获批准的设置写入走哪条路：卡片确认、云端不适用或稍后审阅。
 */
//@ chunk-6zvepy0r.js:13622-13768 placement
function settingsWriteRoute({ session: session, served: served, cause: cause }) {
  if (cause !== "unapproved") return cause;
  if (Ze({ session: session, served: served })) return "card";
  return !served && isHeadlessHostSession() ? "cloud" : "review";
}
//@ chunk-6zvepy0r.js:13768-15740 placement
function settingsNotAppliedMessage(e, n) {
  switch (n) {
    case "card":
      return `Not applied: ${e} was NOT modified. In the Claude desktop app, a change to a Claude Code settings file applies only when the user approves that edit on its permission card. Tell the user what you meant to change. Do not retry the edit or try to make the same change another way.`;
    case "cloud":
      return `Not applied: ${e} was NOT modified. A change to a Claude Code settings file applies only when a person approves it at the computer that Claude Code runs on, and a cloud session cannot take that approval. Approving the edit in this session does not apply it. The /settings-review command does not run in a cloud session, and on another computer it would not list this change. Tell the user what you meant to change. If the file is committed to a repository, the user can make the change themselves outside this session and push it. Do not retry the edit or try to make the same change another way.`;
    case "linked":
      return `Not applied: ${e} was NOT modified. The user approved this edit on its permission card, but this path reaches a Claude Code settings file through a symbolic link, so the approval does not apply it. Tell the user what you meant to change. Do not retry the edit or try to make the same change another way.`;
    case "policy":
      return `Not applied: ${e} was NOT modified. The user approved this edit on its permission card, but this path is, or may be, a managed policy settings file or the --settings file, so the approval does not apply it. Tell the user what you meant to change. Do not retry the edit or try to make the same change another way.`;
    case "review":
      return `Staged for review: ${e} was NOT modified. Changes to Claude Code settings files made without the owner of this computer approving them in person are held for their review; the owner applies or discards them with /settings-review, and the change takes effect only if they accept it. Do not retry the edit or try to make the same change another way.`;
  }
}
/**
 * 托管设置目录无法解析时拒绝写设置文件的错误，提示模型不要重试或换方式修改。
 */
//@ chunk-6zvepy0r.js:15740-16161 placement
class ManagedDirUnresolvedError extends TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS {
  constructor(e) {
    super(
      `Not written: ${e} was NOT modified. Claude Code could not resolve where its managed settings folder is, so it cannot rule out that this path is a managed settings file, and it does not write the file. Tell the user what you meant to change. Do not retry the edit or try to make the same change another way.`,
      "settings write refused: a managed drop-in directory did not resolve",
    );
  }
}
//@ chunk-6zvepy0r.js:16161-16392 placement
var STAGED_FOR_REVIEW_TEXT =
    "Staged for your review \xB7 not applied until you accept it in /settings-review",
  CLOUD_NOT_APPLIED_TEXT =
    "Not applied \xB7 a cloud session can't apply Claude's edits to settings files \xB7 if you want this change, make it outside this session";
//@ chunk-6zvepy0r.js:16392-16433 placement
function P7n(e) {
  return e === "cloud" ? CLOUD_NOT_APPLIED_TEXT : STAGED_FOR_REVIEW_TEXT;
}
/**
 * 写文件前检查是否落在设置文件上：远程调用或未获批准时返回需审阅的路径与原因；托管目录不可解析时抛错；已覆盖的返回 undefined。
 */
//@ chunk-6zvepy0r.js:16433-17009 placement
async function checkSettingsWrite(context, spellings, file) {
  let isServed = context.remoteCall !== void 0;
  if (!shouldWriteInPlace({ served: isServed })) return;
  if (isServed) {
    let { settingsSpellings: settingsSpellings, unclassified: unclassified } =
        await classifySettingsPaths(spellings),
      [P] = settingsSpellings;
    if (P !== void 0) return { path: P, cause: "unapproved" };
    if (unclassified !== void 0) throw new ManagedDirUnresolvedError(file.absolutePath);
    return;
  }
  if (context.permissionSurface !== void 0) return;
  let {
      settingsSpellings: settingsSpellings,
      unclassified: unclassified,
      dropIns: dropIns,
    } = await classifySettingsPaths(spellings),
    [S] = settingsSpellings;
  if (S === void 0) {
    if (unclassified !== void 0) throw new ManagedDirUnresolvedError(file.absolutePath);
    return;
  }
  if (!isHostAttestedWrite(context.session, context.toolUseId, file)) return { path: S, cause: "unapproved" };
  let w = await settingsWriteCoverage(
    file.absolutePath,
    spellings,
    settingsSpellings,
    dropIns ?? (await ie()),
  );
  return w === "covered" ? void 0 : { path: S, cause: w };
}
//@ chunk-6zvepy0r.js:17009-17204 placement
async function classifySettingsPaths(e) {
  let n = e.some(isJsonSpelling) ? await ie() : void 0;
  return {
    settingsSpellings: e.filter(
      (r) => isClaudeSettingsPath(r) || (n !== void 0 && isManagedSettingsDropInPath(r, n)),
    ),
    unclassified: n === void 0 || n.allResolved ? void 0 : e.find(isJsonSpelling),
    dropIns: n,
  };
}
//@ chunk-6zvepy0r.js:17204-17483 placement
async function settingsWriteCoverage(e, n, r, i) {
  if (!r.includes(e)) return "linked";
  let filtered = n.filter((h) => h !== e);
  if (await touchesManagedSettings(n, i)) return filtered.length === 0 ? "policy" : "linked";
  if (filtered.length === 0) return "covered";
  let f = J(e);
  if (f === void 0) return "linked";
  for (let h of filtered) if ((await ke(h)) !== f) return "linked";
  return "covered";
}
//@ chunk-6zvepy0r.js:17483-17762 placement
async function touchesManagedSettings(e, n) {
  if (!n.allResolved || !n.allLocated) return !0;
  let r = new Set();
  for (let i of managedSettingsFiles()) {
    r.add(foldPathSegments(i));
    try {
      r.add(foldPathSegments(await resolveSettingsWriteTarget(i)));
    } catch {
      return !0;
    }
  }
  for (let i of e) {
    let s;
    try {
      s = await resolveSettingsWriteTarget(i);
    } catch {
      return !0;
    }
    if (
      isManagedSettingsDropInPath(i, n) ||
      isManagedSettingsDropInPath(s, n) ||
      r.has(foldPathSegments(expandPath(i))) ||
      r.has(foldPathSegments(s))
    )
      return !0;
  }
  return !1;
}
//@ chunk-6zvepy0r.js:17762-17884 placement
function managedSettingsFiles() {
  let e = getSettingsFilePathForSource("flagSettings");
  return [
    ...managedFileSettingsDirs(Mne()).map((n) => join(n, "managed-settings.json")),
    ...(e === void 0 ? [] : [e]),
  ];
}
//@ chunk-6zvepy0r.js:17884-18536 placement
async function stageSettingsWrite(e) {
  let n = e.writeCtx.remoteCall === void 0 ? "local" : "served",
    r;
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
    throw (
      logFeatureBad("settings_quarantine", "stage_failed"),
      new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `Could not stage this change to a Claude Code settings file for the owner's review, so nothing was written. (${errorMessage(error)})`,
        "settings review store: stage failed",
      )
    );
  }
  return (
    logEvent("tengu_settings_change_staged", {
      origin: fromEnum(n),
      tool: fromEnum(e.tool),
      source_kind: fromEnum(J(e.absolutePath) ?? "other"),
      key_count: describeSettingsChange(e.currentContent, e.proposedContent).length,
    }),
    logFeatureOk("settings_quarantine"),
    r
  );
}
//@ chunk-6zvepy0r.js:18572-18609 placement
var ee = 8192,
  rnt = 10485760,
  ae = 10,
  st = 13;
/**
 * 打开文件并读取指定行附近的上下文，用于拒绝时显示 diff。
 */
//@ chunk-6zvepy0r.js:18609-18733 placement
async function readRejectionContext(e, n, r = 3) {
  let i = await openForDiff(e);
  if (i === null) return null;
  try {
    return await scanForContext(i, n, r);
  } finally {
    await i.close();
  }
}
/**
 * 为显示 diff 打开文件（跳过特殊路径与含空字节的路径，不存在返回 null）。
 */
//@ chunk-6zvepy0r.js:18733-18882 placement
async function openForDiff(e) {
  if (ai(e) || n_(e)) return null;
  if (e.includes("\x00")) return null;
  try {
    return await open_2(e, "r");
  } catch (error) {
    if (isENOENT(error)) return null;
    throw error;
  }
}

export {
  openForDiff,
  pruneReviewEntriesBefore,
  J,
  PROPOSED_FILE_INFIX,
  describeSettingsChange,
  discardSettingsProposal,
  acceptSettingsProposal,
  Dq,
  REVIEW_STORE_VERSION,
  ae,
  ee,
  rnt,
  st,
  P7n,
  readRejectionContext,
  settingsNotAppliedMessage,
  checkSettingsWrite,
  stageSettingsWrite,
  settingsWriteRoute,
};
