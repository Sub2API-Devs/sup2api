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
import {
  join,
  join as join_2,
  join as join_3,
  join as join_4,
  join as join_5,
  join as join_6,
  join as join_7,
  join as join_8,
  join as join_9,
  join as join_10,
  join as join_11,
  join as join_12,
  join as join_13,
  join as join_14,
  join as join_15,
  join as join_16,
  join as join_17,
  join as join_18,
  join as join_19,
  join as join_20,
} from "path";
import { readdir } from "fs/promises";
import { DoctorLazy } from "./cli/handlers/util.js";
import { u, E, U, o, pe, oe } from "../vendor/zod/v4/classic/schemas.js";
import { regExp, TEAM_SETUP_GUIDE_LABEL, shouldRedactInput } from "./commands.js";
import { uniq } from "./utils/collections.js";
import { buildLaunchMessage } from "./commands/ultraplan.js";
import { findHistoryCopySpans, xnt, getHistoryEntryForCommand } from "./utils/historyFile.js";
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
import { v0e, createInlineTextTag, o9n } from "./utils/userTurnTags.js";
import { splitPastedContentBlocks, q_s } from "./utils/pastedContent.js";
import { PASTE_THRESHOLD } from "./utils/imagePaste.js";
import { isVirtualPancakeEnabled } from "./utils/permissions/permissionSetup.js";
import { getSkillDirCommandsCached } from "./skills/loadSkillsDir.js";
import { isOwnTempName } from "./utils/atomicPublishWrite.js";
import { eie } from "./services/memorySync/syncFiles.js";
import { env } from "./utils/env.js";
import { readPublishedReadme } from "./services/artifacts/designSystemReadRules.js";
import { README_MD, PROJECT_README_MD } from "./services/artifacts/designSystemGuide.js";

//@ chunk-s61vbvea.js:34066-34244 fingerprint = resolveStoredPastedContent (0.799)
var MAX_HISTORY_ITEMS = 100,
  MAX_CLEARED_DRAFTS = 10,
  MAX_CLEARED_DRAFTS_CHARS = 1e7,
  MAX_PASTED_CONTENT_LENGTH = 1024,
  Vx = DoctorLazy(() =>
    u({
      id: E(),
      type: U(["text", "image"]),
      content: o().optional(),
      contentHash: o().optional(),
      mediaType: o().optional(),
      filename: o().optional(),
    }),
  );
//@ chunk-s61vbvea.js:34244-34301 file-local
function getPastedTextRefNumLines(text) {
  return (text.match(/\r\n|\r|\n/g) || []).length;
}
//@ chunk-s61vbvea.js:34301-34398 fingerprint = formatPastedTextRef (0.508)
function formatPastedTextRef(e, n, r = "Pasted text") {
  if (n === 0) return `[${r} #${e}]`;
  return `[${r} #${e} +${n} lines]`;
}
//@ chunk-s61vbvea.js:34398-34436 fingerprint = formatImageRef (1)
function formatImageRef(id) {
  return `[Image #${id}]`;
}
/**
 * 从文本中解析粘贴内容占位符（[Pasted text #N] 等），返回 {id, match, index} 列表。
 */
//@ chunk-s61vbvea.js:34436-34575 layout
function parsePastedRefs(e) {
  if (!e) return [];
  return [...e.matchAll(regExp)]
    .map((r) => ({ id: parseInt(r[2] || "0"), match: r[0], index: r.index }))
    .filter((r) => r.id > 0);
}
//@ chunk-s61vbvea.js:34575-34637 layout
function n_n(e) {
  return Number.isInteger(e) && e > 0 && e < 4294967296;
}
/**
 * 生成提示历史去重键：把占位符编号替换为 #_，并附上每个占位的内容指纹（哈希、内联内容、不可用或字面量）。
 */
//@ chunk-s61vbvea.js:34637-35038 layout
function getPromptHistoryKey(e, n) {
  let r = parsePastedRefs(e);
  if (r.length === 0) return e;
  let s = e;
  for (let y = r.length - 1; y >= 0; y--) {
    let S = r[y];
    s = s.slice(0, S.index) + S.match.replace(`#${S.id}`, "#_") + s.slice(S.index + S.match.length);
  }
  let mapped = r.map((y) => {
    let S = n?.[y.id];
    if (!S) return `literal:${y.id}`;
    if (S.unavailable) return "dead";
    return S.contentHash !== void 0 ? `hash:${S.contentHash}` : `inline:${S.content ?? ""}`;
  });
  return `${s}\x00${mapped.join("\x01")}`;
}
//@ chunk-s61vbvea.js:35038-35101 layout
function rpe(e, n, r, s) {
  return joinPromptSegments(
    splitPromptSegments(e, parsePastedRefs(e), n, !1, r),
    s,
    r,
    getInlinePasteTexts(n),
  );
}
//@ chunk-s61vbvea.js:35101-35165 layout
var LEADING_COMBINING_MARKS = /^[\p{M}\u1161-\u1175\u11A8-\u11C2\u{16D67}\u{16D68}]+/u;
//@ chunk-s61vbvea.js:35165-35275 layout = setCwdState (0.843)
function nfcVariants(cwd) {
  let normalized = cwd.normalize("NFC"),
    trimStart = normalized.replace(LEADING_COMBINING_MARKS, "").trimStart();
  return uniq([cwd, normalized, trimStart]).filter((s) => s !== "");
}
/**
 * 收集内联粘贴文本（可包含仅斜杠名的项），含 NFC 变体，按长度降序。
 */
//@ chunk-s61vbvea.js:35275-35489 layout
function getInlinePasteTexts(e, n = !1) {
  let r = new Set();
  for (let s of Object.values(e))
    if (s.type === "text" && s.inline && s.content !== "" && (n || !s.slashNameOnly))
      for (let h of nfcVariants(s.content)) r.add(h);
  return [...r].sort((s, h) => h.length - s.length);
}
/**
 * 在占位符之外的文本中查找内联粘贴内容出现的区间，合并重叠后按起点排序。
 */
