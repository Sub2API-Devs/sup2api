/**
 * utils/cidr.ts
 *
 * 2.1.316 新增：解析 IPv6 地址为字节；IP 是否在 CIDR 段内。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-hq88884p.js (6)
 * attribution: placement 6
 */

/**
 * IP 是否在 CIDR 段内。
 */
//@ chunk-hq88884p.js:52152-52478 placement
function ipInCidr(e, r) {
  let index = r.lastIndexOf("/");
  if (index < 0) return !1;
  let sliced = r.slice(0, index),
    sliced_2 = r.slice(index + 1);
  if (!/^\d+$/.test(sliced_2)) return !1;
  let c = parseInt(sliced_2, 10),
    a = parseIpAddress(sliced);
  if (!a) return !1;
  if (a.zone) return !1;
  let u = parseIpAddress(e);
  if (!u) return !1;
  let l = unmapIpv4MappedIpv6(u.bytes),
    bytes = a.bytes;
  if (l.length !== bytes.length) return !1;
  let E = bytes.length * 8;
  if (c < 0 || c > E) return !1;
  return prefixBitsMatch(l, bytes, c);
}
//@ chunk-hq88884p.js:52478-52635 placement
function prefixBitsMatch(e, r, n) {
  let o = n >> 3;
  for (let a = 0; a < o; a++) if (e[a] !== r[a]) return !1;
  let s = n & 7;
  if (s === 0) return !0;
  let c = (255 << (8 - s)) & 255;
  return ((e[o] ?? 0) & c) === ((r[o] ?? 0) & c);
}
//@ chunk-hq88884p.js:52635-52774 placement
function unmapIpv4MappedIpv6(e) {
  if (e.length !== 16) return e;
  for (let r = 0; r < 10; r++) if (e[r] !== 0) return e;
  if (e[10] !== 255 || e[11] !== 255) return e;
  return e.slice(12);
}
//@ chunk-hq88884p.js:52774-53003 placement
function parseIpAddress(e) {
  if (e === "") return null;
  let r = "",
    n = e,
    index = e.indexOf("%");
  if (index >= 0) ((r = e.slice(index + 1)), (n = e.slice(0, index)));
  if (n.includes(":")) {
    let c = parseIpv6(n);
    return c ? { bytes: c, zone: r } : null;
  }
  if (r) return null;
  let s = parseIpv4(n);
  return s ? { bytes: s, zone: "" } : null;
}
//@ chunk-hq88884p.js:53003-53280 placement
function parseIpv4(e) {
  let parts = e.split(".");
  if (parts.length !== 4) return null;
  let uint8Array = new Uint8Array(4);
  for (let o = 0; o < 4; o++) {
    let s = parts[o];
    if (s === void 0 || s === "" || !/^\d{1,3}$/.test(s)) return null;
    if (s.length > 1 && s.startsWith("0")) return null;
    let c = parseInt(s, 10);
    if (c > 255) return null;
    uint8Array[o] = c;
  }
  return uint8Array;
}
/**
 * 解析 IPv6 地址为字节。
 */
//@ chunk-hq88884p.js:53280-54235 placement
function parseIpv6(e) {
  let r = null,
    n = e,
    index = e.lastIndexOf(":");
  if (index >= 0 && e.slice(index + 1).includes(".")) {
    if (((r = parseIpv4(e.slice(index + 1))), !r)) return null;
    n = e.slice(0, index + 1);
  }
  let parts = n.split("::");
  if (parts.length > 2) return null;
  let c = [],
    a = (l, b) => {
      if (l === "") return [];
      let parts = l.split(":"),
        h = [];
      for (let P = 0; P < parts.length; P++) {
        let p = parts[P];
        if (p === "" && b && P === parts.length - 1) continue;
        if (p === void 0 || p === "" || !/^[0-9a-fA-F]{1,4}$/.test(p)) return null;
        h.push(parseInt(p, 16));
      }
      return h;
    };
  if (parts.length === 1) {
    let l = parts[0] ?? "",
      b = a(l, r !== null);
    if (!b) return null;
    c.push(...b);
    let E = r ? 6 : 8;
    if (c.length !== E) return null;
  } else {
    let l = parts[0] ?? "",
      b = parts[1] ?? "",
      E = a(l, !1),
      h = a(b, r !== null);
    if (!E || !h) return null;
    let P = r ? 2 : 0,
      p = 8 - E.length - h.length - P;
    if (p < 1) return null;
    c.push(...E);
    for (let A = 0; A < p; A++) c.push(0);
    if ((c.push(...h), c.length + P !== 8)) return null;
  }
  let uint8Array = new Uint8Array(16);
  for (let l = 0; l < c.length; l++) {
    let b = c[l];
    if (b === void 0) return null;
    ((uint8Array[l * 2] = (b >> 8) & 255), (uint8Array[l * 2 + 1] = b & 255));
  }
  if (r)
    ((uint8Array[12] = r[0] ?? 0),
      (uint8Array[13] = r[1] ?? 0),
      (uint8Array[14] = r[2] ?? 0),
      (uint8Array[15] = r[3] ?? 0));
  return uint8Array;
}

export { ipInCidr };
