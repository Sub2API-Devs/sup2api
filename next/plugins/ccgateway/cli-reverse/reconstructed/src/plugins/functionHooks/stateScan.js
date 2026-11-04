/**
 * plugins/functionHooks/stateScan.ts
 *
 * 2.1.316 新增：扫描 $ 的一次使用（$.noun.event 调用、记录 env/命令/状态）；扫描把 $ 传给命名函数的调用等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-bfnfj4kx.js (41)
 * attribution: placement 41
 */
import {
  declaringScopeOf,
  SCAN_PROBLEM_TEXT,
  isStateArgument,
  propertyKeyName,
  findDeclaredIdentifiers,
  findReferences,
  walkAst,
  collectIdentifierUses,
  findReExportSpecifier,
  moduleGraphDigest,
} from "./moduleScan.js";
import { import_sortedIndex } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { readStaticString, describeArgument, collectClientModules } from "./clientSurfaceScan.js";
import {
  PLUGIN,
  isEnvApiCall,
  readLiteralEnvName,
  COMMAND_REGISTER,
  isReservedHookName,
  describeDollarUse,
  resolveFunctionReference,
  envScannerField,
  recordNamedCommand,
  recordStateCall,
  stateLibraryCallKind,
  eventPatternError,
  isEventPattern,
  nameOfEventPattern,
  checkExportDeclaration,
  requireLinkedFile,
  CORE_SOURCES,
  isCoreSource,
  isNamedProperty,
  isTelemetryEvent,
  collectRunCommands,
} from "./eventPatterns.js";
import { BaseOutputFormatSchema } from "../../entrypoints/sdk/coreSchemas.js";
import {
  isStreamingHookEvent,
  STREAMING_EVENTS,
  isHookEvent,
  isPluginDefinedEvent,
} from "./hookApiSurface.js";
import { isAbovePrepend, tiersBeneath, readBundledScan, readBundledFiles } from "./builtinHooksModule.js";
import { importResolverCache } from "./moduleLoader.js";

//@ chunk-bfnfj4kx.js:39347-39545 placement (2.1.88 match: createEmptyToolCounts, 0.474)
/**
 * 有 stateReads/stateWrites 时按键排序输出 {reads, writes}，否则 undefined。旧版名 createEmptyToolCounts 为错配。
 */
function summarizeStateAccess(scan) {
  let hasAccess = scan.stateReads.size > 0 || scan.stateWrites.size > 0;
  let sortedAtoms = (entries) =>
    [...entries.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)).map(([, atom]) => atom);
  return hasAccess
    ? {
        reads: sortedAtoms(scan.stateReads),
        writes: sortedAtoms(scan.stateWrites),
      }
    : undefined;
}
//@ chunk-bfnfj4kx.js:51666-52255 placement
/**
 * 把标识符解析为 const 绑定（拒绝参数遮蔽）。
 */
function resolveConstBinding(identifier, { consts, names, climbs, program, refuse }) {
  let declaration = names.shadowOf(identifier);
  if (declaration !== names.writtenShadowOf(identifier))
    throw refuse(
      identifier,
      `"${identifier.name}" is read among the parameters of a function whose body declares that name again: the engine may bind such a read apart from the text, so the value it names cannot be listed. Rename one of the two`,
    );
  let scope = declaration === undefined ? program : declaringScopeOf(declaration, climbs);
  if (typeof scope === "string") return;
  let constEntry = consts.inits(scope).get(identifier.name);
  let rebound = constEntry?.isVar ? consts.rebound(constEntry.id) : undefined;
  if (rebound !== undefined)
    throw refuse(
      rebound.at,
      `the var ${identifier.name}, read for a $.state reference, ` + SCAN_PROBLEM_TEXT[rebound.cause],
    );
  return constEntry === undefined
    ? undefined
    : {
        init: constEntry.init,
        scope,
      };
}
//@ chunk-bfnfj4kx.js:52255-52349 placement
/**
 * 区间内的状态使用
 */
var stateUsesBetween = ({ placed, starts }, scope) =>
  placed
    .slice(import_sortedIndex(starts, scope.start), import_sortedIndex(starts, scope.end))
    .toSorted((useA, useB) => useA.at - useB.at);
//@ chunk-bfnfj4kx.js:52349-52978 placement
/**
 * 读取状态常量的定义。
 */
function readStateConst({ read, binding }, { consts, names, parentOf, refuse }, stateFacts) {
  let { scope } = binding;
  let { name } = read;
  let writtenBinding = names.writtenShadowOf(read);
  let exported = scope.type === "Program" ? consts.exporting.get(name) : undefined;
  if (exported !== undefined) return exported;
  let filtered = (consts.counted(name).owned.get(writtenBinding) ?? []).filter(
    (use) => use.use.start >= scope.start && use.use.start < scope.end,
  );
  if (!filtered.some((use) => use.use === read))
    throw refuse(
      read,
      `the scan lost track of this read of "${name}" and cannot show that every use of the const is a plain read. This is a fault of the scan, not of the module, which is refused rather than passed`,
    );
  let found = filtered.find((use) => !isStateArgument(use.use, parentOf, stateFacts));
  let first = stateUsesBetween(consts.apart(name)(stateFacts), scope).at(0);
  return first !== undefined && (found === undefined || first.at < found.at) ? first.use : found?.use;
}
//@ chunk-bfnfj4kx.js:52978-53560 placement
/**
 * 沿 const 链追踪表达式。
 */
function followConstChain(node, scanned, seen = new Set()) {
  if (node.type === "Identifier") {
    let binding = seen.has(node.name) ? undefined : resolveConstBinding(node, scanned);
    let followed =
      binding === undefined
        ? undefined
        : followConstChain(binding.init, scanned, new Set([...seen, node.name]));
    return binding !== undefined && followed !== undefined
      ? {
          ...followed,
          consts: [
            {
              read: node,
              binding,
            },
            ...followed.consts,
          ],
        }
      : undefined;
  }
  if (node.type !== "ObjectExpression") return;
  let found = {
    consts: [],
  };
  for (let property of node.properties) {
    if (property.type === "SpreadElement") {
      let spread = followConstChain(property.argument, scanned, seen);
      if (spread === undefined) return;
      found = {
        ...found,
        ...spread,
        consts: [...found.consts, ...spread.consts],
      };
      continue;
    }
    let keyName = propertyKeyName(property);
    if (keyName === undefined || property.kind !== "init") return;
    if (keyName === "plugin" || keyName === "key") {
      let staticString = readStaticString(property.value);
      if (staticString === undefined) return;
      found = {
        ...found,
        [keyName]: staticString,
      };
    }
  }
  return found;
}
//@ chunk-bfnfj4kx.js:53560-54187 placement
/**
 * 解析状态键对象（plugin、key）。
 */
