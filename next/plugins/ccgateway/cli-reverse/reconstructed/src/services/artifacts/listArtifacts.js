/**
 * services/artifacts/listArtifacts.ts
 *
 * 2.1.316 新增：列出 artifact 与发布响应结构
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-51jy8ztq.js (26)
 * attribution: placement 22, sole-consumer 4
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import { create, create_15, create_12, create_2, create_6 } from "../../../vendor/zod/lib/index.mjs";
import { frameApi, wireOfThrow, wireOf } from "./frameRelay.js";
import { buildFrameHeaders } from "./frameApi.js";
import { logFeatureOk, logFeatureSad, logFeatureBad } from "../analytics/featureTelemetry.js";
import { createCombinedAbortSignal } from "../../utils/combinedAbortSignal.js";
import { LIST_LIMIT_MAX, vetForeignFavicon } from "../../tools/ArtifactTool/artifactUrls.js";
import {
  objectSchema,
  array,
  unknown,
  booleanSchema,
  stringSchema,
  record,
  numberSchema,
  literal,
} from "../../../vendor/zod/v4/classic/schemas.js";
import { SAFE_LABEL_RE, isMeaningfulFlag } from "./textSanitize.js";
import { VER_SHAPE } from "./ownPublishes.js";
import { ARTIFACT_SLUG_RE } from "../../tools/ArtifactTool/constants.js";
import { CONTRACT_VERSION_REGEX, isNonEmptyObject, parseContractVersion } from "./capabilityDeclaration.js";
import { MAX_ECHO_MANIFEST_PATH, MAX_ECHO_MANIFEST_ENTRIES, typeLockFromWire } from "./pagePreparation.js";
import { sanitizeDisplayTitle } from "../../utils/textNormalize.js";
import { artifactViewerUrl } from "./publishInstanceFiles.js";
import { SHARE_ROLES } from "./leftOutFiles.js";
import { listExternalArtifacts } from "./externalList.js";
import { sleep } from "../../utils/sleep.js";
import { errorMessage } from "../../utils/errors.js";
import { describeArtifactAuthFailure } from "./frameFlags.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-51jy8ztq.js:41495-41702 placement
var MAX_LIST_RESPONSE_BYTES; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var MAX_LIST_BODY_BYTES;
var LIST_REQUEST_TIMEOUT_MS;
var frameListResponseSchema;
deferInit("chunk-51jy8ztq.js:41495", () => {
  MAX_LIST_RESPONSE_BYTES = 4194304;
  MAX_LIST_BODY_BYTES = 15000;
  LIST_REQUEST_TIMEOUT_MS = DoctorLazy(() =>
    create({
      artifacts: create_15(create_12()).nullable(),
      next_page_token: create_2().optional().catch(undefined),
      starsEnabled: create_6().optional().catch(undefined),
    }),
  );
  frameListResponseSchema = DoctorLazy(() =>
    create({
      kind: create_2(),
      id: create_2(),
    }).passthrough(),
  );
});
//@ chunk-51jy8ztq.js:41702-42784 placement
/**
 * 按相对路径分页列出 artifact（page/document），解析响应并在失败时给出 reason；components/artifacts/ArtifactsDialog 与列表 API 调用。
 */
