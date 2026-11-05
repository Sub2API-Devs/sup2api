/**
 * history.ts
 *
 * 输入历史（↑ 键/Ctrl+R）：PromptHistoryStore 读写 <配置目录>/history.jsonl，长粘贴转存 paste-cache，按项目/会话过滤，最多 100 条。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/history.ts
 * pieces: chunk-1xrdahqv.js (1), chunk-3n0n2sf6.js (2), chunk-5xgkngpb.js (14), chunk-75v47sk5.js (1), chunk-7jxyna5q.js (60), chunk-cwkrfaxh.js (2), chunk-h44h5gdv.js (1), chunk-sywnjtqb.js (1), chunk-w3ch4xq2.js (5)
 * attribution: fingerprint 10, placement 45, callgraph-fingerprint 1, file-local 2, layout 28, affinity 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { join } from "path";
import { readdir } from "fs/promises";
import { DoctorLazy } from "./cli/handlers/util.js";
import {
  objectSchema,
  numberSchema,
  _enum,
  stringSchema,
  record,
  unknown,
} from "../vendor/zod/v4/classic/schemas.js";
import { regExp, TEAM_SETUP_GUIDE_LABEL, shouldRedactInput } from "./commands.js";
import { normalizeCaseForComparison_2 } from "./utils/permissions/filesystem.js";
import { buildLaunchMessage } from "./commands/ultraplan.js";
import {
  findHistoryCopySpans,
  HISTORY_FILE_RETRY_OPTIONS,
  getHistoryEntryForCommand,
} from "./utils/historyFile.js";
import { STORAGE_SPACES } from "./utils/storage/storageSpaces.js";
import { logForDebugging } from "./utils/debug.js";
import { jsonParseRaw, jsonStringify } from "./utils/slowOperations.js";
import { truncateToLength } from "./utils/stringUtils.js";
import { serializeCalls } from "./utils/promiseQueue.js";
import { getClaudeConfigDir } from "./utils/markdownConfigLoader.js";
import { readLinesReverse, FileChangedDuringReadError } from "./utils/fsOperations.js";
import { logFeatureSad, logFeatureOk, logFeatureBad } from "./services/analytics/featureTelemetry.js";
import {
  getErrnoCode,
  errnoShapedCode,
  storageCauseErrnoCode,
  isSadFsErrnoCode,
  isEnvFsErrnoCode,
} from "./utils/errors.js";
import {
  getProjectRoot,
  getSessionId,
  getRootSession,
  getOriginalCwd,
  isSessionPersistenceDisabled,
} from "./bootstrap/state.js";
import { retrievePastedText, hashPastedText, storePastedTextQueued } from "./utils/pasteStore.js";
import { getFileReader } from "./utils/fileStore.js";
import { lock } from "./utils/lockfile.js";
import { logError } from "./utils/log.js";
import { sleep } from "./utils/sleep.js";
import { isEnvTruthy } from "./utils/envUtils.js";
import { isNestedInteractiveClaudeSession } from "./utils/teammate.js";
import { registerCleanup } from "./utils/cleanupRegistry.js";
import { HostScoped } from "./utils/hostScoped.js";
import { isStoreError } from "./utils/storage/storageErrors.js";
import { SessionRootSlot } from "./bootstrap/sessionSlices.js";
import { readPublishedReadme } from "./services/artifacts/designSystemReadRules.js";
import { README_MD, PROJECT_README_MD } from "./services/artifacts/designSystemGuide.js";
import { getSkillDirCommandsCached } from "./skills/loadSkillsDir.js";
import { sessionTagSalt, createInlineTextTag, MIN_INLINE_TAG_BLOCK } from "./utils/userTurnTags.js";
import { splitPastedContentBlocks, hasWordAfterPunct } from "./utils/pastedContent.js";
import { PASTE_THRESHOLD } from "./utils/imagePaste.js";
import { isVirtualPancakeEnabled } from "./utils/permissions/permissionSetup.js";
import { env } from "./utils/env.js";
import { isOwnTempName } from "./utils/atomicPublishWrite.js";
import { isHashTempFile } from "./services/memorySync/syncFiles.js";
import { deferInit } from "../runtime/deferred-init.js";

//@ chunk-7jxyna5q.js:34664-34842 fingerprint (2.1.88 match: resolveStoredPastedContent, 0.8)
var MAX_HISTORY_ITEMS; // deferred: uses DoctorLazy (./cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var MAX_CLEARED_DRAFTS;
var MAX_CLEARED_DRAFTS_CHARS;
var MAX_PASTED_CONTENT_LENGTH;
var PastedContentSchema;
deferInit("chunk-7jxyna5q.js:34664", () => {
  MAX_HISTORY_ITEMS = 100;
  MAX_CLEARED_DRAFTS = 10;
  MAX_CLEARED_DRAFTS_CHARS = 1e7;
  MAX_PASTED_CONTENT_LENGTH = 1024;
  PastedContentSchema = DoctorLazy(() =>
    objectSchema({
      id: numberSchema(),
      type: _enum(["text", "image"]),
      content: stringSchema().optional(),
      contentHash: stringSchema().optional(),
      mediaType: stringSchema().optional(),
      filename: stringSchema().optional(),
    }),
  );
});
//@ chunk-7jxyna5q.js:34842-34899 file-local
function getPastedTextRefNumLines(text) {
  return (text.match(/\r\n|\r|\n/g) || []).length;
}
//@ chunk-7jxyna5q.js:34899-34996 fingerprint (2.1.88 match: formatPastedTextRef, 0.492)
function formatPastedTextRef(id, numLines, label = "Pasted text") {
  if (numLines === 0) return `[${label} #${id}]`;
  return `[${label} #${id} +${numLines} lines]`;
}
//@ chunk-7jxyna5q.js:34996-35034 fingerprint (2.1.88 match: formatImageRef, 1)
function formatImageRef(id) {
  return `[Image #${id}]`;
}
//@ chunk-7jxyna5q.js:35034-35173 layout
/**
 * 从文本中解析粘贴内容占位符（[Pasted text #N] 等），返回 {id, match, index} 列表。
 */
function parsePastedRefs(display) {
  if (!display) return [];
  return [...display.matchAll(regExp)]
    .map((match) => ({
      id: parseInt(match[2] || "0"),
      match: match[0],
      index: match.index,
    }))
    .filter((ref) => ref.id > 0);
}
//@ chunk-7jxyna5q.js:35173-35235 layout
/**
 * 函数 isValidPasteId（正整数且 < 2^32）；位于「输入历史（↑ 键/Ctrl+R）：PromptHistoryStore 读写 <配置目录>/history.jsonl，长粘贴转存 paste-cache，按项目/会话过滤，最多 100 条」模块。
 */
function isValidPasteId(id) {
  return Number.isInteger(id) && id > 0 && id < 4294967296;
}
//@ chunk-7jxyna5q.js:35235-35636 layout
/**
 * 生成提示历史去重键：把占位符编号替换为 #_，并附上每个占位的内容指纹（哈希、内联内容、不可用或字面量）。
 */
function getPromptHistoryKey(display, pastedContents) {
  let pastedRefs = parsePastedRefs(display);
  if (pastedRefs.length === 0) return display;
  let placeholderKey = display;
  for (let j = pastedRefs.length - 1; j >= 0; j--) {
    let ref = pastedRefs[j];
    placeholderKey =
      placeholderKey.slice(0, ref.index) +
      ref.match.replace(`#${ref.id}`, "#_") +
      placeholderKey.slice(ref.index + ref.match.length);
  }
  let mapped = pastedRefs.map((pastedRef) => {
    let entry = pastedContents?.[pastedRef.id];
    if (!entry) return `literal:${pastedRef.id}`;
    if (entry.unavailable) return "dead";
    return entry.contentHash !== undefined ? `hash:${entry.contentHash}` : `inline:${entry.content ?? ""}`;
  });
  return `${placeholderKey}\x00${mapped.join("\x01")}`;
}
//@ chunk-7jxyna5q.js:35636-35699 layout
/**
 * 函数 addPastedEntry（写入一条粘贴记录）；位于「输入历史（↑ 键/Ctrl+R）：PromptHistoryStore 读写 <配置目录>/history.jsonl，长粘贴转存 paste-cache，按项目/会话过滤，最多 100 条」模块。
 */
function addPastedEntry(display, pastedContents, lookup, refs) {
  return joinPromptSegments(
    splitPromptSegments(display, parsePastedRefs(display), pastedContents, false, lookup),
    refs,
    lookup,
    getInlinePasteTexts(pastedContents),
  );
}
//@ chunk-7jxyna5q.js:35699-35763 layout
var LEADING_COMBINING_MARKS = /^[\p{M}\u1161-\u1175\u11A8-\u11C2\u{16D67}\u{16D68}]+/u;
//@ chunk-7jxyna5q.js:35763-35873 layout (2.1.88 match: setCwdState, 0.843)
function nfcVariants(cwd) {
  let normalized = cwd.normalize("NFC");
  let stripped = normalized.replace(LEADING_COMBINING_MARKS, "").trimStart();
  return normalizeCaseForComparison_2([cwd, normalized, stripped]).filter((variant) => variant !== "");
}
//@ chunk-7jxyna5q.js:35873-36087 layout
/**
 * 收集内联粘贴文本（可包含仅斜杠名的项），含 NFC 变体，按长度降序。
 */
