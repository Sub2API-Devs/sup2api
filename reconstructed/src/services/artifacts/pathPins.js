/**
 * services/artifacts/pathPins.ts
 *
 * 2.1.316 新增：artifact 路径固定检查与过期路径说明
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-hag5hcx6.js (32)
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

//@ chunk-hag5hcx6.js:589-827 placement
/**
 * 发布因文件内容与上次看到的不一致而被拒绝时的说明标题与两个列表标题。
 */
var STALE_PUBLISH_HEADLINE =
  "Nothing was published or removed: this publish touches files whose published content is not what you last saw";
var CHANGED_SINCE_SEEN_LABEL = "Changed since you last saw them:";
var UNSEEN_PUBLISHED_LABEL = "Already published, and not read as published or listed by you in this session:";
//@ chunk-hag5hcx6.js:827-2422 placement
function parsePathPinRefusal(e) {
  if (
    !e.startsWith(
      "Nothing was published or removed: this publish touches files whose published content is not what you last saw",
    )
  )
    return;
  let index = e.indexOf(`
Changed since you last saw them:`);
  let index_2 = e.indexOf(`
Already published, and not read as published or listed by you in this session:`);
  let s = (c, p) => (c === -1 ? "" : e.slice(c, p === -1 || p < c ? undefined : p));
  let a = s(index, index_2);
  let o = s(index_2, -1);
  let l = (c) => [...c.matchAll(/^- ("(?:[^"\\]|\\.)*")/gm)].map((p) => p[1]);
  let d = (c) => Number(/^- (?:and )?(\d+) (?:more|paths?, not named here):/m.exec(c)?.[1] ?? 0);
  let h = l(a);
  let u = l(o);
  let P = h.length + d(a);
  let m = u.length + d(o);
  let v = [...a.matchAll(/^- "(?:[^"\\]|\\.)*": [^\n]*it has since been removed/gm)].length;
  if (P > 0 && m > 0)
    return "Not published: some files on the artifact changed since Claude last saw them, and others Claude has not read yet. Claude needs to read the latest versions before publishing again.";
  if (P === 1)
    return v === 1
      ? `Not published: ${h[0]} was removed from the artifact since Claude last saw it. Publishing again creates it afresh.`
      : `Not published: ${h[0]} changed on the artifact since Claude last saw it. Claude needs to read the latest version before publishing again.`;
  if (P > 1)
    return `Not published: ${P} files changed on the artifact since Claude last saw them. Claude needs to read the latest versions before publishing again.`;
  if (m === 1)
    return `Not published: ${u[0]} is already on the artifact and Claude has not read it. Claude needs to read it before replacing or removing it.`;
  return `Not published: ${m} files are already on the artifact and Claude has not read them. Claude needs to read them before replacing or removing them.`;
}
//@ chunk-hag5hcx6.js:2422-2441 placement
/**
 * 路径钉住的限额：每个 artifact 20 条、路径 32000 字符。
 */
var PATH_PIN_LIMITS = 20;
var MAX_PIN_PATH_CHARS = 32000;
//@ chunk-hag5hcx6.js:2441-2499 placement
function isPathPinEnabled() {
  return env.CLAUDE_CODE_ARTIFACT_PATH_PIN ?? true;
}
//@ chunk-hag5hcx6.js:2499-2534 placement
function isPathPinActive() {
  return isPathPinEnabled() && !isCoworkEntrypoint();
}
//@ chunk-hag5hcx6.js:2534-2581 placement
function pathPinOn() {
  return getLiveState().frozenPathPin ?? isPathPinEnabled();
}
//@ chunk-hag5hcx6.js:2581-2630 placement
function pathPinAckOffered() {
  return getLiveState().frozenPathPinAck ?? isPathPinActive();
}
//@ chunk-hag5hcx6.js:2630-2720 placement
function pathPinsFor(e) {
  let { pathPins } = getLiveState();
  let n = pathPins.get(e);
  if (n === undefined) {
    n = new Map();
    pathPins.set(e, n);
  }
  return n;
}
//@ chunk-hag5hcx6.js:2720-2759 placement
function nextPathPinSeq() {
  return ++getLiveState().pathPinSeq;
}
//@ chunk-hag5hcx6.js:2759-2846 placement
function setPathPin(e, r, n, s) {
  let a = e.get(r);
  if (a !== undefined && a.seq > s) return;
  e.set(r, {
    ...n,
    seq: s,
  });
}
//@ chunk-hag5hcx6.js:2846-2932 placement
function pinPathFromRead(slug, path, sha256, ver, a = nextPathPinSeq()) {
  if (!pathPinOn()) return;
  setPathPin(
    pathPinsFor(slug),
    path,
    {
      sha256,
      ver,
      via: "read",
    },
    a,
  );
}
//@ chunk-hag5hcx6.js:2932-3018 placement
function pinPathFromList(slug, path, sha256, ver, a = nextPathPinSeq()) {
  if (!pathPinOn()) return;
  setPathPin(
    pathPinsFor(slug),
    path,
    {
      sha256,
      ver,
      via: "list",
    },
    a,
  );
}
//@ chunk-hag5hcx6.js:3018-3134 placement
function unpinPath(slug, path, n = nextPathPinSeq()) {
  if (!pathPinOn()) return;
  let s = getLiveState().pathPins.get(slug);
  let a = s?.get(path);
  if (a !== undefined && a.seq < n) s.delete(path);
}
//@ chunk-hag5hcx6.js:3134-3335 placement
function pinListedPaths(slug, ver, n, s = nextPathPinSeq()) {
  if (!pathPinOn()) return;
  let a = pathPinsFor(slug);
  for (let o of n) {
    let l = a.get(o.path);
    if (l === undefined || (l.via === "list" && l.sha256 !== null))
      setPathPin(
        a,
        o.path,
        {
          sha256: o.sha256,
          ver,
          via: "list",
        },
        s,
      );
  }
  diffPinnedPaths(a, ver, s, n, false);
}
//@ chunk-hag5hcx6.js:3335-3664 placement
function diffPinnedPaths(e, ver, n, s, a) {
  let o = new Map(s.map((l) => [l.path, l]));
  for (let [l, d] of e) {
    let h = o.get(l);
    if (d.seq > n || (h === undefined && !a)) continue;
    let sha256 = h?.sha256 ?? null;
    if (h?.live === true || sha256 === d.sha256) {
      if (d.behind !== undefined)
        e.set(l, {
          sha256: d.sha256,
          ver: d.ver,
          via: d.via,
          seq: d.seq,
        });
    } else
      e.set(l, {
        ...d,
        behind: {
          sha256,
          sizeBytes: h?.sizeBytes,
          ver,
        },
      });
  }
}
//@ chunk-hag5hcx6.js:3664-3903 placement
function pinPublishedPaths(slug, ver, n) {
  if (!pathPinOn()) return;
  let s = pathPinsFor(slug);
  let a = nextPathPinSeq();
  for (let o of n.written)
    if (o.sha256 === undefined) s.delete(o.path);
    else
      setPathPin(
        s,
        o.path,
        {
          sha256: o.sha256,
          ver,
          via: "publish",
        },
        a,
      );
  for (let o of n.removed)
    setPathPin(
      s,
      o,
      {
        sha256: null,
        ver,
        via: "publish",
      },
      a,
    );
}
//@ chunk-hag5hcx6.js:3903-4047 placement
function hasReadPins(slug) {
  if (!pathPinOn()) return false;
  let r = getLiveState().pathPins.get(slug);
  if (r === undefined) return false;
  for (let n of r.values()) if (n.via !== "list") return true;
  return false;
}
//@ chunk-hag5hcx6.js:4047-4264 placement
function publishPinFields(e) {
  if (e === undefined) return {};
  let flattened = e.written.flatMap((n) =>
    n.sha256 === undefined
      ? []
      : [
          {
            path: n.path,
            sha256: n.sha256,
          },
        ],
  );
  return {
    ...(flattened.length > 0 && {
      files_written: flattened,
    }),
    ...(e.removed.length > 0 && {
      files_removed: [...e.removed],
    }),
  };
}
//@ chunk-hag5hcx6.js:4264-4368 placement
function pinRemovedPaths(e, ver, n, s) {
  if (!pathPinOn()) return;
  let a = pathPinsFor(e);
  for (let o of n)
    setPathPin(
      a,
      o,
      {
        sha256: null,
        ver,
        via: "list",
      },
      s,
    );
}
//@ chunk-hag5hcx6.js:4368-4437 placement
function reconcilePins(slug, ver, n, s) {
  if (!pathPinOn() || n.length === 0) return;
  diffPinnedPaths(pathPinsFor(slug), ver, s, n, false);
}
//@ chunk-hag5hcx6.js:4437-4571 placement
function makeRemovedPathPinner(slug, ver, n) {
  let mapped = n.filter((o) => o.liveSha256 === null).map((o) => o.path);
  if (mapped.length === 0) return;
  let a = nextPathPinSeq();
  return () => pinRemovedPaths(slug, ver, mapped, a);
}
//@ chunk-hag5hcx6.js:4571-4709 placement
function orderChangedPaths(e) {
  let filtered = e.filter((n) => n.kind === "changed");
  return [...filtered.filter((n) => n.liveSha256 === null), ...filtered.filter((n) => n.liveSha256 !== null)];
}
//@ chunk-hag5hcx6.js:4709-5327 placement
function publishPathChanges(e) {
  let r = [];
  let n = [
    ...e.writes.map((write) => ({
      ...write,
      operation: "write",
    })),
    ...e.removes.map((path) => ({
      path,
      operation: "remove",
      sha256: undefined,
    })),
  ];
  for (let { path, operation, sha256 } of n) {
    if (e.liveDocs?.has(path)) continue;
    let l = e.pins?.get(path);
    let d = e.live.get(path) ?? null;
    if (l === undefined) {
      if (d === null || e.acknowledged.has(path)) continue;
      if (operation === "write" && sha256 === d) continue;
      r.push({
        kind: "unread",
        path,
        operation,
      });
      continue;
    }
    if (l.sha256 === d) continue;
    if (operation === "write" && sha256 !== undefined && sha256 === d) continue;
    if (operation === "remove" && d === null) continue;
    r.push({
      kind: "changed",
      path,
      operation,
      readSha256: l.sha256,
      readVer: l.ver,
      readVia: l.via,
      liveSha256: d,
    });
  }
  return r;
}
//@ chunk-hag5hcx6.js:5327-5369 placement
function jsonActionForCore(e, r) {
  return jsonStringify(e.core ? collapseArtifactAction(r) : r);
}
//@ chunk-hag5hcx6.js:5369-5450 placement
function readActionHint(e) {
  return e.core ? 'action "read" with its `path`' : 'action "read_file"';
}
//@ chunk-hag5hcx6.js:5450-5785 placement
function currentFileState(path, r) {
  let n = r.files.get(path);
  if (n === undefined)
    return "  now: deleted; publishing this path again creates it afresh, so do that only if the user wants it back";
  let s = n.sizeBytes === undefined ? "" : `, ${n.sizeBytes} ${plural(n.sizeBytes, "byte")}`;
  return `  now: sha256 ${n.sha256}${s}; read it with ${jsonActionForCore(r, {
    action: "read_file",
    url: r.url,
    path,
  })}`;
}
//@ chunk-hag5hcx6.js:5785-6233 placement
function describePinnedState(e, r, n) {
  let s =
    e.readSha256 !== null
      ? `you last saw it at version ${e.readVer}`
      : e.readVia === "publish"
        ? `you removed it at version ${e.readVer}`
        : `it was gone when you last checked (version ${e.readVer})`;
  let a =
    e.liveSha256 === null
      ? `it has since been removed (version ${r})`
      : e.readSha256 === null
        ? `someone has since published a file there (version ${r})`
        : `someone has since replaced it (version ${r})`;
  return `- ${jsonStringify(e.path)}: ${s}; ${a}
${currentFileState(e.path, n)}`;
}
//@ chunk-hag5hcx6.js:6233-6497 placement
function listWithOverflow(e, r, n) {
  if (e.length <= r)
    return e.join(`
`);
  let s = `- ${r > 0 ? `and ${e.length - r} more` : `${e.length} ${plural(e.length, "path")}, not named here`}: ${jsonActionForCore(
    n,
    {
      action: "list_files",
      url: n.url,
    },
  )} lists every file with its size`;
  return r > 0
    ? `${e.slice(0, r).join(`
`)}
${s}`
    : s;
}
//@ chunk-hag5hcx6.js:6497-7620 placement
function stalePathsMessage(e, r, n) {
  let s = orderChangedPaths(e);
  let filtered = e.filter((d) => d.kind === "unread");
  let o = [
    s.length > 0
      ? `${STALE_PUBLISH_HEADLINE}, and sending your copy would replace a newer edit.`
      : `${STALE_PUBLISH_HEADLINE}, and sending your copy could discard content you have not read.`,
  ];
  let min = Math.min(s.length, PATH_PIN_LIMITS);
  if (s.length > 0) {
    let any = s.some((h) => h.liveSha256 === null);
    o.push(`${CHANGED_SINCE_SEEN_LABEL}
${listWithOverflow(
  s.map((h) => describePinnedState(h, r, n)),
  min,
  n,
)}
Read each one${any ? " that still exists" : ""} again (${readActionHint(n)}), re-apply your change to what it holds now, and publish again${any ? "; a deleted one needs no read" : ""}. Never resend your earlier copy.${n.forced ? " `force` does not override this." : ""}${n.remembered ? ' The live file list could not be read for this publish, so each "now" line and its version are from an earlier listing or publish result in this session; the reads will show what is there now.' : ""}`);
  }
  if (filtered.length > 0)
    o.push(`${UNSEEN_PUBLISHED_LABEL}
${listWithOverflow(
  filtered.map(
    (d) => `- ${jsonStringify(d.path)}
${currentFileState(d.path, n)}`,
  ),
  PATH_PIN_LIMITS - min,
  n,
)}
Read each one first (${readActionHint(n)}) and build on it.${n.ackOffered === false ? " Do so even when the user wants the file replaced outright." : " Only when the user asked for the file to be replaced without looking, name it in `overwrite_unread`."}`);
  return o.join(`

`);
}
//@ chunk-hag5hcx6.js:7620-9946 placement
/**
 * 发布前检查路径固定（path pins）：列出 artifact 当前文件并对比本会话读到/发布过的版本，有未读更改则拒绝发布。
 */
async function checkPathPins(e) {
  if (e.writes.length === 0 && e.removes.length === 0)
    return {
      kind: "pass",
      liveVer: undefined,
    };
  let r = nextPathPinSeq();
  let n = await listArtifactFiles(e.target, e.signal, e.credentials);
  if (n.kind === "error") {
    logForDebugging(`[artifact] path pins: no listing (${n.reason}) slug=${e.target.slug}`);
    if (n.reason === "single_page")
      return {
        kind: "pass",
        liveVer: undefined,
      };
    let d = getLiveState().pathPins.get(e.target.slug);
    let h = new Set();
    let u = new Map();
    let P = new Map();
    let m = "";
    for (let c of [...e.writes.map((write) => write.path), ...e.removes]) {
      let behind = d?.get(c)?.behind;
      if (behind === undefined) continue;
      h.add(c);
      if (behind.sha256 !== null) {
        u.set(c, behind.sha256);
        P.set(c, {
          sha256: behind.sha256,
          ...(behind.sizeBytes !== undefined && {
            sizeBytes: behind.sizeBytes,
          }),
        });
      }
      if (m === "" || (compareNumericPrefix(behind.ver, m) ?? 1) > 0) m = behind.ver;
    }
    let v = publishPathChanges({
      pins: d,
      live: u,
      writes: e.writes.filter((write) => h.has(write.path)),
      removes: e.removes.filter((remove) => h.has(remove)),
      acknowledged: new Set(e.acknowledged),
    });
    logFeatureSad(
      "artifact_path_pin",
      v.length === 0 ? `skipped_${n.reason}` : `refused_without_listing_${n.reason}`,
    );
    if (v.length === 0)
      return {
        kind: "pass",
        liveVer: undefined,
      };
    return {
      kind: "refuse",
      reasonCode: "path_pin_changed",
      message: stalePathsMessage(v, m, {
        url: e.url ?? artifactViewerUrlFor(e.target),
        files: P,
        core: isArtifactToolsetSplit(),
        forced: e.force === true,
        ackOffered: pathPinAckOffered(),
        remembered: true,
      }),
      onCommitted: makeRemovedPathPinner(e.target.slug, m, orderChangedPaths(v).slice(0, PATH_PIN_LIMITS)),
    };
  }
  let s = getLiveState().pathPins.get(e.target.slug);
  if (s !== undefined) diffPinnedPaths(s, n.ver, r, n.files, !n.narrowed);
  let a = new Map(n.files.map((file) => [file.path, file.sha256]));
  let o = new Set(n.files.filter((file) => file.live).map((file) => file.path));
  let l = publishPathChanges({
    pins: s,
    live: a,
    liveDocs: o,
    writes: e.writes,
    removes: e.removes,
    acknowledged: new Set(e.acknowledged),
  });
  logFeatureOk("artifact_path_pin", {
    checked: e.writes.length + e.removes.length,
    refused: l.length,
  });
  if (l.length === 0) {
    let d = n.publishPreconditions === true ? collectPinnedHashes(a, o, e.writes, e.removes) : undefined;
    let mapped = e.writes
      .filter(
        (write) => write.sha256 !== undefined && !o.has(write.path) && a.get(write.path) === write.sha256,
      )
      .map((write) => write.path);
    return {
      kind: "pass",
      liveVer: n.ver,
      ...(mapped.length > 0 && {
        unchanged: mapped,
      }),
      ...(!n.narrowed && {
        liveOwnPaths: n.files.map((file) => file.path).filter((u) => n.typePaths?.includes(u) !== true),
      }),
      ...(n.title !== undefined && {
        liveTitle: n.title,
      }),
      ...(n.favicon !== undefined && {
        liveFavicon: n.favicon,
      }),
      ...(d !== undefined && {
        preconditions: d,
      }),
    };
  }
  return {
    kind: "refuse",
    reasonCode: l.some((d) => d.kind === "changed") ? "path_pin_changed" : "path_pin_unread",
    message: stalePathsMessage(l, n.ver, {
      url: e.url ?? artifactViewerUrlFor(e.target),
      files: new Map(
        n.files.map((file) => [
          file.path,
          {
            sha256: file.sha256,
            sizeBytes: file.sizeBytes,
          },
        ]),
      ),
      core: isArtifactToolsetSplit(),
      forced: e.force === true,
      ackOffered: pathPinAckOffered(),
    }),
    onCommitted: makeRemovedPathPinner(e.target.slug, n.ver, orderChangedPaths(l).slice(0, PATH_PIN_LIMITS)),
  };
}
//@ chunk-hag5hcx6.js:9946-10126 placement
function collectPinnedHashes(e, r, writes, removes) {
  let a = new Map();
  for (let { path } of writes) {
    if (r.has(path)) return;
    a.set(path, e.get(path) ?? null);
  }
  for (let o of removes) {
    let l = e.get(o);
    if (l === undefined || r.has(o)) return;
    a.set(o, l);
  }
  return a;
}
//@ chunk-hag5hcx6.js:10126-10689 placement
function pathPinTelemetry(e) {
  let r = getLiveState().pathPins.get(e.target.slug);
  let mapped = e.paths.map((path) => {
    let o = r?.get(path.path);
    let operation = e.removes.includes(path.path) ? "remove" : "write";
    return o !== undefined && o.sha256 === path.expected
      ? {
          kind: "changed",
          path: path.path,
          operation,
          readSha256: path.expected,
          readVer: o.ver,
          readVia: o.via,
          liveSha256: path.actual,
        }
      : {
          kind: "unread",
          path: path.path,
          operation,
        };
  });
  let s = new Map();
  for (let path of e.paths)
    if (path.actual !== null)
      s.set(path.path, {
        sha256: path.actual,
      });
  return {
    message: stalePathsMessage(mapped, e.liveVer, {
      url: e.url ?? artifactViewerUrlFor(e.target),
      files: s,
      core: isArtifactToolsetSplit(),
      ackOffered: pathPinAckOffered(),
    }),
    onCommitted: makeRemovedPathPinner(
      e.target.slug,
      e.liveVer,
      orderChangedPaths(mapped).slice(0, PATH_PIN_LIMITS),
    ),
  };
}
export {
  isPathPinEnabled,
  pathPinOn,
  hasReadPins,
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
  isPathPinActive,
  parsePathPinRefusal,
};
