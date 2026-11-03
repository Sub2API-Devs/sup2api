/**
 * acorn-walk/dist/walk.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: acorn-walk@8.3.5
 * pieces: chunk-41w44bgm.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../runtime/bun-runtime.js";

//@ chunk-41w44bgm.js:4112-12186 cjs-fingerprint
var Ro = x(function (Hn, Ir) {
  (function (e, n) {
    typeof Hn === "object" && typeof Ir < "u"
      ? n(Hn)
      : typeof define === "function" && define.amd
        ? define(["exports"], n)
        : ((e = typeof globalThis < "u" ? globalThis : e || self),
          n(((e.acorn = e.acorn || {}), (e.acorn.walk = {}))));
  })(Hn, function (e) {
    function n(s, S, w, P, V) {
      if (!w) w = E;
      (function N(se, q, ue) {
        var Ee = ue || se.type;
        if ((ce(w, Ee, se, q, N), S[Ee])) S[Ee](se, q);
      })(s, P, V);
    }
    function r(s, S, w, P, V) {
      var N = [];
      if (!w) w = E;
      (function se(q, ue, Ee) {
        var xe = Ee || q.type,
          ut = q !== N[N.length - 1];
        if (ut) N.push(q);
        if ((ce(w, xe, q, ue, se), S[xe])) S[xe](q, ue || N, N);
        if (ut) N.pop();
      })(s, P, V);
    }
    function h(s, S, w, P, V) {
      var N = w ? me(w, P || void 0) : P;
      (function se(q, ue, Ee) {
        N[Ee || q.type](q, ue, se);
      })(s, S, V);
    }
    function T(s) {
      if (typeof s === "string")
        return function (S) {
          return S === s;
        };
      else if (!s)
        return function () {
          return !0;
        };
      else return s;
    }
    var y = function (S, w) {
      ((this.node = S), (this.state = w));
    };
    function A(s, S, w, P, V) {
      if (!w) w = E;
      var N;
      (function se(q, ue, Ee) {
        var xe = Ee || q.type;
        if ((ce(w, xe, q, ue, se), N !== q)) (S(q, ue, xe), (N = q));
      })(s, P, V);
    }
    function L(s, S, w, P) {
      if (!w) w = E;
      var V = [],
        N;
      (function se(q, ue, Ee) {
        var xe = Ee || q.type,
          ut = q !== V[V.length - 1];
        if (ut) V.push(q);
        if ((ce(w, xe, q, ue, se), N !== q)) (S(q, ue || V, V, xe), (N = q));
        if (ut) V.pop();
      })(s, P);
    }
    function j(s, S, w, P, V, N) {
      if (!V) V = E;
      P = T(P);
      try {
        (function se(q, ue, Ee) {
          var xe = Ee || q.type;
          if ((S == null || q.start <= S) && (w == null || q.end >= w)) ce(V, xe, q, ue, se);
          if ((S == null || q.start === S) && (w == null || q.end === w) && P(xe, q)) throw new y(q, ue);
        })(s, N);
      } catch (error) {
        if (error instanceof y) return error;
        throw error;
      }
    }
    function he(s, S, w, P, V) {
      if (((w = T(w)), !P)) P = E;
      try {
        (function N(se, q, ue) {
          var Ee = ue || se.type;
          if (se.start > S || se.end < S) return;
          if ((ce(P, Ee, se, q, N), w(Ee, se))) throw new y(se, q);
        })(s, V);
      } catch (error) {
        if (error instanceof y) return error;
        throw error;
      }
    }
    function ke(s, S, w, P, V) {
      if (((w = T(w)), !P)) P = E;
      try {
        (function N(se, q, ue) {
          if (se.end < S) return;
          var Ee = ue || se.type;
          if (se.start >= S && w(Ee, se)) throw new y(se, q);
          ce(P, Ee, se, q, N);
        })(s, V);
      } catch (error) {
        if (error instanceof y) return error;
        throw error;
      }
    }
    function te(s, S, w, P, V) {
      if (((w = T(w)), !P)) P = E;
      var N;
      return (
        (function se(q, ue, Ee) {
          if (q.start > S) return;
          var xe = Ee || q.type;
          if (q.end <= S && (!N || N.node.end < q.end) && w(xe, q)) N = new y(q, ue);
          ce(P, xe, q, ue, se);
        })(s, V),
        N
      );
    }
    function me(s, S) {
      var create = Object.create(S || E);
      for (var key in s) create[key] = s[key];
      return create;
    }
    function We(s, S, w) {
      w(s, S);
    }
    function G(s, S, w) {}
    function ce(s, S, w, P, V) {
      if (s[S] == null) throw Error("No walker function defined for node type " + S);
      s[S](w, P, V);
    }
    var E = {};
    ((E.Program =
      E.BlockStatement =
      E.StaticBlock =
        function (s, S, w) {
          for (var P = 0, body = s.body; P < body.length; P += 1) {
            var N = body[P];
            w(N, S, "Statement");
          }
        }),
      (E.Statement = We),
      (E.EmptyStatement = G),
      (E.ExpressionStatement =
        E.ParenthesizedExpression =
        E.ChainExpression =
          function (s, S, w) {
            return w(s.expression, S, "Expression");
          }),
      (E.IfStatement = function (s, S, w) {
        if ((w(s.test, S, "Expression"), w(s.consequent, S, "Statement"), s.alternate))
          w(s.alternate, S, "Statement");
      }),
      (E.LabeledStatement = function (s, S, w) {
        return w(s.body, S, "Statement");
      }),
      (E.BreakStatement = E.ContinueStatement = G),
      (E.WithStatement = function (s, S, w) {
        (w(s.object, S, "Expression"), w(s.body, S, "Statement"));
      }),
      (E.SwitchStatement = function (s, S, w) {
        w(s.discriminant, S, "Expression");
        for (var P = 0, cases = s.cases; P < cases.length; P += 1) {
          var N = cases[P];
          w(N, S);
        }
      }),
      (E.SwitchCase = function (s, S, w) {
        if (s.test) w(s.test, S, "Expression");
        for (var P = 0, consequent = s.consequent; P < consequent.length; P += 1) {
          var N = consequent[P];
          w(N, S, "Statement");
        }
      }),
      (E.ReturnStatement =
        E.YieldExpression =
        E.AwaitExpression =
          function (s, S, w) {
            if (s.argument) w(s.argument, S, "Expression");
          }),
      (E.ThrowStatement = E.SpreadElement =
        function (s, S, w) {
          return w(s.argument, S, "Expression");
        }),
      (E.TryStatement = function (s, S, w) {
        if ((w(s.block, S, "Statement"), s.handler)) w(s.handler, S);
        if (s.finalizer) w(s.finalizer, S, "Statement");
      }),
      (E.CatchClause = function (s, S, w) {
        if (s.param) w(s.param, S, "Pattern");
        w(s.body, S, "Statement");
      }),
      (E.WhileStatement = E.DoWhileStatement =
        function (s, S, w) {
          (w(s.test, S, "Expression"), w(s.body, S, "Statement"));
        }),
      (E.ForStatement = function (s, S, w) {
        if (s.init) w(s.init, S, "ForInit");
        if (s.test) w(s.test, S, "Expression");
        if (s.update) w(s.update, S, "Expression");
        w(s.body, S, "Statement");
      }),
      (E.ForInStatement = E.ForOfStatement =
        function (s, S, w) {
          (w(s.left, S, "ForInit"), w(s.right, S, "Expression"), w(s.body, S, "Statement"));
        }),
      (E.ForInit = function (s, S, w) {
        if (s.type === "VariableDeclaration") w(s, S);
        else w(s, S, "Expression");
      }),
      (E.DebuggerStatement = G),
      (E.FunctionDeclaration = function (s, S, w) {
        return w(s, S, "Function");
      }),
      (E.VariableDeclaration = function (s, S, w) {
        for (var P = 0, declarations = s.declarations; P < declarations.length; P += 1) {
          var N = declarations[P];
          w(N, S);
        }
      }),
      (E.VariableDeclarator = function (s, S, w) {
        if ((w(s.id, S, "Pattern"), s.init)) w(s.init, S, "Expression");
      }),
      (E.Function = function (s, S, w) {
        if (s.id) w(s.id, S, "Pattern");
        for (var P = 0, params = s.params; P < params.length; P += 1) {
          var N = params[P];
          w(N, S, "Pattern");
        }
        w(s.body, S, s.expression ? "Expression" : "Statement");
      }),
      (E.Pattern = function (s, S, w) {
        if (s.type === "Identifier") w(s, S, "VariablePattern");
        else if (s.type === "MemberExpression") w(s, S, "MemberPattern");
        else w(s, S);
      }),
      (E.VariablePattern = G),
      (E.MemberPattern = We),
      (E.RestElement = function (s, S, w) {
        return w(s.argument, S, "Pattern");
      }),
      (E.ArrayPattern = function (s, S, w) {
        for (var P = 0, elements = s.elements; P < elements.length; P += 1) {
          var N = elements[P];
          if (N) w(N, S, "Pattern");
        }
      }),
      (E.ObjectPattern = function (s, S, w) {
        for (var P = 0, properties = s.properties; P < properties.length; P += 1) {
          var N = properties[P];
          if (N.type === "Property") {
            if (N.computed) w(N.key, S, "Expression");
            w(N.value, S, "Pattern");
          } else if (N.type === "RestElement") w(N.argument, S, "Pattern");
        }
      }),
      (E.Expression = We),
      (E.ThisExpression = E.Super = E.MetaProperty = G),
      (E.ArrayExpression = function (s, S, w) {
        for (var P = 0, elements = s.elements; P < elements.length; P += 1) {
          var N = elements[P];
          if (N) w(N, S, "Expression");
        }
      }),
      (E.ObjectExpression = function (s, S, w) {
        for (var P = 0, properties = s.properties; P < properties.length; P += 1) {
          var N = properties[P];
          w(N, S);
        }
      }),
      (E.FunctionExpression = E.ArrowFunctionExpression = E.FunctionDeclaration),
      (E.SequenceExpression = function (s, S, w) {
        for (var P = 0, expressions = s.expressions; P < expressions.length; P += 1) {
          var N = expressions[P];
          w(N, S, "Expression");
        }
      }),
      (E.TemplateLiteral = function (s, S, w) {
        for (var P = 0, quasis = s.quasis; P < quasis.length; P += 1) {
          var N = quasis[P];
          w(N, S);
        }
        for (var se = 0, expressions = s.expressions; se < expressions.length; se += 1) {
          var ue = expressions[se];
          w(ue, S, "Expression");
        }
      }),
      (E.TemplateElement = G),
      (E.UnaryExpression = E.UpdateExpression =
        function (s, S, w) {
          w(s.argument, S, "Expression");
        }),
      (E.BinaryExpression = E.LogicalExpression =
        function (s, S, w) {
          (w(s.left, S, "Expression"), w(s.right, S, "Expression"));
        }),
      (E.AssignmentExpression = E.AssignmentPattern =
        function (s, S, w) {
          (w(s.left, S, "Pattern"), w(s.right, S, "Expression"));
        }),
      (E.ConditionalExpression = function (s, S, w) {
        (w(s.test, S, "Expression"), w(s.consequent, S, "Expression"), w(s.alternate, S, "Expression"));
      }),
      (E.NewExpression = E.CallExpression =
        function (s, S, w) {
          if ((w(s.callee, S, "Expression"), s.arguments))
            for (var P = 0, V = s.arguments; P < V.length; P += 1) {
              var N = V[P];
              w(N, S, "Expression");
            }
        }),
      (E.MemberExpression = function (s, S, w) {
        if ((w(s.object, S, "Expression"), s.computed)) w(s.property, S, "Expression");
      }),
      (E.ExportNamedDeclaration = E.ExportDefaultDeclaration =
        function (s, S, w) {
          if (s.declaration)
            w(
              s.declaration,
              S,
              s.type === "ExportNamedDeclaration" || s.declaration.id ? "Statement" : "Expression",
            );
          if (s.source) w(s.source, S, "Expression");
          if (s.attributes)
            for (var P = 0, attributes = s.attributes; P < attributes.length; P += 1) {
              var N = attributes[P];
              w(N, S);
            }
        }),
      (E.ExportAllDeclaration = function (s, S, w) {
        if (s.exported) w(s.exported, S);
        if ((w(s.source, S, "Expression"), s.attributes))
          for (var P = 0, attributes = s.attributes; P < attributes.length; P += 1) {
            var N = attributes[P];
            w(N, S);
          }
      }),
      (E.ImportAttribute = function (s, S, w) {
        w(s.value, S, "Expression");
      }),
      (E.ImportDeclaration = function (s, S, w) {
        for (var P = 0, specifiers = s.specifiers; P < specifiers.length; P += 1) {
          var N = specifiers[P];
          w(N, S);
        }
        if ((w(s.source, S, "Expression"), s.attributes))
          for (var se = 0, attributes = s.attributes; se < attributes.length; se += 1) {
            var ue = attributes[se];
            w(ue, S);
          }
      }),
      (E.ImportExpression = function (s, S, w) {
        if ((w(s.source, S, "Expression"), s.options)) w(s.options, S, "Expression");
      }),
      (E.ImportSpecifier =
        E.ImportDefaultSpecifier =
        E.ImportNamespaceSpecifier =
        E.Identifier =
        E.PrivateIdentifier =
        E.Literal =
          G),
      (E.TaggedTemplateExpression = function (s, S, w) {
        (w(s.tag, S, "Expression"), w(s.quasi, S, "Expression"));
      }),
      (E.ClassDeclaration = E.ClassExpression =
        function (s, S, w) {
          return w(s, S, "Class");
        }),
      (E.Class = function (s, S, w) {
        if (s.id) w(s.id, S, "Pattern");
        if (s.superClass) w(s.superClass, S, "Expression");
        w(s.body, S);
      }),
      (E.ClassBody = function (s, S, w) {
        for (var P = 0, body = s.body; P < body.length; P += 1) {
          var N = body[P];
          w(N, S);
        }
      }),
      (E.MethodDefinition =
        E.PropertyDefinition =
        E.Property =
          function (s, S, w) {
            if (s.computed) w(s.key, S, "Expression");
            if (s.value) w(s.value, S, "Expression");
          }),
      (e.ancestor = r),
      (e.base = E),
      (e.findNodeAfter = ke),
      (e.findNodeAround = he),
      (e.findNodeAt = j),
      (e.findNodeBefore = te),
      (e.full = A),
      (e.fullAncestor = L),
      (e.make = me),
      (e.recursive = h),
      (e.simple = n));
  });
});

export { Ro };
