/**
 * services/artifacts/publishPaths.ts
 *
 * 2.1.316 新增：发布路径校验（受保护路径、长度上限）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-m0ks5273.js (22)
 * attribution: placement 22
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
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

//@ chunk-m0ks5273.js:5359-6589 placement
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
//@ chunk-m0ks5273.js:6589-7288 placement
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
//@ chunk-m0ks5273.js:7288-7365 placement
/**
 * 导出函数 `isServiceViewPath`：参数 e，返回 e.startsWith("_") || e === "index.html.json" || e === ".json"。
 */
function isServiceViewPath(path) {
  return path.startsWith("_") || path === "index.html.json" || path === ".json";
}
//@ chunk-m0ks5273.js:7365-7597 placement
/**
 * 校验读取路径：规范化后不能是 artifact 服务自带的视图路径，合法时返回键名，否则返回错误消息。
 */
function validateReadPath(path) {
  let validated = validatePublishedPath(path, "path");
  if ("errMsg" in validated) return validated;
  let { nfc } = validated;
  if (isServiceViewPath(nfc))
    return {
      errMsg: `path ${safeJsonQuote(path)} names one of the artifact service's own views, not a published file; list_files shows the readable paths`,
    };
  return {
    key: nfc,
  };
}
//@ chunk-m0ks5273.js:7597-7636 placement
/**
 * 缩略图 href 的校验：上限 1 MB 与 .png/.jpg/.jpeg 正则。
 */
var MAX_THUMBNAIL_HREF_CHARS = 1048576;
var THUMBNAIL_EXT_RE = /\.(?:png|jpe?g)$/i;
//@ chunk-m0ks5273.js:7636-7878 placement
/**
 * 校验缩略图 href：必须是 .png/.jpg/.jpeg 文件，合法时返回相对路径。
 */
function validateThumbnailHref(path) {
  let validated = validatePublishedPath(path, "thumbnail href");
  if ("errMsg" in validated) return validated;
  if (!THUMBNAIL_EXT_RE.test(validated.nfc))
    return {
      errMsg: `thumbnail href ${JSON.stringify(path)} is not a .png, .jpg or .jpeg file \u2014 custom thumbnails are PNG or JPEG images`,
    };
  return {
    rel: validated.nfc,
  };
}
//@ chunk-m0ks5273.js:7878-7958 placement
/**
 * 导出函数 `isUnderAnchor`：参数 e, n, r，返回 e === n || e.startsWith(n + sep) || e === r || e.startsWith(r + sep)。
 */
function isUnderAnchor(localPath, lexAnchor, realAnchor) {
  return (
    localPath === lexAnchor ||
    localPath.startsWith(lexAnchor + sep) ||
    localPath === realAnchor ||
    localPath.startsWith(realAnchor + sep)
  );
}
//@ chunk-m0ks5273.js:7958-8078 placement
/**
 * 把路径中的根前缀从旧根替换为新根（不在旧根下时原样返回）。
 */
function remapRootPrefix(path, cwd, realCwd) {
  let normalizedCwd = normalizeTrailingSlash(normalize(cwd));
  if (normalizedCwd === realCwd) return path;
  if (path === normalizedCwd) return realCwd;
  return path.startsWith(normalizedCwd + sep) ? realCwd + path.slice(normalizedCwd.length) : path;
}
//@ chunk-m0ks5273.js:8078-8139 placement
/**
 * 导出函数 `normalizeTrailingSlash`：参数 e，返回 replaced === "" ? e : replaced。
 */
function normalizeTrailingSlash(path) {
  let replaced = path.replace(/\/+$/, "");
  return replaced === "" ? path : replaced;
}
//@ chunk-m0ks5273.js:8139-8360 placement
/**
 * 把用户给的路径解析为本地绝对路径：网络路径、~ 开头、越出基准目录的相对路径返回 null；绝对路径规范化；相对路径接到基准目录下。
 */
