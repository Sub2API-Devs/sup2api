/**
 * utils/pollEvents/replEvalEvents.ts
 *
 * repl-eval 轮询事件的 schema 解析（<event> 标签形态，带 eval 与 status）（2.1.318 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-d0gk5ksh.js (4)
 * attribution: placement 4
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import { looseObject, numberSchema, stringSchema, literal } from "../../../vendor/zod/v4/classic/schemas.js";
import { EVAL_SETTLE_EVENT_KIND } from "../pollEvents.js";
import { codeModeAccepted } from "../codeMode/accepted.js";
import { safeParseJSON } from "../json.js";

//@ chunk-d0gk5ksh.js:376-506 placement
var EvalSettleFieldsSchema = DoctorLazy(() =>
  looseObject({
    eval: numberSchema().refine(Number.isSafeInteger),
    status: stringSchema().optional().catch(undefined),
  }),
);
var EvalSettleEventSchema = DoctorLazy(() =>
  looseObject({
    kind: literal(EVAL_SETTLE_EVENT_KIND),
    fields: EvalSettleFieldsSchema(),
  }),
);
//@ chunk-d0gk5ksh.js:506-1006 placement
/**
 * 解析一条 repl-eval 轮询事件（<event> 标签或 JSON 两种形态），返回 evalId 与 status。
 */
function parseSettleEvent(text, raw) {
  if (!codeModeAccepted()) return;
  let parsed = EvalSettleEventSchema().safeParse(raw);
  if (parsed.success) return toSettleEvent(parsed.data.fields);
  let TAG_PATTERN = /^<event\b([^>]*)>(?:\n(\{[^\n]*\})\n<\/event(?: nonce="([A-Za-z0-9_-]+)")?>$)?/;
  let [, attributes, body, nonce] = TAG_PATTERN.exec(text) ?? [];
  if (attributes === undefined || !attributes.includes(` kind="${EVAL_SETTLE_EVENT_KIND}"`)) return;
  let evalId = / eval="(\d+)"/.exec(attributes)?.[1];
  if (evalId !== undefined)
    return {
      evalId: Number(evalId),
      status: / status="([^"]*)"/.exec(attributes)?.[1],
    };
  if (body === undefined || nonce !== / nonce="([A-Za-z0-9_-]+)"/.exec(attributes)?.[1]) return;
  let fields = EvalSettleFieldsSchema().safeParse(safeParseJSON(body, false));
  return fields.success ? toSettleEvent(fields.data) : undefined;
}
//@ chunk-d0gk5ksh.js:1006-1206 placement
/**
 * 从文本里批量抽取 repl-eval 事件。
 */
function parseSettleEvents(text) {
  if (!codeModeAccepted()) return [];
  let EVENT_PATTERN = /<event\b[^>]*>(?:\n\{[^\n]*\}\n<\/event(?: nonce="[A-Za-z0-9_-]+")?>)?/g;
  let events = [];
  for (let [sorted] of text.matchAll(EVENT_PATTERN)) {
    let event = parseSettleEvent(sorted, undefined);
    if (event !== undefined) events.push(event);
  }
  return events;
}
//@ chunk-d0gk5ksh.js:1206-1258 placement
function toSettleEvent(fields) {
  return {
    evalId: fields.eval,
    status: fields.status,
  };
}
export { parseSettleEvent, parseSettleEvents };
