/**
 * @anthropic-ai/sdk/_vendor/partial-json-parser/parser.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-hwmsct5x.js (1)
 * attribution: esm-fingerprint 1
 */

//@ chunk-hwmsct5x.js:91960-94109 esm-fingerprint
var Xm = (e) => {
    let n = 0,
      r = [];
    while (n < e.length) {
      let s = e[n];
      if (s === "\\") {
        n++;
        continue;
      }
      if (s === "{") {
        (r.push({ type: "brace", value: "{" }), n++);
        continue;
      }
      if (s === "}") {
        (r.push({ type: "brace", value: "}" }), n++);
        continue;
      }
      if (s === "[") {
        (r.push({ type: "paren", value: "[" }), n++);
        continue;
      }
      if (s === "]") {
        (r.push({ type: "paren", value: "]" }), n++);
        continue;
      }
      if (s === ":") {
        (r.push({ type: "separator", value: ":" }), n++);
        continue;
      }
      if (s === ",") {
        (r.push({ type: "delimiter", value: "," }), n++);
        continue;
      }
      if (s === '"') {
        let S = "",
          E = !1;
        s = e[++n];
        while (s !== '"') {
          if (n === e.length) {
            E = !0;
            break;
          }
          if (s === "\\") {
            if ((n++, n === e.length)) {
              E = !0;
              break;
            }
            ((S += s + e[n]), (s = e[++n]));
          } else ((S += s), (s = e[++n]));
        }
        if (((s = e[++n]), !E)) r.push({ type: "string", value: S });
        continue;
      }
      if (s && /\s/.test(s)) {
        n++;
        continue;
      }
      let y = /[0-9]/;
      if ((s && y.test(s)) || s === "-" || s === ".") {
        let S = "";
        if (s === "-") ((S += s), (s = e[++n]));
        while (
          s &&
          (y.test(s) ||
            s === "." ||
            s === "e" ||
            s === "E" ||
            ((s === "-" || s === "+") && (S[S.length - 1] === "e" || S[S.length - 1] === "E")))
        )
          ((S += s), (s = e[++n]));
        r.push({ type: "number", value: S });
        continue;
      }
      let w = /[a-z]/i;
      if (s && w.test(s)) {
        let S = "";
        while (s && w.test(s)) {
          if (n === e.length) break;
          ((S += s), (s = e[++n]));
        }
        if (S == "true" || S == "false" || S === "null") r.push({ type: "name", value: S });
        else {
          n++;
          continue;
        }
        continue;
      }
      n++;
    }
    return r;
  },
  Un = (e) => {
    if (e.length === 0) return e;
    let n = e[e.length - 1];
    switch (n.type) {
      case "separator":
        return ((e = e.slice(0, e.length - 1)), Un(e));
        break;
      case "number":
        let r = n.value[n.value.length - 1];
        if (r === "." || r === "-" || r === "+" || r === "e" || r === "E")
          return ((e = e.slice(0, e.length - 1)), Un(e));
      case "string":
        let s = e[e.length - 2];
        if (s?.type === "delimiter") return ((e = e.slice(0, e.length - 1)), Un(e));
        else if (s?.type === "brace" && s.value === "{") return ((e = e.slice(0, e.length - 1)), Un(e));
        break;
      case "delimiter":
        return ((e = e.slice(0, e.length - 1)), Un(e));
        break;
    }
    return e;
  },
  Qm = (e) => {
    let n = [];
    if (
      (e.map((r) => {
        if (r.type === "brace")
          if (r.value === "{") n.push("}");
          else n.splice(n.lastIndexOf("}"), 1);
        if (r.type === "paren")
          if (r.value === "[") n.push("]");
          else n.splice(n.lastIndexOf("]"), 1);
      }),
      n.length > 0)
    )
      n.reverse().map((r) => {
        if (r === "}") e.push({ type: "brace", value: "}" });
        else if (r === "]") e.push({ type: "paren", value: "]" });
      });
    return e;
  },
  Zm = (e) => {
    let n = "";
    return (
      e.map((r) => {
        switch (r.type) {
          case "string":
            n += '"' + r.value + '"';
            break;
          default:
            n += r.value;
            break;
        }
      }),
      n
    );
  },
  sd = (e) => JSON.parse(Zm(Qm(Un(Xm(e)))));

export { sd };
