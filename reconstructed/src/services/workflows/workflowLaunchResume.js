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
import { aar } from "../workflow/scriptFile.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { kt, o, E, M } from "../../../vendor/zod/v4/classic/schemas.js";
import { Vt } from "../../utils/agentId.js";
import { HostScoped } from "../../utils/hostScoped.js";
import { withDeadline, sleep } from "../../utils/sleep.js";
import { oin, workflowPolicyRefusal } from "./remoteWorkflow.js";
import { logForDiagnosticsNoPII } from "../../utils/diagLogs.js";
import { logEvent } from "../analytics/index.js";
import { fromEnum } from "../analytics/safeMetadata.js";
import { logFeatureBad, logFeatureSad, logFeatureOk } from "../analytics/featureTelemetry.js";
import { env } from "../../utils/env.js";
import { isReviewSession } from "../../utils/sessionAccessToken.js";

//@ chunk-n2x174m4.js:743-878 placement
var WORKFLOW_LAUNCH_RESULT = "workflow_launch_result",
  O = 4194304,
  B = "/.workflow/",
  WORKFLOW_LAUNCH_DIGEST_ENV = "CLAUDE_CODE_WORKFLOW_LAUNCH_SHA256",
  ee = /^(?!\.+$)[A-Za-z0-9._-]{1,128}$/;
/**
 * 校验启动事件字段
 */
//@ chunk-n2x174m4.js:878-1805 placement
function validateLaunchEvent(e) {
  let t = (d) => ({ ok: !1, error: d }),
    filestore_path = e.filestore_path;
  if (typeof filestore_path !== "string" || filestore_path.length === 0)
    return t("filestore_path is missing or not a non-empty string");
  if (!filestore_path.startsWith(B) || !ee.test(filestore_path.slice(B.length)))
    return t(`filestore_path must name one object directly under ${B}`);
  let artifact_sha256 = e.artifact_sha256;
  if (typeof artifact_sha256 !== "string" || !/^[0-9a-f]{64}$/.test(artifact_sha256))
    return t("artifact_sha256 is missing or not 64 lowercase hex chars");
  let bundle_size_bytes = e.bundle_size_bytes;
  if (
    typeof bundle_size_bytes !== "number" ||
    !Number.isSafeInteger(bundle_size_bytes) ||
    bundle_size_bytes <= 0
  )
    return t("bundle_size_bytes is missing or not a positive integer");
  if (bundle_size_bytes > O) return t(`bundle_size_bytes exceeds ${O}`);
  let u =
      typeof e.workflow_name === "string"
        ? e.workflow_name.replace(/[\x00-\x1f\x7f-\x9f\u2028\u2029]/g, "").slice(0, 200)
        : "",
    l = e.session_origin === void 0 ? void 0 : e.session_origin === "review" ? "review" : "other";
  return {
    ok: !0,
    pointer: {
      workflowName: u,
      filestorePath: filestore_path,
      artifactSha256: artifact_sha256,
      bundleSizeBytes: bundle_size_bytes,
      sessionOrigin: l,
    },
  };
}
//@ chunk-n2x174m4.js:1805-1917 placement
function digestMatches(e, t) {
  let digest = createHash("sha256").update(e).digest(),
    buffer = Buffer.from(t, "hex");
  return buffer.length === digest.length && timingSafeEqual(digest, buffer);
}
//@ chunk-n2x174m4.js:1917-1925 placement
var C = 1;
/**
 * 解析工作流包帧
 */
//@ chunk-n2x174m4.js:1925-2715 placement
function parseWorkflowBundle(e) {
  let t = (l) => ({ ok: !1, error: l });
  if (e.length < 1) return t("bundle is empty");
  if (e[0] !== C) return t(`unsupported bundle format version ${e[0]} (expected ${C})`);
  let r = 1,
    n = (l, d) => {
      if (r + 8 > e.length) return { ok: !1, error: `bundle truncated in ${d} length frame` };
      let bigUInt64BE = e.readBigUInt64BE(r);
      if (((r += 8), bigUInt64BE > BigInt(l))) return { ok: !1, error: `${d} frame exceeds ${l} bytes` };
      let h = Number(bigUInt64BE);
      if (r + h > e.length) return { ok: !1, error: `bundle truncated in ${d} frame` };
      let chunk = e.subarray(r, r + h);
      return ((r += h), { ok: !0, buf: chunk });
    },
    s = n(aar, "script");
  if (!s.ok) return t(s.error);
  if (s.buf.length === 0) return t("script frame is empty");
  let u = n(O, "args_json");
  if (!u.ok) return t(u.error);
  if (r !== e.length) return t(`bundle has ${e.length - r} trailing bytes`);
  return { ok: !0, script: s.buf.toString("utf8"), argsJson: u.buf.toString("utf8") };
}
//@ chunk-n2x174m4.js:2715-2793 placement
function createWorkflowLaunchState(e = null) {
  return { ledger: new Map(), firstLaunch: null, restoredRecord: e };
}
/**
 * 工作流启动记录 schema
 */
