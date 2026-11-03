/**
 * services/feedback/submitFeedback.ts
 *
 * 2.1.316 新增：/feedback 请求组装：挑选会话记录、列出近期会话、错误分类。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-xx1vmpsq.js (33)
 * attribution: placement 33
 */
import { dirname, basename, join, join as join_2 } from "path";
import { readdir, stat, stat as stat_2 } from "fs/promises";
import { jsonStringify, jsonParse } from "../../utils/slowOperations.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, o } from "../../../vendor/zod/v4/classic/schemas.js";
import { vc } from "../../utils/taskDescription.js";
import {
  FEEDBACK_DISABLED_BY_POLICY,
  appendBugReportHint,
  checkProductFeedbackAllowed,
  isFeedbackDisabledByEnv,
} from "../../commands/feedback/feedbackPolicy.js";
import { Uue, jbt } from "../api/providerIds.js";
import { logForDebugging, getDebugLogPath, flushDebugLogs } from "../../utils/debug.js";
import { redactTranscriptLines } from "../../utils/transcriptRequestBlobs.js";
import { withholdTranscriptLine, withholdForExport } from "../../utils/transcriptWithholding.js";
import { xr } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import {
  getTranscriptPath,
  extractTeammateTranscriptsFromTasks,
  loadAllSubagentTranscriptsFromDisk,
} from "../../utils/sessionStorage.js";
import { wt, Jn } from "../../remote/remoteMode.js";
import { getIsGit, getHead } from "../../utils/git.js";
import { use } from "../compact/autoCompact.js";
import { getOriginalCwd, getLastAPIRequest, getLastCancelledAPIMessageId } from "../../bootstrap/state.js";
import { env } from "../../utils/env.js";
import { O$o } from "../../utils/transcript/transcriptFiles.js";
import { tailFile } from "../../utils/fsOperations.js";
import { readAllPages, DEFAULT_MAX_PAGES } from "../../utils/pagedRead.js";
import { isValidKeySegment } from "../../utils/storage/storageSpaces.js";
import { validateStorageKey } from "../../utils/storage/storageKeys.js";
import { getAPIProvider } from "../../utils/model/providers.js";
import { getCachedClientData } from "../../utils/config.js";
import { getAuthHeaders } from "../../utils/http.js";
import { apiKeyForHost } from "../analytics/telemetryCredentialGuard.js";
import { saveFeedbackBundle } from "./feedbackBundle.js";
import { getInMemoryErrors, logError } from "../../utils/log.js";
import { redactSecrets as redactSecrets_2 } from "../teamMemorySync/secretScanner.js";
import { zRe } from "../projects/threadRows.js";
import { normalizeMessagesForAPI } from "../../utils/messages.js";
import { nullStub } from "../../utils/externalBuildStubs.js";
import { logFeatureSad, logFeatureOk } from "../analytics/featureTelemetry.js";
import { isUuidShaped } from "../../utils/sessionStoragePortable.js";

//@ chunk-xx1vmpsq.js:4432-4589 placement
class FeedbackPayloadBuilder {
  chunks = [];
  static encoder = new TextEncoder();
  push(e) {
    if (e.length > 0) this.chunks.push(FeedbackPayloadBuilder.encoder.encode(e));
  }
  toBuffer() {
    return Buffer.concat(this.chunks);
  }
}
/**
 * 组装 /feedback 提交体：按字段集合挑出 transcript、子代理转录等，逐段 JSON 序列化并控制大小。
 */
