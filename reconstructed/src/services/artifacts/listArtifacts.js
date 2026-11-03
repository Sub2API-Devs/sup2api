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
import { u, A, oe, M, o, pe, E, T } from "../../../vendor/zod/v4/classic/schemas.js";
import { regExp as regExp_6, aK } from "./textSanitize.js";
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
var ARTIFACT_LIST_SCOPES = ["mine", "shared", "all"],
  Nc = DoctorLazy(() =>
    u({
      frames: A(oe()).nullable(),
      starsEnabled: M()
        .optional()
        .catch(void 0),
    }),
  ),
  Mc = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;
//@ chunk-06y4szbn.js:147585-147764 placement
function echoAudience(e, n) {
  let r = e === "" || (typeof e === "string" && regExp_6.test(e)) ? e : void 0,
    s = n === "" || (typeof n === "string" && VER_SHAPE.test(n)) ? n : void 0;
  return { read: n === void 0 || s !== void 0 ? r : void 0, shared: s };
}
//@ chunk-06y4szbn.js:147764-148214 placement
var publishResponseSchema = DoctorLazy(() =>
  u({
    slug: o().regex(ARTIFACT_SLUG_RE),
    version: o().regex(VER_SHAPE),
    read: oe().optional(),
    shared: oe().optional(),
    kind: o()
      .regex(regExp_6)
      .optional()
      .catch(void 0),
    contract: o()
      .regex(CONTRACT_VERSION_REGEX)
      .optional()
      .catch(void 0),
    preferredContract: o()
      .regex(CONTRACT_VERSION_REGEX)
      .optional()
      .catch(void 0),
    capabilities: pe(o().max(64), oe())
      .optional()
      .catch(void 0),
    typeInstance: M()
      .optional()
      .catch(void 0),
    type: oe().optional(),
    ...liveHeadFieldSchemas(),
    ...mergeFieldSchemas(),
  }).transform(({ read: read, shared: shared, ...r }) => ({ ...r, ...echoAudience(read, shared) })),
);
//@ chunk-06y4szbn.js:148214-148445 placement
function liveHeadFieldSchemas() {
  return {
    seq: E()
      .int()
      .nonnegative()
      .optional()
      .catch(void 0),
    deadline: u({ until: E().int().positive().max(MAX_EPOCH_MS) })
      .optional()
      .catch(void 0),
    unchanged: T(!0)
      .optional()
      .catch(void 0),
    replayed: T(!0)
      .optional()
      .catch(void 0),
  };
}
//@ chunk-06y4szbn.js:148445-148691 placement
function mergeFieldSchemas() {
  return {
    appliedOver: o()
      .regex(VER_SHAPE)
      .optional()
      .catch(void 0),
    mergedFrom: o()
      .regex(VER_SHAPE)
      .optional()
      .catch(void 0),
    changed: A(
      u({
        path: o().min(1).max(MAX_ECHO_MANIFEST_PATH),
        sha256: o()
          .regex(/^[0-9a-f]{64}$/)
          .nullable(),
      }),
    )
      .max(2 * MAX_ECHO_MANIFEST_ENTRIES)
      .optional()
      .catch(void 0),
  };
}
//@ chunk-06y4szbn.js:148691-148831 placement
function isMergedResponse(e) {
  if (typeof e !== "object" || e === null || !("mergedFrom" in e)) return !1;
  let { mergedFrom: mergedFrom } = e;
  return typeof mergedFrom === "string" ? mergedFrom !== "" : mergedFrom != null;
}
//@ chunk-06y4szbn.js:148831-149081 placement
function mergedChangesFields(e, n, r) {
  let mergedFrom = e.mergedFrom;
  if (mergedFrom === void 0 || mergedFrom !== n || mergedFrom === e.version || mergedFrom === e.appliedOver)
    return {};
  let h = e.changed?.filter((b) => !r.has(b.path));
  return {
    mergedOver: {
      base: mergedFrom,
      ...(e.appliedOver !== void 0 && { live: e.appliedOver }),
      ...(h !== void 0 && { changed: h }),
    },
  };
}
//@ chunk-06y4szbn.js:149081-149199 placement
function mergedTelemetry(e) {
  if (e === void 0) return {};
  return { merged_over: !0, ...(e.changed !== void 0 && { merged_changed: e.changed.length }) };
}
//@ chunk-06y4szbn.js:149199-149223 placement
var MAX_EPOCH_MS = 253402300799999;
//@ chunk-06y4szbn.js:149223-149386 placement
function publishEchoFields(e, n) {
  return {
    ...(e.seq !== void 0 && { seq: e.seq }),
    ...(n && e.deadline !== void 0 && { deadline: { until: e.deadline.until } }),
    ...(e.unchanged && !e.replayed && { unchanged: !0 }),
  };
}
//@ chunk-06y4szbn.js:149386-149805 placement
function capabilitiesEchoFields(e, n, r = !1) {
  let s = "contract" in n ? n.contract : void 0,
    h = e.contract ?? s,
    capabilities = e.capabilities,
    y = isNonEmptyObject(capabilities),
    x = !("capabilities" in n) && y,
    w =
      e.contract !== void 0 && (y || parseContractVersion(e.contract) !== null)
        ? {
            contract: e.contract,
            ...(capabilities !== void 0 && {
              capabilities: capabilities,
              ...(x && (r ? { declaredByRoute: !0 } : { carried: !0 })),
            }),
          }
        : void 0;
  return {
    ...(h !== void 0 && { contract: h }),
    ...(e.preferredContract !== void 0 && { preferredContract: e.preferredContract }),
    ...(w !== void 0 && { stored: w }),
  };
}
//@ chunk-06y4szbn.js:149805-149998 placement
function typeInstanceFields(e) {
  let n = e.typeInstance === !0 ? typeLockFromWire(e.type) : void 0;
  return e.typeInstance === !1 || (n !== void 0 && (n.latest === void 0 || n.latest === n.current))
    ? { ...(n !== void 0 && { typeLock: n }), readBackEchoed: !0 }
    : {};
}
//@ chunk-06y4szbn.js:149998-150305 placement
var artifactListEntrySchema = DoctorLazy(() =>
    u({
      slug: o().regex(ARTIFACT_SLUG_RE),
      title: o().max(4000).optional(),
      favicon: oe().optional(),
      rel: o(),
      updatedAt: o()
        .regex(Mc)
        .optional()
        .catch(void 0),
      softDeleted: M().optional(),
      starred: M()
        .optional()
        .catch(void 0),
      outsidersMayHaveWritten: T(!0)
        .optional()
        .catch((e) => (aK(e.input) ? !0 : void 0)),
    }),
  ),
  Fs = LIST_LIMIT_MAX,
  Dc = 4194304;
