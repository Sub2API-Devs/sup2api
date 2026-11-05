/**
 * utils/computerUse/computerUseMcpState.ts
 *
 * 2.1.316 新增：Computer Use MCP 状态。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-pxzfzf5v.js (5)
 * attribution: placement 5
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { createFieldAccessor } from "../../state/sliceHelpers.js";
import { SessionRootSlot } from "../../bootstrap/sessionSlices.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-pxzfzf5v.js:264-304 placement
/**
 * 包装 AppState 中 Computer Use MCP 状态的读写单元。
 */
var computerUseMcpStateAccessor; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-pxzfzf5v.js:264", () => {
  computerUseMcpStateAccessor = createFieldAccessor("computerUseMcpState", undefined);
});
//@ chunk-pxzfzf5v.js:304-451 placement
/**
 * 包装 AppState 中 Computer Use MCP 状态的读写单元。
 */
class ComputerUseStateCell {
  #e;
  constructor(accessor) {
    this.#e = accessor;
  }
  static over(stateCell) {
    return new ComputerUseStateCell(computerUseMcpStateAccessor(stateCell.getState, stateCell.setState));
  }
  get() {
    return this.#e.get();
  }
  update(nextState) {
    this.#e.set(nextState);
  }
}
//@ chunk-pxzfzf5v.js:451-573 placement
class SingleOwnerLock {
  owner = undefined;
  acquire(owner) {
    if (this.owner) return () => {};
    this.owner = owner;
    return () => {
      if (this.owner === owner) this.owner = undefined;
    };
  }
}
//@ chunk-pxzfzf5v.js:573-599 placement
/**
 * 按会话根保存的 Computer Use 独占锁。
 */
var computerUseOwnerLock; // deferred: uses SessionRootSlot (../../bootstrap/sessionSlices.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-pxzfzf5v.js:573", () => {
  computerUseOwnerLock = new SessionRootSlot(() => new SingleOwnerLock());
});
//@ chunk-pxzfzf5v.js:599-638 placement
/**
 * 读取 Computer Use 的当前持有者。
 */
function getComputerUseOwner(session) {
  return computerUseOwnerLock.of(session).owner;
}
export { computerUseOwnerLock, ComputerUseStateCell, getComputerUseOwner };
