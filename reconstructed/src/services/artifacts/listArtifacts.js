/**
 * services/artifacts/listArtifacts.ts
 *
 * 2.1.316 新增：列出 artifact 与发布响应结构
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-06y4szbn.js (16)
 * attribution: placement 16
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
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
import { LIST_LIMIT_MAX, vetForeignFavicon } from "../../tools/ArtifactTool/artifactUrls.js";
import { listExternalArtifacts } from "./externalList.js";
import { frameApi, wireOfThrow, wireOf } from "./frameRelay.js";
import { buildFrameHeaders } from "./frameApi.js";
import { sleep } from "../../utils/sleep.js";
import { logFeatureBad, logFeatureOk } from "../analytics/featureTelemetry.js";
import { errorMessage } from "../../utils/errors.js";
import { describeArtifactAuthFailure } from "./frameFlags.js";
import { sanitizeDisplayTitle } from "../../utils/textNormalize.js";
import { artifactViewerUrl } from "./publishInstanceFiles.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-06y4szbn.js:147335-147361 placement
var ARTIFACT_LIST_RELS = ["mine", "shared"];
//@ chunk-06y4szbn.js:147361-147400 placement
function isKnownRel(rel) {
  return ARTIFACT_LIST_RELS.includes(rel);
}
//@ chunk-06y4szbn.js:147400-147585 placement
/**
 * 导出函数 `ARTIFACT_LIST_SCOPES`。
 */
var ARTIFACT_LIST_SCOPES; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var frameListResponseSchema;
var ISO_TIMESTAMP_RE;
deferInit("chunk-06y4szbn.js:147400", () => {
  ARTIFACT_LIST_SCOPES = ["mine", "shared", "all"];
  frameListResponseSchema = DoctorLazy(() =>
    objectSchema({
      frames: array(unknown()).nullable(),
      starsEnabled: booleanSchema().optional().catch(undefined),
    }),
  );
  ISO_TIMESTAMP_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;
});
//@ chunk-06y4szbn.js:147585-147764 placement
function echoAudience(read, shared) {
  let readLabel = read === "" || (typeof read === "string" && SAFE_LABEL_RE.test(read)) ? read : undefined;
  let sharedLabel =
    shared === "" || (typeof shared === "string" && VER_SHAPE.test(shared)) ? shared : undefined;
  return {
    read: shared === undefined || sharedLabel !== undefined ? readLabel : undefined,
    shared: sharedLabel,
  };
}
//@ chunk-06y4szbn.js:147764-148214 placement
var publishResponseSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-06y4szbn.js:147764", () => {
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
//@ chunk-06y4szbn.js:148214-148445 placement
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
//@ chunk-06y4szbn.js:148445-148691 placement
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
//@ chunk-06y4szbn.js:148691-148831 placement
function isMergedResponse(response) {
  if (typeof response !== "object" || response === null || !("mergedFrom" in response)) return false;
  let { mergedFrom } = response;
  return typeof mergedFrom === "string" ? mergedFrom !== "" : mergedFrom != null;
}
//@ chunk-06y4szbn.js:148831-149081 placement
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
//@ chunk-06y4szbn.js:149081-149199 placement
function mergedTelemetry(mergedOver) {
  if (mergedOver === undefined) return {};
  return {
    merged_over: true,
    ...(mergedOver.changed !== undefined && {
      merged_changed: mergedOver.changed.length,
    }),
  };
}
//@ chunk-06y4szbn.js:149199-149223 placement
var MAX_EPOCH_MS = 253402300799999;
//@ chunk-06y4szbn.js:149223-149386 placement
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
//@ chunk-06y4szbn.js:149386-149805 placement
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
//@ chunk-06y4szbn.js:149805-149998 placement
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
//@ chunk-06y4szbn.js:149998-150305 placement
/**
 * artifact 列表条目的 schema（slug/title/favicon/rel/更新时间/星标/外部可能写入）与列表上限、响应体 4 MB 上限。
 */
var artifactListEntrySchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var LIST_LIMIT_MAX_ARTIFACTS;
var MAX_LIST_RESPONSE_BYTES;
deferInit("chunk-06y4szbn.js:149998", () => {
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
  MAX_LIST_RESPONSE_BYTES = 4194304;
});
//@ chunk-06y4szbn.js:150305-152997 placement
async function listArtifacts(limit, options) {
  let { scope = "mine", pins = false, signal, credentials } = options;
  let pinsPromise =
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
        maxContentLength: MAX_LIST_RESPONSE_BYTES,
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
    let reason = response.status >= 500 ? "http_5xx" : "http_4xx";
    logFeatureBad("artifact_list", reason, {
      wire,
    });
    return {
      err: `artifact listing failed (HTTP ${response.status})`,
      reason,
    };
  }
  let parsed = frameListResponseSchema().safeParse(response.data);
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
  let starsEnabled = parsed.data.starsEnabled === true;
  let rows = [];
  let seenSlugs = new Set();
  let totalCount = 0;
  let skippedCount = 0;
  let sawNonMine = false;
  let mineAfterNonMine = false;
  for (let frame of frames) {
    let entryParsed = artifactListEntrySchema().safeParse(frame);
    if (!entryParsed.success) {
      skippedCount++;
      continue;
    }
    let { slug, title, rel, updatedAt, softDeleted, starred, outsidersMayHaveWritten } = entryParsed.data;
    if (isKnownRel(rel)) {
      if (rel !== "mine") sawNonMine = true;
      else if (sawNonMine) mineAfterNonMine = true;
    }
    let favicon = vetForeignFavicon(entryParsed.data.favicon);
    if (softDeleted === true || !isKnownRel(rel)) continue;
    if (scope !== "all" && rel !== scope) continue;
    seenSlugs.add(slug);
    totalCount++;
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
  if (frames.length > 0 && rows.length === 0 && skippedCount === frames.length) {
    logFeatureBad("artifact_list", "all_rows_dropped", {
      wire,
    });
    return {
      err: "artifact listing failed: response rows were unreadable",
      reason: "all_rows_dropped",
    };
  }
  let pinsResult = await pinsPromise;
  for (let pin of pinsResult?.listed ? pinsResult.rows : []) {
    if (seenSlugs.has(pin.slug)) continue;
    seenSlugs.add(pin.slug);
    totalCount++;
    if (rows.length >= limit) continue;
    rows.push({
      title: sanitizeDisplayTitle(pin.title ?? "") ?? "Untitled",
      url: artifactViewerUrl(pin.slug),
      rel: "shared",
      external: true,
      ...(pin.role !== undefined && {
        role: pin.role,
      }),
    });
  }
  logFeatureOk("artifact_list", {
    wire,
  });
  if (scope !== "mine")
    logFeatureOk(scope === "shared" ? "artifact_list_scope_shared" : "artifact_list_scope_all");
  let mineComplete = sawNonMine && !mineAfterNonMine;
  let totalAtLeast =
    (frames.length >= LIST_LIMIT_MAX_ARTIFACTS && !(scope === "mine" && mineComplete)) ||
    skippedCount > 0 ||
    (scope !== "mine" && pinsResult?.listed === true && pinsResult.mayHaveMore);
  return {
    err: null,
    rows,
    total: totalCount,
    totalAtLeast,
    truncated: rows.length < totalCount || totalAtLeast,
    ...(pins && {
      pinsEnabled: starsEnabled,
    }),
    ...(pinsResult?.listed === true && {
      externalListed: true,
    }),
  };
}
export {
  publishResponseSchema,
  mergedChangesFields,
  isMergedResponse,
  typeInstanceFields,
  mergedTelemetry,
  publishEchoFields,
  capabilitiesEchoFields,
  MAX_EPOCH_MS,
  ARTIFACT_LIST_RELS,
  isKnownRel,
  listArtifacts,
  ARTIFACT_LIST_SCOPES,
  echoAudience,
};
