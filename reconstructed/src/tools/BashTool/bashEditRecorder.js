/**
 * tools/BashTool/bashEditRecorder.ts
 *
 * 2.1.316 新增：记录 Bash 命令改动过的文件内容
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (17)
 * attribution: placement 17
 */
import { join, sep, resolve as resolve_2, dirname, relative, basename } from "path";
import { realpath, lstat, open, readlink } from "fs/promises";
import { constants } from "fs";
import {
  takeOutsideWrites,
  recordersByCwd,
  forgetRecorder,
  MAX_RECORDED_FILE_BYTES,
  MAX_RECORD_BATCH_BYTES,
  runSerialForRecorder,
  MAX_EXPANDED_PATHS,
  RECORDER_POLL_MS,
  MAX_GIT_OUTPUT_BYTES,
  RECORDER_GIT_TIMEOUT_MS,
  MAX_BASE_LISTING_BYTES,
  MAX_TOTAL_RECORD_BYTES,
  MAX_LAST_SEEN_BYTES,
} from "./writeObserver.js";
import {
  verifyKnownPrivateGitDir,
  takeBashSnapshot,
  isSafeRepoPath,
  findConvertedFiles,
  runSnapshotGit,
  getSnapshotGitArgs,
  getSnapshotGitEnv,
} from "./bashEditDiff/snapshot.js";
import { count } from "../../utils/collections.js";
import { stripBomAndCarriageReturn, isFullFileView } from "../../utils/remoteFileState.js";
import { normalizeCrlf } from "../../utils/git/gitIndexReader.js";
import {
  MAX_DIFF_FILES,
  isDiffSmallEnough,
  SHARED_READ_SPACING_MS,
  buildSnapshotGitEnv,
  cleanupSandboxAfterGit,
} from "./bashEditDiff/gitEnv.js";
import { structuredPatch } from "../../../vendor/diff/libesm/patch/create.js";
import { logForDebugging } from "../../utils/debug.js";
import { gitExe } from "../../utils/git.js";
import { safeSpawn } from "../../utils/safeSpawn.js";
import { getPlatform } from "../../utils/platform.js";
import { hasNulByteInHead } from "../../utils/fileRead.js";

//@ chunk-e6aww6q8.js:4802566-4803544 placement
/**
 * 把观察到的写入路径记录到编辑记录器：目录写入展开为其下已知文件，过滤被忽略的路径，读取文件内容（总量有上限）存入 lastSeen，溢出或异常时放弃记录。
 */
async function recordObservedWrites(cwd) {
  let writeSet = takeOutsideWrites(cwd);
  let recorder = await recordersByCwd.get(cwd)?.catch(() => null);
  if (!recorder || !writeSet || (writeSet.paths.length === 0 && !writeSet.overflow)) return;
  if (writeSet.overflow) {
    forgetRecorder(cwd);
    return;
  }
  let directoryPaths = writeSet.paths.filter((path) => /[\\/]$/.test(path));
  let expandedDirs = await expandDirectoryWrites(recorder, directoryPaths);
  if (expandedDirs === null) {
    forgetRecorder(cwd);
    return;
  }
  for (let path of expandedDirs) rememberFileContent(recorder, path, null);
  let repoRelativePaths = await toRepoRelativePaths(
    recorder,
    writeSet.paths.filter((path) => !/[\\/]$/.test(path)),
  );
  let isAlreadySeen = (repoRelativePath) =>
    recorder.lastSeen.has(repoRelativePath) || (recorder.basePaths?.has(repoRelativePath) ?? false);
  let paths = repoRelativePaths.filter((repoRelativePath) => !isAlreadySeen(repoRelativePath));
  if (paths.length > 0 && !(await verifyKnownPrivateGitDir(recorder.base))) {
    forgetRecorder(cwd);
    return;
  }
  let ignoredPaths = paths.length > 0 ? await checkIgnoredPaths(recorder.base, paths) : new Set();
  if (ignoredPaths === null) {
    forgetRecorder(cwd);
    return;
  }
  let recordedBytes = 0;
  for (let repoRelativePath of repoRelativePaths) {
    if (ignoredPaths.has(repoRelativePath)) continue;
    let min = Math.min(MAX_RECORDED_FILE_BYTES, MAX_RECORD_BATCH_BYTES - recordedBytes);
    let entry = await statForRecorder(join(recorder.realRoot, repoRelativePath), min);
    if (entry === "missing" || entry === "not-a-file") {
      if (isAlreadySeen(repoRelativePath)) rememberFileContent(recorder, repoRelativePath, null);
    } else if (Buffer.isBuffer(entry)) {
      recordedBytes += entry.length;
      rememberFileContent(recorder, repoRelativePath, entry);
    } else if (typeof entry === "object") {
      recordedBytes += entry.link.length;
      rememberFileContent(recorder, repoRelativePath, entry.link);
    } else if (entry === "too-large" && min < MAX_RECORDED_FILE_BYTES) {
      forgetRecorder(cwd);
      return;
    } else if (entry === "too-large" || entry === "unreadable") {
      recorder.lastSeenBytes -= recorder.lastSeen.get(repoRelativePath)?.content?.length ?? 0;
      recorder.lastSeen.delete(repoRelativePath);
    }
  }
  if (recorder.evicted) forgetRecorder(cwd);
}
//@ chunk-e6aww6q8.js:4803544-4803925 placement
/**
 * 为仓库启动编辑记录器（每个 cwd 一个）：拍快照、取真实根路径与基线文件列表，失败时清除。
 */
