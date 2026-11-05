/**
 * utils/teleport/gitBundleVerify.ts
 *
 * 2.1.316 新增：校验生成的 git bundle 文件（v2/v3 头、对象格式、pack 签名、空树）与主检出/子目录起点判定
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-sfy2wa1e.js (29)
 * attribution: placement 29
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import {
  mkdtemp,
  rm,
  open,
  readFile,
  stat,
  readdir,
  chmod,
  mkdir,
  writeFile,
  unlink,
  realpath,
} from "fs/promises";
import { join } from "path";
import { randomBytes } from "crypto";
import { pipeline } from "stream/promises";
import { createReadStream, createWriteStream } from "fs";
import { Transform } from "stream";
import { tmpdir } from "../tempDir.js";
import { readOnlyNoFollowFlags } from "../platformTargets.js";
import { normalizeCaseForComparison_2 } from "../permissions/filesystem.js";
import { seenStderr } from "../git/builderGit/gitRun.js";
import { getFirstLine, firstLineOf } from "../stringUtils.js";
import { checkoutDirOfGitDir } from "../git/builderGit/sandboxReach.js";
import { isPathInside } from "../permissions/protectedEnvAndGitPaths.js";
import { logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { getErrnoCode, errorMessage, toError } from "../errors.js";
import { GIT_SHA_RE } from "../../remote/tools/servedOwnerSettings.js";
import { getPlatform } from "../platform.js";
import { isPlainRelativePath, hasNamedForkSegment } from "./seedPaths.js";
import { foldName } from "../permissions/protectedDirNames.js";
import { hasBackslash } from "../pathClassification.js";
import { getContainerId } from "../../services/internalLogging.js";
import { unescapeMountField, isNetworkOrForeignMount, isDrvfsMount, isAtOrUnderPath } from "../wslMounts.js";
import { countWhere } from "../collections.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-sfy2wa1e.js:2061-2211 placement
async function createBundleOutput(prefix, tmp = tmpdir(), name = "out.bundle") {
  let dir = await mkdtemp(join(tmp, `${prefix}-`));
  return {
    path: join(dir, name),
    dispose: () =>
      rm(dir, {
        recursive: true,
        force: true,
      }).catch(() => {}),
  };
}
//@ chunk-sfy2wa1e.js:2211-2769 placement
/**
 * 读取生成的 bundle 文件（单一普通文件、大小上限、读取中变化检测）。
 */
async function readBundleFileSafely(path, maxBytes) {
  let handle;
  try {
    handle = await open(path, readOnlyNoFollowFlags());
  } catch (error) {
    return {
      kind: "unreadable",
      detail: String(error),
    };
  }
  try {
    let stats = await handle.stat();
    if (!stats.isFile() || stats.nlink !== 1)
      return {
        kind: "unreadable",
        detail: "not a single regular file",
      };
    if (stats.size > maxBytes)
      return {
        kind: "too_large",
        sizeBytes: stats.size,
      };
    let buffer = Buffer.alloc(stats.size);
    let offset = 0;
    while (offset < stats.size) {
      let { bytesRead } = await handle.read(buffer, offset, stats.size - offset, offset);
      if (bytesRead === 0) break;
      offset += bytesRead;
    }
    return offset === stats.size
      ? {
          kind: "read",
          content: buffer,
        }
      : {
          kind: "unreadable",
          detail: "changed while being read",
        };
  } catch (error) {
    return {
      kind: "unreadable",
      detail: String(error),
    };
  } finally {
    await handle.close();
  }
}
//@ chunk-sfy2wa1e.js:2923-3657 placement
/**
 * git bundle 文件头签名到对象格式的映射，以及引用行和缺失对象的正则。
 */
