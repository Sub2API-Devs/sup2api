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
  mkdtemp as mkdtemp_2,
  mkdtemp as mkdtemp_3,
  rm,
  rm as rm_2,
  rm as rm_3,
  rm as rm_4,
  rm as rm_5,
  open,
  open as open_2,
  open as open_3,
  open as open_4,
  open as open_5,
  open as open_6,
  open as open_7,
  readFile,
  readFile as readFile_2,
  stat,
  stat as stat_2,
  stat as stat_3,
  readdir,
  readdir as readdir_2,
  readdir as readdir_3,
  chmod,
  mkdir,
  mkdir as mkdir_2,
  mkdir as mkdir_3,
  mkdir as mkdir_4,
  writeFile,
  writeFile as writeFile_2,
  writeFile as writeFile_3,
  unlink,
  unlink as unlink_2,
  unlink as unlink_3,
  unlink as unlink_4,
  realpath,
  realpath as realpath_2,
} from "fs/promises";
import {
  join,
  join as join_2,
  join as join_3,
  join as join_4,
  join as join_5,
  join as join_6,
  join as join_7,
} from "path";
import { randomBytes, randomBytes as randomBytes_2, randomBytes as randomBytes_3 } from "crypto";
import { pipeline } from "stream/promises";
import { createReadStream, createWriteStream } from "fs";
import { Transform } from "stream";
import { tmpdir } from "../tempDir.js";
import { $c } from "../platformTargets.js";
import { uniq, count } from "../collections.js";
import { txe } from "../git/builderGit/gitRun.js";
import { getFirstLine, firstLineOf } from "../stringUtils.js";
import { Cvt } from "../git/builderGit/sandboxReach.js";
import { isPathInside } from "../permissions/protectedEnvAndGitPaths.js";
import { logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { getErrnoCode, errorMessage, toError } from "../errors.js";
import { vSe } from "../../remote/tools/servedOwnerSettings.js";
import { getPlatform } from "../platform.js";
import { isPlainRelativePath, hasNamedForkSegment } from "./seedPaths.js";
import { foldName } from "../permissions/protectedDirNames.js";
import { rc } from "../pathClassification.js";
import { getContainerId } from "../../services/internalLogging.js";
import { Mst, isNetworkOrForeignMount, Aui, q4t } from "../wslMounts.js";

//@ chunk-gjx0rh1b.js:1961-2111 placement
async function BUNDLE_OUTPUT_NAME(e, n = tmpdir(), r = "out.bundle") {
  let o = await mkdtemp(join_2(n, `${e}-`));
  return { path: join_2(o, r), dispose: () => rm(o, { recursive: !0, force: !0 }).catch(() => {}) };
}
/**
 * 读取生成的 bundle 文件（单一普通文件、大小上限、读取中变化检测）。
 */
//@ chunk-gjx0rh1b.js:2111-2669 placement
async function readBundleFileSafely(e, n) {
  let r;
  try {
    r = await open_2(e, $c());
  } catch (error) {
    return { kind: "unreadable", detail: String(error) };
  }
  try {
    let stats = await r.stat();
    if (!stats.isFile() || stats.nlink !== 1)
      return { kind: "unreadable", detail: "not a single regular file" };
    if (stats.size > n) return { kind: "too_large", sizeBytes: stats.size };
    let alloc = Buffer.alloc(stats.size),
      l = 0;
    while (l < stats.size) {
      let { bytesRead: bytesRead } = await r.read(alloc, l, stats.size - l, l);
      if (bytesRead === 0) break;
      l += bytesRead;
    }
    return l === stats.size
      ? { kind: "read", content: alloc }
      : { kind: "unreadable", detail: "changed while being read" };
  } catch (error) {
    return { kind: "unreadable", detail: String(error) };
  } finally {
    await r.close();
  }
}
/**
 * git bundle v2/v3 头及 sha1/sha256 对象格式签名。
 */
//@ chunk-gjx0rh1b.js:2823-3557 placement
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
  ]),
  Jo = { sha1: /^([0-9a-f]{40}) ([^\0-\x20\x7f]+)$/, sha256: /^([0-9a-f]{64}) ([^\0-\x20\x7f]+)$/ },
  Zo =
    /unable to read [0-9a-f]{40}|missing (?:blob|tree|commit|tag) object|bad (?:tree )?object [0-9a-f]{40}|[Cc]ould not read [0-9a-f]{40}|Failed to traverse parents|bogus commit object|too-short tree (?:object|file)|malformed mode in tree entry|empty filename in tree entry|[Oo]bject [0-9a-f]{40,64} (?:is a \w+, )?not a (?:tree|commit|blob|tag)|mode, but is not a (?:tree|blob)|exceeded maximum allowed tree depth/,
  Qo = /^(?:error|fatal):/m,
  buffer = Buffer.from("PACK\x00\x00\x00\x02", "latin1"),
  ts = buffer.length;