function getInlinePasteTexts(pastedContents, includeSlashOnly = false) {
  let texts = new Set();
  for (let entry of Object.values(pastedContents))
    if (
      entry.type === "text" &&
      entry.inline &&
      entry.content !== "" &&
      (includeSlashOnly || !entry.slashNameOnly)
    )
      for (let variant of nfcVariants(entry.content)) texts.add(variant);
  return [...texts].sort((a, b) => b.length - a.length);
}
//@ chunk-7jxyna5q.js:36087-36582 layout
/**
 * 在占位符之外的文本中查找内联粘贴内容出现的区间，合并重叠后按起点排序。
 */
function findInlinePasteRanges(text, pastedContents, includeSlashOnly = false) {
  if (pastedContents === undefined) return [];
  let inlinePasteTexts = getInlinePasteTexts(pastedContents, includeSlashOnly);
  if (inlinePasteTexts.length === 0) return [];
  let ranges = [];
  let addRange = (from, to) => {
    let cursor = from;
    for (let [rangeFrom, rangeTo] of [...ranges].sort((a, b) => a[0] - b[0])) {
      if (rangeTo <= cursor || rangeFrom >= to) continue;
      if (rangeFrom > cursor) ranges.push([cursor, rangeFrom]);
      cursor = Math.max(cursor, rangeTo);
    }
    if (cursor < to) ranges.push([cursor, to]);
  };
  let addMatchesIn = (from, to) => {
    let sliced = text.slice(from, to);
    for (let inlinePasteText of inlinePasteTexts) {
      let index = sliced.indexOf(inlinePasteText);
      while (index !== -1) {
        addRange(from + index, from + index + inlinePasteText.length);
        index = sliced.indexOf(inlinePasteText, index + 1);
      }
    }
  };
  let cursor = 0;
  for (let ref of parsePastedRefs(text)) {
    if (pastedContents[ref.id] === undefined) continue;
    addMatchesIn(cursor, ref.index);
    cursor = ref.index + ref.match.length;
  }
  addMatchesIn(cursor, text.length);
  return ranges.sort((a, b) => a[0] - b[0]);
}
//@ chunk-7jxyna5q.js:36582-36820 layout
/**
 * 把文本中的"[...Truncated text]"占位替换为对应的完整粘贴内容。
 */
function expandTruncatedPastes(display, pastedContents) {
  if (pastedContents === undefined) return display;
  let out = "";
  let cursor = 0;
  for (let ref of parsePastedRefs(display)) {
    let entry = pastedContents[ref.id];
    if (entry?.type === "text" && !entry.inline && ref.match.startsWith("[...Truncated text")) {
      out += display.slice(cursor, ref.index) + entry.content;
      cursor = ref.index + ref.match.length;
    }
  }
  return out + display.slice(cursor);
}
//@ chunk-7jxyna5q.js:36820-37008 layout
/**
 * 生成启动消息片段，排除与粘贴内容重叠的部分；粘贴中有 ultraplan 而原文没有时返回空。
 */
function getLaunchMessagesOutsidePastes(messageText, pastedContents) {
  let inlinePasteTexts = getInlinePasteTexts(pastedContents ?? {});
  let launchMessage = buildLaunchMessage(messageText);
  if (inlinePasteTexts.length === 0) return launchMessage;
  if (
    inlinePasteTexts.some(
      (inlinePasteText) => /ultraplan/i.test(inlinePasteText) && !messageText.includes(inlinePasteText),
    )
  )
    return [];
  let inlinePasteRanges = findInlinePasteRanges(messageText, pastedContents);
  return launchMessage.filter((range) => !rangesOverlap(range.start, range.end, inlinePasteRanges));
}
//@ chunk-7jxyna5q.js:37008-37051 file-local
function flushPromptHistory(disconnectedBridge, pastedContents) {
  return getLaunchMessagesOutsidePastes(disconnectedBridge, pastedContents).length > 0;
}
//@ chunk-7jxyna5q.js:37051-37103 layout
function rangesOverlap(start, end, inlinePasteRanges) {
  return inlinePasteRanges.some(([from, to]) => start < to && end > from);
}
//@ chunk-7jxyna5q.js:37103-37179 layout
function isPastedPlaceholderText(match) {
  return match.startsWith("[Pasted text") || match.startsWith(`[${TEAM_SETUP_GUIDE_LABEL}`);
}
//@ chunk-7jxyna5q.js:37179-37312 layout
/**
 * 取文本中占位符对应、仍可用的手动输入粘贴内容。
 */
function getTypedPasteContents(text, nextPasteId) {
  return parsePastedRefs(text).flatMap((ref) => {
    let entry = nextPasteId[ref.id];
    return entry?.type === "text" && entry.unavailable !== true && isPastedPlaceholderText(ref.match)
      ? [entry.content]
      : [];
  });
}
//@ chunk-7jxyna5q.js:37312-37807 layout
/**
 * 按占位符把提示拆成段：用户输入的文本、展开的粘贴内容（可经变换标为非输入）、不可用或非文本占位保持原样。
 */
function splitPromptSegments(display, pastedRefs, pastedContents, skipUnavailable, wrapUntyped) {
  let segments = [];
  let end = display.length;
  for (let j = pastedRefs.length - 1; j >= 0; j--) {
    let ref = pastedRefs[j];
    segments.unshift({
      text: display.slice(ref.index + ref.match.length, end),
      typed: true,
    });
    end = ref.index;
    let entry = pastedContents[ref.id];
    if (entry?.unavailable === true) {
      if (!skipUnavailable || ref.match.startsWith("[Image"))
        segments.unshift({
          text: ref.match,
          typed: true,
        });
      continue;
    }
    if (entry?.type !== "text") {
      segments.unshift({
        text: ref.match,
        typed: true,
      });
      continue;
    }
    if (!isPastedPlaceholderText(ref.match) || !wrapUntyped) {
      segments.unshift({
        text: entry.content,
        typed: true,
      });
      continue;
    }
    segments.unshift({
      text: wrapUntyped(entry.content),
      typed: false,
    });
  }
  segments.unshift({
    text: display.slice(0, end),
    typed: true,
  });
  return segments;
}
//@ chunk-7jxyna5q.js:37807-38254 layout
/**
 * 把提示段拼回文本：输入段可经转换（可按内联粘贴再拆分），非输入段之后补换行。
 */
function joinPromptSegments(segments, transformTyped, inlinePasteTexts, inlinePasteTexts_2 = []) {
  if (!transformTyped && !inlinePasteTexts) return segments.map((segment) => segment.text).join("");
  let transform = transformTyped ?? ((text) => text);
  let out = [];
  let pendingTyped = "";
  let flushTyped = () => {
    if (pendingTyped === "") return;
    if (inlinePasteTexts && inlinePasteTexts_2.length > 0)
      out.push(
        ...splitByInlinePastes(pendingTyped, inlinePasteTexts_2, inlinePasteTexts).map((segment) =>
          segment.typed
            ? {
                text: transform(segment.text),
                typed: true,
              }
            : segment,
        ),
      );
    else
      out.push({
        text: transform(pendingTyped),
        typed: true,
      });
    pendingTyped = "";
  };
  for (let segment of segments) {
    if (segment.typed) {
      pendingTyped += segment.text;
      continue;
    }
    flushTyped();
    out.push(segment);
  }
  flushTyped();
  let joined = "";
  for (let idx = 0; idx < out.length; idx++) {
    let segment = out[idx];
    joined += segment.text;
    let text = out[idx + 1]?.text ?? "";
    if (
      !segment.typed &&
      text !== "" &&
      !text.startsWith(`
`)
    )
      joined += `
`;
  }
  return joined;
}
//@ chunk-7jxyna5q.js:38254-38490 layout
function splitByInlinePastes(text, inlinePasteTexts, wrap) {
  let segments = [];
  let cursor = 0;
  for (let span of findHistoryCopySpans(text, inlinePasteTexts)) {
    if (span.from > cursor)
      segments.push({
        text: text.slice(cursor, span.from),
        typed: true,
      });
    segments.push({
      text: wrap(text.slice(span.from, span.to)),
      typed: false,
    });
    cursor = span.to;
  }
  if (cursor < text.length || segments.length === 0)
    segments.push({
      text: text.slice(cursor),
      typed: true,
    });
  return segments;
}
//@ chunk-7jxyna5q.js:38490-38567 layout
function stripPlaceholders(display, pastedContents) {
  let { stripped, removed } = expandPromptForSubmit(display, pastedContents);
  return {
    input: stripped,
    removed,
  };
}
//@ chunk-7jxyna5q.js:38567-38939 layout
/**
 * 展开提示中的占位：去掉已不可用的粘贴占位（记录被删的项），并生成展开后的文本。
 */
