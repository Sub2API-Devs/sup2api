/**
 * services/usageInsights/transcriptScan.ts
 *
 * 2.1.316 新增。扫描转录统计用量行为。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-ya28b76p.js (53)
 * attribution: placement 53
 */
import { sep, join, extname } from "path";
import { readdir, stat } from "fs/promises";
import {
  isPolicyAllowed,
  policyDenyKind,
  policyKeyLabel,
  policyDeniedReason,
} from "../policyLimits/policyEvidence.js";
import { getCurrentTaints } from "../policyLimits/complianceTaints.js";
import { WORKFLOW_TRANSCRIPT_SUBDIR } from "../../tools/WorkflowTool/constants.js";
import {
  INTERRUPT_MESSAGE,
  HOOK_STOPPED_MESSAGE,
  HOOK_FEEDBACK_EVENTS,
  HOOK_FEEDBACK_SEPARATOR,
  STRUCTURED_OUTPUT_ENFORCE_PREFIX,
  EMPTY_SENTINEL,
  PROJECTS_REPLY_GATE_PREFIX,
  LINKED_BUT_NOT_SENT_PREFIX,
  GOAL_CHECK_IN_PREFIX,
  MALFORMED_TOOL_CALL_RETRY,
  MALFORMED_TOOL_CALL_TEXT,
  NO_VISIBLE_OUTPUT_TEXT,
  PERMISSION_DENIED_RETRY_TEXT,
  TURN_NOT_ENDED_NOTICE,
  OUTPUT_LIMIT_RESUME,
  OUTPUT_LIMIT_REASONING_RESUME_TEXT,
  OUTPUT_LIMIT_NO_VISIBLE_TEXT,
  OUTPUT_LIMIT_CUT_TEXT,
  STREAM_CUT_RESUME,
  STREAM_CUT_REWRITE,
} from "../../utils/messages.js";
import {
  LOCAL_COMMAND_CAVEAT,
  LOCAL_COMMAND_STDOUT,
  LOCAL_COMMAND_STDERR,
  BASH_STDOUT,
  BASH_STDERR,
} from "../../constants/xml.js";
import { jsonStringify, jsonParseRaw } from "../../utils/slowOperations.js";
import { BRIEF_ENFORCE_SENTINEL } from "../../tools/BriefTool/prompt.js";
import { getProjectsDir, listedProjectKey } from "../../utils/sessionStoragePortable.js";
import { isFsInaccessible } from "../../utils/errors.js";
import {
  createPageBudget,
  readAllPages,
  cappedPagesBeyondFirst,
  DEFAULT_MAX_PAGES,
  noteValidationIssue,
} from "../../utils/pagedRead.js";
import { isValidKeySegment } from "../../utils/storage/storageSpaces.js";
import { logForDebugging } from "../../utils/debug.js";
import { readLines } from "../../utils/fsOperations.js";
import { logError } from "../../utils/log.js";
import { clippedMessage } from "../../utils/stringUtils.js";

//@ chunk-ya28b76p.js:753-1314 placement
/**
 * 三类「扫描本机会话转录」功能的策略键与 HIPAA 下的说明文案。
 */
var ALLOW_USAGE_TRANSCRIPT_SCAN = "allow_usage_transcript_scan";
var ALLOW_SKILL_DOCTOR_TRANSCRIPT_SCAN = "allow_skill_doctor_transcript_scan";
var ALLOW_STATS_TRANSCRIPT_SCAN = "allow_stats_transcript_scan";
var USAGE_SCAN_POLICY = {
  policy: ALLOW_USAGE_TRANSCRIPT_SCAN,
  hipaaReason:
    "Not shown under your organization's policy: this breakdown is built by scanning the session transcripts saved on this machine.",
};
var SKILL_DOCTOR_SCAN_POLICY = {
  policy: ALLOW_SKILL_DOCTOR_TRANSCRIPT_SCAN,
  hipaaReason:
    "Not shown under your organization's policy: measured by scanning the session transcripts saved on this machine.",
};
var STATS_SCAN_POLICY = {
  policy: ALLOW_STATS_TRANSCRIPT_SCAN,
  hipaaReason:
    "Not shown under your organization's policy: these stats are built by scanning the session transcripts saved on this machine.",
};
//@ chunk-ya28b76p.js:1314-1579 placement
function checkUsagePolicy(e) {
  if (isPolicyAllowed(e.policy))
    return {
      allowed: true,
    };
  if (policyDenyKind(e.policy) === "org_denied" && getCurrentTaints().includes("hipaa"))
    return {
      allowed: false,
      reason: e.hipaaReason,
    };
  let { featureLabel, verb } = policyKeyLabel(e.policy);
  return {
    allowed: false,
    reason:
      policyDeniedReason(e.policy, featureLabel, verb) ?? `${featureLabel} ${verb} unavailable right now.`,
  };
}
//@ chunk-ya28b76p.js:1579-1607 placement
/**
 * 是否允许扫描 /usage 用量。
 */
function isUsageScanAllowed() {
  return checkUsagePolicy(USAGE_SCAN_POLICY);
}
//@ chunk-ya28b76p.js:1607-1635 placement
/**
 * 是否允许扫描技能体检数据。
 */
function isSkillDoctorScanAllowed() {
  return checkUsagePolicy(SKILL_DOCTOR_SCAN_POLICY);
}
//@ chunk-ya28b76p.js:1635-1663 placement
/**
 * 是否允许扫描统计信息。
 */
function isStatsScanAllowed() {
  return checkUsagePolicy(STATS_SCAN_POLICY);
}
//@ chunk-ya28b76p.js:1762-1774 placement
/**
 * 每百万 token 金额的换算比例。
 */
var USD_PER_MTOK_SCALE = 2.5;
//@ chunk-ya28b76p.js:1774-1926 placement
function createContextTracker() {
  return {
    lastRequest: undefined,
    lastContext: 0,
    carriedTokens: 0,
    firstPromptBytes: 0,
    startTokens: 0,
    pendingToolResultBytes: 0,
    largeToolResultTokens: 0,
  };
}
//@ chunk-ya28b76p.js:1926-1990 placement
/**
 * 会话尚未发出请求时，把当前内容计入首条提示的字节数。
 */
function addFirstPromptBytes(e, n) {
  if (e.lastRequest === undefined) e.firstPromptBytes += n;
}
//@ chunk-ya28b76p.js:1990-2023 placement
/**
 * 判断工具结果是否属于大体积。
 */
function isLargeToolResultBytes(e) {
  return e / 2.5 > 1e4;
}
//@ chunk-ya28b76p.js:2023-2077 placement
/**
 * 工具结果足够大时才把字节数计入待处理大结果。
 */
function addLargeToolResultBytes(e, n) {
  if (isLargeToolResultBytes(n)) e.pendingToolResultBytes += n;
}
//@ chunk-ya28b76p.js:2077-2747 placement
/**
 * 按请求跟踪上下文增长：估算会话起始常驻 token、累计大工具结果带来的 token，并把常驻 token（主线程且超 40k）与大结果 token 写入记录。
 */
