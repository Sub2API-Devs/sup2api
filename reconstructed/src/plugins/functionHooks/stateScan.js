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
  kSi,
  readLiteralEnvName,
  COMMAND_REGISTER,
  isReservedHookName,
  describeDollarUse,
  resolveFunctionReference,
  ao,
  xo,
  recordStateCall,
  stateLibraryCallKind,
  jeo,
  isEventPattern,
  vSi,
  checkExportDeclaration,
  requireLinkedFile,
  ke,
  Wh,
  isNamedProperty,
  ro,
  collectRunCommands,
} from "./eventPatterns.js";
import { BaseOutputFormatSchema } from "../../entrypoints/sdk/coreSchemas.js";
import { isStreamingHookEvent, Beo, isHookEvent, isPluginDefinedEvent } from "./hookApiSurface.js";
import { Jfr, tiersBeneath, readBundledScan, readBundledFiles } from "./builtinHooksModule.js";
import { It } from "./moduleLoader.js";

/**
 * 有 stateReads/stateWrites 时按键排序输出 {reads, writes}，否则 undefined。旧版名 createEmptyToolCounts 为错配。
 */
//@ chunk-bfnfj4kx.js:39347-39545 placement = createEmptyToolCounts (0.474)
function summarizeStateAccess(e) {
  let o = e.stateReads.size > 0 || e.stateWrites.size > 0,
    t = (r) => [...r.entries()].sort(([n], [s]) => (n < s ? -1 : n > s ? 1 : 0)).map(([, n]) => n);
  return o ? { reads: t(e.stateReads), writes: t(e.stateWrites) } : void 0;
}
/**
 * 把标识符解析为 const 绑定（拒绝参数遮蔽）。
 */
//@ chunk-bfnfj4kx.js:51666-52255 placement
function resolveConstBinding(
  e,
  { consts: consts, names: names, climbs: climbs, program: program, refuse: refuse },
) {
  let shadowOf = names.shadowOf(e);
  if (shadowOf !== names.writtenShadowOf(e))
    throw refuse(
      e,
      `"${e.name}" is read among the parameters of a function whose body declares that name again: the engine may bind such a read apart from the text, so the value it names cannot be listed. Rename one of the two`,
    );
  let i = shadowOf === void 0 ? program : declaringScopeOf(shadowOf, climbs);
  if (typeof i === "string") return;
  let a = consts.inits(i).get(e.name),
    f = a?.isVar ? consts.rebound(a.id) : void 0;
  if (f !== void 0)
    throw refuse(f.at, `the var ${e.name}, read for a $.state reference, ` + SCAN_PROBLEM_TEXT[f.cause]);
  return a === void 0 ? void 0 : { init: a.init, scope: i };
}
//@ chunk-bfnfj4kx.js:52255-52349 placement
var Qr = ({ placed: placed, starts: starts }, t) =>
  placed.slice(wo(starts, t.start), wo(starts, t.end)).toSorted((r, n) => r.at - n.at);
/**
 * 读取状态常量的定义。
 */
//@ chunk-bfnfj4kx.js:52349-52978 placement
function readStateConst(
  { read: read, binding: binding },
  { consts: consts, names: names, parentOf: parentOf, refuse: refuse },
  p,
) {
  let { scope: scope } = binding,
    { name: a } = read,
    writtenShadowOf = names.writtenShadowOf(read),
    u = scope.type === "Program" ? consts.exporting.get(a) : void 0;
  if (u !== void 0) return u;
  let filtered = (consts.counted(a).owned.get(writtenShadowOf) ?? []).filter(
    (k) => k.use.start >= scope.start && k.use.start < scope.end,
  );
  if (!filtered.some((k) => k.use === read))
    throw refuse(
      read,
      `the scan lost track of this read of "${a}" and cannot show that every use of the const is a plain read. This is a fault of the scan, not of the module, which is refused rather than passed`,
    );
  let found = filtered.find((k) => !isStateArgument(k.use, parentOf, p)),
    at = Qr(consts.apart(a)(p), scope).at(0);
  return at !== void 0 && (found === void 0 || at.at < found.at) ? at.use : found?.use;
}
/**
 * 沿 const 链追踪表达式。
 */