function resolveStateKeyObject(node, context, seen = new Set()) {
  if (node.type === "Identifier" && seen.has(node.name)) return;
  let binding = node.type === "Identifier" ? resolveConstBinding(node, context.scanned) : undefined;
  if (binding !== undefined && binding.init.type !== "ObjectExpression" && node.type === "Identifier")
    return resolveStateKeyObject(binding.init, context, new Set([...seen, node.name]));
  if (node.type !== "CallExpression") {
    let followed = followConstChain(node, context.scanned);
    return followed === undefined ? undefined : [followed];
  }
  let helper = context.libraryHelper(node);
  let [argument] = node.arguments;
  if (
    (helper === "atom" || helper === "memberOf") &&
    argument !== undefined &&
    argument.type !== "SpreadElement"
  )
    return resolveStateKeyObject(argument, context, seen);
  if (helper !== "derive" || argument?.type !== "ArrayExpression") return;
  let mapped = argument.elements.map((element) =>
    element !== null && element.type !== "SpreadElement"
      ? resolveStateKeyObject(element, context, seen)
      : undefined,
  );
  return mapped.every((resolved) => resolved !== undefined) ? mapped.flat() : undefined;
}
//@ chunk-bfnfj4kx.js:54187-54739 placement
/**
 * 扫描一次状态 API 调用并记录。
 */
function scanStateCall(call, spelling, { refuse, scanned, libraryHelper }) {
  let [argument] = call.arguments;
  let hasArgument = argument !== undefined && argument.type !== "SpreadElement";
  let [keyObject, ...extra] =
    (hasArgument
      ? resolveStateKeyObject(argument, {
          scanned,
          libraryHelper,
        })
      : undefined) ?? [];
  let { plugin, key, consts = [] } = keyObject ?? {};
  if (!(extra.length === 0 && plugin !== undefined && key !== undefined))
    throw refuse(
      argument ?? call,
      `$.${spelling} takes a reference whose plugin and key are string literals ({ plugin: "p", key: "k" }, written there or in a const of this file; only id may be computed), so the values a module reads and writes can be listed (got ${describeArgument(argument)})`,
    );
  return {
    call,
    spelling,
    named: {
      plugin,
      key,
    },
    consts,
  };
}
//@ chunk-bfnfj4kx.js:54739-57339 placement
/**
 * 扫描 $ 的一次使用（$.noun.event 调用、记录 env/命令/状态）。
 */
function scanDollarUse(
  node,
  position,
  { refuse, parentOf, scanned, record, recordEnv, recordCommand, recordState, libraryHelper, bind, follow },
) {
  let target = node;
  let parent = parentOf(target);
  while (parent?.type === "AwaitExpression") {
    target = parent;
    parent = parentOf(target);
  }
  if (parent === undefined) throw refuse(node, "$ stands alone");
  if (parent.type === "MemberExpression" && parent.object === target) {
    if (parent.computed || parent.optional) throw refuse(parent, "a computed or optional member access on $");
    let property = parent.property;
    if (property.type !== "Identifier") throw refuse(parent, "a member access on $ that is not a name");
    if (property.name === PLUGIN) {
      let pluginMemberParent = parentOf(parent);
      if (
        BaseOutputFormatSchema(pluginMemberParent, parent) &&
        pluginMemberParent.property.type === "Identifier"
      )
        return;
      throw refuse(parent, `$.${PLUGIN} is used other than as $.${PLUGIN}.name or $.${PLUGIN}.root`);
    }
    let nounMember = parentOf(parent);
    if (!BaseOutputFormatSchema(nounMember, parent) || nounMember.property.type !== "Identifier")
      throw refuse(parent, `$.${property.name} is used as a value (a noun of $ bound, passed or read)`);
    let call = parentOf(nounMember);
    if (call?.type !== "CallExpression" || call.callee !== nounMember || call.optional)
      throw refuse(
        nounMember,
        `$.${property.name}.${nounMember.property.name} is used as a value (an event of $ bound, passed or read) instead of called`,
      );
    let apiName = `${property.name}.${nounMember.property.name}`;
    record(apiName);
    if (isEnvApiCall(apiName)) recordEnv(apiName, readLiteralEnvName(call, apiName, refuse));
    if (apiName === COMMAND_REGISTER) recordCommand(call);
    if (isReservedHookName(apiName))
      recordState(
        scanStateCall(call, apiName, {
          refuse,
          scanned,
          libraryHelper,
        }),
      );
    return;
  }
  if (parent.type === "CallExpression" && node.type === "Identifier") {
    let isLibraryCall =
      position === "parameter" &&
      target === node &&
      parent.callee !== target &&
      !parent.optional &&
      parent.callee.type === "Identifier";
    let helper = isLibraryCall ? libraryHelper(parent) : undefined;
    if ((helper === "read" || helper === "update") && parent.arguments[0] === node) return;
    if (helper !== undefined)
      throw refuse(
        node,
        `$ is passed to the state library's ${helper} other than as the first argument of read($, source) or update($, target, fn)`,
      );
    if (isLibraryCall) {
      follow(parent, node);
      return;
    }
  }
  if (position === "parameter")
    throw refuse(
      target,
      `$ itself is ${describeDollarUse(parent, target)} (bound, passed, spread, returned or read)`,
    );
  if (parent.type === "SpreadElement") {
    if (parentOf(parent)?.type === "ObjectExpression") return;
    throw refuse(parent, "the value of next(e) at engine.create is spread other than into an object literal");
  }
  if (
    parent.type === "ReturnStatement" ||
    (parent.type === "ArrowFunctionExpression" && parent.body === target)
  )
    return;
  if (parent.type === "VariableDeclarator" && parent.init === target) {
    let declaration = parentOf(parent);
    if (declaration?.type !== "VariableDeclaration" || declaration.kind !== "const")
      throw refuse(parent, "the value of next(e) at engine.create is bound with let or var (const only)");
    let { id } = parent;
    if (id.type === "Identifier") {
      bind.dollar(id);
      return;
    }
    if (id.type === "ObjectPattern") {
      for (let property of id.properties)
        if (property.type === "RestElement") {
          if (property.argument.type !== "Identifier")
            throw refuse(property, "a rest of next(e) at engine.create that is not a plain name");
          bind.dollar(property.argument);
        } else if (property.value.type === "Identifier" && !property.computed) bind.unread(property.value);
        else
          throw refuse(
            property,
            "a destructuring of next(e) at engine.create with a nested pattern, a default or a computed key",
          );
      return;
    }
    throw refuse(id, "the value of next(e) at engine.create is destructured into an array");
  }
  throw refuse(target, `the value of next(e) at engine.create is ${describeDollarUse(parent, target)}`);
}
//@ chunk-bfnfj4kx.js:57339-57362 placement
var ENGINE_CREATE = "engine.create";
//@ chunk-bfnfj4kx.js:57362-57569 placement
function scanDollarAliases(declared, aliases, context) {
  let { refuse } = context;
  for (let { name, declaration, origin } of aliases) {
    for (let shadowingDecl of findDeclaredIdentifiers(declared, name))
      if (shadowingDecl !== declaration)
        throw refuse(shadowingDecl, `"${name}" (which holds $) is declared again (shadowed)`);
    for (let reference of findReferences(declared, name)) scanDollarUse(reference, origin, context);
  }
}
//@ chunk-bfnfj4kx.js:57569-58240 placement
/**
 * 检查持有 $ 的函数（禁止 arguments、rest 参数）。
 */
