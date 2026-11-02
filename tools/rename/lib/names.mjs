// 标识符合法性与保留字。改名引擎只接受 ASCII 标识符（[A-Za-z_$][A-Za-z0-9_$]*），
// 并拒绝严格模式 / 模块代码里不能作为绑定名的词。
// 用法：import { isValidBindingName, suffixed } from './names.mjs'

// ES 关键字 + 严格模式保留字 + 模块代码里的 await；arguments/eval 在严格模式下不能被绑定。
const RESERVED = new Set([
  'break', 'case', 'catch', 'class', 'const', 'continue', 'debugger', 'default', 'delete', 'do',
  'else', 'enum', 'export', 'extends', 'false', 'finally', 'for', 'function', 'if', 'import', 'in',
  'instanceof', 'new', 'null', 'return', 'super', 'switch', 'this', 'throw', 'true', 'try', 'typeof',
  'var', 'void', 'while', 'with', 'yield', 'let', 'static', 'implements', 'interface', 'package',
  'private', 'protected', 'public', 'await', 'arguments', 'eval',
]);

const IDENT = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

export function isValidBindingName(name) {
  return typeof name === 'string' && IDENT.test(name) && !RESERVED.has(name);
}

// 导出名可以是任意 IdentifierName，但为了让导入方能写 `import {x}`，这里同样要求是合法绑定名。
export const isValidExportName = isValidBindingName;

// 冲突时的候选名：name、name_2、name_3……
export function suffixed(name, n) {
  return n <= 1 ? name : `${name}_${n}`;
}
