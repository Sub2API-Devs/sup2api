/**
 * acorn-walk/dist/walk.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: acorn-walk@8.3.5
 * pieces: chunk-dvek96j5.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../runtime/bun-runtime.js";

//@ chunk-dvek96j5.js:366-8300 cjs-fingerprint
var require_walk = __commonJS(function (cjsExports, cjsModule) {
  (function (root, factory) {
    if (typeof cjsExports === "object" && typeof cjsModule !== "undefined") factory(cjsExports);
    else if (typeof define === "function" && define.amd) define(["exports"], factory);
    else {
      root = typeof globalThis !== "undefined" ? globalThis : root || self;
      factory(((root.acorn = root.acorn || {}), (root.acorn.walk = {})));
    }
  })(cjsExports, function (walkExports) {
    function simple(node, visitors, baseVisitor, state, override) {
      if (!baseVisitor) baseVisitor = base;
      (function c_2(node, st, override) {
        var type = override || node.type;
        visitNode(baseVisitor, type, node, st, c_2);
        if (visitors[type]) visitors[type](node, st);
      })(node, state, override);
    }
    function ancestor(node, visitors, baseVisitor, state, override) {
      var ancestors = [];
      if (!baseVisitor) baseVisitor = base;
      (function c_2(node, st, override) {
        var type = override || node.type;
        var isNew = node !== ancestors[ancestors.length - 1];
        if (isNew) ancestors.push(node);
        visitNode(baseVisitor, type, node, st, c_2);
        if (visitors[type]) visitors[type](node, st || ancestors, ancestors);
        if (isNew) ancestors.pop();
      })(node, state, override);
    }
    function recursive(node, state, funcs, baseVisitor, override) {
      var visitor = funcs ? make(funcs, baseVisitor || undefined) : baseVisitor;
      (function c_2(node, st, override) {
        visitor[override || node.type](node, st, c_2);
      })(node, state, override);
    }
    function makeTest(test) {
      if (typeof test === "string")
        return function (type) {
          return type === test;
        };
      else if (!test)
        return function () {
          return true;
        };
      else return test;
    }
    var Found = function (node, state) {
      this.node = node;
      this.state = state;
    };
    function full(node, callback, baseVisitor, state, override) {
      if (!baseVisitor) baseVisitor = base;
      var last;
      (function c_2(node, st, override) {
        var type = override || node.type;
        visitNode(baseVisitor, type, node, st, c_2);
        if (last !== node) {
          callback(node, st, type);
          last = node;
        }
      })(node, state, override);
    }
    function fullAncestor(node, callback, baseVisitor, state) {
      if (!baseVisitor) baseVisitor = base;
      var ancestors = [];
      var last;
      (function c_2(node, st, override) {
        var type = override || node.type;
        var isNew = node !== ancestors[ancestors.length - 1];
        if (isNew) ancestors.push(node);
        visitNode(baseVisitor, type, node, st, c_2);
        if (last !== node) {
          callback(node, st || ancestors, ancestors, type);
          last = node;
        }
        if (isNew) ancestors.pop();
      })(node, state);
    }
    function findNodeAt(node, start, end, test, baseVisitor, state) {
      if (!baseVisitor) baseVisitor = base;
      test = makeTest(test);
      try {
        (function c_2(node, st, override) {
          var type = override || node.type;
          if ((start == null || node.start <= start) && (end == null || node.end >= end))
            visitNode(baseVisitor, type, node, st, c_2);
          if (
            (start == null || node.start === start) &&
            (end == null || node.end === end) &&
            test(type, node)
          )
            throw new Found(node, st);
        })(node, state);
      } catch (e) {
        if (e instanceof Found) return e;
        throw e;
      }
    }
    function findNodeAround(node, pos, test, baseVisitor, state) {
      test = makeTest(test);
      if (!baseVisitor) baseVisitor = base;
      try {
        (function c_2(node, st, override) {
          var type = override || node.type;
          if (node.start > pos || node.end < pos) return;
          visitNode(baseVisitor, type, node, st, c_2);
          if (test(type, node)) throw new Found(node, st);
        })(node, state);
      } catch (e) {
        if (e instanceof Found) return e;
        throw e;
      }
    }
    function findNodeAfter(node, pos, test, baseVisitor, state) {
      test = makeTest(test);
      if (!baseVisitor) baseVisitor = base;
      try {
        (function c_2(node, st, override) {
          if (node.end < pos) return;
          var type = override || node.type;
          if (node.start >= pos && test(type, node)) throw new Found(node, st);
          visitNode(baseVisitor, type, node, st, c_2);
        })(node, state);
      } catch (e) {
        if (e instanceof Found) return e;
        throw e;
      }
    }
    function findNodeBefore(node, pos, test, baseVisitor, state) {
      test = makeTest(test);
      if (!baseVisitor) baseVisitor = base;
      var max;
      (function c_2(node, st, override) {
        if (node.start > pos) return;
        var type = override || node.type;
        if (node.end <= pos && (!max || max.node.end < node.end) && test(type, node))
          max = new Found(node, st);
        visitNode(baseVisitor, type, node, st, c_2);
      })(node, state);
      return max;
    }
    function make(funcs, baseVisitor) {
      var visitor = Object.create(baseVisitor || base);
      for (var type in funcs) visitor[type] = funcs[type];
      return visitor;
    }
    function skipThrough(node, st, c) {
      c(node, st);
    }
    function ignore(_node, _st, _c) {}
    function visitNode(baseVisitor, type, node, st, c) {
      if (baseVisitor[type] == null) throw Error("No walker function defined for node type " + type);
      baseVisitor[type](node, st, c);
    }
    var base = {};
    base.Program =
      base.BlockStatement =
      base.StaticBlock =
        function (node, st, c) {
          for (var i = 0, list = node.body; i < list.length; i += 1) {
            var stmt = list[i];
            c(stmt, st, "Statement");
          }
        };
    base.Statement = skipThrough;
    base.EmptyStatement = ignore;
    base.ExpressionStatement =
      base.ParenthesizedExpression =
      base.ChainExpression =
        function (node, st, c) {
          return c(node.expression, st, "Expression");
        };
    base.IfStatement = function (node, st, c) {
      c(node.test, st, "Expression");
      c(node.consequent, st, "Statement");
      if (node.alternate) c(node.alternate, st, "Statement");
    };
    base.LabeledStatement = function (node, st, c) {
      return c(node.body, st, "Statement");
    };
    base.BreakStatement = base.ContinueStatement = ignore;
    base.WithStatement = function (node, st, c) {
      c(node.object, st, "Expression");
      c(node.body, st, "Statement");
    };
    base.SwitchStatement = function (node, st, c) {
      c(node.discriminant, st, "Expression");
      for (var i = 0, list = node.cases; i < list.length; i += 1) {
        var cs = list[i];
        c(cs, st);
      }
    };
    base.SwitchCase = function (node, st, c) {
      if (node.test) c(node.test, st, "Expression");
      for (var i = 0, list = node.consequent; i < list.length; i += 1) {
        var cons = list[i];
        c(cons, st, "Statement");
      }
    };
    base.ReturnStatement =
      base.YieldExpression =
      base.AwaitExpression =
        function (node, st, c) {
          if (node.argument) c(node.argument, st, "Expression");
        };
    base.ThrowStatement = base.SpreadElement = function (node, st, c) {
      return c(node.argument, st, "Expression");
    };
    base.TryStatement = function (node, st, c) {
      c(node.block, st, "Statement");
      if (node.handler) c(node.handler, st);
      if (node.finalizer) c(node.finalizer, st, "Statement");
    };
    base.CatchClause = function (node, st, c) {
      if (node.param) c(node.param, st, "Pattern");
      c(node.body, st, "Statement");
    };
    base.WhileStatement = base.DoWhileStatement = function (node, st, c) {
      c(node.test, st, "Expression");
      c(node.body, st, "Statement");
    };
    base.ForStatement = function (node, st, c) {
      if (node.init) c(node.init, st, "ForInit");
      if (node.test) c(node.test, st, "Expression");
      if (node.update) c(node.update, st, "Expression");
      c(node.body, st, "Statement");
    };
    base.ForInStatement = base.ForOfStatement = function (node, st, c) {
      c(node.left, st, "ForInit");
      c(node.right, st, "Expression");
      c(node.body, st, "Statement");
    };
    base.ForInit = function (node, st, c) {
      if (node.type === "VariableDeclaration") c(node, st);
      else c(node, st, "Expression");
    };
    base.DebuggerStatement = ignore;
    base.FunctionDeclaration = function (node, st, c) {
      return c(node, st, "Function");
    };
    base.VariableDeclaration = function (node, st, c) {
      for (var i = 0, list = node.declarations; i < list.length; i += 1) {
        var decl = list[i];
        c(decl, st);
      }
    };
    base.VariableDeclarator = function (node, st, c) {
      c(node.id, st, "Pattern");
      if (node.init) c(node.init, st, "Expression");
    };
    base.Function = function (node, st, c) {
      if (node.id) c(node.id, st, "Pattern");
      for (var i = 0, list = node.params; i < list.length; i += 1) {
        var param = list[i];
        c(param, st, "Pattern");
      }
      c(node.body, st, node.expression ? "Expression" : "Statement");
    };
    base.Pattern = function (node, st, c) {
      if (node.type === "Identifier") c(node, st, "VariablePattern");
      else if (node.type === "MemberExpression") c(node, st, "MemberPattern");
      else c(node, st);
    };
    base.VariablePattern = ignore;
    base.MemberPattern = skipThrough;
    base.RestElement = function (node, st, c) {
      return c(node.argument, st, "Pattern");
    };
    base.ArrayPattern = function (node, st, c) {
      for (var i = 0, list = node.elements; i < list.length; i += 1) {
        var elt = list[i];
        if (elt) c(elt, st, "Pattern");
      }
    };
    base.ObjectPattern = function (node, st, c) {
      for (var i = 0, list = node.properties; i < list.length; i += 1) {
        var prop = list[i];
        if (prop.type === "Property") {
          if (prop.computed) c(prop.key, st, "Expression");
          c(prop.value, st, "Pattern");
        } else if (prop.type === "RestElement") c(prop.argument, st, "Pattern");
      }
    };
    base.Expression = skipThrough;
    base.ThisExpression = base.Super = base.MetaProperty = ignore;
    base.ArrayExpression = function (node, st, c) {
      for (var i = 0, list = node.elements; i < list.length; i += 1) {
        var elt = list[i];
        if (elt) c(elt, st, "Expression");
      }
    };
    base.ObjectExpression = function (node, st, c) {
      for (var i = 0, list = node.properties; i < list.length; i += 1) {
        var prop = list[i];
        c(prop, st);
      }
    };
    base.FunctionExpression = base.ArrowFunctionExpression = base.FunctionDeclaration;
    base.SequenceExpression = function (node, st, c) {
      for (var i = 0, list = node.expressions; i < list.length; i += 1) {
        var expr = list[i];
        c(expr, st, "Expression");
      }
    };
    base.TemplateLiteral = function (node, st, c_2) {
      for (var i = 0, list = node.quasis; i < list.length; i += 1) {
        var quasi = list[i];
        c_2(quasi, st);
      }
      for (var i$1 = 0, list$1 = node.expressions; i$1 < list$1.length; i$1 += 1) {
        var expr = list$1[i$1];
        c_2(expr, st, "Expression");
      }
    };
    base.TemplateElement = ignore;
    base.UnaryExpression = base.UpdateExpression = function (node, st, c) {
      c(node.argument, st, "Expression");
    };
    base.BinaryExpression = base.LogicalExpression = function (node, st, c) {
      c(node.left, st, "Expression");
      c(node.right, st, "Expression");
    };
    base.AssignmentExpression = base.AssignmentPattern = function (node, st, c) {
      c(node.left, st, "Pattern");
      c(node.right, st, "Expression");
    };
    base.ConditionalExpression = function (node, st, c) {
      c(node.test, st, "Expression");
      c(node.consequent, st, "Expression");
      c(node.alternate, st, "Expression");
    };
    base.NewExpression = base.CallExpression = function (node, st, c) {
      c(node.callee, st, "Expression");
      if (node.arguments)
        for (var i = 0, list = node.arguments; i < list.length; i += 1) {
          var arg = list[i];
          c(arg, st, "Expression");
        }
    };
    base.MemberExpression = function (node, st, c) {
      c(node.object, st, "Expression");
      if (node.computed) c(node.property, st, "Expression");
    };
    base.ExportNamedDeclaration = base.ExportDefaultDeclaration = function (node, st, c) {
      if (node.declaration)
        c(
          node.declaration,
          st,
          node.type === "ExportNamedDeclaration" || node.declaration.id ? "Statement" : "Expression",
        );
      if (node.source) c(node.source, st, "Expression");
      if (node.attributes)
        for (var i = 0, list = node.attributes; i < list.length; i += 1) {
          var attr = list[i];
          c(attr, st);
        }
    };
    base.ExportAllDeclaration = function (node, st, c) {
      if (node.exported) c(node.exported, st);
      c(node.source, st, "Expression");
      if (node.attributes)
        for (var i = 0, list = node.attributes; i < list.length; i += 1) {
          var attr = list[i];
          c(attr, st);
        }
    };
    base.ImportAttribute = function (node, st, c) {
      c(node.value, st, "Expression");
    };
    base.ImportDeclaration = function (node, st, c_2) {
      for (var i = 0, list = node.specifiers; i < list.length; i += 1) {
        var spec = list[i];
        c_2(spec, st);
      }
      c_2(node.source, st, "Expression");
      if (node.attributes)
        for (var i$1 = 0, list$1 = node.attributes; i$1 < list$1.length; i$1 += 1) {
          var attr = list$1[i$1];
          c_2(attr, st);
        }
    };
    base.ImportExpression = function (node, st, c) {
      c(node.source, st, "Expression");
      if (node.options) c(node.options, st, "Expression");
    };
    base.ImportSpecifier =
      base.ImportDefaultSpecifier =
      base.ImportNamespaceSpecifier =
      base.Identifier =
      base.PrivateIdentifier =
      base.Literal =
        ignore;
    base.TaggedTemplateExpression = function (node, st, c) {
      c(node.tag, st, "Expression");
      c(node.quasi, st, "Expression");
    };
    base.ClassDeclaration = base.ClassExpression = function (node, st, c) {
      return c(node, st, "Class");
    };
    base.Class = function (node, st, c) {
      if (node.id) c(node.id, st, "Pattern");
      if (node.superClass) c(node.superClass, st, "Expression");
      c(node.body, st);
    };
    base.ClassBody = function (node, st, c) {
      for (var i = 0, list = node.body; i < list.length; i += 1) {
        var elt = list[i];
        c(elt, st);
      }
    };
    base.MethodDefinition =
      base.PropertyDefinition =
      base.Property =
        function (node, st, c) {
          if (node.computed) c(node.key, st, "Expression");
          if (node.value) c(node.value, st, "Expression");
        };
    walkExports.ancestor = ancestor;
    walkExports.base = base;
    walkExports.findNodeAfter = findNodeAfter;
    walkExports.findNodeAround = findNodeAround;
    walkExports.findNodeAt = findNodeAt;
    walkExports.findNodeBefore = findNodeBefore;
    walkExports.full = full;
    walkExports.fullAncestor = fullAncestor;
    walkExports.make = make;
    walkExports.recursive = recursive;
    walkExports.simple = simple;
  });
});
export { require_walk };
