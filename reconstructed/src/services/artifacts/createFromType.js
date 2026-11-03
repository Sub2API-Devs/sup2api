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
import {
  isRemoteEnvironmentAny,
  isRemoteManagedEnvironment,
  isSelfHostedRemoteEnvironment,
  isByocEnvironment,
} from "../../utils/remoteEnvironment.js";
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
import { looseObject, string, unknown, u } from "../../../vendor/zod/v4/classic/schemas.js";
import { ARTIFACT_SLUG_RE } from "../../tools/ArtifactTool/constants.js";
import { lit } from "../analytics/safeMetadata.js";
import { logFeatureBad, logFeatureSad, logFeatureOk } from "../analytics/featureTelemetry.js";
import { CREATE_CONFIRMED_QUERY, requestIdMeta, buildFrameHeaders } from "./frameApi.js";
import {
  getSessionHintHeaders,
  findRejectedHintFields,
  mentionsSessionHintField,
  noteSessionHintsRefused,
  stripSessionHints,
} from "./requestMeta.js";
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
/**
 * 导出函数 `artifactTypesEnabled`：返回 env.CLAUDE_CODE_ARTIFACT_TYPES ?? getFeatureValue_CACHED_MAY_BE_STALE(TENGU_COBALT_PLINTH_LARCH, !0)。
 */
function artifactTypesEnabled() {
  return (
    env.CLAUDE_CODE_ARTIFACT_TYPES ?? getFeatureValue_CACHED_MAY_BE_STALE(TENGU_COBALT_PLINTH_LARCH, true)
  );
}
//@ chunk-w08rdxhd.js:17659-17731 placement
function isTypeCloudCreateEnabled() {
  return (
    env.CLAUDE_CODE_ARTIFACT_TYPE_CLOUD_CREATE ??
    getFeatureValue_CACHED_MAY_BE_STALE(TENGU_COBALT_PLINTH_LARCH, false)
  );
}
//@ chunk-w08rdxhd.js:17731-17767 placement
var TENGU_COBALT_PLINTH_LINDEN = "tengu_cobalt_plinth_linden";
//@ chunk-w08rdxhd.js:17767-17810 placement
function canCreateFromTypeInCloud() {
  return (
    isRemoteEnvironmentAny() &&
    getFeatureValue_CACHED_MAY_BE_STALE(TENGU_COBALT_PLINTH_LINDEN, false) &&
    accountlessAgentSession()
  );
}
//@ chunk-w08rdxhd.js:17810-17923 placement
/**
 * 判断当前环境能否从类型创建 artifact：本地总是可以；远程时需满足相应的中继/开关条件。
 */
function canCreateFromType() {
  if (!env.CLAUDE_CODE_REMOTE) return true;
  return (
    (isRemoteManagedEnvironment() && isTypeCloudCreateEnabled()) ||
    (isSelfHostedRemoteEnvironment() &&
      isTypeCloudCreateEnabled() &&
      getFeatureValue_CACHED_MAY_BE_STALE(RUNNER_RELAY_FLAG, false) &&
      frameVerbRelayActive(TYPE_CREATE_RELAY_FAMILY) &&
      isUserSessionWorker()) ||
    canCreateFromTypeInCloud()
  );
}
//@ chunk-w08rdxhd.js:17923-18241 placement
var CREATE_FROM_TYPE_UNAVAILABLE =
  "Starting a new Artifact from a type isn't available in this cloud session right now, so nothing was created; do not retry here. If the type fits, tell the user its link so they can start it where creating is available, and offer to make it here another way instead \u2014 a skill or a file is fine for that.";
//@ chunk-w08rdxhd.js:18241-18285 placement
/**
 * 导出函数 `isRelayUnavailableForTypeCreate`：返回 uC() && !frameVerbRelayActive(TYPE_CREATE_RELAY_FAMILY) && !ce()。
 */
