/**
 * memdir/memoryTool.ts
 *
 * 2.1.316 新增：记忆工具名（memory_write/read/append/str_replace 等）与读写集合；读取 CLAUDE_CODE_POST_TURN_MEMORY_CONFIG（回合后记忆提取配置）等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-aepeg2w5.js (28)
 * attribution: placement 28
 */
import { randomUUID } from "crypto";
import { TRUNCATE_MIDDLE_CHARS } from "../constants/outputLimits.js";
import { MAX_ERROR_TEXT_CHARS, TRUNCATION_MARKER_RE, formatError } from "../utils/toolErrors.js";
import { truncateMiddle as truncateMiddle_2, truncateToLength } from "../utils/stringUtils.js";
import {
  MEMORY as MEMORY_2,
  MEMORY_TOOL_PREFIX as MEMORY_TOOL_PREFIX_2,
} from "../services/mcp/firstPartyServerIds.js";
import { DoctorLazy } from "../cli/handlers/util.js";
import {
  booleanSchema,
  _enum,
  objectSchema,
  stringSchema,
  int,
  zodStrictObject,
  numberSchema,
} from "../../vendor/zod/v4/classic/schemas.js";
import { env } from "../utils/env.js";
import { safeParseJSON } from "../utils/json.js";
import { isCcrMemoryMcpServer } from "../services/mcp/ccrMcpUrls.js";
import { isLocalAgentSession } from "../utils/sessionShape.js";
import { isCliOwnedConfig } from "../services/mcp/cliOwnedClients.js";
import { McpToolCallError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from "../services/mcp/client.js";
import { logEvent } from "../services/analytics/index.js";
import { lit } from "../services/analytics/safeMetadata.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-aepeg2w5.js:51611-51894 placement
/**
 * 过长文本从中间截断并插入"N characters truncated"标记（合并已有标记）。
 */
function truncateMiddle(text, keepChars = TRUNCATE_MIDDLE_CHARS) {
  if (text.length <= keepChars + MAX_ERROR_TEXT_CHARS) return text;
  let floored = Math.floor(keepChars / 2);
  return truncateMiddle_2(text, floored, keepChars - floored, (truncated) => {
    let sliced = text.slice(floored, text.length - (keepChars - floored));
    let markerAdjust = 0;
    for (let markerMatch of sliced.matchAll(TRUNCATION_MARKER_RE)) {
      let markerCount = markerMatch[1].length <= 15 ? Number(markerMatch[1]) : Number.NaN;
      if (Number.isSafeInteger(markerCount) && markerCount >= markerMatch[0].length)
        markerAdjust += markerCount - markerMatch[0].length;
    }
    return formatError(truncated + markerAdjust);
  });
}
//@ chunk-aepeg2w5.js:51894-51918 placement
/**
 * 栈帧行正则
 */
var STACK_FRAME_RE = /^\s*at /;
var MAX_STACK_LINE_CHARS = 500;
//@ chunk-aepeg2w5.js:51918-52119 placement
/**
 * 把错误名、消息与前几帧栈压缩成一段简短文本。
 */
function summarizeError({ name: errorName, message, stack }, frameLimit = 5) {
  let header = message ? `${errorName}: ${message}` : errorName;
  let frames = stack
    ? stack
        .split(
          `
`,
        )
        .filter((line) => STACK_FRAME_RE.test(line))
        .slice(0, frameLimit)
        .map((line) =>
          line.length > MAX_STACK_LINE_CHARS ? `${truncateToLength(line, MAX_STACK_LINE_CHARS)}\u2026` : line,
        )
    : [];
  return truncateMiddle(
    [truncateMiddle(header), ...frames].join(`
`),
  );
}
//@ chunk-aepeg2w5.js:52119-52851 placement
/**
 * 同形异义字符（西里尔等）到拉丁字母的映射，用于检测伪装文本。
 */
var HOMOGLYPH_MAP; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var regExp;
deferInit("chunk-aepeg2w5.js:52119", () => {
  HOMOGLYPH_MAP = {
    а: "a",
    т: "t",
    օ: "o",
    ո: "n",
    е: "e",
    о: "o",
    р: "p",
    с: "c",
    у: "y",
    х: "x",
    і: "i",
    ѕ: "s",
    ј: "j",
    һ: "h",
    ԁ: "d",
    ԛ: "q",
    ԝ: "w",
    ѵ: "v",
    А: "A",
    Е: "E",
    О: "O",
    Р: "P",
    С: "C",
    У: "Y",
    Х: "X",
    І: "I",
    Ѕ: "S",
    Ј: "J",
    Н: "H",
    М: "M",
    Т: "T",
    В: "B",
    К: "K",
    α: "a",
    ε: "e",
    ι: "i",
    ο: "o",
    υ: "u",
    τ: "t",
    ν: "v",
    κ: "k",
    ρ: "p",
    Α: "A",
    Ε: "E",
    Ι: "I",
    Ο: "O",
    Υ: "Y",
    Τ: "T",
    Η: "H",
    Μ: "M",
    Ν: "N",
    Ρ: "P",
    Κ: "K",
    Β: "B",
    Ζ: "Z",
    Χ: "X",
  };
  regExp = new RegExp(`[${Object.keys(HOMOGLYPH_MAP).join("")}]`, "g");
});
//@ chunk-aepeg2w5.js:52851-53713 placement
/**
 * 记忆/召回相关判断用的否定词表（no、not、never、stop、avoid、forbid、exclude 等及其屈折形式）。
 */
var NEGATION_WORDS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var NEGATION_VERB_SET;
deferInit("chunk-aepeg2w5.js:52851", () => {
  NEGATION_WORDS = new Set(
    "no not never dont doesnt didnt wont cant cannot shouldnt isnt arent wasnt nor without stop stops stopped stopping avoid avoids avoided avoiding mustnt couldnt wouldnt havent hasnt hadnt werent neednt aint shant mightnt oughtnt darent rarely hardly seldom barely scarcely neither none nothing nobody skip skips skipped skipping omit omits omitted omitting ban bans banned banning forbid forbids forbade forbidden forbidding exclude excludes excluded excluding prohibit prohibits prohibited prohibiting disallow disallows disallowed disallowing".split(
      " ",
    ),
  );
  NEGATION_VERB_SET = new Set([
    ...NEGATION_WORDS,
    ..."refuse refuses refused refusing reject rejects rejected rejecting decline declines declined declining dislike dislikes disliked disliking hate hates hated hating oppose opposes opposed opposing refrain refrains refrained refraining against except unless".split(
      " ",
    ),
  ]);
});
//@ chunk-aepeg2w5.js:53713-53859 placement
var STOP_WORDS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-aepeg2w5.js:53713", () => {
  STOP_WORDS = new Set(
    "a an the to of in on at by for and or but then as is be it i me my we our you your with from that this than so if do".split(
      " ",
    ),
  );
});
//@ chunk-aepeg2w5.js:53859-53947 placement
/**
 * cited_turn/contiguous/off
 */
