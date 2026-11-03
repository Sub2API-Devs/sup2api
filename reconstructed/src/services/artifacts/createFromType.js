/**
 * services/artifacts/createFromType.ts
 *
 * 2.1.316 新增：按 Artifact 类型新建 Artifact（直连或经中继，幂等重试）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-w08rdxhd.js (19)
 * attribution: placement 19
 */
import { env } from "../../utils/env.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../analytics/growthbook.js";
import { uC, mn, isSelfHostedRemoteEnvironment, op } from "../../utils/remoteEnvironment.js";
import {
  accountlessAgentSession,
  RUNNER_RELAY_FLAG,
  frameVerbRelayActive,
  TYPE_CREATE_RELAY_FAMILY,
  frameApi,
  threwOnRelayLeg,
  CCR_CREDENTIAL_REFUSED_PREFIX,
} from "./frameRelay.js";
import { isUserSessionWorker } from "../ccrAgentProxy/agentProxy.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { kt, o, oe, u } from "../../../vendor/zod/v4/classic/schemas.js";
import { ARTIFACT_SLUG_RE } from "../../tools/ArtifactTool/constants.js";
import { lit } from "../analytics/safeMetadata.js";
import { logFeatureBad, logFeatureSad, logFeatureOk } from "../analytics/featureTelemetry.js";
import { CREATE_CONFIRMED_QUERY, Kxe, buildFrameHeaders } from "./frameApi.js";
import { getSessionHintHeaders, findRejectedHintFields, yun, q5n, iKs } from "./requestMeta.js";
import { sleep } from "../../utils/sleep.js";
import { RELAY_ONLY_BUSY_WAIT_MAX_MS } from "./publishArtifact.js";
import { parseRetryAfterMs } from "../../bridge/debugUtils.js";
import { isCancel } from "../../../vendor/axios/dist/esm/axios.js";
import { isMaxContentLengthError } from "../../utils/errors.js";
import { describeArtifactAuthFailure } from "./frameFlags.js";
import { denyPolicyBody, errBody } from "./publishErrors.js";
import { scrubServerLine } from "../../tools/ArtifactTool/artifactUrls.js";
import { typeLockFromWire, splitManifestPaths } from "./pagePreparation.js";
import { echoAudience } from "./listArtifacts.js";
import { artifactViewerUrl } from "./publishInstanceFiles.js";
import { parseContractVersion } from "./capabilityDeclaration.js";

//@ chunk-w08rdxhd.js:17563-17598 placement
var TENGU_COBALT_PLINTH_LARCH = "tengu_cobalt_plinth_larch";
//@ chunk-w08rdxhd.js:17598-17659 placement
function B_t() {
  return env.CLAUDE_CODE_ARTIFACT_TYPES ?? getFeatureValue_CACHED_MAY_BE_STALE(TENGU_COBALT_PLINTH_LARCH, !0);
}
//@ chunk-w08rdxhd.js:17659-17731 placement
function ve() {
  return (
    env.CLAUDE_CODE_ARTIFACT_TYPE_CLOUD_CREATE ??
    getFeatureValue_CACHED_MAY_BE_STALE(TENGU_COBALT_PLINTH_LARCH, !1)
  );
}
//@ chunk-w08rdxhd.js:17731-17767 placement
var TENGU_COBALT_PLINTH_LINDEN = "tengu_cobalt_plinth_linden";
//@ chunk-w08rdxhd.js:17767-17810 placement
function ce() {
  return (
    uC() && getFeatureValue_CACHED_MAY_BE_STALE(TENGU_COBALT_PLINTH_LINDEN, !1) && accountlessAgentSession()
  );
}
/**
 * 判断当前环境能否从类型创建 artifact：本地总是可以；远程时需满足相应的中继/开关条件。
 */
//@ chunk-w08rdxhd.js:17810-17923 placement
function canCreateFromType() {
  if (!env.CLAUDE_CODE_REMOTE) return !0;
  return (
    (mn() && ve()) ||
    (isSelfHostedRemoteEnvironment() &&
      ve() &&
      getFeatureValue_CACHED_MAY_BE_STALE(RUNNER_RELAY_FLAG, !1) &&
      frameVerbRelayActive(TYPE_CREATE_RELAY_FAMILY) &&
      isUserSessionWorker()) ||
    ce()
  );
}
//@ chunk-w08rdxhd.js:17923-18241 placement
var CREATE_FROM_TYPE_UNAVAILABLE =
  "Starting a new Artifact from a type isn't available in this cloud session right now, so nothing was created; do not retry here. If the type fits, tell the user its link so they can start it where creating is available, and offer to make it here another way instead \u2014 a skill or a file is fine for that.";
