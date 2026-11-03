/**
 * services/plugins/publish/publishSnapshot.ts
 *
 * 2.1.316 新增：插件发布目录快照与校验
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-9cjx5pnm.js (81)
 * attribution: placement 81
 */
import {
  join,
  join as join_2,
  join as join_3,
  join as join_4,
  join as join_5,
  join as join_6,
  join as join_7,
  join as join_8,
  join as join_9,
  join as join_10,
  join as join_11,
  join as join_12,
  join as join_13,
  dirname,
  dirname as dirname_2,
  dirname as dirname_3,
  dirname as dirname_4,
  dirname as dirname_5,
  dirname as dirname_6,
  basename,
  basename as basename_2,
  basename as basename_3,
  basename as basename_4,
  basename as basename_5,
  basename as basename_6,
  basename as basename_7,
  basename as basename_8,
  resolve,
  resolve as resolve_2,
  resolve as resolve_3,
} from "path";
import {
  readdir,
  lstat,
  lstat as lstat_2,
  lstat as lstat_3,
  lstat as lstat_4,
  lstat as lstat_5,
  realpath,
  realpath as realpath_2,
  realpath as realpath_3,
  open,
  mkdir,
  mkdir as mkdir_2,
  writeFile,
  mkdtemp,
} from "fs/promises";
import {
  exclusionEntriesFor,
  relativePosixPathOf,
  listingEntry,
  MAX_COPY_DEPTH,
  statEntry,
  assertGitignoreNotHardlinked,
  $e,
  readGitignoreSafely,
  byPath,
  processEndingError,
  removeValidationCopy,
  errorDetails,
  De,
  unreadableOnError,
  FILE_MODE_RW,
  draftManifestOf,
} from "./validationCopy.js";
import { limitConcurrency } from "../../../utils/concurrencyLimit.js";
import { oTo, Qh, j0s, kOr } from "../../../tools/PublishPluginTool/constants.js";
import { hm } from "../../../utils/pathPrefix.js";
import { $c } from "../../../utils/platformTargets.js";
import { getErrnoCode } from "../../../utils/errors.js";
import { readPluginFileSafe, getMcpAuthCache, FF } from "../../../utils/plugins/safeFileRead.js";
import { computeContentHash } from "../../../utils/commitAttribution.js";
import { isCleanupStarted, registerCleanup } from "../../../utils/cleanupRegistry.js";
import { tmpdir } from "../../../utils/tempDir.js";
import { onceExport } from "../../../../vendor/lodash-es/once.js";
import { checkReservedPluginName } from "../../../utils/plugins/reservedPluginNames.js";
import { printableName } from "../../../utils/printableName.js";
import { jsonStringify } from "../../../utils/slowOperations.js";
import { redactSecrets } from "../../teamMemorySync/secretScanner.js";
import { DoctorLazy } from "../../../cli/handlers/util.js";
import { u, o, A } from "../../../../vendor/zod/v4/classic/schemas.js";
import { PLUGIN_MANIFEST_PATH, $kt } from "../../../utils/plugins/commandSource.js";
import { safeParseJSON } from "../../../utils/json.js";
import { _P } from "../../../skills/loadSkillsDir.js";
import {
  sanitizeForDisplay,
  resolveValidateTarget,
  NO_MANIFEST,
} from "../../../utils/plugins/validatePlugin.js";
import { getCwd } from "../../../utils/cwd.js";
import { PluginManifestSchema } from "../../../utils/plugins/schemas.js";
import { truncateToLength } from "../../../utils/stringUtils.js";