function normalizeTypedEvidenceMode(personFilesTypedEvidence) {
  return personFilesTypedEvidence === "cited_turn"
    ? "cited_turn"
    : personFilesTypedEvidence === "contiguous"
      ? "contiguous"
      : "off";
}
//@ chunk-aepeg2w5.js:53947-54108 placement
var DEMONSTRATIVE_WORDS_2; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var WEAK_REFERENCE_WORDS;
deferInit("chunk-aepeg2w5.js:53947", () => {
  DEMONSTRATIVE_WORDS_2 = new Set(
    "these those this following any all things thing ones one either below".split(" "),
  );
  WEAK_REFERENCE_WORDS = new Set("it that this those me so in on at by".split(" "));
});
//@ chunk-aepeg2w5.js:54108-54175 placement
/**
 * 指示代词表
 */
var DEMONSTRATIVE_WORDS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-aepeg2w5.js:54108", () => {
  DEMONSTRATIVE_WORDS = new Set("these those this following below ones".split(" "));
});
//@ chunk-aepeg2w5.js:54175-54193 placement
/**
 * 记忆工具所属服务器名（memory）与工具名前缀。
 */
var MEMORY; // deferred: uses MEMORY (../services/mcp/firstPartyServerIds.js) of its import cycle while loading; runs once the cycle is complete
var MEMORY_TOOL_PREFIX;
deferInit("chunk-aepeg2w5.js:54175", () => {
  MEMORY = MEMORY_2;
  MEMORY_TOOL_PREFIX = MEMORY_TOOL_PREFIX_2;
});
//@ chunk-aepeg2w5.js:54193-56473 placement
/**
 * 记忆 MCP 工具名集合（memory_read/write/append/str_replace/delete 与只读的 read/list/search）及各自的参数、结果 schema。
 */