function expandPromptForSubmit(display, pastedContents, wrapUntyped, escapePastedContentTag) {
  let pastedRefs = parsePastedRefs(display);
  let removed = [];
  let stripped = display;
  for (let j = pastedRefs.length - 1; j >= 0; j--) {
    let ref = pastedRefs[j];
    if (!ref.match.startsWith("[Image") && pastedContents[ref.id]?.unavailable === true) {
      stripped = stripped.slice(0, ref.index) + stripped.slice(ref.index + ref.match.length);
      removed.unshift({
        id: ref.id,
        label: ref.match.startsWith("[...Truncated text") ? "Truncated text" : "Pasted text",
      });
    }
  }
  let expanded = joinPromptSegments(
    splitPromptSegments(display, pastedRefs, pastedContents, true, wrapUntyped),
    escapePastedContentTag,
    wrapUntyped,
    getInlinePasteTexts(pastedContents),
  );
  return {
    stripped,
    expanded,
    removed,
  };
}
//@ chunk-7jxyna5q.js:38939-38980 layout
/**
 * 函数 stripPlaceholdersWithOptions（带选项的剥离）；位于「输入历史（↑ 键/Ctrl+R）：PromptHistoryStore 读写 <配置目录>/history.jsonl，长粘贴转存 paste-cache，按项目/会话过滤，最多 100 条」模块。
 */
function stripPlaceholdersWithOptions(text, pastedContents, wrapUntyped, escapePastedContentTag) {
  return expandPromptForSubmit(text, pastedContents, wrapUntyped, escapePastedContentTag);
}
//@ chunk-7jxyna5q.js:38980-39145 layout
function getReferencedTextPastes(display, pastedContents) {
  if (!pastedContents) return [];
  let referencedIds = new Set(parsePastedRefs(display).map((ref) => ref.id));
  return Object.entries(pastedContents).filter(
    (pair) => pair[1].type === "text" && !pair[1].unavailable && referencedIds.has(Number(pair[0])),
  );
}
//@ chunk-7jxyna5q.js:39145-39334 layout
/**
 * 说明哪些粘贴内容已不可用并已从提示中移除。
 */
function describeRemovedPastes(removed) {
  let labels = describePlaceholders(removed);
  let joined = labels.join(", ");
  return labels.length === 1
    ? `${joined} is no longer available and was removed from the prompt`
    : `${joined} are no longer available and were removed from the prompt`;
}
//@ chunk-7jxyna5q.js:39334-39507 layout
/**
 * 生成粘贴内容不可用导致未发送的错误提示，请用户放回原文后重发。
 */
function buildUnavailablePasteError(removed) {
  let labels = describePlaceholders(removed);
  return `Not sent: ${labels.join(", ")} ${labels.length === 1 ? "is" : "are"} no longer available. Put that text back in place of its placeholder and send again.`;
}
//@ chunk-7jxyna5q.js:39507-39566 layout
function describePlaceholders(removed) {
  return normalizeCaseForComparison_2(removed.map((item) => `${item.label} #${item.id}`));
}
//@ chunk-7jxyna5q.js:39566-39578 layout
/**
 * 导出值：MAX_HISTORY_ENTRIES（1e5：历史条数上限）；位于「输入历史（↑ 键/Ctrl+R）：PromptHistoryStore 读写 <配置目录>/history.jsonl，长粘贴转存 paste-cache，按项目/会话过滤，最多 100 条」模块。
 */
var MAX_HISTORY_ENTRIES = 1e5;
//@ chunk-7jxyna5q.js:39578-39882 layout
/**
 * 把最后一个可用的文本粘贴占位就地展开（内容过长时不展开），返回展开文本、ID 与光标位置。
 */
function expandLastPaste(display, pastedContents) {
  let bestRef = null;
  for (let ref of parsePastedRefs(display)) {
    let entry = pastedContents[ref.id];
    if (entry?.type !== "text" || entry.unavailable) continue;
    if (!bestRef || ref.id > bestRef.id) bestRef = ref;
  }
  if (!bestRef) return null;
  let content = pastedContents[bestRef.id].content;
  if (content.length > MAX_HISTORY_ENTRIES) return null;
  return {
    expanded: display.slice(0, bestRef.index) + content + display.slice(bestRef.index + bestRef.match.length),
    id: bestRef.id,
    cursorOffset: bestRef.index + content.length,
  };
}
//@ chunk-7jxyna5q.js:39882-39903 layout
var MAX_HISTORY_ENTRY_CHARS = 200;
var MAX_PASTED_CONTENT_BYTES = 262144;
//@ chunk-7jxyna5q.js:39903-40469 layout
/**
 * 从存储倒序分页读取输入历史记录（首页按条数、之后按字节），逐行产出；游标不前进时报错。
 */
async function* readHistoryRecordsBackward(storage) {
  let fromSeq;
  for (;;) {
    let records = await storage.readRecords(STORAGE_SPACES.history(), {
      order: "backward",
      ...(fromSeq === undefined
        ? {
            limit: MAX_HISTORY_ENTRY_CHARS,
          }
        : {
            maxBytes: MAX_PASTED_CONTENT_BYTES,
            fromSeq,
          }),
    });
    if (!records.ok) {
      if (records.error.code === "NotFound") return;
      throw Error("history readRecords failed", {
        cause: records.error,
      });
    }
    for (let item of records.value.items) {
      let str = Buffer.from(item.data.buffer, item.data.byteOffset, item.data.byteLength).toString("utf8");
      let line = str.endsWith(`
`)
        ? str.slice(0, -1)
        : str;
      if (line) yield line;
    }
    let nextSeq = records.value.nextSeq;
    if (nextSeq === undefined) return;
    if (fromSeq !== undefined && nextSeq >= fromSeq)
      throw Error("history readRecords cursor failed to advance", {
        cause: {
          fromSeq,
          nextSeq,
        },
      });
    fromSeq = nextSeq;
  }
}
//@ chunk-7jxyna5q.js:40469-40819 fingerprint (2.1.88 match: getTimestampedHistory, 0.469)
var getTimestampedHistory_2; // deferred: uses DoctorLazy (./cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-7jxyna5q.js:40469", () => {
  getTimestampedHistory_2 = DoctorLazy(() =>
    objectSchema({
      display: stringSchema(),
      pastedContents: record(stringSchema(), unknown())
        .catch({})
        .transform((pastedContents) =>
          Object.fromEntries(
            Object.entries(pastedContents).flatMap(([key, value]) => {
              let parsed = PastedContentSchema().safeParse(value);
              if (parsed.success) return [[key, parsed.data]];
              logForDebugging(
                `Dropping a malformed paste record from a history line (${formatZodIssues(parsed.error)})`,
              );
              return [];
            }),
          ),
        ),
      timestamp: numberSchema(),
      project: stringSchema(),
      sessionId: stringSchema().optional().catch(undefined),
    }),
  );
});
//@ chunk-7jxyna5q.js:40819-40916 layout
function formatZodIssues(error) {
  return error.issues.map((issue) => `${issue.path.join(".") || "value"}: ${issue.message}`).join("; ");
}
//@ chunk-7jxyna5q.js:40916-41208 placement
/**
 * 解析 history.jsonl 一行并按 schema 校验，失败返回 parse_failed 或 shape_rejected。
 */
function parseHistoryLine(line) {
  try {
    let json = jsonParseRaw(line);
    let parsed = getTimestampedHistory_2().safeParse(json);
    if (parsed.success)
      return {
        entry: parsed.data,
        droppedPasteRecords: hasDroppedPasteRecords(json, parsed.data),
      };
    logForDebugging(`Skipping malformed history line (${formatZodIssues(parsed.error)})`);
    return {
      rejection: "shape_rejected",
    };
  } catch (error) {
    logForDebugging(`Failed to parse history line: ${error}`);
    return {
      rejection: "parse_failed",
    };
  }
}
//@ chunk-7jxyna5q.js:41208-41452 placement
function hasDroppedPasteRecords(raw, parsed) {
  if (typeof raw !== "object" || raw === null || !("pastedContents" in raw)) return false;
  let pastedContents = raw.pastedContents;
  if (pastedContents === null) return false;
  if (typeof pastedContents !== "object" || Array.isArray(pastedContents)) return true;
  return Object.keys(pastedContents).length > Object.keys(parsed.pastedContents).length;
}
//@ chunk-7jxyna5q.js:41452-41533 placement
function totalPastedLength(pastedContents) {
  return Object.values(pastedContents).reduce((acc, entry) => acc + (entry.content?.length ?? 0), 0);
}
//@ chunk-7jxyna5q.js:41533-41557 placement
var MAX_EXPANDED_PASTE_CHARS = 32768;
var MAX_PROJECT_HISTORY_BYTES = 4194304;
//@ chunk-7jxyna5q.js:41557-41695 placement
function expandHistoryDisplay(display, pastedContents) {
  let expandedContents = {};
  for (let [key, value] of Object.entries(pastedContents))
    expandedContents[Number(key)] =
      value.type === "text"
        ? {
            ...value,
            content: truncateToLength(value.content, MAX_EXPANDED_PASTE_CHARS),
          }
        : value;
  return addPastedEntry(display, expandedContents);
}
//@ chunk-7jxyna5q.js:41695-41738 placement
var HISTORY_SCOPES = ["session", "project", "everywhere"];
//@ chunk-7jxyna5q.js:41738-41939 placement
function isDuplicateOfLastEntry(candidate) {
  let { prev, next, project, sessionId } = candidate;
  if (!prev || prev.display !== next.display) return false;
  if (prev.project !== project || prev.sessionId !== sessionId) return false;
  return !(Object.keys(prev.pastedContents).length > 0) && !next.hasPastes;
}
//@ chunk-7jxyna5q.js:41939-52010 placement
/**
 * 输入历史存储：add 时去重（与上一条相同则跳过）、过滤敏感命令，超过 1024 字的粘贴存进 paste-cache 只记 hash；pendingEntries 加文件锁追加到 <配置目录>/history.jsonl（权限 0600），失败最多重试 5 次、退出时强制刷盘；读取时按 project/session 过滤，最多 100 条。CLAUDE_CODE_SKIP_PROMPT_HISTORY 关闭写入。
 */