//@ chunk-w08rdxhd.js:18241-18285 placement
function RLo() {
  return uC() && !frameVerbRelayActive(TYPE_CREATE_RELAY_FAMILY) && !ce();
}
//@ chunk-w08rdxhd.js:18285-18363 placement
var ct = { ok: !1, reason: "relay-unavailable", status: 0, route: "relay", fromFrame: !1 };
//@ chunk-w08rdxhd.js:18363-18435 placement
function ut(e) {
  return `/api/frame/types/${encodeURIComponent(e)}/create`;
}
/**
 * 从类型创建 artifact 的响应 schema（slug、版本、标题、契约、类型/预配/重放/读取/共享信息）、外部 id 格式正则，以及存储目标（store/project_id/file_id/node_id）schema。
 */
//@ chunk-w08rdxhd.js:18435-18868 placement
var MAX_CREATE_RESPONSE_BYTES = 1048576,
  CREATE_RESPONSE_SCHEMA = DoctorLazy(() =>
    kt({
      slug: o().regex(ARTIFACT_SLUG_RE),
      version: o().min(1).max(64),
      title: o().max(2048).optional(),
      favicon: o().max(256).optional(),
      contract: o().max(64).optional(),
      type: oe().optional(),
      provisioned: oe().optional(),
      replayed: oe().optional(),
      read: oe().optional(),
      shared: oe().optional(),
    }),
  ),
  EXTERNAL_ID_RE = /^[A-Za-z0-9_.:-]{1,128}$/,
  STORE_TARGET_SCHEMA = DoctorLazy(() =>
    u({
      store: o().min(1).max(32),
      project_id: o().regex(ARTIFACT_SLUG_RE),
      file_id: oe().optional(),
      node_id: oe().optional(),
    }),
  );
/**
 * 校验并解析创建结果里的存储目标，project_id 必须与给定 slug 一致；file_id/node_id 只接受安全格式。
 */
//@ chunk-w08rdxhd.js:18868-19153 placement
function parseStoreTarget(e, r) {
  let safeParse = STORE_TARGET_SCHEMA().safeParse(e);
  if (!safeParse.success || safeParse.data.project_id !== r) return;
  let n = (h) => (typeof h === "string" && EXTERNAL_ID_RE.test(h) ? h : void 0),
    a = n(safeParse.data.file_id),
    l = n(safeParse.data.node_id);
  return {
    store: safeParse.data.store,
    projectId: safeParse.data.project_id,
    ...(a !== void 0 && { fileId: a }),
    ...(l !== void 0 && { nodeId: l }),
  };
}
/**
 * 创建结果不确定时的提示（先 list 再决定是否重建），以及可重试的服务端失败消息集合。
 */
//@ chunk-w08rdxhd.js:19153-19452 placement
var CREATE_OUTCOME_UNKNOWN =
    'the Artifact may or may not have been created: check with action "list" before creating again',
  RETRYABLE_CREATE_ERRORS = new Set([
    "copy timed out \u2014 retry",
    "content read failed \u2014 retry",
    "content write failed \u2014 retry",
    "provisioning unavailable \u2014 retry",
    "provisioning refused \u2014 retry later",
  ]);
//@ chunk-w08rdxhd.js:19452-19521 placement
function mt(e, r) {
  return e < 500 || (typeof r === "string" && RETRYABLE_CREATE_ERRORS.has(r.trim()));
}
/**
 * 从类型创建的常量：暂时不可用的重试提示、重试次数、拒绝响应头名、创建进行中错误码、类型未找到提示。
 */
//@ chunk-w08rdxhd.js:19521-19828 placement
var CREATE_UNAVAILABLE_RETRY = "temporarily unavailable \u2014 retry with the same idempotency_key",
  CREATE_MAX_ATTEMPTS = 3,
  X_FRAME_REFUSAL = "x-frame-refusal",
  CREATE_IN_FLIGHT = "create_in_flight",
  TYPE_NOT_FOUND_MESSAGE =
    "Artifact type not found \u2014 check the link, and that this account can open the type in a browser (creating Artifacts from types may also not be available to this account yet)";
/**
 * 用 Artifact 类型新建 Artifact（POST /api/frame/types/{slug}/create）：直连或经中继、幂等重试，处理 cloud_unavailable/invalid_slug 等。
 */
