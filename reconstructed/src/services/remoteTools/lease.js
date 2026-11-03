/**
 * services/remoteTools/lease.ts
 *
 * 2.1.316 新增：远程工具租约
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-pdtd9ms4.js (2)
 * attribution: placement 2
 */

//@ chunk-pdtd9ms4.js:191-270 placement
/**
 * 取某台机器的租约记录。
 */
function leaseOfMachine(host) {
  return {
    name: host.name,
    working_dir: host.description?.working_dir ?? "",
  };
}
//@ chunk-pdtd9ms4.js:270-305 placement
/**
 * 表示「未持有租约」的空值。
 */
var NOT_HELD_LEASE = {
  held: false,
  reason: "not_held",
};
export { NOT_HELD_LEASE, leaseOfMachine };
