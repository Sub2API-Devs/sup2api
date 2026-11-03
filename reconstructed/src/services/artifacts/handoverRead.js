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
import { Eoi } from "../../utils/mcpOutputStorage.js";
import { logFeatureSad, logFeatureOk } from "../analytics/featureTelemetry.js";
import { logError } from "../../utils/log.js";
import { compareNumericPrefix } from "../../utils/textNormalize.js";

//@ chunk-q84dhc5d.js:806-897 placement
function versionHeldBy(e, i, n) {
  return e.ver === i && (e.observers === void 0 || Object.hasOwn(e.observers, n));
}
//@ chunk-q84dhc5d.js:897-1000 placement
function isVersionHeldWithSource(e, i, n) {
  return (
    versionHeldBy(e.getArtifactReadObservation(i), n, e.agentId ?? "main") &&
    !observedWithoutSource(e.agentId, i, n)
  );
}
/**
 * 取有效的 Read token 上限：调用上下文的 fileReadingLimits.maxTokens，否则默认值。
 */
//@ chunk-q84dhc5d.js:1000-1070 placement = validateContentTokens (0.63)
function readableLineChars(e) {
  return e.fileReadingLimits?.maxTokens ?? getDefaultFileReadingLimits().maxTokens;
}
//@ chunk-q84dhc5d.js:1070-1306 placement
function sourceShape(e, i) {
  let n = readableLineChars(i),
    t = [],
    d = 0,
    r = 0;
  while (r <= e.length) {
    let index = e.indexOf(
        `
`,
        r,
      ),
      u = index === -1 ? e.length : index;
    if ((d++, roughTokenCountEstimationForFileType(e.slice(r, u), "html") > n / 4))
      t.push({ line: d, start: r, end: u });
    r = u + 1;
  }
  return {
    lines: d,
    unterminated: !e.endsWith(`
`),
    overlong: t,
  };
}
//@ chunk-q84dhc5d.js:1306-1323 placement
var T = 3,
  K = 8,
  Q = 32;
/**
 * 描述 artifact 交接来源；本模块负责交接读取的覆盖检查与副本管理。
 */
