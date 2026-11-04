/**
 * services/artifacts/handoverRead.ts
 *
 * 2.1.316 新增。描述 artifact 交接来源；本模块负责交接读取的覆盖检查与副本管理。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-q84dhc5d.js (30)
 * attribution: placement 30
 */
import { createHash } from "crypto";
import { unlink, stat, readFile } from "fs/promises";
import { observedWithoutSource, observationStamp } from "./readObservation.js";
import { getDefaultFileReadingLimits } from "../../tools/FileReadTool/limits.js";
import { roughTokenCountEstimationForFileType } from "../tokenEstimation.js";
import { plural } from "../../utils/stringUtils.js";
import { strippedAuthorBody, StripUnsettledError } from "./pagePreparation.js";
import { expandPath } from "../../utils/path.js";
import { isDiskless } from "../../bootstrap/state.js";
import { reportOnce } from "../../utils/reportOnce.js";
import { getFileModificationTimeAsync } from "../../utils/file.js";
import { getLiveState, replicaKey } from "../liveReplica/liveReplica.js";
import { isENOENT } from "../../utils/errors.js";
import { forgetSavedFilePath } from "../../utils/mcpOutputStorage.js";
import { logFeatureSad, logFeatureOk } from "../analytics/featureTelemetry.js";
import { logError } from "../../utils/log.js";
import { compareNumericPrefix } from "../../utils/textNormalize.js";

//@ chunk-q84dhc5d.js:806-897 placement
function versionHeldBy(artifactReadObservation, version, agentId) {
  return (
    artifactReadObservation.ver === version &&
    (artifactReadObservation.observers === undefined ||
      Object.hasOwn(artifactReadObservation.observers, agentId))
  );
}
//@ chunk-q84dhc5d.js:897-1000 placement
function isVersionHeldWithSource(agentId, slug, ver) {
  return (
    versionHeldBy(agentId.getArtifactReadObservation(slug), ver, agentId.agentId ?? "main") &&
    !observedWithoutSource(agentId.agentId, slug, ver)
  );
}
//@ chunk-q84dhc5d.js:1000-1070 placement (2.1.88 match: validateContentTokens, 0.63)
/**
 * 取有效的 Read token 上限：调用上下文的 fileReadingLimits.maxTokens，否则默认值。
 */
function readableLineChars(context) {
  return context.fileReadingLimits?.maxTokens ?? getDefaultFileReadingLimits().maxTokens;
}
//@ chunk-q84dhc5d.js:1070-1306 placement
function sourceShape(html, context) {
  let chars = readableLineChars(context);
  let out = [];
  let count = 0;
  let index = 0;
  while (index <= html.length) {
    let index_2 = html.indexOf(
      `
`,
      index,
    );
    let end = index_2 === -1 ? html.length : index_2;
    count++;
    if (roughTokenCountEstimationForFileType(html.slice(index, end), "html") > chars / 4)
      out.push({
        line: count,
        start: index,
        end,
      });
    index = end + 1;
  }
  return {
    lines: count,
    unterminated: !html.endsWith(`
`),
    overlong: out,
  };
}
//@ chunk-q84dhc5d.js:1306-1323 placement
var MAX_LISTED_ITEMS = 3;
var MAX_OTHER_ITEMS = 8;
var MAX_OVERLONG_LINES = 32;
//@ chunk-q84dhc5d.js:1323-2865 placement
/**
 * 描述 artifact 交接来源；本模块负责交接读取的覆盖检查与副本管理。
 */
