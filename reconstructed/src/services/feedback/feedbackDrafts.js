/**
 * services/feedback/feedbackDrafts.ts
 *
 * 2.1.316 新增：列出排队/过期的反馈草稿；反馈草稿 schema等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-kxyd0g16.js (55)
 * attribution: placement 55
 */
import { join, join as join_2, basename, dirname } from "path";
import { randomUUID } from "crypto";
import { MemoryListTool } from "../../tools/MemoryTool/MemoryListTool.js";
import { MemoryReadTool } from "../../tools/MemoryReadTool/MemoryReadTool.js";
import { MemoryWriteTool } from "../../tools/MemoryTool/memoryWrite.js";
import { getDynamicConfig_CACHED_MAY_BE_STALE } from "../analytics/growthbook.js";
import { replaceControlChars } from "../../utils/resultError.js";
import { stripCombiningRepeated } from "../../utils/sanitization.js";
import { truncateUtf8Bytes } from "../../utils/stringUtils.js";
import { isSessionsToken } from "../oauth/sessionsBearerHooks.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, zJt, o, A, U, E, xE } from "../../../vendor/zod/v4/classic/schemas.js";
import { getClaudeConfigDir } from "../../utils/envUtils.js";
import { STORAGE_SPACES, isValidKeySegment } from "../../utils/storage/storageSpaces.js";
import { readAllPages } from "../../utils/pagedRead.js";
import { logForDebugging } from "../../utils/debug.js";
import {
  isFsInaccessibleCode,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  isFsInaccessible,
  isENOENT,
} from "../../utils/errors.js";
import { slowLogging, jsonParseRaw, jsonStringify } from "../../utils/slowOperations.js";
import { isDiskless } from "../../bootstrap/state.js";
import { warnDisklessSettingsWrite } from "../../utils/settings/settingsStorage.js";
import { getFileReader } from "../../utils/fileStore.js";
import { logEvent } from "../analytics/index.js";
import { fromEnum, fromNumber } from "../analytics/safeMetadata.js";
import { validateStorageKey } from "../../utils/storage/storageKeys.js";
import { count } from "../../utils/collections.js";
import { uiSignals } from "../../state/uiSignals.js";

//@ chunk-kxyd0g16.js:67217-67237 placement
var xo = [MemoryListTool, MemoryReadTool, MemoryWriteTool];
//@ chunk-kxyd0g16.js:67237-67264 placement
var Ms = 10,
  Ns = 3,
  Fs = 50,
  Bs = 20;
//@ chunk-kxyd0g16.js:67264-67321 placement
function Ie() {
  return getDynamicConfig_CACHED_MAY_BE_STALE("tengu_juniper_relay_config", {});
}
//@ chunk-kxyd0g16.js:67321-67406 placement
function Po(e, r, n, s) {
  return typeof e === "number" && Number.isInteger(e) && e >= n && e <= s ? e : r;
}
//@ chunk-kxyd0g16.js:67406-67467 placement
function Ge() {
  return Po(Ie().maxToolCallsPerSession, Ms, 1, Fs);
}
//@ chunk-kxyd0g16.js:67467-67531 placement
function zo() {
  return Po(Ie().maxDraftPromptsPerSession, Ns, 0, Bs);
}
/**
 * 反馈草稿限制：队列上限、保留天数与毫秒、详情字节上限、标题长度、转录尾部字节上限、request_id 数、模型名/版本/OS/cwd/area 长度上限。
 */
//@ chunk-kxyd0g16.js:67626-67726 placement
var MAX_QUEUED_DRAFTS = 10,
  DRAFT_RETENTION_DAYS = 30,
  DRAFT_RETENTION_MS = DRAFT_RETENTION_DAYS * 24 * 60 * 60 * 1000,
  MAX_DETAILS_LENGTH = 10240,
  MAX_TITLE_LENGTH = 200,
  MAX_TRANSCRIPT_TAIL_BYTES = 32768,
  MAX_REQUEST_IDS = 5,
  MAX_MODEL_LENGTH = 64,
  MAX_CLI_VERSION_LENGTH = 32,
  MAX_OS_LENGTH = 64,
  MAX_CWD_LENGTH = 512,
  MAX_AREA_LENGTH = 64;
