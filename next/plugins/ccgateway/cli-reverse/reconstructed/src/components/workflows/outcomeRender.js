/**
 * components/workflows/outcomeRender.ts
 *
 * 2.1.316 新增。工作流结果渲染。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-axsvbsqv.js (8)
 * attribution: placement 8
 */
import { jsonParse, jsonStringifyRaw } from "../../utils/slowOperations.js";
import { truncateToWidth, splitByDisplayWidth } from "../../utils/format.js";
import { expandTabsInText } from "../../ink/wrapAnsi.js";
import { bunStringWidth } from "../../ink/stringWidth.js";

//@ chunk-axsvbsqv.js:5872-5983 placement
var OUTCOME_INDENT = "  ";
var MAX_OUTCOME_KEY_WIDTH = 40;
var MIN_JSON_RENDER_WIDTH = 8;
var UNSAFE_OUTCOME_CHAR_RE = /[\x00-\x08\x0a-\x1f\x7f-\x9f\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069]/g;
var KEY_SEPARATOR = ": ";
//@ chunk-axsvbsqv.js:5983-6142 placement
function renderJsonOutcomeLines(text, width) {
  let trimmed = text.trim();
  if (width < MIN_JSON_RENDER_WIDTH || (!trimmed.startsWith("{") && !trimmed.startsWith("["))) return null;
  try {
    let lines = [];
    renderJsonOutcome(lines, jsonParse(trimmed), 0, undefined, false, width);
    return lines;
  } catch {
    return null;
  }
}
//@ chunk-axsvbsqv.js:6142-6236 placement
function progressBar(depth, width) {
  let floored = Math.floor(Math.max(0, width - MIN_JSON_RENDER_WIDTH) / OUTCOME_INDENT.length);
  return OUTCOME_INDENT.repeat(Math.min(depth, floored));
}
//@ chunk-axsvbsqv.js:6236-6330 placement
function escapeControlChars(text) {
  return text.replace(
    UNSAFE_OUTCOME_CHAR_RE,
    (char) => `\\u${char.charCodeAt(0).toString(16).padStart(4, "0")}`,
  );
}
//@ chunk-axsvbsqv.js:6330-6362 placement
function escapeRenderedText(value) {
  return escapeControlChars(jsonStringifyRaw(value));
}
//@ chunk-axsvbsqv.js:6362-6459 placement
function withEllipsisSuffix(segment, width) {
  return segment === undefined
    ? []
    : [
        {
          ...segment,
          text: truncateToWidth(segment.text, width - KEY_SEPARATOR.length),
        },
        {
          text: KEY_SEPARATOR,
          dimColor: true,
        },
      ];
}
//@ chunk-axsvbsqv.js:6459-6736 placement
function pushWrappedOutcome(lines, depth, keySegment, chunks, width, color) {
  if (keySegment) {
    let indent = progressBar(depth, width);
    lines.push([
      {
        text: indent,
      },
      {
        ...keySegment,
        text: truncateToWidth(keySegment.text, width - indent.length - 1),
      },
      {
        text: ":",
        dimColor: true,
      },
    ]);
  }
  let valueIndent = progressBar(keySegment ? depth + 1 : depth, width);
  let chunkWidth = width - valueIndent.length;
  for (let chunk of chunks) {
    if (chunk === "") {
      lines.push([
        {
          text: "",
        },
      ]);
      continue;
    }
    for (let piece of splitByDisplayWidth(chunk, chunkWidth))
      lines.push([
        color
          ? {
              text: valueIndent + piece,
              color,
            }
          : {
              text: valueIndent + piece,
            },
      ]);
  }
}
//@ chunk-axsvbsqv.js:6736-7923 placement
function renderJsonOutcome(lines, value, depth, keyLabel, hasMore, width) {
  let indent = progressBar(depth, width);
  let availableWidth = width - indent.length;
  let trailingComma = hasMore ? "," : "";
  let keySegment =
    typeof keyLabel === "string"
      ? {
          text: escapeRenderedText(keyLabel),
          color: "permission",
        }
      : undefined;
  if (typeof value === "object" && value !== null) {
    if (depth >= MAX_OUTCOME_KEY_WIDTH) throw RangeError("JSON outcome nested past MAX_DEPTH");
    let entries = Array.isArray(value)
      ? value.map((element, elementIndex) => [elementIndex, element])
      : Object.entries(value);
    let [openBracket, closeBracket] = Array.isArray(value) ? ["[", "]"] : ["{", "}"];
    if (entries.length === 0) {
      let emptyContainerText = openBracket + closeBracket + trailingComma;
      lines.push([
        {
          text: indent,
        },
        ...withEllipsisSuffix(keySegment, availableWidth - emptyContainerText.length),
        {
          text: emptyContainerText,
          dimColor: true,
        },
      ]);
      return;
    }
    lines.push([
      {
        text: indent,
      },
      ...withEllipsisSuffix(keySegment, availableWidth - openBracket.length),
      {
        text: openBracket,
        dimColor: true,
      },
    ]);
    for (let idx = 0; idx < entries.length; idx++) {
      let [entryKey, entryValue] = entries[idx];
      renderJsonOutcome(lines, entryValue, depth + 1, entryKey, idx < entries.length - 1, width);
    }
    lines.push([
      {
        text: indent,
      },
      {
        text: closeBracket + trailingComma,
        dimColor: true,
      },
    ]);
    return;
  }
  if (
    typeof value === "number" &&
    (Number.isInteger(value) ? !Number.isSafeInteger(value) : !Number.isFinite(value))
  )
    throw RangeError("JSON outcome number not representable");
  if (
    typeof value === "string" &&
    value.includes(`
`)
  ) {
    pushWrappedOutcome(
      lines,
      depth,
      keySegment ??
        (typeof keyLabel === "number"
          ? {
              text: `[${keyLabel}]`,
              dimColor: true,
            }
          : undefined),
      value
        .replace(/(?:\r?\n)+$/, "")
        .split(/\r?\n/)
        .map((line) => expandTabsInText(escapeControlChars(line))),
      width,
      undefined,
    );
    return;
  }
  let valueText = typeof value === "string" ? escapeRenderedText(value) : String(value);
  let valueColor = typeof value === "string" ? "success" : "warning";
  if (
    (keySegment === undefined ? 0 : bunStringWidth(keySegment.text) + KEY_SEPARATOR.length) +
      bunStringWidth(valueText) +
      trailingComma.length <=
    availableWidth
  ) {
    lines.push([
      {
        text: indent,
      },
      ...withEllipsisSuffix(keySegment, availableWidth),
      {
        text: valueText,
        color: valueColor,
      },
      ...(trailingComma
        ? [
            {
              text: trailingComma,
              dimColor: true,
            },
          ]
        : []),
    ]);
    return;
  }
  pushWrappedOutcome(lines, depth, keySegment, [valueText + trailingComma], width, valueColor);
}
export { renderJsonOutcomeLines };
