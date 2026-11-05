/**
 * plugins/functionHooks/eventPayloads.ts
 *
 * 2.1.316 新增：钩子事件载荷的构造与校验
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (4)
 * attribution: placement 4
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { randomUUID } from "crypto";
import { checkPlainObject, checkPlainData, FORBIDDEN_OBJECT_KEYS } from "./sites/plainData.js";
import { HooksError } from "./hooksErrors.js";
import { isPlainDataObject } from "../../utils/hooks/functionHookMatchers.js";

//@ chunk-5xgkngpb.js:46791-47180 placement
/**
 * 规整 skill.prompt 的事件负载：frontmatter 转纯数据，来源字段必须是字符串。
 */
function normalizeSkillPromptPayload(payload) {
  let frontmatter = checkPlainObject(payload.frontmatter ?? {});
  let secondPayload = payload;
  let found = ["source", "pluginName", "path", "frontmatterProblem"].find(
    (field) => secondPayload[field] !== undefined && typeof secondPayload[field] !== "string",
  );
  let problem = typeof frontmatter === "string" ? frontmatter : checkPlainData(frontmatter);
  let result =
    found === undefined ? problem && `a frontmatter that ${problem}` : `a ${found} that is no text`;
  if (typeof frontmatter === "string" || result !== undefined)
    throw new HooksError(`$.skill.prompt: called with ${result}`);
  return {
    ...payload,
    frontmatter,
    source: payload.source ?? "built-in",
  };
}
//@ chunk-5xgkngpb.js:47180-47242 placement
/**
 * to 默认 anthropic
 */
var defaultRoute = (entry) =>
  entry.to === "collector"
    ? entry
    : {
        ...entry,
        to: entry.to ?? "anthropic",
      };
//@ chunk-5xgkngpb.js:47242-48181 placement
var EVENT_PAYLOAD_SHAPES = {
  "tool.call": (payload) => ({
    ...payload,
    tool_use_id: payload.tool_use_id ?? `toolu_${randomUUID().replace(/-/g, "")}`,
  }),
  "tool.check": (payload) => payload,
  "tool.describe": (payload) => payload,
  "command.run": (payload) => payload,
  "command.describe": (payload) => payload,
  "config.set": (payload) => payload,
  "config.describe": (payload) => payload,
  "telemetry.log": defaultRoute,
  "telemetry.mark": (payload) => payload,
  "prompt.submit": (payload) => payload,
  "prompt.fill": (payload) => payload,
  "prompt.edit": (payload) => payload,
  "prompt.change": (payload) => payload,
  "prompt.autocomplete": (payload) => payload,
  "prompt.suggest": (payload) => payload,
  "prompt.section": (payload) => payload,
  "prompt.context": (payload) => payload,
  "prompt.attachment": (payload) => payload,
  "prompt.mention": (payload) => payload,
  "prompt.compose": (payload) => payload,
  "agent.offer": (payload) => payload,
  "agent.spawn": (payload) => payload,
  "skill.prompt": normalizeSkillPromptPayload,
  "attribution.text": (payload) => payload,
  "session.start": (payload) => payload,
  "session.receive": (payload) => payload,
  "session.append": (payload) => payload,
  "session.send": (payload) => payload,
  "session.compact": (payload) => payload,
  "session.attach": (payload) => payload,
  "session.detach": (payload) => payload,
  "session.measure": (payload) => payload,
  "session.end": (payload) => payload,
  "turn.start": (payload) => payload,
  "turn.step": (payload) => payload,
  "turn.complete": (payload) => payload,
  "ui.scroll": (payload) => payload,
  "ui.focus": (payload) => payload,
};
//@ chunk-5xgkngpb.js:78145-78718 placement
function isPlainDataValue(value, seen = new Map(), stack = new Set()) {
  if (typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "object" || value === null) return null;
  if (value instanceof Date) return Number.isFinite(value.getTime()) ? value.toISOString() : null;
  if (seen.has(value)) return seen.get(value) ?? null;
  if (!Array.isArray(value) && !isPlainDataObject(value)) return null;
  seen.set(value, undefined);
  let entry = Array.isArray(value)
    ? Array.from(value, (value) => isPlainDataValue(value, seen, stack))
    : Object.fromEntries(
        Object.keys(value)
          .filter((key) => {
            let included = FORBIDDEN_OBJECT_KEYS.includes(key);
            if (included && key !== "__proto__") stack.add(key);
            return !included;
          })
          .map((key) => [key, isPlainDataValue(value[key], seen, stack)]),
      );
  seen.set(value, entry);
  return entry;
}
export { isPlainDataValue, EVENT_PAYLOAD_SHAPES, defaultRoute };
