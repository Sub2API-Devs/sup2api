/**
 * services/feedback/feedbackDrafts.ts
 *
 * 2.1.316 新增：列出排队/过期的反馈草稿；反馈草稿 schema等。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-fmnbrxwy.js (55)
 * attribution: placement 55
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
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
import {
  objectSchema,
  uuidSchema,
  stringSchema,
  array,
  _enum,
  numberSchema,
  tuple,
} from "../../../vendor/zod/v4/classic/schemas.js";
import { getClaudeConfigDir } from "../../utils/markdownConfigLoader.js";
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
import { countWhere } from "../../utils/collections.js";
import { uiSignals } from "../../state/uiSignals.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-fmnbrxwy.js:81931-81951 placement
/**
 * 反馈草稿关联的记忆类工具列表。
 */
var MEMORY_TOOLS; // deferred: uses MemoryListTool (../../tools/MemoryTool/MemoryListTool.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-fmnbrxwy.js:81931", () => {
  MEMORY_TOOLS = [MemoryListTool, MemoryReadTool, MemoryWriteTool];
});
//@ chunk-fmnbrxwy.js:81951-81978 placement
/**
 * 提示次数上限的最大可配置值（20）。
 */
var DEFAULT_MAX_TOOL_CALLS_PER_SESSION = 10;
var DEFAULT_MAX_DRAFT_PROMPTS_PER_SESSION = 3;
var MAX_TOOL_CALLS_PER_SESSION = 50;
var MAX_DRAFT_PROMPTS_PER_SESSION = 20;
//@ chunk-fmnbrxwy.js:81978-82035 placement
/**
 * 读反馈中继的远程配置 tengu_juniper_relay_config。
 */
function feedbackRelayConfig() {
  return getDynamicConfig_CACHED_MAY_BE_STALE("tengu_juniper_relay_config", {});
}
//@ chunk-fmnbrxwy.js:82035-82120 placement
/**
 * 把值限制成范围内的整数，不合格用默认值。
 */
function clampIntInRange(value, fallback, min, max) {
  return typeof value === "number" && Number.isInteger(value) && value >= min && value <= max
    ? value
    : fallback;
}
//@ chunk-fmnbrxwy.js:82120-82181 placement
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
//@ chunk-fmnbrxwy.js:82181-82245 placement
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
//@ chunk-fmnbrxwy.js:82340-82440 placement
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
//@ chunk-fmnbrxwy.js:82440-82480 placement
/**
 * 清洗标题（去控制字符、合并重复组合符、限长）。
 */
function sanitizeTitle(title) {
  return truncateChars(replaceControlChars(stripCombiningRepeated(title)), MAX_TITLE_LENGTH);
}
//@ chunk-fmnbrxwy.js:82480-82575 placement
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
//@ chunk-fmnbrxwy.js:82575-82623 placement
/**
 * 清洗短文本并限制长度。
 */
function sanitizeShortText(text, maxLen) {
  return truncateChars(replaceControlChars(stripCombiningRepeated(text)).trim(), maxLen);
}
//@ chunk-fmnbrxwy.js:82623-82655 placement
/**
 * 模型名里允许的字符集（其他字符被删掉）。
 */
var INVALID_MODEL_CHARS_RE = /[^A-Za-z0-9.:_/@[\]-]/g;
//@ chunk-fmnbrxwy.js:82655-82702 placement
/**
 * 清洗模型名。
 */
function sanitizeModel(model) {
  return truncateChars(model.replace(INVALID_MODEL_CHARS_RE, ""), MAX_MODEL_LENGTH);
}
//@ chunk-fmnbrxwy.js:82702-82778 placement
/**
 * 清洗可选的 area 字段（空串变 undefined）。
 */
function sanitizeArea(area) {
  if (area === undefined) return;
  let sanitized = sanitizeShortText(area, MAX_AREA_LENGTH);
  return sanitized === "" ? undefined : sanitized;
}
//@ chunk-fmnbrxwy.js:82778-82825 placement
/**
 * 取最近的条目。
 */
function recentEntries(requestIds) {
  return requestIds.filter(isSessionsToken).slice(-MAX_REQUEST_IDS);
}
//@ chunk-fmnbrxwy.js:82825-83359 placement
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
//@ chunk-fmnbrxwy.js:83359-83419 placement
/**
 * 校验失败模式是否属于已知枚举。
 */