//@ chunk-bfnfj4kx.js:52978-53560 placement
function followConstChain(e, o, t = new Set()) {
  if (e.type === "Identifier") {
    let n = t.has(e.name) ? void 0 : resolveConstBinding(e, o),
      s = n === void 0 ? void 0 : followConstChain(n.init, o, new Set([...t, e.name]));
    return n !== void 0 && s !== void 0 ? { ...s, consts: [{ read: e, binding: n }, ...s.consts] } : void 0;
  }
  if (e.type !== "ObjectExpression") return;
  let r = { consts: [] };
  for (let property of e.properties) {
    if (property.type === "SpreadElement") {
      let p = followConstChain(property.argument, o, t);
      if (p === void 0) return;
      r = { ...r, ...p, consts: [...r.consts, ...p.consts] };
      continue;
    }
    let s = propertyKeyName(property);
    if (s === void 0 || property.kind !== "init") return;
    if (s === "plugin" || s === "key") {
      let p = readStaticString(property.value);
      if (p === void 0) return;
      r = { ...r, [s]: p };
    }
  }
  return r;
}
/**
 * 解析状态键对象（plugin、key）。
 */
//@ chunk-bfnfj4kx.js:53560-54187 placement
function resolveStateKeyObject(e, o, t = new Set()) {
  if (e.type === "Identifier" && t.has(e.name)) return;
  let n = e.type === "Identifier" ? resolveConstBinding(e, o.scanned) : void 0;
  if (n !== void 0 && n.init.type !== "ObjectExpression" && e.type === "Identifier")
    return resolveStateKeyObject(n.init, o, new Set([...t, e.name]));
  if (e.type !== "CallExpression") {
    let x = followConstChain(e, o.scanned);
    return x === void 0 ? void 0 : [x];
  }
  let libraryHelper = o.libraryHelper(e),
    [i] = e.arguments;
  if (
    (libraryHelper === "atom" || libraryHelper === "memberOf") &&
    i !== void 0 &&
    i.type !== "SpreadElement"
  )
    return resolveStateKeyObject(i, o, t);
  if (libraryHelper !== "derive" || i?.type !== "ArrayExpression") return;
  let mapped = i.elements.map((element) =>
    element !== null && element.type !== "SpreadElement" ? resolveStateKeyObject(element, o, t) : void 0,
  );
  return mapped.every((x) => x !== void 0) ? mapped.flat() : void 0;
}
/**
 * 扫描一次状态 API 调用并记录。
 */
//@ chunk-bfnfj4kx.js:54187-54739 placement
function scanStateCall(e, o, { refuse: refuse, scanned: scanned, libraryHelper: libraryHelper }) {
  let [s] = e.arguments,
    p = s !== void 0 && s.type !== "SpreadElement",
    [i, ...a] =
      (p ? resolveStateKeyObject(s, { scanned: scanned, libraryHelper: libraryHelper }) : void 0) ?? [],
    { plugin: plugin, key: key, consts: consts = [] } = i ?? {};
  if (!(a.length === 0 && plugin !== void 0 && key !== void 0))
    throw refuse(
      s ?? e,
      `$.${o} takes a reference whose plugin and key are string literals ({ plugin: "p", key: "k" }, written there or in a const of this file; only id may be computed), so the values a module reads and writes can be listed (got ${describeArgument(s)})`,
    );
  return { call: e, spelling: o, named: { plugin: plugin, key: key }, consts: consts };
}
/**
 * 扫描 $ 的一次使用（$.noun.event 调用、记录 env/命令/状态）。
 */
