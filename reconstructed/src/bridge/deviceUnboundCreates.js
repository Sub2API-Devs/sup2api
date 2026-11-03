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
import { u, literal, array, string } from "../../vendor/zod/v4/classic/schemas.js";
import { getClaudeConfigDir } from "../utils/envUtils.js";
import { jsonParse, jsonStringify } from "../utils/slowOperations.js";
import { sessionIdBody } from "./sessionIdCompat.js";
import { logForDebugging } from "../utils/debug.js";
import { errorMessage, isENOENT } from "../utils/errors.js";
import { isStorageV5Enabled } from "../utils/hoverRest.js";
import { STORAGE_SPACES } from "../utils/storage/storageSpaces.js";
import { getFileReader } from "../utils/fileStore.js";

//@ chunk-8rjqe6hb.js:564-669 placement
var MAX_UNBOUND_CREATES = 50;
var unboundCreatesFileSchema = DoctorLazy(() =>
  u({
    version: literal(1),
    sessions: array(
      u({
        id: string(),
        reason: string(),
        at: string(),
      }),
    ),
  }),
);
var DEVICE_UNBOUND_CREATES = "device-unbound-creates";
//@ chunk-8rjqe6hb.js:669-717 placement
function unboundCreatesFilePath() {
  return join(getClaudeConfigDir(), "state", `${DEVICE_UNBOUND_CREATES}.json`);
}
//@ chunk-8rjqe6hb.js:717-923 placement
/**
 * 读未绑定创建记录并按保留期过滤
 */
async function readUnboundCreates(r) {
  let text = await r.readText();
  if (text === undefined) return [];
  let unboundCreatesFile = parseUnboundCreatesFile(text);
  if (!unboundCreatesFile.success) return [];
  let e = await r.retentionCutoff();
  return e === null
    ? unboundCreatesFile.data.sessions
    : unboundCreatesFile.data.sessions.filter((session) => !isOlderThanCutoff(session.at, e));
}
//@ chunk-8rjqe6hb.js:923-995 placement
function parseUnboundCreatesFile(r) {
  try {
    return unboundCreatesFileSchema().safeParse(jsonParse(r));
  } catch {
    return {
      success: false,
    };
  }
}
//@ chunk-8rjqe6hb.js:995-1069 placement
function isOlderThanCutoff(r, i) {
  let timestamp = Date.parse(r);
  return Number.isNaN(timestamp) || timestamp < i.getTime();
}
//@ chunk-8rjqe6hb.js:1069-1330 placement
async function rememberUnboundCreate(r, reason, n) {
  try {
    let e = sessionIdBody(r);
    let sessions = [
      ...(await readUnboundCreates(n)).filter((g) => sessionIdBody(g.id) !== e),
      {
        id: e,
        reason,
        at: n.now().toISOString(),
      },
    ].slice(-MAX_UNBOUND_CREATES);
    await n.writeText(
      jsonStringify(
        {
          version: 1,
          sessions,
        },
        null,
        2,
      ) +
        `
`,
    );
  } catch (error) {
    logForDebugging(`[deviceBind] unbound create not recorded (${errorMessage(error)})`);
  }
}
//@ chunk-8rjqe6hb.js:1330-1536 placement
async function unboundCreateReason(r, isKnownDeviceBindingRefusal, n) {
  try {
    let e = sessionIdBody(r);
    let found = (await readUnboundCreates(n)).find((a) => sessionIdBody(a.id) === e);
    return found !== undefined && isKnownDeviceBindingRefusal(found.reason) ? found.reason : undefined;
  } catch (error) {
    logForDebugging(`[deviceBind] unbound-create record unreadable (${errorMessage(error)})`);
    return;
  }
}
//@ chunk-8rjqe6hb.js:1536-2182 placement
/**
 * 未绑定设备创建会话的记录读写依赖。
 */
function productionUnboundCreatesDeps(storageV5) {
  let i = isStorageV5Enabled() && storageV5 !== undefined ? storageV5 : undefined;
  let n = STORAGE_SPACES.state(DEVICE_UNBOUND_CREATES);
  return {
    readText: async () => {
      if (i) {
        let text = await i.readText([n]);
        if (!text.ok) throw Error("device unbound-creates read failed");
        let s = text.value.items[0];
        return s.found ? s.value : undefined;
      }
      try {
        return await getFileReader().read(unboundCreatesFilePath());
      } catch (error) {
        if (isENOENT(error)) return;
        throw error;
      }
    },
    writeText: async (e) => {
      if (i) {
        if (
          !(
            await i.write(n, e, {
              mode: 384,
            })
          ).ok
        )
          throw Error("device unbound-creates write failed");
        return;
      }
      let s = unboundCreatesFilePath();
      await getFileReader().mkdir(dirname(s), 448);
      await getFileReader().atomicWrite(s, e, 384);
    },
    now: () => new Date(),
    retentionCutoff: async () => {
      let e = await import("./chunk-xdz4h5jb.js");
      return (await e.isRetentionCleanupSafe(storageV5, 0)) ? e.getCutoffDate() : null;
    },
  };
}
export { unboundCreateReason, productionUnboundCreatesDeps };