//@ chunk-q84dhc5d.js:1323-2865 placement
function describeHandoverSource({
  html: html,
  ver: ver,
  shape: shape,
  sent: sent,
  recorded: recorded,
  lineCount: lineCount = !0,
}) {
  let o = (s) => s.toLocaleString("en-US"),
    u = shape.unterminated ? shape.lines : shape.lines - 1,
    b = `version ${ver}: ${o(Buffer.byteLength(html))} bytes${lineCount ? `, ${o(u)} ${plural(u, "line")}` : ""}`;
  if (shape.overlong.length === 0)
    return `${b}, ${lineCount ? "each" : "every line"} short enough to Read with offset/limit`;
  let p = (sent !== void 0 && shape.overlong.length <= Q ? sent : void 0)?.replace(
      /\r\n/g,
      `
`,
    ),
    C;
  try {
    C = p === void 0 ? void 0 : strippedAuthorBody(p);
  } catch (error) {
    if (!(error instanceof StripUnsettledError)) throw error;
  }
  let P =
      p === void 0
        ? void 0
        : new Set([
            ...p.split(`
`),
            ...(C?.split(`
`) ?? []),
          ]),
    mapped = shape.overlong.map((s) => {
      let replaced = html.slice(s.start, s.end).replace(/\r$/, ""),
        A = P === void 0 ? void 0 : P.has(replaced) ? "same" : "differs";
      return { line: s.line, chars: s.end - s.start, verdict: A };
    }),
    sliced = mapped.slice(0, T),
    sliced_2 = mapped.slice(T),
    v = sliced_2.length,
    filtered = sliced_2.filter((s) => s.verdict === "differs"),
    H = v > 0 && sliced_2.every((s) => s.verdict === "same"),
    mapped_2 = filtered.slice(0, K).map((s) => o(s.line)),
    m = filtered.length - mapped_2.length,
    S =
      filtered.length === 0
        ? H
          ? ", none differing from what you sent"
          : ""
        : `, of which ${plural(filtered.length, "line")} ${mapped_2.join(", ")}${m > 0 ? ` and ${o(m)} more` : ""} ${filtered.length === 1 ? "differs" : "differ"} from what you sent`,
    w = (s) =>
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
  {
    filepath: filepath,
    persistId: persistId,
    html: html,
    slug: slug,
    ver: ver,
    confirmsResend: confirmsResend,
    batch: batch,
    heldSkipsRead: heldSkipsRead,
  },
  b,
) {
  let c = b.agentId ?? "main",
    { lines: lines, overlong: overlong } = sourceShape(html, b),
    P = overlong.length === 0,
    y = isVersionHeldWithSource(b, slug, ver),
    x = y && heldSkipsRead ? "held" : "unverifiable",
    R = expandPath(filepath),
    v;
  if (isDiskless()) reportOnce("handover_read");
  else
    v = await getFileModificationTimeAsync(R).catch(() => {
      return;
    });
  if (v === void 0) return x === "held" ? "held" : "unexaminable";
  let digest = createHash("sha256").update(html).digest("hex"),
    pendingHandoverReads = getLiveState().pendingHandoverReads,
    h = pendingHandoverReads.get(R),
    m = h !== void 0 && h.slug === slug && h.ver === ver && h.contentHash === digest ? h : void 0;
  if (m !== void 0) m.mtimeMs = v;
  if (!P) return x;
  let S = y && heldSkipsRead;
  if (m !== void 0) {
    if ((m.handedTo.add(c), S)) return (m.completedBy.add(c), "held");
    if (confirmsResend) m.confirmsResendFor.set(c, batch ?? "");
    else m.confirmsResendFor.delete(c);
    return (m.completedBy.delete(c), m.unrecordableBy.has(c) ? "unverifiable" : "pending");
  }
  let w = new Set();
  for (let [_, A] of pendingHandoverReads)
    if (A.slug === slug) {
      for (let q of A.unrecordableBy) w.add(q);
      pendingHandoverReads.delete(_);
    }
  let s = !html.endsWith(`
`);
  return (
    pendingHandoverReads.set(R, {
      slug: slug,
      ver: ver,
      mtimeMs: v,
      totalLines: lines,
      unterminated: s,
      contentHash: digest,
      bytes: Buffer.byteLength(html),
      requiredLines: s ? lines : lines - 1,
      linesReturned: new Map(),
      linesPrepared: new Map(),
      completedBy: new Set(S ? [c] : []),
      handedTo: new Set([c]),
      unrecordableBy: w,
      persistId: persistId,
      confirmsResendFor: new Map(confirmsResend ? [[c, batch ?? ""]] : []),
    }),
    S ? "held" : w.has(c) ? "unverifiable" : "pending"
  );
}
//@ chunk-q84dhc5d.js:4099-4366 placement
async function handoverPersistTarget(e, i, n) {
  for (let [t, d] of getLiveState().pendingHandoverReads)
    if (d.slug === e && d.ver === i) {
      let r = await getFileModificationTimeAsync(t).catch(() => {
        return;
      });
      return r !== void 0 && r !== d.mtimeMs
        ? { persistId: `${n}-${Date.now().toString(36)}`, editedCopy: t }
        : { persistId: d.persistId };
    }
  return { persistId: n };
}
//@ chunk-q84dhc5d.js:4366-4601 placement
async function refreshHandoverCopy(e, i) {
  let n = expandPath(e),
    pendingHandoverReads = getLiveState().pendingHandoverReads,
    d = pendingHandoverReads.get(n);
  if (d === void 0) return;
  if (createHash("sha256").update(i).digest("hex") !== d.contentHash) {
    pendingHandoverReads.delete(n);
    return;
  }
  let r = await getFileModificationTimeAsync(n).catch(() => {
    return;
  });
  if (r !== void 0) d.mtimeMs = r;
}
/**
 * 找待完成的交接读取
 */
