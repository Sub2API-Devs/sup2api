// 单模块改名正例：node --test tools/rename/test/
import test from 'node:test';
import assert from 'node:assert/strict';
import { renameModule, bindingsOf, makeOffsetMap } from '../lib/rename.mjs';
import { renameAndCheck, offsetOf } from './helpers.mjs';

const at = (src, name, nth = 0) => '@' + offsetOf(src, name, nth);

test('空命名表：输出与输入逐字节相同', () => {
  const src = '// @bun @bytecode\n// header\nimport{a as b}from"./x.js";let c=b+1;export{c as d};\n';
  const r = renameModule('m.js', src, null, null);
  assert.equal(r.code, src);
  assert.equal(r.edits.length, 0);
  assert.equal(r.offsetMap(10), 10);
});

test('顶层按名字改名，文件头注释保留，其余字节不变', () => {
  const src = '// @bun @bytecode\nfunction a(x){return x+1}var b=a(2);console.log(b);\n';
  const { r, cmp } = renameAndCheck(src, { top: { a: { name: 'addOne', source: 'semantic' }, b: 'result' } });
  assert.equal(r.code, '// @bun @bytecode\nfunction addOne(x){return x+1}var result=addOne(2);console.log(result);\n');
  assert.ok(cmp.ok, JSON.stringify(cmp.diffs));
});

test('简写属性、解构简写与默认值展开为 key:新名', () => {
  const src = 'let a=1;let o={a};let{a:z}=o;function f({a,b=2},[c]){return{a,b,c}}({a}={a});';
  const entry = {
    top: { a: 'alpha' },
    locals: { [at(src, 'a', 3)]: 'pa', [at(src, 'b', 0)]: 'pb' },
  };
  const { r, cmp } = renameAndCheck(src, entry);
  assert.match(r.code, /let o=\{a:alpha\}/);
  assert.match(r.code, /function f\(\{a:pa,b:pb=2\},\[c\]\)\{return\{a:pa,b:pb,c\}\}/);
  assert.match(r.code, /\(\{a:alpha\}=\{a:alpha\}\)/);
  assert.ok(cmp.ok, JSON.stringify(cmp.diffs));
});

test('import / export specifier 改写', () => {
  const src = 'import{x}from"./a.js";import{y as q}from"./b.js";import*as ns from"path";let k=x+q+ns.sep;export{k,k as kk};';
  const { r, cmp } = renameAndCheck(src, { top: { x: 'fromA', q: 'fromB', ns: 'pathMod', k: 'total' } });
  assert.equal(r.code, 'import{x as fromA}from"./a.js";import{y as fromB}from"./b.js";import*as pathMod from"path";let total=fromA+fromB+pathMod.sep;export{total as k,total as kk};');
  assert.ok(cmp.ok, JSON.stringify(cmp.diffs));
});

test('冲突：新名字会捕获全局 process → 加后缀', () => {
  const src = 'function f(a){return process.env[a]}';
  const { r, cmp } = renameAndCheck(src, { locals: { [at(src, 'a')]: 'process' } });
  assert.equal(r.code, 'function f(process_2){return process.env[process_2]}');
  assert.equal(r.conflicts.length, 1);
  assert.equal(r.conflicts[0].reason, 'captures-outer-or-global');
  assert.ok(cmp.ok);
});

test('冲突：会被内层同名绑定遮蔽 → 加后缀', () => {
  const src = 'let a=1;function g(){let b=2;return a+b}';
  const { r, cmp } = renameAndCheck(src, { top: { a: 'b' } });
  assert.equal(r.code, 'let b_2=1;function g(){let b=2;return b_2+b}');
  assert.equal(r.conflicts[0].reason, 'shadowed-by-inner');
  assert.ok(cmp.ok);
});