async function listArtifactsPage(options) {
  let { rel, limit, pageToken, credentials, signal } = options;
  let params = new URLSearchParams({
    rel,
    kind: "page,document",
    sort: "last_viewed",
    limit: String(limit),
    ...(pageToken !== undefined && {
      page_token: pageToken,
    }),
  });
  let response;
  try {
    response = await frameApi.getRelayBound(`/api/frame/artifacts?${params.toString()}`, {
      refreshOAuth: true,
      credentials,
      headers: buildFrameHeaders(),
      timeout: MAX_LIST_BODY_BYTES,
      maxContentLength: MAX_LIST_RESPONSE_BYTES,
      ...(signal && {
        signal,
      }),
    });
  } catch {
    return reportPaged(signal, "request_error");
  }
  if (!response.ok) return reportPaged(signal, response.reason);
  if (!response.fromFrame) return reportPaged(signal, "relay_error", response.status);
  if (response.status < 200 || response.status >= 300)
    return reportPaged(signal, "http_failed", response.status);
  let parsed = LIST_REQUEST_TIMEOUT_MS().safeParse(response.data);
  if (!parsed.success) return reportPaged(signal, "malformed_body");
  logFeatureOk("artifact_list_paged");
  let artifacts = [];
  for (let raw of parsed.data.artifacts ?? []) {
    let parsedArtifact = frameListResponseSchema().safeParse(raw);
    if (
      !parsedArtifact.success ||
      (parsedArtifact.data.kind !== "page" && parsedArtifact.data.kind !== "document")
    )
      continue;
    let {
      id: slug,
      updated_at: updatedAt,
      source,
      soft_deleted: softDeleted,
      outside_organization: outsideOrg,
      ...rest
    } = parsedArtifact.data;
    artifacts.push({
      ...rest,
      slug,
      updatedAt,
      source_surface: source,
      softDeleted,
      ...(outsideOrg === true && {
        external: true,
      }),
    });
  }
  return {
    served: true,
    rows: artifacts,
    ...(parsed.data.next_page_token && {
      nextPageToken: parsed.data.next_page_token,
    }),
    starsEnabled: parsed.data.starsEnabled === true,
  };
}
//@ chunk-51jy8ztq.js:42784-42935 placement
/**
 * 构造 artifact 列表失败的返回值，非中止且非 403 时记遥测。
 */
function reportPaged(signal, outcome, status) {
  if (!signal?.aborted && status !== 403)
    logFeatureSad("artifact_list_paged", outcome, {
      ...(status !== undefined && {
        status,
      }),
    });
  return {
    served: false,
    reason: outcome,
    ...(status !== undefined && {
      status,
    }),
  };
}
//@ chunk-51jy8ztq.js:42935-43000 placement
/**
 * 共享 channel 列表的超时 10000、响应上限 4 MB 与帧 schema。共享 channel 列表的响应大小上限（4 MB）。共享 channel 帧响应的 schema。
 */
var FRAMES_TIMEOUT_MS; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var MAX_FRAME_BYTES;
var framesSchema;
deferInit("chunk-51jy8ztq.js:42935", () => {
  FRAMES_TIMEOUT_MS = 1e4;
  MAX_FRAME_BYTES = 4194304;
  framesSchema = DoctorLazy(() =>
    create({
      frames: create_15(create_12()).nullable(),
    }),
  );
});
//@ chunk-51jy8ztq.js:43000-43113 placement
/**
 * 构造共享 channel 列表失败的返回值（非中止才记遥测）。
 */
function reportSharedLane(signal, outcome, status) {
  if (!signal?.aborted)
    logFeatureSad("artifact_list_shared_lane", outcome, {
      ...(status !== undefined && {
        status,
      }),
    });
  return {
    listed: false,
  };
}
//@ chunk-51jy8ztq.js:43113-43745 placement
/**
 * 拉取 rel=shared 的 channel 帧列表，带超时与中止，返回是否已满页。
 */
