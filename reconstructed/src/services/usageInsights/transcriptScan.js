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
  Ids,
  Xoo,
  STRUCTURED_OUTPUT_ENFORCE_PREFIX,
  Ods,
  PROJECTS_REPLY_GATE_PREFIX,
  nXt,
  mPn,
  MALFORMED_TOOL_CALL_RETRY,
  Mds,
  fPn,
  pPn,
  TURN_NOT_ENDED_NOTICE,
  OUTPUT_LIMIT_RESUME,
  TIt,
  Lds,
  oXt,
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
import { bV } from "../../utils/stringUtils.js";

//@ chunk-ya28b76p.js:753-1314 placement
var ALLOW_USAGE_TRANSCRIPT_SCAN = "allow_usage_transcript_scan",
  ALLOW_SKILL_DOCTOR_TRANSCRIPT_SCAN = "allow_skill_doctor_transcript_scan",
  ALLOW_STATS_TRANSCRIPT_SCAN = "allow_stats_transcript_scan",
  Ae = {
    policy: ALLOW_USAGE_TRANSCRIPT_SCAN,
    hipaaReason:
      "Not shown under your organization's policy: this breakdown is built by scanning the session transcripts saved on this machine.",
  },
  ke = {
    policy: ALLOW_SKILL_DOCTOR_TRANSCRIPT_SCAN,
    hipaaReason:
      "Not shown under your organization's policy: measured by scanning the session transcripts saved on this machine.",
  },
  we = {
    policy: ALLOW_STATS_TRANSCRIPT_SCAN,
    hipaaReason:
      "Not shown under your organization's policy: these stats are built by scanning the session transcripts saved on this machine.",
  };
//@ chunk-ya28b76p.js:1314-1579 placement
function checkUsagePolicy(e) {
  if (isPolicyAllowed(e.policy)) return { allowed: !0 };
  if (policyDenyKind(e.policy) === "org_denied" && getCurrentTaints().includes("hipaa"))
    return { allowed: !1, reason: e.hipaaReason };
  let { featureLabel: featureLabel, verb: verb } = policyKeyLabel(e.policy);
  return {
    allowed: !1,
    reason:
      policyDeniedReason(e.policy, featureLabel, verb) ?? `${featureLabel} ${verb} unavailable right now.`,
  };
}
//@ chunk-ya28b76p.js:1579-1607 placement
function fAe() {
  return checkUsagePolicy(Ae);
}
//@ chunk-ya28b76p.js:1607-1635 placement
function han() {
  return checkUsagePolicy(ke);
}
//@ chunk-ya28b76p.js:1635-1663 placement
function K2n() {
  return checkUsagePolicy(we);
}
//@ chunk-ya28b76p.js:1762-1774 placement
var E1s = 2.5;
//@ chunk-ya28b76p.js:1774-1926 placement
function createContextTracker() {
  return {
    lastRequest: void 0,
    lastContext: 0,
    carriedTokens: 0,
    firstPromptBytes: 0,
    startTokens: 0,
    pendingToolResultBytes: 0,
    largeToolResultTokens: 0,
  };
}
//@ chunk-ya28b76p.js:1926-1990 placement
function F(e, n) {
  if (e.lastRequest === void 0) e.firstPromptBytes += n;
}
//@ chunk-ya28b76p.js:1990-2023 placement
function yan(e) {
  return e / 2.5 > 1e4;
}
//@ chunk-ya28b76p.js:2023-2077 placement
function Q(e, n) {
  if (yan(n)) e.pendingToolResultBytes += n;
}
/**
 * 按请求跟踪上下文增长：估算会话起始常驻 token、累计大工具结果带来的 token，并把常驻 token（主线程且超 40k）与大结果 token 写入记录。
 */