//@ chunk-bfnfj4kx.js:54739-57339 placement
function scanDollarUse(
  e,
  o,
  {
    refuse: refuse,
    parentOf: parentOf,
    scanned: scanned,
    record: record,
    recordEnv: recordEnv,
    recordCommand: recordCommand,
    recordState: recordState,
    libraryHelper: libraryHelper,
    bind: u,
    follow: follow,
  },
) {
  let y = e,
    c = parentOf(y);
  while (c?.type === "AwaitExpression") ((y = c), (c = parentOf(y)));
  if (c === void 0) throw refuse(e, "$ stands alone");
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
    if ((record(b), kSi(b))) recordEnv(b, readLiteralEnvName(j, b, refuse));
    if (b === COMMAND_REGISTER) recordCommand(j);
    if (isReservedHookName(b))
      recordState(scanStateCall(j, b, { refuse: refuse, scanned: scanned, libraryHelper: libraryHelper }));
    return;
  }
  if (c.type === "CallExpression" && e.type === "Identifier") {
    let h = o === "parameter" && y === e && c.callee !== y && !c.optional && c.callee.type === "Identifier",
      k = h ? libraryHelper(c) : void 0;
    if ((k === "read" || k === "update") && c.arguments[0] === e) return;
    if (k !== void 0)
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
    let { id: id } = c;
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
  let { refuse: refuse } = t;
  for (let { name: n, declaration: declaration, origin: origin } of o) {
    for (let i of findDeclaredIdentifiers(e, n))
      if (i !== declaration) throw refuse(i, `"${n}" (which holds $) is declared again (shadowed)`);
    for (let i of findReferences(e, n)) scanDollarUse(i, origin, t);
  }
}
/**
 * 检查持有 $ 的函数（禁止 arguments、rest 参数）。
 */
//@ chunk-bfnfj4kx.js:57569-58240 placement
function checkFunctionHoldingDollar(e, o, t) {
  let { refuse: refuse } = t;
  if (e.type !== "ArrowFunctionExpression")
    for (let i of findReferences(e, "arguments", "own"))
      throw refuse(i, '"arguments" is read inside a function handed $ (it holds $)');
  let at = e.params.at(-1);
  if (at?.type === "RestElement" && o >= e.params.length - 1)
    throw refuse(at, "$ is passed into a rest parameter");
  let p = e.params[o];
  if (p === void 0) return;
  if (p.type !== "Identifier")
    throw refuse(p, "the parameter that receives $ is not a plain name (a pattern or a default)");
  scanDollarAliases(e, [{ name: p.name, declaration: p, origin: "parameter" }], {
    ...t,
    bind: {
      dollar: (i) => {
        throw refuse(i, "next(e) is bound outside an engine.create hook");
      },
      unread: (i) => {
        throw refuse(i, "next(e) is bound outside an engine.create hook");
      },
    },
  });
}
//@ chunk-bfnfj4kx.js:58240-58299 placement
var K = (e) => e.arguments.find((argument) => argument.type === "SpreadElement");
/**
 * 扫描把 $ 传给命名函数的调用。
 */
//@ chunk-bfnfj4kx.js:58299-59872 placement
function scanDollarHolders(e, o = e.linked) {
  let { scan: scan, linked: linked } = e,
    { scanned: scanned } = linked,
    { refuse: refuse } = scanned,
    p = (i, a) => {
      let { callee: callee } = i;
      if (callee.type !== "Identifier")
        throw refuse(callee, "$ is passed to something other than a named function");
      let u = K(i);
      if (u !== void 0) throw refuse(u, "$ is passed in a call with a spread argument");
      if (!(scanned.names.functions.has(callee.name) || scanned.imports.has(callee.name)))
        throw refuse(
          callee,
          `$ is passed to "${callee.name}", which is not a function declared at the top of this file (a function declaration, or a const bound to one), nor one imported from a file of the module's own; $ is followed nowhere else`,
        );
      if (scanned.imports.has(callee.name) && scanned.names.shadowOf(callee) !== void 0)
        throw refuse(
          callee,
          `$ is passed to "${callee.name}", a name declared again over this call: the engine may not bind it to the import of that name. Rename one of the two`,
        );
      let { fn: fn, linked: linked_2 } = resolveFunctionReference(e, callee, "the function handed $"),
        scanned_2 = linked_2.scanned;
      if (fn.type !== "FunctionDeclaration" && (linked_2 !== o || linked !== o))
        throw refuse(
          callee,
          `$ is passed to "${callee.name}", a name bound to a function expression, outside the hook's own file: past an import $ is followed only into a function declaration (function ${callee.name}($) { ... }), which a bundle of the module keeps as written`,
        );
      let index = i.arguments.indexOf(a),
        j = scan.helpers.get(fn) ?? new Set();
      if (j.has(index)) return;
      (j.add(index),
        scan.helpers.set(fn, j),
        checkFunctionHoldingDollar(fn, index, {
          refuse: scanned_2.refuse,
          parentOf: scanned_2.parentOf,
          scanned: scanned_2,
          record: (w) => {
            (scan.calls.add(w), scan.via.set(w, (scan.via.get(w) ?? new Set()).add(callee.name)));
          },
          recordTo: (w) => {
            scan.nextTo.add(w);
          },
          recordEnv: (w, b) => {
            ao(scan, w).add(b);
          },
          recordCommand: (w) => {
            xo(scan, w);
          },
          recordState: (w) => {
            recordStateCall(scan, w, scanned_2);
          },
          libraryHelper: (w) => stateLibraryCallKind(scanned_2, w),
          follow: linked_2 === linked ? p : scanDollarHolders({ scan: scan, linked: linked_2 }, o),
        }));
    };
  return p;
}
/**
 * 检查状态常量定义合法。
 */