//@ chunk-xx1vmpsq.js:4589-5324 placement
function buildFeedbackPayload(e, s, n, y) {
  let r = new FeedbackPayloadBuilder(),
    w = (M) => {
      if (M.length > 0) r.push(jsonStringify(M).slice(1, -1));
    };
  (r.push('{"content":"'), w("{"));
  let T = !0,
    C = (M) => {
      if (!T) w(",");
      ((T = !1), w(jsonStringify(M) + ":"));
    };
  for (let [M, R] of Object.entries(e)) {
    if (R === void 0) continue;
    if (s.has(M) && Array.isArray(R)) {
      (C(M), w("["));
      for (let E = 0; E < R.length; E++) {
        if (E > 0) w(",");
        w(jsonStringify(R[E]));
      }
      w("]");
    } else if (n.has(M) && R !== null && typeof R === "object") {
      (C(M), w("{"));
      let entries = Object.entries(R);
      for (let A = 0; A < entries.length; A++) {
        let [v, U] = entries[A] ?? ["", void 0];
        if (A > 0) w(",");
        if ((w(jsonStringify(v) + ":["), Array.isArray(U)))
          for (let Q = 0; Q < U.length; Q++) {
            if (Q > 0) w(",");
            w(jsonStringify(U[Q]));
          }
        w("]");
      }
      w("}");
    } else (C(M), w(jsonStringify(R)));
  }
  (w("}"), r.push('"'));
  let I = y?.extraOuterFields;
  if (I) for (let [M, R] of Object.entries(I)) r.push(`,${jsonStringify(M)}:${jsonStringify(R)}`);
  return (r.push("}"), r.toBuffer());
}
//@ chunk-xx1vmpsq.js:5324-5635 placement
var FEEDBACK_DISABLED_MESSAGE = "Feedback has not been enabled for your organization.",
  Ln = "Feedback containing third-party provider content cannot be submitted.",
  Nn = DoctorLazy(() =>
    u({
      error: u({
        type: o()
          .optional()
          .catch(void 0),
        message: o()
          .optional()
          .catch(void 0),
        details: u({
          error_code: o()
            .optional()
            .catch(void 0),
        })
          .nullish()
          .catch(void 0),
      }),
    }),
  );
/**
 * 解析反馈接口的错误响应：区分组织禁用、第三方内容拒收、ZDR 组织、OAuth 权限不足等拒绝类型。
 */
//@ chunk-xx1vmpsq.js:5635-6631 placement
function classifyFeedbackError(e, s) {
  let safeParse = Nn().safeParse(s),
    y = safeParse.success ? safeParse.data.error : void 0,
    r = y?.details?.error_code,
    w = y?.message,
    T = vc(w);
  if (
    r === "feedback_retention_blocked" ||
    (r === void 0 &&
      e === 403 &&
      y?.type === "permission_error" &&
      w?.includes("Custom data retention settings"))
  )
    return {
      success: !1,
      isZdrOrg: !0,
      failureReason: "zdr_org",
      statusCode: e,
      refusal: { kind: "org", serverMessage: T },
    };
  if (
    r === "feedback_disabled" ||
    r === "feedback_third_party_blocked" ||
    (r === void 0 && e === 403 && (w === FEEDBACK_DISABLED_MESSAGE || w === FEEDBACK_DISABLED_BY_POLICY))
  )
    return {
      success: !1,
      failureReason: "org_refused",
      statusCode: e,
      refusal: {
        kind: "org",
        serverMessage: T,
        ...(r === "feedback_third_party_blocked" && w === Ln && { reportContent: !0 }),
      },
    };
  if (r === "oauth_scope_insufficient" || e === 401)
    return {
      success: !1,
      failureReason: r === "oauth_scope_insufficient" ? "scope_refused" : "auth_refused",
      statusCode: e,
      refusal: { kind: "credential", serverMessage: T },
    };
  let C = r === "feedback_check_unavailable" || e === 408 || e === 429 || e >= 500;
  return {
    success: !1,
    failureReason: "http_error",
    statusCode: e,
    refusal: { kind: C ? "transient" : "other", serverMessage: T },
  };
}
//@ chunk-xx1vmpsq.js:6631-6732 placement
var ZDR_FEEDBACK_MESSAGE =
  "Feedback collection is not available for organizations with custom data retention policies.";
