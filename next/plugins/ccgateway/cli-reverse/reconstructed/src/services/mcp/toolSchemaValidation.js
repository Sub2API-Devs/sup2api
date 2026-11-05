/**
 * services/mcp/toolSchemaValidation.ts
 *
 * 2.1.316 新增。MCP 工具 inputSchema 校验与 tools/list 记忆。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-n6f7qd6s.js (12)
 * attribution: placement 11
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { logForDebugging } from "../../utils/debug.js";
import { logEvent } from "../analytics/index.js";
import { lit } from "../analytics/safeMetadata.js";
import { isPlainObject } from "../../utils/isPlainObject.js";
import { SAFE_SCHEMA_KEY_RE } from "../../remote/tools/inputSchemaFlatten.js";
import { jsonStringify, jsonStringifyRaw } from "../../utils/slowOperations.js";
import { isValidSchemaShape } from "../../../vendor/json-schema-typed/2020_12.js";
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

//@ chunk-n6f7qd6s.js:4741-4796 esm-fingerprint (moved: shares a binding it assigns)
var DRAFT_2020_12_SCHEMA_ID = "https://json-schema.org/draft/2020-12/schema";
var draft202012MetaValidator;
//@ chunk-n6f7qd6s.js:4796-5115 placement
function loadDraft202012MetaValidator() {
  if (draft202012MetaValidator === undefined) {
    try {
      let metaValidatorModule = require("../../../vendor/@modelcontextprotocol/client/dist/default.lazy.js");
      draft202012MetaValidator =
        typeof metaValidatorModule.default === "function" ? metaValidatorModule.default : null;
    } catch {
      draft202012MetaValidator = null;
    }
    if (draft202012MetaValidator === null) {
      logForDebugging("MCP: draft 2020-12 meta-validator unavailable \u2014 tool schema checks fail open", {
        level: "warn",
      });
      logEvent("tengu_mcp_degraded", {
        reason: lit("schema_validator_unavailable"),
      });
    }
  }
  return draft202012MetaValidator;
}
//@ chunk-n6f7qd6s.js:5115-5137 placement
/**
 * 恒返回 false 的占位判断。
 */
function alwaysFalse() {
  return false;
}
//@ chunk-n6f7qd6s.js:5137-5266 placement
function invalidPropertyName(schema) {
  if (!isPlainObject(schema) || !isPlainObject(schema.properties)) return null;
  for (let key of Object.keys(schema.properties)) if (!SAFE_SCHEMA_KEY_RE.test(key)) return key;
  return null;
}
//@ chunk-n6f7qd6s.js:5266-5300 placement
/**
 * 校验工具输入 schema 是否合法。
 */
