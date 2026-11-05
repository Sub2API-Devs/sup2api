/**
 * cli/print/commandRefreshThrottle.ts
 *
 * 命令列表刷新的节流器：同一时刻只跑一次，运行中被再问会排队重跑，问得太频繁就放弃（2.1.318 新增）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-0yw3taqg.js (1)
 * attribution: placement 1
 */
import { MAX_CONTROL_RESPONSE_BYTES } from "../../bridge/controlRequests.js";

//@ chunk-0yw3taqg.js:104212-104839 placement
/**
 * 命令列表刷新的节流器：同一时刻只跑一次重新读取，运行中被再问一次会排队再跑一遍，给得太频繁就放弃。
 */
class ThrottledReread {
  running;
  newestRun;
  rereadBeganAt = 0;
  isAskedAgain = false;
  isOneGivenUpOn = false;
  reread;
  constructor(reread) {
    this.reread = reread;
  }
  inFlight() {
    return this.running;
  }
  ask() {
    if (this.running !== undefined) {
      let hasWaitedLongEnough = Date.now() - this.rereadBeganAt >= MAX_CONTROL_RESPONSE_BYTES;
      if (this.isOneGivenUpOn || !hasWaitedLongEnough) {
        this.isAskedAgain = true;
        return;
      }
      this.isOneGivenUpOn = true;
    }
    this.running = this.runUntilNoneIsOwed();
  }
  async runUntilNoneIsOwed() {
    let runToken = {};
    this.newestRun = runToken;
    try {
      do {
        this.isAskedAgain = false;
        this.rereadBeganAt = Date.now();
        await this.reread();
      } while (this.newestRun === runToken && this.isAskedAgain);
    } finally {
      if (this.newestRun === runToken) this.running = undefined;
      else {
        this.isOneGivenUpOn = false;
        if (this.running === undefined) this.ask();
      }
    }
  }
}
export { ThrottledReread };
