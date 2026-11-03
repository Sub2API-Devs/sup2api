/**
 * services/deviceBridge/deviceMcpConsent.ts
 *
 * 2.1.316 新增：设备 MCP 同意与"暂不"状态的读写。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-weh04swb.js (24)
 * attribution: placement 24
 */
import { join, dirname } from "path";
import { hostname } from "os";
import { lit } from "../analytics/safeMetadata.js";
import { ADMIN_SCOPES } from "./passthroughMcp.js";
import { Exr } from "../../remote/tools/serve/servedPermissionDecision.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, T, U, o, A } from "../../../vendor/zod/v4/classic/schemas.js";
import { tildify } from "../../utils/path.js";
import { getClaudeConfigDir } from "../../utils/envUtils.js";
import { logForDebugging } from "../../utils/debug.js";
import { errorMessage, isENOENT } from "../../utils/errors.js";
import { jsonParse, jsonStringify } from "../../utils/slowOperations.js";
import { normalizeHostname } from "../remoteTools/unattendedConsentStore.js";
import { isStorageV5Enabled } from "../../utils/hoverRest.js";
import { STORAGE_SPACES } from "../../utils/storage/storageSpaces.js";
import { getFileReader } from "../../utils/fileStore.js";
import { shortLabel } from "../../utils/permissions/approvalPayloadSerialization.js";

//@ chunk-weh04swb.js:18955-18984 placement
var MCP_PASSTHROUGH = lit("mcp_passthrough");
//@ chunk-weh04swb.js:18984-19016 placement
function we(e) {
  return ADMIN_SCOPES.has(e);
}
//@ chunk-weh04swb.js:19016-19025 placement
var Z = !1;
//@ chunk-weh04swb.js:19025-19074 placement
function eAs(e) {
  return !we(e) && (Z || e !== "project");
}
//@ chunk-weh04swb.js:19074-19083 placement
var Te = 1;
//@ chunk-weh04swb.js:19083-19199 placement
function describeConsentPolicy() {
  return [Exr ? "each-call-asked" : "local-rules-decide", Z ? "project-servers" : "no-project-servers"].join(
    "+",
  );
}
/**
 * 设备 MCP 同意记录的 schema（版本、接受/拒绝、条款、决定时间、主机名）及其存储键名与"暂不"键名。
 */
//@ chunk-weh04swb.js:19199-19364 placement
var DEVICE_MCP_CONSENT_SCHEMA = DoctorLazy(() =>
    u({ version: T(Te), choice: U(["accepted", "declined"]), terms: o(), decidedAt: o(), hostname: o() }),
  ),
  DEVICE_MCP_CONSENT = "device-mcp-consent",
  DEVICE_MCP_CONSENT_NOT_NOW = "device-mcp-consent-not-now",
  CONSENT_SCHEMA_VERSION = 1;
