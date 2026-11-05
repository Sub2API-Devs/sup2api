/**
 * utils/settings/settingsTelemetryKeys.ts
 *
 * 2.1.316 新增：设置遥测键
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-hjswk319.js (5)
 * attribution: placement 5
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { catalogTelemetryFields } from "../model/servedModelCatalog.js";
import { pickByHelper } from "../git/gitSafeEnv.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";

//@ chunk-hjswk319.js:90031-90154 placement
function managedKeyTelemetry(kind, comparison, hourBand) {
  let fields = catalogTelemetryFields(comparison, hourBand);
  if (kind !== "managed_key") return fields;
  return pickByHelper(fields, (value) => typeof value === "boolean" || typeof value === "number");
}
//@ chunk-hjswk319.js:90154-90242 placement
function settingsSourceTag(outcome, catalog) {
  if (catalog === null) return fromEnum("none");
  let source = outcome.entry?.source;
  return fromEnum(source ?? "seed");
}
//@ chunk-hjswk319.js:90242-90853 placement
/**
 * AGENT_FRONTMATTER_KEYS：代理前置声明可用的键。
 */
var AGENT_FRONTMATTER_KEYS_2 = [
  "name",
  "description",
  "model",
  "allowed-tools",
  "disallowed-tools",
  "disallowedTools",
  "argument-hint",
  "arguments",
  "disable-model-invocation",
  "user-invocable",
  "effort",
  "shell",
  "version",
  "when_to_use",
  "paths",
  "hooks",
  "context",
  "agent",
  "background",
  "fallback",
  "created_by",
  "improved_by",
  "mcpServers",
  "lspServers",
  "agents",
  "outputStyles",
  "themes",
  "workflows",
  "channels",
  "monitors",
  "settings",
  "userConfig",
  "defaultEnabled",
  "experimental",
  "dependencies",
  "metadata",
  "displayName",
  "author",
  "homepage",
  "repository",
  "license",
  "keywords",
];
var AGENT_FRONTMATTER_KEYS = (name) =>
  name
    .replaceAll("-", "_")
    .replace(/([a-z])([A-Z])/g, "$1_$2")
    .toLowerCase();
//@ chunk-hjswk319.js:90853-90983 placement
function frontmatterKeyFlags(declaredFields) {
  let declared = declaredFields && new Set(declaredFields.map(AGENT_FRONTMATTER_KEYS));
  return Object.fromEntries(
    AGENT_FRONTMATTER_KEYS_2.map((field) => {
      let key = AGENT_FRONTMATTER_KEYS(field);
      return [`has_${key}`, declared?.has(key) ?? false];
    }),
  );
}
//@ chunk-hjswk319.js:90983-90992 placement
var MAX_TELEMETRY_KEYS = 8;
export { settingsSourceTag, managedKeyTelemetry, MAX_TELEMETRY_KEYS, frontmatterKeyFlags };