var MEMORY_WRITE_TOOL; // deferred: uses MEMORY of its import cycle while loading; runs once the cycle is complete
var MEMORY_READ_TOOL;
var MEMORY_APPEND_TOOL;
var MEMORY_STR_REPLACE_TOOL;
var MEMORY_BACKGROUND_ALLOWED_TOOLS;
var MEMORY_MUTATING_TOOLS;
var MEMORY_TOOL_NAME_RE;
var MEMORY_SEARCH_TOOLS;
var MEMORY_READ;
var memoryCallArgsSchema;
var memoryReadArgsSchema;
var memoryWriteArgsSchema;
var MAX_INSTRUCTION_CHARS;
var MAX_STR_REPLACE_INPUT_CHARS;
var DEFAULT_STR_REPLACE_INPUT_CHARS;
var memoryStrReplaceArgsSchema;
var memoryDeleteArgsSchema;
var memoryCallResultSchema;
var memorySearchResultSchema;
var postTurnMemoryConfigSchema;
deferInit("chunk-aepeg2w5.js:54193", () => {
  MEMORY_WRITE_TOOL = `${MEMORY_TOOL_PREFIX}write`;
  MEMORY_READ_TOOL = `${MEMORY_TOOL_PREFIX}read`;
  MEMORY_APPEND_TOOL = `${MEMORY_TOOL_PREFIX}append`;
  MEMORY_STR_REPLACE_TOOL = `${MEMORY_TOOL_PREFIX}str_replace`;
  MEMORY_BACKGROUND_ALLOWED_TOOLS = new Set(
    ["read", "write", "str_replace", "append"].map((shortName) => `${MEMORY_TOOL_PREFIX}${shortName}`),
  );
  MEMORY_MUTATING_TOOLS = new Set(
    ["write", "str_replace", "append", "delete"].map((shortName) => `${MEMORY_TOOL_PREFIX}${shortName}`),
  );
  MEMORY_TOOL_NAME_RE = /^memory_[a-z_]+$/;
  MEMORY_SEARCH_TOOLS = new Set(["memory_read", "memory_list", "memory_search"]);
  MEMORY_READ = "memory_read";
  memoryCallArgsSchema = DoctorLazy(() => ({
    attachments: booleanSchema().default(true),
    instruction_files: booleanSchema().default(true),
    first_window: _enum(["full", "ignore_session_start_blocks"]).default("full"),
  }));
  memoryReadArgsSchema = {
    attachments: true,
    instruction_files: true,
    first_window: "full",
  };
  memoryWriteArgsSchema = DoctorLazy(() => _enum(["window", "last5", "none"]).default("window"));
  MAX_INSTRUCTION_CHARS = 49152;
  MAX_STR_REPLACE_INPUT_CHARS = 8192;
  DEFAULT_STR_REPLACE_INPUT_CHARS = 12000;
  memoryStrReplaceArgsSchema = DoctorLazy(() =>
    objectSchema({
      mode: _enum(["off", "shadow", "enforce"]),
      instruction: stringSchema()
        .min(1)
        .refine((instruction) => [...instruction].length <= MAX_STR_REPLACE_INPUT_CHARS),
      model: stringSchema().min(1).max(200).optional(),
      max_input_chars: int().min(500).max(50000).default(DEFAULT_STR_REPLACE_INPUT_CHARS),
    }),
  );
  memoryDeleteArgsSchema = DoctorLazy(() =>
    objectSchema({
      mode: _enum(["off", "shadow"]),
      model: stringSchema().min(1).max(200),
      max_input_chars: int().min(500).max(20000).default(20000),
      form: _enum(["turns", "inline"]).catch("turns"),
    }),
  );
  memoryCallResultSchema = DoctorLazy(() =>
    objectSchema({
      instruction: stringSchema().min(1).max(MAX_INSTRUCTION_CHARS),
      every_n_turns: int().min(1).max(100).default(5),
      max_turns: int().min(1).max(8).default(4),
      idle_flush_s: int().min(0).max(86400).default(120),
      idle_flush_min_turns: int().min(1).max(20).catch(1),
      prose_gate: _enum(["legacy", "chat"]).catch("legacy"),
      min_prose_words: int().min(1).max(50).catch(3),
      review_window: int().min(1).max(100).optional().catch(undefined),
      when_overage: _enum(["run", "first_look", "skip"]).catch("run"),
      first_look: memoryStrReplaceArgsSchema().optional().catch(undefined),
      smaller_pass: memoryDeleteArgsSchema().optional().catch(undefined),
      extract_transport: _enum(["tools", "text", "tools_cached"]).default("tools"),
      thinking_strip: memoryWriteArgsSchema().catch("window"),
      stale_note: booleanSchema().catch(false),
      carry_across_restarts: booleanSchema().catch(false),
      declare_task: booleanSchema().catch(false),
      role_line_scan: objectSchema(memoryCallArgsSchema()).default(memoryReadArgsSchema),
      person_files_writable: booleanSchema().default(false),
      people_writable: booleanSchema().default(false),
      person_files_typed_evidence: _enum(["cited_turn", "contiguous"]).optional(),
      typed_origin: _enum(["presume"]).optional(),
      cited_shared_word: _enum(["refuse"]).optional(),
      cite_span: _enum(["floor"]).optional(),
    }),
  );
  memorySearchResultSchema = DoctorLazy(() =>
    memoryCallResultSchema().extend({
      role_line_scan: zodStrictObject(memoryCallArgsSchema()).default(memoryReadArgsSchema),
      thinking_strip: memoryWriteArgsSchema(),
    }),
  );
  postTurnMemoryConfigSchema = DoctorLazy(() =>
    objectSchema({
      turns: int().min(0).max(100),
      cursor: stringSchema()
        .min(1)
        .max(100)
        .nullish()
        .transform((cursor) => cursor ?? null),
      tail: stringSchema()
        .min(1)
        .max(100)
        .nullish()
        .transform((tail) => tail ?? null),
      passAt: numberSchema()
        .nullish()
        .transform((passedAt) => passedAt ?? null),
    }),
  );
});
//@ chunk-aepeg2w5.js:56473-56542 placement
/**
 * 解析 CLAUDE_CODE_POST_TURN_MEMORY_CONFIG 得到 hosted 记忆提取配置，非法时返回 null。
 */
