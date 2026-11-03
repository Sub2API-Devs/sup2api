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
import { join, basename, dirname } from "path";
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
import { u, zJt, string, array, _enum, E, tuple } from "../../../vendor/zod/v4/classic/schemas.js";
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
/**
 * 反馈草稿关联的记忆类工具列表。
 */
var MEMORY_TOOLS = [MemoryListTool, MemoryReadTool, MemoryWriteTool];
//@ chunk-kxyd0g16.js:67237-67264 placement
/**
 * 提示次数上限的最大可配置值（20）。
 */
var DEFAULT_MAX_TOOL_CALLS_PER_SESSION = 10;
var DEFAULT_MAX_DRAFT_PROMPTS_PER_SESSION = 3;
var MAX_TOOL_CALLS_PER_SESSION = 50;
var MAX_DRAFT_PROMPTS_PER_SESSION = 20;
//@ chunk-kxyd0g16.js:67264-67321 placement
/**
 * 读反馈中继的远程配置 tengu_juniper_relay_config。
 */
function feedbackRelayConfig() {
  return getDynamicConfig_CACHED_MAY_BE_STALE("tengu_juniper_relay_config", {});
}
//@ chunk-kxyd0g16.js:67321-67406 placement
/**
 * 把值限制成范围内的整数，不合格用默认值。
 */
function clampIntInRange(e, r, n, s) {
  return typeof e === "number" && Number.isInteger(e) && e >= n && e <= s ? e : r;
}
//@ chunk-kxyd0g16.js:67406-67467 placement
/**
 * 每个会话最多记录多少次反馈工具调用。
 */
function getMaxToolCallsPerSession() {
  return clampIntInRange(
    feedbackRelayConfig().maxToolCallsPerSession,
    DEFAULT_MAX_TOOL_CALLS_PER_SESSION,
    1,
    MAX_TOOL_CALLS_PER_SESSION,
  );
}
//@ chunk-kxyd0g16.js:67467-67531 placement
/**
 * 每个会话最多主动提示多少次反馈草稿。
 */
function getMaxDraftPromptsPerSession() {
  return clampIntInRange(
    feedbackRelayConfig().maxDraftPromptsPerSession,
    DEFAULT_MAX_DRAFT_PROMPTS_PER_SESSION,
    0,
    MAX_DRAFT_PROMPTS_PER_SESSION,
  );
}
//@ chunk-kxyd0g16.js:67626-67726 placement
/**
 * 反馈草稿限制：队列上限、保留天数与毫秒、详情字节上限、标题长度、转录尾部字节上限、request_id 数、模型名/版本/OS/cwd/area 长度上限。
 */
var MAX_QUEUED_DRAFTS = 10;
var DRAFT_RETENTION_DAYS = 30;
var DRAFT_RETENTION_MS = DRAFT_RETENTION_DAYS * 24 * 60 * 60 * 1000;
var MAX_DETAILS_LENGTH = 10240;
var MAX_TITLE_LENGTH = 200;
var MAX_TRANSCRIPT_TAIL_BYTES = 32768;
var MAX_REQUEST_IDS = 5;
var MAX_MODEL_LENGTH = 64;
var MAX_CLI_VERSION_LENGTH = 32;
var MAX_OS_LENGTH = 64;
var MAX_CWD_LENGTH = 512;
var MAX_AREA_LENGTH = 64;
//@ chunk-kxyd0g16.js:67726-67766 placement
/**
 * 清洗标题（去控制字符、合并重复组合符、限长）。
 */
function sanitizeTitle(title) {
  return truncateChars(replaceControlChars(stripCombiningRepeated(title)), MAX_TITLE_LENGTH);
}
//@ chunk-kxyd0g16.js:67766-67861 placement
/**
 * 清洗详情（统一换行、逐行去控制字符、按字节限长）。
 */
function sanitizeDetails(details) {
  return truncateUtf8Bytes(
    stripCombiningRepeated(details)
      .replace(
        /\r\n/g,
        `
`,
      )
      .split(
        `
`,
      )
      .map((line) => replaceControlChars(line)).join(`
`),
    MAX_DETAILS_LENGTH,
  );
}
//@ chunk-kxyd0g16.js:67861-67909 placement
/**
 * 清洗短文本并限制长度。
 */