function trackContextGrowth(tracker, record) {
  let contextTokens = record.cached + record.cacheCreate + record.uncached;
  if (record.uuid === tracker.lastRequest)
    tracker.carriedTokens = Math.max(tracker.carriedTokens, contextTokens + record.output);
  else {
    if (tracker.lastRequest === undefined)
      tracker.startTokens = contextTokens - Math.round(tracker.firstPromptBytes / 2.5);
    else if (contextTokens < tracker.lastContext)
      tracker.largeToolResultTokens = Math.max(
        0,
        tracker.largeToolResultTokens - (tracker.lastContext - contextTokens),
      );
    else {
      let min = Math.min(contextTokens - tracker.carriedTokens, tracker.pendingToolResultBytes / 2.5);
      if (min > 1e4) tracker.largeToolResultTokens += min;
    }
    tracker.startTokens = Math.min(tracker.startTokens, contextTokens);
    tracker.lastRequest = record.uuid;
    tracker.lastContext = contextTokens;
    tracker.carriedTokens = contextTokens + record.output;
    tracker.pendingToolResultBytes = 0;
  }
  record.largeToolResultTokens = tracker.largeToolResultTokens;
  record.alwaysOnTokens = !record.isSubagent && tracker.startTokens > 40000 ? tracker.startTokens : 0;
}
//@ chunk-ya28b76p.js:2747-5100 placement
/**
 * 转录扫描的常量：读取分块、统计窗口、各种「行为」阈值（缓存未命中、长上下文、子代理、高并行、cron）与扫描用的字节标记。
 */
var TRANSCRIPT_SCAN_MARKERS = 4;
var TRANSCRIPT_READ_CHUNK_BYTES = 4194304;
var TRANSCRIPT_READ_CHUNK_BYTES_2 = TRANSCRIPT_READ_CHUNK_BYTES;
var USAGE_WINDOW_MS = 604800000;
var CACHE_MISS_TOKEN_THRESHOLD = 1e5;
var LONG_CONTEXT_THRESHOLD = 150000;
var SUBAGENT_HEAVY_COUNT = 3;
var SUBAGENT_HEAVY_COST_RATIO = 0.5;
var PARALLEL_BUCKET_MS = 300000;
var HIGH_PARALLEL_SESSIONS = 4;
var CRON_SESSION_HOURS = 8;
var SUBAGENT_TRANSCRIPT_MARK = `${sep}subagents${sep}${WORKFLOW_TRANSCRIPT_SUBDIR}${sep}`;
var textEncoder = new TextEncoder();
var KLr = textEncoder.encode('"type":"assistant"');
var He = textEncoder.encode('"usage":{');
var le = textEncoder.encode('"timestamp":"');
var Ke = textEncoder.encode('"sessionId":"');
var Ge = textEncoder.encode('"model":"');
var qe = textEncoder.encode('"requestId":"');
var VLr = textEncoder.encode('"id":"');
var We = textEncoder.encode("msg_");
var de = textEncoder.encode('"uuid":"');
var $e = textEncoder.encode('"input_tokens":');
var Ye = textEncoder.encode('"output_tokens":');
var je = textEncoder.encode('"cache_creation_input_tokens":');
var Xe = textEncoder.encode('"cache_read_input_tokens":');
var ze = textEncoder.encode('"isSidechain":true');
var Ve = textEncoder.encode('"isSidechain": true');
var Qe = textEncoder.encode('"effort":"max"');
var Je = textEncoder.encode('"attribution');
var Ze = textEncoder.encode('"attributionAgent":"');
var et = textEncoder.encode('"attributionSkill":"');
var tt = textEncoder.encode('"attributionPlugin":"');
var nt = textEncoder.encode('"attributionMcpServer":"');
var hPo = textEncoder.encode('"type":"user"');
var K = textEncoder.encode('"isMeta":true');
var ot = textEncoder.encode('"subtype":"scheduled_task_fire"');
var st = textEncoder.encode('"taskId":"');
var G = textEncoder.encode('"scheduledTaskId":"');
var rt = textEncoder.encode('"scheduledFireId":"');
var yPo = textEncoder.encode('"type":"tool_result"');
var _Po = textEncoder.encode('"toolUseResult":');
var it = textEncoder.encode('"turnCompanion":true');
var ct = textEncoder.encode(`"text":"${INTERRUPT_MESSAGE.slice(0, -1)}`);
var ee = textEncoder.encode('"content":"[');
var at = textEncoder.encode(" prior /loop wakeup");
var ut = textEncoder.encode('"isCompactSummary":true');
var COMPACT_BOUNDARY_BYTES = [textEncoder.encode('"subtype":"compact_boundary"'), ...[]];
var dt = textEncoder.encode('"type":"attachment"');
var pt = textEncoder.encode('"attachment":{"type":"file"');
var ft = textEncoder.encode('"type":"queued_command"');
var mt = textEncoder.encode('"origin":{');
var Tt = textEncoder.encode('"origin":{"kind":"human"');
var _t = textEncoder.encode('"promptSource":"');
var St = textEncoder.encode('"type":"system"');
var Rt = textEncoder.encode('"subtype":"local_command"');
var contentOrTextMarker = (e) => [
  textEncoder.encode(`"content":"<${e}>`),
  textEncoder.encode(`"text":"<${e}>`),
];
var COMMAND_MESSAGE_MARKERS = [
  ...contentOrTextMarker("command-message"),
  ...contentOrTextMarker("command-name"),
];
var LOCAL_COMMAND_CAVEAT_MARKERS = contentOrTextMarker(LOCAL_COMMAND_CAVEAT);
var LOCAL_COMMAND_OUTPUT_MARKERS = [
  ...contentOrTextMarker(LOCAL_COMMAND_STDOUT),
  ...contentOrTextMarker(LOCAL_COMMAND_STDERR),
];
var BASH_OUTPUT_MARKERS = [...contentOrTextMarker(BASH_STDOUT), ...contentOrTextMarker(BASH_STDERR)];
var containsAnyMarker = (e, n, o) => n.some((s) => indexOfBytes(e, s, 0, o) >= 0);
var HOOK_STOPPED_MARKERS = [
  textEncoder.encode(`"content":${jsonStringify(HOOK_STOPPED_MESSAGE).slice(0, -1)}`),
  textEncoder.encode(`"text":${jsonStringify(HOOK_STOPPED_MESSAGE).slice(0, -1)}`),
];
var messageMarkerPair = (e, n = false) => {
  let o = n ? jsonStringify(e) : jsonStringify(e).slice(0, -1);
  return [textEncoder.encode(`"content":${o}`), textEncoder.encode(`"text":${o}`)];
};
var flattened = [
  ...HOOK_FEEDBACK_EVENTS.map((e) => `${e}${HOOK_FEEDBACK_SEPARATOR}`),
  STRUCTURED_OUTPUT_ENFORCE_PREFIX,
  EMPTY_SENTINEL,
  PROJECTS_REPLY_GATE_PREFIX,
  BRIEF_ENFORCE_SENTINEL,
  LINKED_BUT_NOT_SENT_PREFIX,
  GOAL_CHECK_IN_PREFIX,
]
  .filter((e) => e.length > 0)
  .flatMap((e) => messageMarkerPair(e));
