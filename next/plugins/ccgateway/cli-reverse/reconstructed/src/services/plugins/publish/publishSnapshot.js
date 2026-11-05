/**
 * services/plugins/publish/publishSnapshot.ts
 *
 * 2.1.316 新增：插件发布目录快照与校验
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-77qzxtqv.js (84)
 * attribution: placement 84
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { relative, basename, join, dirname, resolve } from "path";
import { readdir, lstat, realpath, open, mkdir, writeFile, mkdtemp } from "fs/promises";
import { identityPath_2 } from "../../../skills/loadSkillsDir.js";
import { firstTruthy } from "../../../utils/auth/authUnavailableReason.js";
import {
  isNeverBundledPath,
  isSecretPath,
  isIgnoredEntry,
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
import { isInsideTypesDir } from "../../../plugins/functionHooks/devModsWatch.js";
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
import { objectSchema, stringSchema, array } from "../../../../vendor/zod/v4/classic/schemas.js";
import { PLUGIN_MANIFEST_PATH, pluginRootHasMarker } from "../../../utils/plugins/commandSource.js";
import { safeParseJSON } from "../../../utils/json.js";
import {
  sanitizeForDisplay,
  resolveValidateTarget,
  NO_MANIFEST,
} from "../../../utils/plugins/validatePlugin.js";
import { getCwd } from "../../../utils/cwd.js";
import { PluginManifestSchema } from "../../../utils/plugins/schemas.js";
import { truncateToLength } from "../../../utils/stringUtils.js";

//@ chunk-77qzxtqv.js:3551-3581 placement
/**
 * 计算条目相对搜索根的路径（归属疑似错误，属插件/文件打包扫描）。
 */
var relativePosixPathOf = (root, entry) => identityPath_2(relative(root, entry.path));
//@ chunk-77qzxtqv.js:4387-4629 placement
var getExclusionReason = (root, folder, entry) =>
  firstTruthy([
    entry.kind === "link" && "link",
    entry.kind === "special" && "special",
    entry.kind === "file" && entry.links > 1 && "hard-link",
    basename(entry.path).includes("\\") && "backslash",
    isNeverBundledPath(entry) && "never",
    isInsideTypesDir(root, entry.path) && "generated",
    isSecretPath(root, relativePosixPathOf(root, entry)) && "secret",
    isIgnoredEntry(root, folder, entry) && "ignored",
  ]);
//@ chunk-77qzxtqv.js:4629-4707 placement
/**
 * 给出某条目被排除的原因（link/special/hard-link/backslash/never/generated/secret/ignored），用于打包/上传扫描；归属疑似错误。
 */
function exclusionEntriesFor(root, folder, entry) {
  let exclusionReason = getExclusionReason(root, folder, entry);
  return exclusionReason === undefined
    ? []
    : [
        {
          path: relativePosixPathOf(root, entry),
          why: exclusionReason,
        },
      ];
}
//@ chunk-77qzxtqv.js:4843-5110 placement
function excludeListedFiles(root, scanRoot, entries) {
  let flattened = entries.flatMap((entry) => exclusionEntriesFor(root, scanRoot, entry));
  let excludedPaths = new Set(flattened.map((excluded) => excluded.path));
  let filtered = entries.filter((entry) => !excludedPaths.has(relativePosixPathOf(root, entry)));
  return {
    files: filtered.filter((entry) => entry.kind === "file").map((entry) => listingEntry(root, entry)),
    leftOut: flattened,
    folders: filtered
      .filter((entry) => entry.kind === "folder")
      .map((entry) => ({
        path: entry.path,
        scope: scanRoot.scope,
      })),
  };
}
//@ chunk-77qzxtqv.js:5110-5296 placement
async function scanPublishDir(root, folder) {
  let statOne = limitConcurrency(MAX_COPY_DEPTH, (name) => statEntry(join(folder.path, name)));
  let results = await Promise.all((await readdir(folder.path)).toSorted().map(statOne));
  return excludeListedFiles(
    root,
    {
      path: folder.path,
      scope: folder.scope.concat(await assertGitignoreNotHardlinked(folder.path, results)),
    },
    results,
  );
}
//@ chunk-77qzxtqv.js:5328-5385 placement
/**
 * 列出自身及所有祖先目录。
 */