//@ chunk-9cjx5pnm.js:4777-5044 placement
function excludeListedFiles(e, r, s) {
  let flattened = s.flatMap((f) => exclusionEntriesFor(e, r, f)),
    a = new Set(flattened.map((f) => f.path)),
    filtered = s.filter((f) => !a.has(relativePosixPathOf(e, f)));
  return {
    files: filtered.filter((f) => f.kind === "file").map((f) => listingEntry(e, f)),
    leftOut: flattened,
    folders: filtered.filter((f) => f.kind === "folder").map((f) => ({ path: f.path, scope: r.scope })),
  };
}
//@ chunk-9cjx5pnm.js:5044-5229 placement
async function scanPublishDir(e, r) {
  let s = limitConcurrency(MAX_COPY_DEPTH, (a) => statEntry(join_3(r.path, a))),
    results = await Promise.all((await readdir(r.path)).toSorted().map(s));
  return excludeListedFiles(
    e,
    { path: r.path, scope: r.scope.concat(await assertGitignoreNotHardlinked(r.path, results)) },
    results,
  );
}
//@ chunk-9cjx5pnm.js:5261-5318 placement
function gr(e) {
  let r = dirname_3(e);
  return r === e ? [e] : [e, ...gr(r)];
}
//@ chunk-9cjx5pnm.js:5384-5458 placement
var oi = (e) =>
  lstat_3(join_7(e, ".git")).then(
    () => !0,
    (r) => ($e(r) ? !1 : Promise.reject(r)),
  );
//@ chunk-9cjx5pnm.js:5458-5577 placement
async function ancestorGitignoreDirs(e) {
  let r = gr(e);
  for (let [s, n] of r.entries()) if (await oi(n)) return r.slice(1, s + 1).toReversed();
  return [];
}
//@ chunk-9cjx5pnm.js:5577-5644 placement
var si = async (e) => (await Promise.all((await ancestorGitignoreDirs(e)).map(readGitignoreSafely))).flat();
//@ chunk-9cjx5pnm.js:5644-5879 placement
async function scanPublishFolder(e) {
  let r = [],
    s = [],
    n = [{ path: e, scope: await si(e) }];
  for (let a of n) {
    if (r.length > oTo) break;
    let f = await scanPublishDir(e, a);
    (r.push(...f.files), s.push(...f.leftOut), n.push(...f.folders));
  }
  return { files: r.toSorted(byPath), leftOut: s.toSorted(byPath) };
}
//@ chunk-9cjx5pnm.js:6070-6081 placement
var Rr = 448;
//@ chunk-9cjx5pnm.js:6081-6092 placement
var ni = 384;
//@ chunk-9cjx5pnm.js:6173-6183 placement
var ai = !1;
//@ chunk-9cjx5pnm.js:6183-6193 placement
var _r = 1n;
//@ chunk-9cjx5pnm.js:6193-6227 placement
var freeze_4 = Object.freeze({ bigint: !0 });
//@ chunk-9cjx5pnm.js:6227-6389 placement
async function isSamePublishFile(e, r, s) {
  let n = await realpath_2(r).catch(() => e),
    m = hm(e, n, ai)
      ? await lstat_4(n, freeze_4).catch(() => {
          return;
        })
      : void 0;
  return m?.ino === s.ino && m.dev === s.dev && m.nlink === _r;
}
//@ chunk-9cjx5pnm.js:6425-6485 placement
var freeze_5 = Object.freeze(["ENOENT", "ENOTDIR", "ELOOP", "EISDIR"]);
//@ chunk-9cjx5pnm.js:6485-6567 placement
var di = (e) =>
  open(e, $c()).catch((r) => (freeze_5.includes(getErrnoCode(r) ?? "") ? void 0 : Promise.reject(r)));
//@ chunk-9cjx5pnm.js:6636-6730 placement
var hi = async (e, r) =>
  (await readPluginFileSafe(e, dirname_5(r))) === "ok" &&
  (
    await lstat_5(r).catch(() => {
      return;
    })
  )?.isFile() === !0;