//@ chunk-xx1vmpsq.js:6732-6884 placement
function orgFeedbackRefusalMessage(e) {
  if (e.isZdrOrg) return ZDR_FEEDBACK_MESSAGE;
  if (e.refusal?.kind !== "org") return;
  return e.refusal.serverMessage ?? "Your organization does not accept feedback.";
}
//@ chunk-xx1vmpsq.js:6884-6976 placement
function orgRefusalError(e) {
  let s = orgFeedbackRefusalMessage(e);
  return s === void 0 ? void 0 : appendBugReportHint(`Couldn't send feedback: ${s}`, s);
}
//@ chunk-xx1vmpsq.js:6976-7275 placement
function credentialRefusalMessage(e) {
  if (e.refusal?.kind !== "credential") return;
  let s = serverStatusSuffix(e) ?? "";
  return e.failureReason === "scope_refused"
    ? `Couldn't send feedback: the sign-in this session uses is not allowed to send feedback${s}.`
    : `Couldn't send feedback: the server did not accept the credentials this session uses${s}.`;
}
//@ chunk-xx1vmpsq.js:7275-7433 placement
function serverStatusSuffix(e) {
  if (!e.statusCode) return;
  let s = e.refusal?.serverMessage?.replace(/\.$/, "");
  return ` (server returned ${e.statusCode}${s === void 0 ? "" : `: ${s}`})`;
}
//@ chunk-xx1vmpsq.js:7541-7589 placement
var Ks = { day: 86400000, week: 604800000 },
  ys = 1048576;
//@ chunk-xx1vmpsq.js:7589-8138 placement
async function readSessionTranscriptForFeedback(
  {
    transcriptPath: transcriptPath,
    scope: scope = "session",
    maxRawTranscriptBytes: maxRawTranscriptBytes,
    excludeThirdPartyTranscripts: excludeThirdPartyTranscripts = !1,
    host: host,
  },
  w,
) {
  let [T, C] = await Promise.all([
      getTaskOutput(transcriptPath, maxRawTranscriptBytes, w),
      collectRecentSessionTranscripts(transcriptPath, scope, excludeThirdPartyTranscripts, w),
    ]),
    I = T,
    M = !1;
  if (excludeThirdPartyTranscripts && I !== null)
    if (Uue(I))
      ((I = null),
        (M = !0),
        logForDebugging("rawTranscriptJsonl withheld from session history: contains_3p_transcript_markers"));
    else I = redactTranscriptLines(I);
  return {
    rawTranscriptJsonl: I === null ? null : withholdTranscriptLine(I, { host: host }).jsonl,
    recentSessionTranscripts:
      C.transcripts && xr(C.transcripts, (R) => withholdTranscriptLine(R, { host: void 0 }).jsonl),
    thirdPartyExclusions: { rawTranscript: M, recentSessions: C.droppedThirdParty },
  };
}
/**
 * 收集要随反馈附带的转录：主会话、后台任务、子代理转录；含第三方内容标记的转录被扣下（withheld）。
 */
