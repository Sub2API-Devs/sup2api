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
import {
  randomUUID,
  randomUUID as randomUUID_2,
  randomUUID as randomUUID_3,
  randomUUID as randomUUID_4,
  randomUUID as randomUUID_5,
  randomUUID as randomUUID_6,
  randomUUID as randomUUID_7,
  randomUUID as randomUUID_8,
  randomUUID as randomUUID_9,
  randomUUID as randomUUID_10,
} from "crypto";
import { cPn } from "../constants/outputLimits.js";
import { UM, HM, formatError } from "../utils/toolErrors.js";
import { truncateMiddle as truncateMiddle_2, truncateToLength } from "../utils/stringUtils.js";
import { MEMORY, VPn } from "../services/mcp/firstPartyServerIds.js";
import { DoctorLazy } from "../cli/handlers/util.js";
import { M, U, u, o, tc, zodStrictObject, E } from "../../vendor/zod/v4/classic/schemas.js";
import { env } from "../utils/env.js";
import { safeParseJSON } from "../utils/json.js";
import { isCcrMemoryMcpServer } from "../services/mcp/ccrMcpUrls.js";
import { isLocalAgentSession } from "../utils/sessionShape.js";
import { Zl } from "../services/mcp/cliOwnedClients.js";
import { McpToolCallError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from "../services/mcp/client.js";
import { logEvent } from "../services/analytics/index.js";
import { lit } from "../services/analytics/safeMetadata.js";

/**
 * 过长文本从中间截断并插入"N characters truncated"标记（合并已有标记）。
 */
//@ chunk-aepeg2w5.js:51611-51894 placement
function truncateMiddle(e, n = cPn) {
  if (e.length <= n + UM) return e;
  let floored = Math.floor(n / 2);
  return truncateMiddle_2(e, floored, n - floored, (s) => {
    let sliced = e.slice(floored, e.length - (n - floored)),
      y = 0;
    for (let S of sliced.matchAll(HM)) {
      let w = S[1].length <= 15 ? Number(S[1]) : Number.NaN;
      if (Number.isSafeInteger(w) && w >= S[0].length) y += w - S[0].length;
    }
    return formatError(s + y);
  });
}
//@ chunk-aepeg2w5.js:51894-51918 placement
var KM = /^\s*at /,
  th = 500;
/**
 * 把错误名、消息与前几帧栈压缩成一段简短文本。
 */
//@ chunk-aepeg2w5.js:51918-52119 placement
function summarizeError({ name: e, message: message, stack: stack }, s = 5) {
  let h = message ? `${e}: ${message}` : e,
    y = stack
      ? stack
          .split(
            `
`,
          )
          .filter((S) => KM.test(S))
          .slice(0, s)
          .map((S) => (S.length > th ? `${truncateToLength(S, th)}\u2026` : S))
      : [];
  return truncateMiddle(
    [truncateMiddle(h), ...y].join(`
`),
  );
}
/**
 * 同形异义字符（西里尔等）到拉丁字母的映射，用于检测伪装文本。
 */
//@ chunk-aepeg2w5.js:52119-52851 placement
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
  },
  regExp = new RegExp(`[${Object.keys(HOMOGLYPH_MAP).join("")}]`, "g");
/**
 * 否定词集合（判断记忆指令语义用）。
 */
