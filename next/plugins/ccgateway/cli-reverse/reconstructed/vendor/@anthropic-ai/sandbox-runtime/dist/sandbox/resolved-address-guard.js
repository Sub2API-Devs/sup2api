/**
 * @anthropic-ai/sandbox-runtime/dist/sandbox/resolved-address-guard.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @anthropic-ai/sandbox-runtime@0.0.81
 * pieces: chunk-qg41pqt6.js (7)
 * attribution: esm-fingerprint 6, esm-layout 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { networkInterfaces } from "os";
import { BlockList, isIP } from "net";
import { lookup } from "dns";
import {
  LOOPBACK_RANGES,
  addRange,
  addressInSet,
  embeddedIPv4,
  isLoopbackName,
  ipFamily,
} from "./address.js";
import { ipLiteralRules } from "./domain-pattern.js";
import { logForDebugging as logForDebugging_2 } from "../utils/debug.js";

//@ chunk-qg41pqt6.js:651466-652040 esm-fingerprint
var CLOUD_METADATA_ADDRESSES = [
  "100.100.100.200",
  "168.63.129.16",
  "192.0.0.192",
  "fd00:ec2::/32",
  "fd20:ce::254",
  "fd00:c1::a9fe:a9fe",
  "fd00:42::42",
  "fd00:a9fe:a9fe::1",
  "fd00:100::100:200",
];
var DENIED_CLASSES = [
  ["a loopback address", LOOPBACK_RANGES],
  ["an unspecified address", ["0.0.0.0/8", "::"]],
  ["a link-local address", ["169.254.0.0/16", "fe80::/10"]],
  ["a multicast address", ["224.0.0.0/4", "ff00::/8"]],
  ["the broadcast address", ["255.255.255.255"]],
  ["a cloud metadata address", CLOUD_METADATA_ADDRESSES],
];
var REASON_ORDER = [
  "a deny-listed address",
  ...DENIED_CLASSES.map(([why]) => why),
  "a listed address",
  "one of this host's addresses",
  "a non-loopback address",
  "an unparsable address",
];
//@ chunk-qg41pqt6.js:652040-652148 esm-fingerprint
function localInterfaceAddresses() {
  let byInterface;
  try {
    byInterface = networkInterfaces();
  } catch {
    return [];
  }
  return Object.values(byInterface)
    .flat()
    .flatMap((i) => (i ? [i.address] : []));
}
//@ chunk-qg41pqt6.js:652148-652363 esm-fingerprint
class ResolvedAddressDeniedError extends Error {
  constructor(hostname, reason, addresses) {
    super(`Connection to ${hostname} blocked: ${reason}`);
    this.hostname = hostname;
    this.reason = reason;
    this.addresses = addresses;
    this.code = "ERR_SRT_RESOLVED_ADDRESS_DENIED";
    this.name = "ResolvedAddressDeniedError";
  }
}
//@ chunk-qg41pqt6.js:652363-652401 esm-layout
function isResolvedAddressDeniedError(err) {
  return err instanceof ResolvedAddressDeniedError;
}
//@ chunk-qg41pqt6.js:652401-652696 esm-fingerprint
function buildRuleSet(rules) {
  let set = {
    anyPort: new BlockList(),
    byPort: new Map(),
  };
  for (let rule of rules) {
    let { range, port } =
      typeof rule === "string"
        ? {
            range: rule,
            port: undefined,
          }
        : rule;
    let list = port === undefined ? set.anyPort : set.byPort.get(port);
    if (!list) set.byPort.set(port, (list = new BlockList()));
    if (!addRange(list, range)) throw Error(`Invalid IP address or CIDR range: ${JSON.stringify(range)}`);
  }
  return set;
}
//@ chunk-qg41pqt6.js:652696-652783 esm-fingerprint
function inRuleSet(set, address, port) {
  let forPort = set.byPort.get(port);
  return addressInSet(set.anyPort, address) || (forPort !== undefined && addressInSet(forPort, address));
}
//@ chunk-qg41pqt6.js:652783-654016 esm-fingerprint
function createResolvedAddressGuard(opts = {}) {
  let refused = buildRuleSet(ipLiteralRules(opts.deniedDomains ?? []));
  let allowed = buildRuleSet(ipLiteralRules(opts.allowedDomains ?? []));
  let denied = [
    ...DENIED_CLASSES.map(([why, ranges]) => [why, buildRuleSet(ranges)]),
    ["a listed address", buildRuleSet(opts.deniedResolvedAddresses ?? [])],
  ];
  let resolve = opts.resolve ?? lookup;
  let localSet = () => {
    let list = new BlockList();
    for (let a of (opts.localAddresses ?? localInterfaceAddresses)()) addRange(list, a);
    return list;
  };
  let denial = (hostname, address, port, local) => {
    if (isIP(hostname)) return;
    if (!isIP(address)) return "an unparsable address";
    let v4 = embeddedIPv4(address);
    let denies = (set) => inRuleSet(set, address, port) || (v4 !== undefined && inRuleSet(set, v4, port));
    if (denies(refused)) return "a deny-listed address";
    if (inRuleSet(allowed, address, port)) return;
    if (isLoopbackName(hostname)) return ipFamily(address) ? undefined : "a non-loopback address";
    let why = denied.find(([, set]) => denies(set))?.[0];
    if (why) return why;
    if (addressInSet(local, address) || (v4 !== undefined && addressInSet(local, v4)))
      return "one of this host's addresses";
    return;
  };
  return {
    permits: (hostname, address, port) => denial(hostname, address, port, localSet()) === undefined,
    lookupFor: (port) => (hostname, options, callback) => {
      resolve(
        hostname,
        {
          ...options,
          all: true,
        },
        (err, addresses) => {
          if (err) {
            callback(err, []);
            return;
          }
          let local = localSet();
          let kept = [];
          let dropped = [];
          let whys = new Set();
          for (let a of addresses) {
            let why = denial(hostname, a.address, port, local);
            if (why === undefined) kept.push(a);
            else {
              dropped.push(a.address);
              whys.add(why);
            }
          }
          let classes = REASON_ORDER.filter((w) => whys.has(w));
          if (dropped.length)
            logForDebugging_2(
              `Denied address(es) for ${hostname}:${port}: ${dropped.join(", ")} (${classes.join("; ")})`,
            );
          let first = kept[0];
          if (!first) {
            let none = dropped.length
              ? new ResolvedAddressDeniedError(hostname, `resolved to ${classes.join(" / ")}`, dropped)
              : Object.assign(Error(`getaddrinfo ENOTFOUND ${hostname}`), {
                  code: "ENOTFOUND",
                });
            callback(none, []);
            return;
          }
          if (options.all) callback(null, kept);
          else callback(null, first.address, first.family);
        },
      );
    },
  };
}
export { isResolvedAddressDeniedError, createResolvedAddressGuard };
