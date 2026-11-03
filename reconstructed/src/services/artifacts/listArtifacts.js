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
import { u, array, unknown, M, string, record, E, literal } from "../../../vendor/zod/v4/classic/schemas.js";
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

//@ chunk-06y4szbn.js:147335-147361 placement
var ARTIFACT_LIST_RELS = ["mine", "shared"];
//@ chunk-06y4szbn.js:147361-147400 placement
function isKnownRel(e) {
  return ARTIFACT_LIST_RELS.includes(e);
}
//@ chunk-06y4szbn.js:147400-147585 placement
/**
 * 导出函数 `ARTIFACT_LIST_SCOPES`。
 */
var ARTIFACT_LIST_SCOPES = ["mine", "shared", "all"];
var frameListResponseSchema = DoctorLazy(() =>
  u({
    frames: array(unknown()).nullable(),
    starsEnabled: M().optional().catch(undefined),
  }),
);
var ISO_TIMESTAMP_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;
//@ chunk-06y4szbn.js:147585-147764 placement
function echoAudience(read, shared) {
  let r = read === "" || (typeof read === "string" && SAFE_LABEL_RE.test(read)) ? read : undefined;
  let s = shared === "" || (typeof shared === "string" && VER_SHAPE.test(shared)) ? shared : undefined;
  return {
    read: shared === undefined || s !== undefined ? r : undefined,
    shared: s,
  };
}
//@ chunk-06y4szbn.js:147764-148214 placement
var publishResponseSchema = DoctorLazy(() =>
  u({
    slug: string().regex(ARTIFACT_SLUG_RE),
    version: string().regex(VER_SHAPE),
    read: unknown().optional(),
    shared: unknown().optional(),
    kind: string().regex(SAFE_LABEL_RE).optional().catch(undefined),
    contract: string().regex(CONTRACT_VERSION_REGEX).optional().catch(undefined),
    preferredContract: string().regex(CONTRACT_VERSION_REGEX).optional().catch(undefined),
    capabilities: record(string().max(64), unknown()).optional().catch(undefined),
    typeInstance: M().optional().catch(undefined),
    type: unknown().optional(),
    ...liveHeadFieldSchemas(),
    ...mergeFieldSchemas(),
  }).transform(({ read, shared, ...r }) => ({
    ...r,
    ...echoAudience(read, shared),
  })),
);
//@ chunk-06y4szbn.js:148214-148445 placement
function liveHeadFieldSchemas() {
  return {
    seq: E().int().nonnegative().optional().catch(undefined),
    deadline: u({
      until: E().int().positive().max(MAX_EPOCH_MS),
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
    appliedOver: string().regex(VER_SHAPE).optional().catch(undefined),
    mergedFrom: string().regex(VER_SHAPE).optional().catch(undefined),
    changed: array(
      u({
        path: string().min(1).max(MAX_ECHO_MANIFEST_PATH),
        sha256: string()
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
function isMergedResponse(e) {
  if (typeof e !== "object" || e === null || !("mergedFrom" in e)) return false;
  let { mergedFrom } = e;
  return typeof mergedFrom === "string" ? mergedFrom !== "" : mergedFrom != null;
}
//@ chunk-06y4szbn.js:148831-149081 placement
function mergedChangesFields(e, n, r) {
  let mergedFrom = e.mergedFrom;
  if (
    mergedFrom === undefined ||
    mergedFrom !== n ||
    mergedFrom === e.version ||
    mergedFrom === e.appliedOver
  )
    return {};
  let filtered = e.changed?.filter((b) => !r.has(b.path));
  return {
    mergedOver: {
      base: mergedFrom,
      ...(e.appliedOver !== undefined && {
        live: e.appliedOver,
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
function publishEchoFields(e, n) {
  return {
    ...(e.seq !== undefined && {
      seq: e.seq,
    }),
    ...(n &&
      e.deadline !== undefined && {
        deadline: {
          until: e.deadline.until,
        },
      }),
    ...(e.unchanged &&
      !e.replayed && {
        unchanged: true,
      }),
  };
}
//@ chunk-06y4szbn.js:149386-149805 placement
function capabilitiesEchoFields(e, n, r = false) {
  let contract = "contract" in n ? n.contract : undefined;
  let contract_2 = e.contract ?? contract;
  let capabilities = e.capabilities;
  let y = isNonEmptyObject(capabilities);
  let x = !("capabilities" in n) && y;
  let w =
    e.contract !== undefined && (y || parseContractVersion(e.contract) !== null)
      ? {
          contract: e.contract,
          ...(capabilities !== undefined && {
            capabilities,
            ...(x &&
              (r
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
    ...(e.preferredContract !== undefined && {
      preferredContract: e.preferredContract,
    }),
    ...(w !== undefined && {
      stored: w,
    }),
  };
}
//@ chunk-06y4szbn.js:149805-149998 placement
function typeInstanceFields(e) {
  let n = e.typeInstance === true ? typeLockFromWire(e.type) : undefined;
  return e.typeInstance === false || (n !== undefined && (n.latest === undefined || n.latest === n.current))
    ? {
        ...(n !== undefined && {
          typeLock: n,
        }),
        readBackEchoed: true,
      }
    : {};
}
//@ chunk-06y4szbn.js:149998-150305 placement
/**
 * artifact 列表条目的 schema（slug/title/favicon/rel/更新时间/星标/外部可能写入）与列表上限、响应体 4 MB 上限。
 */
var artifactListEntrySchema = DoctorLazy(() =>
  u({
    slug: string().regex(ARTIFACT_SLUG_RE),
    title: string().max(4000).optional(),
    favicon: unknown().optional(),
    rel: string(),
    updatedAt: string().regex(ISO_TIMESTAMP_RE).optional().catch(undefined),
    softDeleted: M().optional(),
    starred: M().optional().catch(undefined),
    outsidersMayHaveWritten: literal(true)
      .optional()
      .catch((error) => (isMeaningfulFlag(error.input) ? true : undefined)),
  }),
);
var LIST_LIMIT_MAX_ARTIFACTS = LIST_LIMIT_MAX;
var MAX_LIST_RESPONSE_BYTES = 4194304;
//@ chunk-06y4szbn.js:150305-152997 placement
async function listArtifacts(e, n) {
  let { scope = "mine", pins = false, signal, credentials } = n;
  let y =
    scope === "mine"
      ? undefined
      : listExternalArtifacts({
          credentials,
          ...(signal && {
            signal,
          }),
        });
  let x;
  for (let idx = 0; ; idx++) {
    try {
      x = await frameApi.get(`/api/frame/frames?limit=${LIST_LIMIT_MAX_ARTIFACTS}`, {
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
    if (x.ok && x.status >= 500 && idx === 0 && !signal?.aborted) {
      await sleep(300 + Math.random() * 500);
      continue;
    }
    break;
  }
  let wire = wireOf(x);
  if (!x.ok) {
    logFeatureBad("artifact_list", "not_ok", {
      wire,
    });
    return {
      err:
        x.reason === "no-auth"
          ? describeArtifactAuthFailure(x.detail)
          : `artifact listing unavailable: ${x.reason}`,
      reason: "not_ok",
    };
  }
  if (!x.fromFrame) {
    logFeatureBad("artifact_list", "relay_error", {
      wire,
    });
    return {
      err: `artifact listing failed (relay HTTP ${x.status})`,
      reason: "relay_error",
    };
  }
  if (x.status < 200 || x.status >= 300) {
    let ie = x.status >= 500 ? "http_5xx" : "http_4xx";
    logFeatureBad("artifact_list", ie, {
      wire,
    });
    return {
      err: `artifact listing failed (HTTP ${x.status})`,
      reason: ie,
    };
  }
  let R = frameListResponseSchema().safeParse(x.data);
  if (!R.success) {
    logFeatureBad("artifact_list", "malformed_body", {
      wire,
    });
    return {
      err: "artifact listing failed: malformed response",
      reason: "malformed_body",
    };
  }
  let frames = R.data.frames ?? [];
  let k = R.data.starsEnabled === true;
  let V = [];
  let L = new Set();
  let q = 0;
  let W = 0;
  let G = false;
  let P = false;
  for (let frame of frames) {
    let Z = artifactListEntrySchema().safeParse(frame);
    if (!Z.success) {
      W++;
      continue;
    }
    let { slug, title, rel, updatedAt, softDeleted, starred, outsidersMayHaveWritten } = Z.data;
    if (isKnownRel(rel)) {
      if (rel !== "mine") G = true;
      else if (G) P = true;
    }
    let De = vetForeignFavicon(Z.data.favicon);
    if (softDeleted === true || !isKnownRel(rel)) continue;
    if (scope !== "all" && rel !== scope) continue;
    L.add(slug);
    q++;
    if (V.length >= e) continue;
    let title_2 = sanitizeDisplayTitle(title ?? "") ?? "Untitled";
    V.push({
      title: title_2,
      url: artifactViewerUrl(slug),
      ...(De !== undefined &&
        rel === "mine" && {
          favicon: De,
        }),
      ...(updatedAt !== undefined && {
        updatedAt,
      }),
      ...(scope !== "mine" && {
        rel,
      }),
      ...(pins &&
        k &&
        starred === true && {
          pinned: true,
        }),
      ...(rel === "mine" &&
        outsidersMayHaveWritten === true && {
          outsidersMayHaveWritten,
        }),
    });
  }
  if (frames.length > 0 && V.length === 0 && W === frames.length) {
    logFeatureBad("artifact_list", "all_rows_dropped", {
      wire,
    });
    return {
      err: "artifact listing failed: response rows were unreadable",
      reason: "all_rows_dropped",
    };
  }
  let j = await y;
  for (let ie of j?.listed ? j.rows : []) {
    if (L.has(ie.slug)) continue;
    L.add(ie.slug);
    q++;
    if (V.length >= e) continue;
    V.push({
      title: sanitizeDisplayTitle(ie.title ?? "") ?? "Untitled",
      url: artifactViewerUrl(ie.slug),
      rel: "shared",
      external: true,
      ...(ie.role !== undefined && {
        role: ie.role,
      }),
    });
  }
  logFeatureOk("artifact_list", {
    wire,
  });
  if (scope !== "mine")
    logFeatureOk(scope === "shared" ? "artifact_list_scope_shared" : "artifact_list_scope_all");
  let X = G && !P;
  let ge =
    (frames.length >= LIST_LIMIT_MAX_ARTIFACTS && !(scope === "mine" && X)) ||
    W > 0 ||
    (scope !== "mine" && j?.listed === true && j.mayHaveMore);
  return {
    err: null,
    rows: V,
    total: q,
    totalAtLeast: ge,
    truncated: V.length < q || ge,
    ...(pins && {
      pinsEnabled: k,
    }),
    ...(j?.listed === true && {
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
