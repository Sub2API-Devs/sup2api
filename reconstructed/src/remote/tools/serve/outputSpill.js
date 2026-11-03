/**
 * remote/tools/serve/outputSpill.ts
 *
 * 2.1.316 新增：服务端工具输出截断与溢出到文件
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-ad2e1aj6.js (12)
 * attribution: placement 12
 */
import { outputTruncatedNote, SPILLEDOUTPUTBYTES } from "../protocolConstants.js";
import { outputFilterHint } from "../../../tools/shared/textSearchTools.js";
import { urlPatternToRegex, truncateToLength } from "../../../utils/stringUtils.js";
import { scanPreBoundaryMetadata } from "../../../utils/sessionStorage.js";

//@ chunk-ad2e1aj6.js:18005-18145 placement
var DEFAULT_MAX_INLINE_BYTES = 204800,
  DEFAULT_MAX_IMAGE_BYTES = 1048576,
  MAX_JSON_DEPTH = 8,
  MAX_KEY_CHARS = 256,
  MAX_ENTRIES_PER_LEVEL = 1000,
  MAX_TOTAL_ENTRIES = 2000,
  MAX_FLOOR_BYTES = 4096,
  MAX_FLOORS_GRANTED = 4,
  PERSISTED_OUTPUT_FIELDS = new Set(["persistedOutputPath", "persistedOutputSize", "rawOutputPath"]);
/**
 * 把远程工具结果中过大的文本/图片写入本机文件并返回替代说明（字节上限、图片上限）。
 */
