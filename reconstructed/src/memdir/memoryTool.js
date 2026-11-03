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
import { M, _enum, u, string, int, zodStrictObject, E } from "../../vendor/zod/v4/classic/schemas.js";
import { env } from "../utils/env.js";
import { safeParseJSON } from "../utils/json.js";
import { isCcrMemoryMcpServer } from "../services/mcp/ccrMcpUrls.js";
import { isLocalAgentSession } from "../utils/sessionShape.js";
import { isCliOwnedConfig } from "../services/mcp/cliOwnedClients.js";
import { McpToolCallError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from "../services/mcp/client.js";
import { logEvent } from "../services/analytics/index.js";
import { lit } from "../services/analytics/safeMetadata.js";

//@ chunk-aepeg2w5.js:51611-51894 placement
/**
 * 过长文本从中间截断并插入"N characters truncated"标记（合并已有标记）。
 */
function truncateMiddle(e, n = TRUNCATE_MIDDLE_CHARS) {
  if (e.length <= n + MAX_ERROR_TEXT_CHARS) return e;
  let floored = Math.floor(n / 2);
  return truncateMiddle_2(e, floored, n - floored, (s) => {
    let sliced = e.slice(floored, e.length - (n - floored));
    let y = 0;
    for (let S of sliced.matchAll(TRUNCATION_MARKER_RE)) {
      let w = S[1].length <= 15 ? Number(S[1]) : Number.NaN;
      if (Number.isSafeInteger(w) && w >= S[0].length) y += w - S[0].length;
    }
    return formatError(s + y);
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
function summarizeError({ name: e, message, stack }, s = 5) {
  let h = message ? `${e}: ${message}` : e;
  let y = stack
    ? stack
        .split(
          `
`,
        )
        .filter((line) => STACK_FRAME_RE.test(line))
        .slice(0, s)
        .map((line) =>
          line.length > MAX_STACK_LINE_CHARS ? `${truncateToLength(line, MAX_STACK_LINE_CHARS)}\u2026` : line,
        )
    : [];
  return truncateMiddle(
    [truncateMiddle(h), ...y].join(`
`),
  );
}
//@ chunk-aepeg2w5.js:52119-52851 placement
/**
 * 同形异义字符（西里尔等）到拉丁字母的映射，用于检测伪装文本。
 */
var HOMOGLYPH_MAP = {
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
var regExp = new RegExp(`[${Object.keys(HOMOGLYPH_MAP).join("")}]`, "g");
//@ chunk-aepeg2w5.js:52851-53713 placement
/**
 * 记忆/召回相关判断用的否定词表（no、not、never、stop、avoid、forbid、exclude 等及其屈折形式）。
 */
var NEGATION_WORDS = new Set(
  "no not never dont doesnt didnt wont cant cannot shouldnt isnt arent wasnt nor without stop stops stopped stopping avoid avoids avoided avoiding mustnt couldnt wouldnt havent hasnt hadnt werent neednt aint shant mightnt oughtnt darent rarely hardly seldom barely scarcely neither none nothing nobody skip skips skipped skipping omit omits omitted omitting ban bans banned banning forbid forbids forbade forbidden forbidding exclude excludes excluded excluding prohibit prohibits prohibited prohibiting disallow disallows disallowed disallowing".split(
    " ",
  ),
);
var NEGATION_VERB_SET = new Set([
  ...NEGATION_WORDS,
  ..."refuse refuses refused refusing reject rejects rejected rejecting decline declines declined declining dislike dislikes disliked disliking hate hates hated hating oppose opposes opposed opposing refrain refrains refrained refraining against except unless".split(
    " ",
  ),
]);
//@ chunk-aepeg2w5.js:53713-53859 placement
var STOP_WORDS = new Set(
  "a an the to of in on at by for and or but then as is be it i me my we our you your with from that this than so if do".split(
    " ",
  ),
);
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
var DEMONSTRATIVE_WORDS_2 = new Set(
  "these those this following any all things thing ones one either below".split(" "),
);
var WEAK_REFERENCE_WORDS = new Set("it that this those me so in on at by".split(" "));
//@ chunk-aepeg2w5.js:54108-54175 placement
/**
 * 指示代词表
 */
var DEMONSTRATIVE_WORDS = new Set("these those this following below ones".split(" "));
//@ chunk-aepeg2w5.js:54175-54193 placement
/**
 * 记忆工具所属服务器名（memory）与工具名前缀。
 */
var MEMORY = MEMORY_2;
var MEMORY_TOOL_PREFIX = MEMORY_TOOL_PREFIX_2;
//@ chunk-aepeg2w5.js:54193-56473 placement
/**
 * 记忆 MCP 工具名集合（memory_read/write/append/str_replace/delete 与只读的 read/list/search）及各自的参数、结果 schema。
 */
var MEMORY_WRITE_TOOL = `${MEMORY_TOOL_PREFIX}write`;
var MEMORY_READ_TOOL = `${MEMORY_TOOL_PREFIX}read`;
var MEMORY_APPEND_TOOL = `${MEMORY_TOOL_PREFIX}append`;
var MEMORY_STR_REPLACE_TOOL = `${MEMORY_TOOL_PREFIX}str_replace`;
var MEMORY_READONLY_TOOLS = new Set(
  ["read", "write", "str_replace", "append"].map((e) => `${MEMORY_TOOL_PREFIX}${e}`),
);
var MEMORY_MUTATING_TOOLS = new Set(
  ["write", "str_replace", "append", "delete"].map((e) => `${MEMORY_TOOL_PREFIX}${e}`),
);
var MEMORY_TOOL_NAME_RE = /^memory_[a-z_]+$/;
var MEMORY_SEARCH_TOOLS = new Set(["memory_read", "memory_list", "memory_search"]);
var MEMORY_READ = "memory_read";
var memoryCallArgsSchema = DoctorLazy(() => ({
  attachments: M().default(true),
  instruction_files: M().default(true),
  first_window: _enum(["full", "ignore_session_start_blocks"]).default("full"),
}));
var memoryReadArgsSchema = {
  attachments: true,
  instruction_files: true,
  first_window: "full",
};
var memoryWriteArgsSchema = DoctorLazy(() => _enum(["window", "last5", "none"]).default("window"));
var memoryListArgsSchema = 49152;
var memorySearchArgsSchema = 8192;
var memoryAppendArgsSchema = 12000;
var memoryStrReplaceArgsSchema = DoctorLazy(() =>
  u({
    mode: _enum(["off", "shadow", "enforce"]),
    instruction: string()
      .min(1)
      .refine((e) => [...e].length <= memorySearchArgsSchema),
    model: string().min(1).max(200).optional(),
    max_input_chars: int().min(500).max(50000).default(memoryAppendArgsSchema),
  }),
);
var memoryDeleteArgsSchema = DoctorLazy(() =>
  u({
    mode: _enum(["off", "shadow"]),
    model: string().min(1).max(200),
    max_input_chars: int().min(500).max(20000).default(20000),
    form: _enum(["turns", "inline"]).catch("turns"),
  }),
);
var memoryCallResultSchema = DoctorLazy(() =>
  u({
    instruction: string().min(1).max(memoryListArgsSchema),
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
    stale_note: M().catch(false),
    carry_across_restarts: M().catch(false),
    declare_task: M().catch(false),
    role_line_scan: u(memoryCallArgsSchema()).default(memoryReadArgsSchema),
    person_files_writable: M().default(false),
    people_writable: M().default(false),
    person_files_typed_evidence: _enum(["cited_turn", "contiguous"]).optional(),
    typed_origin: _enum(["presume"]).optional(),
    cited_shared_word: _enum(["refuse"]).optional(),
    cite_span: _enum(["floor"]).optional(),
  }),
);
var memorySearchResultSchema = DoctorLazy(() =>
  memoryCallResultSchema().extend({
    role_line_scan: zodStrictObject(memoryCallArgsSchema()).default(memoryReadArgsSchema),
    thinking_strip: memoryWriteArgsSchema(),
  }),
);
var postTurnMemoryConfigSchema = DoctorLazy(() =>
  u({
    turns: int().min(0).max(100),
    cursor: string()
      .min(1)
      .max(100)
      .nullish()
      .transform((e) => e ?? null),
    tail: string()
      .min(1)
      .max(100)
      .nullish()
      .transform((e) => e ?? null),
    passAt: E()
      .nullish()
      .transform((e) => e ?? null),
  }),
);
//@ chunk-aepeg2w5.js:56473-56542 placement
/**
 * 解析 CLAUDE_CODE_POST_TURN_MEMORY_CONFIG 得到 hosted 记忆提取配置，非法时返回 null。
 */
function parsePostTurnMemoryConfig(e) {
  let n = postTurnMemoryConfigSchema().safeParse(e);
  return n.success ? n.data : null;
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
function getPostTurnMemoryConfig(e = "dry_run_harness") {
  let r = (e === "hosted" ? memoryCallResultSchema() : memorySearchResultSchema()).safeParse(
    safeParseJSON(env.CLAUDE_CODE_POST_TURN_MEMORY_CONFIG, false),
  );
  if (!r.success) return null;
  let CLAUDE_CODE_POST_TURN_MEMORY_SYNC = env.CLAUDE_CODE_POST_TURN_MEMORY_SYNC;
  return {
    instruction: r.data.instruction,
    everyNTurns: CLAUDE_CODE_POST_TURN_MEMORY_SYNC ? 1 : r.data.every_n_turns,
    maxTurns: r.data.max_turns,
    idleFlushSeconds: CLAUDE_CODE_POST_TURN_MEMORY_SYNC ? 0 : r.data.idle_flush_s,
    idleFlushMinTurns: r.data.idle_flush_min_turns,
    proseGate: r.data.prose_gate,
    minProseWords: r.data.min_prose_words,
    reviewWindow: Math.max(r.data.review_window ?? 0, r.data.every_n_turns, 1),
    whenOverage: r.data.when_overage,
    firstLook: r.data.first_look && {
      mode: r.data.first_look.mode,
      instruction: r.data.first_look.instruction,
      model: r.data.first_look.model,
      maxInputChars: r.data.first_look.max_input_chars,
    },
    smallerPass: r.data.smaller_pass && {
      mode: r.data.smaller_pass.mode,
      model: r.data.smaller_pass.model,
      maxInputChars: r.data.smaller_pass.max_input_chars,
      form: r.data.smaller_pass.form,
    },
    staleNote: r.data.stale_note,
    carryAcrossRestarts: !CLAUDE_CODE_POST_TURN_MEMORY_SYNC && r.data.carry_across_restarts,
    declareTask: r.data.declare_task,
    sync: CLAUDE_CODE_POST_TURN_MEMORY_SYNC,
    extractTransport: r.data.extract_transport,
    thinkingStrip: r.data.thinking_strip,
    roleLineScan: {
      attachments: r.data.role_line_scan.attachments,
      instructionFiles: r.data.role_line_scan.instruction_files,
      firstWindow: r.data.role_line_scan.first_window,
    },
    personFilesWritable: r.data.person_files_writable,
    peopleWritable: r.data.people_writable,
    personFilesTypedEvidence: normalizeTypedEvidenceMode(r.data.person_files_typed_evidence),
    personFilesTypedStampedOnly: r.data.typed_origin !== "presume",
    personFilesCitedSharedWordRefused: r.data.cited_shared_word === "refuse",
    personFilesCiteSinceFloor: r.data.cite_span === "floor",
  };
}
//@ chunk-aepeg2w5.js:58221-58277 placement
/**
 * 判断 MCP 服务器是否是账户记忆服务器。
 */
function isAccountMemoryServer(e) {
  return e !== undefined && isCcrMemoryMcpServer(e.name, e.config);
}
//@ chunk-aepeg2w5.js:58277-58443 placement
var MEMORY_ANSWER_MAX_CHARS = 65536;
var MEMORY_TRUNCATION_NOTE =
  "[Note: the file content above is incomplete \u2014 see the 'characters truncated' marker. Call memory_read on this path before rewriting the file.]";
//@ chunk-aepeg2w5.js:58443-58483 placement
/**
 * 本地 agent 会话里的动态记忆服务器
 */
function isLocalAgentDynamicMemoryServer(e, n) {
  return isDynamicMemorySdkServer(e, n) && isLocalAgentSession();
}
//@ chunk-aepeg2w5.js:58483-58598 placement
function isDynamicMemorySdkServer(e, n) {
  return (
    e?.name === MEMORY &&
    e.config.scope === "dynamic" &&
    e.config.type === "sdk" &&
    !isCliOwnedConfig(e.config) &&
    MEMORY_TOOL_NAME_RE.test(n)
  );
}
//@ chunk-aepeg2w5.js:58598-58667 placement
/**
 * 判断连接是否属于记忆服务器（账户记忆、内置等）。
 */
function isMemoryServerConnection(client, n) {
  return (
    isAccountMemoryServer(client) ||
    isDynamicMemorySdkServer(client, n) ||
    (client?.name === MEMORY && isCliOwnedConfig(client.config))
  );
}
//@ chunk-aepeg2w5.js:58667-58737 placement
/**
 * 该服务器是否提供记忆工具
 */
function isMemoryToolServer(e, name) {
  return (
    isAccountMemoryServer(e) ||
    isLocalAgentDynamicMemoryServer(e, name) ||
    (e?.name === MEMORY && isCliOwnedConfig(e.config))
  );
}
//@ chunk-aepeg2w5.js:58737-58770 placement
/**
 * 判断是否为提供记忆工具的服务器。
 */
function isMemoryToolServer_2(e) {
  return isMemoryToolServer(e, MEMORY_READ);
}
//@ chunk-aepeg2w5.js:58770-58906 placement
/**
 * 记忆服务器工具错误的脱敏描述：只给出长度，不记录正文（可能含用户记忆文件）。
 */
function describeRedactedMcpError(e) {
  return `McpToolCallError (${e.length} chars; text not logged: memory server answers can contain the user's memory file)`;
}
//@ chunk-aepeg2w5.js:58906-59173 placement
/**
 * 对记忆服务器的 MCP 工具错误放宽错误文本上限并附加截断提示，记录 tengu_mcp_memory_answer_cap。
 */
function raiseMemoryErrorCap(error, n, name) {
  if (
    error instanceof McpToolCallError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS &&
    (isAccountMemoryServer(n) || isLocalAgentDynamicMemoryServer(n, name))
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
  return mcpClients?.find((n) => n.name === MEMORY);
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
    [MEMORY_CALLER_META_KEY]: n,
    [ANTHROPIC_MEMORY_PASS_ID]: r,
    [ANTHROPIC_MEMORY_CITES_EVENT]: s,
    ...h
  } = mcpRequestMeta;
  return h;
}
//@ chunk-aepeg2w5.js:59415-59436 placement
var MEMEXTRACT = "memextract";
//@ chunk-aepeg2w5.js:59436-59531 placement
/**
 * 构造记忆工具调用的 _meta：caller 固定为 memextract，可带 pass id 与引用事件。
 */
function buildMemoryCallMeta({ passId: e = randomUUID(), citesEvent: n } = {}) {
  return {
    [MEMORY_CALLER_META_KEY]: MEMEXTRACT,
    [ANTHROPIC_MEMORY_PASS_ID]: e,
    ...(n !== undefined && {
      [ANTHROPIC_MEMORY_CITES_EVENT]: n,
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
  MEMORY_READONLY_TOOLS,
  MEMORY_MUTATING_TOOLS,
  buildMemoryCallMeta,
  MEMORY_WRITE_TOOL,
  parsePostTurnMemoryConfig,
  stripMemoryCallMeta,
  MEMORY_SEARCH_TOOLS,
  isLocalAgentDynamicMemoryServer,
  MEMEXTRACT,
  memoryListArgsSchema,
  MEMORY_TOOL_PREFIX,
};
