/**
 * services/mcpServe/fileListingCalls.ts
 *
 * 2.1.316 新增：mcp serve 目录列表与文件建议调用。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-wy9dbk5f.js (10)
 * attribution: placement 10
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  zodStrictObject,
  stringSchema,
  objectSchema,
  array,
  numberSchema,
  union,
  booleanSchema,
  _enum,
} from "../../../vendor/zod/v4/classic/schemas.js";
import { MAX_FILE_SUGGESTIONS } from "../../hooks/fileSuggestions.js";
import { isAlreadySanitized } from "../../utils/resultError.js";
import {
  MAX_DIRECTORY_PATH_LENGTH,
  safeSerializedPermissionContextSchema,
  exceedsSerializedContextLimit,
} from "../../utils/permissions/permissionContextSerialization.js";
import {
  REMOTE_LIST_DIRECTORY_MAX_ENTRIES,
  listDirectoryForRemote,
} from "../remoteTools/remoteDirectoryList.js";
import { REPO_ROOT_ERROR_TONES, repoRootErrorClass } from "../repoRoots/repoRootErrors.js";
import { isPlainObject } from "../../utils/objectUtils.js";
import { limitConcurrency } from "../../utils/concurrencyLimit.js";
import { remoteReadPermissionContext, MAX_REMOTE_READ_BYTES } from "../remoteTools/readFileForRemote.js";
import { getSessionProject } from "../../bootstrap/sessionSlices.js";
import { buildNativeDoctorDiagnostics } from "../../screens/Doctor.js";
import { getOriginalCwd } from "../../bootstrap/state.js";
import { jsonStringify } from "../../utils/slowOperations.js";

//@ chunk-wy9dbk5f.js:18108-18295 placement
/**
 * 文件建议结果的 schema。
 */
var FILESUGGESTIONS = "FileSuggestions";
var MAX_QUERY_CHARS = 4096;
var fileSuggestionsInputSchema = DoctorLazy(() =>
  zodStrictObject({
    query: stringSchema().max(MAX_QUERY_CHARS),
  }),
);
var fileSuggestionsResultSchema = DoctorLazy(() =>
  objectSchema({
    paths: array(stringSchema().min(1).max(MAX_QUERY_CHARS)).max(MAX_FILE_SUGGESTIONS),
    cwd: stringSchema().min(1).max(MAX_QUERY_CHARS).optional(),
    leftOut: numberSchema().int().min(0).max(MAX_FILE_SUGGESTIONS),
  }),
);
//@ chunk-wy9dbk5f.js:18295-18350 placement
/**
 * 判断查询是否可用（非空、不超长、符合过滤规则）。
 */
function isUsableQuery(query) {
  return query.length > 0 && query.length <= MAX_QUERY_CHARS && isAlreadySanitized(query);
}
//@ chunk-wy9dbk5f.js:18350-18776 placement
async function serveFileSuggestions(input, signal, context) {
  let { query } = fileSuggestionsInputSchema().parse(input);
  let { generateFileSuggestionsWithBase, globalFileIndexCache } =
    await import("../../hooks/fileSuggestions.js");
  let { items, baseDir } = await generateFileSuggestionsWithBase(
    globalFileIndexCache,
    query,
    true,
    context.toolUseContext().storageV5,
    false,
  );
  let usableBaseDir = baseDir !== undefined && isUsableQuery(baseDir) ? baseDir : undefined;
  let paths = [];
  let sliced = items.slice(0, MAX_FILE_SUGGESTIONS);
  for (let { displayText } of sliced)
    if (usableBaseDir !== undefined && isUsableQuery(displayText)) paths.push(displayText);
  return {
    summary: `${paths.length} paths`,
    output: {
      paths,
      ...(usableBaseDir !== undefined && {
        cwd: usableBaseDir,
      }),
      leftOut: sliced.length - paths.length,
    },
  };
}
//@ chunk-wy9dbk5f.js:18776-19090 placement
/**
 * 列目录结果的 schema。
 */
