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

//@ chunk-hwmsct5x.js:251627-252406 placement
/**
 * computer-use 会话状态（按宿主一份）：当前工具上下文、进行中的调用数、锁清理回调、activeThisTurn、run loop 泵与引用计数、ESC 热键是否注册、冻结坐标模式、hostAdapter、Swift/input 原生模块。
 */
class ComputerUseSession {
  binding = undefined;
  currentToolUseContext = undefined;
  currentOnProgress = undefined;
  callsInFlight = 0;
  unregisterLockCleanup = undefined;
  activeThisTurn = false;
  runLoopPump = undefined;
  runLoopPumpRetainCount = 0;
  escHotkeyRegistered = false;
  frozenCoordinateMode = undefined;
  hostAdapter = undefined;
  swiftModule = undefined;
  inputModule = undefined;
  reset() {
    if (
      this.unregisterLockCleanup !== undefined ||
      this.escHotkeyRegistered ||
      this.runLoopPump !== undefined
    )
      throw Error(
        "ComputerUseSession.reset() called while the lock cleanup, Esc hotkey, or run-loop pump is still registered",
      );
    this.binding = undefined;
    this.currentToolUseContext = undefined;
    this.currentOnProgress = undefined;
    this.callsInFlight = 0;
    this.activeThisTurn = false;
    this.runLoopPumpRetainCount = 0;
    this.frozenCoordinateMode = undefined;
    this.hostAdapter = undefined;
    this.swiftModule = undefined;
    this.inputModule = undefined;
  }
}
//@ chunk-hwmsct5x.js:252406-252431 placement
var computerUseSessionByHost = new HostScoped(() => new ComputerUseSession());
//@ chunk-hwmsct5x.js:252431-252468 placement
/**
 * 返回当前宿主的 ComputerUseSession。
 */
function getComputerUseSession() {
  return computerUseSessionByHost.of(getRootSession().host);
}
export { getComputerUseSession };