function ancestorDirs(path) {
  let parent = dirname(path);
  return parent === path ? [path] : [path, ...ancestorDirs(parent)];
}
//@ chunk-77qzxtqv.js:5451-5525 placement
/**
 * 判断目录下是否有 .git。
 */
var hasGitDir = (dir) =>
  lstat(join(dir, ".git")).then(
    () => true,
    (error) => (isIgnorableErrno(error) ? false : Promise.reject(error)),
  );
//@ chunk-77qzxtqv.js:5525-5644 placement
async function ancestorGitignoreDirs(path) {
  let dirs = ancestorDirs(path);
  for (let [index, dir] of dirs.entries())
    if (await hasGitDir(dir)) return dirs.slice(1, index + 1).toReversed();
  return [];
}
//@ chunk-77qzxtqv.js:5644-5711 placement
/**
 * 读取祖先目录的 .gitignore 规则。
 */
var ancestorGitignoreRules = async (path) =>
  (await Promise.all((await ancestorGitignoreDirs(path)).map(readGitignoreSafely))).flat();
//@ chunk-77qzxtqv.js:5711-5946 placement
async function scanPublishFolder(root) {
  let files = [];
  let leftOut = [];
  let pending = [
    {
      path: root,
      scope: await ancestorGitignoreRules(root),
    },
  ];
  for (let folder of pending) {
    if (files.length > MAX_PUBLISH_FILES) break;
    let scan = await scanPublishDir(root, folder);
    files.push(...scan.files);
    leftOut.push(...scan.leftOut);
    pending.push(...scan.folders);
  }
  return {
    files: files.toSorted(byPath),
    leftOut: leftOut.toSorted(byPath),
  };
}
//@ chunk-77qzxtqv.js:6137-6148 placement
/**
 * 复制/创建目录的权限（0700）。
 */
var DIR_MODE = 448;
//@ chunk-77qzxtqv.js:6148-6159 placement
/**
 * 写文件的权限（0600）。
 */
var FILE_MODE = 384;
//@ chunk-77qzxtqv.js:6240-6250 placement
/**
 * 读取 .gitignore 时传给读取函数的选项（当前为 false）。
 */
var READ_GITIGNORE_OPTIONS = false;
//@ chunk-77qzxtqv.js:6250-6260 placement
/**
 * 单链接文件的 nlink 值（1n）。
 */
var SINGLE_LINK_NLINK = 1n;
//@ chunk-77qzxtqv.js:6260-6294 placement
var BIGINT_STAT_OPTIONS = Object.freeze({
  bigint: true,
});
//@ chunk-77qzxtqv.js:6294-6456 placement
async function isSamePublishFile(root, filePath, expected) {
  let real = await realpath(filePath).catch(() => root);
  let stats = isSubpathOf(root, real, READ_GITIGNORE_OPTIONS)
    ? await lstat(real, BIGINT_STAT_OPTIONS).catch(() => {
        return;
      })
    : undefined;
  return stats?.ino === expected.ino && stats.dev === expected.dev && stats.nlink === SINGLE_LINK_NLINK;
}
//@ chunk-77qzxtqv.js:6492-6552 placement
var IGNORED_STAT_ERROR_CODES = Object.freeze(["ENOENT", "ENOTDIR", "ELOOP", "EISDIR"]);
//@ chunk-77qzxtqv.js:6552-6634 placement
/**
 * 打开文件，忽略指定错误码。
 */
var openOrIgnore = (filePath) =>
  open(filePath, readOnlyNoFollowFlags()).catch((error) =>
    IGNORED_STAT_ERROR_CODES.includes(getErrnoCode(error) ?? "") ? undefined : Promise.reject(error),
  );
//@ chunk-77qzxtqv.js:6703-6797 placement
/**
 * 判断文件可安全读取且是普通文件。
 */
var isOpenableFile = async (root, filePath) =>
  (await readPluginFileSafe(root, dirname(filePath))) === "ok" &&
  (
    await lstat(filePath).catch(() => {
      return;
    })
  )?.isFile() === true;
