/**
 * bridge/deviceUnboundCreates.ts
 *
 * 2.1.316 新增。未绑定设备创建会话的记录读写依赖。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-8rjqe6hb.js (8)
 * attribution: placement 8
 */
import { join, dirname } from "path";
import { DoctorLazy } from "../cli/handlers/util.js";
import { u, T, A, o } from "../../vendor/zod/v4/classic/schemas.js";
import { getClaudeConfigDir } from "../utils/envUtils.js";
import { jsonParse, jsonStringify } from "../utils/slowOperations.js";
import { sessionIdBody } from "./sessionIdCompat.js";
import { logForDebugging } from "../utils/debug.js";
import { errorMessage, isENOENT } from "../utils/errors.js";
import { isStorageV5Enabled } from "../utils/hoverRest.js";
import { STORAGE_SPACES } from "../utils/storage/storageSpaces.js";
import { getFileReader } from "../utils/fileStore.js";

//@ chunk-8rjqe6hb.js:564-669 placement
var MAX_UNBOUND_CREATES = 50,
  unboundCreatesFileSchema = DoctorLazy(() =>
    u({ version: T(1), sessions: A(u({ id: o(), reason: o(), at: o() })) }),
  ),
  DEVICE_UNBOUND_CREATES = "device-unbound-creates";
//@ chunk-8rjqe6hb.js:669-717 placement
function c() {
  return join(getClaudeConfigDir(), "state", `${DEVICE_UNBOUND_CREATES}.json`);
}
/**
 * 读未绑定创建记录并按保留期过滤
 */
//@ chunk-8rjqe6hb.js:717-923 placement
async function readUnboundCreates(r) {
  let text = await r.readText();
  if (text === void 0) return [];
  let n = y(text);
  if (!n.success) return [];
  let retentionCutoff = await r.retentionCutoff();
  return retentionCutoff === null
    ? n.data.sessions
    : n.data.sessions.filter((session) => !v(session.at, retentionCutoff));
}
//@ chunk-8rjqe6hb.js:923-995 placement
function y(r) {
  try {
    return unboundCreatesFileSchema().safeParse(jsonParse(r));
  } catch {
    return { success: !1 };
  }
}
//@ chunk-8rjqe6hb.js:995-1069 placement
function v(r, i) {
  let parse = Date.parse(r);
  return Number.isNaN(parse) || parse < i.getTime();
}
//@ chunk-8rjqe6hb.js:1069-1330 placement
async function rememberUnboundCreate(r, i, n) {
  try {
    let e = sessionIdBody(r),
      sliced = [
        ...(await readUnboundCreates(n)).filter((g) => sessionIdBody(g.id) !== e),
        { id: e, reason: i, at: n.now().toISOString() },
      ].slice(-MAX_UNBOUND_CREATES);
    await n.writeText(
      jsonStringify({ version: 1, sessions: sliced }, null, 2) +
        `
`,
    );
  } catch (error) {
    logForDebugging(`[deviceBind] unbound create not recorded (${errorMessage(error)})`);
  }
}
//@ chunk-8rjqe6hb.js:1330-1536 placement
async function unboundCreateReason(r, i, n) {
  try {
    let e = sessionIdBody(r),
      found = (await readUnboundCreates(n)).find((a) => sessionIdBody(a.id) === e);
    return found !== void 0 && i(found.reason) ? found.reason : void 0;
  } catch (error) {
    logForDebugging(`[deviceBind] unbound-create record unreadable (${errorMessage(error)})`);
    return;
  }
}
/**
 * 未绑定设备创建会话的记录读写依赖。
 */
//@ chunk-8rjqe6hb.js:1536-2182 placement
function productionUnboundCreatesDeps(r) {
  let i = isStorageV5Enabled() && r !== void 0 ? r : void 0,
    state = STORAGE_SPACES.state(DEVICE_UNBOUND_CREATES);
  return {
    readText: async () => {
      if (i) {
        let text = await i.readText([state]);
        if (!text.ok) throw Error("device unbound-creates read failed");
        let s = text.value.items[0];
        return s.found ? s.value : void 0;
      }
      try {
        return await getFileReader().read(c());
      } catch (error) {
        if (isENOENT(error)) return;
        throw error;
      }
    },
    writeText: async (e) => {
      if (i) {
        if (!(await i.write(state, e, { mode: 384 })).ok) throw Error("device unbound-creates write failed");
        return;
      }
      let s = c();
      (await getFileReader().mkdir(dirname(s), 448), await getFileReader().atomicWrite(s, e, 384));
    },
    now: () => new Date(),
    retentionCutoff: async () => {
      let e = await import("./chunk-xdz4h5jb.js");
      return (await e.isRetentionCleanupSafe(r, 0)) ? e.getCutoffDate() : null;
    },
  };
}

export { unboundCreateReason, productionUnboundCreatesDeps };
