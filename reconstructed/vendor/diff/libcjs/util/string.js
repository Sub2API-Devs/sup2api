/**
 * diff/libcjs/util/string.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: diff@9.0.0
 * pieces: chunk-7vb8p3zb.js (12)
 * attribution: esm-layout 6, esm-fingerprint 6
 */

//@ chunk-7vb8p3zb.js:3027-3138 esm-layout
function H(n, e) {
  let t;
  for (t = 0; t < n.length && t < e.length; t++) if (n[t] != e[t]) return n.slice(0, t);
  return n.slice(0, t);
}
//@ chunk-7vb8p3zb.js:3138-3322 esm-layout
function b(n, e) {
  let t;
  if (!n || !e || n[n.length - 1] != e[e.length - 1]) return "";
  for (t = 0; t < n.length && t < e.length; t++)
    if (n[n.length - (t + 1)] != e[e.length - (t + 1)]) return n.slice(-t);
  return n.slice(-t);
}
//@ chunk-7vb8p3zb.js:3322-3498 esm-fingerprint
function I(n, e, t) {
  if (n.slice(0, e.length) != e)
    throw Error(`string ${JSON.stringify(n)} doesn't start with prefix ${JSON.stringify(e)}; this is a bug`);
  return t + n.slice(e.length);
}
//@ chunk-7vb8p3zb.js:3498-3691 esm-fingerprint
function T(n, e, t) {
  if (!e) return n + t;
  if (n.slice(-e.length) != e)
    throw Error(`string ${JSON.stringify(n)} doesn't end with suffix ${JSON.stringify(e)}; this is a bug`);
  return n.slice(0, -e.length) + t;
}
//@ chunk-7vb8p3zb.js:3691-3724 esm-layout
function W(n, e) {
  return I(n, e, "");
}
//@ chunk-7vb8p3zb.js:3724-3757 esm-layout
function y(n, e) {
  return T(n, e, "");
}
//@ chunk-7vb8p3zb.js:3757-3798 esm-layout
function A(n, e) {
  return e.slice(0, V(n, e));
}
//@ chunk-7vb8p3zb.js:3798-4128 esm-layout
function V(n, e) {
  let t = 0;
  if (n.length > e.length) t = n.length - e.length;
  let i = e.length;
  if (n.length < e.length) i = n.length;
  let l = Array(i),
    r = 0;
  l[0] = 0;
  for (let s = 1; s < i; s++) {
    if (e[s] == e[r]) l[s] = l[r];
    else l[s] = r;
    while (r > 0 && e[s] != e[r]) r = l[r];
    if (e[s] == e[r]) r++;
  }
  r = 0;
  for (let s = t; s < n.length; s++) {
    while (r > 0 && n[s] != e[r]) r = l[r];
    if (n[s] == e[r]) r++;
  }
  return r;
}
//@ chunk-7vb8p3zb.js:4128-4301 esm-fingerprint
function j(n, e) {
  let t = [];
  for (let i of Array.from(e.segment(n))) {
    let segment = i.segment;
    if (t.length && /\s/.test(t[t.length - 1]) && /\s/.test(segment)) t[t.length - 1] += segment;
    else t.push(segment);
  }
  return t;
}
//@ chunk-7vb8p3zb.js:4301-4422 esm-fingerprint
function O(n, e) {
  if (e) return k(n, e)[1];
  let t;
  for (t = n.length - 1; t >= 0; t--) if (!n[t].match(/\s/)) break;
  return n.substring(t + 1);
}
//@ chunk-7vb8p3zb.js:4422-4499 esm-fingerprint
function E(n, e) {
  if (e) return k(n, e)[0];
  let match = n.match(/^\s*/);
  return match ? match[0] : "";
}
//@ chunk-7vb8p3zb.js:4499-4740 esm-fingerprint
function k(n, e) {
  if (!e) return [E(n), O(n)];
  if (e.resolvedOptions().granularity != "word")
    throw Error('The segmenter passed must have a granularity of "word"');
  let t = j(n, e),
    i = t[0],
    l = t[t.length - 1],
    r = /\s/.test(i) ? i : "",
    s = /\s/.test(l) ? l : "";
  return [r, s];
}

export { j, k, H, T, W, b, I, y, E, O, A };
