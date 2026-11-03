/**
 * plugins/functionHooks/moduleScan.ts
 *
 * 2.1.316 新增：构建 hooks 模块的导入图（大小上限、禁止顶层 await）；扫描单个 hooks 文件（嵌套深度上限、拒绝信息带摘录）等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-bfnfj4kx.js (88)
 * attribution: placement 88
 */
import { relative } from "path";
import { createHash } from "crypto";
import {
  isSameModuleId,
  isJsSource,
  MAX_IMPORT_DEPTH,
  acornParser,
  parseModuleError,
  MAX_PLUGIN_NAME_CHARS,
  MAX_MODULE_BYTES,
  oversizedModuleError,
  transpileModule,
  CLAUDE_CODE,
  isDotRelativePath,
  bareImportError,
  MAX_MODULE_TOTAL_BYTES,
  totalOversizedError,
  builtinSourceRegistry,
  loadModuleWithChecks,
  hooksImportResolver,
} from "./moduleLoader.js";
import { HooksError } from "./hooksErrors.js";
import { io } from "../../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import { rt } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { uniq } from "../../utils/collections.js";
import { truncateToLength } from "../../utils/stringUtils.js";
import { yieldToEventLoop } from "../../native-ts/file-index/index.js";

//@ chunk-bfnfj4kx.js:13278-13806 placement
/**
 * AST 节点类型 → 是否声明某标识符的判定表。
 */
var DECLARES_IDENTIFIER = {
  VariableDeclarator: (e, o) => e.id === o,
  FunctionDeclaration: isSameModuleId,
  FunctionExpression: isSameModuleId,
  ArrowFunctionExpression: (e, o) => e.params.includes(o),
  ClassDeclaration: (e, o) => e.id === o,
  ClassExpression: (e, o) => e.id === o,
  CatchClause: (e, o) => e.param === o,
  AssignmentPattern: (e, o) => e.left === o,
  RestElement: (e, o) => e.argument === o,
  ArrayPattern: (e, o) => e.elements.includes(o),
  Property: (e, o, t) => e.value === o && t?.type === "ObjectPattern",
  ImportSpecifier: (e, o) => e.local === o,
  ImportDefaultSpecifier: (e, o) => e.local === o,
  ImportNamespaceSpecifier: (e, o) => e.local === o,
};
//@ chunk-bfnfj4kx.js:13806-13829 placement
/**
 * 节点是否声明标识符
 */
var declaresIdentifier = (e) => DECLARES_IDENTIFIER[e.type];
//@ chunk-bfnfj4kx.js:13829-13952 placement
var isPropertyKey = (e, o) =>
  (o?.type === "Property" || o?.type === "PropertyDefinition" || o?.type === "MethodDefinition") &&
  o.key === e &&
  !o.computed;
//@ chunk-bfnfj4kx.js:13952-14020 placement
/**
 * 像 AST 节点
 */
var isAstNode = (e) => typeof e === "object" && e !== null && typeof e.type === "string";
//@ chunk-bfnfj4kx.js:14020-14135 placement
function memoizeByObject(collectTopConsts) {
  let weakMap = new WeakMap();
  return (t) => {
    let r = weakMap.get(t);
    if (r !== undefined) return r;
    let n = collectTopConsts(t);
    weakMap.set(t, n);
    return n;
  };
}
//@ chunk-bfnfj4kx.js:14135-14620 placement
/**
 * 迭代式遍历 AST（附父、祖父节点），可剪枝。
 */
function walkAst(node, o, t) {
  let r = [
    {
      node,
      parent: undefined,
      grandparent: undefined,
    },
  ];
  for (let n = r.pop(); n !== undefined; n = r.pop()) {
    o(n);
    if (t?.(n.node)) continue;
    let keys = Object.keys(n.node);
    for (let p = keys.length - 1; p >= 0; p -= 1) {
      let i = keys[p];
      if (i === undefined || i === "loc" || i === "type" || i === "start" || i === "end") continue;
      let f = n.node[i];
      if (Array.isArray(f))
        for (let u = f.length - 1; u >= 0; u -= 1) {
          let x = f[u];
          if (isAstNode(x))
            r.push({
              node: x,
              parent: n.node,
              grandparent: n.parent,
            });
        }
      else if (isAstNode(f))
        r.push({
          node: f,
          parent: n.node,
          grandparent: n.parent,
        });
    }
  }
}
//@ chunk-bfnfj4kx.js:14620-14712 placement
/**
 * 建立父节点表
 */
function buildParentMap(e) {
  let o = new Map();
  walkAst(e, ({ node, parent }) => {
    if (parent !== undefined) o.set(node, parent);
  });
  return o;
}
//@ chunk-bfnfj4kx.js:14712-14994 placement
/**
 * hooks 模块不允许 import()：找到最早的动态导入并生成扫描拒绝。
 */
function refuseDynamicImport(e) {
  let o;
  walkAst(e.program, ({ node }) => {
    if (node.type === "ImportExpression" && (o === undefined || node.start < o.start)) o = node;
  });
  if (o === undefined) return;
  return e.refuse(
    o,
    'a dynamic import(); a hooks module imports its own files with an import declaration, as in import { name } from "./file.js"',
  );
}
//@ chunk-bfnfj4kx.js:14994-15355 placement
/**
 * 收集模块的导入映射。
 */
function collectImports(e) {
  let o = new Map();
  for (let t of e.body) {
    if (t.type !== "ImportDeclaration") continue;
    let specifier = String(t.source.value);
    for (let specifier_2 of t.specifiers) {
      let s;
      if (specifier_2.type === "ImportSpecifier") {
        let imported = specifier_2.imported;
        s = imported.type === "Identifier" ? imported.name : String(imported.value);
      } else s = specifier_2.type === "ImportDefaultSpecifier" ? "default" : undefined;
      o.set(specifier_2.local.name, {
        specifier,
        imported: s,
      });
    }
  }
  return o;
}
//@ chunk-bfnfj4kx.js:15355-15592 placement
function importSpecifiers(e) {
  let o = new Set();
  for (let t of e.body) {
    let r = t.type === "ImportDeclaration" || t.type === "ExportAllDeclaration";
    let n = t.type === "ExportNamedDeclaration";
    let s = r ? t.source : n ? (t.source ?? null) : null;
    if (s !== null) o.add(String(s.value));
  }
  return [...o];
}
//@ chunk-bfnfj4kx.js:15592-15604 placement
/**
 * 2000
 */