function sanitizeShortText(e, r) {
  return truncateChars(replaceControlChars(stripCombiningRepeated(e)).trim(), r);
}
//@ chunk-kxyd0g16.js:67909-67941 placement
/**
 * 模型名里允许的字符集（其他字符被删掉）。
 */
var INVALID_MODEL_CHARS_RE = /[^A-Za-z0-9.:_/@[\]-]/g;
//@ chunk-kxyd0g16.js:67941-67988 placement
/**
 * 清洗模型名。
 */
function sanitizeModel(model) {
  return truncateChars(model.replace(INVALID_MODEL_CHARS_RE, ""), MAX_MODEL_LENGTH);
}
//@ chunk-kxyd0g16.js:67988-68064 placement
/**
 * 清洗可选的 area 字段（空串变 undefined）。
 */
function sanitizeArea(area) {
  if (area === undefined) return;
  let r = sanitizeShortText(area, MAX_AREA_LENGTH);
  return r === "" ? undefined : r;
}
//@ chunk-kxyd0g16.js:68064-68111 placement
/**
 * 取最近的条目。
 */
function recentEntries(requestIds) {
  return requestIds.filter(isSessionsToken).slice(-MAX_REQUEST_IDS);
}
//@ chunk-kxyd0g16.js:68111-68645 placement
/**
 * 反馈的任务类别（code_edit、debug、explain 等）。
 */
var FEEDBACK_TYPES = ["bug", "idea", "missing_capability"];
var FEEDBACK_TRIGGERS = [
  "tool_error",
  "user_frustration",
  "missing_capability",
  "model_judgment",
  "exit_nudge",
];
var FEEDBACK_FAILURE_MODES = [
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
];
var FEEDBACK_TASK_CATEGORIES = [
  "code_edit",
  "debug",
  "explain",
  "plan",
  "shell",
  "search",
  "review",
  "other",
];
//@ chunk-kxyd0g16.js:68645-68705 placement
/**
 * 校验失败模式是否属于已知枚举。
 */
function asFailureMode(failureMode) {
  return failureMode !== undefined && FEEDBACK_FAILURE_MODES.includes(failureMode) ? failureMode : undefined;
}
//@ chunk-kxyd0g16.js:68705-68765 placement
/**
 * 校验任务类别是否属于已知枚举。
 */
function asTaskCategory(taskCategory) {
  return taskCategory !== undefined && FEEDBACK_TASK_CATEGORIES.includes(taskCategory)
    ? taskCategory
    : undefined;
}
//@ chunk-kxyd0g16.js:68765-68806 placement
/**
 * thinking 的三种类型（adaptive、enabled、disabled）。
 */
var THINKING_TYPES = ["adaptive", "enabled", "disabled"];
//@ chunk-kxyd0g16.js:68806-68865 placement
/**
 * 校验 thinking 类型。
 */
function asThinkingType(thinkingType) {
  return thinkingType !== undefined && THINKING_TYPES.includes(thinkingType) ? thinkingType : undefined;
}
//@ chunk-kxyd0g16.js:68865-68875 placement
/**
 * effort 字段的最大字符数（16）。
 */
var MAX_EFFORT_CHARS = 16;
//@ chunk-kxyd0g16.js:68875-68951 placement
/**
 * 清洗可选 effort。
 */
function sanitizeEffort(effort) {
  if (effort === undefined) return;
  let r = sanitizeShortText(effort, MAX_EFFORT_CHARS);
  return r === "" ? undefined : r;
}
//@ chunk-kxyd0g16.js:68951-68962 placement
/**
 * token 数量字段的上限（100 万）。
 */
var MAX_TOKEN_COUNT = 1e6;
//@ chunk-kxyd0g16.js:68962-69039 placement
/**
 * 校验 token 数量（非负整数且不超过上限）。
 */
function asTokenCount(e) {
  return e !== undefined && Number.isInteger(e) && e >= 0 && e <= MAX_TOKEN_COUNT ? e : undefined;
}
//@ chunk-kxyd0g16.js:69039-70198 placement
/**
 * 反馈草稿 schema。
 */