class PromptHistoryStore {
  getSensitiveCommands = null;
  pendingEntries = [];
  isWriting = false;
  currentFlushPromise = null;
  exitFlushHandle = null;
  lastAddedEntry = null;
  lastStoredEntry = null;
  lastAssignedTimestamp = 0;
  storedEntryGeneration = 0;
  lastAddWasDeduped = false;
  skippedKeys = new Set();
  pendingPasteWrites = new Set();
  pendingPasteContents = new Map();
  inFlightFlushEntries = null;
  reportedLostPasteHashes = new Set();
  clearedDrafts = [];
  immediateFlush = serializeCalls((storageV5) => this.flushEntriesToDisk(storageV5));
  async *readLogEntries(storage) {
    let sliced = this.pendingEntries.slice();
    let pendingKeys = new Set(sliced.map((entry) => `${entry.timestamp}\x00${entry.sessionId ?? ""}`));
    for (let j = sliced.length - 1; j >= 0; j--) yield sliced[j];
    let historyPath = join(getClaudeConfigDir(), "history.jsonl");
    let hadParseFailure = false;
    let hadShapeRejection = false;
    let hadDroppedPaste = false;
    let yieldedAny = false;
    try {
      let source = storage
        ? readHistoryRecordsBackward(storage)
        : readLinesReverse(historyPath, undefined, {
            strict: false,
          });
      for await (let line of source) {
        let historyLine = parseHistoryLine(line);
        if (!historyLine.entry) {
          if (historyLine.rejection === "parse_failed") hadParseFailure = true;
          else hadShapeRejection = true;
          continue;
        }
        if (historyLine.droppedPasteRecords) hadDroppedPaste = true;
        let entry = historyLine.entry;
        let entryKey = `${entry.timestamp}\x00${entry.sessionId ?? ""}`;
        if (this.skippedKeys.has(entryKey) || pendingKeys.has(entryKey)) continue;
        yieldedAny = true;
        yield entry;
      }
      let failureKind = hadParseFailure
        ? "history_load_parse_failed"
        : hadShapeRejection
          ? "history_load_shape_rejected"
          : hadDroppedPaste
            ? "history_load_paste_record_dropped"
            : undefined;
      if (failureKind)
        logFeatureSad("history_load", failureKind, {
          parse_failed: hadParseFailure,
          shape_rejected: hadShapeRejection,
          paste_record_dropped: hadDroppedPaste,
        });
      else logFeatureOk("history_load");
    } catch (error) {
      if (getErrnoCode(error) === "ENOENT") {
        logFeatureOk("history_load");
        return;
      }
      if (yieldedAny || sliced.length > 0) logFeatureSad("history_load", "history_load_read_interrupted");
      else logFeatureBad("history_load", "history_load_read_failed");
      throw error;
    }
  }
  async *readEntries(storageV5) {
    for await (let entry of this.readLogEntries(storageV5)) yield await this.toHistoryEntry(entry, storageV5);
  }
  async *readTimestamped(scope = "project", storageV5) {
    let projectRoot = getProjectRoot();
    let sessionId = getSessionId();
    let seenKeys = new Set();
    let expandedChars = 0;
    for await (let entry of this.readLogEntries(storageV5)) {
      if (scope === "project" && entry.project !== projectRoot) continue;
      if (scope === "session" && entry.sessionId !== sessionId) continue;
      let promptHistoryKey = getPromptHistoryKey(entry.display, entry.pastedContents);
      if (seenKeys.has(promptHistoryKey)) continue;
      seenKeys.add(promptHistoryKey);
      let resolvedContents = {};
      if (expandedChars < MAX_PROJECT_HISTORY_BYTES)
        for (let [key, value] of Object.entries(entry.pastedContents)) {
          let resolved =
            value.type === "text" ? await this.resolveStoredPastedContent(value, storageV5) : null;
          if (resolved) resolvedContents[Number(key)] = resolved;
        }
      let expandedDisplay = expandHistoryDisplay(entry.display, resolvedContents);
      if (expandedDisplay !== entry.display) expandedChars += expandedDisplay.length;
      yield {
        display: entry.display,
        expandedDisplay,
        timestamp: entry.timestamp,
        textLength:
          entry.display.length +
          (expandedDisplay === entry.display
            ? totalPastedLength(entry.pastedContents)
            : expandedDisplay.length),
        resolve: () => this.toHistoryEntry(entry, storageV5),
      };
    }
  }
  async countForProject(filter, storageV5) {
    let projectRoot = getProjectRoot();
    let seen = 0;
    let matched = 0;
    try {
      for await (let entry of this.readLogEntries(storageV5)) {
        if (entry.project !== projectRoot) continue;
        seen++;
        if (!filter || filter(entry.display)) matched++;
        if (seen >= MAX_HISTORY_ITEMS) break;
      }
    } catch {
      return null;
    }
    let sessionId = getSessionId();
    for (let { entry, project, sessionId: sessionId_2 } of this.clearedDrafts)
      if (project === projectRoot && sessionId_2 === sessionId && (!filter || filter(entry.display)))
        matched++;
    return matched;
  }
  async *readForProject(storageV5, { withClearedDrafts = false } = {}) {
    let projectRoot = getProjectRoot();
    let sessionId = getSessionId();
    let otherSession = [];
    let emitted = 0;
    let drafts = withClearedDrafts
      ? this.clearedDrafts.filter(
          (clearedDraft) => clearedDraft.project === projectRoot && clearedDraft.sessionId === sessionId,
        )
      : [];
    let draftIndex = drafts.length - 1;
    for await (let entry of this.readLogEntries(storageV5)) {
      if (entry.project !== projectRoot) continue;
      if (entry.sessionId === sessionId) {
        for (; draftIndex >= 0 && drafts[draftIndex].timestamp > entry.timestamp; draftIndex--)
          yield drafts[draftIndex].entry;
        yield await this.toHistoryEntry(entry, storageV5);
        emitted++;
      } else otherSession.push(entry);
      if (emitted + otherSession.length >= MAX_HISTORY_ITEMS) break;
    }
    for (; draftIndex >= 0; draftIndex--) yield drafts[draftIndex].entry;
    for (let entry of otherSession) {
      if (emitted >= MAX_HISTORY_ITEMS) return;
      yield await this.toHistoryEntry(entry, storageV5);
      emitted++;
    }
  }
  async resolveStoredPastedContent(stored, storageV5) {
    if (stored.content)
      return {
        id: stored.id,
        type: stored.type,
        content: stored.content,
        mediaType: stored.mediaType,
        filename: stored.filename,
      };
    if (stored.contentHash) {
      let pastedTextByHash = await this.resolvePastedTextByHash(stored.contentHash, storageV5);
      if (pastedTextByHash)
        return {
          id: stored.id,
          type: stored.type,
          content: pastedTextByHash,
          mediaType: stored.mediaType,
          filename: stored.filename,
        };
    }
    return null;
  }
  reportLostPasteContent(hash) {
    let key = hash ?? "missing-hash";
    if (this.reportedLostPasteHashes.has(key)) return;
    this.reportedLostPasteHashes.add(key);
    logFeatureSad("paste_store", "paste_store_content_lost");
  }
  async resolvePastedTextByHash(hash, storageV5) {
    return this.pendingPasteContents.get(hash) ?? (await retrievePastedText(hash, storageV5));
  }
  registerPastedTextForRecall(pastedText, storageV5) {
    let hash = hashPastedText(pastedText);
    this.pendingPasteContents.set(hash, pastedText);
    let write = storePastedTextQueued(hash, pastedText, storageV5);
    this.pendingPasteWrites.add(write);
    write
      .then(() => this.pendingPasteContents.delete(hash))
      .finally(() => this.pendingPasteWrites.delete(write));
    return hash;
  }
  async toHistoryEntry(entry, storageV5) {
    let resolvedContents = {};
    for (let [key, value] of Object.entries(entry.pastedContents)) {
      let storedPastedContent = await this.resolveStoredPastedContent(value, storageV5);
      if (!storedPastedContent && value.type === "text") this.reportLostPasteContent(value.contentHash);
      resolvedContents[Number(key)] = storedPastedContent ?? {
        id: value.id,
        type: value.type,
        content: "",
        unavailable: true,
      };
    }
    return {
      display: entry.display,
      pastedContents: resolvedContents,
    };
  }
  async flushEntriesToDisk(storageV5) {
    if (this.pendingEntries.length === 0) return true;
    let sliced = this.pendingEntries.slice();
    this.inFlightFlushEntries = new Set(sliced);
    while (this.pendingPasteWrites.size > 0) await Promise.all(this.pendingPasteWrites);
    if (storageV5)
      try {
        let writeResult = await storageV5.append(
          STORAGE_SPACES.history(),
          sliced.map((entry) => ({
            data:
              jsonStringify(entry) +
              `
`,
          })),
        );
        if (!writeResult.ok) {
          logForDebugging(`Failed to write prompt history: ${writeResult.error.code}`);
          let isLockFailure =
            "telemetryCode" in writeResult.error &&
            (writeResult.error.telemetryCode === "LockContended" ||
              writeResult.error.telemetryCode === "LockAcquireFailed");
          logFeatureSad(
            "history_save",
            isLockFailure ? "history_save_lock_failed" : "history_save_write_failed",
          );
          return false;
        }
        let written = new Set(sliced);
        this.pendingEntries = this.pendingEntries.filter((pendingEntry) => !written.has(pendingEntry));
        logFeatureOk("history_save");
        return true;
      } catch (error) {
        logForDebugging(`Failed to write prompt history: ${error}`);
        logFeatureSad("history_save", "history_save_write_failed");
        return false;
      } finally {
        this.inFlightFlushEntries = null;
      }
    let releaseLock;
    try {
      let historyPath = join(getClaudeConfigDir(), "history.jsonl");
      await getFileReader().append(historyPath, "", 384);
      releaseLock = await lock(historyPath, {
        ...HISTORY_FILE_RETRY_OPTIONS,
        onCompromised: (cause) =>
          logForDebugging(`History lock compromised: ${cause}`, {
            level: "error",
          }),
      });
      let mapped = sliced.map(
        (entry) =>
          jsonStringify(entry) +
          `
`,
      );
      await getFileReader().append(historyPath, mapped.join(""), 384);
      let written = new Set(sliced);
      this.pendingEntries = this.pendingEntries.filter((pendingEntry) => !written.has(pendingEntry));
      logFeatureOk("history_save");
      return true;
    } catch (error) {
      logForDebugging(`Failed to write prompt history: ${error}`);
      if (releaseLock) logFeatureSad("history_save", "history_save_write_failed");
      else logFeatureSad("history_save", "history_save_lock_failed");
      return false;
    } finally {
      this.inFlightFlushEntries = null;
      if (releaseLock) await releaseLock().catch(logError);
    }
  }
  async flushWithRetries(attempt, storageV5) {
    if (this.isWriting || this.pendingEntries.length === 0) return;
    if (attempt > 5) return;
    this.isWriting = true;
    let succeeded = false;
    try {
      succeeded = await this.immediateFlush(storageV5);
    } finally {
      this.isWriting = false;
      if (this.pendingEntries.length > 0) {
        await sleep(500);
        this.currentFlushPromise = this.flushWithRetries(succeeded ? 0 : attempt + 1, storageV5);
      }
    }
  }
  async addEntry(input_, storageV5, submitMode, armUndo = true) {
    let entry =
      typeof input_ === "string"
        ? {
            display: input_,
            pastedContents: {},
          }
        : input_;
    let { input, removed } = stripPlaceholders(entry.display, entry.pastedContents ?? {});
    let trimmed = input.trim();
    if (removed.length > 0 && trimmed === "") return;
    if (removed.length > 0 && entry.display.trimStart().startsWith("!")) {
      if (armUndo && submitMode !== undefined && submitMode !== "bash") this.lastAddWasDeduped = true;
      return;
    }
    if (removed.length > 0 && entry.display.trimStart().startsWith("/")) return;
    if (removed.length > 0) {
      let trimmedDisplay = entry.display.trimStart();
      if (
        (trimmed.startsWith("/") && !trimmedDisplay.startsWith("/")) ||
        (trimmed.startsWith("!") && !trimmedDisplay.startsWith("!")) ||
        (trimmed.startsWith("@") && !trimmedDisplay.startsWith("@"))
      ) {
        if (armUndo) this.lastAddWasDeduped = true;
        return;
      }
    }
    if (removed.length > 0) {
      let originalRefCounts = new Map();
      for (let ref of parsePastedRefs(entry.display))
        originalRefCounts.set(ref.id, (originalRefCounts.get(ref.id) ?? 0) + 1);
      let strippedRefCounts = new Map();
      for (let ref of parsePastedRefs(input))
        strippedRefCounts.set(ref.id, (strippedRefCounts.get(ref.id) ?? 0) + 1);
      let lostPaste = false;
      for (let [id, count] of strippedRefCounts) {
        if (count <= (originalRefCounts.get(id) ?? 0)) continue;
        let content = entry.pastedContents?.[id];
        if (content !== undefined && content.type !== "image" && !content.unavailable) {
          lostPaste = true;
          break;
        }
      }
      if (lostPaste) {
        if (armUndo) this.lastAddWasDeduped = true;
        return;
      }
    }
    let storedEntry =
      removed.length > 0
        ? {
            ...entry,
            display: input,
          }
        : entry;
    let projectRoot = getProjectRoot();
    let sessionId = getSessionId();
    let referencedTextPastes = getReferencedTextPastes(storedEntry.display, storedEntry.pastedContents);
    if (
      isDuplicateOfLastEntry({
        prev: this.lastStoredEntry,
        next: {
          display: storedEntry.display,
          hasPastes: referencedTextPastes.length > 0,
        },
        project: projectRoot,
        sessionId,
      })
    ) {
      if (armUndo) this.lastAddWasDeduped = true;
      return;
    }
    let pastedContents = {};
    for (let [id, paste] of referencedTextPastes)
      if (paste.content.length <= MAX_PASTED_CONTENT_LENGTH)
        pastedContents[Number(id)] = {
          id: paste.id,
          type: paste.type,
          content: paste.content,
          mediaType: paste.mediaType,
          filename: paste.filename,
        };
      else
        pastedContents[Number(id)] = {
          id: paste.id,
          type: paste.type,
          contentHash: this.registerPastedTextForRecall(paste.content, storageV5),
          mediaType: paste.mediaType,
          filename: paste.filename,
        };
    let max = Math.max(Date.now(), this.lastAssignedTimestamp + 1);
    this.lastAssignedTimestamp = max;
    let record = {
      ...storedEntry,
      pastedContents,
      timestamp: max,
      project: projectRoot,
      sessionId,
    };
    this.pendingEntries.push(record);
    this.lastStoredEntry = record;
    this.storedEntryGeneration++;
    this.dropClearedDraftCopies(storedEntry, projectRoot, sessionId);
    if (armUndo) {
      this.lastAddedEntry = record;
      this.lastAddWasDeduped = false;
    }
    this.currentFlushPromise = this.flushWithRetries(0, storageV5);
    this.currentFlushPromise;
  }
  async flushOnExit(storageV5) {
    let waited = null;
    while (this.currentFlushPromise && this.currentFlushPromise !== waited) {
      waited = this.currentFlushPromise;
      await waited;
    }
    if (this.pendingEntries.length > 0) {
      if (!(await this.immediateFlush(storageV5)))
        logFeatureBad("history_save", "history_save_exit_flush_failed");
    }
    while (this.pendingPasteWrites.size > 0) await Promise.all(this.pendingPasteWrites);
  }
  add(display, storageV5, options) {
    if (isEnvTruthy(process.env.CLAUDE_CODE_SKIP_PROMPT_HISTORY) || isNestedInteractiveClaudeSession())
      return;
    if (
      this.isSensitive(
        typeof display === "string"
          ? {
              display,
              pastedContents: {},
            }
          : display,
      )
    ) {
      if (options?.armUndo !== false) this.lastAddWasDeduped = true;
      return;
    }
    this.registerExitFlush(storageV5);
    this.addEntry(display, storageV5, options?.submitMode, options?.armUndo).catch(logError);
  }
  registerExitFlush(storageV5) {
    if (this.exitFlushHandle) return;
    this.exitFlushHandle = registerCleanup(() => this.flushOnExit(storageV5));
  }
  registerSensitiveCommands(getSensitiveCommands) {
    this.getSensitiveCommands = getSensitiveCommands;
  }
  keepClearedDraft(draft, timestamp) {
    let projectRoot = getProjectRoot();
    let sessionId = getSessionId();
    if (
      this.isSensitive(draft) ||
      false ||
      isDuplicateOfLastEntry({
        prev: this.lastStoredEntry,
        next: {
          display: draft.display,
          hasPastes: Object.keys(draft.pastedContents).length > 0,
        },
        project: projectRoot,
        sessionId,
      })
    )
      return;
    this.dropClearedDraftCopies(draft, projectRoot, sessionId);
    this.clearedDrafts.push({
      entry: draft,
      timestamp,
      project: projectRoot,
      sessionId,
      length: Object.values(draft.pastedContents).reduce(
        (acc, pastedContent) => acc + pastedContent.content.length,
        draft.display.length,
      ),
    });
    let reduced = this.clearedDrafts.reduce((acc, clearedDraft) => acc + clearedDraft.length, 0);
    while (this.clearedDrafts.length > MAX_CLEARED_DRAFTS || reduced > MAX_CLEARED_DRAFTS_CHARS)
      reduced -= this.clearedDrafts.shift().length;
    this.storedEntryGeneration++;
  }
  dropClearedDraftCopies({ display, pastedContents }, project, sessionId) {
    if (this.clearedDrafts.length === 0) return;
    let promptHistoryKey = getPromptHistoryKey(display, pastedContents);
    this.clearedDrafts = this.clearedDrafts.filter(
      (clearedDraft) =>
        clearedDraft.project !== project ||
        clearedDraft.sessionId !== sessionId ||
        getPromptHistoryKey(clearedDraft.entry.display, clearedDraft.entry.pastedContents) !==
          promptHistoryKey,
    );
  }
  isSensitive({ display, pastedContents }) {
    return shouldRedactInput(display, (this.getSensitiveCommands ?? getSensitiveCommandsRegistry().get)(), {
      pastedTexts: getReferencedTextPastes(display, pastedContents).map(([, paste]) => paste.content),
    });
  }
  getGeneration() {
    return this.storedEntryGeneration;
  }
  clearPending() {
    this.pendingEntries = [];
    this.clearedDrafts = [];
    this.lastAddedEntry = null;
    this.lastStoredEntry = null;
    this.lastAddWasDeduped = false;
    this.getSensitiveCommands = () => [];
    this.skippedKeys.clear();
    this.pendingPasteContents.clear();
    this.exitFlushHandle?.();
    this.exitFlushHandle = null;
  }
  disarmUndo() {
    this.lastAddedEntry = null;
    this.lastAddWasDeduped = false;
  }
  removeLast() {
    if (this.lastAddWasDeduped) {
      this.lastAddWasDeduped = false;
      return;
    }
    if (!this.lastAddedEntry) return;
    let lastAddedEntry = this.lastAddedEntry;
    this.lastAddedEntry = null;
    if (this.lastStoredEntry === lastAddedEntry) this.lastStoredEntry = null;
    this.storedEntryGeneration++;
    let index = this.pendingEntries.lastIndexOf(lastAddedEntry);
    if (index !== -1) {
      this.pendingEntries.splice(index, 1);
      if (this.inFlightFlushEntries?.has(lastAddedEntry))
        this.skippedKeys.add(`${lastAddedEntry.timestamp}\x00${lastAddedEntry.sessionId ?? ""}`);
    } else this.skippedKeys.add(`${lastAddedEntry.timestamp}\x00${lastAddedEntry.sessionId ?? ""}`);
  }
}
//@ chunk-7jxyna5q.js:52010-52035 placement
var promptHistoryByHost; // deferred: uses PromptHistoryStore of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-7jxyna5q.js:52010", () => {
  promptHistoryByHost = new HostScoped(() => new PromptHistoryStore());
});
//@ chunk-7jxyna5q.js:52035-52072 placement
/**
 * 取当前宿主的输入历史存储（PromptHistoryStore）。
 */