//@ chunk-kxyd0g16.js:67726-67766 placement
function _on(e) {
  return ke(replaceControlChars(stripCombiningRepeated(e)), MAX_TITLE_LENGTH);
}
//@ chunk-kxyd0g16.js:67766-67861 placement
function gIr(e) {
  return truncateUtf8Bytes(
    stripCombiningRepeated(e)
      .replace(
        /\r\n/g,
        `
`,
      )
      .split(
        `
`,
      )
      .map((r) => replaceControlChars(r)).join(`
`),
    MAX_DETAILS_LENGTH,
  );
}
//@ chunk-kxyd0g16.js:67861-67909 placement
function mLe(e, r) {
  return ke(replaceControlChars(stripCombiningRepeated(e)).trim(), r);
}
//@ chunk-kxyd0g16.js:67909-67941 placement
var Ys = /[^A-Za-z0-9.:_/@[\]-]/g;
//@ chunk-kxyd0g16.js:67941-67988 placement
function hIr(e) {
  return ke(e.replace(Ys, ""), MAX_MODEL_LENGTH);
}
//@ chunk-kxyd0g16.js:67988-68064 placement
function yIr(e) {
  if (e === void 0) return;
  let r = mLe(e, MAX_AREA_LENGTH);
  return r === "" ? void 0 : r;
}
/**
 * 取最近的条目。
 */
//@ chunk-kxyd0g16.js:68064-68111 placement
function recentEntries(e) {
  return e.filter(isSessionsToken).slice(-MAX_REQUEST_IDS);
}
/**
 * 反馈类型与分类枚举。
 */
//@ chunk-kxyd0g16.js:68111-68645 placement
var FEEDBACK_TYPES = ["bug", "idea", "missing_capability"],
  Xs = ["tool_error", "user_frustration", "missing_capability", "model_judgment", "exit_nudge"],
  bon = [
    "instruction_following",
    "destructive_actions",
    "code_quality",
    "repetition_and_looping",
    "model_regression",
    "overconfidence_and_hallucination",
    "context_and_memory",
    "overeager",
    "over_correction",
    "stopping_short",
    "dispute_or_decline",
    "subagent_overspawn",
    "tone_or_preachiness",
    "excessive_questions",
    "unwanted_scope",
    "other",
  ],
  Son = ["code_edit", "debug", "explain", "plan", "shell", "search", "review", "other"];
//@ chunk-kxyd0g16.js:68645-68705 placement
function HLs(e) {
  return e !== void 0 && bon.includes(e) ? e : void 0;
}
//@ chunk-kxyd0g16.js:68705-68765 placement
function NLs(e) {
  return e !== void 0 && Son.includes(e) ? e : void 0;
}
//@ chunk-kxyd0g16.js:68765-68806 placement
var No = ["adaptive", "enabled", "disabled"];
//@ chunk-kxyd0g16.js:68806-68865 placement
function $Ls(e) {
  return e !== void 0 && No.includes(e) ? e : void 0;
}
//@ chunk-kxyd0g16.js:68865-68875 placement
var Qs = 16;
//@ chunk-kxyd0g16.js:68875-68951 placement
function _Ir(e) {
  if (e === void 0) return;
  let r = mLe(e, Qs);
  return r === "" ? void 0 : r;
}
//@ chunk-kxyd0g16.js:68951-68962 placement
var Zs = 1e6;
//@ chunk-kxyd0g16.js:68962-69039 placement
function Oye(e) {
  return e !== void 0 && Number.isInteger(e) && e >= 0 && e <= Zs ? e : void 0;
}
/**
 * 反馈草稿 schema。
 */
