/**
 * history.ts
 *
 * 输入历史（↑ 键/Ctrl+R）：PromptHistoryStore 读写 <配置目录>/history.jsonl，长粘贴转存 paste-cache，按项目/会话过滤，最多 100 条。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/history.ts
 * pieces: chunk-0eyv3mzk.js (2), chunk-2njac0sx.js (2), chunk-5f8vf2zr.js (1), chunk-8t8n4kdh.js (1), chunk-e6aww6q8.js (14), chunk-ez320trn.js (1), chunk-ha3km179.js (5), chunk-s61vbvea.js (60)
 * attribution: affinity 1, fingerprint 10, placement 44, callgraph-fingerprint 1, file-local 2, layout 28
 */
import { join } from "path";
import { readdir } from "fs/promises";
import { DoctorLazy } from "./cli/handlers/util.js";
import { u, E, _enum, string, record, unknown } from "../vendor/zod/v4/classic/schemas.js";
import { regExp, TEAM_SETUP_GUIDE_LABEL, shouldRedactInput } from "./commands.js";
import { uniq } from "./utils/collections.js";
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
import { getClaudeConfigDir, isEnvTruthy } from "./utils/envUtils.js";
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
import { isNestedInteractiveClaudeSession } from "./utils/teammate.js";
import { registerCleanup } from "./utils/cleanupRegistry.js";
import { HostScoped } from "./utils/hostScoped.js";
import { isStoreError } from "./utils/storage/storageErrors.js";
import { SessionRootSlot } from "./bootstrap/sessionSlices.js";
import { sessionTagSalt, createInlineTextTag, MIN_INLINE_TAG_BLOCK } from "./utils/userTurnTags.js";
import { splitPastedContentBlocks, hasWordAfterPunct } from "./utils/pastedContent.js";
import { PASTE_THRESHOLD } from "./utils/imagePaste.js";
import { isVirtualPancakeEnabled } from "./utils/permissions/permissionSetup.js";
import { getSkillDirCommandsCached } from "./skills/loadSkillsDir.js";
import { isOwnTempName } from "./utils/atomicPublishWrite.js";
import { isHashTempFile } from "./services/memorySync/syncFiles.js";
import { env } from "./utils/env.js";
import { readPublishedReadme } from "./services/artifacts/designSystemReadRules.js";
import { README_MD, PROJECT_README_MD } from "./services/artifacts/designSystemGuide.js";

//@ chunk-s61vbvea.js:34066-34244 fingerprint = resolveStoredPastedContent (0.799)
var MAX_HISTORY_ITEMS = 100;
var MAX_CLEARED_DRAFTS = 10;
var MAX_CLEARED_DRAFTS_CHARS = 1e7;
var MAX_PASTED_CONTENT_LENGTH = 1024;
var PastedContentSchema = DoctorLazy(() =>
  u({
    id: E(),
    type: _enum(["text", "image"]),
    content: string().optional(),
    contentHash: string().optional(),
    mediaType: string().optional(),
    filename: string().optional(),
  }),
);
//@ chunk-s61vbvea.js:34244-34301 file-local
function getPastedTextRefNumLines(text) {
  return (text.match(/\r\n|\r|\n/g) || []).length;
}
//@ chunk-s61vbvea.js:34301-34398 fingerprint = formatPastedTextRef (0.508)
function formatPastedTextRef(id, numLines, r = "Pasted text") {
  if (numLines === 0) return `[${r} #${id}]`;
  return `[${r} #${id} +${numLines} lines]`;
}
//@ chunk-s61vbvea.js:34398-34436 fingerprint = formatImageRef (1)
function formatImageRef(id) {
  return `[Image #${id}]`;
}
//@ chunk-s61vbvea.js:34436-34575 layout
/**
 * 从文本中解析粘贴内容占位符（[Pasted text #N] 等），返回 {id, match, index} 列表。
 */
function parsePastedRefs(e) {
  if (!e) return [];
  return [...e.matchAll(regExp)]
    .map((r) => ({
      id: parseInt(r[2] || "0"),
      match: r[0],
      index: r.index,
    }))
    .filter((r) => r.id > 0);
}
//@ chunk-s61vbvea.js:34575-34637 layout
/**
 * 函数 isValidPasteId（正整数且 < 2^32）；位于「输入历史（↑ 键/Ctrl+R）：PromptHistoryStore 读写 <配置目录>/history.jsonl，长粘贴转存 paste-cache，按项目/会话过滤，最多 100 条」模块。
 */
function isValidPasteId(e) {
  return Number.isInteger(e) && e > 0 && e < 4294967296;
}
//@ chunk-s61vbvea.js:34637-35038 layout
/**
 * 生成提示历史去重键：把占位符编号替换为 #_，并附上每个占位的内容指纹（哈希、内联内容、不可用或字面量）。
 */
function getPromptHistoryKey(display, pastedContents) {
  let pastedRefs = parsePastedRefs(display);
  if (pastedRefs.length === 0) return display;
  let s = display;
  for (let j = pastedRefs.length - 1; j >= 0; j--) {
    let S = pastedRefs[j];
    s = s.slice(0, S.index) + S.match.replace(`#${S.id}`, "#_") + s.slice(S.index + S.match.length);
  }
  let mapped = pastedRefs.map((pastedRef) => {
    let S = pastedContents?.[pastedRef.id];
    if (!S) return `literal:${pastedRef.id}`;
    if (S.unavailable) return "dead";
    return S.contentHash !== undefined ? `hash:${S.contentHash}` : `inline:${S.content ?? ""}`;
  });
  return `${s}\x00${mapped.join("\x01")}`;
}
//@ chunk-s61vbvea.js:35038-35101 layout
/**
 * 函数 addPastedEntry（写入一条粘贴记录）；位于「输入历史（↑ 键/Ctrl+R）：PromptHistoryStore 读写 <配置目录>/history.jsonl，长粘贴转存 paste-cache，按项目/会话过滤，最多 100 条」模块。
 */
function addPastedEntry(e, n, r, s) {
  return joinPromptSegments(
    splitPromptSegments(e, parsePastedRefs(e), n, false, r),
    s,
    r,
    getInlinePasteTexts(n),
  );
}
//@ chunk-s61vbvea.js:35101-35165 layout
var LEADING_COMBINING_MARKS = /^[\p{M}\u1161-\u1175\u11A8-\u11C2\u{16D67}\u{16D68}]+/u;
//@ chunk-s61vbvea.js:35165-35275 layout = setCwdState (0.843)
function nfcVariants(cwd) {
  let normalized = cwd.normalize("NFC");
  let r = normalized.replace(LEADING_COMBINING_MARKS, "").trimStart();
  return uniq([cwd, normalized, r]).filter((s) => s !== "");
}
//@ chunk-s61vbvea.js:35275-35489 layout
/**
 * 收集内联粘贴文本（可包含仅斜杠名的项），含 NFC 变体，按长度降序。
 */
function getInlinePasteTexts(e, n = false) {
  let r = new Set();
  for (let s of Object.values(e))
    if (s.type === "text" && s.inline && s.content !== "" && (n || !s.slashNameOnly))
      for (let h of nfcVariants(s.content)) r.add(h);
  return [...r].sort((s, h) => h.length - s.length);
}
//@ chunk-s61vbvea.js:35489-35984 layout
/**
 * 在占位符之外的文本中查找内联粘贴内容出现的区间，合并重叠后按起点排序。
 */
