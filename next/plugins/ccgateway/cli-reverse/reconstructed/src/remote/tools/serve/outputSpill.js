/**
 * remote/tools/serve/outputSpill.ts
 *
 * 2.1.316 新增：服务端工具输出截断与溢出到文件
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-nvm0wye1.js (12)
 * attribution: placement 12
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { outputTruncatedNote, SPILLEDOUTPUTBYTES } from "../protocolConstants.js";
import { outputFilterHint } from "../../../tools/shared/textSearchTools.js";
import { urlPatternToRegex, truncateToLength } from "../../../utils/stringUtils.js";
import { scanPreBoundaryMetadata } from "../../../utils/sessionStorage.js";

//@ chunk-nvm0wye1.js:18351-18491 placement
var DEFAULT_MAX_INLINE_BYTES = 204800;
var DEFAULT_MAX_IMAGE_BYTES = 1048576;
var MAX_JSON_DEPTH = 8;
var MAX_KEY_CHARS = 256;
var MAX_ENTRIES_PER_LEVEL = 1000;
var MAX_TOTAL_ENTRIES = 2000;
var MAX_FLOOR_BYTES = 4096;
var MAX_FLOORS_GRANTED = 4;
var PERSISTED_OUTPUT_FIELDS = new Set(["persistedOutputPath", "persistedOutputSize", "rawOutputPath"]);
//@ chunk-nvm0wye1.js:18491-18821 placement
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
  let spillNote = unreadableSpillNote({
    targetName,
    shellToolName,
    localSpillPaths,
    localSpillDirs,
  });
  let truncatedNote = outputTruncatedNote(targetName);
  let contentResult = truncateResultContent(
    content,
    spillNote,
    maxInlineBytes,
    maxImageBytes,
    truncatedNote,
    targetName,
  );
  let outputResult = truncateStructuredResult(output, spillNote, maxInlineBytes, truncatedNote);
  return {
    content: contentResult.content,
    output: outputResult.value,
    truncated: contentResult.truncated || outputResult.truncated,
  };
}
//@ chunk-nvm0wye1.js:18821-19383 placement
function unreadableSpillNote({ targetName, shellToolName, localSpillPaths, localSpillDirs }) {
  let unreadableText = `a file on ${targetName} that cannot be read from here \u2014 the command already ran on ${targetName}, so only this part of its output is out of reach. If it is safe to repeat, re-run it there with ${outputFilterHint(shellToolName)} to see the part you need`;
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
  return (text) =>
    mapped.reduce(
      (acc, dirPattern) => acc.replace(dirPattern, () => unreadableText),
      filtered.reduce((acc, path) => acc.replaceAll(path, () => unreadableText), text),
    );
}
//@ chunk-nvm0wye1.js:19383-20492 placement
function truncateResultContent(content, rewrite, maxBytes, imageRemaining, truncatedNote, targetName) {
  if (typeof content === "string") {
    let scanned = scanPreBoundaryMetadata(rewrite(content), maxBytes, truncatedNote);
    return {
      content: scanned.text,
      truncated: scanned.truncated,
    };
  }
  let { blocks, truncated } = content.reduce(
    (acc, block) => {
      if (block.type === "image") {
        let imageBytes = block.source.type === "base64" ? block.source.data.length : undefined;
        if (imageBytes === undefined || imageBytes > acc.imageRemaining) {
          let omittedNote =
            imageBytes === undefined
              ? `(an image referenced by URL was omitted on ${targetName})`
              : `(an image was omitted on ${targetName}: too large to return)`;
          acc.blocks.push({
            type: "text",
            text: omittedNote,
          });
          return {
            ...acc,
            remaining: Math.max(0, acc.remaining - Buffer.byteLength(omittedNote)),
            truncated: true,
          };
        }
        acc.blocks.push(block);
        return {
          ...acc,
          imageRemaining: acc.imageRemaining - imageBytes,
        };
      }
      if (block.type !== "text") {
        let omittedNote = `(a ${block.type} block was omitted on ${targetName})`;
        acc.blocks.push({
          type: "text",
          text: omittedNote,
        });
        return {
          ...acc,
          remaining: Math.max(0, acc.remaining - Buffer.byteLength(omittedNote)),
          truncated: true,
        };
      }
      if (acc.remaining === 0 && acc.truncated) return acc;
      let scanned = scanPreBoundaryMetadata(rewrite(block.text), acc.remaining, truncatedNote);
      acc.blocks.push({
        ...block,
        text: scanned.text,
      });
      return {
        blocks: acc.blocks,
        remaining: Math.max(0, acc.remaining - Buffer.byteLength(scanned.text)),
        imageRemaining: acc.imageRemaining,
        truncated: acc.truncated || scanned.truncated,
      };
    },
    {
      blocks: [],
      remaining: maxBytes,
      imageRemaining,
      truncated: false,
    },
  );
  return {
    content: blocks,
    truncated,
  };
}
//@ chunk-nvm0wye1.js:20492-21266 placement
function truncateStructuredResult(output, rewrite, maxInlineBytes, truncatedNote) {
  let budget = {
    remaining: maxInlineBytes,
    entriesRemaining: MAX_TOTAL_ENTRIES,
    markerSpent: false,
    floorsGranted: 0,
  };
  if (typeof output !== "object" || output === null || Array.isArray(output))
    return truncateJsonValue(output, rewrite, budget, truncatedNote, 0);
  if (Reflect.get(output, "isImage") === true)
    return {
      value: undefined,
      truncated: false,
    };
  let any = Object.entries(output).some(([key, value]) => PERSISTED_OUTPUT_FIELDS.has(key) && Boolean(value));
  let persistedSize = Reflect.get(output, "persistedOutputSize");
  let sizeEntry =
    typeof persistedSize === "number" && Number.isSafeInteger(persistedSize) && persistedSize > 0
      ? [[SPILLEDOUTPUTBYTES, persistedSize]]
      : [];
  let min = Math.min(MAX_FLOOR_BYTES, maxInlineBytes);
  let entries = truncateObjectEntries(
    [...Object.entries(output).filter(([key]) => !PERSISTED_OUTPUT_FIELDS.has(key)), ...sizeEntry],
    rewrite,
    budget,
    (value) =>
      typeof value === "string"
        ? truncateString(value, rewrite, budget, truncatedNote, min)
        : truncateJsonValue(value, rewrite, budget, truncatedNote, 1),
  );
  let mapped = entries.entries.map(([key, entry]) =>
    any && key === "stdout" && typeof entry.value === "string" && !entry.truncated
      ? [
          key,
          {
            value: `${entry.value}${truncatedNote}`,
            truncated: true,
          },
        ]
      : [key, entry],
  );
  return {
    value: Object.fromEntries(mapped.map(([key, entry]) => [key, entry.value])),
    truncated: entries.truncated || mapped.some(([, entry]) => entry.truncated),
  };
}
//@ chunk-nvm0wye1.js:21266-21438 placement
function truncateObjectEntries(entries, rewrite, budget, convert) {
  let taken = takeEntriesWithinBudget(entries, budget);
  let usedNames = new Set();
  let renamed = false;
  return {
    entries: taken.map(([key, value]) => {
      let newKey = uniqueSpillName(spillNameWithBudget(key, rewrite, budget), usedNames);
      renamed ||= newKey !== key;
      usedNames.add(newKey);
      return [newKey, convert(value)];
    }),
    truncated: taken.length < entries.length || renamed,
  };
}
//@ chunk-nvm0wye1.js:21438-21977 placement
function truncateJsonValue(value, rewrite, budget, truncatedNote, depth) {
  if (typeof value === "string") return truncateString(value, rewrite, budget, truncatedNote, 0);
  if (typeof value !== "object" || value === null) {
    consumeBudget(budget, Buffer.byteLength(String(value)));
    return {
      value,
      truncated: false,
    };
  }
  if (depth >= MAX_JSON_DEPTH)
    return {
      value: undefined,
      truncated: true,
    };
  if (Array.isArray(value)) {
    let mapped = takeEntriesWithinBudget(value, budget).map((item) =>
      truncateJsonValue(item, rewrite, budget, truncatedNote, depth + 1),
    );
    return {
      value: mapped.map((item) => item.value),
      truncated: mapped.length < value.length || mapped.some((item) => item.truncated),
    };
  }
  let entries = truncateObjectEntries(Object.entries(value), rewrite, budget, (value) =>
    truncateJsonValue(value, rewrite, budget, truncatedNote, depth + 1),
  );
  return {
    value: Object.fromEntries(entries.entries.map(([key, entry]) => [key, entry.value])),
    truncated: entries.truncated || entries.entries.some(([, entry]) => entry.truncated),
  };
}
//@ chunk-nvm0wye1.js:21977-22342 placement
function truncateString(text, rewrite, budget, truncatedNote, floorBytes) {
  let canGrantFloor = floorBytes > 0 && budget.floorsGranted < MAX_FLOORS_GRANTED;
  let allowedBytes = canGrantFloor ? Math.max(budget.remaining, floorBytes) : budget.remaining;
  let rewritten = rewrite(text);
  if (allowedBytes === 0 && budget.markerSpent)
    return {
      value: "",
      truncated: rewritten.length > 0,
    };
  let scanned = scanPreBoundaryMetadata(rewritten, allowedBytes, budget.markerSpent ? "" : truncatedNote);
  if (scanned.truncated) budget.markerSpent = true;
  let byteCount = Buffer.byteLength(scanned.text);
  if (canGrantFloor && allowedBytes > budget.remaining && byteCount > budget.remaining)
    budget.floorsGranted += 1;
  consumeBudget(budget, byteCount);
  return {
    value: scanned.text,
    truncated: scanned.truncated,
  };
}
//@ chunk-nvm0wye1.js:22342-22446 placement
function takeEntriesWithinBudget(entries, budget) {
  let sliced = entries.slice(0, Math.min(MAX_ENTRIES_PER_LEVEL, budget.entriesRemaining));
  budget.entriesRemaining -= sliced.length;
  return sliced;
}
//@ chunk-nvm0wye1.js:22446-22525 placement
function uniqueSpillName(name, used, suffix = 1) {
  let candidate = suffix === 1 ? name : `${name} (${suffix})`;
  return used.has(candidate) ? uniqueSpillName(name, used, suffix + 1) : candidate;
}
//@ chunk-nvm0wye1.js:22525-22597 placement
function spillNameWithBudget(key, rewrite, budget) {
  let clipped = truncateToLength(rewrite(key), MAX_KEY_CHARS);
  consumeBudget(budget, Buffer.byteLength(clipped));
  return clipped;
}
//@ chunk-nvm0wye1.js:22597-22652 placement
function consumeBudget(budget, bytes) {
  budget.remaining = Math.max(0, budget.remaining - bytes);
}
export { spillServedOutput, unreadableSpillNote };