//@ chunk-xx1vmpsq.js:8138-9698 placement
async function collectFeedbackTranscripts(
  {
    messages: messages,
    backgroundTasks: backgroundTasks = {},
    transcripts: transcripts = {},
    diskSubagentTranscripts: diskSubagentTranscripts,
    scope: scope = "session",
    maxRawTranscriptBytes: maxRawTranscriptBytes,
    excludeThirdPartyTranscripts: excludeThirdPartyTranscripts = !1,
    host: host,
  },
  I,
) {
  let M = getTranscriptPath(),
    R = wt(),
    [E, A, v, U] = await Promise.all([
      diskSubagentTranscripts,
      readSessionTranscriptForFeedback(
        {
          transcriptPath: M,
          scope: R ? "session" : scope,
          maxRawTranscriptBytes: maxRawTranscriptBytes,
          excludeThirdPartyTranscripts: excludeThirdPartyTranscripts,
          host: host,
        },
        I,
      ),
      R ? !1 : getIsGit(),
      R ? "" : getHead(),
    ]),
    Q = extractTeammateTranscriptsFromTasks(backgroundTasks, transcripts),
    re = { ...E, ...Q },
    z = new Set(Object.keys(Q)),
    fe = 0;
  if (excludeThirdPartyTranscripts) {
    for (let [ue, ze] of Object.entries(re))
      if (jbt(ze))
        (delete re[ue],
          fe++,
          logForDebugging(`subagent transcript ${ue} withheld: contains_3p_transcript_markers`));
  }
  let ee = xr(re, (ue) => withholdForExport(ue, { host: host })),
    Y = use(messages);
  return {
    transcriptPath: M,
    rawTranscriptJsonl: A.rawTranscriptJsonl,
    recentSessionTranscripts: A.recentSessionTranscripts,
    subagentTranscripts: ee,
    teammateIds: z,
    isGit: v,
    commitSha: U || null,
    remoteWorkspace: R,
    remoteSessionId: R ? (Jn()?.sessionId ?? null) : null,
    workingDirectory: getOriginalCwd(),
    platform: env.platform,
    terminal: env.terminal,
    version: {
      ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
      PACKAGE_URL: "@anthropic-ai/claude-code",
      README_URL: "https://code.claude.com/docs/en/overview",
      VERSION: "2.1.316",
      FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
      BUILD_TIME: "2026-10-30T23:28:13Z",
      GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
      HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
      DD_SOURCEMAP_GROUP: "default",
    }.VERSION,
    latestAssistantMessageId: Y?.requestId ?? null,
    latestAssistantAPIMessageId: Y?.message.id ?? null,
    thirdPartyExclusions: { ...A.thirdPartyExclusions, subagents: fe },
  };
}
//@ chunk-xx1vmpsq.js:9698-9974 placement = getTaskOutput (1)
async function getTaskOutput(e, s, n) {
  if (s === void 0) return null;
  if (n !== void 0) {
    let y = O$o(e);
    if (y !== void 0) return readRecentRecords(n, y, s);
  }
  try {
    let { content: content, bytesRead: bytesRead, bytesTotal: bytesTotal } = await tailFile(e, s),
      T = content;
    if (bytesRead < bytesTotal) {
      let index = content.indexOf(`
`);
      T = index >= 0 ? content.slice(index + 1) : "";
    }
    return T.trim().length > 0 ? T : null;
  } catch {
    return null;
  }
}
//@ chunk-xx1vmpsq.js:9974-10364 placement
async function readRecentRecords(e, s, n) {
  let records = await e.readRecords(s, { order: "backward", maxBytes: n });
  if (!records.ok) return null;
  let items = records.value.items,
    reduced = items.reduce((I, M) => I + M.data.byteLength, 0),
    T = items.length;
  if (records.value.nextSeq !== void 0 || reduced > n) {
    T = 0;
    let I = 0;
    for (let M of items) {
      if (((I += M.data.byteLength), I >= n)) break;
      T += 1;
    }
  }
  let str = Buffer.concat(
    items
      .slice(0, T)
      .reverse()
      .map((I) => I.data),
  ).toString("utf8");
  return str.trim().length > 0 ? str : null;
}
//@ chunk-xx1vmpsq.js:10364-11267 placement
async function collectRecentSessionTranscripts(e, s, n, y) {
  if (s === "session") return { transcripts: void 0, droppedThirdParty: 0 };
  if (y !== void 0) {
    let A = O$o(e);
    if (A !== void 0) return listRecentSessions(y, A, s, n);
  }
  let r = dirname(e),
    w = basename(e),
    T = Date.now() - Ks[s],
    C;
  try {
    C = await readdir(r);
  } catch {
    return { transcripts: void 0, droppedThirdParty: 0 };
  }
  let I = [];
  (await Promise.all(
    C.filter((A) => A.endsWith(".jsonl") && A !== w).map(async (A) => {
      let v = join_2(r, A);
      try {
        let U = await stat_2(v);
        if (U.isFile() && U.mtimeMs >= T)
          I.push({ path: v, sessionId: A.slice(0, -6), mtimeMs: U.mtimeMs, size: U.size });
      } catch {}
    }),
  ),
    I.sort((A, v) => v.mtimeMs - A.mtimeMs));
  let M = {},
    R = 0,
    E = 0;
  for (let A of I) {
    if (A.size === 0 || R + A.size > ys) continue;
    try {
      let { content: content, bytesRead: bytesRead, bytesTotal: bytesTotal } = await tailFile(A.path, ys);
      if (!content || bytesRead < bytesTotal) continue;
      if (n && Uue(content)) {
        (E++, logForDebugging(`recent session ${A.sessionId} withheld: contains_3p_transcript_markers`));
        continue;
      }
      ((M[A.sessionId] = n ? redactTranscriptLines(content) : content), (R += A.size));
    } catch {}
  }
  return { transcripts: Object.keys(M).length > 0 ? M : void 0, droppedThirdParty: E };
}
//@ chunk-xx1vmpsq.js:11267-12540 placement
async function listRecentSessions(e, s, n, y) {
  let r = Date.now() - Ks[n],
    w = [],
    T = 0,
    C = await readAllPages(
      (E) =>
        e.listEntries(
          { namespace: "transcript", projectKey: s.projectKey },
          { skipScopeStats: !0, ...(E !== void 0 && { cursor: E }) },
        ),
      (E) => {
        T++;
        for (let A of E) {
          if (A.kind !== "key" || A.key.namespace !== "transcript") continue;
          if (A.key.agentId !== void 0 || A.key.journal === !0) continue;
          if (A.key.projectKey !== s.projectKey) continue;
          if (A.key.sessionId === s.sessionId) continue;
          if (!isValidKeySegment(A.key.sessionId) || validateStorageKey(A.key) !== void 0) continue;
          if ((A.mtimeMs ?? 0) >= r)
            w.push({ key: A.key, sessionId: A.key.sessionId, mtimeMs: A.mtimeMs ?? 0, size: A.size ?? 0 });
        }
      },
    );
  if (C.status === "error" && T === 0) return { transcripts: void 0, droppedThirdParty: 0 };
  if (C.status === "capped")
    logForDebugging(
      `recent sessions: listing cut short after ${DEFAULT_MAX_PAGES} pages; keeping what was listed`,
    );
  w.sort((E, A) => A.mtimeMs - E.mtimeMs);
  let I = {},
    M = 0,
    R = 0;
  for (let E of w) {
    if (E.size === 0 || M + E.size > ys) continue;
    let read = await e.read([{ key: E.key, tail: ys }]);
    if (!read.ok) continue;
    let v = read.value.items[0];
    if (!v.found || v.value.byteLength === 0 || v.value.byteLength < v.totalBytes) continue;
    let str = Buffer.from(v.value).toString("utf8");
    if (y && Uue(str)) {
      (R++, logForDebugging(`recent session ${E.sessionId} withheld: contains_3p_transcript_markers`));
      continue;
    }
    ((I[E.sessionId] = y ? redactTranscriptLines(str) : str), (M += E.size));
  }
  return { transcripts: Object.keys(I).length > 0 ? I : void 0, droppedThirdParty: R };
}
//@ chunk-xx1vmpsq.js:12540-12850 placement
var FEEDBACK_ISSUES_URL = "https://github.com/anthropics/claude-code/issues",
  TENGU_HUMMING_WAVE = "tengu_humming_wave",
  en = {
    bedrock: "Amazon Bedrock",
    vertex: "Vertex AI",
    foundry: "Microsoft Foundry",
    anthropicAws: "Claude Platform on AWS",
    anthropicGoogleCloud: "Claude Platform on Google Cloud",
    mantle: "Amazon Bedrock (Mantle)",
    gateway: "an API gateway",
  };