function startEditRecorder(cwd) {
  let recorderPromise = recordersByCwd.get(cwd);
  if (!recorderPromise) {
    let takenAt = Date.now();
    let createdRecorderPromise = takeBashSnapshot(cwd)
      .then(async (snapshot) => {
        let realRoot = await realpath(cwd).catch(() => null);
        return snapshot && snapshot !== "unavailable" && realRoot !== null
          ? {
              base: snapshot,
              realRoot,
              basePaths: await listBaseTreePaths(snapshot),
              lastSeen: new Map(),
              lastSeenBytes: 0,
              evicted: false,
              takenAt,
            }
          : null;
      })
      .catch(() => null)
      .then((recorder) => {
        if (recorder === null && recordersByCwd.get(cwd) === createdRecorderPromise)
          recordersByCwd.delete(cwd);
        return recorder;
      });
    recorderPromise = createdRecorderPromise;
    recordersByCwd.set(cwd, createdRecorderPromise);
  }
  return recorderPromise.then((recorder) => recorder !== null);
}
//@ chunk-e6aww6q8.js:4803925-4804014 placement
/**
 * 串行地记录命令改动过的文件内容（缺失、过大、不可读分别标记）。
 */
function recordEditedFilesSerially(
  cwd,
  paths,
  overflow,
  snapshotTakenAt,
  maxAge = Number.POSITIVE_INFINITY,
  shared = false,
) {
  return runSerialForRecorder(cwd, () =>
    recordEditedFiles(cwd, paths, overflow, snapshotTakenAt, maxAge, shared),
  );
}
//@ chunk-e6aww6q8.js:4804014-4806455 placement
/**
 * 记录 Bash 命令改动过的文件内容（缺失、过大、不可读都单独标记）。
 */