//@ chunk-kxyd0g16.js:69039-70198 placement
var FeedbackDraftSchema = DoctorLazy(() =>
  u({
    draft_id: zJt(),
    created_at: o()
      .refine((e) => Number.isFinite(Date.parse(e)))
      .transform((e) => new Date(Date.parse(e)).toISOString()),
    source_session_id: o().regex(SESSION_ID_RE),
    cwd: o().transform((e) => mLe(e, MAX_CWD_LENGTH)),
    model: o().transform((e) => hIr(e)),
    cli_version: o().transform((e) => mLe(e, MAX_CLI_VERSION_LENGTH)),
    os: o().transform((e) => mLe(e, MAX_OS_LENGTH)),
    request_ids: A(o()).transform((e) => recentEntries(e)),
    type: U(FEEDBACK_TYPES),
    title: o()
      .min(1)
      .transform((e) => _on(e)),
    details: o().transform((e) => gIr(e)),
    area: o()
      .optional()
      .transform((e) => yIr(e)),
    trigger: U(Xs),
    failure_mode: U(bon)
      .optional()
      .catch(void 0),
    task_category: U(Son)
      .optional()
      .catch(void 0),
    effort: o()
      .optional()
      .catch(void 0)
      .transform(_Ir),
    thinking_type: U(No)
      .optional()
      .catch(void 0),
    thinking_budget: E()
      .optional()
      .catch(void 0)
      .transform(Oye),
    message_count: E()
      .optional()
      .catch(void 0)
      .transform(Oye),
    assistant_turn_count: E()
      .optional()
      .catch(void 0)
      .transform(Oye),
    subagent_count: E()
      .optional()
      .catch(void 0)
      .transform(Oye),
    transcript_ref: u({
      session_file: o(),
      message_range: xE([E(), E()]).nullable(),
      project_dir_key: o()
        .optional()
        .transform((e) => (e !== void 0 && PROJECT_DIR_KEY_RE.test(e) ? e : void 0)),
    }).nullable(),
    status: U(["queued", "submitted", "discarded", "expired"]),
  }),
);
//@ chunk-kxyd0g16.js:70198-70248 placement
function Ye() {
  return join_2(getClaudeConfigDir(), "feedback", "drafts");
}
//@ chunk-kxyd0g16.js:70248-70390 placement
var DRAFT_ID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/,
  SESSION_ID_RE = /^[A-Za-z0-9_-]{1,128}$/,
  PROJECT_DIR_KEY_RE = /^[A-Za-z0-9-]{1,255}$/;
//@ chunk-kxyd0g16.js:70390-70489 placement
function $o(e) {
  if (!DRAFT_ID_RE.test(e)) throw Error("invalid feedback draft id");
  return join_2(Ye(), `${e}.json`);
}
//@ chunk-kxyd0g16.js:70489-70587 placement
function Bo(e) {
  if (!DRAFT_ID_RE.test(e)) throw Error("invalid feedback draft id");
  return STORAGE_SPACES.feedbackDraft(e);
}
//@ chunk-kxyd0g16.js:70587-70651 placement
function vt(e) {
  return "telemetryCode" in e ? e.telemetryCode : void 0;
}
//@ chunk-kxyd0g16.js:70651-70720 placement
function Xe(e) {
  let r = vt(e);
  return r === void 0 ? e.code : `${e.code} ${r}`;
}
/**
 * 列出存储中的反馈草稿键。
 */
//@ chunk-kxyd0g16.js:70720-71303 placement
async function listFeedbackDraftKeys(e) {
  let r = [],
    n = await readAllPages(
      (s) => e.listEntries({ namespace: "feedbackDraft" }, { cursor: s, skipKeyStats: !0 }),
      (s) => {
        for (let f of s) if (f.kind === "key" && f.key.namespace === "feedbackDraft") r.push(f.key);
      },
    );
  if (n.status === "done") return r;
  if (n.status === "capped")
    return (
      logForDebugging(
        "feedbackDrafts: draft listing kept offering cursors past the page cap; treating it as failed",
        { level: "error" },
      ),
      null
    );
  if (isFsInaccessibleCode(vt(n.error)))
    return (
      logForDebugging(`feedbackDrafts: draft listing failed: ${Xe(n.error)}`, { level: "error" }),
      null
    );
  throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
    `feedback draft listing failed: ${Xe(n.error)}`,
    "feedback draft listing failed",
  );
}
//@ chunk-kxyd0g16.js:71303-71312 placement
var Do = 8;
/**
 * 创建转录尾部读取器。
 */
//@ chunk-kxyd0g16.js:71312-71759 placement
function createTranscriptTailReader(e, r, n) {
  let s = (k) => (k.found ? Buffer.from(k.value) : null),
    f = async (k) => {
      try {
        let read = await e.read([{ key: k, tail: n }]);
        return read.ok ? s(read.value.items[0]) : null;
      } catch {
        return null;
      }
    },
    h = -1,
    y = [];
  return async (k) => {
    let w = k - (k % Do);
    if (w !== h) {
      let sliced = r.slice(w, w + Do),
        R = await e.read(sliced.map((I) => ({ key: I, tail: n }))).catch(() => {
          return;
        });
      if (((y = []), R?.ok && R.value.items.length === sliced.length)) y = R.value.items.map(s);
      else for (let I of sliced) y.push(await f(I));
      h = w;
    }
    return y[k - w] ?? null;
  };
}
/**
 * 定位草稿对应的转录。
 */
