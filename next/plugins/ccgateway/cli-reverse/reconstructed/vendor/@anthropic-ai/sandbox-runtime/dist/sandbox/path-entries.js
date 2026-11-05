/**
 * @anthropic-ai/sandbox-runtime/dist/sandbox/path-entries.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @anthropic-ai/sandbox-runtime@0.0.81
 * pieces: chunk-qg41pqt6.js (19)
 * attribution: esm-fingerprint 19
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
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

//@ chunk-qg41pqt6.js:640445-640573 esm-fingerprint
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
//@ chunk-qg41pqt6.js:640573-640609 esm-fingerprint
function spelledOf(entries) {
  return splitPathEntries(entries).spelled;
}
//@ chunk-qg41pqt6.js:640609-640769 esm-fingerprint
function samePathEntries(a, b) {
  let key = (entry) => (typeof entry === "string" ? `s:${entry}` : `l:${markedLiteralPath(entry)}`);
  if (a.length !== b.length) return false;
  let keys = new Set(a.map(key));
  return b.every((entry) => keys.has(key(entry)));
}
//@ chunk-qg41pqt6.js:640769-640940 esm-fingerprint
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
//@ chunk-qg41pqt6.js:640940-641009 esm-fingerprint
function mayBeThere(p) {
  try {
    fsModule_2.lstatSync(p);
    return true;
  } catch (err) {
    return !isAbsenceErrno(err);
  }
}
//@ chunk-qg41pqt6.js:641009-641084 esm-fingerprint
function isThereUnlinked(p) {
  try {
    return !fsModule_2.lstatSync(p).isSymbolicLink();
  } catch {
    return false;
  }
}
//@ chunk-qg41pqt6.js:641084-641220 esm-fingerprint
function isDirectoryFor(kind, p) {
  try {
    return kind === "allow" ? fsModule_2.lstatSync(p).isDirectory() : fsModule_2.statSync(p).isDirectory();
  } catch (err) {
    return kind === "deny" && !isAbsenceErrno(err);
  }
}
//@ chunk-qg41pqt6.js:641220-641965 esm-fingerprint
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
//@ chunk-qg41pqt6.js:641965-642091 esm-fingerprint
function restIsUnlinked(from, to, prefix) {
  for (let i = from + 1; i <= to; i++)
    try {
      if (fsModule_2.lstatSync(prefix(i)).isSymbolicLink()) return false;
    } catch (err) {
      return isAbsenceErrno(err);
    }
  return true;
}
//@ chunk-qg41pqt6.js:642091-642142 esm-fingerprint
function hasNameReading(spelling, kind) {
  return literalReadings(spelling, kind).some((reading) => !reading.glob);
}
//@ chunk-qg41pqt6.js:642142-642337 esm-fingerprint
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
//@ chunk-qg41pqt6.js:642337-642538 esm-fingerprint
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
//@ chunk-qg41pqt6.js:642538-642625 esm-fingerprint
function nonEmptyLists(lists) {
  return Object.fromEntries(Object.entries(lists).filter(([, list]) => list.length > 0));
}
//@ chunk-qg41pqt6.js:642625-642720 esm-fingerprint
function literalReadLists(denyRead, allowRead) {
  return nonEmptyLists({
    literalDenyOnly: splitPathEntries(denyRead).marked,
    literalAllowWithinDeny: splitPathEntries(allowRead).marked,
  });
}
//@ chunk-qg41pqt6.js:642720-642816 esm-fingerprint
function literalWriteLists(allowWrite, denyWrite) {
  return nonEmptyLists({
    literalAllowOnly: splitPathEntries(allowWrite).marked,
    literalDenyWithinAllow: splitPathEntries(denyWrite).marked,
  });
}
//@ chunk-qg41pqt6.js:642816-642884 esm-fingerprint
function writeRootsOf(config) {
  return [...(config.allowOnly || []), ...(config.literalAllowOnly ?? [])];
}
//@ chunk-qg41pqt6.js:642884-642941 esm-fingerprint
function reExposedBy(expandedAllowRead, allowRead, writeConfig) {
  return [...expandedAllowRead, ...splitPathEntries(allowRead).marked, ...writeRootsOf(writeConfig)];
}
//@ chunk-qg41pqt6.js:642941-643158 esm-fingerprint
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
//@ chunk-qg41pqt6.js:643158-643407 esm-fingerprint
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
  readNamesOf,
  writeNamesOf,
  writeRootsOf,
  readRulesOf,
  spelledOf,
  withOtherReadings,
  hasNameReading,
  reExposedBy,
  literalReadLists,
  literalWriteLists,
  samePathEntries,
  literalReadings,
};
