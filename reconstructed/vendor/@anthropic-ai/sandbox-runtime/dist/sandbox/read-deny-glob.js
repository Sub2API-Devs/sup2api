/**
 * @anthropic-ai/sandbox-runtime/dist/sandbox/read-deny-glob.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sandbox-runtime@0.0.81
 * pieces: chunk-fq0cr76a.js (4)
 * attribution: esm-layout 1, esm-fingerprint 3
 */
import { Rwn, fsr, Dqt, sS, oS } from "./sandbox-utils.js";
import { At } from "../utils/debug.js";

//@ chunk-fq0cr76a.js:756340-756351 esm-layout
var f1 = 256;
//@ chunk-fq0cr76a.js:756351-756403 esm-fingerprint
function p1(e) {
  return e.slice(0, e.lastIndexOf("/"));
}
//@ chunk-fq0cr76a.js:756403-756612 esm-fingerprint
function V8({ locations: locations, reExposedPaths: reExposedPaths }) {
  let sorted = [...new Set(locations)].sort(),
    s = new Set();
  for (let h of sorted) {
    let y = reExposedPaths.has(h),
      b = !1;
    for (let S of Rwn(h)) {
      if (reExposedPaths.has(S)) y = !0;
      if (s.has(S)) {
        b = !0;
        break;
      }
    }
    if (!b || y) s.add(h);
  }
  return s;
}
//@ chunk-fq0cr76a.js:756612-758463 esm-fingerprint
function* zE(e, n, r, s = {}) {
  let h = yield* fsr(e, {
      withDirectoryForm: !0,
      followSymlinkedDirectories: !0,
      anchor: s.anchor,
      listings: s.listings,
    }),
    y = (V) => h.realOf.get(V) ?? V,
    b = new Set([...h.matches, ...h.unlisted]);
  if (h.directoryMatches.length > 0) {
    let V = new Set(h.matches.map((matche) => p1(y(matche))));
    for (let directoryMatche of h.directoryMatches)
      if (V.has(y(directoryMatche)) || h.symlinks.has(directoryMatche)) b.add(directoryMatche);
  }
  let S = new Set(),
    w = [],
    R = new Map(),
    D = (V, K) => {
      if ((S.add(V), !R.has(V))) R.set(V, K);
    };
  for (let V of b) {
    if (h.symlinks.has(V) && !h.realOf.has(V)) {
      if (!h.uninspectableLinks.has(V)) {
        At(`[Sandbox Linux] denyRead glob "${e}": ${V} does not resolve, skipping`);
        continue;
      }
      (At(
        `[Sandbox Linux] denyRead glob "${e}": ${V} leads somewhere that cannot be inspected; denying what holds it`,
        { level: "warn" },
      ),
        w.push(V));
      continue;
    }
    let K = y(V);
    if (K !== "/") {
      D(K, V);
      continue;
    }
    let q = y(p1(V));
    if (q === "" || q === "/") {
      At(`[Sandbox Linux] denyRead glob "${e}": ${V} resolves to / and nothing but / holds it, skipping`, {
        level: "warn",
      });
      continue;
    }
    (At(`[Sandbox Linux] denyRead glob "${e}": ${V} resolves to /; denying ${q}, which holds it, instead`, {
      level: "warn",
    }),
      D(q, V));
  }
  let O = new Set(n.flatMap((V) => Dqt(sS(V, { literal: !0 })))),
    L = V8({ locations: S, reExposedPaths: O });
  for (let V of h.unlisted) {
    let K = y(V);
    if (L.has(K)) {
      r?.add(K);
      continue;
    }
    for (let q of Rwn(K))
      if (L.has(q)) {
        r?.add(q);
        break;
      }
  }
  At(`[Sandbox Linux] Expanded denyRead glob "${e}": ${h.matches.length} matches -> ${L.size} mounts`);
  for (let V of L)
    if (h.baseLocation !== "" && !oS(V, h.baseLocation))
      At(
        `[Sandbox Linux] denyRead glob "${e}" hides ${V}, outside ${h.baseLocation}: reached through ${R.get(V) === V ? "a symlinked directory" : R.get(V)}`,
        { level: "warn" },
      );
  if (L.size > f1)
    At(
      `[Sandbox Linux] denyRead glob "${e}" still needs ${L.size} mounts after collapsing (threshold ${f1}); each is a separate bwrap mount at sandbox start. Prefer denying the enclosing directories.`,
      { level: "warn" },
    );
  return [...L, ...w].sort();
}

export { zE };