//@ chunk-9cjx5pnm.js:6730-7001 placement
async function openPublishFile(e, r) {
  let s = join_10(e, r.path),
    a = (await hi(e, s)) ? await di(s) : void 0;
  try {
    let m = await a?.stat(freeze_4),
      c =
        m?.isFile() === !0 &&
        m.size === BigInt(r.bytes) &&
        m.nlink === _r &&
        (await isSamePublishFile(e, s, m))
          ? await a?.readFile()
          : void 0;
    return c?.length === r.bytes ? c : void 0;
  } finally {
    await a?.close();
  }
}
//@ chunk-9cjx5pnm.js:7001-7299 placement
async function copyPublishFile(e, r, s) {
  let n = await openPublishFile(e, s);
  if (n === void 0) return;
  return (
    await mkdir_2(dirname_4(join_9(r, s.path)), { recursive: !0, mode: Rr })
      .then(() => writeFile(join_9(r, s.path), n, { flag: "wx", mode: ni }))
      .catch((a) =>
        Promise.reject(
          Error("A file could not be copied to be validated", {
            cause: `${getErrnoCode(a) ?? ""} ${s.path}`.trim(),
          }),
        ),
      ),
    computeContentHash(n)
  );
}
//@ chunk-9cjx5pnm.js:7299-7352 placement
async function Pi(e, r, s) {
  (e.abort(), await r, await s());
}
//@ chunk-9cjx5pnm.js:7352-7418 placement
var _i = (e, r) => Object.fromEntries(e.map((s, n) => [s.path, r[n] ?? ""]));
//@ chunk-9cjx5pnm.js:7418-7460 placement
var Oi = (e, r, s) => ({ home: e, dir: r, hashes: s });
/**
 * 把要发布的插件目录复制到临时快照目录（claude-publish-*），供校验和打包。
 */
//@ chunk-9cjx5pnm.js:7460-8407 placement
async function snapshotPublishFolder(e, r) {
  if (isCleanupStarted()) return Promise.reject(processEndingError());
  let s = await mkdtemp(join_8(tmpdir(), "claude-publish-")).catch((h) =>
      Promise.reject(
        Error("A folder to validate a copy in could not be made", { cause: getErrnoCode(h) ?? "" }),
      ),
    ),
    n = onceExport(() => removeValidationCopy(s));
  if (isCleanupStarted()) return (await n(), Promise.reject(processEndingError()));
  let a = join_8(s, "copy", basename_4(e)),
    abortController = new AbortController(),
    f = Promise.resolve()
      .then(() => mkdir(a, { recursive: !0, mode: Rr }))
      .catch(() => {
        return;
      })
      .then(() =>
        Promise.allSettled(
          r.map(
            limitConcurrency(MAX_COPY_DEPTH, (h) =>
              abortController.signal.aborted
                ? Promise.resolve(void 0)
                : copyPublishFile(e, a, h).catch((w) => (abortController.abort(), Promise.reject(w))),
            ),
          ),
        ),
      );
  using c = registerCleanup(() => Pi(abortController, f, n));
  let g = await f,
    found = g.find((h) => h.status === "rejected"),
    found_2 = r.find((h, w) => g[w]?.status === "fulfilled" && !g[w].value);
  if (
    (await (found === void 0 && found_2 === void 0 && !abortController.signal.aborted ? void 0 : n()),
    found?.status === "rejected")
  )
    return Promise.reject(found.reason);
  if (abortController.signal.aborted) return (await n(), Promise.reject(processEndingError()));
  if (found_2 !== void 0) return { missed: found_2.path };
  return Oi(
    s,
    a,
    _i(
      r,
      g.map((h) => (h.status === "fulfilled" ? h.value : void 0)),
    ),
  );
}
//@ chunk-9cjx5pnm.js:8407-8482 placement
var fileChangedOutcome = (e) => Qh("changed", [`${e.missed} is not the file that was listed`]);
//@ chunk-9cjx5pnm.js:8482-8984 placement
function diffListing(e, r) {
  let s = new Set(e.listing.files.map((file) => file.path));
  return [
    ...e.listing.files
      .filter((file) => !Object.hasOwn(r.hashes, file.path))
      .map((n) => "Among the files to send only since the folder was read: " + n.path),
    ...Object.keys(r.hashes)
      .filter((n) => !s.has(n))
      .map((n) => "No longer among the files to send since the folder was read: " + n),
    ...e.listing.files
      .filter((file) => Object.hasOwn(r.hashes, file.path) && e.hashes[file.path] !== r.hashes[file.path])
      .map((n) => `${n.path} is not the file that was listed`),
  ].slice(0, 1);
}
//@ chunk-9cjx5pnm.js:8984-9148 placement
function checkSnapshotUnchanged(e, r) {
  let s = e.kind === "ready" ? diffListing(e, r) : [];
  return s.length === 0 && (e.kind !== "ready" || e.listing.files.length === Object.keys(r.hashes).length)
    ? e
    : Qh("changed", s);
}
//@ chunk-9cjx5pnm.js:9181-9272 placement = _temp0 (1)
var slugifyPluginName = (a_5) =>
  a_5
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, "-")
    .replaceAll(/^-|-$/g, "") || "plugin";