//@ chunk-n2x174m4.js:2793-2988 placement
var launchRecordSchema = 2,
  ne = DoctorLazy(() =>
    kt({
      event_uuid: o().refine((e) => Vt(e) !== null),
      dispatched_epoch: E().int().min(0).max(Number.MAX_SAFE_INTEGER),
      attempts: E().int().min(1).max(Number.MAX_SAFE_INTEGER),
      settled: M(),
    }),
  );
//@ chunk-n2x174m4.js:2988-3378 placement
function readWorkflowLaunchRecord(e) {
  let safeParse = ne().safeParse(e);
  if (!safeParse.success) return null;
  let r = validateLaunchEvent(safeParse.data);
  if (!r.ok) return null;
  return {
    event_uuid: safeParse.data.event_uuid,
    filestore_path: r.pointer.filestorePath,
    artifact_sha256: r.pointer.artifactSha256,
    bundle_size_bytes: r.pointer.bundleSizeBytes,
    workflow_name: r.pointer.workflowName,
    dispatched_epoch: safeParse.data.dispatched_epoch,
    attempts: safeParse.data.attempts,
    settled: safeParse.data.settled,
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
    return (this.slots.delete(e), t);
  }
}
//@ chunk-n2x174m4.js:3494-3527 placement
var workflowLaunchHandoffs = new HostScoped(() => new WorkflowLaunchHandoffs()),
  oe = 5000;
//@ chunk-n2x174m4.js:3527-3652 placement
async function flushLaunchRecord(e) {
  return (
    (await withDeadline(
      Promise.resolve()
        .then(() => e.flushRecord())
        .catch(() => !1),
      e.recordFlushBoundMs ?? oe,
    )) === !0
  );
}
//@ chunk-n2x174m4.js:3652-3678 placement
var se = [1000, 3000],
  ie = 1e4;
/**
 * 发出 workflow_launch_result 事件
 */
//@ chunk-n2x174m4.js:3678-3912 placement
function postLaunchResultEvent(e, t, r) {
  let n = {
    type: "system",
    subtype: WORKFLOW_LAUNCH_RESULT,
    artifact_line: t,
    uuid: randomUUID(),
    session_id: e.getSessionId(),
  };
  if (r.launchUuid !== void 0) n.launch_uuid = r.launchUuid;
  if (r.artifactSha256 !== void 0) n.artifact_sha256 = r.artifactSha256;
  e.postEvent(n);
}
//@ chunk-n2x174m4.js:3912-4045 placement
function reportLaunchFailure(e, t, r, n) {
  (postLaunchResultEvent(e, oin(t, r), n),
    logForDiagnosticsNoPII("warn", "workflow_launch_failed", { layer: t }),
    logEvent("tengu_workflow_launch_event", { ok: !1, layer: fromEnum(t) }));
}
//@ chunk-n2x174m4.js:4045-4105 placement
function D(e, t, r, n) {
  (reportLaunchFailure(e, t, r, n), logFeatureBad("workflow_event_launch", t));
}
//@ chunk-n2x174m4.js:4105-4215 placement
function settleLaunchFailedFinal(e, t, r, n, s) {
  (D(e, r, n, s), e.state.ledger.set(t, { eventUuid: t, outcome: "failed-final" }), e.ackProcessed(t));
}
/**
 * 启动失败定案
 */
//@ chunk-n2x174m4.js:4215-4396 placement
async function settleLaunchFailed(e, t, r, n, s) {
  let event_uuid = t.event_uuid;
  (e.state.ledger.set(event_uuid, { eventUuid: event_uuid, outcome: "failed-final" }),
    e.persistRecord({ ...t, settled: !0 }),
    await flushLaunchRecord(e),
    D(e, r, n, s),
    e.ackProcessed(event_uuid));
}
/**
 * 下载、校验并启动工作流包
 */