//@ chunk-s61vbvea.js:35489-35984 layout
function findInlinePasteRanges(e, n, r = !1) {
  if (n === void 0) return [];
  let s = getInlinePasteTexts(n, r);
  if (s.length === 0) return [];
  let h = [],
    y = (R, x) => {
      let P = R;
      for (let [j, G] of [...h].sort((L, q) => L[0] - q[0])) {
        if (G <= P || j >= x) continue;
        if (j > P) h.push([P, j]);
        P = Math.max(P, G);
      }
      if (P < x) h.push([P, x]);
    },
    S = (R, x) => {
      let sliced = e.slice(R, x);
      for (let j of s) {
        let index = sliced.indexOf(j);
        while (index !== -1) (y(R + index, R + index + j.length), (index = sliced.indexOf(j, index + 1)));
      }
    },
    w = 0;
  for (let R of parsePastedRefs(e)) {
    if (n[R.id] === void 0) continue;
    (S(w, R.index), (w = R.index + R.match.length));
  }
  return (S(w, e.length), h.sort((R, x) => R[0] - x[0]));
}
/**
 * 把文本中的"[...Truncated text]"占位替换为对应的完整粘贴内容。
 */
//@ chunk-s61vbvea.js:35984-36222 layout
function expandTruncatedPastes(e, n) {
  if (n === void 0) return e;
  let r = "",
    s = 0;
  for (let h of parsePastedRefs(e)) {
    let y = n[h.id];
    if (y?.type === "text" && !y.inline && h.match.startsWith("[...Truncated text"))
      ((r += e.slice(s, h.index) + y.content), (s = h.index + h.match.length));
  }
  return r + e.slice(s);
}
/**
 * 生成启动消息片段，排除与粘贴内容重叠的部分；粘贴中有 ultraplan 而原文没有时返回空。
 */
//@ chunk-s61vbvea.js:36222-36410 layout
function getLaunchMessagesOutsidePastes(e, n) {
  let r = getInlinePasteTexts(n ?? {}),
    s = buildLaunchMessage(e);
  if (r.length === 0) return s;
  if (r.some((y) => /ultraplan/i.test(y) && !e.includes(y))) return [];
  let h = findInlinePasteRanges(e, n);
  return s.filter((y) => !qx(y.start, y.end, h));
}
//@ chunk-s61vbvea.js:36410-36453 file-local
function flushPromptHistory(e, n) {
  return getLaunchMessagesOutsidePastes(e, n).length > 0;
}
//@ chunk-s61vbvea.js:36453-36505 layout
function qx(e, n, r) {
  return r.some(([s, h]) => e < h && n > s);
}
//@ chunk-s61vbvea.js:36505-36581 layout
function Em(e) {
  return e.startsWith("[Pasted text") || e.startsWith(`[${TEAM_SETUP_GUIDE_LABEL}`);
}
/**
 * 取文本中占位符对应、仍可用的手动输入粘贴内容。
 */
//@ chunk-s61vbvea.js:36581-36714 layout
function getTypedPasteContents(e, n) {
  return parsePastedRefs(e).flatMap((r) => {
    let s = n[r.id];
    return s?.type === "text" && s.unavailable !== !0 && Em(r.match) ? [s.content] : [];
  });
}
/**
 * 按占位符把提示拆成段：用户输入的文本、展开的粘贴内容（可经变换标为非输入）、不可用或非文本占位保持原样。
 */
//@ chunk-s61vbvea.js:36714-37209 layout
function splitPromptSegments(e, n, r, s, h) {
  let y = [],
    S = e.length;
  for (let w = n.length - 1; w >= 0; w--) {
    let R = n[w];
    (y.unshift({ text: e.slice(R.index + R.match.length, S), typed: !0 }), (S = R.index));
    let x = r[R.id];
    if (x?.unavailable === !0) {
      if (!s || R.match.startsWith("[Image")) y.unshift({ text: R.match, typed: !0 });
      continue;
    }
    if (x?.type !== "text") {
      y.unshift({ text: R.match, typed: !0 });
      continue;
    }
    if (!Em(R.match) || !h) {
      y.unshift({ text: x.content, typed: !0 });
      continue;
    }
    y.unshift({ text: h(x.content), typed: !1 });
  }
  return (y.unshift({ text: e.slice(0, S), typed: !0 }), y);
}
/**
 * 把提示段拼回文本：输入段可经转换（可按内联粘贴再拆分），非输入段之后补换行。
 */
//@ chunk-s61vbvea.js:37209-37656 layout
function joinPromptSegments(e, n, r, s = []) {
  if (!n && !r) return e.map((x) => x.text).join("");
  let h = n ?? ((x) => x),
    y = [],
    S = "",
    w = () => {
      if (S === "") return;
      if (r && s.length > 0)
        y.push(...splitByInlinePastes(S, s, r).map((x) => (x.typed ? { text: h(x.text), typed: !0 } : x)));
      else y.push({ text: h(S), typed: !0 });
      S = "";
    };
  for (let x of e) {
    if (x.typed) {
      S += x.text;
      continue;
    }
    (w(), y.push(x));
  }
  w();
  let R = "";
  for (let x = 0; x < y.length; x++) {
    let P = y[x];
    R += P.text;
    let j = y[x + 1]?.text ?? "";
    if (
      !P.typed &&
      j !== "" &&
      !j.startsWith(`
`)
    )
      R += `
`;
  }
  return R;
}
//@ chunk-s61vbvea.js:37656-37892 layout
function splitByInlinePastes(e, n, r) {
  let s = [],
    h = 0;
  for (let y of findHistoryCopySpans(e, n)) {
    if (y.from > h) s.push({ text: e.slice(h, y.from), typed: !0 });
    (s.push({ text: r(e.slice(y.from, y.to)), typed: !1 }), (h = y.to));
  }
  if (h < e.length || s.length === 0) s.push({ text: e.slice(h), typed: !0 });
  return s;
}
//@ chunk-s61vbvea.js:37892-37969 layout
function Qx(e, n) {
  let { stripped: stripped, removed: removed } = expandPromptForSubmit(e, n);
  return { input: stripped, removed: removed };
}
/**
 * 展开提示中的占位：去掉已不可用的粘贴占位（记录被删的项），并生成展开后的文本。
 */
//@ chunk-s61vbvea.js:37969-38341 layout
function expandPromptForSubmit(e, n, r, s) {
  let h = parsePastedRefs(e),
    y = [],
    S = e;
  for (let R = h.length - 1; R >= 0; R--) {
    let x = h[R];
    if (!x.match.startsWith("[Image") && n[x.id]?.unavailable === !0)
      ((S = S.slice(0, x.index) + S.slice(x.index + x.match.length)),
        y.unshift({
          id: x.id,
          label: x.match.startsWith("[...Truncated text") ? "Truncated text" : "Pasted text",
        }));
  }
  let w = joinPromptSegments(splitPromptSegments(e, h, n, !0, r), s, r, getInlinePasteTexts(n));
  return { stripped: S, expanded: w, removed: y };
}
//@ chunk-s61vbvea.js:38341-38382 layout
function Ter(e, n, r, s) {
  return expandPromptForSubmit(e, n, r, s);
}
//@ chunk-s61vbvea.js:38382-38547 layout
function getReferencedTextPastes(e, n) {
  if (!n) return [];
  let r = new Set(parsePastedRefs(e).map((s) => s.id));
  return Object.entries(n).filter((s) => s[1].type === "text" && !s[1].unavailable && r.has(Number(s[0])));
}
/**
 * 说明哪些粘贴内容已不可用并已从提示中移除。
 */