//@ chunk-kxyd0g16.js:71759-72280 placement
async function resolveDraftTranscript(e) {
  if (!e.transcript_ref) return null;
  if (!SESSION_ID_RE.test(e.source_session_id)) return null;
  let { getSessionId: getSessionId } = await import("./chunk-nj7t53r7.js");
  if (e.source_session_id === getSessionId()) {
    let { getTranscriptPathForSession: getTranscriptPathForSession } = await import("./chunk-hs5khexj.js");
    return getTranscriptPathForSession(e.source_session_id);
  }
  let { getProjectDir: getProjectDir, getProjectsDir: getProjectsDir } = await import("./chunk-m7ezatv1.js"),
    project_dir_key = e.transcript_ref.project_dir_key;
  if (project_dir_key !== void 0 && PROJECT_DIR_KEY_RE.test(project_dir_key))
    return join_2(getProjectsDir(), project_dir_key, `${e.source_session_id}.jsonl`);
  return join_2(getProjectDir(e.cwd), `${e.source_session_id}.jsonl`);
}
//@ chunk-kxyd0g16.js:72280-72294 placement
var Lo = 262144;
/**
 * 检查转录内容是否能佐证反馈草稿（逐行解析 JSONL 查找对应记录）。
 */
//@ chunk-kxyd0g16.js:72294-72587 placement
function transcriptCorroboratesDraft(e, r) {
  using n = slowLogging`transcriptContentCorroboratesDraft(${e.length})`;
  for (let s of e.split(`
`)) {
    if (!s) continue;
    let f;
    try {
      f = jsonParseRaw(s);
    } catch {
      continue;
    }
    if (typeof f !== "object" || f === null) continue;
    if ("sessionId" in f && "cwd" in f && f.sessionId === r.source_session_id && f.cwd === r.cwd) return !0;
  }
  return !1;
}
//@ chunk-kxyd0g16.js:72587-72667 placement
function ke(e, r) {
  let list = Array.from(e);
  return list.length <= r ? e : list.slice(0, r).join("");
}
/**
 * 生成反馈草稿对象。
 */
//@ chunk-kxyd0g16.js:72667-73413 placement
function createFeedbackDraft(e, r = new Date()) {
  let n = e.transcriptFile ? oi(e.transcriptFile) : void 0;
  return {
    draft_id: randomUUID(),
    created_at: r.toISOString(),
    source_session_id: e.sessionId,
    cwd: mLe(e.cwd, MAX_CWD_LENGTH),
    model: hIr(e.model),
    cli_version: mLe(e.cliVersion, MAX_CLI_VERSION_LENGTH),
    os: mLe(e.os, MAX_OS_LENGTH),
    request_ids: recentEntries(e.requestIds),
    type: e.type,
    title: _on(e.title),
    details: gIr(e.details),
    area: yIr(e.area),
    failure_mode: e.failureMode,
    task_category: e.taskCategory,
    trigger: e.trigger,
    effort: _Ir(e.effort),
    thinking_type: e.thinkingType,
    thinking_budget: Oye(e.thinkingBudget),
    message_count: Oye(e.messageCount),
    assistant_turn_count: Oye(e.assistantTurnCount),
    subagent_count: Oye(e.subagentCount),
    transcript_ref: e.transcriptFile
      ? { session_file: e.transcriptFile, message_range: null, project_dir_key: n }
      : null,
    status: "queued",
  };
}
//@ chunk-kxyd0g16.js:73413-73471 placement
function oi(e) {
  let r = basename(dirname(e));
  return PROJECT_DIR_KEY_RE.test(r) ? r : void 0;
}
/**
 * 保存反馈草稿（大小上限）。
 */
