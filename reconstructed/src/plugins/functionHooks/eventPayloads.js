/**
 * plugins/functionHooks/eventPayloads.ts
 *
 * 2.1.316 新增：钩子事件载荷的构造与校验
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (4)
 * attribution: placement 4
 */
import { randomUUID } from "crypto";
import { checkPlainObject, checkPlainData, FORBIDDEN_OBJECT_KEYS } from "./sites/plainData.js";
import { HooksError } from "./hooksErrors.js";
import { isPlainDataObject } from "../../utils/hooks/functionHookMatchers.js";

//@ chunk-e6aww6q8.js:44192-44581 placement
/**
 * 规整 skill.prompt 的事件负载：frontmatter 转纯数据，来源字段必须是字符串。
 */
function normalizeSkillPromptPayload(e) {
  let n = checkPlainObject(e.frontmatter ?? {});
  let r = e;
  let found = ["source", "pluginName", "path", "frontmatterProblem"].find(
    (S) => r[S] !== undefined && typeof r[S] !== "string",
  );
  let h = typeof n === "string" ? n : checkPlainData(n);
  let y = found === undefined ? h && `a frontmatter that ${h}` : `a ${found} that is no text`;
  if (typeof n === "string" || y !== undefined) throw new HooksError(`$.skill.prompt: called with ${y}`);
  return {
    ...e,
    frontmatter: n,
    source: e.source ?? "built-in",
  };
}
//@ chunk-e6aww6q8.js:44581-44643 placement
/**
 * to 默认 anthropic
 */
var defaultRoute = (e) =>
  e.to === "collector"
    ? e
    : {
        ...e,
        to: e.to ?? "anthropic",
      };
//@ chunk-e6aww6q8.js:44643-45582 placement
var EVENT_PAYLOAD_SHAPES = {
  "tool.call": (e) => ({
    ...e,
    tool_use_id: e.tool_use_id ?? `toolu_${randomUUID().replace(/-/g, "")}`,
  }),
  "tool.check": (e) => e,
  "tool.describe": (e) => e,
  "command.run": (e) => e,
  "command.describe": (e) => e,
  "config.set": (e) => e,
  "config.describe": (e) => e,
  "telemetry.log": defaultRoute,
  "telemetry.mark": (e) => e,
  "prompt.submit": (e) => e,
  "prompt.fill": (e) => e,
  "prompt.edit": (e) => e,
  "prompt.change": (e) => e,
  "prompt.autocomplete": (e) => e,
  "prompt.suggest": (e) => e,
  "prompt.section": (e) => e,
  "prompt.context": (e) => e,
  "prompt.attachment": (e) => e,
  "prompt.mention": (e) => e,
  "prompt.compose": (e) => e,
  "agent.offer": (e) => e,
  "agent.spawn": (e) => e,
  "skill.prompt": normalizeSkillPromptPayload,
  "attribution.text": (e) => e,
  "session.start": (e) => e,
  "session.receive": (e) => e,
  "session.append": (e) => e,
  "session.send": (e) => e,
  "session.compact": (e) => e,
  "session.attach": (e) => e,
  "session.detach": (e) => e,
  "session.measure": (e) => e,
  "session.end": (e) => e,
  "turn.start": (e) => e,
  "turn.step": (e) => e,
  "turn.complete": (e) => e,
  "ui.scroll": (e) => e,
  "ui.focus": (e) => e,
};
//@ chunk-e6aww6q8.js:75595-76168 placement
function isPlainDataValue(e, n = new Map(), r = new Set()) {
  if (typeof e === "string" || typeof e === "boolean") return e;
  if (typeof e === "number") return Number.isFinite(e) ? e : null;
  if (typeof e !== "object" || e === null) return null;
  if (e instanceof Date) return Number.isFinite(e.getTime()) ? e.toISOString() : null;
  if (n.has(e)) return n.get(e) ?? null;
  if (!Array.isArray(e) && !isPlainDataObject(e)) return null;
  n.set(e, undefined);
  let s = Array.isArray(e)
    ? Array.from(e, (h) => isPlainDataValue(h, n, r))
    : Object.fromEntries(
        Object.keys(e)
          .filter((key) => {
            let included = FORBIDDEN_OBJECT_KEYS.includes(key);
            if (included && key !== "__proto__") r.add(key);
            return !included;
          })
          .map((key) => [key, isPlainDataValue(e[key], n, r)]),
      );
  n.set(e, s);
  return s;
}
export { isPlainDataValue, EVENT_PAYLOAD_SHAPES, defaultRoute };
