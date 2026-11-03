/**
 * services/mcp/reconnectHandles.ts
 *
 * MCP 重连句柄（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-x87ys2v1.js (6)
 * attribution: placement 6
 */
import { ht } from "./cliOwnedClients.js";

//@ chunk-x87ys2v1.js:227-264 placement
function Iyt() {
  return ht().reconnect;
}
//@ chunk-x87ys2v1.js:264-298 placement
function q1s() {
  return ht().toggle;
}
//@ chunk-x87ys2v1.js:298-336 placement
function hAe() {
  return ht().isDisabled;
}
//@ chunk-x87ys2v1.js:336-378 placement
function Y1s() {
  return ht().dialBlockCause;
}
//@ chunk-x87ys2v1.js:378-470 placement
function KPo(e, n, r, c) {
  let o = ht();
  ((o.reconnect = e), (o.toggle = n), (o.isDisabled = r), (o.dialBlockCause = c));
}
//@ chunk-x87ys2v1.js:470-567 placement
function VPo() {
  let e = ht();
  ((e.reconnect = null), (e.toggle = null), (e.isDisabled = null), (e.dialBlockCause = null));
}

export { Iyt, hAe, Y1s, VPo, KPo, q1s };
