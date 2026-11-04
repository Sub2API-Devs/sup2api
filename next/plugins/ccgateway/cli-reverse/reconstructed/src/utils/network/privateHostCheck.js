/**
 * utils/network/privateHostCheck.ts
 *
 * 2.1.316 新增：主机是否为本地/内网/元数据地址；解析 IPv6 地址等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-dcmhvw5a.js (10)
 * attribution: placement 10
 */
import { isIPv6, isIPv4 } from "net";

//@ chunk-dcmhvw5a.js:24123-24435 placement
/**
 * 云元数据等内部主机名。
 */
var METADATA_HOSTNAMES = new Set([
  "metadata.google.internal",
  "metadata.goog",
  "metadata",
  "instance-data",
  "instance-data.ec2.internal",
  "ip6-localhost",
  "ip6-loopback",
  "localhost.localdomain",
  "localhost4",
  "localhost4.localdomain4",
  "localhost6",
  "localhost6.localdomain6",
]);
var METADATA_IPS = new Set(["100.100.100.200", "168.63.129.16", "192.0.0.192"]);
//@ chunk-dcmhvw5a.js:24435-24496 placement
function isLoopbackOrLinkLocalV4(firstOctet, secondOctet, thirdOctet, fourthOctet) {
  return firstOctet === 127 || (firstOctet === 169 && secondOctet === 254) || firstOctet === 0;
}
//@ chunk-dcmhvw5a.js:24496-25156 placement
/**
 * 解析 IPv6 地址。
 */
function parseIpv6Address(input) {
  let index = input.indexOf("%");
  let parts = (index >= 0 ? input.slice(0, index) : input).toLowerCase().split("::");
  if (parts.length > 2) return;
  let headGroups = parts[0] ? parts[0].split(":") : [];
  let tailGroups = parts.length === 2 && parts[1] ? parts[1].split(":") : [];
  let tailOrAll = parts.length === 2 ? tailGroups : headGroups;
  let trailingBytes = [];
  let last = tailOrAll.at(-1);
  if (last !== undefined && last.includes(".")) {
    let mapped = last.split(".").map(Number);
    if (mapped.length !== 4 || mapped.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255))
      return;
    trailingBytes = mapped;
    tailOrAll.pop();
  }
  let groupsToBytes = (groups) => {
    let bytes = [];
    for (let group of groups) {
      if (!/^[0-9a-f]{1,4}$/.test(group)) return;
      let value = parseInt(group, 16);
      bytes.push(value >> 8, value & 255);
    }
    return bytes;
  };
  let headBytes = groupsToBytes(parts.length === 2 ? headGroups : []);
  let tailBytes = groupsToBytes(tailOrAll);
  if (headBytes === undefined || tailBytes === undefined) return;
  let byteCount = headBytes.length + tailBytes.length + trailingBytes.length;
  if (byteCount > 16 || (parts.length === 1 && byteCount !== 16)) return;
  return [...headBytes, ...Array(16 - byteCount).fill(0), ...tailBytes, ...trailingBytes];
}
//@ chunk-dcmhvw5a.js:25156-25204 placement
function isIpv4MappedLoopback(bytes) {
  return isNat64Prefix(bytes) && bytes[4] === 0 && bytes[5] === 1;
}
//@ chunk-dcmhvw5a.js:25204-25271 placement
function isNat64Prefix(bytes) {
  return bytes[0] === 0 && bytes[1] === 100 && bytes[2] === 255 && bytes[3] === 155;
}
//@ chunk-dcmhvw5a.js:25271-25465 placement
function isIpv4MappedOrTranslatedIpv6(address) {
  if (!isIPv6(address)) return false;
  let bytes = parseIpv6Address(address);
  if (bytes === undefined) return false;
  let isMappedV4 = bytes.slice(0, 10).every((byte) => byte === 0) && bytes[10] === 255 && bytes[11] === 255;
  let isNat64V4 = isNat64Prefix(bytes) && bytes.slice(4, 12).every((byte) => byte === 0);
  return isMappedV4 || isNat64V4 || isIpv4MappedLoopback(bytes);
}
//@ chunk-dcmhvw5a.js:25465-25772 placement
/**
 * 提取 IPv6 中内嵌的 IPv4。
 */