function checkFunctionHoldingDollar(declared, paramIndex, context) {
  let { refuse } = context;
  if (declared.type !== "ArrowFunctionExpression")
    for (let reference of findReferences(declared, "arguments", "own"))
      throw refuse(reference, '"arguments" is read inside a function handed $ (it holds $)');
  let last = declared.params.at(-1);
  if (last?.type === "RestElement" && paramIndex >= declared.params.length - 1)
    throw refuse(last, "$ is passed into a rest parameter");
  let param = declared.params[paramIndex];
  if (param === undefined) return;
  if (param.type !== "Identifier")
    throw refuse(param, "the parameter that receives $ is not a plain name (a pattern or a default)");
  scanDollarAliases(
    declared,
    [
      {
        name: param.name,
        declaration: param,
        origin: "parameter",
      },
    ],
    {
      ...context,
      bind: {
        dollar: (identifier) => {
          throw refuse(identifier, "next(e) is bound outside an engine.create hook");
        },
        unread: (identifier) => {
          throw refuse(identifier, "next(e) is bound outside an engine.create hook");
        },
      },
    },
  );
}
//@ chunk-bfnfj4kx.js:58240-58299 placement
/**
 * 找展开参数
 */
var findSpreadArg = (call) => call.arguments.find((argument) => argument.type === "SpreadElement");
//@ chunk-bfnfj4kx.js:58299-59872 placement
/**
 * 扫描把 $ 传给命名函数的调用。
 */
function scanDollarHolders(state, linked = state.linked) {
  let { scan, linked: linked_2 } = state;
  let { scanned } = linked_2;
  let { refuse } = scanned;
  let checkHandoff = (call, targetArgument) => {
    let { callee } = call;
    if (callee.type !== "Identifier")
      throw refuse(callee, "$ is passed to something other than a named function");
    let spreadArg = findSpreadArg(call);
    if (spreadArg !== undefined) throw refuse(spreadArg, "$ is passed in a call with a spread argument");
    if (!(scanned.names.functions.has(callee.name) || scanned.imports.has(callee.name)))
      throw refuse(
        callee,
        `$ is passed to "${callee.name}", which is not a function declared at the top of this file (a function declaration, or a const bound to one), nor one imported from a file of the module's own; $ is followed nowhere else`,
      );
    if (scanned.imports.has(callee.name) && scanned.names.shadowOf(callee) !== undefined)
      throw refuse(
        callee,
        `$ is passed to "${callee.name}", a name declared again over this call: the engine may not bind it to the import of that name. Rename one of the two`,
      );
    let { fn, linked: linked_3 } = resolveFunctionReference(state, callee, "the function handed $");
    let scanned_2 = linked_3.scanned;
    if (fn.type !== "FunctionDeclaration" && (linked_3 !== linked || linked_2 !== linked))
      throw refuse(
        callee,
        `$ is passed to "${callee.name}", a name bound to a function expression, outside the hook's own file: past an import $ is followed only into a function declaration (function ${callee.name}($) { ... }), which a bundle of the module keeps as written`,
      );
    let paramIndex = call.arguments.indexOf(targetArgument);
    let resolved = scan.helpers.get(fn) ?? new Set();
    if (resolved.has(paramIndex)) return;
    resolved.add(paramIndex);
    scan.helpers.set(fn, resolved);
    checkFunctionHoldingDollar(fn, paramIndex, {
      refuse: scanned_2.refuse,
      parentOf: scanned_2.parentOf,
      scanned: scanned_2,
      record: (recursion) => {
        scan.calls.add(recursion);
        scan.via.set(recursion, (scan.via.get(recursion) ?? new Set()).add(callee.name));
      },
      recordTo: (held) => {
        scan.nextTo.add(held);
      },
      recordEnv: (sameFile, linkedOrigin) => {
        envScannerField(scan, sameFile).add(linkedOrigin);
      },
      recordCommand: (linkedFn) => {
        recordNamedCommand(scan, linkedFn);
      },
      recordState: (importedFile) => {
        recordStateCall(scan, importedFile, scanned_2);
      },
      libraryHelper: (calledNow) => stateLibraryCallKind(scanned_2, calledNow),
      follow:
        linked_3 === linked_2
          ? checkHandoff
          : scanDollarHolders(
              {
                scan,
                linked: linked_3,
              },
              linked,
            ),
    });
  };
  return checkHandoff;
}
//@ chunk-bfnfj4kx.js:59872-60525 placement
/**
 * 检查状态常量定义合法。
 */
