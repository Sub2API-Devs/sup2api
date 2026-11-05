/**
 * services/workflows/workflowLaunchResume.ts
 *
 * 2.1.316 新增。恢复工作流启动：校验事件、下载与校验包、启动并记录结果，失败重试有上限。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-er9x2g41.js (21)
 * attribution: placement 21
 */
import { createHash, timingSafeEqual, randomUUID } from "crypto";
import { MAX_SCRIPT_BUNDLE_BYTES } from "../workflow/scriptFile.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  looseObject,
  stringSchema,
  numberSchema,
  booleanSchema,
} from "../../../vendor/zod/v4/classic/schemas.js";
import { normalizeUuidOrNull } from "../../utils/agentId.js";
import { HostScoped } from "../../utils/hostScoped.js";
import { withDeadline, sleep } from "../../utils/sleep.js";
import { remoteWorkflowErrorLine, workflowPolicyRefusal } from "./remoteWorkflow.js";
import { logForDiagnosticsNoPII } from "../../utils/diagLogs.js";
import { logEvent } from "../analytics/index.js";
import { fromEnum } from "../analytics/safeMetadata.js";
import { logFeatureBad, logFeatureSad, logFeatureOk } from "../analytics/featureTelemetry.js";
import { env } from "../../utils/env.js";
import { isReviewSession } from "../../utils/sessionAccessToken.js";

//@ chunk-er9x2g41.js:743-878 placement
/**
 * 工作流启动恢复用的包大小上限、文件存储前缀与对象名正则。
 */
var WORKFLOW_LAUNCH_RESULT = "workflow_launch_result";
var MAX_BUNDLE_BYTES = 4194304;
var WORKFLOW_FILESTORE_PREFIX = "/.workflow/";
var WORKFLOW_LAUNCH_DIGEST_ENV = "CLAUDE_CODE_WORKFLOW_LAUNCH_SHA256";
var FILESTORE_OBJECT_REGEX = /^(?!\.+$)[A-Za-z0-9._-]{1,128}$/;
//@ chunk-er9x2g41.js:878-1805 placement
/**
 * 校验启动事件字段
 */
function validateLaunchEvent(event) {
  let fail = (error) => ({
    ok: false,
    error,
  });
  let filestorePath = event.filestore_path;
  if (typeof filestorePath !== "string" || filestorePath.length === 0)
    return fail("filestore_path is missing or not a non-empty string");
  if (
    !filestorePath.startsWith(WORKFLOW_FILESTORE_PREFIX) ||
    !FILESTORE_OBJECT_REGEX.test(filestorePath.slice(WORKFLOW_FILESTORE_PREFIX.length))
  )
    return fail(`filestore_path must name one object directly under ${WORKFLOW_FILESTORE_PREFIX}`);
  let artifactSha256 = event.artifact_sha256;
  if (typeof artifactSha256 !== "string" || !/^[0-9a-f]{64}$/.test(artifactSha256))
    return fail("artifact_sha256 is missing or not 64 lowercase hex chars");
  let bundleSizeBytes = event.bundle_size_bytes;
  if (typeof bundleSizeBytes !== "number" || !Number.isSafeInteger(bundleSizeBytes) || bundleSizeBytes <= 0)
    return fail("bundle_size_bytes is missing or not a positive integer");
  if (bundleSizeBytes > MAX_BUNDLE_BYTES) return fail(`bundle_size_bytes exceeds ${MAX_BUNDLE_BYTES}`);
  let workflowName =
    typeof event.workflow_name === "string"
      ? event.workflow_name.replace(/[\x00-\x1f\x7f-\x9f\u2028\u2029]/g, "").slice(0, 200)
      : "";
  let sessionOrigin =
    event.session_origin === undefined ? undefined : event.session_origin === "review" ? "review" : "other";
  return {
    ok: true,
    pointer: {
      workflowName,
      filestorePath,
      artifactSha256,
      bundleSizeBytes,
      sessionOrigin,
    },
  };
}
//@ chunk-er9x2g41.js:1805-1917 placement
function digestMatches(buf, expectedHex) {
  let actual = createHash("sha256").update(buf).digest();
  let buffer = Buffer.from(expectedHex, "hex");
  return buffer.length === actual.length && timingSafeEqual(actual, buffer);
}
//@ chunk-er9x2g41.js:1917-1925 placement
/**
 * 工作流包的格式版本常量。
 */
