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
import { dirname, basename, join } from "path";
import { readdir, stat } from "fs/promises";
import { jsonStringify, jsonParse } from "../../utils/slowOperations.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, string } from "../../../vendor/zod/v4/classic/schemas.js";
import { cleanTaskDescription } from "../../utils/taskDescription.js";
import {
  FEEDBACK_DISABLED_BY_POLICY,
  appendBugReportHint,
  checkProductFeedbackAllowed,
  isFeedbackDisabledByEnv,
} from "../../commands/feedback/feedbackPolicy.js";
import { containsProviderId, anyMessageHasProviderId } from "../api/providerIds.js";
import { logForDebugging, getDebugLogPath, flushDebugLogs } from "../../utils/debug.js";
import { redactTranscriptLines } from "../../utils/transcriptRequestBlobs.js";
import { withholdTranscriptLine, withholdForExport } from "../../utils/transcriptWithholding.js";
import { xr } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import {
  getTranscriptPath,
  extractTeammateTranscriptsFromTasks,
  loadAllSubagentTranscriptsFromDisk,
} from "../../utils/sessionStorage.js";
import { isRemoteSessionAvailable, getRemoteCaps } from "../../remote/remoteMode.js";
import { getIsGit, getHead } from "../../utils/git.js";
import { findLastRealAssistantMessage } from "../compact/autoCompact.js";
import { getOriginalCwd, getLastAPIRequest, getLastCancelledAPIMessageId } from "../../bootstrap/state.js";
import { env } from "../../utils/env.js";
import { mainTranscriptKeyFor } from "../../utils/transcript/transcriptFiles.js";
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
import { findCompactBoundaryIndex } from "../projects/threadRows.js";
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
//@ chunk-xx1vmpsq.js:4589-5324 placement
/**
 * 组装 /feedback 提交体：按字段集合挑出 transcript、子代理转录等，逐段 JSON 序列化并控制大小。
 */
function buildFeedbackPayload(e, s, n, y) {
  let r = new FeedbackPayloadBuilder();
  let w = (M) => {
    if (M.length > 0) r.push(jsonStringify(M).slice(1, -1));
  };
  r.push('{"content":"');
  w("{");
  let T = true;
  let C = (M) => {
    if (!T) w(",");
    T = false;
    w(jsonStringify(M) + ":");
  };
  for (let [key, value] of Object.entries(e)) {
    if (value === undefined) continue;
    if (s.has(key) && Array.isArray(value)) {
      C(key);
      w("[");
      for (let j = 0; j < value.length; j++) {
        if (j > 0) w(",");
        w(jsonStringify(value[j]));
      }
      w("]");
    } else if (n.has(key) && value !== null && typeof value === "object") {
      C(key);
      w("{");
      let entries = Object.entries(value);
      for (let j = 0; j < entries.length; j++) {
        let [v, U] = entries[j] ?? ["", undefined];
        if (j > 0) w(",");
        w(jsonStringify(v) + ":[");
        if (Array.isArray(U))
          for (let j = 0; j < U.length; j++) {
            if (j > 0) w(",");
            w(jsonStringify(U[j]));
          }
        w("]");
      }
      w("}");
    } else {
      C(key);
      w(jsonStringify(value));
    }
  }
  w("}");
  r.push('"');
  let extraOuterFields = y?.extraOuterFields;
  if (extraOuterFields)
    for (let [key, value] of Object.entries(extraOuterFields))
      r.push(`,${jsonStringify(key)}:${jsonStringify(value)}`);
  r.push("}");
  return r.toBuffer();
}
//@ chunk-xx1vmpsq.js:5324-5635 placement
/**
 * 反馈接口错误响应的 schema。
 */
var FEEDBACK_DISABLED_MESSAGE = "Feedback has not been enabled for your organization.";
var FEEDBACK_THIRD_PARTY_BLOCKED_MESSAGE =
  "Feedback containing third-party provider content cannot be submitted.";