async function recordEditedFiles(cwd, paths, overflow, snapshotTakenAt, maxAge, shared) {
  let unavailableResult = () => {
    forgetRecorder(cwd);
    return {
      files: [],
      moreFiles: 0,
      unavailable: true,
    };
  };
  try {
    let recorder = await recordersByCwd.get(cwd);
    if (!recorder || recorder.takenAt > maxAge || overflow || paths.length > MAX_EXPANDED_PATHS)
      return unavailableResult();
    let directoryPaths = new Set(paths.filter((path) => path.endsWith(sep) && path.length > 1));
    let repoPaths = new Set(
      await toRepoRelativePaths(
        recorder,
        paths.filter((path) => !directoryPaths.has(path)),
      ),
    );
    let expandedDirs = await expandDirectoryWrites(recorder, [...directoryPaths]);
    if (expandedDirs === null) return unavailableResult();
    for (let path of expandedDirs) repoPaths.add(path);
    if (repoPaths.size > MAX_EXPANDED_PATHS) return unavailableResult();
    if (repoPaths.size === 0) return null;
    let contentsByPath = new Map();
    let recordedBytes = 0;
    let unreadablePaths = [];
    for (let repoPath of repoPaths) {
      let entry = await statForRecorder(
        join(recorder.realRoot, repoPath),
        Math.min(MAX_RECORDED_FILE_BYTES, MAX_RECORD_BATCH_BYTES - recordedBytes),
      );
      if (entry === "missing") contentsByPath.set(repoPath, null);
      else if (entry === "too-large" || entry === "unreadable") {
        unreadablePaths.push(repoPath);
        recorder.lastSeenBytes -= recorder.lastSeen.get(repoPath)?.content?.length ?? 0;
        recorder.lastSeen.delete(repoPath);
      } else if (entry === "not-a-file") {
        if (
          recorder.lastSeen.has(repoPath) ||
          recorder.basePaths === null ||
          recorder.basePaths.has(repoPath)
        )
          contentsByPath.set(repoPath, null);
      } else if (Buffer.isBuffer(entry)) {
        recordedBytes += entry.length;
        contentsByPath.set(repoPath, entry);
      } else contentsByPath.set(repoPath, entry.link);
    }
    if (!(await verifyKnownPrivateGitDir(recorder.base))) return unavailableResult();
    let blobsFromGit = await readBlobsFromGit(recorder, contentsByPath, snapshotTakenAt, maxAge);
    if (blobsFromGit === null) return unavailableResult();
    let { before, fromHost, converted, tooLarge } = blobsFromGit;
    for (let path of tooLarge) {
      contentsByPath.delete(path);
      unreadablePaths.push(path);
    }
    let isNewPath = (repoPath) =>
      !recorder.lastSeen.has(repoPath) && (recorder.basePaths ? !recorder.basePaths.has(repoPath) : true);
    let paths_2 = [
      ...[...contentsByPath]
        .filter(([repoPath, content]) => content !== null && (before.get(repoPath) ?? null) === null)
        .map(([repoPath]) => repoPath),
      ...unreadablePaths,
    ].filter(isNewPath);
    let ignoredPaths = paths_2.length > 0 ? await checkIgnoredPaths(recorder.base, paths_2) : new Set();
    if (ignoredPaths === null) return unavailableResult();
    let unavailableCount = count(unreadablePaths, (path) => !ignoredPaths.has(path));
    let files = [];
    let changedFiles = [];
    let diffDeadline = performance.now() + RECORDER_POLL_MS;
    for (let [repoPath, content] of contentsByPath) {
      let previousContent = before.get(repoPath) ?? null;
      if (ignoredPaths.has(repoPath) || (previousContent === null && content === null)) continue;
      let after =
        content !== null && fromHost.has(repoPath) && !isTrackedLargeOrUnreadable(content)
          ? Buffer.from(stripBomAndCarriageReturn(content.toString("utf8")), "utf8")
          : content;
      let convertedSize = converted.get(repoPath);
      if (
        convertedSize !== undefined &&
        content !== null &&
        previousContent !== null &&
        !previousContent.includes(`\r
`)
      ) {
        let normalized = normalizeCrlf(content) ?? content;
        if (!normalized.equals(previousContent) || content.length === convertedSize) after = normalized;
      }
      if (previousContent !== null && after !== null && previousContent.equals(after)) {
        rememberFileContent(recorder, repoPath, content);
        continue;
      }
      rememberFileContent(recorder, repoPath, content);
      let absPath = join(cwd, repoPath);
      changedFiles.push(absPath);
      if (
        files.length >= MAX_DIFF_FILES ||
        isTrackedLargeOrUnreadable(previousContent) ||
        isTrackedLargeOrUnreadable(after)
      )
        continue;
      let diff = structuredPatch(
        repoPath,
        repoPath,
        previousContent?.toString("utf8") ?? "",
        after?.toString("utf8") ?? "",
        "",
        "",
        {
          context: 3,
          timeout: Math.max(1, diffDeadline - performance.now()),
        },
      );
      if (diff === undefined || !isDiffSmallEnough(diff.hunks)) continue;
      files.push({
        filePath: absPath,
        hunks: diff.hunks.map((hunk) => ({
          ...hunk,
          lines: hunk.lines.filter((line) => line !== ""),
        })),
        ...(previousContent === null && {
          created: true,
        }),
        ...(after === null && {
          deleted: true,
        }),
      });
    }
    if (recorder.evicted) forgetRecorder(cwd);
    if (changedFiles.length === 0 && unavailableCount === 0)
      return shared
        ? {
            files: [],
            moreFiles: 0,
            shared: true,
          }
        : null;
    return {
      files,
      moreFiles: changedFiles.length - files.length + unavailableCount,
      changedFiles: [
        ...changedFiles,
        ...unreadablePaths.filter((path) => !ignoredPaths.has(path)).map((path) => join(cwd, path)),
      ].slice(0, SHARED_READ_SPACING_MS),
      ...(unavailableCount > 0 && {
        unavailable: true,
      }),
      ...(shared && {
        shared: true,
      }),
    };
  } catch (error) {
    logForDebugging(`bashEditRecorder: ${String(error)}`);
    return unavailableResult();
  }
}
//@ chunk-e6aww6q8.js:4806455-4806859 placement
/**
 * 把被写入的目录展开为其下的已知文件（来自基线列表与上次见过的文件），超过上限或缺少基线时返回 null。
 */