//@ chunk-ya28b76p.js:2077-2747 placement
function trackContextGrowth(tracker, record) {
  let contextTokens = record.cached + record.cacheCreate + record.uncached;
  if (record.uuid === tracker.lastRequest)
    tracker.carriedTokens = Math.max(tracker.carriedTokens, contextTokens + record.output);
  else {
    if (tracker.lastRequest === void 0)
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
    ((tracker.startTokens = Math.min(tracker.startTokens, contextTokens)),
      (tracker.lastRequest = record.uuid),
      (tracker.lastContext = contextTokens),
      (tracker.carriedTokens = contextTokens + record.output),
      (tracker.pendingToolResultBytes = 0));
  }
  ((record.largeToolResultTokens = tracker.largeToolResultTokens),
    (record.alwaysOnTokens = !record.isSubagent && tracker.startTokens > 40000 ? tracker.startTokens : 0));
}
//@ chunk-ya28b76p.js:2747-5100 placement
var TRANSCRIPT_SCAN_MARKERS = 4,
  ae = 4194304,
  Ne = ae,
  ue = 604800000,
  xe = 1e5,
  Ie = 150000,
  Pe = 3,
  De = 0.5,
  Be = 300000,
  ve = 4,
  Ue = 8,
  Fe = `${sep}subagents${sep}${WORKFLOW_TRANSCRIPT_SUBDIR}${sep}`,
  textEncoder = new TextEncoder(),
  encode = textEncoder.encode('"type":"assistant"'),
  encode_2 = textEncoder.encode('"usage":{'),
  encode_3 = textEncoder.encode('"timestamp":"'),
  encode_4 = textEncoder.encode('"sessionId":"'),
  encode_5 = textEncoder.encode('"model":"'),
  encode_6 = textEncoder.encode('"requestId":"'),
  encode_7 = textEncoder.encode('"id":"'),
  encode_8 = textEncoder.encode("msg_"),
  encode_9 = textEncoder.encode('"uuid":"'),
  encode_10 = textEncoder.encode('"input_tokens":'),
  encode_11 = textEncoder.encode('"output_tokens":'),
  encode_12 = textEncoder.encode('"cache_creation_input_tokens":'),
  encode_13 = textEncoder.encode('"cache_read_input_tokens":'),
  encode_14 = textEncoder.encode('"isSidechain":true'),
  encode_15 = textEncoder.encode('"isSidechain": true'),
  encode_16 = textEncoder.encode('"effort":"max"'),
  encode_17 = textEncoder.encode('"attribution'),
  encode_18 = textEncoder.encode('"attributionAgent":"'),
  encode_19 = textEncoder.encode('"attributionSkill":"'),
  encode_20 = textEncoder.encode('"attributionPlugin":"'),
  encode_21 = textEncoder.encode('"attributionMcpServer":"'),
  encode_22 = textEncoder.encode('"type":"user"'),
  encode_23 = textEncoder.encode('"isMeta":true'),
  encode_24 = textEncoder.encode('"subtype":"scheduled_task_fire"'),
  encode_25 = textEncoder.encode('"taskId":"'),
  encode_26 = textEncoder.encode('"scheduledTaskId":"'),
  encode_27 = textEncoder.encode('"scheduledFireId":"'),
  encode_28 = textEncoder.encode('"type":"tool_result"'),
  encode_29 = textEncoder.encode('"toolUseResult":'),
  encode_30 = textEncoder.encode('"turnCompanion":true'),
  encode_31 = textEncoder.encode(`"text":"${INTERRUPT_MESSAGE.slice(0, -1)}`),
  encode_32 = textEncoder.encode('"content":"['),
  encode_33 = textEncoder.encode(" prior /loop wakeup"),
  encode_34 = textEncoder.encode('"isCompactSummary":true'),
  lt = [textEncoder.encode('"subtype":"compact_boundary"'), ...[]],
  encode_35 = textEncoder.encode('"type":"attachment"'),
  encode_36 = textEncoder.encode('"attachment":{"type":"file"'),
  encode_37 = textEncoder.encode('"type":"queued_command"'),
  encode_38 = textEncoder.encode('"origin":{'),
  encode_39 = textEncoder.encode('"origin":{"kind":"human"'),
  encode_40 = textEncoder.encode('"promptSource":"'),
  encode_41 = textEncoder.encode('"type":"system"'),
  encode_42 = textEncoder.encode('"subtype":"local_command"'),
  w = (e) => [textEncoder.encode(`"content":"<${e}>`), textEncoder.encode(`"text":"<${e}>`)],
  te = [...w("command-message"), ...w("command-name")],
  gt = w(LOCAL_COMMAND_CAVEAT),
  ne = [...w(LOCAL_COMMAND_STDOUT), ...w(LOCAL_COMMAND_STDERR)],
  Et = [...w(BASH_STDOUT), ...w(BASH_STDERR)],
  k = (e, n, o) => n.some((s) => ty(e, s, 0, o) >= 0),
  Ct = [
    textEncoder.encode(`"content":${jsonStringify(HOOK_STOPPED_MESSAGE).slice(0, -1)}`),
    textEncoder.encode(`"text":${jsonStringify(HOOK_STOPPED_MESSAGE).slice(0, -1)}`),
  ],
  pe = (e, n = !1) => {
    let o = n ? jsonStringify(e) : jsonStringify(e).slice(0, -1);
    return [textEncoder.encode(`"content":${o}`), textEncoder.encode(`"text":${o}`)];
  },
  flattened = [
    ...Ids.map((e) => `${e}${Xoo}`),
    STRUCTURED_OUTPUT_ENFORCE_PREFIX,
    Ods,
    PROJECTS_REPLY_GATE_PREFIX,
    BRIEF_ENFORCE_SENTINEL,
    nXt,
    mPn,
  ]
    .filter((e) => e.length > 0)
    .flatMap((e) => pe(e)),
  flattened_2 = [
    MALFORMED_TOOL_CALL_RETRY,
    Mds,
    fPn,
    pPn,
    TURN_NOT_ENDED_NOTICE,
    OUTPUT_LIMIT_RESUME,
    TIt,
    Lds,
    oXt,
    STREAM_CUT_RESUME,
    STREAM_CUT_REWRITE,
  ].flatMap((e) => pe(e, !0)),
  encode_43 = textEncoder.encode('"cron":"'),
  encode_44 = textEncoder.encode('"prompt":"'),
  encode_45 = textEncoder.encode('"taskKind":"loop"'),
  encode_46 = textEncoder.encode('"content":"'),
  encode_47 = textEncoder.encode('"text":"'),
  x = 34,
  fe = 92,
  wt = 123,
  oe = 125,
  Lt = 91,
  Nt = 93,
  W = 48,
  me = 57;
