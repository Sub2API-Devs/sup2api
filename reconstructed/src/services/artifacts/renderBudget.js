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
import {
  objectSchema,
  array,
  unknown,
  stringSchema,
  booleanSchema,
  numberSchema,
} from "../../../vendor/zod/v4/classic/schemas.js";
import { ARTIFACT_SLUG_RE } from "../../tools/ArtifactTool/constants.js";
import { SAFE_LABEL_RE } from "./textSanitize.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-06y4szbn.js:65657-65891 placement
function renderWarnings(res) {
  let warnings = res !== null && typeof res === "object" ? res.warnings : undefined;
  if (!Array.isArray(warnings)) return [];
  let out = [];
  for (let warning of warnings) {
    if (out.length >= READ_BACK_LIMITS) break;
    if (typeof warning !== "string") continue;
    let warnText = sanitizeDisplayTextOrUndefined(warning, floored);
    if (warnText !== undefined) out.push(parseRenderBudgetReason(warnText) ?? warnText);
  }
  return out;
}
//@ chunk-06y4szbn.js:65891-66058 placement
function parseRenderBudgetReason(reason) {
  if (/^live_over_budget:(.{1,1024})$/.exec(reason)) return reason;
  if (/^render_unavailable:(.{1,1024})$/.exec(reason)) return reason;
  if (reason === "render_over_budget") return reason;
  return;
}
//@ chunk-06y4szbn.js:66058-66498 placement
function renderDocs(response) {
  let docs =
    response !== null && typeof response === "object" && "docs" in response
      ? artifactDocsOrFiles(response)
      : undefined;
  if (docs !== undefined)
    return docs
      .map((doc) => ({
        path: doc.path,
        ...(doc.doc !== undefined && {
          doc: doc.doc,
        }),
      }))
      .sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  let parsed = echoManifestSchema().safeParse(response);
  if (!parsed.success) return;
  return Object.entries(parsed.data.manifest)
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
    .sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
}
//@ chunk-06y4szbn.js:66498-66539 placement
/**
 * 渲染输出转换的占位实现（本构建中均返回空数组）。
 */
function embedsToDocs(docs) {
  return docs.flatMap((doc) => []);
}
//@ chunk-06y4szbn.js:66539-66562 placement
function emptyList() {
  return [];
}
//@ chunk-06y4szbn.js:66562-66603 placement
function pinsToDocs(docs) {
  return docs.flatMap((doc) => []);
}
//@ chunk-06y4szbn.js:66603-66629 placement
function warningsToDocs(detach, detachList) {
  return [];
}
//@ chunk-06y4szbn.js:66629-66670 placement
function docsToDocs(docs) {
  return docs.flatMap((doc) => []);
}
//@ chunk-06y4szbn.js:66670-66741 placement
function newWarnings(paths, known) {
  return (paths ?? []).filter((path) => !known.has(path)).flatMap((path) => []);
}
//@ chunk-06y4szbn.js:66741-67153 placement
/**
 * 渲染输出限额：32、16 条警告、200 字符来源、路径正则，以及 embeds/pins/warnings 的 schema。
 */
var RENDER_LIMITS; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var MAX_RENDER_WARNINGS;
var MAX_RENDER_SRC_CHARS;
var SAFE_RENDER_PATH_RE;
var embedsSchema;
var pinSchema;
var warningSchema;
deferInit("chunk-06y4szbn.js:66741", () => {
  RENDER_LIMITS = 32;
  MAX_RENDER_WARNINGS = 16;
  MAX_RENDER_SRC_CHARS = 200;
  SAFE_RENDER_PATH_RE = /^[\w./-]{1,64}$/;
  embedsSchema = DoctorLazy(() =>
    objectSchema({
      pins: array(unknown()).optional().catch(undefined),
      warnings: array(unknown()).optional().catch(undefined),
    }),
  );
  pinSchema = DoctorLazy(() =>
    objectSchema({
      uuid: stringSchema().regex(ARTIFACT_SLUG_RE),
      path: stringSchema().regex(SAFE_RENDER_PATH_RE),
      module: booleanSchema().optional().catch(undefined),
      files: numberSchema().int().min(0).max(1e6).optional().catch(undefined),
    }),
  );
  warningSchema = DoctorLazy(() =>
    objectSchema({
      src: stringSchema().optional().catch(undefined),
      reason: stringSchema().regex(SAFE_LABEL_RE),
      count: numberSchema().int().min(1).max(1e5).optional().catch(undefined),
    }),
  );
});
//@ chunk-06y4szbn.js:67153-67830 placement
function renderEmbeds(response) {
  if (
    response === null ||
    typeof response !== "object" ||
    !("embeds" in response) ||
    response.embeds === null ||
    response.embeds === undefined
  )
    return;
  let parsed = embedsSchema().safeParse(response.embeds);
  if (!parsed.success)
    return {
      pins: [],
      warnings: [],
    };
  let pins = [];
  for (let raw of parsed.data.pins ?? []) {
    if (pins.length >= RENDER_LIMITS) break;
    let pin = pinSchema().safeParse(raw);
    if (!pin.success) continue;
    let { uuid, path, module: isModule, files } = pin.data;
    pins.push({
      uuid,
      path,
      module: isModule === true,
      ...(files !== undefined && {
        files,
      }),
    });
  }
  let warnings = [];
  for (let raw of parsed.data.warnings ?? []) {
    if (warnings.length >= MAX_RENDER_WARNINGS) break;
    let warning = warningSchema().safeParse(raw);
    if (!warning.success) continue;
    let { reason, count } = warning.data;
    let entry =
      warning.data.src === undefined
        ? undefined
        : sanitizeDisplayTextOrUndefined(warning.data.src, MAX_RENDER_SRC_CHARS);
    warnings.push({
      reason,
      ...(entry !== undefined && {
        src: entry,
      }),
      ...(count !== undefined && {
        count,
      }),
    });
  }
  return {
    pins,
    warnings,
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