async function expandDirectoryWrites(recorder, directoryPaths) {
  let expanded = new Set();
  if (directoryPaths.length > 0 && recorder.basePaths === null) return null;
  if (directoryPaths.length === 0) return expanded;
  let repoRelativePaths = await toRepoRelativePaths(
    recorder,
    directoryPaths.map((path) => path.slice(0, -1)),
  );
  let prefixes = [];
  for (let repoRelativePath of repoRelativePaths.sort()) {
    let prefix = `${repoRelativePath}/`;
    if (!prefix.startsWith(prefixes.at(-1) ?? "\x00")) prefixes.push(prefix);
  }
  if (prefixes.length === 0) return expanded;
  for (let repoPath of [...(recorder.basePaths ?? []), ...recorder.lastSeen.keys()])
    if (isSafeRepoPath(repoPath) && prefixes.some((prefix) => repoPath.startsWith(prefix))) {
      expanded.add(repoPath);
      if (expanded.size > MAX_EXPANDED_PATHS) return null;
    }
  return expanded;
}
//@ chunk-e6aww6q8.js:4806859-4807327 placement
/**
 * 把绝对写入路径转换为仓库内的安全相对路径（解析父目录真实路径，排除嵌套仓库中的未知文件）。
 */
async function toRepoRelativePaths(recorder, paths) {
  let realRoot = recorder.realRoot;
  let repoPaths = new Set();
  let realDirByDir = new Map();
  let nestedRepoCache = new Map();
  for (let path of paths) {
    let resolvedPath = resolve_2(path);
    if (
      /[\0-\x1f\x7f]/.test(path) ||
      (!resolvedPath.startsWith(realRoot + sep) &&
        !resolvedPath.startsWith(resolve_2(recorder.base.repoRoot) + sep))
    )
      continue;
    let dir = dirname(resolvedPath);
    let realDir = realDirByDir.get(dir);
    if (realDir === undefined) {
      realDir = await realpathOfNearestAncestor(dir);
      realDirByDir.set(dir, realDir);
    }
    if (realDir === null || (realDir !== realRoot && !realDir.startsWith(realRoot + sep))) continue;
    let joined = relative(realRoot, join(realDir, basename(resolvedPath)))
      .split(sep)
      .join("/");
    if (!isSafeRepoPath(joined)) continue;
    if (
      !recorder.lastSeen.has(joined) &&
      !recorder.basePaths?.has(joined) &&
      (await isInsideNestedRepo(realDir, realRoot, nestedRepoCache))
    )
      continue;
    repoPaths.add(joined);
  }
  return [...repoPaths];
}
//@ chunk-e6aww6q8.js:4807327-4807540 placement
async function isInsideNestedRepo(dir, realRoot, nestedRepoCache) {
  let visitedDirs = [];
  let isNestedRepo = false;
  for (
    let currentDir = dir;
    currentDir !== realRoot && currentDir.startsWith(realRoot + sep);
    currentDir = dirname(currentDir)
  ) {
    let cached = nestedRepoCache.get(currentDir);
    if (cached !== undefined) {
      isNestedRepo = cached;
      break;
    }
    visitedDirs.push(currentDir);
    if (await looksLikeGitDir(join(currentDir, ".git"))) {
      isNestedRepo = true;
      break;
    }
  }
  for (let visitedDir of visitedDirs) nestedRepoCache.set(visitedDir, isNestedRepo);
  return isNestedRepo;
}
//@ chunk-e6aww6q8.js:4807540-4807826 placement
async function looksLikeGitDir(gitPath) {
  let stat = await lstat(gitPath).catch(() => null);
  if (stat === null) return false;
  if (stat.isDirectory())
    return lstat(join(gitPath, "HEAD")).then(
      (headStat) => headStat.isFile(),
      () => false,
    );
  if (!stat.isFile() || stat.size > 4096) return false;
  let content = await statForRecorder(gitPath, 4096);
  return Buffer.isBuffer(content) && content.subarray(0, 7).equals(Buffer.from("gitdir:"));
}
//@ chunk-e6aww6q8.js:4807826-4808157 placement
/**
 * 求路径最近的已存在祖先的真实路径并拼回剩余部分（最多 64 层）；出错返回 null。
 */