//@ chunk-kxyd0g16.js:73471-74630 placement
async function saveFeedbackDraft(e, r = new Date(), n) {
  let s = jsonStringify(e, null, 2);
  if (s === void 0 || Buffer.byteLength(s, "utf8") > MAX_TRANSCRIPT_TAIL_BYTES)
    return { success: !1, reason: "too_large" };
  if (n) {
    let h;
    try {
      h = await n.write(Bo(e.draft_id), s, { mode: 384 });
    } catch (error) {
      return (
        logForDebugging(
          `feedbackDrafts: draft write failed: ${error instanceof Error ? error.name : "unknown"}`,
          { level: "error" },
        ),
        { success: !1, reason: "write_failed" }
      );
    }
    if (!h.ok)
      return (
        logForDebugging(`feedbackDrafts: draft write failed: ${Xe(h.error)}`, { level: "error" }),
        { success: !1, reason: "write_failed" }
      );
  } else {
    if (isDiskless())
      return (
        warnDisklessSettingsWrite("feedback_draft", "feedback/drafts"),
        { success: !1, reason: "write_failed" }
      );
    let h = getFileReader();
    try {
      (await h.mkdir(Ye()), await h.atomicWrite($o(e.draft_id), s, 384));
    } catch (error) {
      return (
        logForDebugging(
          `feedbackDrafts: draft write failed: ${error instanceof Error ? error.name : "unknown"}`,
          { level: "error" },
        ),
        { success: !1, reason: "write_failed" }
      );
    }
  }
  let f = [];
  try {
    let { queued: queued } = await listFeedbackDrafts({ now: r, skipTranscriptCheck: !0 }, n);
    if (queued.length > MAX_QUEUED_DRAFTS) {
      let sorted = queued.slice().sort((k, w) => k.created_at.localeCompare(w.created_at));
      for (let k of sorted.slice(0, queued.length - MAX_QUEUED_DRAFTS))
        (await deleteFeedbackDraft(k.draft_id, n), f.push(k));
    }
  } catch (error) {
    logForDebugging(
      `feedbackDrafts: eviction sweep failed: ${error instanceof Error ? error.name : "unknown"}`,
      { level: "error" },
    );
  }
  return { success: !0, draft: e, evicted: f };
}
/**
 * 列出排队/过期的反馈草稿。
 */
//@ chunk-kxyd0g16.js:74630-76006 placement
async function listFeedbackDrafts(e, r) {
  let n = e?.now ?? new Date(),
    s = e?.lightweight === !0,
    f = s || e?.skipTranscriptCheck === !0,
    h,
    y,
    k = r ? void 0 : getFileReader();
  if (r) {
    let j = await listFeedbackDraftKeys(r);
    if (j === null) return { queued: [], expired: [] };
    ((h = j.map((x) => `${x.draftId}.json`)),
      (y = createTranscriptTailReader(r, j, MAX_TRANSCRIPT_TAIL_BYTES + 1)));
  } else {
    if (isDiskless()) return { queued: [], expired: [] };
    let j;
    try {
      j = await k.list(Ye());
    } catch (error) {
      if (isFsInaccessible(error)) return { queued: [], expired: [] };
      throw error;
    }
    h = j.filter((x) => x.endsWith(".json"));
  }
  let w = [],
    S = [],
    R = 0,
    I = 0;
  for (let [j, x] of h.entries()) {
    let B;
    try {
      let q = y === void 0 ? await k.readTail(join_2(Ye(), x), MAX_TRANSCRIPT_TAIL_BYTES + 1) : await y(j);
      if (q === null) continue;
      if (q.length > MAX_TRANSCRIPT_TAIL_BYTES) {
        I++;
        continue;
      }
      using P = slowLogging`listFeedbackDrafts parse(${q.length})`;
      let L = jsonParseRaw(q.toString("utf8")),
        safeParse = FeedbackDraftSchema().safeParse(L);
      if (!safeParse.success) {
        let Q = L?.draft_id;
        if (typeof Q === "string" && !DRAFT_ID_RE.test(Q)) R++;
        continue;
      }
      B = safeParse.data;
    } catch {
      continue;
    }
    if (x !== `${B.draft_id}.json`) {
      R++;
      continue;
    }
    if (B.status !== "queued") continue;
    let parse = Date.parse(B.created_at);
    if (Number.isFinite(parse) && n.getTime() - parse > DRAFT_RETENTION_MS) {
      if (s) continue;
      if (await deleteFeedbackDraft(B.draft_id, r).catch(() => !1))
        (S.push(B),
          logEvent("tengu_feedback_draft_expired", {
            type: fromEnum(B.type),
            trigger: fromEnum(B.trigger),
            age_days: fromNumber(Math.round((n.getTime() - parse) / 86400000)),
          }));
      continue;
    }
    w.push({ ...B, transcriptAvailable: f ? !1 : await verifyDraftTranscript(B, r) });
  }
  if ((w.sort((j, x) => x.created_at.localeCompare(j.created_at)), R > 0))
    logEvent("tengu_feedback_draft_invalid_id", { count: fromNumber(R) });
  if (I > 0) logEvent("tengu_feedback_draft_oversized_file", { count: fromNumber(I) });
  return { queued: w, expired: S };
}
//@ chunk-kxyd0g16.js:76006-76187 placement = getErrorsPath (0.79)
function parseTranscriptPathUnder(e, r) {
  if (!e.endsWith(".jsonl")) return;
  let n = dirname(e),
    s = basename(n),
    sliced = basename(e).slice(0, -6);
  if (dirname(n) !== r || !isValidKeySegment(s) || !isValidKeySegment(sliced)) return;
  let transcript = STORAGE_SPACES.transcript(s, sliced);
  return validateStorageKey(transcript) === void 0 ? transcript : void 0;
}
/**
 * 核对草稿的转录。
 */