function describeHandoverSource({ html, ver, shape, sent, recorded, lineCount = true }) {
  let formatNum = (value) => value.toLocaleString("en-US");
  let lines = shape.unterminated ? shape.lines : shape.lines - 1;
  let headline = `version ${ver}: ${formatNum(Buffer.byteLength(html))} bytes${lineCount ? `, ${formatNum(lines)} ${plural(lines, "line")}` : ""}`;
  if (shape.overlong.length === 0)
    return `${headline}, ${lineCount ? "each" : "every line"} short enough to Read with offset/limit`;
  let html_2 = (
    sent !== undefined && shape.overlong.length <= MAX_OVERLONG_LINES ? sent : undefined
  )?.replace(
    /\r\n/g,
    `
`,
  );
  let stripped;
  try {
    stripped = html_2 === undefined ? undefined : strippedAuthorBody(html_2);
  } catch (error) {
    if (!(error instanceof StripUnsettledError)) throw error;
  }
  let sentLines =
    html_2 === undefined
      ? undefined
      : new Set([
          ...html_2.split(`
`),
          ...(stripped?.split(`
`) ?? []),
        ]);
  let mapped = shape.overlong.map((line) => {
    let replaced = html.slice(line.start, line.end).replace(/\r$/, "");
    let verdict = sentLines === undefined ? undefined : sentLines.has(replaced) ? "same" : "differs";
    return {
      line: line.line,
      chars: line.end - line.start,
      verdict,
    };
  });
  let sliced = mapped.slice(0, MAX_LISTED_ITEMS);
  let sliced_2 = mapped.slice(MAX_LISTED_ITEMS);
  let restCount = sliced_2.length;
  let filtered = sliced_2.filter((line) => line.verdict === "differs");
  let allSame = restCount > 0 && sliced_2.every((line) => line.verdict === "same");
  let mapped_2 = filtered.slice(0, MAX_OTHER_ITEMS).map((line) => formatNum(line.line));
  let moreCount = filtered.length - mapped_2.length;
  let diffSummary =
    filtered.length === 0
      ? allSame
        ? ", none differing from what you sent"
        : ""
      : `, of which ${plural(filtered.length, "line")} ${mapped_2.join(", ")}${moreCount > 0 ? ` and ${formatNum(moreCount)} more` : ""} ${filtered.length === 1 ? "differs" : "differ"} from what you sent`;
  let describeLine = (line) =>
    `line ${formatNum(line.line)} (${formatNum(line.chars)} characters${line.verdict === "differs" ? ", which differs from the content you sent" : line.verdict === "same" ? ", identical to a line you sent" : ""})`;
  return (
    `${headline}; a single Read may not return ${sliced.map(describeLine).join(", or ")}${restCount > 0 ? `, or ${formatNum(restCount)} more such ${plural(restCount, "line")}${diffSummary}` : ""}` +
    (recorded
      ? " \u2014 no whole Read of it is needed: Read the lines you need with offset/limit, and take those long lines from the saved file, never from your own copy"
      : "")
  );
}
//@ chunk-q84dhc5d.js:2865-4099 placement
async function registerHandoverRead(
  { filepath, persistId, html, slug, ver, confirmsResend, batch, heldSkipsRead },
  context,
) {
  let agentId = context.agentId ?? "main";
  let { lines, overlong } = sourceShape(html, context);
  let noOverlong = overlong.length === 0;
  let heldVersion = isVersionHeldWithSource(context, slug, ver);
  let heldKind = heldVersion && heldSkipsRead ? "held" : "unverifiable";
  let absPath = expandPath(filepath);
  let mtimeMs;
  if (isDiskless()) reportOnce("handover_read");
  else
    mtimeMs = await getFileModificationTimeAsync(absPath).catch(() => {
      return;
    });
  if (mtimeMs === undefined) return heldKind === "held" ? "held" : "unexaminable";
  let contentHash = createHash("sha256").update(html).digest("hex");
  let pendingHandoverReads = getLiveState().pendingHandoverReads;
  let pending = pendingHandoverReads.get(absPath);
  let match =
    pending !== undefined &&
    pending.slug === slug &&
    pending.ver === ver &&
    pending.contentHash === contentHash
      ? pending
      : undefined;
  if (match !== undefined) match.mtimeMs = mtimeMs;
  if (!noOverlong) return heldKind;
  let verification = heldVersion && heldSkipsRead;
  if (match !== undefined) {
    match.handedTo.add(agentId);
    if (verification) {
      match.completedBy.add(agentId);
      return "held";
    }
    if (confirmsResend) match.confirmsResendFor.set(agentId, batch ?? "");
    else match.confirmsResendFor.delete(agentId);
    match.completedBy.delete(agentId);
    return match.unrecordableBy.has(agentId) ? "unverifiable" : "pending";
  }
  let carriedUnrecordable = new Set();
  for (let [key, record] of pendingHandoverReads)
    if (record.slug === slug) {
      for (let agentId of record.unrecordableBy) carriedUnrecordable.add(agentId);
      pendingHandoverReads.delete(key);
    }
  let unterminated = !html.endsWith(`
`);
  pendingHandoverReads.set(absPath, {
    slug,
    ver,
    mtimeMs,
    totalLines: lines,
    unterminated,
    contentHash,
    bytes: Buffer.byteLength(html),
    requiredLines: unterminated ? lines : lines - 1,
    linesReturned: new Map(),
    linesPrepared: new Map(),
    completedBy: new Set(verification ? [agentId] : []),
    handedTo: new Set([agentId]),
    unrecordableBy: carriedUnrecordable,
    persistId,
    confirmsResendFor: new Map(confirmsResend ? [[agentId, batch ?? ""]] : []),
  });
  return verification ? "held" : carriedUnrecordable.has(agentId) ? "unverifiable" : "pending";
}
//@ chunk-q84dhc5d.js:4099-4366 placement
async function handoverPersistTarget(ver, ver_2, artifactPersistId) {
  for (let [path, entry] of getLiveState().pendingHandoverReads)
    if (entry.slug === ver && entry.ver === ver_2) {
      let mtime = await getFileModificationTimeAsync(path).catch(() => {
        return;
      });
      return mtime !== undefined && mtime !== entry.mtimeMs
        ? {
            persistId: `${artifactPersistId}-${Date.now().toString(36)}`,
            editedCopy: path,
          }
        : {
            persistId: entry.persistId,
          };
    }
  return {
    persistId: artifactPersistId,
  };
}
//@ chunk-q84dhc5d.js:4366-4601 placement
async function refreshHandoverCopy(filepath, html) {
  let filePath = expandPath(filepath);
  let pendingHandoverReads = getLiveState().pendingHandoverReads;
  let item = pendingHandoverReads.get(filePath);
  if (item === undefined) return;
  if (createHash("sha256").update(html).digest("hex") !== item.contentHash) {
    pendingHandoverReads.delete(filePath);
    return;
  }
  let mtime = await getFileModificationTimeAsync(filePath).catch(() => {
    return;
  });
  if (mtime !== undefined) item.mtimeMs = mtime;
}
//@ chunk-q84dhc5d.js:4601-4786 placement
/**
 * 找待完成的交接读取
 */