function getPromptHistory() {
  return promptHistoryByHost.of(getRootSession().host);
}
//@ chunk-7jxyna5q.js:52072-52092 placement
class SensitiveCommandsRegistry {
  get = () => [];
}
//@ chunk-7jxyna5q.js:52092-52117 placement
var historyStoreSlot; // deferred: uses SensitiveCommandsRegistry of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-7jxyna5q.js:52092", () => {
  historyStoreSlot = new HostScoped(() => new SensitiveCommandsRegistry());
});
//@ chunk-7jxyna5q.js:52117-52154 placement
function getSensitiveCommandsRegistry() {
  return historyStoreSlot.of(getRootSession().host);
}
//@ chunk-7jxyna5q.js:52154-52197 placement
function getHistory(storageV5) {
  return getPromptHistory().readEntries(storageV5);
}
//@ chunk-7jxyna5q.js:52197-52395 placement
function isTransientHistoryReadError(error) {
  if (error instanceof FileChangedDuringReadError) return true;
  let cause = error instanceof Error ? error.cause : undefined;
  if (
    isStoreError(cause) &&
    cause.code === "Unavailable" &&
    errnoShapedCode(cause.telemetryCode) === undefined
  )
    return true;
  let errno = getErrnoCode(error) ?? storageCauseErrnoCode(error);
  return isSadFsErrnoCode(errno) || isEnvFsErrnoCode(errno);
}
//@ chunk-7jxyna5q.js:52395-52456 placement
function getTimestampedHistory(scope = "project", storageV5) {
  return getPromptHistory().readTimestamped(scope, storageV5);
}
//@ chunk-7jxyna5q.js:52456-52507 placement
function countHistoryForProject(filter, storageV5) {
  return getPromptHistory().countForProject(filter, storageV5);
}
//@ chunk-7jxyna5q.js:52507-52557 placement
/**
 * 函数 readProjectHistory（读项目历史）；位于「输入历史（↑ 键/Ctrl+R）：PromptHistoryStore 读写 <配置目录>/history.jsonl，长粘贴转存 paste-cache，按项目/会话过滤，最多 100 条」模块。
 */