function checkStateConsts(state) {
  let seenInits = new Set();
  let stateFacts = {
    state: state.stateCalls,
    library: state.libraryCalls,
  };
  for (let { followed, spelling, scanned } of state.stateConsts) {
    let { init } = followed.binding;
    if (seenInits.has(init)) continue;
    seenInits.add(init);
    let stateConst = readStateConst(followed, scanned, stateFacts);
    if (stateConst !== undefined)
      throw scanned.refuse(
        stateConst,
        `the const ${followed.read.name}, read as the reference of a $.${spelling} call, is also written through, handed on or exported here, and const does not freeze: what it holds at the call could not be listed. Use it only as the reference of $.state calls, as a source of the state library's functions imported from "claude-code", and in a spread into an object literal ({ ...${followed.read.name}, id }), or write the reference at the call`,
      );
  }
}
//@ chunk-bfnfj4kx.js:60525-61578 placement
/**
 * 收集库调用（read/update/atom 等）。
 */
function collectLibraryCalls(scan) {
  for (let { scanned } of scan.graph.files.values())
    walkAst(scanned.program, ({ node }) => {
      let isCall = node.type === "CallExpression";
      let helper = isCall ? stateLibraryCallKind(scanned, node) : undefined;
      if (helper === undefined || !isCall) return;
      scan.libraryCalls.set(node, helper);
      let isReadOrUpdate = helper === "read" || helper === "update";
      let keyArg = isReadOrUpdate ? node.arguments[1] : node;
      let resolved =
        keyArg !== undefined && keyArg.type !== "SpreadElement"
          ? resolveStateKeyObject(keyArg, {
              scanned,
              libraryHelper: (call) => stateLibraryCallKind(scanned, call),
            })
          : undefined;
      let all = resolved?.every(({ plugin, key }) => plugin !== undefined && key !== undefined);
      if (resolved === undefined || all !== true)
        throw scanned.refuse(
          keyArg ?? node,
          `the state library's ${helper} takes a source the scan can read: a reference whose plugin and key are string literals, or what atom, memberOf or derive (imported from "claude-code") made of one, written there or in a const of this file, so the values a module reads and writes can be listed`,
        );
      let spelling = helper === "update" ? "state.set" : "state.get";
      for (let { plugin = "", key = "", consts } of resolved) {
        let atomKey = `${plugin}\x00${key}`;
        scan.stateReads.set(atomKey, {
          plugin,
          key,
        });
        if (helper === "update")
          scan.stateWrites.set(atomKey, {
            plugin,
            key,
          });
        for (let followed of consts)
          scan.stateConsts.add({
            followed,
            spelling,
            scanned,
          });
      }
      if (isReadOrUpdate) scan.calls.add("state.get");
      if (helper === "update") scan.calls.add("state.set");
    });
}
//@ chunk-bfnfj4kx.js:61578-62007 placement
/**
 * 检查调用必须作为语句或返回值使用。
 */
function checkCallStatement({ call, scanned, what, holder }) {
  let { endOf, functionOf } = scanned.climbs;
  let end = endOf(call);
  if (end === undefined) return;
  let { value: valueNode, parent } = end;
  if (!(
    parent.type === "ExpressionStatement" ||
    ((parent.type === "ReturnStatement" ||
      (parent.type === "ArrowFunctionExpression" && parent.body === valueNode)) &&
      functionOf(valueNode) === holder)
  ))
    throw scanned.refuse(
      valueNode,
      `the value of ${what} is kept (assigned, passed, read, or returned from a nested function); it takes .catch(handler) where it is called and nothing else`,
    );
}
//@ chunk-bfnfj4kx.js:62007-62119 placement
function functionNameInfo(fn) {
  return {
    argumentsRead: fn.type === "ArrowFunctionExpression" ? [] : findReferences(fn, "arguments", "own"),
    names: collectIdentifierUses(fn),
  };
}
//@ chunk-bfnfj4kx.js:62119-62230 placement
function holderNamesOf(scan, fn) {
  let cached = scan.holderNames.get(fn);
  if (cached !== undefined) return cached;
  let info = functionNameInfo(fn);
  scan.holderNames.set(fn, info);
  return info;
}
//@ chunk-bfnfj4kx.js:62230-63114 placement
/**
 * 解析注册的 hook 函数（函数表达式或标识符）。
 */
function resolveHookFunction(state, { fn, what, event, engineCreate }) {
  let { scan, linked } = state;
  let isLiteralFn = fn.type === "FunctionExpression" || fn.type === "ArrowFunctionExpression";
  let isNamedFn = fn.type === "Identifier";
  let resolved = isLiteralFn
    ? {
        fn,
        linked,
      }
    : isNamedFn
      ? resolveFunctionReference(state, fn, what)
      : undefined;
  if (resolved === undefined)
    throw linked.scanned.refuse(fn, `${what} is not a function literal or the name of one`);
  let isAsyncGenerator = resolved.fn.async === true && resolved.fn.generator === true;
  let isStreaming = isStreamingHookEvent(event);
  if (isStreaming && !isAsyncGenerator)
    throw linked.scanned.refuse(
      fn,
      `${what} on "${event}" is not an async generator: ${event} streams, so it takes async function* ($, e, next) { ... }, which yields the chunks and returns the result`,
    );
  if (!isStreaming && isAsyncGenerator)
    throw linked.scanned.refuse(
      fn,
      `${what} on "${event}" is an async generator: only a streaming event named as itself (${STREAMING_EVENTS.join(", ")}) takes one; this pattern takes ($, e, next) => result`,
    );
  scan.registered.set(resolved.fn, {
    linked: resolved.linked,
    patterns: new Set(scan.registered.get(resolved.fn)?.patterns).add(event),
    engineCreate: scan.registered.get(resolved.fn)?.engineCreate === true || engineCreate,
  });
}
//@ chunk-bfnfj4kx.js:63114-64260 placement
/**
 * 扫描 on("<event>") 调用的使用方式。
 */