var FeedbackDraftSchema = DoctorLazy(() =>
  u({
    draft_id: zJt(),
    created_at: string()
      .refine((e) => Number.isFinite(Date.parse(e)))
      .transform((e) => new Date(Date.parse(e)).toISOString()),
    source_session_id: string().regex(SESSION_ID_RE),
    cwd: string().transform((e) => sanitizeShortText(e, MAX_CWD_LENGTH)),
    model: string().transform((e) => sanitizeModel(e)),
    cli_version: string().transform((e) => sanitizeShortText(e, MAX_CLI_VERSION_LENGTH)),
    os: string().transform((e) => sanitizeShortText(e, MAX_OS_LENGTH)),
    request_ids: array(string()).transform((e) => recentEntries(e)),
    type: _enum(FEEDBACK_TYPES),
    title: string()
      .min(1)
      .transform((e) => sanitizeTitle(e)),
    details: string().transform((e) => sanitizeDetails(e)),
    area: string()
      .optional()
      .transform((e) => sanitizeArea(e)),
    trigger: _enum(FEEDBACK_TRIGGERS),
    failure_mode: _enum(FEEDBACK_FAILURE_MODES).optional().catch(undefined),
    task_category: _enum(FEEDBACK_TASK_CATEGORIES).optional().catch(undefined),
    effort: string().optional().catch(undefined).transform(sanitizeEffort),
    thinking_type: _enum(THINKING_TYPES).optional().catch(undefined),
    thinking_budget: E().optional().catch(undefined).transform(asTokenCount),
    message_count: E().optional().catch(undefined).transform(asTokenCount),
    assistant_turn_count: E().optional().catch(undefined).transform(asTokenCount),
    subagent_count: E().optional().catch(undefined).transform(asTokenCount),
    transcript_ref: u({
      session_file: string(),
      message_range: tuple([E(), E()]).nullable(),
      project_dir_key: string()
        .optional()
        .transform((e) => (e !== undefined && PROJECT_DIR_KEY_RE.test(e) ? e : undefined)),
    }).nullable(),
    status: _enum(["queued", "submitted", "discarded", "expired"]),
  }),
);
//@ chunk-kxyd0g16.js:70198-70248 placement
/**
 * 反馈草稿目录（configDir/feedback/drafts）。
 */
function feedbackDraftsDir() {
  return join(getClaudeConfigDir(), "feedback", "drafts");
}
//@ chunk-kxyd0g16.js:70248-70390 placement
var DRAFT_ID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
var SESSION_ID_RE = /^[A-Za-z0-9_-]{1,128}$/;
var PROJECT_DIR_KEY_RE = /^[A-Za-z0-9-]{1,255}$/;
//@ chunk-kxyd0g16.js:70390-70489 placement
/**
 * 由草稿 id 得到本地文件路径（id 非法时抛错）。
 */
function draftFilePath(e) {
  if (!DRAFT_ID_RE.test(e)) throw Error("invalid feedback draft id");
  return join(feedbackDraftsDir(), `${e}.json`);
}
//@ chunk-kxyd0g16.js:70489-70587 placement
/**
 * 由草稿 id 得到存储 v5 的键（id 非法时抛错）。
 */
function draftStorageKey(e) {
  if (!DRAFT_ID_RE.test(e)) throw Error("invalid feedback draft id");
  return STORAGE_SPACES.feedbackDraft(e);
}
//@ chunk-kxyd0g16.js:70587-70651 placement
/**
 * 从错误对象取遥测码。
 */
function telemetryCodeOf(error) {
  return "telemetryCode" in error ? error.telemetryCode : undefined;
}
//@ chunk-kxyd0g16.js:70651-70720 placement
/**
 * 把存储错误描述成 “code telemetryCode”。
 */
function describeStorageError(error) {
  let r = telemetryCodeOf(error);
  return r === undefined ? error.code : `${error.code} ${r}`;
}
//@ chunk-kxyd0g16.js:70720-71303 placement
/**
 * 列出存储中的反馈草稿键。
 */