function resolveLocalPath(from, cwd) {
  if (classifyArtifactUrl(from)) return null;
  if (from === "~" || from.startsWith(`~${sep}`) || from.startsWith("~/")) return null;
  if (isAbsolute(from)) {
    let normalized = normalize(from);
    return classifyArtifactUrl(normalized) ? null : normalized;
  }
  let normalized = normalize(from);
  if (normalized === ".." || normalized.startsWith(`..${sep}`)) return null;
  return join(cwd, normalized);
}
//@ chunk-m0ks5273.js:8360-8573 placement
/**
 * 发布文件是无法安全解析的符号链接（网络目标、链接文本含 ..、或层级过多）时的错误说明。
 */
function describeUnsafeSymlink(from) {
  return `files: ${JSON.stringify(from)} is a symlink whose chain cannot be safely resolved (network target, a \`..\` segment in link text, or too many links) \u2014 list the link's target path instead`;
}
//@ chunk-m0ks5273.js:8573-8791 placement
/**
 * 沿符号链接链最多追 40 层，遇到网络目标、链接文本含 ..、链接过多或指向受保护位置时判定为不安全；不是链接时返回 false。
 */
async function isUnsafeSymlinkChain(path) {
  let current = normalizeTrailingSlash(path);
  for (let j = 0; j < 40; j++) {
    let link;
    try {
      link = await readlink(current);
    } catch {
      return false;
    }
    if (isOnForeignMount(link, dirname(current))) return true;
    if (link.split(/\/+/).includes("..")) return true;
    current = normalizeTrailingSlash(isAbsolute(link) ? normalize(link) : join(dirname(current), link));
    if (classifyArtifactUrl(current)) return true;
  }
  return true;
}
//@ chunk-m0ks5273.js:8791-8848 placement
function underAnyAnchor(localPath, anchors) {
  return anchors.some((anchor) => isUnderAnchor(localPath, anchor.lex, anchor.real));
}
//@ chunk-m0ks5273.js:8848-8921 placement
function isUnderRealRoot(realRoot, anchors) {
  return anchors.some((anchor) => realRoot === anchor.real || realRoot.startsWith(anchor.real + sep));
}
//@ chunk-m0ks5273.js:8921-8979 placement
function isRealDirectory(stat) {
  return !stat.isSymbolicLink() && stat.isDirectory();
}
//@ chunk-m0ks5273.js:8979-9316 placement
/**
 * 计算 scratchpad 目录作为发布锚点：不存在时按原路径；是真实目录且不在网络位置时返回字面与真实路径。
 */
async function getScratchpadAnchor(scratchpadDir) {
  if (scratchpadDir === undefined || !isAbsolute(scratchpadDir)) return [];
  let normalized = normalizeTrailingSlash(normalize(scratchpadDir));
  let stat;
  try {
    stat = await lstat(normalized);
  } catch (error) {
    return isENOENT(error)
      ? [
          {
            kind: "scratchpad",
            lex: normalized,
            real: normalized,
          },
        ]
      : [];
  }
  if (!isRealDirectory(stat) || (await isUnsafeSymlinkChain(normalized))) return [];
  let real = await realpath(normalized).catch(() => normalized);
  let scratchpadStat = await lstat(normalized).catch(() => {
    return;
  });
  return scratchpadStat !== undefined &&
    isRealDirectory(scratchpadStat) &&
    scratchpadStat.ino === stat.ino &&
    scratchpadStat.dev === stat.dev
    ? [
        {
          kind: "scratchpad",
          lex: normalized,
          real,
        },
      ]
    : [];
}
//@ chunk-m0ks5273.js:9316-9728 placement
/**
 * 为会话额外工作目录建立发布锚点（目录、非不安全链接、真实路径不是网络路径、两次 lstat 一致），评测受限模式下原样接受原始 cwd。
 */
async function getWorkingDirAnchors(dirs, cwdAnchor) {
  let anchors = [];
  for (let dir of dirs ?? []) {
    if (!isAbsolute(dir) || classifyArtifactUrl(dir)) continue;
    let normalized = normalizeTrailingSlash(normalize(dir));
    if (normalized === cwdAnchor.lex || normalized === cwdAnchor.real) continue;
    try {
      let stat = await lstat(normalized);
      if (!isRealDirectory(stat) || (await isUnsafeSymlinkChain(normalized))) continue;
      if (env.CLAUDE_CODE_EVAL_CONFINED && normalized === getOriginalCwd()) {
        anchors.push({
          kind: "dir",
          lex: normalized,
          real: normalized,
        });
        continue;
      }
      let real = await realpath(normalized);
      if (classifyArtifactUrl(real)) continue;
      let recheck = await lstat(normalized);
      if (isRealDirectory(recheck) && recheck.ino === stat.ino && recheck.dev === stat.dev)
        anchors.push({
          kind: "dir",
          lex: normalized,
          real,
        });
    } catch {}
  }
  return anchors;
}
//@ chunk-m0ks5273.js:9728-10099 placement
/**
 * 描述允许发布的锚点位置（一个或多个工作目录，及可选 scratchpad），用于错误提示。
 */
