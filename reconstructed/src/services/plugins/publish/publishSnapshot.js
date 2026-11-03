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
import { join, dirname, basename, resolve } from "path";
import { readdir, lstat, realpath, open, mkdir, writeFile, mkdtemp } from "fs/promises";
import {
  exclusionEntriesFor,
  relativePosixPathOf,
  listingEntry,
  MAX_COPY_DEPTH,
  statEntry,
  assertGitignoreNotHardlinked,
  isIgnorableErrno,
  readGitignoreSafely,
  byPath,
  processEndingError,
  removeValidationCopy,
  errorDetails,
  MANIFEST_DIR_NAME,
  unreadableOnError,
  FILE_MODE_RW,
  draftManifestOf,
} from "./validationCopy.js";
import { limitConcurrency } from "../../../utils/concurrencyLimit.js";
import {
  MAX_PUBLISH_FILES,
  refusalResult,
  MAX_PUBLISH_STEPS,
  MAX_PUBLISH_BYTES,
} from "../../../tools/PublishPluginTool/constants.js";
import { isSubpathOf } from "../../../utils/pathPrefix.js";
import { readOnlyNoFollowFlags } from "../../../utils/platformTargets.js";
import { getErrnoCode } from "../../../utils/errors.js";
import {
  readPluginFileSafe,
  getMcpAuthCache,
  isDirectoryOrFalse,
} from "../../../utils/plugins/safeFileRead.js";
import { computeContentHash } from "../../../utils/commitAttribution.js";
import { isCleanupStarted, registerCleanup } from "../../../utils/cleanupRegistry.js";
import { tmpdir } from "../../../utils/tempDir.js";
import { onceExport } from "../../../../vendor/lodash-es/once.js";
import { checkReservedPluginName } from "../../../utils/plugins/reservedPluginNames.js";
import { printableName } from "../../../utils/printableName.js";
import { jsonStringify } from "../../../utils/slowOperations.js";
import { redactSecrets } from "../../teamMemorySync/secretScanner.js";
import { DoctorLazy } from "../../../cli/handlers/util.js";
import { u, string, array } from "../../../../vendor/zod/v4/classic/schemas.js";
import { PLUGIN_MANIFEST_PATH, pluginRootHasMarker } from "../../../utils/plugins/commandSource.js";
import { safeParseJSON } from "../../../utils/json.js";
import { identityPath_2 } from "../../../skills/loadSkillsDir.js";
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
  let flattened = s.flatMap((f) => exclusionEntriesFor(e, r, f));
  let a = new Set(flattened.map((f) => f.path));
  let filtered = s.filter((f) => !a.has(relativePosixPathOf(e, f)));
  return {
    files: filtered.filter((f) => f.kind === "file").map((f) => listingEntry(e, f)),
    leftOut: flattened,
    folders: filtered
      .filter((f) => f.kind === "folder")
      .map((f) => ({
        path: f.path,
        scope: r.scope,
      })),
  };
}
//@ chunk-9cjx5pnm.js:5044-5229 placement
async function scanPublishDir(e, r) {
  let s = limitConcurrency(MAX_COPY_DEPTH, (a) => statEntry(join(r.path, a)));
  let results = await Promise.all((await readdir(r.path)).toSorted().map(s));
  return excludeListedFiles(
    e,
    {
      path: r.path,
      scope: r.scope.concat(await assertGitignoreNotHardlinked(r.path, results)),
    },
    results,
  );
}
//@ chunk-9cjx5pnm.js:5261-5318 placement
/**
 * 列出自身及所有祖先目录。
 */
function ancestorDirs(e) {
  let r = dirname(e);
  return r === e ? [e] : [e, ...ancestorDirs(r)];
}
//@ chunk-9cjx5pnm.js:5384-5458 placement
/**
 * 判断目录下是否有 .git。
 */