async function listFeedbackDraftKeys(e) {
  let r = [];
  let allPages = await readAllPages(
    (cursor) =>
      e.listEntries(
        {
          namespace: "feedbackDraft",
        },
        {
          cursor,
          skipKeyStats: true,
        },
      ),
    (s) => {
      for (let f of s) if (f.kind === "key" && f.key.namespace === "feedbackDraft") r.push(f.key);
    },
  );
  if (allPages.status === "done") return r;
  if (allPages.status === "capped") {
    logForDebugging(
      "feedbackDrafts: draft listing kept offering cursors past the page cap; treating it as failed",
      {
        level: "error",
      },
    );
    return null;
  }
  if (isFsInaccessibleCode(telemetryCodeOf(allPages.error))) {
    logForDebugging(`feedbackDrafts: draft listing failed: ${describeStorageError(allPages.error)}`, {
      level: "error",
    });
    return null;
  }
  throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
    `feedback draft listing failed: ${describeStorageError(allPages.error)}`,
    "feedback draft listing failed",
  );
}
//@ chunk-kxyd0g16.js:71303-71312 placement
/**
 * 逐块读取转录时的块大小（8）。
 */
var TAIL_READ_BLOCK_CHARS = 8;
//@ chunk-kxyd0g16.js:71312-71759 placement
/**
 * 创建转录尾部读取器。
 */
function createTranscriptTailReader(e, r, tail) {
  let s = (k) => (k.found ? Buffer.from(k.value) : null);
  let f = async (key) => {
    try {
      let w = await e.read([
        {
          key,
          tail,
        },
      ]);
      return w.ok ? s(w.value.items[0]) : null;
    } catch {
      return null;
    }
  };
  let h = -1;
  let y = [];
  return async (k) => {
    let w = k - (k % TAIL_READ_BLOCK_CHARS);
    if (w !== h) {
      let sliced = r.slice(w, w + TAIL_READ_BLOCK_CHARS);
      let R = await e
        .read(
          sliced.map((key) => ({
            key,
            tail,
          })),
        )
        .catch(() => {
          return;
        });
      y = [];
      if (R?.ok && R.value.items.length === sliced.length) y = R.value.items.map(s);
      else for (let I of sliced) y.push(await f(I));
      h = w;
    }
    return y[k - w] ?? null;
  };
}
//@ chunk-kxyd0g16.js:71759-72280 placement
/**
 * 定位草稿对应的转录。
 */
async function resolveDraftTranscript(e) {
  if (!e.transcript_ref) return null;
  if (!SESSION_ID_RE.test(e.source_session_id)) return null;
  let { getSessionId } = await import("./chunk-nj7t53r7.js");
  if (e.source_session_id === getSessionId()) {
    let { getTranscriptPathForSession } = await import("./chunk-hs5khexj.js");
    return getTranscriptPathForSession(e.source_session_id);
  }
  let { getProjectDir, getProjectsDir } = await import("./chunk-m7ezatv1.js");
  let projectDirKey = e.transcript_ref.project_dir_key;
  if (projectDirKey !== undefined && PROJECT_DIR_KEY_RE.test(projectDirKey))
    return join(getProjectsDir(), projectDirKey, `${e.source_session_id}.jsonl`);
  return join(getProjectDir(e.cwd), `${e.source_session_id}.jsonl`);
}
//@ chunk-kxyd0g16.js:72280-72294 placement
/**
 * 佐证草稿时读取的转录尾部大小（256 KiB）。
 */
var MAX_CORROBORATION_TAIL_CHARS = 262144;
//@ chunk-kxyd0g16.js:72294-72587 placement
/**
 * 检查转录内容是否能佐证反馈草稿（逐行解析 JSONL 查找对应记录）。
 */
function transcriptCorroboratesDraft(e, r) {
  using n = slowLogging`transcriptContentCorroboratesDraft(${e.length})`;
  for (let line of e.split(`
`)) {
    if (!line) continue;
    let f;
    try {
      f = jsonParseRaw(line);
    } catch {
      continue;
    }
    if (typeof f !== "object" || f === null) continue;
    if ("sessionId" in f && "cwd" in f && f.sessionId === r.source_session_id && f.cwd === r.cwd) return true;
  }
  return false;
}
//@ chunk-kxyd0g16.js:72587-72667 placement
/**
 * 按字符截断（不切开代理对）。
 */