async function listFrames(options) {
  let { credentials, signal } = options;
  let timeoutSignal = createCombinedAbortSignal(signal, {
    timeoutMs: FRAMES_TIMEOUT_MS,
    refTimer: true,
  });
  let response;
  try {
    response = await frameApi.get(`/api/frame/frames?rel=shared&limit=${LIST_LIMIT_MAX}`, {
      refreshOAuth: true,
      credentials,
      headers: buildFrameHeaders(),
      timeout: FRAMES_TIMEOUT_MS,
      maxContentLength: MAX_FRAME_BYTES,
      signal: timeoutSignal.signal,
      httpOnly: true,
    });
  } catch {
    return reportSharedLane(signal, "request_error");
  } finally {
    timeoutSignal.cleanup();
  }
  if (!response.ok) return reportSharedLane(signal, response.reason);
  if (!response.fromFrame) return reportSharedLane(signal, "relay_error", response.status);
  if (response.status < 200 || response.status >= 300)
    return reportSharedLane(signal, "http_failed", response.status);
  let parsed = framesSchema().safeParse(response.data);
  if (!parsed.success) return reportSharedLane(signal, "malformed_body");
  logFeatureOk("artifact_list_shared_lane");
  let frames = parsed.data.frames ?? [];
  return {
    listed: true,
    rows: frames,
    full: frames.length >= LIST_LIMIT_MAX,
  };
}
//@ chunk-51jy8ztq.js:149651-149677 placement
var ARTIFACT_LIST_RELS = ["mine", "shared"];
//@ chunk-51jy8ztq.js:149677-149716 placement
function isKnownRel(rel) {
  return ARTIFACT_LIST_RELS.includes(rel);
}
//@ chunk-51jy8ztq.js:149716-149901 placement
/**
 * 导出函数 `ARTIFACT_LIST_SCOPES`。
 */