var WORKFLOW_BUNDLE_VERSION = 1;
//@ chunk-er9x2g41.js:1925-2715 placement
/**
 * 解析工作流包帧
 */
function parseWorkflowBundle(buf) {
  let fail = (error) => ({
    ok: false,
    error,
  });
  if (buf.length < 1) return fail("bundle is empty");
  if (buf[0] !== WORKFLOW_BUNDLE_VERSION)
    return fail(`unsupported bundle format version ${buf[0]} (expected ${WORKFLOW_BUNDLE_VERSION})`);
  let offset = 1;
  let readFrame = (maxBytes, label) => {
    if (offset + 8 > buf.length)
      return {
        ok: false,
        error: `bundle truncated in ${label} length frame`,
      };
    let bigUInt64BE = buf.readBigUInt64BE(offset);
    offset += 8;
    if (bigUInt64BE > BigInt(maxBytes))
      return {
        ok: false,
        error: `${label} frame exceeds ${maxBytes} bytes`,
      };
    let frameLength = Number(bigUInt64BE);
    if (offset + frameLength > buf.length)
      return {
        ok: false,
        error: `bundle truncated in ${label} frame`,
      };
    let buf_2 = buf.subarray(offset, offset + frameLength);
    offset += frameLength;
    return {
      ok: true,
      buf: buf_2,
    };
  };
  let scriptFrame = readFrame(MAX_SCRIPT_BUNDLE_BYTES, "script");
  if (!scriptFrame.ok) return fail(scriptFrame.error);
  if (scriptFrame.buf.length === 0) return fail("script frame is empty");
  let argsFrame = readFrame(MAX_BUNDLE_BYTES, "args_json");
  if (!argsFrame.ok) return fail(argsFrame.error);
  if (offset !== buf.length) return fail(`bundle has ${buf.length - offset} trailing bytes`);
  return {
    ok: true,
    script: scriptFrame.buf.toString("utf8"),
    argsJson: argsFrame.buf.toString("utf8"),
  };
}
//@ chunk-er9x2g41.js:2715-2793 placement
function createWorkflowLaunchState(restoredRecord = null) {
  return {
    ledger: new Map(),
    firstLaunch: null,
    restoredRecord,
  };
}
//@ chunk-er9x2g41.js:2793-2988 placement
/**
 * 工作流启动记录 schema
 */
var MAX_LAUNCH_ATTEMPTS = 2;
var launchRecordSchema = DoctorLazy(() =>
  looseObject({
    event_uuid: stringSchema().refine((uuid) => normalizeUuidOrNull(uuid) !== null),
    dispatched_epoch: numberSchema().int().min(0).max(Number.MAX_SAFE_INTEGER),
    attempts: numberSchema().int().min(1).max(Number.MAX_SAFE_INTEGER),
    settled: booleanSchema(),
  }),
);
//@ chunk-er9x2g41.js:2988-3378 placement
function readWorkflowLaunchRecord(raw) {
  let parsed = launchRecordSchema().safeParse(raw);
  if (!parsed.success) return null;
  let validated = validateLaunchEvent(parsed.data);
  if (!validated.ok) return null;
  return {
    event_uuid: parsed.data.event_uuid,
    filestore_path: validated.pointer.filestorePath,
    artifact_sha256: validated.pointer.artifactSha256,
    bundle_size_bytes: validated.pointer.bundleSizeBytes,
    workflow_name: validated.pointer.workflowName,
    dispatched_epoch: parsed.data.dispatched_epoch,
    attempts: parsed.data.attempts,
    settled: parsed.data.settled,
  };
}
//@ chunk-er9x2g41.js:3378-3494 placement
class WorkflowLaunchHandoffs {
  slots = new Map();
  stash(key, handoff) {
    this.slots.set(key, handoff);
  }
  take(key) {
    let handoff = this.slots.get(key);
    this.slots.delete(key);
    return handoff;
  }
}
//@ chunk-er9x2g41.js:3494-3527 placement
/**
 * 记录写回时等待 flush 的默认超时。
 */