function truncateChars(e, r) {
  let list = Array.from(e);
  return list.length <= r ? e : list.slice(0, r).join("");
}
//@ chunk-kxyd0g16.js:72667-73413 placement
/**
 * 生成反馈草稿对象。
 */
function createFeedbackDraft(e, r = new Date()) {
  let projectDirKey = e.transcriptFile ? projectDirKey_2(e.transcriptFile) : undefined;
  return {
    draft_id: randomUUID(),
    created_at: r.toISOString(),
    source_session_id: e.sessionId,
    cwd: sanitizeShortText(e.cwd, MAX_CWD_LENGTH),
    model: sanitizeModel(e.model),
    cli_version: sanitizeShortText(e.cliVersion, MAX_CLI_VERSION_LENGTH),
    os: sanitizeShortText(e.os, MAX_OS_LENGTH),
    request_ids: recentEntries(e.requestIds),
    type: e.type,
    title: sanitizeTitle(e.title),
    details: sanitizeDetails(e.details),
    area: sanitizeArea(e.area),
    failure_mode: e.failureMode,
    task_category: e.taskCategory,
    trigger: e.trigger,
    effort: sanitizeEffort(e.effort),
    thinking_type: e.thinkingType,
    thinking_budget: asTokenCount(e.thinkingBudget),
    message_count: asTokenCount(e.messageCount),
    assistant_turn_count: asTokenCount(e.assistantTurnCount),
    subagent_count: asTokenCount(e.subagentCount),
    transcript_ref: e.transcriptFile
      ? {
          session_file: e.transcriptFile,
          message_range: null,
          project_dir_key: projectDirKey,
        }
      : null,
    status: "queued",
  };
}
//@ chunk-kxyd0g16.js:73413-73471 placement
/**
 * 从转写文件路径取项目目录键。
 */
function projectDirKey_2(transcriptFile) {
  let r = basename(dirname(transcriptFile));
  return PROJECT_DIR_KEY_RE.test(r) ? r : undefined;
}
//@ chunk-kxyd0g16.js:73471-74630 placement
/**
 * 保存反馈草稿（大小上限）。
 */
async function saveFeedbackDraft(e, now = new Date(), storageV5) {
  let s = jsonStringify(e, null, 2);
  if (s === undefined || Buffer.byteLength(s, "utf8") > MAX_TRANSCRIPT_TAIL_BYTES)
    return {
      success: false,
      reason: "too_large",
    };
  if (storageV5) {
    let h;
    try {
      h = await storageV5.write(draftStorageKey(e.draft_id), s, {
        mode: 384,
      });
    } catch (error) {
      logForDebugging(
        `feedbackDrafts: draft write failed: ${error instanceof Error ? error.name : "unknown"}`,
        {
          level: "error",
        },
      );
      return {
        success: false,
        reason: "write_failed",
      };
    }
    if (!h.ok) {
      logForDebugging(`feedbackDrafts: draft write failed: ${describeStorageError(h.error)}`, {
        level: "error",
      });
      return {
        success: false,
        reason: "write_failed",
      };
    }
  } else {
    if (isDiskless()) {
      warnDisklessSettingsWrite("feedback_draft", "feedback/drafts");
      return {
        success: false,
        reason: "write_failed",
      };
    }
    let fileReader = getFileReader();
    try {
      await fileReader.mkdir(feedbackDraftsDir());
      await fileReader.atomicWrite(draftFilePath(e.draft_id), s, 384);
    } catch (error) {
      logForDebugging(
        `feedbackDrafts: draft write failed: ${error instanceof Error ? error.name : "unknown"}`,
        {
          level: "error",
        },
      );
      return {
        success: false,
        reason: "write_failed",
      };
    }
  }
  let f = [];
  try {
    let { queued } = await listFeedbackDrafts(
      {
        now,
        skipTranscriptCheck: true,
      },
      storageV5,
    );
    if (queued.length > MAX_QUEUED_DRAFTS) {
      let sorted = queued.slice().sort((k, w) => k.created_at.localeCompare(w.created_at));
      for (let k of sorted.slice(0, queued.length - MAX_QUEUED_DRAFTS)) {
        await deleteFeedbackDraft(k.draft_id, storageV5);
        f.push(k);
      }
    }
  } catch (error) {
    logForDebugging(
      `feedbackDrafts: eviction sweep failed: ${error instanceof Error ? error.name : "unknown"}`,
      {
        level: "error",
      },
    );
  }
  return {
    success: true,
    draft: e,
    evicted: f,
  };
}
//@ chunk-kxyd0g16.js:74630-76006 placement
/**
 * 列出排队/过期的反馈草稿。
 */
