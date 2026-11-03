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
import { Do } from "../git/gitSafeEnv.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";

//@ chunk-3wek6r2k.js:90632-90755 placement
function managedKeyTelemetry(e, o, n) {
  let r = catalogTelemetryFields(o, n);
  if (e !== "managed_key") return r;
  return Do(r, (u) => typeof u === "boolean" || typeof u === "number");
}
//@ chunk-3wek6r2k.js:90755-90843 placement
function settingsSourceTag(e, o) {
  if (o === null) return fromEnum("none");
  let n = e.entry?.source;
  return fromEnum(n ?? "seed");
}
//@ chunk-3wek6r2k.js:90843-91454 placement
var AGENT_FRONTMATTER_KEYS = [
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
  ],
  ll = (e) =>
    e
      .replaceAll("-", "_")
      .replace(/([a-z])([A-Z])/g, "$1_$2")
      .toLowerCase();
//@ chunk-3wek6r2k.js:91454-91584 placement
function frontmatterKeyFlags(e) {
  let o = e && new Set(e.map(ll));
  return Object.fromEntries(
    AGENT_FRONTMATTER_KEYS.map((n) => {
      let r = ll(n);
      return [`has_${r}`, o?.has(r) ?? !1];
    }),
  );
}
//@ chunk-3wek6r2k.js:91584-91593 placement
var MAX_TELEMETRY_KEYS = 8;

export { settingsSourceTag, managedKeyTelemetry, MAX_TELEMETRY_KEYS, frontmatterKeyFlags };
