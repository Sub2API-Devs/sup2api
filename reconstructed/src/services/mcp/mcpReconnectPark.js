/**
 * services/mcp/mcpReconnectPark.ts
 *
 * 2.1.316 新增：MCP 重连"停放"（等待外部条件后恢复）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-tfcm4n2s.js (4)
 * attribution: placement 4
 */
import { HostScoped } from "../../utils/hostScoped.js";
import { isUnattendedBgSession } from "../../utils/concurrentSessions.js";
import { markCommandParkBlocked, clearCommandParkBlocked } from "../daemon/rendezvous.js";
import { onAttacherCapsChange } from "../../bootstrap/state.js";
import { logJobWriteError } from "../daemon/jobState.js";

//@ chunk-tfcm4n2s.js:375-399 placement
/**
 * 每宿主的命令挂起状态（当前挂起的命令）。
 */
class ReconnectParkState {
  activePark = null;
}
//@ chunk-tfcm4n2s.js:399-422 placement
/**
 * 按宿主保存的命令挂起状态。
 */
var reconnectParkState = new HostScoped(() => new ReconnectParkState());
//@ chunk-tfcm4n2s.js:422-676 placement
/**
 * 无人值守后台会话中，把需要用户处理的命令挂起为作业阻塞状态，返回是否已挂起。
 */
async function parkCommandForAttacher(host, e, n, storageV5) {
  if (!isUnattendedBgSession()) return false;
  let o = reconnectParkState.of(host);
  let t = await markCommandParkBlocked(e, n, storageV5);
  switch (t.kind) {
    case "refused":
      return false;
    case "already":
      if (o.activePark?.needs !== e)
        watchParkRelease(
          o,
          e,
          {
            tempo: "idle",
            needs: undefined,
            detail: "",
          },
          storageV5,
        );
      return true;
    case "wrote":
      watchParkRelease(o, e, t.prior, storageV5);
      return true;
  }
}
//@ chunk-tfcm4n2s.js:676-928 placement
function watchParkRelease(r, e, prior, storageV5) {
  r.activePark?.unsubscribe();
  let unsubscribe = onAttacherCapsChange(() => {
    if (isUnattendedBgSession()) return;
    let activePark = r.activePark;
    if (!activePark || activePark.needs !== e) return;
    r.activePark = null;
    activePark.unsubscribe();
    clearCommandParkBlocked(e, activePark.prior, activePark.storageV5).catch(logJobWriteError);
  });
  r.activePark = {
    needs: e,
    prior,
    storageV5,
    unsubscribe,
  };
}
export { parkCommandForAttacher };