async function listFeedbackDrafts(e, storageV5) {
  let n = e?.now ?? new Date();
  let s = e?.lightweight === true;
  let f = s || e?.skipTranscriptCheck === true;
  let h;
  let y;
  let k = storageV5 ? undefined : getFileReader();
  if (storageV5) {
    let j = await listFeedbackDraftKeys(storageV5);
    if (j === null)
      return {
        queued: [],
        expired: [],
      };
    h = j.map((x) => `${x.draftId}.json`);
    y = createTranscriptTailReader(storageV5, j, MAX_TRANSCRIPT_TAIL_BYTES + 1);
  } else {
    if (isDiskless())
      return {
        queued: [],
        expired: [],
      };
    let j;
    try {
      j = await k.list(feedbackDraftsDir());
    } catch (error) {
      if (isFsInaccessible(error))
        return {
          queued: [],
          expired: [],
        };
      throw error;
    }
    h = j.filter((x) => x.endsWith(".json"));
  }
  let w = [];
  let S = [];
  let R = 0;
  let I = 0;
  for (let [j, x] of h.entries()) {
    let B;
    try {
      let q =
        y === undefined
          ? await k.readTail(join(feedbackDraftsDir(), x), MAX_TRANSCRIPT_TAIL_BYTES + 1)
          : await y(j);
      if (q === null) continue;
      if (q.length > MAX_TRANSCRIPT_TAIL_BYTES) {
        I++;
        continue;
      }
      using P = slowLogging`listFeedbackDrafts parse(${q.length})`;
      let L = jsonParseRaw(q.toString("utf8"));
      let W = FeedbackDraftSchema().safeParse(L);
      if (!W.success) {
        let draftId = L?.draft_id;
        if (typeof draftId === "string" && !DRAFT_ID_RE.test(draftId)) R++;
        continue;
      }
      B = W.data;
    } catch {
      continue;
    }
    if (x !== `${B.draft_id}.json`) {
      R++;
      continue;
    }
    if (B.status !== "queued") continue;
    let timestamp = Date.parse(B.created_at);
    if (Number.isFinite(timestamp) && n.getTime() - timestamp > DRAFT_RETENTION_MS) {
      if (s) continue;
      if (await deleteFeedbackDraft(B.draft_id, storageV5).catch(() => false)) {
        S.push(B);
        logEvent("tengu_feedback_draft_expired", {
          type: fromEnum(B.type),
          trigger: fromEnum(B.trigger),
          age_days: fromNumber(Math.round((n.getTime() - timestamp) / 86400000)),
        });
      }
      continue;
    }
    w.push({
      ...B,
      transcriptAvailable: f ? false : await verifyDraftTranscript(B, storageV5),
    });
  }
  w.sort((j, x) => x.created_at.localeCompare(j.created_at));
  if (R > 0)
    logEvent("tengu_feedback_draft_invalid_id", {
      count: fromNumber(R),
    });
  if (I > 0)
    logEvent("tengu_feedback_draft_oversized_file", {
      count: fromNumber(I),
    });
  return {
    queued: w,
    expired: S,
  };
}
//@ chunk-kxyd0g16.js:76006-76187 placement = getErrorsPath (0.79)
function parseTranscriptPathUnder(draftTranscript, projectsDir) {
  if (!draftTranscript.endsWith(".jsonl")) return;
  let n = dirname(draftTranscript);
  let s = basename(n);
  let sliced = basename(draftTranscript).slice(0, -6);
  if (dirname(n) !== projectsDir || !isValidKeySegment(s) || !isValidKeySegment(sliced)) return;
  let h = STORAGE_SPACES.transcript(s, sliced);
  return validateStorageKey(h) === undefined ? h : undefined;
}
//@ chunk-kxyd0g16.js:76187-76756 placement
/**
 * 核对草稿的转录。
 */