function describeAnchorSet(anchors) {
  let filtered = anchors.filter((anchor) => anchor.kind !== "scratchpad");
  let joined = filtered.map((anchor) => jsonStringify(anchor.lex)).join(", ");
  let scratchpadNote = anchors.some((anchor) => anchor.kind === "scratchpad")
    ? " or your scratchpad directory"
    : "";
  return filtered.length > 1
    ? {
        where: `the session's working directories (${joined})${scratchpadNote}`,
        under: "a path under one of them",
      }
    : {
        where: `the working directory (${joined})${scratchpadNote}`,
        under: scratchpadNote === "" ? "a path under it" : "a path under one of them",
      };
}
//@ chunk-m0ks5273.js:10099-10281 placement
function describeAnchor(anchor) {
  return anchor.kind === "scratchpad"
    ? "your scratchpad directory"
    : anchor.kind === "cwd"
      ? `the working directory (${jsonStringify(anchor.lex)})`
      : `${jsonStringify(anchor.lex)} (one of the session's working directories)`;
}
//@ chunk-m0ks5273.js:10281-11948 placement
/**
 * 解析并校验发布根目录 root：必须位于工作目录/额外工作目录/scratchpad 之一，不能是网络路径、越界相对路径、受保护或不安全链接、被拒绝路径；真实路径须仍在同一锚点下且是目录；返回锚点、真实根与词法根。
 */
