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
import { wo } from "../../../vendor/lodash-es/_inlinedHelpers.js";
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

//@ chunk-bfnfj4kx.js:39347-39545 placement = createEmptyToolCounts (0.474)
/**
 * 有 stateReads/stateWrites 时按键排序输出 {reads, writes}，否则 undefined。旧版名 createEmptyToolCounts 为错配。
 */
function summarizeStateAccess(e) {
  let o = e.stateReads.size > 0 || e.stateWrites.size > 0;
  let t = (r) => [...r.entries()].sort(([n], [s]) => (n < s ? -1 : n > s ? 1 : 0)).map(([, n]) => n);
  return o
    ? {
        reads: t(e.stateReads),
        writes: t(e.stateWrites),
      }
    : undefined;
}
//@ chunk-bfnfj4kx.js:51666-52255 placement
/**
 * 把标识符解析为 const 绑定（拒绝参数遮蔽）。
 */
function resolveConstBinding(e, { consts, names, climbs, program, refuse }) {
  let p = names.shadowOf(e);
  if (p !== names.writtenShadowOf(e))
    throw refuse(
      e,
      `"${e.name}" is read among the parameters of a function whose body declares that name again: the engine may bind such a read apart from the text, so the value it names cannot be listed. Rename one of the two`,
    );
  let i = p === undefined ? program : declaringScopeOf(p, climbs);
  if (typeof i === "string") return;
  let a = consts.inits(i).get(e.name);
  let f = a?.isVar ? consts.rebound(a.id) : undefined;
  if (f !== undefined)
    throw refuse(f.at, `the var ${e.name}, read for a $.state reference, ` + SCAN_PROBLEM_TEXT[f.cause]);
  return a === undefined
    ? undefined
    : {
        init: a.init,
        scope: i,
      };
}
//@ chunk-bfnfj4kx.js:52255-52349 placement
/**
 * 区间内的状态使用
 */
var stateUsesBetween = ({ placed, starts }, scope) =>
  placed.slice(wo(starts, scope.start), wo(starts, scope.end)).toSorted((r, n) => r.at - n.at);
//@ chunk-bfnfj4kx.js:52349-52978 placement
/**
 * 读取状态常量的定义。
 */
function readStateConst({ read, binding }, { consts, names, parentOf, refuse }, p) {
  let { scope } = binding;
  let { name: a } = read;
  let f = names.writtenShadowOf(read);
  let u = scope.type === "Program" ? consts.exporting.get(a) : undefined;
  if (u !== undefined) return u;
  let filtered = (consts.counted(a).owned.get(f) ?? []).filter(
    (k) => k.use.start >= scope.start && k.use.start < scope.end,
  );
  if (!filtered.some((k) => k.use === read))
    throw refuse(
      read,
      `the scan lost track of this read of "${a}" and cannot show that every use of the const is a plain read. This is a fault of the scan, not of the module, which is refused rather than passed`,
    );
  let found = filtered.find((k) => !isStateArgument(k.use, parentOf, p));
  let first = stateUsesBetween(consts.apart(a)(p), scope).at(0);
  return first !== undefined && (found === undefined || first.at < found.at) ? first.use : found?.use;
}
//@ chunk-bfnfj4kx.js:52978-53560 placement
/**
 * 沿 const 链追踪表达式。
 */
function followConstChain(e, o, t = new Set()) {
  if (e.type === "Identifier") {
    let n = t.has(e.name) ? undefined : resolveConstBinding(e, o);
    let s = n === undefined ? undefined : followConstChain(n.init, o, new Set([...t, e.name]));
    return n !== undefined && s !== undefined
      ? {
          ...s,
          consts: [
            {
              read: e,
              binding: n,
            },
            ...s.consts,
          ],
        }
      : undefined;
  }
  if (e.type !== "ObjectExpression") return;
  let r = {
    consts: [],
  };
  for (let property of e.properties) {
    if (property.type === "SpreadElement") {
      let p = followConstChain(property.argument, o, t);
      if (p === undefined) return;
      r = {
        ...r,
        ...p,
        consts: [...r.consts, ...p.consts],
      };
      continue;
    }
    let s = propertyKeyName(property);
    if (s === undefined || property.kind !== "init") return;
    if (s === "plugin" || s === "key") {
      let staticString = readStaticString(property.value);
      if (staticString === undefined) return;
      r = {
        ...r,
        [s]: staticString,
      };
    }
  }
  return r;
}
//@ chunk-bfnfj4kx.js:53560-54187 placement
/**
 * 解析状态键对象（plugin、key）。
 */
