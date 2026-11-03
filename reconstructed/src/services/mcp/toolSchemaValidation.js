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
import { LXr } from "../../remote/tools/inputSchemaFlatten.js";
import { jsonStringify, jsonStringifyRaw } from "../../utils/slowOperations.js";
import { env } from "../../utils/env.js";
import { mn } from "../../utils/remoteEnvironment.js";
import { ht } from "./cliOwnedClients.js";
import { filterRemoteRepoTools } from "../analytics/metadata.js";
import { createListingSanitizer } from "../../tools/WebFetchTool/sanitizeListing.js";
import { ir } from "./client.js";
import { mcpServerSource } from "./fileReference/fileReferencePolicy.js";
import { dynamicServerConnectorId } from "./mcpToolDecoration.js";
import { qq } from "./claudeai.js";
import { TB } from "./mcpTimeouts.js";
import { officialPluginPromptOverrides } from "./officialPluginPromptOverrides.js";
import { sT } from "../../utils/pastedContent.js";
import { isServerIdentityActive } from "./serverIdentity.js";
import { logFeatureOk } from "../analytics/featureTelemetry.js";

//@ chunk-1dth5azr.js:4795-5114 placement
function loadDraft202012MetaValidator() {
  if (S === void 0) {
    try {
      let e = require("./chunk-n332mrkv.js");
      S = typeof e.default === "function" ? e.default : null;
    } catch {
      S = null;
    }
    if (S === null)
      (logForDebugging("MCP: draft 2020-12 meta-validator unavailable \u2014 tool schema checks fail open", {
        level: "warn",
      }),
        logEvent("tengu_mcp_degraded", { reason: lit("schema_validator_unavailable") }));
  }
  return S;
}
//@ chunk-1dth5azr.js:5114-5136 placement
function A() {
  return !1;
}
//@ chunk-1dth5azr.js:5136-5265 placement
function invalidPropertyName(e) {
  if (!isPlainObject(e) || !isPlainObject(e.properties)) return null;
  for (let n of Object.keys(e.properties)) if (!LXr.test(n)) return n;
  return null;
}
//@ chunk-1dth5azr.js:5265-5299 placement
function ezs(e) {
  return validateToolInputSchema(loadDraft202012MetaValidator, e, A());
}
//@ chunk-1dth5azr.js:5299-6032 placement
function validateToolInputSchema(e, n, f) {
  let r = invalidPropertyName(n);
  if (r !== null)
    return {
      valid: !1,
      check: "propertyKey",
      detail: `property key ${jsonStringify(r.slice(0, 80))} does not match ${LXr}`,
    };
  let s = n;
  if (isPlainObject(n)) {
    let entries = Object.entries(n);
    if (entries.some(([, l]) => l === null))
      ((entries = entries.filter(([, l]) => l !== null)), (s = Object.fromEntries(entries)));
    let $schema = s.$schema;
    if ($schema !== void 0)
      if (f) {
        let { $schema: $schema, ...y } = s;
        s = y;
      } else if (typeof $schema === "string" && ($schema === z || $schema === `${z}#`));
      else return { valid: !0 };
  }
  try {
    if (h(s)) return { valid: !0 };
    let c = e();
    if (c === null) return { valid: !0 };
    if (c(s)) return { valid: !0 };
    let d = c.errors?.[0];
    return {
      valid: !1,
      check: "meta",
      detail: d ? `schema${d.instancePath} ${d.message ?? "is invalid"}` : "schema is invalid",
    };
  } catch (error) {
    return {
      valid: !1,
      check: "meta",
      detail: `validation threw: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
//@ chunk-1dth5azr.js:6032-6056 placement
var K = 3600000,
  W = 1048576;
//@ chunk-1dth5azr.js:6056-6129 placement
function S4n() {
  return env.CLAUDE_CODE_MCP_SKIP_UNCHANGED_RELIST === !0 && mn();
}
//@ chunk-1dth5azr.js:6129-7220 placement
function listToolsWithMemo(e, n, f, r, s) {
  if (!mn()) return;
  let c = ht(),
    d = c.toolListingMemos.get(e) ?? { buildsUnderWay: 0, built: void 0 };
  c.toolListingMemos.set(e, d);
  let built = d.built;
  ((d.built = void 0), (d.buildsUnderWay += 1));
  let y = filterRemoteRepoTools(e.config, n),
    j = createListingSanitizer(W);
  if (!y.every((k) => j(k))) return;
  let C = () =>
      jsonStringifyRaw([
        ir(e.name, e.config),
        e.config.scope,
        e.config.pluginSource,
        f,
        mcpServerSource(e.name, e.config),
        dynamicServerConnectorId(e.name, e.config),
        qq(e.name, e.config),
        s(),
        A(),
        TB(e.config),
        TB(e.config, !0),
        e.config.type === "sdk" && env.CLAUDE_AGENT_SDK_MCP_NO_PREFIX,
        officialPluginPromptOverrides(e.config),
      ]),
    T = C(),
    mapped = y.map((k) => sT(jsonStringifyRaw(k))),
    joined = mapped.join(),
    E = sT(mapped.toSorted().join()),
    P = built?.inputs === T && built.toolsHash === joined,
    x = {
      inputs: T,
      readInputs: C,
      toolsHash: joined,
      anyOrderToolsHash: E,
      unchanged: P,
      reordered: !P && built?.inputs === T && built.anyOrderToolsHash === E,
    };
  if (
    !P ||
    built.tools === void 0 ||
    y.length === 0 ||
    !S4n() ||
    isServerIdentityActive() ||
    Date.now() - built.builtAtMs >= K
  )
    return { ...x, reuse: void 0 };
  if (((d.built = built), (d.buildsUnderWay -= 1), r.seq > r.state.applied))
    ((r.state.applied = r.seq), (e.droppedTools = built.droppedTools));
  return (
    c.persistedDiscoveryRounds.delete(built.tools),
    logFeatureOk("mcp_list_tools"),
    c.toolListingVerdicts.set(built.tools, { unchanged: !0, reordered: !1, reused: !0 }),
    { ...x, reuse: built.tools }
  );
}
/**
 * 工具列表构建结束后记录结论，并在没有并发构建、输入未变时保存构建结果供复用。
 */
//@ chunk-1dth5azr.js:7220-7674 placement
function settleToolListingMemo(e, n, f, r) {
  let s = ht();
  if (n !== void 0)
    s.toolListingVerdicts.set(f, { unchanged: n.unchanged, reordered: n.reordered, reused: !1 });
  let c = s.toolListingMemos.get(e);
  if (c === void 0) return;
  if (
    ((c.buildsUnderWay -= 1),
    n === void 0 || c.buildsUnderWay > 0 || r.seq !== r.state.started || n.readInputs() !== n.inputs)
  )
    return;
  c.built = {
    inputs: n.inputs,
    toolsHash: n.toolsHash,
    anyOrderToolsHash: n.anyOrderToolsHash,
    builtAtMs: Date.now(),
    tools: S4n() ? f : void 0,
    droppedTools: e.droppedTools,
  };
}
//@ chunk-1dth5azr.js:7674-7773 placement
function tzs(e) {
  if (!mn()) return {};
  return { unchangedSkipOn: S4n(), ...ht().toolListingVerdicts.get(e) };
}
//@ chunk-1dth5azr.js:7773-7871 placement = findChromeClient (0.783)
function isSameConnectedClient(e, n) {
  return e === n || (e?.type === "connected" && n?.type === "connected" && e.client === n.client);
}

export { isSameConnectedClient, listToolsWithMemo, settleToolListingMemo, S4n, tzs, ezs };
