/**
 * services/artifacts/externalList.ts
 *
 * 2.1.316 新增：列出外部 artifact
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-06y4szbn.js (2)
 * attribution: placement 2
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import { create, create_15, create_12, create_2, create_26 } from "../../../vendor/zod/lib/index.mjs";
import { ARTIFACT_SLUG_RE } from "../../tools/ArtifactTool/constants.js";
import { SHARE_ROLES } from "./leftOutFiles.js";
import { logFeatureSad, logFeatureOk } from "../analytics/featureTelemetry.js";
import { createCombinedAbortSignal } from "../../utils/combinedAbortSignal.js";
import { frameApi } from "./frameRelay.js";
import { buildFrameHeaders } from "./frameApi.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-06y4szbn.js:40305-40483 placement
/**
 * 外部 artifact 列表接口的常量（响应大小、条数、超时）与响应/行 schema（slug、标题、共享角色）。
 */
var MAX_EXTERNAL_LIST_BYTES; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var EXTERNAL_LIST_LIMIT;
var EXTERNAL_LIST_TIMEOUT_MS;
var EXTERNAL_LIST_SCHEMA;
var EXTERNAL_ROW_SCHEMA;
deferInit("chunk-06y4szbn.js:40305", () => {
  MAX_EXTERNAL_LIST_BYTES = 1048576;
  EXTERNAL_LIST_LIMIT = 50;
  EXTERNAL_LIST_TIMEOUT_MS = 5000;
  EXTERNAL_LIST_SCHEMA = DoctorLazy(() =>
    create({
      frames: create_15(create_12()).nullable(),
    }),
  );
  EXTERNAL_ROW_SCHEMA = DoctorLazy(() =>
    create({
      slug: create_2().regex(ARTIFACT_SLUG_RE),
      title: create_2().max(4000).optional(),
      role: create_26(SHARE_ROLES).optional().catch(undefined),
    }),
  );
});
//@ chunk-06y4szbn.js:40483-41496 placement
/**
 * 列出外部组织共享给用户的 artifact（/api/frame/frames/external）。
 */
async function listExternalArtifacts(request) {
  let fail = (reason, status) => {
    if (!request.signal?.aborted)
      logFeatureSad("artifact_list_external", reason, {
        ...(status !== undefined && {
          status,
        }),
      });
    return {
      listed: false,
    };
  };
  let combinedAbortSignal = createCombinedAbortSignal(request.signal, {
    timeoutMs: EXTERNAL_LIST_TIMEOUT_MS,
  });
  let response;
  try {
    response = await frameApi.getRelayBound("/api/frame/frames/external", {
      refreshOAuth: true,
      credentials: request.credentials,
      headers: buildFrameHeaders(),
      timeout: EXTERNAL_LIST_TIMEOUT_MS,
      maxContentLength: MAX_EXTERNAL_LIST_BYTES,
      signal: combinedAbortSignal.signal,
    });
  } catch {
    return fail("request_error");
  } finally {
    combinedAbortSignal.cleanup();
  }
  if (!response.ok)
    return fail(
      response.reason === "relay-unavailable" || response.reason === "relay-not-served" ? "unsent" : "not_ok",
      "status" in response ? response.status : undefined,
    );
  if (!response.fromFrame) return fail("relay_error", response.status);
  if (response.status < 200 || response.status >= 300) return fail("refused", response.status);
  let parsed = EXTERNAL_LIST_SCHEMA().safeParse(response.data);
  if (!parsed.success) return fail("malformed_body");
  let rows = [];
  let frames = parsed.data.frames ?? [];
  for (let frame of frames) {
    let rowParsed = EXTERNAL_ROW_SCHEMA().safeParse(frame);
    if (!rowParsed.success) continue;
    rows.push({
      slug: rowParsed.data.slug,
      ...(rowParsed.data.title !== undefined && {
        title: rowParsed.data.title,
      }),
      ...(rowParsed.data.role !== undefined && {
        role: rowParsed.data.role,
      }),
    });
  }
  logFeatureOk("artifact_list_external", {
    rows: rows.length,
  });
  return {
    listed: true,
    rows,
    mayHaveMore: frames.length >= EXTERNAL_LIST_LIMIT || rows.length < frames.length,
  };
}
export { listExternalArtifacts };