function scanOnCall(state, { call, event, onName, holder }) {
  let { scanned } = state.linked;
  let { parentOf, refuse } = scanned;
  let member = parentOf(call);
  let registrationText = `${onName}("${event}")`;
  if (member?.type !== "MemberExpression" || member.object !== call) {
    checkCallStatement({
      call,
      scanned,
      what: registrationText,
      holder,
    });
    return;
  }
  if (!(
    !member.computed &&
    !member.optional &&
    member.property.type === "Identifier" &&
    member.property.name === "catch"
  ))
    throw refuse(
      member,
      `${registrationText} is read for something other than .catch; a registration has .catch(handler) and nothing else`,
    );
  let catchCall = parentOf(member);
  if (!(catchCall?.type === "CallExpression" && catchCall.callee === member && !catchCall.optional))
    throw refuse(member, `${registrationText}.catch is read without being called`);
  if (event === ENGINE_CREATE)
    throw refuse(
      catchCall,
      `${registrationText}.catch(): an engine.create hook has no budget and its failure fails the load; .catch does not apply`,
    );
  let spreadArg = findSpreadArg(catchCall);
  if (spreadArg !== undefined)
    throw refuse(spreadArg, `${registrationText}.catch() is called with a spread argument`);
  let [handler, ...extraArgs] = catchCall.arguments;
  if (handler === undefined || extraArgs.length > 0)
    throw refuse(
      catchCall,
      `${registrationText}.catch() takes (handler); got ${catchCall.arguments.length} argument(s)`,
    );
  resolveHookFunction(state, {
    fn: handler,
    what: "the .catch handler",
    event,
    engineCreate: false,
  });
  let afterCatch = parentOf(catchCall);
  if (afterCatch?.type === "MemberExpression" && afterCatch.object === catchCall)
    throw refuse(
      afterCatch,
      `${registrationText}.catch(...) is followed by another member; a registration takes one .catch`,
    );
  checkCallStatement({
    call: catchCall,
    scanned,
    what: `${registrationText}.catch()`,
    holder,
  });
}
//@ chunk-bfnfj4kx.js:64260-64915 placement
/**
 * 解析 on() 参数（事件、匹配器、hook）。
 */
function parseOnArguments(call, refuse, onName) {
  let spreadArg = findSpreadArg(call);
  if (spreadArg !== undefined) throw refuse(spreadArg, `${onName}() is called with a spread argument`);
  let [eventArg, ...restArgs] = call.arguments;
  if (eventArg === undefined || restArgs.length === 0 || restArgs.length > 2)
    throw refuse(
      call,
      `${onName}() takes (event, hook) or (event, matcher, hook); got ${call.arguments.length} argument(s)`,
    );
  let pattern = readStaticString(eventArg);
  if (pattern === undefined)
    throw refuse(eventArg, `the event name passed to ${onName}() is not a string literal`);
  let patternProblem = eventPatternError(pattern);
  if (patternProblem !== undefined) throw refuse(eventArg, patternProblem);
  let isKnownEvent = isEventPattern(pattern) || isHookEvent(pattern) || isPluginDefinedEvent(pattern);
  let patternName = nameOfEventPattern(pattern);
  let isUnknownPattern =
    patternName !== undefined && !isHookEvent(patternName) && !isPluginDefinedEvent(patternName);
  if (!isKnownEvent || isUnknownPattern)
    throw refuse(eventArg, `"${patternName ?? pattern}" is not an event`);
  let last = restArgs.at(-1);
  if (last === undefined) throw refuse(call, `${onName}() takes (event, hook); got no hook`);
  return {
    event: pattern,
    hook: last,
    matcher: restArgs.length === 2 ? restArgs[0] : undefined,
  };
}
//@ chunk-bfnfj4kx.js:64915-65464 placement
/**
 * 扫描一次事件注册。
 */
function scanRegistration(context, registration) {
  let { call, onName, holder, position } = registration;
  let { scan, linked } = context;
  let { scanned } = linked;
  let { event, hook, matcher } = parseOnArguments(call, scanned.refuse, onName);
  let hasMatcher = matcher !== undefined;
  let isPatternEvent = isEventPattern(event);
  let firstSeenAt = scan.unmatched.get(event);
  if (firstSeenAt !== undefined && (!hasMatcher || isPatternEvent))
    throw scanned.refuse(
      call,
      `${onName}("${event}") is registered twice${hasMatcher ? "" : " without a matcher"}; the first is at ${firstSeenAt}`,
    );
  if (!hasMatcher || isPatternEvent)
    scan.unmatched.set(event, `${scanned.file}:${call.loc?.start.line ?? "unknown line"}`);
  scan.hooks.add(event);
  scan.registrations.set(call, {
    event,
    matcher,
    linked,
    holder,
    position,
  });
  resolveHookFunction(context, {
    fn: hook,
    what: "the hook",
    event,
    engineCreate: event === ENGINE_CREATE,
  });
  scanOnCall(context, {
    ...registration,
    event,
  });
}
//@ chunk-bfnfj4kx.js:65464-66874 placement
/**
 * 扫描持有 $ 的函数体。
 */
