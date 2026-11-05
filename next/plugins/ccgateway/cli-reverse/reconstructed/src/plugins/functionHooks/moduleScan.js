/**
 * plugins/functionHooks/moduleScan.ts
 *
 * 2.1.316 新增：构建 hooks 模块的导入图（大小上限、禁止顶层 await）；扫描单个 hooks 文件（嵌套深度上限、拒绝信息带摘录）等。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-6sf70a86.js (88)
 * attribution: placement 88
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
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
import { memoizeAlias } from "../../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import { import_sortedLastIndex } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { normalizeCaseForComparison_2 } from "../../utils/permissions/filesystem.js";
import { truncateToLength } from "../../utils/stringUtils.js";
import { yieldToEventLoop } from "../../native-ts/file-index/index.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-6sf70a86.js:13320-13848 placement
/**
 * AST 节点类型 → 是否声明某标识符的判定表。
 */
var DECLARES_IDENTIFIER = {
  VariableDeclarator: (node, identifier) => node.id === identifier,
  FunctionDeclaration: isSameModuleId,
  FunctionExpression: isSameModuleId,
  ArrowFunctionExpression: (node, identifier) => node.params.includes(identifier),
  ClassDeclaration: (node, identifier) => node.id === identifier,
  ClassExpression: (node, identifier) => node.id === identifier,
  CatchClause: (node, identifier) => node.param === identifier,
  AssignmentPattern: (node, identifier) => node.left === identifier,
  RestElement: (node, identifier) => node.argument === identifier,
  ArrayPattern: (node, identifier) => node.elements.includes(identifier),
  Property: (node, identifier, parent) => node.value === identifier && parent?.type === "ObjectPattern",
  ImportSpecifier: (node, identifier) => node.local === identifier,
  ImportDefaultSpecifier: (node, identifier) => node.local === identifier,
  ImportNamespaceSpecifier: (node, identifier) => node.local === identifier,
};
//@ chunk-6sf70a86.js:13848-13871 placement
/**
 * 节点是否声明标识符
 */
var declaresIdentifier = (node) => DECLARES_IDENTIFIER[node.type];
//@ chunk-6sf70a86.js:13871-13994 placement
var isPropertyKey = (node, parent) =>
  (parent?.type === "Property" ||
    parent?.type === "PropertyDefinition" ||
    parent?.type === "MethodDefinition") &&
  parent.key === node &&
  !parent.computed;
//@ chunk-6sf70a86.js:13994-14062 placement
/**
 * 像 AST 节点
 */
var isAstNode = (value) => typeof value === "object" && value !== null && typeof value.type === "string";
//@ chunk-6sf70a86.js:14062-14177 placement
function memoizeByObject(collectTopConsts) {
  let weakMap = new WeakMap();
  return (program) => {
    let memoized = weakMap.get(program);
    if (memoized !== undefined) return memoized;
    let collected = collectTopConsts(program);
    weakMap.set(program, collected);
    return collected;
  };
}
//@ chunk-6sf70a86.js:14177-14662 placement
/**
 * 迭代式遍历 AST（附父、祖父节点），可剪枝。
 */
function walkAst(node, visit, prune) {
  let stack = [
    {
      node,
      parent: undefined,
      grandparent: undefined,
    },
  ];
  for (let frame = stack.pop(); frame !== undefined; frame = stack.pop()) {
    visit(frame);
    if (prune?.(frame.node)) continue;
    let keys = Object.keys(frame.node);
    for (let keyIndex = keys.length - 1; keyIndex >= 0; keyIndex -= 1) {
      let key = keys[keyIndex];
      if (key === undefined || key === "loc" || key === "type" || key === "start" || key === "end") continue;
      let child = frame.node[key];
      if (Array.isArray(child))
        for (let childIndex = child.length - 1; childIndex >= 0; childIndex -= 1) {
          let childNode = child[childIndex];
          if (isAstNode(childNode))
            stack.push({
              node: childNode,
              parent: frame.node,
              grandparent: frame.parent,
            });
        }
      else if (isAstNode(child))
        stack.push({
          node: child,
          parent: frame.node,
          grandparent: frame.parent,
        });
    }
  }
}
//@ chunk-6sf70a86.js:14662-14754 placement
/**
 * 建立父节点表
 */
function buildParentMap(program) {
  let parents = new Map();
  walkAst(program, ({ node, parent }) => {
    if (parent !== undefined) parents.set(node, parent);
  });
  return parents;
}
//@ chunk-6sf70a86.js:14754-15036 placement
/**
 * hooks 模块不允许 import()：找到最早的动态导入并生成扫描拒绝。
 */
function refuseDynamicImport(program) {
  let firstImport;
  walkAst(program.program, ({ node }) => {
    if (node.type === "ImportExpression" && (firstImport === undefined || node.start < firstImport.start))
      firstImport = node;
  });
  if (firstImport === undefined) return;
  return program.refuse(
    firstImport,
    'a dynamic import(); a hooks module imports its own files with an import declaration, as in import { name } from "./file.js"',
  );
}
//@ chunk-6sf70a86.js:15036-15397 placement
/**
 * 收集模块的导入映射。
 */
function collectImports(program) {
  let imports = new Map();
  for (let statement of program.body) {
    if (statement.type !== "ImportDeclaration") continue;
    let specifier = String(statement.source.value);
    for (let specifier_2 of statement.specifiers) {
      let importedName;
      if (specifier_2.type === "ImportSpecifier") {
        let imported = specifier_2.imported;
        importedName = imported.type === "Identifier" ? imported.name : String(imported.value);
      } else importedName = specifier_2.type === "ImportDefaultSpecifier" ? "default" : undefined;
      imports.set(specifier_2.local.name, {
        specifier,
        imported: importedName,
      });
    }
  }
  return imports;
}
//@ chunk-6sf70a86.js:15397-15634 placement
function importSpecifiers(program) {
  let specifiers = new Set();
  for (let statement of program.body) {
    let isReexport = statement.type === "ImportDeclaration" || statement.type === "ExportAllDeclaration";
    let isNamedExport = statement.type === "ExportNamedDeclaration";
    let sourceNode = isReexport ? statement.source : isNamedExport ? (statement.source ?? null) : null;
    if (sourceNode !== null) specifiers.add(String(sourceNode.value));
  }
  return [...specifiers];
}
//@ chunk-6sf70a86.js:15634-15646 placement
/**
 * 2000
 */
var MAX_EXCERPT_CHARS = 2000;
//@ chunk-6sf70a86.js:15646-16075 placement
/**
 * hooks 模块静态扫描拒绝错误（插件、文件、行、摘录、原因）。
 */