function validateToolSchema(schema) {
  return validateToolInputSchema(loadDraft202012MetaValidator, schema, alwaysFalse());
}
//@ chunk-n6f7qd6s.js:5300-6033 placement
function validateToolInputSchema(getValidator, schema, stripDialect) {
  let badKey = invalidPropertyName(schema);
  if (badKey !== null)
    return {
      valid: false,
      check: "propertyKey",
      detail: `property key ${jsonStringify(badKey.slice(0, 80))} does not match ${SAFE_SCHEMA_KEY_RE}`,
    };
  let candidate = schema;
  if (isPlainObject(schema)) {
    let entries = Object.entries(schema);
    if (entries.some(([, value]) => value === null)) {
      entries = entries.filter(([, value]) => value !== null);
      candidate = Object.fromEntries(entries);
    }
    let $schema = candidate.$schema;
    if ($schema !== undefined)
      if (stripDialect) {
        let { $schema, ...rest } = candidate;
        candidate = rest;
      } else if (
        typeof $schema === "string" &&
        ($schema === DRAFT_2020_12_SCHEMA_ID || $schema === `${DRAFT_2020_12_SCHEMA_ID}#`)
      );
      else
        return {
          valid: true,
        };
  }
  try {
    if (isValidSchemaShape(candidate))
      return {
        valid: true,
      };
    let validate = getValidator();
    if (validate === null)
      return {
        valid: true,
      };
    if (validate(candidate))
      return {
        valid: true,
      };
    let firstError = validate.errors?.[0];
    return {
      valid: false,
      check: "meta",
      detail: firstError
        ? `schema${firstError.instancePath} ${firstError.message ?? "is invalid"}`
        : "schema is invalid",
    };
  } catch (error) {
    return {
      valid: false,
      check: "meta",
      detail: `validation threw: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
//@ chunk-n6f7qd6s.js:6033-6057 placement
/**
 * 工具列表序列化的最大字节数（1 MiB）。
 */
var VALIDATOR_TTL_MS = 3600000;
var MAX_LISTING_BYTES = 1048576;
//@ chunk-n6f7qd6s.js:6057-6130 placement
/**
 * 是否跳过未变化的工具重新列举。
 */
function isUnchangedRelistSkipOn() {
  return env.CLAUDE_CODE_MCP_SKIP_UNCHANGED_RELIST === true && isRemoteManagedEnvironment();
}
//@ chunk-n6f7qd6s.js:6130-7231 placement
function listToolsWithMemo(client, tools, epoch, round, getOptions) {
  if (!isRemoteManagedEnvironment()) return;
  let cliOwnedState = getCliOwnedState();
  let memo = cliOwnedState.toolListingMemos.get(client) ?? {
    buildsUnderWay: 0,
    built: undefined,
  };
  cliOwnedState.toolListingMemos.set(client, memo);
  let built = memo.built;
  memo.built = undefined;
  memo.buildsUnderWay += 1;
  if (!isUnchangedRelistSkipOn()) return;
  let filteredTools = filterRemoteRepoTools(client.config, tools);
  let listingSanitizer = createListingSanitizer(MAX_LISTING_BYTES);
  if (!filteredTools.every((tool) => listingSanitizer(tool))) return;
  let buildInputs = () =>
    jsonStringifyRaw([
      serverCacheKey(client.name, client.config),
      client.config.scope,
      client.config.pluginSource,
      epoch,
      mcpServerSource(client.name, client.config),
      dynamicServerConnectorId(client.name, client.config),
      requiresConnectorGrant(client.name, client.config),
      getOptions(),
      alwaysFalse(),
      toolTimeoutForServer(client.config),
      toolTimeoutForServer(client.config, true),
      client.config.type === "sdk" && env.CLAUDE_AGENT_SDK_MCP_NO_PREFIX,
      officialPluginPromptOverrides(client.config),
    ]);
  let inputs = buildInputs();
  let mapped = filteredTools.map((tool) => bunHashOf(jsonStringifyRaw(tool)));
  let joined = mapped.join();
  let anyOrderHash = bunHashOf(mapped.toSorted().join());
  let unchanged = built?.inputs === inputs && built.toolsHash === joined;
  let state = {
    inputs,
    readInputs: buildInputs,
    toolsHash: joined,
    anyOrderToolsHash: anyOrderHash,
    unchanged,
    reordered: !unchanged && built?.inputs === inputs && built.anyOrderToolsHash === anyOrderHash,
  };
  if (
    !unchanged ||
    built.tools === undefined ||
    filteredTools.length === 0 ||
    isServerIdentityActive() ||
    Date.now() - built.builtAtMs >= VALIDATOR_TTL_MS
  )
    return {
      ...state,
      reuse: undefined,
    };
  memo.built = built;
  memo.buildsUnderWay -= 1;
  if (round.seq > round.state.applied) {
    round.state.applied = round.seq;
    client.droppedTools = built.droppedTools;
  }
  cliOwnedState.persistedDiscoveryRounds.delete(built.tools);
  logFeatureOk("mcp_list_tools");
  cliOwnedState.toolListingVerdicts.set(built.tools, {
    unchanged: true,
    reordered: false,
    reused: true,
  });
  return {
    ...state,
    reuse: built.tools,
  };
}
//@ chunk-n6f7qd6s.js:7231-7685 placement
/**
 * 工具列表构建结束后记录结论，并在没有并发构建、输入未变时保存构建结果供复用。
 */
function settleToolListingMemo(client, result, tools, round) {
  let cliOwnedState = getCliOwnedState();
  if (result !== undefined)
    cliOwnedState.toolListingVerdicts.set(tools, {
      unchanged: result.unchanged,
      reordered: result.reordered,
      reused: false,
    });
  let memo = cliOwnedState.toolListingMemos.get(client);
  if (memo === undefined) return;
  memo.buildsUnderWay -= 1;
  if (
    result === undefined ||
    memo.buildsUnderWay > 0 ||
    round.seq !== round.state.started ||
    result.readInputs() !== result.inputs
  )
    return;
  memo.built = {
    inputs: result.inputs,
    toolsHash: result.toolsHash,
    anyOrderToolsHash: result.anyOrderToolsHash,
    builtAtMs: Date.now(),
    tools: isUnchangedRelistSkipOn() ? tools : undefined,
    droppedTools: client.droppedTools,
  };
}
//@ chunk-n6f7qd6s.js:7685-7784 placement
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
//@ chunk-n6f7qd6s.js:7784-7882 placement (2.1.88 match: findChromeClient, 0.783)
function isSameConnectedClient(a, b) {
  return a === b || (a?.type === "connected" && b?.type === "connected" && a.client === b.client);
}
export {
  isSameConnectedClient,
  listToolsWithMemo,
  settleToolListingMemo,
  validateToolSchema,
  isUnchangedRelistSkipOn,
  toolListingVerdict,
};
