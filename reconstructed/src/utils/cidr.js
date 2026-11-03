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

//@ chunk-hq88884p.js:52152-52478 placement
/**
 * IP 是否在 CIDR 段内。
 */
function ipInCidr(e, r) {
  let index = r.lastIndexOf("/");
  if (index < 0) return false;
  let sliced = r.slice(0, index);
  let sliced_2 = r.slice(index + 1);
  if (!/^\d+$/.test(sliced_2)) return false;
  let c = parseInt(sliced_2, 10);
  let ipAddress = parseIpAddress(sliced);
  if (!ipAddress) return false;
  if (ipAddress.zone) return false;
  let ipAddress_2 = parseIpAddress(e);
  if (!ipAddress_2) return false;
  let l = unmapIpv4MappedIpv6(ipAddress_2.bytes);
  let bytes = ipAddress.bytes;
  if (l.length !== bytes.length) return false;
  let E = bytes.length * 8;
  if (c < 0 || c > E) return false;
  return prefixBitsMatch(l, bytes, c);
}
//@ chunk-hq88884p.js:52478-52635 placement
function prefixBitsMatch(e, bytes, n) {
  let o = n >> 3;
  for (let j = 0; j < o; j++) if (e[j] !== bytes[j]) return false;
  let s = n & 7;
  if (s === 0) return true;
  let c = (255 << (8 - s)) & 255;
  return ((e[o] ?? 0) & c) === ((bytes[o] ?? 0) & c);
}
//@ chunk-hq88884p.js:52635-52774 placement
function unmapIpv4MappedIpv6(bytes) {
  if (bytes.length !== 16) return bytes;
  for (let j = 0; j < 10; j++) if (bytes[j] !== 0) return bytes;
  if (bytes[10] !== 255 || bytes[11] !== 255) return bytes;
  return bytes.slice(12);
}
//@ chunk-hq88884p.js:52774-53003 placement
function parseIpAddress(e) {
  if (e === "") return null;
  let r = "";
  let n = e;
  let index = e.indexOf("%");
  if (index >= 0) {
    r = e.slice(index + 1);
    n = e.slice(0, index);
  }
  if (n.includes(":")) {
    let ipv6 = parseIpv6(n);
    return ipv6
      ? {
          bytes: ipv6,
          zone: r,
        }
      : null;
  }
  if (r) return null;
  let ipv4 = parseIpv4(n);
  return ipv4
    ? {
        bytes: ipv4,
        zone: "",
      }
    : null;
}
//@ chunk-hq88884p.js:53003-53280 placement
function parseIpv4(e) {
  let parts = e.split(".");
  if (parts.length !== 4) return null;
  let uint8Array = new Uint8Array(4);
  for (let j = 0; j < 4; j++) {
    let s = parts[j];
    if (s === undefined || s === "" || !/^\d{1,3}$/.test(s)) return null;
    if (s.length > 1 && s.startsWith("0")) return null;
    let c = parseInt(s, 10);
    if (c > 255) return null;
    uint8Array[j] = c;
  }
  return uint8Array;
}
//@ chunk-hq88884p.js:53280-54235 placement
/**
 * 解析 IPv6 地址为字节。
 */
function parseIpv6(e) {
  let r = null;
  let n = e;
  let index = e.lastIndexOf(":");
  if (index >= 0 && e.slice(index + 1).includes(".")) {
    r = parseIpv4(e.slice(index + 1));
    if (!r) return null;
    n = e.slice(0, index + 1);
  }
  let parts = n.split("::");
  if (parts.length > 2) return null;
  let c = [];
  let a = (l, b) => {
    if (l === "") return [];
    let parts = l.split(":");
    let h = [];
    for (let j = 0; j < parts.length; j++) {
      let p = parts[j];
      if (p === "" && b && j === parts.length - 1) continue;
      if (p === undefined || p === "" || !/^[0-9a-fA-F]{1,4}$/.test(p)) return null;
      h.push(parseInt(p, 16));
    }
    return h;
  };
  if (parts.length === 1) {
    let l = parts[0] ?? "";
    let b = a(l, r !== null);
    if (!b) return null;
    c.push(...b);
    let E = r ? 6 : 8;
    if (c.length !== E) return null;
  } else {
    let l = parts[0] ?? "";
    let b = parts[1] ?? "";
    let E = a(l, false);
    let h = a(b, r !== null);
    if (!E || !h) return null;
    let P = r ? 2 : 0;
    let p = 8 - E.length - h.length - P;
    if (p < 1) return null;
    c.push(...E);
    for (let j = 0; j < p; j++) c.push(0);
    c.push(...h);
    if (c.length + P !== 8) return null;
  }
  let uint8Array = new Uint8Array(16);
  for (let j = 0; j < c.length; j++) {
    let b = c[j];
    if (b === undefined) return null;
    uint8Array[j * 2] = (b >> 8) & 255;
    uint8Array[j * 2 + 1] = b & 255;
  }
  if (r) {
    uint8Array[12] = r[0] ?? 0;
    uint8Array[13] = r[1] ?? 0;
    uint8Array[14] = r[2] ?? 0;
    uint8Array[15] = r[3] ?? 0;
  }
  return uint8Array;
}
export { ipInCidr };