//@ chunk-weh04swb.js:19364-19424 placement
function tAs() {
  return `delete ${tildify(_t())} to be asked again`;
}
//@ chunk-weh04swb.js:19424-19507 placement
function _0n() {
  return `delete ${tildify(bt())}, then start a new claude --cloud session`;
}
//@ chunk-weh04swb.js:19507-19558 placement
function ee(e) {
  return join(getClaudeConfigDir(), "state", `${e}.json`);
}
//@ chunk-weh04swb.js:19558-19586 placement
function _t() {
  return ee(DEVICE_MCP_CONSENT);
}
//@ chunk-weh04swb.js:19586-19614 placement
function bt() {
  return ee(DEVICE_MCP_CONSENT_NOT_NOW);
}
//@ chunk-weh04swb.js:19614-19974 placement
async function readDeviceMcpConsent(e) {
  let n;
  try {
    n = await e.readText();
  } catch (error) {
    return (
      logForDebugging(`device-mcp consent: store unreadable (${errorMessage(error)})`, { level: "warn" }),
      "unreadable"
    );
  }
  if (n === void 0) return "unset";
  try {
    let safeParse = DEVICE_MCP_CONSENT_SCHEMA().safeParse(jsonParse(n));
    return safeParse.success &&
      normalizeHostname(safeParse.data.hostname) === normalizeHostname(e.hostname()) &&
      (safeParse.data.choice === "declined" || safeParse.data.terms === describeConsentPolicy())
      ? safeParse.data.choice
      : "unset";
  } catch {
    return "unset";
  }
}
//@ chunk-weh04swb.js:19974-20049 placement
async function deviceMcpConsentAnswer(e) {
  let n = await readDeviceMcpConsent(e);
  return n === "unreadable" ? "unset" : n;
}
//@ chunk-weh04swb.js:20049-20298 placement
async function writeDeviceMcpConsent(e, n) {
  try {
    return (
      await n.writeText(
        jsonStringify(
          {
            version: Te,
            choice: e,
            terms: describeConsentPolicy(),
            decidedAt: n.now().toISOString(),
            hostname: normalizeHostname(n.hostname()),
          },
          null,
          2,
        ) +
          `
`,
      ),
      !0
    );
  } catch (error) {
    return (
      logForDebugging(`device-mcp consent: answer not saved (${errorMessage(error)})`, { level: "warn" }),
      !1
    );
  }
}
//@ chunk-weh04swb.js:20298-20373 placement
var At = DoctorLazy(() =>
  u({ version: T(CONSENT_SCHEMA_VERSION), servers: A(o()), decidedAt: o(), hostname: o() }),
);
//@ chunk-weh04swb.js:20373-20658 placement
async function readDeviceMcpNotNow(e) {
  let n;
  try {
    n = await e.readText();
  } catch (error) {
    return (
      logForDebugging(`device-mcp not-now: store unreadable (${errorMessage(error)})`, { level: "warn" }),
      []
    );
  }
  if (n === void 0) return [];
  try {
    let safeParse = At().safeParse(jsonParse(n));
    return safeParse.success && normalizeHostname(safeParse.data.hostname) === normalizeHostname(e.hostname())
      ? safeParse.data.servers
      : [];
  } catch {
    return [];
  }
}
//@ chunk-weh04swb.js:20658-20890 placement
async function writeDeviceMcpNotNow(e, n) {
  try {
    return (
      await n.writeText(
        jsonStringify(
          {
            version: CONSENT_SCHEMA_VERSION,
            servers: e,
            decidedAt: n.now().toISOString(),
            hostname: normalizeHostname(n.hostname()),
          },
          null,
          2,
        ) +
          `
`,
      ),
      !0
    );
  } catch (error) {
    return (logForDebugging(`device-mcp not-now: not saved (${errorMessage(error)})`, { level: "warn" }), !1);
  }
}
//@ chunk-weh04swb.js:20890-21009 placement
async function clearDeviceMcpNotNow(e) {
  try {
    await e.removeText();
  } catch (error) {
    logForDebugging(`device-mcp not-now: not cleared (${errorMessage(error)})`, { level: "warn" });
  }
}
//@ chunk-weh04swb.js:21009-21099 placement
function ppt(e, n) {
  if (e.length === 0) return !1;
  let i = new Set(e);
  return n.every((m) => i.has(m));
}
/**
 * 为设备 MCP 状态建立读写对象：启用 v5 存储时读写存储里的 state 键，否则读写本地文件（0600 原子写）；附带当前时间与主机名函数。
 */
//@ chunk-weh04swb.js:21099-21768 placement
function createDeviceMcpStateStore(key, storage) {
  let v5Storage = isStorageV5Enabled() && storage !== void 0 ? storage : void 0,
    state = STORAGE_SPACES.state(key),
    filePath = ee(key);
  return {
    readText: async () => {
      if (v5Storage) {
        let text = await v5Storage.readText([state]);
        if (!text.ok) throw Error("device-mcp state read failed");
        let v = text.value.items[0];
        return v.found ? v.value : void 0;
      }
      try {
        return await getFileReader().read(filePath);
      } catch (error) {
        if (isENOENT(error)) return;
        throw error;
      }
    },
    writeText: async (c) => {
      if (v5Storage) {
        if (!(await v5Storage.write(state, c, { mode: 384 })).ok)
          throw Error("device-mcp state write failed");
        return;
      }
      (await getFileReader().mkdir(dirname(filePath), 448),
        await getFileReader().atomicWrite(filePath, c, 384));
    },
    removeText: async () => {
      if (v5Storage) {
        if (!(await v5Storage.delete(state)).ok) throw Error("device-mcp state delete failed");
        return;
      }
      try {
        await getFileReader().delete(filePath);
      } catch (error) {
        if (!isENOENT(error)) throw error;
      }
    },
    now: () => new Date(),
    hostname: hostname,
  };
}
//@ chunk-weh04swb.js:21768-21800 placement
function deviceMcpConsentStore(e) {
  return createDeviceMcpStateStore(DEVICE_MCP_CONSENT, e);
}
//@ chunk-weh04swb.js:21800-21832 placement
function deviceMcpNotNowStore(e) {
  return createDeviceMcpStateStore(DEVICE_MCP_CONSENT_NOT_NOW, e);
}
//@ chunk-weh04swb.js:21832-21861 placement
function t9(e) {
  return shortLabel(e);
}

export {
  deviceMcpConsentAnswer,
  deviceMcpConsentStore,
  ppt,
  readDeviceMcpNotNow,
  deviceMcpNotNowStore,
  readDeviceMcpConsent,
  writeDeviceMcpNotNow,
  clearDeviceMcpNotNow,
  t9,
  writeDeviceMcpConsent,
  eAs,
  tAs,
  _0n,
  we,
  MCP_PASSTHROUGH,
};
