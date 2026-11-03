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
var r = createFieldAccessor("computerUseMcpState", void 0);
/**
 * 包装 AppState 中 Computer Use MCP 状态的读写单元。
 */
//@ chunk-2n9gagn7.js:304-451 placement
class ComputerUseStateCell {
  #e;
  constructor(e) {
    this.#e = e;
  }
  static over(e) {
    return new ComputerUseStateCell(r(e.getState, e.setState));
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
  owner = void 0;
  acquire(e) {
    if (this.owner) return () => {};
    return (
      (this.owner = e),
      () => {
        if (this.owner === e) this.owner = void 0;
      }
    );
  }
}
//@ chunk-2n9gagn7.js:573-599 placement
var fNt = new SessionRootSlot(() => new SingleOwnerLock());
//@ chunk-2n9gagn7.js:599-638 placement
function bMs(e) {
  return fNt.of(e).owner;
}

export { fNt, ComputerUseStateCell, bMs };