var flattened_2 = [
  MALFORMED_TOOL_CALL_RETRY,
  MALFORMED_TOOL_CALL_TEXT,
  NO_VISIBLE_OUTPUT_TEXT,
  PERMISSION_DENIED_RETRY_TEXT,
  TURN_NOT_ENDED_NOTICE,
  OUTPUT_LIMIT_RESUME,
  OUTPUT_LIMIT_REASONING_RESUME_TEXT,
  OUTPUT_LIMIT_NO_VISIBLE_TEXT,
  OUTPUT_LIMIT_CUT_TEXT,
  STREAM_CUT_RESUME,
  STREAM_CUT_REWRITE,
].flatMap((e) => messageMarkerPair(e, true));
var bt = textEncoder.encode('"cron":"');
var Mt = textEncoder.encode('"prompt":"');
var Ot = textEncoder.encode('"taskKind":"loop"');
var At = textEncoder.encode('"content":"');
var kt = textEncoder.encode('"text":"');
var QUOTE_BYTE = 34;
var BACKSLASH_BYTE = 92;
var OPEN_BRACE_BYTE = 123;
var CLOSE_BRACE_BYTE = 125;
var OPEN_BRACKET_BYTE = 91;
var CLOSE_BRACKET_BYTE = 93;
var DIGIT_ZERO_BYTE = 48;
var DIGIT_NINE_BYTE = 57;
//@ chunk-ya28b76p.js:5100-5172 placement
/**
 * 在字节缓冲里查找子串位置。
 */
function indexOfBytes(e, n, o, s) {
  let index = e.subarray(o, s).indexOf(n);
  return index < 0 ? -1 : o + index;
}
//@ chunk-ya28b76p.js:5172-5300 placement
/**
 * 在缓冲区内找到指定 JSON 字段后读出其字符串值（到下一个引号为止）。
 */
function readJsonStringField(e, n, o, s) {
  let r = indexOfBytes(e, n, o, s);
  if (r < 0) return;
  let i = r + n.length;
  let c = i;
  while (c < s && e[c] !== QUOTE_BYTE) c++;
  return e.toString("utf8", i, c);
}
//@ chunk-ya28b76p.js:5300-5648 placement
/**
 * 从原始 JSON 行字节中读取某键的字符串值（有长度上限，截断时修正 UTF-8 与半个 \u 转义），按 JSON 字符串解码。
 */
function readJsonStringFieldBounded(e, n, o, s, r) {
  let i = indexOfBytes(e, n, o, s);
  if (i < 0) return;
  let c = i + n.length;
  let p = c;
  let min = Math.min(s, c + r);
  while (p < min && e[p] !== QUOTE_BYTE) {
    if (e[p] === BACKSLASH_BYTE) p++;
    p++;
  }
  let a = p >= min;
  if (p > min) p = min - 1;
  if (a) p = trimPartialUtf8(e, c, p);
  let str = e.toString("utf8", c, p);
  if (a) str = str.replace(/(^|[^\\])((?:\\\\)*)\\u[0-9a-fA-F]{0,3}$/, "$1$2");
  try {
    let g = jsonParseRaw(`"${str}"`);
    return typeof g === "string" ? g : undefined;
  } catch {
    return;
  }
}
//@ chunk-ya28b76p.js:5648-5794 placement
function trimPartialUtf8(e, n, o) {
  let s = o;
  while (s > n && (e[s - 1] & 192) === 128) s--;
  if (s === n) return n;
  let r = e[s - 1];
  let i = r >= 240 ? 4 : r >= 224 ? 3 : r >= 192 ? 2 : 1;
  return o - (s - 1) < i ? s - 1 : o;
}
//@ chunk-ya28b76p.js:5794-5970 placement
function findCommandField(e, n, o) {
  let s = n;
  while (true) {
    s = indexOfBytes(e, VLr, s, o);
    if (s < 0) return;
    let r = s + VLr.length;
    if (indexOfBytes(e, We, r, r + 4) === r) {
      let i = r;
      while (i < o && e[i] !== QUOTE_BYTE) i++;
      return e.toString("utf8", r, i);
    }
    s = r;
  }
}
//@ chunk-ya28b76p.js:5970-6103 placement
function readJsonIntField(e, n, o, s) {
  let r = indexOfBytes(e, n, o, s);
  if (r < 0) return 0;
  let i = r + n.length;
  let c = 0;
  while (i < s && e[i] >= DIGIT_ZERO_BYTE && e[i] <= DIGIT_NINE_BYTE) {
    c = c * 10 + (e[i] - DIGIT_ZERO_BYTE);
    i++;
  }
  return c;
}
//@ chunk-ya28b76p.js:6103-6260 placement
function getModelCostWeight(model) {
  if (!model) return 3;
  let lower = model.toLowerCase();
  if (lower.includes("fable")) return 10;
  if (lower.includes("opus")) return 5;
  if (lower.includes("haiku")) return 1;
  return 3;
}
//@ chunk-ya28b76p.js:6260-6350 placement
/**
 * 按模型价格加权的 token 数。
 */
function costWeightedTokens(e) {
  return (e.cached + e.uncached * 10 + e.cacheCreate * 12.5 + e.output * 50) * e.modelTier;
}
//@ chunk-ya28b76p.js:6350-6546 placement
/**
 * 汇总最近 7 天与 1 天的转录用量：按行为聚合记录并统计 loop 运行，返回日/周的分桶结果。
 */
async function aggregateRecentUsage_2(e, n) {
  let o = Date.now() - USAGE_WINDOW_MS;
  let s = Date.now() - 86400000;
  let usageAggregate = createUsageAggregate();
  let usageAggregate_2 = createUsageAggregate();
  await scanTranscripts(
    o,
    (c) => {
      aggregateUsageByBehavior(usageAggregate_2, c);
      if (c.ts >= s) aggregateUsageByBehavior(usageAggregate, c, s);
    },
    e,
    (c) => {
      recordLoopRun(usageAggregate_2, c);
      if (c.ts >= s) recordLoopRun(usageAggregate, c);
    },
    n,
  );
  return {
    day: usageBuckets(usageAggregate),
    week: usageBuckets(usageAggregate_2),
  };
}
//@ chunk-ya28b76p.js:6546-6890 placement
/**
 * 扫描转录：存储 v5 可用时走存储；否则读取各项目目录的全部转录（含子代理），分批解析并回调记录与 loop 触发。
 */