var errorResponseSchema = DoctorLazy(() =>
  u({
    error: u({
      type: string().optional().catch(undefined),
      message: string().optional().catch(undefined),
      details: u({
        error_code: string().optional().catch(undefined),
      })
        .nullish()
        .catch(undefined),
    }),
  }),
);
//@ chunk-xx1vmpsq.js:5635-6631 placement
/**
 * 解析反馈接口的错误响应：区分组织禁用、第三方内容拒收、ZDR 组织、OAuth 权限不足等拒绝类型。
 */
function classifyFeedbackError(status, s) {
  let n = errorResponseSchema().safeParse(s);
  let error = n.success ? n.data.error : undefined;
  let errorCode = error?.details?.error_code;
  let message = error?.message;
  let serverMessage = cleanTaskDescription(message);
  if (
    errorCode === "feedback_retention_blocked" ||
    (errorCode === undefined &&
      status === 403 &&
      error?.type === "permission_error" &&
      message?.includes("Custom data retention settings"))
  )
    return {
      success: false,
      isZdrOrg: true,
      failureReason: "zdr_org",
      statusCode: status,
      refusal: {
        kind: "org",
        serverMessage,
      },
    };
  if (
    errorCode === "feedback_disabled" ||
    errorCode === "feedback_third_party_blocked" ||
    (errorCode === undefined &&
      status === 403 &&
      (message === FEEDBACK_DISABLED_MESSAGE || message === FEEDBACK_DISABLED_BY_POLICY))
  )
    return {
      success: false,
      failureReason: "org_refused",
      statusCode: status,
      refusal: {
        kind: "org",
        serverMessage,
        ...(errorCode === "feedback_third_party_blocked" &&
          message === FEEDBACK_THIRD_PARTY_BLOCKED_MESSAGE && {
            reportContent: true,
          }),
      },
    };
  if (errorCode === "oauth_scope_insufficient" || status === 401)
    return {
      success: false,
      failureReason: errorCode === "oauth_scope_insufficient" ? "scope_refused" : "auth_refused",
      statusCode: status,
      refusal: {
        kind: "credential",
        serverMessage,
      },
    };
  let C = errorCode === "feedback_check_unavailable" || status === 408 || status === 429 || status >= 500;
  return {
    success: false,
    failureReason: "http_error",
    statusCode: status,
    refusal: {
      kind: C ? "transient" : "other",
      serverMessage,
    },
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
  return s === undefined ? undefined : appendBugReportHint(`Couldn't send feedback: ${s}`, s);
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
  let replaced = e.refusal?.serverMessage?.replace(/\.$/, "");
  return ` (server returned ${e.statusCode}${replaced === undefined ? "" : `: ${replaced}`})`;
}
//@ chunk-xx1vmpsq.js:7541-7589 placement
/**
 * 最近会话转录的总字节上限（1 MiB）。
 */
var RETENTION_WINDOW_MS = {
  day: 86400000,
  week: 604800000,
};
var MAX_RECENT_TRANSCRIPT_BYTES = 1048576;
//@ chunk-xx1vmpsq.js:7589-8138 placement
async function readSessionTranscriptForFeedback(
  { transcriptPath, scope = "session", maxRawTranscriptBytes, excludeThirdPartyTranscripts = false, host },
  w,
) {
  let [taskOutput, recentSessionTranscripts] = await Promise.all([
    getTaskOutput(transcriptPath, maxRawTranscriptBytes, w),
    collectRecentSessionTranscripts(transcriptPath, scope, excludeThirdPartyTranscripts, w),
  ]);
  let I = taskOutput;
  let rawTranscript = false;
  if (excludeThirdPartyTranscripts && I !== null)
    if (containsProviderId(I)) {
      I = null;
      rawTranscript = true;
      logForDebugging("rawTranscriptJsonl withheld from session history: contains_3p_transcript_markers");
    } else I = redactTranscriptLines(I);
  return {
    rawTranscriptJsonl:
      I === null
        ? null
        : withholdTranscriptLine(I, {
            host,
          }).jsonl,
    recentSessionTranscripts:
      recentSessionTranscripts.transcripts &&
      xr(
        recentSessionTranscripts.transcripts,
        (R) =>
          withholdTranscriptLine(R, {
            host: undefined,
          }).jsonl,
      ),
    thirdPartyExclusions: {
      rawTranscript,
      recentSessions: recentSessionTranscripts.droppedThirdParty,
    },
  };
}
//@ chunk-xx1vmpsq.js:8138-9698 placement
/**
 * 收集要随反馈附带的转录：主会话、后台任务、子代理转录；含第三方内容标记的转录被扣下（withheld）。
 */
async function collectFeedbackTranscripts(
  {
    messages,
    backgroundTasks = {},
    transcripts = {},
    diskSubagentTranscripts,
    scope = "session",
    maxRawTranscriptBytes,
    excludeThirdPartyTranscripts = false,
    host,
  },
  I,
) {
  let transcriptPath = getTranscriptPath();
  let R = isRemoteSessionAvailable();
  let [E, sessionTranscriptForFeedback, v, U] = await Promise.all([
    diskSubagentTranscripts,
    readSessionTranscriptForFeedback(
      {
        transcriptPath,
        scope: R ? "session" : scope,
        maxRawTranscriptBytes,
        excludeThirdPartyTranscripts,
        host,
      },
      I,
    ),
    R ? false : getIsGit(),
    R ? "" : getHead(),
  ]);
  let teammateTranscriptsFromTasks = extractTeammateTranscriptsFromTasks(backgroundTasks, transcripts);
  let re = {
    ...E,
    ...teammateTranscriptsFromTasks,
  };
  let teammateIds = new Set(Object.keys(teammateTranscriptsFromTasks));
  let fe = 0;
  if (excludeThirdPartyTranscripts) {
    for (let [key, value] of Object.entries(re))
      if (anyMessageHasProviderId(value)) {
        delete re[key];
        fe++;
        logForDebugging(`subagent transcript ${key} withheld: contains_3p_transcript_markers`);
      }
  }
  let subagentTranscripts = xr(re, (ue) =>
    withholdForExport(ue, {
      host,
    }),
  );
  let lastRealAssistantMessage = findLastRealAssistantMessage(messages);
  return {
    transcriptPath,
    rawTranscriptJsonl: sessionTranscriptForFeedback.rawTranscriptJsonl,
    recentSessionTranscripts: sessionTranscriptForFeedback.recentSessionTranscripts,
    subagentTranscripts,
    teammateIds,
    isGit: v,
    commitSha: U || null,
    remoteWorkspace: R,
    remoteSessionId: R ? (getRemoteCaps()?.sessionId ?? null) : null,
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
    latestAssistantMessageId: lastRealAssistantMessage?.requestId ?? null,
    latestAssistantAPIMessageId: lastRealAssistantMessage?.message.id ?? null,
    thirdPartyExclusions: {
      ...sessionTranscriptForFeedback.thirdPartyExclusions,
      subagents: fe,
    },
  };
}
//@ chunk-xx1vmpsq.js:9698-9974 placement = getTaskOutput (1)
async function getTaskOutput(transcriptPath, s, n) {
  if (s === undefined) return null;
  if (n !== undefined) {
    let y = mainTranscriptKeyFor(transcriptPath);
    if (y !== undefined) return readRecentRecords(n, y, s);
  }
  try {
    let { content, bytesRead, bytesTotal } = await tailFile(transcriptPath, s);
    let T = content;
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
  let records = await e.readRecords(s, {
    order: "backward",
    maxBytes: n,
  });
  if (!records.ok) return null;
  let items = records.value.items;
  let reduced = items.reduce((acc, item) => acc + item.data.byteLength, 0);
  let T = items.length;
  if (records.value.nextSeq !== undefined || reduced > n) {
    T = 0;
    let I = 0;
    for (let item of items) {
      I += item.data.byteLength;
      if (I >= n) break;
      T += 1;
    }
  }
  let str = Buffer.concat(
    items
      .slice(0, T)
      .reverse()
      .map((item) => item.data),
  ).toString("utf8");
  return str.trim().length > 0 ? str : null;
}
//@ chunk-xx1vmpsq.js:10364-11267 placement
async function collectRecentSessionTranscripts(transcriptPath, scope, excludeThirdPartyTranscripts, y) {
  if (scope === "session")
    return {
      transcripts: undefined,
      droppedThirdParty: 0,
    };
  if (y !== undefined) {
    let A = mainTranscriptKeyFor(transcriptPath);
    if (A !== undefined) return listRecentSessions(y, A, scope, excludeThirdPartyTranscripts);
  }
  let r = dirname(transcriptPath);
  let w = basename(transcriptPath);
  let T = Date.now() - RETENTION_WINDOW_MS[scope];
  let C;
  try {
    C = await readdir(r);
  } catch {
    return {
      transcripts: undefined,
      droppedThirdParty: 0,
    };
  }
  let I = [];
  await Promise.all(
    C.filter((A) => A.endsWith(".jsonl") && A !== w).map(async (A) => {
      let v = join(r, A);
      try {
        let U = await stat(v);
        if (U.isFile() && U.mtimeMs >= T)
          I.push({
            path: v,
            sessionId: A.slice(0, -6),
            mtimeMs: U.mtimeMs,
            size: U.size,
          });
      } catch {}
    }),
  );
  I.sort((A, v) => v.mtimeMs - A.mtimeMs);
  let M = {};
  let R = 0;
  let E = 0;
  for (let A of I) {
    if (A.size === 0 || R + A.size > MAX_RECENT_TRANSCRIPT_BYTES) continue;
    try {
      let { content, bytesRead, bytesTotal } = await tailFile(A.path, MAX_RECENT_TRANSCRIPT_BYTES);
      if (!content || bytesRead < bytesTotal) continue;
      if (excludeThirdPartyTranscripts && containsProviderId(content)) {
        E++;
        logForDebugging(`recent session ${A.sessionId} withheld: contains_3p_transcript_markers`);
        continue;
      }
      M[A.sessionId] = excludeThirdPartyTranscripts ? redactTranscriptLines(content) : content;
      R += A.size;
    } catch {}
  }
  return {
    transcripts: Object.keys(M).length > 0 ? M : undefined,
    droppedThirdParty: E,
  };
}
//@ chunk-xx1vmpsq.js:11267-12540 placement
async function listRecentSessions(e, s, n, y) {
  let r = Date.now() - RETENTION_WINDOW_MS[n];
  let w = [];
  let T = 0;
  let allPages = await readAllPages(
    (E) =>
      e.listEntries(
        {
          namespace: "transcript",
          projectKey: s.projectKey,
        },
        {
          skipScopeStats: true,
          ...(E !== undefined && {
            cursor: E,
          }),
        },
      ),
    (E) => {
      T++;
      for (let A of E) {
        if (A.kind !== "key" || A.key.namespace !== "transcript") continue;
        if (A.key.agentId !== undefined || A.key.journal === true) continue;
        if (A.key.projectKey !== s.projectKey) continue;
        if (A.key.sessionId === s.sessionId) continue;
        if (!isValidKeySegment(A.key.sessionId) || validateStorageKey(A.key) !== undefined) continue;
        if ((A.mtimeMs ?? 0) >= r)
          w.push({
            key: A.key,
            sessionId: A.key.sessionId,
            mtimeMs: A.mtimeMs ?? 0,
            size: A.size ?? 0,
          });
      }
    },
  );
  if (allPages.status === "error" && T === 0)
    return {
      transcripts: undefined,
      droppedThirdParty: 0,
    };
  if (allPages.status === "capped")
    logForDebugging(
      `recent sessions: listing cut short after ${DEFAULT_MAX_PAGES} pages; keeping what was listed`,
    );
  w.sort((E, A) => A.mtimeMs - E.mtimeMs);
  let I = {};
  let M = 0;
  let R = 0;
  for (let E of w) {
    if (E.size === 0 || M + E.size > MAX_RECENT_TRANSCRIPT_BYTES) continue;
    let A = await e.read([
      {
        key: E.key,
        tail: MAX_RECENT_TRANSCRIPT_BYTES,
      },
    ]);
    if (!A.ok) continue;
    let v = A.value.items[0];
    if (!v.found || v.value.byteLength === 0 || v.value.byteLength < v.totalBytes) continue;
    let str = Buffer.from(v.value).toString("utf8");
    if (y && containsProviderId(str)) {
      R++;
      logForDebugging(`recent session ${E.sessionId} withheld: contains_3p_transcript_markers`);
      continue;
    }
    I[E.sessionId] = y ? redactTranscriptLines(str) : str;
    M += E.size;
  }
  return {
    transcripts: Object.keys(I).length > 0 ? I : undefined,
    droppedThirdParty: R,
  };
}
//@ chunk-xx1vmpsq.js:12540-12850 placement
/**
 * 各提供商在反馈文案里的显示名。
 */
var FEEDBACK_ISSUES_URL = "https://github.com/anthropics/claude-code/issues";
var TENGU_HUMMING_WAVE = "tengu_humming_wave";
var PROVIDER_LABELS = {
  bedrock: "Amazon Bedrock",
  vertex: "Vertex AI",
  foundry: "Microsoft Foundry",
  anthropicAws: "Claude Platform on AWS",
  anthropicGoogleCloud: "Claude Platform on Google Cloud",
  mantle: "Amazon Bedrock (Mantle)",
  gateway: "an API gateway",
};
//@ chunk-xx1vmpsq.js:12850-13194 placement
/**
 * 判定 /feedback 的提交方式：post（发 Anthropic）、share、disabled（第三方提供商、非第一方认证等），返回 kind 与原因。
 */
function feedbackMode(e = "/feedback") {
  let s = checkProductFeedbackAllowed(e);
  if (s !== null)
    return {
      kind: "disabled",
      reason: s,
    };
  let apiProvider = getAPIProvider();
  if (apiProvider !== "firstParty")
    return {
      kind: "bundle",
      cause: "provider",
      label: PROVIDER_LABELS[apiProvider],
    };
  let y = feedbackCredentialStatus();
  if (y)
    return {
      kind: "bundle",
      ...y,
    };
  if (
    e === "/share" &&
    (env.CLAUDE_CODE_ENABLE_SHARE_BUNDLE || getCachedClientData()?.[TENGU_HUMMING_WAVE] === true)
  )
    return {
      kind: "bundle",
      cause: "share_switch",
    };
  return {
    kind: "post",
  };
}
//@ chunk-xx1vmpsq.js:13194-13380 placement
function feedbackCredentialStatus() {
  let authHeaders = getAuthHeaders();
  if (authHeaders.error)
    return {
      cause: "no_creds",
      label: "no Anthropic credentials",
    };
  let s = authHeaders.headers["x-api-key"];
  return s && apiKeyForHost(s) === null
    ? {
        cause: "gateway",
        label: PROVIDER_LABELS.gateway,
      }
    : null;
}
//@ chunk-xx1vmpsq.js:13380-13620 placement
/**
 * 可从请求里挑选的字段名（model、system、tools 等）。
 */
var TRANSCRIPT_FIELDS = new Set(["transcript"]);
var SUBAGENT_TRANSCRIPT_FIELDS = new Set(["subagentTranscripts"]);
var MAX_RAW_TRANSCRIPT_BYTES = 4194304;
var MAX_PRECOMPACT_TRANSCRIPT_BYTES = 2097152;
var MAX_PAYLOAD_PART_COUNT = 8388608;
var MAX_RECOMMENDED_TRANSCRIPT_BYTES = 2097152;
var PICKABLE_REQUEST_FIELDS = [
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
  for (let n of PICKABLE_REQUEST_FIELDS)
    if (e[n] !== undefined)
      Object.assign(s, {
        [n]: e[n],
      });
  return s;
}
//@ chunk-xx1vmpsq.js:13715-13758 placement
function feedbackPayloadPartCount(e) {
  return buildFeedbackPayload(e, TRANSCRIPT_FIELDS, SUBAGENT_TRANSCRIPT_FIELDS).length;
}
//@ chunk-xx1vmpsq.js:13758-13843 placement
function headlessFeedbackMode() {
  let e = feedbackMode();
  if (e.kind === "disabled" && !isFeedbackDisabledByEnv()) return;
  return {
    kind: e.kind,
  };
}
//@ chunk-xx1vmpsq.js:13843-14209 placement
async function submitHeadlessFeedback({ messages, description, surface, storageV5, host }) {
  let w = feedbackMode();
  if (w.kind === "disabled")
    return {
      feedback_id: null,
      unavailable_reason: w.reason,
    };
  let T = await saveFeedbackBundle({
    messages,
    description,
    surface,
    storageV5,
    host,
  });
  if (!T.success)
    return {
      feedback_id: null,
      failure_reason: "bundle_write_failed",
    };
  return {
    feedback_id: T.bundleId,
    bundle_path: T.zipPath,
  };
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
    let s = {
      ...e,
    };
    if (s && typeof s.error === "string") s.error = redactSecrets_2(s.error);
    return s;
  });
}
//@ chunk-xx1vmpsq.js:14709-15702 placement
/**
 * 从原始会话 JSONL 读取最后一次压缩边界之前的主线消息（跳过已包含与重复的 uuid），按字节预算从尾部保留。
 */
