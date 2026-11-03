/**
 * utils/computerUse/computerUseMcpState.ts
 *
 * 2.1.316 新增：Computer Use MCP 状态。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-2n9gagn7.js (5)
 * attribution: placement 5
 */
import { createFieldAccessor } from "../../state/sliceHelpers.js";
import { SessionRootSlot } from "../../bootstrap/sessionSlices.js";

//@ chunk-2n9gagn7.js:264-304 placement
/**
 * 包装 AppState 中 Computer Use MCP 状态的读写单元。
 */
var computerUseMcpStateAccessor = createFieldAccessor("computerUseMcpState", undefined);
//@ chunk-2n9gagn7.js:304-451 placement
/**
 * 包装 AppState 中 Computer Use MCP 状态的读写单元。
 */
class ComputerUseStateCell {
  #e;
  constructor(e) {
    this.#e = e;
  }
  static over(e) {
    return new ComputerUseStateCell(computerUseMcpStateAccessor(e.getState, e.setState));
  }
  get() {
    return this.#e.get();
  }
  update(e) {
    this.#e.set(e);
  }
}
//@ chunk-2n9gagn7.js:451-573 placement
class SingleOwnerLock {
  owner = undefined;
  acquire(e) {
    if (this.owner) return () => {};
    this.owner = e;
    return () => {
      if (this.owner === e) this.owner = undefined;
    };
  }
}
//@ chunk-2n9gagn7.js:573-599 placement
/**
 * 按会话根保存的 Computer Use 独占锁。
 */
var computerUseOwnerLock = new SessionRootSlot(() => new SingleOwnerLock());
//@ chunk-2n9gagn7.js:599-638 placement
/**
 * 读取 Computer Use 的当前持有者。
 */
function getComputerUseOwner(session) {
  return computerUseOwnerLock.of(session).owner;
}
export { computerUseOwnerLock, ComputerUseStateCell, getComputerUseOwner };