//@ chunk-9cjx5pnm.js:9272-9399 placement
function folderNameFindings(e) {
  let r = checkReservedPluginName(slugifyPluginName(basename_5(e)));
  return r?.severity === "error" ? [`${r.message} The name comes from the folder: rename it.`] : [];
}
//@ chunk-9cjx5pnm.js:9432-9457 placement
var Fi = (e) => e && printableName(e, j0s);
//@ chunk-9cjx5pnm.js:9457-9472 placement
var Ni = "0.1.0";
//@ chunk-9cjx5pnm.js:9472-9547 placement
var Di = (
  e,
  r,
) => `${jsonStringify({ name: slugifyPluginName(basename_6(e)), version: Ni, description: Fi(r) }, null, 2)}
`;
//@ chunk-9cjx5pnm.js:9547-9608 placement
var Ui = (e, r) => ({ kind: "needs-manifest", root: e, draft: Di(e, r) });
//@ chunk-9cjx5pnm.js:9608-9700 placement
var zi = (e) =>
  e.flatMap((r) => r.errors.map((error) => `${r.filePath}: ${error.path}: ${redactSecrets(error.message)}`));
//@ chunk-9cjx5pnm.js:9729-9801 placement
var Ci = (e) => ({ name: e.name, version: e.version, description: e.description });
//@ chunk-9cjx5pnm.js:9801-9879 placement
var Bi = DoctorLazy(() => u({ name: o(), version: o().optional(), description: o().optional() }));
//@ chunk-9cjx5pnm.js:9879-10051 placement
async function readDraftManifestState(e) {
  let r = await getMcpAuthCache(join_11(e, PLUGIN_MANIFEST_PATH)),
    safeParse = Bi().safeParse(safeParseJSON(r.kind === "ok" ? r.content : ""));
  if (r.kind === "absent") return "absent";
  return safeParse.success ? Ci(safeParse.data) : "unreadable";
}
//@ chunk-9cjx5pnm.js:10051-10118 placement
function Wi(e, r) {
  return e !== void 0 && r !== void 0 ? [[e.path, computeContentHash(r)]] : [];
}
//@ chunk-9cjx5pnm.js:10118-10277 placement
async function readAllListed(e, r, s) {
  let results = await Promise.all(e.map(limitConcurrency(MAX_COPY_DEPTH, r))),
    found = e.find((f, c) => results[c] === void 0);
  return found === void 0 ? results.flatMap((f, c) => s(e[c], f)) : { missed: found.path };
}
//@ chunk-9cjx5pnm.js:10277-10388 placement
async function hashListedFiles(e, r) {
  let s = await readAllListed(r, (n) => openPublishFile(e, n), Wi);
  return "missed" in s ? s : { hashes: Object.fromEntries(s) };
}
//@ chunk-9cjx5pnm.js:10388-10469 placement
var Xr = (e) =>
  e.files.map((file) => file.path).filter((r) => `/${r}`.endsWith(`/${_P(PLUGIN_MANIFEST_PATH)}`));