var hasGitDir = (e) =>
  lstat(join(e, ".git")).then(
    () => true,
    (error) => (isIgnorableErrno(error) ? false : Promise.reject(error)),
  );
//@ chunk-9cjx5pnm.js:5458-5577 placement
async function ancestorGitignoreDirs(e) {
  let r = ancestorDirs(e);
  for (let [s, n] of r.entries()) if (await hasGitDir(n)) return r.slice(1, s + 1).toReversed();
  return [];
}
//@ chunk-9cjx5pnm.js:5577-5644 placement
/**
 * 读取祖先目录的 .gitignore 规则。
 */
var ancestorGitignoreRules = async (e) =>
  (await Promise.all((await ancestorGitignoreDirs(e)).map(readGitignoreSafely))).flat();
//@ chunk-9cjx5pnm.js:5644-5879 placement
async function scanPublishFolder(e) {
  let r = [];
  let s = [];
  let n = [
    {
      path: e,
      scope: await ancestorGitignoreRules(e),
    },
  ];
  for (let a of n) {
    if (r.length > MAX_PUBLISH_FILES) break;
    let f = await scanPublishDir(e, a);
    r.push(...f.files);
    s.push(...f.leftOut);
    n.push(...f.folders);
  }
  return {
    files: r.toSorted(byPath),
    leftOut: s.toSorted(byPath),
  };
}
//@ chunk-9cjx5pnm.js:6070-6081 placement
/**
 * 复制/创建目录的权限（0700）。
 */
var DIR_MODE = 448;
//@ chunk-9cjx5pnm.js:6081-6092 placement
/**
 * 写文件的权限（0600）。
 */
var FILE_MODE = 384;
//@ chunk-9cjx5pnm.js:6173-6183 placement
/**
 * 读取 .gitignore 时传给读取函数的选项（当前为 false）。
 */
var READ_GITIGNORE_OPTIONS = false;
//@ chunk-9cjx5pnm.js:6183-6193 placement
/**
 * 单链接文件的 nlink 值（1n）。
 */
var SINGLE_LINK_NLINK = 1n;
//@ chunk-9cjx5pnm.js:6193-6227 placement
var Or = Object.freeze({
  bigint: true,
});
//@ chunk-9cjx5pnm.js:6227-6389 placement
async function isSamePublishFile(e, r, s) {
  let n = await realpath(r).catch(() => e);
  let m = isSubpathOf(e, n, READ_GITIGNORE_OPTIONS)
    ? await lstat(n, Or).catch(() => {
        return;
      })
    : undefined;
  return m?.ino === s.ino && m.dev === s.dev && m.nlink === SINGLE_LINK_NLINK;
}
//@ chunk-9cjx5pnm.js:6425-6485 placement
var li = Object.freeze(["ENOENT", "ENOTDIR", "ELOOP", "EISDIR"]);
//@ chunk-9cjx5pnm.js:6485-6567 placement
/**
 * 打开文件，忽略指定错误码。
 */
var openOrIgnore = (e) =>
  open(e, readOnlyNoFollowFlags()).catch((error) =>
    li.includes(getErrnoCode(error) ?? "") ? undefined : Promise.reject(error),
  );
//@ chunk-9cjx5pnm.js:6636-6730 placement
/**
 * 判断文件可安全读取且是普通文件。
 */
var isOpenableFile = async (e, r) =>
  (await readPluginFileSafe(e, dirname(r))) === "ok" &&
  (
    await lstat(r).catch(() => {
      return;
    })
  )?.isFile() === true;