async function scanTranscripts(minMtimeMs, foldSpec, storage, foldOptions, startSpan) {
  if (storage) return scanStoredTranscripts(storage, minMtimeMs, foldSpec, foldOptions, startSpan);
  let projectsDir = getProjectsDir();
  let c;
  try {
    c = await readdir(projectsDir);
  } catch (error) {
    if (isFsInaccessible(error)) return;
    throw error;
  }
  let T = (await Promise.all(c.map((u) => loadAllSubagentTranscriptsFromDisk(join(projectsDir, u))))).flat();
  let dedupingSink = makeDedupingSink(foldSpec, foldOptions);
  for (let u = 0; u < T.length; u += TRANSCRIPT_SCAN_MARKERS) {
    let sliced = T.slice(u, u + TRANSCRIPT_SCAN_MARKERS);
    let mapped = sliced.map(() => startSpan && safeLineSink(startSpan()));
    (await Promise.all(sliced.map((y, b) => scanTranscriptIntoUsage(y, minMtimeMs, mapped[b])))).forEach(
      (y, b) => {
        dedupingSink(y);
        mapped[b]?.end(y);
      },
    );
  }
}
//@ chunk-ya28b76p.js:6890-7085 placement
function makeDedupingSink(e, n) {
  let o = new Set();
  let s = (uuid) => {
    if (!uuid) return true;
    if (o.has(uuid)) return false;
    o.add(uuid);
    return true;
  };
  return (r) => {
    for (let record of r.records) if (s(record.uuid)) e(record);
    if (n) {
      for (let fire of r.fires) if (s(fire.uuid)) n(fire);
    }
  };
}
//@ chunk-ya28b76p.js:7085-7678 placement
/**
 * 通过存储 v5 分页列出各项目的转录（受页数预算限制），分批读取解析并回调，被截断时记日志。
 */
async function scanStoredTranscripts(storage, minMtimeMs, foldSpec, foldOptions, startSpan) {
  let projectKeys = [];
  let budget = createPageBudget();
  let pages = await readAllPages(
    (R) =>
      storage.listEntries(
        {
          namespace: "transcript",
        },
        {
          skipScopeStats: true,
          ...(R !== undefined && {
            cursor: R,
          }),
        },
      ),
    (R) => {
      for (let O of R) {
        let y = listedProjectKey(O, isValidKeySegment);
        if (y !== undefined) projectKeys.push(y);
      }
    },
    {
      budget,
    },
  );
  logListingOutcome("project", pages, budget);
  let a = (
    await Promise.all(
      projectKeys.map((projectKey) => listProjectTranscriptKeys(storage, projectKey, minMtimeMs, budget)),
    )
  ).flat();
  let fold = makeDedupingSink(foldSpec, foldOptions);
  for (let R = 0; R < a.length; R += TRANSCRIPT_SCAN_MARKERS) {
    let sliced = a.slice(R, R + TRANSCRIPT_SCAN_MARKERS);
    let mapped = sliced.map(() => startSpan && safeLineSink(startSpan()));
    (
      await Promise.all(sliced.map((L, N) => readStoredTranscript(storage, L, minMtimeMs, mapped[N])))
    ).forEach((L, N) => {
      fold(L);
      mapped[N]?.end(L);
    });
  }
  let cappedPages = cappedPagesBeyondFirst(budget);
  if (cappedPages > 0)
    logForDebugging(
      `foldRecentRecords: ${cappedPages} more v5 listings were cut short after the scan's ${DEFAULT_MAX_PAGES}-page budget ran out`,
    );
}
//@ chunk-ya28b76p.js:7678-8280 placement
/**
 * 列出项目下的会话转录键：分页读取主转录键与会话目录，按修改时间过滤会话，再并行列出各会话的子代理转录键。
 */
async function listProjectTranscriptKeys(storage, projectKey, minMtimeMs, budget) {
  let keys = [];
  let sessionIds = [];
  let pages = await readAllPages(
    (u) =>
      storage.listEntries(
        {
          namespace: "transcript",
          projectKey,
        },
        {
          skipScopeStats: true,
          ...(u !== undefined && {
            cursor: u,
          }),
        },
      ),
    (u) => {
      for (let g of u)
        if (g.kind === "key") pushTranscriptKey(keys, g);
        else if (
          g.scope.namespace === "transcript" &&
          g.scope.sessionId !== undefined &&
          isValidKeySegment(g.scope.sessionId)
        )
          sessionIds.push(g.scope.sessionId);
    },
    {
      budget,
    },
  );
  logListingOutcome("session", pages, budget);
  let mtimeBySession = new Map();
  for (let key of keys)
    if (key.key.namespace === "transcript" && key.key.agentId === undefined && key.key.journal !== true)
      mtimeBySession.set(key.key.sessionId, key.mtimeMs);
  let filtered = sessionIds.filter((sessionId) => (mtimeBySession.get(sessionId) ?? 1 / 0) >= minMtimeMs);
  let results = await Promise.all(
    filtered.map((u) => listSessionTranscriptKeys(storage, projectKey, u, budget)),
  );
  return keys.concat(results.flat());
}
//@ chunk-ya28b76p.js:8280-8863 placement
/**
 * 递归列出某会话（或子代理路径）下的子代理与日志转录键。
 */
async function listSessionTranscriptKeys(storage, projectKey, sessionId, budget, agentRelPath) {
  let keys = [];
  let childPaths = [];
  let pages = await readAllPages(
    (a) =>
      storage.listEntries(
        {
          namespace: "transcript",
          projectKey,
          sessionId,
          ...(agentRelPath !== undefined && {
            agentRelPath,
          }),
        },
        {
          skipScopeStats: true,
          ...(a !== undefined && {
            cursor: a,
          }),
        },
      ),
    (a) => {
      for (let u of a)
        if (u.kind === "key") {
          if (u.key.namespace === "transcript" && (u.key.agentId !== undefined || u.key.journal === true))
            pushTranscriptKey(keys, u);
        } else if (
          u.scope.namespace === "transcript" &&
          u.scope.agentRelPath !== undefined &&
          u.scope.agentRelPath.length > (agentRelPath?.length ?? 0)
        )
          childPaths.push(u.scope.agentRelPath);
    },
    {
      budget,
    },
  );
  logListingOutcome("subagent", pages, budget);
  let results = await Promise.all(
    childPaths.map((childPath) =>
      listSessionTranscriptKeys(storage, projectKey, sessionId, budget, childPath),
    ),
  );
  return keys.concat(results.flat());
}
//@ chunk-ya28b76p.js:8863-9128 placement
function logListingOutcome(e, pages, budget) {
  let s = noteValidationIssue(pages, budget);
  if (pages.status === "error")
    logForDebugging(`foldRecentRecords: v5 ${e} listing failed: ${pages.error.code}`);
  else if (s === "first-truncation")
    logForDebugging(
      `foldRecentRecords: v5 ${e} listing cut short (the scan's ${DEFAULT_MAX_PAGES}-page budget is spent); keeping what was listed`,
    );
}
//@ chunk-ya28b76p.js:9128-9282 placement
function pushTranscriptKey(keys, n) {
  if (n.kind === "key" && n.key.namespace === "transcript" && n.size !== undefined && n.mtimeMs !== undefined)
    keys.push({
      key: n.key,
      size: n.size,
      mtimeMs: n.mtimeMs,
    });
}
//@ chunk-ya28b76p.js:9282-9431 placement
async function readStoredTranscript(storage, n, minMtimeMs, s) {
  let usageTotals = newUsageTotals();
  if (n.mtimeMs >= minMtimeMs)
    await readStoredTranscriptLines(
      storage,
      n,
      transcriptReadPlan(
        usageTotals,
        minMtimeMs,
        n.key.namespace === "transcript" && n.key.agentRelPath?.[0] === WORKFLOW_TRANSCRIPT_SUBDIR,
        s,
      ),
    );
  return usageTotals;
}
//@ chunk-ya28b76p.js:9431-10077 placement
/**
 * 按块从存储读取转录并按换行切分逐行回调（跨块拼接不完整的行）。
 */