//@ chunk-bfnfj4kx.js:59872-60525 placement
function checkStateConsts(e) {
  let o = new Set(),
    t = { state: e.stateCalls, library: e.libraryCalls };
  for (let { followed: followed, spelling: spelling, scanned: scanned } of e.stateConsts) {
    let { init: init } = followed.binding;
    if (o.has(init)) continue;
    o.add(init);
    let i = readStateConst(followed, scanned, t);
    if (i !== void 0)
      throw scanned.refuse(
        i,
        `the const ${followed.read.name}, read as the reference of a $.${spelling} call, is also written through, handed on or exported here, and const does not freeze: what it holds at the call could not be listed. Use it only as the reference of $.state calls, as a source of the state library's functions imported from "claude-code", and in a spread into an object literal ({ ...${followed.read.name}, id }), or write the reference at the call`,
      );
  }
}
/**
 * 收集库调用（read/update/atom 等）。
 */
//@ chunk-bfnfj4kx.js:60525-61578 placement
function collectLibraryCalls(e) {
  for (let { scanned: scanned } of e.graph.files.values())
    walkAst(scanned.program, ({ node: node }) => {
      let r = node.type === "CallExpression",
        n = r ? stateLibraryCallKind(scanned, node) : void 0;
      if (n === void 0 || !r) return;
      e.libraryCalls.set(node, n);
      let s = n === "read" || n === "update",
        p = s ? node.arguments[1] : node,
        a =
          p !== void 0 && p.type !== "SpreadElement"
            ? resolveStateKeyObject(p, {
                scanned: scanned,
                libraryHelper: (x) => stateLibraryCallKind(scanned, x),
              })
            : void 0,
        f = a?.every(({ plugin: plugin, key: key }) => plugin !== void 0 && key !== void 0);
      if (a === void 0 || f !== !0)
        throw scanned.refuse(
          p ?? node,
          `the state library's ${n} takes a source the scan can read: a reference whose plugin and key are string literals, or what atom, memberOf or derive (imported from "claude-code") made of one, written there or in a const of this file, so the values a module reads and writes can be listed`,
        );
      let u = n === "update" ? "state.set" : "state.get";
      for (let { plugin: plugin = "", key: key = "", consts: consts } of a) {
        let g = `${plugin}\x00${key}`;
        if ((e.stateReads.set(g, { plugin: plugin, key: key }), n === "update"))
          e.stateWrites.set(g, { plugin: plugin, key: key });
        for (let h of consts) e.stateConsts.add({ followed: h, spelling: u, scanned: scanned });
      }
      if (s) e.calls.add("state.get");
      if (n === "update") e.calls.add("state.set");
    });
}
/**
 * 检查调用必须作为语句或返回值使用。
 */