//@ chunk-9cjx5pnm.js:6730-7001 placement
async function openPublishFile(e, r) {
  let s = join(e, r.path);
  let a = (await isOpenableFile(e, s)) ? await openOrIgnore(s) : undefined;
  try {
    let stats = await a?.stat(Or);
    let c =
      stats?.isFile() === true &&
      stats.size === BigInt(r.bytes) &&
      stats.nlink === SINGLE_LINK_NLINK &&
      (await isSamePublishFile(e, s, stats))
        ? await a?.readFile()
        : undefined;
    return c?.length === r.bytes ? c : undefined;
  } finally {
    await a?.close();
  }
}
//@ chunk-9cjx5pnm.js:7001-7299 placement
async function copyPublishFile(e, r, s) {
  let publishFile = await openPublishFile(e, s);
  if (publishFile === undefined) return;
  await mkdir(dirname(join(r, s.path)), {
    recursive: true,
    mode: DIR_MODE,
  })
    .then(() =>
      writeFile(join(r, s.path), publishFile, {
        flag: "wx",
        mode: FILE_MODE,
      }),
    )
    .catch((error) =>
      Promise.reject(
        Error("A file could not be copied to be validated", {
          cause: `${getErrnoCode(error) ?? ""} ${s.path}`.trim(),
        }),
      ),
    );
  return computeContentHash(publishFile);
}
//@ chunk-9cjx5pnm.js:7299-7352 placement
/**
 * 中止请求并等待清理。
 */
async function abortAndWait(abortController, r, s) {
  abortController.abort();
  await r;
  await s();
}
//@ chunk-9cjx5pnm.js:7352-7418 placement
/**
 * 按路径映射哈希。
 */
var hashByPath = (e, r) => Object.fromEntries(e.map((s, n) => [s.path, r[n] ?? ""]));
//@ chunk-9cjx5pnm.js:7418-7460 placement
/**
 * 组装快照句柄（home、dir、hashes）。
 */
var snapshotHandle = (home, dir, hashes) => ({
  home,
  dir,
  hashes,
});
//@ chunk-9cjx5pnm.js:7460-8407 placement
/**
 * 把要发布的插件目录复制到临时快照目录（claude-publish-*），供校验和打包。
 */
async function snapshotPublishFolder(e, files) {
  if (isCleanupStarted()) return Promise.reject(processEndingError());
  let home = await mkdtemp(join(tmpdir(), "claude-publish-")).catch((error) =>
    Promise.reject(
      Error("A folder to validate a copy in could not be made", {
        cause: getErrnoCode(error) ?? "",
      }),
    ),
  );
  let n = onceExport(() => removeValidationCopy(home));
  if (isCleanupStarted()) {
    await n();
    return Promise.reject(processEndingError());
  }
  let dir = join(home, "copy", basename(e));
  let abortController = new AbortController();
  let f = Promise.resolve()
    .then(() =>
      mkdir(dir, {
        recursive: true,
        mode: DIR_MODE,
      }),
    )
    .catch(() => {
      return;
    })
    .then(() =>
      Promise.allSettled(
        files.map(
          limitConcurrency(MAX_COPY_DEPTH, (h) =>
            abortController.signal.aborted
              ? Promise.resolve(undefined)
              : copyPublishFile(e, dir, h).catch((error) => {
                  abortController.abort();
                  return Promise.reject(error);
                }),
          ),
        ),
      ),
    );
  using c = registerCleanup(() => abortAndWait(abortController, f, n));
  let g = await f;
  let found = g.find((h) => h.status === "rejected");
  let found_2 = files.find((h, w) => g[w]?.status === "fulfilled" && !g[w].value);
  await (found === undefined && found_2 === undefined && !abortController.signal.aborted ? undefined : n());
  if (found?.status === "rejected") return Promise.reject(found.reason);
  if (abortController.signal.aborted) {
    await n();
    return Promise.reject(processEndingError());
  }
  if (found_2 !== undefined)
    return {
      missed: found_2.path,
    };
  return snapshotHandle(
    home,
    dir,
    hashByPath(
      files,
      g.map((h) => (h.status === "fulfilled" ? h.value : undefined)),
    ),
  );
}
//@ chunk-9cjx5pnm.js:8407-8482 placement
var fileChangedOutcome = (e) => refusalResult("changed", [`${e.missed} is not the file that was listed`]);
//@ chunk-9cjx5pnm.js:8482-8984 placement
function diffListing(e, r) {
  let s = new Set(e.listing.files.map((file) => file.path));
  return [
    ...e.listing.files
      .filter((file) => !Object.hasOwn(r.hashes, file.path))
      .map((file) => "Among the files to send only since the folder was read: " + file.path),
    ...Object.keys(r.hashes)
      .filter((key) => !s.has(key))
      .map((key) => "No longer among the files to send since the folder was read: " + key),
    ...e.listing.files
      .filter((file) => Object.hasOwn(r.hashes, file.path) && e.hashes[file.path] !== r.hashes[file.path])
      .map((file) => `${file.path} is not the file that was listed`),
  ].slice(0, 1);
}
//@ chunk-9cjx5pnm.js:8984-9148 placement
function checkSnapshotUnchanged(e, r) {
  let s = e.kind === "ready" ? diffListing(e, r) : [];
  return s.length === 0 && (e.kind !== "ready" || e.listing.files.length === Object.keys(r.hashes).length)
    ? e
    : refusalResult("changed", s);
}
//@ chunk-9cjx5pnm.js:9181-9272 placement = _temp0 (1)
var slugifyPluginName = (a_5) =>
  a_5
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, "-")
    .replaceAll(/^-|-$/g, "") || "plugin";
