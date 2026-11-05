/**
 * services/artifacts/framedCopies.ts
 *
 * artifact 内联信封与待保存副本的登记、取走与清理（2.1.318 新增）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-nrv8bm0w.js (27)
 * attribution: placement 27
 */
import { dirname, join, basename, sep } from "path";
import { realpath } from "fs/promises";
import { realpathSync } from "fs";
import { hasLiveState, getLiveState } from "../liveReplica/liveReplica.js";
import { getPlatform } from "../../utils/platform.js";
import {
  normalizeCaseForComparison,
  ARTIFACT_FILE_NAME_RE,
  SESSION_SUBDIRS,
  SESSION_FILE_PREFIX_RE,
} from "../../utils/permissions/filesystem.js";
import { isDiskless, getOriginalCwdOrNull, getSessionId } from "../../bootstrap/state.js";
import { expandPathOrNull } from "../../utils/path.js";
import {
  NO_ENVELOPE,
  FILE_ENVELOPE_LEAD,
  FILE_ENVELOPE_TAIL,
  INTERACTIVE_HIGHLIGHT_LIMIT,
} from "./readArtifactForModel.js";
import { toolResultsDir } from "../../utils/toolResultStorage.js";
import { extensionForMimeType, persistBinaryContent } from "../../utils/mcpOutputStorage.js";
import { authoredByOthersPreamble, EXTERNAL_ARTIFACT_AUTHOR_WARNING } from "../../constants/xml.js";
import { isPersistedArtifactPath } from "./persistedArtifacts.js";
import { normalizeUuidOrNull } from "../../utils/agentId.js";

//@ chunk-nrv8bm0w.js:761-818 placement
function savedArtifactCopies() {
  return hasLiveState() ? getLiveState().savedArtifactCopies : undefined;
}
//@ chunk-nrv8bm0w.js:818-884 placement (2.1.88 match: getReservedShortcuts, 1)
function getReservedShortcuts(path) {
  let platform = getPlatform();
  return platform === "macos" || platform === "windows" ? normalizeCaseForComparison(path) : path;
}
//@ chunk-nrv8bm0w.js:884-1063 placement
async function realpathOfExistingAncestor(path) {
  if (isDiskless()) return path;
  let tailParts = [];
  for (let dir = path; ; dir = dirname(dir)) {
    let resolved = await realpath(dir).catch(() => {
      return;
    });
    if (resolved !== undefined) return join(resolved, ...tailParts.reverse());
    if (dirname(dir) === dir) return path;
    tailParts.push(basename(dir));
  }
}
//@ chunk-nrv8bm0w.js:1063-1197 placement
function realpathOfExistingAncestorSync(path) {
  if (isDiskless()) return path;
  let tailParts = [];
  for (let dir = path; ; dir = dirname(dir))
    try {
      return join(realpathSync(dir), ...tailParts.reverse());
    } catch {
      if (dirname(dir) === dir) return path;
      tailParts.push(basename(dir));
    }
}
//@ chunk-nrv8bm0w.js:1197-1275 placement
async function canonicalPath(path) {
  let expanded = expandPathOrNull(path);
  return expanded === null
    ? null
    : getReservedShortcuts(join(await realpathOfExistingAncestor(dirname(expanded)), basename(expanded)));
}
//@ chunk-nrv8bm0w.js:1275-1407 placement
async function canonicalRealPath(path) {
  let expanded = expandPathOrNull(path);
  if (expanded === null) return null;
  let resolved = isDiskless()
    ? undefined
    : await realpath(expanded).catch(() => {
        return;
      });
  return resolved === undefined ? canonicalPath(expanded) : getReservedShortcuts(resolved);
}
//@ chunk-nrv8bm0w.js:1407-1492 placement
function canonicalPathSync(path) {
  if (isDiskless()) return getReservedShortcuts(path);
  try {
    return getReservedShortcuts(realpathSync(path));
  } catch {
    return getReservedShortcuts(join(realpathOfExistingAncestorSync(dirname(path)), basename(path)));
  }
}
//@ chunk-nrv8bm0w.js:1492-1666 placement
/**
 * 用起止标记把 artifact 正文包成内联信封，并附提示，避免模型把正文当指令。
 */
