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
import { zodStrictObject, o, u as u_2, A, E, Ue, M, U } from "../../../vendor/zod/v4/classic/schemas.js";
import { Byt } from "../../hooks/fileSuggestions.js";
import { FDi } from "../../utils/resultError.js";
import {
  MAX_DIRECTORY_PATH_LENGTH,
  safeSerializedPermissionContextSchema,
  PV,
} from "../../utils/permissions/permissionContextSerialization.js";
import {
  REMOTE_LIST_DIRECTORY_MAX_ENTRIES,
  listDirectoryForRemote,
} from "../remoteTools/remoteDirectoryList.js";
import { REPO_ROOT_ERROR_TONES, repoRootErrorClass } from "../repoRoots/repoRootErrors.js";
import { isPlainObject } from "../../utils/objectUtils.js";
import { limitConcurrency } from "../../utils/concurrencyLimit.js";
import { remoteReadPermissionContext, pZt } from "../remoteTools/readFileForRemote.js";
import { xo } from "../../bootstrap/sessionSlices.js";
import { buildNativeDoctorDiagnostics } from "../../screens/Doctor.js";
import { getOriginalCwd } from "../../bootstrap/state.js";
import { jsonStringify } from "../../utils/slowOperations.js";

//@ chunk-wy9dbk5f.js:18108-18295 placement
var FILESUGGESTIONS = "FileSuggestions",
  Se = 4096,
  pn = DoctorLazy(() => zodStrictObject({ query: o().max(Se) })),
  Es = DoctorLazy(() =>
    u_2({
      paths: A(o().min(1).max(Se)).max(Byt),
      cwd: o().min(1).max(Se).optional(),
      leftOut: E().int().min(0).max(Byt),
    }),
  );
//@ chunk-wy9dbk5f.js:18295-18350 placement
function nt(e) {
  return e.length > 0 && e.length <= Se && FDi(e);
}
//@ chunk-wy9dbk5f.js:18350-18776 placement
async function serveFileSuggestions(e, r, n) {
  let { query: query } = pn().parse(e),
    {
      generateFileSuggestionsWithBase: generateFileSuggestionsWithBase,
      globalFileIndexCache: globalFileIndexCache,
    } = await import("./chunk-21emf7ab.js"),
    { items: items, baseDir: baseDir } = await generateFileSuggestionsWithBase(
      globalFileIndexCache,
      query,
      !0,
      n.toolUseContext().storageV5,
      !1,
    ),
    h = baseDir !== void 0 && nt(baseDir) ? baseDir : void 0,
    S = [],
    sliced = items.slice(0, Byt);
  for (let { displayText: displayText } of sliced) if (h !== void 0 && nt(displayText)) S.push(displayText);
  return {
    summary: `${S.length} paths`,
    output: { paths: S, ...(h !== void 0 && { cwd: h }), leftOut: sliced.length - S.length },
  };
}
//@ chunk-wy9dbk5f.js:18776-19090 placement
var LISTDIRECTORYFORREMOTE = "ListDirectoryForRemote",
  dn = DoctorLazy(() => u_2({ path: o().max(MAX_DIRECTORY_PATH_LENGTH) })),
  mn = DoctorLazy(() =>
    dn().extend({ permission_context: safeSerializedPermissionContextSchema() }).strict(),
  ),
  vs = DoctorLazy(() =>
    Ue([
      u_2({
        listing: u_2({
          entries: A(
            u_2({ name: o(), isDirectory: M(), isSymlink: M().optional(), isSpecial: M().optional() }),
          ).max(REMOTE_LIST_DIRECTORY_MAX_ENTRIES),
          truncated: M(),
        }).refine(fitsListingLimit),
      }),
      u_2({ denied: U(Object.keys(REPO_ROOT_ERROR_TONES)) }),
    ]),
  );
//@ chunk-wy9dbk5f.js:19090-19226 placement
async function serveListDirectory(e, r, n) {
  if (isPlainObject(e) && PV(e.permission_context)) throw Error("permission_context is too large");
  return fn(mn().parse(e), r, n);
}
//@ chunk-wy9dbk5f.js:19226-19242 placement
var fn = limitConcurrency(4, serveListDirectoryForRemote);
//@ chunk-wy9dbk5f.js:19242-19860 placement
async function serveListDirectoryForRemote({ permission_context: permission_context, path: path }, n, s) {
  if (n.aborted || s.callerGone?.aborted) return _e("unexpected_error");
  let a = s.launchPermissionContext && remoteReadPermissionContext(s.launchPermissionContext);
  if (!a) return _e("read_rule");
  let { projectRoot: projectRoot, originalCwd: originalCwd } = xo(s.session);
  if (originalCwd !== projectRoot) return _e("workspace_moved");
  let g = buildNativeDoctorDiagnostics(permission_context, a, projectRoot);
  try {
    let { entries: entries, truncated: truncated } = await listDirectoryForRemote(
        path,
        projectRoot,
        () => g,
        () => getOriginalCwd() !== projectRoot,
      ),
      C = 0,
      index = entries.findIndex((x) => (C += Buffer.byteLength(jsonStringify(x)) + 1) > hn),
      R =
        index === -1
          ? { entries: entries, truncated: truncated }
          : { entries: entries.slice(0, index), truncated: !0 };
    return { summary: `${R.entries.length} entries`, output: { listing: R } };
  } catch (error) {
    return _e(repoRootErrorClass(error) ?? "unexpected_error");
  }
}
//@ chunk-wy9dbk5f.js:19860-19874 placement
var hn = pZt - 64;
//@ chunk-wy9dbk5f.js:19874-19943 placement
function _e(e) {
  return { summary: `list denied: ${e}`, output: { denied: e } };
}
//@ chunk-wy9dbk5f.js:19943-20050 placement
function fitsListingLimit(e) {
  let r = 0;
  for (let { name: n } of e.entries) r += n.length;
  return r <= pZt && Buffer.byteLength(jsonStringify(e)) <= pZt;
}

export { FILESUGGESTIONS, serveFileSuggestions, LISTDIRECTORYFORREMOTE, serveListDirectory };