function findPendingHandoverRead(context, slug, ver) {
  for (let [key, entry] of getLiveState().pendingHandoverReads)
    if (
      entry.slug === slug &&
      (ver === undefined || entry.ver === ver) &&
      entry.handedTo.has(context) &&
      !entry.completedBy.has(context) &&
      !entry.unrecordableBy.has(context)
    )
      return [key, entry];
  return;
}
//@ chunk-q84dhc5d.js:4786-4839 placement
function readPendingFor(agentId, slug, ver) {
  return findPendingHandoverRead(agentId ?? "main", slug, ver) !== undefined;
}
//@ chunk-q84dhc5d.js:4839-4970 placement
function findHandoverRead(context, slug, ver, ignoreHold = false) {
  let agentId = context.agentId ?? "main";
  let pendingHandoverRead = findPendingHandoverRead(agentId, slug, ver);
  if (pendingHandoverRead === undefined) return;
  let body = pendingHandoverRead[1];
  return isHandoverSuperseded(body, context) ||
    (!ignoreHold && isVersionHeldWithSource(context, slug, body.ver))
    ? undefined
    : pendingHandoverRead;
}
//@ chunk-q84dhc5d.js:4970-5076 placement
function handoverCoverage(context, slug, ver, { ignoreHold = false } = {}) {
  let handoverRead = findHandoverRead(context, slug, ver, ignoreHold);
  return handoverRead === undefined
    ? undefined
    : handoverCoverageOf(handoverRead[0], handoverRead[1], context.agentId);
}
//@ chunk-q84dhc5d.js:5076-5271 placement
async function checkedHandoverCoverage(context, slug, live) {
  let handoverRead = findHandoverRead(context, slug, live);
  if (handoverRead === undefined) return;
  let [path, readPath] = handoverRead;
  let result;
  try {
    result = (await getFileModificationTimeAsync(path)) === readPath.mtimeMs ? "intact" : "changed";
  } catch (error) {
    result = isENOENT(error) ? "changed" : "unknown";
  }
  return {
    ...handoverCoverageOf(path, readPath, context.agentId),
    file: result,
  };
}
//@ chunk-q84dhc5d.js:5271-5437 placement
/**
 * 交接读取覆盖情况
 */