var BUNDLE_HEADER_SIGNATURES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var REF_LINE_RES;
var MISSING_OBJECT_RE;
var BAD_OBJECT_RE;
var buffer;
var PACK_HEADER_BYTES;
deferInit("chunk-sfy2wa1e.js:2923", () => {
  BUNDLE_HEADER_SIGNATURES = new Map([
    ["# v2 git bundle", "sha1"],
    [
      `# v3 git bundle
@object-format=sha1`,
      "sha1",
    ],
    [
      `# v3 git bundle
@object-format=sha256`,
      "sha256",
    ],
  ]);
  REF_LINE_RES = {
    sha1: /^([0-9a-f]{40}) ([^\0-\x20\x7f]+)$/,
    sha256: /^([0-9a-f]{64}) ([^\0-\x20\x7f]+)$/,
  };
  MISSING_OBJECT_RE =
    /unable to read [0-9a-f]{40}|missing (?:blob|tree|commit|tag) object|bad (?:tree )?object [0-9a-f]{40}|[Cc]ould not read [0-9a-f]{40}|Failed to traverse parents|bogus commit object|too-short tree (?:object|file)|malformed mode in tree entry|empty filename in tree entry|[Oo]bject [0-9a-f]{40,64} (?:is a \w+, )?not a (?:tree|commit|blob|tag)|mode, but is not a (?:tree|blob)|exceeded maximum allowed tree depth/;
  BAD_OBJECT_RE = /^(?:error|fatal):/m;
  buffer = Buffer.from("PACK\x00\x00\x00\x02", "latin1");
  PACK_HEADER_BYTES = buffer.length;
});
//@ chunk-sfy2wa1e.js:3657-3857 placement
var EMPTY_TREE_IDS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var buffer_2;
var MIN_PACK_INDEX_BYTES;
deferInit("chunk-sfy2wa1e.js:3657", () => {
  EMPTY_TREE_IDS = {
    sha1: "4b825dc642cb6eb9a060e54bf8d69288fbee4904",
    sha256: "6ef19b41225c5369f1c104d45d8d85efa9b057b53b14b4b9b939dd74decc5321",
  };
  buffer_2 = Buffer.from("\xFFtOc\x00\x00\x00\x02", "latin1");
  MIN_PACK_INDEX_BYTES = buffer_2.length + 1024;
});
//@ chunk-sfy2wa1e.js:3857-4278 placement
/**
 * 解析 bundle 文件头：识别 v2/v3 签名、能力行与引用列表。
 */
function parseBundleHeader(data) {
  let index = data.indexOf(`

`);
  let lines = data.toString("latin1", 0, Math.max(index, 0)).split(`
`);
  let index_2 = lines.findIndex((line, lineIndex) => lineIndex > 0 && !line.startsWith("@"));
  let objectFormat = BUNDLE_HEADER_SIGNATURES.get(
    lines.slice(0, index_2).join(`
`),
  );
  if (index_2 < 0 || objectFormat === undefined) return null;
  let flattened = lines.slice(index_2).flatMap((line) => {
    let [, lineIndex_2, refName] = REF_LINE_RES[objectFormat].exec(line) ?? [];
    return lineIndex_2 === undefined || refName === undefined
      ? []
      : [
          {
            id: lineIndex_2,
            name: refName,
          },
        ];
  });
  return flattened.length === lines.length - index_2 &&
    normalizeCaseForComparison_2(flattened.map((ref) => ref.name)).length === flattened.length
    ? {
        objectFormat,
        refs: flattened,
        packOffset: index + 2,
      }
    : null;
}
//@ chunk-sfy2wa1e.js:4278-4651 placement
/**
 * 在 pack 索引文件中查找指定对象 id（按扇出表二分范围比较）。
 */
async function packIndexHasObject(indexPath, sha) {
  let indexBytes = await readFile(indexPath).catch(() => null);
  if (
    indexBytes === null ||
    indexBytes.length < MIN_PACK_INDEX_BYTES ||
    !indexBytes.subarray(0, buffer_2.length).equals(buffer_2)
  )
    return null;
  let buffer = Buffer.from(sha, "hex");
  let readFanout = (fanoutIndex) =>
    fanoutIndex < 0 ? 0 : indexBytes.readUInt32BE(buffer_2.length + fanoutIndex * 4);
  let [start, end] = [readFanout(buffer[0] - 1), readFanout(buffer[0])];
  if (MIN_PACK_INDEX_BYTES + end * buffer.length > indexBytes.length) return null;
  return Array.from(
    {
      length: end - start,
    },
    (id, index) => start + index,
  ).some((id) =>
    indexBytes
      .subarray(MIN_PACK_INDEX_BYTES + id * buffer.length, MIN_PACK_INDEX_BYTES + (id + 1) * buffer.length)
      .equals(buffer),
  );
}
//@ chunk-sfy2wa1e.js:4651-5114 placement
/**
 * 构造只使用临时 git 目录的环境变量，禁用替代对象库、懒抓取与替换对象。
 */