//@ chunk-06y4szbn.js:150305-152997 placement
async function listArtifacts(e, n) {
  let { scope: scope = "mine", pins: pins = !1, signal: signal, credentials: credentials } = n,
    y =
      scope === "mine"
        ? void 0
        : listExternalArtifacts({ credentials: credentials, ...(signal && { signal: signal }) }),
    x;
  for (let ie = 0; ; ie++) {
    try {
      x = await frameApi.get(`/api/frame/frames?limit=${Fs}`, {
        refreshOAuth: !0,
        headers: buildFrameHeaders(),
        timeout: 15000,
        maxContentLength: Dc,
        ...(signal && { signal: signal }),
        credentials: credentials,
      });
    } catch (error) {
      if (ie === 0 && !signal?.aborted) {
        await sleep(300 + Math.random() * 500);
        continue;
      }
      if (!signal?.aborted) logFeatureBad("artifact_list", "request_error", { wire: wireOfThrow(error) });
      return { err: `artifact listing failed: ${errorMessage(error)}`, reason: "request_error" };
    }
    if (x.ok && x.status >= 500 && ie === 0 && !signal?.aborted) {
      await sleep(300 + Math.random() * 500);
      continue;
    }
    break;
  }
  let w = wireOf(x);
  if (!x.ok)
    return (
      logFeatureBad("artifact_list", "not_ok", { wire: w }),
      {
        err:
          x.reason === "no-auth"
            ? describeArtifactAuthFailure(x.detail)
            : `artifact listing unavailable: ${x.reason}`,
        reason: "not_ok",
      }
    );
  if (!x.fromFrame)
    return (
      logFeatureBad("artifact_list", "relay_error", { wire: w }),
      { err: `artifact listing failed (relay HTTP ${x.status})`, reason: "relay_error" }
    );
  if (x.status < 200 || x.status >= 300) {
    let ie = x.status >= 500 ? "http_5xx" : "http_4xx";
    return (
      logFeatureBad("artifact_list", ie, { wire: w }),
      { err: `artifact listing failed (HTTP ${x.status})`, reason: ie }
    );
  }
  let safeParse = Nc().safeParse(x.data);
  if (!safeParse.success)
    return (
      logFeatureBad("artifact_list", "malformed_body", { wire: w }),
      { err: "artifact listing failed: malformed response", reason: "malformed_body" }
    );
  let C = safeParse.data.frames ?? [],
    k = safeParse.data.starsEnabled === !0,
    V = [],
    L = new Set(),
    q = 0,
    W = 0,
    G = !1,
    P = !1;
  for (let ie of C) {
    let safeParse = artifactListEntrySchema().safeParse(ie);
    if (!safeParse.success) {
      W++;
      continue;
    }
    let {
      slug: slug,
      title: title,
      rel: rel,
      updatedAt: updatedAt,
      softDeleted: softDeleted,
      starred: starred,
      outsidersMayHaveWritten: outsidersMayHaveWritten,
    } = safeParse.data;
    if (isKnownRel(rel)) {
      if (rel !== "mine") G = !0;
      else if (G) P = !0;
    }
    let De = vetForeignFavicon(safeParse.data.favicon);
    if (softDeleted === !0 || !isKnownRel(rel)) continue;
    if (scope !== "all" && rel !== scope) continue;
    if ((L.add(slug), q++, V.length >= e)) continue;
    let ze = sanitizeDisplayTitle(title ?? "") ?? "Untitled";
    V.push({
      title: ze,
      url: artifactViewerUrl(slug),
      ...(De !== void 0 && rel === "mine" && { favicon: De }),
      ...(updatedAt !== void 0 && { updatedAt: updatedAt }),
      ...(scope !== "mine" && { rel: rel }),
      ...(pins && k && starred === !0 && { pinned: !0 }),
      ...(rel === "mine" &&
        outsidersMayHaveWritten === !0 && { outsidersMayHaveWritten: outsidersMayHaveWritten }),
    });
  }
  if (C.length > 0 && V.length === 0 && W === C.length)
    return (
      logFeatureBad("artifact_list", "all_rows_dropped", { wire: w }),
      { err: "artifact listing failed: response rows were unreadable", reason: "all_rows_dropped" }
    );
  let j = await y;
  for (let ie of j?.listed ? j.rows : []) {
    if (L.has(ie.slug)) continue;
    if ((L.add(ie.slug), q++, V.length >= e)) continue;
    V.push({
      title: sanitizeDisplayTitle(ie.title ?? "") ?? "Untitled",
      url: artifactViewerUrl(ie.slug),
      rel: "shared",
      external: !0,
      ...(ie.role !== void 0 && { role: ie.role }),
    });
  }
  if ((logFeatureOk("artifact_list", { wire: w }), scope !== "mine"))
    logFeatureOk(scope === "shared" ? "artifact_list_scope_shared" : "artifact_list_scope_all");
  let X = G && !P,
    ge =
      (C.length >= Fs && !(scope === "mine" && X)) ||
      W > 0 ||
      (scope !== "mine" && j?.listed === !0 && j.mayHaveMore);
  return {
    err: null,
    rows: V,
    total: q,
    totalAtLeast: ge,
    truncated: V.length < q || ge,
    ...(pins && { pinsEnabled: k }),
    ...(j?.listed === !0 && { externalListed: !0 }),
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