/**
 * 判定 /feedback 的提交方式：post（发 Anthropic）、share、disabled（第三方提供商、非第一方认证等），返回 kind 与原因。
 */
//@ chunk-xx1vmpsq.js:12850-13194 placement
function feedbackMode(e = "/feedback") {
  let s = checkProductFeedbackAllowed(e);
  if (s !== null) return { kind: "disabled", reason: s };
  let n = getAPIProvider();
  if (n !== "firstParty") return { kind: "bundle", cause: "provider", label: en[n] };
  let y = feedbackCredentialStatus();
  if (y) return { kind: "bundle", ...y };
  if (
    e === "/share" &&
    (env.CLAUDE_CODE_ENABLE_SHARE_BUNDLE || getCachedClientData()?.[TENGU_HUMMING_WAVE] === !0)
  )
    return { kind: "bundle", cause: "share_switch" };
  return { kind: "post" };
}
//@ chunk-xx1vmpsq.js:13194-13380 placement
function feedbackCredentialStatus() {
  let e = getAuthHeaders();
  if (e.error) return { cause: "no_creds", label: "no Anthropic credentials" };
  let s = e.headers["x-api-key"];
  return s && apiKeyForHost(s) === null ? { cause: "gateway", label: en.gateway } : null;
}
//@ chunk-xx1vmpsq.js:13380-13620 placement
var TRANSCRIPT_FIELDS = new Set(["transcript"]),
  xs = new Set(["subagentTranscripts"]),
  BLt = 4194304,
  rr = 2097152,
  dDe = 8388608,
  or = 2097152,
  ir = [
    "model",
    "system",
    "tools",
    "tool_choice",
    "betas",
    "max_tokens",
    "thinking",
    "temperature",
    "context_management",
    "output_config",
  ];
