/**
 * execa/lib/command.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: execa@8.0.1
 * pieces: chunk-m4p5zn6n.js (2)
 * attribution: esm-layout 1, esm-fingerprint 1
 */
import { ChildProcess, ChildProcess as ChildProcess_2 } from "child_process";
import { Buffer as jo, Buffer as vo } from "buffer";

//@ chunk-m4p5zn6n.js:26397-26650 esm-layout
var vn = (e, n = []) => {
    if (!Array.isArray(n)) return [e];
    return [e, ...n];
  },
  Ao = /^[\w.-]+$/,
  Ro = (e) => {
    if (typeof e !== "string" || Ao.test(e)) return e;
    return `"${e.replaceAll('"', '\\"')}"`;
  },
  Ue = (e, n) => vn(e, n).join(" "),
  Ke = (e, n) =>
    vn(e, n)
      .map((r) => Ro(r))
      .join(" "),
  $o = / +/g;
//@ chunk-m4p5zn6n.js:26650-27510 esm-fingerprint
var Pn = (e) => {
    let n = typeof e;
    if (n === "string") return e;
    if (n === "number") return String(e);
    if (n === "object" && e !== null && !(e instanceof ChildProcess_2) && "stdout" in e) {
      let r = typeof e.stdout;
      if (r === "string") return e.stdout;
      if (vo.isBuffer(e.stdout)) return e.stdout.toString();
      throw TypeError(`Unexpected "${r}" stdout in template expression`);
    }
    throw TypeError(`Unexpected "${n}" in template expression`);
  },
  In = (e, n, r) =>
    r || e.length === 0 || n.length === 0
      ? [...e, ...n]
      : [...e.slice(0, -1), `${e.at(-1)}${n[0]}`, ...n.slice(1)],
  ko = ({
    templates: templates,
    expressions: expressions,
    tokens: tokens,
    index: index,
    template: template,
  }) => {
    let u = template ?? templates.raw[index],
      filtered = u.split($o).filter(Boolean),
      l = In(tokens, filtered, u.startsWith(" "));
    if (index === expressions.length) return l;
    let f = expressions[index],
      p = Array.isArray(f) ? f.map((h) => Pn(h)) : [Pn(f)];
    return In(l, p, u.endsWith(" "));
  },
  ze = (e, n) => {
    let r = [];
    for (let [o, s] of e.entries())
      r = ko({ templates: e, expressions: n, tokens: r, index: o, template: s });
    return r;
  };

export { Ue, Ke, ze };
