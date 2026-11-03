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
import {
  MAX_PUBLISHED_PATH_LENGTH,
  classifyArtifactUrl,
  pathTouchesProtected,
  MAX_URL_SEGMENT_CHARS,
  readExactBytes,
} from "./artifactUrl.js";
import { isWellFormedString } from "../../utils/stringUtils.js";
import { safeJsonQuote, contentTypeForPath, unservableFileMessage } from "./contentTypes.js";
import { isOnForeignMount } from "../../utils/networkPaths.js";
import { isENOENT } from "../../utils/errors.js";
import { env } from "../../utils/env.js";
import { getOriginalCwd } from "../../bootstrap/state.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { MAX_ARTIFACT_BYTES } from "./frameFlags.js";
import { MANIFEST_REQUEST_BUDGET, VERSION_TOTAL_BYTES } from "./publishInstanceFiles.js";

//@ chunk-jv307fw4.js:5349-6579 placement
/**
 * 校验发布路径的基本格式（NFC 规范化后）：非空且不超长，无控制/格式/私用字符，不含反斜杠、?#%、: ;，不以 / 开头，无空段、./..、__proto__ 等保留名；返回 nfc 或错误消息。
 */
function validatePublishedPath(path, label) {
  if (path.length === 0)
    return {
      errMsg: `${label} may not be empty`,
    };
  if (path.length > MAX_PUBLISHED_PATH_LENGTH)
    return {
      errMsg: `${label} is longer than ${MAX_PUBLISHED_PATH_LENGTH} characters`,
    };
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
  if (segments.some((segment) => segment === ""))
    return {
      errMsg: `${label} ${safeJsonQuote(path)} has an empty path segment`,
    };
  if (segments.some((segment) => segment === "." || segment === ".."))
    return {
      errMsg: `${label} ${safeJsonQuote(path)} contains "." or ".." segments \u2014 pass the plain served path`,
    };
  if (
    segments.some(
      (segment) => segment === "__proto__" || segment === "constructor" || segment === "prototype",
    )
  )
    return {
      errMsg: `${label} ${safeJsonQuote(path)} contains a reserved name ("__proto__", "constructor", "prototype")`,
    };
  if (/[:;]/.test(nfc))
    return {
      errMsg: `${label} ${safeJsonQuote(path)} contains ":" or ";", which no published path may`,
    };
  return {
    nfc,
  };
}
//@ chunk-jv307fw4.js:6579-7278 placement
/**
 * 校验 files 里的发布路径：通过基本格式检查，且不能是 index.html、不能以 _ 开头、不能与服务自身视图同名（删除时除外）。
 */
function validateFilesPath(path, { removal = false } = {}) {
  let checked = validatePublishedPath(path, "files: published path");
  if ("errMsg" in checked) return checked;
  let { nfc } = checked;
  if (nfc === "index.html")
    return {
      errMsg:
        'files: "index.html" cannot be a published path \u2014 the `html` argument is always the index. Pass that file\'s content as `html` and remove the "index.html" mapping.',
    };
  if (nfc.startsWith("_"))
    return {
      errMsg: `files: published path ${safeJsonQuote(path)} starts with "_", which the artifact service reserves for its own names \u2014 rename the file or its top-level directory`,
    };
  if (!removal && isServiceViewPath(nfc))
    return {
      errMsg: `files: published path ${safeJsonQuote(path)} is a name the artifact service answers with one of its own views, so the file could never be read back \u2014 rename it`,
    };
  return {
    key: nfc,
  };
}
//@ chunk-jv307fw4.js:7278-7355 placement
/**
 * 导出函数 `isServiceViewPath`：参数 e，返回 e.startsWith("_") || e === "index.html.json" || e === ".json"。
 */
function isServiceViewPath(e) {
  return e.startsWith("_") || e === "index.html.json" || e === ".json";
}
//@ chunk-jv307fw4.js:7355-7587 placement
/**
 * 校验读取路径：规范化后不能是 artifact 服务自带的视图路径，合法时返回键名，否则返回错误消息。
 */
