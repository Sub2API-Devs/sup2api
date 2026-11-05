/**
 * services/artifacts/pathPins.ts
 *
 * 2.1.316 新增：artifact 路径固定检查与过期路径说明
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-7kh4b4jr.js (32)
 * attribution: placement 32
 */
import { env } from "../../utils/env.js";
import { isCoworkEntrypoint } from "../../utils/entrypointKinds.js";
import { getLiveState } from "../liveReplica/liveReplica.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { collapseArtifactAction } from "./artifactToolActions.js";
import { plural } from "../../utils/stringUtils.js";
import { listArtifactFiles } from "./publishedFiles.js";
import { logForDebugging } from "../../utils/debug.js";
import { compareNumericPrefix } from "../../utils/textNormalize.js";
import { logFeatureSad, logFeatureOk } from "../analytics/featureTelemetry.js";
import { artifactViewerUrlFor } from "../../tools/ArtifactTool/artifactUrls.js";
import { isArtifactToolsetSplit } from "./artifactToolGates.js";

//@ chunk-7kh4b4jr.js:589-827 placement
/**
 * 发布因文件内容与上次看到的不一致而被拒绝时的说明标题与两个列表标题。
 */
var STALE_PUBLISH_HEADLINE =
  "Nothing was published or removed: this publish touches files whose published content is not what you last saw";
