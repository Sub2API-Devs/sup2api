/**
 * tools/ArtifactTool/readFilePaths.ts
 *
 * 2.1.316 新增。Artifact 读取文件路径校验。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-zad29gky.js (12)
 * attribution: placement 12
 */
import { sep, join, normalize } from "path";
import { unlink } from "fs/promises";
import { getPlatform } from "../../utils/platform.js";
import { isReservedDeviceName } from "../../utils/windowsProfileFolders.js";
import { safeJsonQuote } from "../../services/artifacts/contentTypes.js";
import { readUntrustedArray, Uf } from "../../utils/untrustedArray.js";
import { validateReadPath } from "../../services/artifacts/publishPaths.js";
import { parseArtifactUrl } from "./constants.js";
import { getCwd } from "../../utils/cwd.js";
import { expandPath } from "../../utils/path.js";
import {
  isScratchpadEnabled,
  getScratchpadDir,
  normalizeCaseForComparison,
  isScratchpadPath,
} from "../../utils/permissions/filesystem.js";
import { Rue } from "../../services/artifacts/artifactUrl.js";
import { retryFsOp } from "../../utils/atomicPublishWrite.js";
import { getErrnoCode } from "../../utils/errors.js";
import { AI } from "../../utils/plugins/safeCopy.js";

/**
 * 检查路径在 Windows 上是否不能作文件名（保留设备名、结尾点或空格、< > " | *），以及 Windows/WSL 上的 8.3 短名别名（NAME~1）。
 */