var MAX_EXCERPT_CHARS = 2000;
//@ chunk-bfnfj4kx.js:15604-16033 placement
/**
 * hooks 模块静态扫描拒绝错误（插件、文件、行、摘录、原因）。
 */
class ScanRefusal extends HooksError {
  name = "ScanRefusal";
  plugin;
  file;
  line;
  excerpt;
  construct;
  constructor({ plugin, file, line, excerpt, construct }) {
    super(
      `${plugin}: ${file}${line === undefined ? "" : excerpt === undefined ? `:${line}` : `, compiled line ${line} \`${excerpt}\``}: ${construct}; $ is always spelled $.noun.event(...) at the call site, on is always on("<event>", hook), and next.to always next.to(e, "<tier>")`,
    );
    this.plugin = plugin;
    this.file = file;
    this.line = line;
    this.excerpt = excerpt;
    this.construct = construct;
  }
}
//@ chunk-bfnfj4kx.js:16033-16329 placement
function passesValueThrough(e, o) {
  switch (e.type) {
    case "SequenceExpression":
    case "ChainExpression":
    case "ParenthesizedExpression":
    case "AwaitExpression":
      return true;
    case "LogicalExpression":
      return e.right === o;
    case "ConditionalExpression":
      return e.test !== o;
    case "UnaryExpression":
      return e.operator === "void";
    default:
      return false;
  }
}
//@ chunk-bfnfj4kx.js:16329-16498 placement
/**
 * 取对象属性的静态键名（标识符或字面量），计算键返回 undefined。
 */
function propertyKeyName(property) {
  if (property.type !== "Property") return;
  let { key } = property;
  let t = !property.computed && key.type === "Identifier";
  let r = !property.computed && key.type === "Literal";
  return t ? key.name : r ? String(key.value) : undefined;
}
//@ chunk-bfnfj4kx.js:16498-16606 placement
var hasNonPlainProperties = (e) =>
  e.properties.some(
    (property) =>
      property.type === "Property" &&
      (property.kind !== "init" || (!property.shorthand && propertyKeyName(property) === "__proto__")),
  );
//@ chunk-bfnfj4kx.js:16606-16718 placement
var isFunctionNode = (e) =>
  e?.type === "FunctionDeclaration" ||
  e?.type === "FunctionExpression" ||
  e?.type === "ArrowFunctionExpression";
//@ chunk-bfnfj4kx.js:16718-16792 placement
/**
 * 函数或实例属性值
 */
var isFunctionOrPropertyValue = (e, o) =>
  isFunctionNode(e) || (e.type === "PropertyDefinition" && !e.static && e.value === o);
//@ chunk-bfnfj4kx.js:16792-16966 placement
function isContainerSlot(e, o, t) {
  switch (e.type) {
    case "ArrayExpression":
      return true;
    case "Property":
      return e.value === o;
    case "ObjectExpression":
      return o.type === "Property" && !t(e);
    default:
      return false;
  }
}
//@ chunk-bfnfj4kx.js:16966-17240 placement
function isBlockScopeNode(e) {
  switch (e.type) {
    case "Program":
    case "FunctionDeclaration":
    case "FunctionExpression":
    case "ArrowFunctionExpression":
    case "StaticBlock":
    case "BlockStatement":
    case "SwitchStatement":
    case "ForStatement":
    case "ForInStatement":
    case "ForOfStatement":
      return true;
    default:
      return false;
  }
}
//@ chunk-bfnfj4kx.js:17240-17393 placement
function isPatternNode(e) {
  switch (e.type) {
    case "Property":
    case "ObjectPattern":
    case "ArrayPattern":
    case "RestElement":
    case "AssignmentPattern":
      return true;
    default:
      return false;
  }
}
//@ chunk-bfnfj4kx.js:17393-17520 placement
function isVarScopeNode(e, o) {
  switch (e.type) {
    case "Program":
    case "StaticBlock":
      return true;
    case "BlockStatement":
      return isFunctionNode(o);
    default:
      return isFunctionNode(e);
  }
}
//@ chunk-bfnfj4kx.js:17520-17805 placement
function createAncestorFinder(e, o) {
  let t = new Map();
  return (r) => {
    let n = t.get(r);
    if (n !== undefined) return n ?? undefined;
    let s = r;
    let p = e(r);
    let i = p === undefined ? null : (o(p, s) ?? t.get(p));
    while (p !== undefined && i === undefined) {
      s = p;
      p = e(p);
      i = p === undefined ? null : (o(p, s) ?? t.get(p));
    }
    for (let a = r; a !== undefined && a !== p; a = e(a)) t.set(a, i ?? null);
    return i ?? undefined;
  };
}
//@ chunk-bfnfj4kx.js:17805-18150 placement
/**
 * 构造作用域查询函数组（父节点、所在函数、词法/var 作用域等）。
 */
function makeScopeClimbs(e) {
  let o = io(hasNonPlainProperties);
  return {
    parentOf: e,
    functionOf: createAncestorFinder(e, (t) => (isFunctionNode(t) ? t : undefined)),
    lexicalScopeOf: createAncestorFinder(e, (t) => (isBlockScopeNode(t) ? t : undefined)),
    varScopeOf: createAncestorFinder(e, (t) => (isVarScopeNode(t, e(t)) ? t : undefined)),
    declarerOf: createAncestorFinder(e, (t) => (isPatternNode(t) ? undefined : t)),
    deferrerOf: createAncestorFinder(e, (t, r) => (isFunctionOrPropertyValue(t, r) ? t : undefined)),
    endOf: createAncestorFinder(e, (t, r) =>
      passesValueThrough(t, r)
        ? undefined
        : {
            value: r,
            parent: t,
          },
    ),
    heldAt: createAncestorFinder(e, (t, r) =>
      isContainerSlot(t, r, o)
        ? undefined
        : {
            value: r,
            parent: t,
          },
    ),
  };
}
//@ chunk-bfnfj4kx.js:18150-18487 placement
/**
 * 节点是否开启作用域。
 */
function isScopeNode(e) {
  switch (e.type) {
    case "Program":
    case "FunctionDeclaration":
    case "FunctionExpression":
    case "ArrowFunctionExpression":
    case "ClassDeclaration":
    case "ClassExpression":
    case "StaticBlock":
    case "BlockStatement":
    case "CatchClause":
    case "SwitchStatement":
    case "ForStatement":
    case "ForInStatement":
    case "ForOfStatement":
      return true;
    default:
      return false;
  }
}
//@ chunk-bfnfj4kx.js:18487-18666 placement
function splitShadowedUses(e, o) {
  let mapped = e.map((use, at) => ({
    use,
    at,
  }));
  return {
    owned: Map.groupBy(mapped, (r) => o.writtenShadowOf(r.use)),
    doubted: mapped.filter((r) => o.writtenShadowOf(r.use) !== o.shadowOf(r.use)),
  };
}
//@ chunk-bfnfj4kx.js:18666-18768 placement
function statementList(e) {
  return e.type === "Program" || e.type === "BlockStatement" || e.type === "StaticBlock" ? e.body : [];
}
//@ chunk-bfnfj4kx.js:18768-19132 placement
/**
 * 收集顶层 const 声明。
 */
function collectTopConsts(e) {
  let o = new Map();
  for (let t of statementList(e)) {
    let r = t.type === "ExportNamedDeclaration";
    let n = r ? t.declaration : t;
    let s = n?.type === "VariableDeclaration" && n.kind === "var" && e.type === "Program" && !r;
    if (!(n?.type === "VariableDeclaration" && (n.kind === "const" || s))) continue;
    for (let { id, init } of n.declarations)
      if (id.type === "Identifier" && init)
        o.set(id.name, {
          id,
          init,
          isVar: s,
        });
  }
  return o;
}
//@ chunk-bfnfj4kx.js:19132-19214 placement
/**
 * 写入未被遮蔽
 */
var hasUnshadowedWrite = (e, names) =>
  names.writtenShadowOf(e) === undefined || names.writtenShadowOf(e) !== names.shadowOf(e);
//@ chunk-bfnfj4kx.js:19214-19261 placement
/**
 * 原因与位置
 */
var causeAt = (cause, o) =>
  o === undefined
    ? undefined
    : {
        at: o,
        cause,
      };
//@ chunk-bfnfj4kx.js:19261-19989 placement
/**
 * 扫描问题的说明文字表。
 */
var SCAN_PROBLEM_TEXT = Object.freeze({
  declared: "is declared here too, so the value it names cannot be listed. Declare it once",
  assigned:
    "is assigned here, so the value it names cannot be listed. Leave it unassigned, or write the reference at the call",
  doubted:
    "may be assigned here, where the engine can bind the name apart from the text, so the value it names cannot be listed. Rename one of the two",
  looped:
    "is spelled in a loop's head here, and the engine can write such a target past a nearer name of that spelling, so the value it names cannot be listed. Rename one of the two",
  early:
    "is read here as the file loads, above its declaration, where it is still undefined, so the value it names cannot be listed. Declare it above this read",
});
//@ chunk-bfnfj4kx.js:19989-20607 placement
/**
 * 求声明所在作用域。
 */
function declaringScopeOf(e, { parentOf, declarerOf, lexicalScopeOf, varScopeOf }) {
  let s = declarerOf(e);
  switch (s?.type) {
    case "VariableDeclarator": {
      let p = parentOf(s);
      return (
        (p?.type === "VariableDeclaration" && p.kind !== "var" ? lexicalScopeOf(s) : varScopeOf(s)) ??
        "unplaced"
      );
    }
    case "FunctionDeclaration":
    case "ClassDeclaration":
      return s.id === e ? (lexicalScopeOf(s) ?? "unplaced") : s;
    case "FunctionExpression":
    case "ArrowFunctionExpression":
    case "ClassExpression":
    case "CatchClause":
      return s;
    case "ImportSpecifier":
    case "ImportDefaultSpecifier":
    case "ImportNamespaceSpecifier":
      return varScopeOf(s) ?? "unplaced";
    case "AssignmentExpression":
    case "ForInStatement":
    case "ForOfStatement":
      return "nothing";
    default:
      return "unplaced";
  }
}
//@ chunk-bfnfj4kx.js:20607-21059 placement
/**
 * 检查名字只在顶层声明一次且未被赋值。
 */
function checkSingleTopDeclaration(e, { names, climbs }) {
  let { name: r } = e;
  let filtered = (names.declared.get(r) ?? []).filter((p) => {
    let i = declaringScopeOf(p, climbs);
    return typeof i !== "string" && i.type === "Program";
  });
  let filtered_2 = (names.assignedAt.get(r) ?? []).filter((p) => hasUnshadowedWrite(p, names));
  return (
    causeAt("declared", filtered.includes(e) ? filtered[1] : e) ??
    causeAt(
      "assigned",
      filtered_2.find((p) => names.writtenShadowOf(p) === undefined),
    ) ??
    causeAt("doubted", filtered_2[0]) ??
    causeAt("looped", names.loopAssigned.get(r)?.[0]) ??
    causeAt(
      "early",
      names.read
        .get(r)
        ?.find(
          (p) => p.start < e.start && climbs.deferrerOf(p) === undefined && hasUnshadowedWrite(p, names),
        ),
    )
  );
}
//@ chunk-bfnfj4kx.js:21059-21349 placement
function patternIdentifiers(e) {
  switch (e?.type) {
    case "Identifier":
      return [e];
    case "ArrayPattern":
      return e.elements.flatMap(patternIdentifiers);
    case "ObjectPattern":
      return e.properties.flatMap((property) =>
        patternIdentifiers(property.type === "Property" ? property.value : property),
      );
    case "AssignmentPattern":
      return patternIdentifiers(e.left);
    case "RestElement":
      return patternIdentifiers(e.argument);
    default:
      return [];
  }
}
//@ chunk-bfnfj4kx.js:21349-21708 placement
/**
 * 收集被赋值/更新的名字。
 */
function collectAssignedNames(e) {
  let o = [];
  let t = [];
  walkAst(e, ({ node }) => {
    switch (node.type) {
      case "AssignmentExpression":
        o.push(...patternIdentifiers(node.left));
        break;
      case "UpdateExpression":
        o.push(...patternIdentifiers(node.argument));
        break;
      case "ForInStatement":
      case "ForOfStatement":
        o.push(...patternIdentifiers(node.left));
        t.push(...patternIdentifiers(node.left));
        break;
      default:
        break;
    }
  });
  return {
    byName: Map.groupBy(o, (r) => r.name),
    inLoopHeads: Map.groupBy(t, (r) => r.name),
  };
}
//@ chunk-bfnfj4kx.js:21708-21757 placement
/**
 * 是否在该处声明
 */
var declaresIn = (node, parent, grandparent) =>
  parent !== undefined && (declaresIdentifier(parent)?.(parent, node, grandparent) ?? false);
//@ chunk-bfnfj4kx.js:21757-21893 placement
/**
 * 在 AST 中找出声明为名字 o 的标识符节点。
 */
function findDeclaredIdentifiers(e, o) {
  let t = [];
  walkAst(e, ({ node, parent, grandparent }) => {
    if (node.type === "Identifier" && node.name === o && declaresIn(node, parent, grandparent)) t.push(node);
  });
  return t;
}
//@ chunk-bfnfj4kx.js:21893-21995 placement
/**
 * 导出说明符的名字文本（标识符名或字符串字面量）。
 */
function exportNameText(e) {
  let o = e.type === "Identifier";
  let t = e.type === "Literal";
  return o ? e.name : t ? String(e.value) : "";
}
//@ chunk-bfnfj4kx.js:21995-22404 placement
/**
 * 标识符是否为引用（非属性名、标签等）。
 */
var isReferenceIdentifier = (node, parent, grandparent) =>
  !declaresIn(node, parent, grandparent) &&
  !(parent?.type === "MemberExpression" && parent.property === node && !parent.computed) &&
  !isPropertyKey(node, parent) &&
  parent?.type !== "LabeledStatement" &&
  parent?.type !== "BreakStatement" &&
  parent?.type !== "ContinueStatement" &&
  parent?.type !== "ExportSpecifier" &&
  parent?.type !== "ImportSpecifier" &&
  parent?.type !== "ImportDefaultSpecifier" &&
  parent?.type !== "ImportNamespaceSpecifier" &&
  parent?.type !== "MetaProperty" &&
  parent?.type !== "ExportAllDeclaration" &&
  parent?.type !== "ImportAttribute";
//@ chunk-bfnfj4kx.js:22404-22897 placement
/**
 * 收集顶层函数与 const 绑定。
 */
function collectFunctionsAndConsts(e) {
  let o = new Map();
  function t(r) {
    let n = r.type === "VariableDeclaration" && r.kind === "const";
    if (r.type === "FunctionDeclaration" && r.id !== null) o.set(r.id.name, r);
    else if (n)
      for (let declaration of r.declarations) {
        let { id, init } = declaration;
        if (
          id.type === "Identifier" &&
          (init?.type === "FunctionExpression" || init?.type === "ArrowFunctionExpression")
        )
          o.set(id.name, init);
      }
  }
  for (let r of e.body) {
    t(r);
    if (r.type === "ExportNamedDeclaration" || r.type === "ExportDefaultDeclaration") {
      let declaration = r.declaration;
      if (declaration !== null && declaration !== undefined) t(declaration);
    }
  }
  return o;
}
//@ chunk-bfnfj4kx.js:22897-23129 placement
/**
 * 遍历 AST，把标识符按名字分为声明与读取两组。
 */
function collectIdentifierUses(e) {
  let o = [];
  let t = [];
  walkAst(e, ({ node, parent, grandparent }) => {
    if (node.type !== "Identifier") return;
    if (declaresIn(node, parent, grandparent)) o.push(node);
    else if (isReferenceIdentifier(node, parent, grandparent)) t.push(node);
  });
  return {
    declared: Map.groupBy(o, (r) => r.name),
    read: Map.groupBy(t, (r) => r.name),
  };
}
//@ chunk-bfnfj4kx.js:23129-23531 placement
/**
 * 把区间排序成嵌套结构。
 */
function nestSpans(e) {
  let o = [];
  let t = [];
  let r = [];
  e.filter((n) => n.start < n.end)
    .flatMap((n) => [
      {
        place: n.start,
        span: n,
        isStart: true,
        rank: -n.end,
      },
      {
        place: n.end,
        span: n,
        isStart: false,
        rank: -n.start,
      },
    ])
    .toSorted((n, s) => n.place - s.place || Number(n.isStart) - Number(s.isStart) || n.rank - s.rank)
    .forEach((n) => {
      if (n.isStart) o.push(n.span);
      else o.splice(o.lastIndexOf(n.span), 1);
      t.push(n.place);
      r.push(o.at(-1)?.declaration);
    });
  return (n) => r[rt(t, n) - 1];
}
//@ chunk-bfnfj4kx.js:23531-23583 placement
/**
 * 作用域标签
 */
var scopeLabel = (e) => (typeof e === "string" || isScopeNode(e) ? e : "unplaced");
//@ chunk-bfnfj4kx.js:23583-23942 placement
/**
 * 生成作用域的源码区间。
 */
function scopeSpans(e, parentOf, t) {
  return [...e].flatMap(([r, n]) => {
    if (typeof r === "string") return [];
    if (r.type === "SwitchStatement") {
      let { discriminant } = r;
      return [
        {
          start: r.start,
          end: discriminant.start,
          declaration: n,
        },
        {
          start: discriminant.end,
          end: r.end,
          declaration: n,
        },
      ];
    }
    let s = parentOf(r);
    let i =
      t === "engine" && r.type === "BlockStatement" && s !== undefined && isFunctionNode(s) && !e.has(s)
        ? s
        : r;
    return [
      {
        start: i.start,
        end: i.end,
        declaration: n,
      },
    ];
  });
}
//@ chunk-bfnfj4kx.js:23942-24421 placement
/**
 * 构造按位置解析遮蔽绑定的函数。
 */
function makeShadowResolver(declared, o, t) {
  let r = new Map();
  let n = new Map();
  let s = new Map();
  let { parentOf } = o;
  return (i) => {
    let a = s.get(i);
    if (a !== undefined) return a ?? undefined;
    let f =
      r.get(i.name) ??
      new Map(
        (declared.get(i.name) ?? [])
          .map((c) => [scopeLabel(declaringScopeOf(c, o)), c])
          .filter(([c]) => c !== "nothing" && (typeof c === "string" || c.type !== "Program")),
      );
    r.set(i.name, f);
    if (parentOf(i) === undefined) return i;
    if (f.size === 0) return;
    let u = f.get("unplaced");
    if (u !== undefined) return u;
    let x = n.get(i.name) ?? nestSpans(scopeSpans(f, parentOf, t));
    n.set(i.name, x);
    let y = x(i.start);
    s.set(i, y ?? null);
    return y;
  };
}
//@ chunk-bfnfj4kx.js:24421-24658 placement
function buildNameTables(e, scopeClimbs) {
  let { declared, read } = collectIdentifierUses(e);
  let assignedNames = collectAssignedNames(e);
  return {
    functions: collectFunctionsAndConsts(e),
    assigned: new Set(assignedNames.byName.keys()),
    assignedAt: assignedNames.byName,
    loopAssigned: assignedNames.inLoopHeads,
    declared,
    read,
    shadowOf: makeShadowResolver(declared, scopeClimbs, "engine"),
    writtenShadowOf: makeShadowResolver(declared, scopeClimbs, "written"),
  };
}
//@ chunk-bfnfj4kx.js:24658-24912 placement
/**
 * 在模块顶层的 export ... from 中找导出名为 o 的说明符及其来源。
 */
function findReExportSpecifier(e, o) {
  for (let t of e.scanned.program.body) {
    let r = t.type === "ExportNamedDeclaration";
    let source = r ? t.source : null;
    let s = r ? t.specifiers.find((specifier) => exportNameText(specifier.exported) === o) : undefined;
    if (source !== null && source !== undefined && s !== undefined)
      return {
        specifier: s,
        spelled: String(source.value),
      };
  }
  return;
}
//@ chunk-bfnfj4kx.js:24912-25150 placement
/**
 * 在 AST 中找出名字 o 的全部引用（"own" 模式不进入内层函数）。
 */
function findReferences(e, o, t = "all") {
  let r = [];
  walkAst(
    e,
    ({ node, parent, grandparent }) => {
      if (node.type === "Identifier" && node.name === o && isReferenceIdentifier(node, parent, grandparent))
        r.push(node);
    },
    t === "own"
      ? (s) => s !== e && (s.type === "FunctionExpression" || s.type === "FunctionDeclaration")
      : undefined,
  );
  return r;
}
//@ chunk-bfnfj4kx.js:25150-25224 placement
/**
 * 指定名字的标识符
 */
function isIdentifierOrBinding(id, o) {
  return id.type === "Identifier" ? id.name === o : findDeclaredIdentifiers(id, o).length > 0;
}
//@ chunk-bfnfj4kx.js:25224-25555 placement
/**
 * 取解构模式中的所有名字。
 */
function patternNames(e) {
  switch (e.type) {
    case "Identifier":
      return [e.name];
    case "ObjectPattern":
      return e.properties.flatMap((property) =>
        patternNames(property.type === "RestElement" ? property.argument : property.value),
      );
    case "ArrayPattern":
      return e.elements.flatMap((element) => (element === null ? [] : patternNames(element)));
    case "AssignmentPattern":
      return patternNames(e.left);
    case "RestElement":
      return patternNames(e.argument);
    default:
      return [];
  }
}
//@ chunk-bfnfj4kx.js:25555-25564 placement
/**
 * 4
 */
var MAX_DESTRUCTURE_NAMES = 4;
//@ chunk-bfnfj4kx.js:25564-25831 placement
function findTopConstInit(e, name) {
  for (let t of e.program.body) {
    let n = t.type === "ExportNamedDeclaration" ? t.declaration : t;
    if (!(n?.type === "VariableDeclaration" && n.kind === "const")) continue;
    for (let declaration of n.declarations)
      if (declaration.id.type === "Identifier" && declaration.id.name === name && declaration.init)
        return declaration.init;
  }
  return;
}
//@ chunk-bfnfj4kx.js:25831-25967 placement
/**
 * 变量/函数/类声明引入的名字列表。
 */
function declaredNames(declaration) {
  let o = declaration === null || declaration === undefined;
  return declaration?.type === "VariableDeclaration"
    ? declaration.declarations.flatMap((declaration) => patternNames(declaration.id))
    : o
      ? []
      : [declaration.id.name];
}
//@ chunk-bfnfj4kx.js:25967-26363 placement
/**
 * 语句是否声明了某名字。
 */
function declaresName(declaration, o) {
  switch (declaration.type) {
    case "VariableDeclaration":
      return declaration.declarations.some((declaration) => isIdentifierOrBinding(declaration.id, o));
    case "FunctionDeclaration":
    case "ClassDeclaration":
      return declaration.id?.name === o;
    case "ImportDeclaration":
      return declaration.specifiers.some((specifier) => specifier.local.name === o);
    case "ExportNamedDeclaration":
    case "ExportDefaultDeclaration":
      return (
        declaration.declaration !== null &&
        declaration.declaration !== undefined &&
        declaresName(declaration.declaration, o)
      );
    default:
      return false;
  }
}
//@ chunk-bfnfj4kx.js:26363-26443 placement
/**
 * 可直接展示的摘录
 */
var SAFE_EXCERPT_RE = /^(?!(?:true|false|null|undefined|NaN|Infinity)$)(?![-\d])[\w:@*!$#-]+$/;
//@ chunk-bfnfj4kx.js:26443-26453 placement
/**
 * 16
 */
var MAX_STATE_KEY_PARTS = 16;
//@ chunk-bfnfj4kx.js:26453-26464 placement
/**
 * 120
 */
var MAX_EXCERPT_LEN = 120;
//@ chunk-bfnfj4kx.js:26464-26736 placement
function quoteExcerpt(e) {
  let sliced = e.slice(0, MAX_EXCERPT_LEN);
  let t = e.length - sliced.length;
  let replaced = JSON.stringify(sliced)
    .replace(/[^\x20-\x7e]/g, (n) =>
      "\\u".concat(n.charCodeAt(0).toString(MAX_STATE_KEY_PARTS).padStart(MAX_DESTRUCTURE_NAMES, "0")),
    )
    .replace(/ {2,}/g, (n) => " ".concat(n.slice(1).replaceAll(" ", "\\u0020")));
  return t === 0 ? replaced : `${replaced}[+${t} chars]`;
}
//@ chunk-bfnfj4kx.js:26736-26790 placement
/**
 * 摘录或加引号
 */
function excerptOrQuoted(e) {
  return e.length <= MAX_EXCERPT_LEN && SAFE_EXCERPT_RE.test(e) ? e : quoteExcerpt(e);
}
//@ chunk-bfnfj4kx.js:26790-26800 placement
/**
 * "?"
 */
var UNKNOWN_PLACEHOLDER = "?";
//@ chunk-bfnfj4kx.js:26800-27102 placement
/**
 * 描述对象字面量的形状（用于状态键）。
 */
function describeObjectShape(e, o, t) {
  let mapped = e.properties.map((property) => propertyKeyName(property));
  let index = mapped.lastIndexOf(undefined);
  return e.properties
    .flatMap((property, p) => {
      let i = mapped[p];
      let a = property.type !== "Property";
      let f = i !== undefined && mapped.includes(i, p + 1);
      let u = i !== undefined && p < index;
      let x = i === undefined ? UNKNOWN_PLACEHOLDER : excerptOrQuoted(i);
      let y = `${x}=${UNKNOWN_PLACEHOLDER}`;
      let c = a ? `...${UNKNOWN_PLACEHOLDER}` : `${x}${literalOrObjectPath(property.value, o, t)}`;
      return f ? [] : [u ? y : c];
    })
    .join(", ");
}
//@ chunk-bfnfj4kx.js:27102-27479 placement
/**
 * 判断标识符是自由变量还是 const 绑定。
 */
function classifyBinding(e, o) {
  let t = e.shadowOf(o);
  if (t === undefined)
    return {
      kind: "free",
    };
  let r = e.parentOf(t);
  let n = r && e.parentOf(r);
  let s = n && e.parentOf(n);
  return r?.type === "VariableDeclarator" &&
    r.id === t &&
    n?.type === "VariableDeclaration" &&
    n.kind === "const" &&
    n.declarations.length === 1 &&
    s?.type === "ForOfStatement" &&
    s.left === n &&
    o.start >= s.body.start &&
    o.start < s.body.end
    ? {
        kind: "loop",
        loop: s,
      }
    : {
        kind: "shadowed",
      };
}
//@ chunk-bfnfj4kx.js:27479-27704 placement
function resolveLiteralConst(e, o) {
  let r = classifyBinding(e, o).kind === "free" ? findTopConstInit(e, o.name) : undefined;
  return (r?.type === "Literal" && r.regex === undefined && typeof r.value !== "bigint") ||
    (r?.type === "TemplateLiteral" && r.expressions.length === 0) ||
    r?.type === "Identifier"
    ? r
    : undefined;
}
//@ chunk-bfnfj4kx.js:27704-27903 placement
function resolveSealedConst(e, o) {
  let r = classifyBinding(e, o).kind === "free" ? findTopConstInit(e, o.name) : undefined;
  return (r?.type === "ObjectExpression" ||
    r?.type === "ArrayExpression" ||
    (r?.type === "Literal" && r.regex !== undefined)) &&
    e.isSealed(o.name)
    ? r
    : undefined;
}
//@ chunk-bfnfj4kx.js:27903-27934 placement
/**
 * 解析常量字面量
 */
var resolveConstValue = (e, o) => resolveLiteralConst(e, o) ?? resolveSealedConst(e, o);
//@ chunk-bfnfj4kx.js:27934-28164 placement
function followObjectConst(e, o, t) {
  let r = e;
  let n = t;
  while (r.type === "Identifier" && !n.has(r.name)) {
    let constValue = resolveConstValue(o, r);
    if (constValue === undefined) break;
    n = new Set([...n, r.name]);
    r = constValue;
  }
  let s = r.type === "ObjectExpression" ? r : undefined;
  return s !== undefined && !hasNonPlainProperties(s)
    ? {
        node: s,
        seen: n,
      }
    : undefined;
}
//@ chunk-bfnfj4kx.js:28164-28379 placement
function describeObjectPath(e, o) {
  let [t, ...r] = e.node.properties;
  let n = r.length === 0 && t?.type === "Property";
  let s = n ? propertyKeyName(t) : undefined;
  let p = n ? followObjectConst(t.value, o, e.seen) : undefined;
  return s !== undefined && p !== undefined
    ? `.${excerptOrQuoted(s)}${describeObjectPath(p, o)}`
    : ` has {${describeObjectShape(e.node, o, e.seen)}}`;
}
//@ chunk-bfnfj4kx.js:28379-28761 placement
/**
 * 把字面量数组转成文本。
 */
function literalArrayText(e) {
  let o = [];
  for (let element of e.elements) {
    if (element === null) return;
    if (element.type === "Literal") {
      let { value: s } = element;
      if (!(typeof s === "string" || typeof s === "number" || typeof s === "boolean")) return;
      o.push(typeof s === "string" ? excerptOrQuoted(s) : String(s));
      continue;
    }
    let cooked =
      element.type === "TemplateLiteral" && element.expressions.length === 0
        ? element.quasis[0]?.value.cooked
        : undefined;
    if (cooked === undefined || cooked === null) return;
    o.push(excerptOrQuoted(cooked));
  }
  return uniq(o);
}
//@ chunk-bfnfj4kx.js:28761-28919 placement
function loopArrayText(e, loop, name) {
  let { right } = loop;
  return right.type === "ArrayExpression" &&
    !e.program.body.some((s) => s.type === "ImportDeclaration" && declaresName(s, name))
    ? literalArrayText(right)?.join("|")
    : undefined;
}
//@ chunk-bfnfj4kx.js:28919-29118 placement
function identifierLiteralText(e, o, t) {
  if (t.has(e.name)) return UNKNOWN_PLACEHOLDER;
  let r = classifyBinding(o, e);
  let n = r.kind === "loop";
  let s = n ? loopArrayText(o, r.loop, e.name) : undefined;
  if (n) return s ?? UNKNOWN_PLACEHOLDER;
  let constValue = resolveConstValue(o, e);
  if (constValue === undefined) return UNKNOWN_PLACEHOLDER;
  return literalText(constValue, o, new Set([...t, e.name]));
}
//@ chunk-bfnfj4kx.js:29118-29149 placement
/**
 * /…/o 形式
 */
var regexSourceText = (pattern, flags) => `/${quoteExcerpt(pattern)}/${flags}`;
//@ chunk-bfnfj4kx.js:29149-29631 placement
/**
 * 把字面量/模板转成规范文本。
 */
function literalText(e, o, t = new Set()) {
  switch (e.type) {
    case "Literal": {
      let { regex, value: n } = e;
      let s = typeof n === "string";
      let p = typeof n === "bigint";
      let i = s ? excerptOrQuoted(n) : String(n);
      return regex ? regexSourceText(regex.pattern, regex.flags) : p ? UNKNOWN_PLACEHOLDER : i;
    }
    case "TemplateLiteral": {
      let cooked = e.quasis[0]?.value.cooked;
      return e.expressions.length === 0 && cooked !== undefined && cooked !== null
        ? excerptOrQuoted(cooked)
        : UNKNOWN_PLACEHOLDER;
    }
    case "ArrayExpression":
      return e.elements.map((element) => (element === null ? "" : literalText(element, o, t))).join("|");
    case "ObjectExpression":
      return hasNonPlainProperties(e) ? UNKNOWN_PLACEHOLDER : `{${describeObjectShape(e, o, t)}}`;
    case "Identifier":
      return identifierLiteralText(e, o, t);
    default:
      return UNKNOWN_PLACEHOLDER;
  }
}
//@ chunk-bfnfj4kx.js:29631-29716 placement
/**
 * 字面量或对象路径
 */
function literalOrObjectPath(e, o, t) {
  let r = followObjectConst(e, o, t);
  if (r === undefined) return `=${literalText(e, o, t)}`;
  return describeObjectPath(r, o);
}
//@ chunk-bfnfj4kx.js:29716-29762 placement
/**
 * 拼接字面量
 */
var appendLiteral = (event, matcher, t) =>
  matcher === undefined ? event : `${event}${literalText(matcher, t)}`;
//@ chunk-bfnfj4kx.js:29762-30312 placement
/**
 * 静态求值字面量表达式。
 */
function evaluateLiteral(e, o, t = new Set()) {
  if (e.type === "Literal") return e.regex ? (e.value ?? new RegExp("")) : e.value;
  if (e.type === "ArrayExpression")
    return e.elements.map((element) => (element ? evaluateLiteral(element, o, t) : new RegExp("")));
  if (e.type === "ObjectExpression") {
    if (hasNonPlainProperties(e)) return new RegExp("");
    let n = [];
    for (let property of e.properties) {
      let p = propertyKeyName(property);
      if (property.type !== "Property" || p === undefined) return new RegExp("");
      n.push([p, evaluateLiteral(property.value, o, t)]);
    }
    return Object.fromEntries(n);
  }
  if (e.type !== "Identifier" || t.has(e.name)) return new RegExp("");
  let constValue = resolveConstValue(o, e);
  if (!constValue) return new RegExp("");
  return evaluateLiteral(constValue, o, new Set([...t, e.name]));
}
//@ chunk-bfnfj4kx.js:30312-30620 placement
/**
 * 语句是否导出某名字。
 */
function exportsName(e, o) {
  if (e.type === "ExportDefaultDeclaration") {
    let { declaration } = e;
    return declaration.type === "Identifier" && declaration.name === o;
  }
  if (e.type !== "ExportNamedDeclaration") return false;
  let { declaration, source, specifiers } = e;
  let s = declaration !== null && declaration !== undefined && declaresName(declaration, o);
  let p =
    (source === null || source === undefined) &&
    specifiers.some((specifier) => exportNameText(specifier.local) === o);
  return s || p;
}
//@ chunk-bfnfj4kx.js:30620-30661 placement
/**
 * 是否导出该名
 */
var exportsName_2 = (program, o) => program.body.some((t) => exportsName(t, o));
//@ chunk-bfnfj4kx.js:30661-31061 placement
/**
 * 收集导出的声明。
 */
function collectExportedDeclarations(e) {
  let o = new Map();
  for (let t of e.body) {
    let r = t.type === "ExportDefaultDeclaration";
    let n = t.type === "ExportNamedDeclaration";
    let declaration = n ? t.declaration : undefined;
    let p = declaration?.type === "VariableDeclaration";
    let i = [
      ...(r ? [t.declaration] : []),
      ...(p
        ? declaration.declarations.flatMap((declaration) => patternIdentifiers(declaration.id))
        : [declaration?.id]),
      ...(n ? t.specifiers.map((specifier) => specifier.local) : []),
    ];
    for (let a of i)
      if (a?.type === "Identifier" && !o.has(a.name) && exportsName(t, a.name)) o.set(a.name, t);
  }
  return o;
}
//@ chunk-bfnfj4kx.js:31061-31463 placement
/**
 * 节点是否作为状态 API（read/update/atom）的参数。
 */
function isStateArgument(e, parentOf, t) {
  let r = parentOf(e);
  if (r?.type === "CallExpression") {
    let n = t.library.get(r);
    let s = n === "read" || n === "update";
    let p = n === "atom" || n === "memberOf" || t.state.has(r);
    return r.arguments[s ? 1 : 0] === e && (s || p);
  }
  if (r?.type === "ArrayExpression") {
    let n = parentOf(r);
    return n?.type === "CallExpression" && t.library.get(n) === "derive" && n.arguments[0] === r;
  }
  return r?.type === "SpreadElement" && r.argument === e && parentOf(r)?.type === "ObjectExpression";
}
//@ chunk-bfnfj4kx.js:31463-31575 placement
function sortUsesByStart(e) {
  let o = e.toSorted((t, r) => t.use.start - r.use.start);
  return {
    placed: o,
    starts: o.map((t) => t.use.start),
  };
}
//@ chunk-bfnfj4kx.js:31575-31800 placement
function createScanCaches(e, nameTables, scopeClimbs) {
  let r = io((n) => splitShadowedUses(nameTables.read.get(n) ?? [], nameTables));
  return {
    inits: memoizeByObject(collectTopConsts),
    exporting: collectExportedDeclarations(e),
    rebound: io((n) =>
      checkSingleTopDeclaration(n, {
        names: nameTables,
        climbs: scopeClimbs,
      }),
    ),
    counted: r,
    apart: io((n) =>
      io((s) =>
        sortUsesByStart(r(n).doubted.filter((p) => !isStateArgument(p.use, scopeClimbs.parentOf, s))),
      ),
    ),
  };
}
//@ chunk-bfnfj4kx.js:31800-31955 placement
/**
 * 生成解析器插件：作用域嵌套超过上限时抛出（防止过深嵌套的源码）。
 */
var limitScopeDepth = (e, o) => (t) =>
  class extends t {
    enterScope = (r) => {
      t.prototype.enterScope.call(this, r);
      if (this.scopeStack.length > e + 1) throw o(this.lastTokStartLoc.line);
    };
  };
//@ chunk-bfnfj4kx.js:31955-32749 placement
/**
 * 扫描单个 hooks 文件（嵌套深度上限、拒绝信息带摘录）。
 */
function scanHooksFile(e, o, t) {
  let r = isJsSource(e, o);
  function n(u, construct) {
    let y = typeof u === "number" ? u : u?.loc?.start.line;
    let g = r === undefined || y === undefined ? undefined : (r[y - 1]?.trim() ?? "");
    let h = g !== undefined && g.length > MAX_IMPORT_DEPTH;
    return new ScanRefusal({
      plugin: t,
      file: e,
      line: y,
      excerpt: h ? `${truncateToLength(g, MAX_IMPORT_DEPTH)}...` : g,
      construct,
    });
  }
  let { Parser } = acornParser();
  let p;
  try {
    p = Parser.extend(
      limitScopeDepth(MAX_EXCERPT_CHARS, (u) =>
        n(
          u,
          `code nested too deep to scan: more than ${MAX_EXCERPT_CHARS} scopes (functions, blocks, loops) open inside one another`,
        ),
      ),
    ).parse(o, {
      ecmaVersion: "latest",
      sourceType: "module",
      locations: true,
    });
  } catch (error) {
    if (error instanceof ScanRefusal) throw error;
    throw error instanceof RangeError
      ? n(undefined, `code nested too deep to scan (the parser stopped: ${error.message})`)
      : parseModuleError(t, e, error);
  }
  let parentMap = buildParentMap(p);
  let scopeClimbs = makeScopeClimbs((u) => parentMap.get(u));
  let nameTables = buildNameTables(p, scopeClimbs);
  return {
    file: e,
    program: p,
    names: nameTables,
    consts: createScanCaches(p, nameTables, scopeClimbs),
    parentOf: scopeClimbs.parentOf,
    climbs: scopeClimbs,
    refuse: n,
    imports: collectImports(p),
    specifiers: importSpecifiers(p),
  };
}
//@ chunk-bfnfj4kx.js:32749-33042 placement
/**
 * 在函数体之外找第一个 await/for await/await using 节点（hooks 模块不允许顶层 await）。
 */
function findTopLevelAwait(program) {
  let o;
  walkAst(
    program,
    ({ node }) => {
      if (
        o === undefined &&
        (node.type === "AwaitExpression" ||
          (node.type === "ForOfStatement" && node.await) ||
          (node.type === "VariableDeclaration" && node.kind === "await using"))
      )
        o = node;
    },
    (t) =>
      t.type === "FunctionDeclaration" ||
      t.type === "FunctionExpression" ||
      t.type === "ArrowFunctionExpression",
  );
  return o;
}
//@ chunk-bfnfj4kx.js:33042-34380 placement
/**
 * 构建 hooks 模块的导入图（大小上限、禁止顶层 await）。
 */
async function buildModuleGraph(e, o, t) {
  let r = new Map();
  let n = new Map([[e.file, e.source]]);
  let s = new Map(e.real === undefined ? [] : [[e.real, e.file]]);
  let p = {
    known: n,
    reals: s,
  };
  let i = Buffer.byteLength(e.source, "utf8");
  let a = [e];
  while (a.length > 0) {
    let f = [];
    let u = 0;
    for (let { file, source } of a) {
      if (r.has(file)) continue;
      if (u > 0 && u % MAX_PLUGIN_NAME_CHARS === 0) await yieldToEventLoop();
      u += 1;
      if (Buffer.byteLength(source, "utf8") > MAX_MODULE_BYTES) throw oversizedModuleError(o, file);
      let k = transpileModule(file, source, o);
      let E = scanHooksFile(file, k, o);
      let j = refuseDynamicImport(E);
      if (j !== undefined) throw j;
      let topLevelAwait = findTopLevelAwait(E.program);
      if (file !== e.file && topLevelAwait !== undefined)
        throw E.refuse(
          topLevelAwait,
          "a top-level await in a file the entry imports; the environment links the entry alone as an async module",
        );
      let links = new Map();
      for (let specifier of E.specifiers) {
        if (specifier === CLAUDE_CODE) continue;
        if (!isDotRelativePath(specifier))
          throw bareImportError(o, specifier, relative(e.root, file) || file);
        f.push({
          importer: file,
          specifier,
          links,
        });
      }
      r.set(file, {
        source,
        compiled: k,
        scanned: E,
        links,
      });
    }
    let x = [];
    for (let y = 0; y < f.length; y += MAX_PLUGIN_NAME_CHARS) {
      let settled = await Promise.allSettled(
        f.slice(y, y + MAX_PLUGIN_NAME_CHARS).map(async (g) => ({
          pending: g,
          answer: await t(g.specifier, g.importer, p),
        })),
      );
      for (let g of settled) {
        if (g.status === "rejected") throw g.reason;
        let { pending, answer } = g.value;
        let { real } = answer;
        let w = real === undefined ? undefined : s.get(real);
        let b =
          w === undefined
            ? answer
            : {
                file: w,
                source: n.get(w) ?? answer.source,
              };
        if (!n.has(b.file)) {
          i += Buffer.byteLength(b.source, "utf8");
          if (i > MAX_MODULE_TOTAL_BYTES) throw totalOversizedError(o, b.file);
          n.set(b.file, b.source);
          if (real !== undefined) s.set(real, b.file);
        }
        pending.links.set(pending.specifier, b.file);
        x.push(b);
      }
    }
    a = x;
  }
  return {
    entry: e.file,
    root: e.root,
    files: r,
  };
}
//@ chunk-bfnfj4kx.js:34380-34512 placement
var singleTextImportRefusal = (e) => (o, t) =>
  Promise.reject(
    new HooksError(`${e}: cannot import "${o}" (from ${t}): the module is one text with no files beside it`),
  );
//@ chunk-bfnfj4kx.js:34512-34752 placement
/**
 * 读取（内置或磁盘上的）hooks 模块源码并构建导入图。
 */
async function loadHooksModuleGraph(e, root, pluginName) {
  let r = builtinSourceRegistry.source(e);
  if (r !== undefined)
    return {
      source: r,
      graph: await buildModuleGraph(
        {
          file: e,
          source: r,
          root,
        },
        pluginName,
        singleTextImportRefusal(pluginName),
      ),
    };
  let { real, source } = await loadModuleWithChecks(e, root, pluginName);
  return {
    source,
    graph: await buildModuleGraph(
      {
        file: e,
        source,
        root,
        real,
      },
      pluginName,
      hooksImportResolver(root, pluginName),
    ),
  };
}
//@ chunk-bfnfj4kx.js:34789-34820 placement
/**
 * 长度+内容（图摘要用）
 */
var lengthPrefixed = (e) => `${e.length}:${e}`;
//@ chunk-bfnfj4kx.js:34820-35000 placement
/**
 * 计算模块图的 sha256 摘要（根目录、各文件编译结果与链接）。
 */
function moduleGraphDigest(e) {
  let o = createHash("sha256").update(lengthPrefixed(e.root));
  for (let [t, { compiled: r, links: n }] of e.files) {
    o.update(lengthPrefixed(t) + lengthPrefixed(r));
    for (let [s, p] of n) o.update(lengthPrefixed(s) + lengthPrefixed(p));
  }
  return o.digest("hex");
}
export {
  refuseDynamicImport,
  scanHooksFile,
  walkAst,
  exportNameText,
  declaringScopeOf,
  SCAN_PROBLEM_TEXT,
  isStateArgument,
  propertyKeyName,
  findDeclaredIdentifiers,
  findReferences,
  collectIdentifierUses,
  findReExportSpecifier,
  moduleGraphDigest,
  declaredNames,
  loadHooksModuleGraph,
  exportsName_2,
  appendLiteral,
  evaluateLiteral,
  buildModuleGraph,
};
