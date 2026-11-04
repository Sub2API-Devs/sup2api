/**
 * utils/localHostnames.ts
 *
 * 2.1.316 新增：本地/回环主机名判定
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-p2v66jnt.js (10)
 * attribution: placement 10
 */
import { domainToASCII } from "url";
import { firstLineOf, countCharInString } from "./stringUtils.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-p2v66jnt.js:266-1928 placement
/**
 * 本地/回环/元数据/Docker 内部主机名与本地域后缀集合。
 */
var LOCAL_HOSTNAMES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var LOCAL_METADATA_NAMES;
var LOCAL_DOCKER_HOSTNAMES;
var LOCAL_DOMAIN_SUFFIXES;
var LOCAL_TLD_SUFFIXES;
var PRIVATE_SUFFIXES;
var BROADLY_LOCAL_SUFFIXES;
deferInit("chunk-p2v66jnt.js:266", () => {
  LOCAL_HOSTNAMES = new Set([
    "localhost",
    "localhost.localdomain",
    "localhost4",
    "localhost4.localdomain4",
    "localhost6",
    "localhost6.localdomain6",
    "ip6-localhost",
    "ip6-loopback",
    "ip6-localnet",
    "ip6-mcastprefix",
    "ip6-allnodes",
    "ip6-allrouters",
    "broadcasthost",
    "metadata.google.internal",
    "instance-data.ec2.internal",
    "host.docker.internal",
    "gateway.docker.internal",
    "kubernetes.docker.internal",
    "vm.docker.internal",
    "host.containers.internal",
    "gateway.containers.internal",
    "host.lima.internal",
    "host.orb.internal",
    "localtest.me",
    "lvh.me",
    "localho.st",
    "vcap.me",
    "traefik.me",
    "fuf.me",
    "lacolhost.com",
    "my.local-ip.co",
    "localdev.me",
    "local.gd",
    "localhost.direct",
    "ddev.site",
    "lndo.site",
    "lcl.host",
    "kubernetes.default",
    "kubernetes.default.svc",
  ]);
  LOCAL_METADATA_NAMES = new Set([
    "metadata",
    "instance-data",
    "kubernetes",
    "_gateway",
    "_outbound",
    "_localdnsstub",
    "_localdnsproxy",
  ]);
  LOCAL_DOCKER_HOSTNAMES = new Set([
    "docker.for.mac.host.internal",
    "docker.for.win.host.internal",
    "host.minikube.internal",
    "host.rancher-desktop.internal",
    "host.k3d.internal",
    "host.internal",
    "gateway.internal",
    "orb.local",
    "kubernetes.default.svc.cluster.local",
    "crc.testing",
    "apps-crc.testing",
    "home.arpa",
  ]);
  LOCAL_DOMAIN_SUFFIXES = [
    ".nip.io",
    ".sslip.io",
    ".localtest.me",
    ".lvh.me",
    ".vcap.me",
    ".localho.st",
    ".traefik.me",
    ".fuf.me",
    ".lacolhost.com",
    ".my.local-ip.co",
    ".localdev.me",
    ".local.gd",
    ".localhost.direct",
    ".ddev.site",
    ".lndo.site",
    ".lcl.host",
    ".ipv6-literal.net",
    ".orb.local",
  ];
  LOCAL_TLD_SUFFIXES = [
    ".localhost",
    ".localhost.localdomain",
    ...LOCAL_DOMAIN_SUFFIXES,
    ".crc.testing",
    ".apps-crc.testing",
    ".mshome.net",
  ];
  PRIVATE_SUFFIXES = [".local", ".localdomain", ".home.arpa", ".internal", ".lan", ".home", ".fritz.box"];
  BROADLY_LOCAL_SUFFIXES = [
    ".localhost",
    ".local",
    ".localdomain",
    ".home.arpa",
    ".internal",
    ...LOCAL_DOMAIN_SUFFIXES,
    ".svc",
    ".svc.cluster.local",
    ".cluster.local",
  ];
});
//@ chunk-p2v66jnt.js:1928-2059 placement
function isLocalHostname(hostname) {
  let replaced = stripIPv6Brackets(hostname.toLowerCase()).replace(/\.+$/, "");
  return (
    LOCAL_HOSTNAMES.has(replaced) ||
    LOCAL_METADATA_NAMES.has(replaced) ||
    replaced === "home.arpa" ||
    BROADLY_LOCAL_SUFFIXES.some((suffix) => replaced.endsWith(suffix))
  );
}
//@ chunk-p2v66jnt.js:2059-2158 placement
function isLocalhostName(hostname) {
  let replaced = hostname.toLowerCase().replace(/\.+$/, "");
  return LOCAL_HOSTNAMES.has(replaced) || replaced.endsWith(".localhost");
}
//@ chunk-p2v66jnt.js:2158-2288 placement
function isPrivateNetworkName(hostname) {
  let replaced = hostname.toLowerCase().replace(/\.+$/, "");
  return (
    isLocalHostname(replaced) ||
    [...LOCAL_HOSTNAMES, ...LOCAL_METADATA_NAMES, "home.arpa", ...BROADLY_LOCAL_SUFFIXES].some((name) =>
      name.endsWith("." + replaced),
    )
  );
}
//@ chunk-p2v66jnt.js:2288-2500 placement
function isLoopbackHost(host) {
  let host_2 = stripIPv6Brackets(host.trim().toLowerCase()).replace(/\.+$/, "");
  return (
    LOCAL_HOSTNAMES.has(host_2) ||
    LOCAL_DOCKER_HOSTNAMES.has(host_2) ||
    LOCAL_METADATA_NAMES.has(host_2) ||
    LOCAL_TLD_SUFFIXES.some((suffix) => host_2.endsWith(suffix)) ||
    LOCAL_HOSTNAMES.has(firstLineOf(host_2, ".")) ||
    PRIVATE_SUFFIXES.some(
      (suffix) => host_2.endsWith(suffix) && LOCAL_HOSTNAMES.has(host_2.slice(0, -suffix.length)),
    ) ||
    isNumericIpLike(host_2)
  );
}
//@ chunk-p2v66jnt.js:2500-2902 placement
function matchesHostPattern(hostname, pattern) {
  let replaced = pattern.trim().toLowerCase().replace(/\.+$/, "");
  let normalizedPattern = !/[^\x00-\x7f]/.test(replaced)
    ? replaced
    : /[\u00df\u03c2\u200c\u200d]/.test(replaced)
      ? ""
      : domainToASCII(replaced).replace(/\.+$/, "");
  if (normalizedPattern === "") return true;
  let patternLabel = slugifyHost(firstLineOf(normalizedPattern, "."));
  if (patternLabel === "") return true;
  let hostLabel = slugifyHost(firstLineOf(hostname, "."));
  let candidateLabels = [patternLabel, slugifyHost(normalizedPattern)];
  let isLabelMatch =
    candidateLabels.includes(hostLabel) || candidateLabels.includes(hostLabel.replace(/-\d+$/, ""));
  let sliced = hostname.slice(firstLineOf(hostname, ".").length);
  return (
    hostname === normalizedPattern ||
    (isLabelMatch &&
      (sliced === "" ||
        PRIVATE_SUFFIXES.includes(sliced) ||
        (sliced.endsWith(".ts.net") && countCharInString(sliced, ".") >= 3)))
  );
}
//@ chunk-p2v66jnt.js:2902-2973 placement
function slugifyHost(host) {
  return host.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
//@ chunk-p2v66jnt.js:2973-3104 placement
function isLocalAddress(address, mode = "address") {
  let replaced = stripIPv6Brackets(address.trim().toLowerCase()).replace(/\.+$/, "");
  if (mode === "address" ? isLocalHostname(replaced) : isLocalhostName(replaced)) return true;
  return isNumericIpLike(replaced);
}
//@ chunk-p2v66jnt.js:3104-3382 placement
function isNumericIpLike(host) {
  return (
    /^(?:(?:\d+|0x[0-9a-f]+)\.){1,3}(?:\d+|0x[0-9a-f]+)$/i.test(host) ||
    /^(?:127\.|0\d+\.|0x[0-9a-f]*\.)[0-9a-fx.]*$/i.test(host) ||
    /^0x[0-9a-f]+$/i.test(host) ||
    /^\d{8,}$/.test(host) ||
    /^0+$/.test(host) ||
    (/^[0-9a-f:.]+$/i.test(host) &&
      host.includes(":") &&
      (host.includes("::") || countCharInString(host, ":") >= 2))
  );
}
//@ chunk-p2v66jnt.js:3382-3454 placement
function stripIPv6Brackets(lowerCase) {
  return lowerCase.startsWith("[") && lowerCase.endsWith("]") ? lowerCase.slice(1, -1) : lowerCase;
}
export {
  isLocalHostname,
  isLocalhostName,
  isPrivateNetworkName,
  isLocalAddress,
  matchesHostPattern,
  isLoopbackHost,
};
