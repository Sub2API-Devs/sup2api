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

/**
 * 发布因文件内容与上次看到的不一致而被拒绝时的说明标题与两个列表标题。
 */
//@ chunk-hag5hcx6.js:589-827 placement
var STALE_PUBLISH_HEADLINE =
    "Nothing was published or removed: this publish touches files whose published content is not what you last saw",
  CHANGED_SINCE_SEEN_LABEL = "Changed since you last saw them:",
  UNSEEN_PUBLISHED_LABEL = "Already published, and not read as published or listed by you in this session:";
//@ chunk-hag5hcx6.js:827-2422 placement
function parsePathPinRefusal(e) {
  if (
    !e.startsWith(
      "Nothing was published or removed: this publish touches files whose published content is not what you last saw",
    )
  )
    return;
  let index = e.indexOf(`
Changed since you last saw them:`),
    index_2 = e.indexOf(`
Already published, and not read as published or listed by you in this session:`),
    s = (c, p) => (c === -1 ? "" : e.slice(c, p === -1 || p < c ? void 0 : p)),
    a = s(index, index_2),
    o = s(index_2, -1),
    l = (c) => [...c.matchAll(/^- ("(?:[^"\\]|\\.)*")/gm)].map((p) => p[1]),
    d = (c) => Number(/^- (?:and )?(\d+) (?:more|paths?, not named here):/m.exec(c)?.[1] ?? 0),
    h = l(a),
    u = l(o),
    P = h.length + d(a),
    m = u.length + d(o),
    v = [...a.matchAll(/^- "(?:[^"\\]|\\.)*": [^\n]*it has since been removed/gm)].length;
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
var PATH_PIN_LIMITS = 20,
  RDo = 32000;
//@ chunk-hag5hcx6.js:2441-2499 placement
function isPathPinEnabled() {
  return env.CLAUDE_CODE_ARTIFACT_PATH_PIN ?? !0;
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
function k() {
  return getLiveState().frozenPathPinAck ?? isPathPinActive();
}
//@ chunk-hag5hcx6.js:2630-2720 placement
function b(e) {
  let { pathPins: pathPins } = getLiveState(),
    n = pathPins.get(e);
  if (n === void 0) ((n = new Map()), pathPins.set(e, n));
  return n;
}
//@ chunk-hag5hcx6.js:2720-2759 placement
function nextPathPinSeq() {
  return ++getLiveState().pathPinSeq;
}
//@ chunk-hag5hcx6.js:2759-2846 placement
function w(e, r, n, s) {
  let a = e.get(r);
  if (a !== void 0 && a.seq > s) return;
  e.set(r, { ...n, seq: s });
}
//@ chunk-hag5hcx6.js:2846-2932 placement
function pinPathFromRead(e, r, n, s, a = nextPathPinSeq()) {
  if (!pathPinOn()) return;
  w(b(e), r, { sha256: n, ver: s, via: "read" }, a);
}
//@ chunk-hag5hcx6.js:2932-3018 placement
function pinPathFromList(e, r, n, s, a = nextPathPinSeq()) {
  if (!pathPinOn()) return;
  w(b(e), r, { sha256: n, ver: s, via: "list" }, a);
}
//@ chunk-hag5hcx6.js:3018-3134 placement
function unpinPath(e, r, n = nextPathPinSeq()) {
  if (!pathPinOn()) return;
  let s = getLiveState().pathPins.get(e),
    a = s?.get(r);
  if (a !== void 0 && a.seq < n) s.delete(r);
}
//@ chunk-hag5hcx6.js:3134-3335 placement
function pinListedPaths(e, r, n, s = nextPathPinSeq()) {
  if (!pathPinOn()) return;
  let a = b(e);
  for (let o of n) {
    let l = a.get(o.path);
    if (l === void 0 || (l.via === "list" && l.sha256 !== null))
      w(a, o.path, { sha256: o.sha256, ver: r, via: "list" }, s);
  }
  diffPinnedPaths(a, r, s, n, !1);
}
//@ chunk-hag5hcx6.js:3335-3664 placement
function diffPinnedPaths(e, r, n, s, a) {
  let o = new Map(s.map((l) => [l.path, l]));
  for (let [l, d] of e) {
    let h = o.get(l);
    if (d.seq > n || (h === void 0 && !a)) continue;
    let u = h?.sha256 ?? null;
    if (h?.live === !0 || u === d.sha256) {
      if (d.behind !== void 0) e.set(l, { sha256: d.sha256, ver: d.ver, via: d.via, seq: d.seq });
    } else e.set(l, { ...d, behind: { sha256: u, sizeBytes: h?.sizeBytes, ver: r } });
  }
}
//@ chunk-hag5hcx6.js:3664-3903 placement
function pinPublishedPaths(e, r, n) {
  if (!pathPinOn()) return;
  let s = b(e),
    a = nextPathPinSeq();
  for (let o of n.written)
    if (o.sha256 === void 0) s.delete(o.path);
    else w(s, o.path, { sha256: o.sha256, ver: r, via: "publish" }, a);
  for (let o of n.removed) w(s, o, { sha256: null, ver: r, via: "publish" }, a);
}
//@ chunk-hag5hcx6.js:3903-4047 placement
function hasReadPins(e) {
  if (!pathPinOn()) return !1;
  let r = getLiveState().pathPins.get(e);
  if (r === void 0) return !1;
  for (let n of r.values()) if (n.via !== "list") return !0;
  return !1;
}
//@ chunk-hag5hcx6.js:4047-4264 placement
function publishPinFields(e) {
  if (e === void 0) return {};
  let flattened = e.written.flatMap((n) => (n.sha256 === void 0 ? [] : [{ path: n.path, sha256: n.sha256 }]));
  return {
    ...(flattened.length > 0 && { files_written: flattened }),
    ...(e.removed.length > 0 && { files_removed: [...e.removed] }),
  };
}
//@ chunk-hag5hcx6.js:4264-4368 placement
function pinRemovedPaths(e, r, n, s) {
  if (!pathPinOn()) return;
  let a = b(e);
  for (let o of n) w(a, o, { sha256: null, ver: r, via: "list" }, s);
}
//@ chunk-hag5hcx6.js:4368-4437 placement
function reconcilePins(e, r, n, s) {
  if (!pathPinOn() || n.length === 0) return;
  diffPinnedPaths(b(e), r, s, n, !1);
}
//@ chunk-hag5hcx6.js:4437-4571 placement
function makeRemovedPathPinner(e, r, n) {
  let mapped = n.filter((o) => o.liveSha256 === null).map((o) => o.path);
  if (mapped.length === 0) return;
  let a = nextPathPinSeq();
  return () => pinRemovedPaths(e, r, mapped, a);
}
//@ chunk-hag5hcx6.js:4571-4709 placement
function orderChangedPaths(e) {
  let filtered = e.filter((n) => n.kind === "changed");
  return [...filtered.filter((n) => n.liveSha256 === null), ...filtered.filter((n) => n.liveSha256 !== null)];
}
//@ chunk-hag5hcx6.js:4709-5327 placement
function publishPathChanges(e) {
  let r = [],
    n = [
      ...e.writes.map((write) => ({ ...write, operation: "write" })),
      ...e.removes.map((remove) => ({ path: remove, operation: "remove", sha256: void 0 })),
    ];
  for (let { path: path, operation: operation, sha256: sha256 } of n) {
    if (e.liveDocs?.has(path)) continue;
    let l = e.pins?.get(path),
      d = e.live.get(path) ?? null;
    if (l === void 0) {
      if (d === null || e.acknowledged.has(path)) continue;
      if (operation === "write" && sha256 === d) continue;
      r.push({ kind: "unread", path: path, operation: operation });
      continue;
    }
    if (l.sha256 === d) continue;
    if (operation === "write" && sha256 !== void 0 && sha256 === d) continue;
    if (operation === "remove" && d === null) continue;
    r.push({
      kind: "changed",
      path: path,
      operation: operation,
      readSha256: l.sha256,
      readVer: l.ver,
      readVia: l.via,
      liveSha256: d,
    });
  }
  return r;
}
//@ chunk-hag5hcx6.js:5327-5369 placement
function T(e, r) {
  return jsonStringify(e.core ? collapseArtifactAction(r) : r);
}
//@ chunk-hag5hcx6.js:5369-5450 placement
function H(e) {
  return e.core ? 'action "read" with its `path`' : 'action "read_file"';
}
//@ chunk-hag5hcx6.js:5450-5785 placement
function currentFileState(e, r) {
  let n = r.files.get(e);
  if (n === void 0)
    return "  now: deleted; publishing this path again creates it afresh, so do that only if the user wants it back";
  let s = n.sizeBytes === void 0 ? "" : `, ${n.sizeBytes} ${plural(n.sizeBytes, "byte")}`;
  return `  now: sha256 ${n.sha256}${s}; read it with ${T(r, { action: "read_file", url: r.url, path: e })}`;
}
//@ chunk-hag5hcx6.js:5785-6233 placement
function describePinnedState(e, r, n) {
  let s =
      e.readSha256 !== null
        ? `you last saw it at version ${e.readVer}`
        : e.readVia === "publish"
          ? `you removed it at version ${e.readVer}`
          : `it was gone when you last checked (version ${e.readVer})`,
    a =
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
  let s = `- ${r > 0 ? `and ${e.length - r} more` : `${e.length} ${plural(e.length, "path")}, not named here`}: ${T(n, { action: "list_files", url: n.url })} lists every file with its size`;
  return r > 0
    ? `${e.slice(0, r).join(`
`)}
${s}`
    : s;
}
//@ chunk-hag5hcx6.js:6497-7620 placement
function stalePathsMessage(e, r, n) {
  let s = orderChangedPaths(e),
    filtered = e.filter((d) => d.kind === "unread"),
    o = [
      s.length > 0
        ? `${STALE_PUBLISH_HEADLINE}, and sending your copy would replace a newer edit.`
        : `${STALE_PUBLISH_HEADLINE}, and sending your copy could discard content you have not read.`,
    ],
    min = Math.min(s.length, PATH_PIN_LIMITS);
  if (s.length > 0) {
    let any = s.some((h) => h.liveSha256 === null);
    o.push(`${CHANGED_SINCE_SEEN_LABEL}
${listWithOverflow(
  s.map((h) => describePinnedState(h, r, n)),
  min,
  n,
)}
Read each one${any ? " that still exists" : ""} again (${H(n)}), re-apply your change to what it holds now, and publish again${any ? "; a deleted one needs no read" : ""}. Never resend your earlier copy.${n.forced ? " `force` does not override this." : ""}${n.remembered ? ' The live file list could not be read for this publish, so each "now" line and its version are from an earlier listing or publish result in this session; the reads will show what is there now.' : ""}`);
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
Read each one first (${H(n)}) and build on it.${n.ackOffered === !1 ? " Do so even when the user wants the file replaced outright." : " Only when the user asked for the file to be replaced without looking, name it in `overwrite_unread`."}`);
  return o.join(`

`);
}
/**
 * 发布前检查路径固定（path pins）：列出 artifact 当前文件并对比本会话读到/发布过的版本，有未读更改则拒绝发布。
 */
//@ chunk-hag5hcx6.js:7620-9946 placement
async function checkPathPins(e) {
  if (e.writes.length === 0 && e.removes.length === 0) return { kind: "pass", liveVer: void 0 };
  let r = nextPathPinSeq(),
    n = await listArtifactFiles(e.target, e.signal, e.credentials);
  if (n.kind === "error") {
    if (
      (logForDebugging(`[artifact] path pins: no listing (${n.reason}) slug=${e.target.slug}`),
      n.reason === "single_page")
    )
      return { kind: "pass", liveVer: void 0 };
    let d = getLiveState().pathPins.get(e.target.slug),
      h = new Set(),
      u = new Map(),
      P = new Map(),
      m = "";
    for (let c of [...e.writes.map((write) => write.path), ...e.removes]) {
      let p = d?.get(c)?.behind;
      if (p === void 0) continue;
      if ((h.add(c), p.sha256 !== null))
        (u.set(c, p.sha256),
          P.set(c, { sha256: p.sha256, ...(p.sizeBytes !== void 0 && { sizeBytes: p.sizeBytes }) }));
      if (m === "" || (compareNumericPrefix(p.ver, m) ?? 1) > 0) m = p.ver;
    }
    let v = publishPathChanges({
      pins: d,
      live: u,
      writes: e.writes.filter((write) => h.has(write.path)),
      removes: e.removes.filter((remove) => h.has(remove)),
      acknowledged: new Set(e.acknowledged),
    });
    if (
      (logFeatureSad(
        "artifact_path_pin",
        v.length === 0 ? `skipped_${n.reason}` : `refused_without_listing_${n.reason}`,
      ),
      v.length === 0)
    )
      return { kind: "pass", liveVer: void 0 };
    return {
      kind: "refuse",
      reasonCode: "path_pin_changed",
      message: stalePathsMessage(v, m, {
        url: e.url ?? artifactViewerUrlFor(e.target),
        files: P,
        core: isArtifactToolsetSplit(),
        forced: e.force === !0,
        ackOffered: k(),
        remembered: !0,
      }),
      onCommitted: makeRemovedPathPinner(e.target.slug, m, orderChangedPaths(v).slice(0, PATH_PIN_LIMITS)),
    };
  }
  let s = getLiveState().pathPins.get(e.target.slug);
  if (s !== void 0) diffPinnedPaths(s, n.ver, r, n.files, !n.narrowed);
  let a = new Map(n.files.map((file) => [file.path, file.sha256])),
    o = new Set(n.files.filter((file) => file.live).map((d) => d.path)),
    l = publishPathChanges({
      pins: s,
      live: a,
      liveDocs: o,
      writes: e.writes,
      removes: e.removes,
      acknowledged: new Set(e.acknowledged),
    });
  if (
    (logFeatureOk("artifact_path_pin", { checked: e.writes.length + e.removes.length, refused: l.length }),
    l.length === 0)
  ) {
    let d = n.publishPreconditions === !0 ? collectPinnedHashes(a, o, e.writes, e.removes) : void 0,
      mapped = e.writes
        .filter(
          (write) => write.sha256 !== void 0 && !o.has(write.path) && a.get(write.path) === write.sha256,
        )
        .map((u) => u.path);
    return {
      kind: "pass",
      liveVer: n.ver,
      ...(mapped.length > 0 && { unchanged: mapped }),
      ...(!n.narrowed && {
        liveOwnPaths: n.files.map((file) => file.path).filter((u) => n.typePaths?.includes(u) !== !0),
      }),
      ...(n.title !== void 0 && { liveTitle: n.title }),
      ...(n.favicon !== void 0 && { liveFavicon: n.favicon }),
      ...(d !== void 0 && { preconditions: d }),
    };
  }
  return {
    kind: "refuse",
    reasonCode: l.some((d) => d.kind === "changed") ? "path_pin_changed" : "path_pin_unread",
    message: stalePathsMessage(l, n.ver, {
      url: e.url ?? artifactViewerUrlFor(e.target),
      files: new Map(n.files.map((file) => [file.path, { sha256: file.sha256, sizeBytes: file.sizeBytes }])),
      core: isArtifactToolsetSplit(),
      forced: e.force === !0,
      ackOffered: k(),
    }),
    onCommitted: makeRemovedPathPinner(e.target.slug, n.ver, orderChangedPaths(l).slice(0, PATH_PIN_LIMITS)),
  };
}
//@ chunk-hag5hcx6.js:9946-10126 placement
function collectPinnedHashes(e, r, n, s) {
  let a = new Map();
  for (let { path: path } of n) {
    if (r.has(path)) return;
    a.set(path, e.get(path) ?? null);
  }
  for (let o of s) {
    let l = e.get(o);
    if (l === void 0 || r.has(o)) return;
    a.set(o, l);
  }
  return a;
}
//@ chunk-hag5hcx6.js:10126-10689 placement
function pathPinTelemetry(e) {
  let r = getLiveState().pathPins.get(e.target.slug),
    mapped = e.paths.map((path) => {
      let o = r?.get(path.path),
        l = e.removes.includes(path.path) ? "remove" : "write";
      return o !== void 0 && o.sha256 === path.expected
        ? {
            kind: "changed",
            path: path.path,
            operation: l,
            readSha256: path.expected,
            readVer: o.ver,
            readVia: o.via,
            liveSha256: path.actual,
          }
        : { kind: "unread", path: path.path, operation: l };
    }),
    s = new Map();
  for (let path of e.paths) if (path.actual !== null) s.set(path.path, { sha256: path.actual });
  return {
    message: stalePathsMessage(mapped, e.liveVer, {
      url: e.url ?? artifactViewerUrlFor(e.target),
      files: s,
      core: isArtifactToolsetSplit(),
      ackOffered: k(),
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
  RDo,
  pathPinTelemetry,
  pinPublishedPaths,
  publishPinFields,
  reconcilePins,
  pinRemovedPaths,
  isPathPinActive,
  parsePathPinRefusal,
};