//@ chunk-77qzxtqv.js:6797-7068 placement
async function openPublishFile(root, entry) {
  let absPath = join(root, entry.path);
  let handle = (await isOpenableFile(root, absPath)) ? await openOrIgnore(absPath) : undefined;
  try {
    let expected = await handle?.stat(BIGINT_STAT_OPTIONS);
    let content =
      expected?.isFile() === true &&
      expected.size === BigInt(entry.bytes) &&
      expected.nlink === SINGLE_LINK_NLINK &&
      (await isSamePublishFile(root, absPath, expected))
        ? await handle?.readFile()
        : undefined;
    return content?.length === entry.bytes ? content : undefined;
  } finally {
    await handle?.close();
  }
}
//@ chunk-77qzxtqv.js:7068-7366 placement
async function copyPublishFile(root, destDir, entry) {
  let publishFile = await openPublishFile(root, entry);
  if (publishFile === undefined) return;
  await mkdir(dirname(join(destDir, entry.path)), {
    recursive: true,
    mode: DIR_MODE,
  })
    .then(() =>
      writeFile(join(destDir, entry.path), publishFile, {
        flag: "wx",
        mode: FILE_MODE,
      }),
    )
    .catch((error) =>
      Promise.reject(
        Error("A file could not be copied to be validated", {
          cause: `${getErrnoCode(error) ?? ""} ${entry.path}`.trim(),
        }),
      ),
    );
  return computeContentHash(publishFile);
}
//@ chunk-77qzxtqv.js:7366-7419 placement
/**
 * 中止请求并等待清理。
 */
async function abortAndWait(abortController, pending, dispose) {
  abortController.abort();
  await pending;
  await dispose();
}
//@ chunk-77qzxtqv.js:7419-7485 placement
/**
 * 按路径映射哈希。
 */
var hashByPath = (files, contents) =>
  Object.fromEntries(files.map((file, index) => [file.path, contents[index] ?? ""]));
//@ chunk-77qzxtqv.js:7485-7527 placement
/**
 * 组装快照句柄（home、dir、hashes）。
 */
var snapshotHandle = (home, dir, hashes) => ({
  home,
  dir,
  hashes,
});
//@ chunk-77qzxtqv.js:7527-8475 placement
/**
 * 把要发布的插件目录复制到临时快照目录（claude-publish-*），供校验和打包。
 */
async function snapshotPublishFolder(root, files) {
  if (isCleanupStarted()) return Promise.reject(processEndingError());
  let tempRoot = await mkdtemp(join(tmpdir(), "claude-publish-")).catch((error) =>
    Promise.reject(
      Error("A folder to validate a copy in could not be made", {
        cause: getErrnoCode(error) ?? "",
      }),
    ),
  );
  let removeCopy = onceExport(() => removeValidationCopy(tempRoot));
  if (isCleanupStarted()) {
    await removeCopy();
    return Promise.reject(processEndingError());
  }
  let copyRoot = join(tempRoot, "copy", basename(root));
  let abortController = new AbortController();
  let copying = Promise.resolve()
    .then(() =>
      mkdir(copyRoot, {
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
          limitConcurrency(MAX_COPY_DEPTH, (file) =>
            abortController.signal.aborted
              ? Promise.resolve(undefined)
              : copyPublishFile(root, copyRoot, file).catch((error) => {
                  abortController.abort();
                  return Promise.reject(error);
                }),
          ),
        ),
      ),
    );
  using cleanup = registerCleanup(() => abortAndWait(abortController, copying, removeCopy));
  let results = await copying;
  let found = results.find((result) => result.status === "rejected");
  let found_2 = files.find((file, index) => results[index]?.status === "fulfilled" && !results[index].value);
  await (found === undefined && found_2 === undefined && !abortController.signal.aborted
    ? undefined
    : removeCopy());
  if (found?.status === "rejected") return Promise.reject(found.reason);
  if (abortController.signal.aborted) {
    await removeCopy();
    return Promise.reject(processEndingError());
  }
  if (found_2 !== undefined)
    return {
      missed: found_2.path,
    };
  return snapshotHandle(
    tempRoot,
    copyRoot,
    hashByPath(
      files,
      results.map((result) => (result.status === "fulfilled" ? result.value : undefined)),
    ),
  );
}
//@ chunk-77qzxtqv.js:8475-8550 placement
var fileChangedOutcome = (outcome) =>
  refusalResult("changed", [`${outcome.missed} is not the file that was listed`]);