function readProjectHistory(storageV5, options) {
  return getPromptHistory().readForProject(storageV5, options);
}
//@ chunk-7jxyna5q.js:52557-52593 placement
/**
 * 函数 addHistoryEntry（追加历史）；位于「输入历史（↑ 键/Ctrl+R）：PromptHistoryStore 读写 <配置目录>/history.jsonl，长粘贴转存 paste-cache，按项目/会话过滤，最多 100 条」模块。
 */
function addHistoryEntry(display, storageV5, options) {
  getPromptHistory().add(display, storageV5, options);
}
//@ chunk-7jxyna5q.js:52593-52869 placement
/**
 * 把提交的提示逐条写入历史（含筛查与未回答状态），全都没写入时按需撤销撤回状态。
 */
function recordSubmittedPrompts(prompts, storageV5, context) {
  let isFirst = false;
  for (let prompt of prompts)
    try {
      let historyEntryForCommand = getHistoryEntryForCommand(prompt, context.placed, {
        screened: context.screened?.get(prompt),
        unanswered: context.unanswered ?? "skipped",
      });
      if (!historyEntryForCommand) continue;
      isFirst = true;
      addHistoryEntry(historyEntryForCommand, storageV5, {
        submitMode: prompt.mode,
        armUndo: context.armUndo,
      });
    } catch (error) {
      logError(error);
    }
  if (!isFirst && context.armUndo !== false && context.screened === undefined)
    getPromptHistory().disarmUndo();
}
//@ chunk-7jxyna5q.js:52869-52924 placement
/**
 * 函数 addHistoryEntryNoUndo（追加历史且不挂撤销）；位于「输入历史（↑ 键/Ctrl+R）：PromptHistoryStore 读写 <配置目录>/history.jsonl，长粘贴转存 paste-cache，按项目/会话过滤，最多 100 条」模块。
 */
function addHistoryEntryNoUndo(text, storageV5, submitMode) {
  addHistoryEntry(text, storageV5, {
    submitMode,
    armUndo: false,
  });
}
//@ chunk-7jxyna5q.js:52924-52966 placement
/**
 * 函数 registerHistoryExitFlush（注册退出前刷盘）；位于「输入历史（↑ 键/Ctrl+R）：PromptHistoryStore 读写 <配置目录>/history.jsonl，长粘贴转存 paste-cache，按项目/会话过滤，最多 100 条」模块。
 */
function registerHistoryExitFlush(flushFn) {
  getPromptHistory().registerExitFlush(flushFn);
}
//@ chunk-7jxyna5q.js:52966-52993 placement
/**
 * 函数 setHistoryStore（替换历史存储）；位于「输入历史（↑ 键/Ctrl+R）：PromptHistoryStore 读写 <配置目录>/history.jsonl，长粘贴转存 paste-cache，按项目/会话过滤，最多 100 条」模块。
 */
function setHistoryStore(get) {
  getSensitiveCommandsRegistry().get = get;
}
//@ chunk-7jxyna5q.js:52993-53038 placement
/**
 * 函数 keepClearedDraft（保留已清空的草稿）；位于「输入历史（↑ 键/Ctrl+R）：PromptHistoryStore 读写 <配置目录>/history.jsonl，长粘贴转存 paste-cache，按项目/会话过滤，最多 100 条」模块。
 */
function keepClearedDraft(draft, clearedAt) {
  getPromptHistory().keepClearedDraft(draft, clearedAt);
}
//@ chunk-7jxyna5q.js:53038-53081 placement
/**
 * 函数 getHistoryGeneration（取历史代数）；位于「输入历史（↑ 键/Ctrl+R）：PromptHistoryStore 读写 <配置目录>/history.jsonl，长粘贴转存 paste-cache，按项目/会话过滤，最多 100 条」模块。
 */
function getHistoryGeneration() {
  return getPromptHistory().getGeneration();
}
//@ chunk-7jxyna5q.js:53081-53114 placement
/**
 * 函数 removeLastHistoryEntry（移除最后一条历史）；位于「输入历史（↑ 键/Ctrl+R）：PromptHistoryStore 读写 <配置目录>/history.jsonl，长粘贴转存 paste-cache，按项目/会话过滤，最多 100 条」模块。
 */