//@ chunk-ya28b76p.js:5100-5172 placement
function ty(e, n, o, s) {
  let index = e.subarray(o, s).indexOf(n);
  return index < 0 ? -1 : o + index;
}
/**
 * 在缓冲区内找到指定 JSON 字段后读出其字符串值（到下一个引号为止）。
 */
//@ chunk-ya28b76p.js:5172-5300 placement
function readJsonStringField(e, n, o, s) {
  let r = ty(e, n, o, s);
  if (r < 0) return;
  let i = r + n.length,
    c = i;
  while (c < s && e[c] !== x) c++;
  return e.toString("utf8", i, c);
}
/**
 * 从原始 JSON 行字节中读取某键的字符串值（有长度上限，截断时修正 UTF-8 与半个 \u 转义），按 JSON 字符串解码。
 */
//@ chunk-ya28b76p.js:5300-5648 placement
function readJsonStringFieldBounded(e, n, o, s, r) {
  let i = ty(e, n, o, s);
  if (i < 0) return;
  let c = i + n.length,
    p = c,
    min = Math.min(s, c + r);
  while (p < min && e[p] !== x) {
    if (e[p] === fe) p++;
    p++;
  }
  let a = p >= min;
  if (p > min) p = min - 1;
  if (a) p = trimPartialUtf8(e, c, p);
  let str = e.toString("utf8", c, p);
  if (a) str = str.replace(/(^|[^\\])((?:\\\\)*)\\u[0-9a-fA-F]{0,3}$/, "$1$2");
  try {
    let g = jsonParseRaw(`"${str}"`);
    return typeof g === "string" ? g : void 0;
  } catch {
    return;
  }
}
//@ chunk-ya28b76p.js:5648-5794 placement
function trimPartialUtf8(e, n, o) {
  let s = o;
  while (s > n && (e[s - 1] & 192) === 128) s--;
  if (s === n) return n;
  let r = e[s - 1],
    i = r >= 240 ? 4 : r >= 224 ? 3 : r >= 192 ? 2 : 1;
  return o - (s - 1) < i ? s - 1 : o;
}
//@ chunk-ya28b76p.js:5794-5970 placement
function findCommandField(e, n, o) {
  let s = n;
  while (!0) {
    if (((s = ty(e, encode_7, s, o)), s < 0)) return;
    let r = s + encode_7.length;
    if (ty(e, encode_8, r, r + 4) === r) {
      let i = r;
      while (i < o && e[i] !== x) i++;
      return e.toString("utf8", r, i);
    }
    s = r;
  }
}
//@ chunk-ya28b76p.js:5970-6103 placement
function readJsonIntField(e, n, o, s) {
  let r = ty(e, n, o, s);
  if (r < 0) return 0;
  let i = r + n.length,
    c = 0;
  while (i < s && e[i] >= W && e[i] <= me) ((c = c * 10 + (e[i] - W)), i++);
  return c;
}
//@ chunk-ya28b76p.js:6103-6260 placement
function getModelCostWeight(e) {
  if (!e) return 3;
  let lower = e.toLowerCase();
  if (lower.includes("fable")) return 10;
  if (lower.includes("opus")) return 5;
  if (lower.includes("haiku")) return 1;
  return 3;
}
//@ chunk-ya28b76p.js:6260-6350 placement
function bPo(e) {
  return (e.cached + e.uncached * 10 + e.cacheCreate * 12.5 + e.output * 50) * e.modelTier;
}
/**
 * 汇总最近 7 天与 1 天的转录用量：按行为聚合记录并统计 loop 运行，返回日/周的分桶结果。
 */
//@ chunk-ya28b76p.js:6350-6546 placement
async function aggregateRecentUsage(e, n) {
  let o = Date.now() - ue,
    s = Date.now() - 86400000,
    r = createUsageAggregate(),
    i = createUsageAggregate();
  return (
    await scanTranscripts(
      o,
      (c) => {
        if ((aggregateUsageByBehavior(i, c), c.ts >= s)) aggregateUsageByBehavior(r, c, s);
      },
      e,
      (c) => {
        if ((recordLoopRun(i, c), c.ts >= s)) recordLoopRun(r, c);
      },
      n,
    ),
    { day: usageBuckets(r), week: usageBuckets(i) }
  );
}
/**
 * 扫描转录：存储 v5 可用时走存储；否则读取各项目目录的全部转录（含子代理），分批解析并回调记录与 loop 触发。
 */
//@ chunk-ya28b76p.js:6546-6890 placement
async function scanTranscripts(e, n, o, s, r) {
  if (o) return scanStoredTranscripts(o, e, n, s, r);
  let i = getProjectsDir(),
    c;
  try {
    c = await readdir(i);
  } catch (error) {
    if (isFsInaccessible(error)) return;
    throw error;
  }
  let flat = (await Promise.all(c.map((u) => loadAllSubagentTranscriptsFromDisk(join(i, u))))).flat(),
    a = makeDedupingSink(n, s);
  for (let u = 0; u < flat.length; u += TRANSCRIPT_SCAN_MARKERS) {
    let sliced = flat.slice(u, u + TRANSCRIPT_SCAN_MARKERS),
      mapped = sliced.map(() => r && safeLineSink(r()));
    (await Promise.all(sliced.map((y, b) => Kt(y, e, mapped[b])))).forEach((y, b) => {
      (a(y), mapped[b]?.end(y));
    });
  }
}
//@ chunk-ya28b76p.js:6890-7085 placement
function makeDedupingSink(e, n) {
  let o = new Set(),
    s = (r) => {
      if (!r) return !0;
      if (o.has(r)) return !1;
      return (o.add(r), !0);
    };
  return (r) => {
    for (let record of r.records) if (s(record.uuid)) e(record);
    if (n) {
      for (let fire of r.fires) if (s(fire.uuid)) n(fire);
    }
  };
}
/**
 * 通过存储 v5 分页列出各项目的转录（受页数预算限制），分批读取解析并回调，被截断时记日志。
 */