//@ chunk-gjx0rh1b.js:3557-3757 placement
var EMPTY_TREE_IDS = {
    sha1: "4b825dc642cb6eb9a060e54bf8d69288fbee4904",
    sha256: "6ef19b41225c5369f1c104d45d8d85efa9b057b53b14b4b9b939dd74decc5321",
  },
  buffer_2 = Buffer.from("\xFFtOc\x00\x00\x00\x02", "latin1"),
  sn = buffer_2.length + 1024;
/**
 * 解析 bundle 文件头：识别 v2/v3 签名、能力行与引用列表。
 */
//@ chunk-gjx0rh1b.js:3757-4178 placement
function parseBundleHeader(e) {
  let index = e.indexOf(`

`),
    parts = e.toString("latin1", 0, Math.max(index, 0)).split(`
`),
    index_2 = parts.findIndex((h, u) => u > 0 && !h.startsWith("@")),
    s = BUNDLE_HEADER_SIGNATURES.get(
      parts.slice(0, index_2).join(`
`),
    );
  if (index_2 < 0 || s === void 0) return null;
  let flattened = parts.slice(index_2).flatMap((h) => {
    let [, u, p] = Jo[s].exec(h) ?? [];
    return u === void 0 || p === void 0 ? [] : [{ id: u, name: p }];
  });
  return flattened.length === parts.length - index_2 &&
    uniq(flattened.map((h) => h.name)).length === flattened.length
    ? { objectFormat: s, refs: flattened, packOffset: index + 2 }
    : null;
}
/**
 * 在 pack 索引文件中查找指定对象 id（按扇出表二分范围比较）。
 */
//@ chunk-gjx0rh1b.js:4178-4551 placement
async function packIndexHasObject(e, n) {
  let r = await readFile(e).catch(() => null);
  if (r === null || r.length < sn || !r.subarray(0, buffer_2.length).equals(buffer_2)) return null;
  let buffer = Buffer.from(n, "hex"),
    s = (u) => (u < 0 ? 0 : r.readUInt32BE(buffer_2.length + u * 4)),
    [l, h] = [s(buffer[0] - 1), s(buffer[0])];
  if (sn + h * buffer.length > r.length) return null;
  return Array.from({ length: h - l }, (u, p) => l + p).some((u) =>
    r.subarray(sn + u * buffer.length, sn + (u + 1) * buffer.length).equals(buffer),
  );
}
/**
 * 构造只使用临时 git 目录的环境变量，禁用替代对象库、懒抓取与替换对象。
 */
//@ chunk-gjx0rh1b.js:4551-5014 placement
function isolatedGitDirEnv(e) {
  return {
    GIT_DIR: e,
    GIT_COMMON_DIR: e,
    GIT_WORK_TREE: e,
    GIT_OBJECT_DIRECTORY: join_3(e, "objects"),
    GIT_ALTERNATE_OBJECT_DIRECTORIES: "",
    GIT_NO_LAZY_FETCH: "1",
    GIT_GRAFT_FILE: join_3(e, "info", "grafts"),
    GIT_SHALLOW_FILE: join_3(e, "shallow"),
    GIT_NO_REPLACE_OBJECTS: "1",
    GIT_CONFIG_NOSYSTEM: "1",
    GIT_CONFIG_GLOBAL: join_3(e, "no-global-config"),
    GIT_CONFIG_COUNT: "0",
    GIT_CONFIG_PARAMETERS: "",
    GIT_ATTR_NOSYSTEM: "1",
    XDG_CONFIG_HOME: e,
    GIT_TEST_PACK_PATH_WALK: "0",
    LC_ALL: "C",
    LANGUAGE: "C",
  };
}
/**
 * 校验 bundle 是完整的（头、引用、pack 尾部），返回问题描述。
 */