function parsePostTurnMemoryConfig(raw) {
  let parsed = postTurnMemoryConfigSchema().safeParse(raw);
  return parsed.success ? parsed.data : null;
}
//@ chunk-aepeg2w5.js:56542-56624 placement
/**
 * CLAUDE_CODE_POST_TURN_MEMORY 打开时解析 CLAUDE_CODE_POST_TURN_MEMORY_CONFIG 得到 hosted 提取配置，否则 null。
 */
function getHostedPostTurnMemoryConfig() {
  if (!env.CLAUDE_CODE_POST_TURN_MEMORY) return null;
  return getPostTurnMemoryConfig("hosted");
}
//@ chunk-aepeg2w5.js:56624-58221 placement
/**
 * 解析 post-turn 记忆配置 JSON：instruction、every_n_turns、max_turns、idle_flush_s、prose_gate、min_prose_words、review_window、when_overage 等；CLAUDE_CODE_POST_TURN_MEMORY_SYNC 时每轮同步执行。
 */
function getPostTurnMemoryConfig(context = "dry_run_harness") {
  let parsed = (context === "hosted" ? memoryCallResultSchema() : memorySearchResultSchema()).safeParse(
    safeParseJSON(env.CLAUDE_CODE_POST_TURN_MEMORY_CONFIG, false),
  );
  if (!parsed.success) return null;
  let CLAUDE_CODE_POST_TURN_MEMORY_SYNC = env.CLAUDE_CODE_POST_TURN_MEMORY_SYNC;
  return {
    instruction: parsed.data.instruction,
    everyNTurns: CLAUDE_CODE_POST_TURN_MEMORY_SYNC ? 1 : parsed.data.every_n_turns,
    maxTurns: parsed.data.max_turns,
    idleFlushSeconds: CLAUDE_CODE_POST_TURN_MEMORY_SYNC ? 0 : parsed.data.idle_flush_s,
    idleFlushMinTurns: parsed.data.idle_flush_min_turns,
    proseGate: parsed.data.prose_gate,
    minProseWords: parsed.data.min_prose_words,
    reviewWindow: Math.max(parsed.data.review_window ?? 0, parsed.data.every_n_turns, 1),
    whenOverage: parsed.data.when_overage,
    firstLook: parsed.data.first_look && {
      mode: parsed.data.first_look.mode,
      instruction: parsed.data.first_look.instruction,
      model: parsed.data.first_look.model,
      maxInputChars: parsed.data.first_look.max_input_chars,
    },
    smallerPass: parsed.data.smaller_pass && {
      mode: parsed.data.smaller_pass.mode,
      model: parsed.data.smaller_pass.model,
      maxInputChars: parsed.data.smaller_pass.max_input_chars,
      form: parsed.data.smaller_pass.form,
    },
    staleNote: parsed.data.stale_note,
    carryAcrossRestarts: !CLAUDE_CODE_POST_TURN_MEMORY_SYNC && parsed.data.carry_across_restarts,
    declareTask: parsed.data.declare_task,
    sync: CLAUDE_CODE_POST_TURN_MEMORY_SYNC,
    extractTransport: parsed.data.extract_transport,
    thinkingStrip: parsed.data.thinking_strip,
    roleLineScan: {
      attachments: parsed.data.role_line_scan.attachments,
      instructionFiles: parsed.data.role_line_scan.instruction_files,
      firstWindow: parsed.data.role_line_scan.first_window,
    },
    personFilesWritable: parsed.data.person_files_writable,
    peopleWritable: parsed.data.people_writable,
    personFilesTypedEvidence: normalizeTypedEvidenceMode(parsed.data.person_files_typed_evidence),
    personFilesTypedStampedOnly: parsed.data.typed_origin !== "presume",
    personFilesCitedSharedWordRefused: parsed.data.cited_shared_word === "refuse",
    personFilesCiteSinceFloor: parsed.data.cite_span === "floor",
  };
}
//@ chunk-aepeg2w5.js:58221-58277 placement
/**
 * 判断 MCP 服务器是否是账户记忆服务器。
 */
