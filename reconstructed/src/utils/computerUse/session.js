/**
 * utils/computerUse/session.ts
 *
 * 2.1.316 新增：Computer Use 会话
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-hwmsct5x.js (3)
 * attribution: placement 3
 */
import { HostScoped } from "../hostScoped.js";
import { getRootSession } from "../../bootstrap/state.js";

/**
 * computer-use 会话状态（按宿主一份）：当前工具上下文、进行中的调用数、锁清理回调、activeThisTurn、run loop 泵与引用计数、ESC 热键是否注册、冻结坐标模式、hostAdapter、Swift/input 原生模块。
 */
//@ chunk-hwmsct5x.js:251627-252406 placement
class ComputerUseSession {
  binding = void 0;
  currentToolUseContext = void 0;
  currentOnProgress = void 0;
  callsInFlight = 0;
  unregisterLockCleanup = void 0;
  activeThisTurn = !1;
  runLoopPump = void 0;
  runLoopPumpRetainCount = 0;
  escHotkeyRegistered = !1;
  frozenCoordinateMode = void 0;
  hostAdapter = void 0;
  swiftModule = void 0;
  inputModule = void 0;
  reset() {
    if (this.unregisterLockCleanup !== void 0 || this.escHotkeyRegistered || this.runLoopPump !== void 0)
      throw Error(
        "ComputerUseSession.reset() called while the lock cleanup, Esc hotkey, or run-loop pump is still registered",
      );
    ((this.binding = void 0),
      (this.currentToolUseContext = void 0),
      (this.currentOnProgress = void 0),
      (this.callsInFlight = 0),
      (this.activeThisTurn = !1),
      (this.runLoopPumpRetainCount = 0),
      (this.frozenCoordinateMode = void 0),
      (this.hostAdapter = void 0),
      (this.swiftModule = void 0),
      (this.inputModule = void 0));
  }
}
//@ chunk-hwmsct5x.js:252406-252431 placement
var computerUseSessionByHost = new HostScoped(() => new ComputerUseSession());
/**
 * 返回当前宿主的 ComputerUseSession。
 */
//@ chunk-hwmsct5x.js:252431-252468 placement
function getComputerUseSession() {
  return computerUseSessionByHost.of(getRootSession().host);
}

export { getComputerUseSession };