function readPreCompactTranscript(jsonl, budget, seenUuids) {
  if (!jsonl) return [];
  let lines = jsonl.split(`
`);
  let messages = [];
  let sizes = [];
  let T = new Set();
  let boundaryIndex = -1;
  for (let line of lines) {
    if (!line) continue;
    let A;
    try {
      A = jsonParse(line);
    } catch {
      continue;
    }
    if (typeof A !== "object" || A === null) continue;
    if (A.type === "system" && A.subtype === "compact_boundary") {
      boundaryIndex = messages.length;
      continue;
    }
    if (A.type !== "user" && A.type !== "assistant") continue;
    if (typeof A.uuid !== "string" || typeof A.timestamp !== "string" || A.isSidechain === true || !A.message)
      continue;
    if (seenUuids.has(A.uuid) || T.has(A.uuid)) continue;
    T.add(A.uuid);
    messages.push(
      A.type === "user"
        ? {
            type: "user",
            uuid: A.uuid,
            timestamp: A.timestamp,
            message: A.message,
            ...(A.isMeta === true && {
              isMeta: true,
            }),
            ...(A.toolUseResult !== undefined && {
              toolUseResult: A.toolUseResult,
            }),
            ...(A.isCompactSummary === true && {
              isCompactSummary: true,
            }),
            ...(A.repeatsCompactSummary === true && {
              repeatsCompactSummary: true,
            }),
          }
        : {
            type: "assistant",
            uuid: A.uuid,
            timestamp: A.timestamp,
            message: A.message,
            requestId: A.requestId,
          },
    );
    sizes.push(Buffer.byteLength(line));
  }
  if (boundaryIndex <= 0) return [];
  let { start, oversized } = selectTailWithinBudget(sizes, budget, boundaryIndex);
  let sliced = messages.slice(start, boundaryIndex);
  return oversized.size === 0 ? sliced : sliced.filter((E, A) => !oversized.has(start + A));
}
//@ chunk-xx1vmpsq.js:15702-15893 placement
/**
 * 从末尾向前选择不超过字节预算的条目（单条超预算的跳过），返回保留范围与跳过的下标。
 */