function isAccountMemoryServer(server) {
  return server !== undefined && isCcrMemoryMcpServer(server.name, server.config);
}
//@ chunk-aepeg2w5.js:58277-58443 placement
var MEMORY_ANSWER_MAX_CHARS = 65536;
var MEMORY_TRUNCATION_NOTE =
  "[Note: the file content above is incomplete \u2014 see the 'characters truncated' marker. Call memory_read on this path before rewriting the file.]";
//@ chunk-aepeg2w5.js:58443-58483 placement
/**
 * 本地 agent 会话里的动态记忆服务器
 */
function isLocalAgentDynamicMemoryServer(server, toolName) {
  return isDynamicMemorySdkServer(server, toolName) && isLocalAgentSession();
}
//@ chunk-aepeg2w5.js:58483-58598 placement
function isDynamicMemorySdkServer(server, toolName) {
  return (
    server?.name === MEMORY &&
    server.config.scope === "dynamic" &&
    server.config.type === "sdk" &&
    !isCliOwnedConfig(server.config) &&
    MEMORY_TOOL_NAME_RE.test(toolName)
  );
}
//@ chunk-aepeg2w5.js:58598-58667 placement
/**
 * 判断连接是否属于记忆服务器（账户记忆、内置等）。
 */
function isMemoryServerConnection(client, toolName) {
  return (
    isAccountMemoryServer(client) ||
    isDynamicMemorySdkServer(client, toolName) ||
    (client?.name === MEMORY && isCliOwnedConfig(client.config))
  );
}
//@ chunk-aepeg2w5.js:58667-58737 placement
/**
 * 该服务器是否提供记忆工具
 */
function isMemoryToolServer(server, name) {
  return (
    isAccountMemoryServer(server) ||
    isLocalAgentDynamicMemoryServer(server, name) ||
    (server?.name === MEMORY && isCliOwnedConfig(server.config))
  );
}
//@ chunk-aepeg2w5.js:58737-58770 placement
/**
 * 判断是否为提供记忆工具的服务器。
 */