//@ chunk-77qzxtqv.js:8550-9052 placement
function diffListing(snapshot, current) {
  let listedPaths = new Set(snapshot.listing.files.map((file) => file.path));
  return [
    ...snapshot.listing.files
      .filter((file) => !Object.hasOwn(current.hashes, file.path))
      .map((file) => "Among the files to send only since the folder was read: " + file.path),
    ...Object.keys(current.hashes)
      .filter((key) => !listedPaths.has(key))
      .map((key) => "No longer among the files to send since the folder was read: " + key),
    ...snapshot.listing.files
      .filter(
        (file) =>
          Object.hasOwn(current.hashes, file.path) &&
          snapshot.hashes[file.path] !== current.hashes[file.path],
      )
      .map((file) => `${file.path} is not the file that was listed`),
  ].slice(0, 1);
}
//@ chunk-77qzxtqv.js:9052-9216 placement
function checkSnapshotUnchanged(snapshot, current) {
  let changes = snapshot.kind === "ready" ? diffListing(snapshot, current) : [];
  return changes.length === 0 &&
    (snapshot.kind !== "ready" || snapshot.listing.files.length === Object.keys(current.hashes).length)
    ? snapshot
    : refusalResult("changed", changes);
}
//@ chunk-77qzxtqv.js:9249-9340 placement (2.1.88 match: _temp0, 1)
var slugifyPluginName = (a_5) =>
  a_5
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, "-")
    .replaceAll(/^-|-$/g, "") || "plugin";
//@ chunk-77qzxtqv.js:9340-9467 placement
function folderNameFindings(root) {
  let finding = checkReservedPluginName(slugifyPluginName(basename(root)));
  return finding?.severity === "error"
    ? [`${finding.message} The name comes from the folder: rename it.`]
    : [];
}
//@ chunk-77qzxtqv.js:9500-9525 placement
/**
 * 清洗插件描述。
 */
var sanitizeDescription = (description) => description && printableName(description, MAX_PUBLISH_STEPS);
//@ chunk-77qzxtqv.js:9525-9540 placement
/**
 * 补全 manifest 时使用的默认版本（0.1.0）。
 */
var DEFAULT_PLUGIN_VERSION = "0.1.0";
//@ chunk-77qzxtqv.js:9540-9615 placement
/**
 * 生成草稿 manifest 文本。
 */
var draftManifestText = (root, description) => `${jsonStringify(
  {
    name: slugifyPluginName(basename(root)),
    version: DEFAULT_PLUGIN_VERSION,
    description: sanitizeDescription(description),
  },
  null,
  2,
)}
`;
//@ chunk-77qzxtqv.js:9615-9676 placement
/**
 * 生成 “需要补 manifest” 的结果。
 */
var needsManifestResult = (root, description) => ({
  kind: "needs-manifest",
  root,
  draft: draftManifestText(root, description),
});
//@ chunk-77qzxtqv.js:9676-9768 placement
/**
 * 汇总各文件的校验错误。
 */
var combinedIssues = (results) =>
  results.flatMap((result) =>
    result.errors.map((error) => `${result.filePath}: ${error.path}: ${redactSecrets(error.message)}`),
  );
//@ chunk-77qzxtqv.js:9797-9869 placement
/**
 * 提取 manifest 的摘要字段。
 */
var pickManifestSummary = (manifest) => ({
  name: manifest.name,
  version: manifest.version,
  description: manifest.description,
});
//@ chunk-77qzxtqv.js:9869-9947 placement
/**
 * 插件 manifest 摘要 schema。
 */
var pluginManifestSummarySchema = DoctorLazy(() =>
  objectSchema({
    name: stringSchema(),
    version: stringSchema().optional(),
    description: stringSchema().optional(),
  }),
);
//@ chunk-77qzxtqv.js:9947-10119 placement
async function readDraftManifestState(dir) {
  let mcpAuthCache = await getMcpAuthCache(join(dir, PLUGIN_MANIFEST_PATH));
  let parsed = pluginManifestSummarySchema().safeParse(
    safeParseJSON(mcpAuthCache.kind === "ok" ? mcpAuthCache.content : ""),
  );
  if (mcpAuthCache.kind === "absent") return "absent";
  return parsed.success ? pickManifestSummary(parsed.data) : "unreadable";
}
//@ chunk-77qzxtqv.js:10119-10186 placement
/**
 * 生成单个文件的哈希对。
 */