function pageCopyFraming(framing, notice) {
  let { artifactInlineEnvelope } = require("./ARTIFACT_INLINE_CONTROL_RE.lazy.js");
  let { enveloped, lead, tail } = artifactInlineEnvelope({
    ...framing,
    html: "",
  });
  return enveloped
    ? {
        enveloped: true,
        notice,
        lead,
        tail,
      }
    : NO_ENVELOPE;
}
//@ chunk-nrv8bm0w.js:1666-1730 placement
function fileCopyFraming(notice) {
  return {
    enveloped: true,
    notice,
    lead: FILE_ENVELOPE_LEAD,
    tail: FILE_ENVELOPE_TAIL,
  };
}
//@ chunk-nrv8bm0w.js:1730-1892 placement
function setFraming(store, path, framing) {
  let previous = store.copies.get(path);
  store.unwrapped -= previous !== undefined && !previous.enveloped ? 1 : 0;
  store.copies.delete(path);
  if (framing !== undefined) {
    store.copies.set(path, framing);
    store.unwrapped += framing.enveloped ? 0 : 1;
  }
}
//@ chunk-nrv8bm0w.js:1892-2115 placement
/**
 * 把已保存的 artifact 副本与前一份合成待保存项，返回信封化结果。
 */
function rememberFraming(path, framing) {
  let store = getLiveState().savedArtifactCopies;
  setFraming(store, path, framing);
  let entry = store.pending.get(path);
  if (entry !== undefined) entry.prior = framing;
  if (store.unwrapped <= INTERACTIVE_HIGHLIGHT_LIMIT) return;
  for (let [otherPath, otherFraming] of store.copies) {
    if (store.unwrapped <= INTERACTIVE_HIGHLIGHT_LIMIT) break;
    if (!otherFraming.enveloped && persistedCopyKindOf(otherPath) === undefined)
      setFraming(store, otherPath, undefined);
  }
}
//@ chunk-nrv8bm0w.js:2115-2196 placement
async function savedCopyFramingAt(path) {
  let key = await canonicalPath(path);
  return key === null ? undefined : savedArtifactCopies()?.copies.get(key);
}
//@ chunk-nrv8bm0w.js:2196-2255 placement
async function recordSavedArtifactCopy(path, framing) {
  let key = await canonicalPath(path);
  if (key !== null) rememberFraming(key, framing);
}
//@ chunk-nrv8bm0w.js:2255-2475 placement
/**
 * 登记一次 artifact 保存：写入待保存项与之前副本，记录信封化标记。
 */
async function recordSavedArtifactCopyBeforeWrite(path, framing) {
  if (!framing.enveloped) return;
  let key = await canonicalPath(path);
  if (key === null) return;
  let store = getLiveState().savedArtifactCopies;
  let entry = store.pending.get(key);
  if (entry === undefined)
    store.pending.set(key, {
      prior: store.copies.get(key),
      saves: 1,
    });
  else entry.saves++;
  setFraming(store, key, framing);
}
//@ chunk-nrv8bm0w.js:2475-2680 placement
/**
 * 取走待保存的 artifact 项并清理对应副本。
 */
async function settleSavedArtifactCopy(path, framing) {
  if (!framing.enveloped) return;
  let key = await canonicalPath(path);
  let store = savedArtifactCopies();
  let entry = key === null ? undefined : store?.pending.get(key);
  if (key === null || store === undefined || entry === undefined) return;
  setFraming(store, key, framing);
  entry.prior = framing;
  if (--entry.saves === 0) store.pending.delete(key);
}
//@ chunk-nrv8bm0w.js:2680-2881 placement
/**
 * 完结一次 artifact 保存：取待保存项、删除记录。
 */
async function abandonSavedArtifactCopy(path, framing) {
  if (!framing.enveloped) return;
  let key = await canonicalPath(path);
  let store = savedArtifactCopies();
  let entry = key === null ? undefined : store?.pending.get(key);
  if (key === null || store === undefined || entry === undefined) return;
  if (--entry.saves === 0) {
    store.pending.delete(key);
    setFraming(store, key, entry.prior);
  }
}
//@ chunk-nrv8bm0w.js:2881-2984 placement
async function forgetSavedArtifactCopy(path) {
  let key = await canonicalPath(path);
  let store = savedArtifactCopies();
  if (key !== null && store !== undefined) {
    setFraming(store, key, undefined);
    store.pending.delete(key);
  }
}
//@ chunk-nrv8bm0w.js:2984-3292 placement
/**
 * 读文件失败时记一条日志并带出 filepath 的复制件。
 */
