/**
 * services/artifacts/publishPaths.ts
 *
 * 2.1.316 新增：发布路径校验（受保护路径、长度上限）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-jv307fw4.js (22)
 * attribution: placement 22
 */
import { sep, normalize, isAbsolute, join, dirname, relative } from "path";
import { readlink, lstat, realpath, stat, open } from "fs/promises";
import { constants } from "fs";
import { MAX_PUBLISHED_PATH_LENGTH, se, pathTouchesProtected, JL, readExactBytes } from "./artifactUrl.js";
import { isWellFormedString } from "../../utils/stringUtils.js";
import { safeJsonQuote, contentTypeForPath, unservableFileMessage } from "./contentTypes.js";
import { isOnForeignMount } from "../../utils/networkPaths.js";
import { isENOENT } from "../../utils/errors.js";
import { env } from "../../utils/env.js";
import { getOriginalCwd } from "../../bootstrap/state.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { MAX_ARTIFACT_BYTES } from "./frameFlags.js";
import { MANIFEST_REQUEST_BUDGET, VERSION_TOTAL_BYTES } from "./publishInstanceFiles.js";

/**
 * 校验发布路径的基本格式（NFC 规范化后）：非空且不超长，无控制/格式/私用字符，不含反斜杠、?#%、: ;，不以 / 开头，无空段、./..、__proto__ 等保留名；返回 nfc 或错误消息。
 */
