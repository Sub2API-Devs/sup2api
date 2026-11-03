/**
 * tools/ArtifactTool/permissions/dbWriteInputs.ts
 *
 * 2.1.316 新增：Artifact 数据库写入输入解析
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-qxvqcab6.js (18)
 * attribution: placement 18
 */
import { join } from "path";
import { assetFieldsFrom } from "./consentStamps.js";
import { ASSET_ID_RE, parseArtifactUrl, artifactUrlSubPath, artifactLinkShapeHint } from "../constants.js";
import { C9 } from "../readFilePaths.js";
import { getCwd } from "../../../utils/cwd.js";
import { expandPath } from "../../../utils/path.js";
import {
  artifactViewerUrlFor,
  markDisplayTokens,
  scrubArtifactEnvelopeTags,
  DECISION_SURFACE_BRACKETS_RE,
} from "../artifactUrls.js";
import { coerceBooleanString } from "../../../utils/spellcheck.js";
import { STR_REPLACE, regExp_2 } from "../../../services/artifacts/artifactDb.js";
import { Uf, readUntrustedArray } from "../../../utils/untrustedArray.js";
import { DB_BATCH_OP } from "../promptText.js";
import { sanitizeDisplayText } from "../../../services/artifacts/capabilityDeclaration.js";
import { getPlatform } from "../../../utils/platform.js";
import { formatPermissionRule } from "../../../utils/permissions/disallowedToolsFlag.js";