//@ chunk-q84dhc5d.js:4601-4786 placement
function findPendingHandoverRead(e, i, n) {
  for (let [t, d] of getLiveState().pendingHandoverReads)
    if (
      d.slug === i &&
      (n === void 0 || d.ver === n) &&
      d.handedTo.has(e) &&
      !d.completedBy.has(e) &&
      !d.unrecordableBy.has(e)
    )
      return [t, d];
  return;
}
//@ chunk-q84dhc5d.js:4786-4839 placement
function readPendingFor(e, i, n) {
  return findPendingHandoverRead(e ?? "main", i, n) !== void 0;
}
//@ chunk-q84dhc5d.js:4839-4970 placement
function findHandoverRead(e, i, n, t = !1) {
  let d = e.agentId ?? "main",
    r = findPendingHandoverRead(d, i, n);
  if (r === void 0) return;
  let o = r[1];
  return isHandoverSuperseded(o, e) || (!t && isVersionHeldWithSource(e, i, o.ver)) ? void 0 : r;
}
//@ chunk-q84dhc5d.js:4970-5076 placement
function handoverCoverage(e, i, n, { ignoreHold: t = !1 } = {}) {
  let d = findHandoverRead(e, i, n, t);
  return d === void 0 ? void 0 : handoverCoverageOf(d[0], d[1], e.agentId);
}
//@ chunk-q84dhc5d.js:5076-5271 placement
async function checkedHandoverCoverage(e, i, n) {
  let t = findHandoverRead(e, i, n);
  if (t === void 0) return;
  let [d, r] = t,
    o;
  try {
    o = (await getFileModificationTimeAsync(d)) === r.mtimeMs ? "intact" : "changed";
  } catch (error) {
    o = isENOENT(error) ? "changed" : "unknown";
  }
  return { ...handoverCoverageOf(d, r, e.agentId), file: o };
}
/**
 * 交接读取覆盖情况
 */