function scanHolder(state, holder, paramIndex) {
  let { scan, linked } = state;
  let seen = scan.holders.get(holder) ?? new Set();
  if (seen.has(paramIndex)) return;
  seen.add(paramIndex);
  scan.holders.set(holder, seen);
  scan.holderFiles.set(holder, linked);
  let { scanned } = linked;
  let { refuse, parentOf } = scanned;
  let names = holderNamesOf(scan, holder);
  for (let argumentsRead of names.argumentsRead)
    throw refuse(argumentsRead, '"arguments" is read inside a function that holds on');
  let param = holder.params[paramIndex];
  if (param === undefined) {
    let last = holder.params.at(-1);
    if (last?.type === "RestElement") throw refuse(last, "on is passed into a rest parameter");
    return;
  }
  if (param.type !== "Identifier") throw refuse(param, "the parameter that receives on is not a plain name");
  let onName = param.name;
  for (let declared of names.names.declared.get(onName) ?? [])
    if (declared !== param) throw refuse(declared, `"${onName}" is declared again (shadowed)`);
  for (let use of names.names.read.get(onName) ?? []) {
    let parent = parentOf(use);
    if (parent?.type !== "CallExpression" || parent.optional)
      throw refuse(
        use,
        `"${onName}" is used other than as a call or an argument to a function of the module's own (bound, spread or read)`,
      );
    if (parent.callee === use) {
      scanRegistration(state, {
        call: parent,
        onName,
        holder,
        position: paramIndex,
      });
      continue;
    }
    if (parent.callee.type !== "Identifier")
      throw refuse(
        parent.callee,
        `"${onName}" is passed to something other than a function named at the top of this file or imported from one of the module's own files`,
      );
    let spreadArg = findSpreadArg(parent);
    if (spreadArg !== undefined)
      throw refuse(spreadArg, `"${onName}" is passed in a call with a spread argument`);
    checkCallStatement({
      call: parent,
      scanned,
      what: `${parent.callee.name}(${onName})`,
      holder,
    });
    let functionReference = resolveFunctionReference(state, parent.callee, "the callee");
    let paramIndex_2 = parent.arguments.indexOf(use);
    scan.holderCalls.add({
      call: parent,
      callee: functionReference.fn,
      position: paramIndex_2,
      caller: holder,
      callerPosition: paramIndex,
    });
    scanHolder(
      {
        scan,
        linked: functionReference.linked,
      },
      functionReference.fn,
      paramIndex_2,
    );
  }
}
//@ chunk-bfnfj4kx.js:66874-67482 placement
/**
 * 创建扫描状态（hooks、注册、调用、env 读写等集合）。
 */
var createScanState = (graph, pluginName, register) => ({
  graph,
  pluginName,
  register,
  hooks: new Set(),
  registrations: new Map(),
  holderCalls: new Set(),
  holderFiles: new Map(),
  unmatched: new Map(),
  calls: new Set(),
  nextTo: new Set(),
  toUserOn: new Set(),
  envReads: new Set(),
  envWrites: new Set(),
  registeredCommands: new Set(),
  stateReads: new Map(),
  stateWrites: new Map(),
  stateCalls: new Set(),
  libraryCalls: new Map(),
  stateConsts: new Set(),
  direct: new Set(),
  via: new Map(),
  helpers: new Map(),
  exportsRead: new Map(),
  exportsOpen: new Map(),
  exportsUnderWay: {
    depth: 0,
    lowest: 0,
  },
  exportsHeld: new Map(),
  exportSteps: {
    taken: 0,
  },
  ownExports: new Map(),
  exportTables: new Map(),
  registered: new Map(),
  holders: new Map(),
  holderNames: new Map(),
});
//@ chunk-bfnfj4kx.js:67482-67582 placement
function findExportDeclaration(linked, name) {
  for (let statement of linked.scanned.program.body) {
    let found = checkExportDeclaration(linked, statement, name);
    if (found !== undefined) return found;
  }
  return;
}
//@ chunk-bfnfj4kx.js:67582-68023 placement
/**
 * 找到导出的 register 函数。
 */
function findExportedRegister(linked, name, hint = "") {
  let exportDeclaration = findExportDeclaration(linked, name);
  if (exportDeclaration !== undefined) return exportDeclaration;
  let { program, refuse } = linked.scanned;
  let label = name === "default" ? "the default export" : name;
  let reExportSpecifier = findReExportSpecifier(linked, name);
  if (reExportSpecifier !== undefined)
    throw refuse(reExportSpecifier.specifier, `${label} is re-exported from another file`);
  let found = program.body.find((statement) => statement.type === "ExportAllDeclaration");
  if (found !== undefined)
    throw refuse(
      found,
      `${label} is not exported here by name; what \`export *\` re-exports from another file is not followed`,
    );
  throw refuse(undefined, `no export named ${label}${hint}`);
}
//@ chunk-bfnfj4kx.js:68023-68101 placement
/**
 * 必须导出 register
 */
var requireExportedRegister = (linked) =>
  findExportedRegister(linked, "register", " (export function register(on, options) {...})");
//@ chunk-bfnfj4kx.js:68101-68213 placement
function scanFromEntry(graph, pluginName) {
  let entryFile = requireLinkedFile(
    {
      graph,
      pluginName,
    },
    graph.entry,
  );
  let registerExport = requireExportedRegister(entryFile);
  let scanState = createScanState(graph, pluginName, registerExport);
  scanHolder(
    {
      scan: scanState,
      linked: entryFile,
    },
    registerExport,
    0,
  );
  return scanState;
}
//@ chunk-bfnfj4kx.js:68213-68718 placement
/**
 * 检查 next 参数的解构形式。
 */
function checkNextDestructure(pattern, { refuse }) {
  if (pattern.type !== "ObjectPattern")
    throw refuse(pattern, "next is destructured other than into an object pattern of plain keys");
  for (let property of pattern.properties) {
    if (property.type === "RestElement") throw refuse(property, "a rest of next (it holds next.to)");
    if (!(!property.computed && property.key.type === "Identifier"))
      throw refuse(property, "a computed or quoted key destructured from next");
    if (property.key.type === "Identifier" && property.key.name === "to")
      throw refuse(
        property,
        `next.to is destructured from next; it is reached only as next.to(e, "<tier>") on the hook's own next`,
      );
  }
}
//@ chunk-bfnfj4kx.js:68718-69543 placement
/**
 * 检查 next.to 调用。
 */
function checkNextTo(member, { refuse, parentOf, recordTo }) {
  if (member.optional) throw refuse(member, "next.to is reached through optional chaining");
  let parent = parentOf(member);
  if (!(parent?.type === "CallExpression" && parent.callee === member && !parent.optional))
    throw refuse(
      member,
      'next.to is used as a value (bound, passed or read) instead of called as next.to(e, "<tier>")',
    );
  let [valueArg, tierArg, extraArg] = parent.arguments;
  if (valueArg === undefined || valueArg.type === "SpreadElement")
    throw refuse(parent, 'next.to is called without (e, "<tier>") or with a spread');
  if (extraArg !== undefined) throw refuse(extraArg, 'next.to is called with more than (e, "<tier>")');
  if (!(tierArg?.type === "Literal" && typeof tierArg.value === "string"))
    throw refuse(
      tierArg ?? parent,
      "next.to names its tier other than as a string literal (a variable, a template or an expression)",
    );
  let tier = tierArg.value;
  if (!isAbovePrepend(tier))
    throw refuse(
      tierArg,
      `next.to names "${String(tier)}", which is not a tier a dispatch continues at (user, append, builtin, core)`,
    );
  recordTo(tier);
  return parent;
}
//@ chunk-bfnfj4kx.js:69543-70824 placement
/**
 * 扫描 hook 的 next 参数用法。
 */
