/**
 * @anthropic-ai/sandbox-runtime/dist/sandbox/address.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sandbox-runtime@0.0.81
 * pieces: chunk-078pp0rm.js (14)
 * attribution: esm-fingerprint 11, esm-layout 3
 */
import { isIP, BlockList } from "net";

//@ chunk-078pp0rm.js:407-437 esm-fingerprint
var LOOPBACK_RANGES = ["127.0.0.0/8", "::1"];
//@ chunk-078pp0rm.js:437-502 esm-fingerprint
function ipFamily(address) {
  let fam = isIP(address);
  return fam === 4 ? "ipv4" : fam === 6 ? "ipv6" : undefined;
}
//@ chunk-078pp0rm.js:502-836 esm-fingerprint
function parseAddressRange(entry) {
  let slash = entry.indexOf("/");
  let address = stripZone(slash === -1 ? entry : entry.slice(0, slash));
  let family = ipFamily(address);
  if (!family) return;
  let max = family === "ipv6" ? 128 : 32;
  let prefix = max;
  if (slash !== -1) {
    let raw = entry.slice(slash + 1);
    if (!/^\d{1,3}$/.test(raw) || Number(raw) > max) return;
    prefix = Number(raw);
  }
  let mapped = family === "ipv6" ? mappedIPv4(address) : undefined;
  if (mapped !== undefined)
    return prefix < 96
      ? undefined
      : {
          address: mapped,
          prefix: prefix - 96,
          family: "ipv4",
        };
  return {
    address,
    prefix,
    family,
  };
}
//@ chunk-078pp0rm.js:836-951 esm-fingerprint
function addRange(list, entry) {
  let range = parseAddressRange(entry);
  if (!range) return false;
  try {
    list.addSubnet(range.address, range.prefix, range.family);
  } catch {
    return false;
  }
  return true;
}
//@ chunk-078pp0rm.js:951-1084 esm-fingerprint
function buildAddressSet(entries) {
  let list = new BlockList();
  for (let entry of entries)
    if (!addRange(list, entry)) throw Error(`Invalid IP address or CIDR range: ${JSON.stringify(entry)}`);
  return list;
}
//@ chunk-078pp0rm.js:1084-1152 esm-fingerprint
function addressInSet(list, address) {
  let addr = stripZone(address);
  let family = ipFamily(addr);
  return family !== undefined && list.check(addr, family);
}
//@ chunk-078pp0rm.js:1152-1216 esm-fingerprint
function stripZone(address) {
  let pct = address.indexOf("%");
  return pct === -1 ? address : address.slice(0, pct);
}
//@ chunk-078pp0rm.js:1216-1510 esm-fingerprint
function ipv6Groups(address) {
  let host;
  try {
    host = new URL(`http://[${stripZone(address)}]/`).hostname.slice(1, -1);
  } catch {
    return;
  }
  let [head = "", tail] = host.split("::");
  let lead = head ? head.split(":") : [];
  let rest = tail ? tail.split(":") : [];
  let fill = tail === undefined ? 0 : 8 - lead.length - rest.length;
  if (fill < 0 || lead.length + fill + rest.length !== 8) return;
  return [...lead, ...Array(fill).fill("0"), ...rest].map((g) => parseInt(g, 16));
}
//@ chunk-078pp0rm.js:1510-1559 esm-layout
var dottedQuad = (hi, lo) => `${hi >> 8}.${hi & 255}.${lo >> 8}.${lo & 255}`;
//@ chunk-078pp0rm.js:1559-1686 esm-fingerprint
function mappedIPv4(address) {
  if (!/ffff/i.test(address)) return;
  let g = ipv6Groups(address);
  return g && g.slice(0, 5).every((x) => x === 0) && g[5] === 65535 ? dottedQuad(g[6], g[7]) : undefined;
}
//@ chunk-078pp0rm.js:1686-1983 esm-fingerprint
function embeddedIPv4(address) {
  if (isIP(address) !== 6) return;
  let g = ipv6Groups(address);
  if (!g) return;
  let zero = (from, to) => g.slice(from, to).every((x) => x === 0);
  if (g[0] === 8194) return dottedQuad(g[1], g[2]);
  let low = dottedQuad(g[6], g[7]);
  if (g[0] === 100 && g[1] === 65435 && zero(2, 6)) return low;
  if (zero(0, 5) && (g[5] === 0 || g[5] === 65535)) return low;
  if (zero(0, 4) && g[4] === 65535 && g[5] === 0) return low;
  return;
}
//@ chunk-078pp0rm.js:1983-1996 esm-layout
var LOOPBACK = buildAddressSet(LOOPBACK_RANGES);
//@ chunk-078pp0rm.js:1996-2028 esm-layout
function M3r(address) {
  return addressInSet(LOOPBACK, address);
}
//@ chunk-078pp0rm.js:2028-2133 esm-fingerprint
function isLoopbackName(hostname) {
  let h = hostname.toLowerCase().replace(/\.$/, "");
  return h === "localhost" || h.endsWith(".localhost");
}
export {
  addRange,
  M3r,
  addressInSet,
  mappedIPv4,
  LOOPBACK_RANGES,
  embeddedIPv4,
  isLoopbackName,
  parseAddressRange,
};
