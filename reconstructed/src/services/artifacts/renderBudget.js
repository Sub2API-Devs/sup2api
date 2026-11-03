/**
 * services/artifacts/renderBudget.ts
 *
 * 2.1.316 新增：渲染预算（嵌入、文档、警告）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-06y4szbn.js (11)
 * attribution: placement 11
 */
import { READ_BACK_LIMITS, floored } from "./readBack.js";
import { sanitizeDisplayTextOrUndefined } from "./capabilityDeclaration.js";
import { artifactDocsOrFiles, ARTIFACT_DOC_PATH_RE } from "./artifactToolGates.js";
import { echoManifestSchema } from "./pagePreparation.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, array, unknown, string, M, E } from "../../../vendor/zod/v4/classic/schemas.js";
import { ARTIFACT_SLUG_RE } from "../../tools/ArtifactTool/constants.js";
import { SAFE_LABEL_RE } from "./textSanitize.js";

//@ chunk-06y4szbn.js:65657-65891 placement
function renderWarnings(e) {
  let warnings = e !== null && typeof e === "object" ? e.warnings : undefined;
  if (!Array.isArray(warnings)) return [];
  let r = [];
  for (let warning of warnings) {
    if (r.length >= READ_BACK_LIMITS) break;
    if (typeof warning !== "string") continue;
    let h = sanitizeDisplayTextOrUndefined(warning, floored);
    if (h !== undefined) r.push(parseRenderBudgetReason(h) ?? h);
  }
  return r;
}
//@ chunk-06y4szbn.js:65891-66058 placement
function parseRenderBudgetReason(e) {
  if (/^live_over_budget:(.{1,1024})$/.exec(e)) return e;
  if (/^render_unavailable:(.{1,1024})$/.exec(e)) return e;
  if (e === "render_over_budget") return e;
  return;
}
//@ chunk-06y4szbn.js:66058-66498 placement
function renderDocs(e) {
  let n = e !== null && typeof e === "object" && "docs" in e ? artifactDocsOrFiles(e) : undefined;
  if (n !== undefined)
    return n
      .map((s) => ({
        path: s.path,
        ...(s.doc !== undefined && {
          doc: s.doc,
        }),
      }))
      .sort((s, h) => (s.path < h.path ? -1 : s.path > h.path ? 1 : 0));
  let r = echoManifestSchema().safeParse(e);
  if (!r.success) return;
  return Object.entries(r.data.manifest)
    .flatMap(([key, value]) =>
      ARTIFACT_DOC_PATH_RE.test(key) && value.src == null && typeof value.doc === "string" && value.doc !== ""
        ? [
            {
              path: key,
              doc: value.doc,
            },
          ]
        : [],
    )
    .sort((s, h) => (s.path < h.path ? -1 : s.path > h.path ? 1 : 0));
}
//@ chunk-06y4szbn.js:66498-66539 placement
/**
 * 渲染输出转换的占位实现（本构建中均返回空数组）。
 */
function embedsToDocs(e) {
  return e.flatMap((n) => []);
}
//@ chunk-06y4szbn.js:66539-66562 placement
function emptyList() {
  return [];
}
//@ chunk-06y4szbn.js:66562-66603 placement
function pinsToDocs(e) {
  return e.flatMap((n) => []);
}
//@ chunk-06y4szbn.js:66603-66629 placement
function warningsToDocs(detach, n) {
  return [];
}
//@ chunk-06y4szbn.js:66629-66670 placement
function docsToDocs(e) {
  return e.flatMap((n) => []);
}
//@ chunk-06y4szbn.js:66670-66741 placement
function newWarnings(e, n) {
  return (e ?? []).filter((r) => !n.has(r)).flatMap((r) => []);
}
//@ chunk-06y4szbn.js:66741-67153 placement
/**
 * 渲染输出限额：32、16 条警告、200 字符来源、路径正则，以及 embeds/pins/warnings 的 schema。
 */
var RENDER_LIMITS = 32;
var MAX_RENDER_WARNINGS = 16;
var MAX_RENDER_SRC_CHARS = 200;
var SAFE_RENDER_PATH_RE = /^[\w./-]{1,64}$/;
var embedsSchema = DoctorLazy(() =>
  u({
    pins: array(unknown()).optional().catch(undefined),
    warnings: array(unknown()).optional().catch(undefined),
  }),
);
var pinSchema = DoctorLazy(() =>
  u({
    uuid: string().regex(ARTIFACT_SLUG_RE),
    path: string().regex(SAFE_RENDER_PATH_RE),
    module: M().optional().catch(undefined),
    files: E().int().min(0).max(1e6).optional().catch(undefined),
  }),
);
var warningSchema = DoctorLazy(() =>
  u({
    src: string().optional().catch(undefined),
    reason: string().regex(SAFE_LABEL_RE),
    count: E().int().min(1).max(1e5).optional().catch(undefined),
  }),
);
//@ chunk-06y4szbn.js:67153-67830 placement
function renderEmbeds(e) {
  if (e === null || typeof e !== "object" || !("embeds" in e) || e.embeds === null || e.embeds === undefined)
    return;
  let n = embedsSchema().safeParse(e.embeds);
  if (!n.success)
    return {
      pins: [],
      warnings: [],
    };
  let r = [];
  for (let h of n.data.pins ?? []) {
    if (r.length >= RENDER_LIMITS) break;
    let b = pinSchema().safeParse(h);
    if (!b.success) continue;
    let { uuid, path, module: w, files } = b.data;
    r.push({
      uuid,
      path,
      module: w === true,
      ...(files !== undefined && {
        files,
      }),
    });
  }
  let s = [];
  for (let h of n.data.warnings ?? []) {
    if (s.length >= MAX_RENDER_WARNINGS) break;
    let b = warningSchema().safeParse(h);
    if (!b.success) continue;
    let { reason, count } = b.data;
    let w =
      b.data.src === undefined ? undefined : sanitizeDisplayTextOrUndefined(b.data.src, MAX_RENDER_SRC_CHARS);
    s.push({
      reason,
      ...(w !== undefined && {
        src: w,
      }),
      ...(count !== undefined && {
        count,
      }),
    });
  }
  return {
    pins: r,
    warnings: s,
  };
}
export {
  renderDocs,
  renderWarnings,
  embedsToDocs,
  newWarnings,
  renderEmbeds,
  pinsToDocs,
  docsToDocs,
  emptyList,
  warningsToDocs,
};
