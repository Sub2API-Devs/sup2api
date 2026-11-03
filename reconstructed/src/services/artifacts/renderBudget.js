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
import { artifactDocsOrFiles, ln } from "./artifactToolGates.js";
import { Ys } from "./pagePreparation.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, A, oe, o, M, E } from "../../../vendor/zod/v4/classic/schemas.js";
import { ARTIFACT_SLUG_RE } from "../../tools/ArtifactTool/constants.js";
import { regExp as regExp_6 } from "./textSanitize.js";

//@ chunk-06y4szbn.js:65657-65891 placement
function renderWarnings(e) {
  let n = e !== null && typeof e === "object" ? e.warnings : void 0;
  if (!Array.isArray(n)) return [];
  let r = [];
  for (let s of n) {
    if (r.length >= READ_BACK_LIMITS) break;
    if (typeof s !== "string") continue;
    let h = sanitizeDisplayTextOrUndefined(s, floored);
    if (h !== void 0) r.push(parseRenderBudgetReason(h) ?? h);
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
  let n = e !== null && typeof e === "object" && "docs" in e ? artifactDocsOrFiles(e) : void 0;
  if (n !== void 0)
    return n
      .map((s) => ({ path: s.path, ...(s.doc !== void 0 && { doc: s.doc }) }))
      .sort((s, h) => (s.path < h.path ? -1 : s.path > h.path ? 1 : 0));
  let safeParse = Ys().safeParse(e);
  if (!safeParse.success) return;
  return Object.entries(safeParse.data.manifest)
    .flatMap(([s, h]) =>
      ln.test(s) && h.src == null && typeof h.doc === "string" && h.doc !== ""
        ? [{ path: s, doc: h.doc }]
        : [],
    )
    .sort((s, h) => (s.path < h.path ? -1 : s.path > h.path ? 1 : 0));
}
//@ chunk-06y4szbn.js:66498-66539 placement
function sa(e) {
  return e.flatMap((n) => []);
}
//@ chunk-06y4szbn.js:66539-66562 placement
function zl() {
  return [];
}
//@ chunk-06y4szbn.js:66562-66603 placement
function Vl(e) {
  return e.flatMap((n) => []);
}
//@ chunk-06y4szbn.js:66603-66629 placement
function Wl(e, n) {
  return [];
}
//@ chunk-06y4szbn.js:66629-66670 placement
function Yl(e) {
  return e.flatMap((n) => []);
}
//@ chunk-06y4szbn.js:66670-66741 placement
function aa(e, n) {
  return (e ?? []).filter((r) => !n.has(r)).flatMap((r) => []);
}
//@ chunk-06y4szbn.js:66741-67153 placement
var RENDER_LIMITS = 32,
  ql = 16,
  Xl = 200,
  Kl = /^[\w./-]{1,64}$/,
  Jl = DoctorLazy(() =>
    u({
      pins: A(oe())
        .optional()
        .catch(void 0),
      warnings: A(oe())
        .optional()
        .catch(void 0),
    }),
  ),
  Zl = DoctorLazy(() =>
    u({
      uuid: o().regex(ARTIFACT_SLUG_RE),
      path: o().regex(Kl),
      module: M()
        .optional()
        .catch(void 0),
      files: E()
        .int()
        .min(0)
        .max(1e6)
        .optional()
        .catch(void 0),
    }),
  ),
  Ql = DoctorLazy(() =>
    u({
      src: o()
        .optional()
        .catch(void 0),
      reason: o().regex(regExp_6),
      count: E()
        .int()
        .min(1)
        .max(1e5)
        .optional()
        .catch(void 0),
    }),
  );
//@ chunk-06y4szbn.js:67153-67830 placement
function renderEmbeds(e) {
  if (e === null || typeof e !== "object" || !("embeds" in e) || e.embeds === null || e.embeds === void 0)
    return;
  let safeParse = Jl().safeParse(e.embeds);
  if (!safeParse.success) return { pins: [], warnings: [] };
  let r = [];
  for (let h of safeParse.data.pins ?? []) {
    if (r.length >= RENDER_LIMITS) break;
    let safeParse = Zl().safeParse(h);
    if (!safeParse.success) continue;
    let { uuid: uuid, path: path, module: w, files: files } = safeParse.data;
    r.push({ uuid: uuid, path: path, module: w === !0, ...(files !== void 0 && { files: files }) });
  }
  let s = [];
  for (let h of safeParse.data.warnings ?? []) {
    if (s.length >= ql) break;
    let safeParse = Ql().safeParse(h);
    if (!safeParse.success) continue;
    let { reason: reason, count: count } = safeParse.data,
      w = safeParse.data.src === void 0 ? void 0 : sanitizeDisplayTextOrUndefined(safeParse.data.src, Xl);
    s.push({ reason: reason, ...(w !== void 0 && { src: w }), ...(count !== void 0 && { count: count }) });
  }
  return { pins: r, warnings: s };
}

export { renderDocs, renderWarnings, sa, aa, renderEmbeds, Vl, Yl, zl, Wl };
