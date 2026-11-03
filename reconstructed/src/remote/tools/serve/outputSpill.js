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
var DEFAULT_MAX_INLINE_BYTES = 204800;
var DEFAULT_MAX_IMAGE_BYTES = 1048576;
var MAX_JSON_DEPTH = 8;
var MAX_KEY_CHARS = 256;
var MAX_ENTRIES_PER_LEVEL = 1000;
var MAX_TOTAL_ENTRIES = 2000;
var MAX_FLOOR_BYTES = 4096;
var MAX_FLOORS_GRANTED = 4;
var PERSISTED_OUTPUT_FIELDS = new Set(["persistedOutputPath", "persistedOutputSize", "rawOutputPath"]);
//@ chunk-ad2e1aj6.js:18145-18475 placement
/**
 * 把远程工具结果中过大的文本/图片写入本机文件并返回替代说明（字节上限、图片上限）。
 */
function spillServedOutput({
  content,
  output,
  targetName,
  shellToolName,
  localSpillPaths,
  localSpillDirs,
  maxInlineBytes = DEFAULT_MAX_INLINE_BYTES,
  maxImageBytes = DEFAULT_MAX_IMAGE_BYTES,
}) {
  let R = unreadableSpillNote({
    targetName,
    shellToolName,
    localSpillPaths,
    localSpillDirs,
  });
  let w = outputTruncatedNote(targetName);
  let C = truncateResultContent(content, R, maxInlineBytes, maxImageBytes, w, targetName);
  let P = truncateStructuredResult(output, R, maxInlineBytes, w);
  return {
    content: C.content,
    output: P.value,
    truncated: C.truncated || P.truncated,
  };
}
//@ chunk-ad2e1aj6.js:18475-19037 placement
function unreadableSpillNote({ targetName, shellToolName, localSpillPaths, localSpillDirs }) {
  let r = `a file on ${targetName} that cannot be read from here \u2014 the command already ran on ${targetName}, so only this part of its output is out of reach. If it is safe to repeat, re-run it there with ${outputFilterHint(shellToolName)} to see the part you need`;
  let mapped = localSpillDirs
    .filter((localSpillDir) => localSpillDir.length > 0)
    .map(
      (localSpillDir) =>
        new RegExp(
          `${urlPatternToRegex(localSpillDir)}(?:[\\\\/][^\\s"'\`;|&()<>]*|(?=$|[^A-Za-z0-9._-])|(?=\\.(?:$|[^A-Za-z0-9_-])))`,
          "g",
        ),
    );
  let filtered = localSpillPaths.filter((localSpillPath) => localSpillPath.length > 0);
  return (O) =>
    mapped.reduce(
      (acc, w) => acc.replace(w, () => r),
      filtered.reduce((acc, w) => acc.replaceAll(w, () => r), O),
    );
}
//@ chunk-ad2e1aj6.js:19037-20146 placement
function truncateResultContent(content, n, maxInlineBytes, imageRemaining, r, targetName) {
  if (typeof content === "string") {
    let R = scanPreBoundaryMetadata(n(content), maxInlineBytes, r);
    return {
      content: R.text,
      truncated: R.truncated,
    };
  }
  let { blocks, truncated } = content.reduce(
    (acc, w) => {
      if (w.type === "image") {
        let P = w.source.type === "base64" ? w.source.data.length : undefined;
        if (P === undefined || P > acc.imageRemaining) {
          let x =
            P === undefined
              ? `(an image referenced by URL was omitted on ${targetName})`
              : `(an image was omitted on ${targetName}: too large to return)`;
          acc.blocks.push({
            type: "text",
            text: x,
          });
          return {
            ...acc,
            remaining: Math.max(0, acc.remaining - Buffer.byteLength(x)),
            truncated: true,
          };
        }
        acc.blocks.push(w);
        return {
          ...acc,
          imageRemaining: acc.imageRemaining - P,
        };
      }
      if (w.type !== "text") {
        let P = `(a ${w.type} block was omitted on ${targetName})`;
        acc.blocks.push({
          type: "text",
          text: P,
        });
        return {
          ...acc,
          remaining: Math.max(0, acc.remaining - Buffer.byteLength(P)),
          truncated: true,
        };
      }
      if (acc.remaining === 0 && acc.truncated) return acc;
      let C = scanPreBoundaryMetadata(n(w.text), acc.remaining, r);
      acc.blocks.push({
        ...w,
        text: C.text,
      });
      return {
        blocks: acc.blocks,
        remaining: Math.max(0, acc.remaining - Buffer.byteLength(C.text)),
        imageRemaining: acc.imageRemaining,
        truncated: acc.truncated || C.truncated,
      };
    },
    {
      blocks: [],
      remaining: maxInlineBytes,
      imageRemaining,
      truncated: false,
    },
  );
  return {
    content: blocks,
    truncated,
  };
}
//@ chunk-ad2e1aj6.js:20146-20920 placement
function truncateStructuredResult(output, n, maxInlineBytes, h) {
  let r = {
    remaining: maxInlineBytes,
    entriesRemaining: MAX_TOTAL_ENTRIES,
    markerSpent: false,
    floorsGranted: 0,
  };
  if (typeof output !== "object" || output === null || Array.isArray(output))
    return truncateJsonValue(output, n, r, h, 0);
  if (Reflect.get(output, "isImage") === true)
    return {
      value: undefined,
      truncated: false,
    };
  let any = Object.entries(output).some(([key, value]) => PERSISTED_OUTPUT_FIELDS.has(key) && Boolean(value));
  let y = Reflect.get(output, "persistedOutputSize");
  let O = typeof y === "number" && Number.isSafeInteger(y) && y > 0 ? [[SPILLEDOUTPUTBYTES, y]] : [];
  let min = Math.min(MAX_FLOOR_BYTES, maxInlineBytes);
  let w = truncateObjectEntries(
    [...Object.entries(output).filter(([key]) => !PERSISTED_OUTPUT_FIELDS.has(key)), ...O],
    n,
    r,
    (P) => (typeof P === "string" ? truncateString(P, n, r, h, min) : truncateJsonValue(P, n, r, h, 1)),
  );
  let mapped = w.entries.map(([P, x]) =>
    any && P === "stdout" && typeof x.value === "string" && !x.truncated
      ? [
          P,
          {
            value: `${x.value}${h}`,
            truncated: true,
          },
        ]
      : [P, x],
  );
  return {
    value: Object.fromEntries(mapped.map(([P, x]) => [P, x.value])),
    truncated: w.truncated || mapped.some(([, P]) => P.truncated),
  };
}
//@ chunk-ad2e1aj6.js:20920-21092 placement
function truncateObjectEntries(e, n, s, h) {
  let r = takeEntriesWithinBudget(e, s);
  let i = new Set();
  let y = false;
  return {
    entries: r.map(([R, w]) => {
      let C = uniqueSpillName(spillNameWithBudget(R, n, s), i);
      y ||= C !== R;
      i.add(C);
      return [C, h(w)];
    }),
    truncated: r.length < e.length || y,
  };
}
//@ chunk-ad2e1aj6.js:21092-21631 placement
function truncateJsonValue(e, n, s, h, r) {
  if (typeof e === "string") return truncateString(e, n, s, h, 0);
  if (typeof e !== "object" || e === null) {
    consumeBudget(s, Buffer.byteLength(String(e)));
    return {
      value: e,
      truncated: false,
    };
  }
  if (r >= MAX_JSON_DEPTH)
    return {
      value: undefined,
      truncated: true,
    };
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
  let i = r > 0 && s.floorsGranted < MAX_FLOORS_GRANTED;
  let y = i ? Math.max(s.remaining, r) : s.remaining;
  let O = n(e);
  if (y === 0 && s.markerSpent)
    return {
      value: "",
      truncated: O.length > 0,
    };
  let R = scanPreBoundaryMetadata(O, y, s.markerSpent ? "" : h);
  if (R.truncated) s.markerSpent = true;
  let w = Buffer.byteLength(R.text);
  if (i && y > s.remaining && w > s.remaining) s.floorsGranted += 1;
  consumeBudget(s, w);
  return {
    value: R.text,
    truncated: R.truncated,
  };
}
//@ chunk-ad2e1aj6.js:21996-22100 placement
function takeEntriesWithinBudget(e, n) {
  let sliced = e.slice(0, Math.min(MAX_ENTRIES_PER_LEVEL, n.entriesRemaining));
  n.entriesRemaining -= sliced.length;
  return sliced;
}
//@ chunk-ad2e1aj6.js:22100-22179 placement
function uniqueSpillName(e, n, s = 1) {
  let h = s === 1 ? e : `${e} (${s})`;
  return n.has(h) ? uniqueSpillName(e, n, s + 1) : h;
}
//@ chunk-ad2e1aj6.js:22179-22252 placement
function spillNameWithBudget(e, n, s) {
  let h = truncateToLength(n(e), MAX_KEY_CHARS);
  consumeBudget(s, Buffer.byteLength(h));
  return h;
}
//@ chunk-ad2e1aj6.js:22252-22307 placement
function consumeBudget(e, n) {
  e.remaining = Math.max(0, e.remaining - n);
}
export { spillServedOutput, unreadableSpillNote };