function asFailureMode(failureMode) {
  return failureMode !== undefined && FEEDBACK_FAILURE_MODES.includes(failureMode) ? failureMode : undefined;
}
//@ chunk-fmnbrxwy.js:83419-83479 placement
/**
 * 校验任务类别是否属于已知枚举。
 */
function asTaskCategory(taskCategory) {
  return taskCategory !== undefined && FEEDBACK_TASK_CATEGORIES.includes(taskCategory)
    ? taskCategory
    : undefined;
}
//@ chunk-fmnbrxwy.js:83479-83520 placement
/**
 * thinking 的三种类型（adaptive、enabled、disabled）。
 */
var THINKING_TYPES = ["adaptive", "enabled", "disabled"];
//@ chunk-fmnbrxwy.js:83520-83579 placement
/**
 * 校验 thinking 类型。
 */
function asThinkingType(thinkingType) {
  return thinkingType !== undefined && THINKING_TYPES.includes(thinkingType) ? thinkingType : undefined;
}
//@ chunk-fmnbrxwy.js:83579-83589 placement
/**
 * effort 字段的最大字符数（16）。
 */
var MAX_EFFORT_CHARS = 16;
//@ chunk-fmnbrxwy.js:83589-83665 placement
/**
 * 清洗可选 effort。
 */
function sanitizeEffort(effort) {
  if (effort === undefined) return;
  let sanitized = sanitizeShortText(effort, MAX_EFFORT_CHARS);
  return sanitized === "" ? undefined : sanitized;
}
//@ chunk-fmnbrxwy.js:83665-83676 placement
/**
 * token 数量字段的上限（100 万）。
 */
var MAX_TOKEN_COUNT = 1e6;
//@ chunk-fmnbrxwy.js:83676-83753 placement
/**
 * 校验 token 数量（非负整数且不超过上限）。
 */
function asTokenCount(value) {
  return value !== undefined && Number.isInteger(value) && value >= 0 && value <= MAX_TOKEN_COUNT
    ? value
    : undefined;
}
//@ chunk-fmnbrxwy.js:83753-84912 placement
/**
 * 反馈草稿 schema。
 */
var FeedbackDraftSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-fmnbrxwy.js:83753", () => {
  FeedbackDraftSchema = DoctorLazy(() =>
    objectSchema({
      draft_id: uuidSchema(),
      created_at: stringSchema()
        .refine((value) => Number.isFinite(Date.parse(value)))
        .transform((value) => new Date(Date.parse(value)).toISOString()),
      source_session_id: stringSchema().regex(SESSION_ID_RE),
      cwd: stringSchema().transform((value) => sanitizeShortText(value, MAX_CWD_LENGTH)),
      model: stringSchema().transform((value) => sanitizeModel(value)),
      cli_version: stringSchema().transform((value) => sanitizeShortText(value, MAX_CLI_VERSION_LENGTH)),
      os: stringSchema().transform((value) => sanitizeShortText(value, MAX_OS_LENGTH)),
      request_ids: array(stringSchema()).transform((value) => recentEntries(value)),
      type: _enum(FEEDBACK_TYPES),
      title: stringSchema()
        .min(1)
        .transform((value) => sanitizeTitle(value)),
      details: stringSchema().transform((value) => sanitizeDetails(value)),
      area: stringSchema()
        .optional()
        .transform((value) => sanitizeArea(value)),
      trigger: _enum(FEEDBACK_TRIGGERS),
      failure_mode: _enum(FEEDBACK_FAILURE_MODES).optional().catch(undefined),
      task_category: _enum(FEEDBACK_TASK_CATEGORIES).optional().catch(undefined),
      effort: stringSchema().optional().catch(undefined).transform(sanitizeEffort),
      thinking_type: _enum(THINKING_TYPES).optional().catch(undefined),
      thinking_budget: numberSchema().optional().catch(undefined).transform(asTokenCount),
      message_count: numberSchema().optional().catch(undefined).transform(asTokenCount),
      assistant_turn_count: numberSchema().optional().catch(undefined).transform(asTokenCount),
      subagent_count: numberSchema().optional().catch(undefined).transform(asTokenCount),
      transcript_ref: objectSchema({
        session_file: stringSchema(),
        message_range: tuple([numberSchema(), numberSchema()]).nullable(),
        project_dir_key: stringSchema()
          .optional()
          .transform((value) => (value !== undefined && PROJECT_DIR_KEY_RE.test(value) ? value : undefined)),
      }).nullable(),
      status: _enum(["queued", "submitted", "discarded", "expired"]),
    }),
  );
});
//@ chunk-fmnbrxwy.js:84912-84962 placement
/**
 * 反馈草稿目录（configDir/feedback/drafts）。
 */
