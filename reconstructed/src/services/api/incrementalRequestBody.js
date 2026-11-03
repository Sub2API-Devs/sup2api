/**
 * services/api/incrementalRequestBody.ts
 *
 * 2.1.316 新增：增量序列化请求体并在发送前校验字节一致
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (17)
 * attribution: placement 17
 */
import {
  createHash,
  createHash as createHash_2,
  createHash as createHash_3,
  createHash as createHash_4,
  createHash as createHash_5,
  createHash as createHash_6,
  createHash as createHash_7,
  createHash as createHash_8,
  createHash as createHash_9,
  createHash as createHash_10,
  createHash as createHash_11,
  createHash as createHash_12,
  createHash as createHash_13,
  createHash as createHash_14,
  createHash as createHash_15,
  createHash as createHash_16,
  createHash as createHash_17,
  createHash as createHash_18,
  createHash as createHash_19,
  createHash as createHash_20,
  createHash as createHash_21,
  createHash as createHash_22,
  createHash as createHash_23,
  createHash as createHash_24,
} from "crypto";
import {
  fetchWithRequestBodyCompression,
  getGzipRequestBodyBlocksMode,
  hasFinalAnswerRoute,
  scheduleIdleDrop,
} from "./gzipRequestBody.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../analytics/growthbook.js";
import { TENGU_PLAID_KETTLE } from "./withRetry.js";
import { xr } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { jsonStringifyRaw } from "../../utils/slowOperations.js";
import { Nis } from "../analytics/eventSerialization.js";
import { Aa } from "../../utils/sleep.js";
import { env } from "../../utils/env.js";
import { Ws } from "./streamFallbackWarning.js";
import { getAPIProvider } from "../../utils/model/providers.js";
import { logFeatureBad, logFeatureOk, logFeatureSad } from "../analytics/featureTelemetry.js";
import { logForDiagnosticsNoPII } from "../../utils/diagLogs.js";
import { logError } from "../../utils/log.js";
import { toError } from "../../utils/errors.js";
import { getSessionId } from "../../bootstrap/state.js";
import { Ot } from "../../../vendor/@anthropic-ai/sdk/core/error.mjs";

//@ chunk-e6aww6q8.js:2574793-2574841 placement
var ycn = Symbol("takes a request body as bytes");
//@ chunk-e6aww6q8.js:2574841-2574897 placement
function SXn(e) {
  Object.defineProperty(e, ycn, { value: !0 });
}
//@ chunk-e6aww6q8.js:2574897-2574950 placement
function oGr(e) {
  return e === void 0 || e === fetchWithRequestBodyCompression || ycn in e;
}
//@ chunk-e6aww6q8.js:2574988-2575032 placement
var TENGU_SOFT_KURZWEIL = "tengu_soft_kurzweil",
  Bhr = 3,
  Uhr = 0.1;
//@ chunk-e6aww6q8.js:2575032-2575107 placement
function jhr() {
  let e = getFeatureValue_CACHED_MAY_BE_STALE(TENGU_PLAID_KETTLE, 1);
  return typeof e === "number" && e >= 0.1 && e <= 1 ? e : 1;
}
//@ chunk-e6aww6q8.js:2575107-2575136 placement
var RQe = Symbol("not copied");
//@ chunk-e6aww6q8.js:2575136-2575203 placement
function CQe(e) {
  return Object.getPrototypeOf(e) === Object.prototype;
}
//@ chunk-e6aww6q8.js:2575203-2575362 placement
function jsonShape(e) {
  if (typeof e !== "object" || e === null) return e;
  if ("toJSON" in e) return RQe;
  if (Array.isArray(e)) return e.map(jsonShape);
  return CQe(e) ? xr(e, (n) => jsonShape(n)) : RQe;
}
//@ chunk-e6aww6q8.js:2575362-2575460 placement
function Scn(e) {
  if (typeof e !== "object" || e === null) return e === RQe;
  return Object.values(e).some(Scn);
}
/**
 * 比较两个 JSON 值的结构与键顺序是否完全一致（右侧含 toJSON 视为不同）。
 */