async function verifyDraftTranscript(e, r) {
  let draftTranscript = await resolveDraftTranscript(e);
  if (draftTranscript === null) return false;
  let { getSessionId } = await import("./chunk-nj7t53r7.js");
  let f = e.source_session_id === getSessionId();
  if (r) {
    let { getProjectsDir } = await import("./chunk-m7ezatv1.js");
    let transcriptPathUnder = parseTranscriptPathUnder(draftTranscript, getProjectsDir());
    if (transcriptPathUnder !== undefined)
      try {
        if (f) return (await r.statMeta(transcriptPathUnder)).ok;
        let k = await r.read([
          {
            key: transcriptPathUnder,
            tail: MAX_CORROBORATION_TAIL_CHARS,
          },
        ]);
        if (!k.ok) return false;
        let [w] = k.value.items;
        return w.found && transcriptCorroboratesDraft(Buffer.from(w.value).toString("utf8"), e);
      } catch {
        return false;
      }
  }
  if (f)
    try {
      await getFileReader().stat(draftTranscript);
      return true;
    } catch {
      return false;
    }
  try {
    let tail = await getFileReader().readTail(draftTranscript, MAX_CORROBORATION_TAIL_CHARS);
    return transcriptCorroboratesDraft(tail.toString("utf8"), e);
  } catch {
    return false;
  }
}
//@ chunk-kxyd0g16.js:76756-77065 placement
/**
 * 删除反馈草稿。
 */
async function deleteFeedbackDraft(draftId, r) {
  if (r) {
    let n = await r.delete(draftStorageKey(draftId));
    if (!n.ok) {
      if (isFsInaccessibleCode(telemetryCodeOf(n.error))) return false;
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `feedback draft delete failed: ${describeStorageError(n.error)}`,
        "feedback draft delete failed",
      );
    }
    return n.value.existed;
  }
  if (isDiskless()) return false;
  try {
    await getFileReader().delete(draftFilePath(draftId));
    return true;
  } catch (error) {
    if (!isENOENT(error) && !isFsInaccessible(error)) throw error;
    return false;
  }
}
//@ chunk-kxyd0g16.js:77065-77174 placement
/**
 * 统计某会话产生的排队中反馈草稿数量。
 */
async function countSessionQueuedDrafts(sessionId, storageV5) {
  let { queued } = await listFeedbackDrafts(
    {
      lightweight: true,
    },
    storageV5,
  );
  return count(queued, (s) => s.source_session_id === sessionId);
}
//@ chunk-kxyd0g16.js:77174-77203 placement
/**
 * 提示里模型名最多展示的字符数（6）。
 */
var MAX_TITLE_PREVIEW_CHARS = 20;
var MAX_NOTICE_PROMPT_CHARS = 160;
var MAX_NOTICE_LINES = 4;
var MAX_NOTICE_MODEL_CHARS = 6;
//@ chunk-kxyd0g16.js:77203-77506 placement
/**
 * 记录新草稿并决定是否提示用户。
 */
function noteFeedbackDraft(notice) {
  let r = "silent";
  uiSignals.feedbackNotice.setState((n) => {
    let s = {
      ...n,
      sessionDraftCount: n.sessionDraftCount + 1,
    };
    if (n.notice !== null) {
      r = "notice_pending";
      s.notice = notice;
      return s;
    }
    if (n.promptedCount >= getMaxDraftPromptsPerSession()) {
      r = "silent";
      return s;
    }
    s.promptedCount = n.promptedCount + 1;
    r = "notice_pending";
    s.notice = notice;
    return s;
  });
  return r;
}
//@ chunk-kxyd0g16.js:77506-77658 placement
/**
 * 在未达上限时把反馈工具调用计数加一，返回是否计数成功。
 */
function tryCountFeedbackToolCall() {
  let e = false;
  uiSignals.feedbackNotice.setState((r) => {
    if (r.toolCallCount >= getMaxToolCallsPerSession()) return r;
    e = true;
    return {
      ...r,
      toolCallCount: r.toolCallCount + 1,
    };
  });
  return e;
}
//@ chunk-kxyd0g16.js:77658-77750 placement
/**
 * 关闭指定草稿的提示。
 */
