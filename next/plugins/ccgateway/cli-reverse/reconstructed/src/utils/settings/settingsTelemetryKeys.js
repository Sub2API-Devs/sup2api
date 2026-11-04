/**
 * utils/settings/settingsTelemetryKeys.ts
 *
 * 2.1.316 新增：设置遥测键
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-3wek6r2k.js (5)
 * attribution: placement 5
 */
import { catalogTelemetryFields } from "../model/servedModelCatalog.js";
import { pickByHelper } from "../git/gitSafeEnv.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";

//@ chunk-3wek6r2k.js:90632-90755 placement
function managedKeyTelemetry(kind, comparison, hourBand) {
  let fields = catalogTelemetryFields(comparison, hourBand);
  if (kind !== "managed_key") return fields;
  return pickByHelper(fields, (value) => typeof value === "boolean" || typeof value === "number");
}
//@ chunk-3wek6r2k.js:90755-90843 placement
function settingsSourceTag(outcome, catalog) {
  if (catalog === null) return fromEnum("none");
  let source = outcome.entry?.source;
  return fromEnum(source ?? "seed");
}
//@ chunk-3wek6r2k.js:90843-91454 placement
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
//@ chunk-3wek6r2k.js:91454-91584 placement
function frontmatterKeyFlags(declaredFields) {
  let declared = declaredFields && new Set(declaredFields.map(AGENT_FRONTMATTER_KEYS));
  return Object.fromEntries(
    AGENT_FRONTMATTER_KEYS_2.map((field) => {
      let key = AGENT_FRONTMATTER_KEYS(field);
      return [`has_${key}`, declared?.has(key) ?? false];
    }),
  );
}
//@ chunk-3wek6r2k.js:91584-91593 placement
var MAX_TELEMETRY_KEYS = 8;
export { settingsSourceTag, managedKeyTelemetry, MAX_TELEMETRY_KEYS, frontmatterKeyFlags };