function hashPair(entry, content) {
  return entry !== undefined && content !== undefined ? [[entry.path, computeContentHash(content)]] : [];
}
//@ chunk-77qzxtqv.js:10186-10346 placement
async function readAllListed(files, read, pair) {
  let results = await Promise.all(files.map(limitConcurrency(MAX_COPY_DEPTH, read)));
  let found = files.find((file, index) => results[index] === undefined);
  return found === undefined
    ? results.flatMap((value, index) => pair(files[index], value))
    : {
        missed: found.path,
      };
}
//@ chunk-77qzxtqv.js:10346-10457 placement
async function hashListedFiles(root, files) {
  let allListed = await readAllListed(files, (file) => openPublishFile(root, file), hashPair);
  return "missed" in allListed
    ? allListed
    : {
        hashes: Object.fromEntries(allListed),
      };
}
//@ chunk-77qzxtqv.js:10457-10538 placement
/**
 * 找出 manifest 文件路径。
 */
var manifestPaths = (snapshot) =>
  snapshot.files
    .map((file) => file.path)
    .filter((path) => `/${path}`.endsWith(`/${identityPath_2(PLUGIN_MANIFEST_PATH)}`));
//@ chunk-77qzxtqv.js:10538-10733 placement
function publishSizeRefusal(snapshot, totalBytes) {
  let manifestPathsList = manifestPaths(snapshot);
  if (manifestPathsList.length > 1)
    return refusalResult("findings", [`More than one manifest: ${manifestPathsList.join(", ")}`]);
  if (snapshot.files.length > MAX_PUBLISH_FILES) return refusalResult("too-many-files");
  return totalBytes > MAX_PUBLISH_BYTES ? refusalResult("too-large") : undefined;
}
//@ chunk-77qzxtqv.js:10733-10963 placement
async function buildPublishSnapshot(root, manifest) {
  let listing = await scanPublishFolder(root);
  let totalBytes = listing.files.reduce((acc, file) => acc + file.bytes, 0);
  let refusal = publishSizeRefusal(listing, totalBytes);
  if (refusal !== undefined) return refusal;
  let hashed = await hashListedFiles(root, listing.files);
  return "missed" in hashed
    ? fileChangedOutcome(hashed)
    : {
        kind: "ready",
        root,
        manifest,
        listing,
        bytes: totalBytes,
        hashes: hashed.hashes,
      };
}
//@ chunk-77qzxtqv.js:11010-11044 placement
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
//@ chunk-77qzxtqv.js:11044-11112 placement
/**
 * 取到最后一个引号为止的前缀。
 */
var prefixThroughLastQuote = (text) =>
  text.slice(0, 1 + Math.max(...QUOTE_CHARS.map((quoteChar) => text.lastIndexOf(quoteChar))));
//@ chunk-77qzxtqv.js:11112-11217 placement
function replaceSegmentsWith(text, marker, replacement) {
  let parts = text.split(marker);
  return parts
    .slice(0, -1)
    .map((part) => prefixThroughLastQuote(part) + replacement)
    .concat(parts.at(-1) ?? "")
    .join("");
}
//@ chunk-77qzxtqv.js:11217-11412 placement
function mapCopyPathToOriginal(text, copy, originalDir) {
  let copyDir = dirname(copy.dir);
  let replacement = dirname(originalDir).replace(/[\\/]$/, "");
  return [`${basename(copy.home)}/copy`, `${basename(copy.home)}\\copy`].reduce(
    (acc, marker) => replaceSegmentsWith(acc, marker, replacement),
    text
      .replaceAll(copyDir, () => replacement)
      .replaceAll(sanitizeForDisplay(copyDir, copyDir.length), () => replacement),
  );
}
//@ chunk-77qzxtqv.js:11412-11538 placement
var mapCopyPathsInResults = (results, copy, originalDir) =>
  results.map((result) => ({
    ...result,
    filePath: mapCopyPathToOriginal(result.filePath, copy, originalDir),
    errors: result.errors.map((error) => ({
      ...error,
      message: mapCopyPathToOriginal(error.message, copy, originalDir),
    })),
  }));
//@ chunk-77qzxtqv.js:11538-11631 placement
/**
 * 缺 manifest 时改成不可读结果。
 */