//@ chunk-gjx0rh1b.js:5014-6471 placement
async function verifyBundleFile(e, { scratchRoot: scratchRoot }, r) {
  let o = parseBundleHeader(e);
  if (o === null) return { ok: !1, kind: "header", detail: "not a whole bundle" };
  let chunk = e.subarray(o.packOffset),
    l = join_3(scratchRoot, "check"),
    h = await createScratchGitDir(l, o.objectFormat);
  if (h !== null) return { ok: !1, kind: "scratch", detail: h };
  try {
    let u = isolatedGitDirEnv(l),
      p = await r(["-C", l, "index-pack", "--index-version=2", "--stdin"], { env: u, input: chunk });
    if (p.code !== 0)
      return { ok: !1, kind: p.exitCode === void 0 ? "unfinished" : "index", detail: gitFailureDetail(p) };
    let [, w] = /^pack\t([0-9a-f]+)$/m.exec(p.stdout) ?? [],
      _ = join_3(l, "objects", "pack", `pack-${w}`),
      y = await stat_2(`${_}.pack`).catch(() => null);
    if (y === null) return { ok: !1, kind: "index", detail: "no indexed pack to read" };
    if (y.size !== chunk.length)
      return { ok: !1, kind: "trailing", detail: `${chunk.length - y.size} bytes follow the pack` };
    let E = EMPTY_TREE_IDS[o.objectFormat],
      C = await packIndexHasObject(`${_}.idx`, E);
    if (C === null) return { ok: !1, kind: "index", detail: "no pack index to read" };
    let A = await r(["-C", l, "rev-list", "--objects", "--count", "--stdin"], {
      env: u,
      input: `${[...uniq(o.refs.map((ref) => ref.id)), `^${E}`].join(`
`)}
`,
    });
    if (A.code !== 0 || Qo.test(txe(A)))
      return {
        ok: !1,
        kind: A.exitCode === void 0 ? "unfinished" : Zo.test(txe(A)) ? "objects" : "walk",
        detail: gitFailureDetail(A),
      };
    let R = chunk.readUInt32BE(ts) - (C ? 1 : 0),
      trimmed = A.stdout.trim();
    if (!/^\d+$/.test(trimmed)) return { ok: !1, kind: "walk", detail: "git printed no object count" };
    return trimmed === String(R)
      ? { ok: !0 }
      : {
          ok: !1,
          kind: "unlisted",
          detail: `${R} objects packed, its refs lead to ${trimmed}, the empty tree not counted`,
        };
  } catch (error) {
    return { ok: !1, kind: "unfinished", detail: String(error) };
  } finally {
    await removeScratchGitDir(l);
  }
}
//@ chunk-gjx0rh1b.js:6471-6660 placement
async function removeScratchGitDir(e) {
  let n = join_3(e, "objects", "pack"),
    r = await readdir(n).catch(() => []);
  (await Promise.all(r.map((o) => chmod(join_3(n, o), 420).catch(() => {}))),
    await rm_2(e, { recursive: !0, force: !0 }).catch(() => {}));
}
/**
 * 创建临时 git 目录结构（objects/pack、refs、HEAD 等），失败返回错误文本。
 */