async function readStoredTranscriptLines(e, n, o) {
  let { key } = n;
  let readWhole = n.size <= TRANSCRIPT_READ_CHUNK_BYTES;
  let offset = 0;
  let pendingChunks = [];
  let pendingBytes = 0;
  while (true) {
    let T = await e.read([
      readWhole
        ? key
        : {
            key,
            offset,
            length: TRANSCRIPT_READ_CHUNK_BYTES_2,
          },
    ]);
    if (!T.ok) {
      logForDebugging(`readRecordsFromStream: v5 read failed: ${T.error.code}`);
      return;
    }
    let a = T.value.items[0];
    if (!a.found) return;
    let buffer = Buffer.from(a.value.buffer, a.value.byteOffset, a.value.byteLength);
    let g = 0;
    while (g < buffer.length) {
      let index = buffer.indexOf(10, g);
      if (index === -1) {
        pendingChunks.push(Buffer.from(buffer.subarray(g)));
        pendingBytes += buffer.length - g;
        break;
      }
      if (pendingBytes === 0) o(buffer.subarray(g, index));
      else {
        o(Buffer.concat([...pendingChunks, buffer.subarray(g, index)], pendingBytes + (index - g)));
        pendingChunks = [];
        pendingBytes = 0;
      }
      g = index + 1;
    }
    offset += a.value.byteLength;
    if (readWhole || a.value.byteLength === 0 || offset >= a.totalBytes) break;
  }
  if (pendingBytes > 0)
    o(pendingChunks.length === 1 ? pendingChunks[0] : Buffer.concat(pendingChunks, pendingBytes));
}
//@ chunk-ya28b76p.js:10077-10224 placement
function addSkillAttribution(e, n) {
  if (!n.attributionSkill) return;
  e.set(
    n.attributionSkill,
    (e.get(n.attributionSkill) ?? 0) + n.cached + n.cacheCreate + n.uncached + n.output,
  );
}
//@ chunk-ya28b76p.js:10224-10312 placement
/**
 * 汇总最近的用量记录。
 */