function isolatedGitDirEnv(gitDir) {
  return {
    GIT_DIR: gitDir,
    GIT_COMMON_DIR: gitDir,
    GIT_WORK_TREE: gitDir,
    GIT_OBJECT_DIRECTORY: join(gitDir, "objects"),
    GIT_ALTERNATE_OBJECT_DIRECTORIES: "",
    GIT_NO_LAZY_FETCH: "1",
    GIT_GRAFT_FILE: join(gitDir, "info", "grafts"),
    GIT_SHALLOW_FILE: join(gitDir, "shallow"),
    GIT_NO_REPLACE_OBJECTS: "1",
    GIT_CONFIG_NOSYSTEM: "1",
    GIT_CONFIG_GLOBAL: join(gitDir, "no-global-config"),
    GIT_CONFIG_COUNT: "0",
    GIT_CONFIG_PARAMETERS: "",
    GIT_ATTR_NOSYSTEM: "1",
    XDG_CONFIG_HOME: gitDir,
    GIT_TEST_PACK_PATH_WALK: "0",
    LC_ALL: "C",
    LANGUAGE: "C",
  };
}
//@ chunk-sfy2wa1e.js:5114-6571 placement
/**
 * 校验 bundle 是完整的（头、引用、pack 尾部），返回问题描述。
 */
async function verifyBundleFile(bundleBytes, { scratchRoot }, runGit) {
  let bundleHeader = parseBundleHeader(bundleBytes);
  if (bundleHeader === null)
    return {
      ok: false,
      kind: "header",
      detail: "not a whole bundle",
    };
  let chunk = bundleBytes.subarray(bundleHeader.packOffset);
  let scratchDir = join(scratchRoot, "check");
  let scratchGitDir = await createScratchGitDir(scratchDir, bundleHeader.objectFormat);
  if (scratchGitDir !== null)
    return {
      ok: false,
      kind: "scratch",
      detail: scratchGitDir,
    };
  try {
    let env = isolatedGitDirEnv(scratchDir);
    let indexResult = await runGit(["-C", scratchDir, "index-pack", "--index-version=2", "--stdin"], {
      env,
      input: chunk,
    });
    if (indexResult.code !== 0)
      return {
        ok: false,
        kind: indexResult.exitCode === undefined ? "unfinished" : "index",
        detail: gitFailureDetail(indexResult),
      };
    let [, packId] = /^pack\t([0-9a-f]+)$/m.exec(indexResult.stdout) ?? [];
    let packBase = join(scratchDir, "objects", "pack", `pack-${packId}`);
    let packStats = await stat(`${packBase}.pack`).catch(() => null);
    if (packStats === null)
      return {
        ok: false,
        kind: "index",
        detail: "no indexed pack to read",
      };
    if (packStats.size !== chunk.length)
      return {
        ok: false,
        kind: "trailing",
        detail: `${chunk.length - packStats.size} bytes follow the pack`,
      };
    let emptyTreeId = EMPTY_TREE_IDS[bundleHeader.objectFormat];
    let emptyTreeIndexed = await packIndexHasObject(`${packBase}.idx`, emptyTreeId);
    if (emptyTreeIndexed === null)
      return {
        ok: false,
        kind: "index",
        detail: "no pack index to read",
      };
    let walkResult = await runGit(["-C", scratchDir, "rev-list", "--objects", "--count", "--stdin"], {
      env,
      input: `${[...normalizeCaseForComparison_2(bundleHeader.refs.map((ref) => ref.id)), `^${emptyTreeId}`]
        .join(`
`)}
`,
    });
    if (walkResult.code !== 0 || BAD_OBJECT_RE.test(seenStderr(walkResult)))
      return {
        ok: false,
        kind:
          walkResult.exitCode === undefined
            ? "unfinished"
            : MISSING_OBJECT_RE.test(seenStderr(walkResult))
              ? "objects"
              : "walk",
        detail: gitFailureDetail(walkResult),
      };
    let packedObjectCount = chunk.readUInt32BE(PACK_HEADER_BYTES) - (emptyTreeIndexed ? 1 : 0);
    let trimmed = walkResult.stdout.trim();
    if (!/^\d+$/.test(trimmed))
      return {
        ok: false,
        kind: "walk",
        detail: "git printed no object count",
      };
    return trimmed === String(packedObjectCount)
      ? {
          ok: true,
        }
      : {
          ok: false,
          kind: "unlisted",
          detail: `${packedObjectCount} objects packed, its refs lead to ${trimmed}, the empty tree not counted`,
        };
  } catch (error) {
    return {
      ok: false,
      kind: "unfinished",
      detail: String(error),
    };
  } finally {
    await removeScratchGitDir(scratchDir);
  }
}
//@ chunk-sfy2wa1e.js:6571-6760 placement
async function removeScratchGitDir(scratchRoot) {
  let packDir = join(scratchRoot, "objects", "pack");
  let entries = await readdir(packDir).catch(() => []);
  await Promise.all(entries.map((entry) => chmod(join(packDir, entry), 420).catch(() => {})));
  await rm(scratchRoot, {
    recursive: true,
    force: true,
  }).catch(() => {});
}
//@ chunk-sfy2wa1e.js:6760-7117 placement
/**
 * 创建临时 git 目录结构（objects/pack、refs、HEAD 等），失败返回错误文本。
 */