function dismissFeedbackNotice_2(draftId) {
  uiSignals.feedbackNotice.setState((r) =>
    r.notice?.draftId === draftId
      ? {
          ...r,
          notice: null,
        }
      : r,
  );
}
//@ chunk-kxyd0g16.js:77750-77835 placement
/**
 * 关闭反馈提示。
 */
function dismissFeedbackNotice() {
  uiSignals.feedbackNotice.setState((e) =>
    e.notice === null
      ? e
      : {
          ...e,
          notice: null,
        },
  );
}
//@ chunk-kxyd0g16.js:77835-77987 placement
/**
 * 标记某草稿的提示已记录过遥测，首次标记返回 true。
 */
function markDraftNoticeLogged(draftId) {
  let r = false;
  uiSignals.feedbackNotice.setState((n) => {
    if (n.shownLoggedForDraftId === draftId) return n;
    r = true;
    return {
      ...n,
      shownLoggedForDraftId: draftId,
    };
  });
  return r;
}
//@ chunk-kxyd0g16.js:77987-78099 placement
/**
 * 把会话草稿计数减少指定数量（不低于 0）。
 */
function decrementSessionDraftCount(e = 1) {
  uiSignals.feedbackNotice.setState((r) => ({
    ...r,
    sessionDraftCount: Math.max(0, r.sessionDraftCount - e),
  }));
}
//@ chunk-kxyd0g16.js:78099-78245 placement
/**
 * 尝试开始从磁盘初始化草稿计数，仅首次返回 true。
 */
function tryStartDraftSeed() {
  let e = false;
  uiSignals.feedbackNotice.setState((r) => {
    if (r.seedStarted || r.seededFromDisk) return r;
    e = true;
    return {
      ...r,
      seedStarted: true,
    };
  });
  return e;
}
//@ chunk-kxyd0g16.js:78245-78406 placement
/**
 * 用磁盘上的草稿数初始化会话草稿计数（只做一次，取较大值）。
 */
function seedSessionDraftCount(e) {
  uiSignals.feedbackNotice.setState((r) => {
    if (r.seededFromDisk) return r;
    return {
      ...r,
      seededFromDisk: true,
      sessionDraftCount: Math.max(r.sessionDraftCount, e),
    };
  });
}
//@ chunk-kxyd0g16.js:78406-78544 placement
/**
 * 直接设置会话草稿计数并标记已从磁盘初始化。
 */
function setSessionDraftCount(e) {
  uiSignals.feedbackNotice.setState((r) =>
    r.sessionDraftCount === e && r.seededFromDisk
      ? r
      : {
          ...r,
          seededFromDisk: true,
          sessionDraftCount: e,
        },
  );
}
export {
  tryStartDraftSeed,
  countSessionQueuedDrafts,
  seedSessionDraftCount,
  MAX_TITLE_PREVIEW_CHARS,
  dismissFeedbackNotice_2,
  markDraftNoticeLogged,
  dismissFeedbackNotice,
  listFeedbackDrafts,
  MAX_NOTICE_MODEL_CHARS,
  FEEDBACK_TYPES,
  MEMORY_TOOLS,
  recentEntries,
  sanitizeArea,
  asFailureMode,
  asTaskCategory,
  sanitizeEffort,
  asThinkingType,
  asTokenCount,
  sanitizeTitle,
  sanitizeDetails,
  sanitizeModel,
  sanitizeShortText,
  MAX_CLI_VERSION_LENGTH,
  MAX_OS_LENGTH,
  resolveDraftTranscript,
  transcriptCorroboratesDraft,
  deleteFeedbackDraft,
  decrementSessionDraftCount,
  FEEDBACK_FAILURE_MODES,
  FEEDBACK_TASK_CATEGORIES,
  feedbackRelayConfig,
  tryCountFeedbackToolCall,
  getMaxToolCallsPerSession,
  createFeedbackDraft,
  saveFeedbackDraft,
  noteFeedbackDraft,
  MAX_NOTICE_LINES,
  truncateChars,
  MAX_NOTICE_PROMPT_CHARS,
  MAX_QUEUED_DRAFTS,
  setSessionDraftCount,
  MAX_DETAILS_LENGTH,
};