function feedbackDraftsDir() {
  return join(getClaudeConfigDir(), "feedback", "drafts");
}
//@ chunk-fmnbrxwy.js:84962-85104 placement
var DRAFT_ID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
var SESSION_ID_RE = /^[A-Za-z0-9_-]{1,128}$/;
var PROJECT_DIR_KEY_RE = /^[A-Za-z0-9-]{1,255}$/;
//@ chunk-fmnbrxwy.js:85104-85203 placement
/**
 * 由草稿 id 得到本地文件路径（id 非法时抛错）。
 */
function draftFilePath(id) {
  if (!DRAFT_ID_RE.test(id)) throw Error("invalid feedback draft id");
  return join(feedbackDraftsDir(), `${id}.json`);
}
//@ chunk-fmnbrxwy.js:85203-85301 placement
/**
 * 由草稿 id 得到存储 v5 的键（id 非法时抛错）。
 */
function draftStorageKey(id) {
  if (!DRAFT_ID_RE.test(id)) throw Error("invalid feedback draft id");
  return STORAGE_SPACES.feedbackDraft(id);
}
//@ chunk-fmnbrxwy.js:85301-85365 placement
/**
 * 从错误对象取遥测码。
 */
function telemetryCodeOf(error) {
  return "telemetryCode" in error ? error.telemetryCode : undefined;
}
//@ chunk-fmnbrxwy.js:85365-85434 placement
/**
 * 把存储错误描述成 “code telemetryCode”。
 */
function describeStorageError(error) {
  let code = telemetryCodeOf(error);
  return code === undefined ? error.code : `${error.code} ${code}`;
}
//@ chunk-fmnbrxwy.js:85434-86017 placement
/**
 * 列出存储中的反馈草稿键。
 */