function scanNextParam({ fn, next: nextParam, engineCreate }, context) {
  let { refuse, parentOf } = context;
  if (nextParam.type !== "Identifier") {
    if (engineCreate)
      throw refuse(nextParam, "the third parameter of an engine.create hook (next) is not a plain name");
    checkNextDestructure(nextParam, context);
    return;
  }
  for (let declared of findDeclaredIdentifiers(fn, nextParam.name))
    if (declared !== nextParam)
      throw refuse(
        declared,
        `"${nextParam.name}" (the continuation) is declared again (shadowed); rename the inner binding`,
      );
  for (let reference of findReferences(fn, nextParam.name)) {
    let parent = parentOf(reference);
    if (parent?.type === "CallExpression" && parent.callee === reference && !parent.optional) {
      if (engineCreate) scanDollarUse(parent, "next", context);
      continue;
    }
    if (parent?.type === "MemberExpression" && parent.object === reference) {
      if (parent.computed) {
        if (
          parent.property.type === "Literal" &&
          typeof parent.property.value === "string" &&
          parent.property.value !== "to"
        )
          continue;
        throw refuse(parent, `a computed member access on "${nextParam.name}" (it may reach next.to)`);
      }
      if (parent.property.type === "Identifier" && parent.property.name === "to") {
        let toCall = checkNextTo(parent, context);
        if (engineCreate) scanDollarUse(toCall, "next", context);
      }
      continue;
    }
    if (engineCreate)
      throw refuse(
        reference,
        `"${nextParam.name}" is passed on or bound inside an engine.create hook (its value is $)`,
      );
    if (parent?.type === "VariableDeclarator" && parent.init === reference) {
      if (parent.id.type === "Identifier")
        throw refuse(
          parent,
          `"${nextParam.name}" (the hook's next) is bound to another name; next.to is reached only on the hook's own next`,
        );
      checkNextDestructure(parent.id, context);
      continue;
    }
    if (parent?.type === "AssignmentExpression" && parent.right === reference)
      throw refuse(
        parent,
        `"${nextParam.name}" (the hook's next) is assigned to another name; next.to is reached only on the hook's own next`,
      );
  }
}
//@ chunk-bfnfj4kx.js:70824-71804 placement
/**
 * 扫描 hook 函数参数（e、$、next）。
 */
function scanHookParams(fn, engineCreate, context) {
  let { refuse } = context;
  let [dollarParam, eventParam, nextParam] = fn.params;
  if (fn.type !== "ArrowFunctionExpression")
    for (let reference of findReferences(fn, "arguments", "own"))
      throw refuse(reference, '"arguments" is read inside a hook (it holds $)');
  let dollarNames = [];
  if (dollarParam !== undefined) {
    if (dollarParam.type !== "Identifier")
      throw refuse(
        dollarParam,
        "the first parameter of a hook ($) is not a plain name (a pattern, a rest or a default)",
      );
    dollarNames.push({
      name: dollarParam.name,
      declaration: dollarParam,
      origin: "parameter",
    });
  }
  for (let param of [dollarParam, eventParam, nextParam])
    if (param?.type === "RestElement")
      throw refuse(param, "a hook takes $, e or next into a rest parameter (it would hold next)");
  for (let param of fn.params)
    walkAst(param, ({ node }) => {
      if (node.type === "AssignmentPattern") throw refuse(node, "a parameter of a hook has a default value");
    });
  let innerContext = {
    ...context,
    bind: {
      dollar: (identifier) => {
        dollarNames.push({
          name: identifier.name,
          declaration: identifier,
          origin: "next",
        });
      },
      unread: (identifier) => {
        for (let reference of findReferences(fn, identifier.name))
          throw refuse(
            reference,
            `"${identifier.name}", destructured from $ at engine.create, is read (a noun bound to a name); leave it unread or call it as $.noun.event(...)`,
          );
      },
    },
  };
  if (nextParam !== undefined)
    scanNextParam(
      {
        fn,
        next: nextParam,
        engineCreate,
      },
      innerContext,
    );
  scanDollarAliases(fn, dollarNames, innerContext);
}
//@ chunk-bfnfj4kx.js:71804-72289 placement
/**
 * 扫描全部注册的 hooks。
 */
function scanRegistrations(graph, pluginName) {
  let scan = scanFromEntry(graph, pluginName);
  for (let [fn, { linked, patterns, engineCreate }] of scan.registered)
    scanHookParams(fn, engineCreate, {
      refuse: linked.scanned.refuse,
      parentOf: linked.scanned.parentOf,
      scanned: linked.scanned,
      record: (apiName) => {
        scan.calls.add(apiName);
        scan.direct.add(apiName);
      },
      recordTo: (tier) => {
        scan.nextTo.add(tier);
        if (tier === "user") patterns.forEach((pattern) => scan.toUserOn.add(pattern));
      },
      recordEnv: (apiName, name) => {
        envScannerField(scan, apiName).add(name);
      },
      recordCommand: (call) => {
        recordNamedCommand(scan, call);
      },
      recordState: (stateCall) => {
        recordStateCall(scan, stateCall, linked.scanned);
      },
      libraryHelper: (call) => stateLibraryCallKind(linked.scanned, call),
      follow: scanDollarHolders({
        scan,
        linked,
      }),
    });
  collectLibraryCalls(scan);
  checkStateConsts(scan);
  return scan;
}
//@ chunk-bfnfj4kx.js:72289-72742 placement
/**
 * 描述表达式类型（用于报错）。
 */