function isRelayUnavailableForTypeCreate() {
  return (
    isRemoteEnvironmentAny() && !frameVerbRelayActive(TYPE_CREATE_RELAY_FAMILY) && !canCreateFromTypeInCloud()
  );
}
//@ chunk-w08rdxhd.js:18285-18363 placement
var RELAY_UNAVAILABLE_CREATE_RESULT = {
  ok: false,
  reason: "relay-unavailable",
  status: 0,
  route: "relay",
  fromFrame: false,
};
//@ chunk-w08rdxhd.js:18363-18435 placement
function createFromTypePath(e) {
  return `/api/frame/types/${encodeURIComponent(e)}/create`;
}
//@ chunk-w08rdxhd.js:18435-18868 placement
/**
 * 从类型创建 artifact 的响应 schema（slug、版本、标题、契约、类型/预配/重放/读取/共享信息）、外部 id 格式正则，以及存储目标（store/project_id/file_id/node_id）schema。
 */
var MAX_CREATE_RESPONSE_BYTES = 1048576;
var CREATE_RESPONSE_SCHEMA = DoctorLazy(() =>
  looseObject({
    slug: string().regex(ARTIFACT_SLUG_RE),
    version: string().min(1).max(64),
    title: string().max(2048).optional(),
    favicon: string().max(256).optional(),
    contract: string().max(64).optional(),
    type: unknown().optional(),
    provisioned: unknown().optional(),
    replayed: unknown().optional(),
    read: unknown().optional(),
    shared: unknown().optional(),
  }),
);
var EXTERNAL_ID_RE = /^[A-Za-z0-9_.:-]{1,128}$/;
var STORE_TARGET_SCHEMA = DoctorLazy(() =>
  u({
    store: string().min(1).max(32),
    project_id: string().regex(ARTIFACT_SLUG_RE),
    file_id: unknown().optional(),
    node_id: unknown().optional(),
  }),
);
//@ chunk-w08rdxhd.js:18868-19153 placement
/**
 * 校验并解析创建结果里的存储目标，project_id 必须与给定 slug 一致；file_id/node_id 只接受安全格式。
 */
function parseStoreTarget(provisioned, slug) {
  let s = STORE_TARGET_SCHEMA().safeParse(provisioned);
  if (!s.success || s.data.project_id !== slug) return;
  let n = (h) => (typeof h === "string" && EXTERNAL_ID_RE.test(h) ? h : undefined);
  let a = n(s.data.file_id);
  let l = n(s.data.node_id);
  return {
    store: s.data.store,
    projectId: s.data.project_id,
    ...(a !== undefined && {
      fileId: a,
    }),
    ...(l !== undefined && {
      nodeId: l,
    }),
  };
}
//@ chunk-w08rdxhd.js:19153-19452 placement
/**
 * 创建结果不确定时的提示（先 list 再决定是否重建），以及可重试的服务端失败消息集合。
 */
var CREATE_OUTCOME_UNKNOWN =
  'the Artifact may or may not have been created: check with action "list" before creating again';
var RETRYABLE_CREATE_ERRORS = new Set([
  "copy timed out \u2014 retry",
  "content read failed \u2014 retry",
  "content write failed \u2014 retry",
  "provisioning unavailable \u2014 retry",
  "provisioning refused \u2014 retry later",
]);
//@ chunk-w08rdxhd.js:19452-19521 placement
function isRetryableCreateFailure(status, r) {
  return status < 500 || (typeof r === "string" && RETRYABLE_CREATE_ERRORS.has(r.trim()));
}
//@ chunk-w08rdxhd.js:19521-19828 placement
/**
 * 从类型创建的常量：暂时不可用的重试提示、重试次数、拒绝响应头名、创建进行中错误码、类型未找到提示。
 */
var CREATE_UNAVAILABLE_RETRY = "temporarily unavailable \u2014 retry with the same idempotency_key";
var CREATE_MAX_ATTEMPTS = 3;
var X_FRAME_REFUSAL = "x-frame-refusal";
var CREATE_IN_FLIGHT = "create_in_flight";
var TYPE_NOT_FOUND_MESSAGE =
  "Artifact type not found \u2014 check the link, and that this account can open the type in a browser (creating Artifacts from types may also not be available to this account yet)";
