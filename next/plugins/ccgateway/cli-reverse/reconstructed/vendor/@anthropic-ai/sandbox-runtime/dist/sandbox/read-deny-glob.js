/**
 * @anthropic-ai/sandbox-runtime/dist/sandbox/read-deny-glob.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sandbox-runtime@0.0.81
 * pieces: chunk-fq0cr76a.js (4)
 * attribution: esm-layout 1, esm-fingerprint 3
 */
import {
  properAncestors,
  walkGlobPatternSteps,
  pathSpellingVariants,
  normalizePathForSandbox,
  isAtOrUnder,
} from "./sandbox-utils.js";
import { logForDebugging as logForDebugging_2 } from "../utils/debug.js";

//@ chunk-fq0cr76a.js:756340-756351 esm-layout
var READ_DENY_GLOB_MOUNT_WARN_THRESHOLD = 256;
//@ chunk-fq0cr76a.js:756351-756403 esm-fingerprint
function parentOf(p) {
  return p.slice(0, p.lastIndexOf("/"));
}
//@ chunk-fq0cr76a.js:756403-756612 esm-fingerprint
function collapseReadDenyLocations({ locations, reExposedPaths }) {
  let sorted = [...new Set(locations)].sort();
  let kept = new Set();
  for (let location of sorted) {
    let reExposedBetween = reExposedPaths.has(location);
    let hidden = false;
    for (let ancestor of properAncestors(location)) {
      if (reExposedPaths.has(ancestor)) reExposedBetween = true;
      if (kept.has(ancestor)) {
        hidden = true;
        break;
      }
    }
    if (!hidden || reExposedBetween) kept.add(location);
  }
  return kept;
}
//@ chunk-fq0cr76a.js:756612-758463 esm-fingerprint
function* expandReadDenyGlobLinuxSteps(globPattern, reExposedPaths, unlistableDirs, opts = {}) {
  let walk = yield* walkGlobPatternSteps(globPattern, {
    withDirectoryForm: true,
    followSymlinkedDirectories: true,
    anchor: opts.anchor,
    listings: opts.listings,
  });
  let locationOf = (p) => walk.realOf.get(p) ?? p;
  let candidates = new Set([...walk.matches, ...walk.unlisted]);
  if (walk.directoryMatches.length > 0) {
    let holdMatches = new Set(walk.matches.map((m) => parentOf(locationOf(m))));
    for (let dir of walk.directoryMatches)
      if (holdMatches.has(locationOf(dir)) || walk.symlinks.has(dir)) candidates.add(dir);
  }
  let locations = new Set();
  let spelledLinks = [];
  let namedBy = new Map();
  let addLocation = (location, candidate) => {
    locations.add(location);
    if (!namedBy.has(location)) namedBy.set(location, candidate);
  };
  for (let candidate of candidates) {
    if (walk.symlinks.has(candidate) && !walk.realOf.has(candidate)) {
      if (!walk.uninspectableLinks.has(candidate)) {
        logForDebugging_2(
          `[Sandbox Linux] denyRead glob "${globPattern}": ${candidate} does not resolve, skipping`,
        );
        continue;
      }
      logForDebugging_2(
        `[Sandbox Linux] denyRead glob "${globPattern}": ${candidate} leads somewhere that cannot be inspected; denying what holds it`,
        {
          level: "warn",
        },
      );
      spelledLinks.push(candidate);
      continue;
    }
    let location = locationOf(candidate);
    if (location !== "/") {
      addLocation(location, candidate);
      continue;
    }
    let standIn = locationOf(parentOf(candidate));
    if (standIn === "" || standIn === "/") {
      logForDebugging_2(
        `[Sandbox Linux] denyRead glob "${globPattern}": ${candidate} resolves to / and nothing but / holds it, skipping`,
        {
          level: "warn",
        },
      );
      continue;
    }
    logForDebugging_2(
      `[Sandbox Linux] denyRead glob "${globPattern}": ${candidate} resolves to /; denying ${standIn}, which holds it, instead`,
      {
        level: "warn",
      },
    );
    addLocation(standIn, candidate);
  }
  let reExposed = new Set(
    reExposedPaths.flatMap((p) =>
      pathSpellingVariants(
        normalizePathForSandbox(p, {
          literal: true,
        }),
      ),
    ),
  );
  let mounts = collapseReadDenyLocations({
    locations,
    reExposedPaths: reExposed,
  });
  for (let unlisted of walk.unlisted) {
    let location = locationOf(unlisted);
    if (mounts.has(location)) {
      unlistableDirs?.add(location);
      continue;
    }
    for (let ancestor of properAncestors(location))
      if (mounts.has(ancestor)) {
        unlistableDirs?.add(ancestor);
        break;
      }
  }
  logForDebugging_2(
    `[Sandbox Linux] Expanded denyRead glob "${globPattern}": ${walk.matches.length} matches -> ${mounts.size} mounts`,
  );
  for (let mount of mounts)
    if (walk.baseLocation !== "" && !isAtOrUnder(mount, walk.baseLocation))
      logForDebugging_2(
        `[Sandbox Linux] denyRead glob "${globPattern}" hides ${mount}, outside ${walk.baseLocation}: reached through ${namedBy.get(mount) === mount ? "a symlinked directory" : namedBy.get(mount)}`,
        {
          level: "warn",
        },
      );
  if (mounts.size > READ_DENY_GLOB_MOUNT_WARN_THRESHOLD)
    logForDebugging_2(
      `[Sandbox Linux] denyRead glob "${globPattern}" still needs ${mounts.size} mounts after collapsing (threshold ${READ_DENY_GLOB_MOUNT_WARN_THRESHOLD}); each is a separate bwrap mount at sandbox start. Prefer denying the enclosing directories.`,
      {
        level: "warn",
      },
    );
  return [...mounts, ...spelledLinks].sort();
}
export { expandReadDenyGlobLinuxSteps };