var workflowLaunchHandoffs = new HostScoped(() => new WorkflowLaunchHandoffs());
var DEFAULT_RECORD_FLUSH_TIMEOUT_MS = 5000;
//@ chunk-er9x2g41.js:3527-3652 placement
async function flushLaunchRecord(record) {
  return (
    (await withDeadline(
      Promise.resolve()
        .then(() => record.flushRecord())
        .catch(() => false),
      record.recordFlushBoundMs ?? DEFAULT_RECORD_FLUSH_TIMEOUT_MS,
    )) === true
  );
}
//@ chunk-er9x2g41.js:3652-3678 placement
/**
 * 启动失败的退避延迟序列与最长尝试延迟。
 */
var LAUNCH_RETRY_BACKOFF_MS = [1000, 3000];
var MAX_LAUNCH_ATTEMPT_DELAY_MS = 1e4;
//@ chunk-er9x2g41.js:3678-3912 placement
/**
 * 发出 workflow_launch_result 事件
 */
function postLaunchResultEvent(host, artifactLine, options) {
  let event = {
    type: "system",
    subtype: WORKFLOW_LAUNCH_RESULT,
    artifact_line: artifactLine,
    uuid: randomUUID(),
    session_id: host.getSessionId(),
  };
  if (options.launchUuid !== undefined) event.launch_uuid = options.launchUuid;
  if (options.artifactSha256 !== undefined) event.artifact_sha256 = options.artifactSha256;
  host.postEvent(event);
}
//@ chunk-er9x2g41.js:3912-4045 placement
function reportLaunchFailure(host, layer, message, options) {
  postLaunchResultEvent(host, remoteWorkflowErrorLine(layer, message), options);
  logForDiagnosticsNoPII("warn", "workflow_launch_failed", {
    layer,
  });
  logEvent("tengu_workflow_launch_event", {
    ok: false,
    layer: fromEnum(layer),
  });
}
//@ chunk-er9x2g41.js:4045-4105 placement
/**
 * 上报工作流启动失败（事件 + 功能降级日志）。
 */
function reportWorkflowLaunchFailure(host, layer, message, options) {
  reportLaunchFailure(host, layer, message, options);
  logFeatureBad("workflow_event_launch", layer);
}
//@ chunk-er9x2g41.js:4105-4215 placement
function settleLaunchFailedFinal(session, uuid, layer, message, options) {
  reportWorkflowLaunchFailure(session, layer, message, options);
  session.state.ledger.set(uuid, {
    eventUuid: uuid,
    outcome: "failed-final",
  });
  session.ackProcessed(uuid);
}
//@ chunk-er9x2g41.js:4215-4396 placement
/**
 * 启动失败定案
 */
async function settleLaunchFailed(session, record, layer, message, options) {
  let eventUuid = record.event_uuid;
  session.state.ledger.set(eventUuid, {
    eventUuid,
    outcome: "failed-final",
  });
  session.persistRecord({
    ...record,
    settled: true,
  });
  await flushLaunchRecord(session);
  reportWorkflowLaunchFailure(session, layer, message, options);
  session.ackProcessed(eventUuid);
}
//@ chunk-er9x2g41.js:4396-6626 placement
/**
 * 下载、校验并启动工作流包
 */