function describeExpression(node) {
  switch (node.type) {
    case "Identifier":
      return `the variable ${node.name}`;
    case "TemplateLiteral":
      return "a template string";
    case "CallExpression":
      return "a call";
    case "ConditionalExpression":
      return "a conditional";
    case "MemberExpression":
      return "a member read";
    case "BinaryExpression":
      return "a concatenation";
    case "SpreadElement":
      return "a spread";
    case "Literal":
      return "regex" in node ? "a RegExp" : `the literal ${node.raw ?? String(node.value)}`;
    default:
      return `a ${node.type}`;
  }
}
//@ chunk-bfnfj4kx.js:72742-72977 placement
var TELEMETRY_TO_HINT = ({ onName, event }) =>
  '"to" is a string literal, or a list of them, from ' +
  CORE_SOURCES.map((source) => `"${source}"`).join(", ") +
  `, written in the call, so the streams a module's hooks stand on can be listed: ${onName}("${event}", { to: "collector" }, hook)`;
//@ chunk-bfnfj4kx.js:72977-73426 placement
/**
 * 读取 on() 的目的地列表。
 */
function readDestinations(value, facts) {
  let { onName, event, refuse } = facts;
  return (value.type === "ArrayExpression" ? value.elements : [value]).map((entry) => {
    if (entry === null)
      throw refuse(
        value,
        `${onName}("${event}") names its destinations as a list with a hole; ${TELEMETRY_TO_HINT(facts)}`,
      );
    let literal = entry.type === "Literal" ? entry.value : undefined;
    if (typeof literal !== "string")
      throw refuse(
        entry,
        `${onName}("${event}") names its destination as ${describeExpression(entry)}; ${TELEMETRY_TO_HINT(facts)}`,
      );
    if (!isCoreSource(literal))
      throw refuse(
        entry,
        `${onName}("${event}") names the destination "${literal}", which is no telemetry stream; ${TELEMETRY_TO_HINT(facts)}`,
      );
    return literal;
  });
}
//@ chunk-bfnfj4kx.js:73426-74234 placement
/**
 * 读取 on() 的匹配器参数。
 */
function readMatcher(matcher, facts) {
  let { onName, event, refuse } = facts;
  if (matcher === undefined) return CORE_SOURCES;
  switch (matcher.type) {
    case "ObjectExpression": {
      let found = matcher.properties.find(
        (property) => property.type === "SpreadElement" || property.computed || property.kind !== "init",
      );
      if (found !== undefined)
        throw refuse(
          found,
          `${onName}("${event}") has a matcher with a spread, a computed key or an accessor, which may set "to" to anything; ` +
            TELEMETRY_TO_HINT(facts),
        );
      let [toProp, secondTo] = matcher.properties.filter((property) => isNamedProperty(property, "to"));
      if (secondTo !== undefined)
        throw refuse(
          secondTo,
          `${onName}("${event}") names "to" twice in one matcher; ` + TELEMETRY_TO_HINT(facts),
        );
      return toProp?.type === "Property" ? readDestinations(toProp.value, facts) : CORE_SOURCES;
    }
    case "ArrayExpression":
      return matcher.elements.flatMap((element) => {
        if (element === null || element.type === "SpreadElement")
          throw refuse(
            element ?? matcher,
            `${onName}("${event}") has a list of matchers with a hole or a spread; ${TELEMETRY_TO_HINT(facts)}`,
          );
        return readMatcher(element, facts);
      });
    default:
      throw refuse(
        matcher,
        `${onName}("${event}") takes its matcher as ${describeExpression(matcher)}, not an object written in the call; ${TELEMETRY_TO_HINT(facts)}`,
      );
  }
}
//@ chunk-bfnfj4kx.js:74234-74516 placement
/**
 * 列出模块中遥测钩子所站的流（anthropic/collector）。
 */
function collectTelemetryDestinations(scan) {
  let filtered = [...scan.registrations].filter(([, registration]) => isTelemetryEvent(registration.event));
  if (filtered.length === 0) return;
  let destinations = new Set(
    filtered.flatMap(([call, { event, matcher, linked }]) =>
      readMatcher(matcher, {
        onName: call.callee.type === "Identifier" ? call.callee.name : "on",
        event,
        refuse: linked.scanned.refuse,
      }),
    ),
  );
  return CORE_SOURCES.filter((source) => destinations.has(source));
}
//@ chunk-bfnfj4kx.js:74516-75019 placement
/**
 * 扫描整个 hooks 模块，产出 hooks、calls、nextTo、env、状态等清单。
 */
function scanHooksModule(graph, pluginName) {
  let scan = scanRegistrations(graph, pluginName);
  let filtered = tiersBeneath("prepend").filter((tier) => scan.nextTo.has(tier));
  let hasEnv = scan.envReads.size > 0 || scan.envWrites.size > 0;
  let clientModules = collectClientModules(graph);
  let state = summarizeStateAccess(scan);
  let runCommands = collectRunCommands(scan);
  let telemetryDestinations = collectTelemetryDestinations(scan);
  return {
    hooks: Array.from(scan.hooks),
    calls: Array.from(scan.calls).sort(),
    ...(runCommands !== undefined && {
      runCommands,
    }),
    ...(filtered.length === 0
      ? {}
      : {
          nextTo: filtered,
        }),
    ...(scan.toUserOn.size > 0 && {
      toUserOn: Array.from(scan.toUserOn),
    }),
    ...(telemetryDestinations !== undefined && {
      telemetry: telemetryDestinations,
    }),
    ...(hasEnv && {
      env: {
        reads: Array.from(scan.envReads).sort(),
        writes: Array.from(scan.envWrites).sort(),
      },
    }),
    ...(state !== undefined && {
      state,
    }),
    ...(clientModules.length > 0 && {
      clients: clientModules,
    }),
  };
}
//@ chunk-bfnfj4kx.js:75019-75119 placement
/**
 * 按模块图摘要缓存 hooks 模块扫描结果。
 */
function scanHooksModuleCached(graph, pluginName) {
  let digest = moduleGraphDigest(graph);
  let cached = importResolverCache.get(digest);
  if (cached !== undefined) return cached;
  let scan = scanHooksModule(graph, pluginName);
  importResolverCache.set(digest, scan);
  return scan;
}
//@ chunk-bfnfj4kx.js:75119-75173 placement
/**
 * 打包模块信息
 */
var bundledModuleInfo = (moduleName, builtin, pluginName) => ({
  module: moduleName,
  scan: readBundledScan(builtin, pluginName),
  files: readBundledFiles(builtin),
});
export { bundledModuleInfo, scanRegistrations, scanHooksModuleCached };
