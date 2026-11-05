/**
 * utils/cidr.ts
 *
 * 2.1.316 新增：解析 IPv6 地址为字节；IP 是否在 CIDR 段内。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-355mdh7x.js (6)
 * attribution: placement 6
 */

//@ chunk-355mdh7x.js:90875-91201 placement
/**
 * IP 是否在 CIDR 段内。
 */
function ipInCidr(ip, cidr) {
  let index = cidr.lastIndexOf("/");
  if (index < 0) return false;
  let address = cidr.slice(0, index);
  let sliced = cidr.slice(index + 1);
  if (!/^\d+$/.test(sliced)) return false;
  let prefixLength = parseInt(sliced, 10);
  let ipAddress = parseIpAddress(address);
  if (!ipAddress) return false;
  if (ipAddress.zone) return false;
  let ipAddress_2 = parseIpAddress(ip);
  if (!ipAddress_2) return false;
  let ipBytes = unmapIpv4MappedIpv6(ipAddress_2.bytes);
  let bytes = ipAddress.bytes;
  if (ipBytes.length !== bytes.length) return false;
  let maxBits = bytes.length * 8;
  if (prefixLength < 0 || prefixLength > maxBits) return false;
  return prefixBitsMatch(ipBytes, bytes, prefixLength);
}
//@ chunk-355mdh7x.js:91201-91358 placement
function prefixBitsMatch(ipBytes, bytes, prefixLength) {
  let fullBytes = prefixLength >> 3;
  for (let j = 0; j < fullBytes; j++) if (ipBytes[j] !== bytes[j]) return false;
  let remainderBits = prefixLength & 7;
  if (remainderBits === 0) return true;
  let mask = (255 << (8 - remainderBits)) & 255;
  return ((ipBytes[fullBytes] ?? 0) & mask) === ((bytes[fullBytes] ?? 0) & mask);
}
//@ chunk-355mdh7x.js:91358-91497 placement
function unmapIpv4MappedIpv6(bytes) {
  if (bytes.length !== 16) return bytes;
  for (let j = 0; j < 10; j++) if (bytes[j] !== 0) return bytes;
  if (bytes[10] !== 255 || bytes[11] !== 255) return bytes;
  return bytes.slice(12);
}
//@ chunk-355mdh7x.js:91497-91726 placement
function parseIpAddress(address) {
  if (address === "") return null;
  let zone = "";
  let hostPart = address;
  let index = address.indexOf("%");
  if (index >= 0) {
    zone = address.slice(index + 1);
    hostPart = address.slice(0, index);
  }
  if (hostPart.includes(":")) {
    let ipv6 = parseIpv6(hostPart);
    return ipv6
      ? {
          bytes: ipv6,
          zone,
        }
      : null;
  }
  if (zone) return null;
  let ipv4 = parseIpv4(hostPart);
  return ipv4
    ? {
        bytes: ipv4,
        zone: "",
      }
    : null;
}
//@ chunk-355mdh7x.js:91726-92003 placement
function parseIpv4(text) {
  let parts = text.split(".");
  if (parts.length !== 4) return null;
  let uint8Array = new Uint8Array(4);
  for (let j = 0; j < 4; j++) {
    let part = parts[j];
    if (part === undefined || part === "" || !/^\d{1,3}$/.test(part)) return null;
    if (part.length > 1 && part.startsWith("0")) return null;
    let value = parseInt(part, 10);
    if (value > 255) return null;
    uint8Array[j] = value;
  }
  return uint8Array;
}
//@ chunk-355mdh7x.js:92003-92958 placement
/**
 * 解析 IPv6 地址为字节。
 */
function parseIpv6(text) {
  let ipv4Tail = null;
  let hostPart = text;
  let index = text.lastIndexOf(":");
  if (index >= 0 && text.slice(index + 1).includes(".")) {
    ipv4Tail = parseIpv4(text.slice(index + 1));
    if (!ipv4Tail) return null;
    hostPart = text.slice(0, index + 1);
  }
  let parts = hostPart.split("::");
  if (parts.length > 2) return null;
  let groups = [];
  let parseGroups = (text, allowTrailingEmpty) => {
    if (text === "") return [];
    let parts = text.split(":");
    let result = [];
    for (let j = 0; j < parts.length; j++) {
      let part = parts[j];
      if (part === "" && allowTrailingEmpty && j === parts.length - 1) continue;
      if (part === undefined || part === "" || !/^[0-9a-fA-F]{1,4}$/.test(part)) return null;
      result.push(parseInt(part, 16));
    }
    return result;
  };
  if (parts.length === 1) {
    let single = parts[0] ?? "";
    let parsed = parseGroups(single, ipv4Tail !== null);
    if (!parsed) return null;
    groups.push(...parsed);
    let expectedCount = ipv4Tail ? 6 : 8;
    if (groups.length !== expectedCount) return null;
  } else {
    let head = parts[0] ?? "";
    let tail = parts[1] ?? "";
    let headGroups = parseGroups(head, false);
    let tailGroups = parseGroups(tail, ipv4Tail !== null);
    if (!headGroups || !tailGroups) return null;
    let reservedGroups = ipv4Tail ? 2 : 0;
    let implicitCount = 8 - headGroups.length - tailGroups.length - reservedGroups;
    if (implicitCount < 1) return null;
    groups.push(...headGroups);
    for (let j = 0; j < implicitCount; j++) groups.push(0);
    groups.push(...tailGroups);
    if (groups.length + reservedGroups !== 8) return null;
  }
  let uint8Array = new Uint8Array(16);
  for (let j = 0; j < groups.length; j++) {
    let group = groups[j];
    if (group === undefined) return null;
    uint8Array[j * 2] = (group >> 8) & 255;
    uint8Array[j * 2 + 1] = group & 255;
  }
  if (ipv4Tail) {
    uint8Array[12] = ipv4Tail[0] ?? 0;
    uint8Array[13] = ipv4Tail[1] ?? 0;
    uint8Array[14] = ipv4Tail[2] ?? 0;
    uint8Array[15] = ipv4Tail[3] ?? 0;
  }
  return uint8Array;
}
export { ipInCidr };