async function attemptWorkflowLaunch(session, entry, pointer, options, restoredRecord) {
  let { ledger } = session.state;
  let eventUuid = entry.eventUuid;
  let attempts = (restoredRecord?.attempts ?? 0) + 1;
  let makeRecord = (settled) => ({
    event_uuid: eventUuid,
    filestore_path: pointer.filestorePath,
    artifact_sha256: pointer.artifactSha256,
    bundle_size_bytes: pointer.bundleSizeBytes,
    workflow_name: pointer.workflowName,
    dispatched_epoch: session.getWorkerEpoch() ?? 0,
    attempts,
    settled,
  });
  let clearFirstLaunch = () => {
    if (session.state.firstLaunch === entry) session.state.firstLaunch = null;
  };
  let failLaunch = async (layer, message) => {
    clearFirstLaunch();
    if (restoredRecord) {
      await settleLaunchFailed(session, restoredRecord, layer, message, options);
      return;
    }
    settleLaunchFailedFinal(session, eventUuid, layer, message, options);
  };
  let now = Date.now();
  let fetchRetryWindowMs = session.fetchRetryWindowMs ?? MAX_LAUNCH_ATTEMPT_DELAY_MS;
  let bundle = await session.fetchBundle(pointer.filestorePath);
  let fetchAttempts = 1;
  for (let delayMs of session.fetchRetryDelaysMs ?? LAUNCH_RETRY_BACKOFF_MS) {
    if (bundle.ok || bundle.gated || Date.now() - now + delayMs >= fetchRetryWindowMs) break;
    fetchAttempts++;
    logForDiagnosticsNoPII("warn", "workflow_launch_bundle_fetch_retry", {
      attempt: fetchAttempts,
    });
    await sleep(delayMs);
    bundle = await session.fetchBundle(pointer.filestorePath);
  }
  if (!bundle.ok) {
    if (bundle.gated) {
      await failLaunch("bundle-fetch", `bundle fetch gated: ${bundle.error}`);
      return;
    }
    ledger.delete(eventUuid);
    clearFirstLaunch();
    if (restoredRecord) {
      logForDiagnosticsNoPII("warn", "workflow_launch_rescue_fetch_failed", {});
      logFeatureSad("workflow_event_launch", "rescue_fetch_transient");
      return;
    }
    reportLaunchFailure(session, "bundle-fetch", `bundle fetch failed: ${bundle.error}`, options);
    logFeatureSad("workflow_event_launch", "bundle_fetch_transient");
    return;
  }
  let buf = bundle.buf;
  if (buf.byteLength > MAX_BUNDLE_BYTES || buf.byteLength !== pointer.bundleSizeBytes) {
    await failLaunch(
      "payload-digest-mismatch",
      `staged bundle is ${buf.byteLength} bytes, event pinned ${pointer.bundleSizeBytes}`,
    );
    return;
  }
  if (!digestMatches(buf, pointer.artifactSha256)) {
    await failLaunch(
      "payload-digest-mismatch",
      "staged bundle sha256 does not match the artifact_sha256 the event pinned",
    );
    return;
  }
  let workflowBundle = parseWorkflowBundle(buf);
  if (!workflowBundle.ok) {
    await failLaunch("launch-payload", workflowBundle.error);
    return;
  }
  let args;
  if (workflowBundle.argsJson !== "")
    try {
      args = JSON.parse(workflowBundle.argsJson);
    } catch (error) {
      await failLaunch(
        "args-parse",
        `args_json is not valid JSON: ${error instanceof Error ? error.message : String(error)}`,
      );
      return;
    }
  session.state.firstLaunch = entry;
  session.persistRecord(makeRecord(false));
  let recordFlushed = await flushLaunchRecord(session);
  if (restoredRecord && !recordFlushed) {
    ledger.delete(eventUuid);
    clearFirstLaunch();
    logForDiagnosticsNoPII("warn", "workflow_launch_rescue_uncounted", {});
    logFeatureSad("workflow_event_launch", "rescue_record_unconfirmed");
    return;
  }
  let launchUuid = randomUUID();
  workflowLaunchHandoffs.of(session.host).stash(launchUuid, {
    script: workflowBundle.script,
    args,
    eventSessionOrigin: pointer.sessionOrigin,
    postResultLine: (artifactLine) => postLaunchResultEvent(session, artifactLine, options),
    onRunSettled: async (didRun) => {
      entry.outcome = didRun ? "executed" : "run-failed";
      session.persistRecord(makeRecord(true));
      if (!(await flushLaunchRecord(session))) session.persistRecord(makeRecord(true));
    },
  });
  session.prependUserMessage(`/workflow-launch-exec ${launchUuid}`);
  session.ackProcessed(eventUuid);
  logEvent("tengu_workflow_launch_event", {
    ok: true,
    attempt: attempts,
  });
  logFeatureOk("workflow_event_launch");
  logForDiagnosticsNoPII("info", "workflow_launch_dispatched", {
    attempt: attempts,
  });
}
//@ chunk-er9x2g41.js:6626-6928 placement
/**
 * 重试用尽定案
 */