async function realpathOfNearestAncestor(dir) {
  let descendants = [];
  let currentDir = dir;
  for (let idx = 0; idx < 64; idx++) {
    let realPath = await realpath(currentDir).catch((error) =>
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error.code === "ENOENT" || error.code === "ENOTDIR")
        ? null
        : undefined,
    );
    if (realPath === undefined) return null;
    if (realPath !== null)
      return descendants.length === 0 ? realPath : join(realPath, ...descendants.reverse());
    let parentDir = dirname(currentDir);
    if (parentDir === currentDir) return null;
    descendants.push(basename(currentDir));
    currentDir = parentDir;
  }
  return null;
}
//@ chunk-e6aww6q8.js:4808157-4809805 placement
/**
 * 用 git cat-file --batch 批量读取 blob 内容。
 */
async function readBlobsFromGit(recorder, contentsByPath, hostRecords, maxAge) {
  let before = new Map();
  let fromHost = new Set();
  let tooLarge = new Set();
  let pendingPaths = [];
  for (let key of contentsByPath.keys()) {
    let lastSeen = recorder.lastSeen.get(key);
    let hostRecord = hostRecords?.get(join(recorder.base.repoRoot, key));
    if (
      hostRecord &&
      hostRecord.content !== "" &&
      isFullFileView(hostRecord) &&
      hostRecord.timestamp < maxAge &&
      (!lastSeen || hostRecord.timestamp > lastSeen.at)
    ) {
      before.set(key, Buffer.from(hostRecord.content, "utf8"));
      fromHost.add(key);
    } else if (lastSeen) before.set(key, lastSeen.content);
    else if (recorder.basePaths && !recorder.basePaths.has(key)) before.set(key, null);
    else pendingPaths.push(key);
  }
  if (pendingPaths.length === 0)
    return {
      before,
      fromHost,
      converted: new Map(),
      tooLarge,
    };
  let batchResult = await runGitCapped(
    recorder.base,
    ["cat-file", "--batch-check"],
    `${pendingPaths.map((path) => `${recorder.base.tree}:${path}`).join(`
`)}
`,
  );
  if (batchResult === null) return null;
  let lines = batchResult.toString("utf8").split(`
`);
  let batches = [[]];
  let batchBytes = 0;
  let totalBytes = 0;
  for (let [idx, path] of pendingPaths.entries()) {
    let line = lines[idx] ?? "";
    if (line === "") return null;
    let parts = line.split(" ");
    let size = Number(parts.at(-1));
    if (line.endsWith(" missing") || parts.at(-2) !== "blob") before.set(path, null);
    else if (!Number.isInteger(size) || size < 0) return null;
    else if (size > MAX_RECORDED_FILE_BYTES || totalBytes + size > MAX_RECORD_BATCH_BYTES) tooLarge.add(path);
    else {
      totalBytes += size;
      if (batchBytes + size + 128 > MAX_GIT_OUTPUT_BYTES - MAX_RECORDED_FILE_BYTES) {
        batches.push([]);
        batchBytes = 0;
      }
      batches.at(-1).push(path);
      batchBytes += size + 128;
    }
  }
  for (let batch of batches) {
    if (batch.length === 0) continue;
    let output = await runGitCapped(
      recorder.base,
      ["cat-file", "--batch"],
      `${batch.map((path) => `${recorder.base.tree}:${path}`).join(`
`)}
`,
    );
    if (output === null) return null;
    let offset = 0;
    for (let path of batch) {
      let index = output.indexOf(10, offset);
      if (index === -1) return null;
      let str = output.subarray(offset, index).toString("utf8");
      offset = index + 1;
      if (str.endsWith(" missing")) {
        before.set(path, null);
        continue;
      }
      let parts = str.split(" ");
      let size = Number(parts.at(-1));
      if (!Number.isInteger(size) || size < 0 || offset + size + 1 > output.length) return null;
      before.set(path, parts.at(-2) === "blob" ? Buffer.from(output.subarray(offset, offset + size)) : null);
      offset += size + 1;
    }
  }
  let converted = await findConvertedFiles(
    recorder.base.repoRoot,
    recorder.base.gitDirectory,
    pendingPaths.filter((path) =>
      contentsByPath.get(path)?.includes(`\r
`),
    ),
  );
  return {
    before,
    fromHost,
    converted,
    tooLarge,
  };
}
//@ chunk-e6aww6q8.js:4809805-4810136 placement
/**
 * 用 git check-ignore --stdin 批量检查哪些路径被忽略，返回被忽略路径集合；git 失败返回 null。
 */
