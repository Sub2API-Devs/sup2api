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
import { objectSchema, stringSchema } from "../../../vendor/zod/v4/classic/schemas.js";
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
import { import_mapValues } from "../../../vendor/lodash-es/_inlinedHelpers.js";
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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-xx1vmpsq.js:4432-4589 placement
let FeedbackPayloadBuilder; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-xx1vmpsq.js:4432", () => {
  FeedbackPayloadBuilder = class FeedbackPayloadBuilder {
    chunks = [];
    static encoder = new TextEncoder();
    push(text) {
      if (text.length > 0) this.chunks.push(FeedbackPayloadBuilder.encoder.encode(text));
    }
    toBuffer() {
      return Buffer.concat(this.chunks);
    }
  };
});
//@ chunk-xx1vmpsq.js:4589-5324 placement
/**
 * 组装 /feedback 提交体：按字段集合挑出 transcript、子代理转录等，逐段 JSON 序列化并控制大小。
 */
function buildFeedbackPayload(payload, transcriptFields, subagentFields, options) {
  let builder = new FeedbackPayloadBuilder();
  let push = (json) => {
    if (json.length > 0) builder.push(jsonStringify(json).slice(1, -1));
  };
  builder.push('{"content":"');
  push("{");
  let first = true;
  let pushKey = (key) => {
    if (!first) push(",");
    first = false;
    push(jsonStringify(key) + ":");
  };
  for (let [key, value] of Object.entries(payload)) {
    if (value === undefined) continue;
    if (transcriptFields.has(key) && Array.isArray(value)) {
      pushKey(key);
      push("[");
      for (let j = 0; j < value.length; j++) {
        if (j > 0) push(",");
        push(jsonStringify(value[j]));
      }
      push("]");
    } else if (subagentFields.has(key) && value !== null && typeof value === "object") {
      pushKey(key);
      push("{");
      let entries = Object.entries(value);
      for (let j = 0; j < entries.length; j++) {
        let [name, rows] = entries[j] ?? ["", undefined];
        if (j > 0) push(",");
        push(jsonStringify(name) + ":[");
        if (Array.isArray(rows))
          for (let j = 0; j < rows.length; j++) {
            if (j > 0) push(",");
            push(jsonStringify(rows[j]));
          }
        push("]");
      }
      push("}");
    } else {
      pushKey(key);
      push(jsonStringify(value));
    }
  }
  push("}");
  builder.push('"');
  let extraOuterFields = options?.extraOuterFields;
  if (extraOuterFields)
    for (let [key, value] of Object.entries(extraOuterFields))
      builder.push(`,${jsonStringify(key)}:${jsonStringify(value)}`);
  builder.push("}");
  return builder.toBuffer();
}
//@ chunk-xx1vmpsq.js:5324-5635 placement
/**
 * 反馈接口错误响应的 schema。
 */
var FEEDBACK_DISABLED_MESSAGE; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var FEEDBACK_THIRD_PARTY_BLOCKED_MESSAGE;
var errorResponseSchema;
deferInit("chunk-xx1vmpsq.js:5324", () => {
  FEEDBACK_DISABLED_MESSAGE = "Feedback has not been enabled for your organization.";
  FEEDBACK_THIRD_PARTY_BLOCKED_MESSAGE =
    "Feedback containing third-party provider content cannot be submitted.";
  errorResponseSchema = DoctorLazy(() =>
    objectSchema({
      error: objectSchema({
        type: stringSchema().optional().catch(undefined),
        message: stringSchema().optional().catch(undefined),
        details: objectSchema({
          error_code: stringSchema().optional().catch(undefined),
        })
          .nullish()
          .catch(undefined),
      }),
    }),
  );
});
//@ chunk-xx1vmpsq.js:5635-6631 placement
/**
 * 解析反馈接口的错误响应：区分组织禁用、第三方内容拒收、ZDR 组织、OAuth 权限不足等拒绝类型。
 */
function classifyFeedbackError(status, body) {
  let parsed = errorResponseSchema().safeParse(body);
  let error = parsed.success ? parsed.data.error : undefined;
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
  let context =
    errorCode === "feedback_check_unavailable" || status === 408 || status === 429 || status >= 500;
  return {
    success: false,
    failureReason: "http_error",
    statusCode: status,
    refusal: {
      kind: context ? "transient" : "other",
      serverMessage,
    },
  };
}
//@ chunk-xx1vmpsq.js:6631-6732 placement
var ZDR_FEEDBACK_MESSAGE =
  "Feedback collection is not available for organizations with custom data retention policies.";