var LISTDIRECTORYFORREMOTE = "ListDirectoryForRemote";
var listDirectoryInputSchema = DoctorLazy(() =>
  objectSchema({
    path: stringSchema().max(MAX_DIRECTORY_PATH_LENGTH),
  }),
);
var listDirectoryWithContextSchema = DoctorLazy(() =>
  listDirectoryInputSchema()
    .extend({
      permission_context: safeSerializedPermissionContextSchema(),
    })
    .strict(),
);
var listDirectoryResultSchema = DoctorLazy(() =>
  union([
    objectSchema({
      listing: objectSchema({
        entries: array(
          objectSchema({
            name: stringSchema(),
            isDirectory: booleanSchema(),
            isSymlink: booleanSchema().optional(),
            isSpecial: booleanSchema().optional(),
          }),
        ).max(REMOTE_LIST_DIRECTORY_MAX_ENTRIES),
        truncated: booleanSchema(),
      }).refine(fitsListingLimit),
    }),
    objectSchema({
      denied: _enum(Object.keys(REPO_ROOT_ERROR_TONES)),
    }),
  ]),
);
//@ chunk-wy9dbk5f.js:19090-19226 placement
async function serveListDirectory(input, signal, context) {
  if (isPlainObject(input) && exceedsSerializedContextLimit(input.permission_context))
    throw Error("permission_context is too large");
  return limitedListDirectory(listDirectoryWithContextSchema().parse(input), signal, context);
}
//@ chunk-wy9dbk5f.js:19226-19242 placement
/**
 * 并发限制为 4 的列目录实现。
 */
var limitedListDirectory = limitConcurrency(4, serveListDirectoryForRemote);
//@ chunk-wy9dbk5f.js:19242-19860 placement
async function serveListDirectoryForRemote({ permission_context: permissionContext, path }, signal, context) {
  if (signal.aborted || context.callerGone?.aborted) return deniedListing("unexpected_error");
  let readContext =
    context.launchPermissionContext && remoteReadPermissionContext(context.launchPermissionContext);
  if (!readContext) return deniedListing("read_rule");
  let { projectRoot, originalCwd } = getSessionProject(context.session);
  if (originalCwd !== projectRoot) return deniedListing("workspace_moved");
  let nativeDoctorDiagnostics = buildNativeDoctorDiagnostics(permissionContext, readContext, projectRoot);
  try {
    let { entries, truncated } = await listDirectoryForRemote(
      path,
      projectRoot,
      () => nativeDoctorDiagnostics,
      () => getOriginalCwd() !== projectRoot,
    );
    let totalBytes = 0;
    let index = entries.findIndex(
      (entry) => (totalBytes += Buffer.byteLength(jsonStringify(entry)) + 1) > MAX_LISTING_BYTES,
    );
    let listing =
      index === -1
        ? {
            entries,
            truncated,
          }
        : {
            entries: entries.slice(0, index),
            truncated: true,
          };
    return {
      summary: `${listing.entries.length} entries`,
      output: {
        listing,
      },
    };
  } catch (error) {
    return deniedListing(repoRootErrorClass(error) ?? "unexpected_error");
  }
}
//@ chunk-wy9dbk5f.js:19860-19874 placement
/**
 * 列目录结果的最大字节数（上限减 64）。
 */
var MAX_LISTING_BYTES = MAX_REMOTE_READ_BYTES - 64;
//@ chunk-wy9dbk5f.js:19874-19943 placement
/**
 * 生成“列目录被拒绝”的结果。
 */
function deniedListing(reason) {
  return {
    summary: `list denied: ${reason}`,
    output: {
      denied: reason,
    },
  };
}
//@ chunk-wy9dbk5f.js:19943-20050 placement
function fitsListingLimit(listing) {
  let totalNameLength = 0;
  for (let { name: entryName } of listing.entries) totalNameLength += entryName.length;
  return (
    totalNameLength <= MAX_REMOTE_READ_BYTES &&
    Buffer.byteLength(jsonStringify(listing)) <= MAX_REMOTE_READ_BYTES
  );
}
export { FILESUGGESTIONS, serveFileSuggestions, LISTDIRECTORYFORREMOTE, serveListDirectory };
