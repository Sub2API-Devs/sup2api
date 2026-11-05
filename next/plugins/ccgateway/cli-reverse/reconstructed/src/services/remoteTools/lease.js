/**
 * services/remoteTools/lease.ts
 *
 * 2.1.316 新增：远程工具租约
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-10j1fv9y.js (2)
 * attribution: placement 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */

//@ chunk-10j1fv9y.js:191-270 placement
/**
 * 取某台机器的租约记录。
 */
function leaseOfMachine(host) {
  return {
    name: host.name,
    working_dir: host.description?.working_dir ?? "",
  };
}
//@ chunk-10j1fv9y.js:270-305 placement
/**
 * 表示「未持有租约」的空值。
 */
var NOT_HELD_LEASE = {
  held: false,
  reason: "not_held",
};
export { NOT_HELD_LEASE, leaseOfMachine };