//@ chunk-ya28b76p.js:7085-7678 placement
async function scanStoredTranscripts(storage, minMtimeMs, foldSpec, foldOptions, startSpan) {
  let projectKeys = [],
    budget = createPageBudget(),
    pages = await readAllPages(
      (R) =>
        storage.listEntries(
          { namespace: "transcript" },
          { skipScopeStats: !0, ...(R !== void 0 && { cursor: R }) },
        ),
      (R) => {
        for (let O of R) {
          let y = listedProjectKey(O, isValidKeySegment);
          if (y !== void 0) projectKeys.push(y);
        }
      },
      { budget: budget },
    );
  logListingOutcome("project", pages, budget);
  let flat = (
      await Promise.all(projectKeys.map((R) => listProjectTranscriptKeys(storage, R, minMtimeMs, budget)))
    ).flat(),
    fold = makeDedupingSink(foldSpec, foldOptions);
  for (let R = 0; R < flat.length; R += TRANSCRIPT_SCAN_MARKERS) {
    let sliced = flat.slice(R, R + TRANSCRIPT_SCAN_MARKERS),
      mapped = sliced.map(() => startSpan && safeLineSink(startSpan()));
    (
      await Promise.all(sliced.map((L, N) => readStoredTranscript(storage, L, minMtimeMs, mapped[N])))
    ).forEach((L, N) => {
      (fold(L), mapped[N]?.end(L));
    });
  }
  let cappedPages = cappedPagesBeyondFirst(budget);
  if (cappedPages > 0)
    logForDebugging(
      `foldRecentRecords: ${cappedPages} more v5 listings were cut short after the scan's ${DEFAULT_MAX_PAGES}-page budget ran out`,
    );
}
/**
 * 列出项目下的会话转录键：分页读取主转录键与会话目录，按修改时间过滤会话，再并行列出各会话的子代理转录键。
 */
//@ chunk-ya28b76p.js:7678-8280 placement
async function listProjectTranscriptKeys(storage, projectKey, minMtimeMs, budget) {
  let keys = [],
    sessionIds = [],
    pages = await readAllPages(
      (u) =>
        storage.listEntries(
          { namespace: "transcript", projectKey: projectKey },
          { skipScopeStats: !0, ...(u !== void 0 && { cursor: u }) },
        ),
      (u) => {
        for (let g of u)
          if (g.kind === "key") pushTranscriptKey(keys, g);
          else if (
            g.scope.namespace === "transcript" &&
            g.scope.sessionId !== void 0 &&
            isValidKeySegment(g.scope.sessionId)
          )
            sessionIds.push(g.scope.sessionId);
      },
      { budget: budget },
    );
  logListingOutcome("session", pages, budget);
  let mtimeBySession = new Map();
  for (let u of keys)
    if (u.key.namespace === "transcript" && u.key.agentId === void 0 && u.key.journal !== !0)
      mtimeBySession.set(u.key.sessionId, u.mtimeMs);
  let filtered = sessionIds.filter((u) => (mtimeBySession.get(u) ?? 1 / 0) >= minMtimeMs),
    results = await Promise.all(
      filtered.map((u) => listSessionTranscriptKeys(storage, projectKey, u, budget)),
    );
  return keys.concat(results.flat());
}
/**
 * 递归列出某会话（或子代理路径）下的子代理与日志转录键。
 */
//@ chunk-ya28b76p.js:8280-8863 placement
async function listSessionTranscriptKeys(storage, projectKey, sessionId, budget, agentRelPath) {
  let keys = [],
    childPaths = [],
    pages = await readAllPages(
      (a) =>
        storage.listEntries(
          {
            namespace: "transcript",
            projectKey: projectKey,
            sessionId: sessionId,
            ...(agentRelPath !== void 0 && { agentRelPath: agentRelPath }),
          },
          { skipScopeStats: !0, ...(a !== void 0 && { cursor: a }) },
        ),
      (a) => {
        for (let u of a)
          if (u.kind === "key") {
            if (u.key.namespace === "transcript" && (u.key.agentId !== void 0 || u.key.journal === !0))
              pushTranscriptKey(keys, u);
          } else if (
            u.scope.namespace === "transcript" &&
            u.scope.agentRelPath !== void 0 &&
            u.scope.agentRelPath.length > (agentRelPath?.length ?? 0)
          )
            childPaths.push(u.scope.agentRelPath);
      },
      { budget: budget },
    );
  logListingOutcome("subagent", pages, budget);
  let results = await Promise.all(
    childPaths.map((a) => listSessionTranscriptKeys(storage, projectKey, sessionId, budget, a)),
  );
  return keys.concat(results.flat());
}
//@ chunk-ya28b76p.js:8863-9128 placement
function logListingOutcome(e, n, o) {
  let s = noteValidationIssue(n, o);
  if (n.status === "error") logForDebugging(`foldRecentRecords: v5 ${e} listing failed: ${n.error.code}`);
  else if (s === "first-truncation")
    logForDebugging(
      `foldRecentRecords: v5 ${e} listing cut short (the scan's ${DEFAULT_MAX_PAGES}-page budget is spent); keeping what was listed`,
    );
}
//@ chunk-ya28b76p.js:9128-9282 placement
function pushTranscriptKey(e, n) {
  if (n.kind === "key" && n.key.namespace === "transcript" && n.size !== void 0 && n.mtimeMs !== void 0)
    e.push({ key: n.key, size: n.size, mtimeMs: n.mtimeMs });
}
//@ chunk-ya28b76p.js:9282-9431 placement
async function readStoredTranscript(e, n, o, s) {
  let r = ge();
  if (n.mtimeMs >= o)
    await readStoredTranscriptLines(
      e,
      n,
      Ee(r, o, n.key.namespace === "transcript" && n.key.agentRelPath?.[0] === WORKFLOW_TRANSCRIPT_SUBDIR, s),
    );
  return r;
}
/**
 * 按块从存储读取转录并按换行切分逐行回调（跨块拼接不完整的行）。
 */