function requireManifestPath(publishSnapshot) {
  return publishSnapshot.kind === "ready" && manifestPaths(publishSnapshot.listing).length === 0
    ? refusalResult("unreadable", [identityPath_2(PLUGIN_MANIFEST_PATH)])
    : publishSnapshot;
}
//@ chunk-77qzxtqv.js:11631-12031 placement
async function validateSnapshot(root, copy, description) {
  let { manifest, contents } = await resolveValidateTarget(copy.dir);
  let noManifest = manifest?.errors.some((error) => error.code === NO_MANIFEST) ?? true;
  let combined = combinedIssues(
    mapCopyPathsInResults(noManifest ? contents : [manifest ?? [], contents].flat(), copy, root),
  ).concat(noManifest ? folderNameFindings(root) : []);
  let isPlugin = noManifest ? await pluginRootHasMarker(copy.dir) : manifest?.fileType === "plugin";
  let manifest_2 = await readDraftManifestState(copy.dir);
  if (!isPlugin) return refusalResult("not-a-plugin");
  if (combined.length > 0) return refusalResult("findings", combined);
  if (manifest_2 === "unreadable") return refusalResult("unreadable", [identityPath_2(PLUGIN_MANIFEST_PATH)]);
  return manifest_2 === "absent"
    ? needsManifestResult(root, description)
    : checkSnapshotUnchanged(requireManifestPath(await buildPublishSnapshot(root, manifest_2)), copy);
}
//@ chunk-77qzxtqv.js:12031-12126 placement
/**
 * 检查 manifest 是否被排除在外。
 */
function leftOutManifestProblem(snapshot) {
  let manifestPath = identityPath_2(PLUGIN_MANIFEST_PATH);
  return snapshot.leftOut.some((leftOut) => leftOut.path === manifestPath)
    ? refusalResult("unreadable", [manifestPath])
    : undefined;
}
//@ chunk-77qzxtqv.js:12126-12480 placement
async function checkPublishFolderSize(root, description) {
  let snapshot = await scanPublishFolder(root);
  let refusal =
    leftOutManifestProblem(snapshot) ??
    publishSizeRefusal(
      snapshot,
      snapshot.files.reduce((acc, file) => acc + file.bytes, 0),
    );
  if (refusal !== undefined) return refusal;
  let copy = await snapshotPublishFolder(root, snapshot.files);
  if ("missed" in copy) return fileChangedOutcome(copy);
  let removeCopy = onceExport(() => removeValidationCopy(copy.home));
  using cleanup = registerCleanup(removeCopy);
  if (isCleanupStarted()) {
    await removeCopy();
    return Promise.reject(processEndingError());
  }
  try {
    return await validateSnapshot(root, copy, description).catch((error) =>
      refusalResult(
        "unreadable",
        errorDetails(error).map((detail) => mapCopyPathToOriginal(detail, copy, root)),
      ),
    );
  } finally {
    await removeCopy();
  }
}
//@ chunk-77qzxtqv.js:12480-12683 placement
async function resolvePublishFolder(folder, description) {
  let resolved = await realpath(resolve(getCwd(), folder)).catch(() => {
    return;
  });
  if (!(resolved !== undefined && (await isDirectoryOrFalse(resolved))))
    return refusalResult("no-folder", [folder]);
  return (await readPluginFileSafe(resolved, join(resolved, MANIFEST_DIR_NAME))) === "refused"
    ? refusalResult("unreadable", [MANIFEST_DIR_NAME])
    : unreadableOnError(checkPublishFolderSize(resolved, description));
}
//@ chunk-77qzxtqv.js:12683-12752 placement
/**
 * 构造草稿 manifest 的条目。
 */
var draftManifestEntry = (publishFolder) => ({
  path: identityPath_2(PLUGIN_MANIFEST_PATH),
  bytes: Buffer.byteLength(publishFolder.draft),
  mode: FILE_MODE_RW,
});
//@ chunk-77qzxtqv.js:12785-12929 placement
function draftManifestSummary(publishFolder) {
  let parsed = PluginManifestSchema().safeParse(safeParseJSON(publishFolder.draft));
  return {
    name: parsed.data?.name ?? basename(publishFolder.root),
    version: parsed.data?.version,
    description: parsed.data?.description,
  };
}
//@ chunk-77qzxtqv.js:12929-13001 placement
/**
 * 把草稿条目并入文件列表。
 */