test('冲突：外层引用会被新名字捕获 → 加后缀', () => {
  const src = 'let a=1;function g(b){return a+b}';
  const { r, cmp } = renameAndCheck(src, { locals: { [at(src, 'b')]: 'a' } });
  assert.equal(r.code, 'let a=1;function g(a_2){return a+a_2}');
  assert.ok(cmp.ok);
});

test('冲突：参数与函数体 let 同名、catch 参数与 catch 块同名（语法错误）→ 加后缀', () => {
  const src = 'function f(a,u){let b=a;return b}try{}catch(e){let c=1}';
  const { r, cmp } = renameAndCheck(src, { locals: { [at(src, 'u')]: 'b', [at(src, 'e')]: 'c' } });
  assert.equal(r.code, 'function f(a,b_2){let b=a;return b}try{}catch(c_2){let c=1}');
  assert.ok(cmp.ok);
});

test('冲突：同一作用域两个绑定请求同名 → 第二个加后缀', () => {
  const src = 'let a=1,b=2;use(a,b);';
  const { r, cmp } = renameAndCheck(src, { top: { a: 'item', b: 'item' } });
  assert.equal(r.code, 'let item=1,item_2=2;use(item,item_2);');
  assert.ok(cmp.ok);
});

test('交换两个名字（a↔b）也是安全的', () => {
  const src = 'let a=1,b=2;use(a,b);';
  const { r, cmp } = renameAndCheck(src, { top: { a: 'b', b: 'a' } });
  assert.equal(cmp.ok, true);
  // 先处理 a：b 已被占用 → b_2；再处理 b → a
  assert.equal(r.code, 'let b_2=1,a=2;use(b_2,a);');
});

test('var 提升穿过块：块内 let 同名会导致语法错误 → 加后缀', () => {
  const src = 'function f(){{let x=1;{var v=2}}return v}';
  const { r, cmp } = renameAndCheck(src, { locals: { [at(src, 'v')]: 'x' } });
  assert.equal(r.code, 'function f(){{let x=1;{var x_2=2}}return x_2}');
  assert.ok(cmp.ok);
});

test('直接 eval：链上的绑定冻结并报告；间接 eval 不冻结', () => {
  const src = 'function f(a){let b=1;return eval("a+b")}function g(c){return(0,eval)("c")}';
  const r = renameModule('m.js', src, { locals: { [at(src, 'a')]: 'x', [at(src, 'b')]: 'y', [at(src, 'c')]: 'z' } }, null);
  assert.deepEqual(r.rejected.map((x) => x.reason), ['frozen: direct-eval', 'frozen: direct-eval']);
  assert.equal(r.code, 'function f(a){let b=1;return eval("a+b")}function g(z){return(0,eval)("c")}');
  assert.equal(r.directEvals.length, 1);
});

test('非法名字（保留字、非标识符）被拒绝', () => {
  const src = 'let a=1,b=2,c=3;use(a,b,c)';
  const r = renameModule('m.js', src, { top: { a: 'class', b: '1x', c: 'arguments' } }, null);
  assert.equal(r.rejected.length, 3);
  assert.equal(r.code, src);
});

test('函数表达式名、类表达式名、for 头部 let、switch 块', () => {
  const src = 'let f=function g(n){return n?g(n-1):0};let C=class D{m(){return D}};for(let i=0;i<2;i++){let j=i}switch(1){case 1:let s=2;use(s)}';
  const entry = { locals: { [at(src, 'g')]: 'loop', [at(src, 'D')]: 'Self', [at(src, 'i')]: 'idx', [at(src, 's')]: 'sv' } };
  const { r, cmp } = renameAndCheck(src, entry);
  assert.equal(r.code, 'let f=function loop(n){return n?loop(n-1):0};let C=class Self{m(){return Self}};for(let idx=0;idx<2;idx++){let j=idx}switch(1){case 1:let sv=2;use(sv)}');
  assert.ok(cmp.ok);
});