function findInlinePasteRanges(e, n, r = false) {
  if (n === undefined) return [];
  let inlinePasteTexts = getInlinePasteTexts(n, r);
  if (inlinePasteTexts.length === 0) return [];
  let h = [];
  let y = (R, x) => {
    let P = R;
    for (let [j, G] of [...h].sort((L, q) => L[0] - q[0])) {
      if (G <= P || j >= x) continue;
      if (j > P) h.push([P, j]);
      P = Math.max(P, G);
    }
    if (P < x) h.push([P, x]);
  };
  let S = (R, x) => {
    let sliced = e.slice(R, x);
    for (let inlinePasteText of inlinePasteTexts) {
      let index = sliced.indexOf(inlinePasteText);
      while (index !== -1) {
        y(R + index, R + index + inlinePasteText.length);
        index = sliced.indexOf(inlinePasteText, index + 1);
      }
    }
  };
  let w = 0;
  for (let R of parsePastedRefs(e)) {
    if (n[R.id] === undefined) continue;
    S(w, R.index);
    w = R.index + R.match.length;
  }
  S(w, e.length);
  return h.sort((R, x) => R[0] - x[0]);
}
//@ chunk-s61vbvea.js:35984-36222 layout
/**
 * 把文本中的"[...Truncated text]"占位替换为对应的完整粘贴内容。
 */
function expandTruncatedPastes(e, n) {
  if (n === undefined) return e;
  let r = "";
  let s = 0;
  for (let h of parsePastedRefs(e)) {
    let y = n[h.id];
    if (y?.type === "text" && !y.inline && h.match.startsWith("[...Truncated text")) {
      r += e.slice(s, h.index) + y.content;
      s = h.index + h.match.length;
    }
  }
  return r + e.slice(s);
}
//@ chunk-s61vbvea.js:36222-36410 layout
/**
 * 生成启动消息片段，排除与粘贴内容重叠的部分；粘贴中有 ultraplan 而原文没有时返回空。
 */
function getLaunchMessagesOutsidePastes(disconnectedBridge, n) {
  let inlinePasteTexts = getInlinePasteTexts(n ?? {});
  let launchMessage = buildLaunchMessage(disconnectedBridge);
  if (inlinePasteTexts.length === 0) return launchMessage;
  if (
    inlinePasteTexts.some(
      (inlinePasteText) =>
        /ultraplan/i.test(inlinePasteText) && !disconnectedBridge.includes(inlinePasteText),
    )
  )
    return [];
  let inlinePasteRanges = findInlinePasteRanges(disconnectedBridge, n);
  return launchMessage.filter((y) => !rangesOverlap(y.start, y.end, inlinePasteRanges));
}
//@ chunk-s61vbvea.js:36410-36453 file-local
function flushPromptHistory(e, n) {
  return getLaunchMessagesOutsidePastes(e, n).length > 0;
}
//@ chunk-s61vbvea.js:36453-36505 layout
function rangesOverlap(start, end, inlinePasteRanges) {
  return inlinePasteRanges.some(([s, h]) => start < h && end > s);
}
//@ chunk-s61vbvea.js:36505-36581 layout
function isPastedPlaceholderText(match) {
  return match.startsWith("[Pasted text") || match.startsWith(`[${TEAM_SETUP_GUIDE_LABEL}`);
}
//@ chunk-s61vbvea.js:36581-36714 layout
/**
 * 取文本中占位符对应、仍可用的手动输入粘贴内容。
 */
function getTypedPasteContents(text, nextPasteId) {
  return parsePastedRefs(text).flatMap((r) => {
    let s = nextPasteId[r.id];
    return s?.type === "text" && s.unavailable !== true && isPastedPlaceholderText(r.match)
      ? [s.content]
      : [];
  });
}
//@ chunk-s61vbvea.js:36714-37209 layout
/**
 * 按占位符把提示拆成段：用户输入的文本、展开的粘贴内容（可经变换标为非输入）、不可用或非文本占位保持原样。
 */
function splitPromptSegments(e, pastedRefs, r, s, h) {
  let y = [];
  let S = e.length;
  for (let j = pastedRefs.length - 1; j >= 0; j--) {
    let R = pastedRefs[j];
    y.unshift({
      text: e.slice(R.index + R.match.length, S),
      typed: true,
    });
    S = R.index;
    let x = r[R.id];
    if (x?.unavailable === true) {
      if (!s || R.match.startsWith("[Image"))
        y.unshift({
          text: R.match,
          typed: true,
        });
      continue;
    }
    if (x?.type !== "text") {
      y.unshift({
        text: R.match,
        typed: true,
      });
      continue;
    }
    if (!isPastedPlaceholderText(R.match) || !h) {
      y.unshift({
        text: x.content,
        typed: true,
      });
      continue;
    }
    y.unshift({
      text: h(x.content),
      typed: false,
    });
  }
  y.unshift({
    text: e.slice(0, S),
    typed: true,
  });
  return y;
}
//@ chunk-s61vbvea.js:37209-37656 layout
/**
 * 把提示段拼回文本：输入段可经转换（可按内联粘贴再拆分），非输入段之后补换行。
 */
function joinPromptSegments(e, n, r, inlinePasteTexts = []) {
  if (!n && !r) return e.map((x) => x.text).join("");
  let h = n ?? ((x) => x);
  let y = [];
  let S = "";
  let w = () => {
    if (S === "") return;
    if (r && inlinePasteTexts.length > 0)
      y.push(
        ...splitByInlinePastes(S, inlinePasteTexts, r).map((x) =>
          x.typed
            ? {
                text: h(x.text),
                typed: true,
              }
            : x,
        ),
      );
    else
      y.push({
        text: h(S),
        typed: true,
      });
    S = "";
  };
  for (let x of e) {
    if (x.typed) {
      S += x.text;
      continue;
    }
    w();
    y.push(x);
  }
  w();
  let R = "";
  for (let idx = 0; idx < y.length; idx++) {
    let P = y[idx];
    R += P.text;
    let text = y[idx + 1]?.text ?? "";
    if (
      !P.typed &&
      text !== "" &&
      !text.startsWith(`
`)
    )
      R += `
`;
  }
  return R;
}
//@ chunk-s61vbvea.js:37656-37892 layout
function splitByInlinePastes(e, n, r) {
  let s = [];
  let h = 0;
  for (let y of findHistoryCopySpans(e, n)) {
    if (y.from > h)
      s.push({
        text: e.slice(h, y.from),
        typed: true,
      });
    s.push({
      text: r(e.slice(y.from, y.to)),
      typed: false,
    });
    h = y.to;
  }
  if (h < e.length || s.length === 0)
    s.push({
      text: e.slice(h),
      typed: true,
    });
  return s;
}
//@ chunk-s61vbvea.js:37892-37969 layout
function stripPlaceholders(display, n) {
  let { stripped, removed } = expandPromptForSubmit(display, n);
  return {
    input: stripped,
    removed,
  };
}
//@ chunk-s61vbvea.js:37969-38341 layout
/**
 * 展开提示中的占位：去掉已不可用的粘贴占位（记录被删的项），并生成展开后的文本。
 */
