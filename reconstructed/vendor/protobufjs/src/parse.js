/**
 * protobufjs/src/parse.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: protobufjs@7.6.0
 * pieces: chunk-pwh5dx3n.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../runtime/bun-runtime.js";
import { ao } from "./tokenize.js";
import { xs } from "./root.js";
import { Ps } from "./type.js";
import { Yt } from "./field.js";
import { Ts } from "./mapfield.js";
import { Sr } from "./oneof.js";
import { nt } from "./enum.js";
import { bs } from "./service.js";
import { Rs } from "./method.js";
import { Kt } from "./object.js";
import { Cr } from "./types.js";
import { de } from "./util.js";

//@ chunk-pwh5dx3n.js:132937-141305 cjs-fingerprint
var Qd = x(function (TA, Xd) {
  Xd.exports = Bt;
  Bt.filename = null;
  Bt.defaults = { keepCase: !1 };
  var XE = ao(),
    Vd = xs(),
    Yd = Ps(),
    Kd = Yt(),
    QE = Ts(),
    Jd = Sr(),
    ZE = nt(),
    eT = bs(),
    tT = Rs(),
    rT = Kt(),
    iT = Cr(),
    yt = de(),
    sT = /^[1-9][0-9]*$/,
    nT = /^-?[1-9][0-9]*$/,
    aT = /^0[x][0-9a-fA-F]+$/,
    oT = /^-?0[x][0-9a-fA-F]+$/,
    lT = /^0[0-7]+$/,
    cT = /^-?0[0-7]+$/,
    numberRe = yt.patterns.numberRe,
    mt = /^[a-zA-Z_][a-zA-Z_0-9]*$/,
    typeRefRe = yt.patterns.typeRefRe;
  function Bt(e, t, r) {
    if (!(t instanceof Vd)) ((r = t), (t = new Vd()));
    if (!r) r = Bt.defaults;
    var i = r.preferTrailingComment || !1,
      s = XE(e, r.alternateCommentMode || !1),
      { next: n, push: a, peek: peek, skip: skip, cmnt: cmnt } = s,
      u = !0,
      d,
      h,
      m,
      f = "proto2",
      y = t,
      C = [],
      E = {},
      A = r.keepCase
        ? function (g) {
            return g;
          }
        : yt.camelCase;
    function te() {
      C.forEach((g) => {
        ((g._edition = f),
          Object.keys(E).forEach((p) => {
            if (g.getOption(p) !== void 0) return;
            g.setOption(p, E[p], !0);
          }));
      });
    }
    function v(g, p, _) {
      var filename = Bt.filename;
      if (!_) Bt.filename = null;
      return Error(
        "illegal " +
          (p || "token") +
          " '" +
          g +
          "' (" +
          (filename ? filename + ", " : "") +
          "line " +
          s.line +
          ")",
      );
    }
    function U() {
      var g = [],
        p;
      do {
        if ((p = n()) !== '"' && p !== "'") throw v(p);
        (g.push(n()), skip(p), (p = peek()));
      } while (p === '"' || p === "'");
      return g.join("");
    }
    function O(g) {
      var p = n();
      switch (p) {
        case "'":
        case '"':
          return (a(p), U());
        case "true":
        case "TRUE":
          return !0;
        case "false":
        case "FALSE":
          return !1;
      }
      try {
        return X(p, !0);
      } catch (error) {
        if (g && typeRefRe.test(p)) return p;
        throw v(p, "value");
      }
    }
    function W(g, p) {
      var _, S;
      do
        if (p && ((_ = peek()) === '"' || _ === "'")) {
          var w = U();
          if ((g.push(w), f >= 2023)) throw v(w, "id");
        } else
          try {
            g.push([(S = D(n())), skip("to", !0) ? D(n()) : S]);
          } catch (error) {
            if (p && typeRefRe.test(_) && f >= 2023) g.push(_);
            else throw error;
          }
      while (skip(",", !0));
      var T = { options: void 0 };
      ((T.setOption = function (M, ce) {
        if (this.options === void 0) this.options = {};
        this.options[M] = ce;
      }),
        et(
          T,
          function (ce) {
            if (ce === "option") (tt(T, ce), skip(";"));
            else throw v(ce);
          },
          function () {
            Xi(T);
          },
        ));
    }
    function X(g, p) {
      var _ = 1;
      if (g.charAt(0) === "-") ((_ = -1), (g = g.substring(1)));
      switch (g) {
        case "inf":
        case "INF":
        case "Inf":
          return _ * (1 / 0);
        case "nan":
        case "NAN":
        case "Nan":
        case "NaN":
          return NaN;
        case "0":
          return 0;
      }
      if (sT.test(g)) return _ * parseInt(g, 10);
      if (aT.test(g)) return _ * parseInt(g, 16);
      if (lT.test(g)) return _ * parseInt(g, 8);
      if (numberRe.test(g)) return _ * parseFloat(g);
      throw v(g, "number", p);
    }
    function D(g, p) {
      switch (g) {
        case "max":
        case "MAX":
        case "Max":
          return 536870911;
        case "0":
          return 0;
      }
      if (!p && g.charAt(0) === "-") throw v(g, "id");
      if (nT.test(g)) return parseInt(g, 10);
      if (oT.test(g)) return parseInt(g, 16);
      if (cT.test(g)) return parseInt(g, 8);
      throw v(g, "id");
    }
    function le() {
      if (d !== void 0) throw v("package");
      if (((d = n()), !typeRefRe.test(d))) throw v(d, "name");
      ((y = y.define(d)), skip(";"));
    }
    function qe() {
      var g = peek(),
        p;
      switch (g) {
        case "weak":
          ((p = m || (m = [])), n());
          break;
        case "public":
          n();
        default:
          p = h || (h = []);
          break;
      }
      ((g = U()), skip(";"), p.push(g));
    }
    function Ze() {
      if ((skip("="), (f = U()), f < 2023)) throw v(f, "syntax");
      skip(";");
    }
    function by() {
      if ((skip("="), (f = U()), !["2023"].includes(f))) throw v(f, "edition");
      skip(";");
    }
    function ea(g, p, _) {
      switch (((_ = yt.checkDepth(_)), p)) {
        case "option":
          return (tt(g, p), skip(";"), !0);
        case "message":
          return (ul(g, p, _ + 1), !0);
        case "enum":
          return (dl(g, p), !0);
        case "service":
          return (My(g, p, _ + 1), !0);
        case "extend":
          return (xy(g, p, _), !0);
      }
      return !1;
    }
    function et(g, p, _) {
      var line = s.line;
      if (g) {
        if (typeof g.comment !== "string") g.comment = cmnt();
        g.filename = Bt.filename;
      }
      if (skip("{", !0)) {
        var w;
        while ((w = n()) !== "}") p(w);
        skip(";", !0);
      } else {
        if (_) _();
        if ((skip(";"), g && (typeof g.comment !== "string" || i))) g.comment = cmnt(line) || g.comment;
      }
    }
    function ul(g, p, _) {
      if (((_ = yt.checkDepth(_)), !mt.test((p = n())))) throw v(p, "type name");
      var S = new Yd(p);
      if (
        (et(S, function (T) {
          if (ea(S, T, _)) return;
          switch (T) {
            case "map":
              wy(S, T);
              break;
            case "required":
              if (f !== "proto2") throw v(T);
            case "repeated":
              Ue(S, T, void 0, _ + 1);
              break;
            case "optional":
              if (f === "proto3") Ue(S, "proto3_optional", void 0, _ + 1);
              else if (f !== "proto2") throw v(T);
              else Ue(S, "optional", void 0, _ + 1);
              break;
            case "oneof":
              Ay(S, T, _ + 1);
              break;
            case "extensions":
              W(S.extensions || (S.extensions = []));
              break;
            case "reserved":
              W(S.reserved || (S.reserved = []), !0);
              break;
            default:
              if (f === "proto2" || !typeRefRe.test(T)) throw v(T);
              (a(T), Ue(S, "optional", void 0, _ + 1));
              break;
          }
        }),
        g.add(S),
        g === y)
      )
        C.push(S);
    }
    function Ue(g, p, _, S) {
      var w = n();
      if (w === "group") {
        Oy(g, p, S);
        return;
      }
      while (w.endsWith(".") || peek().startsWith(".")) w += n();
      if (!typeRefRe.test(w)) throw v(w, "type");
      var T = n();
      if (!mt.test(T)) throw v(T, "name");
      ((T = A(T)), skip("="));
      var M = new Kd(T, D(n()), w, p, _);
      if (
        (et(
          M,
          function (Oe) {
            if (Oe === "option") (tt(M, Oe), skip(";"));
            else throw v(Oe);
          },
          function () {
            Xi(M);
          },
        ),
        p === "proto3_optional")
      ) {
        var ce = new Jd("_" + T);
        (M.setOption("proto3_optional", !0), ce.add(M), g.add(ce));
      } else g.add(M);
      if (g === y) C.push(M);
    }
    function Oy(g, p, _) {
      if (((_ = yt.checkDepth(_)), f >= 2023)) throw v("group");
      var S = n();
      if (!mt.test(S)) throw v(S, "name");
      var lcFirst = yt.lcFirst(S);
      if (S === lcFirst) S = yt.ucFirst(S);
      skip("=");
      var T = D(n()),
        M = new Yd(S);
      M.group = !0;
      var ce = new Kd(lcFirst, T, S, p);
      ((ce.filename = Bt.filename),
        et(M, function (Oe) {
          switch (Oe) {
            case "option":
              (tt(M, Oe), skip(";"));
              break;
            case "required":
            case "repeated":
              Ue(M, Oe, void 0, _ + 1);
              break;
            case "optional":
              if (f === "proto3") Ue(M, "proto3_optional", void 0, _ + 1);
              else Ue(M, "optional", void 0, _ + 1);
              break;
            case "message":
              ul(M, Oe, _ + 1);
              break;
            case "enum":
              dl(M, Oe);
              break;
            case "reserved":
              W(M.reserved || (M.reserved = []), !0);
              break;
            default:
              throw v(Oe);
          }
        }),
        g.add(M).add(ce));
    }
    function wy(g) {
      skip("<");
      var p = n();
      if (iT.mapKey[p] === void 0) throw v(p, "type");
      skip(",");
      var _ = n();
      if (!typeRefRe.test(_)) throw v(_, "type");
      skip(">");
      var S = n();
      if (!mt.test(S)) throw v(S, "name");
      skip("=");
      var w = new QE(A(S), D(n()), p, _);
      (et(
        w,
        function (M) {
          if (M === "option") (tt(w, M), skip(";"));
          else throw v(M);
        },
        function () {
          Xi(w);
        },
      ),
        g.add(w));
    }
    function Ay(g, p, _) {
      if (!mt.test((p = n()))) throw v(p, "name");
      var S = new Jd(A(p));
      (et(S, function (T) {
        if (T === "option") (tt(S, T), skip(";"));
        else (a(T), Ue(S, "optional", void 0, _));
      }),
        g.add(S));
    }
    function dl(g, p) {
      if (!mt.test((p = n()))) throw v(p, "name");
      var _ = new ZE(p);
      if (
        (et(_, function (w) {
          switch (w) {
            case "option":
              (tt(_, w), skip(";"));
              break;
            case "reserved":
              if ((W(_.reserved || (_.reserved = []), !0), _.reserved === void 0)) _.reserved = [];
              break;
            default:
              Py(_, w);
          }
        }),
        g.add(_),
        g === y)
      )
        C.push(_);
    }
    function Py(g, p) {
      if (!mt.test(p)) throw v(p, "name");
      skip("=");
      var _ = D(n(), !0),
        S = { options: void 0 };
      ((S.getOption = function (w) {
        return this.options[w];
      }),
        (S.setOption = function (w, T) {
          rT.prototype.setOption.call(S, w, T);
        }),
        (S.setParsedOption = function () {
          return;
        }),
        et(
          S,
          function (T) {
            if (T === "option") (tt(S, T), skip(";"));
            else throw v(T);
          },
          function () {
            Xi(S);
          },
        ),
        g.add(p, _, S.comment, S.parsedOptions || S.options));
    }
    function tt(g, p) {
      var _,
        S,
        w = !0;
      if (p === "option") p = n();
      while (p !== "=") {
        if (p === "(") {
          var T = n();
          (skip(")"), (p = "(" + T + ")"));
        }
        if (w) {
          if (((w = !1), p.includes(".") && !p.includes("("))) {
            var parts = p.split(".");
            ((_ = parts[0] + "."), (p = parts[1]));
            continue;
          }
          _ = p;
        } else S = S ? (S += p) : p;
        p = n();
      }
      var ce = S ? _.concat(S) : _,
        ct = hl(g, ce);
      ((S = S && S[0] === "." ? S.slice(1) : S),
        (_ = _ && _[_.length - 1] === "." ? _.slice(0, -1) : _),
        Ny(g, _, ct, S));
    }
    function hl(g, p, _) {
      if (((_ = yt.checkDepth(_)), skip("{", !0))) {
        var S = {};
        while (!skip("}", !0)) {
          if (!mt.test((me = n()))) throw v(me, "name");
          if (me === null) throw v(me, "end of input");
          var w,
            T = me;
          if ((skip(":", !0), peek() === "{")) w = hl(g, p + "." + me, _ + 1);
          else if (peek() === "[") {
            w = [];
            var M;
            if (skip("[", !0)) {
              do ((M = O(!0)), w.push(M));
              while (skip(",", !0));
              if ((skip("]"), typeof M < "u")) ta(g, p + "." + me, M);
            }
          } else ((w = O(!0)), ta(g, p + "." + me, w));
          var ce = S[T];
          if (ce) w = [].concat(ce).concat(w);
          if (T !== "__proto__") S[T] = w;
          (skip(",", !0), skip(";", !0));
        }
        return S;
      }
      var ct = O(!0);
      return (ta(g, p, ct), ct);
    }
    function ta(g, p, _) {
      if (y === g && /^features\./.test(p)) {
        E[p] = _;
        return;
      }
      if (g.setOption) g.setOption(p, _);
    }
    function Ny(g, p, _, S) {
      if (g.setParsedOption) g.setParsedOption(p, _, S);
    }
    function Xi(g) {
      if (skip("[", !0)) {
        do tt(g, "option");
        while (skip(",", !0));
        skip("]");
      }
      return g;
    }
    function My(g, p, _) {
      if (((_ = yt.checkDepth(_)), !mt.test((p = n())))) throw v(p, "service name");
      var S = new eT(p);
      if (
        (et(S, function (T) {
          if (ea(S, T, _)) return;
          if (T === "rpc") Iy(S, T);
          else throw v(T);
        }),
        g.add(S),
        g === y)
      )
        C.push(S);
    }
    function Iy(g, p) {
      var _ = cmnt(),
        S = p;
      if (!mt.test((p = n()))) throw v(p, "name");
      var w = p,
        T,
        M,
        ce,
        ct;
      if ((skip("("), skip("stream", !0))) M = !0;
      if (!typeRefRe.test((p = n()))) throw v(p);
      if (((T = p), skip(")"), skip("returns"), skip("("), skip("stream", !0))) ct = !0;
      if (!typeRefRe.test((p = n()))) throw v(p);
      ((ce = p), skip(")"));
      var Oe = new tT(w, S, T, ce, M, ct);
      ((Oe.comment = _),
        et(Oe, function (ra) {
          if (ra === "option") (tt(Oe, ra), skip(";"));
          else throw v(ra);
        }),
        g.add(Oe));
    }
    function xy(g, p, _) {
      if (!typeRefRe.test((p = n()))) throw v(p, "reference");
      var S = p;
      et(null, function (T) {
        switch (T) {
          case "required":
          case "repeated":
            Ue(g, T, S, _ + 1);
            break;
          case "optional":
            if (f === "proto3") Ue(g, "proto3_optional", S, _ + 1);
            else Ue(g, "optional", S, _ + 1);
            break;
          default:
            if (f === "proto2" || !typeRefRe.test(T)) throw v(T);
            (a(T), Ue(g, "optional", S, _ + 1));
            break;
        }
      });
    }
    var me;
    while ((me = n()) !== null)
      switch (me) {
        case "package":
          if (!u) throw v(me);
          le();
          break;
        case "import":
          if (!u) throw v(me);
          qe();
          break;
        case "syntax":
          if (!u) throw v(me);
          Ze();
          break;
        case "edition":
          if (!u) throw v(me);
          by();
          break;
        case "option":
          (tt(y, me), skip(";", !0));
          break;
        default:
          if (ea(y, me, 0)) {
            u = !1;
            continue;
          }
          throw v(me);
      }
    return (te(), (Bt.filename = null), { package: d, imports: h, weakImports: m, root: t });
  }
});

export { Qd };