function validateReadPath(path) {
  let n = validatePublishedPath(path, "path");
  if ("errMsg" in n) return n;
  let { nfc } = n;
  if (isServiceViewPath(nfc))
    return {
      errMsg: `path ${safeJsonQuote(path)} names one of the artifact service's own views, not a published file; list_files shows the readable paths`,
    };
  return {
    key: nfc,
  };
}
//@ chunk-jv307fw4.js:7587-7626 placement
/**
 * 缩略图 href 的校验：上限 1 MB 与 .png/.jpg/.jpeg 正则。
 */
var MAX_THUMBNAIL_HREF_CHARS = 1048576;
var THUMBNAIL_EXT_RE = /\.(?:png|jpe?g)$/i;
//@ chunk-jv307fw4.js:7626-7868 placement
/**
 * 校验缩略图 href：必须是 .png/.jpg/.jpeg 文件，合法时返回相对路径。
 */
function validateThumbnailHref(path) {
  let n = validatePublishedPath(path, "thumbnail href");
  if ("errMsg" in n) return n;
  if (!THUMBNAIL_EXT_RE.test(n.nfc))
    return {
      errMsg: `thumbnail href ${JSON.stringify(path)} is not a .png, .jpg or .jpeg file \u2014 custom thumbnails are PNG or JPEG images`,
    };
  return {
    rel: n.nfc,
  };
}
//@ chunk-jv307fw4.js:7868-7948 placement
/**
 * 导出函数 `isUnderAnchor`：参数 e, n, r，返回 e === n || e.startsWith(n + sep) || e === r || e.startsWith(r + sep)。
 */
function isUnderAnchor(e, n, r) {
  return e === n || e.startsWith(n + sep) || e === r || e.startsWith(r + sep);
}
//@ chunk-jv307fw4.js:7948-8068 placement
/**
 * 把路径中的根前缀从旧根替换为新根（不在旧根下时原样返回）。
 */
function remapRootPrefix(e, cwd, realCwd) {
  let s = normalizeTrailingSlash(normalize(cwd));
  if (s === realCwd) return e;
  if (e === s) return realCwd;
  return e.startsWith(s + sep) ? realCwd + e.slice(s.length) : e;
}
//@ chunk-jv307fw4.js:8068-8129 placement
/**
 * 导出函数 `normalizeTrailingSlash`：参数 e，返回 replaced === "" ? e : replaced。
 */
function normalizeTrailingSlash(e) {
  let replaced = e.replace(/\/+$/, "");
  return replaced === "" ? e : replaced;
}
//@ chunk-jv307fw4.js:8129-8350 placement
/**
 * 把用户给的路径解析为本地绝对路径：网络路径、~ 开头、越出基准目录的相对路径返回 null；绝对路径规范化；相对路径接到基准目录下。
 */
function resolveLocalPath(from, n) {
  if (classifyArtifactUrl(from)) return null;
  if (from === "~" || from.startsWith(`~${sep}`) || from.startsWith("~/")) return null;
  if (isAbsolute(from)) {
    let s = normalize(from);
    return classifyArtifactUrl(s) ? null : s;
  }
  let r = normalize(from);
  if (r === ".." || r.startsWith(`..${sep}`)) return null;
  return join(n, r);
}
//@ chunk-jv307fw4.js:8350-8563 placement
/**
 * 发布文件是无法安全解析的符号链接（网络目标、链接文本含 ..、或层级过多）时的错误说明。
 */
function describeUnsafeSymlink(from) {
  return `files: ${JSON.stringify(from)} is a symlink whose chain cannot be safely resolved (network target, a \`..\` segment in link text, or too many links) \u2014 list the link's target path instead`;
}
//@ chunk-jv307fw4.js:8563-8780 placement
/**
 * 沿符号链接链最多追 40 层，遇到网络目标、链接文本含 ..、链接过多或指向受保护位置时判定为不安全；不是链接时返回 false。
 */