function expandPromptForSubmit(e, n, r, s) {
  let pastedRefs = parsePastedRefs(e);
  let y = [];
  let S = e;
  for (let j = pastedRefs.length - 1; j >= 0; j--) {
    let x = pastedRefs[j];
    if (!x.match.startsWith("[Image") && n[x.id]?.unavailable === true) {
      S = S.slice(0, x.index) + S.slice(x.index + x.match.length);
      y.unshift({
        id: x.id,
        label: x.match.startsWith("[...Truncated text") ? "Truncated text" : "Pasted text",
      });
    }
  }
  let expanded = joinPromptSegments(
    splitPromptSegments(e, pastedRefs, n, true, r),
    s,
    r,
    getInlinePasteTexts(n),
  );
  return {
    stripped: S,
    expanded,
    removed: y,
  };
}
//@ chunk-s61vbvea.js:38341-38382 layout
/**
 * 函数 stripPlaceholdersWithOptions（带选项的剥离）；位于「输入历史（↑ 键/Ctrl+R）：PromptHistoryStore 读写 <配置目录>/history.jsonl，长粘贴转存 paste-cache，按项目/会话过滤，最多 100 条」模块。
 */
function stripPlaceholdersWithOptions(e, n, wrapUserTurnContent, escapePastedContentTag) {
  return expandPromptForSubmit(e, n, wrapUserTurnContent, escapePastedContentTag);
}
//@ chunk-s61vbvea.js:38382-38547 layout
function getReferencedTextPastes(display, pastedContents) {
  if (!pastedContents) return [];
  let r = new Set(parsePastedRefs(display).map((s) => s.id));
  return Object.entries(pastedContents).filter(
    (s) => s[1].type === "text" && !s[1].unavailable && r.has(Number(s[0])),
  );
}
//@ chunk-s61vbvea.js:38547-38736 layout
/**
 * 说明哪些粘贴内容已不可用并已从提示中移除。
 */
function describeRemovedPastes(removed) {
  let n = describePlaceholders(removed);
  let joined = n.join(", ");
  return n.length === 1
    ? `${joined} is no longer available and was removed from the prompt`
    : `${joined} are no longer available and were removed from the prompt`;
}
//@ chunk-s61vbvea.js:38736-38909 layout
/**
 * 生成粘贴内容不可用导致未发送的错误提示，请用户放回原文后重发。
 */
function buildUnavailablePasteError(removed) {
  let n = describePlaceholders(removed);
  return `Not sent: ${n.join(", ")} ${n.length === 1 ? "is" : "are"} no longer available. Put that text back in place of its placeholder and send again.`;
}
//@ chunk-s61vbvea.js:38909-38968 layout
function describePlaceholders(e) {
  return uniq(e.map((n) => `${n.label} #${n.id}`));
}
//@ chunk-s61vbvea.js:38968-38980 layout
/**
 * 导出值：MAX_HISTORY_ENTRIES（1e5：历史条数上限）；位于「输入历史（↑ 键/Ctrl+R）：PromptHistoryStore 读写 <配置目录>/history.jsonl，长粘贴转存 paste-cache，按项目/会话过滤，最多 100 条」模块。
 */
var MAX_HISTORY_ENTRIES = 1e5;
//@ chunk-s61vbvea.js:38980-39284 layout
/**
 * 把最后一个可用的文本粘贴占位就地展开（内容过长时不展开），返回展开文本、ID 与光标位置。
 */
function expandLastPaste(e, n) {
  let r = null;
  for (let h of parsePastedRefs(e)) {
    let y = n[h.id];
    if (y?.type !== "text" || y.unavailable) continue;
    if (!r || h.id > r.id) r = h;
  }
  if (!r) return null;
  let content = n[r.id].content;
  if (content.length > MAX_HISTORY_ENTRIES) return null;
  return {
    expanded: e.slice(0, r.index) + content + e.slice(r.index + r.match.length),
    id: r.id,
    cursorOffset: r.index + content.length,
  };
}
//@ chunk-s61vbvea.js:39284-39305 layout
var MAX_HISTORY_ENTRY_CHARS = 200;
var MAX_PASTED_CONTENT_BYTES = 262144;
//@ chunk-s61vbvea.js:39305-39871 layout
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
//@ chunk-s61vbvea.js:39871-40221 fingerprint = getTimestampedHistory (0.47)
var getTimestampedHistory_2 = DoctorLazy(() =>
  u({
    display: string(),
    pastedContents: record(string(), unknown())
      .catch({})
      .transform((e) =>
        Object.fromEntries(
          Object.entries(e).flatMap(([key, value]) => {
            let s = PastedContentSchema().safeParse(value);
            if (s.success) return [[key, s.data]];
            logForDebugging(
              `Dropping a malformed paste record from a history line (${formatZodIssues(s.error)})`,
            );
            return [];
          }),
        ),
      ),
    timestamp: E(),
    project: string(),
    sessionId: string().optional().catch(undefined),
  }),
);
//@ chunk-s61vbvea.js:40221-40318 layout
function formatZodIssues(error) {
  return error.issues.map((issue) => `${issue.path.join(".") || "value"}: ${issue.message}`).join("; ");
}
//@ chunk-s61vbvea.js:40318-40610 placement
/**
 * 解析 history.jsonl 一行并按 schema 校验，失败返回 parse_failed 或 shape_rejected。
 */
