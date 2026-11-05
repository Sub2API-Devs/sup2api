/**
 * services/mcp/mcpReconnectPark.ts
 *
 * 2.1.316 新增：MCP 重连"停放"（等待外部条件后恢复）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-xv7b5gnx.js (4)
 * attribution: placement 4
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { HostScoped } from "../../utils/hostScoped.js";
import { isUnattendedBgSession } from "../../utils/concurrentSessions.js";
import { markCommandParkBlocked, clearCommandParkBlocked } from "../daemon/rendezvous.js";
import { onAttacherCapsChange } from "../../bootstrap/state.js";
import { logJobWriteError } from "../daemon/jobState.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-xv7b5gnx.js:375-399 placement
/**
 * 每宿主的命令挂起状态（当前挂起的命令）。
 */
class ReconnectParkState {
  activePark = null;
}
//@ chunk-xv7b5gnx.js:399-422 placement
/**
 * 按宿主保存的命令挂起状态。
 */
var reconnectParkState; // deferred: uses ReconnectParkState of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-xv7b5gnx.js:399", () => {
  reconnectParkState = new HostScoped(() => new ReconnectParkState());
});
//@ chunk-xv7b5gnx.js:422-676 placement
/**
 * 无人值守后台会话中，把需要用户处理的命令挂起为作业阻塞状态，返回是否已挂起。
 */
async function parkCommandForAttacher(host, needs, detail, storageV5) {
  if (!isUnattendedBgSession()) return false;
  let state = reconnectParkState.of(host);
  let parkResult = await markCommandParkBlocked(needs, detail, storageV5);
  switch (parkResult.kind) {
    case "refused":
      return false;
    case "already":
      if (state.activePark?.needs !== needs)
        watchParkRelease(
          state,
          needs,
          {
            tempo: "idle",
            needs: undefined,
            detail: "",
          },
          storageV5,
        );
      return true;
    case "wrote":
      watchParkRelease(state, needs, parkResult.prior, storageV5);
      return true;
  }
}
//@ chunk-xv7b5gnx.js:676-928 placement
function watchParkRelease(state, needs, prior, storageV5) {
  state.activePark?.unsubscribe();
  let unsubscribe = onAttacherCapsChange(() => {
    if (isUnattendedBgSession()) return;
    let activePark = state.activePark;
    if (!activePark || activePark.needs !== needs) return;
    state.activePark = null;
    activePark.unsubscribe();
    clearCommandParkBlocked(needs, activePark.prior, activePark.storageV5).catch(logJobWriteError);
  });
  state.activePark = {
    needs,
    prior,
    storageV5,
    unsubscribe,
  };
}
export { parkCommandForAttacher };
