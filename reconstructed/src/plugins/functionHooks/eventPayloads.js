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
import {
  randomUUID,
  randomUUID as randomUUID_2,
  randomUUID as randomUUID_3,
  randomUUID as randomUUID_4,
  randomUUID as randomUUID_5,
  randomUUID as randomUUID_6,
  randomUUID as randomUUID_7,
  randomUUID as randomUUID_8,
  randomUUID as randomUUID_9,
  randomUUID as randomUUID_10,
  randomUUID as randomUUID_11,
  randomUUID as randomUUID_12,
  randomUUID as randomUUID_13,
  randomUUID as randomUUID_14,
  randomUUID as randomUUID_15,
  randomUUID as randomUUID_16,
  randomUUID as randomUUID_17,
  randomUUID as randomUUID_18,
  randomUUID as randomUUID_19,
  randomUUID as randomUUID_20,
  randomUUID as randomUUID_21,
  randomUUID as randomUUID_22,
  randomUUID as randomUUID_23,
  randomUUID as randomUUID_24,
  randomUUID as randomUUID_25,
  randomUUID as randomUUID_26,
  randomUUID as randomUUID_27,
  randomUUID as randomUUID_28,
  randomUUID as randomUUID_29,
  randomUUID as randomUUID_30,
  randomUUID as randomUUID_31,
  randomUUID as randomUUID_32,
  randomUUID as randomUUID_33,
  randomUUID as randomUUID_34,
  randomUUID as randomUUID_35,
  randomUUID as randomUUID_36,
  randomUUID as randomUUID_37,
  randomUUID as randomUUID_38,
  randomUUID as randomUUID_39,
  randomUUID as randomUUID_40,
  randomUUID as randomUUID_41,
  randomUUID as randomUUID_42,
  randomUUID as randomUUID_43,
  randomUUID as randomUUID_44,
  randomUUID as randomUUID_45,
  randomUUID as randomUUID_46,
  randomUUID as randomUUID_47,
  randomUUID as randomUUID_48,
  randomUUID as randomUUID_49,
  randomUUID as randomUUID_50,
} from "crypto";
import { checkPlainObject, lEe, FORBIDDEN_OBJECT_KEYS } from "./sites/plainData.js";
import { HooksError } from "./hooksErrors.js";
import { isPlainDataObject } from "../../utils/hooks/functionHookMatchers.js";

/**
 * 规整 skill.prompt 的事件负载：frontmatter 转纯数据，来源字段必须是字符串。
 */
//@ chunk-e6aww6q8.js:44192-44581 placement
function normalizeSkillPromptPayload(e) {
  let n = checkPlainObject(e.frontmatter ?? {}),
    r = e,
    found = ["source", "pluginName", "path", "frontmatterProblem"].find(
      (S) => r[S] !== void 0 && typeof r[S] !== "string",
    ),
    h = typeof n === "string" ? n : lEe(n),
    y = found === void 0 ? h && `a frontmatter that ${h}` : `a ${found} that is no text`;
  if (typeof n === "string" || y !== void 0) throw new HooksError(`$.skill.prompt: called with ${y}`);
  return { ...e, frontmatter: n, source: e.source ?? "built-in" };
}
//@ chunk-e6aww6q8.js:44581-44643 placement
var rle = (e) => (e.to === "collector" ? e : { ...e, to: e.to ?? "anthropic" });
//@ chunk-e6aww6q8.js:44643-45582 placement
var EVENT_PAYLOAD_SHAPES = {
  "tool.call": (e) => ({ ...e, tool_use_id: e.tool_use_id ?? `toolu_${randomUUID().replace(/-/g, "")}` }),
  "tool.check": (e) => e,
  "tool.describe": (e) => e,
  "command.run": (e) => e,
  "command.describe": (e) => e,
  "config.set": (e) => e,
  "config.describe": (e) => e,
  "telemetry.log": rle,
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
  n.set(e, void 0);
  let s = Array.isArray(e)
    ? Array.from(e, (h) => isPlainDataValue(h, n, r))
    : Object.fromEntries(
        Object.keys(e)
          .filter((h) => {
            let included = FORBIDDEN_OBJECT_KEYS.includes(h);
            if (included && h !== "__proto__") r.add(h);
            return !included;
          })
          .map((h) => [h, isPlainDataValue(e[h], n, r)]),
      );
  return (n.set(e, s), s);
}

export { isPlainDataValue, EVENT_PAYLOAD_SHAPES, rle };