async function checkIgnoredPaths(base, paths) {
  let filtered = paths.filter((path) => !path.startsWith(":"));
  if (filtered.length === 0) return new Set();
  let { stdout, code } = await runSnapshotGit(
    base.repoRoot,
    base.gitDirectory,
    ["check-ignore", "-z", "--stdin", "--no-index"],
    {
      timeout: RECORDER_GIT_TIMEOUT_MS,
      input: `${filtered.join("\x00")}\x00`,
      literalPathspecs: false,
    },
  );
  return code === 0 || code === 1 ? new Set(stdout.split("\x00").filter((path) => path !== "")) : null;
}
//@ chunk-e6aww6q8.js:4810136-4810394 placement
async function listBaseTreePaths(base) {
  if (!(await verifyKnownPrivateGitDir(base))) return null;
  let { stdout, code } = await runSnapshotGit(
    base.repoRoot,
    base.gitDirectory,
    ["ls-tree", "-r", "-z", "--name-only", base.tree],
    {
      timeout: RECORDER_GIT_TIMEOUT_MS,
      maxBuffer: MAX_BASE_LISTING_BYTES,
    },
  );
  if (code !== 0 || stdout.length >= MAX_BASE_LISTING_BYTES) return null;
  return new Set(stdout.split("\x00").filter(isSafeRepoPath));
}
//@ chunk-e6aww6q8.js:4810394-4810824 placement
/**
 * 在快照用的隔离 git 环境中运行 git 命令（可传入标准输入、有超时），输出超过上限时强杀，返回输出或 null。
 */