function removeLastHistoryEntry() {
  getPromptHistory().removeLast();
}
//@ chunk-5xgkngpb.js:192068-192194 placement
function groupByToObject(items, keyOf) {
  let groups = Object.create(null);
  let index = 0;
  for (let item of items) {
    let key = keyOf(item, index++);
    if (groups[key] === undefined) groups[key] = [];
    groups[key].push(item);
  }
  return groups;
}
//@ chunk-5xgkngpb.js:192194-192213 placement
var MAX_PASTE_ID = 2147483648;
//@ chunk-5xgkngpb.js:192213-192775 placement
/**
 * 粘贴占位编号分配器：跳过转录与承载者中已用的编号，按会话纪元记录本纪元分配过的编号。
 */
class PasteIdAllocator {
  next = 1;
  minted = new Set();
  flooredSessionId = null;
  carrierProviders = new Set();
  registerCarrier(carrier) {
    this.carrierProviders.add(carrier);
    return () => {
      this.carrierProviders.delete(carrier);
    };
  }
  advancePast(pasteId) {
    if (isValidPasteId(pasteId) && pasteId < MAX_PASTE_ID && pasteId >= this.next) this.next = pasteId + 1;
  }
  advancePastText(text) {
    for (let ref of parsePastedRefs(text)) this.advancePast(ref.id);
  }
  startEpoch(flooredSessionId) {
    this.minted = new Set();
    this.flooredSessionId = flooredSessionId;
  }
  mint() {
    for (let carrierProvider of this.carrierProviders)
      for (let carrierText of carrierProvider()) this.advancePastText(carrierText);
    if (!isValidPasteId(this.next)) this.next = MAX_PASTE_ID;
    let id = this.next++;
    this.minted.add(id);
    return id;
  }
  wasMintedThisEpoch(pasteId) {
    return this.minted.has(pasteId);
  }
}
//@ chunk-5xgkngpb.js:192775-192803 placement
var pasteIdAllocatorSlot; // deferred: uses SessionRootSlot (./bootstrap/sessionSlices.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:192775", () => {
  pasteIdAllocatorSlot = new SessionRootSlot(() => new PasteIdAllocator());
});
//@ chunk-5xgkngpb.js:192803-192836 placement
function pasteIdAllocator() {
  return pasteIdAllocatorSlot.of(getRootSession());
}
//@ chunk-5xgkngpb.js:192836-192883 placement
/**
 * 函数 registerPasteCarrier（登记粘贴占位载体）；位于「输入历史（↑ 键/Ctrl+R）：PromptHistoryStore 读写 <配置目录>/history.jsonl，长粘贴转存 paste-cache，按项目/会话过滤，最多 100 条」模块。
 */
function registerPasteCarrier(carrier) {
  return pasteIdAllocator().registerCarrier(carrier);
}
//@ chunk-5xgkngpb.js:192883-193602 placement
/**
 * 从会话消息（用户消息、图片粘贴 ID、排队命令）中推进粘贴编号，再开始新纪元。
 */
function primePasteIdsFromMessages(messages) {
  let allocator = pasteIdAllocator();
  for (let message of messages)
    if (message.type === "user") {
      if (message.imagePasteIds)
        for (let imagePasteId of message.imagePasteIds) allocator.advancePast(imagePasteId);
      if (Array.isArray(message.message.content)) {
        for (let block of message.message.content)
          if (block.type === "text") allocator.advancePastText(block.text);
      } else if (typeof message.message.content === "string")
        allocator.advancePastText(message.message.content);
      if (message.stackedOriginalInput) allocator.advancePastText(message.stackedOriginalInput);
    } else if (message.type === "attachment" && message.attachment.type === "queued_command") {
      let attachment = message.attachment;
      if (attachment.imagePasteIds)
        for (let imagePasteId of attachment.imagePasteIds) allocator.advancePast(imagePasteId);
      if (typeof attachment.prompt === "string") allocator.advancePastText(attachment.prompt);
      else if (Array.isArray(attachment.prompt)) {
        for (let part of attachment.prompt) if (part.type === "text") allocator.advancePastText(part.text);
      }
    }
  allocator.startEpoch(getSessionId());
}
//@ chunk-5xgkngpb.js:193602-193638 placement
/**
 * 函数 advancePasteId（推进已用的粘贴编号）；位于「输入历史（↑ 键/Ctrl+R）：PromptHistoryStore 读写 <配置目录>/history.jsonl，长粘贴转存 paste-cache，按项目/会话过滤，最多 100 条」模块。
 */
function advancePasteId(maxStoredImageId) {
  pasteIdAllocator().advancePast(maxStoredImageId);
}
//@ chunk-5xgkngpb.js:193638-193676 placement
/**
 * 函数 mintPasteId（分配新的粘贴编号）；位于「输入历史（↑ 键/Ctrl+R）：PromptHistoryStore 读写 <配置目录>/history.jsonl，长粘贴转存 paste-cache，按项目/会话过滤，最多 100 条」模块。
 */
function mintPasteId(allocator, text) {
  return mintPasteId_2(pasteIdAllocator(), allocator, text);
}
//@ chunk-5xgkngpb.js:193676-193796 placement
function mintPasteId_2(allocator, display, pastedContents) {
  if (display) allocator.advancePastText(display);
  if (pastedContents) for (let key of Object.keys(pastedContents)) allocator.advancePast(Number(key));
  return allocator.mint();
}
//@ chunk-5xgkngpb.js:193796-193975 placement
function isPasteRefOfType(match, labelPrefix) {
  switch (labelPrefix) {
    case "text":
      return (
        match.startsWith("[Pasted text") ||
        match.startsWith("[...Truncated text") ||
        match.startsWith(`[${TEAM_SETUP_GUIDE_LABEL}`)
      );
    case "image":
      return match.startsWith("[Image");
  }
}
//@ chunk-5xgkngpb.js:193975-194188 placement
function expandPastedTextRefs_2(input, pasteId, pastedContents, labelPrefix) {
  let refs = parsePastedRefs(input).filter(
    (ref) => ref.id === pasteId && isPasteRefOfType(ref.match, labelPrefix),
  );
  let expanded = input;
  for (let i = refs.length - 1; i >= 0; i--) {
    let ref = refs[i];
    expanded =
      expanded.slice(0, ref.index) +
      ref.match.replace(`#${pasteId}`, `#${pastedContents}`) +
      expanded.slice(ref.index + ref.match.length);
  }
  return expanded;
}
//@ chunk-5xgkngpb.js:194188-194633 placement
/**
 * 把历史条目里的粘贴编号重新分配为本会话不冲突的新编号，同时更新显示文本中的占位（本纪元已分配的可跳过）。
 */
function renumberPastedContents({ display, pastedContents, allowCurrentEpochSkip = false }) {
  let allocator = pasteIdAllocator();
  let skippable = allowCurrentEpochSkip && allocator.flooredSessionId === getSessionId();
  let entries = Object.entries(pastedContents);
  let refs = [];
  let contents = {};
  for (let [id, entry] of entries) {
    let numericId = Number(id);
    if (!isValidPasteId(numericId) || (skippable && allocator.wasMintedThisEpoch(numericId))) {
      contents[numericId] = entry;
      continue;
    }
    refs.push([numericId, entry]);
  }
  if (refs.length === 0)
    return {
      display,
      pastedContents,
    };
  let display_2 = display;
  refs.sort((a, b) => a[0] - b[0]);
  for (let [from, to] of refs) {
    let newId = mintPasteId_2(allocator, display_2, pastedContents);
    display_2 = expandPastedTextRefs_2(display_2, from, newId, to.type);
    contents[newId] = {
      ...to,
      id: newId,
    };
  }
  return {
    display: display_2,
    pastedContents: contents,
  };
}
//@ chunk-5xgkngpb.js:944007-944207 fingerprint (2.1.88 match: removeLastFromHistory, 0.388)
class HistoryWriterStack {
  writers = [];
  register(writer) {
    this.writers.push(writer);
  }
  unregister(writer) {
    let index = this.writers.lastIndexOf(writer);
    if (index >= 0) this.writers.splice(index, 1);
  }
  reset() {
    this.writers.length = 0;
  }
  write(line) {
    this.writers.at(-1)?.(line);
  }
}
//@ chunk-1xrdahqv.js:7416-7526 fingerprint (2.1.88 match: getHistory, 0.699)
async function getHistory_2(slug, deadlineSignal, context) {
  let [publishedReadme, publishedReadme_2] = await Promise.all([
    readPublishedReadme(slug, README_MD, false, deadlineSignal, context),
    readPublishedReadme(slug, PROJECT_README_MD, true, deadlineSignal, context),
  ]);
  return {
    root: publishedReadme,
    project: publishedReadme_2,
  };
}
//@ chunk-3n0n2sf6.js:849-972 placement
var SKILL_WATCH_DEBOUNCE_MS = 1000;
var SKILL_WATCH_MIN_MS = 500;
var SKILL_WATCH_SETTLE_MS = 300;
var SKILL_WATCH_POLL_MS = 2000;
var SKILL_WATCH_IDLE_MS = 30000;
var SKILL_WATCH_MAX_IDLE_MS = 60000;
var SKILL_WATCHER_IDLE_WAKE_TAG = "<skill-watcher-idle-wake>";
var SKILL_WATCH_RETRY_MS = 5000;
var SKILL_WATCH_TIMEOUT_MS = 600000;
var SKILL_WATCH_MAX_WAIT_MS = 40000;
var SKILL_WATCH_BACKOFF_MS = 2000;
var SKILL_WATCH_ENABLED = true;
//@ chunk-3n0n2sf6.js:972-1149 callgraph-fingerprint (2.1.88 match: addToPromptHistory, 0.208)
async function collectPromptCommandHashes(command) {
  let skillDirCommands = await getSkillDirCommandsCached(getProjectRoot(), command);
  let originalCwd = getOriginalCwd();
  let entry = originalCwd !== getProjectRoot() ? await getSkillDirCommandsCached(originalCwd, command) : [];
  let hashes = new Map();
  for (let command of [...skillDirCommands, ...entry])
    hashes.set(command.name, command.type === "prompt" ? (command.contentHash ?? "") : "");
  return hashes;
}
//@ chunk-w3ch4xq2.js:57468-57891 placement
/**
 * 把短小的粘贴块（不超过限定行数）展开回文本，其余保留为粘贴引用。
 */