function settleAttemptsSpent(session, record) {
  let entry = {
    eventUuid: record.event_uuid,
    outcome: "failed-final",
  };
  session.state.ledger.set(record.event_uuid, entry);
  session.state.firstLaunch ??= entry;
  session.persistRecord({
    ...record,
    settled: true,
  });
  session.ackProcessed(record.event_uuid);
  logForDiagnosticsNoPII("warn", "workflow_launch_attempts_spent", {
    attempts: record.attempts,
  });
  logFeatureSad("workflow_event_launch", "attempts_spent");
}
//@ chunk-er9x2g41.js:6928-8171 placement
async function handleWorkflowLaunchEvent(event, session) {
  let uuid = typeof event.uuid === "string" ? event.uuid : undefined;
  if (!uuid) {
    reportWorkflowLaunchFailure(session, "launch-payload", "event has no uuid", {});
    return;
  }
  let { ledger } = session.state;
  let existing = ledger.get(uuid);
  if (existing) {
    if (existing.outcome !== "pending") session.ackProcessed(uuid);
    return;
  }
  if (!session.isRemoteTransport() || !env.CLAUDE_CODE_REMOTE || !env.CLAUDE_CODE_REMOTE_SESSION_ID) {
    reportWorkflowLaunchFailure(
      session,
      "not-remote-session",
      "workflow_launch received outside a remote (CCR) session",
      {
        launchUuid: uuid,
      },
    );
    return;
  }
  let validated = validateLaunchEvent(event);
  if (!validated.ok) {
    settleLaunchFailedFinal(session, uuid, "launch-payload", validated.error, {
      launchUuid: uuid,
    });
    return;
  }
  let pointer = validated.pointer;
  let options = {
    launchUuid: uuid,
    artifactSha256: pointer.artifactSha256,
  };
  let restoredRecord = session.state.restoredRecord;
  let matchingRecord = restoredRecord && restoredRecord.event_uuid === uuid ? restoredRecord : null;
  if (matchingRecord) {
    if (matchingRecord.settled) {
      let entry = {
        eventUuid: uuid,
        outcome: "executed",
      };
      ledger.set(uuid, entry);
      session.state.firstLaunch ??= entry;
      session.ackProcessed(uuid);
      logForDiagnosticsNoPII("info", "workflow_launch_redelivery_settled", {});
      return;
    }
    if (matchingRecord.attempts >= MAX_LAUNCH_ATTEMPTS) {
      settleAttemptsSpent(session, matchingRecord);
      return;
    }
  }
  let policyRefusal = workflowPolicyRefusal({
    serverAuthoredCarrier: true,
    eventSessionOrigin: pointer.sessionOrigin,
  });
  if (policyRefusal) {
    if (matchingRecord) {
      await settleLaunchFailed(session, matchingRecord, "policy-gate", policyRefusal, options);
      return;
    }
    settleLaunchFailedFinal(session, uuid, "policy-gate", policyRefusal, options);
    return;
  }
  let { firstLaunch } = session.state;
  if (firstLaunch && firstLaunch.eventUuid !== uuid) {
    settleLaunchFailedFinal(
      session,
      uuid,
      "launch-protocol",
      "a second distinct workflow_launch event arrived in this session; at most one launch per session is permitted",
      options,
    );
    return;
  }
  let ledgerEntry = {
    eventUuid: uuid,
    outcome: "pending",
  };
  ledger.set(uuid, ledgerEntry);
  session.state.firstLaunch = ledgerEntry;
  await attemptWorkflowLaunch(session, ledgerEntry, pointer, options, matchingRecord);
}
//@ chunk-er9x2g41.js:8171-9487 placement
/**
 * 恢复工作流启动：校验事件、下载与校验包、启动并记录结果，失败重试有上限。
 */