async function isUnsafeSymlinkChain(e) {
  let n = normalizeTrailingSlash(e);
  for (let j = 0; j < 40; j++) {
    let s;
    try {
      s = await readlink(n);
    } catch {
      return false;
    }
    if (isOnForeignMount(s, dirname(n))) return true;
    if (s.split(/\/+/).includes("..")) return true;
    n = normalizeTrailingSlash(isAbsolute(s) ? normalize(s) : join(dirname(n), s));
    if (classifyArtifactUrl(n)) return true;
  }
  return true;
}
//@ chunk-jv307fw4.js:8780-8837 placement
function underAnyAnchor(localPath, anchors) {
  return anchors.some((r) => isUnderAnchor(localPath, r.lex, r.real));
}
//@ chunk-jv307fw4.js:8837-8910 placement
function isUnderRealRoot(realRoot, anchors) {
  return anchors.some((r) => realRoot === r.real || realRoot.startsWith(r.real + sep));
}
//@ chunk-jv307fw4.js:8910-8968 placement
function isRealDirectory(e) {
  return !e.isSymbolicLink() && e.isDirectory();
}
//@ chunk-jv307fw4.js:8968-9304 placement
/**
 * 计算 scratchpad 目录作为发布锚点：不存在时按原路径；是真实目录且不在网络位置时返回字面与真实路径。
 */
async function getScratchpadAnchor(scratchpadDir) {
  if (scratchpadDir === undefined || !isAbsolute(scratchpadDir)) return [];
  let n = normalizeTrailingSlash(normalize(scratchpadDir));
  let r;
  try {
    r = await lstat(n);
  } catch (error) {
    return isENOENT(error)
      ? [
          {
            kind: "scratchpad",
            lex: n,
            real: n,
          },
        ]
      : [];
  }
  if (!isRealDirectory(r) || (await isUnsafeSymlinkChain(n))) return [];
  let real = await realpath(n).catch(() => n);
  let a = await lstat(n).catch(() => {
    return;
  });
  return a !== undefined && isRealDirectory(a) && a.ino === r.ino && a.dev === r.dev
    ? [
        {
          kind: "scratchpad",
          lex: n,
          real,
        },
      ]
    : [];
}
//@ chunk-jv307fw4.js:9304-9715 placement
/**
 * 为会话额外工作目录建立发布锚点（目录、非不安全链接、真实路径不是网络路径、两次 lstat 一致），评测受限模式下原样接受原始 cwd。
 */
async function getWorkingDirAnchors(e, n) {
  let r = [];
  for (let s of e ?? []) {
    if (!isAbsolute(s) || classifyArtifactUrl(s)) continue;
    let a = normalizeTrailingSlash(normalize(s));
    if (a === n.lex || a === n.real) continue;
    try {
      let l = await lstat(a);
      if (!isRealDirectory(l) || (await isUnsafeSymlinkChain(a))) continue;
      if (env.CLAUDE_CODE_EVAL_CONFINED && a === getOriginalCwd()) {
        r.push({
          kind: "dir",
          lex: a,
          real: a,
        });
        continue;
      }
      let d = await realpath(a);
      if (classifyArtifactUrl(d)) continue;
      let h = await lstat(a);
      if (isRealDirectory(h) && h.ino === l.ino && h.dev === l.dev)
        r.push({
          kind: "dir",
          lex: a,
          real: d,
        });
    } catch {}
  }
  return r;
}
//@ chunk-jv307fw4.js:9715-10086 placement
/**
 * 描述允许发布的锚点位置（一个或多个工作目录，及可选 scratchpad），用于错误提示。
 */
function describeAnchorSet(anchors) {
  let filtered = anchors.filter((a) => a.kind !== "scratchpad");
  let joined = filtered.map((a) => jsonStringify(a.lex)).join(", ");
  let s = anchors.some((a) => a.kind === "scratchpad") ? " or your scratchpad directory" : "";
  return filtered.length > 1
    ? {
        where: `the session's working directories (${joined})${s}`,
        under: "a path under one of them",
      }
    : {
        where: `the working directory (${joined})${s}`,
        under: s === "" ? "a path under it" : "a path under one of them",
      };
}
//@ chunk-jv307fw4.js:10086-10268 placement
function describeAnchor(anchor) {
  return anchor.kind === "scratchpad"
    ? "your scratchpad directory"
    : anchor.kind === "cwd"
      ? `the working directory (${jsonStringify(anchor.lex)})`
      : `${jsonStringify(anchor.lex)} (one of the session's working directories)`;
}
//@ chunk-jv307fw4.js:10268-11934 placement
/**
 * 解析并校验发布根目录 root：必须位于工作目录/额外工作目录/scratchpad 之一，不能是网络路径、越界相对路径、受保护或不安全链接、被拒绝路径；真实路径须仍在同一锚点下且是目录；返回锚点、真实根与词法根。
 */