async function aggregateRecentUsage(storageV5) {
  let n = Date.now() - USAGE_WINDOW_MS;
  let o = new Map();
  await scanTranscripts(n, (s) => addSkillAttribution(o, s), storageV5);
  return o;
}
//@ chunk-ya28b76p.js:10312-10772 placement = loadAllSubagentTranscriptsFromDisk (0.769)
async function loadAllSubagentTranscriptsFromDisk(e) {
  let n;
  try {
    n = await readdir(e, {
      withFileTypes: true,
    });
  } catch (error) {
    if (isFsInaccessible(error)) return [];
    throw error;
  }
  let o = [];
  let s = [];
  for (let i of n)
    if (i.isFile() && extname(i.name) === ".jsonl") o.push(join(e, i.name));
    else if (i.isDirectory()) s.push(i.name);
  let results = await Promise.all(
    s.map(async (i) => {
      let subagentsDir = join(e, i, "subagents");
      try {
        return (
          await readdir(subagentsDir, {
            recursive: true,
          })
        )
          .filter((T) => extname(T) === ".jsonl")
          .map((T) => join(subagentsDir, T));
      } catch (error) {
        if (isFsInaccessible(error)) return [];
        throw error;
      }
    }),
  );
  for (let i of results) for (let c of i) o.push(c);
  return o;
}
//@ chunk-ya28b76p.js:10772-10856 placement
async function scanTranscriptIntoUsage(e, n, o) {
  let usageTotals = newUsageTotals();
  await readTranscriptFileLines(
    e,
    n,
    transcriptReadPlan(usageTotals, n, e.includes(SUBAGENT_TRANSCRIPT_MARK), o),
  );
  return usageTotals;
}
//@ chunk-ya28b76p.js:10856-11042 placement
async function readTranscriptFileLines(e, n, o) {
  let s;
  try {
    s = await stat(e);
  } catch (error) {
    if (isFsInaccessible(error)) return;
    throw error;
  }
  if (!s.isFile() || s.mtimeMs < n) return;
  try {
    for await (let r of readLines(e)) o(r);
  } catch (error) {
    if (isFsInaccessible(error)) return;
    throw error;
  }
}
//@ chunk-ya28b76p.js:11042-11084 placement
function newUsageTotals() {
  return {
    records: [],
    fires: [],
  };
}
//@ chunk-ya28b76p.js:11084-11166 placement
function transcriptReadPlan(usageTotals, n, o, s) {
  let r = attributeLoopRuns(usageTotals, n, o);
  if (!s) return r;
  return (i) => {
    r(i);
    s.line(i, usageTotals);
  };
}
//@ chunk-ya28b76p.js:11166-11304 placement
function safeLineSink(e) {
  let n = true;
  let o = (s) => {
    if (!n) return;
    try {
      s();
    } catch (error) {
      n = false;
      logError(error);
    }
  };
  return {
    line: (s, r) => o(() => e.line(s, r)),
    end: (s) => o(() => e.end(s)),
  };
}
//@ chunk-ya28b76p.js:11304-11369 placement
var COMMAND_NAME_REGEX = /<command-name>([^<]{1,200})<\/command-name>/;
var MAX_COMMAND_NAME_CHARS = 200;
var MAX_COMMAND_NAME_BOUND = 6 * MAX_COMMAND_NAME_CHARS;
//@ chunk-ya28b76p.js:11369-13867 placement
function attributeLoopRuns(e, n, isWorkflow) {
  let s = 0;
  let r = [];
  let i = [];
  let c = 0;
  let tracker = createContextTracker();
  let T = true;
  let a;
  let u = new Map();
  let g = () => {
    s++;
    i = [];
    c = 0;
    T = false;
  };
  let R = () => {
    s++;
    i = [];
    c = 0;
    T = true;
    b = undefined;
    a = undefined;
  };
  let O = () => {
    if (!a) return;
    c = Math.max(0, c - 1);
    if (a.run) {
      e.fires.pop();
      i.pop();
    }
    if (a.fire && a.fire.taskId === undefined) r.unshift(a.fire);
    a = undefined;
  };
  let y = () => {
    if (a?.isCommandRecord) {
      O();
      R();
    }
  };
  let b;
  let L = (m, f) => {
    let jsonStringField = readJsonStringField(m, rt, 0, f);
    if (jsonStringField !== undefined) {
      let index = r.findIndex((h) => h.uuid === jsonStringField);
      return index < 0 ? undefined : r.splice(index, 1)[0];
    }
    let jsonStringField_2 = readJsonStringField(m, G, 0, f);
    if (jsonStringField_2 !== undefined) {
      let lastIndex = r.findLastIndex((A) => A.taskId === jsonStringField_2);
      if (lastIndex < 0) return;
      let h = r[lastIndex];
      r = r.filter((A) => A.taskId !== jsonStringField_2);
      return h;
    }
    if (!(
      indexOfBytes(m, mt, 0, f) < 0 &&
      (indexOfBytes(m, K, 0, f) >= 0 || containsAnyMarker(m, COMMAND_MESSAGE_MARKERS, f))
    )) {
      r = r.filter((C) => C.taskId !== undefined);
      return;
    }
    if (r[0]?.taskId === undefined) return r.shift();
    return;
  };
  let N = (m, f) =>
    indexOfBytes(m, K, 0, f) >= 0 &&
    (flattened.some((S) => indexOfBytes(m, S, 0, f) >= 0) ||
      flattened_2.some((S) => indexOfBytes(m, S, 0, f) >= 0));
  return (m) => {
    let f = m.length;
    if (indexOfBytes(m, KLr, 0, f) >= 0) {
      let record = parseUsageRecord(m, 0, f, isWorkflow);
      T = true;
      a = undefined;
      if (record) {
        trackContextGrowth(tracker, record);
        let E = u.get(record.isSubagent);
        if (
          E?.cached === record.cached &&
          E.cacheCreate === record.cacheCreate &&
          E.uncached === record.uncached
        )
          record.recached = E.recached;
        else if (E)
          record.recached = Math.min(
            record.cacheCreate,
            Math.max(0, E.cached + E.cacheCreate - record.cached),
          );
        u.set(record.isSubagent, record);
      }
      if (record && record.ts >= n) {
        if (c > 1 && i.length > 0) {
          let share = 1 / c;
          record.loopShares = i.map((M) => ({
            ...M,
            share,
          }));
        } else if (i[0]) {
          record.loop = i[0].loop;
          record.loopFireTs = i[0].fireTs;
        }
        e.records.push(record);
      }
      return;
    }
    if (indexOfBytes(m, hPo, 0, f) >= 0) {
      let S = indexOfBytes(m, yPo, 0, f);
      if (S < 0) addFirstPromptBytes(tracker, f);
      else if (isLargeToolResultBytes(f - S)) {
        let z = indexOfBytes(m, _Po, S, f);
        addLargeToolResultBytes(tracker, (z < 0 ? f : z) - S);
      }
      if (
        S >= 0 ||
        indexOfBytes(m, it, 0, f) >= 0 ||
        indexOfBytes(m, ut, 0, f) >= 0 ||
        containsAnyMarker(m, BASH_OUTPUT_MARKERS, f) ||
        hasNumericTurnField(m, f) ||
        N(m, f)
      )
        return;
      if (indexOfBytes(m, ct, 0, f) >= 0) {
        R();
        return;
      }
      let E = indexOfBytes(m, K, 0, f) >= 0;
      if (E && containsAnyMarker(m, HOOK_STOPPED_MARKERS, f)) {
        O();
        if (c === 0) R();
        return;
      }
      if (containsAnyMarker(m, LOCAL_COMMAND_OUTPUT_MARKERS, f)) {
        y();
        return;
      }
      let M = containsAnyMarker(m, COMMAND_MESSAGE_MARKERS, f);
      if (
        containsAnyMarker(m, LOCAL_COMMAND_CAVEAT_MARKERS, f) ||
        (E && !M && indexOfBytes(m, _t, 0, f) < 0 && indexOfBytes(m, G, 0, f) < 0)
      )
        return;
      let C = indexOfBytes(m, Tt, 0, f) >= 0 || (!E && !M && indexOfBytes(m, G, 0, f) < 0);
      let h = L(m, f);
      if (h?.openBatch === s && !T && c > 0) R();
      if (T || C) g();
      c++;
      a = {
        fire: h,
        run: false,
        isCommandRecord: M,
      };
      if (!h) {
        b = undefined;
        return;
      }
      let A = h.loop ?? parseLoopRecord(m, f);
      if (!A) return;
      if (!A.isDynamic) b = undefined;
      if (h.ts < n) return;
      e.fires.push({
        ts: h.ts,
        uuid: h.uuid,
        loop: A,
      });
      i.push({
        loop: A,
        fireTs: h.ts,
      });
      a.run = true;
      return;
    }
    if (containsAnyMarker(m, COMPACT_BOUNDARY_BYTES, f)) {
      u.clear();
      return;
    }
    if (tracker.lastRequest === undefined && indexOfBytes(m, pt, 0, f) >= 0) {
      addFirstPromptBytes(tracker, f);
      return;
    }
    if (
      indexOfBytes(m, St, 0, f) >= 0 &&
      indexOfBytes(m, Rt, 0, f) >= 0 &&
      containsAnyMarker(m, LOCAL_COMMAND_OUTPUT_MARKERS, f)
    ) {
      y();
      return;
    }
    if (indexOfBytes(m, dt, 0, f) >= 0 && indexOfBytes(m, ft, 0, f) >= 0) {
      R();
      return;
    }
    if (indexOfBytes(m, ot, 0, f) >= 0) {
      let jsonStringField = readJsonStringField(m, le, 0, f);
      let E = jsonStringField ? Date.parse(jsonStringField) : NaN;
      if (Number.isNaN(E)) return;
      let jsonStringFieldBounded = readJsonStringFieldBounded(m, Mt, 0, f, MAX_COMMAND_NAME_BOUND);
      let C = jsonStringFieldBounded
        ? clippedMessage(jsonStringFieldBounded, MAX_COMMAND_NAME_CHARS)
        : undefined;
      let h = indexOfBytes(m, Ot, 0, f) >= 0;
      if (C && h) {
        b ??= C;
        C = b;
      }
      r.push({
        ts: E,
        openBatch: c > 0 && !T ? s : undefined,
        uuid: readJsonStringField(m, de, 0, f) ?? "",
        taskId: readJsonStringField(m, st, 0, f),
        loop: C
          ? {
              prompt: C,
              cron: normalizeCronExpression(readJsonStringFieldBounded(m, bt, 0, f, MAX_CRON_FIELD_BOUND)),
              isDynamic: h,
            }
          : null,
      });
    }
  };
}
//@ chunk-ya28b76p.js:13867-14003 placement
function hasNumericTurnField(e, n) {
  let o = indexOfBytes(e, ee, 0, n);
  if (o < 0) return false;
  let s = o + ee.length;
  let r = s;
  while (s < n && e[s] >= DIGIT_ZERO_BYTE && e[s] <= DIGIT_NINE_BYTE) s++;
  return s > r && indexOfBytes(e, at, s, n) === s;
}
//@ chunk-ya28b76p.js:14003-14021 placement
var MAX_CRON_FIELD_CHARS = 64;
var MAX_CRON_FIELD_BOUND = 6 * MAX_CRON_FIELD_CHARS;
//@ chunk-ya28b76p.js:14021-14070 placement
function normalizeCronExpression(jsonStringFieldBounded) {
  return jsonStringFieldBounded === undefined
    ? undefined
    : clippedMessage(jsonStringFieldBounded, MAX_CRON_FIELD_CHARS);
}
//@ chunk-ya28b76p.js:14070-14230 placement
function parseLoopRecord(e, n) {
  let o =
    readJsonStringFieldBounded(e, At, 0, n, MAX_COMMAND_NAME_BOUND) ??
    readJsonStringFieldBounded(e, kt, 0, n, MAX_COMMAND_NAME_BOUND);
  if (!o) return null;
  let s = o.match(COMMAND_NAME_REGEX)?.[1];
  let r = clippedMessage(s ?? o, MAX_COMMAND_NAME_CHARS);
  return r
    ? {
        prompt: r,
        cron: undefined,
        isDynamic: false,
      }
    : null;
}
//@ chunk-ya28b76p.js:14230-14934 placement
/**
 * 从转录行字节中解析用量记录：时间戳、会话、各类 token、是否子代理/最大 effort/工作流、模型档位、uuid 及归属（代理、技能、插件、MCP 服务器）。
 */