function selectTailWithinBudget(e, s, boundaryIndex = e.length) {
  let y = 0;
  let r = boundaryIndex;
  let w = new Set();
  while (r > 0) {
    let T = e[r - 1];
    if (T === undefined) break;
    if (T > s) {
      w.add(r - 1);
      r--;
      continue;
    }
    if (y + T > s) break;
    y += T;
    r--;
  }
  return {
    start: r,
    keptBytes: y,
    oversized: w,
  };
}
//@ chunk-xx1vmpsq.js:15893-16282 placement
/**
 * 把压缩前的消息按时间合并进当前转录：早于最早消息的放在前面，其余插到最后一条压缩摘要之前。
 */
function mergePreCompactMessages(e, s) {
  let n;
  for (let C of e) {
    if (C.type === "user" && C.isCompactSummary === true) continue;
    if (n === undefined || C.timestamp < n) n = C.timestamp;
  }
  let y = [];
  let r = [];
  for (let C of s)
    if (n === undefined || C.timestamp < n) y.push(C);
    else r.push(C);
  if (r.length === 0) return [...y, ...e];
  let lastIndex = e.findLastIndex((C) => C.type === "user" && C.isCompactSummary === true);
  let T = lastIndex === -1 ? e.length : lastIndex;
  return [...y, ...e.slice(0, T), ...r, ...e.slice(T)];
}
//@ chunk-xx1vmpsq.js:16282-16531 placement
async function readDebugLogTail() {
  let debugLogPath = getDebugLogPath();
  if (!debugLogPath) return null;
  try {
    await flushDebugLogs();
    let { content, bytesRead, bytesTotal } = await tailFile(debugLogPath, MAX_PRECOMPACT_TRANSCRIPT_BYTES);
    let r = content;
    if (bytesRead < bytesTotal) {
      r = r.slice(
        r.indexOf(`
`) + 1,
      );
      r = `[debug log truncated to last ${bytesRead} of ${bytesTotal} bytes]
${r}`;
    }
    return redactSecrets_2(r);
  } catch {
    return null;
  }
}
//@ chunk-xx1vmpsq.js:16531-18454 placement
/**
 * 构造反馈请求：消息、描述、转录范围、调试日志尾部、压缩前快照，超出载荷上限时降级。
 */