async function resolvePublishBase(cwd, root, options) {
  let realCwd = await realpath(cwd);
  let cwdAnchor = {
    kind: "cwd",
    lex: normalizeTrailingSlash(normalize(cwd)),
    real: realCwd,
  };
  let anchors = [
    cwdAnchor,
    ...(await getWorkingDirAnchors(options?.workingDirs, cwdAnchor)),
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
  let denied = options?.denyPath?.(absRoot, false, root);
  if (denied !== undefined)
    return {
      errMsg: denied,
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
  let rootStat;
  try {
    rootStat = await stat(realRoot);
  } catch {
    return {
      errMsg: `root: ${JSON.stringify(root)} not found`,
    };
  }
  if (!rootStat.isDirectory())
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
//@ chunk-m0ks5273.js:11948-16079 placement
/**
 * 解析发布文件的锚定根目录（真实路径/词法路径），校验在期望根下并给出错误。
 */
async function resolvePublishRoot(files, cwd, root, options) {
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
  if (files.length === 0)
    return {
      errMsg: "files: the file map is empty \u2014 list at least one file",
    };
  if (files.length > MAX_URL_SEGMENT_CHARS)
    return {
      errMsg: `files: ${files.length} files + index.html exceeds the ${MAX_URL_SEGMENT_CHARS + 1} entries one publish may name; send at most ${MAX_URL_SEGMENT_CHARS} now and the rest in another publish to the same url`,
    };
  let resolved = [];
  let seen = new Set();
  let totalSize = 0;
  for (let file of files) {
    let validated = validateFilesPath(file.to);
    if ("errMsg" in validated) return validated;
    let key = validated.key;
    if (seen.has(key))
      return {
        errMsg: `files: published path ${safeJsonQuote(key)} appears more than once`,
      };
    seen.add(key);
    let from = file.from;
    if (classifyArtifactUrl(from))
      return {
        errMsg: `files: ${JSON.stringify(from)} is a network path \u2014 only files under ${where} can be published`,
      };
    if (from === "~" || from.startsWith(`~${sep}`) || from.startsWith("~/"))
      return {
        errMsg: `files: ${JSON.stringify(from)} \u2014 "~" is not expanded here; pass a base-relative or absolute path`,
      };
    let normalizedFrom = isAbsolute(from) ? undefined : normalize(from);
    if (normalizedFrom !== undefined && (normalizedFrom === ".." || normalizedFrom.startsWith(`..${sep}`)))
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
    let denied = options?.denyPath?.(localPath, false, from);
    if (denied !== undefined)
      return {
        errMsg: denied,
      };
    if (lexRoot !== realRoot) {
      let relativeFrom =
        normalizedFrom ?? (localPath.startsWith(realRoot + sep) ? relative(realRoot, localPath) : undefined);
      if (relativeFrom !== undefined) {
        let denied = options?.denyPath?.(join(lexRoot, relativeFrom), true, from);
        if (denied !== undefined)
          return {
            errMsg: denied,
          };
      }
    }
    if (pathTouchesProtected(localPath) || (await isUnsafeSymlinkChain(localPath)))
      return {
        errMsg: describeUnsafeSymlink(from),
      };
    let real;
    try {
      real = await realpath(localPath);
    } catch (error) {
      return {
        errMsg: `files: ${JSON.stringify(from)} not found`,
        ...(isENOENT(error) && {
          missing: true,
        }),
      };
    }
    if (classifyArtifactUrl(real))
      return {
        errMsg: `files: ${JSON.stringify(from)} resolves to a network path \u2014 only files under ${where} can be published`,
      };
    if (!isUnderRealRoot(real, anchors))
      return {
        errMsg: `files: ${JSON.stringify(from)} resolves outside ${where} (symlink?) \u2014 only files under it can be published`,
      };
    if (real !== localPath) {
      let denied = options?.denyPath?.(real, true, from);
      if (denied !== undefined)
        return {
          errMsg: denied,
        };
    }
    try {
      let stat = await lstat(real);
      if (stat.isSymbolicLink())
        return {
          errMsg: `files: ${JSON.stringify(from)} changed to a symlink after it was checked \u2014 retry the publish`,
        };
      if (!stat.isFile())
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
    let handle;
    try {
      handle = await open(real, constants.O_RDONLY | (constants.O_NOFOLLOW | constants.O_NONBLOCK));
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
    let type;
    try {
      try {
        if ((await lstat(real)).isSymbolicLink())
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
      let stats = await handle.stat();
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
      totalSize += stats.size;
      if (totalSize > MANIFEST_REQUEST_BUDGET)
        return {
          errMsg: `files: total content exceeds ${MANIFEST_REQUEST_BUDGET / 1024 / 1024}MB at ${JSON.stringify(from)} \u2014 the most one publish sends; publish the files up to it now and the rest in another publish to the same url (a version may total ${VERSION_TOTAL_BYTES / 1024 / 1024}MB)`,
        };
      type = file.contentType ?? contentTypeForPath(key);
      if (type === undefined)
        return {
          errMsg: unservableFileMessage("files", key),
          notServedPath: key,
        };
      try {
        let exactBytes = await readExactBytes(handle, stats.size);
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
      resolved.push({
        path: key,
        content,
        contentType: type,
        ...(file.live !== undefined && {
          live: file.live,
        }),
        ...(file.reseed === true && {
          reseed: true,
        }),
      });
    } finally {
      await handle.close();
    }
  }
  return {
    files: resolved,
  };
}
//@ chunk-m0ks5273.js:16079-16425 placement
/**
 * 按发布根规则读取缩略图文件（png/jpg），返回其内容或带缺失/过大标志的错误。
 */
async function readThumbnailFile(href, fromAbs, options, credentials) {
  let ext = /\.png$/i.test(fromAbs) ? ".png" : ".jpg";
  let publishRoot = await resolvePublishRoot(
    [
      {
        to: `thumbnail${ext}`,
        from: fromAbs,
      },
    ],
    options,
    undefined,
    credentials,
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
  validateReadPath,
  validateFilesPath,
  resolveLocalPath,
  describeUnsafeSymlink,
  isUnderAnchor,
  resolvePublishRoot,
  isServiceViewPath,
  validateThumbnailHref,
  MAX_THUMBNAIL_HREF_CHARS,
  readThumbnailFile,
  remapRootPrefix,
};