test('arguments、this、new.target、import.meta 不受影响', () => {
  const src = 'function f(a){return[arguments[0],a,this,new.target,import.meta.url]}';
  const { r, cmp } = renameAndCheck(src, { locals: { [at(src, 'a')]: 'first' } });
  assert.equal(r.code, 'function f(first){return[arguments[0],first,this,new.target,import.meta.url]}');
  assert.ok(cmp.ok);
});

test('offsetMap：声明区间两端精确映射，替换内部偏移映射到替换末尾', () => {
  const src = 'var a=1;function bb(){return a}var c=bb();';
  const r = renameModule('m.js', src, { top: { a: 'alpha', bb: 'b', c: 'gamma' } }, null);
  assert.equal(r.code, 'var alpha=1;function b(){return alpha}var gamma=b();');
  // 顶层声明 [start,end) 切片
  const decls = [[0, 8], [8, 31], [31, 42]];
  const sliced = decls.map(([s, e]) => r.code.slice(r.offsetMap(s), r.offsetMap(e)));
  assert.deepEqual(sliced, ['var alpha=1;', 'function b(){return alpha}', 'var gamma=b();']);
  assert.equal(r.offsetMap(4), 4); // a 的起点
  assert.equal(r.offsetMap(5), 9); // a 的终点 → alpha 的终点
  assert.equal(r.offsetMap(src.length), r.code.length);
  const m = makeOffsetMap([{ start: 2, end: 4, text: 'xyz' }]);
  assert.deepEqual([0, 2, 3, 4, 5].map(m), [0, 2, 5, 5, 6]);
});

test('bindingsOf 列出每个绑定的键、作用域、种类、所属顶层声明', () => {
  const src = 'import{x}from"./a.js";function f(a){let b=a;return b}var g=1;';
  const bs = bindingsOf('m.js', src);
  const byName = Object.fromEntries(bs.map((b) => [b.name, b]));
  assert.equal(byName.x.kind, 'import');
  assert.equal(byName.x.scope, 'top');
  assert.equal(byName.f.kind, 'function');
  assert.equal(byName.a.scope, 'local');
  assert.equal(byName.a.topDeclStart, src.indexOf('function'));
  assert.equal(byName.b.key, '@' + src.indexOf('b='));
  assert.equal(byName.g.kind, 'var');
  assert.equal(bs.length, 5);
});

test('同一绑定多处声明（var a; var a;）按任一偏移都能命名', () => {
  const src = 'var a=1;var a=2;use(a)';
  const r = renameModule('m.js', src, { locals: { ['@' + src.lastIndexOf('a=')]: 'twice' } }, null);
  assert.equal(r.code, 'var twice=1;var twice=2;use(twice)');
});

test('直接 eval 的代码静态可知：只冻结它查的名字，其他绑定照常改名，也不会改成它查的名字', () => {
  const src = 'function f(m){let a=1,b=2;return a+eval("quire".replace(/^/,"re"))(m)+b}';
  const r = renameModule('m.js', src, { locals: { [at(src, 'm')]: 'moduleName', [at(src, 'a')]: 'require', [at(src, 'b')]: 'second' } }, null);
  assert.equal(r.code, 'function f(moduleName){let require_2=1,second=2;return require_2+eval("quire".replace(/^/,"re"))(moduleName)+second}');
  assert.equal(r.rejected.length, 0);
  const own = 'function g(require,x){return eval("require")(x)}';
  const r2 = renameModule('m.js', own, { locals: { [at(own, 'require')]: 'req', [at(own, 'x')]: 'id' } }, null);
  assert.equal(r2.code, 'function g(require,id){return eval("require")(id)}');
  assert.deepEqual(r2.rejected.map((x) => x.reason), ['frozen: direct-eval']);
});

test('直接 eval 的代码不可知：整条链冻结', () => {
  const src = 'function f(a,s){return eval(s)+a}';
  const r = renameModule('m.js', src, { locals: { [at(src, 'a')]: 'x' } }, null);
  assert.equal(r.code, src);
});