async function buildFeedbackRequest({
  messages,
  description,
  surface,
  scope = "session",
  backgroundTasks = {},
  transcripts = {},
  surveyFeedbackSource,
  excludeThirdPartyTranscripts,
  storageV5,
  host,
}) {
  let [feedbackTranscripts, debugLogTail] = await Promise.all([
    collectFeedbackTranscripts({
      messages,
      backgroundTasks,
      transcripts,
      diskSubagentTranscripts: loadAllSubagentTranscriptsFromDisk(storageV5),
      scope,
      maxRawTranscriptBytes: MAX_RAW_TRANSCRIPT_BYTES,
      excludeThirdPartyTranscripts,
      host,
    }),
    readDebugLogTail(),
  ]);
  let A =
    findCompactBoundaryIndex(messages) === -1
      ? []
      : withholdForExport(
          readPreCompactTranscript(
            feedbackTranscripts.rawTranscriptJsonl,
            MAX_RECOMMENDED_TRANSCRIPT_BYTES,
            new Set(messages.map((message) => message.uuid)),
          ),
          {
            host,
          },
        );
  let v = withholdForExport(messages, {
    host,
  });
  let laptopMemoryDroppedCount = messages.length - v.length;
  let Q = normalizeMessagesForAPI(v);
  let transcript = A.length === 0 ? Q : mergePreCompactMessages(Q, A);
  let lastAPIRequest = getLastAPIRequest();
  let fe = nullStub();
  let ee = {
    latestAssistantMessageId: feedbackTranscripts.latestAssistantMessageId,
    latestAssistantAPIMessageId: feedbackTranscripts.latestAssistantAPIMessageId,
    lastInterruptedAssistantAPIMessageId: getLastCancelledAPIMessageId(),
    message_count: messages.length,
    datetime: new Date().toISOString(),
    description,
    surface,
    scope: feedbackTranscripts.remoteWorkspace ? "session" : scope,
    platform: feedbackTranscripts.platform,
    gitRepo: feedbackTranscripts.isGit,
    commitSha: feedbackTranscripts.commitSha,
    ...(feedbackTranscripts.remoteWorkspace && {
      remoteWorkspace: true,
    }),
    ...(feedbackTranscripts.remoteSessionId && {
      remoteSessionId: feedbackTranscripts.remoteSessionId,
    }),
    terminal: feedbackTranscripts.terminal,
    version: feedbackTranscripts.version,
    ...false,
    ...{},
    transcript,
    errors: getRedactedInMemoryErrors(),
    lastApiRequest: lastAPIRequest ? pickFeedbackFields(lastAPIRequest) : null,
    ...(Object.keys(feedbackTranscripts.subagentTranscripts).length > 0 && {
      subagentTranscripts: feedbackTranscripts.subagentTranscripts,
    }),
    ...(feedbackTranscripts.rawTranscriptJsonl && {
      rawTranscriptJsonl: feedbackTranscripts.rawTranscriptJsonl,
    }),
    ...(feedbackTranscripts.recentSessionTranscripts && {
      recentSessionTranscripts: feedbackTranscripts.recentSessionTranscripts,
    }),
    ...(debugLogTail && {
      debugLog: debugLogTail,
    }),
    ...(surveyFeedbackSource && {
      survey_appearance_id: surveyFeedbackSource.appearanceId,
      survey_response: surveyFeedbackSource.response,
      survey_type: surveyFeedbackSource.surveyType,
    }),
  };
  let thirdPartyDroppedCount =
    feedbackTranscripts.thirdPartyExclusions.recentSessions +
    feedbackTranscripts.thirdPartyExclusions.subagents +
    (feedbackTranscripts.thirdPartyExclusions.rawTranscript ? 1 : 0);
  if (A.length > 0) {
    if (feedbackPayloadPartCount(ee) > MAX_PAYLOAD_PART_COUNT) {
      logFeatureSad("feedback_precompact", "over_payload_cap");
      return {
        payload: {
          ...ee,
          transcript: Q,
        },
        thirdPartyDroppedCount,
        laptopMemoryDroppedCount,
      };
    }
    logFeatureOk("feedback_precompact");
  } else if (
    findCompactBoundaryIndex(messages) !== -1 &&
    !feedbackTranscripts.thirdPartyExclusions.rawTranscript
  )
    logFeatureSad("feedback_precompact", "empty_recovery");
  return {
    payload: ee,
    thirdPartyDroppedCount,
    laptopMemoryDroppedCount,
  };
}
//@ chunk-xx1vmpsq.js:18454-18593 placement
function redactError(err) {
  if (err instanceof Error) {
    let s = Error(redactSecrets_2(err.message));
    if (err.stack) s.stack = redactSecrets_2(err.stack);
    logError(s);
  } else {
    let s = redactSecrets_2(String(err));
    logError(Error(s));
  }
}
//@ chunk-xx1vmpsq.js:18593-18905 placement
/**
 * 从 JSONL 会话日志末尾向前查找指定 assistant 消息 id 所在记录，返回其会话 id（须为 UUID 形状）。
 */
