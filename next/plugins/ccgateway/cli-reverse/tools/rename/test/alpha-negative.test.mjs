// α 校验负例：错误的改名必须被拒绝；正确的改名必须通过。node --test tools/rename/test/
import test from 'node:test';
import assert from 'node:assert/strict';
import { alpha, alphaTree } from './helpers.mjs';

const kinds = (r) => r.diffs.map((d) => d.kind);

test('正例：一致的改名通过', () => {
  assert.ok(alpha('let a=1;function f(b){return a+b}', 'let x=1;function f(y){return x+y}').ok);
  assert.ok(alpha('let a=1;({a});', 'let x=1;({a:x});').ok, '简写展开');
  assert.ok(alpha('import{a}from"./m.js";a()', 'import{a as b}from"./m.js";b()').ok);
});

test('负例：两个不同绑定改成同名导致捕获（内层遮蔽外层）', () => {
  const r = alpha('let a=1;function f(b){return a+b}', 'let a=1;function f(a){return a+a}');
  assert.equal(r.ok, false);
  // 第一个引用 a 在 A 里指向顶层 let，在 B 里指向参数：种类不同即报告（种类相同时报 bijection，见下一条）
  assert.ok(kinds(r).includes('binding-kind'), JSON.stringify(r.diffs));
  const r2 = alpha('let a=1;{let b=2;use(a,b)}', '{let a=2;use(a,a)}'.replace('{', 'let a=1;{'));
  assert.equal(r2.ok, false);
  assert.ok(kinds(r2).includes('bijection'), JSON.stringify(r2.diffs));
});

test('负例：两个同作用域绑定改成同名 → 重复声明，B 无法解析', () => {
  const r = alpha('let a=1,b=2;use(a,b)', 'let x=1,x=2;use(x,x)');
  assert.equal(r.ok, false);
  assert.deepEqual(kinds(r), ['parse-b']);
});

test('负例：参数与函数体 var 合并成一个绑定', () => {
  const r = alpha('function f(a){var b=1;return a+b}', 'function f(a){var a=1;return a+a}');
  assert.equal(r.ok, false);
  assert.ok(kinds(r).some((k) => k === 'bijection' || k === 'bindings'), JSON.stringify(r.diffs));
});

test('负例：只改错一个引用（漏改 → 变成全局）', () => {
  const r = alpha('let a=1;use(a,a)', 'let x=1;use(x,a)');
  assert.equal(r.ok, false);
  assert.ok(kinds(r).includes('capture'), JSON.stringify(r.diffs));
});

test('负例：一个引用改成了另一个绑定的名字', () => {
  const r = alpha('let a=1,b=2;use(a,b,a)', 'let x=1,y=2;use(x,y,y)');
  assert.equal(r.ok, false);
  assert.ok(kinds(r).includes('bijection'));
});

test('负例：全局变量被改名（process → proc）', () => {
  const r = alpha('process.exit(0)', 'proc.exit(0)');
  assert.equal(r.ok, false);
  assert.ok(kinds(r).includes('global'));
});

test('负例：引用被新绑定捕获（全局 → 局部）', () => {
  const r = alpha('function f(a){return process.env[a]}', 'function f(process){return process.env[process]}');
  assert.equal(r.ok, false);
  assert.ok(kinds(r).includes('capture'));
});

test('负例：属性名、简写键、字符串、数字、正则、模板、注释、文件头的任何变化', () => {
  const cases = [
    ['o.a', 'o.b', 'name'],
    ['let a=1;({a})', 'let b=1;({b})', 'name'], // 简写没有展开：键从 a 变成 b
    ['f("x")', 'f("y")', 'value'],
    ['f(1)', 'f(0x1)', 'extra'],
    ['f(/a/g)', 'f(/a/i)', 'value'],
    ['f(`a${1}`)', 'f(`b${1}`)', 'value'],
    ['// @bun @bytecode\nf()', 'f()', 'comments'],
    ['/*x*/f()', '/*y*/f()', 'comments'],
    ['f(a,b)', 'f(a)', 'shape'],
    ['a+b', 'a-b', 'value'],
    ['x:for(;;)break x', 'y:for(;;)break y', 'name'],
    ['class A{#p=1;m(){return this.#p}}', 'class A{#q=1;m(){return this.#q}}', 'name'],
    ['(a,b)', 'a,b', 'extra'],
  ];
  for (const [a, b, k] of cases) {
    const r = alpha(a, b);
    assert.equal(r.ok, false, `${a} vs ${b} should fail`);
    assert.ok(kinds(r).includes(k), `${a} vs ${b}: expected ${k}, got ${JSON.stringify(kinds(r))}`);
  }
});