async function createScratchGitDir(scratchRoot, objectFormat) {
  try {
    await mkdir(scratchRoot);
  } catch (error) {
    return String(error);
  }
  try {
    await mkdir(join(scratchRoot, "objects", "pack"), {
      recursive: true,
    });
    await mkdir(join(scratchRoot, "refs"));
    await writeFile(
      join(scratchRoot, "HEAD"),
      `ref: refs/heads/rebuild
`,
    );
    if (objectFormat === "sha256")
      await writeFile(
        join(scratchRoot, "config"),
        `[core]
	repositoryformatversion = 1
[extensions]
	objectformat = sha256
`,
      );
    return null;
  } catch (error) {
    await removeScratchGitDir(scratchRoot);
    return String(error);
  }
}
//@ chunk-sfy2wa1e.js:7117-7220 placement
function gitFailureDetail(result) {
  return (
    getFirstLine(result.stderr.trim()) ||
    (result.exitCode === undefined ? "git did not finish" : `exit ${result.code}`)
  );
}
//@ chunk-sfy2wa1e.js:7220-7497 placement
function classifyCheckoutStart(layout) {
  if (layout?.checkout === undefined) return "layout_not_read";
  if (layout.checkout === "main") return "main_checkout";
  let checkoutDir = checkoutDirOfGitDir(layout.commonDir);
  let insideCheckout = isPathInside(checkoutDir, layout.workTree);
  if (checkoutDir === layout.commonDir)
    return insideCheckout ? "beneath_git_directory" : "outside_git_directory";
  return insideCheckout ? "beneath_repository" : "outside_repository";
}
//@ chunk-sfy2wa1e.js:7497-8005 placement
function logBundleStartLocation(start) {
  switch (start) {
    case "main_checkout":
      return logFeatureOk("teleport_git_bundle_from_main_checkout");
    case "beneath_repository":
      return logFeatureOk("teleport_git_bundle_from_beneath_repository");
    case "outside_repository":
      return logFeatureOk("teleport_git_bundle_from_outside_repository");
    case "beneath_git_directory":
      return logFeatureOk("teleport_git_bundle_from_beneath_git_directory");
    case "outside_git_directory":
      return logFeatureOk("teleport_git_bundle_from_outside_git_directory");
    case "layout_not_read":
      return logFeatureOk("teleport_git_bundle_from_layout_not_read");
  }
}
//@ chunk-sfy2wa1e.js:8005-8321 placement
/**
 * 「不要在此目录运行 git」及建议文案：新克隆或保留目录的说明。
 */