//@ chunk-xx1vmpsq.js:6732-6884 placement
function orgFeedbackRefusalMessage(session) {
  if (session.isZdrOrg) return ZDR_FEEDBACK_MESSAGE;
  if (session.refusal?.kind !== "org") return;
  return session.refusal.serverMessage ?? "Your organization does not accept feedback.";
}
//@ chunk-xx1vmpsq.js:6884-6976 placement
function orgRefusalError(session) {
  let message = orgFeedbackRefusalMessage(session);
  return message === undefined
    ? undefined
    : appendBugReportHint(`Couldn't send feedback: ${message}`, message);
}
//@ chunk-xx1vmpsq.js:6976-7275 placement
function credentialRefusalMessage(session) {
  if (session.refusal?.kind !== "credential") return;
  let suffix = serverStatusSuffix(session) ?? "";
  return session.failureReason === "scope_refused"
    ? `Couldn't send feedback: the sign-in this session uses is not allowed to send feedback${suffix}.`
    : `Couldn't send feedback: the server did not accept the credentials this session uses${suffix}.`;
}
//@ chunk-xx1vmpsq.js:7275-7433 placement
function serverStatusSuffix(session) {
  if (!session.statusCode) return;
  let replaced = session.refusal?.serverMessage?.replace(/\.$/, "");
  return ` (server returned ${session.statusCode}${replaced === undefined ? "" : `: ${replaced}`})`;
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
  input,
) {
  let [taskOutput, recentSessionTranscripts] = await Promise.all([
    getTaskOutput(transcriptPath, maxRawTranscriptBytes, input),
    collectRecentSessionTranscripts(transcriptPath, scope, excludeThirdPartyTranscripts, input),
  ]);
  let opts = taskOutput;
  let rawTranscript = false;
  if (excludeThirdPartyTranscripts && opts !== null)
    if (containsProviderId(opts)) {
      opts = null;
      rawTranscript = true;
      logForDebugging("rawTranscriptJsonl withheld from session history: contains_3p_transcript_markers");
    } else opts = redactTranscriptLines(opts);
  return {
    rawTranscriptJsonl:
      opts === null
        ? null
        : withholdTranscriptLine(opts, {
            host,
          }).jsonl,
    recentSessionTranscripts:
      recentSessionTranscripts.transcripts &&
      import_mapValues(
        recentSessionTranscripts.transcripts,
        (result) =>
          withholdTranscriptLine(result, {
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
  storage,
) {
  let transcriptPath = getTranscriptPath();
  let remote = isRemoteSessionAvailable();
  let [diskSubagents, sessionTranscriptForFeedback, isGit, commitSha] = await Promise.all([
    diskSubagentTranscripts,
    readSessionTranscriptForFeedback(
      {
        transcriptPath,
        scope: remote ? "session" : scope,
        maxRawTranscriptBytes,
        excludeThirdPartyTranscripts,
        host,
      },
      storage,
    ),
    remote ? false : getIsGit(),
    remote ? "" : getHead(),
  ]);
  let teammateTranscriptsFromTasks = extractTeammateTranscriptsFromTasks(backgroundTasks, transcripts);
  let allSubagents = {
    ...diskSubagents,
    ...teammateTranscriptsFromTasks,
  };
  let teammateIds = new Set(Object.keys(teammateTranscriptsFromTasks));
  let droppedSubagents = 0;
  if (excludeThirdPartyTranscripts) {
    for (let [key, value] of Object.entries(allSubagents))
      if (anyMessageHasProviderId(value)) {
        delete allSubagents[key];
        droppedSubagents++;
        logForDebugging(`subagent transcript ${key} withheld: contains_3p_transcript_markers`);
      }
  }
  let subagentTranscripts = import_mapValues(allSubagents, (messages) =>
    withholdForExport(messages, {
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
    isGit,
    commitSha: commitSha || null,
    remoteWorkspace: remote,
    remoteSessionId: remote ? (getRemoteCaps()?.sessionId ?? null) : null,
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
      subagents: droppedSubagents,
    },
  };
}
//@ chunk-xx1vmpsq.js:9698-9974 placement = getTaskOutput (1)
async function getTaskOutput(dir, maxBytes, storage) {
  if (maxBytes === undefined) return null;
  if (storage !== undefined) {
    let key = mainTranscriptKeyFor(dir);
    if (key !== undefined) return readRecentRecords(storage, key, maxBytes);
  }
  try {
    let { content, bytesRead, bytesTotal } = await tailFile(dir, maxBytes);
    let text = content;
    if (bytesRead < bytesTotal) {
      let index = content.indexOf(`
`);
      text = index >= 0 ? content.slice(index + 1) : "";
    }
    return text.trim().length > 0 ? text : null;
  } catch {
    return null;
  }
}
//@ chunk-xx1vmpsq.js:9974-10364 placement
async function readRecentRecords(storage, key, maxBytes) {
  let records = await storage.readRecords(key, {
    order: "backward",
    maxBytes,
  });
  if (!records.ok) return null;
  let items = records.value.items;
  let reduced = items.reduce((acc, item) => acc + item.data.byteLength, 0);
  let take = items.length;
  if (records.value.nextSeq !== undefined || reduced > maxBytes) {
    take = 0;
    let total = 0;
    for (let item of items) {
      total += item.data.byteLength;
      if (total >= maxBytes) break;
      take += 1;
    }
  }
  let str = Buffer.concat(
    items
      .slice(0, take)
      .reverse()
      .map((item) => item.data),
  ).toString("utf8");
  return str.trim().length > 0 ? str : null;
}
//@ chunk-xx1vmpsq.js:10364-11267 placement
async function collectRecentSessionTranscripts(dir, scope, excludeThirdParty, storage) {
  if (scope === "session")
    return {
      transcripts: undefined,
      droppedThirdParty: 0,
    };
  if (storage !== undefined) {
    let key = mainTranscriptKeyFor(dir);
    if (key !== undefined) return listRecentSessions(storage, key, scope, excludeThirdParty);
  }
  let dir_2 = dirname(dir);
  let currentName = basename(dir);
  let cutoffMs = Date.now() - RETENTION_WINDOW_MS[scope];
  let entries;
  try {
    entries = await readdir(dir_2);
  } catch {
    return {
      transcripts: undefined,
      droppedThirdParty: 0,
    };
  }
  let candidates = [];
  await Promise.all(
    entries
      .filter((name) => name.endsWith(".jsonl") && name !== currentName)
      .map(async (name) => {
        let fullPath = join(dir_2, name);
        try {
          let stats = await stat(fullPath);
          if (stats.isFile() && stats.mtimeMs >= cutoffMs)
            candidates.push({
              path: fullPath,
              sessionId: name.slice(0, -6),
              mtimeMs: stats.mtimeMs,
              size: stats.size,
            });
        } catch {}
      }),
  );
  candidates.sort((left, right) => right.mtimeMs - left.mtimeMs);
  let transcripts = {};
  let totalBytes = 0;
  let droppedThirdParty = 0;
  for (let candidate of candidates) {
    if (candidate.size === 0 || totalBytes + candidate.size > MAX_RECENT_TRANSCRIPT_BYTES) continue;
    try {
      let { content, bytesRead, bytesTotal } = await tailFile(candidate.path, MAX_RECENT_TRANSCRIPT_BYTES);
      if (!content || bytesRead < bytesTotal) continue;
      if (excludeThirdParty && containsProviderId(content)) {
        droppedThirdParty++;
        logForDebugging(`recent session ${candidate.sessionId} withheld: contains_3p_transcript_markers`);
        continue;
      }
      transcripts[candidate.sessionId] = excludeThirdParty ? redactTranscriptLines(content) : content;
      totalBytes += candidate.size;
    } catch {}
  }
  return {
    transcripts: Object.keys(transcripts).length > 0 ? transcripts : undefined,
    droppedThirdParty,
  };
}
//@ chunk-xx1vmpsq.js:11267-12540 placement
async function listRecentSessions(storage, current, scope, excludeThirdParty) {
  let cutoffMs = Date.now() - RETENTION_WINDOW_MS[scope];
  let candidates = [];
  let pageCount = 0;
  let allPages = await readAllPages(
    (cursor) =>
      storage.listEntries(
        {
          namespace: "transcript",
          projectKey: current.projectKey,
        },
        {
          skipScopeStats: true,
          ...(cursor !== undefined && {
            cursor,
          }),
        },
      ),
    (items) => {
      pageCount++;
      for (let item of items) {
        if (item.kind !== "key" || item.key.namespace !== "transcript") continue;
        if (item.key.agentId !== undefined || item.key.journal === true) continue;
        if (item.key.projectKey !== current.projectKey) continue;
        if (item.key.sessionId === current.sessionId) continue;
        if (!isValidKeySegment(item.key.sessionId) || validateStorageKey(item.key) !== undefined) continue;
        if ((item.mtimeMs ?? 0) >= cutoffMs)
          candidates.push({
            key: item.key,
            sessionId: item.key.sessionId,
            mtimeMs: item.mtimeMs ?? 0,
            size: item.size ?? 0,
          });
      }
    },
  );
  if (allPages.status === "error" && pageCount === 0)
    return {
      transcripts: undefined,
      droppedThirdParty: 0,
    };
  if (allPages.status === "capped")
    logForDebugging(
      `recent sessions: listing cut short after ${DEFAULT_MAX_PAGES} pages; keeping what was listed`,
    );
  candidates.sort((left, right) => right.mtimeMs - left.mtimeMs);
  let transcripts = {};
  let totalBytes = 0;
  let droppedThirdParty = 0;
  for (let candidate of candidates) {
    if (candidate.size === 0 || totalBytes + candidate.size > MAX_RECENT_TRANSCRIPT_BYTES) continue;
    let readResult = await storage.read([
      {
        key: candidate.key,
        tail: MAX_RECENT_TRANSCRIPT_BYTES,
      },
    ]);
    if (!readResult.ok) continue;
    let item = readResult.value.items[0];
    if (!item.found || item.value.byteLength === 0 || item.value.byteLength < item.totalBytes) continue;
    let str = Buffer.from(item.value).toString("utf8");
    if (excludeThirdParty && containsProviderId(str)) {
      droppedThirdParty++;
      logForDebugging(`recent session ${candidate.sessionId} withheld: contains_3p_transcript_markers`);
      continue;
    }
    transcripts[candidate.sessionId] = excludeThirdParty ? redactTranscriptLines(str) : str;
    totalBytes += candidate.size;
  }
  return {
    transcripts: Object.keys(transcripts).length > 0 ? transcripts : undefined,
    droppedThirdParty,
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
function feedbackMode(command = "/feedback") {
  let blockedReason = checkProductFeedbackAllowed(command);
  if (blockedReason !== null)
    return {
      kind: "disabled",
      reason: blockedReason,
    };
  let apiProvider = getAPIProvider();
  if (apiProvider !== "firstParty")
    return {
      kind: "bundle",
      cause: "provider",
      label: PROVIDER_LABELS[apiProvider],
    };
  let mode = feedbackCredentialStatus();
  if (mode)
    return {
      kind: "bundle",
      ...mode,
    };
  if (
    command === "/share" &&
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
  let header = authHeaders.headers["x-api-key"];
  return header && apiKeyForHost(header) === null
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
var TRANSCRIPT_FIELDS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var SUBAGENT_TRANSCRIPT_FIELDS;
var MAX_RAW_TRANSCRIPT_BYTES;
var MAX_PRECOMPACT_TRANSCRIPT_BYTES;
var MAX_PAYLOAD_PART_COUNT;
var MAX_RECOMMENDED_TRANSCRIPT_BYTES;
var PICKABLE_REQUEST_FIELDS;
deferInit("chunk-xx1vmpsq.js:13380", () => {
  TRANSCRIPT_FIELDS = new Set(["transcript"]);
  SUBAGENT_TRANSCRIPT_FIELDS = new Set(["subagentTranscripts"]);
  MAX_RAW_TRANSCRIPT_BYTES = 4194304;
  MAX_PRECOMPACT_TRANSCRIPT_BYTES = 2097152;
  MAX_PAYLOAD_PART_COUNT = 8388608;
  MAX_RECOMMENDED_TRANSCRIPT_BYTES = 2097152;
  PICKABLE_REQUEST_FIELDS = [
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
});
//@ chunk-xx1vmpsq.js:13620-13715 placement
function pickFeedbackFields(input) {
  let picked = {};
  for (let field of PICKABLE_REQUEST_FIELDS)
    if (input[field] !== undefined)
      Object.assign(picked, {
        [field]: input[field],
      });
  return picked;
}
//@ chunk-xx1vmpsq.js:13715-13758 placement
function feedbackPayloadPartCount(input) {
  return buildFeedbackPayload(input, TRANSCRIPT_FIELDS, SUBAGENT_TRANSCRIPT_FIELDS).length;
}
//@ chunk-xx1vmpsq.js:13758-13843 placement
function headlessFeedbackMode() {
  let mode = feedbackMode();
  if (mode.kind === "disabled" && !isFeedbackDisabledByEnv()) return;
  return {
    kind: mode.kind,
  };
}
//@ chunk-xx1vmpsq.js:13843-14209 placement
async function submitHeadlessFeedback({ messages, description, surface, storageV5, host }) {
  let mode = feedbackMode();
  if (mode.kind === "disabled")
    return {
      feedback_id: null,
      unavailable_reason: mode.reason,
    };
  let payload = await saveFeedbackBundle({
    messages,
    description,
    surface,
    storageV5,
    host,
  });
  if (!payload.success)
    return {
      feedback_id: null,
      failure_reason: "bundle_write_failed",
    };
  return {
    feedback_id: payload.bundleId,
    bundle_path: payload.zipPath,
  };
}
//@ chunk-xx1vmpsq.js:14209-14596 placement
function feedbackUnavailableReason() {
  let mode = feedbackMode();
  switch (mode.kind) {
    case "post":
    case "share":
      return null;
    case "disabled":
      return mode.reason;
    case "bundle":
      switch (mode.cause) {
        case "no_creds":
          return `/feedback requires Anthropic credentials (OAuth or API key). Report issues at ${FEEDBACK_ISSUES_URL}`;
        case "provider":
        case "gateway":
          return `/feedback is not available when using ${mode.label}. Report issues at ${FEEDBACK_ISSUES_URL}`;
        case "share_switch":
          return null;
      }
  }
}
//@ chunk-xx1vmpsq.js:14596-14709 placement
function getRedactedInMemoryErrors() {
  return getInMemoryErrors().map((entry) => {
    let copy = {
      ...entry,
    };
    if (copy && typeof copy.error === "string") copy.error = redactSecrets_2(copy.error);
    return copy;
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
  let seenIds = new Set();
  let boundaryIndex = -1;
  for (let line of lines) {
    if (!line) continue;
    let entry;
    try {
      entry = jsonParse(line);
    } catch {
      continue;
    }
    if (typeof entry !== "object" || entry === null) continue;
    if (entry.type === "system" && entry.subtype === "compact_boundary") {
      boundaryIndex = messages.length;
      continue;
    }
    if (entry.type !== "user" && entry.type !== "assistant") continue;
    if (
      typeof entry.uuid !== "string" ||
      typeof entry.timestamp !== "string" ||
      entry.isSidechain === true ||
      !entry.message
    )
      continue;
    if (seenUuids.has(entry.uuid) || seenIds.has(entry.uuid)) continue;
    seenIds.add(entry.uuid);
    messages.push(
      entry.type === "user"
        ? {
            type: "user",
            uuid: entry.uuid,
            timestamp: entry.timestamp,
            message: entry.message,
            ...(entry.isMeta === true && {
              isMeta: true,
            }),
            ...(entry.toolUseResult !== undefined && {
              toolUseResult: entry.toolUseResult,
            }),
            ...(entry.isCompactSummary === true && {
              isCompactSummary: true,
            }),
            ...(entry.repeatsCompactSummary === true && {
              repeatsCompactSummary: true,
            }),
          }
        : {
            type: "assistant",
            uuid: entry.uuid,
            timestamp: entry.timestamp,
            message: entry.message,
            requestId: entry.requestId,
          },
    );
    sizes.push(Buffer.byteLength(line));
  }
  if (boundaryIndex <= 0) return [];
  let { start, oversized } = selectTailWithinBudget(sizes, budget, boundaryIndex);
  let sliced = messages.slice(start, boundaryIndex);
  return oversized.size === 0 ? sliced : sliced.filter((message, index) => !oversized.has(start + index));
}
//@ chunk-xx1vmpsq.js:15702-15893 placement
/**
 * 从末尾向前选择不超过字节预算的条目（单条超预算的跳过），返回保留范围与跳过的下标。
 */
function selectTailWithinBudget(sizes, budget, boundaryIndex = sizes.length) {
  let keptBytes = 0;
  let start = boundaryIndex;
  let oversized = new Set();
  while (start > 0) {
    let size = sizes[start - 1];
    if (size === undefined) break;
    if (size > budget) {
      oversized.add(start - 1);
      start--;
      continue;
    }
    if (keptBytes + size > budget) break;
    keptBytes += size;
    start--;
  }
  return {
    start,
    keptBytes,
    oversized,
  };
}
//@ chunk-xx1vmpsq.js:15893-16282 placement
/**
 * 把压缩前的消息按时间合并进当前转录：早于最早消息的放在前面，其余插到最后一条压缩摘要之前。
 */
function mergePreCompactMessages(messages, preCompactMessages) {
  let earliestTimestamp;
  for (let message of messages) {
    if (message.type === "user" && message.isCompactSummary === true) continue;
    if (earliestTimestamp === undefined || message.timestamp < earliestTimestamp)
      earliestTimestamp = message.timestamp;
  }
  let older = [];
  let recent = [];
  for (let message of preCompactMessages)
    if (earliestTimestamp === undefined || message.timestamp < earliestTimestamp) older.push(message);
    else recent.push(message);
  if (recent.length === 0) return [...older, ...messages];
  let lastIndex = messages.findLastIndex(
    (message) => message.type === "user" && message.isCompactSummary === true,
  );
  let insertAt = lastIndex === -1 ? messages.length : lastIndex;
  return [...older, ...messages.slice(0, insertAt), ...recent, ...messages.slice(insertAt)];
}
//@ chunk-xx1vmpsq.js:16282-16531 placement
async function readDebugLogTail() {
  let debugLogPath = getDebugLogPath();
  if (!debugLogPath) return null;
  try {
    await flushDebugLogs();
    let { content, bytesRead, bytesTotal } = await tailFile(debugLogPath, MAX_PRECOMPACT_TRANSCRIPT_BYTES);
    let tail = content;
    if (bytesRead < bytesTotal) {
      tail = tail.slice(
        tail.indexOf(`
`) + 1,
      );
      tail = `[debug log truncated to last ${bytesRead} of ${bytesTotal} bytes]
${tail}`;
    }
    return redactSecrets_2(tail);
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
  let preCompactMessages =
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
  let keptMessages = withholdForExport(messages, {
    host,
  });
  let laptopMemoryDroppedCount = messages.length - keptMessages.length;
  let normalizedMessages = normalizeMessagesForAPI(keptMessages);
  let transcript =
    preCompactMessages.length === 0
      ? normalizedMessages
      : mergePreCompactMessages(normalizedMessages, preCompactMessages);
  let lastAPIRequest = getLastAPIRequest();
  let lastApiRequest = nullStub();
  let payload = {
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
  if (preCompactMessages.length > 0) {
    if (feedbackPayloadPartCount(payload) > MAX_PAYLOAD_PART_COUNT) {
      logFeatureSad("feedback_precompact", "over_payload_cap");
      return {
        payload: {
          ...payload,
          transcript: normalizedMessages,
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
    payload,
    thirdPartyDroppedCount,
    laptopMemoryDroppedCount,
  };
}
//@ chunk-xx1vmpsq.js:18454-18593 placement
function redactError(err) {
  if (err instanceof Error) {
    let copy = Error(redactSecrets_2(err.message));
    if (err.stack) copy.stack = redactSecrets_2(err.stack);
    logError(copy);
  } else {
    let copy = redactSecrets_2(String(err));
    logError(Error(copy));
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
    let prefix = lines[j];
    if (!prefix) continue;
    let messageId;
    try {
      messageId = jsonParse(prefix);
    } catch {
      continue;
    }
    if (
      typeof messageId !== "object" ||
      messageId === null ||
      messageId.type !== "assistant" ||
      messageId.message.id !== latestAssistantAPIMessageId
    )
      continue;
    return typeof messageId.sessionId === "string" && isUuidShaped(messageId.sessionId)
      ? messageId.sessionId
      : undefined;
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
  TRANSCRIPT_FIELDS,
  SUBAGENT_TRANSCRIPT_FIELDS,
  redactError,
  classifyFeedbackError,
  orgRefusalError,
  credentialRefusalMessage,
  serverStatusSuffix,
  feedbackPayloadPartCount,
  selectTailWithinBudget,
  feedbackCredentialStatus,
  buildFeedbackRequest,
  findSessionIdForMessage,
};
