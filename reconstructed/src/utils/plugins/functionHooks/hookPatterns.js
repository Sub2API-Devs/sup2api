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

//@ chunk-pab450vg.js:380-446 placement
var aAo = Object.freeze(["attachment", "hook-context", "compaction"]);
//@ chunk-pab450vg.js:446-566 placement
/**
 * 门列表全部可冻结时转成 session.append{door=…} 模式。
 */
function toSessionAppendDoorPatterns(r) {
  return r !== undefined && r.length > 0 && r.every((t) => aAo.includes(t))
    ? r.map((t) => `session.append{door=${t}}`)
    : [];
}
//@ chunk-pab450vg.js:566-730 placement
var dAo = Object.freeze([
  "prompt.section",
  "prompt.context",
  "prompt.attachment",
  "prompt.compose",
  "skill.prompt",
  "attribution.text",
  "session.compact",
  "settings.read",
]);
//@ chunk-pab450vg.js:730-876 placement
/**
 * 只匹配 classic.* 或可冻结事件的模式。
 */
function filterFreezablePatterns(patterns) {
  return patterns.filter((n) => {
    let filtered = HOOK_EVENTS_2.filter((e) => matchesEventPattern(n, e));
    return filtered.length > 0 && filtered.every((e) => e.startsWith("classic.") || dAo.includes(e));
  });
}
//@ chunk-pab450vg.js:876-1331 placement
/**
 * 找出排在前面、会重新打开这些模式的插件。
 */
var findReopeningPlugins = (r, n) =>
  r.slice(0, Math.max(r.findIndex(isSecDefaultModule), 0)).flatMap((t) => {
    let e = matcherDoors(
      t
        .standingFor("session.append")
        .filter((o) => t.args.scan.toUserOn?.includes(o.pattern))
        .map((o) => o.matcher),
    );
    let flattened = n
      .filter((o) => !o.includes("{") || e === undefined || e.some((s) => o === `session.append{door=${s}}`))
      .flatMap((o) => {
        let filtered = HOOK_EVENTS_2.filter((i) => matchesEventPattern(firstLineOf(o, "{"), i));
        let filtered_2 = filtered.filter((i) => routesToUser(t.args.scan, i));
        return filtered_2.length === filtered.length ? [o] : filtered_2;
      });
    return flattened.length > 0
      ? [
          {
            plugin: t.name,
            patterns: flattened,
          },
        ]
      : [];
  });
//@ chunk-pab450vg.js:1331-1706 placement
/**
 * 用户级插件中被跳过的钩子模式（hooks-passed-over 诊断）。
 */
function collectPassedOverHooks(storeSelector) {
  return (
    storeSelector.some(isSecDefaultModule) ? storeSelector.filter((e) => e.tier === "user") : []
  ).flatMap((e) => {
    let p = e.registrationsFor("session.append");
    let o = uniq([
      ...filterFreezablePatterns(e.patterns),
      ...p.flatMap((i) =>
        toSessionAppendDoorPatterns(
          matcherDoors(
            e.matcherFor(
              "session.append",
              p.filter((d) => d !== i),
            ),
          ),
        ),
      ),
    ]);
    let s = o.length > 0;
    let a = s ? findReopeningPlugins(storeSelector, o) : [];
    return s
      ? [
          {
            type: "hooks-passed-over",
            source: e.args.pluginStorageId,
            patterns: o,
            ...(a.length > 0 && {
              reopened: a,
            }),
          },
        ]
      : [];
  });
}
export {
  collectPassedOverHooks,
  aAo,
  dAo,
  toSessionAppendDoorPatterns,
  filterFreezablePatterns,
  findReopeningPlugins,
};