var DO_NOT_RUN_GIT_ADVICE = "Do not run git in this folder: git may act on what was put there.";
var FRESH_CLONE_HINT =
  "a fresh clone from the remote (with no remote: a new folder and git init), copy your files over by hand, but not the .git folder, then";
var KEEP_FOLDER_HINT =
  "Keep this folder: commits that you have not pushed, other branches and stashes exist only here.";
//@ chunk-sfy2wa1e.js:8540-8675 placement
var REFS_SEED_STASH = "refs/seed/stash";
var REFS_SEED_ROOT = "refs/seed/root";
var REFS_SEED = "refs/seed/";
var SEED_REF_STALE_MS = 7200000;
var MAX_BUNDLE_HEADER_LINE = 65536;
var SEED_REF_RE = /^refs\/seed\/(\d+)-[0-9a-f]{16}\/(?:stash|root)$/;
//@ chunk-sfy2wa1e.js:8675-8793 placement
function createSeedRefNames(now = Date.now()) {
  let suffix = `${now}-${randomBytes(8).toString("hex")}`;
  return {
    stash: `${REFS_SEED}${suffix}/stash`,
    root: `${REFS_SEED}${suffix}/root`,
  };
}
//@ chunk-sfy2wa1e.js:8793-8934 placement
function staleSeedRefs(refs, now = Date.now()) {
  return refs.filter((ref) => {
    if (ref === REFS_SEED_STASH || ref === REFS_SEED_ROOT) return true;
    let match = SEED_REF_RE.exec(ref);
    return match !== null && Math.abs(now - Number(match[1])) > SEED_REF_STALE_MS;
  });
}
//@ chunk-sfy2wa1e.js:8934-9148 placement
async function copyVerifiedBundle(path, labels, labels_2, signal) {
  let verifier = new BundleStreamVerifier(labels_2);
  try {
    await pipeline(
      createReadStream(path),
      verifier,
      createWriteStream(labels, {
        flags: "wx",
      }),
      {
        signal,
      },
    );
    return {
      ok: true,
      sizeBytes: verifier.outputBytes,
    };
  } catch (error) {
    if (getErrnoCode(error) !== "EEXIST") await unlink(labels).catch(() => {});
    return {
      ok: false,
      error: errorMessage(error),
    };
  }
}
//@ chunk-sfy2wa1e.js:9148-11026 placement
/**
 * 流式解析 bundle：签名、引用行、pack 头，统计输出字节。
 */
