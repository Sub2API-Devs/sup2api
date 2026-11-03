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
import { HOOK_EVENTS } from "../../../plugins/functionHooks/hookApiSurface.js";
import { matchesEventPattern, mos } from "../../../plugins/functionHooks/eventPatterns.js";
import { vie } from "../../../plugins/hooksModules/loadedModuleFilters.js";
import { matcherDoors } from "../../../plugins/functionHooks/sites/uiSites.js";
import { firstLineOf } from "../../stringUtils.js";
import { uniq } from "../../collections.js";

//@ chunk-pab450vg.js:380-446 placement
var freeze = Object.freeze(["attachment", "hook-context", "compaction"]);
/**
 * 门列表全部可冻结时转成 session.append{door=…} 模式。
 */
//@ chunk-pab450vg.js:446-566 placement
function toSessionAppendDoorPatterns(r) {
  return r !== void 0 && r.length > 0 && r.every((t) => freeze.includes(t))
    ? r.map((t) => `session.append{door=${t}}`)
    : [];
}
//@ chunk-pab450vg.js:566-730 placement
var freeze_2 = Object.freeze([
  "prompt.section",
  "prompt.context",
  "prompt.attachment",
  "prompt.compose",
  "skill.prompt",
  "attribution.text",
  "session.compact",
  "settings.read",
]);
/**
 * 只匹配 classic.* 或可冻结事件的模式。
 */
//@ chunk-pab450vg.js:730-876 placement
function filterFreezablePatterns(r) {
  return r.filter((n) => {
    let filtered = HOOK_EVENTS.filter((e) => matchesEventPattern(n, e));
    return filtered.length > 0 && filtered.every((e) => e.startsWith("classic.") || freeze_2.includes(e));
  });
}
/**
 * 找出排在前面、会重新打开这些模式的插件。
 */
//@ chunk-pab450vg.js:876-1331 placement
var findReopeningPlugins = (r, n) =>
  r.slice(0, Math.max(r.findIndex(vie), 0)).flatMap((t) => {
    let e = matcherDoors(
        t
          .standingFor("session.append")
          .filter((o) => t.args.scan.toUserOn?.includes(o.pattern))
          .map((o) => o.matcher),
      ),
      flattened = n
        .filter((o) => !o.includes("{") || e === void 0 || e.some((s) => o === `session.append{door=${s}}`))
        .flatMap((o) => {
          let filtered = HOOK_EVENTS.filter((i) => matchesEventPattern(firstLineOf(o, "{"), i)),
            filtered_2 = filtered.filter((i) => mos(t.args.scan, i));
          return filtered_2.length === filtered.length ? [o] : filtered_2;
        });
    return flattened.length > 0 ? [{ plugin: t.name, patterns: flattened }] : [];
  });
/**
 * 用户级插件中被跳过的钩子模式（hooks-passed-over 诊断）。
 */
//@ chunk-pab450vg.js:1331-1706 placement
function collectPassedOverHooks(r) {
  return (r.some(vie) ? r.filter((e) => e.tier === "user") : []).flatMap((e) => {
    let registrationsFor = e.registrationsFor("session.append"),
      o = uniq([
        ...filterFreezablePatterns(e.patterns),
        ...registrationsFor.flatMap((i) =>
          toSessionAppendDoorPatterns(
            matcherDoors(
              e.matcherFor(
                "session.append",
                registrationsFor.filter((d) => d !== i),
              ),
            ),
          ),
        ),
      ]),
      s = o.length > 0,
      a = s ? findReopeningPlugins(r, o) : [];
    return s
      ? [
          {
            type: "hooks-passed-over",
            source: e.args.pluginStorageId,
            patterns: o,
            ...(a.length > 0 && { reopened: a }),
          },
        ]
      : [];
  });
}

export {
  collectPassedOverHooks,
  freeze,
  freeze_2,
  toSessionAppendDoorPatterns,
  filterFreezablePatterns,
  findReopeningPlugins,
};