//@ chunk-9cjx5pnm.js:9272-9399 placement
function folderNameFindings(e) {
  let r = checkReservedPluginName(slugifyPluginName(basename(e)));
  return r?.severity === "error" ? [`${r.message} The name comes from the folder: rename it.`] : [];
}
//@ chunk-9cjx5pnm.js:9432-9457 placement
/**
 * 清洗插件描述。
 */
var sanitizeDescription = (e) => e && printableName(e, MAX_PUBLISH_STEPS);
//@ chunk-9cjx5pnm.js:9457-9472 placement
/**
 * 补全 manifest 时使用的默认版本（0.1.0）。
 */
var DEFAULT_PLUGIN_VERSION = "0.1.0";
//@ chunk-9cjx5pnm.js:9472-9547 placement
/**
 * 生成草稿 manifest 文本。
 */
var draftManifestText = (e, r) => `${jsonStringify(
  {
    name: slugifyPluginName(basename(e)),
    version: DEFAULT_PLUGIN_VERSION,
    description: sanitizeDescription(r),
  },
  null,
  2,
)}
`;
//@ chunk-9cjx5pnm.js:9547-9608 placement
/**
 * 生成 “需要补 manifest” 的结果。
 */
var needsManifestResult = (e, r) => ({
  kind: "needs-manifest",
  root: e,
  draft: draftManifestText(e, r),
});
//@ chunk-9cjx5pnm.js:9608-9700 placement
/**
 * 汇总各文件的校验错误。
 */
var combinedIssues = (e) =>
  e.flatMap((r) => r.errors.map((error) => `${r.filePath}: ${error.path}: ${redactSecrets(error.message)}`));
//@ chunk-9cjx5pnm.js:9729-9801 placement
/**
 * 提取 manifest 的摘要字段。
 */
var pickManifestSummary = (e) => ({
  name: e.name,
  version: e.version,
  description: e.description,
});
//@ chunk-9cjx5pnm.js:9801-9879 placement
/**
 * 插件 manifest 摘要 schema。
 */
var pluginManifestSummarySchema = DoctorLazy(() =>
  u({
    name: string(),
    version: string().optional(),
    description: string().optional(),
  }),
);
//@ chunk-9cjx5pnm.js:9879-10051 placement
async function readDraftManifestState(dir) {
  let mcpAuthCache = await getMcpAuthCache(join(dir, PLUGIN_MANIFEST_PATH));
  let s = pluginManifestSummarySchema().safeParse(
    safeParseJSON(mcpAuthCache.kind === "ok" ? mcpAuthCache.content : ""),
  );
  if (mcpAuthCache.kind === "absent") return "absent";
  return s.success ? pickManifestSummary(s.data) : "unreadable";
}
//@ chunk-9cjx5pnm.js:10051-10118 placement
/**
 * 生成单个文件的哈希对。
 */