//@ chunk-s61vbvea.js:38547-38736 layout
function describeRemovedPastes(e) {
  let n = Cm(e),
    joined = n.join(", ");
  return n.length === 1
    ? `${joined} is no longer available and was removed from the prompt`
    : `${joined} are no longer available and were removed from the prompt`;
}
/**
 * 生成粘贴内容不可用导致未发送的错误提示，请用户放回原文后重发。
 */
//@ chunk-s61vbvea.js:38736-38909 layout
function buildUnavailablePasteError(e) {
  let n = Cm(e);
  return `Not sent: ${n.join(", ")} ${n.length === 1 ? "is" : "are"} no longer available. Put that text back in place of its placeholder and send again.`;
}
//@ chunk-s61vbvea.js:38909-38968 layout
function Cm(e) {
  return uniq(e.map((n) => `${n.label} #${n.id}`));
}
//@ chunk-s61vbvea.js:38968-38980 layout
var ert = 1e5;
/**
 * 把最后一个可用的文本粘贴占位就地展开（内容过长时不展开），返回展开文本、ID 与光标位置。
 */
//@ chunk-s61vbvea.js:38980-39284 layout
function expandLastPaste(e, n) {
  let r = null;
  for (let h of parsePastedRefs(e)) {
    let y = n[h.id];
    if (y?.type !== "text" || y.unavailable) continue;
    if (!r || h.id > r.id) r = h;
  }
  if (!r) return null;
  let content = n[r.id].content;
  if (content.length > ert) return null;
  return {
    expanded: e.slice(0, r.index) + content + e.slice(r.index + r.match.length),
    id: r.id,
    cursorOffset: r.index + content.length,
  };
}
//@ chunk-s61vbvea.js:39284-39305 layout
var Zx = 200,
  eT = 262144;
/**
 * 从存储倒序分页读取输入历史记录（首页按条数、之后按字节），逐行产出；游标不前进时报错。
 */
//@ chunk-s61vbvea.js:39305-39871 layout
async function* readHistoryRecordsBackward(storage) {
  let fromSeq;
  for (;;) {
    let records = await storage.readRecords(STORAGE_SPACES.history(), {
      order: "backward",
      ...(fromSeq === void 0 ? { limit: Zx } : { maxBytes: eT, fromSeq: fromSeq }),
    });
    if (!records.ok) {
      if (records.error.code === "NotFound") return;
      throw Error("history readRecords failed", { cause: records.error });
    }
    for (let item of records.value.items) {
      let str = Buffer.from(item.data.buffer, item.data.byteOffset, item.data.byteLength).toString("utf8"),
        line = str.endsWith(`
`)
          ? str.slice(0, -1)
          : str;
      if (line) yield line;
    }
    let nextSeq = records.value.nextSeq;
    if (nextSeq === void 0) return;
    if (fromSeq !== void 0 && nextSeq >= fromSeq)
      throw Error("history readRecords cursor failed to advance", {
        cause: { fromSeq: fromSeq, nextSeq: nextSeq },
      });
    fromSeq = nextSeq;
  }
}
//@ chunk-s61vbvea.js:39871-40221 fingerprint = getTimestampedHistory (0.47)
var getTimestampedHistory_2 = DoctorLazy(() =>
  u({
    display: o(),
    pastedContents: pe(o(), oe())
      .catch({})
      .transform((e) =>
        Object.fromEntries(
          Object.entries(e).flatMap(([n, r]) => {
            let safeParse = Vx().safeParse(r);
            if (safeParse.success) return [[n, safeParse.data]];
            return (
              logForDebugging(
                `Dropping a malformed paste record from a history line (${formatZodIssues(safeParse.error)})`,
              ),
              []
            );
          }),
        ),
      ),
    timestamp: E(),
    project: o(),
    sessionId: o()
      .optional()
      .catch(void 0),
  }),
);
//@ chunk-s61vbvea.js:40221-40318 layout
function formatZodIssues(e) {
  return e.issues.map((issue) => `${issue.path.join(".") || "value"}: ${issue.message}`).join("; ");
}
/**
 * 解析 history.jsonl 一行并按 schema 校验，失败返回 parse_failed 或 shape_rejected。
 */
//@ chunk-s61vbvea.js:40318-40610 placement
function parseHistoryLine(e) {
  try {
    let n = jsonParseRaw(e),
      safeParse = getTimestampedHistory_2().safeParse(n);
    if (safeParse.success)
      return { entry: safeParse.data, droppedPasteRecords: hasDroppedPasteRecords(n, safeParse.data) };
    return (
      logForDebugging(`Skipping malformed history line (${formatZodIssues(safeParse.error)})`),
      { rejection: "shape_rejected" }
    );
  } catch (error) {
    return (logForDebugging(`Failed to parse history line: ${error}`), { rejection: "parse_failed" });
  }
}
//@ chunk-s61vbvea.js:40610-40854 placement
function hasDroppedPasteRecords(e, n) {
  if (typeof e !== "object" || e === null || !("pastedContents" in e)) return !1;
  let pastedContents = e.pastedContents;
  if (pastedContents === null) return !1;
  if (typeof pastedContents !== "object" || Array.isArray(pastedContents)) return !0;
  return Object.keys(pastedContents).length > Object.keys(n.pastedContents).length;
}
//@ chunk-s61vbvea.js:40854-40935 placement
function totalPastedLength(e) {
  return Object.values(e).reduce((n, r) => n + (r.content?.length ?? 0), 0);
}
//@ chunk-s61vbvea.js:40935-40959 placement
var MAX_EXPANDED_PASTE_CHARS = 32768,
  cT = 4194304;