class BundleStreamVerifier extends Transform {
  labels;
  outputBytes = 0;
  state = "signature";
  version = 2;
  sawRef = false;
  pending = Buffer.alloc(0);
  applied = new Set();
  constructor(labels) {
    super();
    this.labels = labels;
  }
  _transform(chunk, encoding, callback) {
    try {
      if (this.state === "pack") this.writeOut(chunk);
      else {
        this.pending = this.pending.length === 0 ? chunk : Buffer.concat([this.pending, chunk]);
        this.consumeHeaderLines();
      }
      callback();
    } catch (error) {
      callback(toError(error));
    }
  }
  _flush(callback) {
    callback(this.state === "pack" ? null : Error("bundle ended before the end of its header"));
  }
  writeOut(chunk) {
    let bytes = typeof chunk === "string" ? Buffer.from(chunk, "latin1") : chunk;
    this.outputBytes += bytes.length;
    this.push(bytes);
  }
  consumeHeaderLines() {
    for (;;) {
      let index = this.pending.indexOf(10);
      if (index < 0) {
        if (this.pending.length > MAX_BUNDLE_HEADER_LINE) throw Error("bundle header line too long");
        return;
      }
      let str = this.pending.toString("latin1", 0, index);
      this.pending = this.pending.subarray(index + 1);
      if (this.state === "signature") {
        if (str === "# v2 git bundle") this.version = 2;
        else if (str === "# v3 git bundle") this.version = 3;
        else throw Error("not a v2 or v3 git bundle");
        this.state = "header";
        this.writeOut(`${str}
`);
        continue;
      }
      if (str === "") {
        if (this.applied.size !== this.labels.size)
          throw Error("bundle header does not name every ref to relabel");
        this.state = "pack";
        this.writeOut(`
`);
        this.writeOut(this.pending);
        this.pending = Buffer.alloc(0);
        return;
      }
      this.writeOut(`${this.headerLine(str)}
`);
    }
  }
  headerLine(line) {
    if (line.startsWith("@")) {
      if (this.version !== 3 || this.sawRef) throw Error("bundle capability line out of place");
      return line;
    }
    this.sawRef = true;
    let index = line.indexOf(" ");
    let objectId = index < 0 ? line : line.slice(0, index);
    if (line.startsWith("-")) {
      if (!GIT_SHA_RE.test(objectId.slice(1))) throw Error("malformed bundle prerequisite line");
      return line;
    }
    let refId = objectId;
    let sliced = line.slice(index + 1);
    if (index < 0 || sliced === "" || !GIT_SHA_RE.test(refId)) throw Error("malformed bundle ref line");
    let relabel = this.labels.get(sliced);
    if (relabel !== undefined) {
      if (this.applied.has(sliced)) throw Error("bundle header names a ref to relabel twice");
      this.applied.add(sliced);
      return `${refId} ${relabel}`;
    }
    if (sliced.startsWith(REFS_SEED))
      throw Error("bundle header carries a seed ref that is not this build's");
    return line;
  }
}
//@ chunk-sfy2wa1e.js:11421-11445 placement
var GIT_DIR_NAMES = [".git", "git~1"];
//@ chunk-sfy2wa1e.js:11445-11519 placement (2.1.88 match: execTmux, 1)
function isSafeRepoRelativePath(args, opts) {
  return (
    !isUnsafeRepoRelativePath(args) &&
    !(getPlatform() === "wsl" && args.includes("\\")) &&
    !hasWindowsUnsafeSegment(args, opts)
  );
}
//@ chunk-sfy2wa1e.js:11519-11633 placement
function isUnsafeRepoRelativePath(path) {
  return (
    path.includes("\x00") ||
    !isPlainRelativePath(toForwardSlashes(path)) ||
    toForwardSlashes(path)
      .split("/")
      .some((segment) => GIT_DIR_NAMES.includes(foldName(segment))) ||
    hasNamedForkSegment(toForwardSlashes(path))
  );
}
//@ chunk-sfy2wa1e.js:11633-11738 placement
function hasWindowsUnsafeSegment(path, opts) {
  return (
    opts &&
    path
      .replaceAll("\\", "/")
      .split("/")
      .some((segment) => segment.includes(":") || /[. ]$/.test(segment))
  );
}
//@ chunk-sfy2wa1e.js:11738-11783 placement
var DOS_SHORT_NAME_PATTERN = /^[^~.]{1,6}~[0-9]+(?:\.[^.]{1,3})?$/;
//@ chunk-sfy2wa1e.js:11783-11927 placement (2.1.88 match: execTmux, 1)
function hasDosShortNameSegment(path) {
  let platform = getPlatform();
  return (
    (platform === "windows" || platform === "wsl") &&
    path
      .replaceAll("\\", "/")
      .split("/")
      .some((segment) => DOS_SHORT_NAME_PATTERN.test(firstLineOf(segment, ":").replace(/[. ]+$/, "")))
  );
}
//@ chunk-sfy2wa1e.js:11927-11974 placement
async function isCaseFoldingFileSystem(dir) {
  return (await detectFileSystemCaseFolding(dir)) !== "no";
}
//@ chunk-sfy2wa1e.js:11974-12829 placement
async function detectFileSystemCaseFolding(dir) {
  let platform = getPlatform();
  if (platform === "windows") return "yes";
  if (platform !== "wsl") return "no";
  let targetPath =
    dir.split("/").includes("..") || hasBackslash(dir) ? null : await realpath(dir).catch(() => null);
  if (targetPath === null) return "unsure";
  let containerId = await getContainerId();
  let secondContainerId = containerId === null ? null : await getContainerId();
  if (containerId === null || secondContainerId === null || !containerId.equals(secondContainerId))
    return "unsure";
  let filtered = containerId
    .toString("utf8")
    .split(
      `
`,
    )
    .filter((line) => line !== "");
  let mounts = filtered.flatMap((line) => {
    let parts = line.split(" ");
    let index = parts.indexOf("-");
    let [source, target, , , mountPoint] = parts;
    let mountId = index >= 0 ? parts[index + 1] : undefined;
    if (source === undefined || target === undefined || mountPoint === undefined || mountId === undefined)
      return [];
    let options = [parts[5], parts[index + 3]].filter(Boolean).join(",");
    return [
      {
        id: source,
        parent: target,
        point: unescapeMountField(mountPoint),
        windowsSide: isNetworkOrForeignMount({
          fstype: mountId,
          source: parts[index + 2],
          options,
        }),
        windowsDrive: isDrvfsMount(mountId, options),
      },
    ];
  });
  if (mounts.length !== filtered.length) return "unsure";
  if (
    mounts.some(
      (mount) => mount.windowsSide && mount.point !== targetPath && isAtOrUnderPath(mount.point, targetPath),
    )
  )
    return "unsure";
  let mountForPath = resolveMountForPath(targetPath, mounts);
  return mountForPath === null || mountForPath === "unsure"
    ? "unsure"
    : mountForPath.windowsDrive
      ? "yes"
      : mountForPath.windowsSide
        ? "unsure"
        : "no";
}
//@ chunk-sfy2wa1e.js:12829-13345 placement
/**
 * 根据挂载点列表判断路径所在的挂载：取包含该路径的最短挂载点，存在多个根挂载或歧义时返回 unsure。
 */