function hashPair(e, r) {
  return e !== undefined && r !== undefined ? [[e.path, computeContentHash(r)]] : [];
}
//@ chunk-9cjx5pnm.js:10118-10277 placement
async function readAllListed(e, r, s) {
  let results = await Promise.all(e.map(limitConcurrency(MAX_COPY_DEPTH, r)));
  let found = e.find((f, c) => results[c] === undefined);
  return found === undefined
    ? results.flatMap((f, c) => s(e[c], f))
    : {
        missed: found.path,
      };
}
//@ chunk-9cjx5pnm.js:10277-10388 placement
async function hashListedFiles(e, files) {
  let allListed = await readAllListed(files, (n) => openPublishFile(e, n), hashPair);
  return "missed" in allListed
    ? allListed
    : {
        hashes: Object.fromEntries(allListed),
      };
}
//@ chunk-9cjx5pnm.js:10388-10469 placement
/**
 * 找出 manifest 文件路径。
 */
var manifestPaths = (e) =>
  e.files
    .map((file) => file.path)
    .filter((r) => `/${r}`.endsWith(`/${identityPath_2(PLUGIN_MANIFEST_PATH)}`));
//@ chunk-9cjx5pnm.js:10469-10664 placement
function publishSizeRefusal(e, r) {
  let s = manifestPaths(e);
  if (s.length > 1) return refusalResult("findings", [`More than one manifest: ${s.join(", ")}`]);
  if (e.files.length > MAX_PUBLISH_FILES) return refusalResult("too-many-files");
  return r > MAX_PUBLISH_BYTES ? refusalResult("too-large") : undefined;
}
//@ chunk-9cjx5pnm.js:10664-10894 placement
async function buildPublishSnapshot(e, manifest) {
  let s = await scanPublishFolder(e);
  let reduced = s.files.reduce((acc, file) => acc + file.bytes, 0);
  let a = publishSizeRefusal(s, reduced);
  if (a !== undefined) return a;
  let m = await hashListedFiles(e, s.files);
  return "missed" in m
    ? fileChangedOutcome(m)
    : {
        kind: "ready",
        root: e,
        manifest,
        listing: s,
        bytes: reduced,
        hashes: m.hashes,
      };
}
//@ chunk-9cjx5pnm.js:10941-10975 placement
/**
 * 引号与前缀字符集合。
 */
var QUOTE_CHARS = [
  " ",
  "\t",
  `
`,
  '"',
  "'",
  "(",
];
//@ chunk-9cjx5pnm.js:10975-11043 placement
/**
 * 取到最后一个引号为止的前缀。
 */
var prefixThroughLastQuote = (e) => e.slice(0, 1 + Math.max(...QUOTE_CHARS.map((r) => e.lastIndexOf(r))));
//@ chunk-9cjx5pnm.js:11043-11148 placement
function replaceSegmentsWith(e, r, s) {
  let parts = e.split(r);
  return parts
    .slice(0, -1)
    .map((a) => prefixThroughLastQuote(a) + s)
    .concat(parts.at(-1) ?? "")
    .join("");
}
//@ chunk-9cjx5pnm.js:11148-11343 placement
function mapCopyPathToOriginal(e, r, s) {
  let n = dirname(r.dir);
  let replaced = dirname(s).replace(/[\\/]$/, "");
  return [`${basename(r.home)}/copy`, `${basename(r.home)}\\copy`].reduce(
    (acc, f) => replaceSegmentsWith(acc, f, replaced),
    e.replaceAll(n, () => replaced).replaceAll(sanitizeForDisplay(n, n.length), () => replaced),
  );
}
//@ chunk-9cjx5pnm.js:11343-11469 placement
var mapCopyPathsInResults = (e, r, s) =>
  e.map((n) => ({
    ...n,
    filePath: mapCopyPathToOriginal(n.filePath, r, s),
    errors: n.errors.map((error) => ({
      ...error,
      message: mapCopyPathToOriginal(error.message, r, s),
    })),
  }));