var appendFiles = (listing, extraFiles) => ({
  files: listing.files.concat(extraFiles).toSorted(byPath),
  leftOut: listing.leftOut,
});
//@ chunk-77qzxtqv.js:13001-13036 placement
/**
 * 给哈希表加上某文件的哈希。
 */
var withHash = (hashes, path, draft) => ({
  ...hashes,
  [path]: computeContentHash(draft),
});
//@ chunk-77qzxtqv.js:13036-13142 placement
var withDraftManifest = (publishSnapshot, entry, publishFolder) => ({
  ...publishSnapshot,
  bytes: publishSnapshot.bytes + entry.bytes,
  listing: appendFiles(publishSnapshot.listing, entry),
  hashes: withHash(publishSnapshot.hashes, entry.path, publishFolder.draft),
});
//@ chunk-77qzxtqv.js:13142-13236 placement
/**
 * 为 “需要补 manifest” 的情况补上草稿。
 */
async function buildWithDraftManifest(publishFolder) {
  let entry = draftManifestEntry(publishFolder);
  let publishSnapshot = await buildPublishSnapshot(publishFolder.root, draftManifestSummary(publishFolder));
  return publishSnapshot.kind === "ready"
    ? withDraftManifest(publishSnapshot, entry, publishFolder)
    : publishSnapshot;
}
//@ chunk-77qzxtqv.js:13236-13303 placement
/**
 * 需要补 manifest 时重算快照。
 */
async function ensureManifest(publishFolder) {
  return publishFolder.kind === "needs-manifest"
    ? unreadableOnError(buildWithDraftManifest(publishFolder))
    : publishFolder;
}
//@ chunk-77qzxtqv.js:13303-13510 placement
async function preparePublishFolder(input, organization) {
  let publishFolder = await resolvePublishFolder(input.folder, input.description);
  let manifest = await ensureManifest(publishFolder);
  if (manifest.kind === "refused") return manifest;
  return manifest.kind === "ready"
    ? {
        wanted: input,
        plan: manifest,
        organization,
        draft: draftManifestOf(publishFolder),
        withheld: false,
      }
    : refusalResult("unreadable");
}
//@ chunk-77qzxtqv.js:13510-13895 placement
var PUBLISH_STOPPED_TEXT = Object.freeze({
  nothing: "Nothing was sent.",
  uploading:
    "The upload was on its way: look in your uploads on claude.ai, where it may have arrived. Nothing was submitted.",
  shelved: "The upload had arrived on your own shelf, where only you see it. It was not submitted.",
  submitting:
    "The upload had arrived, and its submission was on its way: it may have reached your organization.",
});
//@ chunk-77qzxtqv.js:13895-13964 placement
function stoppedOrResult(request, result, stage) {
  return request.signal.aborted ? refusalResult("stopped", [PUBLISH_STOPPED_TEXT[stage]]) : result;
}
//@ chunk-77qzxtqv.js:14282-14293 placement
/**
 * 客户端错误状态码下界（200）。
 */
var CLIENT_ERROR_MIN = 200;
//@ chunk-77qzxtqv.js:14293-14304 placement
/**
 * 客户端错误状态码上界（300）。
 */
var CLIENT_ERROR_MAX = 300;
//@ chunk-77qzxtqv.js:14304-14343 placement
var isClientErrorStatus = (response) =>
  response.status >= CLIENT_ERROR_MIN && response.status < CLIENT_ERROR_MAX;
//@ chunk-77qzxtqv.js:14343-14354 placement
/**
 * 状态码 400。
 */
var STATUS_BAD_REQUEST = 400;
//@ chunk-77qzxtqv.js:14354-14365 placement
/**
 * 状态码 405。
 */
var STATUS_METHOD_NOT_ALLOWED = 405;
//@ chunk-77qzxtqv.js:14365-14376 placement
/**
 * 状态码 404。
 */
var STATUS_NOT_FOUND = 404;
//@ chunk-77qzxtqv.js:14376-14387 placement
/**
 * 状态码 501。
 */
var STATUS_NOT_IMPLEMENTED = 501;
//@ chunk-77qzxtqv.js:14387-14398 placement
/**
 * 状态码 422。
 */