function handoverCoverageOf(path, agentId, agentId_2) {
  return {
    path,
    slug: agentId.slug,
    ver: agentId.ver,
    lines: agentId.requiredLines,
    unterminated: agentId.unterminated,
    unread: getUncoveredLineRanges(
      agentId.linesReturned.get(agentId_2 ?? "main") ?? [],
      agentId.requiredLines,
    ),
  };
}
//@ chunk-q84dhc5d.js:5437-5536 placement
function handoverReadConfirmsResend(context, slug, live) {
  let handoverRead = findHandoverRead(context, slug, live);
  return (
    handoverRead !== undefined &&
    refusedBodyFor(handoverRead[1], context.agentId, context.agentId ?? "main") === undefined
  );
}
//@ chunk-q84dhc5d.js:5536-5615 placement
function vouchHandoverReadConfirmsResend(context, slug, live, response) {
  findHandoverRead(context, slug, live)?.[1].confirmsResendFor.set(context.agentId ?? "main", response);
}
//@ chunk-q84dhc5d.js:5615-5969 placement
function describeHandoverCoverage({ lines, unterminated, unread }) {
  let reduced = unread.reduce((acc, [start, end]) => acc + end - start + 1, 0);
  return (
    `${lines} ${plural(lines, "line")}` +
    (unterminated
      ? `; the last has no trailing newline, so \`wc -l\` reports ${lines - 1} \u2014 Read through line ${lines} and leave the file as it is`
      : "") +
    (reduced > 0 && reduced < lines
      ? `; you have not yet Read ${plural(reduced, "line")} ${unread.map(([start, end]) => (start === end ? `${start}` : `${start}-${end}`)).join(", ")}`
      : "")
  );
}
//@ chunk-q84dhc5d.js:5969-6046 placement
function handoverCoverageNote(context, slug, ver, options) {
  let coverage = handoverCoverage(context, slug, ver, options);
  return coverage === undefined ? "" : ` (${describeHandoverCoverage(coverage)})`;
}
//@ chunk-q84dhc5d.js:6046-6193 placement
function getUncoveredLineRanges(read, requiredLines) {
  let out = [];
  let cursor = 0;
  for (let [from, to] of mergeLineRanges(read)) {
    if (from > cursor) out.push([cursor + 1, Math.min(from, requiredLines)]);
    cursor = Math.max(cursor, to);
    if (cursor >= requiredLines) break;
  }
  if (cursor < requiredLines) out.push([cursor + 1, requiredLines]);
  return out;
}
//@ chunk-q84dhc5d.js:6193-6326 placement
async function discardHandoverCopy(filePath, savedFiles) {
  getLiveState().pendingHandoverReads.delete(expandPath(filePath));
  forgetSavedFilePath(savedFiles, filePath);
  if (isDiskless()) reportOnce("handover_discard");
  else await unlink(filePath).catch(() => {});
}
//@ chunk-q84dhc5d.js:6326-6391 placement
var EMPTY_HANDOVER_READ = {
  artifactRead: undefined,
  remaining: undefined,
  commit: () => {
    return;
  },
};
//@ chunk-q84dhc5d.js:6391-7811 placement
async function prepareHandoverRead(artifactKey, context, messageId, range) {
  try {
    let pendingHandoverReads = getLiveState().pendingHandoverReads;
    let pending = pendingHandoverReads.get(artifactKey);
    let agentId = context.agentId ?? "main";
    if (
      pending === undefined ||
      messageId === undefined ||
      range.lineCount <= 0 ||
      pending.completedBy.has(agentId)
    )
      return EMPTY_HANDOVER_READ;
    if (Math.floor(range.mtimeMs) !== pending.mtimeMs || range.totalLines !== pending.totalLines) {
      logFeatureSad("artifact_handover_read", "file_changed");
      return EMPTY_HANDOVER_READ;
    }
    if (dropSupersededHandover(pending, artifactKey, context)) return EMPTY_HANDOVER_READ;
    let requestedRange = [range.firstLine, range.firstLine + range.lineCount];
    let copyState = await checkHandoverCopy(artifactKey, pending.bytes, pending.contentHash);
    if (copyState === "changed") {
      pendingHandoverReads.delete(artifactKey);
      logFeatureSad("artifact_handover_read", "file_changed");
      return EMPTY_HANDOVER_READ;
    }
    if (copyState === "unreadable") logFeatureSad("artifact_handover_read", "file_unreadable");
    let copyHolds = copyState === "holds";
    let filtered = (pending.linesPrepared.get(agentId) ?? []).filter(
      (entry) => entry.messageId === messageId,
    );
    let covered = mergeLineRanges([
      ...(pending.linesReturned.get(agentId) ?? []),
      ...filtered.map((entry) => entry.range),
      requestedRange,
    ]);
    let coversAll = coversRequiredLines(covered, pending.requiredLines);
    let prepared = {
      messageId,
      range: requestedRange,
    };
    pending.linesPrepared.set(agentId, [...filtered, prepared]);
    let commit = () => {
      try {
        let preparedList = pending.linesPrepared.get(agentId) ?? [];
        if (
          pendingHandoverReads.get(artifactKey) !== pending ||
          pending.completedBy.has(agentId) ||
          !preparedList.includes(prepared)
        )
          return;
        let filtered = preparedList.filter((entry) => entry !== prepared);
        if (filtered.length > 0) pending.linesPrepared.set(agentId, filtered);
        else pending.linesPrepared.delete(agentId);
        let merged = mergeLineRanges([...(pending.linesReturned.get(agentId) ?? []), requestedRange]);
        if (!copyHolds || !coversRequiredLines(merged, pending.requiredLines)) {
          pending.linesReturned.set(agentId, merged);
          return;
        }
        pending.linesReturned.delete(agentId);
        pending.completedBy.add(agentId);
        return recordHandoverReadVersion(pending, artifactKey, context, messageId, agentId)
          ? {
              slug: pending.slug,
              ver: pending.ver,
            }
          : undefined;
      } catch (error) {
        logError(error);
        return;
      }
    };
    let recordable = !pending.unrecordableBy.has(agentId);
    let remaining =
      recordable &&
      pending.handedTo.has(agentId) &&
      !isVersionHeldWithSource(context, pending.slug, pending.ver);
    return {
      artifactRead:
        coversAll && copyHolds && recordable
          ? {
              slug: pending.slug,
              ver: pending.ver,
            }
          : undefined,
      remaining:
        coversAll || !remaining
          ? undefined
          : {
              ...handoverCoverageOf(artifactKey, pending, context.agentId),
              unread: getUncoveredLineRanges(covered, pending.requiredLines),
            },
      commit,
    };
  } catch (error) {
    logError(error);
    return EMPTY_HANDOVER_READ;
  }
}
//@ chunk-q84dhc5d.js:7811-7923 placement
function isHandoverSuperseded(context, slug) {
  let ver = slug.getArtifactReadObservation(context.slug).ver;
  return ver !== undefined && ver !== context.ver && (compareNumericPrefix(ver, context.ver) ?? 0) > 0;
}
//@ chunk-q84dhc5d.js:7923-8047 placement
function dropSupersededHandover(context, slug, ver) {
  if (isHandoverSuperseded(context, ver)) {
    getLiveState().pendingHandoverReads.delete(slug);
    logFeatureSad("artifact_handover_read", "superseded");
    return true;
  }
  return false;
}
//@ chunk-q84dhc5d.js:8047-8225 placement
/**
 * 合并重叠的行区间
 */