//@ chunk-9cjx5pnm.js:11469-11562 placement
/**
 * 缺 manifest 时改成不可读结果。
 */
function requireManifestPath(publishSnapshot) {
  return publishSnapshot.kind === "ready" && manifestPaths(publishSnapshot.listing).length === 0
    ? refusalResult("unreadable", [identityPath_2(PLUGIN_MANIFEST_PATH)])
    : publishSnapshot;
}
//@ chunk-9cjx5pnm.js:11562-11962 placement
async function validateSnapshot(e, r, s) {
  let { manifest, contents } = await resolveValidateTarget(r.dir);
  let m = manifest?.errors.some((error) => error.code === NO_MANIFEST) ?? true;
  let combined = combinedIssues(
    mapCopyPathsInResults(m ? contents : [manifest ?? [], contents].flat(), r, e),
  ).concat(m ? folderNameFindings(e) : []);
  let c = m ? await pluginRootHasMarker(r.dir) : manifest?.fileType === "plugin";
  let manifest_2 = await readDraftManifestState(r.dir);
  if (!c) return refusalResult("not-a-plugin");
  if (combined.length > 0) return refusalResult("findings", combined);
  if (manifest_2 === "unreadable") return refusalResult("unreadable", [identityPath_2(PLUGIN_MANIFEST_PATH)]);
  return manifest_2 === "absent"
    ? needsManifestResult(e, s)
    : checkSnapshotUnchanged(requireManifestPath(await buildPublishSnapshot(e, manifest_2)), r);
}
//@ chunk-9cjx5pnm.js:11962-12057 placement
/**
 * 检查 manifest 是否被排除在外。
 */
function leftOutManifestProblem(e) {
  let r = identityPath_2(PLUGIN_MANIFEST_PATH);
  return e.leftOut.some((n) => n.path === r) ? refusalResult("unreadable", [r]) : undefined;
}
//@ chunk-9cjx5pnm.js:12057-12411 placement
async function checkPublishFolderSize(e, r) {
  let s = await scanPublishFolder(e);
  let n =
    leftOutManifestProblem(s) ??
    publishSizeRefusal(
      s,
      s.files.reduce((acc, file) => acc + file.bytes, 0),
    );
  if (n !== undefined) return n;
  let a = await snapshotPublishFolder(e, s.files);
  if ("missed" in a) return fileChangedOutcome(a);
  let m = onceExport(() => removeValidationCopy(a.home));
  using f = registerCleanup(m);
  if (isCleanupStarted()) {
    await m();
    return Promise.reject(processEndingError());
  }
  try {
    return await validateSnapshot(e, a, r).catch((error) =>
      refusalResult(
        "unreadable",
        errorDetails(error).map((g) => mapCopyPathToOriginal(g, a, e)),
      ),
    );
  } finally {
    await m();
  }
}
//@ chunk-9cjx5pnm.js:12411-12614 placement
async function resolvePublishFolder(folder, description) {
  let s = await realpath(resolve(getCwd(), folder)).catch(() => {
    return;
  });
  if (!(s !== undefined && (await isDirectoryOrFalse(s)))) return refusalResult("no-folder", [folder]);
  return (await readPluginFileSafe(s, join(s, MANIFEST_DIR_NAME))) === "refused"
    ? refusalResult("unreadable", [MANIFEST_DIR_NAME])
    : unreadableOnError(checkPublishFolderSize(s, description));
}
//@ chunk-9cjx5pnm.js:12614-12683 placement
/**
 * 构造草稿 manifest 的条目。
 */