//@ chunk-gjx0rh1b.js:6660-7017 placement
async function createScratchGitDir(e, n) {
  try {
    await mkdir(e);
  } catch (error) {
    return String(error);
  }
  try {
    if (
      (await mkdir(join_3(e, "objects", "pack"), { recursive: !0 }),
      await mkdir(join_3(e, "refs")),
      await writeFile(
        join_3(e, "HEAD"),
        `ref: refs/heads/rebuild
`,
      ),
      n === "sha256")
    )
      await writeFile(
        join_3(e, "config"),
        `[core]
	repositoryformatversion = 1
[extensions]
	objectformat = sha256
`,
      );
    return null;
  } catch (error) {
    return (await removeScratchGitDir(e), String(error));
  }
}
//@ chunk-gjx0rh1b.js:7017-7120 placement
function gitFailureDetail(e) {
  return getFirstLine(e.stderr.trim()) || (e.exitCode === void 0 ? "git did not finish" : `exit ${e.code}`);
}
//@ chunk-gjx0rh1b.js:7120-7397 placement
function classifyCheckoutStart(e) {
  if (e?.checkout === void 0) return "layout_not_read";
  if (e.checkout === "main") return "main_checkout";
  let n = Cvt(e.commonDir),
    r = isPathInside(n, e.workTree);
  if (n === e.commonDir) return r ? "beneath_git_directory" : "outside_git_directory";
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
/**
 * 检出被动过时"不要在此目录运行 git、改用新克隆"的建议文本。
 */
//@ chunk-gjx0rh1b.js:7905-8221 placement
var DO_NOT_RUN_GIT_ADVICE = "Do not run git in this folder: git may act on what was put there.",
  ni =
    "a fresh clone from the remote (with no remote: a new folder and git init), copy your files over by hand, but not the .git folder, then",
  ri = "Keep this folder: commits that you have not pushed, other branches and stashes exist only here.";
//@ chunk-gjx0rh1b.js:8440-8575 placement
var REFS_SEED_STASH = "refs/seed/stash",
  REFS_SEED_ROOT = "refs/seed/root",
  REFS_SEED = "refs/seed/",
  hs = 7200000,
  gs = 65536,
  ms = /^refs\/seed\/(\d+)-[0-9a-f]{16}\/(?:stash|root)$/;
//@ chunk-gjx0rh1b.js:8575-8693 placement
function createSeedRefNames(e = Date.now()) {
  let n = `${e}-${randomBytes(8).toString("hex")}`;
  return { stash: `${REFS_SEED}${n}/stash`, root: `${REFS_SEED}${n}/root` };
}
//@ chunk-gjx0rh1b.js:8693-8834 placement
function staleSeedRefs(e, n = Date.now()) {
  return e.filter((r) => {
    if (r === REFS_SEED_STASH || r === REFS_SEED_ROOT) return !0;
    let match = ms.exec(r);
    return match !== null && Math.abs(n - Number(match[1])) > hs;
  });
}
//@ chunk-gjx0rh1b.js:8834-9048 placement
async function copyVerifiedBundle(e, n, r, o) {
  let s = new BundleStreamVerifier(r);
  try {
    return (
      await pipeline(createReadStream(e), s, createWriteStream(n, { flags: "wx" }), { signal: o }),
      { ok: !0, sizeBytes: s.outputBytes }
    );
  } catch (error) {
    if (getErrnoCode(error) !== "EEXIST") await unlink_2(n).catch(() => {});
    return { ok: !1, error: errorMessage(error) };
  }
}
/**
 * 流式解析 bundle：签名、引用行、pack 头，统计输出字节。
 */
//@ chunk-gjx0rh1b.js:9048-10926 placement
class BundleStreamVerifier extends Transform {
  labels;
  outputBytes = 0;
  state = "signature";
  version = 2;
  sawRef = !1;
  pending = Buffer.alloc(0);
  applied = new Set();
  constructor(e) {
    super();
    this.labels = e;
  }
  _transform(e, n, r) {
    try {
      if (this.state === "pack") this.writeOut(e);
      else
        ((this.pending = this.pending.length === 0 ? e : Buffer.concat([this.pending, e])),
          this.consumeHeaderLines());
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
    ((this.outputBytes += n.length), this.push(n));
  }
  consumeHeaderLines() {
    for (;;) {
      let index = this.pending.indexOf(10);
      if (index < 0) {
        if (this.pending.length > gs) throw Error("bundle header line too long");
        return;
      }
      let str = this.pending.toString("latin1", 0, index);
      if (((this.pending = this.pending.subarray(index + 1)), this.state === "signature")) {
        if (str === "# v2 git bundle") this.version = 2;
        else if (str === "# v3 git bundle") this.version = 3;
        else throw Error("not a v2 or v3 git bundle");
        ((this.state = "header"),
          this.writeOut(`${str}
`));
        continue;
      }
      if (str === "") {
        if (this.applied.size !== this.labels.size)
          throw Error("bundle header does not name every ref to relabel");
        ((this.state = "pack"),
          this.writeOut(`
`),
          this.writeOut(this.pending),
          (this.pending = Buffer.alloc(0)));
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
    this.sawRef = !0;
    let index = e.indexOf(" "),
      r = index < 0 ? e : e.slice(0, index);
    if (e.startsWith("-")) {
      if (!vSe.test(r.slice(1))) throw Error("malformed bundle prerequisite line");
      return e;
    }
    let o = r,
      sliced = e.slice(index + 1);
    if (index < 0 || sliced === "" || !vSe.test(o)) throw Error("malformed bundle ref line");
    let l = this.labels.get(sliced);
    if (l !== void 0) {
      if (this.applied.has(sliced)) throw Error("bundle header names a ref to relabel twice");
      return (this.applied.add(sliced), `${o} ${l}`);
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
    !isPlainRelativePath(Yn(e)) ||
    Yn(e)
      .split("/")
      .some((n) => GIT_DIR_NAMES.includes(foldName(n))) ||
    hasNamedForkSegment(Yn(e))
  );
}
//@ chunk-gjx0rh1b.js:11533-11638 placement
function hasWindowsUnsafeSegment(e, n) {
  return (
    n &&
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
  let n = getPlatform();
  return (
    (n === "windows" || n === "wsl") &&
    e
      .replaceAll("\\", "/")
      .split("/")
      .some((r) => DOS_SHORT_NAME_PATTERN.test(firstLineOf(r, ":").replace(/[. ]+$/, "")))
  );
}
//@ chunk-gjx0rh1b.js:11827-11874 placement
async function Ft(e) {
  return (await detectFileSystemCaseFolding(e)) !== "no";
}
//@ chunk-gjx0rh1b.js:11874-12729 placement
async function detectFileSystemCaseFolding(e) {
  let n = getPlatform();
  if (n === "windows") return "yes";
  if (n !== "wsl") return "no";
  let r = e.split("/").includes("..") || rc(e) ? null : await realpath_2(e).catch(() => null);
  if (r === null) return "unsure";
  let o = await getContainerId(),
    s = o === null ? null : await getContainerId();
  if (o === null || s === null || !o.equals(s)) return "unsure";
  let filtered = o
      .toString("utf8")
      .split(
        `
`,
      )
      .filter((w) => w !== ""),
    flattened = filtered.flatMap((w) => {
      let parts = w.split(" "),
        index = parts.indexOf("-"),
        [E, C, , , A] = parts,
        R = index >= 0 ? parts[index + 1] : void 0;
      if (E === void 0 || C === void 0 || A === void 0 || R === void 0) return [];
      let joined = [parts[5], parts[index + 3]].filter(Boolean).join(",");
      return [
        {
          id: E,
          parent: C,
          point: Mst(A),
          windowsSide: isNetworkOrForeignMount({ fstype: R, source: parts[index + 2], options: joined }),
          windowsDrive: Aui(R, joined),
        },
      ];
    });
  if (flattened.length !== filtered.length) return "unsure";
  if (flattened.some((w) => w.windowsSide && w.point !== r && q4t(w.point, r))) return "unsure";
  let p = resolveMountForPath(r, flattened);
  return p === null || p === "unsure" ? "unsure" : p.windowsDrive ? "yes" : p.windowsSide ? "unsure" : "no";
}
/**
 * 根据挂载点列表判断路径所在的挂载：取包含该路径的最短挂载点，存在多个根挂载或歧义时返回 unsure。
 */
//@ chunk-gjx0rh1b.js:12729-13245 placement
function resolveMountForPath(targetPath, mounts) {
  if (count(mounts, (u) => u.point === "/") > 1) return "unsure";
  let r = new Set(mounts.map((u) => u.id)),
    o = (u) => {
      let filtered = u.filter((E) => q4t(targetPath, E.point)),
        min = Math.min(...filtered.map((E) => E.point.length)),
        [_, y] = filtered.filter((E) => E.point.length === min);
      return _ === void 0 ? null : y === void 0 ? _ : "unsure";
    },
    s = (u, p) => {
      if (p === 0) return null;
      let w = o(mounts.filter((_) => _.parent === u.id && _ !== u));
      return w === null ? u : w === "unsure" ? w : s(w, p - 1);
    },
    [l, h] = mounts.filter((u) => (!r.has(u.parent) || u.parent === u.id) && q4t(targetPath, u.point));
  return l === void 0 ? null : h !== void 0 ? "unsure" : s(l, mounts.length);
}
//@ chunk-gjx0rh1b.js:13245-13308 placement
function Yn(e) {
  return getPlatform() === "windows" ? e.replaceAll("\\", "/") : e;
}

export {
  isSafeRepoRelativePath,
  Ft,
  hasDosShortNameSegment,
  REFS_SEED_STASH,
  REFS_SEED_ROOT,
  copyVerifiedBundle,
  ni,
  ri,
  DO_NOT_RUN_GIT_ADVICE,
  createSeedRefNames,
  staleSeedRefs,
  BUNDLE_OUTPUT_NAME,
  readBundleFileSafely,
  verifyBundleFile,
  logBundleStartLocation,
  classifyCheckoutStart,
};