let ScanRefusal; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-6sf70a86.js:15646", () => {
  ScanRefusal = class ScanRefusal extends HooksError {
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
  };
});
//@ chunk-6sf70a86.js:16075-16371 placement
function passesValueThrough(node, valueNode) {
  switch (node.type) {
    case "SequenceExpression":
    case "ChainExpression":
    case "ParenthesizedExpression":
    case "AwaitExpression":
      return true;
    case "LogicalExpression":
      return node.right === valueNode;
    case "ConditionalExpression":
      return node.test !== valueNode;
    case "UnaryExpression":
      return node.operator === "void";
    default:
      return false;
  }
}
//@ chunk-6sf70a86.js:16371-16540 placement
/**
 * 取对象属性的静态键名（标识符或字面量），计算键返回 undefined。
 */
function propertyKeyName(property) {
  if (property.type !== "Property") return;
  let { key } = property;
  let isIdentifierKey = !property.computed && key.type === "Identifier";
  let isLiteralKey = !property.computed && key.type === "Literal";
  return isIdentifierKey ? key.name : isLiteralKey ? String(key.value) : undefined;
}
//@ chunk-6sf70a86.js:16540-16648 placement
var hasNonPlainProperties = (objectNode) =>
  objectNode.properties.some(
    (property) =>
      property.type === "Property" &&
      (property.kind !== "init" || (!property.shorthand && propertyKeyName(property) === "__proto__")),
  );
//@ chunk-6sf70a86.js:16648-16760 placement
var isFunctionNode = (node) =>
  node?.type === "FunctionDeclaration" ||
  node?.type === "FunctionExpression" ||
  node?.type === "ArrowFunctionExpression";
//@ chunk-6sf70a86.js:16760-16834 placement
/**
 * 函数或实例属性值
 */
var isFunctionOrPropertyValue = (node, valueNode) =>
  isFunctionNode(node) || (node.type === "PropertyDefinition" && !node.static && node.value === valueNode);