async function resolvePublishBase(cwd, root, options) {
  let realCwd = await realpath(cwd);
  let a = {
    kind: "cwd",
    lex: normalizeTrailingSlash(normalize(cwd)),
    real: realCwd,
  };
  let anchors = [
    a,
    ...(await getWorkingDirAnchors(options?.workingDirs, a)),
    ...(await getScratchpadAnchor(options?.scratchpadDir)),
  ];
  let { where, under } = describeAnchorSet(anchors);
  if (root === undefined)
    return {
      anchors,
      realRoot: realCwd,
      lexRoot: normalize(cwd),
    };
  if (classifyArtifactUrl(root))
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
    ? anchors.find((anchor) => isUnderAnchor(normalizedRoot, anchor.lex, anchor.real))
    : anchors[0];
  if (anchor === undefined)
    return {
      errMsg: `root: ${JSON.stringify(root)} is outside ${where} \u2014 pass ${under}`,
    };
  let absRoot = isAbsolute(normalizedRoot) ? normalizedRoot : join(realCwd, normalizedRoot);
  let v = options?.denyPath?.(absRoot, false, root);
  if (v !== undefined)
    return {
      errMsg: v,
    };
  if (pathTouchesProtected(absRoot) || (await isUnsafeSymlinkChain(absRoot)))
    return {
      errMsg: `root: ${JSON.stringify(root)} is a symlink whose chain cannot be safely resolved (network target, a \`..\` segment in link text, or too many links) \u2014 pass the target directory itself`,
    };
  let realRoot;
  try {
    realRoot = await realpath(absRoot);
  } catch {
    return {
      errMsg: `root: ${JSON.stringify(root)} not found`,
    };
  }
  if (classifyArtifactUrl(realRoot))
    return {
      errMsg: `root: ${JSON.stringify(root)} resolves to a network path \u2014 the publish base must lie within ${where}`,
    };
  if (!isUnderRealRoot(realRoot, [anchor]))
    return {
      errMsg: isUnderRealRoot(realRoot, anchors)
        ? `root: ${jsonStringify(root)} is a link from ${describeAnchor(anchor)} into ${describeAnchor(anchors.find((anchor) => isUnderRealRoot(realRoot, [anchor])) ?? anchor)} \u2014 pass the directory it points to instead`
        : `root: ${JSON.stringify(root)} resolves outside ${where} \u2014 the publish base must lie within it`,
    };
  let k;
  try {
    k = await stat(realRoot);
  } catch {
    return {
      errMsg: `root: ${JSON.stringify(root)} not found`,
    };
  }
  if (!k.isDirectory())
    return {
      errMsg: `root: ${JSON.stringify(root)} is not a directory`,
    };
  let lexRoot = normalizeTrailingSlash(
    isAbsolute(normalizedRoot) ? normalizedRoot : join(normalize(cwd), normalizedRoot),
  );
  return {
    anchors,
    realRoot,
    lexRoot,
  };
}
//@ chunk-jv307fw4.js:11934-16062 placement
/**
 * 解析发布文件的锚定根目录（真实路径/词法路径），校验在期望根下并给出错误。
 */
