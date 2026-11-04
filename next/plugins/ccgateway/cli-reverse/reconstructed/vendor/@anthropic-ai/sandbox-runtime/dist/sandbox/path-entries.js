/**
 * @anthropic-ai/sandbox-runtime/dist/sandbox/path-entries.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sandbox-runtime@0.0.81
 * pieces: chunk-fq0cr76a.js (19)
 * attribution: esm-fingerprint 19
 */
import * as pathModule_2 from "path";
import "path";
import "path";
import "path";
import "path";
import "fs";
import * as fsModule_2 from "fs";
import "fs";
import "fs";
import "fs";
import "fs";
import "fs";
import {
  markedLiteralPath,
  stripExtendedPathPrefix,
  expandWindowsEnvRefs,
  isUncPath,
  expandTilde,
  toForwardSlashes,
  collapseInteriorSpellings,
  isAbsenceErrno,
  containsGlobCharsForPlatform,
  removeTrailingGlobSuffix,
  containsGlobChars,
  normalizePathForSandbox,
} from "./sandbox-utils.js";
import { getPlatform as getPlatform_2 } from "../utils/platform.js";

//@ chunk-fq0cr76a.js:639960-640088 esm-fingerprint
function splitPathEntries(entries) {
  let spelled = [];
  let marked = [];
  for (let entry of entries ?? [])
    if (typeof entry === "string") spelled.push(entry);
    else marked.push(markedLiteralPath(entry));
  return {
    spelled,
    marked,
  };
}
//@ chunk-fq0cr76a.js:640088-640124 esm-fingerprint
function spelledOf(entries) {
  return splitPathEntries(entries).spelled;
}
//@ chunk-fq0cr76a.js:640124-640284 esm-fingerprint
function samePathEntries(a, b) {
  let key = (entry) => (typeof entry === "string" ? `s:${entry}` : `l:${markedLiteralPath(entry)}`);
  if (a.length !== b.length) return false;
  let keys = new Set(a.map(key));
  return b.every((entry) => keys.has(key(entry)));
}
//@ chunk-fq0cr76a.js:640284-640455 esm-fingerprint
function spelledAbsolute(spelling) {
  let onWindows = getPlatform_2() === "windows";
  let spelled = spelling;
  if (onWindows) {
    spelled = stripExtendedPathPrefix(expandWindowsEnvRefs(spelled));
    if (isUncPath(spelled)) return;
  }
  let expanded = expandTilde(spelled);
  let absolute =
    expanded === spelled && !pathModule_2.isAbsolute(spelled)
      ? pathModule_2.resolve(process.cwd(), spelled)
      : expanded;
  return onWindows ? toForwardSlashes(absolute) : collapseInteriorSpellings(absolute);
}
//@ chunk-fq0cr76a.js:640455-640524 esm-fingerprint
function mayBeThere(p) {
  try {
    fsModule_2.lstatSync(p);
    return true;
  } catch (err) {
    return !isAbsenceErrno(err);
  }
}
//@ chunk-fq0cr76a.js:640524-640599 esm-fingerprint
function isThereUnlinked(p) {
  try {
    return !fsModule_2.lstatSync(p).isSymbolicLink();
  } catch {
    return false;
  }
}
//@ chunk-fq0cr76a.js:640599-640735 esm-fingerprint
function isDirectoryFor(kind, p) {
  try {
    return kind === "allow" ? fsModule_2.lstatSync(p).isDirectory() : fsModule_2.statSync(p).isDirectory();
  } catch (err) {
    return kind === "deny" && !isAbsenceErrno(err);
  }
}
//@ chunk-fq0cr76a.js:640735-641471 esm-fingerprint
function literalReadings(spelling, kind, opts = {}) {
  let isPattern = opts.isPattern ?? containsGlobCharsForPlatform;
  let stripped = removeTrailingGlobSuffix(spelling);
  if (!isPattern(stripped)) {
    if (stripped === spelling || !containsGlobChars(stripped)) return [];
    stripped = spelling;
  }
  let spelled = spelledAbsolute(stripped);
  if (spelled === undefined) return [];
  let parts = spelled.split("/");
  let globAt = parts.flatMap((part, i) => (containsGlobChars(part) ? [i] : []));
  let first = globAt[0];
  let last = globAt[globAt.length - 1];
  if (first === undefined || last === undefined) return [];
  let prefix = (i) => parts.slice(0, i + 1).join("/") || "/";
  let isThere = kind === "deny" ? mayBeThere : isThereUnlinked;
  let reach = first - 1;
  while (reach < last && isThere(prefix(reach + 1))) reach++;
  if (reach < first) return [];
  let readings = [];
  if (reach === last && (kind === "deny" || restIsUnlinked(last, parts.length - 1, prefix)))
    readings.push({
      glob: false,
      path: normalizePathForSandbox(stripped, {
        literal: true,
      }),
    });
  let setAside = stripped === spelling ? "" : "/**";
  for (let n = globAt.length - 2; n >= 0; n--) {
    let at = globAt[n];
    if (at > reach) continue;
    let next = globAt[n + 1];
    let end = Math.min(next - 1, reach);
    while (end >= at && !isDirectoryFor(kind, prefix(end))) end--;
    if (end < at) continue;
    if (kind === "allow" && !restIsUnlinked(end, next - 1, prefix)) continue;
    let anchor = normalizePathForSandbox(prefix(end), {
      literal: true,
    });
    readings.push({
      glob: true,
      anchor,
      path: anchor + spelled.slice(prefix(end).length) + setAside,
    });
  }
  return readings;
}
//@ chunk-fq0cr76a.js:641471-641597 esm-fingerprint
function restIsUnlinked(from, to, prefix) {
  for (let i = from + 1; i <= to; i++)
    try {
      if (fsModule_2.lstatSync(prefix(i)).isSymbolicLink()) return false;
    } catch (err) {
      return isAbsenceErrno(err);
    }
  return true;
}
//@ chunk-fq0cr76a.js:641597-641648 esm-fingerprint
function hasNameReading(spelling, kind) {
  return literalReadings(spelling, kind).some((reading) => !reading.glob);
}
//@ chunk-fq0cr76a.js:641648-641843 esm-fingerprint
function* withOtherReadings(spelling, name, kind, expandGlob) {
  let expansion = yield* expandGlob(spelling);
  let seen = new Set(expansion);
  let added = [];
  for (let reading of literalReadings(spelling, kind)) {
    let found = reading.glob ? yield* expandGlob(reading.path, reading.anchor) : [name];
    for (let p of found) {
      if (seen.has(p)) continue;
      seen.add(p);
      added.push(p);
    }
  }
  return [...expansion, ...added];
}
//@ chunk-fq0cr76a.js:641843-642044 esm-fingerprint
function readRulesOf(denyRead, allowRead, credentialDenies) {
  let withNames = (entries, kind) => [
    ...entries,
    ...spelledOf(entries).flatMap((spelling) =>
      literalReadings(spelling, kind).flatMap((reading) =>
        reading.glob
          ? []
          : [
              {
                path: reading.path,
                literal: true,
              },
            ],
      ),
    ),
  ];
  return {
    denyRead: withNames([...denyRead, ...credentialDenies], "deny"),
    allowRead: allowRead === undefined ? undefined : withNames(allowRead, "allow"),
  };
}
//@ chunk-fq0cr76a.js:642044-642131 esm-fingerprint
function nonEmptyLists(lists) {
  return Object.fromEntries(Object.entries(lists).filter(([, list]) => list.length > 0));
}
//@ chunk-fq0cr76a.js:642131-642226 esm-fingerprint
function literalReadLists(denyRead, allowRead) {
  return nonEmptyLists({
    literalDenyOnly: splitPathEntries(denyRead).marked,
    literalAllowWithinDeny: splitPathEntries(allowRead).marked,
  });
}
//@ chunk-fq0cr76a.js:642226-642322 esm-fingerprint
function literalWriteLists(allowWrite, denyWrite) {
  return nonEmptyLists({
    literalAllowOnly: splitPathEntries(allowWrite).marked,
    literalDenyWithinAllow: splitPathEntries(denyWrite).marked,
  });
}
//@ chunk-fq0cr76a.js:642322-642390 esm-fingerprint
function writeRootsOf(config) {
  return [...(config.allowOnly || []), ...(config.literalAllowOnly ?? [])];
}
//@ chunk-fq0cr76a.js:642390-642447 esm-fingerprint
function reExposedBy(expandedAllowRead, allowRead, writeConfig) {
  return [...expandedAllowRead, ...splitPathEntries(allowRead).marked, ...writeRootsOf(writeConfig)];
}
//@ chunk-fq0cr76a.js:642447-642664 esm-fingerprint
function readNamesOf(config) {
  if (!config) return config;
  let { literalDenyOnly, literalAllowWithinDeny, ...rest } = config;
  return {
    ...rest,
    denyOnly: [...(config.denyOnly || []), ...(literalDenyOnly ?? [])],
    ...(config.allowWithinDeny || literalAllowWithinDeny
      ? {
          allowWithinDeny: [...(config.allowWithinDeny ?? []), ...(literalAllowWithinDeny ?? [])],
        }
      : {}),
  };
}
//@ chunk-fq0cr76a.js:642664-642913 esm-fingerprint
function writeNamesOf(config) {
  if (!config) return config;
  let { literalAllowOnly, literalDenyWithinAllow, ...rest } = config;
  return {
    ...rest,
    allowOnly: writeRootsOf({
      allowOnly: (config.allowOnly || []).filter((p) => !containsGlobChars(p) || hasNameReading(p, "allow")),
      literalAllowOnly,
    }),
    denyWithinAllow: [...(config.denyWithinAllow || []), ...(literalDenyWithinAllow ?? [])],
  };
}
export {
  writeRootsOf,
  readRulesOf,
  spelledOf,
  withOtherReadings,
  hasNameReading,
  reExposedBy,
  literalReadLists,
  literalWriteLists,
  samePathEntries,
  readNamesOf,
  writeNamesOf,
  literalReadings,
};