//@ chunk-9cjx5pnm.js:10469-10664 placement
function publishSizeRefusal(e, r) {
  let s = Xr(e);
  if (s.length > 1) return Qh("findings", [`More than one manifest: ${s.join(", ")}`]);
  if (e.files.length > oTo) return Qh("too-many-files");
  return r > kOr ? Qh("too-large") : void 0;
}
//@ chunk-9cjx5pnm.js:10664-10894 placement
async function buildPublishSnapshot(e, r) {
  let s = await scanPublishFolder(e),
    reduced = s.files.reduce((c, g) => c + g.bytes, 0),
    a = publishSizeRefusal(s, reduced);
  if (a !== void 0) return a;
  let m = await hashListedFiles(e, s.files);
  return "missed" in m
    ? fileChangedOutcome(m)
    : { kind: "ready", root: e, manifest: r, listing: s, bytes: reduced, hashes: m.hashes };
}
//@ chunk-9cjx5pnm.js:10941-10975 placement
var qi = [
  " ",
  "\t",
  `
`,
  '"',
  "'",
  "(",
];
//@ chunk-9cjx5pnm.js:10975-11043 placement
var $i = (e) => e.slice(0, 1 + Math.max(...qi.map((r) => e.lastIndexOf(r))));
//@ chunk-9cjx5pnm.js:11043-11148 placement
function replaceSegmentsWith(e, r, s) {
  let parts = e.split(r);
  return parts
    .slice(0, -1)
    .map((a) => $i(a) + s)
    .concat(parts.at(-1) ?? "")
    .join("");
}
//@ chunk-9cjx5pnm.js:11148-11343 placement
function mapCopyPathToOriginal(e, r, s) {
  let n = dirname_6(r.dir),
    replaced = dirname_6(s).replace(/[\\/]$/, "");
  return [`${basename_7(r.home)}/copy`, `${basename_7(r.home)}\\copy`].reduce(
    (m, f) => replaceSegmentsWith(m, f, replaced),
    e.replaceAll(n, () => replaced).replaceAll(sanitizeForDisplay(n, n.length), () => replaced),
  );
}
//@ chunk-9cjx5pnm.js:11343-11469 placement
var mapCopyPathsInResults = (e, r, s) =>
  e.map((n) => ({
    ...n,
    filePath: mapCopyPathToOriginal(n.filePath, r, s),
    errors: n.errors.map((error) => ({ ...error, message: mapCopyPathToOriginal(error.message, r, s) })),
  }));
