/**
 * services/workflows/workflowLaunchResume.ts
 *
 * 2.1.316 新增。恢复工作流启动：校验事件、下载与校验包、启动并记录结果，失败重试有上限。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-n2x174m4.js (21)
 * attribution: placement 21
 */
import { createHash, timingSafeEqual, randomUUID } from "crypto";
import { MAX_SCRIPT_BUNDLE_BYTES } from "../workflow/scriptFile.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { looseObject, string, E, M } from "../../../vendor/zod/v4/classic/schemas.js";
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

//@ chunk-n2x174m4.js:743-878 placement
/**
 * 工作流启动恢复用的包大小上限、文件存储前缀与对象名正则。
 */
var WORKFLOW_LAUNCH_RESULT = "workflow_launch_result";
var MAX_BUNDLE_BYTES = 4194304;
var WORKFLOW_FILESTORE_PREFIX = "/.workflow/";
var WORKFLOW_LAUNCH_DIGEST_ENV = "CLAUDE_CODE_WORKFLOW_LAUNCH_SHA256";
var FILESTORE_OBJECT_REGEX = /^(?!\.+$)[A-Za-z0-9._-]{1,128}$/;
//@ chunk-n2x174m4.js:878-1805 placement
/**
 * 校验启动事件字段
 */
