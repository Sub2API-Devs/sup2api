/**
 * services/mcp/toolSchemaValidation.ts
 *
 * 2.1.316 新增。MCP 工具 inputSchema 校验与 tools/list 记忆。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-1dth5azr.js (11)
 * attribution: placement 11
 */
import { S, z, h } from "../../../vendor/json-schema-typed/2020_12.js";
import { logForDebugging } from "../../utils/debug.js";
import { logEvent } from "../analytics/index.js";
import { lit } from "../analytics/safeMetadata.js";
import { isPlainObject } from "../../utils/isPlainObject.js";
import { SAFE_SCHEMA_KEY_RE } from "../../remote/tools/inputSchemaFlatten.js";
import { jsonStringify, jsonStringifyRaw } from "../../utils/slowOperations.js";
import { env } from "../../utils/env.js";
import { isRemoteManagedEnvironment } from "../../utils/remoteEnvironment.js";
import { getCliOwnedState } from "./cliOwnedClients.js";
import { filterRemoteRepoTools } from "../analytics/metadata.js";
import { createListingSanitizer } from "../../tools/WebFetchTool/sanitizeListing.js";
import { serverCacheKey } from "./client.js";
import { mcpServerSource } from "./fileReference/fileReferencePolicy.js";
import { dynamicServerConnectorId } from "./mcpToolDecoration.js";
import { requiresConnectorGrant } from "./claudeai.js";
import { toolTimeoutForServer } from "./mcpTimeouts.js";
import { officialPluginPromptOverrides } from "./officialPluginPromptOverrides.js";
import { bunHashOf } from "../../utils/pastedContent.js";
import { isServerIdentityActive } from "./serverIdentity.js";
import { logFeatureOk } from "../analytics/featureTelemetry.js";

//@ chunk-1dth5azr.js:4795-5114 placement
function loadDraft202012MetaValidator() {
  if (S === undefined) {
    try {
      let e = require("./chunk-n332mrkv.js");
      S = typeof e.default === "function" ? e.default : null;
    } catch {
      S = null;
    }
    if (S === null) {
      logForDebugging("MCP: draft 2020-12 meta-validator unavailable \u2014 tool schema checks fail open", {
        level: "warn",
      });
      logEvent("tengu_mcp_degraded", {
        reason: lit("schema_validator_unavailable"),
      });
    }
  }
  return S;
}
//@ chunk-1dth5azr.js:5114-5136 placement
/**
 * 恒返回 false 的占位判断。
 */
function alwaysFalse() {
  return false;
}
//@ chunk-1dth5azr.js:5136-5265 placement
function invalidPropertyName(e) {
  if (!isPlainObject(e) || !isPlainObject(e.properties)) return null;
  for (let key of Object.keys(e.properties)) if (!SAFE_SCHEMA_KEY_RE.test(key)) return key;
  return null;
}
//@ chunk-1dth5azr.js:5265-5299 placement
/**
 * 校验工具输入 schema 是否合法。
 */