//@ chunk-s61vbvea.js:40959-41098 placement
function expandHistoryDisplay(e, n) {
  let r = {};
  for (let [s, h] of Object.entries(n))
    r[Number(s)] =
      h.type === "text" ? { ...h, content: truncateToLength(h.content, MAX_EXPANDED_PASTE_CHARS) } : h;
  return rpe(e, r);
}
//@ chunk-s61vbvea.js:41098-41141 placement
var HISTORY_SCOPES = ["session", "project", "everywhere"];
//@ chunk-s61vbvea.js:41141-41342 placement
function isDuplicateOfLastEntry(e) {
  let { prev: prev, next: r, project: project, sessionId: sessionId } = e;
  if (!prev || prev.display !== r.display) return !1;
  if (prev.project !== project || prev.sessionId !== sessionId) return !1;
  return !(Object.keys(prev.pastedContents).length > 0) && !r.hasPastes;
}
/**
 * 输入历史存储：add 时去重（与上一条相同则跳过）、过滤敏感命令，超过 1024 字的粘贴存进 paste-cache 只记 hash；pendingEntries 加文件锁追加到 <配置目录>/history.jsonl（权限 0600），失败最多重试 5 次、退出时强制刷盘；读取时按 project/session 过滤，最多 100 条。CLAUDE_CODE_SKIP_PROMPT_HISTORY 关闭写入。
 */