function isMemoryToolServer_2(server) {
  return isMemoryToolServer(server, MEMORY_READ);
}
//@ chunk-aepeg2w5.js:58770-58906 placement
/**
 * 记忆服务器工具错误的脱敏描述：只给出长度，不记录正文（可能含用户记忆文件）。
 */
function describeRedactedMcpError(answer) {
  return `McpToolCallError (${answer.length} chars; text not logged: memory server answers can contain the user's memory file)`;
}
//@ chunk-aepeg2w5.js:58906-59173 placement
/**
 * 对记忆服务器的 MCP 工具错误放宽错误文本上限并附加截断提示，记录 tengu_mcp_memory_answer_cap。
 */
function raiseMemoryErrorCap(error, server, toolName) {
  if (
    error instanceof McpToolCallError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS &&
    (isAccountMemoryServer(server) || isLocalAgentDynamicMemoryServer(server, toolName))
  ) {
    Object.assign(error, {
      maxErrorChars: MEMORY_ANSWER_MAX_CHARS,
      truncationNote: MEMORY_TRUNCATION_NOTE,
    });
    logEvent("tengu_mcp_memory_answer_cap", {
      kind: lit("capRaised"),
    });
    let trimmed = error.message.trim();
    if (truncateMiddle(trimmed, MEMORY_ANSWER_MAX_CHARS) !== trimmed)
      logEvent("tengu_mcp_memory_answer_cap", {
        kind: lit("noteAppended"),
      });
  }
}
//@ chunk-aepeg2w5.js:59173-59222 placement
/**
 * 从服务器列表里找 memory 服务器
 */
function findMemoryServer(mcpClients) {
  return mcpClients?.find((client) => client.name === MEMORY);
}
//@ chunk-aepeg2w5.js:59222-59320 placement
/**
 * 记忆调用 _meta 键（caller、pass_id、cites_event）。
 */
var MEMORY_CALLER_META_KEY = "anthropic/memory.caller";
var ANTHROPIC_MEMORY_PASS_ID = "anthropic/memory.pass_id";
var ANTHROPIC_MEMORY_CITES_EVENT = "anthropic/memory.cites_event";
//@ chunk-aepeg2w5.js:59320-59415 placement
/**
 * 从调用参数里移除 caller、pass_id、cites_event 三个记忆 _meta 键。
 */
function stripMemoryCallMeta(mcpRequestMeta) {
  if (mcpRequestMeta === undefined || !(MEMORY_CALLER_META_KEY in mcpRequestMeta)) return mcpRequestMeta;
  let {
    [MEMORY_CALLER_META_KEY]: caller,
    [ANTHROPIC_MEMORY_PASS_ID]: passId,
    [ANTHROPIC_MEMORY_CITES_EVENT]: citesEvent,
    ...rest
  } = mcpRequestMeta;
  return rest;
}
//@ chunk-aepeg2w5.js:59415-59436 placement
var MEMEXTRACT = "memextract";
//@ chunk-aepeg2w5.js:59436-59531 placement
/**
 * 构造记忆工具调用的 _meta：caller 固定为 memextract，可带 pass id 与引用事件。
 */
function buildMemoryCallMeta({ passId = randomUUID(), citesEvent } = {}) {
  return {
    [MEMORY_CALLER_META_KEY]: MEMEXTRACT,
    [ANTHROPIC_MEMORY_PASS_ID]: passId,
    ...(citesEvent !== undefined && {
      [ANTHROPIC_MEMORY_CITES_EVENT]: citesEvent,
    }),
  };
}
export {
  truncateMiddle,
  isMemoryToolServer,
  isMemoryToolServer_2,
  isMemoryServerConnection,
  isAccountMemoryServer,
  raiseMemoryErrorCap,
  describeRedactedMcpError,
  summarizeError,
  MEMORY_CALLER_META_KEY,
  getHostedPostTurnMemoryConfig,
  findMemoryServer,
  MEMORY_BACKGROUND_ALLOWED_TOOLS,
  MEMORY_MUTATING_TOOLS,
  buildMemoryCallMeta,
  MEMORY_WRITE_TOOL,
  parsePostTurnMemoryConfig,
  stripMemoryCallMeta,
  MEMORY_SEARCH_TOOLS,
  isLocalAgentDynamicMemoryServer,
  MEMEXTRACT,
  MAX_INSTRUCTION_CHARS,
  MEMORY_TOOL_PREFIX,
};