function parseUsageRecord(e, n, o, isWorkflow) {
  if (indexOfBytes(e, KLr, n, o) < 0) return;
  if (indexOfBytes(e, He, n, o) < 0) return;
  let timestamp = readJsonStringField(e, le, n, o);
  let sessionId = readJsonStringField(e, Ke, n, o);
  if (!timestamp || !sessionId) return;
  let timestamp_2 = Date.parse(timestamp);
  if (Number.isNaN(timestamp_2)) return;
  let uncached = readJsonIntField(e, $e, n, o);
  let output = readJsonIntField(e, Ye, n, o);
  let cacheCreate = readJsonIntField(e, je, n, o);
  let cached = readJsonIntField(e, Xe, n, o);
  if (uncached + output + cacheCreate + cached === 0) return;
  let hasAttribution = indexOfBytes(e, Je, n, o) >= 0;
  let model = readJsonStringField(e, Ge, n, o);
  return {
    ts: timestamp_2,
    sessionId,
    cached,
    cacheCreate,
    recached: 0,
    uncached,
    output,
    isSubagent: indexOfBytes(e, ze, n, o) >= 0 || indexOfBytes(e, Ve, n, o) >= 0,
    isMaxEffort: isTrailingFieldOf(e.subarray(n, o), Qe),
    isWorkflow,
    alwaysOnTokens: 0,
    largeToolResultTokens: 0,
    modelTier: getModelCostWeight(model),
    model,
    uuid:
      readJsonStringField(e, qe, n, o) ?? findCommandField(e, n, o) ?? readJsonStringField(e, de, n, o) ?? "",
    ...(hasAttribution && {
      attributionAgent: readJsonStringField(e, Ze, n, o),
      attributionSkill: readJsonStringField(e, et, n, o),
      attributionPlugin: readJsonStringField(e, tt, n, o),
      attributionMcpServer: readJsonStringField(e, nt, n, o),
    }),
  };
}
//@ chunk-ya28b76p.js:14934-15251 placement
/**
 * 判断文本末尾的闭合括号是否正好闭合某个字段的值（跳过字符串与转义，配对括号）。
 */
function isTrailingFieldOf(e, n) {
  let index = e.lastIndexOf(CLOSE_BRACE_BYTE);
  for (
    let index_2 = e.lastIndexOf(n);
    index_2 >= 0;
    index_2 = index_2 === 0 ? -1 : e.lastIndexOf(n, index_2 - 1)
  ) {
    let r = 1;
    let i = false;
    let c = index_2 + n.length;
    for (; c < e.length && r > 0; c++) {
      let p = e[c];
      if (i) {
        if (p === BACKSLASH_BYTE) c++;
        else if (p === QUOTE_BYTE) i = false;
      } else if (p === QUOTE_BYTE) i = true;
      else if (p === OPEN_BRACE_BYTE || p === OPEN_BRACKET_BYTE) r++;
      else if (p === CLOSE_BRACE_BYTE || p === CLOSE_BRACKET_BYTE) r--;
    }
    if (r === 0 && c - 1 === index) return true;
  }
  return false;
}
//@ chunk-ya28b76p.js:15251-15618 placement
/**
 * 创建用量聚合对象：总成本与请求数、各类附加成本计数，以及按会话、时间桶、代理、技能、插件、MCP 服务器与循环的映射。
 */
function createUsageAggregate() {
  return {
    totalCost: 0,
    requestCount: 0,
    cacheMissCost: 0,
    cacheMissCount: 0,
    longCtxCost: 0,
    longCtxCount: 0,
    maxEffortCost: 0,
    maxEffortCount: 0,
    workflowCost: 0,
    workflowCount: 0,
    alwaysOnCost: 0,
    alwaysOnCount: 0,
    largeToolResultCost: 0,
    largeToolResultCount: 0,
    sessions: new Map(),
    buckets: new Map(),
    byAgent: new Map(),
    bySkill: new Map(),
    byPlugin: new Map(),
    byMcpServer: new Map(),
    loops: new Map(),
  };
}
//@ chunk-ya28b76p.js:15618-15784 placement
function getLoopEntry(e, loop) {
  let o = e.loops.get(loop.prompt);
  if (!o) {
    o = {
      prompt: loop.prompt,
      cron: loop.cron,
      isDynamic: loop.isDynamic,
      runs: 0,
      tokens: 0,
      lastRunMs: 0,
    };
    e.loops.set(loop.prompt, o);
  }
  return o;
}
//@ chunk-ya28b76p.js:15784-15923 placement
function recordLoopRun(usageAggregate, n) {
  let loopEntry = getLoopEntry(usageAggregate, n.loop);
  loopEntry.runs++;
  if (n.ts >= loopEntry.lastRunMs) {
    loopEntry.lastRunMs = n.ts;
    loopEntry.cron = n.loop.cron ?? loopEntry.cron;
    loopEntry.isDynamic = n.loop.isDynamic;
  }
}
//@ chunk-ya28b76p.js:15923-15971 placement
/**
 * 把一次请求的费用按名字累加到占比统计里。
 */