async function resumeWorkflowLaunch(session) {
  let restoredRecord = session.state.restoredRecord;
  if (!restoredRecord) return;
  if (!session.isRemoteTransport() || !env.CLAUDE_CODE_REMOTE || !env.CLAUDE_CODE_REMOTE_SESSION_ID) return;
  if (restoredRecord.settled) {
    logForDiagnosticsNoPII("info", "workflow_launch_resume_skipped", {
      reason: "settled",
    });
    return;
  }
  let workerEpoch = session.getWorkerEpoch();
  if (workerEpoch === undefined || restoredRecord.dispatched_epoch >= workerEpoch) {
    logForDiagnosticsNoPII("info", "workflow_launch_resume_skipped", {
      reason: "not_a_later_epoch",
    });
    return;
  }
  let dispatchedDigest = session.getDispatchedDigest();
  if (
    dispatchedDigest === undefined ||
    !/^[0-9a-f]{64}$/.test(dispatchedDigest) ||
    dispatchedDigest !== restoredRecord.artifact_sha256
  ) {
    logForDiagnosticsNoPII("info", "workflow_launch_resume_skipped", {
      reason: dispatchedDigest === undefined ? "no_server_digest" : "digest_differs",
    });
    return;
  }
  let { ledger } = session.state;
  if (ledger.has(restoredRecord.event_uuid) || session.state.firstLaunch) return;
  if (restoredRecord.attempts >= MAX_LAUNCH_ATTEMPTS) {
    settleAttemptsSpent(session, restoredRecord);
    return;
  }
  let options = {
    launchUuid: restoredRecord.event_uuid,
    artifactSha256: restoredRecord.artifact_sha256,
  };
  let policyRefusal = workflowPolicyRefusal({
    serverAuthoredCarrier: true,
  });
  if (policyRefusal) {
    if (
      !session.isAccountLaunchedReview() &&
      isReviewSession() &&
      workflowPolicyRefusal({
        serverAuthoredCarrier: true,
        eventSessionOrigin: "review",
      }) === null
    ) {
      logForDiagnosticsNoPII("info", "workflow_launch_resume_skipped", {
        reason: "needs_event_origin",
      });
      return;
    }
    await settleLaunchFailed(session, restoredRecord, "policy-gate", policyRefusal, options);
    return;
  }
  let ledgerEntry = {
    eventUuid: restoredRecord.event_uuid,
    outcome: "pending",
  };
  ledger.set(restoredRecord.event_uuid, ledgerEntry);
  session.state.firstLaunch = ledgerEntry;
  logForDiagnosticsNoPII("info", "workflow_launch_resuming", {
    attempt: restoredRecord.attempts + 1,
  });
  await attemptWorkflowLaunch(
    session,
    ledgerEntry,
    {
      workflowName: restoredRecord.workflow_name,
      filestorePath: restoredRecord.filestore_path,
      artifactSha256: restoredRecord.artifact_sha256,
      bundleSizeBytes: restoredRecord.bundle_size_bytes,
    },
    options,
    restoredRecord,
  );
}
export {
  workflowLaunchHandoffs,
  WORKFLOW_LAUNCH_DIGEST_ENV,
  createWorkflowLaunchState,
  handleWorkflowLaunchEvent,
  readWorkflowLaunchRecord,
  resumeWorkflowLaunch,
};
