/**
 * utils/systemReminder.ts
 *
 * system-reminder 标签（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-bbtre4r8.js (19)
 * attribution: placement 19
 */
import { flattenPastedBlocks, splitPastedContentBlocks } from "./pastedContent.js";

//@ chunk-bbtre4r8.js:11935-11967 placement
var I = 97,
  R = 122,
  x = 62,
  B = 10,
  W = /\s/;
//@ chunk-bbtre4r8.js:11967-12043 placement
function K(t) {
  return (t >= I && t <= R) || (t >= 65 && t <= 90) || (t >= 48 && t <= 57) || t === 95 || t === 45;
}
//@ chunk-bbtre4r8.js:12043-12117 placement
function L(t, e) {
  let r = e;
  while (r < t.length && K(t.charCodeAt(r))) r++;
  return r;
}
/**
 * 扫描文本中所有 "</tag>" 形式的闭标签，按标签名记录其位置列表。
 */
//@ chunk-bbtre4r8.js:12117-12378 placement
function indexClosingTags(t) {
  let e = new Map(),
    index = t.indexOf("</");
  while (index !== -1) {
    let code = t.charCodeAt(index + 2);
    if (code < I || code > R) {
      index = t.indexOf("</", index + 2);
      continue;
    }
    let o = L(t, index + 3);
    if (t.charCodeAt(o) === x) {
      let sliced = t.slice(index + 2, o),
        i = e.get(sliced);
      if (i) i.push(index);
      else e.set(sliced, [index]);
    }
    index = t.indexOf("</", o);
  }
  return e;
}
//@ chunk-bbtre4r8.js:12378-13018 placement
function wrapInSystemReminder(t) {
  if (!t.includes("</")) return t;
  let e = indexClosingTags(t);
  if (e.size === 0) return t;
  let r = new Map(),
    s = [],
    o = 0,
    a = -1,
    index = t.indexOf("<");
  while (index !== -1) {
    let code = t.charCodeAt(index + 1);
    if (code < I || code > R) {
      index = t.indexOf("<", index + 1);
      continue;
    }
    let c = L(t, index + 2),
      m = -1;
    if (c < t.length) {
      if (t.charCodeAt(c) === x) m = c + 1;
      else if (W.test(t[c])) {
        if (a < c) {
          if (((a = t.indexOf(">", c)), a === -1)) break;
        }
        m = a + 1;
      }
    }
    if (m !== -1) {
      let sliced = t.slice(index + 1, c),
        g = e.get(sliced);
      if (g) {
        let d = r.get(sliced) ?? 0;
        while (d < g.length && g[d] < m) d++;
        if ((r.set(sliced, d), d < g.length)) {
          let A = g[d] + sliced.length + 3;
          if (t.charCodeAt(A) === B) A++;
          (s.push(t.slice(o, index)), (o = A), (index = t.indexOf("<", A)));
          continue;
        }
      }
    }
    index = t.indexOf("<", c);
  }
  if (o === 0) return t;
  return (s.push(t.slice(o)), s.join(""));
}
//@ chunk-bbtre4r8.js:13018-13049 placement
function q(t) {
  return wrapInSystemReminder(flattenPastedBlocks(t));
}
//@ chunk-bbtre4r8.js:13049-13082 placement
function jwr(t) {
  return uft(t) || t;
}
//@ chunk-bbtre4r8.js:13082-13117 placement
function uft(t) {
  return q(t).trim();
}
//@ chunk-bbtre4r8.js:13117-13204 placement
function kDi(t) {
  return uft(
    splitPastedContentBlocks(t).flatMap((e) => (e.kind === "text" ? [e.text] : [])).join(`
`),
  );
}
//@ chunk-bbtre4r8.js:13204-13356 placement
var SYSTEM_REMINDER_OPEN = "<system-reminder>",
  Sre = "</system-reminder>",
  fDt = '<system-reminder id="',
  F_s = '</system-reminder id="',
  Eje = '">',
  TDi = 16,
  V = /^[0-9a-f]{16,32}$/,
  X = 32;
//@ chunk-bbtre4r8.js:13356-13410 placement
function pDt(t) {
  return typeof t === "string" && V.test(t);
}
/**
 * 文本以固定前缀开头时，解析其后到分隔标记前的标识并校验，合法时返回。
 */
//@ chunk-bbtre4r8.js:13410-13598 placement
function parseReminderHeader(t) {
  if (!t.startsWith(fDt)) return;
  let e = fDt.length,
    sliced = t.slice(e, e + X + Eje.length + 1),
    index = sliced.indexOf(Eje),
    o = index === -1 ? void 0 : sliced.slice(0, index);
  return pDt(o) &&
    sliced.startsWith(
      `${Eje}
`,
      index,
    )
    ? o
    : void 0;
}
//@ chunk-bbtre4r8.js:13598-13637 placement
function Xdo(t) {
  return parseReminderHeader(t) !== void 0;
}
//@ chunk-bbtre4r8.js:13637-13658 placement
var sliced = SYSTEM_REMINDER_OPEN.slice(0, -1);
//@ chunk-bbtre4r8.js:13658-13743 placement
function U_s(t) {
  return t.startsWith(sliced) && /[\s\x1c-\x1f\x85]/.test(t.charAt(sliced.length));
}
//@ chunk-bbtre4r8.js:13743-13795 placement
function mDt(t) {
  return U_s(t) ? `&lt;${t.slice(1)}` : t;
}
/**
 * 去掉文本中所有 system-reminder 块。
 */
//@ chunk-bbtre4r8.js:13795-13945 placement
function stripSystemReminders(t) {
  let e = t,
    index = e.indexOf(SYSTEM_REMINDER_OPEN);
  while (index >= 0) {
    let index_2 = e.indexOf(Sre, index);
    if (index_2 < 0) break;
    ((e = e.slice(0, index) + e.slice(index_2 + Sre.length)), (index = e.indexOf(SYSTEM_REMINDER_OPEN)));
  }
  return e;
}
//@ chunk-bbtre4r8.js:13945-14017 placement
var z = /<(ide_opened_file|ide_selection)(?:\s[^>]*)?>[\s\S]*?<\/\1>\n?/g;
//@ chunk-bbtre4r8.js:14017-14063 placement
function Wwr(t) {
  return t.replace(z, "").trim();
}

export {
  SYSTEM_REMINDER_OPEN,
  Sre,
  Xdo,
  parseReminderHeader,
  mDt,
  U_s,
  pDt,
  Wwr,
  fDt,
  Eje,
  F_s,
  jwr,
  uft,
  TDi,
  stripSystemReminders,
  kDi,
};