//@ chunk-w08rdxhd.js:19828-24596 placement
/**
 * 用 Artifact 类型新建 Artifact（POST /api/frame/types/{slug}/create）：直连或经中继、幂等重试，处理 cloud_unavailable/invalid_slug 等。
 */
async function createArtifactFromType(typeSlug, r) {
  let s = "direct";
  let n = 0;
  let a = canCreateFromTypeInCloud();
  let l = () => ({
    route: s === "relay" ? lit("relay") : lit("direct"),
    ...(n > 0 && {
      n_frame_retry_waits: n,
    }),
    ...(a && {
      agent: true,
    }),
    ...(isByocEnvironment() && {
      runner: true,
    }),
  });
  let h = (P, message, status) => {
    logFeatureBad("artifact_create_from_type", P, {
      ...l(),
      ...(status !== undefined && {
        status,
      }),
    });
    return {
      kind: "error",
      message,
      reason: P,
    };
  };
  let S = 0;
  let x = (P, status) => {
    logFeatureBad("artifact_create_from_type", P, {
      ...l(),
      ...(status !== undefined && {
        status,
      }),
    });
    return {
      kind: "error",
      message: CREATE_FROM_TYPE_UNAVAILABLE,
      reason: "cloud_unavailable",
      ...(S > 1 && {
        afterRetry: true,
      }),
    };
  };
  if (!ARTIFACT_SLUG_RE.test(typeSlug)) return h("invalid_slug", "type_url does not name an Artifact");
  let w = [
    ...(r.idempotencyKey !== undefined ? [`idempotency_key=${encodeURIComponent(r.idempotencyKey)}`] : []),
    ...(r.createConfirmed === true ? [CREATE_CONFIRMED_QUERY] : []),
  ];
  let k = `${createFromTypePath(typeSlug)}${w.length === 0 ? "" : `?${w.join("&")}`}`;
  let I = {
    target_type_version: null,
    ...(r.title !== undefined &&
      r.title !== "" && {
        title: r.title,
      }),
    ...getSessionHintHeaders(),
    ...requestIdMeta(r.requestId),
  };
  let R = {
    refreshOAuth: true,
    headers: buildFrameHeaders(),
    timeout: 60000,
    maxContentLength: MAX_CREATE_RESPONSE_BYTES,
    signal: r.signal,
    credentials: r.credentials,
  };
  let L = () => {
    S++;
    if (a) return frameApi.post(k, I, R);
    if (isRelayUnavailableForTypeCreate()) return Promise.resolve(RELAY_UNAVAILABLE_CREATE_RESULT);
    return isByocEnvironment() ? frameApi.postRelayStrict(k, I, R) : frameApi.postRelayOnly(k, I, R);
  };
  let y = async (P) => {
    s = P.route;
    let j = P.ok && P.fromFrame ? findRejectedHintFields(P.status, P.data, I) : [];
    if (j.length === 0) return P;
    if (j.includes("request_id")) logFeatureSad("artifact_create_from_type", "request_id_rejected", l());
    if (mentionsSessionHintField(j)) {
      logFeatureSad("artifact_create_from_type", "session_hints_rejected", l());
      noteSessionHintsRefused();
    }
    I = stripSessionHints(I);
    return L();
  };
  let d;
  let z = false;
  let C = false;
  try {
    d = await y(await L());
    s = d.route;
    if (d.ok && d.gatewayRetryAfterMs !== undefined) {
      S--;
      await sleep(Math.min(d.gatewayRetryAfterMs, RELAY_ONLY_BUSY_WAIT_MAX_MS), r.signal, {
        throwOnAbort: true,
      });
      d = await y(await L());
      s = d.route;
    }
    let P = false;
    while (n < CREATE_MAX_ATTEMPTS) {
      let j = d.ok && d.fromFrame ? d.response?.headers?.["retry-after"] : undefined;
      if (!d.ok || typeof j !== "string") break;
      let W = d.status === 409 || d.status === 429;
      let Ee =
        d.status === 503 &&
        r.idempotencyKey !== undefined &&
        typeof d.data === "string" &&
        d.data.trim() === CREATE_UNAVAILABLE_RETRY;
      if (!Ee && (!W || P)) break;
      P ||= W;
      z ||= d.status === 409;
      C ||= Ee;
      await sleep(Math.min(parseRetryAfterMs(j) ?? 1000, 1e4), r.signal, {
        throwOnAbort: true,
      });
      n++;
      d = await y(await L());
      s = d.route;
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
  if (d.gatewayRetryAfterMs !== undefined && !z && !C) {
    S--;
    return x("relay_busy", d.status);
  }
  if (d.gatewayPolicy !== undefined)
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
      !C && isRetryableCreateFailure(d.status, d.data)
        ? `create ${d.status}: ${errBody(d.data)} (nothing was created)`
        : `create ${d.status}: ${errBody(d.data)} \u2014 ${CREATE_OUTCOME_UNKNOWN}`,
      d.status,
    );
  }
  let N = CREATE_RESPONSE_SCHEMA().safeParse(d.data);
  if (!N.success)
    return h(
      "malformed_echo",
      'the Artifact was created but the server reply was unreadable \u2014 use action "list" to find it rather than creating again',
      200,
    );
  let O = N.data;
  let Y = typeLockFromWire(O.type);
  if (Y === undefined)
    return h(
      "malformed_echo",
      'the Artifact was created but the server reply was unreadable \u2014 use action "list" to find it rather than creating again',
      200,
    );
  let X = splitManifestPaths(d.data);
  let Z = X ?? {
    own: [],
    type: [],
  };
  let storeTarget = parseStoreTarget(O.provisioned, O.slug);
  let Te = O.replayed === true;
  let Q = echoAudience(O.read, O.shared);
  logFeatureOk("artifact_create_from_type", {
    provisioned: storeTarget !== undefined,
    already_created: Te,
    keyed: r.idempotencyKey !== undefined,
    ...l(),
    n_own_files: Z.own.length,
    n_type_files: Z.type.length,
    titled: r.title !== undefined && r.title !== "",
  });
  return {
    kind: "created",
    created: {
      slug: O.slug,
      version: O.version,
      url: artifactViewerUrl(O.slug),
      ...(O.title !== undefined && {
        title: O.title,
      }),
      ...(O.favicon !== undefined && {
        favicon: O.favicon,
      }),
      storedContract: parseContractVersion(O.contract),
      typeLock: Y,
      ownFiles: Z.own,
      typeFiles: Z.type,
      ...(storeTarget !== undefined && {
        provisioned: storeTarget,
      }),
      ...(Te && {
        alreadyCreated: true,
      }),
      ...(Q.read !== undefined && {
        read: Q.read,
      }),
      ...(Q.shared !== undefined && {
        shared: Q.shared,
      }),
      ...(X === undefined && {
        manifestUnread: true,
      }),
    },
  };
}
//@ chunk-w08rdxhd.js:24596-24629 placement
function hasDbCapability(capabilities) {
  return hasKey(capabilities, "db");
}
//@ chunk-w08rdxhd.js:24629-24669 placement
function hasEndpointsCapability(capabilities) {
  return hasKey(capabilities, "endpoints");
}
//@ chunk-w08rdxhd.js:24669-24731 placement
function hasKey(e, r) {
  return typeof e === "object" && e !== null && r in e;
}
export {
  artifactTypesEnabled,
  isRelayUnavailableForTypeCreate,
  CREATE_FROM_TYPE_UNAVAILABLE,
  createArtifactFromType,
  parseStoreTarget,
  canCreateFromType,
  hasDbCapability,
  hasEndpointsCapability,
  TENGU_COBALT_PLINTH_LARCH,
};