//@ chunk-e6aww6q8.js:2575460-2575907 placement
function sameJsonShape(e, n) {
  if (typeof e !== "object" || e === null || typeof n !== "object" || n === null) return e === n;
  if ("toJSON" in n) return !1;
  if (Array.isArray(e)) {
    if (!Array.isArray(n) || e.length !== n.length) return !1;
    for (let h = 0; h < e.length; h++) if (!sameJsonShape(e[h], n[h])) return !1;
    return !0;
  }
  if (Array.isArray(n) || !CQe(e) || !CQe(n)) return !1;
  let keys = Object.keys(e),
    keys_2 = Object.keys(n);
  if (keys.length !== keys_2.length) return !1;
  for (let [h, y] of keys.entries()) if (y !== keys_2[h] || !sameJsonShape(e[y], n[y])) return !1;
  return !0;
}
//@ chunk-e6aww6q8.js:2575907-2576014 placement
function serializeKeys(e, n) {
  return n
    .flatMap((r) => {
      let s = jsonStringifyRaw(e[r]);
      return s === void 0 ? [] : [`${jsonStringifyRaw(r)}:${s}`];
    })
    .join(",");
}
/**
 * 增量序列化请求体：复用上次已序列化的消息前缀，只追加新消息。
 */
//@ chunk-e6aww6q8.js:2576014-2577540 placement
function serializeRequestBodyIncrementally(e, n) {
  let messages = e.messages;
  if (
    !Array.isArray(messages) ||
    "toJSON" in e ||
    [...Object.values(e), ...messages].some((lt) => typeof lt === "object" && lt !== null && "toJSON" in lt)
  )
    return;
  let keys = Object.keys(e),
    h = serializeKeys(e, keys.slice(0, keys.indexOf("messages"))),
    y = serializeKeys(e, keys.slice(keys.indexOf("messages") + 1)),
    S = `{${h}${h === "" ? "" : ","}"messages":[`,
    w = `]${y === "" ? "" : ","}${y}}`,
    L = n?.keptBody?.inUse === !0 ? void 0 : n,
    G = L?.keptBody?.opening === S ? L.keptBody : void 0,
    q = 0;
  if (G !== void 0) {
    let min = Math.min(G.shapes.length, messages.length);
    while (q < min && sameJsonShape(G.shapes[q], messages[q])) q++;
  }
  let Z = G === void 0 || q === 0 ? Buffer.byteLength(S) : (G.ends[q - 1] ?? 0),
    Se = L === void 0 ? [] : Array.from(messages.slice(q), jsonShape),
    list = Array.from(messages.slice(q), (lt, Je) => {
      let nt = L === void 0 || Scn(Se[Je]) ? lt : Se[Je];
      return jsonStringifyRaw(nt) ?? "null";
    }),
    we = Z + list.reduce((lt, Je) => lt + 1 + Buffer.byteLength(Je), 0) + Buffer.byteLength(w) + Nis,
    Ee = G?.memory;
  if (Ee === void 0 || Ee.length < we || Ee.length > 2 * we)
    if (((Ee = Buffer.allocUnsafeSlow(L === void 0 ? we : we + (we >> 2))), G === void 0)) Ee.write(S, 0);
    else G.memory.copy(Ee, 0, 0, Z);
  let Ae = G === void 0 ? [] : G.ends.slice(0, q),
    Ie = G === void 0 ? [] : G.charEnds.slice(0, q),
    Me = Ie.at(-1) ?? 0,
    We = Z,
    ze = Ie.at(-1) ?? S.length;
  for (let lt of list) {
    if (Ae.length > 0) ((We += Ee.write(",", We)), ze++);
    ((We += Ee.write(lt, We)), (ze += lt.length), Ae.push(We), Ie.push(ze));
  }
  if (((We += Ee.write(w, We)), L !== void 0))
    L.keptBody = {
      memory: Ee,
      opening: S,
      shapes: [...(G === void 0 ? [] : G.shapes.slice(0, q)), ...Se],
      ends: Ae,
      charEnds: Ie,
      length: We,
      blockDigests: G === void 0 ? new Map() : G.blockDigests,
      digestedBytes: G === void 0 ? 0 : Math.min(G.digestedBytes, Z),
      inUse: !0,
    };
  return { bytes: Ee.subarray(0, We), chars: ze + w.length, keptChars: Me };
}
/**
 * 发送前校验增量请求体与完整序列化结果字节一致，不一致时回退并记录。
 */