//@ chunk-q84dhc5d.js:5271-5437 placement
function handoverCoverageOf(e, i, n) {
  return {
    path: e,
    slug: i.slug,
    ver: i.ver,
    lines: i.requiredLines,
    unterminated: i.unterminated,
    unread: getUncoveredLineRanges(i.linesReturned.get(n ?? "main") ?? [], i.requiredLines),
  };
}
//@ chunk-q84dhc5d.js:5437-5536 placement
function handoverReadConfirmsResend(e, i, n) {
  let t = findHandoverRead(e, i, n);
  return t !== void 0 && refusedBodyFor(t[1], e.agentId, e.agentId ?? "main") === void 0;
}
//@ chunk-q84dhc5d.js:5536-5615 placement
function vouchHandoverReadConfirmsResend(e, i, n, t) {
  findHandoverRead(e, i, n)?.[1].confirmsResendFor.set(e.agentId ?? "main", t);
}
//@ chunk-q84dhc5d.js:5615-5969 placement
function describeHandoverCoverage({ lines: lines, unterminated: unterminated, unread: unread }) {
  let reduced = unread.reduce((d, [r, o]) => d + o - r + 1, 0);
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
function handoverCoverageNote(e, i, n, t) {
  let d = handoverCoverage(e, i, n, t);
  return d === void 0 ? "" : ` (${describeHandoverCoverage(d)})`;
}
//@ chunk-q84dhc5d.js:6046-6193 placement
function getUncoveredLineRanges(e, i) {
  let n = [],
    t = 0;
  for (let [d, r] of mergeLineRanges(e)) {
    if (d > t) n.push([t + 1, Math.min(d, i)]);
    if (((t = Math.max(t, r)), t >= i)) break;
  }
  if (t < i) n.push([t + 1, i]);
  return n;
}
//@ chunk-q84dhc5d.js:6193-6326 placement
async function discardHandoverCopy(e, i) {
  if ((getLiveState().pendingHandoverReads.delete(expandPath(e)), Eoi(i, e), isDiskless()))
    reportOnce("handover_discard");
  else await unlink(e).catch(() => {});
}
//@ chunk-q84dhc5d.js:6326-6391 placement
var L = {
  artifactRead: void 0,
  remaining: void 0,
  commit: () => {
    return;
  },
};
//@ chunk-q84dhc5d.js:6391-7811 placement
async function prepareHandoverRead(e, i, n, t) {
  try {
    let pendingHandoverReads = getLiveState().pendingHandoverReads,
      r = pendingHandoverReads.get(e),
      o = i.agentId ?? "main";
    if (r === void 0 || n === void 0 || t.lineCount <= 0 || r.completedBy.has(o)) return L;
    if (Math.floor(t.mtimeMs) !== r.mtimeMs || t.totalLines !== r.totalLines)
      return (logFeatureSad("artifact_handover_read", "file_changed"), L);
    if (dropSupersededHandover(r, e, i)) return L;
    let u = [t.firstLine, t.firstLine + t.lineCount],
      b = await checkHandoverCopy(e, r.bytes, r.contentHash);
    if (b === "changed")
      return (pendingHandoverReads.delete(e), logFeatureSad("artifact_handover_read", "file_changed"), L);
    if (b === "unreadable") logFeatureSad("artifact_handover_read", "file_unreadable");
    let c = b === "holds",
      filtered = (r.linesPrepared.get(o) ?? []).filter((a) => a.messageId === n),
      C = mergeLineRanges([...(r.linesReturned.get(o) ?? []), ...filtered.map((a) => a.range), u]),
      P = E(C, r.requiredLines),
      y = { messageId: n, range: u };
    r.linesPrepared.set(o, [...filtered, y]);
    let x = () => {
        try {
          let a = r.linesPrepared.get(o) ?? [];
          if (pendingHandoverReads.get(e) !== r || r.completedBy.has(o) || !a.includes(y)) return;
          let filtered = a.filter((m) => m !== y);
          if (filtered.length > 0) r.linesPrepared.set(o, filtered);
          else r.linesPrepared.delete(o);
          let h = mergeLineRanges([...(r.linesReturned.get(o) ?? []), u]);
          if (!c || !E(h, r.requiredLines)) {
            r.linesReturned.set(o, h);
            return;
          }
          return (
            r.linesReturned.delete(o),
            r.completedBy.add(o),
            recordHandoverReadVersion(r, e, i, n, o) ? { slug: r.slug, ver: r.ver } : void 0
          );
        } catch (error) {
          logError(error);
          return;
        }
      },
      R = !r.unrecordableBy.has(o),
      v = R && r.handedTo.has(o) && !isVersionHeldWithSource(i, r.slug, r.ver);
    return {
      artifactRead: P && c && R ? { slug: r.slug, ver: r.ver } : void 0,
      remaining:
        P || !v
          ? void 0
          : { ...handoverCoverageOf(e, r, i.agentId), unread: getUncoveredLineRanges(C, r.requiredLines) },
      commit: x,
    };
  } catch (error) {
    return (logError(error), L);
  }
}
//@ chunk-q84dhc5d.js:7811-7923 placement
function isHandoverSuperseded(e, i) {
  let ver = i.getArtifactReadObservation(e.slug).ver;
  return ver !== void 0 && ver !== e.ver && (compareNumericPrefix(ver, e.ver) ?? 0) > 0;
}
//@ chunk-q84dhc5d.js:7923-8047 placement
function dropSupersededHandover(e, i, n) {
  if (isHandoverSuperseded(e, n))
    return (
      getLiveState().pendingHandoverReads.delete(i),
      logFeatureSad("artifact_handover_read", "superseded"),
      !0
    );
  return !1;
}
/**
 * 合并重叠的行区间
 */
//@ chunk-q84dhc5d.js:8047-8225 placement
function mergeLineRanges(e) {
  let sorted = e.map((t) => [t[0], t[1]]).sort((t, d) => t[0] - d[0]),
    n = [];
  for (let t of sorted) {
    let at = n.at(-1);
    if (at !== void 0 && t[0] <= at[1]) at[1] = Math.max(at[1], t[1]);
    else n.push(t);
  }
  return n;
}
//@ chunk-q84dhc5d.js:8225-8288 placement
function E(e, i) {
  let n = e[0];
  return n !== void 0 && n[0] <= 0 && n[1] >= i;
}
/**
 * 取被拒绝的发布正文记录
 */
//@ chunk-q84dhc5d.js:8288-8439 placement
function refusedBodyFor(e, i, n) {
  let t = getLiveState().refusedPublishBodies.get(replicaKey(i, e.slug)),
    d = e.confirmsResendFor.get(n);
  return d !== void 0 && (t === void 0 || t.batch !== d) ? void 0 : t;
}
/**
 * 记录交接读取的版本
 */
//@ chunk-q84dhc5d.js:8439-8836 placement
function recordHandoverReadVersion(e, i, n, t, d) {
  if (dropSupersededHandover(e, i, n)) return !1;
  let r = refusedBodyFor(e, n.agentId, d),
    o = r?.observedFrom;
  try {
    n.setArtifactReadVersion(e.slug, e.ver, observationStamp(n.agentId, t));
  } finally {
    if (r !== void 0)
      if (o === void 0) delete r.observedFrom;
      else r.observedFrom = o;
  }
  if (versionHeldBy(n.getArtifactReadObservation(e.slug), e.ver, d))
    return (logFeatureOk("artifact_handover_read"), !0);
  return (e.unrecordableBy.add(d), logFeatureSad("artifact_handover_read", "seed_not_persisted"), !1);
}
/**
 * 核对交接副本大小与哈希是否不变
 */
//@ chunk-q84dhc5d.js:8836-9005 placement
async function checkHandoverCopy(e, i, n) {
  try {
    return (await stat(e)).size === i &&
      createHash("sha256")
        .update(await readFile(e))
        .digest("hex") === n
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
