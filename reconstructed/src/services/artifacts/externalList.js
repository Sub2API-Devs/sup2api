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

//@ chunk-06y4szbn.js:40305-40483 placement
/**
 * 外部 artifact 列表接口的常量（响应大小、条数、超时）与响应/行 schema（slug、标题、共享角色）。
 */
var MAX_EXTERNAL_LIST_BYTES = 1048576;
var EXTERNAL_LIST_LIMIT = 50;
var EXTERNAL_LIST_TIMEOUT_MS = 5000;
var EXTERNAL_LIST_SCHEMA = DoctorLazy(() =>
  create({
    frames: create_15(create_12()).nullable(),
  }),
);
var EXTERNAL_ROW_SCHEMA = DoctorLazy(() =>
  create({
    slug: create_2().regex(ARTIFACT_SLUG_RE),
    title: create_2().max(4000).optional(),
    role: create_26(SHARE_ROLES).optional().catch(undefined),
  }),
);
//@ chunk-06y4szbn.js:40483-41496 placement
/**
 * 列出外部组织共享给用户的 artifact（/api/frame/frames/external）。
 */
async function listExternalArtifacts(e) {
  let n = (x, status) => {
    if (!e.signal?.aborted)
      logFeatureSad("artifact_list_external", x, {
        ...(status !== undefined && {
          status,
        }),
      });
    return {
      listed: false,
    };
  };
  let combinedAbortSignal = createCombinedAbortSignal(e.signal, {
    timeoutMs: EXTERNAL_LIST_TIMEOUT_MS,
  });
  let s;
  try {
    s = await frameApi.getRelayBound("/api/frame/frames/external", {
      refreshOAuth: true,
      credentials: e.credentials,
      headers: buildFrameHeaders(),
      timeout: EXTERNAL_LIST_TIMEOUT_MS,
      maxContentLength: MAX_EXTERNAL_LIST_BYTES,
      signal: combinedAbortSignal.signal,
    });
  } catch {
    return n("request_error");
  } finally {
    combinedAbortSignal.cleanup();
  }
  if (!s.ok)
    return n(
      s.reason === "relay-unavailable" || s.reason === "relay-not-served" ? "unsent" : "not_ok",
      "status" in s ? s.status : undefined,
    );
  if (!s.fromFrame) return n("relay_error", s.status);
  if (s.status < 200 || s.status >= 300) return n("refused", s.status);
  let h = EXTERNAL_LIST_SCHEMA().safeParse(s.data);
  if (!h.success) return n("malformed_body");
  let b = [];
  let frames = h.data.frames ?? [];
  for (let frame of frames) {
    let w = EXTERNAL_ROW_SCHEMA().safeParse(frame);
    if (!w.success) continue;
    b.push({
      slug: w.data.slug,
      ...(w.data.title !== undefined && {
        title: w.data.title,
      }),
      ...(w.data.role !== undefined && {
        role: w.data.role,
      }),
    });
  }
  logFeatureOk("artifact_list_external", {
    rows: b.length,
  });
  return {
    listed: true,
    rows: b,
    mayHaveMore: frames.length >= EXTERNAL_LIST_LIMIT || b.length < frames.length,
  };
}
export { listExternalArtifacts };
