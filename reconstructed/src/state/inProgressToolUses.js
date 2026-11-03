/**
 * state/inProgressToolUses.ts
 *
 * 2.1.316 新增：进行中的工具调用状态。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-6vnxsn99.js (3)
 * attribution: placement 3
 */

//@ chunk-6vnxsn99.js:20588-20653 placement
var dnt = [],
  Xn = new Set(),
  h2t = { messages: dnt, inProgressToolUseIDs: Xn };
//@ chunk-6vnxsn99.js:20653-20780 placement
function inProgressToolUpdate(e, n) {
  return e.size === 0 && n.size > 0
    ? { inProgressToolUseIDs: n, toolWindowStartTime: Date.now() }
    : { inProgressToolUseIDs: n };
}
/**
 * 维护某个代理的进行中工具调用集合（add/remove/clear），首个工具开始时记录 toolWindowStartTime。
 */
//@ chunk-6vnxsn99.js:20780-21114 placement
function applyInProgressToolUses(e, n, r) {
  let o = e[n] ?? h2t,
    inProgressToolUseIDs = o.inProgressToolUseIDs,
    a;
  switch (r.action) {
    case "add": {
      a = new Set(inProgressToolUseIDs);
      for (let id of r.ids) a.add(id);
      break;
    }
    case "remove": {
      a = new Set(inProgressToolUseIDs);
      for (let id of r.ids) a.delete(id);
      if (a.size === inProgressToolUseIDs.size) return e;
      break;
    }
    case "clear":
      if (inProgressToolUseIDs.size === 0) return e;
      a = new Set();
      break;
    default:
      return e;
  }
  return { ...e, [n]: { ...o, ...inProgressToolUpdate(inProgressToolUseIDs, a) } };
}

export { inProgressToolUpdate, dnt, h2t, applyInProgressToolUses };
