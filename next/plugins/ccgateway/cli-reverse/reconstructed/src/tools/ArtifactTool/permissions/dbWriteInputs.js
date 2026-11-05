/**
 * tools/ArtifactTool/permissions/dbWriteInputs.ts
 *
 * 2.1.316 新增：Artifact 数据库写入输入解析
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-nfkwcnxd.js (18)
 * attribution: placement 18
 */
import { join } from "path";
import { assetFieldsFrom } from "./consentStamps.js";
import { ASSET_ID_RE, parseArtifactUrl, artifactUrlSubPath, artifactLinkShapeHint } from "../constants.js";
import { scratchpadArtifactFilePath } from "../readFilePaths.js";
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
import { UNREADABLE_ARRAY, readUntrustedArray } from "../../../utils/untrustedArray.js";
import { DB_BATCH_OP } from "../promptText.js";
import { sanitizeDisplayText } from "../../../services/artifacts/capabilityDeclaration.js";
import { getPlatform } from "../../../utils/platform.js";
import { permissionRuleValueFromString } from "../../../utils/permissions/permissionRuleParser.js";

//@ chunk-nfkwcnxd.js:6674-6955 placement
function assetDownloadTarget(input) {
  let { assetId, outDir } = assetFieldsFrom(input);
  if (assetId === undefined || !ASSET_ID_RE.test(assetId)) return;
  let dir;
  let isDefaultDir = false;
  try {
    if (outDir === undefined || outDir === "") {
      let { url } = input;
      let artifactUrl = typeof url === "string" ? parseArtifactUrl(url) : null;
      let scratchPath = artifactUrl !== null ? scratchpadArtifactFilePath(artifactUrl.slug) : null;
      isDefaultDir = scratchPath !== null;
      dir = scratchPath ?? getCwd();
    } else dir = expandPath(outDir);
  } catch {
    return;
  }
  return {
    stem: join(dir, assetId),
    ...(isDefaultDir && {
      defaultDir: true,
    }),
  };
}
//@ chunk-nfkwcnxd.js:6955-7187 placement
function urlSubPathError(url, suffix = "", fieldName = "url") {
  if (artifactUrlSubPath(url) === undefined) return;
  let artifactUrl = parseArtifactUrl(url);
  let viewerNote = artifactUrl !== null ? ` (${artifactViewerUrlFor(artifactUrl)})` : "";
  return {
    result: false,
    message: `\`${fieldName}\` names a path inside the artifact \u2014 pass the artifact's own URL${viewerNote} as \`${fieldName}\`${suffix}.`,
    errorCode: 4,
  };
}
//@ chunk-nfkwcnxd.js:7187-7694 placement
function dbWriteFields(input) {
  let readField = (key) => {
    let value = input[key];
    return typeof value === "string" ? value : undefined;
  };
  let rawData = input.data;
  let data = rawData !== null && typeof rawData === "object" && !Array.isArray(rawData) ? rawData : undefined;
  let { replace_all: replaceAll, if_version: ifVersion, query } = input;
  let query_2 = query !== null && typeof query === "object" && !Array.isArray(query) ? query : undefined;
  return {
    dbOp: readField("db_op"),
    collection: readField("collection"),
    docId: readField("doc_id"),
    data,
    query: query_2,
    outDir: readField("out_dir"),
    filePath: readField("file_path"),
    strReplace: {
      field: readField("field"),
      oldStr: readField("old_str"),
      newStr: readField("new_str"),
      replaceAll: replaceAll === undefined ? undefined : coerceBooleanString(replaceAll) === true,
    },
    ifVersion: isPositiveInt(ifVersion) ? ifVersion : undefined,
  };
}
//@ chunk-nfkwcnxd.js:7694-7768 placement
function isPositiveInt(value) {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 1;
}
//@ chunk-nfkwcnxd.js:7768-7805 placement
var DB_WRITE_OPS = ["set", "update", STR_REPLACE, "delete"];
//@ chunk-nfkwcnxd.js:7805-7852 placement
function batchWrites(input) {
  let batchWrites = parseBatchWrites(input);
  return batchWrites === UNREADABLE_ARRAY ? [] : batchWrites;
}
//@ chunk-nfkwcnxd.js:7852-8294 placement
function parseBatchWrites(input) {
  let untrustedArray = readUntrustedArray(input.writes);
  if (untrustedArray === undefined || untrustedArray === UNREADABLE_ARRAY) return untrustedArray ?? [];
  return untrustedArray.map((untrusted) => {
    let readField = (key) =>
      untrusted !== null && typeof untrusted === "object" ? untrusted[key] : undefined;
    let rawFields = {
      db_op: readField("op"),
      collection: readField("collection"),
      doc_id: readField("doc_id"),
      data: readField("data"),
      file_path: readField("file_path"),
      if_version: readField("if_version"),
    };
    let { dbOp, collection, docId, data, filePath, ifVersion } = dbWriteFields(rawFields);
    return {
      op: dbOp,
      collection,
      docId,
      data,
      filePath,
      ifVersion,
      ifVersionGiven: rawFields.if_version !== undefined,
    };
  });
}
//@ chunk-nfkwcnxd.js:8294-8359 placement
/**
 * 批量写入时取出各项的版本前置条件。
 */
