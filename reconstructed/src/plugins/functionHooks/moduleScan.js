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
import {
  relative,
  relative as relative_2,
  relative as relative_3,
  relative as relative_4,
  relative as relative_5,
} from "path";
import { createHash } from "crypto";
import {
  Dt,
  Ht,
  Pt,
  fos,
  We,
  Ro,
  _3t,
  Se,
  SSi,
  CLAUDE_CODE,
  isDotRelativePath,
  bareImportError,
  jt,
  Gu,
  Neo,
  Vu,
  Ft,
} from "./moduleLoader.js";
import { HooksError } from "./hooksErrors.js";
import { io } from "../../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import { rt } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { uniq } from "../../utils/collections.js";
import { truncateToLength } from "../../utils/stringUtils.js";
import { yieldToEventLoop } from "../../native-ts/file-index/index.js";

/**
 * AST 节点类型 → 是否声明某标识符的判定表。
 */
//@ chunk-bfnfj4kx.js:13278-13806 placement
var DECLARES_IDENTIFIER = {
  VariableDeclarator: (e, o) => e.id === o,
  FunctionDeclaration: Dt,
  FunctionExpression: Dt,
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
var ox = (e) => DECLARES_IDENTIFIER[e.type];
//@ chunk-bfnfj4kx.js:13829-13952 placement
var isPropertyKey = (e, o) =>
  (o?.type === "Property" || o?.type === "PropertyDefinition" || o?.type === "MethodDefinition") &&
  o.key === e &&
  !o.computed;
//@ chunk-bfnfj4kx.js:13952-14020 placement
var Fo = (e) => typeof e === "object" && e !== null && typeof e.type === "string";
//@ chunk-bfnfj4kx.js:14020-14135 placement
function memoizeByObject(e) {
  let weakMap = new WeakMap();
  return (t) => {
    let r = weakMap.get(t);
    if (r !== void 0) return r;
    let n = e(t);
    return (weakMap.set(t, n), n);
  };
}
/**
 * 迭代式遍历 AST（附父、祖父节点），可剪枝。
 */
//@ chunk-bfnfj4kx.js:14135-14620 placement
function walkAst(e, o, t) {
  let r = [{ node: e, parent: void 0, grandparent: void 0 }];
  for (let n = r.pop(); n !== void 0; n = r.pop()) {
    if ((o(n), t?.(n.node))) continue;
    let keys = Object.keys(n.node);
    for (let p = keys.length - 1; p >= 0; p -= 1) {
      let i = keys[p];
      if (i === void 0 || i === "loc" || i === "type" || i === "start" || i === "end") continue;
      let f = n.node[i];
      if (Array.isArray(f))
        for (let u = f.length - 1; u >= 0; u -= 1) {
          let x = f[u];
          if (Fo(x)) r.push({ node: x, parent: n.node, grandparent: n.parent });
        }
      else if (Fo(f)) r.push({ node: f, parent: n.node, grandparent: n.parent });
    }
  }
}
//@ chunk-bfnfj4kx.js:14620-14712 placement
function ax(e) {
  let o = new Map();
  return (
    walkAst(e, ({ node: node, parent: parent }) => {
      if (parent !== void 0) o.set(node, parent);
    }),
    o
  );
}
/**
 * hooks 模块不允许 import()：找到最早的动态导入并生成扫描拒绝。
 */
//@ chunk-bfnfj4kx.js:14712-14994 placement
function refuseDynamicImport(e) {
  let o;
  if (
    (walkAst(e.program, ({ node: node }) => {
      if (node.type === "ImportExpression" && (o === void 0 || node.start < o.start)) o = node;
    }),
    o === void 0)
  )
    return;
  return e.refuse(
    o,
    'a dynamic import(); a hooks module imports its own files with an import declaration, as in import { name } from "./file.js"',
  );
}
/**
 * 收集模块的导入映射。
 */
//@ chunk-bfnfj4kx.js:14994-15355 placement
function collectImports(e) {
  let o = new Map();
  for (let t of e.body) {
    if (t.type !== "ImportDeclaration") continue;
    let r = String(t.source.value);
    for (let specifier of t.specifiers) {
      let s;
      if (specifier.type === "ImportSpecifier") {
        let imported = specifier.imported;
        s = imported.type === "Identifier" ? imported.name : String(imported.value);
      } else s = specifier.type === "ImportDefaultSpecifier" ? "default" : void 0;
      o.set(specifier.local.name, { specifier: r, imported: s });
    }
  }
  return o;
}
//@ chunk-bfnfj4kx.js:15355-15592 placement
function importSpecifiers(e) {
  let o = new Set();
  for (let t of e.body) {
    let r = t.type === "ImportDeclaration" || t.type === "ExportAllDeclaration",
      n = t.type === "ExportNamedDeclaration",
      s = r ? t.source : n ? (t.source ?? null) : null;
    if (s !== null) o.add(String(s.value));
  }
  return [...o];
}
//@ chunk-bfnfj4kx.js:15592-15604 placement
var Ho = 2000;
/**
 * hooks 模块静态扫描拒绝错误（插件、文件、行、摘录、原因）。
 */
//@ chunk-bfnfj4kx.js:15604-16033 placement
class ScanRefusal extends HooksError {
  name = "ScanRefusal";
  plugin;
  file;
  line;
  excerpt;
  construct;
  constructor({ plugin: e, file: o, line: t, excerpt: r, construct: n }) {
    super(
      `${e}: ${o}${t === void 0 ? "" : r === void 0 ? `:${t}` : `, compiled line ${t} \`${r}\``}: ${n}; $ is always spelled $.noun.event(...) at the call site, on is always on("<event>", hook), and next.to always next.to(e, "<tier>")`,
    );
    ((this.plugin = e), (this.file = o), (this.line = t), (this.excerpt = r), (this.construct = n));
  }
}
//@ chunk-bfnfj4kx.js:16033-16329 placement
function passesValueThrough(e, o) {
  switch (e.type) {
    case "SequenceExpression":
    case "ChainExpression":
    case "ParenthesizedExpression":
    case "AwaitExpression":
      return !0;
    case "LogicalExpression":
      return e.right === o;
    case "ConditionalExpression":
      return e.test !== o;
    case "UnaryExpression":
      return e.operator === "void";
    default:
      return !1;
  }
}
/**
 * 取对象属性的静态键名（标识符或字面量），计算键返回 undefined。
 */
//@ chunk-bfnfj4kx.js:16329-16498 placement
function propertyKeyName(e) {
  if (e.type !== "Property") return;
  let { key: key } = e,
    t = !e.computed && key.type === "Identifier",
    r = !e.computed && key.type === "Literal";
  return t ? key.name : r ? String(key.value) : void 0;
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
var Ut = (e, o) => isFunctionNode(e) || (e.type === "PropertyDefinition" && !e.static && e.value === o);
//@ chunk-bfnfj4kx.js:16792-16966 placement
function isContainerSlot(e, o, t) {
  switch (e.type) {
    case "ArrayExpression":
      return !0;
    case "Property":
      return e.value === o;
    case "ObjectExpression":
      return o.type === "Property" && !t(e);
    default:
      return !1;
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
      return !0;
    default:
      return !1;
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
      return !0;
    default:
      return !1;
  }
}
//@ chunk-bfnfj4kx.js:17393-17520 placement
function isVarScopeNode(e, o) {
  switch (e.type) {
    case "Program":
    case "StaticBlock":
      return !0;
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
    if (n !== void 0) return n ?? void 0;
    let s = r,
      p = e(r),
      i = p === void 0 ? null : (o(p, s) ?? t.get(p));
    while (p !== void 0 && i === void 0)
      ((s = p), (p = e(p)), (i = p === void 0 ? null : (o(p, s) ?? t.get(p))));
    for (let a = r; a !== void 0 && a !== p; a = e(a)) t.set(a, i ?? null);
    return i ?? void 0;
  };
}
/**
 * 构造作用域查询函数组（父节点、所在函数、词法/var 作用域等）。
 */
//@ chunk-bfnfj4kx.js:17805-18150 placement
function makeScopeClimbs(e) {
  let o = io(hasNonPlainProperties);
  return {
    parentOf: e,
    functionOf: createAncestorFinder(e, (t) => (isFunctionNode(t) ? t : void 0)),
    lexicalScopeOf: createAncestorFinder(e, (t) => (isBlockScopeNode(t) ? t : void 0)),
    varScopeOf: createAncestorFinder(e, (t) => (isVarScopeNode(t, e(t)) ? t : void 0)),
    declarerOf: createAncestorFinder(e, (t) => (isPatternNode(t) ? void 0 : t)),
    deferrerOf: createAncestorFinder(e, (t, r) => (Ut(t, r) ? t : void 0)),
    endOf: createAncestorFinder(e, (t, r) => (passesValueThrough(t, r) ? void 0 : { value: r, parent: t })),
    heldAt: createAncestorFinder(e, (t, r) => (isContainerSlot(t, r, o) ? void 0 : { value: r, parent: t })),
  };
}
/**
 * 节点是否开启作用域。
 */
//@ chunk-bfnfj4kx.js:18150-18487 placement
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
      return !0;
    default:
      return !1;
  }
}
//@ chunk-bfnfj4kx.js:18487-18666 placement
function splitShadowedUses(e, o) {
  let mapped = e.map((r, n) => ({ use: r, at: n }));
  return {
    owned: Map.groupBy(mapped, (r) => o.writtenShadowOf(r.use)),
    doubted: mapped.filter((r) => o.writtenShadowOf(r.use) !== o.shadowOf(r.use)),
  };
}
//@ chunk-bfnfj4kx.js:18666-18768 placement
function statementList(e) {
  return e.type === "Program" || e.type === "BlockStatement" || e.type === "StaticBlock" ? e.body : [];
}
/**
 * 收集顶层 const 声明。
 */
//@ chunk-bfnfj4kx.js:18768-19132 placement
function collectTopConsts(e) {
  let o = new Map();
  for (let t of statementList(e)) {
    let r = t.type === "ExportNamedDeclaration",
      n = r ? t.declaration : t,
      s = n?.type === "VariableDeclaration" && n.kind === "var" && e.type === "Program" && !r;
    if (!(n?.type === "VariableDeclaration" && (n.kind === "const" || s))) continue;
    for (let { id: id, init: init } of n.declarations)
      if (id.type === "Identifier" && init) o.set(id.name, { id: id, init: init, isVar: s });
  }
  return o;
}
//@ chunk-bfnfj4kx.js:19132-19214 placement
var Do = (e, o) => o.writtenShadowOf(e) === void 0 || o.writtenShadowOf(e) !== o.shadowOf(e);
//@ chunk-bfnfj4kx.js:19214-19261 placement
var fe = (e, o) => (o === void 0 ? void 0 : { at: o, cause: e });
/**
 * 扫描问题的说明文字表。
 */
//@ chunk-bfnfj4kx.js:19261-19989 placement
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
/**
 * 求声明所在作用域。
 */
//@ chunk-bfnfj4kx.js:19989-20607 placement
function declaringScopeOf(
  e,
  { parentOf: parentOf, declarerOf: declarerOf, lexicalScopeOf: lexicalScopeOf, varScopeOf: varScopeOf },
) {
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
/**
 * 检查名字只在顶层声明一次且未被赋值。
 */
//@ chunk-bfnfj4kx.js:20607-21059 placement
function checkSingleTopDeclaration(e, { names: names, climbs: climbs }) {
  let { name: r } = e,
    filtered = (names.declared.get(r) ?? []).filter((p) => {
      let i = declaringScopeOf(p, climbs);
      return typeof i !== "string" && i.type === "Program";
    }),
    filtered_2 = (names.assignedAt.get(r) ?? []).filter((p) => Do(p, names));
  return (
    fe("declared", filtered.includes(e) ? filtered[1] : e) ??
    fe(
      "assigned",
      filtered_2.find((p) => names.writtenShadowOf(p) === void 0),
    ) ??
    fe("doubted", filtered_2[0]) ??
    fe("looped", names.loopAssigned.get(r)?.[0]) ??
    fe(
      "early",
      names.read.get(r)?.find((p) => p.start < e.start && climbs.deferrerOf(p) === void 0 && Do(p, names)),
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
/**
 * 收集被赋值/更新的名字。
 */
//@ chunk-bfnfj4kx.js:21349-21708 placement
function collectAssignedNames(e) {
  let o = [],
    t = [];
  return (
    walkAst(e, ({ node: node }) => {
      switch (node.type) {
        case "AssignmentExpression":
          o.push(...patternIdentifiers(node.left));
          break;
        case "UpdateExpression":
          o.push(...patternIdentifiers(node.argument));
          break;
        case "ForInStatement":
        case "ForOfStatement":
          (o.push(...patternIdentifiers(node.left)), t.push(...patternIdentifiers(node.left)));
          break;
        default:
          break;
      }
    }),
    { byName: Map.groupBy(o, (r) => r.name), inLoopHeads: Map.groupBy(t, (r) => r.name) }
  );
}
//@ chunk-bfnfj4kx.js:21708-21757 placement
var me = (e, o, t) => o !== void 0 && (ox(o)?.(o, e, t) ?? !1);
/**
 * 在 AST 中找出声明为名字 o 的标识符节点。
 */
//@ chunk-bfnfj4kx.js:21757-21893 placement
function findDeclaredIdentifiers(e, o) {
  let t = [];
  return (
    walkAst(e, ({ node: node, parent: parent, grandparent: grandparent }) => {
      if (node.type === "Identifier" && node.name === o && me(node, parent, grandparent)) t.push(node);
    }),
    t
  );
}
/**
 * 导出说明符的名字文本（标识符名或字符串字面量）。
 */
//@ chunk-bfnfj4kx.js:21893-21995 placement
function exportNameText(e) {
  let o = e.type === "Identifier",
    t = e.type === "Literal";
  return o ? e.name : t ? String(e.value) : "";
}
/**
 * 标识符是否为引用（非属性名、标签等）。
 */
//@ chunk-bfnfj4kx.js:21995-22404 placement
var isReferenceIdentifier = (e, o, t) =>
  !me(e, o, t) &&
  !(o?.type === "MemberExpression" && o.property === e && !o.computed) &&
  !isPropertyKey(e, o) &&
  o?.type !== "LabeledStatement" &&
  o?.type !== "BreakStatement" &&
  o?.type !== "ContinueStatement" &&
  o?.type !== "ExportSpecifier" &&
  o?.type !== "ImportSpecifier" &&
  o?.type !== "ImportDefaultSpecifier" &&
  o?.type !== "ImportNamespaceSpecifier" &&
  o?.type !== "MetaProperty" &&
  o?.type !== "ExportAllDeclaration" &&
  o?.type !== "ImportAttribute";
/**
 * 收集顶层函数与 const 绑定。
 */
//@ chunk-bfnfj4kx.js:22404-22897 placement
function collectFunctionsAndConsts(e) {
  let o = new Map();
  function t(r) {
    let n = r.type === "VariableDeclaration" && r.kind === "const";
    if (r.type === "FunctionDeclaration" && r.id !== null) o.set(r.id.name, r);
    else if (n)
      for (let declaration of r.declarations) {
        let { id: id, init: init } = declaration;
        if (
          id.type === "Identifier" &&
          (init?.type === "FunctionExpression" || init?.type === "ArrowFunctionExpression")
        )
          o.set(id.name, init);
      }
  }
  for (let r of e.body)
    if ((t(r), r.type === "ExportNamedDeclaration" || r.type === "ExportDefaultDeclaration")) {
      let declaration = r.declaration;
      if (declaration !== null && declaration !== void 0) t(declaration);
    }
  return o;
}
/**
 * 遍历 AST，把标识符按名字分为声明与读取两组。
 */
//@ chunk-bfnfj4kx.js:22897-23129 placement
function collectIdentifierUses(e) {
  let o = [],
    t = [];
  return (
    walkAst(e, ({ node: node, parent: parent, grandparent: grandparent }) => {
      if (node.type !== "Identifier") return;
      if (me(node, parent, grandparent)) o.push(node);
      else if (isReferenceIdentifier(node, parent, grandparent)) t.push(node);
    }),
    { declared: Map.groupBy(o, (r) => r.name), read: Map.groupBy(t, (r) => r.name) }
  );
}
/**
 * 把区间排序成嵌套结构。
 */
//@ chunk-bfnfj4kx.js:23129-23531 placement
function nestSpans(e) {
  let o = [],
    t = [],
    r = [];
  return (
    e
      .filter((n) => n.start < n.end)
      .flatMap((n) => [
        { place: n.start, span: n, isStart: !0, rank: -n.end },
        { place: n.end, span: n, isStart: !1, rank: -n.start },
      ])
      .toSorted((n, s) => n.place - s.place || Number(n.isStart) - Number(s.isStart) || n.rank - s.rank)
      .forEach((n) => {
        (n.isStart ? o.push(n.span) : o.splice(o.lastIndexOf(n.span), 1),
          t.push(n.place),
          r.push(o.at(-1)?.declaration));
      }),
    (n) => r[rt(t, n) - 1]
  );
}
//@ chunk-bfnfj4kx.js:23531-23583 placement
var or = (e) => (typeof e === "string" || isScopeNode(e) ? e : "unplaced");
/**
 * 生成作用域的源码区间。
 */
//@ chunk-bfnfj4kx.js:23583-23942 placement
function scopeSpans(e, o, t) {
  return [...e].flatMap(([r, n]) => {
    if (typeof r === "string") return [];
    if (r.type === "SwitchStatement") {
      let { discriminant: discriminant } = r;
      return [
        { start: r.start, end: discriminant.start, declaration: n },
        { start: discriminant.end, end: r.end, declaration: n },
      ];
    }
    let s = o(r),
      i =
        t === "engine" && r.type === "BlockStatement" && s !== void 0 && isFunctionNode(s) && !e.has(s)
          ? s
          : r;
    return [{ start: i.start, end: i.end, declaration: n }];
  });
}
/**
 * 构造按位置解析遮蔽绑定的函数。
 */
//@ chunk-bfnfj4kx.js:23942-24421 placement
function makeShadowResolver(e, o, t) {
  let r = new Map(),
    n = new Map(),
    s = new Map(),
    { parentOf: parentOf } = o;
  return (i) => {
    let a = s.get(i);
    if (a !== void 0) return a ?? void 0;
    let f =
      r.get(i.name) ??
      new Map(
        (e.get(i.name) ?? [])
          .map((c) => [or(declaringScopeOf(c, o)), c])
          .filter(([c]) => c !== "nothing" && (typeof c === "string" || c.type !== "Program")),
      );
    if ((r.set(i.name, f), parentOf(i) === void 0)) return i;
    if (f.size === 0) return;
    let u = f.get("unplaced");
    if (u !== void 0) return u;
    let x = n.get(i.name) ?? nestSpans(scopeSpans(f, parentOf, t));
    n.set(i.name, x);
    let y = x(i.start);
    return (s.set(i, y ?? null), y);
  };
}
//@ chunk-bfnfj4kx.js:24421-24658 placement
function buildNameTables(e, o) {
  let { declared: declared, read: read } = collectIdentifierUses(e),
    n = collectAssignedNames(e);
  return {
    functions: collectFunctionsAndConsts(e),
    assigned: new Set(n.byName.keys()),
    assignedAt: n.byName,
    loopAssigned: n.inLoopHeads,
    declared: declared,
    read: read,
    shadowOf: makeShadowResolver(declared, o, "engine"),
    writtenShadowOf: makeShadowResolver(declared, o, "written"),
  };
}
/**
 * 在模块顶层的 export ... from 中找导出名为 o 的说明符及其来源。
 */
//@ chunk-bfnfj4kx.js:24658-24912 placement
function findReExportSpecifier(e, o) {
  for (let t of e.scanned.program.body) {
    let r = t.type === "ExportNamedDeclaration",
      n = r ? t.source : null,
      s = r ? t.specifiers.find((specifier) => exportNameText(specifier.exported) === o) : void 0;
    if (n !== null && n !== void 0 && s !== void 0) return { specifier: s, spelled: String(n.value) };
  }
  return;
}
/**
 * 在 AST 中找出名字 o 的全部引用（"own" 模式不进入内层函数）。
 */
//@ chunk-bfnfj4kx.js:24912-25150 placement
function findReferences(e, o, t = "all") {
  let r = [];
  return (
    walkAst(
      e,
      ({ node: node, parent: parent, grandparent: grandparent }) => {
        if (node.type === "Identifier" && node.name === o && isReferenceIdentifier(node, parent, grandparent))
          r.push(node);
      },
      t === "own"
        ? (s) => s !== e && (s.type === "FunctionExpression" || s.type === "FunctionDeclaration")
        : void 0,
    ),
    r
  );
}
//@ chunk-bfnfj4kx.js:25150-25224 placement
function rr(e, o) {
  return e.type === "Identifier" ? e.name === o : findDeclaredIdentifiers(e, o).length > 0;
}
/**
 * 取解构模式中的所有名字。
 */
//@ chunk-bfnfj4kx.js:25224-25555 placement
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
var nr = 4;
//@ chunk-bfnfj4kx.js:25564-25831 placement
function findTopConstInit(e, o) {
  for (let t of e.program.body) {
    let n = t.type === "ExportNamedDeclaration" ? t.declaration : t;
    if (!(n?.type === "VariableDeclaration" && n.kind === "const")) continue;
    for (let declaration of n.declarations)
      if (declaration.id.type === "Identifier" && declaration.id.name === o && declaration.init)
        return declaration.init;
  }
  return;
}
/**
 * 变量/函数/类声明引入的名字列表。
 */
//@ chunk-bfnfj4kx.js:25831-25967 placement
function declaredNames(e) {
  let o = e === null || e === void 0;
  return e?.type === "VariableDeclaration"
    ? e.declarations.flatMap((declaration) => patternNames(declaration.id))
    : o
      ? []
      : [e.id.name];
}
/**
 * 语句是否声明了某名字。
 */
//@ chunk-bfnfj4kx.js:25967-26363 placement
function declaresName(e, o) {
  switch (e.type) {
    case "VariableDeclaration":
      return e.declarations.some((declaration) => rr(declaration.id, o));
    case "FunctionDeclaration":
    case "ClassDeclaration":
      return e.id?.name === o;
    case "ImportDeclaration":
      return e.specifiers.some((specifier) => specifier.local.name === o);
    case "ExportNamedDeclaration":
    case "ExportDefaultDeclaration":
      return e.declaration !== null && e.declaration !== void 0 && declaresName(e.declaration, o);
    default:
      return !1;
  }
}
//@ chunk-bfnfj4kx.js:26363-26443 placement
var sr = /^(?!(?:true|false|null|undefined|NaN|Infinity)$)(?![-\d])[\w:@*!$#-]+$/;
//@ chunk-bfnfj4kx.js:26443-26453 placement
var pr = 16;
//@ chunk-bfnfj4kx.js:26453-26464 placement
var Qe = 120;
//@ chunk-bfnfj4kx.js:26464-26736 placement
function quoteExcerpt(e) {
  let sliced = e.slice(0, Qe),
    t = e.length - sliced.length,
    replaced = JSON.stringify(sliced)
      .replace(/[^\x20-\x7e]/g, (n) => "\\u".concat(n.charCodeAt(0).toString(pr).padStart(nr, "0")))
      .replace(/ {2,}/g, (n) => " ".concat(n.slice(1).replaceAll(" ", "\\u0020")));
  return t === 0 ? replaced : `${replaced}[+${t} chars]`;
}
//@ chunk-bfnfj4kx.js:26736-26790 placement
function F(e) {
  return e.length <= Qe && sr.test(e) ? e : quoteExcerpt(e);
}
//@ chunk-bfnfj4kx.js:26790-26800 placement
var v = "?";
/**
 * 描述对象字面量的形状（用于状态键）。
 */
//@ chunk-bfnfj4kx.js:26800-27102 placement
function describeObjectShape(e, o, t) {
  let mapped = e.properties.map((property) => propertyKeyName(property)),
    index = mapped.lastIndexOf(void 0);
  return e.properties
    .flatMap((property, p) => {
      let i = mapped[p],
        a = property.type !== "Property",
        f = i !== void 0 && mapped.includes(i, p + 1),
        u = i !== void 0 && p < index,
        x = i === void 0 ? v : F(i),
        y = `${x}=${v}`,
        c = a ? `...${v}` : `${x}${ir(property.value, o, t)}`;
      return f ? [] : [u ? y : c];
    })
    .join(", ");
}
/**
 * 判断标识符是自由变量还是 const 绑定。
 */
//@ chunk-bfnfj4kx.js:27102-27479 placement
function classifyBinding(e, o) {
  let shadowOf = e.shadowOf(o);
  if (shadowOf === void 0) return { kind: "free" };
  let parentOf = e.parentOf(shadowOf),
    n = parentOf && e.parentOf(parentOf),
    s = n && e.parentOf(n);
  return parentOf?.type === "VariableDeclarator" &&
    parentOf.id === shadowOf &&
    n?.type === "VariableDeclaration" &&
    n.kind === "const" &&
    n.declarations.length === 1 &&
    s?.type === "ForOfStatement" &&
    s.left === n &&
    o.start >= s.body.start &&
    o.start < s.body.end
    ? { kind: "loop", loop: s }
    : { kind: "shadowed" };
}
//@ chunk-bfnfj4kx.js:27479-27704 placement
function resolveLiteralConst(e, o) {
  let r = classifyBinding(e, o).kind === "free" ? findTopConstInit(e, o.name) : void 0;
  return (r?.type === "Literal" && r.regex === void 0 && typeof r.value !== "bigint") ||
    (r?.type === "TemplateLiteral" && r.expressions.length === 0) ||
    r?.type === "Identifier"
    ? r
    : void 0;
}
//@ chunk-bfnfj4kx.js:27704-27903 placement
function resolveSealedConst(e, o) {
  let r = classifyBinding(e, o).kind === "free" ? findTopConstInit(e, o.name) : void 0;
  return (r?.type === "ObjectExpression" ||
    r?.type === "ArrayExpression" ||
    (r?.type === "Literal" && r.regex !== void 0)) &&
    e.isSealed(o.name)
    ? r
    : void 0;
}
//@ chunk-bfnfj4kx.js:27903-27934 placement
var ce = (e, o) => resolveLiteralConst(e, o) ?? resolveSealedConst(e, o);
//@ chunk-bfnfj4kx.js:27934-28164 placement
function followObjectConst(e, o, t) {
  let r = e,
    n = t;
  while (r.type === "Identifier" && !n.has(r.name)) {
    let i = ce(o, r);
    if (i === void 0) break;
    ((n = new Set([...n, r.name])), (r = i));
  }
  let s = r.type === "ObjectExpression" ? r : void 0;
  return s !== void 0 && !hasNonPlainProperties(s) ? { node: s, seen: n } : void 0;
}
//@ chunk-bfnfj4kx.js:28164-28379 placement
function describeObjectPath(e, o) {
  let [t, ...r] = e.node.properties,
    n = r.length === 0 && t?.type === "Property",
    s = n ? propertyKeyName(t) : void 0,
    p = n ? followObjectConst(t.value, o, e.seen) : void 0;
  return s !== void 0 && p !== void 0
    ? `.${F(s)}${describeObjectPath(p, o)}`
    : ` has {${describeObjectShape(e.node, o, e.seen)}}`;
}
/**
 * 把字面量数组转成文本。
 */
//@ chunk-bfnfj4kx.js:28379-28761 placement
function literalArrayText(e) {
  let o = [];
  for (let element of e.elements) {
    if (element === null) return;
    if (element.type === "Literal") {
      let { value: s } = element;
      if (!(typeof s === "string" || typeof s === "number" || typeof s === "boolean")) return;
      o.push(typeof s === "string" ? F(s) : String(s));
      continue;
    }
    let n =
      element.type === "TemplateLiteral" && element.expressions.length === 0
        ? element.quasis[0]?.value.cooked
        : void 0;
    if (n === void 0 || n === null) return;
    o.push(F(n));
  }
  return uniq(o);
}
//@ chunk-bfnfj4kx.js:28761-28919 placement
function loopArrayText(e, o, t) {
  let { right: right } = o;
  return right.type === "ArrayExpression" &&
    !e.program.body.some((s) => s.type === "ImportDeclaration" && declaresName(s, t))
    ? literalArrayText(right)?.join("|")
    : void 0;
}
//@ chunk-bfnfj4kx.js:28919-29118 placement
function identifierLiteralText(e, o, t) {
  if (t.has(e.name)) return v;
  let r = classifyBinding(o, e),
    n = r.kind === "loop",
    s = n ? loopArrayText(o, r.loop, e.name) : void 0;
  if (n) return s ?? v;
  let p = ce(o, e);
  if (p === void 0) return v;
  return literalText(p, o, new Set([...t, e.name]));
}
//@ chunk-bfnfj4kx.js:29118-29149 placement
var cr = (e, o) => `/${quoteExcerpt(e)}/${o}`;
/**
 * 把字面量/模板转成规范文本。
 */
//@ chunk-bfnfj4kx.js:29149-29631 placement
function literalText(e, o, t = new Set()) {
  switch (e.type) {
    case "Literal": {
      let { regex: regex, value: n } = e,
        s = typeof n === "string",
        p = typeof n === "bigint",
        i = s ? F(n) : String(n);
      return regex ? cr(regex.pattern, regex.flags) : p ? v : i;
    }
    case "TemplateLiteral": {
      let r = e.quasis[0]?.value.cooked;
      return e.expressions.length === 0 && r !== void 0 && r !== null ? F(r) : v;
    }
    case "ArrayExpression":
      return e.elements.map((element) => (element === null ? "" : literalText(element, o, t))).join("|");
    case "ObjectExpression":
      return hasNonPlainProperties(e) ? v : `{${describeObjectShape(e, o, t)}}`;
    case "Identifier":
      return identifierLiteralText(e, o, t);
    default:
      return v;
  }
}
//@ chunk-bfnfj4kx.js:29631-29716 placement
function ir(e, o, t) {
  let r = followObjectConst(e, o, t);
  if (r === void 0) return `=${literalText(e, o, t)}`;
  return describeObjectPath(r, o);
}
//@ chunk-bfnfj4kx.js:29716-29762 placement
var jUi = (e, o, t) => (o === void 0 ? e : `${e}${literalText(o, t)}`);
/**
 * 静态求值字面量表达式。
 */
//@ chunk-bfnfj4kx.js:29762-30312 placement
function evaluateLiteral(e, o, t = new Set()) {
  if (e.type === "Literal") return e.regex ? (e.value ?? new RegExp("")) : e.value;
  if (e.type === "ArrayExpression")
    return e.elements.map((element) => (element ? evaluateLiteral(element, o, t) : new RegExp("")));
  if (e.type === "ObjectExpression") {
    if (hasNonPlainProperties(e)) return new RegExp("");
    let n = [];
    for (let property of e.properties) {
      let p = propertyKeyName(property);
      if (property.type !== "Property" || p === void 0) return new RegExp("");
      n.push([p, evaluateLiteral(property.value, o, t)]);
    }
    return Object.fromEntries(n);
  }
  if (e.type !== "Identifier" || t.has(e.name)) return new RegExp("");
  let r = ce(o, e);
  if (!r) return new RegExp("");
  return evaluateLiteral(r, o, new Set([...t, e.name]));
}
/**
 * 语句是否导出某名字。
 */
//@ chunk-bfnfj4kx.js:30312-30620 placement
function exportsName(e, o) {
  if (e.type === "ExportDefaultDeclaration") {
    let { declaration: declaration } = e;
    return declaration.type === "Identifier" && declaration.name === o;
  }
  if (e.type !== "ExportNamedDeclaration") return !1;
  let { declaration: declaration, source: source, specifiers: specifiers } = e,
    s = declaration !== null && declaration !== void 0 && declaresName(declaration, o),
    p = (source === null || source === void 0) && specifiers.some((i) => exportNameText(i.local) === o);
  return s || p;
}
//@ chunk-bfnfj4kx.js:30620-30661 placement
var Feo = (e, o) => e.body.some((t) => exportsName(t, o));
/**
 * 收集导出的声明。
 */
//@ chunk-bfnfj4kx.js:30661-31061 placement
function collectExportedDeclarations(e) {
  let o = new Map();
  for (let t of e.body) {
    let r = t.type === "ExportDefaultDeclaration",
      n = t.type === "ExportNamedDeclaration",
      s = n ? t.declaration : void 0,
      p = s?.type === "VariableDeclaration",
      i = [
        ...(r ? [t.declaration] : []),
        ...(p ? s.declarations.flatMap((declaration) => patternIdentifiers(declaration.id)) : [s?.id]),
        ...(n ? t.specifiers.map((specifier) => specifier.local) : []),
      ];
    for (let a of i)
      if (a?.type === "Identifier" && !o.has(a.name) && exportsName(t, a.name)) o.set(a.name, t);
  }
  return o;
}
/**
 * 节点是否作为状态 API（read/update/atom）的参数。
 */
//@ chunk-bfnfj4kx.js:31061-31463 placement
function isStateArgument(e, o, t) {
  let r = o(e);
  if (r?.type === "CallExpression") {
    let n = t.library.get(r),
      s = n === "read" || n === "update",
      p = n === "atom" || n === "memberOf" || t.state.has(r);
    return r.arguments[s ? 1 : 0] === e && (s || p);
  }
  if (r?.type === "ArrayExpression") {
    let n = o(r);
    return n?.type === "CallExpression" && t.library.get(n) === "derive" && n.arguments[0] === r;
  }
  return r?.type === "SpreadElement" && r.argument === e && o(r)?.type === "ObjectExpression";
}
//@ chunk-bfnfj4kx.js:31463-31575 placement
function sortUsesByStart(e) {
  let toSorted = e.toSorted((t, r) => t.use.start - r.use.start);
  return { placed: toSorted, starts: toSorted.map((t) => t.use.start) };
}
//@ chunk-bfnfj4kx.js:31575-31800 placement
function createScanCaches(e, o, t) {
  let r = io((n) => splitShadowedUses(o.read.get(n) ?? [], o));
  return {
    inits: memoizeByObject(collectTopConsts),
    exporting: collectExportedDeclarations(e),
    rebound: io((n) => checkSingleTopDeclaration(n, { names: o, climbs: t })),
    counted: r,
    apart: io((n) =>
      io((s) => sortUsesByStart(r(n).doubted.filter((p) => !isStateArgument(p.use, t.parentOf, s)))),
    ),
  };
}
/**
 * 生成解析器插件：作用域嵌套超过上限时抛出（防止过深嵌套的源码）。
 */
//@ chunk-bfnfj4kx.js:31800-31955 placement
var limitScopeDepth = (e, o) => (t) =>
  class extends t {
    enterScope = (r) => {
      if ((t.prototype.enterScope.call(this, r), this.scopeStack.length > e + 1))
        throw o(this.lastTokStartLoc.line);
    };
  };
/**
 * 扫描单个 hooks 文件（嵌套深度上限、拒绝信息带摘录）。
 */
//@ chunk-bfnfj4kx.js:31955-32749 placement
function scanHooksFile(e, o, t) {
  let r = Ht(e, o);
  function n(u, x) {
    let y = typeof u === "number" ? u : u?.loc?.start.line,
      g = r === void 0 || y === void 0 ? void 0 : (r[y - 1]?.trim() ?? ""),
      h = g !== void 0 && g.length > Pt;
    return new ScanRefusal({
      plugin: t,
      file: e,
      line: y,
      excerpt: h ? `${truncateToLength(g, Pt)}...` : g,
      construct: x,
    });
  }
  let { Parser: Parser } = fos(),
    p;
  try {
    p = Parser.extend(
      limitScopeDepth(Ho, (u) =>
        n(
          u,
          `code nested too deep to scan: more than ${Ho} scopes (functions, blocks, loops) open inside one another`,
        ),
      ),
    ).parse(o, { ecmaVersion: "latest", sourceType: "module", locations: !0 });
  } catch (error) {
    if (error instanceof ScanRefusal) throw error;
    throw error instanceof RangeError
      ? n(void 0, `code nested too deep to scan (the parser stopped: ${error.message})`)
      : We(t, e, error);
  }
  let i = ax(p),
    a = makeScopeClimbs((u) => i.get(u)),
    f = buildNameTables(p, a);
  return {
    file: e,
    program: p,
    names: f,
    consts: createScanCaches(p, f, a),
    parentOf: a.parentOf,
    climbs: a,
    refuse: n,
    imports: collectImports(p),
    specifiers: importSpecifiers(p),
  };
}
/**
 * 在函数体之外找第一个 await/for await/await using 节点（hooks 模块不允许顶层 await）。
 */
//@ chunk-bfnfj4kx.js:32749-33042 placement
function findTopLevelAwait(e) {
  let o;
  return (
    walkAst(
      e,
      ({ node: node }) => {
        if (
          o === void 0 &&
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
    ),
    o
  );
}
/**
 * 构建 hooks 模块的导入图（大小上限、禁止顶层 await）。
 */
//@ chunk-bfnfj4kx.js:33042-34380 placement
async function buildModuleGraph(e, o, t) {
  let r = new Map(),
    n = new Map([[e.file, e.source]]),
    s = new Map(e.real === void 0 ? [] : [[e.real, e.file]]),
    p = { known: n, reals: s },
    byteLength = Buffer.byteLength(e.source, "utf8"),
    a = [e];
  while (a.length > 0) {
    let f = [],
      u = 0;
    for (let { file: file, source: source } of a) {
      if (r.has(file)) continue;
      if (u > 0 && u % Ro === 0) await yieldToEventLoop();
      if (((u += 1), Buffer.byteLength(source, "utf8") > _3t)) throw Se(o, file);
      let k = SSi(file, source, o),
        E = scanHooksFile(file, k, o),
        j = refuseDynamicImport(E);
      if (j !== void 0) throw j;
      let w = findTopLevelAwait(E.program);
      if (file !== e.file && w !== void 0)
        throw E.refuse(
          w,
          "a top-level await in a file the entry imports; the environment links the entry alone as an async module",
        );
      let te = new Map();
      for (let specifier of E.specifiers) {
        if (specifier === CLAUDE_CODE) continue;
        if (!isDotRelativePath(specifier))
          throw bareImportError(o, specifier, relative_4(e.root, file) || file);
        f.push({ importer: file, specifier: specifier, links: te });
      }
      r.set(file, { source: source, compiled: k, scanned: E, links: te });
    }
    let x = [];
    for (let y = 0; y < f.length; y += Ro) {
      let settled = await Promise.allSettled(
        f.slice(y, y + Ro).map(async (g) => ({ pending: g, answer: await t(g.specifier, g.importer, p) })),
      );
      for (let g of settled) {
        if (g.status === "rejected") throw g.reason;
        let { pending: pending, answer: answer } = g.value,
          { real: real } = answer,
          w = real === void 0 ? void 0 : s.get(real),
          b = w === void 0 ? answer : { file: w, source: n.get(w) ?? answer.source };
        if (!n.has(b.file)) {
          if (((byteLength += Buffer.byteLength(b.source, "utf8")), byteLength > jt)) throw Gu(o, b.file);
          if ((n.set(b.file, b.source), real !== void 0)) s.set(real, b.file);
        }
        (pending.links.set(pending.specifier, b.file), x.push(b));
      }
    }
    a = x;
  }
  return { entry: e.file, root: e.root, files: r };
}
//@ chunk-bfnfj4kx.js:34380-34512 placement
var singleTextImportRefusal = (e) => (o, t) =>
  Promise.reject(
    new HooksError(`${e}: cannot import "${o}" (from ${t}): the module is one text with no files beside it`),
  );
/**
 * 读取（内置或磁盘上的）hooks 模块源码并构建导入图。
 */
//@ chunk-bfnfj4kx.js:34512-34752 placement
async function loadHooksModuleGraph(e, o, t) {
  let source = Neo.source(e);
  if (source !== void 0)
    return {
      source: source,
      graph: await buildModuleGraph({ file: e, source: source, root: o }, t, singleTextImportRefusal(t)),
    };
  let { real: real, source: source_2 } = await Vu(e, o, t);
  return {
    source: source_2,
    graph: await buildModuleGraph({ file: e, source: source_2, root: o, real: real }, t, Ft(o, t)),
  };
}
//@ chunk-bfnfj4kx.js:34789-34820 placement
var ue = (e) => `${e.length}:${e}`;
/**
 * 计算模块图的 sha256 摘要（根目录、各文件编译结果与链接）。
 */
//@ chunk-bfnfj4kx.js:34820-35000 placement
function moduleGraphDigest(e) {
  let update = createHash("sha256").update(ue(e.root));
  for (let [t, { compiled: r, links: n }] of e.files) {
    update.update(ue(t) + ue(r));
    for (let [s, p] of n) update.update(ue(s) + ue(p));
  }
  return update.digest("hex");
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
  Feo,
  jUi,
  evaluateLiteral,
  buildModuleGraph,
};
