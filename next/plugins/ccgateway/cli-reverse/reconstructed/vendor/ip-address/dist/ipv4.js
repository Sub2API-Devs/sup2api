/**
 * ip-address/dist/ipv4.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: ip-address@10.7.5
 * pieces: chunk-exfmq47h.js (1)
 * attribution: esm-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
//@ chunk-exfmq47h.js:248172-248419 esm-fingerprint
var PRIVATE_NETWORKS = [
  "10.0.0.0/8",
  "172.16.0.0/12",
  "192.168.0.0/16",
  "127.0.0.0/8",
  "169.254.0.0/16",
  "100.64.0.0/10",
];
var DOCUMENTATION_NETWORKS = ["192.0.2.0/24", "198.51.100.0/24", "203.0.113.0/24"];
var NON_PUBLIC_NETWORKS = ["198.18.0.0/15", "192.0.0.0/24", ...DOCUMENTATION_NETWORKS];
var RESERVED_NETWORKS = ["0.0.0.0/8", "192.88.99.0/24", "224.0.0.0/4"];
export { PRIVATE_NETWORKS, NON_PUBLIC_NETWORKS, RESERVED_NETWORKS, DOCUMENTATION_NETWORKS };