async function resolvePublishRoot(e, cwd, root, options) {
  let publishBase = await resolvePublishBase(cwd, root, options);
  if ("errMsg" in publishBase) return publishBase;
  let { anchors, realRoot, lexRoot } = publishBase;
  let { where, under } = describeAnchorSet(anchors);
  if (options?.expectedRealRoot !== undefined && options.expectedRealRoot !== realRoot)
    return {
      errMsg:
        "root: the publish base resolves to a different location than " +
        "was approved \u2014 it changed between approval and publishing; " +
        "retry the publish",
    };
  if (e.length === 0)
    return {
      errMsg: "files: the file map is empty \u2014 list at least one file",
    };
  if (e.length > MAX_URL_SEGMENT_CHARS)
    return {
      errMsg: `files: ${e.length} files + index.html exceeds the ${MAX_URL_SEGMENT_CHARS + 1} entries one publish may name; send at most ${MAX_URL_SEGMENT_CHARS} now and the rest in another publish to the same url`,
    };
  let P = [];
  let v = new Set();
  let N = 0;
  for (let k of e) {
    let W = validateFilesPath(k.to);
    if ("errMsg" in W) return W;
    let key = W.key;
    if (v.has(key))
      return {
        errMsg: `files: published path ${safeJsonQuote(key)} appears more than once`,
      };
    v.add(key);
    let from = k.from;
    if (classifyArtifactUrl(from))
      return {
        errMsg: `files: ${JSON.stringify(from)} is a network path \u2014 only files under ${where} can be published`,
      };
    if (from === "~" || from.startsWith(`~${sep}`) || from.startsWith("~/"))
      return {
        errMsg: `files: ${JSON.stringify(from)} \u2014 "~" is not expanded here; pass a base-relative or absolute path`,
      };
    let K = isAbsolute(from) ? undefined : normalize(from);
    if (K !== undefined && (K === ".." || K.startsWith(`..${sep}`)))
      return {
        errMsg:
          `files: ${JSON.stringify(from)} escapes the publish base \u2014 ` +
          `only files under ${where} can be published`,
      };
    let localPath = resolveLocalPath(from, realRoot);
    if (localPath === null)
      return {
        errMsg: `files: ${JSON.stringify(from)} cannot be resolved`,
      };
    if (isAbsolute(from) && !underAnyAnchor(localPath, anchors))
      return {
        errMsg: `files: ${JSON.stringify(from)} is outside ${where} \u2014 pass ${under}`,
      };
    let E = options?.denyPath?.(localPath, false, from);
    if (E !== undefined)
      return {
        errMsg: E,
      };
    if (lexRoot !== realRoot) {
      let x = K ?? (localPath.startsWith(realRoot + sep) ? relative(realRoot, localPath) : undefined);
      if (x !== undefined) {
        let I = options?.denyPath?.(join(lexRoot, x), true, from);
        if (I !== undefined)
          return {
            errMsg: I,
          };
      }
    }
    if (pathTouchesProtected(localPath) || (await isUnsafeSymlinkChain(localPath)))
      return {
        errMsg: describeUnsafeSymlink(from),
      };
    let U;
    try {
      U = await realpath(localPath);
    } catch (error) {
      return {
        errMsg: `files: ${JSON.stringify(from)} not found`,
        ...(isENOENT(error) && {
          missing: true,
        }),
      };
    }
    if (classifyArtifactUrl(U))
      return {
        errMsg: `files: ${JSON.stringify(from)} resolves to a network path \u2014 only files under ${where} can be published`,
      };
    if (!isUnderRealRoot(U, anchors))
      return {
        errMsg: `files: ${JSON.stringify(from)} resolves outside ${where} (symlink?) \u2014 only files under it can be published`,
      };
    if (U !== localPath) {
      let x = options?.denyPath?.(U, true, from);
      if (x !== undefined)
        return {
          errMsg: x,
        };
    }
    try {
      let x = await lstat(U);
      if (x.isSymbolicLink())
        return {
          errMsg: `files: ${JSON.stringify(from)} changed to a symlink after it was checked \u2014 retry the publish`,
        };
      if (!x.isFile())
        return {
          errMsg: `files: ${JSON.stringify(from)} is not a regular file`,
        };
    } catch (error) {
      return {
        errMsg: `files: ${JSON.stringify(from)} not found`,
        ...(isENOENT(error) && {
          missing: true,
        }),
      };
    }
    let A;
    try {
      A = await open(U, constants.O_RDONLY | (constants.O_NOFOLLOW | constants.O_NONBLOCK));
    } catch (error) {
      if (error?.code === "ELOOP")
        return {
          errMsg: `files: ${JSON.stringify(from)} changed to a symlink after it was checked \u2014 retry the publish`,
        };
      return {
        errMsg: `files: ${JSON.stringify(from)} not found`,
        ...(isENOENT(error) && {
          missing: true,
        }),
      };
    }
    let content;
    let H;
    try {
      try {
        if ((await lstat(U)).isSymbolicLink())
          return {
            errMsg: `files: ${JSON.stringify(from)} changed to a symlink after it was checked \u2014 retry the publish`,
          };
      } catch (error) {
        return {
          errMsg: `files: ${JSON.stringify(from)} not found`,
          ...(isENOENT(error) && {
            missing: true,
          }),
        };
      }
      let stats = await A.stat();
      if (!stats.isFile())
        return {
          errMsg: `files: ${JSON.stringify(from)} is not a regular file`,
        };
      if ((env.CLAUDE_CODE_EVAL_CONFINED || options?.refuseHardLinks === true) && stats.nlink > 1)
        return {
          errMsg: `files: ${JSON.stringify(from)} has more than one hard link`,
        };
      if (stats.size > MAX_ARTIFACT_BYTES)
        return {
          errMsg: `files: ${JSON.stringify(from)} is ${Math.ceil(stats.size / 1024 / 1024)}MB (per-file max ${MAX_ARTIFACT_BYTES / 1024 / 1024}MB)`,
          tooLarge: true,
        };
      N += stats.size;
      if (N > MANIFEST_REQUEST_BUDGET)
        return {
          errMsg: `files: total content exceeds ${MANIFEST_REQUEST_BUDGET / 1024 / 1024}MB at ${JSON.stringify(from)} \u2014 the most one publish sends; publish the files up to it now and the rest in another publish to the same url (a version may total ${VERSION_TOTAL_BYTES / 1024 / 1024}MB)`,
        };
      H = k.contentType ?? contentTypeForPath(key);
      if (H === undefined)
        return {
          errMsg: unservableFileMessage("files", key),
          notServedPath: key,
        };
      try {
        let exactBytes = await readExactBytes(A, stats.size);
        if (exactBytes === null)
          return {
            errMsg: `files: ${JSON.stringify(from)} changed while it was read \u2014 retry the publish`,
          };
        content = exactBytes;
      } catch {
        return {
          errMsg: `files: ${JSON.stringify(from)} could not be read`,
        };
      }
      P.push({
        path: key,
        content,
        contentType: H,
        ...(k.live !== undefined && {
          live: k.live,
        }),
        ...(k.reseed === true && {
          reseed: true,
        }),
      });
    } finally {
      await A.close();
    }
  }
  return {
    files: P,
  };
}
//@ chunk-jv307fw4.js:16062-16408 placement
/**
 * 按发布根规则读取缩略图文件（png/jpg），返回其内容或带缺失/过大标志的错误。
 */
async function readThumbnailFile(href, fromAbs, r, s) {
  let a = /\.png$/i.test(fromAbs) ? ".png" : ".jpg";
  let publishRoot = await resolvePublishRoot(
    [
      {
        to: `thumbnail${a}`,
        from: fromAbs,
      },
    ],
    r,
    undefined,
    s,
  );
  if ("errMsg" in publishRoot)
    return {
      errMsg: `thumbnail ${JSON.stringify(href)}: ${publishRoot.errMsg.replace(/^files: /, "")}`,
      missing: publishRoot.missing === true,
      tooLarge: publishRoot.tooLarge === true,
    };
  let content = publishRoot.files[0].content;
  return {
    content: typeof content === "string" ? Buffer.from(content) : content,
  };
}
export {
  normalizeTrailingSlash,
  isUnsafeSymlinkChain,
  getWorkingDirAnchors,
  validateThumbnailHref,
  isUnderAnchor,
  MAX_THUMBNAIL_HREF_CHARS,
  readThumbnailFile,
  isServiceViewPath,
  validateReadPath,
  remapRootPrefix,
  validateFilesPath,
  resolveLocalPath,
  describeUnsafeSymlink,
  resolvePublishRoot,
};