function batchWriteVersions(input) {
  return input.db_op === DB_BATCH_OP ? batchWrites(input).map((write) => write.ifVersion) : [];
}
//@ chunk-nfkwcnxd.js:8359-8435 placement
function hasVersionPreconditions(input) {
  return (
    dbWriteFields(input).ifVersion !== undefined ||
    batchWriteVersions(input).some((version) => version !== undefined)
  );
}
//@ chunk-nfkwcnxd.js:8435-8525 placement
function isArtifactBatchWrite(input) {
  return (
    typeof input === "object" && input !== null && input.action === "write_db" && input.db_op === DB_BATCH_OP
  );
}
//@ chunk-nfkwcnxd.js:8525-8616 placement (2.1.88 match: getDenyRuleForAgent, 1)
function formatRuleContentForDisplay(rule) {
  return markDisplayTokens(
    scrubArtifactEnvelopeTags(
      sanitizeDisplayText(rule.ruleValue.ruleContent ?? "", {
        max: 1024,
      }).replace(DECISION_SURFACE_BRACKETS_RE, " "),
    ),
  );
}
//@ chunk-nfkwcnxd.js:8616-8685 placement
function typeUrlOf(input) {
  let typeUrl = input?.type_url;
  return typeof typeUrl === "string" ? typeUrl : undefined;
}
//@ chunk-nfkwcnxd.js:8685-8751 placement
function typeOf(input) {
  let typeName = input?.type;
  return typeof typeName === "string" ? typeName : undefined;
}
//@ chunk-nfkwcnxd.js:8751-8872 placement
function notTypeUrlError(value) {
  return `type_url: not an Artifact type's link: ${value} \u2014 pass a ${artifactLinkShapeHint()} link from a list_types result`;
}
//@ chunk-nfkwcnxd.js:8872-8961 placement
function autoOpenMode(input) {
  return input.auto_open === "after_first_write" ? "after_first_write" : "at_create";
}
//@ chunk-nfkwcnxd.js:8961-9205 placement
function dbOutputTarget(input) {
  let { outDir, collection } = dbWriteFields(input);
  if (outDir === undefined)
    return {
      kind: "inline",
    };
  let absoluteOutDir;
  try {
    absoluteOutDir = expandPath(outDir === "" ? getCwd() : outDir);
  } catch {
    return {
      kind: "unresolvable",
    };
  }
  let dir =
    collection !== undefined && regExp_2.test(collection)
      ? join(absoluteOutDir, ...collection.split("/").map(escapeDbPathSegment))
      : absoluteOutDir;
  return {
    kind: "dir",
    outDir: absoluteOutDir,
    dir,
  };
}
//@ chunk-nfkwcnxd.js:9205-9313 placement
function escapeDbPathSegment(segment) {
  let replaced = segment.replaceAll("~", "@");
  let platform = getPlatform();
  return platform === "windows" || platform === "wsl" ? replaced.replaceAll(":", "%3A") : replaced;
}
//@ chunk-nfkwcnxd.js:9313-9356 placement
function dbRowKey(source, ruleValue) {
  return `${source}\x00${permissionRuleValueFromString(ruleValue)}`;
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
  assetDownloadTarget,
  formatRuleContentForDisplay,
  notTypeUrlError,
  autoOpenMode,
  typeOf,
};