async function persistFramedCopy(framing, ...args) {
  let [, mimeType, baseName] = args;
  let plannedPath =
    getOriginalCwdOrNull() === null
      ? undefined
      : join(toolResultsDir(), `${baseName}.${extensionForMimeType(mimeType)}`);
  if (plannedPath !== undefined) await recordSavedArtifactCopyBeforeWrite(plannedPath, framing);
  let result = await persistBinaryContent(...args).catch(async (error) => {
    if (plannedPath !== undefined) await abandonSavedArtifactCopy(plannedPath, framing);
    throw error;
  });
  if (plannedPath !== undefined)
    await ("error" in result || result.filepath !== plannedPath
      ? abandonSavedArtifactCopy(plannedPath, framing)
      : settleSavedArtifactCopy(plannedPath, framing));
  if (!("error" in result)) await recordSavedArtifactCopy(result.filepath, framing);
  return result;
}
//@ chunk-nrv8bm0w.js:3292-3384 placement
async function savedCopyFramingForRead(path) {
  let key = await canonicalRealPath(path);
  if (key === null) return NO_ENVELOPE;
  return savedArtifactCopies()?.copies.get(key) ?? framingForPath(key);
}
//@ chunk-nrv8bm0w.js:3384-3476 placement
function savedCopyFraming(path) {
  let expanded = expandPathOrNull(path);
  if (expanded === null) return NO_ENVELOPE;
  let key = canonicalPathSync(expanded);
  return savedArtifactCopies()?.copies.get(key) ?? framingForPath(key);
}
//@ chunk-nrv8bm0w.js:3476-3516 placement
function strongerFraming(first, second) {
  return framingStrength(second) >= framingStrength(first) ? second : first;
}
//@ chunk-nrv8bm0w.js:3516-3569 placement
function framingStrength(framing) {
  return !framing.enveloped ? 0 : framing.notice === "" ? 1 : 2;
}
//@ chunk-nrv8bm0w.js:3569-3668 placement
function neutralizeEnvelopeTags(text) {
  let { scrubArtifactEnvelopeTags } = require("../../tools/ArtifactTool/AMPERSAND_FORMS.lazy.js");
  return scrubArtifactEnvelopeTags(text, "page");
}
//@ chunk-nrv8bm0w.js:3668-3878 placement
function framingForKind(kind) {
  let notice = authoredByOthersPreamble(true, EXTERNAL_ARTIFACT_AUTHOR_WARNING);
  switch (kind) {
    case "page":
      return pageCopyFraming(
        {
          role: "owner",
          cowritten: false,
          vouchedOwn: false,
        },
        notice,
      );
    case "working_page":
      return pageCopyFraming(
        {
          role: "writer",
          cowritten: true,
          vouchedOwn: false,
        },
        notice,
      );
    case "file":
      return fileCopyFraming(notice);
  }
}
//@ chunk-nrv8bm0w.js:3970-4325 placement
/**
 * 判断路径是否落在 artifact-files 工作副本的 index.html 上并切出名称。
 */
function persistedCopyKindOf(path) {
  let parts = path.toLowerCase().split(sep);
  if (isPersistedArtifactPath(path) && isArtifactOwnerSegment(parts.at(-3) ?? ""))
    return ARTIFACT_FILE_NAME_RE.test(parts.at(-1) ?? "") ? "file" : "page";
  let foundIndex = parts.findIndex(
    (part, partIndex) =>
      part === "artifact-files" &&
      SESSION_SUBDIRS.includes(parts[partIndex - 1] ?? "") &&
      isArtifactOwnerSegment(parts[partIndex - 2] ?? ""),
  );
  let sliced = parts.slice(foundIndex + 1);
  if (foundIndex < 0 || sliced.length < 2 || sliced[1]?.startsWith("_") === true) return;
  return sliced[1] === "working-copy" && sliced.length === 3 && sliced[2] === "index.html"
    ? "working_page"
    : "file";
}
//@ chunk-nrv8bm0w.js:4325-4393 placement
function isArtifactOwnerSegment(part) {
  return (
    normalizeUuidOrNull(part) !== null ||
    SESSION_FILE_PREFIX_RE.test(part) ||
    part === getSessionId().toLowerCase()
  );
}
//@ chunk-nrv8bm0w.js:4393-4443 placement
function framingForPath(path) {
  let kind = persistedCopyKindOf(path);
  return kind === undefined ? NO_ENVELOPE : framingForKind(kind);
}
export {
  fileCopyFraming,
  recordSavedArtifactCopyBeforeWrite,
  recordSavedArtifactCopy,
  abandonSavedArtifactCopy,
  settleSavedArtifactCopy,
  persistFramedCopy,
  pageCopyFraming,
  forgetSavedArtifactCopy,
  neutralizeEnvelopeTags,
  savedCopyFraming,
  savedCopyFramingAt,
  savedCopyFramingForRead,
  strongerFraming,
};