function validateToolSchema(e) {
  return validateToolInputSchema(loadDraft202012MetaValidator, e, alwaysFalse());
}
//@ chunk-1dth5azr.js:5299-6032 placement
function validateToolInputSchema(e, n, f) {
  let r = invalidPropertyName(n);
  if (r !== null)
    return {
      valid: false,
      check: "propertyKey",
      detail: `property key ${jsonStringify(r.slice(0, 80))} does not match ${SAFE_SCHEMA_KEY_RE}`,
    };
  let s = n;
  if (isPlainObject(n)) {
    let entries = Object.entries(n);
    if (entries.some(([, l]) => l === null)) {
      entries = entries.filter(([, l]) => l !== null);
      s = Object.fromEntries(entries);
    }
    let $schema = s.$schema;
    if ($schema !== undefined)
      if (f) {
        let { $schema, ...y } = s;
        s = y;
      } else if (typeof $schema === "string" && ($schema === z || $schema === `${z}#`));
      else
        return {
          valid: true,
        };
  }
  try {
    if (h(s))
      return {
        valid: true,
      };
    let c = e();
    if (c === null)
      return {
        valid: true,
      };
    if (c(s))
      return {
        valid: true,
      };
    let d = c.errors?.[0];
    return {
      valid: false,
      check: "meta",
      detail: d ? `schema${d.instancePath} ${d.message ?? "is invalid"}` : "schema is invalid",
    };
  } catch (error) {
    return {
      valid: false,
      check: "meta",
      detail: `validation threw: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
//@ chunk-1dth5azr.js:6032-6056 placement
/**
 * 工具列表序列化的最大字节数（1 MiB）。
 */
var VALIDATOR_TTL_MS = 3600000;
var MAX_LISTING_BYTES = 1048576;
//@ chunk-1dth5azr.js:6056-6129 placement
/**
 * 是否跳过未变化的工具重新列举。
 */
function isUnchangedRelistSkipOn() {
  return env.CLAUDE_CODE_MCP_SKIP_UNCHANGED_RELIST === true && isRemoteManagedEnvironment();
}
//@ chunk-1dth5azr.js:6129-7220 placement
function listToolsWithMemo(e, n, f, r, s) {
  if (!isRemoteManagedEnvironment()) return;
  let cliOwnedState = getCliOwnedState();
  let d = cliOwnedState.toolListingMemos.get(e) ?? {
    buildsUnderWay: 0,
    built: undefined,
  };
  cliOwnedState.toolListingMemos.set(e, d);
  let built = d.built;
  d.built = undefined;
  d.buildsUnderWay += 1;
  let y = filterRemoteRepoTools(e.config, n);
  let listingSanitizer = createListingSanitizer(MAX_LISTING_BYTES);
  if (!y.every((k) => listingSanitizer(k))) return;
  let C = () =>
    jsonStringifyRaw([
      serverCacheKey(e.name, e.config),
      e.config.scope,
      e.config.pluginSource,
      f,
      mcpServerSource(e.name, e.config),
      dynamicServerConnectorId(e.name, e.config),
      requiresConnectorGrant(e.name, e.config),
      s(),
      alwaysFalse(),
      toolTimeoutForServer(e.config),
      toolTimeoutForServer(e.config, true),
      e.config.type === "sdk" && env.CLAUDE_AGENT_SDK_MCP_NO_PREFIX,
      officialPluginPromptOverrides(e.config),
    ]);
  let T = C();
  let mapped = y.map((k) => bunHashOf(jsonStringifyRaw(k)));
  let joined = mapped.join();
  let E = bunHashOf(mapped.toSorted().join());
  let P = built?.inputs === T && built.toolsHash === joined;
  let x = {
    inputs: T,
    readInputs: C,
    toolsHash: joined,
    anyOrderToolsHash: E,
    unchanged: P,
    reordered: !P && built?.inputs === T && built.anyOrderToolsHash === E,
  };
  if (
    !P ||
    built.tools === undefined ||
    y.length === 0 ||
    !isUnchangedRelistSkipOn() ||
    isServerIdentityActive() ||
    Date.now() - built.builtAtMs >= VALIDATOR_TTL_MS
  )
    return {
      ...x,
      reuse: undefined,
    };
  d.built = built;
  d.buildsUnderWay -= 1;
  if (r.seq > r.state.applied) {
    r.state.applied = r.seq;
    e.droppedTools = built.droppedTools;
  }
  cliOwnedState.persistedDiscoveryRounds.delete(built.tools);
  logFeatureOk("mcp_list_tools");
  cliOwnedState.toolListingVerdicts.set(built.tools, {
    unchanged: true,
    reordered: false,
    reused: true,
  });
  return {
    ...x,
    reuse: built.tools,
  };
}
//@ chunk-1dth5azr.js:7220-7674 placement
/**
 * 工具列表构建结束后记录结论，并在没有并发构建、输入未变时保存构建结果供复用。
 */
function settleToolListingMemo(e, n, f, r) {
  let cliOwnedState = getCliOwnedState();
  if (n !== undefined)
    cliOwnedState.toolListingVerdicts.set(f, {
      unchanged: n.unchanged,
      reordered: n.reordered,
      reused: false,
    });
  let c = cliOwnedState.toolListingMemos.get(e);
  if (c === undefined) return;
  c.buildsUnderWay -= 1;
  if (n === undefined || c.buildsUnderWay > 0 || r.seq !== r.state.started || n.readInputs() !== n.inputs)
    return;
  c.built = {
    inputs: n.inputs,
    toolsHash: n.toolsHash,
    anyOrderToolsHash: n.anyOrderToolsHash,
    builtAtMs: Date.now(),
    tools: isUnchangedRelistSkipOn() ? f : undefined,
    droppedTools: e.droppedTools,
  };
}
//@ chunk-1dth5azr.js:7674-7773 placement
/**
 * 取该服务器的工具列举判定信息。
 */
function toolListingVerdict(newTools) {
  if (!isRemoteManagedEnvironment()) return {};
  return {
    unchangedSkipOn: isUnchangedRelistSkipOn(),
    ...getCliOwnedState().toolListingVerdicts.get(newTools),
  };
}
//@ chunk-1dth5azr.js:7773-7871 placement = findChromeClient (0.783)
function isSameConnectedClient(e, n) {
  return e === n || (e?.type === "connected" && n?.type === "connected" && e.client === n.client);
}
export {
  isSameConnectedClient,
  listToolsWithMemo,
  settleToolListingMemo,
  isUnchangedRelistSkipOn,
  toolListingVerdict,
  validateToolSchema,
};