function findSessionIdForMessage(rawTranscriptJsonl, latestAssistantAPIMessageId) {
  if (!rawTranscriptJsonl || latestAssistantAPIMessageId === null) return;
  let lines = rawTranscriptJsonl.split(`
`);
  for (let j = lines.length - 1; j >= 0; j--) {
    let r = lines[j];
    if (!r) continue;
    let w;
    try {
      w = jsonParse(r);
    } catch {
      continue;
    }
    if (
      typeof w !== "object" ||
      w === null ||
      w.type !== "assistant" ||
      w.message.id !== latestAssistantAPIMessageId
    )
      continue;
    return typeof w.sessionId === "string" && isUuidShaped(w.sessionId) ? w.sessionId : undefined;
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
  MAX_RAW_TRANSCRIPT_BYTES,
  pickFeedbackFields,
  buildFeedbackPayload,
  MAX_PAYLOAD_PART_COUNT,
  orgRefusalError,
  credentialRefusalMessage,
  serverStatusSuffix,
  TRANSCRIPT_FIELDS,
  SUBAGENT_TRANSCRIPT_FIELDS,
  redactError,
  classifyFeedbackError,
  feedbackPayloadPartCount,
  selectTailWithinBudget,
  feedbackCredentialStatus,
  buildFeedbackRequest,
  findSessionIdForMessage,
};