//@ chunk-aepeg2w5.js:52851-53713 placement
var NEGATION_WORDS = new Set(
    "no not never dont doesnt didnt wont cant cannot shouldnt isnt arent wasnt nor without stop stops stopped stopping avoid avoids avoided avoiding mustnt couldnt wouldnt havent hasnt hadnt werent neednt aint shant mightnt oughtnt darent rarely hardly seldom barely scarcely neither none nothing nobody skip skips skipped skipping omit omits omitted omitting ban bans banned banning forbid forbids forbade forbidden forbidding exclude excludes excluded excluding prohibit prohibits prohibited prohibiting disallow disallows disallowed disallowing".split(
      " ",
    ),
  ),
  a4 = new Set([
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
function nh(e) {
  return e === "cited_turn" ? "cited_turn" : e === "contiguous" ? "contiguous" : "off";
}
//@ chunk-aepeg2w5.js:53947-54108 placement
var DEMONSTRATIVE_WORDS = new Set(
    "these those this following any all things thing ones one either below".split(" "),
  ),
  WEAK_REFERENCE_WORDS = new Set("it that this those me so in on at by".split(" "));
//@ chunk-aepeg2w5.js:54108-54175 placement
var c4 = new Set("these those this following below ones".split(" "));
//@ chunk-aepeg2w5.js:54175-54193 placement
var Zs = MEMORY,
  Nlt = VPn;
/**
 * 记忆工具名（memory_write/read/append/str_replace 等）与读写集合。
 */
//@ chunk-aepeg2w5.js:54193-56473 placement
var MEMORY_WRITE_TOOL = `${Nlt}write`,
  C4 = `${Nlt}read`,
  R4 = `${Nlt}append`,
  x4 = `${Nlt}str_replace`,
  xas = new Set(["read", "write", "str_replace", "append"].map((e) => `${Nlt}${e}`)),
  NPt = new Set(["write", "str_replace", "append", "delete"].map((e) => `${Nlt}${e}`)),
  zM = /^memory_[a-z_]+$/,
  TTi = new Set(["memory_read", "memory_list", "memory_search"]),
  MEMORY_READ = "memory_read",
  oh = DoctorLazy(() => ({
    attachments: M().default(!0),
    instruction_files: M().default(!0),
    first_window: U(["full", "ignore_session_start_blocks"]).default("full"),
  })),
  ih = { attachments: !0, instruction_files: !0, first_window: "full" },
  sh = DoctorLazy(() => U(["window", "last5", "none"]).default("window")),
  Pas = 49152,
  VM = 8192,
  YM = 12000,
  qM = DoctorLazy(() =>
    u({
      mode: U(["off", "shadow", "enforce"]),
      instruction: o()
        .min(1)
        .refine((e) => [...e].length <= VM),
      model: o().min(1).max(200).optional(),
      max_input_chars: tc().min(500).max(50000).default(YM),
    }),
  ),
  XM = DoctorLazy(() =>
    u({
      mode: U(["off", "shadow"]),
      model: o().min(1).max(200),
      max_input_chars: tc().min(500).max(20000).default(20000),
      form: U(["turns", "inline"]).catch("turns"),
    }),
  ),
  ah = DoctorLazy(() =>
    u({
      instruction: o().min(1).max(Pas),
      every_n_turns: tc().min(1).max(100).default(5),
      max_turns: tc().min(1).max(8).default(4),
      idle_flush_s: tc().min(0).max(86400).default(120),
      idle_flush_min_turns: tc().min(1).max(20).catch(1),
      prose_gate: U(["legacy", "chat"]).catch("legacy"),
      min_prose_words: tc().min(1).max(50).catch(3),
      review_window: tc()
        .min(1)
        .max(100)
        .optional()
        .catch(void 0),
      when_overage: U(["run", "first_look", "skip"]).catch("run"),
      first_look: qM()
        .optional()
        .catch(void 0),
      smaller_pass: XM()
        .optional()
        .catch(void 0),
      extract_transport: U(["tools", "text", "tools_cached"]).default("tools"),
      thinking_strip: sh().catch("window"),
      stale_note: M().catch(!1),
      carry_across_restarts: M().catch(!1),
      declare_task: M().catch(!1),
      role_line_scan: u(oh()).default(ih),
      person_files_writable: M().default(!1),
      people_writable: M().default(!1),
      person_files_typed_evidence: U(["cited_turn", "contiguous"]).optional(),
      typed_origin: U(["presume"]).optional(),
      cited_shared_word: U(["refuse"]).optional(),
      cite_span: U(["floor"]).optional(),
    }),
  ),
  JM = DoctorLazy(() =>
    ah().extend({ role_line_scan: zodStrictObject(oh()).default(ih), thinking_strip: sh() }),
  ),
  QM = DoctorLazy(() =>
    u({
      turns: tc().min(0).max(100),
      cursor: o()
        .min(1)
        .max(100)
        .nullish()
        .transform((e) => e ?? null),
      tail: o()
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
function ATi(e) {
  let safeParse = QM().safeParse(e);
  return safeParse.success ? safeParse.data : null;
}
/**
 * CLAUDE_CODE_POST_TURN_MEMORY 打开时解析 CLAUDE_CODE_POST_TURN_MEMORY_CONFIG 得到 hosted 提取配置，否则 null。
 */
//@ chunk-aepeg2w5.js:56542-56624 placement
function getHostedPostTurnMemoryConfig() {
  if (!env.CLAUDE_CODE_POST_TURN_MEMORY) return null;
  return getPostTurnMemoryConfig("hosted");
}
/**
 * 解析 post-turn 记忆配置 JSON：instruction、every_n_turns、max_turns、idle_flush_s、prose_gate、min_prose_words、review_window、when_overage 等；CLAUDE_CODE_POST_TURN_MEMORY_SYNC 时每轮同步执行。
 */
//@ chunk-aepeg2w5.js:56624-58221 placement
function getPostTurnMemoryConfig(e = "dry_run_harness") {
  let safeParse = (e === "hosted" ? ah() : JM()).safeParse(
    safeParseJSON(env.CLAUDE_CODE_POST_TURN_MEMORY_CONFIG, !1),
  );
  if (!safeParse.success) return null;
  let CLAUDE_CODE_POST_TURN_MEMORY_SYNC = env.CLAUDE_CODE_POST_TURN_MEMORY_SYNC;
  return {
    instruction: safeParse.data.instruction,
    everyNTurns: CLAUDE_CODE_POST_TURN_MEMORY_SYNC ? 1 : safeParse.data.every_n_turns,
    maxTurns: safeParse.data.max_turns,
    idleFlushSeconds: CLAUDE_CODE_POST_TURN_MEMORY_SYNC ? 0 : safeParse.data.idle_flush_s,
    idleFlushMinTurns: safeParse.data.idle_flush_min_turns,
    proseGate: safeParse.data.prose_gate,
    minProseWords: safeParse.data.min_prose_words,
    reviewWindow: Math.max(safeParse.data.review_window ?? 0, safeParse.data.every_n_turns, 1),
    whenOverage: safeParse.data.when_overage,
    firstLook: safeParse.data.first_look && {
      mode: safeParse.data.first_look.mode,
      instruction: safeParse.data.first_look.instruction,
      model: safeParse.data.first_look.model,
      maxInputChars: safeParse.data.first_look.max_input_chars,
    },
    smallerPass: safeParse.data.smaller_pass && {
      mode: safeParse.data.smaller_pass.mode,
      model: safeParse.data.smaller_pass.model,
      maxInputChars: safeParse.data.smaller_pass.max_input_chars,
      form: safeParse.data.smaller_pass.form,
    },
    staleNote: safeParse.data.stale_note,
    carryAcrossRestarts: !CLAUDE_CODE_POST_TURN_MEMORY_SYNC && safeParse.data.carry_across_restarts,
    declareTask: safeParse.data.declare_task,
    sync: CLAUDE_CODE_POST_TURN_MEMORY_SYNC,
    extractTransport: safeParse.data.extract_transport,
    thinkingStrip: safeParse.data.thinking_strip,
    roleLineScan: {
      attachments: safeParse.data.role_line_scan.attachments,
      instructionFiles: safeParse.data.role_line_scan.instruction_files,
      firstWindow: safeParse.data.role_line_scan.first_window,
    },
    personFilesWritable: safeParse.data.person_files_writable,
    peopleWritable: safeParse.data.people_writable,
    personFilesTypedEvidence: nh(safeParse.data.person_files_typed_evidence),
    personFilesTypedStampedOnly: safeParse.data.typed_origin !== "presume",
    personFilesCitedSharedWordRefused: safeParse.data.cited_shared_word === "refuse",
    personFilesCiteSinceFloor: safeParse.data.cite_span === "floor",
  };
}
/**
 * 判断 MCP 服务器是否是账户记忆服务器。
 */
//@ chunk-aepeg2w5.js:58221-58277 placement
function isAccountMemoryServer(e) {
  return e !== void 0 && isCcrMemoryMcpServer(e.name, e.config);
}
//@ chunk-aepeg2w5.js:58277-58443 placement
var MEMORY_ANSWER_MAX_CHARS = 65536,
  MEMORY_TRUNCATION_NOTE =
    "[Note: the file content above is incomplete \u2014 see the 'characters truncated' marker. Call memory_read on this path before rewriting the file.]";
//@ chunk-aepeg2w5.js:58443-58483 placement
function Xro(e, n) {
  return isDynamicMemorySdkServer(e, n) && isLocalAgentSession();
}
//@ chunk-aepeg2w5.js:58483-58598 placement
function isDynamicMemorySdkServer(e, n) {
  return (
    e?.name === Zs && e.config.scope === "dynamic" && e.config.type === "sdk" && !Zl(e.config) && zM.test(n)
  );
}
/**
 * 判断连接是否属于记忆服务器（账户记忆、内置等）。
 */
//@ chunk-aepeg2w5.js:58598-58667 placement
function isMemoryServerConnection(e, n) {
  return isAccountMemoryServer(e) || isDynamicMemorySdkServer(e, n) || (e?.name === Zs && Zl(e.config));
}
//@ chunk-aepeg2w5.js:58667-58737 placement
function $Pt(e, n) {
  return isAccountMemoryServer(e) || Xro(e, n) || (e?.name === Zs && Zl(e.config));
}
/**
 * 判断是否为提供记忆工具的服务器。
 */
//@ chunk-aepeg2w5.js:58737-58770 placement
function isMemoryToolServer(e) {
  return $Pt(e, MEMORY_READ);
}
/**
 * 记忆服务器工具错误的脱敏描述：只给出长度，不记录正文（可能含用户记忆文件）。
 */
//@ chunk-aepeg2w5.js:58770-58906 placement
function describeRedactedMcpError(e) {
  return `McpToolCallError (${e.length} chars; text not logged: memory server answers can contain the user's memory file)`;
}
/**
 * 对记忆服务器的 MCP 工具错误放宽错误文本上限并附加截断提示，记录 tengu_mcp_memory_answer_cap。
 */
//@ chunk-aepeg2w5.js:58906-59173 placement
function raiseMemoryErrorCap(e, n, r) {
  if (
    e instanceof McpToolCallError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS &&
    (isAccountMemoryServer(n) || Xro(n, r))
  ) {
    (Object.assign(e, { maxErrorChars: MEMORY_ANSWER_MAX_CHARS, truncationNote: MEMORY_TRUNCATION_NOTE }),
      logEvent("tengu_mcp_memory_answer_cap", { kind: lit("capRaised") }));
    let trimmed = e.message.trim();
    if (truncateMiddle(trimmed, MEMORY_ANSWER_MAX_CHARS) !== trimmed)
      logEvent("tengu_mcp_memory_answer_cap", { kind: lit("noteAppended") });
  }
}
//@ chunk-aepeg2w5.js:59173-59222 placement
function Ias(e) {
  return e?.find((n) => n.name === Zs);
}
/**
 * 记忆调用 _meta 键（caller、pass_id、cites_event）。
 */
//@ chunk-aepeg2w5.js:59222-59320 placement
var MEMORY_CALLER_META_KEY = "anthropic/memory.caller",
  ANTHROPIC_MEMORY_PASS_ID = "anthropic/memory.pass_id",
  ANTHROPIC_MEMORY_CITES_EVENT = "anthropic/memory.cites_event";
//@ chunk-aepeg2w5.js:59320-59415 placement
function Jro(e) {
  if (e === void 0 || !(MEMORY_CALLER_META_KEY in e)) return e;
  let {
    [MEMORY_CALLER_META_KEY]: n,
    [ANTHROPIC_MEMORY_PASS_ID]: r,
    [ANTHROPIC_MEMORY_CITES_EVENT]: s,
    ...h
  } = e;
  return h;
}
//@ chunk-aepeg2w5.js:59415-59436 placement
var MEMEXTRACT = "memextract";
//@ chunk-aepeg2w5.js:59436-59531 placement
function CTi({ passId: e = randomUUID_3(), citesEvent: n } = {}) {
  return {
    [MEMORY_CALLER_META_KEY]: MEMEXTRACT,
    [ANTHROPIC_MEMORY_PASS_ID]: e,
    ...(n !== void 0 && { [ANTHROPIC_MEMORY_CITES_EVENT]: n }),
  };
}

export {
  truncateMiddle,
  $Pt,
  isMemoryToolServer,
  isMemoryServerConnection,
  isAccountMemoryServer,
  raiseMemoryErrorCap,
  describeRedactedMcpError,
  summarizeError,
  MEMORY_CALLER_META_KEY,
  getHostedPostTurnMemoryConfig,
  Jro,
  TTi,
  Xro,
  MEMEXTRACT,
  Pas,
  NPt,
  Nlt,
  Ias,
  xas,
  CTi,
  MEMORY_WRITE_TOOL,
  ATi,
};