var draftManifestEntry = (e) => ({
  path: identityPath_2(PLUGIN_MANIFEST_PATH),
  bytes: Buffer.byteLength(e.draft),
  mode: FILE_MODE_RW,
});
//@ chunk-9cjx5pnm.js:12716-12860 placement
function draftManifestSummary(e) {
  let r = PluginManifestSchema().safeParse(safeParseJSON(e.draft));
  return {
    name: r.data?.name ?? basename(e.root),
    version: r.data?.version,
    description: r.data?.description,
  };
}
//@ chunk-9cjx5pnm.js:12860-12932 placement
/**
 * 把草稿条目并入文件列表。
 */
var appendFiles = (listing, r) => ({
  files: listing.files.concat(r).toSorted(byPath),
  leftOut: listing.leftOut,
});
//@ chunk-9cjx5pnm.js:12932-12967 placement
/**
 * 给哈希表加上某文件的哈希。
 */
var withHash = (hashes, path, draft) => ({
  ...hashes,
  [path]: computeContentHash(draft),
});
//@ chunk-9cjx5pnm.js:12967-13073 placement
var withDraftManifest = (publishSnapshot, r, s) => ({
  ...publishSnapshot,
  bytes: publishSnapshot.bytes + r.bytes,
  listing: appendFiles(publishSnapshot.listing, r),
  hashes: withHash(publishSnapshot.hashes, r.path, s.draft),
});
//@ chunk-9cjx5pnm.js:13073-13167 placement
/**
 * 为 “需要补 manifest” 的情况补上草稿。
 */
async function buildWithDraftManifest(e) {
  let r = draftManifestEntry(e);
  let publishSnapshot = await buildPublishSnapshot(e.root, draftManifestSummary(e));
  return publishSnapshot.kind === "ready" ? withDraftManifest(publishSnapshot, r, e) : publishSnapshot;
}
//@ chunk-9cjx5pnm.js:13167-13234 placement
/**
 * 需要补 manifest 时重算快照。
 */
async function ensureManifest(publishFolder) {
  return publishFolder.kind === "needs-manifest"
    ? unreadableOnError(buildWithDraftManifest(publishFolder))
    : publishFolder;
}
//@ chunk-9cjx5pnm.js:13234-13441 placement
async function preparePublishFolder(e, organization) {
  let publishFolder = await resolvePublishFolder(e.folder, e.description);
  let manifest = await ensureManifest(publishFolder);
  if (manifest.kind === "refused") return manifest;
  return manifest.kind === "ready"
    ? {
        wanted: e,
        plan: manifest,
        organization,
        draft: draftManifestOf(publishFolder),
        withheld: false,
      }
    : refusalResult("unreadable");
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
  return e.signal.aborted ? refusalResult("stopped", [PUBLISH_STOPPED_TEXT[s]]) : r;
}
//@ chunk-9cjx5pnm.js:14213-14224 placement
/**
 * 客户端错误状态码下界（200）。
 */
var CLIENT_ERROR_MIN = 200;
//@ chunk-9cjx5pnm.js:14224-14235 placement
/**
 * 客户端错误状态码上界（300）。
 */
var CLIENT_ERROR_MAX = 300;
//@ chunk-9cjx5pnm.js:14235-14274 placement
var isClientErrorStatus = (e) => e.status >= CLIENT_ERROR_MIN && e.status < CLIENT_ERROR_MAX;
//@ chunk-9cjx5pnm.js:14274-14285 placement
/**
 * 状态码 400。
 */
var STATUS_BAD_REQUEST = 400;
//@ chunk-9cjx5pnm.js:14285-14296 placement
/**
 * 状态码 405。
 */
