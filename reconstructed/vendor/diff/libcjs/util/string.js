/**
 * diff/libcjs/util/string.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: diff@9.0.0
 * pieces: chunk-7vb8p3zb.js (12)
 * attribution: esm-layout 6, esm-fingerprint 6
 */

//@ chunk-7vb8p3zb.js:3027-3138 esm-layout
function longestCommonPrefix(str1, str2) {
  let i;
  for (i = 0; i < str1.length && i < str2.length; i++) if (str1[i] != str2[i]) return str1.slice(0, i);
  return str1.slice(0, i);
}
//@ chunk-7vb8p3zb.js:3138-3322 esm-layout
function longestCommonSuffix(str1, str2) {
  let i;
  if (!str1 || !str2 || str1[str1.length - 1] != str2[str2.length - 1]) return "";
  for (i = 0; i < str1.length && i < str2.length; i++)
    if (str1[str1.length - (i + 1)] != str2[str2.length - (i + 1)]) return str1.slice(-i);
  return str1.slice(-i);
}
//@ chunk-7vb8p3zb.js:3322-3498 esm-fingerprint
function replacePrefix(string, oldPrefix, newPrefix) {
  if (string.slice(0, oldPrefix.length) != oldPrefix)
    throw Error(
      `string ${JSON.stringify(string)} doesn't start with prefix ${JSON.stringify(oldPrefix)}; this is a bug`,
    );
  return newPrefix + string.slice(oldPrefix.length);
}
//@ chunk-7vb8p3zb.js:3498-3691 esm-fingerprint
function replaceSuffix(string, oldSuffix, newSuffix) {
  if (!oldSuffix) return string + newSuffix;
  if (string.slice(-oldSuffix.length) != oldSuffix)
    throw Error(
      `string ${JSON.stringify(string)} doesn't end with suffix ${JSON.stringify(oldSuffix)}; this is a bug`,
    );
  return string.slice(0, -oldSuffix.length) + newSuffix;
}
//@ chunk-7vb8p3zb.js:3691-3724 esm-layout
function W(string, oldPrefix) {
  return replacePrefix(string, oldPrefix, "");
}
//@ chunk-7vb8p3zb.js:3724-3757 esm-layout
function y(string, oldSuffix) {
  return replaceSuffix(string, oldSuffix, "");
}
//@ chunk-7vb8p3zb.js:3757-3798 esm-layout
function maximumOverlap(string1, string2) {
  return string2.slice(0, overlapCount(string1, string2));
}
//@ chunk-7vb8p3zb.js:3798-4128 esm-layout
function overlapCount(a, b) {
  let startA = 0;
  if (a.length > b.length) startA = a.length - b.length;
  let endB = b.length;
  if (a.length < b.length) endB = a.length;
  let map = Array(endB);
  let k = 0;
  map[0] = 0;
  for (let j = 1; j < endB; j++) {
    if (b[j] == b[k]) map[j] = map[k];
    else map[j] = k;
    while (k > 0 && b[j] != b[k]) k = map[k];
    if (b[j] == b[k]) k++;
  }
  k = 0;
  for (let i = startA; i < a.length; i++) {
    while (k > 0 && a[i] != b[k]) k = map[k];
    if (a[i] == b[k]) k++;
  }
  return k;
}
//@ chunk-7vb8p3zb.js:4128-4301 esm-fingerprint
function segment(string, segmenter) {
  let parts = [];
  for (let segmentObj of Array.from(segmenter.segment(string))) {
    let segment = segmentObj.segment;
    if (parts.length && /\s/.test(parts[parts.length - 1]) && /\s/.test(segment))
      parts[parts.length - 1] += segment;
    else parts.push(segment);
  }
  return parts;
}
//@ chunk-7vb8p3zb.js:4301-4422 esm-fingerprint
function trailingWs(string, segmenter) {
  if (segmenter) return leadingAndTrailingWs(string, segmenter)[1];
  let i;
  for (i = string.length - 1; i >= 0; i--) if (!string[i].match(/\s/)) break;
  return string.substring(i + 1);
}
//@ chunk-7vb8p3zb.js:4422-4499 esm-fingerprint
function leadingWs(string, segmenter) {
  if (segmenter) return leadingAndTrailingWs(string, segmenter)[0];
  let match = string.match(/^\s*/);
  return match ? match[0] : "";
}
//@ chunk-7vb8p3zb.js:4499-4740 esm-fingerprint
function leadingAndTrailingWs(string, segmenter) {
  if (!segmenter) return [leadingWs(string), trailingWs(string)];
  if (segmenter.resolvedOptions().granularity != "word")
    throw Error('The segmenter passed must have a granularity of "word"');
  let segments = segment(string, segmenter);
  let firstSeg = segments[0];
  let lastSeg = segments[segments.length - 1];
  let head = /\s/.test(firstSeg) ? firstSeg : "";
  let tail = /\s/.test(lastSeg) ? lastSeg : "";
  return [head, tail];
}
export {
  segment,
  leadingAndTrailingWs,
  longestCommonPrefix,
  replaceSuffix,
  W,
  longestCommonSuffix,
  replacePrefix,
  y,
  leadingWs,
  trailingWs,
  maximumOverlap,
};