function resolveMountForPath(targetPath, mounts) {
  if (countWhere(mounts, (mountRecord) => mountRecord.point === "/") > 1) return "unsure";
  let mountIds = new Set(mounts.map((mount) => mount.id));
  let deepestMountUnder = (candidates) => {
    let filtered = candidates.filter((candidate) => isAtOrUnderPath(targetPath, candidate.point));
    let min = Math.min(...filtered.map((candidate) => candidate.point.length));
    let [first, second] = filtered.filter((candidateMount) => candidateMount.point.length === min);
    return first === undefined ? null : second === undefined ? first : "unsure";
  };
  let walkParents = (walkerMount, budget) => {
    if (budget === 0) return null;
    let parentMount = deepestMountUnder(
      mounts.filter((mount) => mount.parent === walkerMount.id && mount !== walkerMount),
    );
    return parentMount === null
      ? walkerMount
      : parentMount === "unsure"
        ? parentMount
        : walkParents(parentMount, budget - 1);
  };
  let [firstRoot, secondRoot] = mounts.filter(
    (mount) =>
      (!mountIds.has(mount.parent) || mount.parent === mount.id) && isAtOrUnderPath(targetPath, mount.point),
  );
  return firstRoot === undefined
    ? null
    : secondRoot !== undefined
      ? "unsure"
      : walkParents(firstRoot, mounts.length);
}
//@ chunk-sfy2wa1e.js:13345-13408 placement
function toForwardSlashes(path) {
  return getPlatform() === "windows" ? path.replaceAll("\\", "/") : path;
}
export {
  isSafeRepoRelativePath,
  isCaseFoldingFileSystem,
  hasDosShortNameSegment,
  REFS_SEED_STASH,
  REFS_SEED_ROOT,
  copyVerifiedBundle,
  FRESH_CLONE_HINT,
  KEEP_FOLDER_HINT,
  DO_NOT_RUN_GIT_ADVICE,
  createSeedRefNames,
  staleSeedRefs,
  createBundleOutput,
  readBundleFileSafely,
  verifyBundleFile,
  logBundleStartLocation,
  classifyCheckoutStart,
};
