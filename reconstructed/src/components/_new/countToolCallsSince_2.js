/**
 * components/_new/countToolCallsSince_2.ts
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-ag5x7vhf.js (3)
 * attribution: sole-consumer-new 3
 */
import { hasMcpRenderOverride } from "../Message.js";
import { AGENT } from "../../tools/AgentTool/constants.js";
import { fmn } from "../../tools/AgentTool/agentDisplay.js";
import { applyGrouping } from "../../utils/groupToolUses.js";

//@ chunk-ag5x7vhf.js:120727-120746 sole-consumer-new
var weakMap = new WeakMap();
//@ chunk-ag5x7vhf.js:120746-120896 sole-consumer-new
function getGroupableToolNames(m) {
  let h = weakMap.get(m);
  if (!h)
    ((h = new Set(
      m
        .filter((x) => hasMcpRenderOverride(x.uiTableKey ?? x.name, "renderGroupedToolUse"))
        .map((x) => x.name),
    )),
      weakMap.set(m, h));
  return h;
}
//@ chunk-ag5x7vhf.js:120896-121759 sole-consumer-new = countToolCallsSince (1)
function countToolCallsSince_2(m, h, x = !1, T) {
  if (x) return { messages: m };
  let k = getGroupableToolNames(h),
    _ = new Map();
  for (let V of m) {
    if (V.type !== "assistant") continue;
    let W = V.message.content[0];
    if (W?.type !== "tool_use" || !k.has(W.name)) continue;
    if (W.name === AGENT && fmn(W.input, T)) continue;
    let z = `${V.message.id}:${W.name}`,
      K = _.get(z);
    if (K === void 0) ((K = []), _.set(z, K));
    K.push(V);
  }
  let I = new Map(),
    D = new Set();
  for (let V of _.values()) {
    if (V.length < 2) continue;
    for (let W of V) (I.set(W, V), D.add(W.message.content[0].id));
  }
  if (I.size === 0) return { messages: m };
  let A = new Map();
  for (let V of m) {
    if (V.type !== "user") continue;
    let W = V.message.content[0];
    if (W.type === "tool_result" && D.has(W.tool_use_id)) A.set(W.tool_use_id, V);
  }
  let L = [];
  for (let message of m) {
    let W = I.get(message);
    if (W !== void 0) {
      if (message === W[0]) L.push(applyGrouping(W, A));
      continue;
    }
    if (message.type === "user") {
      let z = message.message.content[0];
      if (z.type === "tool_result" && D.has(z.tool_use_id)) continue;
    }
    L.push(message);
  }
  return { messages: L };
}

export { countToolCallsSince_2 };