function addToShare(e, n, o) {
  if (n) e.set(n, (e.get(n) ?? 0) + o);
}
//@ chunk-ya28b76p.js:15971-17303 placement
function aggregateUsageByBehavior(usageAggregate, n, o = -1 / 0) {
  let s = costWeightedTokens(n);
  usageAggregate.totalCost += s;
  usageAggregate.requestCount++;
  if (n.attributionAgent) addToShare(usageAggregate.byAgent, n.attributionSkill ?? n.attributionAgent, s);
  else addToShare(usageAggregate.bySkill, n.attributionSkill, s);
  addToShare(usageAggregate.byPlugin, n.attributionPlugin, s);
  addToShare(usageAggregate.byMcpServer, n.attributionMcpServer, s);
  if (n.loop || n.loopShares) {
    let a = n.cached + n.cacheCreate + n.uncached + n.output;
    for (let { loop, fireTs, share } of n.loopShares ?? [
      {
        loop: n.loop,
        fireTs: n.loopFireTs ?? n.ts,
        share: 1,
      },
    ])
      if (fireTs >= o) getLoopEntry(usageAggregate, loop).tokens += a * share;
  }
  let r = n.cached + n.cacheCreate + n.uncached;
  if (n.uncached + n.recached > CACHE_MISS_TOKEN_THRESHOLD) {
    usageAggregate.cacheMissCost += s;
    usageAggregate.cacheMissCount++;
  }
  if (r > LONG_CONTEXT_THRESHOLD) {
    usageAggregate.longCtxCost += s;
    usageAggregate.longCtxCount++;
  }
  if (n.isMaxEffort) {
    usageAggregate.maxEffortCost += s;
    usageAggregate.maxEffortCount++;
  }
  if (n.isWorkflow) {
    usageAggregate.workflowCost += s;
    usageAggregate.workflowCount++;
  }
  let i = s - n.output * 50 * n.modelTier;
  if (n.alwaysOnTokens > 0) {
    usageAggregate.alwaysOnCost += i * Math.min(1, n.alwaysOnTokens / r);
    usageAggregate.alwaysOnCount++;
  }
  if (n.largeToolResultTokens > 0) {
    usageAggregate.largeToolResultCost += i * Math.min(1, n.largeToolResultTokens / r);
    usageAggregate.largeToolResultCount++;
  }
  let c = usageAggregate.sessions.get(n.sessionId);
  if (!c) {
    c = {
      cost: 0,
      requests: 0,
      subCost: 0,
      subCount: 0,
      hours: new Set(),
    };
    usageAggregate.sessions.set(n.sessionId, c);
  }
  c.cost += s;
  c.requests++;
  if (n.isSubagent) {
    c.subCost += s;
    c.subCount++;
  }
  c.hours.add(Math.floor(n.ts / 3600000));
  let floored = Math.floor(n.ts / PARALLEL_BUCKET_MS);
  let T = usageAggregate.buckets.get(floored);
  if (!T) {
    T = {
      sids: new Set(),
      cost: 0,
      count: 0,
    };
    usageAggregate.buckets.set(floored, T);
  }
  T.sids.add(n.sessionId);
  T.cost += s;
  T.count++;
}
//@ chunk-ya28b76p.js:17303-18479 placement
function usageBuckets(usageAggregate) {
  let cost = 0;
  let count = 0;
  let s = 0;
  for (let bucket of usageAggregate.buckets.values()) {
    s = Math.max(s, bucket.sids.size);
    if (bucket.sids.size >= HIGH_PARALLEL_SESSIONS) {
      cost += bucket.cost;
      count += bucket.count;
    }
  }
  let cost_2 = 0;
  let i = 0;
  let cost_3 = 0;
  let p = 0;
  for (let session of usageAggregate.sessions.values()) {
    if (
      session.subCount >= SUBAGENT_HEAVY_COUNT ||
      (session.cost > 0 && session.subCost / session.cost > SUBAGENT_HEAVY_COST_RATIO)
    ) {
      cost_2 += session.cost;
      i++;
    }
    if (session.hours.size >= CRON_SESSION_HOURS) {
      cost_3 += session.cost;
      p++;
    }
  }
  let T = [
    {
      key: "cache_miss",
      cost: usageAggregate.cacheMissCost,
      count: usageAggregate.cacheMissCount,
    },
    {
      key: "long_context",
      cost: usageAggregate.longCtxCost,
      count: usageAggregate.longCtxCount,
    },
    {
      key: "subagent_heavy",
      cost: cost_2,
      count: i,
    },
    {
      key: "high_parallel",
      cost,
      count,
    },
    {
      key: "cron",
      cost: cost_3,
      count: p,
    },
    {
      key: "max_effort",
      cost: usageAggregate.maxEffortCost,
      count: usageAggregate.maxEffortCount,
    },
    {
      key: "workflow",
      cost: usageAggregate.workflowCost,
      count: usageAggregate.workflowCount,
    },
    {
      key: "always_on_context",
      cost: usageAggregate.alwaysOnCost,
      count: usageAggregate.alwaysOnCount,
    },
    {
      key: "large_tool_results",
      cost: usageAggregate.largeToolResultCost,
      count: usageAggregate.largeToolResultCount,
    },
  ];
  T.sort((a, u) => u.cost - a.cost);
  return {
    totalCost: usageAggregate.totalCost,
    requestCount: usageAggregate.requestCount,
    sessionCount: usageAggregate.sessions.size,
    behaviors: T,
    agents: rankShares(usageAggregate.byAgent, usageAggregate.totalCost),
    skills: rankShares(usageAggregate.bySkill, usageAggregate.totalCost),
    plugins: rankShares(usageAggregate.byPlugin, usageAggregate.totalCost),
    mcpServers: rankShares(usageAggregate.byMcpServer, usageAggregate.totalCost),
    loops: [...usageAggregate.loops.values()]
      .map((loop) => ({
        ...loop,
        tokens: Math.round(loop.tokens),
      }))
      .sort((a, u) => u.tokens - a.tokens),
    peakParallel: s,
  };
}
//@ chunk-ya28b76p.js:18479-18641 placement
function rankShares(e, totalCost) {
  if (e.size === 0 || totalCost === 0) return [];
  return [...e.entries()]
    .sort((o, s) => s[1] - o[1])
    .map(([o, s]) => ({
      name: o,
      pct: Math.round((s / totalCost) * 100),
    }))
    .filter((o) => o.pct > 0);
}
export {
  readJsonStringField,
  indexOfBytes,
  KLr,
  readJsonStringFieldBounded,
  isLargeToolResultBytes,
  hPo,
  yPo,
  _Po,
  USD_PER_MTOK_SCALE,
  costWeightedTokens,
  aggregateRecentUsage_2,
  VLr,
  isStatsScanAllowed,
  isUsageScanAllowed,
  isSkillDoctorScanAllowed,
  aggregateRecentUsage,
};