//@ chunk-bfnfj4kx.js:61578-62007 placement
function checkCallStatement({ call: e, scanned: scanned, what: what, holder: holder }) {
  let { endOf: endOf, functionOf: functionOf } = scanned.climbs,
    p = endOf(e);
  if (p === void 0) return;
  let { value: i, parent: parent } = p;
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
function holderNamesOf(e, o) {
  let t = e.holderNames.get(o);
  if (t !== void 0) return t;
  let r = functionNameInfo(o);
  return (e.holderNames.set(o, r), r);
}
/**
 * 解析注册的 hook 函数（函数表达式或标识符）。
 */
//@ chunk-bfnfj4kx.js:62230-63114 placement
function resolveHookFunction(e, { fn: fn, what: what, event: event, engineCreate: engineCreate }) {
  let { scan: scan, linked: linked } = e,
    i = fn.type === "FunctionExpression" || fn.type === "ArrowFunctionExpression",
    a = fn.type === "Identifier",
    f = i ? { fn: fn, linked: linked } : a ? resolveFunctionReference(e, fn, what) : void 0;
  if (f === void 0) throw linked.scanned.refuse(fn, `${what} is not a function literal or the name of one`);
  let u = f.fn.async === !0 && f.fn.generator === !0,
    x = isStreamingHookEvent(event);
  if (x && !u)
    throw linked.scanned.refuse(
      fn,
      `${what} on "${event}" is not an async generator: ${event} streams, so it takes async function* ($, e, next) { ... }, which yields the chunks and returns the result`,
    );
  if (!x && u)
    throw linked.scanned.refuse(
      fn,
      `${what} on "${event}" is an async generator: only a streaming event named as itself (${Beo.join(", ")}) takes one; this pattern takes ($, e, next) => result`,
    );
  scan.registered.set(f.fn, {
    linked: f.linked,
    patterns: new Set(scan.registered.get(f.fn)?.patterns).add(event),
    engineCreate: scan.registered.get(f.fn)?.engineCreate === !0 || engineCreate,
  });
}
/**
 * 扫描 on("<event>") 调用的使用方式。
 */
//@ chunk-bfnfj4kx.js:63114-64260 placement
function scanOnCall(e, { call: o, event: event, onName: onName, holder: holder }) {
  let { scanned: scanned } = e.linked,
    { parentOf: parentOf, refuse: refuse } = scanned,
    a = parentOf(o),
    f = `${onName}("${event}")`;
  if (a?.type !== "MemberExpression" || a.object !== o) {
    checkCallStatement({ call: o, scanned: scanned, what: f, holder: holder });
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
  let c = K(x);
  if (c !== void 0) throw refuse(c, `${f}.catch() is called with a spread argument`);
  let [g, ...h] = x.arguments;
  if (g === void 0 || h.length > 0)
    throw refuse(x, `${f}.catch() takes (handler); got ${x.arguments.length} argument(s)`);
  resolveHookFunction(e, { fn: g, what: "the .catch handler", event: event, engineCreate: !1 });
  let k = parentOf(x);
  if (k?.type === "MemberExpression" && k.object === x)
    throw refuse(k, `${f}.catch(...) is followed by another member; a registration takes one .catch`);
  checkCallStatement({ call: x, scanned: scanned, what: `${f}.catch()`, holder: holder });
}
/**
 * 解析 on() 参数（事件、匹配器、hook）。
 */
//@ chunk-bfnfj4kx.js:64260-64915 placement
function parseOnArguments(e, o, t) {
  let r = K(e);
  if (r !== void 0) throw o(r, `${t}() is called with a spread argument`);
  let [n, ...s] = e.arguments;
  if (n === void 0 || s.length === 0 || s.length > 2)
    throw o(e, `${t}() takes (event, hook) or (event, matcher, hook); got ${e.arguments.length} argument(s)`);
  let i = readStaticString(n);
  if (i === void 0) throw o(n, `the event name passed to ${t}() is not a string literal`);
  let a = jeo(i);
  if (a !== void 0) throw o(n, a);
  let f = isEventPattern(i) || isHookEvent(i) || isPluginDefinedEvent(i),
    u = vSi(i),
    x = u !== void 0 && !isHookEvent(u) && !isPluginDefinedEvent(u);
  if (!f || x) throw o(n, `"${u ?? i}" is not an event`);
  let at = s.at(-1);
  if (at === void 0) throw o(e, `${t}() takes (event, hook); got no hook`);
  return { event: i, hook: at, matcher: s.length === 2 ? s[0] : void 0 };
}
/**
 * 扫描一次事件注册。
 */
//@ chunk-bfnfj4kx.js:64915-65464 placement
function scanRegistration(e, o) {
  let { call: t, onName: onName, holder: holder, position: position } = o,
    { scan: scan, linked: linked } = e,
    { scanned: scanned } = linked,
    { event: event, hook: hook, matcher: matcher } = parseOnArguments(t, scanned.refuse, onName),
    y = matcher !== void 0,
    c = isEventPattern(event),
    g = scan.unmatched.get(event);
  if (g !== void 0 && (!y || c))
    throw scanned.refuse(
      t,
      `${onName}("${event}") is registered twice${y ? "" : " without a matcher"}; the first is at ${g}`,
    );
  if (!y || c) scan.unmatched.set(event, `${scanned.file}:${t.loc?.start.line ?? "unknown line"}`);
  (scan.hooks.add(event),
    scan.registrations.set(t, {
      event: event,
      matcher: matcher,
      linked: linked,
      holder: holder,
      position: position,
    }),
    resolveHookFunction(e, {
      fn: hook,
      what: "the hook",
      event: event,
      engineCreate: event === ENGINE_CREATE,
    }),
    scanOnCall(e, { ...o, event: event }));
}
/**
 * 扫描持有 $ 的函数体。
 */
//@ chunk-bfnfj4kx.js:65464-66874 placement
function scanHolder(e, o, t) {
  let { scan: scan, linked: linked } = e,
    s = scan.holders.get(o) ?? new Set();
  if (s.has(t)) return;
  (s.add(t), scan.holders.set(o, s), scan.holderFiles.set(o, linked));
  let { scanned: scanned } = linked,
    { refuse: refuse, parentOf: parentOf } = scanned,
    f = holderNamesOf(scan, o);
  for (let y of f.argumentsRead) throw refuse(y, '"arguments" is read inside a function that holds on');
  let u = o.params[t];
  if (u === void 0) {
    let at = o.params.at(-1);
    if (at?.type === "RestElement") throw refuse(at, "on is passed into a rest parameter");
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
      scanRegistration(e, { call: c, onName: x, holder: o, position: t });
      continue;
    }
    if (c.callee.type !== "Identifier")
      throw refuse(
        c.callee,
        `"${x}" is passed to something other than a function named at the top of this file or imported from one of the module's own files`,
      );
    let g = K(c);
    if (g !== void 0) throw refuse(g, `"${x}" is passed in a call with a spread argument`);
    checkCallStatement({ call: c, scanned: scanned, what: `${c.callee.name}(${x})`, holder: o });
    let h = resolveFunctionReference(e, c.callee, "the callee"),
      index = c.arguments.indexOf(y);
    (scan.holderCalls.add({ call: c, callee: h.fn, position: index, caller: o, callerPosition: t }),
      scanHolder({ scan: scan, linked: h.linked }, h.fn, index));
  }
}
/**
 * 创建扫描状态（hooks、注册、调用、env 读写等集合）。
 */
//@ chunk-bfnfj4kx.js:66874-67482 placement
var createScanState = (e, o, t) => ({
  graph: e,
  pluginName: o,
  register: t,
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
  exportsUnderWay: { depth: 0, lowest: 0 },
  exportsHeld: new Map(),
  exportSteps: { taken: 0 },
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
    if (r !== void 0) return r;
  }
  return;
}
/**
 * 找到导出的 register 函数。
 */
//@ chunk-bfnfj4kx.js:67582-68023 placement
function findExportedRegister(e, o, t = "") {
  let r = findExportDeclaration(e, o);
  if (r !== void 0) return r;
  let { program: program, refuse: refuse } = e.scanned,
    p = o === "default" ? "the default export" : o,
    i = findReExportSpecifier(e, o);
  if (i !== void 0) throw refuse(i.specifier, `${p} is re-exported from another file`);
  let found = program.body.find((f) => f.type === "ExportAllDeclaration");
  if (found !== void 0)
    throw refuse(
      found,
      `${p} is not exported here by name; what \`export *\` re-exports from another file is not followed`,
    );
  throw refuse(void 0, `no export named ${p}${t}`);
}
//@ chunk-bfnfj4kx.js:68023-68101 placement
var cn = (e) => findExportedRegister(e, "register", " (export function register(on, options) {...})");
//@ chunk-bfnfj4kx.js:68101-68213 placement
function scanFromEntry(e, o) {
  let t = requireLinkedFile({ graph: e, pluginName: o }, e.entry),
    r = cn(t),
    n = createScanState(e, o, r);
  return (scanHolder({ scan: n, linked: t }, r, 0), n);
}
/**
 * 检查 next 参数的解构形式。
 */
//@ chunk-bfnfj4kx.js:68213-68718 placement
function checkNextDestructure(e, { refuse: refuse }) {
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
/**
 * 检查 next.to 调用。
 */
//@ chunk-bfnfj4kx.js:68718-69543 placement
function checkNextTo(e, { refuse: refuse, parentOf: parentOf, recordTo: recordTo }) {
  if (e.optional) throw refuse(e, "next.to is reached through optional chaining");
  let n = parentOf(e);
  if (!(n?.type === "CallExpression" && n.callee === e && !n.optional))
    throw refuse(
      e,
      'next.to is used as a value (bound, passed or read) instead of called as next.to(e, "<tier>")',
    );
  let [p, i, a] = n.arguments;
  if (p === void 0 || p.type === "SpreadElement")
    throw refuse(n, 'next.to is called without (e, "<tier>") or with a spread');
  if (a !== void 0) throw refuse(a, 'next.to is called with more than (e, "<tier>")');
  if (!(i?.type === "Literal" && typeof i.value === "string"))
    throw refuse(
      i ?? n,
      "next.to names its tier other than as a string literal (a variable, a template or an expression)",
    );
  let u = i.value;
  if (!Jfr(u))
    throw refuse(
      i,
      `next.to names "${String(u)}", which is not a tier a dispatch continues at (user, append, builtin, core)`,
    );
  return (recordTo(u), n);
}
/**
 * 扫描 hook 的 next 参数用法。
 */
//@ chunk-bfnfj4kx.js:69543-70824 placement
function scanNextParam({ fn: fn, next: o, engineCreate: engineCreate }, r) {
  let { refuse: refuse, parentOf: parentOf } = r;
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
/**
 * 扫描 hook 函数参数（e、$、next）。
 */
//@ chunk-bfnfj4kx.js:70824-71804 placement
function scanHookParams(e, o, t) {
  let { refuse: refuse } = t,
    [n, s, p] = e.params;
  if (e.type !== "ArrowFunctionExpression")
    for (let u of findReferences(e, "arguments", "own"))
      throw refuse(u, '"arguments" is read inside a hook (it holds $)');
  let i = [];
  if (n !== void 0) {
    if (n.type !== "Identifier")
      throw refuse(
        n,
        "the first parameter of a hook ($) is not a plain name (a pattern, a rest or a default)",
      );
    i.push({ name: n.name, declaration: n, origin: "parameter" });
  }
  for (let u of [n, s, p])
    if (u?.type === "RestElement")
      throw refuse(u, "a hook takes $, e or next into a rest parameter (it would hold next)");
  for (let param of e.params)
    walkAst(param, ({ node: node }) => {
      if (node.type === "AssignmentPattern") throw refuse(node, "a parameter of a hook has a default value");
    });
  let f = {
    ...t,
    bind: {
      dollar: (u) => {
        i.push({ name: u.name, declaration: u, origin: "next" });
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
  if (p !== void 0) scanNextParam({ fn: e, next: p, engineCreate: o }, f);
  scanDollarAliases(e, i, f);
}
/**
 * 扫描全部注册的 hooks。
 */
//@ chunk-bfnfj4kx.js:71804-72289 placement
function scanRegistrations(e, o) {
  let t = scanFromEntry(e, o);
  for (let [r, { linked: n, patterns: s, engineCreate: p }] of t.registered)
    scanHookParams(r, p, {
      refuse: n.scanned.refuse,
      parentOf: n.scanned.parentOf,
      scanned: n.scanned,
      record: (i) => {
        (t.calls.add(i), t.direct.add(i));
      },
      recordTo: (i) => {
        if ((t.nextTo.add(i), i === "user")) s.forEach((a) => t.toUserOn.add(a));
      },
      recordEnv: (i, a) => {
        ao(t, i).add(a);
      },
      recordCommand: (i) => {
        xo(t, i);
      },
      recordState: (i) => {
        recordStateCall(t, i, n.scanned);
      },
      libraryHelper: (i) => stateLibraryCallKind(n.scanned, i),
      follow: scanDollarHolders({ scan: t, linked: n }),
    });
  return (collectLibraryCalls(t), checkStateConsts(t), t);
}
/**
 * 描述表达式类型（用于报错）。
 */
//@ chunk-bfnfj4kx.js:72289-72742 placement
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
var TELEMETRY_TO_HINT = ({ onName: onName, event: event }) =>
  '"to" is a string literal, or a list of them, from ' +
  ke.map((t) => `"${t}"`).join(", ") +
  `, written in the call, so the streams a module's hooks stand on can be listed: ${onName}("${event}", { to: "collector" }, hook)`;
/**
 * 读取 on() 的目的地列表。
 */
//@ chunk-bfnfj4kx.js:72977-73426 placement
function readDestinations(e, o) {
  let { onName: onName, event: event, refuse: refuse } = o;
  return (e.type === "ArrayExpression" ? e.elements : [e]).map((s) => {
    if (s === null)
      throw refuse(
        e,
        `${onName}("${event}") names its destinations as a list with a hole; ${TELEMETRY_TO_HINT(o)}`,
      );
    let p = s.type === "Literal" ? s.value : void 0;
    if (typeof p !== "string")
      throw refuse(
        s,
        `${onName}("${event}") names its destination as ${describeExpression(s)}; ${TELEMETRY_TO_HINT(o)}`,
      );
    if (!Wh(p))
      throw refuse(
        s,
        `${onName}("${event}") names the destination "${p}", which is no telemetry stream; ${TELEMETRY_TO_HINT(o)}`,
      );
    return p;
  });
}
/**
 * 读取 on() 的匹配器参数。
 */
//@ chunk-bfnfj4kx.js:73426-74234 placement
function readMatcher(e, o) {
  let { onName: onName, event: event, refuse: refuse } = o;
  if (e === void 0) return ke;
  switch (e.type) {
    case "ObjectExpression": {
      let found = e.properties.find(
        (property) => property.type === "SpreadElement" || property.computed || property.kind !== "init",
      );
      if (found !== void 0)
        throw refuse(
          found,
          `${onName}("${event}") has a matcher with a spread, a computed key or an accessor, which may set "to" to anything; ` +
            TELEMETRY_TO_HINT(o),
        );
      let [p, i] = e.properties.filter((property) => isNamedProperty(property, "to"));
      if (i !== void 0)
        throw refuse(i, `${onName}("${event}") names "to" twice in one matcher; ` + TELEMETRY_TO_HINT(o));
      return p?.type === "Property" ? readDestinations(p.value, o) : ke;
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
/**
 * 列出模块中遥测钩子所站的流（anthropic/collector）。
 */
//@ chunk-bfnfj4kx.js:74234-74516 placement
function collectTelemetryDestinations(e) {
  let filtered = [...e.registrations].filter(([, r]) => ro(r.event));
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
  return ke.filter((r) => t.has(r));
}
/**
 * 扫描整个 hooks 模块，产出 hooks、calls、nextTo、env、状态等清单。
 */
//@ chunk-bfnfj4kx.js:74516-75019 placement
function scanHooksModule(e, o) {
  let t = scanRegistrations(e, o),
    filtered = tiersBeneath("prepend").filter((f) => t.nextTo.has(f)),
    n = t.envReads.size > 0 || t.envWrites.size > 0,
    s = collectClientModules(e),
    p = summarizeStateAccess(t),
    i = collectRunCommands(t),
    a = collectTelemetryDestinations(t);
  return {
    hooks: Array.from(t.hooks),
    calls: Array.from(t.calls).sort(),
    ...(i !== void 0 && { runCommands: i }),
    ...(filtered.length === 0 ? {} : { nextTo: filtered }),
    ...(t.toUserOn.size > 0 && { toUserOn: Array.from(t.toUserOn) }),
    ...(a !== void 0 && { telemetry: a }),
    ...(n && { env: { reads: Array.from(t.envReads).sort(), writes: Array.from(t.envWrites).sort() } }),
    ...(p !== void 0 && { state: p }),
    ...(s.length > 0 && { clients: s }),
  };
}
/**
 * 按模块图摘要缓存 hooks 模块扫描结果。
 */
//@ chunk-bfnfj4kx.js:75019-75119 placement
function scanHooksModuleCached(e, o) {
  let t = moduleGraphDigest(e),
    r = It.get(t);
  if (r !== void 0) return r;
  let n = scanHooksModule(e, o);
  return (It.set(t, n), n);
}
//@ chunk-bfnfj4kx.js:75119-75173 placement
var En = (e, o, t) => ({ module: e, scan: readBundledScan(o, t), files: readBundledFiles(o) });

export { En, scanRegistrations, scanHooksModuleCached };