//@ chunk-ad2e1aj6.js:18145-18475 placement
function spillServedOutput({
  content: content,
  output: output,
  targetName: targetName,
  shellToolName: shellToolName,
  localSpillPaths: localSpillPaths,
  localSpillDirs: localSpillDirs,
  maxInlineBytes: maxInlineBytes = DEFAULT_MAX_INLINE_BYTES,
  maxImageBytes: maxImageBytes = DEFAULT_MAX_IMAGE_BYTES,
}) {
  let R = unreadableSpillNote({
      targetName: targetName,
      shellToolName: shellToolName,
      localSpillPaths: localSpillPaths,
      localSpillDirs: localSpillDirs,
    }),
    w = outputTruncatedNote(targetName),
    C = truncateResultContent(content, R, maxInlineBytes, maxImageBytes, w, targetName),
    P = truncateStructuredResult(output, R, maxInlineBytes, w);
  return { content: C.content, output: P.value, truncated: C.truncated || P.truncated };
}
//@ chunk-ad2e1aj6.js:18475-19037 placement
function unreadableSpillNote({
  targetName: targetName,
  shellToolName: shellToolName,
  localSpillPaths: localSpillPaths,
  localSpillDirs: localSpillDirs,
}) {
  let r = `a file on ${targetName} that cannot be read from here \u2014 the command already ran on ${targetName}, so only this part of its output is out of reach. If it is safe to repeat, re-run it there with ${outputFilterHint(shellToolName)} to see the part you need`,
    mapped = localSpillDirs
      .filter((O) => O.length > 0)
      .map(
        (O) =>
          new RegExp(
            `${urlPatternToRegex(O)}(?:[\\\\/][^\\s"'\`;|&()<>]*|(?=$|[^A-Za-z0-9._-])|(?=\\.(?:$|[^A-Za-z0-9_-])))`,
            "g",
          ),
      ),
    filtered = localSpillPaths.filter((O) => O.length > 0);
  return (O) =>
    mapped.reduce(
      (R, w) => R.replace(w, () => r),
      filtered.reduce((R, w) => R.replaceAll(w, () => r), O),
    );
}
//@ chunk-ad2e1aj6.js:19037-20146 placement
function truncateResultContent(e, n, s, h, r, i) {
  if (typeof e === "string") {
    let R = scanPreBoundaryMetadata(n(e), s, r);
    return { content: R.text, truncated: R.truncated };
  }
  let { blocks: blocks, truncated: truncated } = e.reduce(
    (R, w) => {
      if (w.type === "image") {
        let P = w.source.type === "base64" ? w.source.data.length : void 0;
        if (P === void 0 || P > R.imageRemaining) {
          let x =
            P === void 0
              ? `(an image referenced by URL was omitted on ${i})`
              : `(an image was omitted on ${i}: too large to return)`;
          return (
            R.blocks.push({ type: "text", text: x }),
            { ...R, remaining: Math.max(0, R.remaining - Buffer.byteLength(x)), truncated: !0 }
          );
        }
        return (R.blocks.push(w), { ...R, imageRemaining: R.imageRemaining - P });
      }
      if (w.type !== "text") {
        let P = `(a ${w.type} block was omitted on ${i})`;
        return (
          R.blocks.push({ type: "text", text: P }),
          { ...R, remaining: Math.max(0, R.remaining - Buffer.byteLength(P)), truncated: !0 }
        );
      }
      if (R.remaining === 0 && R.truncated) return R;
      let C = scanPreBoundaryMetadata(n(w.text), R.remaining, r);
      return (
        R.blocks.push({ ...w, text: C.text }),
        {
          blocks: R.blocks,
          remaining: Math.max(0, R.remaining - Buffer.byteLength(C.text)),
          imageRemaining: R.imageRemaining,
          truncated: R.truncated || C.truncated,
        }
      );
    },
    { blocks: [], remaining: s, imageRemaining: h, truncated: !1 },
  );
  return { content: blocks, truncated: truncated };
}
//@ chunk-ad2e1aj6.js:20146-20920 placement
function truncateStructuredResult(e, n, s, h) {
  let r = { remaining: s, entriesRemaining: MAX_TOTAL_ENTRIES, markerSpent: !1, floorsGranted: 0 };
  if (typeof e !== "object" || e === null || Array.isArray(e)) return truncateJsonValue(e, n, r, h, 0);
  if (Reflect.get(e, "isImage") === !0) return { value: void 0, truncated: !1 };
  let any = Object.entries(e).some(([P, x]) => PERSISTED_OUTPUT_FIELDS.has(P) && Boolean(x)),
    y = Reflect.get(e, "persistedOutputSize"),
    O = typeof y === "number" && Number.isSafeInteger(y) && y > 0 ? [[SPILLEDOUTPUTBYTES, y]] : [],
    min = Math.min(MAX_FLOOR_BYTES, s),
    w = truncateObjectEntries(
      [...Object.entries(e).filter(([P]) => !PERSISTED_OUTPUT_FIELDS.has(P)), ...O],
      n,
      r,
      (P) => (typeof P === "string" ? truncateString(P, n, r, h, min) : truncateJsonValue(P, n, r, h, 1)),
    ),
    mapped = w.entries.map(([P, x]) =>
      any && P === "stdout" && typeof x.value === "string" && !x.truncated
        ? [P, { value: `${x.value}${h}`, truncated: !0 }]
        : [P, x],
    );
  return {
    value: Object.fromEntries(mapped.map(([P, x]) => [P, x.value])),
    truncated: w.truncated || mapped.some(([, P]) => P.truncated),
  };
}
//@ chunk-ad2e1aj6.js:20920-21092 placement
function truncateObjectEntries(e, n, s, h) {
  let r = takeEntriesWithinBudget(e, s),
    i = new Set(),
    y = !1;
  return {
    entries: r.map(([R, w]) => {
      let C = Xn(Dr(R, n, s), i);
      return ((y ||= C !== R), i.add(C), [C, h(w)]);
    }),
    truncated: r.length < e.length || y,
  };
}
//@ chunk-ad2e1aj6.js:21092-21631 placement
function truncateJsonValue(e, n, s, h, r) {
  if (typeof e === "string") return truncateString(e, n, s, h, 0);
  if (typeof e !== "object" || e === null)
    return (Bt(s, Buffer.byteLength(String(e))), { value: e, truncated: !1 });
  if (r >= MAX_JSON_DEPTH) return { value: void 0, truncated: !0 };
  if (Array.isArray(e)) {
    let mapped = takeEntriesWithinBudget(e, s).map((O) => truncateJsonValue(O, n, s, h, r + 1));
    return {
      value: mapped.map((O) => O.value),
      truncated: mapped.length < e.length || mapped.some((O) => O.truncated),
    };
  }
  let i = truncateObjectEntries(Object.entries(e), n, s, (y) => truncateJsonValue(y, n, s, h, r + 1));
  return {
    value: Object.fromEntries(i.entries.map(([y, O]) => [y, O.value])),
    truncated: i.truncated || i.entries.some(([, y]) => y.truncated),
  };
}
//@ chunk-ad2e1aj6.js:21631-21996 placement
function truncateString(e, n, s, h, r) {
  let i = r > 0 && s.floorsGranted < MAX_FLOORS_GRANTED,
    y = i ? Math.max(s.remaining, r) : s.remaining,
    O = n(e);
  if (y === 0 && s.markerSpent) return { value: "", truncated: O.length > 0 };
  let R = scanPreBoundaryMetadata(O, y, s.markerSpent ? "" : h);
  if (R.truncated) s.markerSpent = !0;
  let byteLength = Buffer.byteLength(R.text);
  if (i && y > s.remaining && byteLength > s.remaining) s.floorsGranted += 1;
  return (Bt(s, byteLength), { value: R.text, truncated: R.truncated });
}
//@ chunk-ad2e1aj6.js:21996-22100 placement
function takeEntriesWithinBudget(e, n) {
  let sliced = e.slice(0, Math.min(MAX_ENTRIES_PER_LEVEL, n.entriesRemaining));
  return ((n.entriesRemaining -= sliced.length), sliced);
}
//@ chunk-ad2e1aj6.js:22100-22179 placement
function Xn(e, n, s = 1) {
  let h = s === 1 ? e : `${e} (${s})`;
  return n.has(h) ? Xn(e, n, s + 1) : h;
}
//@ chunk-ad2e1aj6.js:22179-22252 placement
function Dr(e, n, s) {
  let h = truncateToLength(n(e), MAX_KEY_CHARS);
  return (Bt(s, Buffer.byteLength(h)), h);
}
//@ chunk-ad2e1aj6.js:22252-22307 placement
function Bt(e, n) {
  e.remaining = Math.max(0, e.remaining - n);
}

export { spillServedOutput, unreadableSpillNote };