async function runGitCapped(base, args, input) {
  try {
    let snapshotGitEnv = await buildSnapshotGitEnv(
      [gitExe(), ...getSnapshotGitArgs(), ...args],
      getSnapshotGitEnv(base.gitDirectory, base.repoRoot),
      base.gitDirectory,
    );
    if (snapshotGitEnv === null) return null;
    try {
      let child = safeSpawn(snapshotGitEnv.file, snapshotGitEnv.args, {
        cwd: base.repoRoot,
        env: snapshotGitEnv.env,
        input,
        timeout: RECORDER_GIT_TIMEOUT_MS,
        stderr: "ignore",
        windowsHide: true,
      });
      let chunks = [];
      let totalBytes = 0;
      child.stdout?.on("data", (chunk) => {
        totalBytes += chunk.length;
        if (totalBytes > MAX_GIT_OUTPUT_BYTES) child.kill("SIGKILL");
        else chunks.push(chunk);
      });
      return (await child).exitCode === 0 && totalBytes <= MAX_GIT_OUTPUT_BYTES
        ? Buffer.concat(chunks)
        : null;
    } finally {
      cleanupSandboxAfterGit(snapshotGitEnv);
    }
  } catch {
    return null;
  }
}
//@ chunk-e6aww6q8.js:4810824-4811789 placement
async function statForRecorder(path, maxBytes) {
  let handle;
  try {
    handle = await open(
      path,
      constants.O_RDONLY |
        (getPlatform() === "windows"
          ? 0
          : (getPlatform() === "macos" ? MAX_TOTAL_RECORD_BYTES : (constants.O_NOFOLLOW ?? 0)) |
            (constants.O_NONBLOCK ?? 0) |
            (constants.O_NOCTTY ?? 0)),
    );
  } catch (error) {
    let code = typeof error === "object" && error !== null && "code" in error ? error.code : undefined;
    if (code === "ENOENT" || code === "ENOTDIR") return "missing";
    if (code === "ELOOP")
      return readlink(path, {
        encoding: "buffer",
      }).then(
        (link) =>
          link.length > maxBytes
            ? "too-large"
            : {
                link,
              },
        () => "unreadable",
      );
    return code === "EISDIR" || code === "ENXIO" ? "not-a-file" : "unreadable";
  }
  try {
    let stats = await handle.stat();
    if (!stats.isFile()) return "not-a-file";
    if (!(await isSameOpenFile(handle.fd, path, stats)))
      return (await lstat(path).catch(() => null))?.isSymbolicLink() ? "not-a-file" : "unreadable";
    if (stats.size > maxBytes) return "too-large";
    let buffer = Buffer.allocUnsafe(Math.min(maxBytes, stats.size) + 1);
    let bytesRead = 0;
    for (;;) {
      if (bytesRead === buffer.length) {
        if (bytesRead > maxBytes) return "too-large";
        let biggerBuffer = Buffer.allocUnsafe(Math.min(maxBytes + 1, buffer.length * 2));
        buffer.copy(biggerBuffer, 0, 0, bytesRead);
        buffer = biggerBuffer;
      }
      let { bytesRead: bytesRead_2 } = await handle.read(buffer, bytesRead, buffer.length - bytesRead);
      if (bytesRead_2 === 0) break;
      bytesRead += bytesRead_2;
    }
    return bytesRead > maxBytes ? "too-large" : buffer.subarray(0, bytesRead);
  } catch {
    return "unreadable";
  } finally {
    await handle.close();
  }
}
//@ chunk-e6aww6q8.js:4811789-4811984 placement
async function isSameOpenFile(fd, path, stats) {
  if (getPlatform() === "linux") return (await readlink(`/proc/self/fd/${fd}`).catch(() => null)) === path;
  let pathStat = await lstat(path).catch(() => null);
  return pathStat !== null && pathStat.isFile() && pathStat.dev === stats.dev && pathStat.ino === stats.ino;
}
//@ chunk-e6aww6q8.js:4811984-4812367 placement
/**
 * 记住文件的最近内容（LRU）：替换旧记录，总字节超过上限时从最旧开始逐出并标记 evicted。
 */
function rememberFileContent(recorder, filePath, content) {
  let previous = recorder.lastSeen.get(filePath);
  if (previous) {
    recorder.lastSeenBytes -= previous.content?.length ?? 0;
    recorder.lastSeen.delete(filePath);
  }
  let contentBytes = content?.length ?? 0;
  while (recorder.lastSeenBytes + contentBytes > MAX_LAST_SEEN_BYTES && recorder.lastSeen.size > 0) {
    let oldestPath = recorder.lastSeen.keys().next().value;
    if (oldestPath === undefined) break;
    recorder.lastSeenBytes -= recorder.lastSeen.get(oldestPath)?.content?.length ?? 0;
    recorder.lastSeen.delete(oldestPath);
    recorder.evicted = true;
  }
  recorder.lastSeen.set(filePath, {
    content,
    at: Date.now(),
  });
  recorder.lastSeenBytes += contentBytes;
}
//@ chunk-e6aww6q8.js:4812367-4812407 placement
/**
 * 判断快照中的文件内容不可直接逐字比较（二进制/过大/不可读，由 Vys 判定）。
 */
function isTrackedLargeOrUnreadable(content) {
  return content !== null && hasNulByteInHead(content);
}
export { startEditRecorder, recordEditedFilesSerially, recordObservedWrites };
