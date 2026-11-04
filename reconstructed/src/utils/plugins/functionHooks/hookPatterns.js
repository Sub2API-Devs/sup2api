/**
 * utils/plugins/functionHooks/hookPatterns.ts
 *
 * 2.1.316 新增。函数钩子匹配模式。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-pab450vg.js (6)
 * attribution: placement 6
 */
import { HOOK_EVENTS_2 } from "../../../plugins/functionHooks/hookApiSurface.js";
import { matchesEventPattern, routesToUser } from "../../../plugins/functionHooks/eventPatterns.js";
import { isSecDefaultModule } from "../../../plugins/hooksModules/loadedModuleFilters.js";
import { matcherDoors } from "../../../plugins/functionHooks/sites/uiSites.js";
import { firstLineOf } from "../../stringUtils.js";
import { uniq } from "../../collections.js";
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-pab450vg.js:380-446 placement
var SESSION_ATTACHMENT_KINDS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-pab450vg.js:380", () => {
  SESSION_ATTACHMENT_KINDS = Object.freeze(["attachment", "hook-context", "compaction"]);
});
//@ chunk-pab450vg.js:446-566 placement
/**
 * 门列表全部可冻结时转成 session.append{door=…} 模式。
 */
function toSessionAppendDoorPatterns(patterns) {
  return patterns !== undefined &&
    patterns.length > 0 &&
    patterns.every((door) => SESSION_ATTACHMENT_KINDS.includes(door))
    ? patterns.map((door) => `session.append{door=${door}}`)
    : [];
}
//@ chunk-pab450vg.js:566-730 placement
var SESSION_APPEND_HOOK_EVENTS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-pab450vg.js:566", () => {
  SESSION_APPEND_HOOK_EVENTS = Object.freeze([
    "prompt.section",
    "prompt.context",
    "prompt.attachment",
    "prompt.compose",
    "skill.prompt",
    "attribution.text",
    "session.compact",
    "settings.read",
  ]);
});
//@ chunk-pab450vg.js:730-876 placement
/**
 * 只匹配 classic.* 或可冻结事件的模式。
 */
function filterFreezablePatterns(patterns) {
  return patterns.filter((pattern) => {
    let filtered = HOOK_EVENTS_2.filter((eventName) => matchesEventPattern(pattern, eventName));
    return (
      filtered.length > 0 &&
      filtered.every(
        (eventName) => eventName.startsWith("classic.") || SESSION_APPEND_HOOK_EVENTS.includes(eventName),
      )
    );
  });
}
//@ chunk-pab450vg.js:876-1331 placement
/**
 * 找出排在前面、会重新打开这些模式的插件。
 */
var findReopeningPlugins = (before, candidates) =>
  before.slice(0, Math.max(before.findIndex(isSecDefaultModule), 0)).flatMap((loadedModule) => {
    let doors = matcherDoors(
      loadedModule
        .standingFor("session.append")
        .filter((registration) => loadedModule.args.scan.toUserOn?.includes(registration.pattern))
        .map((registration) => registration.matcher),
    );
    let flattened = candidates
      .filter(
        (pattern) =>
          !pattern.includes("{") ||
          doors === undefined ||
          doors.some((door) => pattern === `session.append{door=${door}}`),
      )
      .flatMap((pattern) => {
        let filtered = HOOK_EVENTS_2.filter((eventName) =>
          matchesEventPattern(firstLineOf(pattern, "{"), eventName),
        );
        let filtered_2 = filtered.filter((eventName) => routesToUser(loadedModule.args.scan, eventName));
        return filtered_2.length === filtered.length ? [pattern] : filtered_2;
      });
    return flattened.length > 0
      ? [
          {
            plugin: loadedModule.name,
            patterns: flattened,
          },
        ]
      : [];
  });
//@ chunk-pab450vg.js:1331-1706 placement
/**
 * 用户级插件中被跳过的钩子模式（hooks-passed-over 诊断）。
 */
function collectPassedOverHooks(before) {
  return (
    before.some(isSecDefaultModule) ? before.filter((loadedModule) => loadedModule.tier === "user") : []
  ).flatMap((loadedModule) => {
    let registrations = loadedModule.registrationsFor("session.append");
    let patterns = uniq([
      ...filterFreezablePatterns(loadedModule.patterns),
      ...registrations.flatMap((registration) =>
        toSessionAppendDoorPatterns(
          matcherDoors(
            loadedModule.matcherFor(
              "session.append",
              registrations.filter((otherRegistration) => otherRegistration !== registration),
            ),
          ),
        ),
      ),
    ]);
    let hasPatterns = patterns.length > 0;
    let reopened = hasPatterns ? findReopeningPlugins(before, patterns) : [];
    return hasPatterns
      ? [
          {
            type: "hooks-passed-over",
            source: loadedModule.args.pluginStorageId,
            patterns,
            ...(reopened.length > 0 && {
              reopened,
            }),
          },
        ]
      : [];
  });
}
export {
  collectPassedOverHooks,
  SESSION_ATTACHMENT_KINDS,
  SESSION_APPEND_HOOK_EVENTS,
  toSessionAppendDoorPatterns,
  filterFreezablePatterns,
  findReopeningPlugins,
};
