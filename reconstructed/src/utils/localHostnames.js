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

//@ chunk-p2v66jnt.js:266-1928 placement
/**
 * 本地/回环/元数据/Docker 内部主机名与本地域后缀集合。
 */
var LOCAL_HOSTNAMES = new Set([
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
var LOCAL_METADATA_NAMES = new Set([
  "metadata",
  "instance-data",
  "kubernetes",
  "_gateway",
  "_outbound",
  "_localdnsstub",
  "_localdnsproxy",
]);
var LOCAL_DOCKER_HOSTNAMES = new Set([
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
var LOCAL_DOMAIN_SUFFIXES = [
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
var LOCAL_TLD_SUFFIXES = [
  ".localhost",
  ".localhost.localdomain",
  ...LOCAL_DOMAIN_SUFFIXES,
  ".crc.testing",
  ".apps-crc.testing",
  ".mshome.net",
];
var PRIVATE_SUFFIXES = [".local", ".localdomain", ".home.arpa", ".internal", ".lan", ".home", ".fritz.box"];
var BROADLY_LOCAL_SUFFIXES = [
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
//@ chunk-p2v66jnt.js:1928-2059 placement
function isLocalHostname(e) {
  let replaced = stripIPv6Brackets(e.toLowerCase()).replace(/\.+$/, "");
  return (
    LOCAL_HOSTNAMES.has(replaced) ||
    LOCAL_METADATA_NAMES.has(replaced) ||
    replaced === "home.arpa" ||
    BROADLY_LOCAL_SUFFIXES.some((o) => replaced.endsWith(o))
  );
}
//@ chunk-p2v66jnt.js:2059-2158 placement
function isLocalhostName(e) {
  let replaced = e.toLowerCase().replace(/\.+$/, "");
  return LOCAL_HOSTNAMES.has(replaced) || replaced.endsWith(".localhost");
}
//@ chunk-p2v66jnt.js:2158-2288 placement
function isPrivateNetworkName(e) {
  let replaced = e.toLowerCase().replace(/\.+$/, "");
  return (
    isLocalHostname(replaced) ||
    [...LOCAL_HOSTNAMES, ...LOCAL_METADATA_NAMES, "home.arpa", ...BROADLY_LOCAL_SUFFIXES].some((o) =>
      o.endsWith("." + replaced),
    )
  );
}
//@ chunk-p2v66jnt.js:2288-2500 placement
function isLoopbackHost(e) {
  let replaced = stripIPv6Brackets(e.trim().toLowerCase()).replace(/\.+$/, "");
  return (
    LOCAL_HOSTNAMES.has(replaced) ||
    LOCAL_DOCKER_HOSTNAMES.has(replaced) ||
    LOCAL_METADATA_NAMES.has(replaced) ||
    LOCAL_TLD_SUFFIXES.some((o) => replaced.endsWith(o)) ||
    LOCAL_HOSTNAMES.has(firstLineOf(replaced, ".")) ||
    PRIVATE_SUFFIXES.some((o) => replaced.endsWith(o) && LOCAL_HOSTNAMES.has(replaced.slice(0, -o.length))) ||
    isNumericIpLike(replaced)
  );
}
//@ chunk-p2v66jnt.js:2500-2902 placement
function matchesHostPattern(e, t) {
  let replaced = t.trim().toLowerCase().replace(/\.+$/, "");
  let a = !/[^\x00-\x7f]/.test(replaced)
    ? replaced
    : /[\u00df\u03c2\u200c\u200d]/.test(replaced)
      ? ""
      : domainToASCII(replaced).replace(/\.+$/, "");
  if (a === "") return true;
  let i = slugifyHost(firstLineOf(a, "."));
  if (i === "") return true;
  let d = slugifyHost(firstLineOf(e, "."));
  let m = [i, slugifyHost(a)];
  let f = m.includes(d) || m.includes(d.replace(/-\d+$/, ""));
  let sliced = e.slice(firstLineOf(e, ".").length);
  return (
    e === a ||
    (f &&
      (sliced === "" ||
        PRIVATE_SUFFIXES.includes(sliced) ||
        (sliced.endsWith(".ts.net") && countCharInString(sliced, ".") >= 3)))
  );
}
//@ chunk-p2v66jnt.js:2902-2973 placement
function slugifyHost(e) {
  return e.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
//@ chunk-p2v66jnt.js:2973-3104 placement
function isLocalAddress(e, t = "address") {
  let replaced = stripIPv6Brackets(e.trim().toLowerCase()).replace(/\.+$/, "");
  if (t === "address" ? isLocalHostname(replaced) : isLocalhostName(replaced)) return true;
  return isNumericIpLike(replaced);
}
//@ chunk-p2v66jnt.js:3104-3382 placement
function isNumericIpLike(e) {
  return (
    /^(?:(?:\d+|0x[0-9a-f]+)\.){1,3}(?:\d+|0x[0-9a-f]+)$/i.test(e) ||
    /^(?:127\.|0\d+\.|0x[0-9a-f]*\.)[0-9a-fx.]*$/i.test(e) ||
    /^0x[0-9a-f]+$/i.test(e) ||
    /^\d{8,}$/.test(e) ||
    /^0+$/.test(e) ||
    (/^[0-9a-f:.]+$/i.test(e) && e.includes(":") && (e.includes("::") || countCharInString(e, ":") >= 2))
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