async function listFeedbackDraftKeys(storage) {
  let keys = [];
  let allPages = await readAllPages(
    (cursor) =>
      storage.listEntries(
        {
          namespace: "feedbackDraft",
        },
        {
          cursor,
          skipKeyStats: true,
        },
      ),
    (items) => {
      for (let item of items)
        if (item.kind === "key" && item.key.namespace === "feedbackDraft") keys.push(item.key);
    },
  );
  if (allPages.status === "done") return keys;
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
//@ chunk-fmnbrxwy.js:86017-86026 placement
/**
 * 逐块读取转录时的块大小（8）。
 */
var TAIL_READ_BLOCK_CHARS = 8;
//@ chunk-fmnbrxwy.js:86026-86473 placement
/**
 * 创建转录尾部读取器。
 */
function createTranscriptTailReader(storage, keys, tail) {
  let toBuffer = (item) => (item.found ? Buffer.from(item.value) : null);
  let readOne = async (key) => {
    try {
      let result = await storage.read([
        {
          key,
          tail,
        },
      ]);
      return result.ok ? toBuffer(result.value.items[0]) : null;
    } catch {
      return null;
    }
  };
  let blockStart = -1;
  let block = [];
  return async (keyIndex) => {
    let nextStart = keyIndex - (keyIndex % TAIL_READ_BLOCK_CHARS);
    if (nextStart !== blockStart) {
      let sliced = keys.slice(nextStart, nextStart + TAIL_READ_BLOCK_CHARS);
      let batchResult = await storage
        .read(
          sliced.map((key) => ({
            key,
            tail,
          })),
        )
        .catch(() => {
          return;
        });
      block = [];
      if (batchResult?.ok && batchResult.value.items.length === sliced.length)
        block = batchResult.value.items.map(toBuffer);
      else for (let key of sliced) block.push(await readOne(key));
      blockStart = nextStart;
    }
    return block[keyIndex - nextStart] ?? null;
  };
}
//@ chunk-fmnbrxwy.js:86473-86994 placement
/**
 * 定位草稿对应的转录。
 */
async function resolveDraftTranscript(draft) {
  if (!draft.transcript_ref) return null;
  if (!SESSION_ID_RE.test(draft.source_session_id)) return null;
  let { getSessionId } = await import("../../bootstrap/state.js");
  if (draft.source_session_id === getSessionId()) {
    let { getTranscriptPathForSession } = await import("../../utils/sessionStorage.lazy.js");
    return getTranscriptPathForSession(draft.source_session_id);
  }
  let { getProjectDir, getProjectsDir } = await import("../../utils/sessionStoragePortable.js");
  let projectDirKey = draft.transcript_ref.project_dir_key;
  if (projectDirKey !== undefined && PROJECT_DIR_KEY_RE.test(projectDirKey))
    return join(getProjectsDir(), projectDirKey, `${draft.source_session_id}.jsonl`);
  return join(getProjectDir(draft.cwd), `${draft.source_session_id}.jsonl`);
}
//@ chunk-fmnbrxwy.js:86994-87008 placement
/**
 * 佐证草稿时读取的转录尾部大小（256 KiB）。
 */
var MAX_CORROBORATION_TAIL_CHARS = 262144;
//@ chunk-fmnbrxwy.js:87008-87301 placement
/**
 * 检查转录内容是否能佐证反馈草稿（逐行解析 JSONL 查找对应记录）。
 */
function transcriptCorroboratesDraft(jsonl, draft) {
  using size = slowLogging`transcriptContentCorroboratesDraft(${jsonl.length})`;
  for (let line of jsonl.split(`
`)) {
    if (!line) continue;
    let entry;
    try {
      entry = jsonParseRaw(line);
    } catch {
      continue;
    }
    if (typeof entry !== "object" || entry === null) continue;
    if (
      "sessionId" in entry &&
      "cwd" in entry &&
      entry.sessionId === draft.source_session_id &&
      entry.cwd === draft.cwd
    )
      return true;
  }
  return false;
}
//@ chunk-fmnbrxwy.js:87301-87381 placement
/**
 * 按字符截断（不切开代理对）。
 */
function truncateChars(text, maxLen) {
  let list = Array.from(text);
  return list.length <= maxLen ? text : list.slice(0, maxLen).join("");
}
//@ chunk-fmnbrxwy.js:87381-88127 placement
/**
 * 生成反馈草稿对象。
 */
function createFeedbackDraft(input, now = new Date()) {
  let projectDirKey = input.transcriptFile ? projectDirKey_2(input.transcriptFile) : undefined;
  return {
    draft_id: randomUUID(),
    created_at: now.toISOString(),
    source_session_id: input.sessionId,
    cwd: sanitizeShortText(input.cwd, MAX_CWD_LENGTH),
    model: sanitizeModel(input.model),
    cli_version: sanitizeShortText(input.cliVersion, MAX_CLI_VERSION_LENGTH),
    os: sanitizeShortText(input.os, MAX_OS_LENGTH),
    request_ids: recentEntries(input.requestIds),
    type: input.type,
    title: sanitizeTitle(input.title),
    details: sanitizeDetails(input.details),
    area: sanitizeArea(input.area),
    failure_mode: input.failureMode,
    task_category: input.taskCategory,
    trigger: input.trigger,
    effort: sanitizeEffort(input.effort),
    thinking_type: input.thinkingType,
    thinking_budget: asTokenCount(input.thinkingBudget),
    message_count: asTokenCount(input.messageCount),
    assistant_turn_count: asTokenCount(input.assistantTurnCount),
    subagent_count: asTokenCount(input.subagentCount),
    transcript_ref: input.transcriptFile
      ? {
          session_file: input.transcriptFile,
          message_range: null,
          project_dir_key: projectDirKey,
        }
      : null,
    status: "queued",
  };
}
//@ chunk-fmnbrxwy.js:88127-88185 placement
/**
 * 从转写文件路径取项目目录键。
 */
function projectDirKey_2(transcriptFile) {
  let dirName = basename(dirname(transcriptFile));
  return PROJECT_DIR_KEY_RE.test(dirName) ? dirName : undefined;
}
//@ chunk-fmnbrxwy.js:88185-89344 placement
/**
 * 保存反馈草稿（大小上限）。
 */
async function saveFeedbackDraft(draft, now = new Date(), storageV5) {
  let text = jsonStringify(draft, null, 2);
  if (text === undefined || Buffer.byteLength(text, "utf8") > MAX_TRANSCRIPT_TAIL_BYTES)
    return {
      success: false,
      reason: "too_large",
    };
  if (storageV5) {
    let writeResult;
    try {
      writeResult = await storageV5.write(draftStorageKey(draft.draft_id), text, {
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
    if (!writeResult.ok) {
      logForDebugging(`feedbackDrafts: draft write failed: ${describeStorageError(writeResult.error)}`, {
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
      await fileReader.atomicWrite(draftFilePath(draft.draft_id), text, 384);
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
  let evicted = [];
  try {
    let { queued } = await listFeedbackDrafts(
      {
        now,
        skipTranscriptCheck: true,
      },
      storageV5,
    );
    if (queued.length > MAX_QUEUED_DRAFTS) {
      let sorted = queued.slice().sort((left, right) => left.created_at.localeCompare(right.created_at));
      for (let oldDraft of sorted.slice(0, queued.length - MAX_QUEUED_DRAFTS)) {
        await deleteFeedbackDraft(oldDraft.draft_id, storageV5);
        evicted.push(oldDraft);
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
    draft,
    evicted,
  };
}
//@ chunk-fmnbrxwy.js:89344-90720 placement
/**
 * 列出排队/过期的反馈草稿。
 */
async function listFeedbackDrafts(options, storage) {
  let now = options?.now ?? new Date();
  let lightweight = options?.lightweight === true;
  let skipTranscriptCheck = lightweight || options?.skipTranscriptCheck === true;
  let fileNames;
  let readDraftTail;
  let fileReader = storage ? undefined : getFileReader();
  if (storage) {
    let draftKeys = await listFeedbackDraftKeys(storage);
    if (draftKeys === null)
      return {
        queued: [],
        expired: [],
      };
    fileNames = draftKeys.map((key) => `${key.draftId}.json`);
    readDraftTail = createTranscriptTailReader(storage, draftKeys, MAX_TRANSCRIPT_TAIL_BYTES + 1);
  } else {
    if (isDiskless())
      return {
        queued: [],
        expired: [],
      };
    let entries;
    try {
      entries = await fileReader.list(feedbackDraftsDir());
    } catch (error) {
      if (isFsInaccessible(error))
        return {
          queued: [],
          expired: [],
        };
      throw error;
    }
    fileNames = entries.filter((name) => name.endsWith(".json"));
  }
  let queued = [];
  let expired = [];
  let invalidCount = 0;
  let oversizedCount = 0;
  for (let [index, name] of fileNames.entries()) {
    let draft;
    try {
      let tail =
        readDraftTail === undefined
          ? await fileReader.readTail(join(feedbackDraftsDir(), name), MAX_TRANSCRIPT_TAIL_BYTES + 1)
          : await readDraftTail(index);
      if (tail === null) continue;
      if (tail.length > MAX_TRANSCRIPT_TAIL_BYTES) {
        oversizedCount++;
        continue;
      }
      using size = slowLogging`listFeedbackDrafts parse(${tail.length})`;
      let parsed = jsonParseRaw(tail.toString("utf8"));
      let validated = FeedbackDraftSchema().safeParse(parsed);
      if (!validated.success) {
        let draftId = parsed?.draft_id;
        if (typeof draftId === "string" && !DRAFT_ID_RE.test(draftId)) invalidCount++;
        continue;
      }
      draft = validated.data;
    } catch {
      continue;
    }
    if (name !== `${draft.draft_id}.json`) {
      invalidCount++;
      continue;
    }
    if (draft.status !== "queued") continue;
    let timestamp = Date.parse(draft.created_at);
    if (Number.isFinite(timestamp) && now.getTime() - timestamp > DRAFT_RETENTION_MS) {
      if (lightweight) continue;
      if (await deleteFeedbackDraft(draft.draft_id, storage).catch(() => false)) {
        expired.push(draft);
        logEvent("tengu_feedback_draft_expired", {
          type: fromEnum(draft.type),
          trigger: fromEnum(draft.trigger),
          age_days: fromNumber(Math.round((now.getTime() - timestamp) / 86400000)),
        });
      }
      continue;
    }
    queued.push({
      ...draft,
      transcriptAvailable: skipTranscriptCheck ? false : await verifyDraftTranscript(draft, storage),
    });
  }
  queued.sort((left, right) => right.created_at.localeCompare(left.created_at));
  if (invalidCount > 0)
    logEvent("tengu_feedback_draft_invalid_id", {
      count: fromNumber(invalidCount),
    });
  if (oversizedCount > 0)
    logEvent("tengu_feedback_draft_oversized_file", {
      count: fromNumber(oversizedCount),
    });
  return {
    queued,
    expired,
  };
}
//@ chunk-fmnbrxwy.js:90720-90901 placement (2.1.88 match: getErrorsPath, 0.79)
function parseTranscriptPathUnder(draftTranscript, projectsDir) {
  if (!draftTranscript.endsWith(".jsonl")) return;
  let dir = dirname(draftTranscript);
  let dirName = basename(dir);
  let sliced = basename(draftTranscript).slice(0, -6);
  if (dirname(dir) !== projectsDir || !isValidKeySegment(dirName) || !isValidKeySegment(sliced)) return;
  let parts = STORAGE_SPACES.transcript(dirName, sliced);
  return validateStorageKey(parts) === undefined ? parts : undefined;
}
//@ chunk-fmnbrxwy.js:90901-91470 placement
/**
 * 核对草稿的转录。
 */
async function verifyDraftTranscript(draft, storage) {
  let draftTranscript = await resolveDraftTranscript(draft);
  if (draftTranscript === null) return false;
  let { getSessionId } = await import("../../bootstrap/state.js");
  let fromThisSession = draft.source_session_id === getSessionId();
  if (storage) {
    let { getProjectsDir } = await import("../../utils/sessionStoragePortable.js");
    let transcriptPathUnder = parseTranscriptPathUnder(draftTranscript, getProjectsDir());
    if (transcriptPathUnder !== undefined)
      try {
        if (fromThisSession) return (await storage.statMeta(transcriptPathUnder)).ok;
        let readResult = await storage.read([
          {
            key: transcriptPathUnder,
            tail: MAX_CORROBORATION_TAIL_CHARS,
          },
        ]);
        if (!readResult.ok) return false;
        let [item] = readResult.value.items;
        return item.found && transcriptCorroboratesDraft(Buffer.from(item.value).toString("utf8"), draft);
      } catch {
        return false;
      }
  }
  if (fromThisSession)
    try {
      await getFileReader().stat(draftTranscript);
      return true;
    } catch {
      return false;
    }
  try {
    let tail = await getFileReader().readTail(draftTranscript, MAX_CORROBORATION_TAIL_CHARS);
    return transcriptCorroboratesDraft(tail.toString("utf8"), draft);
  } catch {
    return false;
  }
}
//@ chunk-fmnbrxwy.js:91470-91779 placement
/**
 * 删除反馈草稿。
 */
async function deleteFeedbackDraft(id, storage) {
  if (storage) {
    let result = await storage.delete(draftStorageKey(id));
    if (!result.ok) {
      if (isFsInaccessibleCode(telemetryCodeOf(result.error))) return false;
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `feedback draft delete failed: ${describeStorageError(result.error)}`,
        "feedback draft delete failed",
      );
    }
    return result.value.existed;
  }
  if (isDiskless()) return false;
  try {
    await getFileReader().delete(draftFilePath(id));
    return true;
  } catch (error) {
    if (!isENOENT(error) && !isFsInaccessible(error)) throw error;
    return false;
  }
}
//@ chunk-fmnbrxwy.js:91779-91888 placement
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
  return countWhere(queued, (draft) => draft.source_session_id === sessionId);
}
//@ chunk-fmnbrxwy.js:91888-91917 placement
/**
 * 提示里模型名最多展示的字符数（6）。
 */
var MAX_TITLE_PREVIEW_CHARS = 20;
var MAX_NOTICE_PROMPT_CHARS = 160;
var MAX_NOTICE_LINES = 4;
var MAX_NOTICE_MODEL_CHARS = 6;
//@ chunk-fmnbrxwy.js:91917-92220 placement
/**
 * 记录新草稿并决定是否提示用户。
 */
function noteFeedbackDraft(notice) {
  let kind = "silent";
  uiSignals.feedbackNotice.setState((state) => {
    let next = {
      ...state,
      sessionDraftCount: state.sessionDraftCount + 1,
    };
    if (state.notice !== null) {
      kind = "notice_pending";
      next.notice = notice;
      return next;
    }
    if (state.promptedCount >= getMaxDraftPromptsPerSession()) {
      kind = "silent";
      return next;
    }
    next.promptedCount = state.promptedCount + 1;
    kind = "notice_pending";
    next.notice = notice;
    return next;
  });
  return kind;
}
//@ chunk-fmnbrxwy.js:92220-92372 placement
/**
 * 在未达上限时把反馈工具调用计数加一，返回是否计数成功。
 */
function tryCountFeedbackToolCall() {
  let counted = false;
  uiSignals.feedbackNotice.setState((state) => {
    if (state.toolCallCount >= getMaxToolCallsPerSession()) return state;
    counted = true;
    return {
      ...state,
      toolCallCount: state.toolCallCount + 1,
    };
  });
  return counted;
}
//@ chunk-fmnbrxwy.js:92372-92464 placement
/**
 * 关闭指定草稿的提示。
 */
function dismissFeedbackNotice_2(draftId) {
  uiSignals.feedbackNotice.setState((state) =>
    state.notice?.draftId === draftId
      ? {
          ...state,
          notice: null,
        }
      : state,
  );
}
//@ chunk-fmnbrxwy.js:92464-92549 placement
/**
 * 关闭反馈提示。
 */
function dismissFeedbackNotice() {
  uiSignals.feedbackNotice.setState((state) =>
    state.notice === null
      ? state
      : {
          ...state,
          notice: null,
        },
  );
}
//@ chunk-fmnbrxwy.js:92549-92701 placement
/**
 * 标记某草稿的提示已记录过遥测，首次标记返回 true。
 */
function markDraftNoticeLogged(draftId) {
  let logged = false;
  uiSignals.feedbackNotice.setState((state) => {
    if (state.shownLoggedForDraftId === draftId) return state;
    logged = true;
    return {
      ...state,
      shownLoggedForDraftId: draftId,
    };
  });
  return logged;
}
//@ chunk-fmnbrxwy.js:92701-92813 placement
/**
 * 把会话草稿计数减少指定数量（不低于 0）。
 */
function decrementSessionDraftCount(amount = 1) {
  uiSignals.feedbackNotice.setState((state) => ({
    ...state,
    sessionDraftCount: Math.max(0, state.sessionDraftCount - amount),
  }));
}
//@ chunk-fmnbrxwy.js:92813-92959 placement
/**
 * 尝试开始从磁盘初始化草稿计数，仅首次返回 true。
 */
function tryStartDraftSeed() {
  let started = false;
  uiSignals.feedbackNotice.setState((state) => {
    if (state.seedStarted || state.seededFromDisk) return state;
    started = true;
    return {
      ...state,
      seedStarted: true,
    };
  });
  return started;
}
//@ chunk-fmnbrxwy.js:92959-93120 placement
/**
 * 用磁盘上的草稿数初始化会话草稿计数（只做一次，取较大值）。
 */
function seedSessionDraftCount(count) {
  uiSignals.feedbackNotice.setState((state) => {
    if (state.seededFromDisk) return state;
    return {
      ...state,
      seededFromDisk: true,
      sessionDraftCount: Math.max(state.sessionDraftCount, count),
    };
  });
}
//@ chunk-fmnbrxwy.js:93120-93258 placement
/**
 * 直接设置会话草稿计数并标记已从磁盘初始化。
 */
function setSessionDraftCount(count) {
  uiSignals.feedbackNotice.setState((state) =>
    state.sessionDraftCount === count && state.seededFromDisk
      ? state
      : {
          ...state,
          seededFromDisk: true,
          sessionDraftCount: count,
        },
  );
}
export {
  tryStartDraftSeed,
  countSessionQueuedDrafts,
  seedSessionDraftCount,
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
  dismissFeedbackNotice_2,
  listFeedbackDrafts,
  FEEDBACK_TYPES,
  MEMORY_TOOLS,
  MAX_TITLE_PREVIEW_CHARS,
  markDraftNoticeLogged,
  dismissFeedbackNotice,
  MAX_NOTICE_MODEL_CHARS,
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