//@ chunk-xx1vmpsq.js:13620-13715 placement
function pickFeedbackFields(e) {
  let s = {};
  for (let n of ir) if (e[n] !== void 0) Object.assign(s, { [n]: e[n] });
  return s;
}
//@ chunk-xx1vmpsq.js:13715-13758 placement
function feedbackPayloadPartCount(e) {
  return buildFeedbackPayload(e, TRANSCRIPT_FIELDS, xs).length;
}
//@ chunk-xx1vmpsq.js:13758-13843 placement
function headlessFeedbackMode() {
  let e = feedbackMode();
  if (e.kind === "disabled" && !isFeedbackDisabledByEnv()) return;
  return { kind: e.kind };
}
//@ chunk-xx1vmpsq.js:13843-14209 placement
async function submitHeadlessFeedback({
  messages: messages,
  description: description,
  surface: surface,
  storageV5: storageV5,
  host: host,
}) {
  let w = feedbackMode();
  if (w.kind === "disabled") return { feedback_id: null, unavailable_reason: w.reason };
  let T = await saveFeedbackBundle({
    messages: messages,
    description: description,
    surface: surface,
    storageV5: storageV5,
    host: host,
  });
  if (!T.success) return { feedback_id: null, failure_reason: "bundle_write_failed" };
  return { feedback_id: T.bundleId, bundle_path: T.zipPath };
}
//@ chunk-xx1vmpsq.js:14209-14596 placement
function feedbackUnavailableReason() {
  let e = feedbackMode();
  switch (e.kind) {
    case "post":
    case "share":
      return null;
    case "disabled":
      return e.reason;
    case "bundle":
      switch (e.cause) {
        case "no_creds":
          return `/feedback requires Anthropic credentials (OAuth or API key). Report issues at ${FEEDBACK_ISSUES_URL}`;
        case "provider":
        case "gateway":
          return `/feedback is not available when using ${e.label}. Report issues at ${FEEDBACK_ISSUES_URL}`;
        case "share_switch":
          return null;
      }
  }
}
//@ chunk-xx1vmpsq.js:14596-14709 placement
function getRedactedInMemoryErrors() {
  return getInMemoryErrors().map((e) => {
    let s = { ...e };
    if (s && typeof s.error === "string") s.error = redactSecrets_2(s.error);
    return s;
  });
}
/**
 * 从原始会话 JSONL 读取最后一次压缩边界之前的主线消息（跳过已包含与重复的 uuid），按字节预算从尾部保留。
 */
//@ chunk-xx1vmpsq.js:14709-15702 placement
function readPreCompactTranscript(jsonl, budget, seenUuids) {
  if (!jsonl) return [];
  let parts = jsonl.split(`
`),
    messages = [],
    sizes = [],
    T = new Set(),
    boundaryIndex = -1;
  for (let E of parts) {
    if (!E) continue;
    let A;
    try {
      A = jsonParse(E);
    } catch {
      continue;
    }
    if (typeof A !== "object" || A === null) continue;
    if (A.type === "system" && A.subtype === "compact_boundary") {
      boundaryIndex = messages.length;
      continue;
    }
    if (A.type !== "user" && A.type !== "assistant") continue;
    if (typeof A.uuid !== "string" || typeof A.timestamp !== "string" || A.isSidechain === !0 || !A.message)
      continue;
    if (seenUuids.has(A.uuid) || T.has(A.uuid)) continue;
    (T.add(A.uuid),
      messages.push(
        A.type === "user"
          ? {
              type: "user",
              uuid: A.uuid,
              timestamp: A.timestamp,
              message: A.message,
              ...(A.isMeta === !0 && { isMeta: !0 }),
              ...(A.toolUseResult !== void 0 && { toolUseResult: A.toolUseResult }),
              ...(A.isCompactSummary === !0 && { isCompactSummary: !0 }),
              ...(A.repeatsCompactSummary === !0 && { repeatsCompactSummary: !0 }),
            }
          : {
              type: "assistant",
              uuid: A.uuid,
              timestamp: A.timestamp,
              message: A.message,
              requestId: A.requestId,
            },
      ),
      sizes.push(Buffer.byteLength(E)));
  }
  if (boundaryIndex <= 0) return [];
  let { start: start, oversized: oversized } = selectTailWithinBudget(sizes, budget, boundaryIndex),
    sliced = messages.slice(start, boundaryIndex);
  return oversized.size === 0 ? sliced : sliced.filter((E, A) => !oversized.has(start + A));
}
/**
 * 从末尾向前选择不超过字节预算的条目（单条超预算的跳过），返回保留范围与跳过的下标。
 */