//@ chunk-e6aww6q8.js:2577540-2578848 placement
function checkIncrementalRequestBody(e, n, r = Aa) {
  let s = env.CLAUDE_CODE_INCREMENTAL_REQUEST_BODY ?? 0,
    h = s !== 0 && getFeatureValue_CACHED_MAY_BE_STALE(TENGU_SOFT_KURZWEIL, !0) === !0 ? s : 0,
    y = Ws(),
    gzipRequestBody = y.gzipRequestBody,
    w = h === 2 && getGzipRequestBodyBlocksMode() !== 0 && !gzipRequestBody.blocksSwitchedOff;
  if (!w && gzipRequestBody.blockStore.keptBody?.inUse === !1) gzipRequestBody.blockStore.keptBody = void 0;
  if (h === 0) return;
  if (
    gzipRequestBody.bodyBytesSwitchedOff ||
    getAPIProvider() !== "firstParty" ||
    hasFinalAnswerRoute() ||
    e.output_format !== void 0
  )
    return;
  try {
    let { betas: betas, user_profile_id: user_profile_id, workspace_id: workspace_id, ...Z } = e,
      Se = w && n,
      ke = serializeRequestBodyIncrementally(Z, Se ? gzipRequestBody.blockStore : void 0);
    if (ke === void 0) return;
    if (Se && gzipRequestBody.blockStore.cancelIdleDrop === void 0)
      scheduleIdleDrop(gzipRequestBody.blockStore, r);
    let we = !1,
      Ee = gzipRequestBody.blockStore.keptBody?.memory.buffer === ke.bytes.buffer,
      Ae = we || !Ee ? 1 : jhr(),
      Ie =
        ke.keptChars > 0 &&
        (gzipRequestBody.firstReusingBodiesDraw ??= randomSample()) < Ae &&
        gzipRequestBody.reusingBodiesChecked < Bhr,
      Me = we || Ie || Math.random() < Uhr * Ae;
    if (Ie) gzipRequestBody.reusingBodiesChecked++;
    if (Me && !bufferEqualsJson(ke.bytes, Z)) {
      (xQe(),
        logFeatureBad("api_incremental_request_body", "wrong_bytes_caught_before_send", { mode: h }),
        logForDiagnosticsNoPII("error", "api_incremental_request_body_wrong_bytes_caught_before_send", {
          mode: h,
        }));
      return;
    }
    if (y.once("incremental_request_body_ok")) logFeatureOk("api_incremental_request_body", { mode: h });
    return (
      gzipRequestBody.serialisedBodies.set(ke.bytes.buffer, {
        chars: ke.chars,
        keptChars: ke.keptChars,
        checked: Me,
      }),
      ke.bytes
    );
  } catch (error) {
    (logError(toError(error)),
      xQe(),
      logFeatureSad("api_incremental_request_body", "serialising_threw", { mode: h }),
      logForDiagnosticsNoPII("warn", "api_incremental_request_body_serialising_threw", { mode: h }));
    return;
  }
}
//@ chunk-e6aww6q8.js:2578848-2578964 placement
function randomSample() {
  return (
    createHash_17("sha256").update(`${getSessionId()} ${process.hrtime.bigint()}`).digest().readUInt32BE(0) /
    4294967296
  );
}
//@ chunk-e6aww6q8.js:2578964-2579030 placement = resolveMotion (0.719)
function bufferEqualsJson(e, n) {
  return e.equals(Buffer.from(JSON.stringify(n)));
}
//@ chunk-e6aww6q8.js:2579030-2579127 placement
function xQe() {
  let gzipRequestBody = Ws().gzipRequestBody;
  ((gzipRequestBody.bodyBytesSwitchedOff = !0), (gzipRequestBody.blockStore.keptBody = void 0));
}
//@ chunk-e6aww6q8.js:2579127-2579785 placement
async function reportIncrementalBodyMismatch(e, n, r) {
  let blockStore = Ws().gzipRequestBody.blockStore,
    h = e !== void 0 && e.buffer === blockStore.keptBody?.memory.buffer ? blockStore.keptBody : void 0;
  try {
    return await r();
  } catch (error) {
    if (
      h !== void 0 &&
      error instanceof Ot &&
      error.status !== void 0 &&
      error.status >= 400 &&
      error.status < 500 &&
      error.status !== 401 &&
      error.status !== 429
    )
      try {
        if (blockStore.keptBody === h) blockStore.keptBody = void 0;
        let S = Buffer.byteLength(h.opening) - 1,
          chunk = h.memory.subarray(S, (h.ends.at(-1) ?? S + 1) + 1);
        if (sameJsonShape(h.shapes, n.messages) && !bufferEqualsJson(chunk, n.messages))
          (xQe(),
            logFeatureBad("api_incremental_request_body", "wrong_bytes_sent", { status: error.status }),
            logForDiagnosticsNoPII("error", "api_incremental_request_body_wrong_bytes_sent", {
              status: error.status,
            }));
      } catch (error) {
        logError(toError(error));
      }
    throw error;
  } finally {
    if (h !== void 0) h.inUse = !1;
  }
}

export { oGr, checkIncrementalRequestBody, reportIncrementalBodyMismatch, SXn };
