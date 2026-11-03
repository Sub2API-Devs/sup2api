/**
 * picomatch/lib/scan.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: picomatch@4.0.4..4.0.7
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../runtime/bun-runtime.js";
import { np } from "./utils.js";
import { tp } from "./constants.js";

//@ chunk-fq0cr76a.js:299275-302511 cjs-fingerprint
var rN = x(function (Gge, nN) {
  var bg = np(),
    {
      CHAR_ASTERISK: CHAR_ASTERISK,
      CHAR_AT: CHAR_AT,
      CHAR_BACKWARD_SLASH: CHAR_BACKWARD_SLASH,
      CHAR_COMMA: CHAR_COMMA,
      CHAR_DOT: CHAR_DOT,
      CHAR_EXCLAMATION_MARK: CHAR_EXCLAMATION_MARK,
      CHAR_FORWARD_SLASH: CHAR_FORWARD_SLASH,
      CHAR_LEFT_CURLY_BRACE: CHAR_LEFT_CURLY_BRACE,
      CHAR_LEFT_PARENTHESES: CHAR_LEFT_PARENTHESES,
      CHAR_LEFT_SQUARE_BRACKET: CHAR_LEFT_SQUARE_BRACKET,
      CHAR_PLUS: CHAR_PLUS,
      CHAR_QUESTION_MARK: CHAR_QUESTION_MARK,
      CHAR_RIGHT_CURLY_BRACE: CHAR_RIGHT_CURLY_BRACE,
      CHAR_RIGHT_PARENTHESES: CHAR_RIGHT_PARENTHESES,
      CHAR_RIGHT_SQUARE_BRACKET: CHAR_RIGHT_SQUARE_BRACKET,
    } = tp(),
    QI = (e) => e === CHAR_FORWARD_SLASH || e === CHAR_BACKWARD_SLASH,
    eN = (e) => {
      if (e.isPrefix !== !0) e.depth = e.isGlobstar ? 1 / 0 : 1;
    },
    yq = (e, n) => {
      let r = n || {},
        s = e.length - 1,
        h = r.parts === !0 || r.scanToEnd === !0,
        y = [],
        b = [],
        S = [],
        w = e,
        R = -1,
        D = 0,
        O = 0,
        L = !1,
        V = !1,
        K = !1,
        q = !1,
        Z = !1,
        J = !1,
        ie = !1,
        ae = !1,
        Se = !1,
        ue = !1,
        me = 0,
        Ne,
        Ce,
        Ie = { value: "", depth: 0, isGlob: !1 },
        he = () => R >= s,
        ft = () => w.charCodeAt(R + 1),
        rt = () => ((Ne = Ce), w.charCodeAt(++R));
      while (R < s) {
        Ce = rt();
        let Me;
        if (Ce === CHAR_BACKWARD_SLASH) {
          if (((ie = Ie.backslashes = !0), (Ce = rt()), Ce === CHAR_LEFT_CURLY_BRACE)) J = !0;
          continue;
        }
        if (J === !0 || Ce === CHAR_LEFT_CURLY_BRACE) {
          me++;
          while (he() !== !0 && (Ce = rt())) {
            if (Ce === CHAR_BACKWARD_SLASH) {
              ((ie = Ie.backslashes = !0), rt());
              continue;
            }
            if (Ce === CHAR_LEFT_CURLY_BRACE) {
              me++;
              continue;
            }
            if (J !== !0 && Ce === CHAR_DOT && (Ce = rt()) === CHAR_DOT) {
              if (((L = Ie.isBrace = !0), (K = Ie.isGlob = !0), (ue = !0), h === !0)) continue;
              break;
            }
            if (J !== !0 && Ce === CHAR_COMMA) {
              if (((L = Ie.isBrace = !0), (K = Ie.isGlob = !0), (ue = !0), h === !0)) continue;
              break;
            }
            if (Ce === CHAR_RIGHT_CURLY_BRACE) {
              if ((me--, me === 0)) {
                ((J = !1), (L = Ie.isBrace = !0), (ue = !0));
                break;
              }
            }
          }
          if (h === !0) continue;
          break;
        }
        if (Ce === CHAR_FORWARD_SLASH) {
          if ((y.push(R), b.push(Ie), (Ie = { value: "", depth: 0, isGlob: !1 }), ue === !0)) continue;
          if (Ne === CHAR_DOT && R === D + 1) {
            D += 2;
            continue;
          }
          O = R + 1;
          continue;
        }
        if (r.noext !== !0) {
          if (
            (Ce === CHAR_PLUS ||
              Ce === CHAR_AT ||
              Ce === CHAR_ASTERISK ||
              Ce === CHAR_QUESTION_MARK ||
              Ce === CHAR_EXCLAMATION_MARK) === !0 &&
            ft() === CHAR_LEFT_PARENTHESES
          ) {
            if (
              ((K = Ie.isGlob = !0),
              (q = Ie.isExtglob = !0),
              (ue = !0),
              Ce === CHAR_EXCLAMATION_MARK && R === D)
            )
              Se = !0;
            if (h === !0) {
              while (he() !== !0 && (Ce = rt())) {
                if (Ce === CHAR_BACKWARD_SLASH) {
                  ((ie = Ie.backslashes = !0), (Ce = rt()));
                  continue;
                }
                if (Ce === CHAR_RIGHT_PARENTHESES) {
                  ((K = Ie.isGlob = !0), (ue = !0));
                  break;
                }
              }
              continue;
            }
            break;
          }
        }
        if (Ce === CHAR_ASTERISK) {
          if (Ne === CHAR_ASTERISK) Z = Ie.isGlobstar = !0;
          if (((K = Ie.isGlob = !0), (ue = !0), h === !0)) continue;
          break;
        }
        if (Ce === CHAR_QUESTION_MARK) {
          if (((K = Ie.isGlob = !0), (ue = !0), h === !0)) continue;
          break;
        }
        if (Ce === CHAR_LEFT_SQUARE_BRACKET) {
          while (he() !== !0 && (Me = rt())) {
            if (Me === CHAR_BACKWARD_SLASH) {
              ((ie = Ie.backslashes = !0), rt());
              continue;
            }
            if (Me === CHAR_RIGHT_SQUARE_BRACKET) {
              ((V = Ie.isBracket = !0), (K = Ie.isGlob = !0), (ue = !0));
              break;
            }
          }
          if (h === !0) continue;
          break;
        }
        if (r.nonegate !== !0 && Ce === CHAR_EXCLAMATION_MARK && R === D) {
          ((ae = Ie.negated = !0), D++);
          continue;
        }
        if (r.noparen !== !0 && Ce === CHAR_LEFT_PARENTHESES) {
          if (((K = Ie.isGlob = !0), h === !0)) {
            while (he() !== !0 && (Ce = rt())) {
              if (Ce === CHAR_LEFT_PARENTHESES) {
                ((ie = Ie.backslashes = !0), (Ce = rt()));
                continue;
              }
              if (Ce === CHAR_RIGHT_PARENTHESES) {
                ue = !0;
                break;
              }
            }
            continue;
          }
          break;
        }
        if (K === !0) {
          if (((ue = !0), h === !0)) continue;
          break;
        }
      }
      if (r.noext === !0) ((q = !1), (K = !1));
      let ut = w,
        we = "",
        Ae = "";
      if (D > 0) ((we = w.slice(0, D)), (w = w.slice(D)), (O -= D));
      if (ut && K === !0 && O > 0) ((ut = w.slice(0, O)), (Ae = w.slice(O)));
      else if (K === !0) ((ut = ""), (Ae = w));
      else ut = w;
      if (ut && ut !== "" && ut !== "/" && ut !== w) {
        if (QI(ut.charCodeAt(ut.length - 1))) ut = ut.slice(0, -1);
      }
      if (r.unescape === !0) {
        if (Ae) Ae = bg.removeBackslashes(Ae);
        if (ut && ie === !0) ut = bg.removeBackslashes(ut);
      }
      let dt = {
        prefix: we,
        input: e,
        start: D,
        base: ut,
        glob: Ae,
        isBrace: L,
        isBracket: V,
        isGlob: K,
        isExtglob: q,
        isGlobstar: Z,
        negated: ae,
        negatedExtglob: Se,
      };
      if (r.tokens === !0) {
        if (((dt.maxDepth = 0), !QI(Ce))) b.push(Ie);
        dt.tokens = b;
      }
      if (r.parts === !0 || r.tokens === !0) {
        let Me;
        for (let Ft = 0; Ft < y.length; Ft++) {
          let xn = Me ? Me + 1 : D,
            mt = y[Ft],
            sliced = e.slice(xn, mt);
          if (r.tokens) {
            if (Ft === 0 && D !== 0) ((b[Ft].isPrefix = !0), (b[Ft].value = we));
            else b[Ft].value = sliced;
            (eN(b[Ft]), (dt.maxDepth += b[Ft].depth));
          }
          if (Ft !== 0 || sliced !== "") S.push(sliced);
          Me = mt;
        }
        if (Me && Me + 1 < e.length) {
          let sliced = e.slice(Me + 1);
          if ((S.push(sliced), r.tokens))
            ((b[b.length - 1].value = sliced), eN(b[b.length - 1]), (dt.maxDepth += b[b.length - 1].depth));
        }
        ((dt.slashes = y), (dt.parts = S));
      }
      return dt;
    };
  nN.exports = yq;
});

export { rN };
