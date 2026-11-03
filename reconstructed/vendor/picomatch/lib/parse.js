/**
 * picomatch/lib/parse.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: picomatch@4.0.4..4.0.7
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../runtime/bun-runtime.js";
import { tp } from "./constants.js";
import { np } from "./utils.js";

//@ chunk-fq0cr76a.js:302511-317963 cjs-fingerprint
var lN = x(function (Hge, aN) {
  var ya = tp(),
    _r = np(),
    {
      MAX_LENGTH: MAX_LENGTH,
      POSIX_REGEX_SOURCE: POSIX_REGEX_SOURCE,
      REGEX_NON_SPECIAL_CHARS: REGEX_NON_SPECIAL_CHARS,
      REGEX_SPECIAL_CHARS_BACKREF: REGEX_SPECIAL_CHARS_BACKREF,
      REPLACEMENTS: REPLACEMENTS,
    } = ya,
    xq = (e, n) => {
      if (typeof n.expandRange === "function") return n.expandRange(...e, n);
      e.sort();
      let r = `[${e.join("-")}]`;
      try {
        new RegExp(r);
      } catch (error) {
        return e.map((h) => _r.escapeRegex(h)).join("..");
      }
      return r;
    },
    Pu = (e, n) => `Missing ${e}: "${n}" - use "\\\\${n}" to match literal characters`,
    iN = (e) => {
      let n = [],
        r = 0,
        s = 0,
        h = 0,
        y = "",
        b = !1;
      for (let S of e) {
        if (b === !0) {
          ((y += S), (b = !1));
          continue;
        }
        if (S === "\\") {
          ((y += S), (b = !0));
          continue;
        }
        if (S === '"') {
          ((h = h === 1 ? 0 : 1), (y += S));
          continue;
        }
        if (h === 0) {
          if (S === "[") r++;
          else if (S === "]" && r > 0) r--;
          else if (r === 0) {
            if (S === "(") s++;
            else if (S === ")" && s > 0) s--;
            else if (S === "|" && s === 0) {
              (n.push(y), (y = ""));
              continue;
            }
          }
        }
        y += S;
      }
      return (n.push(y), n);
    },
    _q = (e) => {
      let n = !1;
      for (let r of e) {
        if (n === !0) {
          n = !1;
          continue;
        }
        if (r === "\\") {
          n = !0;
          continue;
        }
        if (/[?*+@!()[\]{}]/.test(r)) return !1;
      }
      return !0;
    },
    oN = (e) => {
      let trimmed = e.trim(),
        r = !0;
      while (r === !0)
        if (((r = !1), /^@\([^\\()[\]{}|]+\)$/.test(trimmed))) ((trimmed = trimmed.slice(2, -1)), (r = !0));
      if (!_q(trimmed)) return;
      return trimmed.replace(/\\(.)/g, "$1");
    },
    vq = (e) => {
      let filtered = e.map(oN).filter(Boolean);
      for (let r = 0; r < filtered.length; r++)
        for (let s = r + 1; s < filtered.length; s++) {
          let h = filtered[r],
            y = filtered[s],
            b = h[0];
          if (!b || h !== b.repeat(h.length) || y !== b.repeat(y.length)) continue;
          if (h === y || h.startsWith(y) || y.startsWith(h)) return !0;
        }
      return !1;
    },
    Px = (e, n = !0) => {
      if ((e[0] !== "+" && e[0] !== "*") || e[1] !== "(") return;
      let r = 0,
        s = 0,
        h = 0,
        y = !1;
      for (let b = 1; b < e.length; b++) {
        let S = e[b];
        if (y === !0) {
          y = !1;
          continue;
        }
        if (S === "\\") {
          y = !0;
          continue;
        }
        if (S === '"') {
          h = h === 1 ? 0 : 1;
          continue;
        }
        if (h === 1) continue;
        if (S === "[") {
          r++;
          continue;
        }
        if (S === "]" && r > 0) {
          r--;
          continue;
        }
        if (r > 0) continue;
        if (S === "(") {
          s++;
          continue;
        }
        if (S === ")") {
          if ((s--, s === 0)) {
            if (n === !0 && b !== e.length - 1) return;
            return { type: e[0], body: e.slice(2, b), end: b };
          }
        }
      }
    },
    wq = (e) => {
      let n = 0,
        r = [];
      while (n < e.length) {
        let h = Px(e.slice(n), !1);
        if (!h || h.type !== "*") return;
        let mapped = iN(h.body).map((S) => S.trim());
        if (mapped.length !== 1) return;
        let b = oN(mapped[0]);
        if (!b || b.length !== 1) return;
        (r.push(b), (n += h.end + 1));
      }
      if (r.length < 1) return;
      return `${r.length === 1 ? _r.escapeRegex(r[0]) : `[${r.map((h) => _r.escapeRegex(h)).join("")}]`}*`;
    },
    Tq = (e) => {
      let n = 0,
        trimmed = e.trim(),
        s = Px(trimmed);
      while (s) (n++, (trimmed = s.body.trim()), (s = Px(trimmed)));
      return n;
    },
    Aq = (e, n) => {
      if (n.maxExtglobRecursion === !1) return { risky: !1 };
      let r =
          typeof n.maxExtglobRecursion === "number"
            ? n.maxExtglobRecursion
            : ya.DEFAULT_MAX_EXTGLOB_RECURSION,
        mapped = iN(e).map((h) => h.trim());
      if (mapped.length > 1) {
        if (mapped.some((h) => h === "") || mapped.some((h) => /^[*?]+$/.test(h)) || vq(mapped))
          return { risky: !0 };
      }
      for (let h of mapped) {
        let y = wq(h);
        if (y) return { risky: !0, safeOutput: y };
        if (Tq(h) > r) return { risky: !0 };
      }
      return { risky: !1 };
    },
    Lx = (e, n) => {
      if (typeof e !== "string") throw TypeError("Expected a string");
      e = REPLACEMENTS[e] || e;
      let r = { ...n },
        s = typeof r.maxLength === "number" ? Math.min(MAX_LENGTH, r.maxLength) : MAX_LENGTH,
        h = e.length;
      if (h > s) throw SyntaxError(`Input length: ${h}, exceeds maximum allowed length: ${s}`);
      let y = { type: "bos", value: "", output: r.prepend || "" },
        b = [y],
        S = r.capture ? "" : "?:",
        globChars = ya.globChars(r.windows),
        extglobChars = ya.extglobChars(globChars),
        {
          DOT_LITERAL: DOT_LITERAL,
          PLUS_LITERAL: PLUS_LITERAL,
          SLASH_LITERAL: SLASH_LITERAL,
          ONE_CHAR: ONE_CHAR,
          DOTS_SLASH: DOTS_SLASH,
          NO_DOT: NO_DOT,
          NO_DOT_SLASH: NO_DOT_SLASH,
          NO_DOTS_SLASH: NO_DOTS_SLASH,
          QMARK: QMARK,
          QMARK_NO_DOT: QMARK_NO_DOT,
          STAR: STAR,
          START_ANCHOR: START_ANCHOR,
        } = globChars,
        me = (Xe) => `(${S}(?:(?!${START_ANCHOR}${Xe.dot ? DOTS_SLASH : DOT_LITERAL}).)*?)`,
        Ne = r.dot ? "" : NO_DOT,
        Ce = r.dot ? QMARK : QMARK_NO_DOT,
        Ie = r.bash === !0 ? me(r) : STAR;
      if (r.capture) Ie = `(${Ie})`;
      if (typeof r.noext === "boolean") r.noextglob = r.noext;
      let he = {
        input: e,
        index: -1,
        start: 0,
        dot: r.dot === !0,
        consumed: "",
        output: "",
        prefix: "",
        backtrack: !1,
        negated: !1,
        brackets: 0,
        braces: 0,
        parens: 0,
        quotes: 0,
        globstar: !1,
        tokens: b,
      };
      ((e = _r.removePrefix(e, he)), (h = e.length));
      let ft = [],
        rt = [],
        ut = [],
        we = y,
        Ae,
        dt = () => he.index === h - 1,
        Me = (he.peek = (Xe = 1) => e[he.index + Xe]),
        Ft = (he.advance = () => e[++he.index] || ""),
        xn = () => e.slice(he.index + 1),
        mt = (Xe = "", nn = 0) => {
          ((he.consumed += Xe), (he.index += nn));
        },
        Mt = (Xe) => {
          ((he.output += Xe.output != null ? Xe.output : Xe.value), mt(Xe.value));
        },
        mn = () => {
          let Xe = 1;
          while (Me() === "!" && (Me(2) !== "(" || Me(3) === "?")) (Ft(), he.start++, Xe++);
          if (Xe % 2 === 0) return !1;
          return ((he.negated = !0), he.start++, !0);
        },
        Nt = (Xe) => {
          (he[Xe]++, ut.push(Xe));
        },
        Wt = (Xe) => {
          (he[Xe]--, ut.pop());
        },
        gt = (Xe) => {
          if (we.type === "globstar") {
            let nn = he.braces > 0 && (Xe.type === "comma" || Xe.type === "brace"),
              Je = Xe.extglob === !0 || (ft.length && (Xe.type === "pipe" || Xe.type === "paren"));
            if (Xe.type !== "slash" && Xe.type !== "paren" && !nn && !Je)
              ((he.output = he.output.slice(0, -we.output.length)),
                (we.type = "star"),
                (we.value = "*"),
                (we.output = Ie),
                (he.output += we.output));
          }
          if (ft.length && Xe.type !== "paren") ft[ft.length - 1].inner += Xe.value;
          if (Xe.value || Xe.output) Mt(Xe);
          if (we && we.type === "text" && Xe.type === "text") {
            ((we.output = (we.output || we.value) + Xe.value), (we.value += Xe.value));
            return;
          }
          ((Xe.prev = we), b.push(Xe), (we = Xe));
        },
        jt = (Xe, nn) => {
          let Je = { ...extglobChars[nn], conditions: 1, inner: "" };
          ((Je.prev = we),
            (Je.parens = he.parens),
            (Je.output = he.output),
            (Je.startIndex = he.index),
            (Je.tokensIndex = b.length));
          let vt = (r.capture ? "(" : "") + Je.open;
          (Nt("parens"),
            gt({ type: Xe, value: nn, output: he.output ? "" : ONE_CHAR }),
            gt({ type: "paren", extglob: !0, value: Ft(), output: vt }),
            ft.push(Je));
        },
        Rn = (Xe) => {
          let sliced = e.slice(Xe.startIndex, he.index + 1),
            sliced_2 = e.slice(Xe.startIndex + 2, he.index),
            vt = Aq(sliced_2, r);
          if ((Xe.type === "plus" || Xe.type === "star") && vt.risky) {
            let Zt = vt.safeOutput
                ? (Xe.output ? "" : ONE_CHAR) + (r.capture ? `(${vt.safeOutput})` : vt.safeOutput)
                : void 0,
              kn = b[Xe.tokensIndex];
            ((kn.type = "text"), (kn.value = sliced), (kn.output = Zt || _r.escapeRegex(sliced)));
            for (let zr = Xe.tokensIndex + 1; zr < b.length; zr++)
              ((b[zr].value = ""), (b[zr].output = ""), delete b[zr].suffix);
            ((he.output = Xe.output + kn.output),
              (he.backtrack = !0),
              gt({ type: "paren", extglob: !0, value: Ae, output: "" }),
              Wt("parens"));
            return;
          }
          let Lt = Xe.close + (r.capture ? ")" : ""),
            ln;
          if (Xe.type === "negate") {
            let Zt = Ie;
            if (Xe.inner && Xe.inner.length > 1 && Xe.inner.includes("/")) Zt = me(r);
            if (Zt !== Ie || dt() || /^\)+$/.test(xn())) Lt = Xe.close = `)$))${Zt}`;
            if (Xe.inner.includes("*") && (ln = xn()) && /^\.[^\\/.]+$/.test(ln)) {
              let output = Lx(ln, { ...n, fastpaths: !1 }).output;
              Lt = Xe.close = `)${output})${Zt})`;
            }
            if (Xe.prev.type === "bos") he.negatedExtglob = !0;
          }
          (gt({ type: "paren", extglob: !0, value: Ae, output: Lt }), Wt("parens"));
        };
      if (r.fastpaths !== !1 && !/(^[*!]|[/()[\]{}"])/.test(e)) {
        let Xe = !1,
          replaced = e.replace(REGEX_SPECIAL_CHARS_BACKREF, (Je, vt, Lt, ln, Zt, kn) => {
            if (ln === "\\") return ((Xe = !0), Je);
            if (ln === "?") {
              if (vt) return vt + ln + (Zt ? QMARK.repeat(Zt.length) : "");
              if (kn === 0) return Ce + (Zt ? QMARK.repeat(Zt.length) : "");
              return QMARK.repeat(Lt.length);
            }
            if (ln === ".") return DOT_LITERAL.repeat(Lt.length);
            if (ln === "*") {
              if (vt) return vt + ln + (Zt ? Ie : "");
              return Ie;
            }
            return vt ? Je : `\\${Je}`;
          });
        if (Xe === !0)
          if (r.unescape === !0) replaced = replaced.replace(/\\/g, "");
          else replaced = replaced.replace(/\\+/g, (Je) => (Je.length % 2 === 0 ? "\\\\" : Je ? "\\" : ""));
        if (replaced === e && r.contains === !0) return ((he.output = e), he);
        return ((he.output = _r.wrapOutput(replaced, he, n)), he);
      }
      while (!dt()) {
        if (((Ae = Ft()), Ae === "\x00")) continue;
        if (Ae === "\\") {
          let Je = Me();
          if (Je === "/" && r.bash !== !0) continue;
          if (Je === "." || Je === ";") continue;
          if (!Je) {
            ((Ae += "\\"), gt({ type: "text", value: Ae }));
            continue;
          }
          let match = /^\\+/.exec(xn()),
            Lt = 0;
          if (match && match[0].length > 2) {
            if (((Lt = match[0].length), (he.index += Lt), Lt % 2 !== 0)) Ae += "\\";
          }
          if (r.unescape === !0) Ae = Ft();
          else Ae += Ft();
          if (he.brackets === 0) {
            gt({ type: "text", value: Ae });
            continue;
          }
        }
        if (he.brackets > 0 && (Ae !== "]" || we.value === "[" || we.value === "[^")) {
          if (r.posix !== !1 && Ae === ":") {
            let sliced = we.value.slice(1);
            if (sliced.includes("[")) {
              if (((we.posix = !0), sliced.includes(":"))) {
                let index = we.value.lastIndexOf("["),
                  sliced = we.value.slice(0, index),
                  sliced_2 = we.value.slice(index + 2),
                  Zt = POSIX_REGEX_SOURCE[sliced_2];
                if (Zt) {
                  if (((we.value = sliced + Zt), (he.backtrack = !0), Ft(), !y.output && b.indexOf(we) === 1))
                    y.output = ONE_CHAR;
                  continue;
                }
              }
            }
          }
          if ((Ae === "[" && Me() !== ":") || (Ae === "-" && Me() === "]")) Ae = `\\${Ae}`;
          if (Ae === "]" && (we.value === "[" || we.value === "[^")) Ae = `\\${Ae}`;
          if (r.posix === !0 && Ae === "!" && we.value === "[") Ae = "^";
          ((we.value += Ae), Mt({ value: Ae }));
          continue;
        }
        if (he.quotes === 1 && Ae !== '"') {
          ((Ae = _r.escapeRegex(Ae)), (we.value += Ae), Mt({ value: Ae }));
          continue;
        }
        if (Ae === '"') {
          if (((he.quotes = he.quotes === 1 ? 0 : 1), r.keepQuotes === !0)) gt({ type: "text", value: Ae });
          continue;
        }
        if (Ae === "(") {
          (Nt("parens"), gt({ type: "paren", value: Ae }));
          continue;
        }
        if (Ae === ")") {
          if (he.parens === 0 && r.strictBrackets === !0) throw SyntaxError(Pu("opening", "("));
          let Je = ft[ft.length - 1];
          if (Je && he.parens === Je.parens + 1) {
            Rn(ft.pop());
            continue;
          }
          (gt({ type: "paren", value: Ae, output: he.parens ? ")" : "\\)" }), Wt("parens"));
          continue;
        }
        if (Ae === "[") {
          if (r.nobracket === !0 || !xn().includes("]")) {
            if (r.nobracket !== !0 && r.strictBrackets === !0) throw SyntaxError(Pu("closing", "]"));
            Ae = `\\${Ae}`;
          } else Nt("brackets");
          gt({ type: "bracket", value: Ae });
          continue;
        }
        if (Ae === "]") {
          if (r.nobracket === !0 || (we && we.type === "bracket" && we.value.length === 1)) {
            gt({ type: "text", value: Ae, output: `\\${Ae}` });
            continue;
          }
          if (he.brackets === 0) {
            if (r.strictBrackets === !0) throw SyntaxError(Pu("opening", "["));
            gt({ type: "text", value: Ae, output: `\\${Ae}` });
            continue;
          }
          Wt("brackets");
          let sliced = we.value.slice(1);
          if (we.posix !== !0 && sliced[0] === "^" && !sliced.includes("/")) Ae = `/${Ae}`;
          if (((we.value += Ae), Mt({ value: Ae }), r.literalBrackets === !1 || _r.hasRegexChars(sliced)))
            continue;
          let escapeRegex = _r.escapeRegex(we.value);
          if (((he.output = he.output.slice(0, -we.value.length)), r.literalBrackets === !0)) {
            ((he.output += escapeRegex), (we.value = escapeRegex));
            continue;
          }
          ((we.value = `(${S}${escapeRegex}|${we.value})`), (he.output += we.value));
          continue;
        }
        if (Ae === "{" && r.nobrace !== !0) {
          Nt("braces");
          let Je = {
            type: "brace",
            value: Ae,
            output: "(",
            outputIndex: he.output.length,
            tokensIndex: he.tokens.length,
          };
          (rt.push(Je), gt(Je));
          continue;
        }
        if (Ae === "}") {
          let Je = rt[rt.length - 1];
          if (r.nobrace === !0 || !Je) {
            gt({ type: "text", value: Ae, output: Ae });
            continue;
          }
          let vt = ")";
          if (Je.dots === !0) {
            let sliced = b.slice(),
              ln = [];
            for (let Zt = sliced.length - 1; Zt >= 0; Zt--) {
              if ((b.pop(), sliced[Zt].type === "brace")) break;
              if (sliced[Zt].type !== "dots") ln.unshift(sliced[Zt].value);
            }
            ((vt = xq(ln, r)), (he.backtrack = !0));
          }
          if (Je.comma !== !0 && Je.dots !== !0) {
            let sliced = he.output.slice(0, Je.outputIndex),
              sliced_2 = he.tokens.slice(Je.tokensIndex);
            ((Je.value = Je.output = "\\{"), (Ae = vt = "\\}"), (he.output = sliced));
            for (let Zt of sliced_2) he.output += Zt.output || Zt.value;
          }
          (gt({ type: "brace", value: Ae, output: vt }), Wt("braces"), rt.pop());
          continue;
        }
        if (Ae === "|") {
          if (ft.length > 0) ft[ft.length - 1].conditions++;
          gt({ type: "text", value: Ae });
          continue;
        }
        if (Ae === ",") {
          let Je = Ae,
            vt = rt[rt.length - 1];
          if (vt && ut[ut.length - 1] === "braces") ((vt.comma = !0), (Je = "|"));
          gt({ type: "comma", value: Ae, output: Je });
          continue;
        }
        if (Ae === "/") {
          if (we.type === "dot" && he.index === he.start + 1) {
            ((he.start = he.index + 1), (he.consumed = ""), (he.output = ""), b.pop(), (we = y));
            continue;
          }
          gt({ type: "slash", value: Ae, output: SLASH_LITERAL });
          continue;
        }
        if (Ae === ".") {
          if (he.braces > 0 && we.type === "dot") {
            if (we.value === ".") we.output = DOT_LITERAL;
            let Je = rt[rt.length - 1];
            ((we.type = "dots"), (we.output += Ae), (we.value += Ae), (Je.dots = !0));
            continue;
          }
          if (he.braces + he.parens === 0 && we.type !== "bos" && we.type !== "slash") {
            gt({ type: "text", value: Ae, output: DOT_LITERAL });
            continue;
          }
          gt({ type: "dot", value: Ae, output: DOT_LITERAL });
          continue;
        }
        if (Ae === "?") {
          if (!(we && we.value === "(") && r.noextglob !== !0 && Me() === "(" && Me(2) !== "?") {
            jt("qmark", Ae);
            continue;
          }
          if (we && we.type === "paren") {
            let vt = Me(),
              Lt = Ae;
            if ((we.value === "(" && !/[!=<:]/.test(vt)) || (vt === "<" && !/<([!=]|\w+>)/.test(xn())))
              Lt = `\\${Ae}`;
            gt({ type: "text", value: Ae, output: Lt });
            continue;
          }
          if (r.dot !== !0 && (we.type === "slash" || we.type === "bos")) {
            gt({ type: "qmark", value: Ae, output: QMARK_NO_DOT });
            continue;
          }
          gt({ type: "qmark", value: Ae, output: QMARK });
          continue;
        }
        if (Ae === "!") {
          if (r.noextglob !== !0 && Me() === "(") {
            if (Me(2) !== "?" || !/[!=<:]/.test(Me(3))) {
              jt("negate", Ae);
              continue;
            }
          }
          if (r.nonegate !== !0 && he.index === 0) {
            mn();
            continue;
          }
        }
        if (Ae === "+") {
          if (r.noextglob !== !0 && Me() === "(" && Me(2) !== "?") {
            jt("plus", Ae);
            continue;
          }
          if ((we && we.value === "(") || r.regex === !1) {
            gt({ type: "plus", value: Ae, output: PLUS_LITERAL });
            continue;
          }
          if (
            (we && (we.type === "bracket" || we.type === "paren" || we.type === "brace")) ||
            he.parens > 0
          ) {
            gt({ type: "plus", value: Ae });
            continue;
          }
          gt({ type: "plus", value: PLUS_LITERAL });
          continue;
        }
        if (Ae === "@") {
          if (r.noextglob !== !0 && Me() === "(" && Me(2) !== "?") {
            gt({ type: "at", extglob: !0, value: Ae, output: "" });
            continue;
          }
          gt({ type: "text", value: Ae });
          continue;
        }
        if (Ae !== "*") {
          if (Ae === "$" || Ae === "^") Ae = `\\${Ae}`;
          let match = REGEX_NON_SPECIAL_CHARS.exec(xn());
          if (match) ((Ae += match[0]), (he.index += match[0].length));
          gt({ type: "text", value: Ae });
          continue;
        }
        if (we && (we.type === "globstar" || we.star === !0)) {
          ((we.type = "star"),
            (we.star = !0),
            (we.value += Ae),
            (we.output = Ie),
            (he.backtrack = !0),
            (he.globstar = !0),
            mt(Ae));
          continue;
        }
        let Xe = xn();
        if (r.noextglob !== !0 && /^\([^?]/.test(Xe)) {
          jt("star", Ae);
          continue;
        }
        if (we.type === "star") {
          if (r.noglobstar === !0) {
            mt(Ae);
            continue;
          }
          let prev = we.prev,
            prev_2 = prev.prev,
            Lt = prev.type === "slash" || prev.type === "bos",
            ln = prev_2 && (prev_2.type === "star" || prev_2.type === "globstar");
          if (r.bash === !0 && (!Lt || (Xe[0] && Xe[0] !== "/"))) {
            gt({ type: "star", value: Ae, output: "" });
            continue;
          }
          let Zt = he.braces > 0 && (prev.type === "comma" || prev.type === "brace"),
            kn = ft.length && (prev.type === "pipe" || prev.type === "paren");
          if (!Lt && prev.type !== "paren" && !Zt && !kn) {
            gt({ type: "star", value: Ae, output: "" });
            continue;
          }
          while (Xe.slice(0, 3) === "/**") {
            let zr = e[he.index + 4];
            if (zr && zr !== "/") break;
            ((Xe = Xe.slice(3)), mt("/**", 3));
          }
          if (prev.type === "bos" && dt()) {
            ((we.type = "globstar"),
              (we.value += Ae),
              (we.output = me(r)),
              (he.output = we.output),
              (he.globstar = !0),
              mt(Ae));
            continue;
          }
          if (prev.type === "slash" && prev.prev.type !== "bos" && !ln && dt()) {
            ((he.output = he.output.slice(0, -(prev.output + we.output).length)),
              (prev.output = `(?:${prev.output}`),
              (we.type = "globstar"),
              (we.output = me(r) + (r.strictSlashes ? ")" : "|$)")),
              (we.value += Ae),
              (he.globstar = !0),
              (he.output += prev.output + we.output),
              mt(Ae));
            continue;
          }
          if (prev.type === "slash" && prev.prev.type !== "bos" && Xe[0] === "/") {
            let zr = Xe[1] !== void 0 ? "|$" : "";
            ((he.output = he.output.slice(0, -(prev.output + we.output).length)),
              (prev.output = `(?:${prev.output}`),
              (we.type = "globstar"),
              (we.output = `${me(r)}${SLASH_LITERAL}|${SLASH_LITERAL}${zr})`),
              (we.value += Ae),
              (he.output += prev.output + we.output),
              (he.globstar = !0),
              mt(Ae + Ft()),
              gt({ type: "slash", value: "/", output: "" }));
            continue;
          }
          if (prev.type === "bos" && Xe[0] === "/") {
            ((we.type = "globstar"),
              (we.value += Ae),
              (we.output = `(?:^|${SLASH_LITERAL}|${me(r)}${SLASH_LITERAL})`),
              (he.output = we.output),
              (he.globstar = !0),
              mt(Ae + Ft()),
              gt({ type: "slash", value: "/", output: "" }));
            continue;
          }
          ((he.output = he.output.slice(0, -we.output.length)),
            (we.type = "globstar"),
            (we.output = me(r)),
            (we.value += Ae),
            (he.output += we.output),
            (he.globstar = !0),
            mt(Ae));
          continue;
        }
        let nn = { type: "star", value: Ae, output: Ie };
        if (r.bash === !0) {
          if (((nn.output = ".*?"), we.type === "bos" || we.type === "slash")) nn.output = Ne + nn.output;
          gt(nn);
          continue;
        }
        if (we && (we.type === "bracket" || we.type === "paren") && r.regex === !0) {
          ((nn.output = Ae), gt(nn));
          continue;
        }
        if (he.index === he.start || we.type === "slash" || we.type === "dot") {
          if (we.type === "dot") ((he.output += NO_DOT_SLASH), (we.output += NO_DOT_SLASH));
          else if (r.dot === !0) ((he.output += NO_DOTS_SLASH), (we.output += NO_DOTS_SLASH));
          else ((he.output += Ne), (we.output += Ne));
          if (Me() !== "*") ((he.output += ONE_CHAR), (we.output += ONE_CHAR));
        }
        gt(nn);
      }
      while (he.brackets > 0) {
        if (r.strictBrackets === !0) throw SyntaxError(Pu("closing", "]"));
        ((he.output = _r.escapeLast(he.output, "[")), Wt("brackets"));
      }
      while (he.parens > 0) {
        if (r.strictBrackets === !0) throw SyntaxError(Pu("closing", ")"));
        ((he.output = _r.escapeLast(he.output, "(")), Wt("parens"));
      }
      while (he.braces > 0) {
        if (r.strictBrackets === !0) throw SyntaxError(Pu("closing", "}"));
        ((he.output = _r.escapeLast(he.output, "{")), Wt("braces"));
      }
      if (r.strictSlashes !== !0 && (we.type === "star" || we.type === "bracket"))
        gt({ type: "maybe_slash", value: "", output: `${SLASH_LITERAL}?` });
      if (he.backtrack === !0) {
        he.output = "";
        for (let token of he.tokens)
          if (((he.output += token.output != null ? token.output : token.value), token.suffix))
            he.output += token.suffix;
      }
      return he;
    };
  Lx.fastpaths = (e, n) => {
    let r = { ...n },
      s = typeof r.maxLength === "number" ? Math.min(MAX_LENGTH, r.maxLength) : MAX_LENGTH,
      h = e.length;
    if (h > s) throw SyntaxError(`Input length: ${h}, exceeds maximum allowed length: ${s}`);
    e = REPLACEMENTS[e] || e;
    let {
        DOT_LITERAL: DOT_LITERAL,
        SLASH_LITERAL: SLASH_LITERAL,
        ONE_CHAR: ONE_CHAR,
        DOTS_SLASH: DOTS_SLASH,
        NO_DOT: NO_DOT,
        NO_DOTS: NO_DOTS,
        NO_DOTS_SLASH: NO_DOTS_SLASH,
        STAR: STAR,
        START_ANCHOR: START_ANCHOR,
      } = ya.globChars(r.windows),
      K = r.dot ? NO_DOTS : NO_DOT,
      q = r.dot ? NO_DOTS_SLASH : NO_DOT,
      Z = r.capture ? "" : "?:",
      J = { negated: !1, prefix: "" },
      ie = r.bash === !0 ? ".*?" : STAR;
    if (r.capture) ie = `(${ie})`;
    let ae = (Ne) => {
        if (Ne.noglobstar === !0) return ie;
        return `(${Z}(?:(?!${START_ANCHOR}${Ne.dot ? DOTS_SLASH : DOT_LITERAL}).)*?)`;
      },
      Se = (Ne) => {
        switch (Ne) {
          case "*":
            return `${K}${ONE_CHAR}${ie}`;
          case ".*":
            return `${DOT_LITERAL}${ONE_CHAR}${ie}`;
          case "*.*":
            return `${K}${ie}${DOT_LITERAL}${ONE_CHAR}${ie}`;
          case "*/*":
            return `${K}${ie}${SLASH_LITERAL}${ONE_CHAR}${q}${ie}`;
          case "**":
            return K + ae(r);
          case "**/*":
            return `(?:${K}${ae(r)}${SLASH_LITERAL})?${q}${ONE_CHAR}${ie}`;
          case "**/*.*":
            return `(?:${K}${ae(r)}${SLASH_LITERAL})?${q}${ie}${DOT_LITERAL}${ONE_CHAR}${ie}`;
          case "**/.*":
            return `(?:${K}${ae(r)}${SLASH_LITERAL})?${DOT_LITERAL}${ONE_CHAR}${ie}`;
          default: {
            let match = /^(.*?)\.(\w+)$/.exec(Ne);
            if (!match) return;
            let Ie = Se(match[1]);
            if (!Ie) return;
            return Ie + DOT_LITERAL + match[2];
          }
        }
      },
      removePrefix = _r.removePrefix(e, J),
      me = Se(removePrefix);
    if (me && r.strictSlashes !== !0) me += `${SLASH_LITERAL}?`;
    return me;
  };
  aN.exports = Lx;
});

export { lN };