function mergeLineRanges(ranges) {
  let sorted = ranges.map((pair) => [pair[0], pair[1]]).sort((a, b) => a[0] - b[0]);
  let out = [];
  for (let range of sorted) {
    let last = out.at(-1);
    if (last !== undefined && range[0] <= last[1]) last[1] = Math.max(last[1], range[1]);
    else out.push(range);
  }
  return out;
}
//@ chunk-q84dhc5d.js:8225-8288 placement
function coversRequiredLines(range, requiredLines) {
  let start = range[0];
  return start !== undefined && start[0] <= 0 && start[1] >= requiredLines;
}
//@ chunk-q84dhc5d.js:8288-8439 placement
/**
 * 取被拒绝的发布正文记录
 */
function refusedBodyFor(refusal, agentId, slug) {
  let body = getLiveState().refusedPublishBodies.get(replicaKey(agentId, refusal.slug));
  let confirms = refusal.confirmsResendFor.get(slug);
  return confirms !== undefined && (body === undefined || body.batch !== confirms) ? undefined : body;
}
//@ chunk-q84dhc5d.js:8439-8836 placement
/**
 * 记录交接读取的版本
 */
function recordHandoverReadVersion(context, slug, ver, msgId, slug_2) {
  if (dropSupersededHandover(context, slug, ver)) return false;
  let body = refusedBodyFor(context, ver.agentId, slug_2);
  let observedFrom = body?.observedFrom;
  try {
    ver.setArtifactReadVersion(context.slug, context.ver, observationStamp(ver.agentId, msgId));
  } finally {
    if (body !== undefined)
      if (observedFrom === undefined) delete body.observedFrom;
      else body.observedFrom = observedFrom;
  }
  if (versionHeldBy(ver.getArtifactReadObservation(context.slug), context.ver, slug_2)) {
    logFeatureOk("artifact_handover_read");
    return true;
  }
  context.unrecordableBy.add(slug_2);
  logFeatureSad("artifact_handover_read", "seed_not_persisted");
  return false;
}
//@ chunk-q84dhc5d.js:8836-9005 placement
/**
 * 核对交接副本大小与哈希是否不变
 */
async function checkHandoverCopy(path, bytes, contentHash) {
  try {
    return (await stat(path)).size === bytes &&
      createHash("sha256")
        .update(await readFile(path))
        .digest("hex") === contentHash
      ? "holds"
      : "changed";
  } catch (error) {
    return isENOENT(error) ? "changed" : "unreadable";
  }
}
export {
  versionHeldBy,
  handoverPersistTarget,
  discardHandoverCopy,
  readableLineChars,
  refreshHandoverCopy,
  sourceShape,
  describeHandoverSource,
  registerHandoverRead,
  handoverCoverageNote,
  checkedHandoverCoverage,
  vouchHandoverReadConfirmsResend,
  handoverReadConfirmsResend,
  describeHandoverCoverage,
  handoverCoverage,
  readPendingFor,
  prepareHandoverRead,
};