//@ chunk-9cjx5pnm.js:11469-11562 placement
function Yi(e) {
  return e.kind === "ready" && Xr(e.listing).length === 0 ? Qh("unreadable", [_P(PLUGIN_MANIFEST_PATH)]) : e;
}
//@ chunk-9cjx5pnm.js:11562-11962 placement
async function validateSnapshot(e, r, s) {
  let { manifest: manifest, contents: contents } = await resolveValidateTarget(r.dir),
    m = manifest?.errors.some((x) => x.code === NO_MANIFEST) ?? !0,
    combined = zi(mapCopyPathsInResults(m ? contents : [manifest ?? [], contents].flat(), r, e)).concat(
      m ? folderNameFindings(e) : [],
    ),
    c = m ? await $kt(r.dir) : manifest?.fileType === "plugin",
    g = await readDraftManifestState(r.dir);
  if (!c) return Qh("not-a-plugin");
  if (combined.length > 0) return Qh("findings", combined);
  if (g === "unreadable") return Qh("unreadable", [_P(PLUGIN_MANIFEST_PATH)]);
  return g === "absent" ? Ui(e, s) : checkSnapshotUnchanged(Yi(await buildPublishSnapshot(e, g)), r);
}
//@ chunk-9cjx5pnm.js:11962-12057 placement
function Qi(e) {
  let r = _P(PLUGIN_MANIFEST_PATH);
  return e.leftOut.some((n) => n.path === r) ? Qh("unreadable", [r]) : void 0;
}
//@ chunk-9cjx5pnm.js:12057-12411 placement
async function checkPublishFolderSize(e, r) {
  let s = await scanPublishFolder(e),
    n =
      Qi(s) ??
      publishSizeRefusal(
        s,
        s.files.reduce((c, g) => c + g.bytes, 0),
      );
  if (n !== void 0) return n;
  let a = await snapshotPublishFolder(e, s.files);
  if ("missed" in a) return fileChangedOutcome(a);
  let m = onceExport(() => removeValidationCopy(a.home));
  using f = registerCleanup(m);
  if (isCleanupStarted()) return (await m(), Promise.reject(processEndingError()));
  try {
    return await validateSnapshot(e, a, r).catch((c) =>
      Qh(
        "unreadable",
        errorDetails(c).map((g) => mapCopyPathToOriginal(g, a, e)),
      ),
    );
  } finally {
    await m();
  }
}
//@ chunk-9cjx5pnm.js:12411-12614 placement
async function resolvePublishFolder(e, r) {
  let s = await realpath(resolve(getCwd(), e)).catch(() => {
    return;
  });
  if (!(s !== void 0 && (await FF(s)))) return Qh("no-folder", [e]);
  return (await readPluginFileSafe(s, join(s, De))) === "refused"
    ? Qh("unreadable", [De])
    : unreadableOnError(checkPublishFolderSize(s, r));
}
//@ chunk-9cjx5pnm.js:12614-12683 placement
var on = (e) => ({ path: _P(PLUGIN_MANIFEST_PATH), bytes: Buffer.byteLength(e.draft), mode: FILE_MODE_RW });
//@ chunk-9cjx5pnm.js:12716-12860 placement
function draftManifestSummary(e) {
  let safeParse = PluginManifestSchema().safeParse(safeParseJSON(e.draft));
  return {
    name: safeParse.data?.name ?? basename_8(e.root),
    version: safeParse.data?.version,
    description: safeParse.data?.description,
  };
}
//@ chunk-9cjx5pnm.js:12860-12932 placement
var nn = (e, r) => ({ files: e.files.concat(r).toSorted(byPath), leftOut: e.leftOut });
//@ chunk-9cjx5pnm.js:12932-12967 placement
var an = (e, r, s) => ({ ...e, [r]: computeContentHash(s) });
//@ chunk-9cjx5pnm.js:12967-13073 placement
var withDraftManifest = (e, r, s) => ({
  ...e,
  bytes: e.bytes + r.bytes,
  listing: nn(e.listing, r),
  hashes: an(e.hashes, r.path, s.draft),
});
//@ chunk-9cjx5pnm.js:13073-13167 placement
async function mn(e) {
  let r = on(e),
    s = await buildPublishSnapshot(e.root, draftManifestSummary(e));
  return s.kind === "ready" ? withDraftManifest(s, r, e) : s;
}
//@ chunk-9cjx5pnm.js:13167-13234 placement
async function fn(e) {
  return e.kind === "needs-manifest" ? unreadableOnError(mn(e)) : e;
}
//@ chunk-9cjx5pnm.js:13234-13441 placement
async function preparePublishFolder(e, r) {
  let s = await resolvePublishFolder(e.folder, e.description),
    n = await fn(s);
  if (n.kind === "refused") return n;
  return n.kind === "ready"
    ? { wanted: e, plan: n, organization: r, draft: draftManifestOf(s), withheld: !1 }
    : Qh("unreadable");
}
//@ chunk-9cjx5pnm.js:13441-13826 placement
var PUBLISH_STOPPED_TEXT = Object.freeze({
  nothing: "Nothing was sent.",
  uploading:
    "The upload was on its way: look in your uploads on claude.ai, where it may have arrived. Nothing was submitted.",
  shelved: "The upload had arrived on your own shelf, where only you see it. It was not submitted.",
  submitting:
    "The upload had arrived, and its submission was on its way: it may have reached your organization.",
});
//@ chunk-9cjx5pnm.js:13826-13895 placement
function stoppedOrResult(e, r, s) {
  return e.signal.aborted ? Qh("stopped", [PUBLISH_STOPPED_TEXT[s]]) : r;
}
//@ chunk-9cjx5pnm.js:14213-14224 placement
var dn = 200;
//@ chunk-9cjx5pnm.js:14224-14235 placement
var cn = 300;
//@ chunk-9cjx5pnm.js:14235-14274 placement
var isClientErrorStatus = (e) => e.status >= dn && e.status < cn;
//@ chunk-9cjx5pnm.js:14274-14285 placement
var gn = 400;
//@ chunk-9cjx5pnm.js:14285-14296 placement
var hn = 405;
//@ chunk-9cjx5pnm.js:14296-14307 placement
var bn = 404;
//@ chunk-9cjx5pnm.js:14307-14318 placement
var yn = 501;
//@ chunk-9cjx5pnm.js:14318-14329 placement
var xn = 422;
//@ chunk-9cjx5pnm.js:14329-14368 placement
var freeze_6 = Object.freeze([gn, bn, hn, xn, yn]);
//@ chunk-9cjx5pnm.js:14368-14378 placement
var Sn = 20;
//@ chunk-9cjx5pnm.js:14378-14389 placement
var Pn = 300;
//@ chunk-9cjx5pnm.js:14389-14428 placement
var freeze_7 = Object.freeze(["scan", "other"]);
//@ chunk-9cjx5pnm.js:14428-14544 placement
var publishFindingsList = (e, r) =>
  [...r.findings, ...[r.message ?? ""].filter((s) => s !== "" && freeze_7.includes(e))]
    .slice(0, Sn)
    .map((s) => truncateToLength(s, Pn));