//@ chunk-zad29gky.js:693-1114 placement
function windowsPathProblem(n) {
  let parts = n.split("/"),
    r = getPlatform();
  if (r === "windows" && parts.some((e) => /[<>"|*]/.test(e) || isReservedDeviceName(e) || /[. ]$/.test(e)))
    return `path ${safeJsonQuote(n)} cannot be a file name on Windows (reserved device name, trailing dot or space, or one of < > " | *)`;
  if ((r === "windows" || r === "wsl") && parts.some((e) => /~\d/.test(e)))
    return `path ${safeJsonQuote(n)} carries a NAME~1 short-name alias, which a Windows filesystem resolves to a differently named entry`;
  return;
}
/**
 * 读取 read_file 输入中的 path、paths（只保留字符串）与 out_dir。
 */
//@ chunk-zad29gky.js:1114-1323 placement
function readFilePathArgs(n) {
  let t = n,
    r = (i) => {
      let o = t[i];
      return typeof o === "string" ? o : void 0;
    },
    e = readUntrustedArray(t.paths),
    s = e === void 0 ? void 0 : e === Uf ? [] : e.filter((i) => typeof i === "string");
  return { path: r("path"), paths: s, outDir: r("out_dir") };
}
//@ chunk-zad29gky.js:1323-2368 placement
function resolveReadFileOutput(n, { outDirJudged: t = !1 } = {}) {
  let { path: path, outDir: outDir } = readFilePathArgs(n);
  if (path === void 0)
    return { reason: "read_file requires `path` \u2014 a published path from a list_files result" };
  let s = validateReadPath(path);
  if ("errMsg" in s) return { reason: s.errMsg };
  let parts = s.key.split("/"),
    o = windowsPathProblem(s.key);
  if (o !== void 0) return { reason: o };
  let d = getPlatform(),
    a = d === "windows" || d === "wsl",
    l,
    f = !1;
  try {
    if (outDir === void 0 || outDir === "") {
      let { url: url } = n,
        c = typeof url === "string" ? parseArtifactUrl(url) : null,
        p = c !== null ? C9(c.slug) : null;
      ((f = p !== null), (l = p ?? getCwd()));
    } else l = expandPath(outDir);
  } catch {
    return { reason: "out_dir cannot be resolved to a local directory" };
  }
  if (!t && d === "windows" && l.split(sep).some((u) => u !== "" && /[. ]$/.test(u)))
    return {
      reason: `${outDir === void 0 || outDir === "" ? "the default save directory" : `out_dir ${safeJsonQuote(outDir)}`} has a name ending in a dot or space, which Windows would save under a different name`,
    };
  if (!t && a && outDir !== void 0 && outDir.split(/[\\/]/).some((u) => /~\d/.test(u)))
    return {
      reason: `out_dir ${safeJsonQuote(outDir)} names a directory by a NAME~1 short-name alias, which a Windows filesystem resolves to a differently named directory`,
    };
  return { dest: join(l, ...parts), base: l, ...(f && { defaultDir: !0 }) };
}
//@ chunk-zad29gky.js:2368-2386 placement
var weakMap = new WeakMap();
/**
 * 带缓存的 read_file 路径校验：以 paths 对象为键，url、out_dir、是否已判定、cwd 与草稿目录组成的串一致时复用上次结果。
 */
//@ chunk-zad29gky.js:2386-2739 placement
function validateReadFilePathsCached(n, t = {}) {
  let r = n,
    { paths: paths, url: url, out_dir: out_dir } = r,
    o = typeof paths === "object" && paths !== null ? paths : void 0,
    joined = [
      typeof url === "string" ? url : "",
      typeof out_dir === "string" ? out_dir : "",
      t.outDirJudged === !0 ? "judged" : "",
      getCwd(),
      (isScratchpadEnabled() ? getScratchpadDir() : null) ?? "",
    ].join("\x00"),
    a = o === void 0 ? void 0 : weakMap.get(o);
  if (a !== void 0 && a.key === joined) return a.value;
  let l = validateReadFilePaths(n, t);
  if (o !== void 0) weakMap.set(o, { key: joined, value: l });
  return l;
}
//@ chunk-zad29gky.js:2739-3552 placement
function validateReadFilePaths(n, t) {
  let { paths: paths } = readFilePathArgs(n);
  if (paths === void 0 || paths.length === 0)
    return { reason: "read_file requires `path`, or `paths` naming at least one published path" };
  if (paths.length > Rue)
    return { reason: `\`paths\` names ${paths.length} paths; at most ${Rue} can be read in one call` };
  let e = { ...n };
  delete e.paths;
  let s,
    i = [],
    o = new Map();
  for (let d of paths) {
    let a = resolveReadFileOutput({ ...e, path: d }, t);
    if ("reason" in a) return a;
    let l = validateReadPath(d),
      f = "key" in l ? l.key : d,
      u = normalizeCaseForComparison(normalize(a.dest).normalize("NFC").toUpperCase().toLowerCase()),
      c = o.get(u);
    if (c !== void 0)
      return {
        reason:
          c === f
            ? `\`paths\` names ${safeJsonQuote(d)} more than once`
            : `\`paths\` names ${safeJsonQuote(c)} and ${safeJsonQuote(d)}, which could save to the same file on a case-insensitive volume; read one of them on its own`,
      };
    (o.set(u, f),
      (s ??= { base: a.base, ...(a.defaultDir && { defaultDir: a.defaultDir }) }),
      i.push({ path: f, dest: a.dest }));
  }
  return { ...s, files: i };
}
//@ chunk-zad29gky.js:3552-3577 placement
var ARTIFACT_FILES = "artifact-files";
//@ chunk-zad29gky.js:3577-3645 placement
function C9(n) {
  let t = isScratchpadEnabled() ? getScratchpadDir() : null;
  return t === null ? null : join(t, ARTIFACT_FILES, n);
}
//@ chunk-zad29gky.js:3645-3726 placement
function Yce(n) {
  return n.length > 0 && n.every((t) => t.length > 0 && t.every((r) => isScratchpadPath(r)));
}
//@ chunk-zad29gky.js:3726-3809 placement
function LQe(n) {
  let t = isScratchpadEnabled() ? getScratchpadDir() : null;
  return (
    t !== null && normalizeCaseForComparison(normalize(n)).startsWith(normalizeCaseForComparison(t) + sep)
  );
}
//@ chunk-zad29gky.js:3809-4028 placement
class PartialKeptError extends Error {
  partial;
  renameError;
  removedEarlier;
  constructor(n, t, r) {
    super("the staged file could not be moved into place");
    this.partial = n;
    this.renameError = t;
    this.removedEarlier = r;
    this.name = "PartialKeptError";
  }
}
/**
 * 重命名文件，目标已存在导致失败时先删除目标再重试；第二次失败抛出"已部分保留"错误。
 */
//@ chunk-zad29gky.js:4028-4252 placement
async function renameReplacing(n, t, r) {
  let e = !0;
  try {
    await retryFsOp(n, t, r);
    return;
  } catch (error) {
    let i = getErrnoCode(error);
    if (i === void 0 || !AI.has(i)) throw error;
    await unlink(t).catch((o) => {
      if (getErrnoCode(o) !== "ENOENT") throw error;
      e = !1;
    });
  }
  try {
    await retryFsOp(n, t, r);
  } catch (error) {
    throw new PartialKeptError(n, error, e);
  }
}

export {
  Yce,
  renameReplacing,
  PartialKeptError,
  resolveReadFileOutput,
  C9,
  LQe,
  readFilePathArgs,
  validateReadFilePathsCached,
  ARTIFACT_FILES,
};