function collapseSmallPastedBlocks(text, salt = sessionTagSalt()) {
  let pieces = splitPastedContentBlocks(text);
  if (!pieces.some((piece) => piece.kind === "block" && piece.id === salt))
    return {
      text,
      pastedContents: {},
    };
  let collapsed = new Set();
  for (let [index, piece] of pieces.entries())
    if (
      piece.kind === "block" &&
      piece.id === salt &&
      piece.body.length <= PASTE_THRESHOLD &&
      getPastedTextRefNumLines(piece.body) <= 2
    )
      collapsed.add(index);
  for (;;) {
    let shortPastePieces = getShortPastePieces(
      rebuildPastedContents(pieces, salt, collapsed, () => {
        return;
      }),
    );
    if (shortPastePieces.length === 0) break;
    for (let shortPastePiece of shortPastePieces) collapsed.delete(shortPastePiece);
  }
  let rebuilt = rebuildPastedContents(pieces, salt, collapsed, (content, body) => ({
    id: mintPasteId(text, body),
    type: "text",
    content,
  }));
  return {
    text: rebuilt.text,
    pastedContents: rebuilt.entries,
  };
}
//@ chunk-w3ch4xq2.js:57891-58420 placement
/**
 * 按块重建提示文本与 pastedContents 映射。
 */
function rebuildPastedContents(pieces, salt, collapsed, makeRef) {
  let entries = {};
  let pills = [];
  let shortPastes = [];
  let text = "";
  for (let [index, piece] of pieces.entries()) {
    if (piece.kind === "text") {
      text += piece.text;
      continue;
    }
    if (piece.id !== salt) {
      text += piece.raw;
      continue;
    }
    if (collapsed.has(index)) {
      let inlineTextTag = createInlineTextTag(piece.body, entries, MIN_INLINE_TAG_BLOCK);
      if (inlineTextTag) {
        entries[inlineTextTag.id] = inlineTextTag;
        let from = text.length + piece.body.length - piece.body.trimStart().length;
        shortPastes.push({
          piece: index,
          from,
          to: from + inlineTextTag.content.length,
        });
      }
      text += piece.body;
      let nextPiece = pieces[index + 1];
      if (nextPiece !== undefined && (nextPiece.kind === "block" || !hasWordAfterPunct(nextPiece.text)))
        text += `
`;
      continue;
    }
    let from = text.length;
    let ref = makeRef(piece.body, entries);
    if (ref) {
      entries[ref.id] = ref;
      text += formatPastedTextRef(ref.id, getPastedTextRefNumLines(piece.body));
    }
    pills.push({
      from,
      to: text.length,
    });
  }
  return {
    text,
    entries,
    pills,
    shortPastes,
  };
}
//@ chunk-w3ch4xq2.js:58420-58685 placement
function getShortPastePieces(rebuilt) {
  let needles = getInlinePasteTexts(rebuilt.entries);
  let pieces = [];
  let cursor = 0;
  for (let pill of [...rebuilt.pills, undefined]) {
    let end = pill?.from ?? rebuilt.text.length;
    let historyCopySpans = findHistoryCopySpans(rebuilt.text.slice(cursor, end), needles);
    for (let shortPaste of rebuilt.shortPastes)
      if (
        shortPaste.from >= cursor &&
        shortPaste.to <= end &&
        !historyCopySpans.some(
          (historyCopySpan) =>
            historyCopySpan.from + cursor <= shortPaste.from && shortPaste.to <= historyCopySpan.to + cursor,
        )
      )
        pieces.push(shortPaste.piece);
    cursor = pill?.to ?? cursor;
  }
  return pieces;
}
//@ chunk-w3ch4xq2.js:58685-58747 placement
/**
 * 函数 readPromptText（按特性返回纯文本或解析后的粘贴内容）；位于「输入历史（↑ 键/Ctrl+R）：PromptHistoryStore 读写 <配置目录>/history.jsonl，长粘贴转存 paste-cache，按项目/会话过滤，最多 100 条」模块。
 */
function readPromptText(text) {
  return isVirtualPancakeEnabled()
    ? collapseSmallPastedBlocks(text)
    : {
        text,
        pastedContents: {},
      };
}
//@ chunk-w3ch4xq2.js:58747-58799 fingerprint (2.1.88 match: logEntryToHistoryEntry, 1)
var logEntryToHistoryEntry = (logEntry, display, pastedContents) => ({
  ...logEntry,
  display,
  pastedContents,
});
//@ chunk-sywnjtqb.js:175621-175682 placement (2.1.88 match: addToHistory, 1)
function addToHistory_2() {
  return isSessionPersistenceDisabled() || env.CLAUDE_CODE_SKIP_PROMPT_HISTORY;
}
//@ chunk-h44h5gdv.js:138665-138726 fingerprint (2.1.88 match: addToHistory, 1)
function addToHistory() {
  return isSessionPersistenceDisabled() || env.CLAUDE_CODE_SKIP_PROMPT_HISTORY;
}
//@ chunk-cwkrfaxh.js:584-632 affinity
var URL_HOST_PATTERN = /https?:\/\/([^\s/?#'"`<>\\)\];&|(,]+)/gi;
//@ chunk-cwkrfaxh.js:632-839 fingerprint (2.1.88 match: parseReferences, 0.696)
function parseReferences(input) {
  if (!input) return [];
  let hosts = [];
  for (let match of input.matchAll(URL_HOST_PATTERN)) {
    let lower = match[1].toLowerCase();
    let index = lower.lastIndexOf("@");
    if (index !== -1) lower = lower.slice(index + 1);
    let index_2 = lower.indexOf(":");
    if (index_2 !== -1) lower = lower.slice(0, index_2);
    if (lower) hosts.push(lower);
  }
  return hosts;
}
//@ chunk-75v47sk5.js:29342-29443 fingerprint (2.1.88 match: makeLogEntryReader, 0.56)
async function dirHasHistoryFile(claudeConfigDir) {
  try {
    return (await readdir(claudeConfigDir)).some(
      (name) => isOwnTempName(name, "history.jsonl") || isHashTempFile(name),
    );
  } catch {
    return false;
  }
}
export {
  addToHistory_2,
  addToHistory,
  addHistoryEntry,
  getHistory_2,
  setHistoryStore,
  mintPasteId,
  formatImageRef,
  registerPasteCarrier,
  groupByToObject,
  parsePastedRefs,
  isValidPasteId,
  expandPastedTextRefs_2,
  primePasteIdsFromMessages,
  advancePasteId,
  SKILL_WATCH_DEBOUNCE_MS,
  SKILL_WATCH_MIN_MS,
  SKILL_WATCH_SETTLE_MS,
  SKILL_WATCH_POLL_MS,
  SKILL_WATCH_IDLE_MS,
  collectPromptCommandHashes,
  SKILL_WATCH_ENABLED,
  SKILL_WATCH_MAX_IDLE_MS,
  SKILL_WATCH_RETRY_MS,
  SKILL_WATCH_TIMEOUT_MS,
  SKILL_WATCHER_IDLE_WAKE_TAG,
  SKILL_WATCH_BACKOFF_MS,
  SKILL_WATCH_MAX_WAIT_MS,
  stripPlaceholdersWithOptions,
  getTypedPasteContents,
  getInlinePasteTexts,
  getPastedTextRefNumLines,
  formatPastedTextRef,
  addPastedEntry,
  describeRemovedPastes,
  addHistoryEntryNoUndo,
  flushPromptHistory,
  recordSubmittedPrompts,
  nfcVariants,
  HistoryWriterStack,
  findInlinePasteRanges,
  parseReferences,
  dirHasHistoryFile,
  expandLastPaste,
  MAX_HISTORY_ENTRIES,
  registerHistoryExitFlush,
  renumberPastedContents,
  getLaunchMessagesOutsidePastes,
  expandTruncatedPastes,
  buildUnavailablePasteError,
  getHistoryGeneration,
  readPromptText,
  keepClearedDraft,
  isTransientHistoryReadError,
  getHistory,
  expandHistoryDisplay,
  getPromptHistoryKey,
  readProjectHistory,
  getTimestampedHistory,
  HISTORY_SCOPES,
  collapseSmallPastedBlocks,
  countHistoryForProject,
  removeLastHistoryEntry,
  logEntryToHistoryEntry,
};