//@ chunk-kxyd0g16.js:76187-76756 placement
async function verifyDraftTranscript(e, r) {
  let n = await resolveDraftTranscript(e);
  if (n === null) return !1;
  let { getSessionId: getSessionId } = await import("./chunk-nj7t53r7.js"),
    f = e.source_session_id === getSessionId();
  if (r) {
    let { getProjectsDir: getProjectsDir } = await import("./chunk-m7ezatv1.js"),
      y = parseTranscriptPathUnder(n, getProjectsDir());
    if (y !== void 0)
      try {
        if (f) return (await r.statMeta(y)).ok;
        let read = await r.read([{ key: y, tail: Lo }]);
        if (!read.ok) return !1;
        let [w] = read.value.items;
        return w.found && transcriptCorroboratesDraft(Buffer.from(w.value).toString("utf8"), e);
      } catch {
        return !1;
      }
  }
  if (f)
    try {
      return (await getFileReader().stat(n), !0);
    } catch {
      return !1;
    }
  try {
    let tail = await getFileReader().readTail(n, Lo);
    return transcriptCorroboratesDraft(tail.toString("utf8"), e);
  } catch {
    return !1;
  }
}
/**
 * 删除反馈草稿。
 */
//@ chunk-kxyd0g16.js:76756-77065 placement
async function deleteFeedbackDraft(e, r) {
  if (r) {
    let n = await r.delete(Bo(e));
    if (!n.ok) {
      if (isFsInaccessibleCode(vt(n.error))) return !1;
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `feedback draft delete failed: ${Xe(n.error)}`,
        "feedback draft delete failed",
      );
    }
    return n.value.existed;
  }
  if (isDiskless()) return !1;
  try {
    return (await getFileReader().delete($o(e)), !0);
  } catch (error) {
    if (!isENOENT(error) && !isFsInaccessible(error)) throw error;
    return !1;
  }
}
/**
 * 统计某会话产生的排队中反馈草稿数量。
 */
//@ chunk-kxyd0g16.js:77065-77174 placement
async function countSessionQueuedDrafts(e, r) {
  let { queued: queued } = await listFeedbackDrafts({ lightweight: !0 }, r);
  return count(queued, (s) => s.source_session_id === e);
}
//@ chunk-kxyd0g16.js:77174-77203 placement
var ULs = 20,
  Wo = 160,
  Rt = 4,
  BLs = 6;
/**
 * 记录新草稿并决定是否提示用户。
 */
//@ chunk-kxyd0g16.js:77203-77506 placement
function noteFeedbackDraft(e) {
  let r = "silent";
  return (
    uiSignals.feedbackNotice.setState((n) => {
      let s = { ...n, sessionDraftCount: n.sessionDraftCount + 1 };
      if (n.notice !== null) return ((r = "notice_pending"), (s.notice = e), s);
      if (n.promptedCount >= zo()) return ((r = "silent"), s);
      return ((s.promptedCount = n.promptedCount + 1), (r = "notice_pending"), (s.notice = e), s);
    }),
    r
  );
}
/**
 * 在未达上限时把反馈工具调用计数加一，返回是否计数成功。
 */
