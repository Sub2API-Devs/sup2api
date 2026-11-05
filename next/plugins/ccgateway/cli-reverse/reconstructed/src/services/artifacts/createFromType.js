/**
 * services/artifacts/createFromType.ts
 *
 * 2.1.316 新增：按 Artifact 类型新建 Artifact（直连或经中继，幂等重试）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-95pbtx8d.js (19)
 * attribution: placement 19
 */
import { env } from "../../utils/env.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../analytics/growthbook.js";
import {
  isRemoteEnvironmentAny,
  isRemoteManagedEnvironment,
  isSelfHostedByocEnvironment,
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
import { looseObject, stringSchema, unknown, objectSchema } from "../../../vendor/zod/v4/classic/schemas.js";
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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-95pbtx8d.js:17597-17632 placement
var TENGU_COBALT_PLINTH_LARCH = "tengu_cobalt_plinth_larch";
//@ chunk-95pbtx8d.js:17632-17693 placement
/**
 * 导出函数 `artifactTypesEnabled`：返回 env.CLAUDE_CODE_ARTIFACT_TYPES ?? getFeatureValue_CACHED_MAY_BE_STALE(TENGU_COBALT_PLINTH_LARCH, !0)。
 */
function artifactTypesEnabled() {
  return (
    env.CLAUDE_CODE_ARTIFACT_TYPES ?? getFeatureValue_CACHED_MAY_BE_STALE(TENGU_COBALT_PLINTH_LARCH, true)
  );
}
//@ chunk-95pbtx8d.js:17693-17765 placement
function isTypeCloudCreateEnabled() {
  return (
    env.CLAUDE_CODE_ARTIFACT_TYPE_CLOUD_CREATE ??
    getFeatureValue_CACHED_MAY_BE_STALE(TENGU_COBALT_PLINTH_LARCH, false)
  );
}
//@ chunk-95pbtx8d.js:17765-17801 placement
var TENGU_COBALT_PLINTH_LINDEN = "tengu_cobalt_plinth_linden";
//@ chunk-95pbtx8d.js:17801-17844 placement
function canCreateFromTypeInCloud() {
  return (
    isRemoteEnvironmentAny() &&
    getFeatureValue_CACHED_MAY_BE_STALE(TENGU_COBALT_PLINTH_LINDEN, false) &&
    accountlessAgentSession()
  );
}
//@ chunk-95pbtx8d.js:17844-17956 placement
/**
 * 判断当前环境能否从类型创建 artifact：本地总是可以；远程时需满足相应的中继/开关条件。
 */
function canCreateFromType() {
  if (!env.CLAUDE_CODE_REMOTE) return true;
  return (
    (isRemoteManagedEnvironment() && isTypeCloudCreateEnabled()) ||
    (isSelfHostedByocEnvironment() &&
      isTypeCloudCreateEnabled() &&
      getFeatureValue_CACHED_MAY_BE_STALE(RUNNER_RELAY_FLAG, false) &&
      frameVerbRelayActive(TYPE_CREATE_RELAY_FAMILY) &&
      isUserSessionWorker()) ||
    canCreateFromTypeInCloud()
  );
}
//@ chunk-95pbtx8d.js:17956-18274 placement
var CREATE_FROM_TYPE_UNAVAILABLE =
  "Starting a new Artifact from a type isn't available in this cloud session right now, so nothing was created; do not retry here. If the type fits, tell the user its link so they can start it where creating is available, and offer to make it here another way instead \u2014 a skill or a file is fine for that.";
//@ chunk-95pbtx8d.js:18274-18318 placement
/**
 * 导出函数 `isRelayUnavailableForTypeCreate`：返回 uC() && !frameVerbRelayActive(TYPE_CREATE_RELAY_FAMILY) && !ce()。
 */
function isRelayUnavailableForTypeCreate() {
  return (
    isRemoteEnvironmentAny() && !frameVerbRelayActive(TYPE_CREATE_RELAY_FAMILY) && !canCreateFromTypeInCloud()
  );
}
//@ chunk-95pbtx8d.js:18318-18396 placement
var RELAY_UNAVAILABLE_CREATE_RESULT = {
  ok: false,
  reason: "relay-unavailable",
  status: 0,
  route: "relay",
  fromFrame: false,
};
//@ chunk-95pbtx8d.js:18396-18468 placement
function createFromTypePath(typeSlug) {
  return `/api/frame/types/${encodeURIComponent(typeSlug)}/create`;
}
//@ chunk-95pbtx8d.js:18468-18901 placement
/**
 * 从类型创建 artifact 的响应 schema（slug、版本、标题、契约、类型/预配/重放/读取/共享信息）、外部 id 格式正则，以及存储目标（store/project_id/file_id/node_id）schema。
 */
var MAX_CREATE_RESPONSE_BYTES; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var CREATE_RESPONSE_SCHEMA;
var EXTERNAL_ID_RE;
var STORE_TARGET_SCHEMA;
deferInit("chunk-95pbtx8d.js:18468", () => {
  MAX_CREATE_RESPONSE_BYTES = 1048576;
  CREATE_RESPONSE_SCHEMA = DoctorLazy(() =>
    looseObject({
      slug: stringSchema().regex(ARTIFACT_SLUG_RE),
      version: stringSchema().min(1).max(64),
      title: stringSchema().max(2048).optional(),
      favicon: stringSchema().max(256).optional(),
      contract: stringSchema().max(64).optional(),
      type: unknown().optional(),
      provisioned: unknown().optional(),
      replayed: unknown().optional(),
      read: unknown().optional(),
      shared: unknown().optional(),
    }),
  );
  EXTERNAL_ID_RE = /^[A-Za-z0-9_.:-]{1,128}$/;
  STORE_TARGET_SCHEMA = DoctorLazy(() =>
    objectSchema({
      store: stringSchema().min(1).max(32),
      project_id: stringSchema().regex(ARTIFACT_SLUG_RE),
      file_id: unknown().optional(),
      node_id: unknown().optional(),
    }),
  );
});
//@ chunk-95pbtx8d.js:18901-19186 placement
/**
 * 校验并解析创建结果里的存储目标，project_id 必须与给定 slug 一致；file_id/node_id 只接受安全格式。
 */
function parseStoreTarget(provisioned, slug) {
  let parsed = STORE_TARGET_SCHEMA().safeParse(provisioned);
  if (!parsed.success || parsed.data.project_id !== slug) return;
  let decodeId = (id) => (typeof id === "string" && EXTERNAL_ID_RE.test(id) ? id : undefined);
  let fileId = decodeId(parsed.data.file_id);
  let nodeId = decodeId(parsed.data.node_id);
  return {
    store: parsed.data.store,
    projectId: parsed.data.project_id,
    ...(fileId !== undefined && {
      fileId,
    }),
    ...(nodeId !== undefined && {
      nodeId,
    }),
  };
}
//@ chunk-95pbtx8d.js:19186-19485 placement
/**
 * 创建结果不确定时的提示（先 list 再决定是否重建），以及可重试的服务端失败消息集合。
 */
var CREATE_OUTCOME_UNKNOWN; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var RETRYABLE_CREATE_ERRORS;
deferInit("chunk-95pbtx8d.js:19186", () => {
  CREATE_OUTCOME_UNKNOWN =
    'the Artifact may or may not have been created: check with action "list" before creating again';
  RETRYABLE_CREATE_ERRORS = new Set([
    "copy timed out \u2014 retry",
    "content read failed \u2014 retry",
    "content write failed \u2014 retry",
    "provisioning unavailable \u2014 retry",
    "provisioning refused \u2014 retry later",
  ]);
});
//@ chunk-95pbtx8d.js:19485-19554 placement
function isRetryableCreateFailure(status, body) {
  return status < 500 || (typeof body === "string" && RETRYABLE_CREATE_ERRORS.has(body.trim()));
}
//@ chunk-95pbtx8d.js:19554-19861 placement
/**
 * 从类型创建的常量：暂时不可用的重试提示、重试次数、拒绝响应头名、创建进行中错误码、类型未找到提示。
 */
var CREATE_UNAVAILABLE_RETRY = "temporarily unavailable \u2014 retry with the same idempotency_key";
var CREATE_MAX_ATTEMPTS = 3;
var X_FRAME_REFUSAL = "x-frame-refusal";
var CREATE_IN_FLIGHT = "create_in_flight";
var TYPE_NOT_FOUND_MESSAGE =
  "Artifact type not found \u2014 check the link, and that this account can open the type in a browser (creating Artifacts from types may also not be available to this account yet)";
//@ chunk-95pbtx8d.js:19861-24634 placement
/**
 * 用 Artifact 类型新建 Artifact（POST /api/frame/types/{slug}/create）：直连或经中继、幂等重试，处理 cloud_unavailable/invalid_slug 等。
 */
async function createArtifactFromType(typeSlug, options) {
  let route = "direct";
  let frameRetryWaits = 0;
  let inCloud = canCreateFromTypeInCloud();
  let commonTelemetry = () => ({
    route: route === "relay" ? lit("relay") : lit("direct"),
    ...(frameRetryWaits > 0 && {
      n_frame_retry_waits: frameRetryWaits,
    }),
    ...(inCloud && {
      agent: true,
    }),
    ...(isByocEnvironment() && {
      runner: true,
    }),
  });
  let fail = (reason, message, status) => {
    logFeatureBad("artifact_create_from_type", reason, {
      ...commonTelemetry(),
      ...(status !== undefined && {
        status,
      }),
    });
    return {
      kind: "error",
      message,
      reason,
    };
  };
  let attempts = 0;
  let failUnavailable = (reason, status) => {
    logFeatureBad("artifact_create_from_type", reason, {
      ...commonTelemetry(),
      ...(status !== undefined && {
        status,
      }),
    });
    return {
      kind: "error",
      message: CREATE_FROM_TYPE_UNAVAILABLE,
      reason: "cloud_unavailable",
      ...(attempts > 1 && {
        afterRetry: true,
      }),
    };
  };
  if (!ARTIFACT_SLUG_RE.test(typeSlug)) return fail("invalid_slug", "type_url does not name an Artifact");
  let queryParts = [
    ...(options.idempotencyKey !== undefined
      ? [`idempotency_key=${encodeURIComponent(options.idempotencyKey)}`]
      : []),
    ...(options.createConfirmed === true ? [CREATE_CONFIRMED_QUERY] : []),
  ];
  let url = `${createFromTypePath(typeSlug)}${queryParts.length === 0 ? "" : `?${queryParts.join("&")}`}`;
  let body = {
    target_type_version: null,
    ...(options.title !== undefined &&
      options.title !== "" && {
        title: options.title,
      }),
    ...getSessionHintHeaders(),
    ...requestIdMeta(options.requestId),
  };
  let requestOptions = {
    refreshOAuth: true,
    headers: buildFrameHeaders(),
    timeout: 60000,
    maxContentLength: MAX_CREATE_RESPONSE_BYTES,
    signal: options.signal,
    credentials: options.credentials,
  };
  let post = () => {
    attempts++;
    if (inCloud) return frameApi.post(url, body, requestOptions);
    if (isRelayUnavailableForTypeCreate()) return Promise.resolve(RELAY_UNAVAILABLE_CREATE_RESULT);
    return isByocEnvironment()
      ? frameApi.postRelayStrict(url, body, requestOptions)
      : frameApi.postRelayOnly(url, body, requestOptions);
  };
  let retryOnRejectedHints = async (result) => {
    route = result.route;
    let rejectedHints =
      result.ok && result.fromFrame ? findRejectedHintFields(result.status, result.data, body) : [];
    if (rejectedHints.length === 0) return result;
    if (rejectedHints.includes("request_id"))
      logFeatureSad("artifact_create_from_type", "request_id_rejected", commonTelemetry());
    if (mentionsSessionHintField(rejectedHints)) {
      logFeatureSad("artifact_create_from_type", "session_hints_rejected", commonTelemetry());
      noteSessionHintsRefused();
    }
    body = stripSessionHints(body);
    return post();
  };
  let result;
  let sawConflict = false;
  let sawUnavailable = false;
  try {
    result = await retryOnRejectedHints(await post());
    route = result.route;
    if (result.ok && result.gatewayRetryAfterMs !== undefined) {
      attempts--;
      await sleep(Math.min(result.gatewayRetryAfterMs, RELAY_ONLY_BUSY_WAIT_MAX_MS), options.signal, {
        throwOnAbort: true,
      });
      result = await retryOnRejectedHints(await post());
      route = result.route;
    }
    let sawRetryableConflict = false;
    while (frameRetryWaits < CREATE_MAX_ATTEMPTS) {
      let retryAfter = result.ok && result.fromFrame ? result.response?.headers?.["retry-after"] : undefined;
      if (!result.ok || typeof retryAfter !== "string") break;
      let isConflictOrRateLimited = result.status === 409 || result.status === 429;
      let isUnavailableRetry =
        result.status === 503 &&
        options.idempotencyKey !== undefined &&
        typeof result.data === "string" &&
        result.data.trim() === CREATE_UNAVAILABLE_RETRY;
      if (!isUnavailableRetry && (!isConflictOrRateLimited || sawRetryableConflict)) break;
      sawRetryableConflict ||= isConflictOrRateLimited;
      sawConflict ||= result.status === 409;
      sawUnavailable ||= isUnavailableRetry;
      await sleep(Math.min(parseRetryAfterMs(retryAfter) ?? 1000, 1e4), options.signal, {
        throwOnAbort: true,
      });
      frameRetryWaits++;
      result = await retryOnRejectedHints(await post());
      route = result.route;
    }
  } catch (error) {
    if (isCancel(error) || options.signal.aborted) throw error;
    let threwOnRelay = threwOnRelayLeg(error);
    if (threwOnRelay) route = "relay";
    if (isMaxContentLengthError(error))
      return fail(
        "echo_too_large",
        `the server's answer was too large to read \u2014 ${CREATE_OUTCOME_UNKNOWN}`,
      );
    if (threwOnRelay)
      return fail("request_error", `the cloud relay drew no answer \u2014 ${CREATE_OUTCOME_UNKNOWN}`);
    return fail(
      "request_error",
      `the request failed before the server answered \u2014 ${CREATE_OUTCOME_UNKNOWN}`,
    );
  }
  if (!result.ok) {
    if (result.reason === "relay-unavailable" || result.reason === "relay-not-served")
      return failUnavailable(result.reason.replace(/-/g, "_"), result.status);
    if (inCloud && result.reason === "no-auth") return failUnavailable("agent_no_credential");
    return fail(
      result.reason.replace(/-/g, "_"),
      result.reason === "no-auth"
        ? describeArtifactAuthFailure(result.detail)
        : `creating Artifacts is unavailable here: ${result.reason}`,
    );
  }
  if (result.gatewayRetryAfterMs !== undefined && !sawConflict && !sawUnavailable) {
    attempts--;
    return failUnavailable("relay_busy", result.status);
  }
  if (result.gatewayPolicy !== undefined)
    return failUnavailable(
      result.gatewayPolicy === "unapproved" ? "relay_approval_refused" : "relay_policy_refused",
      result.status,
    );
  if (!result.fromFrame && (result.status < 200 || result.status >= 300))
    return fail(
      "relay_error",
      `create: the cloud relay failed (HTTP ${result.status}) \u2014 ${CREATE_OUTCOME_UNKNOWN}`,
      result.status,
    );
  if (result.status === 404) return fail("not_found", TYPE_NOT_FOUND_MESSAGE, 404);
  if (result.status === 403) {
    if (typeof result.data === "string" && result.data.startsWith(CCR_CREDENTIAL_REFUSED_PREFIX))
      return failUnavailable("ccr_credential_refused", 403);
    let denyBody = denyPolicyBody(result.data);
    if (inCloud && !denyBody) return failUnavailable("agent_credential_refused", 403);
    return fail(
      denyBody ? "denied" : "forbidden",
      `create denied: ${denyBody ? scrubServerLine(denyBody.error, 300) : errBody(result.data)}`,
      403,
    );
  }
  if (result.status !== 200) {
    if (
      result.status === 409 &&
      (result.response?.headers?.[X_FRAME_REFUSAL] === CREATE_IN_FLIGHT ||
        denyPolicyBody(result.data)?.reason === CREATE_IN_FLIGHT)
    )
      return fail(
        "create_in_flight",
        'an earlier attempt of this call is still creating the Artifact \u2014 use action "list" to find it before creating again',
        409,
      );
    return fail(
      `status_${result.status}`,
      !sawUnavailable && isRetryableCreateFailure(result.status, result.data)
        ? `create ${result.status}: ${errBody(result.data)} (nothing was created)`
        : `create ${result.status}: ${errBody(result.data)} \u2014 ${CREATE_OUTCOME_UNKNOWN}`,
      result.status,
    );
  }
  let parsed = CREATE_RESPONSE_SCHEMA().safeParse(result.data);
  if (!parsed.success)
    return fail(
      "malformed_echo",
      'the Artifact was created but the server reply was unreadable \u2014 use action "list" to find it rather than creating again',
      200,
    );
  let data = parsed.data;
  let typeLock = typeLockFromWire(data.type);
  if (typeLock === undefined)
    return fail(
      "malformed_echo",
      'the Artifact was created but the server reply was unreadable \u2014 use action "list" to find it rather than creating again',
      200,
    );
  let manifestPaths = splitManifestPaths(result.data);
  let paths = manifestPaths ?? {
    own: [],
    type: [],
  };
  let storeTarget = parseStoreTarget(data.provisioned, data.slug);
  let replayed = data.replayed === true;
  let audience = echoAudience(data.read, data.shared);
  logFeatureOk("artifact_create_from_type", {
    provisioned: storeTarget !== undefined,
    already_created: replayed,
    keyed: options.idempotencyKey !== undefined,
    ...commonTelemetry(),
    n_own_files: paths.own.length,
    n_type_files: paths.type.length,
    titled: options.title !== undefined && options.title !== "",
  });
  return {
    kind: "created",
    created: {
      slug: data.slug,
      version: data.version,
      url: artifactViewerUrl(data.slug),
      ...(data.title !== undefined && {
        title: data.title,
      }),
      ...(data.favicon !== undefined && {
        favicon: data.favicon,
      }),
      storedContract: parseContractVersion(data.contract),
      typeLock,
      ownFiles: paths.own,
      typeFiles: paths.type,
      ...(storeTarget !== undefined && {
        provisioned: storeTarget,
      }),
      ...(replayed && {
        alreadyCreated: true,
      }),
      ...(audience.read !== undefined && {
        read: audience.read,
      }),
      ...(audience.shared !== undefined && {
        shared: audience.shared,
      }),
      ...(manifestPaths === undefined && {
        manifestUnread: true,
      }),
    },
  };
}
//@ chunk-95pbtx8d.js:24634-24667 placement
function hasDbCapability(target) {
  return hasKey(target, "db");
}
//@ chunk-95pbtx8d.js:24667-24707 placement
function hasEndpointsCapability(target) {
  return hasKey(target, "endpoints");
}
//@ chunk-95pbtx8d.js:24707-24769 placement
function hasKey(target, key) {
  return typeof target === "object" && target !== null && key in target;
}
export {
  artifactTypesEnabled,
  isRelayUnavailableForTypeCreate,
  CREATE_FROM_TYPE_UNAVAILABLE,
  createArtifactFromType,
  parseStoreTarget,
  hasDbCapability,
  hasEndpointsCapability,
  TENGU_COBALT_PLINTH_LARCH,
  canCreateFromType,
};