//@ chunk-n2x174m4.js:4396-6626 placement
async function attemptWorkflowLaunch(e, t, r, n, s) {
  let { ledger: ledger } = e.state,
    eventUuid = t.eventUuid,
    d = (s?.attempts ?? 0) + 1,
    L = (_) => ({
      event_uuid: eventUuid,
      filestore_path: r.filestorePath,
      artifact_sha256: r.artifactSha256,
      bundle_size_bytes: r.bundleSizeBytes,
      workflow_name: r.workflowName,
      dispatched_epoch: e.getWorkerEpoch() ?? 0,
      attempts: d,
      settled: _,
    }),
    h = () => {
      if (e.state.firstLaunch === t) e.state.firstLaunch = null;
    },
    w = async (_, F) => {
      if ((h(), s)) {
        await settleLaunchFailed(e, s, _, F, n);
        return;
      }
      settleLaunchFailedFinal(e, eventUuid, _, F, n);
    },
    now = Date.now(),
    R = e.fetchRetryWindowMs ?? ie,
    bundle = await e.fetchBundle(r.filestorePath),
    P = 1;
  for (let _ of e.fetchRetryDelaysMs ?? se) {
    if (bundle.ok || bundle.gated || Date.now() - now + _ >= R) break;
    (P++,
      logForDiagnosticsNoPII("warn", "workflow_launch_bundle_fetch_retry", { attempt: P }),
      await sleep(_),
      (bundle = await e.fetchBundle(r.filestorePath)));
  }
  if (!bundle.ok) {
    if (bundle.gated) {
      await w("bundle-fetch", `bundle fetch gated: ${bundle.error}`);
      return;
    }
    if ((ledger.delete(eventUuid), h(), s)) {
      (logForDiagnosticsNoPII("warn", "workflow_launch_rescue_fetch_failed", {}),
        logFeatureSad("workflow_event_launch", "rescue_fetch_transient"));
      return;
    }
    (reportLaunchFailure(e, "bundle-fetch", `bundle fetch failed: ${bundle.error}`, n),
      logFeatureSad("workflow_event_launch", "bundle_fetch_transient"));
    return;
  }
  let buf = bundle.buf;
  if (buf.byteLength > O || buf.byteLength !== r.bundleSizeBytes) {
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
  let v = parseWorkflowBundle(buf);
  if (!v.ok) {
    await w("launch-payload", v.error);
    return;
  }
  let A;
  if (v.argsJson !== "")
    try {
      A = JSON.parse(v.argsJson);
    } catch (error) {
      await w(
        "args-parse",
        `args_json is not valid JSON: ${error instanceof Error ? error.message : String(error)}`,
      );
      return;
    }
  ((e.state.firstLaunch = t), e.persistRecord(L(!1)));
  let G = await flushLaunchRecord(e);
  if (s && !G) {
    (ledger.delete(eventUuid),
      h(),
      logForDiagnosticsNoPII("warn", "workflow_launch_rescue_uncounted", {}),
      logFeatureSad("workflow_event_launch", "rescue_record_unconfirmed"));
    return;
  }
  let N = randomUUID();
  (workflowLaunchHandoffs.of(e.host).stash(N, {
    script: v.script,
    args: A,
    eventSessionOrigin: r.sessionOrigin,
    postResultLine: (_) => postLaunchResultEvent(e, _, n),
    onRunSettled: async (_) => {
      if (
        ((t.outcome = _ ? "executed" : "run-failed"), e.persistRecord(L(!0)), !(await flushLaunchRecord(e)))
      )
        e.persistRecord(L(!0));
    },
  }),
    e.prependUserMessage(`/workflow-launch-exec ${N}`),
    e.ackProcessed(eventUuid),
    logEvent("tengu_workflow_launch_event", { ok: !0, attempt: d }),
    logFeatureOk("workflow_event_launch"),
    logForDiagnosticsNoPII("info", "workflow_launch_dispatched", { attempt: d }));
}
/**
 * 重试用尽定案
 */
//@ chunk-n2x174m4.js:6626-6928 placement
function settleAttemptsSpent(e, t) {
  let r = { eventUuid: t.event_uuid, outcome: "failed-final" };
  (e.state.ledger.set(t.event_uuid, r),
    (e.state.firstLaunch ??= r),
    e.persistRecord({ ...t, settled: !0 }),
    e.ackProcessed(t.event_uuid),
    logForDiagnosticsNoPII("warn", "workflow_launch_attempts_spent", { attempts: t.attempts }),
    logFeatureSad("workflow_event_launch", "attempts_spent"));
}
//@ chunk-n2x174m4.js:6928-8171 placement
async function handleWorkflowLaunchEvent(e, t) {
  let r = typeof e.uuid === "string" ? e.uuid : void 0;
  if (!r) {
    D(t, "launch-payload", "event has no uuid", {});
    return;
  }
  let { ledger: ledger } = t.state,
    s = ledger.get(r);
  if (s) {
    if (s.outcome !== "pending") t.ackProcessed(r);
    return;
  }
  if (!t.isRemoteTransport() || !env.CLAUDE_CODE_REMOTE || !env.CLAUDE_CODE_REMOTE_SESSION_ID) {
    D(t, "not-remote-session", "workflow_launch received outside a remote (CCR) session", { launchUuid: r });
    return;
  }
  let u = validateLaunchEvent(e);
  if (!u.ok) {
    settleLaunchFailedFinal(t, r, "launch-payload", u.error, { launchUuid: r });
    return;
  }
  let pointer = u.pointer,
    d = { launchUuid: r, artifactSha256: pointer.artifactSha256 },
    restoredRecord = t.state.restoredRecord,
    h = restoredRecord && restoredRecord.event_uuid === r ? restoredRecord : null;
  if (h) {
    if (h.settled) {
      let k = { eventUuid: r, outcome: "executed" };
      (ledger.set(r, k),
        (t.state.firstLaunch ??= k),
        t.ackProcessed(r),
        logForDiagnosticsNoPII("info", "workflow_launch_redelivery_settled", {}));
      return;
    }
    if (h.attempts >= launchRecordSchema) {
      settleAttemptsSpent(t, h);
      return;
    }
  }
  let w = workflowPolicyRefusal({ serverAuthoredCarrier: !0, eventSessionOrigin: pointer.sessionOrigin });
  if (w) {
    if (h) {
      await settleLaunchFailed(t, h, "policy-gate", w, d);
      return;
    }
    settleLaunchFailedFinal(t, r, "policy-gate", w, d);
    return;
  }
  let { firstLaunch: firstLaunch } = t.state;
  if (firstLaunch && firstLaunch.eventUuid !== r) {
    settleLaunchFailedFinal(
      t,
      r,
      "launch-protocol",
      "a second distinct workflow_launch event arrived in this session; at most one launch per session is permitted",
      d,
    );
    return;
  }
  let R = { eventUuid: r, outcome: "pending" };
  (ledger.set(r, R), (t.state.firstLaunch = R), await attemptWorkflowLaunch(t, R, pointer, d, h));
}
/**
 * 恢复工作流启动：校验事件、下载与校验包、启动并记录结果，失败重试有上限。
 */
//@ chunk-n2x174m4.js:8171-9487 placement
async function resumeWorkflowLaunch(e) {
  let restoredRecord = e.state.restoredRecord;
  if (!restoredRecord) return;
  if (!e.isRemoteTransport() || !env.CLAUDE_CODE_REMOTE || !env.CLAUDE_CODE_REMOTE_SESSION_ID) return;
  if (restoredRecord.settled) {
    logForDiagnosticsNoPII("info", "workflow_launch_resume_skipped", { reason: "settled" });
    return;
  }
  let workerEpoch = e.getWorkerEpoch();
  if (workerEpoch === void 0 || restoredRecord.dispatched_epoch >= workerEpoch) {
    logForDiagnosticsNoPII("info", "workflow_launch_resume_skipped", { reason: "not_a_later_epoch" });
    return;
  }
  let dispatchedDigest = e.getDispatchedDigest();
  if (
    dispatchedDigest === void 0 ||
    !/^[0-9a-f]{64}$/.test(dispatchedDigest) ||
    dispatchedDigest !== restoredRecord.artifact_sha256
  ) {
    logForDiagnosticsNoPII("info", "workflow_launch_resume_skipped", {
      reason: dispatchedDigest === void 0 ? "no_server_digest" : "digest_differs",
    });
    return;
  }
  let { ledger: ledger } = e.state;
  if (ledger.has(restoredRecord.event_uuid) || e.state.firstLaunch) return;
  if (restoredRecord.attempts >= launchRecordSchema) {
    settleAttemptsSpent(e, restoredRecord);
    return;
  }
  let u = { launchUuid: restoredRecord.event_uuid, artifactSha256: restoredRecord.artifact_sha256 },
    l = workflowPolicyRefusal({ serverAuthoredCarrier: !0 });
  if (l) {
    if (
      !e.isAccountLaunchedReview() &&
      isReviewSession() &&
      workflowPolicyRefusal({ serverAuthoredCarrier: !0, eventSessionOrigin: "review" }) === null
    ) {
      logForDiagnosticsNoPII("info", "workflow_launch_resume_skipped", { reason: "needs_event_origin" });
      return;
    }
    await settleLaunchFailed(e, restoredRecord, "policy-gate", l, u);
    return;
  }
  let d = { eventUuid: restoredRecord.event_uuid, outcome: "pending" };
  (ledger.set(restoredRecord.event_uuid, d),
    (e.state.firstLaunch = d),
    logForDiagnosticsNoPII("info", "workflow_launch_resuming", { attempt: restoredRecord.attempts + 1 }),
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
    ));
}

export { workflowLaunchHandoffs };
