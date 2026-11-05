/**
 * bridge/deviceUnboundCreates.ts
 *
 * 2.1.316 新增。未绑定设备创建会话的记录读写依赖。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-q3thwjpn.js (8)
 * attribution: placement 8
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { join, dirname } from "path";
import { DoctorLazy } from "../cli/handlers/util.js";
import { objectSchema, literal, array, stringSchema } from "../../vendor/zod/v4/classic/schemas.js";
import { getClaudeConfigDir } from "../utils/markdownConfigLoader.js";
import { jsonParse, jsonStringify } from "../utils/slowOperations.js";
import { sessionIdBody } from "./sessionIdCompat.js";
import { logForDebugging } from "../utils/debug.js";
import { errorMessage, isENOENT } from "../utils/errors.js";
import { isStorageV5Enabled } from "../utils/hoverRest.js";
import { STORAGE_SPACES } from "../utils/storage/storageSpaces.js";
import { getFileReader } from "../utils/fileStore.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-q3thwjpn.js:564-669 placement
var MAX_UNBOUND_CREATES; // deferred: uses DoctorLazy (../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var unboundCreatesFileSchema;
var DEVICE_UNBOUND_CREATES;
deferInit("chunk-q3thwjpn.js:564", () => {
  MAX_UNBOUND_CREATES = 50;
  unboundCreatesFileSchema = DoctorLazy(() =>
    objectSchema({
      version: literal(1),
      sessions: array(
        objectSchema({
          id: stringSchema(),
          reason: stringSchema(),
          at: stringSchema(),
        }),
      ),
    }),
  );
  DEVICE_UNBOUND_CREATES = "device-unbound-creates";
});
//@ chunk-q3thwjpn.js:669-717 placement
function unboundCreatesFilePath() {
  return join(getClaudeConfigDir(), "state", `${DEVICE_UNBOUND_CREATES}.json`);
}
//@ chunk-q3thwjpn.js:717-923 placement
/**
 * 读未绑定创建记录并按保留期过滤
 */
async function readUnboundCreates(store) {
  let text = await store.readText();
  if (text === undefined) return [];
  let unboundCreatesFile = parseUnboundCreatesFile(text);
  if (!unboundCreatesFile.success) return [];
  let cutoff = await store.retentionCutoff();
  return cutoff === null
    ? unboundCreatesFile.data.sessions
    : unboundCreatesFile.data.sessions.filter((session) => !isOlderThanCutoff(session.at, cutoff));
}
//@ chunk-q3thwjpn.js:923-995 placement
function parseUnboundCreatesFile(text) {
  try {
    return unboundCreatesFileSchema().safeParse(jsonParse(text));
  } catch {
    return {
      success: false,
    };
  }
}
//@ chunk-q3thwjpn.js:995-1069 placement
function isOlderThanCutoff(isoTimestamp, cutoffDate) {
  let timestamp = Date.parse(isoTimestamp);
  return Number.isNaN(timestamp) || timestamp < cutoffDate.getTime();
}
//@ chunk-q3thwjpn.js:1069-1330 placement
async function rememberUnboundCreate(sessionId, reason, store) {
  try {
    let body = sessionIdBody(sessionId);
    let sessions = [
      ...(await readUnboundCreates(store)).filter((entry) => sessionIdBody(entry.id) !== body),
      {
        id: body,
        reason,
        at: store.now().toISOString(),
      },
    ].slice(-MAX_UNBOUND_CREATES);
    await store.writeText(
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
//@ chunk-q3thwjpn.js:1330-1536 placement
async function unboundCreateReason(sessionId, isKnownDeviceBindingRefusal, store) {
  try {
    let body = sessionIdBody(sessionId);
    let found = (await readUnboundCreates(store)).find((entry) => sessionIdBody(entry.id) === body);
    return found !== undefined && isKnownDeviceBindingRefusal(found.reason) ? found.reason : undefined;
  } catch (error) {
    logForDebugging(`[deviceBind] unbound-create record unreadable (${errorMessage(error)})`);
    return;
  }
}
//@ chunk-q3thwjpn.js:1536-2182 placement
/**
 * 未绑定设备创建会话的记录读写依赖。
 */
function productionUnboundCreatesDeps(storageV5) {
  let storage = isStorageV5Enabled() && storageV5 !== undefined ? storageV5 : undefined;
  let storeKey = STORAGE_SPACES.state(DEVICE_UNBOUND_CREATES);
  return {
    readText: async () => {
      if (storage) {
        let text = await storage.readText([storeKey]);
        if (!text.ok) throw Error("device unbound-creates read failed");
        let item = text.value.items[0];
        return item.found ? item.value : undefined;
      }
      try {
        return await getFileReader().read(unboundCreatesFilePath());
      } catch (error) {
        if (isENOENT(error)) return;
        throw error;
      }
    },
    writeText: async (text) => {
      if (storage) {
        if (
          !(
            await storage.write(storeKey, text, {
              mode: 384,
            })
          ).ok
        )
          throw Error("device unbound-creates write failed");
        return;
      }
      let path = unboundCreatesFilePath();
      await getFileReader().mkdir(dirname(path), 448);
      await getFileReader().atomicWrite(path, text, 384);
    },
    now: () => new Date(),
    retentionCutoff: async () => {
      let retentionModule = await import("../utils/cleanup.js");
      return (await retentionModule.isRetentionCleanupSafe(storageV5, 0))
        ? retentionModule.getCutoffDate()
        : null;
    },
  };
}
export { unboundCreateReason, productionUnboundCreatesDeps, rememberUnboundCreate };
