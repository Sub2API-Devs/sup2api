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
function versionHeldBy(artifactReadObservation, ver, n) {
  return (
    artifactReadObservation.ver === ver &&
    (artifactReadObservation.observers === undefined || Object.hasOwn(artifactReadObservation.observers, n))
  );
}
//@ chunk-q84dhc5d.js:897-1000 placement
function isVersionHeldWithSource(e, slug, ver) {
  return (
    versionHeldBy(e.getArtifactReadObservation(slug), ver, e.agentId ?? "main") &&
    !observedWithoutSource(e.agentId, slug, ver)
  );
}
//@ chunk-q84dhc5d.js:1000-1070 placement = validateContentTokens (0.63)
/**
 * 取有效的 Read token 上限：调用上下文的 fileReadingLimits.maxTokens，否则默认值。
 */
function readableLineChars(e) {
  return e.fileReadingLimits?.maxTokens ?? getDefaultFileReadingLimits().maxTokens;
}
//@ chunk-q84dhc5d.js:1070-1306 placement
function sourceShape(html, context) {
  let n = readableLineChars(context);
  let t = [];
  let d = 0;
  let r = 0;
  while (r <= html.length) {
    let index = html.indexOf(
      `
`,
      r,
    );
    let u = index === -1 ? html.length : index;
    d++;
    if (roughTokenCountEstimationForFileType(html.slice(r, u), "html") > n / 4)
      t.push({
        line: d,
        start: r,
        end: u,
      });
    r = u + 1;
  }
  return {
    lines: d,
    unterminated: !html.endsWith(`
`),
    overlong: t,
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
  let o = (s) => s.toLocaleString("en-US");
  let u = shape.unterminated ? shape.lines : shape.lines - 1;
  let b = `version ${ver}: ${o(Buffer.byteLength(html))} bytes${lineCount ? `, ${o(u)} ${plural(u, "line")}` : ""}`;
  if (shape.overlong.length === 0)
    return `${b}, ${lineCount ? "each" : "every line"} short enough to Read with offset/limit`;
  let replaced = (
    sent !== undefined && shape.overlong.length <= MAX_OVERLONG_LINES ? sent : undefined
  )?.replace(
    /\r\n/g,
    `
`,
  );
  let C;
  try {
    C = replaced === undefined ? undefined : strippedAuthorBody(replaced);
  } catch (error) {
    if (!(error instanceof StripUnsettledError)) throw error;
  }
  let P =
    replaced === undefined
      ? undefined
      : new Set([
          ...replaced.split(`
`),
          ...(C?.split(`
`) ?? []),
        ]);
  let mapped = shape.overlong.map((s) => {
    let replaced = html.slice(s.start, s.end).replace(/\r$/, "");
    let verdict = P === undefined ? undefined : P.has(replaced) ? "same" : "differs";
    return {
      line: s.line,
      chars: s.end - s.start,
      verdict,
    };
  });
  let sliced = mapped.slice(0, MAX_LISTED_ITEMS);
  let sliced_2 = mapped.slice(MAX_LISTED_ITEMS);
  let v = sliced_2.length;
  let filtered = sliced_2.filter((s) => s.verdict === "differs");
  let H = v > 0 && sliced_2.every((s) => s.verdict === "same");
  let mapped_2 = filtered.slice(0, MAX_OTHER_ITEMS).map((s) => o(s.line));
  let m = filtered.length - mapped_2.length;
  let S =
    filtered.length === 0
      ? H
        ? ", none differing from what you sent"
        : ""
      : `, of which ${plural(filtered.length, "line")} ${mapped_2.join(", ")}${m > 0 ? ` and ${o(m)} more` : ""} ${filtered.length === 1 ? "differs" : "differ"} from what you sent`;
  let w = (s) =>
    `line ${o(s.line)} (${o(s.chars)} characters${s.verdict === "differs" ? ", which differs from the content you sent" : s.verdict === "same" ? ", identical to a line you sent" : ""})`;
  return (
    `${b}; a single Read may not return ${sliced.map(w).join(", or ")}${v > 0 ? `, or ${o(v)} more such ${plural(v, "line")}${S}` : ""}` +
    (recorded
      ? " \u2014 no whole Read of it is needed: Read the lines you need with offset/limit, and take those long lines from the saved file, never from your own copy"
      : "")
  );
}
//@ chunk-q84dhc5d.js:2865-4099 placement
async function registerHandoverRead(
  { filepath, persistId, html, slug, ver, confirmsResend, batch, heldSkipsRead },
  b,
) {
  let agentId = b.agentId ?? "main";
  let { lines, overlong } = sourceShape(html, b);
  let P = overlong.length === 0;
  let y = isVersionHeldWithSource(b, slug, ver);
  let x = y && heldSkipsRead ? "held" : "unverifiable";
  let R = expandPath(filepath);
  let v;
  if (isDiskless()) reportOnce("handover_read");
  else
    v = await getFileModificationTimeAsync(R).catch(() => {
      return;
    });
  if (v === undefined) return x === "held" ? "held" : "unexaminable";
  let a = createHash("sha256").update(html).digest("hex");
  let pendingHandoverReads = getLiveState().pendingHandoverReads;
  let h = pendingHandoverReads.get(R);
  let m = h !== undefined && h.slug === slug && h.ver === ver && h.contentHash === a ? h : undefined;
  if (m !== undefined) m.mtimeMs = v;
  if (!P) return x;
  let S = y && heldSkipsRead;
  if (m !== undefined) {
    m.handedTo.add(agentId);
    if (S) {
      m.completedBy.add(agentId);
      return "held";
    }
    if (confirmsResend) m.confirmsResendFor.set(agentId, batch ?? "");
    else m.confirmsResendFor.delete(agentId);
    m.completedBy.delete(agentId);
    return m.unrecordableBy.has(agentId) ? "unverifiable" : "pending";
  }
  let w = new Set();
  for (let [_, A] of pendingHandoverReads)
    if (A.slug === slug) {
      for (let q of A.unrecordableBy) w.add(q);
      pendingHandoverReads.delete(_);
    }
  let s = !html.endsWith(`
`);
  pendingHandoverReads.set(R, {
    slug,
    ver,
    mtimeMs: v,
    totalLines: lines,
    unterminated: s,
    contentHash: a,
    bytes: Buffer.byteLength(html),
    requiredLines: s ? lines : lines - 1,
    linesReturned: new Map(),
    linesPrepared: new Map(),
    completedBy: new Set(S ? [agentId] : []),
    handedTo: new Set([agentId]),
    unrecordableBy: w,
    persistId,
    confirmsResendFor: new Map(confirmsResend ? [[agentId, batch ?? ""]] : []),
  });
  return S ? "held" : w.has(agentId) ? "unverifiable" : "pending";
}
//@ chunk-q84dhc5d.js:4099-4366 placement
async function handoverPersistTarget(e, ver, artifactPersistId) {
  for (let [t, d] of getLiveState().pendingHandoverReads)
    if (d.slug === e && d.ver === ver) {
      let r = await getFileModificationTimeAsync(t).catch(() => {
        return;
      });
      return r !== undefined && r !== d.mtimeMs
        ? {
            persistId: `${artifactPersistId}-${Date.now().toString(36)}`,
            editedCopy: t,
          }
        : {
            persistId: d.persistId,
          };
    }
  return {
    persistId: artifactPersistId,
  };
}
//@ chunk-q84dhc5d.js:4366-4601 placement
async function refreshHandoverCopy(filepath, html) {
  let n = expandPath(filepath);
  let pendingHandoverReads = getLiveState().pendingHandoverReads;
  let d = pendingHandoverReads.get(n);
  if (d === undefined) return;
  if (createHash("sha256").update(html).digest("hex") !== d.contentHash) {
    pendingHandoverReads.delete(n);
    return;
  }
  let r = await getFileModificationTimeAsync(n).catch(() => {
    return;
  });
  if (r !== undefined) d.mtimeMs = r;
}
//@ chunk-q84dhc5d.js:4601-4786 placement
/**
 * 找待完成的交接读取
 */
function findPendingHandoverRead(e, i, n) {
  for (let [t, d] of getLiveState().pendingHandoverReads)
    if (
      d.slug === i &&
      (n === undefined || d.ver === n) &&
      d.handedTo.has(e) &&
      !d.completedBy.has(e) &&
      !d.unrecordableBy.has(e)
    )
      return [t, d];
  return;
}
//@ chunk-q84dhc5d.js:4786-4839 placement
function readPendingFor(agentId, slug, liveVer) {
  return findPendingHandoverRead(agentId ?? "main", slug, liveVer) !== undefined;
}
//@ chunk-q84dhc5d.js:4839-4970 placement
function findHandoverRead(e, i, n, t = false) {
  let agentId = e.agentId ?? "main";
  let pendingHandoverRead = findPendingHandoverRead(agentId, i, n);
  if (pendingHandoverRead === undefined) return;
  let o = pendingHandoverRead[1];
  return isHandoverSuperseded(o, e) || (!t && isVersionHeldWithSource(e, i, o.ver))
    ? undefined
    : pendingHandoverRead;
}
//@ chunk-q84dhc5d.js:4970-5076 placement
function handoverCoverage(e, i, n, { ignoreHold: t = false } = {}) {
  let handoverRead = findHandoverRead(e, i, n, t);
  return handoverRead === undefined
    ? undefined
    : handoverCoverageOf(handoverRead[0], handoverRead[1], e.agentId);
}
//@ chunk-q84dhc5d.js:5076-5271 placement
async function checkedHandoverCoverage(e, i, live) {
  let handoverRead = findHandoverRead(e, i, live);
  if (handoverRead === undefined) return;
  let [path, r] = handoverRead;
  let o;
  try {
    o = (await getFileModificationTimeAsync(path)) === r.mtimeMs ? "intact" : "changed";
  } catch (error) {
    o = isENOENT(error) ? "changed" : "unknown";
  }
  return {
    ...handoverCoverageOf(path, r, e.agentId),
    file: o,
  };
}
//@ chunk-q84dhc5d.js:5271-5437 placement
/**
 * 交接读取覆盖情况
 */
function handoverCoverageOf(path, i, agentId) {
  return {
    path,
    slug: i.slug,
    ver: i.ver,
    lines: i.requiredLines,
    unterminated: i.unterminated,
    unread: getUncoveredLineRanges(i.linesReturned.get(agentId ?? "main") ?? [], i.requiredLines),
  };
}
//@ chunk-q84dhc5d.js:5437-5536 placement
function handoverReadConfirmsResend(e, i, live) {
  let handoverRead = findHandoverRead(e, i, live);
  return (
    handoverRead !== undefined &&
    refusedBodyFor(handoverRead[1], e.agentId, e.agentId ?? "main") === undefined
  );
}
//@ chunk-q84dhc5d.js:5536-5615 placement
function vouchHandoverReadConfirmsResend(e, i, live, t) {
  findHandoverRead(e, i, live)?.[1].confirmsResendFor.set(e.agentId ?? "main", t);
}
//@ chunk-q84dhc5d.js:5615-5969 placement
function describeHandoverCoverage({ lines, unterminated, unread }) {
  let reduced = unread.reduce((acc, [r, o]) => acc + o - r + 1, 0);
  return (
    `${lines} ${plural(lines, "line")}` +
    (unterminated
      ? `; the last has no trailing newline, so \`wc -l\` reports ${lines - 1} \u2014 Read through line ${lines} and leave the file as it is`
      : "") +
    (reduced > 0 && reduced < lines
      ? `; you have not yet Read ${plural(reduced, "line")} ${unread.map(([d, r]) => (d === r ? `${d}` : `${d}-${r}`)).join(", ")}`
      : "")
  );
}
//@ chunk-q84dhc5d.js:5969-6046 placement
function handoverCoverageNote(context, slug, ver, t) {
  let d = handoverCoverage(context, slug, ver, t);
  return d === undefined ? "" : ` (${describeHandoverCoverage(d)})`;
}
//@ chunk-q84dhc5d.js:6046-6193 placement
function getUncoveredLineRanges(e, requiredLines) {
  let n = [];
  let t = 0;
  for (let [d, r] of mergeLineRanges(e)) {
    if (d > t) n.push([t + 1, Math.min(d, requiredLines)]);
    t = Math.max(t, r);
    if (t >= requiredLines) break;
  }
  if (t < requiredLines) n.push([t + 1, requiredLines]);
  return n;
}
//@ chunk-q84dhc5d.js:6193-6326 placement
async function discardHandoverCopy(filepath, persistedToolResultFiles) {
  getLiveState().pendingHandoverReads.delete(expandPath(filepath));
  forgetSavedFilePath(persistedToolResultFiles, filepath);
  if (isDiskless()) reportOnce("handover_discard");
  else await unlink(filepath).catch(() => {});
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
async function prepareHandoverRead(path, i, n, t) {
  try {
    let pendingHandoverReads = getLiveState().pendingHandoverReads;
    let r = pendingHandoverReads.get(path);
    let agentId = i.agentId ?? "main";
    if (r === undefined || n === undefined || t.lineCount <= 0 || r.completedBy.has(agentId))
      return EMPTY_HANDOVER_READ;
    if (Math.floor(t.mtimeMs) !== r.mtimeMs || t.totalLines !== r.totalLines) {
      logFeatureSad("artifact_handover_read", "file_changed");
      return EMPTY_HANDOVER_READ;
    }
    if (dropSupersededHandover(r, path, i)) return EMPTY_HANDOVER_READ;
    let u = [t.firstLine, t.firstLine + t.lineCount];
    let b = await checkHandoverCopy(path, r.bytes, r.contentHash);
    if (b === "changed") {
      pendingHandoverReads.delete(path);
      logFeatureSad("artifact_handover_read", "file_changed");
      return EMPTY_HANDOVER_READ;
    }
    if (b === "unreadable") logFeatureSad("artifact_handover_read", "file_unreadable");
    let c = b === "holds";
    let filtered = (r.linesPrepared.get(agentId) ?? []).filter((a) => a.messageId === n);
    let C = mergeLineRanges([...(r.linesReturned.get(agentId) ?? []), ...filtered.map((a) => a.range), u]);
    let P = coversRequiredLines(C, r.requiredLines);
    let y = {
      messageId: n,
      range: u,
    };
    r.linesPrepared.set(agentId, [...filtered, y]);
    let commit = () => {
      try {
        let a = r.linesPrepared.get(agentId) ?? [];
        if (pendingHandoverReads.get(path) !== r || r.completedBy.has(agentId) || !a.includes(y)) return;
        let filtered = a.filter((m) => m !== y);
        if (filtered.length > 0) r.linesPrepared.set(agentId, filtered);
        else r.linesPrepared.delete(agentId);
        let h = mergeLineRanges([...(r.linesReturned.get(agentId) ?? []), u]);
        if (!c || !coversRequiredLines(h, r.requiredLines)) {
          r.linesReturned.set(agentId, h);
          return;
        }
        r.linesReturned.delete(agentId);
        r.completedBy.add(agentId);
        return recordHandoverReadVersion(r, path, i, n, agentId)
          ? {
              slug: r.slug,
              ver: r.ver,
            }
          : undefined;
      } catch (error) {
        logError(error);
        return;
      }
    };
    let R = !r.unrecordableBy.has(agentId);
    let v = R && r.handedTo.has(agentId) && !isVersionHeldWithSource(i, r.slug, r.ver);
    return {
      artifactRead:
        P && c && R
          ? {
              slug: r.slug,
              ver: r.ver,
            }
          : undefined,
      remaining:
        P || !v
          ? undefined
          : {
              ...handoverCoverageOf(path, r, i.agentId),
              unread: getUncoveredLineRanges(C, r.requiredLines),
            },
      commit,
    };
  } catch (error) {
    logError(error);
    return EMPTY_HANDOVER_READ;
  }
}
//@ chunk-q84dhc5d.js:7811-7923 placement
function isHandoverSuperseded(e, i) {
  let ver = i.getArtifactReadObservation(e.slug).ver;
  return ver !== undefined && ver !== e.ver && (compareNumericPrefix(ver, e.ver) ?? 0) > 0;
}
//@ chunk-q84dhc5d.js:7923-8047 placement
function dropSupersededHandover(e, i, n) {
  if (isHandoverSuperseded(e, n)) {
    getLiveState().pendingHandoverReads.delete(i);
    logFeatureSad("artifact_handover_read", "superseded");
    return true;
  }
  return false;
}
//@ chunk-q84dhc5d.js:8047-8225 placement
/**
 * 合并重叠的行区间
 */
function mergeLineRanges(e) {
  let sorted = e.map((t) => [t[0], t[1]]).sort((t, d) => t[0] - d[0]);
  let n = [];
  for (let t of sorted) {
    let last = n.at(-1);
    if (last !== undefined && t[0] <= last[1]) last[1] = Math.max(last[1], t[1]);
    else n.push(t);
  }
  return n;
}
//@ chunk-q84dhc5d.js:8225-8288 placement
function coversRequiredLines(e, requiredLines) {
  let n = e[0];
  return n !== undefined && n[0] <= 0 && n[1] >= requiredLines;
}
//@ chunk-q84dhc5d.js:8288-8439 placement
/**
 * 取被拒绝的发布正文记录
 */
function refusedBodyFor(e, agentId, n) {
  let t = getLiveState().refusedPublishBodies.get(replicaKey(agentId, e.slug));
  let d = e.confirmsResendFor.get(n);
  return d !== undefined && (t === undefined || t.batch !== d) ? undefined : t;
}
//@ chunk-q84dhc5d.js:8439-8836 placement
/**
 * 记录交接读取的版本
 */
function recordHandoverReadVersion(e, i, n, t, agentId) {
  if (dropSupersededHandover(e, i, n)) return false;
  let r = refusedBodyFor(e, n.agentId, agentId);
  let observedFrom = r?.observedFrom;
  try {
    n.setArtifactReadVersion(e.slug, e.ver, observationStamp(n.agentId, t));
  } finally {
    if (r !== undefined)
      if (observedFrom === undefined) delete r.observedFrom;
      else r.observedFrom = observedFrom;
  }
  if (versionHeldBy(n.getArtifactReadObservation(e.slug), e.ver, agentId)) {
    logFeatureOk("artifact_handover_read");
    return true;
  }
  e.unrecordableBy.add(agentId);
  logFeatureSad("artifact_handover_read", "seed_not_persisted");
  return false;
}
//@ chunk-q84dhc5d.js:8836-9005 placement
/**
 * 核对交接副本大小与哈希是否不变
 */
async function checkHandoverCopy(e, bytes, contentHash) {
  try {
    return (await stat(e)).size === bytes &&
      createHash("sha256")
        .update(await readFile(e))
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
};