//@ chunk-jv307fw4.js:5349-6579 placement
function validatePublishedPath(path, label) {
  if (path.length === 0) return { errMsg: `${label} may not be empty` };
  if (path.length > MAX_PUBLISHED_PATH_LENGTH)
    return { errMsg: `${label} is longer than ${MAX_PUBLISHED_PATH_LENGTH} characters` };
  let nfc = path.normalize("NFC");
  if (/[\p{Cc}\p{Cf}\p{Co}\p{Zl}\p{Zp}]/u.test(nfc) || !isWellFormedString(nfc))
    return {
      errMsg: `${label} ${safeJsonQuote(path)} contains control, formatting, line-separator, or private-use characters, or a malformed one`,
    };
  if (nfc.includes("\\"))
    return {
      errMsg: `${label} ${safeJsonQuote(path)} contains a backslash \u2014 published paths use forward slashes on every platform`,
    };
  if (/[?#%]/.test(nfc))
    return {
      errMsg: `${label} ${safeJsonQuote(path)} contains characters that cannot appear in a served URL path ("?", "#", "%")`,
    };
  if (nfc.startsWith("/"))
    return {
      errMsg: `${label} ${safeJsonQuote(path)} is absolute \u2014 published paths are relative to the artifact root`,
    };
  let segments = nfc.split("/");
  if (segments.some((a) => a === ""))
    return { errMsg: `${label} ${safeJsonQuote(path)} has an empty path segment` };
  if (segments.some((a) => a === "." || a === ".."))
    return {
      errMsg: `${label} ${safeJsonQuote(path)} contains "." or ".." segments \u2014 pass the plain served path`,
    };
  if (segments.some((a) => a === "__proto__" || a === "constructor" || a === "prototype"))
    return {
      errMsg: `${label} ${safeJsonQuote(path)} contains a reserved name ("__proto__", "constructor", "prototype")`,
    };
  if (/[:;]/.test(nfc))
    return { errMsg: `${label} ${safeJsonQuote(path)} contains ":" or ";", which no published path may` };
  return { nfc: nfc };
}
/**
 * 校验 files 里的发布路径：通过基本格式检查，且不能是 index.html、不能以 _ 开头、不能与服务自身视图同名（删除时除外）。
 */
//@ chunk-jv307fw4.js:6579-7278 placement
function validateFilesPath(path, { removal: removal = !1 } = {}) {
  let checked = validatePublishedPath(path, "files: published path");
  if ("errMsg" in checked) return checked;
  let { nfc: nfc } = checked;
  if (nfc === "index.html")
    return {
      errMsg:
        'files: "index.html" cannot be a published path \u2014 the `html` argument is always the index. Pass that file\'s content as `html` and remove the "index.html" mapping.',
    };
  if (nfc.startsWith("_"))
    return {
      errMsg: `files: published path ${safeJsonQuote(path)} starts with "_", which the artifact service reserves for its own names \u2014 rename the file or its top-level directory`,
    };
  if (!removal && gFr(nfc))
    return {
      errMsg: `files: published path ${safeJsonQuote(path)} is a name the artifact service answers with one of its own views, so the file could never be read back \u2014 rename it`,
    };
  return { key: nfc };
}
//@ chunk-jv307fw4.js:7278-7355 placement
function gFr(e) {
  return e.startsWith("_") || e === "index.html.json" || e === ".json";
}
/**
 * 校验读取路径：规范化后不能是 artifact 服务自带的视图路径，合法时返回键名，否则返回错误消息。
 */
//@ chunk-jv307fw4.js:7355-7587 placement
function validateReadPath(e) {
  let n = validatePublishedPath(e, "path");
  if ("errMsg" in n) return n;
  let { nfc: nfc } = n;
  if (gFr(nfc))
    return {
      errMsg: `path ${safeJsonQuote(e)} names one of the artifact service's own views, not a published file; list_files shows the readable paths`,
    };
  return { key: nfc };
}
//@ chunk-jv307fw4.js:7587-7626 placement
var v2s = 1048576,
  wt = /\.(?:png|jpe?g)$/i;
/**
 * 校验缩略图 href：必须是 .png/.jpg/.jpeg 文件，合法时返回相对路径。
 */
//@ chunk-jv307fw4.js:7626-7868 placement
function validateThumbnailHref(e) {
  let n = validatePublishedPath(e, "thumbnail href");
  if ("errMsg" in n) return n;
  if (!wt.test(n.nfc))
    return {
      errMsg: `thumbnail href ${JSON.stringify(e)} is not a .png, .jpg or .jpeg file \u2014 custom thumbnails are PNG or JPEG images`,
    };
  return { rel: n.nfc };
}
//@ chunk-jv307fw4.js:7868-7948 placement
function LZe(e, n, r) {
  return e === n || e.startsWith(n + sep) || e === r || e.startsWith(r + sep);
}
/**
 * 把路径中的根前缀从旧根替换为新根（不在旧根下时原样返回）。
 */
//@ chunk-jv307fw4.js:7948-8068 placement
function remapRootPrefix(e, n, r) {
  let s = HZe(normalize(n));
  if (s === r) return e;
  if (e === s) return r;
  return e.startsWith(s + sep) ? r + e.slice(s.length) : e;
}
//@ chunk-jv307fw4.js:8068-8129 placement
function HZe(e) {
  let replaced = e.replace(/\/+$/, "");
  return replaced === "" ? e : replaced;
}
/**
 * 把用户给的路径解析为本地绝对路径：网络路径、~ 开头、越出基准目录的相对路径返回 null；绝对路径规范化；相对路径接到基准目录下。
 */
//@ chunk-jv307fw4.js:8129-8350 placement
function resolveLocalPath(e, n) {
  if (se(e)) return null;
  if (e === "~" || e.startsWith(`~${sep}`) || e.startsWith("~/")) return null;
  if (isAbsolute(e)) {
    let s = normalize(e);
    return se(s) ? null : s;
  }
  let r = normalize(e);
  if (r === ".." || r.startsWith(`..${sep}`)) return null;
  return join(n, r);
}
/**
 * 发布文件是无法安全解析的符号链接（网络目标、链接文本含 ..、或层级过多）时的错误说明。
 */
//@ chunk-jv307fw4.js:8350-8563 placement
function describeUnsafeSymlink(e) {
  return `files: ${JSON.stringify(e)} is a symlink whose chain cannot be safely resolved (network target, a \`..\` segment in link text, or too many links) \u2014 list the link's target path instead`;
}
/**
 * 沿符号链接链最多追 40 层，遇到网络目标、链接文本含 ..、链接过多或指向受保护位置时判定为不安全；不是链接时返回 false。
 */
//@ chunk-jv307fw4.js:8563-8780 placement
async function isUnsafeSymlinkChain(e) {
  let n = HZe(e);
  for (let r = 0; r < 40; r++) {
    let s;
    try {
      s = await readlink(n);
    } catch {
      return !1;
    }
    if (isOnForeignMount(s, dirname(n))) return !0;
    if (s.split(/\/+/).includes("..")) return !0;
    if (((n = HZe(isAbsolute(s) ? normalize(s) : join(dirname(n), s))), se(n))) return !0;
  }
  return !0;
}
//@ chunk-jv307fw4.js:8780-8837 placement
function At(e, n) {
  return n.some((r) => LZe(e, r.lex, r.real));
}
//@ chunk-jv307fw4.js:8837-8910 placement
function Ae(e, n) {
  return n.some((r) => e === r.real || e.startsWith(r.real + sep));
}
//@ chunk-jv307fw4.js:8910-8968 placement
function Re(e) {
  return !e.isSymbolicLink() && e.isDirectory();
}
/**
 * 计算 scratchpad 目录作为发布锚点：不存在时按原路径；是真实目录且不在网络位置时返回字面与真实路径。
 */
//@ chunk-jv307fw4.js:8968-9304 placement
async function getScratchpadAnchor(e) {
  if (e === void 0 || !isAbsolute(e)) return [];
  let n = HZe(normalize(e)),
    r;
  try {
    r = await lstat(n);
  } catch (error) {
    return isENOENT(error) ? [{ kind: "scratchpad", lex: n, real: n }] : [];
  }
  if (!Re(r) || (await isUnsafeSymlinkChain(n))) return [];
  let s = await realpath(n).catch(() => n),
    a = await lstat(n).catch(() => {
      return;
    });
  return a !== void 0 && Re(a) && a.ino === r.ino && a.dev === r.dev
    ? [{ kind: "scratchpad", lex: n, real: s }]
    : [];
}
/**
 * 为会话额外工作目录建立发布锚点（目录、非不安全链接、真实路径不是网络路径、两次 lstat 一致），评测受限模式下原样接受原始 cwd。
 */
//@ chunk-jv307fw4.js:9304-9715 placement
async function getWorkingDirAnchors(e, n) {
  let r = [];
  for (let s of e ?? []) {
    if (!isAbsolute(s) || se(s)) continue;
    let a = HZe(normalize(s));
    if (a === n.lex || a === n.real) continue;
    try {
      let l = await lstat(a);
      if (!Re(l) || (await isUnsafeSymlinkChain(a))) continue;
      if (env.CLAUDE_CODE_EVAL_CONFINED && a === getOriginalCwd()) {
        r.push({ kind: "dir", lex: a, real: a });
        continue;
      }
      let d = await realpath(a);
      if (se(d)) continue;
      let h = await lstat(a);
      if (Re(h) && h.ino === l.ino && h.dev === l.dev) r.push({ kind: "dir", lex: a, real: d });
    } catch {}
  }
  return r;
}
/**
 * 描述允许发布的锚点位置（一个或多个工作目录，及可选 scratchpad），用于错误提示。
 */
//@ chunk-jv307fw4.js:9715-10086 placement
function describeAnchorSet(e) {
  let filtered = e.filter((a) => a.kind !== "scratchpad"),
    joined = filtered.map((a) => jsonStringify(a.lex)).join(", "),
    s = e.some((a) => a.kind === "scratchpad") ? " or your scratchpad directory" : "";
  return filtered.length > 1
    ? { where: `the session's working directories (${joined})${s}`, under: "a path under one of them" }
    : {
        where: `the working directory (${joined})${s}`,
        under: s === "" ? "a path under it" : "a path under one of them",
      };
}
//@ chunk-jv307fw4.js:10086-10268 placement
function describeAnchor(e) {
  return e.kind === "scratchpad"
    ? "your scratchpad directory"
    : e.kind === "cwd"
      ? `the working directory (${jsonStringify(e.lex)})`
      : `${jsonStringify(e.lex)} (one of the session's working directories)`;
}
/**
 * 解析并校验发布根目录 root：必须位于工作目录/额外工作目录/scratchpad 之一，不能是网络路径、越界相对路径、受保护或不安全链接、被拒绝路径；真实路径须仍在同一锚点下且是目录；返回锚点、真实根与词法根。
 */
//@ chunk-jv307fw4.js:10268-11934 placement
async function resolvePublishBase(cwd, root, options) {
  let realCwd = await realpath(cwd),
    a = { kind: "cwd", lex: HZe(normalize(cwd)), real: realCwd },
    anchors = [
      a,
      ...(await getWorkingDirAnchors(options?.workingDirs, a)),
      ...(await getScratchpadAnchor(options?.scratchpadDir)),
    ],
    { where: where, under: under } = describeAnchorSet(anchors);
  if (root === void 0) return { anchors: anchors, realRoot: realCwd, lexRoot: normalize(cwd) };
  if (se(root))
    return {
      errMsg: `root: ${JSON.stringify(root)} is a network path \u2014 the publish base must lie within ${where}`,
    };
  let normalizedRoot = normalize(root);
  if (!isAbsolute(normalizedRoot) && (normalizedRoot === ".." || normalizedRoot.startsWith(`..${sep}`)))
    return {
      errMsg:
        `root: ${JSON.stringify(root)} escapes the working directory \u2014 ` +
        "a relative publish base must lie within it",
    };
  let anchor = isAbsolute(normalizedRoot)
    ? anchors.find((S) => LZe(normalizedRoot, S.lex, S.real))
    : anchors[0];
  if (anchor === void 0)
    return { errMsg: `root: ${JSON.stringify(root)} is outside ${where} \u2014 pass ${under}` };
  let absRoot = isAbsolute(normalizedRoot) ? normalizedRoot : join(realCwd, normalizedRoot),
    v = options?.denyPath?.(absRoot, !1, root);
  if (v !== void 0) return { errMsg: v };
  if (pathTouchesProtected(absRoot) || (await isUnsafeSymlinkChain(absRoot)))
    return {
      errMsg: `root: ${JSON.stringify(root)} is a symlink whose chain cannot be safely resolved (network target, a \`..\` segment in link text, or too many links) \u2014 pass the target directory itself`,
    };
  let realRoot;
  try {
    realRoot = await realpath(absRoot);
  } catch {
    return { errMsg: `root: ${JSON.stringify(root)} not found` };
  }
  if (se(realRoot))
    return {
      errMsg: `root: ${JSON.stringify(root)} resolves to a network path \u2014 the publish base must lie within ${where}`,
    };
  if (!Ae(realRoot, [anchor]))
    return {
      errMsg: Ae(realRoot, anchors)
        ? `root: ${jsonStringify(root)} is a link from ${describeAnchor(anchor)} into ${describeAnchor(anchors.find((S) => Ae(realRoot, [S])) ?? anchor)} \u2014 pass the directory it points to instead`
        : `root: ${JSON.stringify(root)} resolves outside ${where} \u2014 the publish base must lie within it`,
    };
  let k;
  try {
    k = await stat(realRoot);
  } catch {
    return { errMsg: `root: ${JSON.stringify(root)} not found` };
  }
  if (!k.isDirectory()) return { errMsg: `root: ${JSON.stringify(root)} is not a directory` };
  let W = HZe(isAbsolute(normalizedRoot) ? normalizedRoot : join(normalize(cwd), normalizedRoot));
  return { anchors: anchors, realRoot: realRoot, lexRoot: W };
}
/**
 * 解析发布文件的锚定根目录（真实路径/词法路径），校验在期望根下并给出错误。
 */
//@ chunk-jv307fw4.js:11934-16062 placement
async function resolvePublishRoot(e, n, r, s) {
  let a = await resolvePublishBase(n, r, s);
  if ("errMsg" in a) return a;
  let { anchors: anchors, realRoot: realRoot, lexRoot: lexRoot } = a,
    { where: where, under: under } = describeAnchorSet(anchors);
  if (s?.expectedRealRoot !== void 0 && s.expectedRealRoot !== realRoot)
    return {
      errMsg:
        "root: the publish base resolves to a different location than " +
        "was approved \u2014 it changed between approval and publishing; " +
        "retry the publish",
    };
  if (e.length === 0) return { errMsg: "files: the file map is empty \u2014 list at least one file" };
  if (e.length > JL)
    return {
      errMsg: `files: ${e.length} files + index.html exceeds the ${JL + 1} entries one publish may name; send at most ${JL} now and the rest in another publish to the same url`,
    };
  let P = [],
    v = new Set(),
    N = 0;
  for (let k of e) {
    let W = validateFilesPath(k.to);
    if ("errMsg" in W) return W;
    let key = W.key;
    if (v.has(key)) return { errMsg: `files: published path ${safeJsonQuote(key)} appears more than once` };
    v.add(key);
    let from = k.from;
    if (se(from))
      return {
        errMsg: `files: ${JSON.stringify(from)} is a network path \u2014 only files under ${where} can be published`,
      };
    if (from === "~" || from.startsWith(`~${sep}`) || from.startsWith("~/"))
      return {
        errMsg: `files: ${JSON.stringify(from)} \u2014 "~" is not expanded here; pass a base-relative or absolute path`,
      };
    let K = isAbsolute(from) ? void 0 : normalize(from);
    if (K !== void 0 && (K === ".." || K.startsWith(`..${sep}`)))
      return {
        errMsg:
          `files: ${JSON.stringify(from)} escapes the publish base \u2014 ` +
          `only files under ${where} can be published`,
      };
    let F = resolveLocalPath(from, realRoot);
    if (F === null) return { errMsg: `files: ${JSON.stringify(from)} cannot be resolved` };
    if (isAbsolute(from) && !At(F, anchors))
      return { errMsg: `files: ${JSON.stringify(from)} is outside ${where} \u2014 pass ${under}` };
    let E = s?.denyPath?.(F, !1, from);
    if (E !== void 0) return { errMsg: E };
    if (lexRoot !== realRoot) {
      let x = K ?? (F.startsWith(realRoot + sep) ? relative(realRoot, F) : void 0);
      if (x !== void 0) {
        let I = s?.denyPath?.(join(lexRoot, x), !0, from);
        if (I !== void 0) return { errMsg: I };
      }
    }
    if (pathTouchesProtected(F) || (await isUnsafeSymlinkChain(F)))
      return { errMsg: describeUnsafeSymlink(from) };
    let U;
    try {
      U = await realpath(F);
    } catch (error) {
      return { errMsg: `files: ${JSON.stringify(from)} not found`, ...(isENOENT(error) && { missing: !0 }) };
    }
    if (se(U))
      return {
        errMsg: `files: ${JSON.stringify(from)} resolves to a network path \u2014 only files under ${where} can be published`,
      };
    if (!Ae(U, anchors))
      return {
        errMsg: `files: ${JSON.stringify(from)} resolves outside ${where} (symlink?) \u2014 only files under it can be published`,
      };
    if (U !== F) {
      let x = s?.denyPath?.(U, !0, from);
      if (x !== void 0) return { errMsg: x };
    }
    try {
      let x = await lstat(U);
      if (x.isSymbolicLink())
        return {
          errMsg: `files: ${JSON.stringify(from)} changed to a symlink after it was checked \u2014 retry the publish`,
        };
      if (!x.isFile()) return { errMsg: `files: ${JSON.stringify(from)} is not a regular file` };
    } catch (error) {
      return { errMsg: `files: ${JSON.stringify(from)} not found`, ...(isENOENT(error) && { missing: !0 }) };
    }
    let A;
    try {
      A = await open(U, constants.O_RDONLY | (constants.O_NOFOLLOW | constants.O_NONBLOCK));
    } catch (error) {
      if (error?.code === "ELOOP")
        return {
          errMsg: `files: ${JSON.stringify(from)} changed to a symlink after it was checked \u2014 retry the publish`,
        };
      return { errMsg: `files: ${JSON.stringify(from)} not found`, ...(isENOENT(error) && { missing: !0 }) };
    }
    let j, H;
    try {
      try {
        if ((await lstat(U)).isSymbolicLink())
          return {
            errMsg: `files: ${JSON.stringify(from)} changed to a symlink after it was checked \u2014 retry the publish`,
          };
      } catch (error) {
        return {
          errMsg: `files: ${JSON.stringify(from)} not found`,
          ...(isENOENT(error) && { missing: !0 }),
        };
      }
      let stats = await A.stat();
      if (!stats.isFile()) return { errMsg: `files: ${JSON.stringify(from)} is not a regular file` };
      if ((env.CLAUDE_CODE_EVAL_CONFINED || s?.refuseHardLinks === !0) && stats.nlink > 1)
        return { errMsg: `files: ${JSON.stringify(from)} has more than one hard link` };
      if (stats.size > MAX_ARTIFACT_BYTES)
        return {
          errMsg: `files: ${JSON.stringify(from)} is ${Math.ceil(stats.size / 1024 / 1024)}MB (per-file max ${MAX_ARTIFACT_BYTES / 1024 / 1024}MB)`,
          tooLarge: !0,
        };
      if (((N += stats.size), N > MANIFEST_REQUEST_BUDGET))
        return {
          errMsg: `files: total content exceeds ${MANIFEST_REQUEST_BUDGET / 1024 / 1024}MB at ${JSON.stringify(from)} \u2014 the most one publish sends; publish the files up to it now and the rest in another publish to the same url (a version may total ${VERSION_TOTAL_BYTES / 1024 / 1024}MB)`,
        };
      if (((H = k.contentType ?? contentTypeForPath(key)), H === void 0))
        return { errMsg: unservableFileMessage("files", key), notServedPath: key };
      try {
        let I = await readExactBytes(A, stats.size);
        if (I === null)
          return {
            errMsg: `files: ${JSON.stringify(from)} changed while it was read \u2014 retry the publish`,
          };
        j = I;
      } catch {
        return { errMsg: `files: ${JSON.stringify(from)} could not be read` };
      }
      P.push({
        path: key,
        content: j,
        contentType: H,
        ...(k.live !== void 0 && { live: k.live }),
        ...(k.reseed === !0 && { reseed: !0 }),
      });
    } finally {
      await A.close();
    }
  }
  return { files: P };
}
/**
 * 按发布根规则读取缩略图文件（png/jpg），返回其内容或带缺失/过大标志的错误。
 */
//@ chunk-jv307fw4.js:16062-16408 placement
async function readThumbnailFile(e, n, r, s) {
  let a = /\.png$/i.test(n) ? ".png" : ".jpg",
    l = await resolvePublishRoot([{ to: `thumbnail${a}`, from: n }], r, void 0, s);
  if ("errMsg" in l)
    return {
      errMsg: `thumbnail ${JSON.stringify(e)}: ${l.errMsg.replace(/^files: /, "")}`,
      missing: l.missing === !0,
      tooLarge: l.tooLarge === !0,
    };
  let content = l.files[0].content;
  return { content: typeof content === "string" ? Buffer.from(content) : content };
}

export {
  HZe,
  isUnsafeSymlinkChain,
  getWorkingDirAnchors,
  validateThumbnailHref,
  LZe,
  v2s,
  readThumbnailFile,
  gFr,
  validateReadPath,
  remapRootPrefix,
  validateFilesPath,
  resolveLocalPath,
  describeUnsafeSymlink,
  resolvePublishRoot,
};
