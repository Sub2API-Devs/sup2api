/**
 * utils/teleport/gitBundleVerify.ts
 *
 * 2.1.316 新增：校验生成的 git bundle 文件（v2/v3 头、对象格式、pack 签名、空树）与主检出/子目录起点判定
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-gjx0rh1b.js (29)
 * attribution: placement 29
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
import { uniq, count } from "../collections.js";
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

//@ chunk-gjx0rh1b.js:1961-2111 placement
async function BUNDLE_OUTPUT_NAME(e, n = tmpdir(), r = "out.bundle") {
  let o = await mkdtemp(join(n, `${e}-`));
  return {
    path: join(o, r),
    dispose: () =>
      rm(o, {
        recursive: true,
        force: true,
      }).catch(() => {}),
  };
}
//@ chunk-gjx0rh1b.js:2111-2669 placement
/**
 * 读取生成的 bundle 文件（单一普通文件、大小上限、读取中变化检测）。
 */
async function readBundleFileSafely(path, n) {
  let r;
  try {
    r = await open(path, readOnlyNoFollowFlags());
  } catch (error) {
    return {
      kind: "unreadable",
      detail: String(error),
    };
  }
  try {
    let stats = await r.stat();
    if (!stats.isFile() || stats.nlink !== 1)
      return {
        kind: "unreadable",
        detail: "not a single regular file",
      };
    if (stats.size > n)
      return {
        kind: "too_large",
        sizeBytes: stats.size,
      };
    let s = Buffer.alloc(stats.size);
    let l = 0;
    while (l < stats.size) {
      let { bytesRead } = await r.read(s, l, stats.size - l, l);
      if (bytesRead === 0) break;
      l += bytesRead;
    }
    return l === stats.size
      ? {
          kind: "read",
          content: s,
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
    await r.close();
  }
}
//@ chunk-gjx0rh1b.js:2823-3557 placement
/**
 * git bundle 文件头签名到对象格式的映射，以及引用行和缺失对象的正则。
 */
var BUNDLE_HEADER_SIGNATURES = new Map([
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
var REF_LINE_RES = {
  sha1: /^([0-9a-f]{40}) ([^\0-\x20\x7f]+)$/,
  sha256: /^([0-9a-f]{64}) ([^\0-\x20\x7f]+)$/,
};
var MISSING_OBJECT_RE =
  /unable to read [0-9a-f]{40}|missing (?:blob|tree|commit|tag) object|bad (?:tree )?object [0-9a-f]{40}|[Cc]ould not read [0-9a-f]{40}|Failed to traverse parents|bogus commit object|too-short tree (?:object|file)|malformed mode in tree entry|empty filename in tree entry|[Oo]bject [0-9a-f]{40,64} (?:is a \w+, )?not a (?:tree|commit|blob|tag)|mode, but is not a (?:tree|blob)|exceeded maximum allowed tree depth/;
var BAD_OBJECT_RE = /^(?:error|fatal):/m;
var buffer = Buffer.from("PACK\x00\x00\x00\x02", "latin1");
var PACK_HEADER_BYTES = buffer.length;
//@ chunk-gjx0rh1b.js:3557-3757 placement
var EMPTY_TREE_IDS = {
  sha1: "4b825dc642cb6eb9a060e54bf8d69288fbee4904",
  sha256: "6ef19b41225c5369f1c104d45d8d85efa9b057b53b14b4b9b939dd74decc5321",
};
var buffer_2 = Buffer.from("\xFFtOc\x00\x00\x00\x02", "latin1");
var MIN_PACK_INDEX_BYTES = buffer_2.length + 1024;
//@ chunk-gjx0rh1b.js:3757-4178 placement
/**
 * 解析 bundle 文件头：识别 v2/v3 签名、能力行与引用列表。
 */
function parseBundleHeader(e) {
  let index = e.indexOf(`

`);
  let lines = e.toString("latin1", 0, Math.max(index, 0)).split(`
`);
  let index_2 = lines.findIndex((line, u) => u > 0 && !line.startsWith("@"));
  let s = BUNDLE_HEADER_SIGNATURES.get(
    lines.slice(0, index_2).join(`
`),
  );
  if (index_2 < 0 || s === undefined) return null;
  let flattened = lines.slice(index_2).flatMap((line) => {
    let [, u, p] = REF_LINE_RES[s].exec(line) ?? [];
    return u === undefined || p === undefined
      ? []
      : [
          {
            id: u,
            name: p,
          },
        ];
  });
  return flattened.length === lines.length - index_2 &&
    uniq(flattened.map((h) => h.name)).length === flattened.length
    ? {
        objectFormat: s,
        refs: flattened,
        packOffset: index + 2,
      }
    : null;
}
//@ chunk-gjx0rh1b.js:4178-4551 placement
/**
 * 在 pack 索引文件中查找指定对象 id（按扇出表二分范围比较）。
 */
async function packIndexHasObject(e, n) {
  let r = await readFile(e).catch(() => null);
  if (r === null || r.length < MIN_PACK_INDEX_BYTES || !r.subarray(0, buffer_2.length).equals(buffer_2))
    return null;
  let buffer = Buffer.from(n, "hex");
  let s = (u) => (u < 0 ? 0 : r.readUInt32BE(buffer_2.length + u * 4));
  let [l, h] = [s(buffer[0] - 1), s(buffer[0])];
  if (MIN_PACK_INDEX_BYTES + h * buffer.length > r.length) return null;
  return Array.from(
    {
      length: h - l,
    },
    (u, p) => l + p,
  ).some((u) =>
    r
      .subarray(MIN_PACK_INDEX_BYTES + u * buffer.length, MIN_PACK_INDEX_BYTES + (u + 1) * buffer.length)
      .equals(buffer),
  );
}
//@ chunk-gjx0rh1b.js:4551-5014 placement
/**
 * 构造只使用临时 git 目录的环境变量，禁用替代对象库、懒抓取与替换对象。
 */
function isolatedGitDirEnv(e) {
  return {
    GIT_DIR: e,
    GIT_COMMON_DIR: e,
    GIT_WORK_TREE: e,
    GIT_OBJECT_DIRECTORY: join(e, "objects"),
    GIT_ALTERNATE_OBJECT_DIRECTORIES: "",
    GIT_NO_LAZY_FETCH: "1",
    GIT_GRAFT_FILE: join(e, "info", "grafts"),
    GIT_SHALLOW_FILE: join(e, "shallow"),
    GIT_NO_REPLACE_OBJECTS: "1",
    GIT_CONFIG_NOSYSTEM: "1",
    GIT_CONFIG_GLOBAL: join(e, "no-global-config"),
    GIT_CONFIG_COUNT: "0",
    GIT_CONFIG_PARAMETERS: "",
    GIT_ATTR_NOSYSTEM: "1",
    XDG_CONFIG_HOME: e,
    GIT_TEST_PACK_PATH_WALK: "0",
    LC_ALL: "C",
    LANGUAGE: "C",
  };
}
//@ chunk-gjx0rh1b.js:5014-6471 placement
/**
 * 校验 bundle 是完整的（头、引用、pack 尾部），返回问题描述。
 */
async function verifyBundleFile(e, { scratchRoot }, r) {
  let bundleHeader = parseBundleHeader(e);
  if (bundleHeader === null)
    return {
      ok: false,
      kind: "header",
      detail: "not a whole bundle",
    };
  let chunk = e.subarray(bundleHeader.packOffset);
  let l = join(scratchRoot, "check");
  let scratchGitDir = await createScratchGitDir(l, bundleHeader.objectFormat);
  if (scratchGitDir !== null)
    return {
      ok: false,
      kind: "scratch",
      detail: scratchGitDir,
    };
  try {
    let env = isolatedGitDirEnv(l);
    let p = await r(["-C", l, "index-pack", "--index-version=2", "--stdin"], {
      env,
      input: chunk,
    });
    if (p.code !== 0)
      return {
        ok: false,
        kind: p.exitCode === undefined ? "unfinished" : "index",
        detail: gitFailureDetail(p),
      };
    let [, w] = /^pack\t([0-9a-f]+)$/m.exec(p.stdout) ?? [];
    let _ = join(l, "objects", "pack", `pack-${w}`);
    let y = await stat(`${_}.pack`).catch(() => null);
    if (y === null)
      return {
        ok: false,
        kind: "index",
        detail: "no indexed pack to read",
      };
    if (y.size !== chunk.length)
      return {
        ok: false,
        kind: "trailing",
        detail: `${chunk.length - y.size} bytes follow the pack`,
      };
    let E = EMPTY_TREE_IDS[bundleHeader.objectFormat];
    let C = await packIndexHasObject(`${_}.idx`, E);
    if (C === null)
      return {
        ok: false,
        kind: "index",
        detail: "no pack index to read",
      };
    let A = await r(["-C", l, "rev-list", "--objects", "--count", "--stdin"], {
      env,
      input: `${[...uniq(bundleHeader.refs.map((ref) => ref.id)), `^${E}`].join(`
`)}
`,
    });
    if (A.code !== 0 || BAD_OBJECT_RE.test(seenStderr(A)))
      return {
        ok: false,
        kind:
          A.exitCode === undefined
            ? "unfinished"
            : MISSING_OBJECT_RE.test(seenStderr(A))
              ? "objects"
              : "walk",
        detail: gitFailureDetail(A),
      };
    let R = chunk.readUInt32BE(PACK_HEADER_BYTES) - (C ? 1 : 0);
    let trimmed = A.stdout.trim();
    if (!/^\d+$/.test(trimmed))
      return {
        ok: false,
        kind: "walk",
        detail: "git printed no object count",
      };
    return trimmed === String(R)
      ? {
          ok: true,
        }
      : {
          ok: false,
          kind: "unlisted",
          detail: `${R} objects packed, its refs lead to ${trimmed}, the empty tree not counted`,
        };
  } catch (error) {
    return {
      ok: false,
      kind: "unfinished",
      detail: String(error),
    };
  } finally {
    await removeScratchGitDir(l);
  }
}
//@ chunk-gjx0rh1b.js:6471-6660 placement
async function removeScratchGitDir(e) {
  let n = join(e, "objects", "pack");
  let r = await readdir(n).catch(() => []);
  await Promise.all(r.map((o) => chmod(join(n, o), 420).catch(() => {})));
  await rm(e, {
    recursive: true,
    force: true,
  }).catch(() => {});
}
//@ chunk-gjx0rh1b.js:6660-7017 placement
/**
 * 创建临时 git 目录结构（objects/pack、refs、HEAD 等），失败返回错误文本。
 */
async function createScratchGitDir(e, objectFormat) {
  try {
    await mkdir(e);
  } catch (error) {
    return String(error);
  }
  try {
    await mkdir(join(e, "objects", "pack"), {
      recursive: true,
    });
    await mkdir(join(e, "refs"));
    await writeFile(
      join(e, "HEAD"),
      `ref: refs/heads/rebuild
`,
    );
    if (objectFormat === "sha256")
      await writeFile(
        join(e, "config"),
        `[core]
	repositoryformatversion = 1
[extensions]
	objectformat = sha256
`,
      );
    return null;
  } catch (error) {
    await removeScratchGitDir(e);
    return String(error);
  }
}
//@ chunk-gjx0rh1b.js:7017-7120 placement
function gitFailureDetail(e) {
  return (
    getFirstLine(e.stderr.trim()) || (e.exitCode === undefined ? "git did not finish" : `exit ${e.code}`)
  );
}
//@ chunk-gjx0rh1b.js:7120-7397 placement
function classifyCheckoutStart(layout) {
  if (layout?.checkout === undefined) return "layout_not_read";
  if (layout.checkout === "main") return "main_checkout";
  let n = checkoutDirOfGitDir(layout.commonDir);
  let r = isPathInside(n, layout.workTree);
  if (n === layout.commonDir) return r ? "beneath_git_directory" : "outside_git_directory";
  return r ? "beneath_repository" : "outside_repository";
}
//@ chunk-gjx0rh1b.js:7397-7905 placement
function logBundleStartLocation(e) {
  switch (e) {
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
//@ chunk-gjx0rh1b.js:7905-8221 placement
/**
 * 「不要在此目录运行 git」及建议文案：新克隆或保留目录的说明。
 */
var DO_NOT_RUN_GIT_ADVICE = "Do not run git in this folder: git may act on what was put there.";
var FRESH_CLONE_HINT =
  "a fresh clone from the remote (with no remote: a new folder and git init), copy your files over by hand, but not the .git folder, then";
var KEEP_FOLDER_HINT =
  "Keep this folder: commits that you have not pushed, other branches and stashes exist only here.";
//@ chunk-gjx0rh1b.js:8440-8575 placement
var REFS_SEED_STASH = "refs/seed/stash";
var REFS_SEED_ROOT = "refs/seed/root";
var REFS_SEED = "refs/seed/";
var SEED_REF_STALE_MS = 7200000;
var MAX_BUNDLE_HEADER_LINE = 65536;
var SEED_REF_RE = /^refs\/seed\/(\d+)-[0-9a-f]{16}\/(?:stash|root)$/;
//@ chunk-gjx0rh1b.js:8575-8693 placement
function createSeedRefNames(e = Date.now()) {
  let n = `${e}-${randomBytes(8).toString("hex")}`;
  return {
    stash: `${REFS_SEED}${n}/stash`,
    root: `${REFS_SEED}${n}/root`,
  };
}
//@ chunk-gjx0rh1b.js:8693-8834 placement
function staleSeedRefs(e, n = Date.now()) {
  return e.filter((r) => {
    if (r === REFS_SEED_STASH || r === REFS_SEED_ROOT) return true;
    let match = SEED_REF_RE.exec(r);
    return match !== null && Math.abs(n - Number(match[1])) > SEED_REF_STALE_MS;
  });
}
//@ chunk-gjx0rh1b.js:8834-9048 placement
async function copyVerifiedBundle(e, n, labels, signal) {
  let s = new BundleStreamVerifier(labels);
  try {
    await pipeline(
      createReadStream(e),
      s,
      createWriteStream(n, {
        flags: "wx",
      }),
      {
        signal,
      },
    );
    return {
      ok: true,
      sizeBytes: s.outputBytes,
    };
  } catch (error) {
    if (getErrnoCode(error) !== "EEXIST") await unlink(n).catch(() => {});
    return {
      ok: false,
      error: errorMessage(error),
    };
  }
}
//@ chunk-gjx0rh1b.js:9048-10926 placement
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
  _transform(e, n, r) {
    try {
      if (this.state === "pack") this.writeOut(e);
      else {
        this.pending = this.pending.length === 0 ? e : Buffer.concat([this.pending, e]);
        this.consumeHeaderLines();
      }
      r();
    } catch (error) {
      r(toError(error));
    }
  }
  _flush(e) {
    e(this.state === "pack" ? null : Error("bundle ended before the end of its header"));
  }
  writeOut(e) {
    let n = typeof e === "string" ? Buffer.from(e, "latin1") : e;
    this.outputBytes += n.length;
    this.push(n);
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
  headerLine(e) {
    if (e.startsWith("@")) {
      if (this.version !== 3 || this.sawRef) throw Error("bundle capability line out of place");
      return e;
    }
    this.sawRef = true;
    let index = e.indexOf(" ");
    let r = index < 0 ? e : e.slice(0, index);
    if (e.startsWith("-")) {
      if (!GIT_SHA_RE.test(r.slice(1))) throw Error("malformed bundle prerequisite line");
      return e;
    }
    let o = r;
    let sliced = e.slice(index + 1);
    if (index < 0 || sliced === "" || !GIT_SHA_RE.test(o)) throw Error("malformed bundle ref line");
    let l = this.labels.get(sliced);
    if (l !== undefined) {
      if (this.applied.has(sliced)) throw Error("bundle header names a ref to relabel twice");
      this.applied.add(sliced);
      return `${o} ${l}`;
    }
    if (sliced.startsWith(REFS_SEED))
      throw Error("bundle header carries a seed ref that is not this build's");
    return e;
  }
}
//@ chunk-gjx0rh1b.js:11321-11345 placement
var GIT_DIR_NAMES = [".git", "git~1"];
//@ chunk-gjx0rh1b.js:11345-11419 placement = execTmux (1)
function isSafeRepoRelativePath(args, opts) {
  return (
    !isUnsafeRepoRelativePath(args) &&
    !(getPlatform() === "wsl" && args.includes("\\")) &&
    !hasWindowsUnsafeSegment(args, opts)
  );
}
//@ chunk-gjx0rh1b.js:11419-11533 placement
function isUnsafeRepoRelativePath(e) {
  return (
    e.includes("\x00") ||
    !isPlainRelativePath(toForwardSlashes(e)) ||
    toForwardSlashes(e)
      .split("/")
      .some((n) => GIT_DIR_NAMES.includes(foldName(n))) ||
    hasNamedForkSegment(toForwardSlashes(e))
  );
}
//@ chunk-gjx0rh1b.js:11533-11638 placement
function hasWindowsUnsafeSegment(e, opts) {
  return (
    opts &&
    e
      .replaceAll("\\", "/")
      .split("/")
      .some((r) => r.includes(":") || /[. ]$/.test(r))
  );
}
//@ chunk-gjx0rh1b.js:11638-11683 placement
var DOS_SHORT_NAME_PATTERN = /^[^~.]{1,6}~[0-9]+(?:\.[^.]{1,3})?$/;
//@ chunk-gjx0rh1b.js:11683-11827 placement = execTmux (1)
function hasDosShortNameSegment(e) {
  let platform = getPlatform();
  return (
    (platform === "windows" || platform === "wsl") &&
    e
      .replaceAll("\\", "/")
      .split("/")
      .some((r) => DOS_SHORT_NAME_PATTERN.test(firstLineOf(r, ":").replace(/[. ]+$/, "")))
  );
}
//@ chunk-gjx0rh1b.js:11827-11874 placement
async function isCaseFoldingFileSystem(e) {
  return (await detectFileSystemCaseFolding(e)) !== "no";
}
//@ chunk-gjx0rh1b.js:11874-12729 placement
async function detectFileSystemCaseFolding(e) {
  let platform = getPlatform();
  if (platform === "windows") return "yes";
  if (platform !== "wsl") return "no";
  let targetPath =
    e.split("/").includes("..") || hasBackslash(e) ? null : await realpath(e).catch(() => null);
  if (targetPath === null) return "unsure";
  let containerId = await getContainerId();
  let s = containerId === null ? null : await getContainerId();
  if (containerId === null || s === null || !containerId.equals(s)) return "unsure";
  let filtered = containerId
    .toString("utf8")
    .split(
      `
`,
    )
    .filter((line) => line !== "");
  let mounts = filtered.flatMap((w) => {
    let parts = w.split(" ");
    let index = parts.indexOf("-");
    let [E, C, , , A] = parts;
    let R = index >= 0 ? parts[index + 1] : undefined;
    if (E === undefined || C === undefined || A === undefined || R === undefined) return [];
    let joined = [parts[5], parts[index + 3]].filter(Boolean).join(",");
    return [
      {
        id: E,
        parent: C,
        point: unescapeMountField(A),
        windowsSide: isNetworkOrForeignMount({
          fstype: R,
          source: parts[index + 2],
          options: joined,
        }),
        windowsDrive: isDrvfsMount(R, joined),
      },
    ];
  });
  if (mounts.length !== filtered.length) return "unsure";
  if (mounts.some((w) => w.windowsSide && w.point !== targetPath && isAtOrUnderPath(w.point, targetPath)))
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
//@ chunk-gjx0rh1b.js:12729-13245 placement
/**
 * 根据挂载点列表判断路径所在的挂载：取包含该路径的最短挂载点，存在多个根挂载或歧义时返回 unsure。
 */
function resolveMountForPath(targetPath, mounts) {
  if (count(mounts, (u) => u.point === "/") > 1) return "unsure";
  let r = new Set(mounts.map((mount) => mount.id));
  let o = (u) => {
    let filtered = u.filter((E) => isAtOrUnderPath(targetPath, E.point));
    let min = Math.min(...filtered.map((E) => E.point.length));
    let [_, y] = filtered.filter((E) => E.point.length === min);
    return _ === undefined ? null : y === undefined ? _ : "unsure";
  };
  let s = (u, p) => {
    if (p === 0) return null;
    let w = o(mounts.filter((mount) => mount.parent === u.id && mount !== u));
    return w === null ? u : w === "unsure" ? w : s(w, p - 1);
  };
  let [l, h] = mounts.filter(
    (mount) =>
      (!r.has(mount.parent) || mount.parent === mount.id) && isAtOrUnderPath(targetPath, mount.point),
  );
  return l === undefined ? null : h !== undefined ? "unsure" : s(l, mounts.length);
}
//@ chunk-gjx0rh1b.js:13245-13308 placement
function toForwardSlashes(e) {
  return getPlatform() === "windows" ? e.replaceAll("\\", "/") : e;
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
  BUNDLE_OUTPUT_NAME,
  readBundleFileSafely,
  verifyBundleFile,
  logBundleStartLocation,
  classifyCheckoutStart,
};
