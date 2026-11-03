/**
 * eventsource-parser/dist/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: eventsource-parser@3.0.8
 * pieces: chunk-ccwj2pkk.js (6)
 * attribution: esm-fingerprint 2, esm-layout 4
 */

//@ chunk-ccwj2pkk.js:191-335 esm-fingerprint
class ParseError extends Error {
  constructor(n, o) {
    (super(n),
      (this.name = "ParseError"),
      (this.type = o.type),
      (this.field = o.field),
      (this.value = o.value),
      (this.line = o.line));
  }
}
//@ chunk-ccwj2pkk.js:335-354 esm-layout
var I = 10,
  _ = 13,
  A = 32;
//@ chunk-ccwj2pkk.js:354-369 esm-layout
function y(n) {}
//@ chunk-ccwj2pkk.js:369-2857 esm-fingerprint
function wTt(n) {
  if (typeof n == "function")
    throw TypeError("`callbacks` must be an object, got a function instead. Did you mean `{onEvent: fn}`?");
  let { onEvent: onEvent = y, onError: onError = y, onRetry: onRetry = y, onComment: onComment } = n,
    a = [],
    x = !0,
    c,
    f = "",
    s = 0,
    l;
  function j(t) {
    if (
      (x &&
        ((x = !1),
        t.charCodeAt(0) === 239 && t.charCodeAt(1) === 187 && t.charCodeAt(2) === 191 && (t = t.slice(3))),
      a.length === 0)
    ) {
      let d = m(t);
      d !== "" && a.push(d);
      return;
    }
    if (
      t.indexOf(`
`) === -1 &&
      t.indexOf("\r") === -1
    ) {
      a.push(t);
      return;
    }
    a.push(t);
    let joined = a.join("");
    a.length = 0;
    let i = m(joined);
    i !== "" && a.push(i);
  }
  function m(t) {
    let e = 0;
    if (t.indexOf("\r") === -1) {
      let index = t.indexOf(
        `
`,
        e,
      );
      for (; index !== -1;) {
        if (e === index) {
          (s > 0 && onEvent({ id: c, event: l, data: f }),
            (c = void 0),
            (f = ""),
            (s = 0),
            (l = void 0),
            (e = index + 1),
            (index = t.indexOf(
              `
`,
              e,
            )));
          continue;
        }
        let code = t.charCodeAt(e);
        if (L(t, e, code)) {
          let r = t.charCodeAt(e + 5) === A ? e + 6 : e + 5,
            sliced = t.slice(r, index);
          if (s === 0 && t.charCodeAt(index + 1) === I) {
            (onEvent({ id: c, event: l, data: sliced }),
              (c = void 0),
              (f = ""),
              (l = void 0),
              (e = index + 2),
              (index = t.indexOf(
                `
`,
                e,
              )));
            continue;
          }
          ((f =
            s === 0
              ? sliced
              : `${f}
${sliced}`),
            s++);
        } else
          F(t, e, code)
            ? (l = t.slice(t.charCodeAt(e + 6) === A ? e + 7 : e + 6, index) || void 0)
            : g(t, e, index);
        ((e = index + 1),
          (index = t.indexOf(
            `
`,
            e,
          )));
      }
      return t.slice(e);
    }
    for (; e < t.length;) {
      let index = t.indexOf("\r", e),
        index_2 = t.indexOf(
          `
`,
          e,
        ),
        r = -1;
      if (
        (index !== -1 && index_2 !== -1
          ? (r = index < index_2 ? index : index_2)
          : index !== -1
            ? index === t.length - 1
              ? (r = -1)
              : (r = index)
            : index_2 !== -1 && (r = index_2),
        r === -1)
      )
        break;
      (g(t, e, r), (e = r + 1), t.charCodeAt(e - 1) === _ && t.charCodeAt(e) === I && e++);
    }
    return t.slice(e);
  }
  function g(t, e, i) {
    if (e === i) {
      P();
      return;
    }
    let code = t.charCodeAt(e);
    if (L(t, e, code)) {
      let p = t.charCodeAt(e + 5) === A ? e + 6 : e + 5,
        sliced = t.slice(p, i);
      ((f =
        s === 0
          ? sliced
          : `${f}
${sliced}`),
        s++);
      return;
    }
    if (F(t, e, code)) {
      l = t.slice(t.charCodeAt(e + 6) === A ? e + 7 : e + 6, i) || void 0;
      return;
    }
    if (code === 105 && t.charCodeAt(e + 1) === 100 && t.charCodeAt(e + 2) === 58) {
      let sliced = t.slice(t.charCodeAt(e + 3) === A ? e + 4 : e + 3, i);
      c = sliced.includes("\x00") ? void 0 : sliced;
      return;
    }
    if (code === 58) {
      if (onComment) {
        let sliced = t.slice(e, i);
        onComment(sliced.slice(t.charCodeAt(e + 1) === A ? 2 : 1));
      }
      return;
    }
    let sliced = t.slice(e, i),
      index = sliced.indexOf(":");
    if (index === -1) {
      E(sliced, "", sliced);
      return;
    }
    let sliced_2 = sliced.slice(0, index),
      T = sliced.charCodeAt(index + 1) === A ? 2 : 1,
      sliced_3 = sliced.slice(index + T);
    E(sliced_2, sliced_3, sliced);
  }
  function E(t, e, i) {
    switch (t) {
      case "event":
        l = e || void 0;
        break;
      case "data":
        ((f =
          s === 0
            ? e
            : `${f}
${e}`),
          s++);
        break;
      case "id":
        c = e.includes("\x00") ? void 0 : e;
        break;
      case "retry":
        /^\d+$/.test(e)
          ? onRetry(parseInt(e, 10))
          : onError(
              new ParseError(`Invalid \`retry\` value: "${e}"`, { type: "invalid-retry", value: e, line: i }),
            );
        break;
      default:
        onError(
          new ParseError(`Unknown field "${t.length > 20 ? `${t.slice(0, 20)}\u2026` : t}"`, {
            type: "unknown-field",
            field: t,
            value: e,
            line: i,
          }),
        );
        break;
    }
  }
  function P() {
    (s > 0 && onEvent({ id: c, event: l, data: f }), (c = void 0), (f = ""), (s = 0), (l = void 0));
  }
  function D(t = {}) {
    if (t.consume && a.length > 0) {
      let joined = a.join("");
      g(joined, 0, joined.length);
    }
    ((x = !0), (c = void 0), (f = ""), (s = 0), (l = void 0), (a.length = 0));
  }
  return { feed: j, reset: D };
}
//@ chunk-ccwj2pkk.js:2857-2987 esm-layout
function L(n, o, v) {
  return (
    v === 100 &&
    n.charCodeAt(o + 1) === 97 &&
    n.charCodeAt(o + 2) === 116 &&
    n.charCodeAt(o + 3) === 97 &&
    n.charCodeAt(o + 4) === 58
  );
}
//@ chunk-ccwj2pkk.js:2987-3144 esm-layout
function F(n, o, v) {
  return (
    v === 101 &&
    n.charCodeAt(o + 1) === 118 &&
    n.charCodeAt(o + 2) === 101 &&
    n.charCodeAt(o + 3) === 110 &&
    n.charCodeAt(o + 4) === 116 &&
    n.charCodeAt(o + 5) === 58
  );
}

export { wTt };