//@ chunk-6sf70a86.js:16834-17008 placement
function isContainerSlot(node, parentNode, isNonPlain) {
  switch (node.type) {
    case "ArrayExpression":
      return true;
    case "Property":
      return node.value === parentNode;
    case "ObjectExpression":
      return parentNode.type === "Property" && !isNonPlain(node);
    default:
      return false;
  }
}
//@ chunk-6sf70a86.js:17008-17282 placement
function isBlockScopeNode(node) {
  switch (node.type) {
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
//@ chunk-6sf70a86.js:17282-17435 placement
function isPatternNode(node) {
  switch (node.type) {
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
//@ chunk-6sf70a86.js:17435-17562 placement
function isVarScopeNode(node, parent) {
  switch (node.type) {
    case "Program":
    case "StaticBlock":
      return true;
    case "BlockStatement":
      return isFunctionNode(parent);
    default:
      return isFunctionNode(node);
  }
}
//@ chunk-6sf70a86.js:17562-17847 placement
function createAncestorFinder(parentOf, matchOf) {
  let cache = new Map();
  return (startNode) => {
    let cached = cache.get(startNode);
    if (cached !== undefined) return cached ?? undefined;
    let child = startNode;
    let ancestor = parentOf(startNode);
    let match = ancestor === undefined ? null : (matchOf(ancestor, child) ?? cache.get(ancestor));
    while (ancestor !== undefined && match === undefined) {
      child = ancestor;
      ancestor = parentOf(ancestor);
      match = ancestor === undefined ? null : (matchOf(ancestor, child) ?? cache.get(ancestor));
    }
    for (
      let nodeOnPath = startNode;
      nodeOnPath !== undefined && nodeOnPath !== ancestor;
      nodeOnPath = parentOf(nodeOnPath)
    )
      cache.set(nodeOnPath, match ?? null);
    return match ?? undefined;
  };
}
//@ chunk-6sf70a86.js:17847-18192 placement
/**
 * 构造作用域查询函数组（父节点、所在函数、词法/var 作用域等）。
 */
function makeScopeClimbs(parentOf) {
  let isNonPlain = memoizeAlias(hasNonPlainProperties);
  return {
    parentOf,
    functionOf: createAncestorFinder(parentOf, (ancestor) =>
      isFunctionNode(ancestor) ? ancestor : undefined,
    ),
    lexicalScopeOf: createAncestorFinder(parentOf, (ancestor) =>
      isBlockScopeNode(ancestor) ? ancestor : undefined,
    ),
    varScopeOf: createAncestorFinder(parentOf, (ancestor) =>
      isVarScopeNode(ancestor, parentOf(ancestor)) ? ancestor : undefined,
    ),
    declarerOf: createAncestorFinder(parentOf, (ancestor) =>
      isPatternNode(ancestor) ? undefined : ancestor,
    ),
    deferrerOf: createAncestorFinder(parentOf, (ancestor, child) =>
      isFunctionOrPropertyValue(ancestor, child) ? ancestor : undefined,
    ),
    endOf: createAncestorFinder(parentOf, (ancestor, child) =>
      passesValueThrough(ancestor, child)
        ? undefined
        : {
            value: child,
            parent: ancestor,
          },
    ),
    heldAt: createAncestorFinder(parentOf, (ancestor, child) =>
      isContainerSlot(ancestor, child, isNonPlain)
        ? undefined
        : {
            value: child,
            parent: ancestor,
          },
    ),
  };
}
//@ chunk-6sf70a86.js:18192-18529 placement
/**
 * 节点是否开启作用域。
 */
function isScopeNode(node) {
  switch (node.type) {
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
//@ chunk-6sf70a86.js:18529-18708 placement
function splitShadowedUses(uses, names) {
  let mapped = uses.map((use, at) => ({
    use,
    at,
  }));
  return {
    owned: Map.groupBy(mapped, (use) => names.writtenShadowOf(use.use)),
    doubted: mapped.filter((use) => names.writtenShadowOf(use.use) !== names.shadowOf(use.use)),
  };
}
//@ chunk-6sf70a86.js:18708-18810 placement
function statementList(node) {
  return node.type === "Program" || node.type === "BlockStatement" || node.type === "StaticBlock"
    ? node.body
    : [];
}
//@ chunk-6sf70a86.js:18810-19174 placement
/**
 * 收集顶层 const 声明。
 */
function collectTopConsts(program) {
  let consts = new Map();
  for (let statement of statementList(program)) {
    let isReexport = statement.type === "ExportNamedDeclaration";
    let declaration = isReexport ? statement.declaration : statement;
    let isTopVar =
      declaration?.type === "VariableDeclaration" &&
      declaration.kind === "var" &&
      program.type === "Program" &&
      !isReexport;
    if (!(declaration?.type === "VariableDeclaration" && (declaration.kind === "const" || isTopVar)))
      continue;
    for (let { id, init } of declaration.declarations)
      if (id.type === "Identifier" && init)
        consts.set(id.name, {
          id,
          init,
          isVar: isTopVar,
        });
  }
  return consts;
}
//@ chunk-6sf70a86.js:19174-19256 placement
/**
 * 写入未被遮蔽
 */
var hasUnshadowedWrite = (use, names) =>
  names.writtenShadowOf(use) === undefined || names.writtenShadowOf(use) !== names.shadowOf(use);
//@ chunk-6sf70a86.js:19256-19303 placement
/**
 * 原因与位置
 */
var causeAt = (cause, location) =>
  location === undefined
    ? undefined
    : {
        at: location,
        cause,
      };
//@ chunk-6sf70a86.js:19303-20031 placement
/**
 * 扫描问题的说明文字表。
 */
var SCAN_PROBLEM_TEXT; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-6sf70a86.js:19303", () => {
  SCAN_PROBLEM_TEXT = Object.freeze({
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
});
//@ chunk-6sf70a86.js:20031-20649 placement
/**
 * 求声明所在作用域。
 */
function declaringScopeOf(identifier, { parentOf, declarerOf, lexicalScopeOf, varScopeOf }) {
  let declarer = declarerOf(identifier);
  switch (declarer?.type) {
    case "VariableDeclarator": {
      let declaration = parentOf(declarer);
      return (
        (declaration?.type === "VariableDeclaration" && declaration.kind !== "var"
          ? lexicalScopeOf(declarer)
          : varScopeOf(declarer)) ?? "unplaced"
      );
    }
    case "FunctionDeclaration":
    case "ClassDeclaration":
      return declarer.id === identifier ? (lexicalScopeOf(declarer) ?? "unplaced") : declarer;
    case "FunctionExpression":
    case "ArrowFunctionExpression":
    case "ClassExpression":
    case "CatchClause":
      return declarer;
    case "ImportSpecifier":
    case "ImportDefaultSpecifier":
    case "ImportNamespaceSpecifier":
      return varScopeOf(declarer) ?? "unplaced";
    case "AssignmentExpression":
    case "ForInStatement":
    case "ForOfStatement":
      return "nothing";
    default:
      return "unplaced";
  }
}
//@ chunk-6sf70a86.js:20649-21101 placement
/**
 * 检查名字只在顶层声明一次且未被赋值。
 */
function checkSingleTopDeclaration(declarator, { names, climbs }) {
  let { name } = declarator;
  let filtered = (names.declared.get(name) ?? []).filter((declaration) => {
    let scope = declaringScopeOf(declaration, climbs);
    return typeof scope !== "string" && scope.type === "Program";
  });
  let filtered_2 = (names.assignedAt.get(name) ?? []).filter((write) => hasUnshadowedWrite(write, names));
  return (
    causeAt("declared", filtered.includes(declarator) ? filtered[1] : declarator) ??
    causeAt(
      "assigned",
      filtered_2.find((write) => names.writtenShadowOf(write) === undefined),
    ) ??
    causeAt("doubted", filtered_2[0]) ??
    causeAt("looped", names.loopAssigned.get(name)?.[0]) ??
    causeAt(
      "early",
      names.read
        .get(name)
        ?.find(
          (read) =>
            read.start < declarator.start &&
            climbs.deferrerOf(read) === undefined &&
            hasUnshadowedWrite(read, names),
        ),
    )
  );
}
//@ chunk-6sf70a86.js:21101-21391 placement
function patternIdentifiers(pattern) {
  switch (pattern?.type) {
    case "Identifier":
      return [pattern];
    case "ArrayPattern":
      return pattern.elements.flatMap(patternIdentifiers);
    case "ObjectPattern":
      return pattern.properties.flatMap((property) =>
        patternIdentifiers(property.type === "Property" ? property.value : property),
      );
    case "AssignmentPattern":
      return patternIdentifiers(pattern.left);
    case "RestElement":
      return patternIdentifiers(pattern.argument);
    default:
      return [];
  }
}
//@ chunk-6sf70a86.js:21391-21750 placement
/**
 * 收集被赋值/更新的名字。
 */
function collectAssignedNames(program) {
  let assigned = [];
  let loopHeadAssigned = [];
  walkAst(program, ({ node }) => {
    switch (node.type) {
      case "AssignmentExpression":
        assigned.push(...patternIdentifiers(node.left));
        break;
      case "UpdateExpression":
        assigned.push(...patternIdentifiers(node.argument));
        break;
      case "ForInStatement":
      case "ForOfStatement":
        assigned.push(...patternIdentifiers(node.left));
        loopHeadAssigned.push(...patternIdentifiers(node.left));
        break;
      default:
        break;
    }
  });
  return {
    byName: Map.groupBy(assigned, (identifier) => identifier.name),
    inLoopHeads: Map.groupBy(loopHeadAssigned, (identifier) => identifier.name),
  };
}
//@ chunk-6sf70a86.js:21750-21799 placement
/**
 * 是否在该处声明
 */
var declaresIn = (node, node_2, grandparent) =>
  node_2 !== undefined && (declaresIdentifier(node_2)?.(node_2, node, grandparent) ?? false);
//@ chunk-6sf70a86.js:21799-21935 placement
/**
 * 在 AST 中找出声明为名字 o 的标识符节点。
 */
function findDeclaredIdentifiers(program, name) {
  let declared = [];
  walkAst(program, ({ node, parent, grandparent }) => {
    if (node.type === "Identifier" && node.name === name && declaresIn(node, parent, grandparent))
      declared.push(node);
  });
  return declared;
}
//@ chunk-6sf70a86.js:21935-22037 placement
/**
 * 导出说明符的名字文本（标识符名或字符串字面量）。
 */
function exportNameText(node) {
  let isIdentifier = node.type === "Identifier";
  let isLiteral = node.type === "Literal";
  return isIdentifier ? node.name : isLiteral ? String(node.value) : "";
}
//@ chunk-6sf70a86.js:22037-22446 placement
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
//@ chunk-6sf70a86.js:22446-22939 placement
/**
 * 收集顶层函数与 const 绑定。
 */
function collectFunctionsAndConsts(program) {
  let functionsById = new Map();
  function collectStatement(statement) {
    let isConstDecl = statement.type === "VariableDeclaration" && statement.kind === "const";
    if (statement.type === "FunctionDeclaration" && statement.id !== null)
      functionsById.set(statement.id.name, statement);
    else if (isConstDecl)
      for (let declaration of statement.declarations) {
        let { id, init } = declaration;
        if (
          id.type === "Identifier" &&
          (init?.type === "FunctionExpression" || init?.type === "ArrowFunctionExpression")
        )
          functionsById.set(id.name, init);
      }
  }
  for (let statement of program.body) {
    collectStatement(statement);
    if (statement.type === "ExportNamedDeclaration" || statement.type === "ExportDefaultDeclaration") {
      let declaration = statement.declaration;
      if (declaration !== null && declaration !== undefined) collectStatement(declaration);
    }
  }
  return functionsById;
}
//@ chunk-6sf70a86.js:22939-23171 placement
/**
 * 遍历 AST，把标识符按名字分为声明与读取两组。
 */
function collectIdentifierUses(program) {
  let declared = [];
  let read = [];
  walkAst(program, ({ node, parent, grandparent }) => {
    if (node.type !== "Identifier") return;
    if (declaresIn(node, parent, grandparent)) declared.push(node);
    else if (isReferenceIdentifier(node, parent, grandparent)) read.push(node);
  });
  return {
    declared: Map.groupBy(declared, (identifier) => identifier.name),
    read: Map.groupBy(read, (identifier) => identifier.name),
  };
}
//@ chunk-6sf70a86.js:23171-23573 placement
/**
 * 把区间排序成嵌套结构。
 */
function nestSpans(spans) {
  let openSpans = [];
  let places = [];
  let declarations = [];
  spans
    .filter((span) => span.start < span.end)
    .flatMap((span) => [
      {
        place: span.start,
        span,
        isStart: true,
        rank: -span.end,
      },
      {
        place: span.end,
        span,
        isStart: false,
        rank: -span.start,
      },
    ])
    .toSorted(
      (edgeA, edgeB) =>
        edgeA.place - edgeB.place || Number(edgeA.isStart) - Number(edgeB.isStart) || edgeA.rank - edgeB.rank,
    )
    .forEach((edge) => {
      if (edge.isStart) openSpans.push(edge.span);
      else openSpans.splice(openSpans.lastIndexOf(edge.span), 1);
      places.push(edge.place);
      declarations.push(openSpans.at(-1)?.declaration);
    });
  return (position) => declarations[import_sortedLastIndex(places, position) - 1];
}
//@ chunk-6sf70a86.js:23573-23625 placement
/**
 * 作用域标签
 */
var scopeLabel = (scope) => (typeof scope === "string" || isScopeNode(scope) ? scope : "unplaced");
//@ chunk-6sf70a86.js:23625-23984 placement
/**
 * 生成作用域的源码区间。
 */
function scopeSpans(byScope, parentOf, mode) {
  return [...byScope].flatMap(([scopeNode, declaration]) => {
    if (typeof scopeNode === "string") return [];
    if (scopeNode.type === "SwitchStatement") {
      let { discriminant } = scopeNode;
      return [
        {
          start: scopeNode.start,
          end: discriminant.start,
          declaration,
        },
        {
          start: discriminant.end,
          end: scopeNode.end,
          declaration,
        },
      ];
    }
    let parent = parentOf(scopeNode);
    let spanNode =
      mode === "engine" &&
      scopeNode.type === "BlockStatement" &&
      parent !== undefined &&
      isFunctionNode(parent) &&
      !byScope.has(parent)
        ? parent
        : scopeNode;
    return [
      {
        start: spanNode.start,
        end: spanNode.end,
        declaration,
      },
    ];
  });
}
//@ chunk-6sf70a86.js:23984-24463 placement
/**
 * 构造按位置解析遮蔽绑定的函数。
 */
function makeShadowResolver(declared, climbs, mode) {
  let byNameScopes = new Map();
  let byNameSpans = new Map();
  let byIdentifier = new Map();
  let { parentOf } = climbs;
  return (identifier) => {
    let cached = byIdentifier.get(identifier);
    if (cached !== undefined) return cached ?? undefined;
    let scopes =
      byNameScopes.get(identifier.name) ??
      new Map(
        (declared.get(identifier.name) ?? [])
          .map((declaration) => [scopeLabel(declaringScopeOf(declaration, climbs)), declaration])
          .filter(
            ([label]) => label !== "nothing" && (typeof label === "string" || label.type !== "Program"),
          ),
      );
    byNameScopes.set(identifier.name, scopes);
    if (parentOf(identifier) === undefined) return identifier;
    if (scopes.size === 0) return;
    let unplaced = scopes.get("unplaced");
    if (unplaced !== undefined) return unplaced;
    let spanFinder = byNameSpans.get(identifier.name) ?? nestSpans(scopeSpans(scopes, parentOf, mode));
    byNameSpans.set(identifier.name, spanFinder);
    let resolved = spanFinder(identifier.start);
    byIdentifier.set(identifier, resolved ?? null);
    return resolved;
  };
}
//@ chunk-6sf70a86.js:24463-24700 placement
function buildNameTables(program, climbs) {
  let { declared, read } = collectIdentifierUses(program);
  let assignedNames = collectAssignedNames(program);
  return {
    functions: collectFunctionsAndConsts(program),
    assigned: new Set(assignedNames.byName.keys()),
    assignedAt: assignedNames.byName,
    loopAssigned: assignedNames.inLoopHeads,
    declared,
    read,
    shadowOf: makeShadowResolver(declared, climbs, "engine"),
    writtenShadowOf: makeShadowResolver(declared, climbs, "written"),
  };
}
//@ chunk-6sf70a86.js:24700-24954 placement
/**
 * 在模块顶层的 export ... from 中找导出名为 o 的说明符及其来源。
 */
function findReExportSpecifier(scan, exportedName) {
  for (let statement of scan.scanned.program.body) {
    let isNamedExport = statement.type === "ExportNamedDeclaration";
    let source = isNamedExport ? statement.source : null;
    let specifier = isNamedExport
      ? statement.specifiers.find((specifier) => exportNameText(specifier.exported) === exportedName)
      : undefined;
    if (source !== null && source !== undefined && specifier !== undefined)
      return {
        specifier,
        spelled: String(source.value),
      };
  }
  return;
}
//@ chunk-6sf70a86.js:24954-25192 placement
/**
 * 在 AST 中找出名字 o 的全部引用（"own" 模式不进入内层函数）。
 */
function findReferences(program, name, scope = "all") {
  let references = [];
  walkAst(
    program,
    ({ node, parent, grandparent }) => {
      if (
        node.type === "Identifier" &&
        node.name === name &&
        isReferenceIdentifier(node, parent, grandparent)
      )
        references.push(node);
    },
    scope === "own"
      ? (node) =>
          node !== program && (node.type === "FunctionExpression" || node.type === "FunctionDeclaration")
      : undefined,
  );
  return references;
}
//@ chunk-6sf70a86.js:25192-25266 placement
/**
 * 指定名字的标识符
 */
function isIdentifierOrBinding(program, name) {
  return program.type === "Identifier"
    ? program.name === name
    : findDeclaredIdentifiers(program, name).length > 0;
}
//@ chunk-6sf70a86.js:25266-25597 placement
/**
 * 取解构模式中的所有名字。
 */
function patternNames(pattern) {
  switch (pattern.type) {
    case "Identifier":
      return [pattern.name];
    case "ObjectPattern":
      return pattern.properties.flatMap((property) =>
        patternNames(property.type === "RestElement" ? property.argument : property.value),
      );
    case "ArrayPattern":
      return pattern.elements.flatMap((element) => (element === null ? [] : patternNames(element)));
    case "AssignmentPattern":
      return patternNames(pattern.left);
    case "RestElement":
      return patternNames(pattern.argument);
    default:
      return [];
  }
}
//@ chunk-6sf70a86.js:25597-25606 placement
/**
 * 4
 */
var MAX_DESTRUCTURE_NAMES = 4;
//@ chunk-6sf70a86.js:25606-25873 placement
function findTopConstInit(scan, name) {
  for (let statement of scan.program.body) {
    let declaration = statement.type === "ExportNamedDeclaration" ? statement.declaration : statement;
    if (!(declaration?.type === "VariableDeclaration" && declaration.kind === "const")) continue;
    for (let declaration_2 of declaration.declarations)
      if (declaration_2.id.type === "Identifier" && declaration_2.id.name === name && declaration_2.init)
        return declaration_2.init;
  }
  return;
}
//@ chunk-6sf70a86.js:25873-26009 placement
/**
 * 变量/函数/类声明引入的名字列表。
 */
function declaredNames(declaration) {
  let isMissing = declaration === null || declaration === undefined;
  return declaration?.type === "VariableDeclaration"
    ? declaration.declarations.flatMap((declaration) => patternNames(declaration.id))
    : isMissing
      ? []
      : [declaration.id.name];
}
//@ chunk-6sf70a86.js:26009-26405 placement
/**
 * 语句是否声明了某名字。
 */
function declaresName(astNode, name) {
  switch (astNode.type) {
    case "VariableDeclaration":
      return astNode.declarations.some((declaration) => isIdentifierOrBinding(declaration.id, name));
    case "FunctionDeclaration":
    case "ClassDeclaration":
      return astNode.id?.name === name;
    case "ImportDeclaration":
      return astNode.specifiers.some((specifier) => specifier.local.name === name);
    case "ExportNamedDeclaration":
    case "ExportDefaultDeclaration":
      return (
        astNode.declaration !== null &&
        astNode.declaration !== undefined &&
        declaresName(astNode.declaration, name)
      );
    default:
      return false;
  }
}
//@ chunk-6sf70a86.js:26405-26485 placement
/**
 * 可直接展示的摘录
 */
var SAFE_EXCERPT_RE = /^(?!(?:true|false|null|undefined|NaN|Infinity)$)(?![-\d])[\w:@*!$#-]+$/;
//@ chunk-6sf70a86.js:26485-26495 placement
/**
 * 16
 */
var MAX_STATE_KEY_PARTS = 16;
//@ chunk-6sf70a86.js:26495-26506 placement
/**
 * 120
 */
var MAX_EXCERPT_LEN = 120;
//@ chunk-6sf70a86.js:26506-26778 placement
function quoteExcerpt(text) {
  let sliced = text.slice(0, MAX_EXCERPT_LEN);
  let droppedChars = text.length - sliced.length;
  let replaced = JSON.stringify(sliced)
    .replace(/[^\x20-\x7e]/g, (char) =>
      "\\u".concat(char.charCodeAt(0).toString(MAX_STATE_KEY_PARTS).padStart(MAX_DESTRUCTURE_NAMES, "0")),
    )
    .replace(/ {2,}/g, (spaceRun) => " ".concat(spaceRun.slice(1).replaceAll(" ", "\\u0020")));
  return droppedChars === 0 ? replaced : `${replaced}[+${droppedChars} chars]`;
}
//@ chunk-6sf70a86.js:26778-26832 placement
/**
 * 摘录或加引号
 */
function excerptOrQuoted(text) {
  return text.length <= MAX_EXCERPT_LEN && SAFE_EXCERPT_RE.test(text) ? text : quoteExcerpt(text);
}
//@ chunk-6sf70a86.js:26832-26842 placement
/**
 * "?"
 */
var UNKNOWN_PLACEHOLDER = "?";
//@ chunk-6sf70a86.js:26842-27144 placement
/**
 * 描述对象字面量的形状（用于状态键）。
 */
function describeObjectShape(objectNode, context, seen) {
  let mapped = objectNode.properties.map((property) => propertyKeyName(property));
  let index = mapped.lastIndexOf(undefined);
  return objectNode.properties
    .flatMap((property, position) => {
      let keyName = mapped[position];
      let isSpread = property.type !== "Property";
      let isRedefinedLater = keyName !== undefined && mapped.includes(keyName, position + 1);
      let isBeforeUnknown = keyName !== undefined && position < index;
      let label = keyName === undefined ? UNKNOWN_PLACEHOLDER : excerptOrQuoted(keyName);
      let opaqueEntry = `${label}=${UNKNOWN_PLACEHOLDER}`;
      let entryText = isSpread
        ? `...${UNKNOWN_PLACEHOLDER}`
        : `${label}${literalOrObjectPath(property.value, context, seen)}`;
      return isRedefinedLater ? [] : [isBeforeUnknown ? opaqueEntry : entryText];
    })
    .join(", ");
}
//@ chunk-6sf70a86.js:27144-27521 placement
/**
 * 判断标识符是自由变量还是 const 绑定。
 */
function classifyBinding(scanner, identifier) {
  let declaration = scanner.shadowOf(identifier);
  if (declaration === undefined)
    return {
      kind: "free",
    };
  let declarator = scanner.parentOf(declaration);
  let variableDeclaration = declarator && scanner.parentOf(declarator);
  let loopStatement = variableDeclaration && scanner.parentOf(variableDeclaration);
  return declarator?.type === "VariableDeclarator" &&
    declarator.id === declaration &&
    variableDeclaration?.type === "VariableDeclaration" &&
    variableDeclaration.kind === "const" &&
    variableDeclaration.declarations.length === 1 &&
    loopStatement?.type === "ForOfStatement" &&
    loopStatement.left === variableDeclaration &&
    identifier.start >= loopStatement.body.start &&
    identifier.start < loopStatement.body.end
    ? {
        kind: "loop",
        loop: loopStatement,
      }
    : {
        kind: "shadowed",
      };
}
//@ chunk-6sf70a86.js:27521-27746 placement
function resolveLiteralConst(scanner, identifier) {
  let init =
    classifyBinding(scanner, identifier).kind === "free"
      ? findTopConstInit(scanner, identifier.name)
      : undefined;
  return (init?.type === "Literal" && init.regex === undefined && typeof init.value !== "bigint") ||
    (init?.type === "TemplateLiteral" && init.expressions.length === 0) ||
    init?.type === "Identifier"
    ? init
    : undefined;
}
//@ chunk-6sf70a86.js:27746-27945 placement
function resolveSealedConst(scanner, identifier) {
  let init =
    classifyBinding(scanner, identifier).kind === "free"
      ? findTopConstInit(scanner, identifier.name)
      : undefined;
  return (init?.type === "ObjectExpression" ||
    init?.type === "ArrayExpression" ||
    (init?.type === "Literal" && init.regex !== undefined)) &&
    scanner.isSealed(identifier.name)
    ? init
    : undefined;
}
//@ chunk-6sf70a86.js:27945-27976 placement
/**
 * 解析常量字面量
 */
var resolveConstValue = (scanner, identifier) =>
  resolveLiteralConst(scanner, identifier) ?? resolveSealedConst(scanner, identifier);
//@ chunk-6sf70a86.js:27976-28206 placement
function followObjectConst(node, scanner, seen) {
  let current = node;
  let seenNames = seen;
  while (current.type === "Identifier" && !seenNames.has(current.name)) {
    let constValue = resolveConstValue(scanner, current);
    if (constValue === undefined) break;
    seenNames = new Set([...seenNames, current.name]);
    current = constValue;
  }
  let objectNode = current.type === "ObjectExpression" ? current : undefined;
  return objectNode !== undefined && !hasNonPlainProperties(objectNode)
    ? {
        node: objectNode,
        seen: seenNames,
      }
    : undefined;
}
//@ chunk-6sf70a86.js:28206-28421 placement
function describeObjectPath(resolved, context) {
  let [firstProperty, ...restProperties] = resolved.node.properties;
  let isSingleProperty = restProperties.length === 0 && firstProperty?.type === "Property";
  let keyName = isSingleProperty ? propertyKeyName(firstProperty) : undefined;
  let nested = isSingleProperty ? followObjectConst(firstProperty.value, context, resolved.seen) : undefined;
  return keyName !== undefined && nested !== undefined
    ? `.${excerptOrQuoted(keyName)}${describeObjectPath(nested, context)}`
    : ` has {${describeObjectShape(resolved.node, context, resolved.seen)}}`;
}
//@ chunk-6sf70a86.js:28421-28803 placement
/**
 * 把字面量数组转成文本。
 */
function literalArrayText(arrayNode) {
  let items = [];
  for (let element of arrayNode.elements) {
    if (element === null) return;
    if (element.type === "Literal") {
      let { value } = element;
      if (!(typeof value === "string" || typeof value === "number" || typeof value === "boolean")) return;
      items.push(typeof value === "string" ? excerptOrQuoted(value) : String(value));
      continue;
    }
    let cooked =
      element.type === "TemplateLiteral" && element.expressions.length === 0
        ? element.quasis[0]?.value.cooked
        : undefined;
    if (cooked === undefined || cooked === null) return;
    items.push(excerptOrQuoted(cooked));
  }
  return normalizeCaseForComparison_2(items);
}
//@ chunk-6sf70a86.js:28803-28961 placement
function loopArrayText(scan, loop, name) {
  let { right } = loop;
  return right.type === "ArrayExpression" &&
    !scan.program.body.some(
      (statement) => statement.type === "ImportDeclaration" && declaresName(statement, name),
    )
    ? literalArrayText(right)?.join("|")
    : undefined;
}
//@ chunk-6sf70a86.js:28961-29160 placement
function identifierLiteralText(identifier, scanner, seen) {
  if (seen.has(identifier.name)) return UNKNOWN_PLACEHOLDER;
  let binding = classifyBinding(scanner, identifier);
  let isLoopBinding = binding.kind === "loop";
  let loopText = isLoopBinding ? loopArrayText(scanner, binding.loop, identifier.name) : undefined;
  if (isLoopBinding) return loopText ?? UNKNOWN_PLACEHOLDER;
  let constValue = resolveConstValue(scanner, identifier);
  if (constValue === undefined) return UNKNOWN_PLACEHOLDER;
  return literalText(constValue, scanner, new Set([...seen, identifier.name]));
}
//@ chunk-6sf70a86.js:29160-29191 placement
/**
 * /…/o 形式
 */
var regexSourceText = (text, flags) => `/${quoteExcerpt(text)}/${flags}`;
//@ chunk-6sf70a86.js:29191-29673 placement
/**
 * 把字面量/模板转成规范文本。
 */
function literalText(node, scanner, seen = new Set()) {
  switch (node.type) {
    case "Literal": {
      let { regex, value } = node;
      let isString = typeof value === "string";
      let isBigInt = typeof value === "bigint";
      let text = isString ? excerptOrQuoted(value) : String(value);
      return regex ? regexSourceText(regex.pattern, regex.flags) : isBigInt ? UNKNOWN_PLACEHOLDER : text;
    }
    case "TemplateLiteral": {
      let cooked = node.quasis[0]?.value.cooked;
      return node.expressions.length === 0 && cooked !== undefined && cooked !== null
        ? excerptOrQuoted(cooked)
        : UNKNOWN_PLACEHOLDER;
    }
    case "ArrayExpression":
      return node.elements
        .map((element) => (element === null ? "" : literalText(element, scanner, seen)))
        .join("|");
    case "ObjectExpression":
      return hasNonPlainProperties(node)
        ? UNKNOWN_PLACEHOLDER
        : `{${describeObjectShape(node, scanner, seen)}}`;
    case "Identifier":
      return identifierLiteralText(node, scanner, seen);
    default:
      return UNKNOWN_PLACEHOLDER;
  }
}
//@ chunk-6sf70a86.js:29673-29758 placement
/**
 * 字面量或对象路径
 */
function literalOrObjectPath(node, scanner, seen) {
  let resolved = followObjectConst(node, scanner, seen);
  if (resolved === undefined) return `=${literalText(node, scanner, seen)}`;
  return describeObjectPath(resolved, scanner);
}
//@ chunk-6sf70a86.js:29758-29804 placement
/**
 * 拼接字面量
 */
var appendLiteral = (event, matcher, scanner) =>
  matcher === undefined ? event : `${event}${literalText(matcher, scanner)}`;
//@ chunk-6sf70a86.js:29804-30354 placement
/**
 * 静态求值字面量表达式。
 */
function evaluateLiteral(node, scanner, seen = new Set()) {
  if (node.type === "Literal") return node.regex ? (node.value ?? new RegExp("")) : node.value;
  if (node.type === "ArrayExpression")
    return node.elements.map((element) =>
      element ? evaluateLiteral(element, scanner, seen) : new RegExp(""),
    );
  if (node.type === "ObjectExpression") {
    if (hasNonPlainProperties(node)) return new RegExp("");
    let entries = [];
    for (let property of node.properties) {
      let keyName = propertyKeyName(property);
      if (property.type !== "Property" || keyName === undefined) return new RegExp("");
      entries.push([keyName, evaluateLiteral(property.value, scanner, seen)]);
    }
    return Object.fromEntries(entries);
  }
  if (node.type !== "Identifier" || seen.has(node.name)) return new RegExp("");
  let constValue = resolveConstValue(scanner, node);
  if (!constValue) return new RegExp("");
  return evaluateLiteral(constValue, scanner, new Set([...seen, node.name]));
}
//@ chunk-6sf70a86.js:30354-30662 placement
/**
 * 语句是否导出某名字。
 */
function exportsName(statement, name) {
  if (statement.type === "ExportDefaultDeclaration") {
    let { declaration } = statement;
    return declaration.type === "Identifier" && declaration.name === name;
  }
  if (statement.type !== "ExportNamedDeclaration") return false;
  let { declaration, source, specifiers } = statement;
  let exportsDeclared = declaration !== null && declaration !== undefined && declaresName(declaration, name);
  let exportsLocal =
    (source === null || source === undefined) &&
    specifiers.some((specifier) => exportNameText(specifier.local) === name);
  return exportsDeclared || exportsLocal;
}
//@ chunk-6sf70a86.js:30662-30703 placement
/**
 * 是否导出该名
 */
var exportsName_2 = (program, name) => program.body.some((statement) => exportsName(statement, name));
//@ chunk-6sf70a86.js:30703-31103 placement
/**
 * 收集导出的声明。
 */
function collectExportedDeclarations(program) {
  let byName = new Map();
  for (let statement of program.body) {
    let isDefaultExport = statement.type === "ExportDefaultDeclaration";
    let isNamedExport = statement.type === "ExportNamedDeclaration";
    let declaration = isNamedExport ? statement.declaration : undefined;
    let isVariableDeclaration = declaration?.type === "VariableDeclaration";
    let exportedIdentifiers = [
      ...(isDefaultExport ? [statement.declaration] : []),
      ...(isVariableDeclaration
        ? declaration.declarations.flatMap((declaration) => patternIdentifiers(declaration.id))
        : [declaration?.id]),
      ...(isNamedExport ? statement.specifiers.map((specifier) => specifier.local) : []),
    ];
    for (let identifier of exportedIdentifiers)
      if (
        identifier?.type === "Identifier" &&
        !byName.has(identifier.name) &&
        exportsName(statement, identifier.name)
      )
        byName.set(identifier.name, statement);
  }
  return byName;
}
//@ chunk-6sf70a86.js:31103-31505 placement
/**
 * 节点是否作为状态 API（read/update/atom）的参数。
 */
function isStateArgument(node, parentOf, stateFacts) {
  let parent = parentOf(node);
  if (parent?.type === "CallExpression") {
    let libraryName = stateFacts.library.get(parent);
    let isReadOrUpdate = libraryName === "read" || libraryName === "update";
    let isStateCall = libraryName === "atom" || libraryName === "memberOf" || stateFacts.state.has(parent);
    return parent.arguments[isReadOrUpdate ? 1 : 0] === node && (isReadOrUpdate || isStateCall);
  }
  if (parent?.type === "ArrayExpression") {
    let grandparent = parentOf(parent);
    return (
      grandparent?.type === "CallExpression" &&
      stateFacts.library.get(grandparent) === "derive" &&
      grandparent.arguments[0] === parent
    );
  }
  return (
    parent?.type === "SpreadElement" &&
    parent.argument === node &&
    parentOf(parent)?.type === "ObjectExpression"
  );
}
//@ chunk-6sf70a86.js:31505-31617 placement
function sortUsesByStart(uses) {
  let placed = uses.toSorted((useA, useB) => useA.use.start - useB.use.start);
  return {
    placed,
    starts: placed.map((use) => use.use.start),
  };
}
//@ chunk-6sf70a86.js:31617-31842 placement
function createScanCaches(program, names, scopeClimbs) {
  let splitUses = memoizeAlias((name) => splitShadowedUses(names.read.get(name) ?? [], names));
  return {
    inits: memoizeByObject(collectTopConsts),
    exporting: collectExportedDeclarations(program),
    rebound: memoizeAlias((name) =>
      checkSingleTopDeclaration(name, {
        names,
        climbs: scopeClimbs,
      }),
    ),
    counted: splitUses,
    apart: memoizeAlias((name) =>
      memoizeAlias((stateFacts) =>
        sortUsesByStart(
          splitUses(name).doubted.filter(
            (use) => !isStateArgument(use.use, scopeClimbs.parentOf, stateFacts),
          ),
        ),
      ),
    ),
  };
}
//@ chunk-6sf70a86.js:31842-31997 placement
/**
 * 生成解析器插件：作用域嵌套超过上限时抛出（防止过深嵌套的源码）。
 */
var limitScopeDepth = (maxDepth, refuseAtLine) => (BaseParser) =>
  class extends BaseParser {
    enterScope = (scope) => {
      BaseParser.prototype.enterScope.call(this, scope);
      if (this.scopeStack.length > maxDepth + 1) throw refuseAtLine(this.lastTokStartLoc.line);
    };
  };
//@ chunk-6sf70a86.js:31997-32790 placement
/**
 * 扫描单个 hooks 文件（嵌套深度上限、拒绝信息带摘录）。
 */
function scanHooksFile(file, source, pluginName) {
  let sourceLines = isJsSource(file, source);
  function refuseAt(where, construct) {
    let line = typeof where === "number" ? where : where?.loc?.start.line;
    let excerpt =
      sourceLines === undefined || line === undefined ? undefined : (sourceLines[line - 1]?.trim() ?? "");
    let isTruncated = excerpt !== undefined && excerpt.length > MAX_IMPORT_DEPTH;
    return new ScanRefusal({
      plugin: pluginName,
      file,
      line,
      excerpt: isTruncated ? `${truncateToLength(excerpt, MAX_IMPORT_DEPTH)}...` : excerpt,
      construct,
    });
  }
  let { Parser } = acornParser();
  let program;
  try {
    program = Parser.extend(
      limitScopeDepth(MAX_EXCERPT_CHARS, (scopeLine) =>
        refuseAt(
          scopeLine,
          `code nested too deep to scan: more than ${MAX_EXCERPT_CHARS} scopes (functions, blocks, loops) open inside one another`,
        ),
      ),
    ).parse(source, {
      ecmaVersion: "latest",
      sourceType: "module",
      locations: true,
    });
  } catch (error) {
    if (error instanceof ScanRefusal) throw error;
    throw error instanceof RangeError
      ? refuseAt(undefined, `code nested too deep to scan (the parser stopped: ${error.message})`)
      : parseModuleError(pluginName, file, error);
  }
  let parentMap = buildParentMap(program);
  let scopeClimbs = makeScopeClimbs((node) => parentMap.get(node));
  let nameTables = buildNameTables(program, scopeClimbs);
  return {
    file,
    program,
    names: nameTables,
    consts: createScanCaches(program, nameTables, scopeClimbs),
    parentOf: scopeClimbs.parentOf,
    climbs: scopeClimbs,
    refuse: refuseAt,
    imports: collectImports(program),
    specifiers: importSpecifiers(program),
  };
}
//@ chunk-6sf70a86.js:32790-33083 placement
/**
 * 在函数体之外找第一个 await/for await/await using 节点（hooks 模块不允许顶层 await）。
 */
function findTopLevelAwait(program) {
  let found;
  walkAst(
    program,
    ({ node }) => {
      if (
        found === undefined &&
        (node.type === "AwaitExpression" ||
          (node.type === "ForOfStatement" && node.await) ||
          (node.type === "VariableDeclaration" && node.kind === "await using"))
      )
        found = node;
    },
    (node) =>
      node.type === "FunctionDeclaration" ||
      node.type === "FunctionExpression" ||
      node.type === "ArrowFunctionExpression",
  );
  return found;
}
//@ chunk-6sf70a86.js:33083-34421 placement
/**
 * 构建 hooks 模块的导入图（大小上限、禁止顶层 await）。
 */
async function buildModuleGraph(entry, pluginName, resolveImport) {
  let files = new Map();
  let knownSources = new Map([[entry.file, entry.source]]);
  let reals = new Map(entry.real === undefined ? [] : [[entry.real, entry.file]]);
  let importState = {
    known: knownSources,
    reals,
  };
  let totalBytes = Buffer.byteLength(entry.source, "utf8");
  let level = [entry];
  while (level.length > 0) {
    let pendingImports = [];
    let fileIndex = 0;
    for (let { file, source } of level) {
      if (files.has(file)) continue;
      if (fileIndex > 0 && fileIndex % MAX_PLUGIN_NAME_CHARS === 0) await yieldToEventLoop();
      fileIndex += 1;
      if (Buffer.byteLength(source, "utf8") > MAX_MODULE_BYTES) throw oversizedModuleError(pluginName, file);
      let transpiled = transpileModule(file, source, pluginName);
      let scanned = scanHooksFile(file, transpiled, pluginName);
      let dynamicImportRefusal = refuseDynamicImport(scanned);
      if (dynamicImportRefusal !== undefined) throw dynamicImportRefusal;
      let topLevelAwait = findTopLevelAwait(scanned.program);
      if (file !== entry.file && topLevelAwait !== undefined)
        throw scanned.refuse(
          topLevelAwait,
          "a top-level await in a file the entry imports; the environment links the entry alone as an async module",
        );
      let links = new Map();
      for (let specifier of scanned.specifiers) {
        if (specifier === CLAUDE_CODE) continue;
        if (!isDotRelativePath(specifier))
          throw bareImportError(pluginName, specifier, relative(entry.root, file) || file);
        pendingImports.push({
          importer: file,
          specifier,
          links,
        });
      }
      files.set(file, {
        source,
        compiled: transpiled,
        scanned,
        links,
      });
    }
    let nextLevel = [];
    for (let batchStart = 0; batchStart < pendingImports.length; batchStart += MAX_PLUGIN_NAME_CHARS) {
      let settled = await Promise.allSettled(
        pendingImports.slice(batchStart, batchStart + MAX_PLUGIN_NAME_CHARS).map(async (request) => ({
          pending: request,
          answer: await resolveImport(request.specifier, request.importer, importState),
        })),
      );
      for (let settledEntry of settled) {
        if (settledEntry.status === "rejected") throw settledEntry.reason;
        let { pending, answer } = settledEntry.value;
        let { real } = answer;
        let knownFile = real === undefined ? undefined : reals.get(real);
        let resolvedImport =
          knownFile === undefined
            ? answer
            : {
                file: knownFile,
                source: knownSources.get(knownFile) ?? answer.source,
              };
        if (!knownSources.has(resolvedImport.file)) {
          totalBytes += Buffer.byteLength(resolvedImport.source, "utf8");
          if (totalBytes > MAX_MODULE_TOTAL_BYTES) throw totalOversizedError(pluginName, resolvedImport.file);
          knownSources.set(resolvedImport.file, resolvedImport.source);
          if (real !== undefined) reals.set(real, resolvedImport.file);
        }
        pending.links.set(pending.specifier, resolvedImport.file);
        nextLevel.push(resolvedImport);
      }
    }
    level = nextLevel;
  }
  return {
    entry: entry.file,
    root: entry.root,
    files,
  };
}
//@ chunk-6sf70a86.js:34421-34553 placement
var singleTextImportRefusal = (pluginName) => (specifier, importer) =>
  Promise.reject(
    new HooksError(
      `${pluginName}: cannot import "${specifier}" (from ${importer}): the module is one text with no files beside it`,
    ),
  );
//@ chunk-6sf70a86.js:34553-34793 placement
/**
 * 读取（内置或磁盘上的）hooks 模块源码并构建导入图。
 */
async function loadHooksModuleGraph(file, pluginRoot, pluginName) {
  let builtinSource = builtinSourceRegistry.source(file);
  if (builtinSource !== undefined)
    return {
      source: builtinSource,
      graph: await buildModuleGraph(
        {
          file,
          source: builtinSource,
          root: pluginRoot,
        },
        pluginName,
        singleTextImportRefusal(pluginName),
      ),
    };
  let { real, source } = await loadModuleWithChecks(file, pluginRoot, pluginName);
  return {
    source,
    graph: await buildModuleGraph(
      {
        file,
        source,
        root: pluginRoot,
        real,
      },
      pluginName,
      hooksImportResolver(pluginRoot, pluginName),
    ),
  };
}
//@ chunk-6sf70a86.js:34830-34861 placement
/**
 * 长度+内容（图摘要用）
 */
var lengthPrefixed = (text) => `${text.length}:${text}`;
//@ chunk-6sf70a86.js:34861-35041 placement
/**
 * 计算模块图的 sha256 摘要（根目录、各文件编译结果与链接）。
 */
function moduleGraphDigest(graph) {
  let hash = createHash("sha256").update(lengthPrefixed(graph.root));
  for (let [file, { compiled, links }] of graph.files) {
    hash.update(lengthPrefixed(file) + lengthPrefixed(compiled));
    for (let [specifier, targetPath] of links)
      hash.update(lengthPrefixed(specifier) + lengthPrefixed(targetPath));
  }
  return hash.digest("hex");
}
export {
  loadHooksModuleGraph,
  walkAst,
  exportNameText,
  exportsName_2,
  findReferences,
  appendLiteral,
  evaluateLiteral,
  buildModuleGraph,
  declaringScopeOf,
  SCAN_PROBLEM_TEXT,
  isStateArgument,
  propertyKeyName,
  findDeclaredIdentifiers,
  collectIdentifierUses,
  findReExportSpecifier,
  moduleGraphDigest,
  declaredNames,
  refuseDynamicImport,
  scanHooksFile,
};