//@ chunk-w08rdxhd.js:19828-24596 placement
async function createArtifactFromType(e, r) {
  let s = "direct",
    n = 0,
    a = ce(),
    l = () => ({
      route: s === "relay" ? lit("relay") : lit("direct"),
      ...(n > 0 && { n_frame_retry_waits: n }),
      ...(a && { agent: !0 }),
      ...(op() && { runner: !0 }),
    }),
    h = (P, j, W) => (
      logFeatureBad("artifact_create_from_type", P, { ...l(), ...(W !== void 0 && { status: W }) }),
      { kind: "error", message: j, reason: P }
    ),
    S = 0,
    x = (P, j) => (
      logFeatureBad("artifact_create_from_type", P, { ...l(), ...(j !== void 0 && { status: j }) }),
      {
        kind: "error",
        message: CREATE_FROM_TYPE_UNAVAILABLE,
        reason: "cloud_unavailable",
        ...(S > 1 && { afterRetry: !0 }),
      }
    );
  if (!ARTIFACT_SLUG_RE.test(e)) return h("invalid_slug", "type_url does not name an Artifact");
  let w = [
      ...(r.idempotencyKey !== void 0 ? [`idempotency_key=${encodeURIComponent(r.idempotencyKey)}`] : []),
      ...(r.createConfirmed === !0 ? [CREATE_CONFIRMED_QUERY] : []),
    ],
    k = `${ut(e)}${w.length === 0 ? "" : `?${w.join("&")}`}`,
    I = {
      target_type_version: null,
      ...(r.title !== void 0 && r.title !== "" && { title: r.title }),
      ...getSessionHintHeaders(),
      ...Kxe(r.requestId),
    },
    R = {
      refreshOAuth: !0,
      headers: buildFrameHeaders(),
      timeout: 60000,
      maxContentLength: MAX_CREATE_RESPONSE_BYTES,
      signal: r.signal,
      credentials: r.credentials,
    },
    L = () => {
      if ((S++, a)) return frameApi.post(k, I, R);
      if (RLo()) return Promise.resolve(ct);
      return op() ? frameApi.postRelayStrict(k, I, R) : frameApi.postRelayOnly(k, I, R);
    },
    y = async (P) => {
      s = P.route;
      let j = P.ok && P.fromFrame ? findRejectedHintFields(P.status, P.data, I) : [];
      if (j.length === 0) return P;
      if (j.includes("request_id")) logFeatureSad("artifact_create_from_type", "request_id_rejected", l());
      if (yun(j)) (logFeatureSad("artifact_create_from_type", "session_hints_rejected", l()), q5n());
      return ((I = iKs(I)), L());
    },
    d,
    z = !1,
    C = !1;
  try {
    if (((d = await y(await L())), (s = d.route), d.ok && d.gatewayRetryAfterMs !== void 0))
      (S--,
        await sleep(Math.min(d.gatewayRetryAfterMs, RELAY_ONLY_BUSY_WAIT_MAX_MS), r.signal, {
          throwOnAbort: !0,
        }),
        (d = await y(await L())),
        (s = d.route));
    let P = !1;
    while (n < CREATE_MAX_ATTEMPTS) {
      let j = d.ok && d.fromFrame ? d.response?.headers?.["retry-after"] : void 0;
      if (!d.ok || typeof j !== "string") break;
      let W = d.status === 409 || d.status === 429,
        Ee =
          d.status === 503 &&
          r.idempotencyKey !== void 0 &&
          typeof d.data === "string" &&
          d.data.trim() === CREATE_UNAVAILABLE_RETRY;
      if (!Ee && (!W || P)) break;
      ((P ||= W),
        (z ||= d.status === 409),
        (C ||= Ee),
        await sleep(Math.min(parseRetryAfterMs(j) ?? 1000, 1e4), r.signal, { throwOnAbort: !0 }),
        n++,
        (d = await y(await L())),
        (s = d.route));
    }
  } catch (error) {
    if (isCancel(error) || r.signal.aborted) throw error;
    let j = threwOnRelayLeg(error);
    if (j) s = "relay";
    if (isMaxContentLengthError(error))
      return h(
        "echo_too_large",
        `the server's answer was too large to read \u2014 ${CREATE_OUTCOME_UNKNOWN}`,
      );
    if (j) return h("request_error", `the cloud relay drew no answer \u2014 ${CREATE_OUTCOME_UNKNOWN}`);
    return h(
      "request_error",
      `the request failed before the server answered \u2014 ${CREATE_OUTCOME_UNKNOWN}`,
    );
  }
  if (!d.ok) {
    if (d.reason === "relay-unavailable" || d.reason === "relay-not-served")
      return x(d.reason.replace(/-/g, "_"), d.status);
    if (a && d.reason === "no-auth") return x("agent_no_credential");
    return h(
      d.reason.replace(/-/g, "_"),
      d.reason === "no-auth"
        ? describeArtifactAuthFailure(d.detail)
        : `creating Artifacts is unavailable here: ${d.reason}`,
    );
  }
  if (d.gatewayRetryAfterMs !== void 0 && !z && !C) return (S--, x("relay_busy", d.status));
  if (d.gatewayPolicy !== void 0)
    return x(d.gatewayPolicy === "unapproved" ? "relay_approval_refused" : "relay_policy_refused", d.status);
  if (!d.fromFrame && (d.status < 200 || d.status >= 300))
    return h(
      "relay_error",
      `create: the cloud relay failed (HTTP ${d.status}) \u2014 ${CREATE_OUTCOME_UNKNOWN}`,
      d.status,
    );
  if (d.status === 404) return h("not_found", TYPE_NOT_FOUND_MESSAGE, 404);
  if (d.status === 403) {
    if (typeof d.data === "string" && d.data.startsWith(CCR_CREDENTIAL_REFUSED_PREFIX))
      return x("ccr_credential_refused", 403);
    let P = denyPolicyBody(d.data);
    if (a && !P) return x("agent_credential_refused", 403);
    return h(
      P ? "denied" : "forbidden",
      `create denied: ${P ? scrubServerLine(P.error, 300) : errBody(d.data)}`,
      403,
    );
  }
  if (d.status !== 200) {
    if (
      d.status === 409 &&
      (d.response?.headers?.[X_FRAME_REFUSAL] === CREATE_IN_FLIGHT ||
        denyPolicyBody(d.data)?.reason === CREATE_IN_FLIGHT)
    )
      return h(
        "create_in_flight",
        'an earlier attempt of this call is still creating the Artifact \u2014 use action "list" to find it before creating again',
        409,
      );
    return h(
      `status_${d.status}`,
      !C && mt(d.status, d.data)
        ? `create ${d.status}: ${errBody(d.data)} (nothing was created)`
        : `create ${d.status}: ${errBody(d.data)} \u2014 ${CREATE_OUTCOME_UNKNOWN}`,
      d.status,
    );
  }
  let safeParse = CREATE_RESPONSE_SCHEMA().safeParse(d.data);
  if (!safeParse.success)
    return h(
      "malformed_echo",
      'the Artifact was created but the server reply was unreadable \u2014 use action "list" to find it rather than creating again',
      200,
    );
  let O = safeParse.data,
    Y = typeLockFromWire(O.type);
  if (Y === void 0)
    return h(
      "malformed_echo",
      'the Artifact was created but the server reply was unreadable \u2014 use action "list" to find it rather than creating again',
      200,
    );
  let X = splitManifestPaths(d.data),
    Z = X ?? { own: [], type: [] },
    ie = parseStoreTarget(O.provisioned, O.slug),
    Te = O.replayed === !0,
    Q = echoAudience(O.read, O.shared);
  return (
    logFeatureOk("artifact_create_from_type", {
      provisioned: ie !== void 0,
      already_created: Te,
      keyed: r.idempotencyKey !== void 0,
      ...l(),
      n_own_files: Z.own.length,
      n_type_files: Z.type.length,
      titled: r.title !== void 0 && r.title !== "",
    }),
    {
      kind: "created",
      created: {
        slug: O.slug,
        version: O.version,
        url: artifactViewerUrl(O.slug),
        ...(O.title !== void 0 && { title: O.title }),
        ...(O.favicon !== void 0 && { favicon: O.favicon }),
        storedContract: parseContractVersion(O.contract),
        typeLock: Y,
        ownFiles: Z.own,
        typeFiles: Z.type,
        ...(ie !== void 0 && { provisioned: ie }),
        ...(Te && { alreadyCreated: !0 }),
        ...(Q.read !== void 0 && { read: Q.read }),
        ...(Q.shared !== void 0 && { shared: Q.shared }),
        ...(X === void 0 && { manifestUnread: !0 }),
      },
    }
  );
}
//@ chunk-w08rdxhd.js:24596-24629 placement
function Tt(e) {
  return Fe(e, "db");
}
//@ chunk-w08rdxhd.js:24629-24669 placement
function Et(e) {
  return Fe(e, "endpoints");
}
//@ chunk-w08rdxhd.js:24669-24731 placement
function Fe(e, r) {
  return typeof e === "object" && e !== null && r in e;
}

export {
  B_t,
  RLo,
  CREATE_FROM_TYPE_UNAVAILABLE,
  createArtifactFromType,
  parseStoreTarget,
  canCreateFromType,
  Tt,
  Et,
  TENGU_COBALT_PLINTH_LARCH,
};