//@ chunk-xx1vmpsq.js:15702-15893 placement
function selectTailWithinBudget(e, s, n = e.length) {
  let y = 0,
    r = n,
    w = new Set();
  while (r > 0) {
    let T = e[r - 1];
    if (T === void 0) break;
    if (T > s) {
      (w.add(r - 1), r--);
      continue;
    }
    if (y + T > s) break;
    ((y += T), r--);
  }
  return { start: r, keptBytes: y, oversized: w };
}
/**
 * 把压缩前的消息按时间合并进当前转录：早于最早消息的放在前面，其余插到最后一条压缩摘要之前。
 */
//@ chunk-xx1vmpsq.js:15893-16282 placement
function mergePreCompactMessages(e, s) {
  let n;
  for (let C of e) {
    if (C.type === "user" && C.isCompactSummary === !0) continue;
    if (n === void 0 || C.timestamp < n) n = C.timestamp;
  }
  let y = [],
    r = [];
  for (let C of s)
    if (n === void 0 || C.timestamp < n) y.push(C);
    else r.push(C);
  if (r.length === 0) return [...y, ...e];
  let lastIndex = e.findLastIndex((C) => C.type === "user" && C.isCompactSummary === !0),
    T = lastIndex === -1 ? e.length : lastIndex;
  return [...y, ...e.slice(0, T), ...r, ...e.slice(T)];
}
//@ chunk-xx1vmpsq.js:16282-16531 placement
async function readDebugLogTail() {
  let e = getDebugLogPath();
  if (!e) return null;
  try {
    await flushDebugLogs();
    let { content: content, bytesRead: bytesRead, bytesTotal: bytesTotal } = await tailFile(e, rr),
      r = content;
    if (bytesRead < bytesTotal)
      ((r = r.slice(
        r.indexOf(`
`) + 1,
      )),
        (r = `[debug log truncated to last ${bytesRead} of ${bytesTotal} bytes]
${r}`));
    return redactSecrets_2(r);
  } catch {
    return null;
  }
}
/**
 * 构造反馈请求：消息、描述、转录范围、调试日志尾部、压缩前快照，超出载荷上限时降级。
 */