var ARTIFACT_LIST_SCOPES; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var frameListResponseSchema_2;
var ISO_TIMESTAMP_RE;
deferInit("chunk-51jy8ztq.js:149716", () => {
  ARTIFACT_LIST_SCOPES = ["mine", "shared", "all"];
  frameListResponseSchema_2 = DoctorLazy(() =>
    objectSchema({
      frames: array(unknown()).nullable(),
      starsEnabled: booleanSchema().optional().catch(undefined),
    }),
  );
  ISO_TIMESTAMP_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;
});
//@ chunk-51jy8ztq.js:149901-150080 placement
function echoAudience(read, shared) {
  let readLabel = read === "" || (typeof read === "string" && SAFE_LABEL_RE.test(read)) ? read : undefined;
  let sharedLabel =
    shared === "" || (typeof shared === "string" && VER_SHAPE.test(shared)) ? shared : undefined;
  return {
    read: shared === undefined || sharedLabel !== undefined ? readLabel : undefined,
    shared: sharedLabel,
  };
}
//@ chunk-51jy8ztq.js:150080-150530 placement
var publishResponseSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-51jy8ztq.js:150080", () => {
  publishResponseSchema = DoctorLazy(() =>
    objectSchema({
      slug: stringSchema().regex(ARTIFACT_SLUG_RE),
      version: stringSchema().regex(VER_SHAPE),
      read: unknown().optional(),
      shared: unknown().optional(),
      kind: stringSchema().regex(SAFE_LABEL_RE).optional().catch(undefined),
      contract: stringSchema().regex(CONTRACT_VERSION_REGEX).optional().catch(undefined),
      preferredContract: stringSchema().regex(CONTRACT_VERSION_REGEX).optional().catch(undefined),
      capabilities: record(stringSchema().max(64), unknown()).optional().catch(undefined),
      typeInstance: booleanSchema().optional().catch(undefined),
      type: unknown().optional(),
      ...liveHeadFieldSchemas(),
      ...mergeFieldSchemas(),
    }).transform(({ read, shared, ...rest }) => ({
      ...rest,
      ...echoAudience(read, shared),
    })),
  );
});
//@ chunk-51jy8ztq.js:150530-150761 placement
function liveHeadFieldSchemas() {
  return {
    seq: numberSchema().int().nonnegative().optional().catch(undefined),
    deadline: objectSchema({
      until: numberSchema().int().positive().max(MAX_EPOCH_MS),
    })
      .optional()
      .catch(undefined),
    unchanged: literal(true).optional().catch(undefined),
    replayed: literal(true).optional().catch(undefined),
  };
}
//@ chunk-51jy8ztq.js:150761-151007 placement
function mergeFieldSchemas() {
  return {
    appliedOver: stringSchema().regex(VER_SHAPE).optional().catch(undefined),
    mergedFrom: stringSchema().regex(VER_SHAPE).optional().catch(undefined),
    changed: array(
      objectSchema({
        path: stringSchema().min(1).max(MAX_ECHO_MANIFEST_PATH),
        sha256: stringSchema()
          .regex(/^[0-9a-f]{64}$/)
          .nullable(),
      }),
    )
      .max(2 * MAX_ECHO_MANIFEST_ENTRIES)
      .optional()
      .catch(undefined),
  };
}
//@ chunk-51jy8ztq.js:151007-151147 placement
function isMergedResponse(response) {
  if (typeof response !== "object" || response === null || !("mergedFrom" in response)) return false;
  let { mergedFrom } = response;
  return typeof mergedFrom === "string" ? mergedFrom !== "" : mergedFrom != null;
}
//@ chunk-51jy8ztq.js:151147-151397 placement
function mergedChangesFields(response, extra, excludedPaths) {
  let mergedFrom = response.mergedFrom;
  if (
    mergedFrom === undefined ||
    mergedFrom !== extra ||
    mergedFrom === response.version ||
    mergedFrom === response.appliedOver
  )
    return {};
  let filtered = response.changed?.filter((change) => !excludedPaths.has(change.path));
  return {
    mergedOver: {
      base: mergedFrom,
      ...(response.appliedOver !== undefined && {
        live: response.appliedOver,
      }),
      ...(filtered !== undefined && {
        changed: filtered,
      }),
    },
  };
}
//@ chunk-51jy8ztq.js:151397-151515 placement
function mergedTelemetry(mergedOver) {
  if (mergedOver === undefined) return {};
  return {
    merged_over: true,
    ...(mergedOver.changed !== undefined && {
      merged_changed: mergedOver.changed.length,
    }),
  };
}
//@ chunk-51jy8ztq.js:151515-151539 placement
var MAX_EPOCH_MS = 253402300799999;
//@ chunk-51jy8ztq.js:151539-151702 placement
function publishEchoFields(response, extra) {
  return {
    ...(response.seq !== undefined && {
      seq: response.seq,
    }),
    ...(extra &&
      response.deadline !== undefined && {
        deadline: {
          until: response.deadline.until,
        },
      }),
    ...(response.unchanged &&
      !response.replayed && {
        unchanged: true,
      }),
  };
}
//@ chunk-51jy8ztq.js:151702-152121 placement
function capabilitiesEchoFields(capabilities, response, publishable = false) {
  let contract = "contract" in response ? response.contract : undefined;
  let contract_2 = capabilities.contract ?? contract;
  let capabilities_2 = capabilities.capabilities;
  let hasCaps = isNonEmptyObject(capabilities_2);
  let missingFromResponse = !("capabilities" in response) && hasCaps;
  let fields =
    capabilities.contract !== undefined && (hasCaps || parseContractVersion(capabilities.contract) !== null)
      ? {
          contract: capabilities.contract,
          ...(capabilities_2 !== undefined && {
            capabilities: capabilities_2,
            ...(missingFromResponse &&
              (publishable
                ? {
                    declaredByRoute: true,
                  }
                : {
                    carried: true,
                  })),
          }),
        }
      : undefined;
  return {
    ...(contract_2 !== undefined && {
      contract: contract_2,
    }),
    ...(capabilities.preferredContract !== undefined && {
      preferredContract: capabilities.preferredContract,
    }),
    ...(fields !== undefined && {
      stored: fields,
    }),
  };
}
//@ chunk-51jy8ztq.js:152121-152314 placement
function typeInstanceFields(entry) {
  let typeLock = entry.typeInstance === true ? typeLockFromWire(entry.type) : undefined;
  return entry.typeInstance === false ||
    (typeLock !== undefined && (typeLock.latest === undefined || typeLock.latest === typeLock.current))
    ? {
        ...(typeLock !== undefined && {
          typeLock,
        }),
        readBackEchoed: true,
      }
    : {};
}
//@ chunk-51jy8ztq.js:152314-152620 placement
/**
 * artifact 列表条目的 schema（slug/title/favicon/rel/更新时间/星标/外部可能写入）与列表上限、响应体 4 MB 上限。
 */
var artifactListEntrySchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var LIST_LIMIT_MAX_ARTIFACTS;
var MAX_LIST_RESPONSE_BYTES_3;
deferInit("chunk-51jy8ztq.js:152314", () => {
  artifactListEntrySchema = DoctorLazy(() =>
    objectSchema({
      slug: stringSchema().regex(ARTIFACT_SLUG_RE),
      title: stringSchema().max(4000).optional(),
      favicon: unknown().optional(),
      rel: stringSchema(),
      updatedAt: stringSchema().regex(ISO_TIMESTAMP_RE).optional().catch(undefined),
      softDeleted: booleanSchema().optional(),
      starred: booleanSchema().optional().catch(undefined),
      outsidersMayHaveWritten: literal(true)
        .optional()
        .catch((error) => (isMeaningfulFlag(error.input) ? true : undefined)),
    }),
  );
  LIST_LIMIT_MAX_ARTIFACTS = LIST_LIMIT_MAX;
  MAX_LIST_RESPONSE_BYTES_3 = 4194304;
});
//@ chunk-51jy8ztq.js:152620-152700 placement
async function listArtifacts(limit, options) {
  let result = await listFromFrames(limit, options);
  if (result !== null) return result;
  return listFromFrameApi(limit, options);
}
//@ chunk-51jy8ztq.js:152700-152777 sole-consumer
var PAGE_TOKEN_SEPARATOR = "~";
var PAGE_TOKEN_RE = /^(?=[^~]|~.)[A-Za-z0-9_-]*(?:~[A-Za-z0-9_-]*)?$/;
var MAX_PAGE_TOKEN_CHARS = 8192;
var MAX_LIST_PAGES = 5;
//@ chunk-51jy8ztq.js:152777-153152 sole-consumer
async function listRelPages(rel, relScope, token, credentials, signal) {
  let rows = [];
  let pageToken = token;
  let starsEnabled = false;
  for (let j = 0; j < MAX_LIST_PAGES; j++) {
    let page = await listArtifactsPage({
      rel,
      limit: relScope - rows.length,
      ...(pageToken !== undefined && {
        pageToken,
      }),
      credentials,
      ...(signal && {
        signal,
      }),
    });
    if (!page.served)
      return j === 0
        ? null
        : {
            rows,
            token: pageToken,
            starsEnabled,
          };
    starsEnabled = page.starsEnabled;
    rows.push(...page.rows);
    pageToken = page.nextPageToken;
    if (pageToken === undefined || rows.length >= relScope) break;
  }
  return {
    rows,
    ...(pageToken !== undefined && {
      token: pageToken,
    }),
    starsEnabled,
  };
}
//@ chunk-51jy8ztq.js:153152-155691 sole-consumer
async function listFromFrames(limit, options) {
  let { scope = "mine", pins = false, signal, credentials, pageToken } = options;
  if (
    pageToken !== undefined &&
    (pageToken.length > MAX_PAGE_TOKEN_CHARS ||
      !PAGE_TOKEN_RE.test(pageToken) ||
      pageToken.includes(PAGE_TOKEN_SEPARATOR) !== (scope === "all"))
  )
    return {
      err: "not a page token from a listing",
      reason: "bad_page_token",
    };
  let [mineToken, sharedToken] =
    scope === "all"
      ? (pageToken ?? "").split(PAGE_TOKEN_SEPARATOR)
      : scope === "mine"
        ? [pageToken, undefined]
        : [undefined, pageToken];
  let continuing = pageToken !== undefined;
  let wantsMine = scope !== "shared" && (!continuing || !!mineToken);
  let wantsShared = scope !== "mine" && (!continuing || !!sharedToken);
  let mineLimit = wantsMine && wantsShared ? Math.max(1, Math.ceil(limit / 2)) : limit;
  let [minePage, sharedPage] = await Promise.all([
    wantsMine ? listRelPages("mine", mineLimit, mineToken || undefined, credentials, signal) : undefined,
    wantsShared
      ? listRelPages(
          "shared",
          limit - (wantsMine ? mineLimit : 0),
          sharedToken || undefined,
          credentials,
          signal,
        )
      : undefined,
  ]);
  if (minePage === null || sharedPage === null) {
    if (continuing)
      return {
        err: "artifact listing failed: the next page could not be read",
        reason: "page_unserved",
      };
    return null;
  }
  let mine = minePage;
  let shared = sharedPage;
  let shortfall = limit - (mine?.rows.length ?? 0) - (shared?.rows.length ?? 0);
  if (shortfall > 0 && mine?.token === undefined && shared?.token !== undefined) {
    let more = await listRelPages("shared", shortfall, shared.token, credentials, signal);
    if (more !== null)
      shared = {
        ...more,
        rows: [...shared.rows, ...more.rows],
      };
  } else if (shortfall > 0 && shared?.token === undefined && mine?.token !== undefined) {
    let more = await listRelPages("mine", shortfall, mine.token, credentials, signal);
    if (more !== null)
      mine = {
        ...more,
        rows: [...mine.rows, ...more.rows],
      };
  }
  let starsEnabled = (mine ?? shared)?.starsEnabled === true;
  let rows = [];
  let seenSlugs = new Set();
  let unreadableCount = 0;
  for (let rawRow of [...(mine?.rows ?? []), ...(shared?.rows ?? [])]) {
    let parsed = artifactListEntrySchema().safeParse(rawRow);
    if (!parsed.success) {
      unreadableCount++;
      continue;
    }
    let { slug, title, rel, updatedAt, softDeleted, starred } = parsed.data;
    if (softDeleted === true || !isKnownRel(rel) || (scope !== "all" && rel !== scope) || seenSlugs.has(slug))
      continue;
    seenSlugs.add(slug);
    let favicon = vetForeignFavicon(parsed.data.favicon);
    rows.push({
      title: sanitizeDisplayTitle(title ?? "") ?? "Untitled",
      url: artifactViewerUrl(slug),
      ...(favicon !== undefined &&
        rel === "mine" && {
          favicon,
        }),
      ...(updatedAt !== undefined && {
        updatedAt,
      }),
      ...(scope !== "mine" && {
        rel,
      }),
      ...(rel === "shared" &&
        rawRow.external === true && {
          external: true,
          ...(SHARE_ROLES.includes(rawRow.role) && {
            role: rawRow.role,
          }),
        }),
      ...(pins &&
        starsEnabled &&
        starred === true && {
          pinned: true,
        }),
      ...(rel === "mine" &&
        parsed.data.outsidersMayHaveWritten === true && {
          outsidersMayHaveWritten: true,
        }),
    });
  }
  if (rows.length === 0 && unreadableCount > 0) {
    logFeatureBad("artifact_list", "all_rows_dropped");
    return {
      err: "artifact listing failed: response rows were unreadable",
      reason: "all_rows_dropped",
    };
  }
  let nextPageToken =
    scope === "all"
      ? mine?.token !== undefined || shared?.token !== undefined
        ? `${mine?.token ?? ""}${PAGE_TOKEN_SEPARATOR}${shared?.token ?? ""}`
        : undefined
      : (mine ?? shared)?.token;
  let external =
    scope === "mine" || nextPageToken !== undefined
      ? undefined
      : await listExternalArtifacts({
          credentials,
          ...(signal && {
            signal,
          }),
        });
  for (let row of external?.listed ? external.rows : []) {
    if (seenSlugs.has(row.slug)) continue;
    seenSlugs.add(row.slug);
    rows.push({
      title: sanitizeDisplayTitle(row.title ?? "") ?? "Untitled",
      url: artifactViewerUrl(row.slug),
      rel: "shared",
      external: true,
      ...(row.role !== undefined && {
        role: row.role,
      }),
    });
  }
  logFeatureOk("artifact_list");
  if (scope !== "mine")
    logFeatureOk(scope === "shared" ? "artifact_list_scope_shared" : "artifact_list_scope_all");
  let hasNextPage = nextPageToken !== undefined;
  let atLeast =
    hasNextPage ||
    unreadableCount > 0 ||
    (scope !== "mine" && external?.listed === true && external.mayHaveMore);
  return {
    err: null,
    rows,
    total: rows.length,
    totalAtLeast: atLeast,
    truncated: atLeast,
    ...(hasNextPage && {
      nextPageToken,
    }),
    ...(pins && {
      pinsEnabled: starsEnabled,
    }),
    ...(external?.listed === true && {
      externalListed: true,
    }),
  };
}
//@ chunk-51jy8ztq.js:155691-158752 sole-consumer
async function listFromFrameApi(limit, options) {
  let { scope = "mine", pins = false, signal, credentials, pageToken } = options;
  if (pageToken !== undefined)
    return {
      err: "artifact listing failed: the next page could not be read",
      reason: "page_unserved",
    };
  let externalPromise =
    scope === "mine"
      ? undefined
      : listExternalArtifacts({
          credentials,
          ...(signal && {
            signal,
          }),
        });
  let response;
  for (let idx = 0; ; idx++) {
    try {
      response = await frameApi.get(`/api/frame/frames?limit=${LIST_LIMIT_MAX_ARTIFACTS}`, {
        refreshOAuth: true,
        headers: buildFrameHeaders(),
        timeout: 15000,
        maxContentLength: MAX_LIST_RESPONSE_BYTES_3,
        ...(signal && {
          signal,
        }),
        credentials,
      });
    } catch (error) {
      if (idx === 0 && !signal?.aborted) {
        await sleep(300 + Math.random() * 500);
        continue;
      }
      if (!signal?.aborted)
        logFeatureBad("artifact_list", "request_error", {
          wire: wireOfThrow(error),
        });
      return {
        err: `artifact listing failed: ${errorMessage(error)}`,
        reason: "request_error",
      };
    }
    if (response.ok && response.status >= 500 && idx === 0 && !signal?.aborted) {
      await sleep(300 + Math.random() * 500);
      continue;
    }
    break;
  }
  let wire = wireOf(response);
  if (!response.ok) {
    logFeatureBad("artifact_list", "not_ok", {
      wire,
    });
    return {
      err:
        response.reason === "no-auth"
          ? describeArtifactAuthFailure(response.detail)
          : `artifact listing unavailable: ${response.reason}`,
      reason: "not_ok",
    };
  }
  if (!response.fromFrame) {
    logFeatureBad("artifact_list", "relay_error", {
      wire,
    });
    return {
      err: `artifact listing failed (relay HTTP ${response.status})`,
      reason: "relay_error",
    };
  }
  if (response.status < 200 || response.status >= 300) {
    let statusReason = response.status >= 500 ? "http_5xx" : "http_4xx";
    logFeatureBad("artifact_list", statusReason, {
      wire,
    });
    return {
      err: `artifact listing failed (HTTP ${response.status})`,
      reason: statusReason,
    };
  }
  let parsed = frameListResponseSchema_2().safeParse(response.data);
  if (!parsed.success) {
    logFeatureBad("artifact_list", "malformed_body", {
      wire,
    });
    return {
      err: "artifact listing failed: malformed response",
      reason: "malformed_body",
    };
  }
  let frames = parsed.data.frames ?? [];
  let externalPage =
    scope !== "mine" && frames.length >= LIST_LIMIT_MAX_ARTIFACTS
      ? await listFrames({
          credentials,
          ...(signal && {
            signal,
          }),
        })
      : undefined;
  let allRows = [...frames, ...(externalPage?.listed ? externalPage.rows : [])];
  let starsEnabled = parsed.data.starsEnabled === true;
  let rows = [];
  let keptSlugs = new Set();
  let keptCount = 0;
  let unreadableCount = 0;
  let unreadableFrameCount = 0;
  let seenSlugs = new Set();
  let sawOtherRel = false;
  let mineAfterOther = false;
  for (let [index, rawRow] of allRows.entries()) {
    let parsed = artifactListEntrySchema().safeParse(rawRow);
    if (!parsed.success) {
      unreadableCount++;
      if (index < frames.length) unreadableFrameCount++;
      continue;
    }
    let { slug, title, rel, updatedAt, softDeleted, starred, outsidersMayHaveWritten } = parsed.data;
    if (seenSlugs.has(slug)) continue;
    seenSlugs.add(slug);
    if (index < frames.length && isKnownRel(rel)) {
      if (rel !== "mine") sawOtherRel = true;
      else if (sawOtherRel) mineAfterOther = true;
    }
    let favicon = vetForeignFavicon(parsed.data.favicon);
    if (softDeleted === true || !isKnownRel(rel)) continue;
    if (scope !== "all" && rel !== scope) continue;
    keptSlugs.add(slug);
    keptCount++;
    if (rows.length >= limit) continue;
    let title_2 = sanitizeDisplayTitle(title ?? "") ?? "Untitled";
    rows.push({
      title: title_2,
      url: artifactViewerUrl(slug),
      ...(favicon !== undefined &&
        rel === "mine" && {
          favicon,
        }),
      ...(updatedAt !== undefined && {
        updatedAt,
      }),
      ...(scope !== "mine" && {
        rel,
      }),
      ...(pins &&
        starsEnabled &&
        starred === true && {
          pinned: true,
        }),
      ...(rel === "mine" &&
        outsidersMayHaveWritten === true && {
          outsidersMayHaveWritten,
        }),
    });
  }
  if (frames.length > 0 && unreadableFrameCount === frames.length) {
    logFeatureBad("artifact_list", "all_rows_dropped", {
      wire,
    });
    return {
      err: "artifact listing failed: response rows were unreadable",
      reason: "all_rows_dropped",
    };
  }
  let externalResult = await externalPromise;
  for (let row of externalResult?.listed ? externalResult.rows : []) {
    if (keptSlugs.has(row.slug)) continue;
    keptSlugs.add(row.slug);
    keptCount++;
    if (rows.length >= limit) continue;
    rows.push({
      title: sanitizeDisplayTitle(row.title ?? "") ?? "Untitled",
      url: artifactViewerUrl(row.slug),
      rel: "shared",
      external: true,
      ...(row.role !== undefined && {
        role: row.role,
      }),
    });
  }
  logFeatureOk("artifact_list", {
    wire,
  });
  if (scope !== "mine")
    logFeatureOk(scope === "shared" ? "artifact_list_scope_shared" : "artifact_list_scope_all");
  let mineFirst = sawOtherRel && !mineAfterOther;
  let framesFull = frames.length >= LIST_LIMIT_MAX_ARTIFACTS;
  let framesMayHideShared = framesFull && !mineFirst;
  let externalFull = externalPage?.listed ? externalPage.full : framesFull;
  let atLeast =
    (scope !== "shared" && framesMayHideShared) ||
    (scope !== "mine" && externalFull) ||
    unreadableCount > 0 ||
    (scope !== "mine" && externalResult?.listed === true && externalResult.mayHaveMore);
  return {
    err: null,
    rows,
    total: keptCount,
    totalAtLeast: atLeast,
    truncated: rows.length < keptCount || atLeast,
    ...(pins && {
      pinsEnabled: starsEnabled,
    }),
    ...(externalResult?.listed === true && {
      externalListed: true,
    }),
  };
}
export {
  MAX_EPOCH_MS,
  ARTIFACT_LIST_RELS,
  publishResponseSchema,
  mergedChangesFields,
  isMergedResponse,
  typeInstanceFields,
  mergedTelemetry,
  publishEchoFields,
  capabilitiesEchoFields,
  echoAudience,
  ARTIFACT_LIST_SCOPES,
  listFrames,
  listArtifactsPage,
  isKnownRel,
  listArtifacts,
};