var STATUS_UNPROCESSABLE = 422;
//@ chunk-77qzxtqv.js:14398-14437 placement
var NOT_SERVED_STATUSES = Object.freeze([
  STATUS_BAD_REQUEST,
  STATUS_NOT_FOUND,
  STATUS_METHOD_NOT_ALLOWED,
  STATUS_UNPROCESSABLE,
  STATUS_NOT_IMPLEMENTED,
]);
//@ chunk-77qzxtqv.js:14437-14447 placement
/**
 * 最多列出的错误条数（20）。
 */
var MAX_LISTED_ERRORS = 20;
//@ chunk-77qzxtqv.js:14447-14458 placement
/**
 * 单条错误的最大字符数（300）。
 */
var MAX_ERROR_CHARS = 300;
//@ chunk-77qzxtqv.js:14458-14497 placement
var SUBMISSION_STATE_REASONS = Object.freeze(["scan", "other"]);
//@ chunk-77qzxtqv.js:14497-14612 placement
var publishFindingsList = (code, publishApiError) =>
  [
    ...publishApiError.findings,
    ...[publishApiError.message ?? ""].filter(
      (message) => message !== "" && SUBMISSION_STATE_REASONS.includes(code),
    ),
  ]
    .slice(0, MAX_LISTED_ERRORS)
    .map((finding) => truncateToLength(finding, MAX_ERROR_CHARS));
//@ chunk-77qzxtqv.js:14612-14851 placement
var publishApiErrorSchema = DoctorLazy(() =>
  objectSchema({
    error: objectSchema({
      message: stringSchema().optional(),
      details: objectSchema({
        error_code: stringSchema().optional(),
        validation_errors: objectSchema({
          message: stringSchema().optional(),
          plugins: array(
            objectSchema({
              name: stringSchema().optional(),
              error: stringSchema().optional(),
            }),
          ).optional(),
        }).optional(),
      }).optional(),
    }).optional(),
  }),
);
//@ chunk-77qzxtqv.js:14851-15110 placement
function parsePublishApiError(response) {
  let error = publishApiErrorSchema().safeParse(response.data).data?.error;
  let validationErrors = error?.details?.validation_errors;
  return {
    code: error?.details?.error_code,
    message: error?.message,
    findings: [
      validationErrors?.message ?? "",
      ...(validationErrors?.plugins ?? []).map((pluginError) =>
        [pluginError.name, pluginError.error].filter(Boolean).join(": "),
      ),
    ].filter(Boolean),
  };
}
//@ chunk-77qzxtqv.js:15110-15212 placement
function publishApiOutcome(response, outcomeMaps) {
  let publishApiError = parsePublishApiError(response);
  let kind =
    outcomeMaps.codes[publishApiError.code ?? ""] ?? outcomeMaps.statuses[response.status] ?? "other";
  return refusalResult(kind, publishFindingsList(kind, publishApiError));
}
//@ chunk-77qzxtqv.js:15212-15237 placement
var EMPTY_OUTCOME = Object.freeze({});
//@ chunk-77qzxtqv.js:15237-15251 placement
/**
 * 发布 POST 请求的超时（120000 毫秒）。
 */
var PUBLISH_POST_TIMEOUT_MS = 120000;
//@ chunk-77qzxtqv.js:15251-15264 placement
/**
 * 发布 GET 请求的超时（15000 毫秒）。
 */
var PUBLISH_GET_TIMEOUT_MS = 15000;
//@ chunk-77qzxtqv.js:15264-15303 placement
var PUBLISH_HTTP = Object.freeze({
  get: PUBLISH_GET_TIMEOUT_MS,
  post: PUBLISH_POST_TIMEOUT_MS,
});
export {
  isClientErrorStatus,
  stoppedOrResult,
  PUBLISH_STOPPED_TEXT,
  preparePublishFolder,
  relativePosixPathOf,
  EMPTY_OUTCOME,
  PUBLISH_HTTP,
  parsePublishApiError,
  NOT_SERVED_STATUSES,
  publishApiOutcome,
  slugifyPluginName,
  scanPublishFolder,
  resolvePublishFolder,
  openPublishFile,
  readAllListed,
  fileChangedOutcome,
};