function resolveStateKeyObject(e, o, t = new Set()) {
  if (e.type === "Identifier" && t.has(e.name)) return;
  let n = e.type === "Identifier" ? resolveConstBinding(e, o.scanned) : undefined;
  if (n !== undefined && n.init.type !== "ObjectExpression" && e.type === "Identifier")
    return resolveStateKeyObject(n.init, o, new Set([...t, e.name]));
  if (e.type !== "CallExpression") {
    let x = followConstChain(e, o.scanned);
    return x === undefined ? undefined : [x];
  }
  let p = o.libraryHelper(e);
  let [i] = e.arguments;
  if ((p === "atom" || p === "memberOf") && i !== undefined && i.type !== "SpreadElement")
    return resolveStateKeyObject(i, o, t);
  if (p !== "derive" || i?.type !== "ArrayExpression") return;
  let mapped = i.elements.map((element) =>
    element !== null && element.type !== "SpreadElement" ? resolveStateKeyObject(element, o, t) : undefined,
  );
  return mapped.every((x) => x !== undefined) ? mapped.flat() : undefined;
}
//@ chunk-bfnfj4kx.js:54187-54739 placement
/**
 * 扫描一次状态 API 调用并记录。
 */
function scanStateCall(e, o, { refuse, scanned, libraryHelper }) {
  let [s] = e.arguments;
  let p = s !== undefined && s.type !== "SpreadElement";
  let [i, ...a] =
    (p
      ? resolveStateKeyObject(s, {
          scanned,
          libraryHelper,
        })
      : undefined) ?? [];
  let { plugin, key, consts = [] } = i ?? {};
  if (!(a.length === 0 && plugin !== undefined && key !== undefined))
    throw refuse(
      s ?? e,
      `$.${o} takes a reference whose plugin and key are string literals ({ plugin: "p", key: "k" }, written there or in a const of this file; only id may be computed), so the values a module reads and writes can be listed (got ${describeArgument(s)})`,
    );
  return {
    call: e,
    spelling: o,
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
  e,
  o,
  {
    refuse,
    parentOf,
    scanned,
    record,
    recordEnv,
    recordCommand,
    recordState,
    libraryHelper,
    bind: u,
    follow,
  },
) {
  let y = e;
  let c = parentOf(y);
  while (c?.type === "AwaitExpression") {
    y = c;
    c = parentOf(y);
  }
  if (c === undefined) throw refuse(e, "$ stands alone");
  if (c.type === "MemberExpression" && c.object === y) {
    if (c.computed || c.optional) throw refuse(c, "a computed or optional member access on $");
    let property = c.property;
    if (property.type !== "Identifier") throw refuse(c, "a member access on $ that is not a name");
    if (property.name === PLUGIN) {
      let te = parentOf(c);
      if (BaseOutputFormatSchema(te, c) && te.property.type === "Identifier") return;
      throw refuse(c, `$.${PLUGIN} is used other than as $.${PLUGIN}.name or $.${PLUGIN}.root`);
    }
    let k = parentOf(c);
    if (!BaseOutputFormatSchema(k, c) || k.property.type !== "Identifier")
      throw refuse(c, `$.${property.name} is used as a value (a noun of $ bound, passed or read)`);
    let j = parentOf(k);
    if (j?.type !== "CallExpression" || j.callee !== k || j.optional)
      throw refuse(
        k,
        `$.${property.name}.${k.property.name} is used as a value (an event of $ bound, passed or read) instead of called`,
      );
    let b = `${property.name}.${k.property.name}`;
    record(b);
    if (isEnvApiCall(b)) recordEnv(b, readLiteralEnvName(j, b, refuse));
    if (b === COMMAND_REGISTER) recordCommand(j);
    if (isReservedHookName(b))
      recordState(
        scanStateCall(j, b, {
          refuse,
          scanned,
          libraryHelper,
        }),
      );
    return;
  }
  if (c.type === "CallExpression" && e.type === "Identifier") {
    let h = o === "parameter" && y === e && c.callee !== y && !c.optional && c.callee.type === "Identifier";
    let k = h ? libraryHelper(c) : undefined;
    if ((k === "read" || k === "update") && c.arguments[0] === e) return;
    if (k !== undefined)
      throw refuse(
        e,
        `$ is passed to the state library's ${k} other than as the first argument of read($, source) or update($, target, fn)`,
      );
    if (h) {
      follow(c, e);
      return;
    }
  }
  if (o === "parameter")
    throw refuse(y, `$ itself is ${describeDollarUse(c, y)} (bound, passed, spread, returned or read)`);
  if (c.type === "SpreadElement") {
    if (parentOf(c)?.type === "ObjectExpression") return;
    throw refuse(c, "the value of next(e) at engine.create is spread other than into an object literal");
  }
  if (c.type === "ReturnStatement" || (c.type === "ArrowFunctionExpression" && c.body === y)) return;
  if (c.type === "VariableDeclarator" && c.init === y) {
    let h = parentOf(c);
    if (h?.type !== "VariableDeclaration" || h.kind !== "const")
      throw refuse(c, "the value of next(e) at engine.create is bound with let or var (const only)");
    let { id } = c;
    if (id.type === "Identifier") {
      u.dollar(id);
      return;
    }
    if (id.type === "ObjectPattern") {
      for (let property of id.properties)
        if (property.type === "RestElement") {
          if (property.argument.type !== "Identifier")
            throw refuse(property, "a rest of next(e) at engine.create that is not a plain name");
          u.dollar(property.argument);
        } else if (property.value.type === "Identifier" && !property.computed) u.unread(property.value);
        else
          throw refuse(
            property,
            "a destructuring of next(e) at engine.create with a nested pattern, a default or a computed key",
          );
      return;
    }
    throw refuse(id, "the value of next(e) at engine.create is destructured into an array");
  }
  throw refuse(y, `the value of next(e) at engine.create is ${describeDollarUse(c, y)}`);
}
//@ chunk-bfnfj4kx.js:57339-57362 placement
var ENGINE_CREATE = "engine.create";
//@ chunk-bfnfj4kx.js:57362-57569 placement
function scanDollarAliases(e, o, t) {
  let { refuse } = t;
  for (let { name: n, declaration, origin } of o) {
    for (let i of findDeclaredIdentifiers(e, n))
      if (i !== declaration) throw refuse(i, `"${n}" (which holds $) is declared again (shadowed)`);
    for (let i of findReferences(e, n)) scanDollarUse(i, origin, t);
  }
}
//@ chunk-bfnfj4kx.js:57569-58240 placement
/**
 * 检查持有 $ 的函数（禁止 arguments、rest 参数）。
 */
function checkFunctionHoldingDollar(fn, o, t) {
  let { refuse } = t;
  if (fn.type !== "ArrowFunctionExpression")
    for (let i of findReferences(fn, "arguments", "own"))
      throw refuse(i, '"arguments" is read inside a function handed $ (it holds $)');
  let last = fn.params.at(-1);
  if (last?.type === "RestElement" && o >= fn.params.length - 1)
    throw refuse(last, "$ is passed into a rest parameter");
  let p = fn.params[o];
  if (p === undefined) return;
  if (p.type !== "Identifier")
    throw refuse(p, "the parameter that receives $ is not a plain name (a pattern or a default)");
  scanDollarAliases(
    fn,
    [
      {
        name: p.name,
        declaration: p,
        origin: "parameter",
      },
    ],
    {
      ...t,
      bind: {
        dollar: (i) => {
          throw refuse(i, "next(e) is bound outside an engine.create hook");
        },
        unread: (i) => {
          throw refuse(i, "next(e) is bound outside an engine.create hook");
        },
      },
    },
  );
}
//@ chunk-bfnfj4kx.js:58240-58299 placement
/**
 * 找展开参数
 */
var findSpreadArg = (e) => e.arguments.find((argument) => argument.type === "SpreadElement");
//@ chunk-bfnfj4kx.js:58299-59872 placement
/**
 * 扫描把 $ 传给命名函数的调用。
 */
function scanDollarHolders(e, o = e.linked) {
  let { scan, linked } = e;
  let { scanned } = linked;
  let { refuse } = scanned;
  let p = (i, a) => {
    let { callee } = i;
    if (callee.type !== "Identifier")
      throw refuse(callee, "$ is passed to something other than a named function");
    let spreadArg = findSpreadArg(i);
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
    let { fn, linked: linked_2 } = resolveFunctionReference(e, callee, "the function handed $");
    let scanned_2 = linked_2.scanned;
    if (fn.type !== "FunctionDeclaration" && (linked_2 !== o || linked !== o))
      throw refuse(
        callee,
        `$ is passed to "${callee.name}", a name bound to a function expression, outside the hook's own file: past an import $ is followed only into a function declaration (function ${callee.name}($) { ... }), which a bundle of the module keeps as written`,
      );
    let index = i.arguments.indexOf(a);
    let j = scan.helpers.get(fn) ?? new Set();
    if (j.has(index)) return;
    j.add(index);
    scan.helpers.set(fn, j);
    checkFunctionHoldingDollar(fn, index, {
      refuse: scanned_2.refuse,
      parentOf: scanned_2.parentOf,
      scanned: scanned_2,
      record: (w) => {
        scan.calls.add(w);
        scan.via.set(w, (scan.via.get(w) ?? new Set()).add(callee.name));
      },
      recordTo: (w) => {
        scan.nextTo.add(w);
      },
      recordEnv: (w, b) => {
        envScannerField(scan, w).add(b);
      },
      recordCommand: (w) => {
        recordNamedCommand(scan, w);
      },
      recordState: (w) => {
        recordStateCall(scan, w, scanned_2);
      },
      libraryHelper: (w) => stateLibraryCallKind(scanned_2, w),
      follow:
        linked_2 === linked
          ? p
          : scanDollarHolders(
              {
                scan,
                linked: linked_2,
              },
              o,
            ),
    });
  };
  return p;
}
//@ chunk-bfnfj4kx.js:59872-60525 placement
/**
 * 检查状态常量定义合法。
 */
function checkStateConsts(e) {
  let o = new Set();
  let t = {
    state: e.stateCalls,
    library: e.libraryCalls,
  };
  for (let { followed, spelling, scanned } of e.stateConsts) {
    let { init } = followed.binding;
    if (o.has(init)) continue;
    o.add(init);
    let stateConst = readStateConst(followed, scanned, t);
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
function collectLibraryCalls(e) {
  for (let { scanned } of e.graph.files.values())
    walkAst(scanned.program, ({ node }) => {
      let r = node.type === "CallExpression";
      let n = r ? stateLibraryCallKind(scanned, node) : undefined;
      if (n === undefined || !r) return;
      e.libraryCalls.set(node, n);
      let s = n === "read" || n === "update";
      let p = s ? node.arguments[1] : node;
      let a =
        p !== undefined && p.type !== "SpreadElement"
          ? resolveStateKeyObject(p, {
              scanned,
              libraryHelper: (x) => stateLibraryCallKind(scanned, x),
            })
          : undefined;
      let all = a?.every(({ plugin, key }) => plugin !== undefined && key !== undefined);
      if (a === undefined || all !== true)
        throw scanned.refuse(
          p ?? node,
          `the state library's ${n} takes a source the scan can read: a reference whose plugin and key are string literals, or what atom, memberOf or derive (imported from "claude-code") made of one, written there or in a const of this file, so the values a module reads and writes can be listed`,
        );
      let spelling = n === "update" ? "state.set" : "state.get";
      for (let { plugin = "", key = "", consts } of a) {
        let g = `${plugin}\x00${key}`;
        e.stateReads.set(g, {
          plugin,
          key,
        });
        if (n === "update")
          e.stateWrites.set(g, {
            plugin,
            key,
          });
        for (let followed of consts)
          e.stateConsts.add({
            followed,
            spelling,
            scanned,
          });
      }
      if (s) e.calls.add("state.get");
      if (n === "update") e.calls.add("state.set");
    });
}
//@ chunk-bfnfj4kx.js:61578-62007 placement
/**
 * 检查调用必须作为语句或返回值使用。
 */
function checkCallStatement({ call: e, scanned, what, holder }) {
  let { endOf, functionOf } = scanned.climbs;
  let p = endOf(e);
  if (p === undefined) return;
  let { value: i, parent } = p;
  if (!(
    parent.type === "ExpressionStatement" ||
    ((parent.type === "ReturnStatement" ||
      (parent.type === "ArrowFunctionExpression" && parent.body === i)) &&
      functionOf(i) === holder)
  ))
    throw scanned.refuse(
      i,
      `the value of ${what} is kept (assigned, passed, read, or returned from a nested function); it takes .catch(handler) where it is called and nothing else`,
    );
}
//@ chunk-bfnfj4kx.js:62007-62119 placement
function functionNameInfo(e) {
  return {
    argumentsRead: e.type === "ArrowFunctionExpression" ? [] : findReferences(e, "arguments", "own"),
    names: collectIdentifierUses(e),
  };
}
//@ chunk-bfnfj4kx.js:62119-62230 placement
function holderNamesOf(scan, o) {
  let t = scan.holderNames.get(o);
  if (t !== undefined) return t;
  let r = functionNameInfo(o);
  scan.holderNames.set(o, r);
  return r;
}
//@ chunk-bfnfj4kx.js:62230-63114 placement
/**
 * 解析注册的 hook 函数（函数表达式或标识符）。
 */
function resolveHookFunction(e, { fn, what, event, engineCreate }) {
  let { scan, linked } = e;
  let i = fn.type === "FunctionExpression" || fn.type === "ArrowFunctionExpression";
  let a = fn.type === "Identifier";
  let f = i
    ? {
        fn,
        linked,
      }
    : a
      ? resolveFunctionReference(e, fn, what)
      : undefined;
  if (f === undefined)
    throw linked.scanned.refuse(fn, `${what} is not a function literal or the name of one`);
  let u = f.fn.async === true && f.fn.generator === true;
  let x = isStreamingHookEvent(event);
  if (x && !u)
    throw linked.scanned.refuse(
      fn,
      `${what} on "${event}" is not an async generator: ${event} streams, so it takes async function* ($, e, next) { ... }, which yields the chunks and returns the result`,
    );
  if (!x && u)
    throw linked.scanned.refuse(
      fn,
      `${what} on "${event}" is an async generator: only a streaming event named as itself (${STREAMING_EVENTS.join(", ")}) takes one; this pattern takes ($, e, next) => result`,
    );
  scan.registered.set(f.fn, {
    linked: f.linked,
    patterns: new Set(scan.registered.get(f.fn)?.patterns).add(event),
    engineCreate: scan.registered.get(f.fn)?.engineCreate === true || engineCreate,
  });
}
//@ chunk-bfnfj4kx.js:63114-64260 placement
/**
 * 扫描 on("<event>") 调用的使用方式。
 */
function scanOnCall(e, { call: o, event, onName, holder }) {
  let { scanned } = e.linked;
  let { parentOf, refuse } = scanned;
  let a = parentOf(o);
  let f = `${onName}("${event}")`;
  if (a?.type !== "MemberExpression" || a.object !== o) {
    checkCallStatement({
      call: o,
      scanned,
      what: f,
      holder,
    });
    return;
  }
  if (!(!a.computed && !a.optional && a.property.type === "Identifier" && a.property.name === "catch"))
    throw refuse(
      a,
      `${f} is read for something other than .catch; a registration has .catch(handler) and nothing else`,
    );
  let x = parentOf(a);
  if (!(x?.type === "CallExpression" && x.callee === a && !x.optional))
    throw refuse(a, `${f}.catch is read without being called`);
  if (event === ENGINE_CREATE)
    throw refuse(
      x,
      `${f}.catch(): an engine.create hook has no budget and its failure fails the load; .catch does not apply`,
    );
  let spreadArg = findSpreadArg(x);
  if (spreadArg !== undefined) throw refuse(spreadArg, `${f}.catch() is called with a spread argument`);
  let [g, ...h] = x.arguments;
  if (g === undefined || h.length > 0)
    throw refuse(x, `${f}.catch() takes (handler); got ${x.arguments.length} argument(s)`);
  resolveHookFunction(e, {
    fn: g,
    what: "the .catch handler",
    event,
    engineCreate: false,
  });
  let k = parentOf(x);
  if (k?.type === "MemberExpression" && k.object === x)
    throw refuse(k, `${f}.catch(...) is followed by another member; a registration takes one .catch`);
  checkCallStatement({
    call: x,
    scanned,
    what: `${f}.catch()`,
    holder,
  });
}
//@ chunk-bfnfj4kx.js:64260-64915 placement
/**
 * 解析 on() 参数（事件、匹配器、hook）。
 */
function parseOnArguments(e, refuse, onName) {
  let spreadArg = findSpreadArg(e);
  if (spreadArg !== undefined) throw refuse(spreadArg, `${onName}() is called with a spread argument`);
  let [n, ...s] = e.arguments;
  if (n === undefined || s.length === 0 || s.length > 2)
    throw refuse(
      e,
      `${onName}() takes (event, hook) or (event, matcher, hook); got ${e.arguments.length} argument(s)`,
    );
  let staticString = readStaticString(n);
  if (staticString === undefined)
    throw refuse(n, `the event name passed to ${onName}() is not a string literal`);
  let a = eventPatternError(staticString);
  if (a !== undefined) throw refuse(n, a);
  let f = isEventPattern(staticString) || isHookEvent(staticString) || isPluginDefinedEvent(staticString);
  let u = nameOfEventPattern(staticString);
  let x = u !== undefined && !isHookEvent(u) && !isPluginDefinedEvent(u);
  if (!f || x) throw refuse(n, `"${u ?? staticString}" is not an event`);
  let last = s.at(-1);
  if (last === undefined) throw refuse(e, `${onName}() takes (event, hook); got no hook`);
  return {
    event: staticString,
    hook: last,
    matcher: s.length === 2 ? s[0] : undefined,
  };
}
//@ chunk-bfnfj4kx.js:64915-65464 placement
/**
 * 扫描一次事件注册。
 */
function scanRegistration(e, o) {
  let { call: t, onName, holder, position } = o;
  let { scan, linked } = e;
  let { scanned } = linked;
  let { event, hook, matcher } = parseOnArguments(t, scanned.refuse, onName);
  let y = matcher !== undefined;
  let c = isEventPattern(event);
  let g = scan.unmatched.get(event);
  if (g !== undefined && (!y || c))
    throw scanned.refuse(
      t,
      `${onName}("${event}") is registered twice${y ? "" : " without a matcher"}; the first is at ${g}`,
    );
  if (!y || c) scan.unmatched.set(event, `${scanned.file}:${t.loc?.start.line ?? "unknown line"}`);
  scan.hooks.add(event);
  scan.registrations.set(t, {
    event,
    matcher,
    linked,
    holder,
    position,
  });
  resolveHookFunction(e, {
    fn: hook,
    what: "the hook",
    event,
    engineCreate: event === ENGINE_CREATE,
  });
  scanOnCall(e, {
    ...o,
    event,
  });
}
//@ chunk-bfnfj4kx.js:65464-66874 placement
/**
 * 扫描持有 $ 的函数体。
 */
function scanHolder(e, o, t) {
  let { scan, linked } = e;
  let s = scan.holders.get(o) ?? new Set();
  if (s.has(t)) return;
  s.add(t);
  scan.holders.set(o, s);
  scan.holderFiles.set(o, linked);
  let { scanned } = linked;
  let { refuse, parentOf } = scanned;
  let f = holderNamesOf(scan, o);
  for (let y of f.argumentsRead) throw refuse(y, '"arguments" is read inside a function that holds on');
  let u = o.params[t];
  if (u === undefined) {
    let last = o.params.at(-1);
    if (last?.type === "RestElement") throw refuse(last, "on is passed into a rest parameter");
    return;
  }
  if (u.type !== "Identifier") throw refuse(u, "the parameter that receives on is not a plain name");
  let x = u.name;
  for (let y of f.names.declared.get(x) ?? [])
    if (y !== u) throw refuse(y, `"${x}" is declared again (shadowed)`);
  for (let y of f.names.read.get(x) ?? []) {
    let c = parentOf(y);
    if (c?.type !== "CallExpression" || c.optional)
      throw refuse(
        y,
        `"${x}" is used other than as a call or an argument to a function of the module's own (bound, spread or read)`,
      );
    if (c.callee === y) {
      scanRegistration(e, {
        call: c,
        onName: x,
        holder: o,
        position: t,
      });
      continue;
    }
    if (c.callee.type !== "Identifier")
      throw refuse(
        c.callee,
        `"${x}" is passed to something other than a function named at the top of this file or imported from one of the module's own files`,
      );
    let spreadArg = findSpreadArg(c);
    if (spreadArg !== undefined) throw refuse(spreadArg, `"${x}" is passed in a call with a spread argument`);
    checkCallStatement({
      call: c,
      scanned,
      what: `${c.callee.name}(${x})`,
      holder: o,
    });
    let functionReference = resolveFunctionReference(e, c.callee, "the callee");
    let index = c.arguments.indexOf(y);
    scan.holderCalls.add({
      call: c,
      callee: functionReference.fn,
      position: index,
      caller: o,
      callerPosition: t,
    });
    scanHolder(
      {
        scan,
        linked: functionReference.linked,
      },
      functionReference.fn,
      index,
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
function findExportDeclaration(e, o) {
  for (let t of e.scanned.program.body) {
    let r = checkExportDeclaration(e, t, o);
    if (r !== undefined) return r;
  }
  return;
}
//@ chunk-bfnfj4kx.js:67582-68023 placement
/**
 * 找到导出的 register 函数。
 */
function findExportedRegister(e, o, t = "") {
  let exportDeclaration = findExportDeclaration(e, o);
  if (exportDeclaration !== undefined) return exportDeclaration;
  let { program, refuse } = e.scanned;
  let p = o === "default" ? "the default export" : o;
  let reExportSpecifier = findReExportSpecifier(e, o);
  if (reExportSpecifier !== undefined)
    throw refuse(reExportSpecifier.specifier, `${p} is re-exported from another file`);
  let found = program.body.find((f) => f.type === "ExportAllDeclaration");
  if (found !== undefined)
    throw refuse(
      found,
      `${p} is not exported here by name; what \`export *\` re-exports from another file is not followed`,
    );
  throw refuse(undefined, `no export named ${p}${t}`);
}
//@ chunk-bfnfj4kx.js:68023-68101 placement
/**
 * 必须导出 register
 */
var requireExportedRegister = (e) =>
  findExportedRegister(e, "register", " (export function register(on, options) {...})");
//@ chunk-bfnfj4kx.js:68101-68213 placement
function scanFromEntry(graph, pluginName) {
  let t = requireLinkedFile(
    {
      graph,
      pluginName,
    },
    graph.entry,
  );
  let register = requireExportedRegister(t);
  let scanState = createScanState(graph, pluginName, register);
  scanHolder(
    {
      scan: scanState,
      linked: t,
    },
    register,
    0,
  );
  return scanState;
}
//@ chunk-bfnfj4kx.js:68213-68718 placement
/**
 * 检查 next 参数的解构形式。
 */
function checkNextDestructure(e, { refuse }) {
  if (e.type !== "ObjectPattern")
    throw refuse(e, "next is destructured other than into an object pattern of plain keys");
  for (let property of e.properties) {
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
function checkNextTo(e, { refuse, parentOf, recordTo }) {
  if (e.optional) throw refuse(e, "next.to is reached through optional chaining");
  let n = parentOf(e);
  if (!(n?.type === "CallExpression" && n.callee === e && !n.optional))
    throw refuse(
      e,
      'next.to is used as a value (bound, passed or read) instead of called as next.to(e, "<tier>")',
    );
  let [p, i, a] = n.arguments;
  if (p === undefined || p.type === "SpreadElement")
    throw refuse(n, 'next.to is called without (e, "<tier>") or with a spread');
  if (a !== undefined) throw refuse(a, 'next.to is called with more than (e, "<tier>")');
  if (!(i?.type === "Literal" && typeof i.value === "string"))
    throw refuse(
      i ?? n,
      "next.to names its tier other than as a string literal (a variable, a template or an expression)",
    );
  let u = i.value;
  if (!isAbovePrepend(u))
    throw refuse(
      i,
      `next.to names "${String(u)}", which is not a tier a dispatch continues at (user, append, builtin, core)`,
    );
  recordTo(u);
  return n;
}
//@ chunk-bfnfj4kx.js:69543-70824 placement
/**
 * 扫描 hook 的 next 参数用法。
 */
function scanNextParam({ fn, next: o, engineCreate }, r) {
  let { refuse, parentOf } = r;
  if (o.type !== "Identifier") {
    if (engineCreate)
      throw refuse(o, "the third parameter of an engine.create hook (next) is not a plain name");
    checkNextDestructure(o, r);
    return;
  }
  for (let p of findDeclaredIdentifiers(fn, o.name))
    if (p !== o)
      throw refuse(
        p,
        `"${o.name}" (the continuation) is declared again (shadowed); rename the inner binding`,
      );
  for (let p of findReferences(fn, o.name)) {
    let i = parentOf(p);
    if (i?.type === "CallExpression" && i.callee === p && !i.optional) {
      if (engineCreate) scanDollarUse(i, "next", r);
      continue;
    }
    if (i?.type === "MemberExpression" && i.object === p) {
      if (i.computed) {
        if (
          i.property.type === "Literal" &&
          typeof i.property.value === "string" &&
          i.property.value !== "to"
        )
          continue;
        throw refuse(i, `a computed member access on "${o.name}" (it may reach next.to)`);
      }
      if (i.property.type === "Identifier" && i.property.name === "to") {
        let u = checkNextTo(i, r);
        if (engineCreate) scanDollarUse(u, "next", r);
      }
      continue;
    }
    if (engineCreate)
      throw refuse(p, `"${o.name}" is passed on or bound inside an engine.create hook (its value is $)`);
    if (i?.type === "VariableDeclarator" && i.init === p) {
      if (i.id.type === "Identifier")
        throw refuse(
          i,
          `"${o.name}" (the hook's next) is bound to another name; next.to is reached only on the hook's own next`,
        );
      checkNextDestructure(i.id, r);
      continue;
    }
    if (i?.type === "AssignmentExpression" && i.right === p)
      throw refuse(
        i,
        `"${o.name}" (the hook's next) is assigned to another name; next.to is reached only on the hook's own next`,
      );
  }
}
//@ chunk-bfnfj4kx.js:70824-71804 placement
/**
 * 扫描 hook 函数参数（e、$、next）。
 */
function scanHookParams(e, engineCreate, t) {
  let { refuse } = t;
  let [n, s, p] = e.params;
  if (e.type !== "ArrowFunctionExpression")
    for (let u of findReferences(e, "arguments", "own"))
      throw refuse(u, '"arguments" is read inside a hook (it holds $)');
  let i = [];
  if (n !== undefined) {
    if (n.type !== "Identifier")
      throw refuse(
        n,
        "the first parameter of a hook ($) is not a plain name (a pattern, a rest or a default)",
      );
    i.push({
      name: n.name,
      declaration: n,
      origin: "parameter",
    });
  }
  for (let u of [n, s, p])
    if (u?.type === "RestElement")
      throw refuse(u, "a hook takes $, e or next into a rest parameter (it would hold next)");
  for (let param of e.params)
    walkAst(param, ({ node }) => {
      if (node.type === "AssignmentPattern") throw refuse(node, "a parameter of a hook has a default value");
    });
  let f = {
    ...t,
    bind: {
      dollar: (u) => {
        i.push({
          name: u.name,
          declaration: u,
          origin: "next",
        });
      },
      unread: (u) => {
        for (let x of findReferences(e, u.name))
          throw refuse(
            x,
            `"${u.name}", destructured from $ at engine.create, is read (a noun bound to a name); leave it unread or call it as $.noun.event(...)`,
          );
      },
    },
  };
  if (p !== undefined)
    scanNextParam(
      {
        fn: e,
        next: p,
        engineCreate,
      },
      f,
    );
  scanDollarAliases(e, i, f);
}
//@ chunk-bfnfj4kx.js:71804-72289 placement
/**
 * 扫描全部注册的 hooks。
 */
function scanRegistrations(e, o) {
  let t = scanFromEntry(e, o);
  for (let [r, { linked: n, patterns: s, engineCreate }] of t.registered)
    scanHookParams(r, engineCreate, {
      refuse: n.scanned.refuse,
      parentOf: n.scanned.parentOf,
      scanned: n.scanned,
      record: (i) => {
        t.calls.add(i);
        t.direct.add(i);
      },
      recordTo: (i) => {
        t.nextTo.add(i);
        if (i === "user") s.forEach((a) => t.toUserOn.add(a));
      },
      recordEnv: (i, a) => {
        envScannerField(t, i).add(a);
      },
      recordCommand: (i) => {
        recordNamedCommand(t, i);
      },
      recordState: (i) => {
        recordStateCall(t, i, n.scanned);
      },
      libraryHelper: (i) => stateLibraryCallKind(n.scanned, i),
      follow: scanDollarHolders({
        scan: t,
        linked: n,
      }),
    });
  collectLibraryCalls(t);
  checkStateConsts(t);
  return t;
}
//@ chunk-bfnfj4kx.js:72289-72742 placement
/**
 * 描述表达式类型（用于报错）。
 */
function describeExpression(e) {
  switch (e.type) {
    case "Identifier":
      return `the variable ${e.name}`;
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
      return "regex" in e ? "a RegExp" : `the literal ${e.raw ?? String(e.value)}`;
    default:
      return `a ${e.type}`;
  }
}
//@ chunk-bfnfj4kx.js:72742-72977 placement
var TELEMETRY_TO_HINT = ({ onName, event }) =>
  '"to" is a string literal, or a list of them, from ' +
  CORE_SOURCES.map((t) => `"${t}"`).join(", ") +
  `, written in the call, so the streams a module's hooks stand on can be listed: ${onName}("${event}", { to: "collector" }, hook)`;
//@ chunk-bfnfj4kx.js:72977-73426 placement
/**
 * 读取 on() 的目的地列表。
 */
function readDestinations(e, o) {
  let { onName, event, refuse } = o;
  return (e.type === "ArrayExpression" ? e.elements : [e]).map((s) => {
    if (s === null)
      throw refuse(
        e,
        `${onName}("${event}") names its destinations as a list with a hole; ${TELEMETRY_TO_HINT(o)}`,
      );
    let p = s.type === "Literal" ? s.value : undefined;
    if (typeof p !== "string")
      throw refuse(
        s,
        `${onName}("${event}") names its destination as ${describeExpression(s)}; ${TELEMETRY_TO_HINT(o)}`,
      );
    if (!isCoreSource(p))
      throw refuse(
        s,
        `${onName}("${event}") names the destination "${p}", which is no telemetry stream; ${TELEMETRY_TO_HINT(o)}`,
      );
    return p;
  });
}
//@ chunk-bfnfj4kx.js:73426-74234 placement
/**
 * 读取 on() 的匹配器参数。
 */
function readMatcher(e, o) {
  let { onName, event, refuse } = o;
  if (e === undefined) return CORE_SOURCES;
  switch (e.type) {
    case "ObjectExpression": {
      let found = e.properties.find(
        (property) => property.type === "SpreadElement" || property.computed || property.kind !== "init",
      );
      if (found !== undefined)
        throw refuse(
          found,
          `${onName}("${event}") has a matcher with a spread, a computed key or an accessor, which may set "to" to anything; ` +
            TELEMETRY_TO_HINT(o),
        );
      let [p, i] = e.properties.filter((property) => isNamedProperty(property, "to"));
      if (i !== undefined)
        throw refuse(i, `${onName}("${event}") names "to" twice in one matcher; ` + TELEMETRY_TO_HINT(o));
      return p?.type === "Property" ? readDestinations(p.value, o) : CORE_SOURCES;
    }
    case "ArrayExpression":
      return e.elements.flatMap((element) => {
        if (element === null || element.type === "SpreadElement")
          throw refuse(
            element ?? e,
            `${onName}("${event}") has a list of matchers with a hole or a spread; ${TELEMETRY_TO_HINT(o)}`,
          );
        return readMatcher(element, o);
      });
    default:
      throw refuse(
        e,
        `${onName}("${event}") takes its matcher as ${describeExpression(e)}, not an object written in the call; ${TELEMETRY_TO_HINT(o)}`,
      );
  }
}
//@ chunk-bfnfj4kx.js:74234-74516 placement
/**
 * 列出模块中遥测钩子所站的流（anthropic/collector）。
 */
function collectTelemetryDestinations(e) {
  let filtered = [...e.registrations].filter(([, r]) => isTelemetryEvent(r.event));
  if (filtered.length === 0) return;
  let t = new Set(
    filtered.flatMap(([r, { event: n, matcher: s, linked: p }]) =>
      readMatcher(s, {
        onName: r.callee.type === "Identifier" ? r.callee.name : "on",
        event: n,
        refuse: p.scanned.refuse,
      }),
    ),
  );
  return CORE_SOURCES.filter((r) => t.has(r));
}
//@ chunk-bfnfj4kx.js:74516-75019 placement
/**
 * 扫描整个 hooks 模块，产出 hooks、calls、nextTo、env、状态等清单。
 */
function scanHooksModule(e, o) {
  let t = scanRegistrations(e, o);
  let filtered = tiersBeneath("prepend").filter((f) => t.nextTo.has(f));
  let n = t.envReads.size > 0 || t.envWrites.size > 0;
  let clientModules = collectClientModules(e);
  let p = summarizeStateAccess(t);
  let runCommands = collectRunCommands(t);
  let telemetryDestinations = collectTelemetryDestinations(t);
  return {
    hooks: Array.from(t.hooks),
    calls: Array.from(t.calls).sort(),
    ...(runCommands !== undefined && {
      runCommands,
    }),
    ...(filtered.length === 0
      ? {}
      : {
          nextTo: filtered,
        }),
    ...(t.toUserOn.size > 0 && {
      toUserOn: Array.from(t.toUserOn),
    }),
    ...(telemetryDestinations !== undefined && {
      telemetry: telemetryDestinations,
    }),
    ...(n && {
      env: {
        reads: Array.from(t.envReads).sort(),
        writes: Array.from(t.envWrites).sort(),
      },
    }),
    ...(p !== undefined && {
      state: p,
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
function scanHooksModuleCached(graph, o) {
  let t = moduleGraphDigest(graph);
  let r = importResolverCache.get(t);
  if (r !== undefined) return r;
  let n = scanHooksModule(graph, o);
  importResolverCache.set(t, n);
  return n;
}
//@ chunk-bfnfj4kx.js:75119-75173 placement
/**
 * 打包模块信息
 */
var bundledModuleInfo = (e, o, t) => ({
  module: e,
  scan: readBundledScan(o, t),
  files: readBundledFiles(o),
});
export { bundledModuleInfo, scanRegistrations, scanHooksModuleCached };