function embeddedIpv4(bytes) {
  let candidates = [];
  if (bytes[0] === 32 && bytes[1] === 2) candidates.push(bytes.slice(2, 6));
  let all = bytes.slice(0, 10).every((byte) => byte === 0);
  let isMappedV4 = all && bytes[10] === 255 && bytes[11] === 255;
  let isCompatibleV4 = all && bytes[10] === 0 && bytes[11] === 0;
  let isNat64V4 = isNat64Prefix(bytes) && bytes.slice(4, 12).every((byte) => byte === 0);
  let is6to4 = (bytes[8] === 0 || bytes[8] === 2) && bytes[9] === 0 && bytes[10] === 94 && bytes[11] === 254;
  if (isMappedV4 || isCompatibleV4 || isNat64V4 || is6to4) candidates.push(bytes.slice(12, 16));
  return candidates;
}
//@ chunk-dcmhvw5a.js:25772-26470 placement
/**
 * 主机是否为本地/内网/元数据地址。
 */
function isPrivateHost(host) {
  let replaced = host.toLowerCase().replace(/^\[|\]$/g, "");
  if (replaced.endsWith(".")) replaced = replaced.slice(0, -1);
  if (replaced === "" || replaced === "localhost" || replaced.endsWith(".localhost")) return true;
  if (METADATA_HOSTNAMES.has(replaced)) return true;
  if (replaced.startsWith("instance-data.") && replaced.endsWith(".compute.internal")) return true;
  if (isIPv4(replaced)) {
    if (METADATA_IPS.has(replaced)) return true;
    let [firstOctet = 0, secondOctet = 0, thirdOctet = 0, fourthOctet = 0] = replaced.split(".").map(Number);
    return isLoopbackOrLinkLocalV4(firstOctet, secondOctet, thirdOctet, fourthOctet);
  }
  if (!isIPv6(replaced)) return false;
  let ipv6Address = parseIpv6Address(replaced);
  if (ipv6Address === undefined) return true;
  if (isIpv4MappedLoopback(ipv6Address)) return true;
  if (ipv6Address.every((byte) => byte === 0)) return true;
  if (ipv6Address.slice(0, 15).every((byte) => byte === 0) && ipv6Address[15] === 1) return true;
  if (replaced === "fd00:ec2::254") return true;
  if (ipv6Address[0] === 254 && (ipv6Address[1] ?? 0) >= 128 && (ipv6Address[1] ?? 0) <= 191) return true;
  return embeddedIpv4(ipv6Address).some((v4Bytes) => {
    let [firstOctet = 0, secondOctet = 0, thirdOctet = 0, fourthOctet = 0] = v4Bytes;
    return (
      isLoopbackOrLinkLocalV4(firstOctet, secondOctet, thirdOctet, fourthOctet) ||
      METADATA_IPS.has(`${firstOctet}.${secondOctet}.${thirdOctet}.${fourthOctet}`)
    );
  });
}
//@ chunk-dcmhvw5a.js:26470-26694 placement
/**
 * 从请求选项还原 URL。
 */
function urlFromRequestOptions(options) {
  if (options.href) return options.href;
  let authority =
    options.host ??
    (options.hostname &&
      (options.hostname.includes(":") && !options.hostname.startsWith("[")
        ? `[${options.hostname}]`
        : options.hostname) + (options.port ? `:${options.port}` : ""));
  return options.protocol && authority ? `${options.protocol}//${authority}` : "";
}
//@ chunk-dcmhvw5a.js:26694-26800 placement
/**
 * 两个 URL 是否同源。
 */
function sameOrigin(leftUrl, rightUrl) {
  try {
    let origin = new URL(leftUrl).origin;
    let origin_2 = new URL(rightUrl).origin;
    return origin !== "null" && origin === origin_2;
  } catch {
    return false;
  }
}
export { sameOrigin, urlFromRequestOptions, isPrivateHost, isIpv4MappedOrTranslatedIpv6 };