//@ chunk-qxvqcab6.js:6699-6980 placement
function assetDownloadTarget(e) {
  let { assetId: assetId, outDir: outDir } = assetFieldsFrom(e);
  if (assetId === void 0 || !ASSET_ID_RE.test(assetId)) return;
  let o,
    s = !1;
  try {
    if (outDir === void 0 || outDir === "") {
      let { url: url } = e,
        a = typeof url === "string" ? parseArtifactUrl(url) : null,
        l = a !== null ? C9(a.slug) : null;
      ((s = l !== null), (o = l ?? getCwd()));
    } else o = expandPath(outDir);
  } catch {
    return;
  }
  return { stem: join(o, assetId), ...(s && { defaultDir: !0 }) };
}
//@ chunk-qxvqcab6.js:6980-7212 placement
function urlSubPathError(e, n = "", r = "url") {
  if (artifactUrlSubPath(e) === void 0) return;
  let o = parseArtifactUrl(e),
    s = o !== null ? ` (${artifactViewerUrlFor(o)})` : "";
  return {
    result: !1,
    message: `\`${r}\` names a path inside the artifact \u2014 pass the artifact's own URL${s} as \`${r}\`${n}.`,
    errorCode: 4,
  };
}
//@ chunk-qxvqcab6.js:7212-7719 placement
function dbWriteFields(e) {
  let n = (d) => {
      let f = e[d];
      return typeof f === "string" ? f : void 0;
    },
    r = e.data,
    o = r !== null && typeof r === "object" && !Array.isArray(r) ? r : void 0,
    { replace_all: replace_all, if_version: if_version, query: query } = e,
    l = query !== null && typeof query === "object" && !Array.isArray(query) ? query : void 0;
  return {
    dbOp: n("db_op"),
    collection: n("collection"),
    docId: n("doc_id"),
    data: o,
    query: l,
    outDir: n("out_dir"),
    filePath: n("file_path"),
    strReplace: {
      field: n("field"),
      oldStr: n("old_str"),
      newStr: n("new_str"),
      replaceAll: replace_all === void 0 ? void 0 : coerceBooleanString(replace_all) === !0,
    },
    ifVersion: isPositiveInt(if_version) ? if_version : void 0,
  };
}
//@ chunk-qxvqcab6.js:7719-7793 placement
function isPositiveInt(e) {
  return typeof e === "number" && Number.isSafeInteger(e) && e >= 1;
}
//@ chunk-qxvqcab6.js:7793-7830 placement
var DB_WRITE_OPS = ["set", "update", STR_REPLACE, "delete"];
//@ chunk-qxvqcab6.js:7830-7877 placement
function batchWrites(e) {
  let n = parseBatchWrites(e);
  return n === Uf ? [] : n;
}
//@ chunk-qxvqcab6.js:7877-8319 placement
function parseBatchWrites(e) {
  let n = readUntrustedArray(e.writes);
  if (n === void 0 || n === Uf) return n ?? [];
  return n.map((r) => {
    let o = (g) => (r !== null && typeof r === "object" ? r[g] : void 0),
      s = {
        db_op: o("op"),
        collection: o("collection"),
        doc_id: o("doc_id"),
        data: o("data"),
        file_path: o("file_path"),
        if_version: o("if_version"),
      },
      {
        dbOp: dbOp,
        collection: collection,
        docId: docId,
        data: d,
        filePath: filePath,
        ifVersion: ifVersion,
      } = dbWriteFields(s);
    return {
      op: dbOp,
      collection: collection,
      docId: docId,
      data: d,
      filePath: filePath,
      ifVersion: ifVersion,
      ifVersionGiven: s.if_version !== void 0,
    };
  });
}
//@ chunk-qxvqcab6.js:8319-8384 placement
function N(e) {
  return e.db_op === DB_BATCH_OP ? batchWrites(e).map((n) => n.ifVersion) : [];
}
//@ chunk-qxvqcab6.js:8384-8460 placement
function hasVersionPreconditions(e) {
  return dbWriteFields(e).ifVersion !== void 0 || N(e).some((n) => n !== void 0);
}
//@ chunk-qxvqcab6.js:8460-8550 placement
function isArtifactBatchWrite(e) {
  return typeof e === "object" && e !== null && e.action === "write_db" && e.db_op === DB_BATCH_OP;
}
//@ chunk-qxvqcab6.js:8550-8641 placement = getDenyRuleForAgent (1)
function formatRuleContentForDisplay(e) {
  return markDisplayTokens(
    scrubArtifactEnvelopeTags(
      sanitizeDisplayText(e.ruleValue.ruleContent ?? "", { max: 1024 }).replace(
        DECISION_SURFACE_BRACKETS_RE,
        " ",
      ),
    ),
  );
}
//@ chunk-qxvqcab6.js:8641-8710 placement
function typeUrlOf(e) {
  let n = e?.type_url;
  return typeof n === "string" ? n : void 0;
}
//@ chunk-qxvqcab6.js:8710-8776 placement
function typeOf(e) {
  let n = e?.type;
  return typeof n === "string" ? n : void 0;
}
//@ chunk-qxvqcab6.js:8776-8897 placement
function notTypeUrlError(e) {
  return `type_url: not an Artifact type's link: ${e} \u2014 pass a ${artifactLinkShapeHint()} link from a list_types result`;
}
//@ chunk-qxvqcab6.js:8897-8986 placement
function autoOpenMode(e) {
  return e.auto_open === "after_first_write" ? "after_first_write" : "at_create";
}
//@ chunk-qxvqcab6.js:8986-9230 placement
function dbOutputTarget(e) {
  let { outDir: outDir, collection: collection } = dbWriteFields(e);
  if (outDir === void 0) return { kind: "inline" };
  let o;
  try {
    o = expandPath(outDir === "" ? getCwd() : outDir);
  } catch {
    return { kind: "unresolvable" };
  }
  let s =
    collection !== void 0 && regExp_2.test(collection)
      ? join(o, ...collection.split("/").map(escapeDbPathSegment))
      : o;
  return { kind: "dir", outDir: o, dir: s };
}
//@ chunk-qxvqcab6.js:9230-9338 placement
function escapeDbPathSegment(e) {
  let replaced = e.replaceAll("~", "@"),
    r = getPlatform();
  return r === "windows" || r === "wsl" ? replaced.replaceAll(":", "%3A") : replaced;
}
//@ chunk-qxvqcab6.js:9338-9381 placement
function dbRowKey(e, n) {
  return `${e}\x00${formatPermissionRule(n)}`;
}

export {
  dbRowKey,
  escapeDbPathSegment,
  dbWriteFields,
  batchWrites,
  DB_WRITE_OPS,
  isPositiveInt,
  dbOutputTarget,
  isArtifactBatchWrite,
  urlSubPathError,
  hasVersionPreconditions,
  parseBatchWrites,
  typeUrlOf,
  formatRuleContentForDisplay,
  typeOf,
  notTypeUrlError,
  assetDownloadTarget,
  autoOpenMode,
};