//@ chunk-9cjx5pnm.js:14544-14783 placement
var publishApiErrorSchema = DoctorLazy(() =>
  u({
    error: u({
      message: o().optional(),
      details: u({
        error_code: o().optional(),
        validation_errors: u({
          message: o().optional(),
          plugins: A(u({ name: o().optional(), error: o().optional() })).optional(),
        }).optional(),
      }).optional(),
    }).optional(),
  }),
);
//@ chunk-9cjx5pnm.js:14783-15042 placement
function parsePublishApiError(e) {
  let r = publishApiErrorSchema().safeParse(e.data).data?.error,
    s = r?.details?.validation_errors;
  return {
    code: r?.details?.error_code,
    message: r?.message,
    findings: [
      s?.message ?? "",
      ...(s?.plugins ?? []).map((n) => [n.name, n.error].filter(Boolean).join(": ")),
    ].filter(Boolean),
  };
}
//@ chunk-9cjx5pnm.js:15042-15144 placement
function publishApiOutcome(e, r) {
  let s = parsePublishApiError(e),
    n = r.codes[s.code ?? ""] ?? r.statuses[e.status] ?? "other";
  return Qh(n, publishFindingsList(n, s));
}
//@ chunk-9cjx5pnm.js:15144-15169 placement
var freeze_8 = Object.freeze({});
//@ chunk-9cjx5pnm.js:15169-15183 placement
var En = 120000;
//@ chunk-9cjx5pnm.js:15183-15196 placement
var Ln = 15000;
//@ chunk-9cjx5pnm.js:15196-15235 placement
var PUBLISH_HTTP = Object.freeze({ get: Ln, post: En });

export {
  freeze_8,
  PUBLISH_HTTP,
  parsePublishApiError,
  freeze_6,
  isClientErrorStatus,
  publishApiOutcome,
  slugifyPluginName,
  stoppedOrResult,
  scanPublishFolder,
  resolvePublishFolder,
  preparePublishFolder,
  openPublishFile,
  readAllListed,
  fileChangedOutcome,
  PUBLISH_STOPPED_TEXT,
};