var STATUS_METHOD_NOT_ALLOWED = 405;
//@ chunk-9cjx5pnm.js:14296-14307 placement
/**
 * 状态码 404。
 */
var STATUS_NOT_FOUND = 404;
//@ chunk-9cjx5pnm.js:14307-14318 placement
/**
 * 状态码 501。
 */
var STATUS_NOT_IMPLEMENTED = 501;
//@ chunk-9cjx5pnm.js:14318-14329 placement
/**
 * 状态码 422。
 */
var STATUS_UNPROCESSABLE = 422;
//@ chunk-9cjx5pnm.js:14329-14368 placement
var Rn = Object.freeze([
  STATUS_BAD_REQUEST,
  STATUS_NOT_FOUND,
  STATUS_METHOD_NOT_ALLOWED,
  STATUS_UNPROCESSABLE,
  STATUS_NOT_IMPLEMENTED,
]);
//@ chunk-9cjx5pnm.js:14368-14378 placement
/**
 * 最多列出的错误条数（20）。
 */
var MAX_LISTED_ERRORS = 20;
//@ chunk-9cjx5pnm.js:14378-14389 placement
/**
 * 单条错误的最大字符数（300）。
 */
var MAX_ERROR_CHARS = 300;
//@ chunk-9cjx5pnm.js:14389-14428 placement
var _n = Object.freeze(["scan", "other"]);
//@ chunk-9cjx5pnm.js:14428-14544 placement
var publishFindingsList = (e, publishApiError) =>
  [...publishApiError.findings, ...[publishApiError.message ?? ""].filter((s) => s !== "" && _n.includes(e))]
    .slice(0, MAX_LISTED_ERRORS)
    .map((s) => truncateToLength(s, MAX_ERROR_CHARS));
//@ chunk-9cjx5pnm.js:14544-14783 placement
var publishApiErrorSchema = DoctorLazy(() =>
  u({
    error: u({
      message: string().optional(),
      details: u({
        error_code: string().optional(),
        validation_errors: u({
          message: string().optional(),
          plugins: array(
            u({
              name: string().optional(),
              error: string().optional(),
            }),
          ).optional(),
        }).optional(),
      }).optional(),
    }).optional(),
  }),
);
//@ chunk-9cjx5pnm.js:14783-15042 placement
function parsePublishApiError(e) {
  let error = publishApiErrorSchema().safeParse(e.data).data?.error;
  let validationErrors = error?.details?.validation_errors;
  return {
    code: error?.details?.error_code,
    message: error?.message,
    findings: [
      validationErrors?.message ?? "",
      ...(validationErrors?.plugins ?? []).map((n) => [n.name, n.error].filter(Boolean).join(": ")),
    ].filter(Boolean),
  };
}
//@ chunk-9cjx5pnm.js:15042-15144 placement
function publishApiOutcome(e, r) {
  let publishApiError = parsePublishApiError(e);
  let n = r.codes[publishApiError.code ?? ""] ?? r.statuses[e.status] ?? "other";
  return refusalResult(n, publishFindingsList(n, publishApiError));
}
//@ chunk-9cjx5pnm.js:15144-15169 placement
var An = Object.freeze({});
//@ chunk-9cjx5pnm.js:15169-15183 placement
/**
 * 发布 POST 请求的超时（120000 毫秒）。
 */
var PUBLISH_POST_TIMEOUT_MS = 120000;
//@ chunk-9cjx5pnm.js:15183-15196 placement
/**
 * 发布 GET 请求的超时（15000 毫秒）。
 */
var PUBLISH_GET_TIMEOUT_MS = 15000;
//@ chunk-9cjx5pnm.js:15196-15235 placement
var PUBLISH_HTTP = Object.freeze({
  get: PUBLISH_GET_TIMEOUT_MS,
  post: PUBLISH_POST_TIMEOUT_MS,
});
export {
  An,
  PUBLISH_HTTP,
  parsePublishApiError,
  Rn,
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