//@ chunk-kxyd0g16.js:77506-77658 placement
function tryCountFeedbackToolCall() {
  let e = !1;
  return (
    uiSignals.feedbackNotice.setState((r) => {
      if (r.toolCallCount >= Ge()) return r;
      return ((e = !0), { ...r, toolCallCount: r.toolCallCount + 1 });
    }),
    e
  );
}
/**
 * 关闭指定草稿的提示。
 */
//@ chunk-kxyd0g16.js:77658-77750 placement
function dismissFeedbackNotice(e) {
  uiSignals.feedbackNotice.setState((r) => (r.notice?.draftId === e ? { ...r, notice: null } : r));
}
//@ chunk-kxyd0g16.js:77750-77835 placement
function LEo() {
  uiSignals.feedbackNotice.setState((e) => (e.notice === null ? e : { ...e, notice: null }));
}
/**
 * 标记某草稿的提示已记录过遥测，首次标记返回 true。
 */
//@ chunk-kxyd0g16.js:77835-77987 placement
function markDraftNoticeLogged(e) {
  let r = !1;
  return (
    uiSignals.feedbackNotice.setState((n) => {
      if (n.shownLoggedForDraftId === e) return n;
      return ((r = !0), { ...n, shownLoggedForDraftId: e });
    }),
    r
  );
}
/**
 * 把会话草稿计数减少指定数量（不低于 0）。
 */
//@ chunk-kxyd0g16.js:77987-78099 placement
function decrementSessionDraftCount(e = 1) {
  uiSignals.feedbackNotice.setState((r) => ({
    ...r,
    sessionDraftCount: Math.max(0, r.sessionDraftCount - e),
  }));
}
/**
 * 尝试开始从磁盘初始化草稿计数，仅首次返回 true。
 */
//@ chunk-kxyd0g16.js:78099-78245 placement
function tryStartDraftSeed() {
  let e = !1;
  return (
    uiSignals.feedbackNotice.setState((r) => {
      if (r.seedStarted || r.seededFromDisk) return r;
      return ((e = !0), { ...r, seedStarted: !0 });
    }),
    e
  );
}
/**
 * 用磁盘上的草稿数初始化会话草稿计数（只做一次，取较大值）。
 */
//@ chunk-kxyd0g16.js:78245-78406 placement
function seedSessionDraftCount(e) {
  uiSignals.feedbackNotice.setState((r) => {
    if (r.seededFromDisk) return r;
    return { ...r, seededFromDisk: !0, sessionDraftCount: Math.max(r.sessionDraftCount, e) };
  });
}
/**
 * 直接设置会话草稿计数并标记已从磁盘初始化。
 */
//@ chunk-kxyd0g16.js:78406-78544 placement
function setSessionDraftCount(e) {
  uiSignals.feedbackNotice.setState((r) =>
    r.sessionDraftCount === e && r.seededFromDisk ? r : { ...r, seededFromDisk: !0, sessionDraftCount: e },
  );
}

export {
  tryStartDraftSeed,
  countSessionQueuedDrafts,
  seedSessionDraftCount,
  ULs,
  dismissFeedbackNotice,
  markDraftNoticeLogged,
  LEo,
  listFeedbackDrafts,
  BLs,
  FEEDBACK_TYPES,
  xo,
  recentEntries,
  yIr,
  HLs,
  NLs,
  _Ir,
  $Ls,
  Oye,
  _on,
  gIr,
  hIr,
  mLe,
  MAX_CLI_VERSION_LENGTH,
  MAX_OS_LENGTH,
  resolveDraftTranscript,
  transcriptCorroboratesDraft,
  deleteFeedbackDraft,
  decrementSessionDraftCount,
  bon,
  Son,
  Ie,
  tryCountFeedbackToolCall,
  Ge,
  createFeedbackDraft,
  saveFeedbackDraft,
  noteFeedbackDraft,
  Rt,
  ke,
  Wo,
  MAX_QUEUED_DRAFTS,
  setSessionDraftCount,
  MAX_DETAILS_LENGTH,
};