//@ chunk-ya28b76p.js:9431-10077 placement
async function readStoredTranscriptLines(e, n, o) {
  let { key: key } = n,
    readWhole = n.size <= ae,
    offset = 0,
    pendingChunks = [],
    pendingBytes = 0;
  while (!0) {
    let read = await e.read([readWhole ? key : { key: key, offset: offset, length: Ne }]);
    if (!read.ok) {
      logForDebugging(`readRecordsFromStream: v5 read failed: ${read.error.code}`);
      return;
    }
    let a = read.value.items[0];
    if (!a.found) return;
    let buffer = Buffer.from(a.value.buffer, a.value.byteOffset, a.value.byteLength),
      g = 0;
    while (g < buffer.length) {
      let index = buffer.indexOf(10, g);
      if (index === -1) {
        (pendingChunks.push(Buffer.from(buffer.subarray(g))), (pendingBytes += buffer.length - g));
        break;
      }
      if (pendingBytes === 0) o(buffer.subarray(g, index));
      else
        (o(Buffer.concat([...pendingChunks, buffer.subarray(g, index)], pendingBytes + (index - g))),
          (pendingChunks = []),
          (pendingBytes = 0));
      g = index + 1;
    }
    if (((offset += a.value.byteLength), readWhole || a.value.byteLength === 0 || offset >= a.totalBytes))
      break;
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
async function k1s(e) {
  let n = Date.now() - ue,
    o = new Map();
  return (await scanTranscripts(n, (s) => addSkillAttribution(o, s), e), o);
}
//@ chunk-ya28b76p.js:10312-10772 placement = loadAllSubagentTranscriptsFromDisk (0.769)
async function loadAllSubagentTranscriptsFromDisk(e) {
  let n;
  try {
    n = await readdir(e, { withFileTypes: !0 });
  } catch (error) {
    if (isFsInaccessible(error)) return [];
    throw error;
  }
  let o = [],
    s = [];
  for (let i of n)
    if (i.isFile() && extname(i.name) === ".jsonl") o.push(join(e, i.name));
    else if (i.isDirectory()) s.push(i.name);
  let results = await Promise.all(
    s.map(async (i) => {
      let subagentsDir = join(e, i, "subagents");
      try {
        return (await readdir(subagentsDir, { recursive: !0 }))
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
async function Kt(e, n, o) {
  let s = ge();
  return (await readTranscriptFileLines(e, n, Ee(s, n, e.includes(Fe), o)), s);
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
function ge() {
  return { records: [], fires: [] };
}
//@ chunk-ya28b76p.js:11084-11166 placement
function Ee(e, n, o, s) {
  let r = attributeLoopRuns(e, n, o);
  if (!s) return r;
  return (i) => {
    (r(i), s.line(i, e));
  };
}
//@ chunk-ya28b76p.js:11166-11304 placement
function safeLineSink(e) {
  let n = !0,
    o = (s) => {
      if (!n) return;
      try {
        s();
      } catch (error) {
        ((n = !1), logError(error));
      }
    };
  return { line: (s, r) => o(() => e.line(s, r)), end: (s) => o(() => e.end(s)) };
}
//@ chunk-ya28b76p.js:11304-11369 placement
var Wt = /<command-name>([^<]{1,200})<\/command-name>/,
  X = 200,
  Y = 6 * X;
//@ chunk-ya28b76p.js:11369-13867 placement
function attributeLoopRuns(e, n, o) {
  let s = 0,
    r = [],
    i = [],
    c = 0,
    p = createContextTracker(),
    T = !0,
    a,
    u = new Map(),
    g = () => {
      (s++, (i = []), (c = 0), (T = !1));
    },
    R = () => {
      (s++, (i = []), (c = 0), (T = !0), (b = void 0), (a = void 0));
    },
    O = () => {
      if (!a) return;
      if (((c = Math.max(0, c - 1)), a.run)) (e.fires.pop(), i.pop());
      if (a.fire && a.fire.taskId === void 0) r.unshift(a.fire);
      a = void 0;
    },
    y = () => {
      if (a?.isCommandRecord) (O(), R());
    },
    b,
    L = (m, f) => {
      let S = readJsonStringField(m, encode_27, 0, f);
      if (S !== void 0) {
        let index = r.findIndex((h) => h.uuid === S);
        return index < 0 ? void 0 : r.splice(index, 1)[0];
      }
      let E = readJsonStringField(m, encode_26, 0, f);
      if (E !== void 0) {
        let lastIndex = r.findLastIndex((A) => A.taskId === E);
        if (lastIndex < 0) return;
        let h = r[lastIndex];
        return ((r = r.filter((A) => A.taskId !== E)), h);
      }
      if (!(ty(m, encode_38, 0, f) < 0 && (ty(m, encode_23, 0, f) >= 0 || k(m, te, f)))) {
        r = r.filter((C) => C.taskId !== void 0);
        return;
      }
      if (r[0]?.taskId === void 0) return r.shift();
      return;
    },
    N = (m, f) =>
      ty(m, encode_23, 0, f) >= 0 &&
      (flattened.some((S) => ty(m, S, 0, f) >= 0) || flattened_2.some((S) => ty(m, S, 0, f) >= 0));
  return (m) => {
    let f = m.length;
    if (ty(m, encode, 0, f) >= 0) {
      let S = parseUsageRecord(m, 0, f, o);
      if (((T = !0), (a = void 0), S)) {
        trackContextGrowth(p, S);
        let E = u.get(S.isSubagent);
        if (E?.cached === S.cached && E.cacheCreate === S.cacheCreate && E.uncached === S.uncached)
          S.recached = E.recached;
        else if (E) S.recached = Math.min(S.cacheCreate, Math.max(0, E.cached + E.cacheCreate - S.cached));
        u.set(S.isSubagent, S);
      }
      if (S && S.ts >= n) {
        if (c > 1 && i.length > 0) {
          let E = 1 / c;
          S.loopShares = i.map((M) => ({ ...M, share: E }));
        } else if (i[0]) ((S.loop = i[0].loop), (S.loopFireTs = i[0].fireTs));
        e.records.push(S);
      }
      return;
    }
    if (ty(m, encode_22, 0, f) >= 0) {
      let S = ty(m, encode_28, 0, f);
      if (S < 0) F(p, f);
      else if (yan(f - S)) {
        let z = ty(m, encode_29, S, f);
        Q(p, (z < 0 ? f : z) - S);
      }
      if (
        S >= 0 ||
        ty(m, encode_30, 0, f) >= 0 ||
        ty(m, encode_34, 0, f) >= 0 ||
        k(m, Et, f) ||
        hasNumericTurnField(m, f) ||
        N(m, f)
      )
        return;
      if (ty(m, encode_31, 0, f) >= 0) {
        R();
        return;
      }
      let E = ty(m, encode_23, 0, f) >= 0;
      if (E && k(m, Ct, f)) {
        if ((O(), c === 0)) R();
        return;
      }
      if (k(m, ne, f)) {
        y();
        return;
      }
      let M = k(m, te, f);
      if (k(m, gt, f) || (E && !M && ty(m, encode_40, 0, f) < 0 && ty(m, encode_26, 0, f) < 0)) return;
      let C = ty(m, encode_39, 0, f) >= 0 || (!E && !M && ty(m, encode_26, 0, f) < 0),
        h = L(m, f);
      if (h?.openBatch === s && !T && c > 0) R();
      if (T || C) g();
      if ((c++, (a = { fire: h, run: !1, isCommandRecord: M }), !h)) {
        b = void 0;
        return;
      }
      let A = h.loop ?? parseLoopRecord(m, f);
      if (!A) return;
      if (!A.isDynamic) b = void 0;
      if (h.ts < n) return;
      (e.fires.push({ ts: h.ts, uuid: h.uuid, loop: A }), i.push({ loop: A, fireTs: h.ts }), (a.run = !0));
      return;
    }
    if (k(m, lt, f)) {
      u.clear();
      return;
    }
    if (p.lastRequest === void 0 && ty(m, encode_36, 0, f) >= 0) {
      F(p, f);
      return;
    }
    if (ty(m, encode_41, 0, f) >= 0 && ty(m, encode_42, 0, f) >= 0 && k(m, ne, f)) {
      y();
      return;
    }
    if (ty(m, encode_35, 0, f) >= 0 && ty(m, encode_37, 0, f) >= 0) {
      R();
      return;
    }
    if (ty(m, encode_24, 0, f) >= 0) {
      let S = readJsonStringField(m, encode_3, 0, f),
        E = S ? Date.parse(S) : NaN;
      if (Number.isNaN(E)) return;
      let M = readJsonStringFieldBounded(m, encode_44, 0, f, Y),
        C = M ? bV(M, X) : void 0,
        h = ty(m, encode_45, 0, f) >= 0;
      if (C && h) ((b ??= C), (C = b));
      r.push({
        ts: E,
        openBatch: c > 0 && !T ? s : void 0,
        uuid: readJsonStringField(m, encode_9, 0, f) ?? "",
        taskId: readJsonStringField(m, encode_25, 0, f),
        loop: C
          ? { prompt: C, cron: Xt(readJsonStringFieldBounded(m, encode_43, 0, f, jt)), isDynamic: h }
          : null,
      });
    }
  };
}
//@ chunk-ya28b76p.js:13867-14003 placement
function hasNumericTurnField(e, n) {
  let o = ty(e, encode_32, 0, n);
  if (o < 0) return !1;
  let s = o + encode_32.length,
    r = s;
  while (s < n && e[s] >= W && e[s] <= me) s++;
  return s > r && ty(e, encode_33, s, n) === s;
}
//@ chunk-ya28b76p.js:14003-14021 placement
var he = 64,
  jt = 6 * he;
//@ chunk-ya28b76p.js:14021-14070 placement
function Xt(e) {
  return e === void 0 ? void 0 : bV(e, he);
}
//@ chunk-ya28b76p.js:14070-14230 placement
function parseLoopRecord(e, n) {
  let o =
    readJsonStringFieldBounded(e, encode_46, 0, n, Y) ?? readJsonStringFieldBounded(e, encode_47, 0, n, Y);
  if (!o) return null;
  let s = o.match(Wt)?.[1],
    r = bV(s ?? o, X);
  return r ? { prompt: r, cron: void 0, isDynamic: !1 } : null;
}
/**
 * 从转录行字节中解析用量记录：时间戳、会话、各类 token、是否子代理/最大 effort/工作流、模型档位、uuid 及归属（代理、技能、插件、MCP 服务器）。
 */
//@ chunk-ya28b76p.js:14230-14934 placement
function parseUsageRecord(e, n, o, s) {
  if (ty(e, encode, n, o) < 0) return;
  if (ty(e, encode_2, n, o) < 0) return;
  let timestamp = readJsonStringField(e, encode_3, n, o),
    sessionId = readJsonStringField(e, encode_4, n, o);
  if (!timestamp || !sessionId) return;
  let parse = Date.parse(timestamp);
  if (Number.isNaN(parse)) return;
  let uncached = readJsonIntField(e, encode_10, n, o),
    output = readJsonIntField(e, encode_11, n, o),
    cacheCreate = readJsonIntField(e, encode_12, n, o),
    cached = readJsonIntField(e, encode_13, n, o);
  if (uncached + output + cacheCreate + cached === 0) return;
  let hasAttribution = ty(e, encode_17, n, o) >= 0,
    model = readJsonStringField(e, encode_5, n, o);
  return {
    ts: parse,
    sessionId: sessionId,
    cached: cached,
    cacheCreate: cacheCreate,
    recached: 0,
    uncached: uncached,
    output: output,
    isSubagent: ty(e, encode_14, n, o) >= 0 || ty(e, encode_15, n, o) >= 0,
    isMaxEffort: isTrailingFieldOf(e.subarray(n, o), encode_16),
    isWorkflow: s,
    alwaysOnTokens: 0,
    largeToolResultTokens: 0,
    modelTier: getModelCostWeight(model),
    model: model,
    uuid:
      readJsonStringField(e, encode_6, n, o) ??
      findCommandField(e, n, o) ??
      readJsonStringField(e, encode_9, n, o) ??
      "",
    ...(hasAttribution && {
      attributionAgent: readJsonStringField(e, encode_18, n, o),
      attributionSkill: readJsonStringField(e, encode_19, n, o),
      attributionPlugin: readJsonStringField(e, encode_20, n, o),
      attributionMcpServer: readJsonStringField(e, encode_21, n, o),
    }),
  };
}
/**
 * 判断文本末尾的闭合括号是否正好闭合某个字段的值（跳过字符串与转义，配对括号）。
 */
//@ chunk-ya28b76p.js:14934-15251 placement
function isTrailingFieldOf(e, n) {
  let index = e.lastIndexOf(oe);
  for (
    let index_2 = e.lastIndexOf(n);
    index_2 >= 0;
    index_2 = index_2 === 0 ? -1 : e.lastIndexOf(n, index_2 - 1)
  ) {
    let r = 1,
      i = !1,
      c = index_2 + n.length;
    for (; c < e.length && r > 0; c++) {
      let p = e[c];
      if (i) {
        if (p === fe) c++;
        else if (p === x) i = !1;
      } else if (p === x) i = !0;
      else if (p === wt || p === Lt) r++;
      else if (p === oe || p === Nt) r--;
    }
    if (r === 0 && c - 1 === index) return !0;
  }
  return !1;
}
/**
 * 创建用量聚合对象：总成本与请求数、各类附加成本计数，以及按会话、时间桶、代理、技能、插件、MCP 服务器与循环的映射。
 */
//@ chunk-ya28b76p.js:15251-15618 placement
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
function getLoopEntry(e, n) {
  let o = e.loops.get(n.prompt);
  if (!o)
    ((o = { prompt: n.prompt, cron: n.cron, isDynamic: n.isDynamic, runs: 0, tokens: 0, lastRunMs: 0 }),
      e.loops.set(n.prompt, o));
  return o;
}
//@ chunk-ya28b76p.js:15784-15923 placement
function recordLoopRun(e, n) {
  let o = getLoopEntry(e, n.loop);
  if ((o.runs++, n.ts >= o.lastRunMs))
    ((o.lastRunMs = n.ts), (o.cron = n.loop.cron ?? o.cron), (o.isDynamic = n.loop.isDynamic));
}
//@ chunk-ya28b76p.js:15923-15971 placement
function P(e, n, o) {
  if (n) e.set(n, (e.get(n) ?? 0) + o);
}
//@ chunk-ya28b76p.js:15971-17303 placement
function aggregateUsageByBehavior(e, n, o = -1 / 0) {
  let s = bPo(n);
  if (((e.totalCost += s), e.requestCount++, n.attributionAgent))
    P(e.byAgent, n.attributionSkill ?? n.attributionAgent, s);
  else P(e.bySkill, n.attributionSkill, s);
  if (
    (P(e.byPlugin, n.attributionPlugin, s),
    P(e.byMcpServer, n.attributionMcpServer, s),
    n.loop || n.loopShares)
  ) {
    let a = n.cached + n.cacheCreate + n.uncached + n.output;
    for (let { loop: loop, fireTs: fireTs, share: share } of n.loopShares ?? [
      { loop: n.loop, fireTs: n.loopFireTs ?? n.ts, share: 1 },
    ])
      if (fireTs >= o) getLoopEntry(e, loop).tokens += a * share;
  }
  let r = n.cached + n.cacheCreate + n.uncached;
  if (n.uncached + n.recached > xe) ((e.cacheMissCost += s), e.cacheMissCount++);
  if (r > Ie) ((e.longCtxCost += s), e.longCtxCount++);
  if (n.isMaxEffort) ((e.maxEffortCost += s), e.maxEffortCount++);
  if (n.isWorkflow) ((e.workflowCost += s), e.workflowCount++);
  let i = s - n.output * 50 * n.modelTier;
  if (n.alwaysOnTokens > 0) ((e.alwaysOnCost += i * Math.min(1, n.alwaysOnTokens / r)), e.alwaysOnCount++);
  if (n.largeToolResultTokens > 0)
    ((e.largeToolResultCost += i * Math.min(1, n.largeToolResultTokens / r)), e.largeToolResultCount++);
  let c = e.sessions.get(n.sessionId);
  if (!c)
    ((c = { cost: 0, requests: 0, subCost: 0, subCount: 0, hours: new Set() }),
      e.sessions.set(n.sessionId, c));
  if (((c.cost += s), c.requests++, n.isSubagent)) ((c.subCost += s), c.subCount++);
  c.hours.add(Math.floor(n.ts / 3600000));
  let floored = Math.floor(n.ts / Be),
    T = e.buckets.get(floored);
  if (!T) ((T = { sids: new Set(), cost: 0, count: 0 }), e.buckets.set(floored, T));
  (T.sids.add(n.sessionId), (T.cost += s), T.count++);
}
//@ chunk-ya28b76p.js:17303-18479 placement
function usageBuckets(e) {
  let n = 0,
    o = 0,
    s = 0;
  for (let a of e.buckets.values())
    if (((s = Math.max(s, a.sids.size)), a.sids.size >= ve)) ((n += a.cost), (o += a.count));
  let r = 0,
    i = 0,
    c = 0,
    p = 0;
  for (let a of e.sessions.values()) {
    if (a.subCount >= Pe || (a.cost > 0 && a.subCost / a.cost > De)) ((r += a.cost), i++);
    if (a.hours.size >= Ue) ((c += a.cost), p++);
  }
  let T = [
    { key: "cache_miss", cost: e.cacheMissCost, count: e.cacheMissCount },
    { key: "long_context", cost: e.longCtxCost, count: e.longCtxCount },
    { key: "subagent_heavy", cost: r, count: i },
    { key: "high_parallel", cost: n, count: o },
    { key: "cron", cost: c, count: p },
    { key: "max_effort", cost: e.maxEffortCost, count: e.maxEffortCount },
    { key: "workflow", cost: e.workflowCost, count: e.workflowCount },
    { key: "always_on_context", cost: e.alwaysOnCost, count: e.alwaysOnCount },
    { key: "large_tool_results", cost: e.largeToolResultCost, count: e.largeToolResultCount },
  ];
  return (
    T.sort((a, u) => u.cost - a.cost),
    {
      totalCost: e.totalCost,
      requestCount: e.requestCount,
      sessionCount: e.sessions.size,
      behaviors: T,
      agents: rankShares(e.byAgent, e.totalCost),
      skills: rankShares(e.bySkill, e.totalCost),
      plugins: rankShares(e.byPlugin, e.totalCost),
      mcpServers: rankShares(e.byMcpServer, e.totalCost),
      loops: [...e.loops.values()]
        .map((a) => ({ ...a, tokens: Math.round(a.tokens) }))
        .sort((a, u) => u.tokens - a.tokens),
      peakParallel: s,
    }
  );
}
//@ chunk-ya28b76p.js:18479-18641 placement
function rankShares(e, n) {
  if (e.size === 0 || n === 0) return [];
  return [...e.entries()]
    .sort((o, s) => s[1] - o[1])
    .map(([o, s]) => ({ name: o, pct: Math.round((s / n) * 100) }))
    .filter((o) => o.pct > 0);
}

export {
  readJsonStringField,
  ty,
  encode,
  readJsonStringFieldBounded,
  yan,
  encode_22,
  encode_28,
  encode_29,
  E1s,
  bPo,
  aggregateRecentUsage,
  encode_7,
  K2n,
  fAe,
  han,
  k1s,
};