//@ chunk-xx1vmpsq.js:16531-18454 placement
async function buildFeedbackRequest({
  messages: messages,
  description: description,
  surface: surface,
  scope: scope = "session",
  backgroundTasks: backgroundTasks = {},
  transcripts: transcripts = {},
  surveyFeedbackSource: surveyFeedbackSource,
  excludeThirdPartyTranscripts: excludeThirdPartyTranscripts,
  storageV5: storageV5,
  host: host,
}) {
  let [R, E] = await Promise.all([
      collectFeedbackTranscripts({
        messages: messages,
        backgroundTasks: backgroundTasks,
        transcripts: transcripts,
        diskSubagentTranscripts: loadAllSubagentTranscriptsFromDisk(storageV5),
        scope: scope,
        maxRawTranscriptBytes: BLt,
        excludeThirdPartyTranscripts: excludeThirdPartyTranscripts,
        host: host,
      }),
      readDebugLogTail(),
    ]),
    A =
      zRe(messages) === -1
        ? []
        : withholdForExport(
            readPreCompactTranscript(R.rawTranscriptJsonl, or, new Set(messages.map((ue) => ue.uuid))),
            { host: host },
          ),
    v = withholdForExport(messages, { host: host }),
    U = messages.length - v.length,
    Q = normalizeMessagesForAPI(v),
    re = A.length === 0 ? Q : mergePreCompactMessages(Q, A),
    z = getLastAPIRequest(),
    fe = nullStub(),
    ee = {
      latestAssistantMessageId: R.latestAssistantMessageId,
      latestAssistantAPIMessageId: R.latestAssistantAPIMessageId,
      lastInterruptedAssistantAPIMessageId: getLastCancelledAPIMessageId(),
      message_count: messages.length,
      datetime: new Date().toISOString(),
      description: description,
      surface: surface,
      scope: R.remoteWorkspace ? "session" : scope,
      platform: R.platform,
      gitRepo: R.isGit,
      commitSha: R.commitSha,
      ...(R.remoteWorkspace && { remoteWorkspace: !0 }),
      ...(R.remoteSessionId && { remoteSessionId: R.remoteSessionId }),
      terminal: R.terminal,
      version: R.version,
      ...!1,
      ...{},
      transcript: re,
      errors: getRedactedInMemoryErrors(),
      lastApiRequest: z ? pickFeedbackFields(z) : null,
      ...(Object.keys(R.subagentTranscripts).length > 0 && { subagentTranscripts: R.subagentTranscripts }),
      ...(R.rawTranscriptJsonl && { rawTranscriptJsonl: R.rawTranscriptJsonl }),
      ...(R.recentSessionTranscripts && { recentSessionTranscripts: R.recentSessionTranscripts }),
      ...(E && { debugLog: E }),
      ...(surveyFeedbackSource && {
        survey_appearance_id: surveyFeedbackSource.appearanceId,
        survey_response: surveyFeedbackSource.response,
        survey_type: surveyFeedbackSource.surveyType,
      }),
    },
    Y =
      R.thirdPartyExclusions.recentSessions +
      R.thirdPartyExclusions.subagents +
      (R.thirdPartyExclusions.rawTranscript ? 1 : 0);
  if (A.length > 0) {
    if (feedbackPayloadPartCount(ee) > dDe)
      return (
        logFeatureSad("feedback_precompact", "over_payload_cap"),
        { payload: { ...ee, transcript: Q }, thirdPartyDroppedCount: Y, laptopMemoryDroppedCount: U }
      );
    logFeatureOk("feedback_precompact");
  } else if (zRe(messages) !== -1 && !R.thirdPartyExclusions.rawTranscript)
    logFeatureSad("feedback_precompact", "empty_recovery");
  return { payload: ee, thirdPartyDroppedCount: Y, laptopMemoryDroppedCount: U };
}
//@ chunk-xx1vmpsq.js:18454-18593 placement
function redactError(e) {
  if (e instanceof Error) {
    let s = Error(redactSecrets_2(e.message));
    if (e.stack) s.stack = redactSecrets_2(e.stack);
    logError(s);
  } else {
    let s = redactSecrets_2(String(e));
    logError(Error(s));
  }
}
/**
 * 从 JSONL 会话日志末尾向前查找指定 assistant 消息 id 所在记录，返回其会话 id（须为 UUID 形状）。
 */
//@ chunk-xx1vmpsq.js:18593-18905 placement
function findSessionIdForMessage(e, s) {
  if (!e || s === null) return;
  let parts = e.split(`
`);
  for (let y = parts.length - 1; y >= 0; y--) {
    let r = parts[y];
    if (!r) continue;
    let w;
    try {
      w = jsonParse(r);
    } catch {
      continue;
    }
    if (typeof w !== "object" || w === null || w.type !== "assistant" || w.message.id !== s) continue;
    return typeof w.sessionId === "string" && isUuidShaped(w.sessionId) ? w.sessionId : void 0;
  }
  return;
}

export {
  feedbackMode,
  submitHeadlessFeedback,
  feedbackUnavailableReason,
  orgFeedbackRefusalMessage,
  headlessFeedbackMode,
  getTaskOutput,
  BLt,
  pickFeedbackFields,
  buildFeedbackPayload,
  dDe,
  orgRefusalError,
  credentialRefusalMessage,
  serverStatusSuffix,
  TRANSCRIPT_FIELDS,
  xs,
  redactError,
  classifyFeedbackError,
  feedbackPayloadPartCount,
  selectTailWithinBudget,
  feedbackCredentialStatus,
  buildFeedbackRequest,
  findSessionIdForMessage,
};