//@ chunk-s61vbvea.js:41342-51397 placement
class PromptHistoryStore {
  getSensitiveCommands = null;
  pendingEntries = [];
  isWriting = !1;
  currentFlushPromise = null;
  exitFlushHandle = null;
  lastAddedEntry = null;
  lastStoredEntry = null;
  lastAssignedTimestamp = 0;
  storedEntryGeneration = 0;
  lastAddWasDeduped = !1;
  skippedKeys = new Set();
  pendingPasteWrites = new Set();
  pendingPasteContents = new Map();
  inFlightFlushEntries = null;
  reportedLostPasteHashes = new Set();
  clearedDrafts = [];
  immediateFlush = serializeCalls((e) => this.flushEntriesToDisk(e));
  async *readLogEntries(e) {
    let sliced = this.pendingEntries.slice(),
      r = new Set(sliced.map((R) => `${R.timestamp}\x00${R.sessionId ?? ""}`));
    for (let R = sliced.length - 1; R >= 0; R--) yield sliced[R];
    let s = join(getClaudeConfigDir(), "history.jsonl"),
      h = !1,
      y = !1,
      S = !1,
      w = !1;
    try {
      let R = e ? readHistoryRecordsBackward(e) : readLinesReverse(s, void 0, { strict: !1 });
      for await (let P of R) {
        let j = parseHistoryLine(P);
        if (!j.entry) {
          if (j.rejection === "parse_failed") h = !0;
          else y = !0;
          continue;
        }
        if (j.droppedPasteRecords) S = !0;
        let entry = j.entry,
          L = `${entry.timestamp}\x00${entry.sessionId ?? ""}`;
        if (this.skippedKeys.has(L) || r.has(L)) continue;
        ((w = !0), yield entry);
      }
      let x = h
        ? "history_load_parse_failed"
        : y
          ? "history_load_shape_rejected"
          : S
            ? "history_load_paste_record_dropped"
            : void 0;
      if (x)
        logFeatureSad("history_load", x, { parse_failed: h, shape_rejected: y, paste_record_dropped: S });
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
    let r = getProjectRoot(),
      s = getSessionId(),
      h = new Set(),
      y = 0;
    for await (let S of this.readLogEntries(n)) {
      if (e === "project" && S.project !== r) continue;
      if (e === "session" && S.sessionId !== s) continue;
      let w = getPromptHistoryKey(S.display, S.pastedContents);
      if (h.has(w)) continue;
      h.add(w);
      let R = {};
      if (y < cT)
        for (let [P, j] of Object.entries(S.pastedContents)) {
          let G = j.type === "text" ? await this.resolveStoredPastedContent(j, n) : null;
          if (G) R[Number(P)] = G;
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
    let r = getProjectRoot(),
      s = 0,
      h = 0;
    try {
      for await (let S of this.readLogEntries(n)) {
        if (S.project !== r) continue;
        if ((s++, !e || e(S.display))) h++;
        if (s >= MAX_HISTORY_ITEMS) break;
      }
    } catch {
      return null;
    }
    let y = getSessionId();
    for (let { entry: entry, project: project, sessionId: sessionId } of this.clearedDrafts)
      if (project === r && sessionId === y && (!e || e(entry.display))) h++;
    return h;
  }
  async *readForProject(e, { withClearedDrafts: n = !1 } = {}) {
    let r = getProjectRoot(),
      s = getSessionId(),
      h = [],
      y = 0,
      S = n
        ? this.clearedDrafts.filter(
            (clearedDraft) => clearedDraft.project === r && clearedDraft.sessionId === s,
          )
        : [],
      w = S.length - 1;
    for await (let R of this.readLogEntries(e)) {
      if (R.project !== r) continue;
      if (R.sessionId === s) {
        for (; w >= 0 && S[w].timestamp > R.timestamp; w--) yield S[w].entry;
        (yield await this.toHistoryEntry(R, e), y++);
      } else h.push(R);
      if (y + h.length >= MAX_HISTORY_ITEMS) break;
    }
    for (; w >= 0; w--) yield S[w].entry;
    for (let R of h) {
      if (y >= MAX_HISTORY_ITEMS) return;
      (yield await this.toHistoryEntry(R, e), y++);
    }
  }
  async resolveStoredPastedContent(e, n) {
    if (e.content)
      return { id: e.id, type: e.type, content: e.content, mediaType: e.mediaType, filename: e.filename };
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
    (this.reportedLostPasteHashes.add(n), logFeatureSad("paste_store", "paste_store_content_lost"));
  }
  async resolvePastedTextByHash(e, n) {
    return this.pendingPasteContents.get(e) ?? (await retrievePastedText(e, n));
  }
  registerPastedTextForRecall(e, n) {
    let r = hashPastedText(e);
    this.pendingPasteContents.set(r, e);
    let s = storePastedTextQueued(r, e, n);
    return (
      this.pendingPasteWrites.add(s),
      s.then(() => this.pendingPasteContents.delete(r)).finally(() => this.pendingPasteWrites.delete(s)),
      r
    );
  }
  async toHistoryEntry(e, n) {
    let r = {};
    for (let [s, h] of Object.entries(e.pastedContents)) {
      let storedPastedContent = await this.resolveStoredPastedContent(h, n);
      if (!storedPastedContent && h.type === "text") this.reportLostPasteContent(h.contentHash);
      r[Number(s)] = storedPastedContent ?? { id: h.id, type: h.type, content: "", unavailable: !0 };
    }
    return { display: e.display, pastedContents: r };
  }
  async flushEntriesToDisk(e) {
    if (this.pendingEntries.length === 0) return !0;
    let sliced = this.pendingEntries.slice();
    this.inFlightFlushEntries = new Set(sliced);
    while (this.pendingPasteWrites.size > 0) await Promise.all(this.pendingPasteWrites);
    if (e)
      try {
        let append = await e.append(
          STORAGE_SPACES.history(),
          sliced.map((y) => ({
            data:
              jsonStringify(y) +
              `
`,
          })),
        );
        if (!append.ok) {
          logForDebugging(`Failed to write prompt history: ${append.error.code}`);
          let y =
            "telemetryCode" in append.error &&
            (append.error.telemetryCode === "LockContended" ||
              append.error.telemetryCode === "LockAcquireFailed");
          return (
            logFeatureSad("history_save", y ? "history_save_lock_failed" : "history_save_write_failed"),
            !1
          );
        }
        let h = new Set(sliced);
        return (
          (this.pendingEntries = this.pendingEntries.filter((pendingEntry) => !h.has(pendingEntry))),
          logFeatureOk("history_save"),
          !0
        );
      } catch (error) {
        return (
          logForDebugging(`Failed to write prompt history: ${error}`),
          logFeatureSad("history_save", "history_save_write_failed"),
          !1
        );
      } finally {
        this.inFlightFlushEntries = null;
      }
    let r;
    try {
      let s = join(getClaudeConfigDir(), "history.jsonl");
      (await getFileReader().append(s, "", 384),
        (r = await lock(s, {
          ...xnt,
          onCompromised: (S) => logForDebugging(`History lock compromised: ${S}`, { level: "error" }),
        })));
      let mapped = sliced.map(
        (S) =>
          jsonStringify(S) +
          `
`,
      );
      await getFileReader().append(s, mapped.join(""), 384);
      let y = new Set(sliced);
      return (
        (this.pendingEntries = this.pendingEntries.filter((pendingEntry) => !y.has(pendingEntry))),
        logFeatureOk("history_save"),
        !0
      );
    } catch (error) {
      if ((logForDebugging(`Failed to write prompt history: ${error}`), r))
        logFeatureSad("history_save", "history_save_write_failed");
      else logFeatureSad("history_save", "history_save_lock_failed");
      return !1;
    } finally {
      if (((this.inFlightFlushEntries = null), r)) await r().catch(logError);
    }
  }
  async flushWithRetries(e, n) {
    if (this.isWriting || this.pendingEntries.length === 0) return;
    if (e > 5) return;
    this.isWriting = !0;
    let r = !1;
    try {
      r = await this.immediateFlush(n);
    } finally {
      if (((this.isWriting = !1), this.pendingEntries.length > 0))
        (await sleep(500), (this.currentFlushPromise = this.flushWithRetries(r ? 0 : e + 1, n)));
    }
  }
  async addEntry(e, n, r, s = !0) {
    let h = typeof e === "string" ? { display: e, pastedContents: {} } : e,
      { input: input, removed: removed } = Qx(h.display, h.pastedContents ?? {}),
      trimmed = input.trim();
    if (removed.length > 0 && trimmed === "") return;
    if (removed.length > 0 && h.display.trimStart().startsWith("!")) {
      if (s && r !== void 0 && r !== "bash") this.lastAddWasDeduped = !0;
      return;
    }
    if (removed.length > 0 && h.display.trimStart().startsWith("/")) return;
    if (removed.length > 0) {
      let trimStart = h.display.trimStart();
      if (
        (trimmed.startsWith("/") && !trimStart.startsWith("/")) ||
        (trimmed.startsWith("!") && !trimStart.startsWith("!")) ||
        (trimmed.startsWith("@") && !trimStart.startsWith("@"))
      ) {
        if (s) this.lastAddWasDeduped = !0;
        return;
      }
    }
    if (removed.length > 0) {
      let Q = new Map();
      for (let ae of parsePastedRefs(h.display)) Q.set(ae.id, (Q.get(ae.id) ?? 0) + 1);
      let Z = new Map();
      for (let ae of parsePastedRefs(input)) Z.set(ae.id, (Z.get(ae.id) ?? 0) + 1);
      let ee = !1;
      for (let [ae, se] of Z) {
        if (se <= (Q.get(ae) ?? 0)) continue;
        let re = h.pastedContents?.[ae];
        if (re !== void 0 && re.type !== "image" && !re.unavailable) {
          ee = !0;
          break;
        }
      }
      if (ee) {
        if (s) this.lastAddWasDeduped = !0;
        return;
      }
    }
    let R = removed.length > 0 ? { ...h, display: input } : h,
      x = getProjectRoot(),
      P = getSessionId(),
      j = getReferencedTextPastes(R.display, R.pastedContents);
    if (
      isDuplicateOfLastEntry({
        prev: this.lastStoredEntry,
        next: { display: R.display, hasPastes: j.length > 0 },
        project: x,
        sessionId: P,
      })
    ) {
      if (s) this.lastAddWasDeduped = !0;
      return;
    }
    let G = {};
    for (let [Q, Z] of j)
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
    let q = { ...R, pastedContents: G, timestamp: max, project: x, sessionId: P };
    if (
      (this.pendingEntries.push(q),
      (this.lastStoredEntry = q),
      this.storedEntryGeneration++,
      this.dropClearedDraftCopies(R, x, P),
      s)
    )
      ((this.lastAddedEntry = q), (this.lastAddWasDeduped = !1));
    ((this.currentFlushPromise = this.flushWithRetries(0, n)), this.currentFlushPromise);
  }
  async flushOnExit(e) {
    let n = null;
    while (this.currentFlushPromise && this.currentFlushPromise !== n)
      ((n = this.currentFlushPromise), await n);
    if (this.pendingEntries.length > 0) {
      if (!(await this.immediateFlush(e))) logFeatureBad("history_save", "history_save_exit_flush_failed");
    }
    while (this.pendingPasteWrites.size > 0) await Promise.all(this.pendingPasteWrites);
  }
  add(e, n, r) {
    if (isEnvTruthy(process.env.CLAUDE_CODE_SKIP_PROMPT_HISTORY) || isNestedInteractiveClaudeSession())
      return;
    if (this.isSensitive(typeof e === "string" ? { display: e, pastedContents: {} } : e)) {
      if (r?.armUndo !== !1) this.lastAddWasDeduped = !0;
      return;
    }
    (this.registerExitFlush(n), this.addEntry(e, n, r?.submitMode, r?.armUndo).catch(logError));
  }
  registerExitFlush(e) {
    if (this.exitFlushHandle) return;
    this.exitFlushHandle = registerCleanup(() => this.flushOnExit(e));
  }
  registerSensitiveCommands(e) {
    this.getSensitiveCommands = e;
  }
  keepClearedDraft(e, n) {
    let r = getProjectRoot(),
      s = getSessionId();
    if (
      this.isSensitive(e) ||
      !1 ||
      isDuplicateOfLastEntry({
        prev: this.lastStoredEntry,
        next: { display: e.display, hasPastes: Object.keys(e.pastedContents).length > 0 },
        project: r,
        sessionId: s,
      })
    )
      return;
    (this.dropClearedDraftCopies(e, r, s),
      this.clearedDrafts.push({
        entry: e,
        timestamp: n,
        project: r,
        sessionId: s,
        length: Object.values(e.pastedContents).reduce((y, S) => y + S.content.length, e.display.length),
      }));
    let reduced = this.clearedDrafts.reduce((y, S) => y + S.length, 0);
    while (this.clearedDrafts.length > MAX_CLEARED_DRAFTS || reduced > MAX_CLEARED_DRAFTS_CHARS)
      reduced -= this.clearedDrafts.shift().length;
    this.storedEntryGeneration++;
  }
  dropClearedDraftCopies({ display: e, pastedContents: n }, r, s) {
    if (this.clearedDrafts.length === 0) return;
    let h = getPromptHistoryKey(e, n);
    this.clearedDrafts = this.clearedDrafts.filter(
      (clearedDraft) =>
        clearedDraft.project !== r ||
        clearedDraft.sessionId !== s ||
        getPromptHistoryKey(clearedDraft.entry.display, clearedDraft.entry.pastedContents) !== h,
    );
  }
  isSensitive({ display: e, pastedContents: n }) {
    return shouldRedactInput(e, (this.getSensitiveCommands ?? getSensitiveCommandsRegistry().get)(), {
      pastedTexts: getReferencedTextPastes(e, n).map(([, r]) => r.content),
    });
  }
  getGeneration() {
    return this.storedEntryGeneration;
  }
  clearPending() {
    ((this.pendingEntries = []),
      (this.clearedDrafts = []),
      (this.lastAddedEntry = null),
      (this.lastStoredEntry = null),
      (this.lastAddWasDeduped = !1),
      (this.getSensitiveCommands = () => []),
      this.skippedKeys.clear(),
      this.pendingPasteContents.clear(),
      this.exitFlushHandle?.(),
      (this.exitFlushHandle = null));
  }
  disarmUndo() {
    ((this.lastAddedEntry = null), (this.lastAddWasDeduped = !1));
  }
  removeLast() {
    if (this.lastAddWasDeduped) {
      this.lastAddWasDeduped = !1;
      return;
    }
    if (!this.lastAddedEntry) return;
    let lastAddedEntry = this.lastAddedEntry;
    if (((this.lastAddedEntry = null), this.lastStoredEntry === lastAddedEntry)) this.lastStoredEntry = null;
    this.storedEntryGeneration++;
    let index = this.pendingEntries.lastIndexOf(lastAddedEntry);
    if (index !== -1) {
      if ((this.pendingEntries.splice(index, 1), this.inFlightFlushEntries?.has(lastAddedEntry)))
        this.skippedKeys.add(`${lastAddedEntry.timestamp}\x00${lastAddedEntry.sessionId ?? ""}`);
    } else this.skippedKeys.add(`${lastAddedEntry.timestamp}\x00${lastAddedEntry.sessionId ?? ""}`);
  }
}
//@ chunk-s61vbvea.js:51397-51422 placement
var promptHistoryByHost = new HostScoped(() => new PromptHistoryStore());
/**
 * 取当前宿主的输入历史存储（PromptHistoryStore）。
 */
//@ chunk-s61vbvea.js:51422-51459 placement
function getPromptHistory() {
  return promptHistoryByHost.of(getRootSession().host);
}
//@ chunk-s61vbvea.js:51459-51479 placement
class SensitiveCommandsRegistry {
  get = () => [];
}
//@ chunk-s61vbvea.js:51479-51504 placement
var fT = new HostScoped(() => new SensitiveCommandsRegistry());
//@ chunk-s61vbvea.js:51504-51541 placement
function getSensitiveCommandsRegistry() {
  return fT.of(getRootSession().host);
}
//@ chunk-s61vbvea.js:51541-51584 placement
function getHistory(e) {
  return getPromptHistory().readEntries(e);
}
//@ chunk-s61vbvea.js:51584-51782 placement
function isTransientHistoryReadError(e) {
  if (e instanceof FileChangedDuringReadError) return !0;
  let n = e instanceof Error ? e.cause : void 0;
  if (isStoreError(n) && n.code === "Unavailable" && errnoShapedCode(n.telemetryCode) === void 0) return !0;
  let r = getErrnoCode(e) ?? storageCauseErrnoCode(e);
  return isSadFsErrnoCode(r) || isEnvFsErrnoCode(r);
}
//@ chunk-s61vbvea.js:51782-51843 placement
function getTimestampedHistory(e = "project", n) {
  return getPromptHistory().readTimestamped(e, n);
}
//@ chunk-s61vbvea.js:51843-51894 placement
function countHistoryForProject(e, n) {
  return getPromptHistory().countForProject(e, n);
}
//@ chunk-s61vbvea.js:51894-51944 placement
function g4r(e, n) {
  return getPromptHistory().readForProject(e, n);
}
//@ chunk-s61vbvea.js:51944-51980 placement
function ySe(e, n, r) {
  getPromptHistory().add(e, n, r);
}
/**
 * 把提交的提示逐条写入历史（含筛查与未回答状态），全都没写入时按需撤销撤回状态。
 */
//@ chunk-s61vbvea.js:51980-52256 placement
function recordSubmittedPrompts(e, n, r) {
  let s = !1;
  for (let h of e)
    try {
      let y = getHistoryEntryForCommand(h, r.placed, {
        screened: r.screened?.get(h),
        unanswered: r.unanswered ?? "skipped",
      });
      if (!y) continue;
      ((s = !0), ySe(y, n, { submitMode: h.mode, armUndo: r.armUndo }));
    } catch (error) {
      logError(error);
    }
  if (!s && r.armUndo !== !1 && r.screened === void 0) getPromptHistory().disarmUndo();
}
//@ chunk-s61vbvea.js:52256-52311 placement
function Dvt(e, n, r) {
  ySe(e, n, { submitMode: r, armUndo: !1 });
}
//@ chunk-s61vbvea.js:52311-52353 placement
function Aei(e) {
  getPromptHistory().registerExitFlush(e);
}
//@ chunk-s61vbvea.js:52353-52380 placement
function Cei(e) {
  getSensitiveCommandsRegistry().get = e;
}
//@ chunk-s61vbvea.js:52380-52425 placement
function Rei(e, n) {
  getPromptHistory().keepClearedDraft(e, n);
}
//@ chunk-s61vbvea.js:52425-52468 placement
function Aer() {
  return getPromptHistory().getGeneration();
}
//@ chunk-s61vbvea.js:52468-52501 placement
function xei() {
  getPromptHistory().removeLast();
}
//@ chunk-e6aww6q8.js:191405-191531 placement
function groupByToObject(e, n) {
  let create = Object.create(null),
    s = 0;
  for (let h of e) {
    let y = n(h, s++);
    if (create[y] === void 0) create[y] = [];
    create[y].push(h);
  }
  return create;
}
//@ chunk-e6aww6q8.js:191531-191550 placement
var KEt = 2147483648;
/**
 * 粘贴占位编号分配器：跳过转录与承载者中已用的编号，按会话纪元记录本纪元分配过的编号。
 */
//@ chunk-e6aww6q8.js:191550-192112 placement
class PasteIdAllocator {
  next = 1;
  minted = new Set();
  flooredSessionId = null;
  carrierProviders = new Set();
  registerCarrier(e) {
    return (
      this.carrierProviders.add(e),
      () => {
        this.carrierProviders.delete(e);
      }
    );
  }
  advancePast(e) {
    if (n_n(e) && e < KEt && e >= this.next) this.next = e + 1;
  }
  advancePastText(e) {
    for (let n of parsePastedRefs(e)) this.advancePast(n.id);
  }
  startEpoch(e) {
    ((this.minted = new Set()), (this.flooredSessionId = e));
  }
  mint() {
    for (let carrierProvider of this.carrierProviders)
      for (let r of carrierProvider()) this.advancePastText(r);
    if (!n_n(this.next)) this.next = KEt;
    let e = this.next++;
    return (this.minted.add(e), e);
  }
  wasMintedThisEpoch(e) {
    return this.minted.has(e);
  }
}
//@ chunk-e6aww6q8.js:192112-192140 placement
var pdo = new SessionRootSlot(() => new PasteIdAllocator());
//@ chunk-e6aww6q8.js:192140-192173 placement
function h9() {
  return pdo.of(getRootSession());
}
//@ chunk-e6aww6q8.js:192173-192219 placement
function zZ(e) {
  return h9().registerCarrier(e);
}
/**
 * 从会话消息（用户消息、图片粘贴 ID、排队命令）中推进粘贴编号，再开始新纪元。
 */
//@ chunk-e6aww6q8.js:192219-192938 placement
function primePasteIdsFromMessages(messages) {
  let allocator = h9();
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
function HXn(e) {
  h9().advancePast(e);
}
//@ chunk-e6aww6q8.js:192974-193012 placement
function ZR(e, n) {
  return mintPasteId(h9(), e, n);
}
//@ chunk-e6aww6q8.js:193012-193132 placement
function mintPasteId(e, n, r) {
  if (n) e.advancePastText(n);
  if (r) for (let s of Object.keys(r)) e.advancePast(Number(s));
  return e.mint();
}
//@ chunk-e6aww6q8.js:193132-193311 placement
function isPasteRefOfType(e, n) {
  switch (n) {
    case "text":
      return (
        e.startsWith("[Pasted text") ||
        e.startsWith("[...Truncated text") ||
        e.startsWith(`[${TEAM_SETUP_GUIDE_LABEL}`)
      );
    case "image":
      return e.startsWith("[Image");
  }
}
//@ chunk-e6aww6q8.js:193311-193524 placement
function expandPastedTextRefs_2(e, n, r, s) {
  let filtered = parsePastedRefs(e).filter((S) => S.id === n && isPasteRefOfType(S.match, s)),
    expanded = e;
  for (let S = filtered.length - 1; S >= 0; S--) {
    let w = filtered[S];
    expanded =
      expanded.slice(0, w.index) +
      w.match.replace(`#${n}`, `#${r}`) +
      expanded.slice(w.index + w.match.length);
  }
  return expanded;
}
/**
 * 把历史条目里的粘贴编号重新分配为本会话不冲突的新编号，同时更新显示文本中的占位（本纪元已分配的可跳过）。
 */
//@ chunk-e6aww6q8.js:193524-193960 placement
function renumberPastedContents({
  display: display,
  pastedContents: pastedContents,
  allowCurrentEpochSkip: allowCurrentEpochSkip = !1,
}) {
  let s = h9(),
    h = allowCurrentEpochSkip && s.flooredSessionId === getSessionId(),
    entries = Object.entries(pastedContents),
    S = [],
    w = {};
  for (let [G, q] of entries) {
    let Z = Number(G);
    if (!n_n(Z) || (h && s.wasMintedThisEpoch(Z))) {
      w[Z] = q;
      continue;
    }
    S.push([Z, q]);
  }
  if (S.length === 0) return { display: display, pastedContents: pastedContents };
  let L = display;
  S.sort((G, q) => G[0] - q[0]);
  for (let [G, q] of S) {
    let Z = mintPasteId(s, L, pastedContents);
    ((L = expandPastedTextRefs_2(L, G, Z, q.type)), (w[Z] = { ...q, id: Z }));
  }
  return { display: L, pastedContents: w };
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
/**
 * 把短小的粘贴块（不超过限定行数）展开回文本，其余保留为粘贴引用。
 */
//@ chunk-ha3km179.js:52979-53402 placement
function collapseSmallPastedBlocks(e, n = v0e()) {
  let r = splitPastedContentBlocks(e);
  if (!r.some((y) => y.kind === "block" && y.id === n)) return { text: e, pastedContents: {} };
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
    let y = getShortPastePieces(
      rebuildPastedContents(r, n, s, () => {
        return;
      }),
    );
    if (y.length === 0) break;
    for (let S of y) s.delete(S);
  }
  let h = rebuildPastedContents(r, n, s, (y, S) => ({ id: ZR(e, S), type: "text", content: y }));
  return { text: h.text, pastedContents: h.entries };
}
/**
 * 按块重建提示文本与 pastedContents 映射。
 */
//@ chunk-ha3km179.js:53402-53931 placement
function rebuildPastedContents(e, n, r, s) {
  let h = {},
    y = [],
    S = [],
    M = "";
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
      let Q = createInlineTextTag(T.body, h, o9n);
      if (Q) {
        h[Q.id] = Q;
        let L = M.length + T.body.length - T.body.trimStart().length;
        S.push({ piece: R, from: L, to: L + Q.content.length });
      }
      M += T.body;
      let D = e[R + 1];
      if (D !== void 0 && (D.kind === "block" || !q_s(D.text)))
        M += `
`;
      continue;
    }
    let w = M.length,
      P = s(T.body, h);
    if (P) ((h[P.id] = P), (M += formatPastedTextRef(P.id, getPastedTextRefNumLines(T.body))));
    y.push({ from: w, to: M.length });
  }
  return { text: M, entries: h, pills: y, shortPastes: S };
}
//@ chunk-ha3km179.js:53931-54196 placement
function getShortPastePieces(e) {
  let n = getInlinePasteTexts(e.entries),
    r = [],
    s = 0;
  for (let h of [...e.pills, void 0]) {
    let y = h?.from ?? e.text.length,
      S = findHistoryCopySpans(e.text.slice(s, y), n);
    for (let shortPaste of e.shortPastes)
      if (
        shortPaste.from >= s &&
        shortPaste.to <= y &&
        !S.some((R) => R.from + s <= shortPaste.from && shortPaste.to <= R.to + s)
      )
        r.push(shortPaste.piece);
    s = h?.to ?? s;
  }
  return r;
}
//@ chunk-ha3km179.js:54196-54258 placement
function rSo(e) {
  return isVirtualPancakeEnabled() ? collapseSmallPastedBlocks(e) : { text: e, pastedContents: {} };
}
//@ chunk-ha3km179.js:54258-54310 fingerprint = logEntryToHistoryEntry (1)
var logEntryToHistoryEntry = (e, n, r) => ({ ...e, display: n, pastedContents: r });
//@ chunk-0eyv3mzk.js:584-632 affinity
var URL_HOST_PATTERN = /https?:\/\/([^\s/?#'"`<>\\)\];&|(,]+)/gi;
//@ chunk-0eyv3mzk.js:632-839 fingerprint = parseReferences (0.696)
function parseReferences(input) {
  if (!input) return [];
  let s = [];
  for (let e of input.matchAll(URL_HOST_PATTERN)) {
    let lower = e[1].toLowerCase(),
      index = lower.lastIndexOf("@");
    if (index !== -1) lower = lower.slice(index + 1);
    let index_2 = lower.indexOf(":");
    if (index_2 !== -1) lower = lower.slice(0, index_2);
    if (lower) s.push(lower);
  }
  return s;
}
//@ chunk-2njac0sx.js:812-935 placement
var SKILL_WATCH_DEBOUNCE_MS = 1000,
  SKILL_WATCH_MIN_MS = 500,
  SKILL_WATCH_SETTLE_MS = 300,
  SKILL_WATCH_POLL_MS = 2000,
  SKILL_WATCH_IDLE_MS = 30000,
  SKILL_WATCH_MAX_IDLE_MS = 60000,
  SKILL_WATCHER_IDLE_WAKE_TAG = "<skill-watcher-idle-wake>",
  SKILL_WATCH_RETRY_MS = 5000,
  SKILL_WATCH_TIMEOUT_MS = 600000,
  SKILL_WATCH_MAX_WAIT_MS = 40000,
  SKILL_WATCH_BACKOFF_MS = 2000,
  SKILL_WATCH_ENABLED = !0;
//@ chunk-2njac0sx.js:935-1112 callgraph-fingerprint = addToPromptHistory (0.208)
async function collectPromptCommandHashes(command) {
  let u = await getSkillDirCommandsCached(getProjectRoot(), command),
    i = getOriginalCwd(),
    entry = i !== getProjectRoot() ? await getSkillDirCommandsCached(i, command) : [],
    p = new Map();
  for (let k of [...u, ...entry]) p.set(k.name, k.type === "prompt" ? (k.contentHash ?? "") : "");
  return p;
}
//@ chunk-5f8vf2zr.js:28166-28267 fingerprint = makeLogEntryReader (0.56)
async function dirHasHistoryFile(i) {
  try {
    return (await readdir(i)).some((o) => isOwnTempName(o, "history.jsonl") || eie(o));
  } catch {
    return !1;
  }
}
//@ chunk-8t8n4kdh.js:174068-174129 fingerprint = addToHistory (1)
function addToHistory_2() {
  return isSessionPersistenceDisabled() || env.CLAUDE_CODE_SKIP_PROMPT_HISTORY;
}
//@ chunk-ez320trn.js:7416-7526 fingerprint = getHistory (0.7)
async function getHistory_2(e, t, n) {
  let [o, r] = await Promise.all([
    readPublishedReadme(e, README_MD, !1, t, n),
    readPublishedReadme(e, PROJECT_README_MD, !0, t, n),
  ]);
  return { root: o, project: r };
}

export {
  ZR,
  formatImageRef,
  primePasteIdsFromMessages,
  HXn,
  getPastedTextRefNumLines,
  formatPastedTextRef,
  rpe,
  parseReferences,
  zZ,
  groupByToObject,
  parsePastedRefs,
  n_n,
  expandPastedTextRefs_2,
  ySe,
  recordSubmittedPrompts,
  getLaunchMessagesOutsidePastes,
  expandTruncatedPastes,
  nfcVariants,
  expandLastPaste,
  ert,
  Ter,
  getTypedPasteContents,
  getInlinePasteTexts,
  buildUnavailablePasteError,
  describeRemovedPastes,
  rSo,
  renumberPastedContents,
  Rei,
  isTransientHistoryReadError,
  getHistory,
  expandHistoryDisplay,
  getPromptHistoryKey,
  g4r,
  getTimestampedHistory,
  HISTORY_SCOPES,
  addToHistory_2,
  collapseSmallPastedBlocks,
  Aer,
  countHistoryForProject,
  Dvt,
  flushPromptHistory,
  xei,
  Aei,
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
  Cei,
  findInlinePasteRanges,
  getHistory_2,
  logEntryToHistoryEntry,
};
