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
class i {
  activePark = null;
}
//@ chunk-tfcm4n2s.js:399-422 placement
var s = new HostScoped(() => new i());
/**
 * 无人值守后台会话中，把需要用户处理的命令挂起为作业阻塞状态，返回是否已挂起。
 */
//@ chunk-tfcm4n2s.js:422-676 placement
async function parkCommandForAttacher(r, e, n, a) {
  if (!isUnattendedBgSession()) return !1;
  let of = s.of(r),
    t = await markCommandParkBlocked(e, n, a);
  switch (t.kind) {
    case "refused":
      return !1;
    case "already":
      if (of.activePark?.needs !== e)
        watchParkRelease(of, e, { tempo: "idle", needs: void 0, detail: "" }, a);
      return !0;
    case "wrote":
      return (watchParkRelease(of, e, t.prior, a), !0);
  }
}
//@ chunk-tfcm4n2s.js:676-928 placement
function watchParkRelease(r, e, n, a) {
  r.activePark?.unsubscribe();
  let o = onAttacherCapsChange(() => {
    if (isUnattendedBgSession()) return;
    let activePark = r.activePark;
    if (!activePark || activePark.needs !== e) return;
    ((r.activePark = null),
      activePark.unsubscribe(),
      clearCommandParkBlocked(e, activePark.prior, activePark.storageV5).catch(logJobWriteError));
  });
  r.activePark = { needs: e, prior: n, storageV5: a, unsubscribe: o };
}

export { parkCommandForAttacher };