function validateLaunchEvent(e) {
  let t = (error) => ({
    ok: false,
    error,
  });
  let filestorePath = e.filestore_path;
  if (typeof filestorePath !== "string" || filestorePath.length === 0)
    return t("filestore_path is missing or not a non-empty string");
  if (
    !filestorePath.startsWith(WORKFLOW_FILESTORE_PREFIX) ||
    !FILESTORE_OBJECT_REGEX.test(filestorePath.slice(WORKFLOW_FILESTORE_PREFIX.length))
  )
    return t(`filestore_path must name one object directly under ${WORKFLOW_FILESTORE_PREFIX}`);
  let artifactSha256 = e.artifact_sha256;
  if (typeof artifactSha256 !== "string" || !/^[0-9a-f]{64}$/.test(artifactSha256))
    return t("artifact_sha256 is missing or not 64 lowercase hex chars");
  let bundleSizeBytes = e.bundle_size_bytes;
  if (typeof bundleSizeBytes !== "number" || !Number.isSafeInteger(bundleSizeBytes) || bundleSizeBytes <= 0)
    return t("bundle_size_bytes is missing or not a positive integer");
  if (bundleSizeBytes > MAX_BUNDLE_BYTES) return t(`bundle_size_bytes exceeds ${MAX_BUNDLE_BYTES}`);
  let workflowName =
    typeof e.workflow_name === "string"
      ? e.workflow_name.replace(/[\x00-\x1f\x7f-\x9f\u2028\u2029]/g, "").slice(0, 200)
      : "";
  let sessionOrigin =
    e.session_origin === undefined ? undefined : e.session_origin === "review" ? "review" : "other";
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
//@ chunk-n2x174m4.js:1805-1917 placement
function digestMatches(buf, t) {
  let r = createHash("sha256").update(buf).digest();
  let buffer = Buffer.from(t, "hex");
  return buffer.length === r.length && timingSafeEqual(r, buffer);
}
//@ chunk-n2x174m4.js:1917-1925 placement
/**
 * 工作流包的格式版本常量。
 */
var WORKFLOW_BUNDLE_VERSION = 1;
//@ chunk-n2x174m4.js:1925-2715 placement
/**
 * 解析工作流包帧
 */
function parseWorkflowBundle(buf) {
  let t = (error) => ({
    ok: false,
    error,
  });
  if (buf.length < 1) return t("bundle is empty");
  if (buf[0] !== WORKFLOW_BUNDLE_VERSION)
    return t(`unsupported bundle format version ${buf[0]} (expected ${WORKFLOW_BUNDLE_VERSION})`);
  let r = 1;
  let n = (l, d) => {
    if (r + 8 > buf.length)
      return {
        ok: false,
        error: `bundle truncated in ${d} length frame`,
      };
    let bigUInt64BE = buf.readBigUInt64BE(r);
    r += 8;
    if (bigUInt64BE > BigInt(l))
      return {
        ok: false,
        error: `${d} frame exceeds ${l} bytes`,
      };
    let h = Number(bigUInt64BE);
    if (r + h > buf.length)
      return {
        ok: false,
        error: `bundle truncated in ${d} frame`,
      };
    let buf_2 = buf.subarray(r, r + h);
    r += h;
    return {
      ok: true,
      buf: buf_2,
    };
  };
  let s = n(MAX_SCRIPT_BUNDLE_BYTES, "script");
  if (!s.ok) return t(s.error);
  if (s.buf.length === 0) return t("script frame is empty");
  let u = n(MAX_BUNDLE_BYTES, "args_json");
  if (!u.ok) return t(u.error);
  if (r !== buf.length) return t(`bundle has ${buf.length - r} trailing bytes`);
  return {
    ok: true,
    script: s.buf.toString("utf8"),
    argsJson: u.buf.toString("utf8"),
  };
}
//@ chunk-n2x174m4.js:2715-2793 placement
function createWorkflowLaunchState(restoredRecord = null) {
  return {
    ledger: new Map(),
    firstLaunch: null,
    restoredRecord,
  };
}
//@ chunk-n2x174m4.js:2793-2988 placement
/**
 * 工作流启动记录 schema
 */
var launchRecordSchema = 2;
var launchRecordSchema_2 = DoctorLazy(() =>
  looseObject({
    event_uuid: string().refine((e) => normalizeUuidOrNull(e) !== null),
    dispatched_epoch: E().int().min(0).max(Number.MAX_SAFE_INTEGER),
    attempts: E().int().min(1).max(Number.MAX_SAFE_INTEGER),
    settled: M(),
  }),
);
//@ chunk-n2x174m4.js:2988-3378 placement
function readWorkflowLaunchRecord(e) {
  let t = launchRecordSchema_2().safeParse(e);
  if (!t.success) return null;
  let r = validateLaunchEvent(t.data);
  if (!r.ok) return null;
  return {
    event_uuid: t.data.event_uuid,
    filestore_path: r.pointer.filestorePath,
    artifact_sha256: r.pointer.artifactSha256,
    bundle_size_bytes: r.pointer.bundleSizeBytes,
    workflow_name: r.pointer.workflowName,
    dispatched_epoch: t.data.dispatched_epoch,
    attempts: t.data.attempts,
    settled: t.data.settled,
  };
}
//@ chunk-n2x174m4.js:3378-3494 placement
class WorkflowLaunchHandoffs {
  slots = new Map();
  stash(e, t) {
    this.slots.set(e, t);
  }
  take(e) {
    let t = this.slots.get(e);
    this.slots.delete(e);
    return t;
  }
}
//@ chunk-n2x174m4.js:3494-3527 placement
/**
 * 记录写回时等待 flush 的默认超时。
 */
var workflowLaunchHandoffs = new HostScoped(() => new WorkflowLaunchHandoffs());
var DEFAULT_RECORD_FLUSH_TIMEOUT_MS = 5000;
//@ chunk-n2x174m4.js:3527-3652 placement
async function flushLaunchRecord(e) {
  return (
    (await withDeadline(
      Promise.resolve()
        .then(() => e.flushRecord())
        .catch(() => false),
      e.recordFlushBoundMs ?? DEFAULT_RECORD_FLUSH_TIMEOUT_MS,
    )) === true
  );
}
//@ chunk-n2x174m4.js:3652-3678 placement
/**
 * 启动失败的退避延迟序列与最长尝试延迟。
 */
var LAUNCH_RETRY_BACKOFF_MS = [1000, 3000];
var MAX_LAUNCH_ATTEMPT_DELAY_MS = 1e4;
//@ chunk-n2x174m4.js:3678-3912 placement
/**
 * 发出 workflow_launch_result 事件
 */
function postLaunchResultEvent(e, artifactLine, r) {
  let n = {
    type: "system",
    subtype: WORKFLOW_LAUNCH_RESULT,
    artifact_line: artifactLine,
    uuid: randomUUID(),
    session_id: e.getSessionId(),
  };
  if (r.launchUuid !== undefined) n.launch_uuid = r.launchUuid;
  if (r.artifactSha256 !== undefined) n.artifact_sha256 = r.artifactSha256;
  e.postEvent(n);
}
//@ chunk-n2x174m4.js:3912-4045 placement
function reportLaunchFailure(e, t, r, n) {
  postLaunchResultEvent(e, remoteWorkflowErrorLine(t, r), n);
  logForDiagnosticsNoPII("warn", "workflow_launch_failed", {
    layer: t,
  });
  logEvent("tengu_workflow_launch_event", {
    ok: false,
    layer: fromEnum(t),
  });
}
//@ chunk-n2x174m4.js:4045-4105 placement
/**
 * 上报工作流启动失败（事件 + 功能降级日志）。
 */
function reportWorkflowLaunchFailure(e, t, r, n) {
  reportLaunchFailure(e, t, r, n);
  logFeatureBad("workflow_event_launch", t);
}
//@ chunk-n2x174m4.js:4105-4215 placement
function settleLaunchFailedFinal(e, uuid, r, n, s) {
  reportWorkflowLaunchFailure(e, r, n, s);
  e.state.ledger.set(uuid, {
    eventUuid: uuid,
    outcome: "failed-final",
  });
  e.ackProcessed(uuid);
}
//@ chunk-n2x174m4.js:4215-4396 placement
/**
 * 启动失败定案
 */
async function settleLaunchFailed(e, t, r, n, s) {
  let eventUuid = t.event_uuid;
  e.state.ledger.set(eventUuid, {
    eventUuid,
    outcome: "failed-final",
  });
  e.persistRecord({
    ...t,
    settled: true,
  });
  await flushLaunchRecord(e);
  reportWorkflowLaunchFailure(e, r, n, s);
  e.ackProcessed(eventUuid);
}
//@ chunk-n2x174m4.js:4396-6626 placement
/**
 * 下载、校验并启动工作流包
 */
async function attemptWorkflowLaunch(e, t, r, n, s) {
  let { ledger } = e.state;
  let eventUuid = t.eventUuid;
  let d = (s?.attempts ?? 0) + 1;
  let L = (settled) => ({
    event_uuid: eventUuid,
    filestore_path: r.filestorePath,
    artifact_sha256: r.artifactSha256,
    bundle_size_bytes: r.bundleSizeBytes,
    workflow_name: r.workflowName,
    dispatched_epoch: e.getWorkerEpoch() ?? 0,
    attempts: d,
    settled,
  });
  let h = () => {
    if (e.state.firstLaunch === t) e.state.firstLaunch = null;
  };
  let w = async (_, error) => {
    h();
    if (s) {
      await settleLaunchFailed(e, s, _, error, n);
      return;
    }
    settleLaunchFailedFinal(e, eventUuid, _, error, n);
  };
  let now = Date.now();
  let fetchRetryWindowMs = e.fetchRetryWindowMs ?? MAX_LAUNCH_ATTEMPT_DELAY_MS;
  let bundle = await e.fetchBundle(r.filestorePath);
  let P = 1;
  for (let _ of e.fetchRetryDelaysMs ?? LAUNCH_RETRY_BACKOFF_MS) {
    if (bundle.ok || bundle.gated || Date.now() - now + _ >= fetchRetryWindowMs) break;
    P++;
    logForDiagnosticsNoPII("warn", "workflow_launch_bundle_fetch_retry", {
      attempt: P,
    });
    await sleep(_);
    bundle = await e.fetchBundle(r.filestorePath);
  }
  if (!bundle.ok) {
    if (bundle.gated) {
      await w("bundle-fetch", `bundle fetch gated: ${bundle.error}`);
      return;
    }
    ledger.delete(eventUuid);
    h();
    if (s) {
      logForDiagnosticsNoPII("warn", "workflow_launch_rescue_fetch_failed", {});
      logFeatureSad("workflow_event_launch", "rescue_fetch_transient");
      return;
    }
    reportLaunchFailure(e, "bundle-fetch", `bundle fetch failed: ${bundle.error}`, n);
    logFeatureSad("workflow_event_launch", "bundle_fetch_transient");
    return;
  }
  let buf = bundle.buf;
  if (buf.byteLength > MAX_BUNDLE_BYTES || buf.byteLength !== r.bundleSizeBytes) {
    await w(
      "payload-digest-mismatch",
      `staged bundle is ${buf.byteLength} bytes, event pinned ${r.bundleSizeBytes}`,
    );
    return;
  }
  if (!digestMatches(buf, r.artifactSha256)) {
    await w(
      "payload-digest-mismatch",
      "staged bundle sha256 does not match the artifact_sha256 the event pinned",
    );
    return;
  }
  let workflowBundle = parseWorkflowBundle(buf);
  if (!workflowBundle.ok) {
    await w("launch-payload", workflowBundle.error);
    return;
  }
  let args;
  if (workflowBundle.argsJson !== "")
    try {
      args = JSON.parse(workflowBundle.argsJson);
    } catch (error) {
      await w(
        "args-parse",
        `args_json is not valid JSON: ${error instanceof Error ? error.message : String(error)}`,
      );
      return;
    }
  e.state.firstLaunch = t;
  e.persistRecord(L(false));
  let G = await flushLaunchRecord(e);
  if (s && !G) {
    ledger.delete(eventUuid);
    h();
    logForDiagnosticsNoPII("warn", "workflow_launch_rescue_uncounted", {});
    logFeatureSad("workflow_event_launch", "rescue_record_unconfirmed");
    return;
  }
  let N = randomUUID();
  workflowLaunchHandoffs.of(e.host).stash(N, {
    script: workflowBundle.script,
    args,
    eventSessionOrigin: r.sessionOrigin,
    postResultLine: (artifactLine) => postLaunchResultEvent(e, artifactLine, n),
    onRunSettled: async (_) => {
      t.outcome = _ ? "executed" : "run-failed";
      e.persistRecord(L(true));
      if (!(await flushLaunchRecord(e))) e.persistRecord(L(true));
    },
  });
  e.prependUserMessage(`/workflow-launch-exec ${N}`);
  e.ackProcessed(eventUuid);
  logEvent("tengu_workflow_launch_event", {
    ok: true,
    attempt: d,
  });
  logFeatureOk("workflow_event_launch");
  logForDiagnosticsNoPII("info", "workflow_launch_dispatched", {
    attempt: d,
  });
}
//@ chunk-n2x174m4.js:6626-6928 placement
/**
 * 重试用尽定案
 */
function settleAttemptsSpent(e, t) {
  let r = {
    eventUuid: t.event_uuid,
    outcome: "failed-final",
  };
  e.state.ledger.set(t.event_uuid, r);
  e.state.firstLaunch ??= r;
  e.persistRecord({
    ...t,
    settled: true,
  });
  e.ackProcessed(t.event_uuid);
  logForDiagnosticsNoPII("warn", "workflow_launch_attempts_spent", {
    attempts: t.attempts,
  });
  logFeatureSad("workflow_event_launch", "attempts_spent");
}
//@ chunk-n2x174m4.js:6928-8171 placement
async function handleWorkflowLaunchEvent(e, t) {
  let uuid = typeof e.uuid === "string" ? e.uuid : undefined;
  if (!uuid) {
    reportWorkflowLaunchFailure(t, "launch-payload", "event has no uuid", {});
    return;
  }
  let { ledger } = t.state;
  let s = ledger.get(uuid);
  if (s) {
    if (s.outcome !== "pending") t.ackProcessed(uuid);
    return;
  }
  if (!t.isRemoteTransport() || !env.CLAUDE_CODE_REMOTE || !env.CLAUDE_CODE_REMOTE_SESSION_ID) {
    reportWorkflowLaunchFailure(
      t,
      "not-remote-session",
      "workflow_launch received outside a remote (CCR) session",
      {
        launchUuid: uuid,
      },
    );
    return;
  }
  let u = validateLaunchEvent(e);
  if (!u.ok) {
    settleLaunchFailedFinal(t, uuid, "launch-payload", u.error, {
      launchUuid: uuid,
    });
    return;
  }
  let pointer = u.pointer;
  let d = {
    launchUuid: uuid,
    artifactSha256: pointer.artifactSha256,
  };
  let restoredRecord = t.state.restoredRecord;
  let h = restoredRecord && restoredRecord.event_uuid === uuid ? restoredRecord : null;
  if (h) {
    if (h.settled) {
      let k = {
        eventUuid: uuid,
        outcome: "executed",
      };
      ledger.set(uuid, k);
      t.state.firstLaunch ??= k;
      t.ackProcessed(uuid);
      logForDiagnosticsNoPII("info", "workflow_launch_redelivery_settled", {});
      return;
    }
    if (h.attempts >= launchRecordSchema) {
      settleAttemptsSpent(t, h);
      return;
    }
  }
  let w = workflowPolicyRefusal({
    serverAuthoredCarrier: true,
    eventSessionOrigin: pointer.sessionOrigin,
  });
  if (w) {
    if (h) {
      await settleLaunchFailed(t, h, "policy-gate", w, d);
      return;
    }
    settleLaunchFailedFinal(t, uuid, "policy-gate", w, d);
    return;
  }
  let { firstLaunch } = t.state;
  if (firstLaunch && firstLaunch.eventUuid !== uuid) {
    settleLaunchFailedFinal(
      t,
      uuid,
      "launch-protocol",
      "a second distinct workflow_launch event arrived in this session; at most one launch per session is permitted",
      d,
    );
    return;
  }
  let R = {
    eventUuid: uuid,
    outcome: "pending",
  };
  ledger.set(uuid, R);
  t.state.firstLaunch = R;
  await attemptWorkflowLaunch(t, R, pointer, d, h);
}
//@ chunk-n2x174m4.js:8171-9487 placement
/**
 * 恢复工作流启动：校验事件、下载与校验包、启动并记录结果，失败重试有上限。
 */
async function resumeWorkflowLaunch(e) {
  let restoredRecord = e.state.restoredRecord;
  if (!restoredRecord) return;
  if (!e.isRemoteTransport() || !env.CLAUDE_CODE_REMOTE || !env.CLAUDE_CODE_REMOTE_SESSION_ID) return;
  if (restoredRecord.settled) {
    logForDiagnosticsNoPII("info", "workflow_launch_resume_skipped", {
      reason: "settled",
    });
    return;
  }
  let workerEpoch = e.getWorkerEpoch();
  if (workerEpoch === undefined || restoredRecord.dispatched_epoch >= workerEpoch) {
    logForDiagnosticsNoPII("info", "workflow_launch_resume_skipped", {
      reason: "not_a_later_epoch",
    });
    return;
  }
  let dispatchedDigest = e.getDispatchedDigest();
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
  let { ledger } = e.state;
  if (ledger.has(restoredRecord.event_uuid) || e.state.firstLaunch) return;
  if (restoredRecord.attempts >= launchRecordSchema) {
    settleAttemptsSpent(e, restoredRecord);
    return;
  }
  let u = {
    launchUuid: restoredRecord.event_uuid,
    artifactSha256: restoredRecord.artifact_sha256,
  };
  let l = workflowPolicyRefusal({
    serverAuthoredCarrier: true,
  });
  if (l) {
    if (
      !e.isAccountLaunchedReview() &&
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
    await settleLaunchFailed(e, restoredRecord, "policy-gate", l, u);
    return;
  }
  let d = {
    eventUuid: restoredRecord.event_uuid,
    outcome: "pending",
  };
  ledger.set(restoredRecord.event_uuid, d);
  e.state.firstLaunch = d;
  logForDiagnosticsNoPII("info", "workflow_launch_resuming", {
    attempt: restoredRecord.attempts + 1,
  });
  await attemptWorkflowLaunch(
    e,
    d,
    {
      workflowName: restoredRecord.workflow_name,
      filestorePath: restoredRecord.filestore_path,
      artifactSha256: restoredRecord.artifact_sha256,
      bundleSizeBytes: restoredRecord.bundle_size_bytes,
    },
    u,
    restoredRecord,
  );
}
export { workflowLaunchHandoffs };