test('负例：直接 eval 可见的绑定被改名', () => {
  const r = alpha('function f(a){return eval("a")}', 'function f(b){return eval("a")}');
  assert.equal(r.ok, false);
  assert.ok(kinds(r).includes('eval'));
});

test('负例：let ↔ var 等声明种类变化', () => {
  const r = alpha('{let a=1;use(a)}', '{var a=1;use(a)}');
  assert.equal(r.ok, false);
});

test('跨模块正例：导出方改名、导入方 specifier 同步', () => {
  const A = { 'a.js': 'function f(){}export{f as foo};', 'b.js': 'import{foo}from"./a.js";foo();' };
  const B = { 'a.js': 'function run(){}export{run as runAll};', 'b.js': 'import{runAll}from"./a.js";runAll();' };
  const r = alphaTree(A, B);
  assert.ok(r.ok, JSON.stringify(r.cross) + JSON.stringify(r.results.map((x) => x.diffs)));
});

test('跨模块负例：导出改名不同步（导入方仍用旧名）', () => {
  const A = { 'a.js': 'function f(){}export{f as foo};', 'b.js': 'import{foo}from"./a.js";foo();' };
  const B = { 'a.js': 'function f(){}export{f as bar};', 'b.js': 'import{foo}from"./a.js";foo();' };
  const r = alphaTree(A, B);
  assert.equal(r.ok, false);
  assert.deepEqual(r.cross.map((d) => d.kind), ['import-sync']);
});

test('跨模块负例：导入了导出方不存在的名字', () => {
  const A = { 'a.js': 'let f=1;export{f as foo};', 'b.js': 'import{foo}from"./a.js";use(foo);' };
  const B = { 'a.js': 'let f=1;export{f as foo};', 'b.js': 'import{fooo}from"./a.js";use(fooo);' };
  const r = alphaTree(A, { ...B });
  assert.equal(r.ok, false);
  assert.deepEqual(r.cross.map((d) => d.kind), ['import-sync']);
});

test('跨模块负例：导入方改成了导出方的另一个导出', () => {
  const A = { 'a.js': 'let f=1,g=2;export{f as foo,g as goo};', 'b.js': 'import{foo}from"./a.js";use(foo);' };
  const B = { 'a.js': 'let f=1,g=2;export{f as foo,g as goo};', 'b.js': 'import{goo}from"./a.js";use(goo);' };
  const r = alphaTree(A, B);
  assert.equal(r.ok, false);
  assert.deepEqual(r.cross.map((d) => d.kind), ['import-sync']);
});

test('跨模块负例：外部模块（node 内建）的导入名被改', () => {
  const r = alphaTree({ 'b.js': 'import{readFile}from"fs";readFile()' }, { 'b.js': 'import{readFileX}from"fs";readFileX()' });
  assert.equal(r.ok, false);
  assert.deepEqual(r.cross.map((d) => d.kind), ['import-external']);
});

test('跨模块负例：被 import() 动态加载的模块导出名被改', () => {
  const A = { 'a.js': 'let f=1;export{f as foo};', 'b.js': 'let m=await import("./a.js");use(m.foo);' };
  const B = { 'a.js': 'let f=1;export{f as bar};', 'b.js': 'let m=await import("./a.js");use(m.foo);' };
  const r = alphaTree(A, B);
  assert.equal(r.ok, false);
  assert.deepEqual(r.cross.map((d) => d.kind), ['frozen-export']);
});

test('跨模块负例：模块内导出名映射不是双射（两个导出改成同名）', () => {
  const A = { 'a.js': 'let f=1,g=2;export{f as foo,g as goo};' };
  const B = { 'a.js': 'let f=1,g=2;export{f as foo,g as foo};' };
  const r = alphaTree(A, B);
  assert.equal(r.ok, false);
});