var CHANGED_SINCE_SEEN_LABEL = "Changed since you last saw them:";
var UNSEEN_PUBLISHED_LABEL = "Already published, and not read as published or listed by you in this session:";
//@ chunk-7kh4b4jr.js:827-2422 placement
function parsePathPinRefusal(message) {
  if (
    !message.startsWith(
      "Nothing was published or removed: this publish touches files whose published content is not what you last saw",
    )
  )
    return;
  let start = message.indexOf(`
Changed since you last saw them:`);
  let index = message.indexOf(`
Already published, and not read as published or listed by you in this session:`);
  let section = (start, end) =>
    start === -1 ? "" : message.slice(start, end === -1 || end < start ? undefined : end);
  let knownSection = section(start, index);
  let removedSection = section(index, -1);
  let countBullets = (sectionText) =>
    [...sectionText.matchAll(/^- ("(?:[^"\\]|\\.)*")/gm)].map((match) => match[1]);
  let countIndented = (sectionText) =>
    Number(/^- (?:and )?(\d+) (?:more|paths?, not named here):/m.exec(sectionText)?.[1] ?? 0);
  let knownPaths = countBullets(knownSection);
  let removedPaths = countBullets(removedSection);
  let knownCount = knownPaths.length + countIndented(knownSection);
  let removedCount = removedPaths.length + countIndented(removedSection);
  let staleCount = [...knownSection.matchAll(/^- "(?:[^"\\]|\\.)*": [^\n]*it has since been removed/gm)]
    .length;
  if (knownCount > 0 && removedCount > 0)
    return "Not published: some files on the artifact changed since Claude last saw them, and others Claude has not read yet. Claude needs to read the latest versions before publishing again.";
  if (knownCount === 1)
    return staleCount === 1
      ? `Not published: ${knownPaths[0]} was removed from the artifact since Claude last saw it. Publishing again creates it afresh.`
      : `Not published: ${knownPaths[0]} changed on the artifact since Claude last saw it. Claude needs to read the latest version before publishing again.`;
  if (knownCount > 1)
    return `Not published: ${knownCount} files changed on the artifact since Claude last saw them. Claude needs to read the latest versions before publishing again.`;
  if (removedCount === 1)
    return `Not published: ${removedPaths[0]} is already on the artifact and Claude has not read it. Claude needs to read it before replacing or removing it.`;
  return `Not published: ${removedCount} files are already on the artifact and Claude has not read them. Claude needs to read them before replacing or removing them.`;
}
//@ chunk-7kh4b4jr.js:2422-2441 placement
/**
 * 路径钉住的限额：每个 artifact 20 条、路径 32000 字符。
 */
var PATH_PIN_LIMITS = 20;
var MAX_PIN_PATH_CHARS = 32000;
//@ chunk-7kh4b4jr.js:2441-2499 placement
function isPathPinEnabled() {
  return env.CLAUDE_CODE_ARTIFACT_PATH_PIN ?? true;
}
//@ chunk-7kh4b4jr.js:2499-2534 placement
function isPathPinActive() {
  return isPathPinEnabled() && !isCoworkEntrypoint();
}
//@ chunk-7kh4b4jr.js:2534-2581 placement
function pathPinOn() {
  return getLiveState().frozenPathPin ?? isPathPinEnabled();
}
//@ chunk-7kh4b4jr.js:2581-2630 placement
function pathPinAckOffered() {
  return getLiveState().frozenPathPinAck ?? isPathPinActive();
}
//@ chunk-7kh4b4jr.js:2630-2720 placement
function pathPinsFor(slug) {
  let { pathPins } = getLiveState();
  let pins = pathPins.get(slug);
  if (pins === undefined) {
    pins = new Map();
    pathPins.set(slug, pins);
  }
  return pins;
}
//@ chunk-7kh4b4jr.js:2720-2759 placement
function nextPathPinSeq() {
  return ++getLiveState().pathPinSeq;
}
//@ chunk-7kh4b4jr.js:2759-2846 placement
function setPathPin(store, path, sha256, ver) {
  let slugPins = store.get(path);
  if (slugPins !== undefined && slugPins.seq > ver) return;
  store.set(path, {
    ...sha256,
    seq: ver,
  });
}
//@ chunk-7kh4b4jr.js:2846-2932 placement
function pinPathFromRead(slug, path, sha256, ver, seq = nextPathPinSeq()) {
  if (!pathPinOn()) return;
  setPathPin(
    pathPinsFor(slug),
    path,
    {
      sha256,
      ver,
      via: "read",
    },
    seq,
  );
}
//@ chunk-7kh4b4jr.js:2932-3018 placement
function pinPathFromList(slug, path, sha256, ver, seq = nextPathPinSeq()) {
  if (!pathPinOn()) return;
  setPathPin(
    pathPinsFor(slug),
    path,
    {
      sha256,
      ver,
      via: "list",
    },
    seq,
  );
}
//@ chunk-7kh4b4jr.js:3018-3134 placement
function unpinPath(slug, path, seq = nextPathPinSeq()) {
  if (!pathPinOn()) return;
  let slugPins = getLiveState().pathPins.get(slug);
  let pin = slugPins?.get(path);
  if (pin !== undefined && pin.seq < seq) slugPins.delete(path);
}
//@ chunk-7kh4b4jr.js:3134-3335 placement
function pinListedPaths(slug, ver, files, seq = nextPathPinSeq()) {
  if (!pathPinOn()) return;
  let pins = pathPinsFor(slug);
  for (let file of files) {
    let existing = pins.get(file.path);
    if (existing === undefined || (existing.via === "list" && existing.sha256 !== null))
      setPathPin(
        pins,
        file.path,
        {
          sha256: file.sha256,
          ver,
          via: "list",
        },
        seq,
      );
  }
  diffPinnedPaths(pins, ver, seq, files, false);
}
//@ chunk-7kh4b4jr.js:3335-3664 placement
function diffPinnedPaths(pins, ver, listingVer, files, notNarrowed) {
  let liveByPath = new Map(files.map((file) => [file.path, file]));
  for (let [path, pin] of pins) {
    let liveFile = liveByPath.get(path);
    if (pin.seq > listingVer || (liveFile === undefined && !notNarrowed)) continue;
    let sha256 = liveFile?.sha256 ?? null;
    if (liveFile?.live === true || sha256 === pin.sha256) {
      if (pin.behind !== undefined)
        pins.set(path, {
          sha256: pin.sha256,
          ver: pin.ver,
          via: pin.via,
          seq: pin.seq,
        });
    } else
      pins.set(path, {
        ...pin,
        behind: {
          sha256,
          sizeBytes: liveFile?.sizeBytes,
          ver,
        },
      });
  }
}
//@ chunk-7kh4b4jr.js:3664-3903 placement
function pinPublishedPaths(slug, ver, changes) {
  if (!pathPinOn()) return;
  let pins = pathPinsFor(slug);
  let seq = nextPathPinSeq();
  for (let path of changes.written)
    if (path.sha256 === undefined) pins.delete(path.path);
    else
      setPathPin(
        pins,
        path.path,
        {
          sha256: path.sha256,
          ver,
          via: "publish",
        },
        seq,
      );
  for (let path of changes.removed)
    setPathPin(
      pins,
      path,
      {
        sha256: null,
        ver,
        via: "publish",
      },
      seq,
    );
}
//@ chunk-7kh4b4jr.js:3903-4047 placement
function hasReadPins(slug) {
  if (!pathPinOn()) return false;
  let slugPins = getLiveState().pathPins.get(slug);
  if (slugPins === undefined) return false;
  for (let pin of slugPins.values()) if (pin.via !== "list") return true;
  return false;
}
//@ chunk-7kh4b4jr.js:4047-4264 placement
function publishPinFields(changes) {
  if (changes === undefined) return {};
  let flattened = changes.written.flatMap((change) =>
    change.sha256 === undefined
      ? []
      : [
          {
            path: change.path,
            sha256: change.sha256,
          },
        ],
  );
  return {
    ...(flattened.length > 0 && {
      files_written: flattened,
    }),
    ...(changes.removed.length > 0 && {
      files_removed: [...changes.removed],
    }),
  };
}
//@ chunk-7kh4b4jr.js:4264-4368 placement
function pinRemovedPaths(slug, ver, paths, seq) {
  if (!pathPinOn()) return;
  let pins = pathPinsFor(slug);
  for (let path of paths)
    setPathPin(
      pins,
      path,
      {
        sha256: null,
        ver,
        via: "list",
      },
      seq,
    );
}
//@ chunk-7kh4b4jr.js:4368-4437 placement
function reconcilePins(slug, ver, files, seq) {
  if (!pathPinOn() || files.length === 0) return;
  diffPinnedPaths(pathPinsFor(slug), ver, seq, files, false);
}
//@ chunk-7kh4b4jr.js:4437-4571 placement
function makeRemovedPathPinner(slug, ver, changes) {
  let paths = changes.filter((change) => change.liveSha256 === null).map((change) => change.path);
  if (paths.length === 0) return;
  let seq = nextPathPinSeq();
  return () => pinRemovedPaths(slug, ver, paths, seq);
}
//@ chunk-7kh4b4jr.js:4571-4709 placement
function orderChangedPaths(changes) {
  let filtered = changes.filter((change) => change.kind === "changed");
  return [
    ...filtered.filter((change) => change.liveSha256 === null),
    ...filtered.filter((change) => change.liveSha256 !== null),
  ];
}
//@ chunk-7kh4b4jr.js:4709-5327 placement
function publishPathChanges(input) {
  let changed = [];
  let unread = [
    ...input.writes.map((write) => ({
      ...write,
      operation: "write",
    })),
    ...input.removes.map((path) => ({
      path,
      operation: "remove",
      sha256: undefined,
    })),
  ];
  for (let { path, operation, sha256 } of unread) {
    if (input.liveDocs?.has(path)) continue;
    let pin = input.pins?.get(path);
    let liveSha = input.live.get(path) ?? null;
    if (pin === undefined) {
      if (liveSha === null || input.acknowledged.has(path)) continue;
      if (operation === "write" && sha256 === liveSha) continue;
      changed.push({
        kind: "unread",
        path,
        operation,
      });
      continue;
    }
    if (pin.sha256 === liveSha) continue;
    if (operation === "write" && sha256 !== undefined && sha256 === liveSha) continue;
    if (operation === "remove" && liveSha === null) continue;
    changed.push({
      kind: "changed",
      path,
      operation,
      readSha256: pin.sha256,
      readVer: pin.ver,
      readVia: pin.via,
      liveSha256: liveSha,
    });
  }
  return changed;
}
//@ chunk-7kh4b4jr.js:5327-5369 placement
function jsonActionForCore(path, hint) {
  return jsonStringify(path.core ? collapseArtifactAction(hint) : hint);
}
//@ chunk-7kh4b4jr.js:5369-5450 placement
function readActionHint(hint) {
  return hint.core ? 'action "read" with its `path`' : 'action "read_file"';
}
//@ chunk-7kh4b4jr.js:5450-5785 placement
function currentFileState(path, state) {
  let file = state.files.get(path);
  if (file === undefined)
    return "  now: deleted; publishing this path again creates it afresh, so do that only if the user wants it back";
  let detail = file.sizeBytes === undefined ? "" : `, ${file.sizeBytes} ${plural(file.sizeBytes, "byte")}`;
  return `  now: sha256 ${file.sha256}${detail}; read it with ${jsonActionForCore(state, {
    action: "read_file",
    url: state.url,
    path,
  })}`;
}
//@ chunk-7kh4b4jr.js:5785-6233 placement
function describePinnedState(change, ver, options) {
  let lines =
    change.readSha256 !== null
      ? `you last saw it at version ${change.readVer}`
      : change.readVia === "publish"
        ? `you removed it at version ${change.readVer}`
        : `it was gone when you last checked (version ${change.readVer})`;
  let changeLine =
    change.liveSha256 === null
      ? `it has since been removed (version ${ver})`
      : change.readSha256 === null
        ? `someone has since published a file there (version ${ver})`
        : `someone has since replaced it (version ${ver})`;
  return `- ${jsonStringify(change.path)}: ${lines}; ${changeLine}
${currentFileState(change.path, options)}`;
}
//@ chunk-7kh4b4jr.js:6233-6497 placement
function listWithOverflow(paths, namedCount, options) {
  if (paths.length <= namedCount)
    return paths.join(`
`);
  let line = `- ${namedCount > 0 ? `and ${paths.length - namedCount} more` : `${paths.length} ${plural(paths.length, "path")}, not named here`}: ${jsonActionForCore(
    options,
    {
      action: "list_files",
      url: options.url,
    },
  )} lists every file with its size`;
  return namedCount > 0
    ? `${paths.slice(0, namedCount).join(`
`)}
${line}`
    : line;
}
//@ chunk-7kh4b4jr.js:6497-7620 placement
function stalePathsMessage(changes, ver, options) {
  let ordered = orderChangedPaths(changes);
  let filtered = changes.filter((change) => change.kind === "unread");
  let sections = [
    ordered.length > 0
      ? `${STALE_PUBLISH_HEADLINE}, and sending your copy would replace a newer edit.`
      : `${STALE_PUBLISH_HEADLINE}, and sending your copy could discard content you have not read.`,
  ];
  let min = Math.min(ordered.length, PATH_PIN_LIMITS);
  if (ordered.length > 0) {
    let any = ordered.some((change) => change.liveSha256 === null);
    sections.push(`${CHANGED_SINCE_SEEN_LABEL}
${listWithOverflow(
  ordered.map((change) => describePinnedState(change, ver, options)),
  min,
  options,
)}
Read each one${any ? " that still exists" : ""} again (${readActionHint(options)}), re-apply your change to what it holds now, and publish again${any ? "; a deleted one needs no read" : ""}. Never resend your earlier copy.${options.forced ? " `force` does not override this." : ""}${options.remembered ? ' The live file list could not be read for this publish, so each "now" line and its version are from an earlier listing or publish result in this session; the reads will show what is there now.' : ""}`);
  }
  if (filtered.length > 0)
    sections.push(`${UNSEEN_PUBLISHED_LABEL}
${listWithOverflow(
  filtered.map(
    (change) => `- ${jsonStringify(change.path)}
${currentFileState(change.path, options)}`,
  ),
  PATH_PIN_LIMITS - min,
  options,
)}
Read each one first (${readActionHint(options)}) and build on it.${options.ackOffered === false ? " Do so even when the user wants the file replaced outright." : " Only when the user asked for the file to be replaced without looking, name it in `overwrite_unread`."}`);
  return sections.join(`

`);
}
//@ chunk-7kh4b4jr.js:7620-9946 placement
/**
 * 发布前检查路径固定（path pins）：列出 artifact 当前文件并对比本会话读到/发布过的版本，有未读更改则拒绝发布。
 */
async function checkPathPins(request) {
  if (request.writes.length === 0 && request.removes.length === 0)
    return {
      kind: "pass",
      liveVer: undefined,
    };
  let seq = nextPathPinSeq();
  let listing = await listArtifactFiles(request.target, request.signal, request.credentials);
  if (listing.kind === "error") {
    logForDebugging(`[artifact] path pins: no listing (${listing.reason}) slug=${request.target.slug}`);
    if (listing.reason === "single_page")
      return {
        kind: "pass",
        liveVer: undefined,
      };
    let slugPins = getLiveState().pathPins.get(request.target.slug);
    let pinnedPaths = new Set();
    let liveShas = new Map();
    let liveFiles = new Map();
    let latestVer = "";
    for (let path of [...request.writes.map((write) => write.path), ...request.removes]) {
      let behind = slugPins?.get(path)?.behind;
      if (behind === undefined) continue;
      pinnedPaths.add(path);
      if (behind.sha256 !== null) {
        liveShas.set(path, behind.sha256);
        liveFiles.set(path, {
          sha256: behind.sha256,
          ...(behind.sizeBytes !== undefined && {
            sizeBytes: behind.sizeBytes,
          }),
        });
      }
      if (latestVer === "" || (compareNumericPrefix(behind.ver, latestVer) ?? 1) > 0) latestVer = behind.ver;
    }
    let refused = publishPathChanges({
      pins: slugPins,
      live: liveShas,
      writes: request.writes.filter((write) => pinnedPaths.has(write.path)),
      removes: request.removes.filter((remove) => pinnedPaths.has(remove)),
      acknowledged: new Set(request.acknowledged),
    });
    logFeatureSad(
      "artifact_path_pin",
      refused.length === 0 ? `skipped_${listing.reason}` : `refused_without_listing_${listing.reason}`,
    );
    if (refused.length === 0)
      return {
        kind: "pass",
        liveVer: undefined,
      };
    return {
      kind: "refuse",
      reasonCode: "path_pin_changed",
      message: stalePathsMessage(refused, latestVer, {
        url: request.url ?? artifactViewerUrlFor(request.target),
        files: liveFiles,
        core: isArtifactToolsetSplit(),
        forced: request.force === true,
        ackOffered: pathPinAckOffered(),
        remembered: true,
      }),
      onCommitted: makeRemovedPathPinner(
        request.target.slug,
        latestVer,
        orderChangedPaths(refused).slice(0, PATH_PIN_LIMITS),
      ),
    };
  }
  let slugPins = getLiveState().pathPins.get(request.target.slug);
  if (slugPins !== undefined) diffPinnedPaths(slugPins, listing.ver, seq, listing.files, !listing.narrowed);
  let liveShas = new Map(listing.files.map((file) => [file.path, file.sha256]));
  let liveDocs = new Set(listing.files.filter((file) => file.live).map((file) => file.path));
  let refused = publishPathChanges({
    pins: slugPins,
    live: liveShas,
    liveDocs,
    writes: request.writes,
    removes: request.removes,
    acknowledged: new Set(request.acknowledged),
  });
  logFeatureOk("artifact_path_pin", {
    checked: request.writes.length + request.removes.length,
    refused: refused.length,
  });
  if (refused.length === 0) {
    let preconditions =
      listing.publishPreconditions === true
        ? collectPinnedHashes(liveShas, liveDocs, request.writes, request.removes)
        : undefined;
    let mapped = request.writes
      .filter(
        (write) =>
          write.sha256 !== undefined &&
          !liveDocs.has(write.path) &&
          liveShas.get(write.path) === write.sha256,
      )
      .map((write) => write.path);
    return {
      kind: "pass",
      liveVer: listing.ver,
      ...(mapped.length > 0 && {
        unchanged: mapped,
      }),
      ...(!listing.narrowed && {
        liveOwnPaths: listing.files
          .map((file) => file.path)
          .filter((path) => listing.typePaths?.includes(path) !== true),
      }),
      ...(listing.title !== undefined && {
        liveTitle: listing.title,
      }),
      ...(listing.favicon !== undefined && {
        liveFavicon: listing.favicon,
      }),
      ...(preconditions !== undefined && {
        preconditions,
      }),
    };
  }
  return {
    kind: "refuse",
    reasonCode: refused.some((change) => change.kind === "changed") ? "path_pin_changed" : "path_pin_unread",
    message: stalePathsMessage(refused, listing.ver, {
      url: request.url ?? artifactViewerUrlFor(request.target),
      files: new Map(
        listing.files.map((file) => [
          file.path,
          {
            sha256: file.sha256,
            sizeBytes: file.sizeBytes,
          },
        ]),
      ),
      core: isArtifactToolsetSplit(),
      forced: request.force === true,
      ackOffered: pathPinAckOffered(),
    }),
    onCommitted: makeRemovedPathPinner(
      request.target.slug,
      listing.ver,
      orderChangedPaths(refused).slice(0, PATH_PIN_LIMITS),
    ),
  };
}
//@ chunk-7kh4b4jr.js:9946-10126 placement
function collectPinnedHashes(liveShas, liveDocs, writes, removes) {
  let pinned = new Map();
  for (let { path } of writes) {
    if (liveDocs.has(path)) return;
    pinned.set(path, liveShas.get(path) ?? null);
  }
  for (let path of removes) {
    let sha256 = liveShas.get(path);
    if (sha256 === undefined || liveDocs.has(path)) return;
    pinned.set(path, sha256);
  }
  return pinned;
}
//@ chunk-7kh4b4jr.js:10126-10689 placement
function pathPinTelemetry(request) {
  let slugPins = getLiveState().pathPins.get(request.target.slug);
  let changes = request.paths.map((path) => {
    let pin = slugPins?.get(path.path);
    let operation = request.removes.includes(path.path) ? "remove" : "write";
    return pin !== undefined && pin.sha256 === path.expected
      ? {
          kind: "changed",
          path: path.path,
          operation,
          readSha256: path.expected,
          readVer: pin.ver,
          readVia: pin.via,
          liveSha256: path.actual,
        }
      : {
          kind: "unread",
          path: path.path,
          operation,
        };
  });
  let texts = new Map();
  for (let path of request.paths)
    if (path.actual !== null)
      texts.set(path.path, {
        sha256: path.actual,
      });
  return {
    message: stalePathsMessage(changes, request.liveVer, {
      url: request.url ?? artifactViewerUrlFor(request.target),
      files: texts,
      core: isArtifactToolsetSplit(),
      ackOffered: pathPinAckOffered(),
    }),
    onCommitted: makeRemovedPathPinner(
      request.target.slug,
      request.liveVer,
      orderChangedPaths(changes).slice(0, PATH_PIN_LIMITS),
    ),
  };
}
export {
  isPathPinEnabled,
  pathPinOn,
  nextPathPinSeq,
  pinListedPaths,
  pinPathFromRead,
  pinPathFromList,
  unpinPath,
  checkPathPins,
  MAX_PIN_PATH_CHARS,
  pathPinTelemetry,
  pinPublishedPaths,
  publishPinFields,
  reconcilePins,
  pinRemovedPaths,
  parsePathPinRefusal,
  isPathPinActive,
  hasReadPins,
};