function parseHistoryLine(e) {
  try {
    let n = jsonParseRaw(e);
    let r = getTimestampedHistory_2().safeParse(n);
    if (r.success)
      return {
        entry: r.data,
        droppedPasteRecords: hasDroppedPasteRecords(n, r.data),
      };
    logForDebugging(`Skipping malformed history line (${formatZodIssues(r.error)})`);
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
//@ chunk-s61vbvea.js:40610-40854 placement
function hasDroppedPasteRecords(e, n) {
  if (typeof e !== "object" || e === null || !("pastedContents" in e)) return false;
  let pastedContents = e.pastedContents;
  if (pastedContents === null) return false;
  if (typeof pastedContents !== "object" || Array.isArray(pastedContents)) return true;
  return Object.keys(pastedContents).length > Object.keys(n.pastedContents).length;
}
//@ chunk-s61vbvea.js:40854-40935 placement
function totalPastedLength(pastedContents) {
  return Object.values(pastedContents).reduce((acc, r) => acc + (r.content?.length ?? 0), 0);
}
//@ chunk-s61vbvea.js:40935-40959 placement
var MAX_EXPANDED_PASTE_CHARS = 32768;
var MAX_PROJECT_HISTORY_BYTES = 4194304;
//@ chunk-s61vbvea.js:40959-41098 placement
function expandHistoryDisplay(display, n) {
  let r = {};
  for (let [key, value] of Object.entries(n))
    r[Number(key)] =
      value.type === "text"
        ? {
            ...value,
            content: truncateToLength(value.content, MAX_EXPANDED_PASTE_CHARS),
          }
        : value;
  return addPastedEntry(display, r);
}
//@ chunk-s61vbvea.js:41098-41141 placement
var HISTORY_SCOPES = ["session", "project", "everywhere"];
//@ chunk-s61vbvea.js:41141-41342 placement
function isDuplicateOfLastEntry(e) {
  let { prev, next: r, project, sessionId } = e;
  if (!prev || prev.display !== r.display) return false;
  if (prev.project !== project || prev.sessionId !== sessionId) return false;
  return !(Object.keys(prev.pastedContents).length > 0) && !r.hasPastes;
}
//@ chunk-s61vbvea.js:41342-51397 placement
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
  immediateFlush = serializeCalls((e) => this.flushEntriesToDisk(e));
  async *readLogEntries(storage) {
    let sliced = this.pendingEntries.slice();
    let r = new Set(sliced.map((R) => `${R.timestamp}\x00${R.sessionId ?? ""}`));
    for (let j = sliced.length - 1; j >= 0; j--) yield sliced[j];
    let s = join(getClaudeConfigDir(), "history.jsonl");
    let h = false;
    let y = false;
    let S = false;
    let w = false;
    try {
      let R = storage
        ? readHistoryRecordsBackward(storage)
        : readLinesReverse(s, undefined, {
            strict: false,
          });
      for await (let P of R) {
        let historyLine = parseHistoryLine(P);
        if (!historyLine.entry) {
          if (historyLine.rejection === "parse_failed") h = true;
          else y = true;
          continue;
        }
        if (historyLine.droppedPasteRecords) S = true;
        let entry = historyLine.entry;
        let L = `${entry.timestamp}\x00${entry.sessionId ?? ""}`;
        if (this.skippedKeys.has(L) || r.has(L)) continue;
        w = true;
        yield entry;
      }
      let x = h
        ? "history_load_parse_failed"
        : y
          ? "history_load_shape_rejected"
          : S
            ? "history_load_paste_record_dropped"
            : undefined;
      if (x)
        logFeatureSad("history_load", x, {
          parse_failed: h,
          shape_rejected: y,
          paste_record_dropped: S,
        });
      else logFeatureOk("history_load");
    } catch (error) {
      if (getErrnoCode(error) === "ENOENT") {
        logFeatureOk("history_load");
        return;
      }
      if (w || sliced.length > 0) logFeatureSad("history_load", "history_load_read_interrupted");
      else logFeatureBad("history_load", "history_load_read_failed");
      throw error;
    }
  }
  async *readEntries(e) {
    for await (let n of this.readLogEntries(e)) yield await this.toHistoryEntry(n, e);
  }
  async *readTimestamped(e = "project", n) {
    let projectRoot = getProjectRoot();
    let sessionId = getSessionId();
    let h = new Set();
    let y = 0;
    for await (let S of this.readLogEntries(n)) {
      if (e === "project" && S.project !== projectRoot) continue;
      if (e === "session" && S.sessionId !== sessionId) continue;
      let promptHistoryKey = getPromptHistoryKey(S.display, S.pastedContents);
      if (h.has(promptHistoryKey)) continue;
      h.add(promptHistoryKey);
      let R = {};
      if (y < MAX_PROJECT_HISTORY_BYTES)
        for (let [key, value] of Object.entries(S.pastedContents)) {
          let G = value.type === "text" ? await this.resolveStoredPastedContent(value, n) : null;
          if (G) R[Number(key)] = G;
        }
      let x = expandHistoryDisplay(S.display, R);
      if (x !== S.display) y += x.length;
      yield {
        display: S.display,
        expandedDisplay: x,
        timestamp: S.timestamp,
        textLength: S.display.length + (x === S.display ? totalPastedLength(S.pastedContents) : x.length),
        resolve: () => this.toHistoryEntry(S, n),
      };
    }
  }
  async countForProject(e, n) {
    let projectRoot = getProjectRoot();
    let s = 0;
    let h = 0;
    try {
      for await (let S of this.readLogEntries(n)) {
        if (S.project !== projectRoot) continue;
        s++;
        if (!e || e(S.display)) h++;
        if (s >= MAX_HISTORY_ITEMS) break;
      }
    } catch {
      return null;
    }
    let sessionId = getSessionId();
    for (let { entry, project, sessionId: sessionId_2 } of this.clearedDrafts)
      if (project === projectRoot && sessionId_2 === sessionId && (!e || e(entry.display))) h++;
    return h;
  }
  async *readForProject(e, { withClearedDrafts: n = false } = {}) {
    let projectRoot = getProjectRoot();
    let sessionId = getSessionId();
    let h = [];
    let y = 0;
    let S = n
      ? this.clearedDrafts.filter(
          (clearedDraft) => clearedDraft.project === projectRoot && clearedDraft.sessionId === sessionId,
        )
      : [];
    let w = S.length - 1;
    for await (let R of this.readLogEntries(e)) {
      if (R.project !== projectRoot) continue;
      if (R.sessionId === sessionId) {
        for (; w >= 0 && S[w].timestamp > R.timestamp; w--) yield S[w].entry;
        yield await this.toHistoryEntry(R, e);
        y++;
      } else h.push(R);
      if (y + h.length >= MAX_HISTORY_ITEMS) break;
    }
    for (; w >= 0; w--) yield S[w].entry;
    for (let R of h) {
      if (y >= MAX_HISTORY_ITEMS) return;
      yield await this.toHistoryEntry(R, e);
      y++;
    }
  }
  async resolveStoredPastedContent(e, n) {
    if (e.content)
      return {
        id: e.id,
        type: e.type,
        content: e.content,
        mediaType: e.mediaType,
        filename: e.filename,
      };
    if (e.contentHash) {
      let pastedTextByHash = await this.resolvePastedTextByHash(e.contentHash, n);
      if (pastedTextByHash)
        return {
          id: e.id,
          type: e.type,
          content: pastedTextByHash,
          mediaType: e.mediaType,
          filename: e.filename,
        };
    }
    return null;
  }
  reportLostPasteContent(e) {
    let n = e ?? "missing-hash";
    if (this.reportedLostPasteHashes.has(n)) return;
    this.reportedLostPasteHashes.add(n);
    logFeatureSad("paste_store", "paste_store_content_lost");
  }
  async resolvePastedTextByHash(e, n) {
    return this.pendingPasteContents.get(e) ?? (await retrievePastedText(e, n));
  }
  registerPastedTextForRecall(content, n) {
    let r = hashPastedText(content);
    this.pendingPasteContents.set(r, content);
    let s = storePastedTextQueued(r, content, n);
    this.pendingPasteWrites.add(s);
    s.then(() => this.pendingPasteContents.delete(r)).finally(() => this.pendingPasteWrites.delete(s));
    return r;
  }
  async toHistoryEntry(e, n) {
    let r = {};
    for (let [key, value] of Object.entries(e.pastedContents)) {
      let storedPastedContent = await this.resolveStoredPastedContent(value, n);
      if (!storedPastedContent && value.type === "text") this.reportLostPasteContent(value.contentHash);
      r[Number(key)] = storedPastedContent ?? {
        id: value.id,
        type: value.type,
        content: "",
        unavailable: true,
      };
    }
    return {
      display: e.display,
      pastedContents: r,
    };
  }
  async flushEntriesToDisk(e) {
    if (this.pendingEntries.length === 0) return true;
    let sliced = this.pendingEntries.slice();
    this.inFlightFlushEntries = new Set(sliced);
    while (this.pendingPasteWrites.size > 0) await Promise.all(this.pendingPasteWrites);
    if (e)
      try {
        let s = await e.append(
          STORAGE_SPACES.history(),
          sliced.map((y) => ({
            data:
              jsonStringify(y) +
              `
`,
          })),
        );
        if (!s.ok) {
          logForDebugging(`Failed to write prompt history: ${s.error.code}`);
          let y =
            "telemetryCode" in s.error &&
            (s.error.telemetryCode === "LockContended" || s.error.telemetryCode === "LockAcquireFailed");
          logFeatureSad("history_save", y ? "history_save_lock_failed" : "history_save_write_failed");
          return false;
        }
        let h = new Set(sliced);
        this.pendingEntries = this.pendingEntries.filter((pendingEntry) => !h.has(pendingEntry));
        logFeatureOk("history_save");
        return true;
      } catch (error) {
        logForDebugging(`Failed to write prompt history: ${error}`);
        logFeatureSad("history_save", "history_save_write_failed");
        return false;
      } finally {
        this.inFlightFlushEntries = null;
      }
    let r;
    try {
      let s = join(getClaudeConfigDir(), "history.jsonl");
      await getFileReader().append(s, "", 384);
      r = await lock(s, {
        ...HISTORY_FILE_RETRY_OPTIONS,
        onCompromised: (S) =>
          logForDebugging(`History lock compromised: ${S}`, {
            level: "error",
          }),
      });
      let mapped = sliced.map(
        (S) =>
          jsonStringify(S) +
          `
`,
      );
      await getFileReader().append(s, mapped.join(""), 384);
      let y = new Set(sliced);
      this.pendingEntries = this.pendingEntries.filter((pendingEntry) => !y.has(pendingEntry));
      logFeatureOk("history_save");
      return true;
    } catch (error) {
      logForDebugging(`Failed to write prompt history: ${error}`);
      if (r) logFeatureSad("history_save", "history_save_write_failed");
      else logFeatureSad("history_save", "history_save_lock_failed");
      return false;
    } finally {
      this.inFlightFlushEntries = null;
      if (r) await r().catch(logError);
    }
  }
  async flushWithRetries(e, n) {
    if (this.isWriting || this.pendingEntries.length === 0) return;
    if (e > 5) return;
    this.isWriting = true;
    let r = false;
    try {
      r = await this.immediateFlush(n);
    } finally {
      this.isWriting = false;
      if (this.pendingEntries.length > 0) {
        await sleep(500);
        this.currentFlushPromise = this.flushWithRetries(r ? 0 : e + 1, n);
      }
    }
  }
  async addEntry(e, n, r, s = true) {
    let h =
      typeof e === "string"
        ? {
            display: e,
            pastedContents: {},
          }
        : e;
    let { input, removed } = stripPlaceholders(h.display, h.pastedContents ?? {});
    let trimmed = input.trim();
    if (removed.length > 0 && trimmed === "") return;
    if (removed.length > 0 && h.display.trimStart().startsWith("!")) {
      if (s && r !== undefined && r !== "bash") this.lastAddWasDeduped = true;
      return;
    }
    if (removed.length > 0 && h.display.trimStart().startsWith("/")) return;
    if (removed.length > 0) {
      let Q = h.display.trimStart();
      if (
        (trimmed.startsWith("/") && !Q.startsWith("/")) ||
        (trimmed.startsWith("!") && !Q.startsWith("!")) ||
        (trimmed.startsWith("@") && !Q.startsWith("@"))
      ) {
        if (s) this.lastAddWasDeduped = true;
        return;
      }
    }
    if (removed.length > 0) {
      let Q = new Map();
      for (let ae of parsePastedRefs(h.display)) Q.set(ae.id, (Q.get(ae.id) ?? 0) + 1);
      let Z = new Map();
      for (let ae of parsePastedRefs(input)) Z.set(ae.id, (Z.get(ae.id) ?? 0) + 1);
      let ee = false;
      for (let [ae, se] of Z) {
        if (se <= (Q.get(ae) ?? 0)) continue;
        let re = h.pastedContents?.[ae];
        if (re !== undefined && re.type !== "image" && !re.unavailable) {
          ee = true;
          break;
        }
      }
      if (ee) {
        if (s) this.lastAddWasDeduped = true;
        return;
      }
    }
    let R =
      removed.length > 0
        ? {
            ...h,
            display: input,
          }
        : h;
    let projectRoot = getProjectRoot();
    let sessionId = getSessionId();
    let referencedTextPastes = getReferencedTextPastes(R.display, R.pastedContents);
    if (
      isDuplicateOfLastEntry({
        prev: this.lastStoredEntry,
        next: {
          display: R.display,
          hasPastes: referencedTextPastes.length > 0,
        },
        project: projectRoot,
        sessionId,
      })
    ) {
      if (s) this.lastAddWasDeduped = true;
      return;
    }
    let G = {};
    for (let [Q, Z] of referencedTextPastes)
      if (Z.content.length <= MAX_PASTED_CONTENT_LENGTH)
        G[Number(Q)] = {
          id: Z.id,
          type: Z.type,
          content: Z.content,
          mediaType: Z.mediaType,
          filename: Z.filename,
        };
      else
        G[Number(Q)] = {
          id: Z.id,
          type: Z.type,
          contentHash: this.registerPastedTextForRecall(Z.content, n),
          mediaType: Z.mediaType,
          filename: Z.filename,
        };
    let max = Math.max(Date.now(), this.lastAssignedTimestamp + 1);
    this.lastAssignedTimestamp = max;
    let q = {
      ...R,
      pastedContents: G,
      timestamp: max,
      project: projectRoot,
      sessionId,
    };
    this.pendingEntries.push(q);
    this.lastStoredEntry = q;
    this.storedEntryGeneration++;
    this.dropClearedDraftCopies(R, projectRoot, sessionId);
    if (s) {
      this.lastAddedEntry = q;
      this.lastAddWasDeduped = false;
    }
    this.currentFlushPromise = this.flushWithRetries(0, n);
    this.currentFlushPromise;
  }
  async flushOnExit(e) {
    let n = null;
    while (this.currentFlushPromise && this.currentFlushPromise !== n) {
      n = this.currentFlushPromise;
      await n;
    }
    if (this.pendingEntries.length > 0) {
      if (!(await this.immediateFlush(e))) logFeatureBad("history_save", "history_save_exit_flush_failed");
    }
    while (this.pendingPasteWrites.size > 0) await Promise.all(this.pendingPasteWrites);
  }
  add(e, n, r) {
    if (isEnvTruthy(process.env.CLAUDE_CODE_SKIP_PROMPT_HISTORY) || isNestedInteractiveClaudeSession())
      return;
    if (
      this.isSensitive(
        typeof e === "string"
          ? {
              display: e,
              pastedContents: {},
            }
          : e,
      )
    ) {
      if (r?.armUndo !== false) this.lastAddWasDeduped = true;
      return;
    }
    this.registerExitFlush(n);
    this.addEntry(e, n, r?.submitMode, r?.armUndo).catch(logError);
  }
  registerExitFlush(e) {
    if (this.exitFlushHandle) return;
    this.exitFlushHandle = registerCleanup(() => this.flushOnExit(e));
  }
  registerSensitiveCommands(getSensitiveCommands) {
    this.getSensitiveCommands = getSensitiveCommands;
  }
  keepClearedDraft(e, timestamp) {
    let projectRoot = getProjectRoot();
    let sessionId = getSessionId();
    if (
      this.isSensitive(e) ||
      false ||
      isDuplicateOfLastEntry({
        prev: this.lastStoredEntry,
        next: {
          display: e.display,
          hasPastes: Object.keys(e.pastedContents).length > 0,
        },
        project: projectRoot,
        sessionId,
      })
    )
      return;
    this.dropClearedDraftCopies(e, projectRoot, sessionId);
    this.clearedDrafts.push({
      entry: e,
      timestamp,
      project: projectRoot,
      sessionId,
      length: Object.values(e.pastedContents).reduce(
        (acc, pastedContent) => acc + pastedContent.content.length,
        e.display.length,
      ),
    });
    let reduced = this.clearedDrafts.reduce((acc, clearedDraft) => acc + clearedDraft.length, 0);
    while (this.clearedDrafts.length > MAX_CLEARED_DRAFTS || reduced > MAX_CLEARED_DRAFTS_CHARS)
      reduced -= this.clearedDrafts.shift().length;
    this.storedEntryGeneration++;
  }
  dropClearedDraftCopies({ display, pastedContents }, r, s) {
    if (this.clearedDrafts.length === 0) return;
    let promptHistoryKey = getPromptHistoryKey(display, pastedContents);
    this.clearedDrafts = this.clearedDrafts.filter(
      (clearedDraft) =>
        clearedDraft.project !== r ||
        clearedDraft.sessionId !== s ||
        getPromptHistoryKey(clearedDraft.entry.display, clearedDraft.entry.pastedContents) !==
          promptHistoryKey,
    );
  }
  isSensitive({ display, pastedContents }) {
    return shouldRedactInput(display, (this.getSensitiveCommands ?? getSensitiveCommandsRegistry().get)(), {
      pastedTexts: getReferencedTextPastes(display, pastedContents).map(([, r]) => r.content),
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
//@ chunk-s61vbvea.js:51397-51422 placement
var promptHistoryByHost = new HostScoped(() => new PromptHistoryStore());
//@ chunk-s61vbvea.js:51422-51459 placement
/**
 * 取当前宿主的输入历史存储（PromptHistoryStore）。
 */
function getPromptHistory() {
  return promptHistoryByHost.of(getRootSession().host);
}
//@ chunk-s61vbvea.js:51459-51479 placement
class SensitiveCommandsRegistry {
  get = () => [];
}
//@ chunk-s61vbvea.js:51479-51504 placement
var historyStoreSlot = new HostScoped(() => new SensitiveCommandsRegistry());
//@ chunk-s61vbvea.js:51504-51541 placement
function getSensitiveCommandsRegistry() {
  return historyStoreSlot.of(getRootSession().host);
}
//@ chunk-s61vbvea.js:51541-51584 placement
function getHistory(storageV5) {
  return getPromptHistory().readEntries(storageV5);
}
//@ chunk-s61vbvea.js:51584-51782 placement
function isTransientHistoryReadError(e) {
  if (e instanceof FileChangedDuringReadError) return true;
  let cause = e instanceof Error ? e.cause : undefined;
  if (
    isStoreError(cause) &&
    cause.code === "Unavailable" &&
    errnoShapedCode(cause.telemetryCode) === undefined
  )
    return true;
  let r = getErrnoCode(e) ?? storageCauseErrnoCode(e);
  return isSadFsErrnoCode(r) || isEnvFsErrnoCode(r);
}
//@ chunk-s61vbvea.js:51782-51843 placement
function getTimestampedHistory(e = "project", storageV5) {
  return getPromptHistory().readTimestamped(e, storageV5);
}
//@ chunk-s61vbvea.js:51843-51894 placement
function countHistoryForProject(e, storageV5) {
  return getPromptHistory().countForProject(e, storageV5);
}
//@ chunk-s61vbvea.js:51894-51944 placement
/**
 * 函数 readProjectHistory（读项目历史）；位于「输入历史（↑ 键/Ctrl+R）：PromptHistoryStore 读写 <配置目录>/history.jsonl，长粘贴转存 paste-cache，按项目/会话过滤，最多 100 条」模块。
 */
function readProjectHistory(e, n) {
  return getPromptHistory().readForProject(e, n);
}
//@ chunk-s61vbvea.js:51944-51980 placement
/**
 * 函数 addHistoryEntry（追加历史）；位于「输入历史（↑ 键/Ctrl+R）：PromptHistoryStore 读写 <配置目录>/history.jsonl，长粘贴转存 paste-cache，按项目/会话过滤，最多 100 条」模块。
 */
function addHistoryEntry(e, storageV5, r) {
  getPromptHistory().add(e, storageV5, r);
}
//@ chunk-s61vbvea.js:51980-52256 placement
/**
 * 把提交的提示逐条写入历史（含筛查与未回答状态），全都没写入时按需撤销撤回状态。
 */
function recordSubmittedPrompts(e, storageV5, r) {
  let s = false;
  for (let h of e)
    try {
      let historyEntryForCommand = getHistoryEntryForCommand(h, r.placed, {
        screened: r.screened?.get(h),
        unanswered: r.unanswered ?? "skipped",
      });
      if (!historyEntryForCommand) continue;
      s = true;
      addHistoryEntry(historyEntryForCommand, storageV5, {
        submitMode: h.mode,
        armUndo: r.armUndo,
      });
    } catch (error) {
      logError(error);
    }
  if (!s && r.armUndo !== false && r.screened === undefined) getPromptHistory().disarmUndo();
}
//@ chunk-s61vbvea.js:52256-52311 placement
/**
 * 函数 addHistoryEntryNoUndo（追加历史且不挂撤销）；位于「输入历史（↑ 键/Ctrl+R）：PromptHistoryStore 读写 <配置目录>/history.jsonl，长粘贴转存 paste-cache，按项目/会话过滤，最多 100 条」模块。
 */
function addHistoryEntryNoUndo(e, storageV5, submitMode) {
  addHistoryEntry(e, storageV5, {
    submitMode,
    armUndo: false,
  });
}
//@ chunk-s61vbvea.js:52311-52353 placement
/**
 * 函数 registerHistoryExitFlush（注册退出前刷盘）；位于「输入历史（↑ 键/Ctrl+R）：PromptHistoryStore 读写 <配置目录>/history.jsonl，长粘贴转存 paste-cache，按项目/会话过滤，最多 100 条」模块。
 */
function registerHistoryExitFlush(e) {
  getPromptHistory().registerExitFlush(e);
}
//@ chunk-s61vbvea.js:52353-52380 placement
/**
 * 函数 setHistoryStore（替换历史存储）；位于「输入历史（↑ 键/Ctrl+R）：PromptHistoryStore 读写 <配置目录>/history.jsonl，长粘贴转存 paste-cache，按项目/会话过滤，最多 100 条」模块。
 */
function setHistoryStore(get) {
  getSensitiveCommandsRegistry().get = get;
}
//@ chunk-s61vbvea.js:52380-52425 placement
/**
 * 函数 keepClearedDraft（保留已清空的草稿）；位于「输入历史（↑ 键/Ctrl+R）：PromptHistoryStore 读写 <配置目录>/history.jsonl，长粘贴转存 paste-cache，按项目/会话过滤，最多 100 条」模块。
 */
function keepClearedDraft(e, clearedAt) {
  getPromptHistory().keepClearedDraft(e, clearedAt);
}
//@ chunk-s61vbvea.js:52425-52468 placement
/**
 * 函数 getHistoryGeneration（取历史代数）；位于「输入历史（↑ 键/Ctrl+R）：PromptHistoryStore 读写 <配置目录>/history.jsonl，长粘贴转存 paste-cache，按项目/会话过滤，最多 100 条」模块。
 */
function getHistoryGeneration() {
  return getPromptHistory().getGeneration();
}
//@ chunk-s61vbvea.js:52468-52501 placement
/**
 * 函数 removeLastHistoryEntry（移除最后一条历史）；位于「输入历史（↑ 键/Ctrl+R）：PromptHistoryStore 读写 <配置目录>/history.jsonl，长粘贴转存 paste-cache，按项目/会话过滤，最多 100 条」模块。
 */
function removeLastHistoryEntry() {
  getPromptHistory().removeLast();
}
//@ chunk-e6aww6q8.js:191405-191531 placement
function groupByToObject(e, n) {
  let r = Object.create(null);
  let s = 0;
  for (let h of e) {
    let y = n(h, s++);
    if (r[y] === undefined) r[y] = [];
    r[y].push(h);
  }
  return r;
}
//@ chunk-e6aww6q8.js:191531-191550 placement
var MAX_PASTE_ID = 2147483648;
//@ chunk-e6aww6q8.js:191550-192112 placement
/**
 * 粘贴占位编号分配器：跳过转录与承载者中已用的编号，按会话纪元记录本纪元分配过的编号。
 */
class PasteIdAllocator {
  next = 1;
  minted = new Set();
  flooredSessionId = null;
  carrierProviders = new Set();
  registerCarrier(e) {
    this.carrierProviders.add(e);
    return () => {
      this.carrierProviders.delete(e);
    };
  }
  advancePast(e) {
    if (isValidPasteId(e) && e < MAX_PASTE_ID && e >= this.next) this.next = e + 1;
  }
  advancePastText(e) {
    for (let n of parsePastedRefs(e)) this.advancePast(n.id);
  }
  startEpoch(flooredSessionId) {
    this.minted = new Set();
    this.flooredSessionId = flooredSessionId;
  }
  mint() {
    for (let carrierProvider of this.carrierProviders)
      for (let r of carrierProvider()) this.advancePastText(r);
    if (!isValidPasteId(this.next)) this.next = MAX_PASTE_ID;
    let e = this.next++;
    this.minted.add(e);
    return e;
  }
  wasMintedThisEpoch(e) {
    return this.minted.has(e);
  }
}
//@ chunk-e6aww6q8.js:192112-192140 placement
var pasteIdAllocatorSlot = new SessionRootSlot(() => new PasteIdAllocator());
//@ chunk-e6aww6q8.js:192140-192173 placement
function pasteIdAllocator() {
  return pasteIdAllocatorSlot.of(getRootSession());
}
//@ chunk-e6aww6q8.js:192173-192219 placement
/**
 * 函数 registerPasteCarrier（登记粘贴占位载体）；位于「输入历史（↑ 键/Ctrl+R）：PromptHistoryStore 读写 <配置目录>/history.jsonl，长粘贴转存 paste-cache，按项目/会话过滤，最多 100 条」模块。
 */
function registerPasteCarrier(e) {
  return pasteIdAllocator().registerCarrier(e);
}
//@ chunk-e6aww6q8.js:192219-192938 placement
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
        for (let s of message.message.content) if (s.type === "text") allocator.advancePastText(s.text);
      } else if (typeof message.message.content === "string")
        allocator.advancePastText(message.message.content);
      if (message.stackedOriginalInput) allocator.advancePastText(message.stackedOriginalInput);
    } else if (message.type === "attachment" && message.attachment.type === "queued_command") {
      let attachment = message.attachment;
      if (attachment.imagePasteIds)
        for (let imagePasteId of attachment.imagePasteIds) allocator.advancePast(imagePasteId);
      if (typeof attachment.prompt === "string") allocator.advancePastText(attachment.prompt);
      else if (Array.isArray(attachment.prompt)) {
        for (let h of attachment.prompt) if (h.type === "text") allocator.advancePastText(h.text);
      }
    }
  allocator.startEpoch(getSessionId());
}
//@ chunk-e6aww6q8.js:192938-192974 placement
/**
 * 函数 advancePasteId（推进已用的粘贴编号）；位于「输入历史（↑ 键/Ctrl+R）：PromptHistoryStore 读写 <配置目录>/history.jsonl，长粘贴转存 paste-cache，按项目/会话过滤，最多 100 条」模块。
 */
function advancePasteId(maxStoredImageId) {
  pasteIdAllocator().advancePast(maxStoredImageId);
}
//@ chunk-e6aww6q8.js:192974-193012 placement
/**
 * 函数 mintPasteId（分配新的粘贴编号）；位于「输入历史（↑ 键/Ctrl+R）：PromptHistoryStore 读写 <配置目录>/history.jsonl，长粘贴转存 paste-cache，按项目/会话过滤，最多 100 条」模块。
 */
function mintPasteId(e, n) {
  return mintPasteId_2(pasteIdAllocator(), e, n);
}
//@ chunk-e6aww6q8.js:193012-193132 placement
function mintPasteId_2(e, n, r) {
  if (n) e.advancePastText(n);
  if (r) for (let key of Object.keys(r)) e.advancePast(Number(key));
  return e.mint();
}
//@ chunk-e6aww6q8.js:193132-193311 placement
function isPasteRefOfType(match, n) {
  switch (n) {
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
//@ chunk-e6aww6q8.js:193311-193524 placement
function expandPastedTextRefs_2(input, n, r, s) {
  let refs = parsePastedRefs(input).filter((S) => S.id === n && isPasteRefOfType(S.match, s));
  let expanded = input;
  for (let i = refs.length - 1; i >= 0; i--) {
    let ref = refs[i];
    expanded =
      expanded.slice(0, ref.index) +
      ref.match.replace(`#${n}`, `#${r}`) +
      expanded.slice(ref.index + ref.match.length);
  }
  return expanded;
}
//@ chunk-e6aww6q8.js:193524-193960 placement
/**
 * 把历史条目里的粘贴编号重新分配为本会话不冲突的新编号，同时更新显示文本中的占位（本纪元已分配的可跳过）。
 */
function renumberPastedContents({ display, pastedContents, allowCurrentEpochSkip = false }) {
  let s = pasteIdAllocator();
  let h = allowCurrentEpochSkip && s.flooredSessionId === getSessionId();
  let entries = Object.entries(pastedContents);
  let S = [];
  let w = {};
  for (let [G, q] of entries) {
    let Z = Number(G);
    if (!isValidPasteId(Z) || (h && s.wasMintedThisEpoch(Z))) {
      w[Z] = q;
      continue;
    }
    S.push([Z, q]);
  }
  if (S.length === 0)
    return {
      display,
      pastedContents,
    };
  let L = display;
  S.sort((G, q) => G[0] - q[0]);
  for (let [G, q] of S) {
    let Z = mintPasteId_2(s, L, pastedContents);
    L = expandPastedTextRefs_2(L, G, Z, q.type);
    w[Z] = {
      ...q,
      id: Z,
    };
  }
  return {
    display: L,
    pastedContents: w,
  };
}
//@ chunk-e6aww6q8.js:932812-933012 fingerprint = removeLastFromHistory (0.389)
class HistoryWriterStack {
  writers = [];
  register(e) {
    this.writers.push(e);
  }
  unregister(e) {
    let index = this.writers.lastIndexOf(e);
    if (index >= 0) this.writers.splice(index, 1);
  }
  reset() {
    this.writers.length = 0;
  }
  write(e) {
    this.writers.at(-1)?.(e);
  }
}
//@ chunk-ha3km179.js:52979-53402 placement
/**
 * 把短小的粘贴块（不超过限定行数）展开回文本，其余保留为粘贴引用。
 */
function collapseSmallPastedBlocks(e, n = sessionTagSalt()) {
  let r = splitPastedContentBlocks(e);
  if (!r.some((y) => y.kind === "block" && y.id === n))
    return {
      text: e,
      pastedContents: {},
    };
  let s = new Set();
  for (let [y, S] of r.entries())
    if (
      S.kind === "block" &&
      S.id === n &&
      S.body.length <= PASTE_THRESHOLD &&
      getPastedTextRefNumLines(S.body) <= 2
    )
      s.add(y);
  for (;;) {
    let shortPastePieces = getShortPastePieces(
      rebuildPastedContents(r, n, s, () => {
        return;
      }),
    );
    if (shortPastePieces.length === 0) break;
    for (let shortPastePiece of shortPastePieces) s.delete(shortPastePiece);
  }
  let h = rebuildPastedContents(r, n, s, (content, S) => ({
    id: mintPasteId(e, S),
    type: "text",
    content,
  }));
  return {
    text: h.text,
    pastedContents: h.entries,
  };
}
//@ chunk-ha3km179.js:53402-53931 placement
/**
 * 按块重建提示文本与 pastedContents 映射。
 */
function rebuildPastedContents(e, n, r, s) {
  let h = {};
  let y = [];
  let S = [];
  let M = "";
  for (let [R, T] of e.entries()) {
    if (T.kind === "text") {
      M += T.text;
      continue;
    }
    if (T.id !== n) {
      M += T.raw;
      continue;
    }
    if (r.has(R)) {
      let inlineTextTag = createInlineTextTag(T.body, h, MIN_INLINE_TAG_BLOCK);
      if (inlineTextTag) {
        h[inlineTextTag.id] = inlineTextTag;
        let L = M.length + T.body.length - T.body.trimStart().length;
        S.push({
          piece: R,
          from: L,
          to: L + inlineTextTag.content.length,
        });
      }
      M += T.body;
      let D = e[R + 1];
      if (D !== undefined && (D.kind === "block" || !hasWordAfterPunct(D.text)))
        M += `
`;
      continue;
    }
    let from = M.length;
    let P = s(T.body, h);
    if (P) {
      h[P.id] = P;
      M += formatPastedTextRef(P.id, getPastedTextRefNumLines(T.body));
    }
    y.push({
      from,
      to: M.length,
    });
  }
  return {
    text: M,
    entries: h,
    pills: y,
    shortPastes: S,
  };
}
//@ chunk-ha3km179.js:53931-54196 placement
function getShortPastePieces(e) {
  let inlinePasteTexts = getInlinePasteTexts(e.entries);
  let r = [];
  let s = 0;
  for (let h of [...e.pills, undefined]) {
    let y = h?.from ?? e.text.length;
    let historyCopySpans = findHistoryCopySpans(e.text.slice(s, y), inlinePasteTexts);
    for (let shortPaste of e.shortPastes)
      if (
        shortPaste.from >= s &&
        shortPaste.to <= y &&
        !historyCopySpans.some(
          (historyCopySpan) =>
            historyCopySpan.from + s <= shortPaste.from && shortPaste.to <= historyCopySpan.to + s,
        )
      )
        r.push(shortPaste.piece);
    s = h?.to ?? s;
  }
  return r;
}
//@ chunk-ha3km179.js:54196-54258 placement
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
//@ chunk-ha3km179.js:54258-54310 fingerprint = logEntryToHistoryEntry (1)
var logEntryToHistoryEntry = (e, display, pastedContents) => ({
  ...e,
  display,
  pastedContents,
});
//@ chunk-0eyv3mzk.js:584-632 affinity
var URL_HOST_PATTERN = /https?:\/\/([^\s/?#'"`<>\\)\];&|(,]+)/gi;
//@ chunk-0eyv3mzk.js:632-839 fingerprint = parseReferences (0.696)
function parseReferences(input) {
  if (!input) return [];
  let s = [];
  for (let e of input.matchAll(URL_HOST_PATTERN)) {
    let lower = e[1].toLowerCase();
    let index = lower.lastIndexOf("@");
    if (index !== -1) lower = lower.slice(index + 1);
    let index_2 = lower.indexOf(":");
    if (index_2 !== -1) lower = lower.slice(0, index_2);
    if (lower) s.push(lower);
  }
  return s;
}
//@ chunk-2njac0sx.js:812-935 placement
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
//@ chunk-2njac0sx.js:935-1112 callgraph-fingerprint = addToPromptHistory (0.208)
async function collectPromptCommandHashes(command) {
  let skillDirCommands = await getSkillDirCommandsCached(getProjectRoot(), command);
  let originalCwd = getOriginalCwd();
  let entry = originalCwd !== getProjectRoot() ? await getSkillDirCommandsCached(originalCwd, command) : [];
  let p = new Map();
  for (let k of [...skillDirCommands, ...entry])
    p.set(k.name, k.type === "prompt" ? (k.contentHash ?? "") : "");
  return p;
}
//@ chunk-5f8vf2zr.js:28166-28267 fingerprint = makeLogEntryReader (0.56)
async function dirHasHistoryFile(claudeConfigDir) {
  try {
    return (await readdir(claudeConfigDir)).some(
      (o) => isOwnTempName(o, "history.jsonl") || isHashTempFile(o),
    );
  } catch {
    return false;
  }
}
//@ chunk-8t8n4kdh.js:174068-174129 fingerprint = addToHistory (1)
function addToHistory_2() {
  return isSessionPersistenceDisabled() || env.CLAUDE_CODE_SKIP_PROMPT_HISTORY;
}
//@ chunk-ez320trn.js:7416-7526 fingerprint = getHistory (0.7)
async function getHistory_2(parsed, signal, context) {
  let [publishedReadme, publishedReadme_2] = await Promise.all([
    readPublishedReadme(parsed, README_MD, false, signal, context),
    readPublishedReadme(parsed, PROJECT_README_MD, true, signal, context),
  ]);
  return {
    root: publishedReadme,
    project: publishedReadme_2,
  };
}
export {
  mintPasteId,
  formatImageRef,
  primePasteIdsFromMessages,
  advancePasteId,
  getPastedTextRefNumLines,
  formatPastedTextRef,
  addPastedEntry,
  parseReferences,
  registerPasteCarrier,
  groupByToObject,
  parsePastedRefs,
  isValidPasteId,
  expandPastedTextRefs_2,
  addHistoryEntry,
  recordSubmittedPrompts,
  renumberPastedContents,
  getLaunchMessagesOutsidePastes,
  expandTruncatedPastes,
  nfcVariants,
  expandLastPaste,
  MAX_HISTORY_ENTRIES,
  stripPlaceholdersWithOptions,
  getTypedPasteContents,
  getInlinePasteTexts,
  buildUnavailablePasteError,
  describeRemovedPastes,
  readPromptText,
  keepClearedDraft,
  isTransientHistoryReadError,
  getHistory,
  expandHistoryDisplay,
  getPromptHistoryKey,
  readProjectHistory,
  getTimestampedHistory,
  HISTORY_SCOPES,
  addToHistory_2,
  collapseSmallPastedBlocks,
  getHistoryGeneration,
  countHistoryForProject,
  addHistoryEntryNoUndo,
  flushPromptHistory,
  removeLastHistoryEntry,
  registerHistoryExitFlush,
  SKILL_WATCH_DEBOUNCE_MS,
  SKILL_WATCH_MIN_MS,
  SKILL_WATCH_SETTLE_MS,
  SKILL_WATCH_POLL_MS,
  collectPromptCommandHashes,
  SKILL_WATCH_ENABLED,
  SKILL_WATCH_MAX_IDLE_MS,
  SKILL_WATCH_RETRY_MS,
  SKILL_WATCH_IDLE_MS,
  SKILL_WATCH_TIMEOUT_MS,
  SKILL_WATCHER_IDLE_WAKE_TAG,
  SKILL_WATCH_BACKOFF_MS,
  SKILL_WATCH_MAX_WAIT_MS,
  dirHasHistoryFile,
  HistoryWriterStack,
  setHistoryStore,
  findInlinePasteRanges,
  getHistory_2,
  logEntryToHistoryEntry,
};
