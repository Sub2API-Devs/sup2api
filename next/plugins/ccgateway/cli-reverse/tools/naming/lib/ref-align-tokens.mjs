// ref-align 的词法化：把一个顶层声明（316 的压缩 JS，或 2.1.88 的 TS/TSX）按源码顺序
// 转成同一套归一化 token 序列，供两边对齐。
//
// token = { t, b }：
//   t  相等比较用的字符串。标识符按"它解析到哪里"分三类：
//        'L'        函数内局部绑定（通配，对齐后据此投票）；b = 绑定（316: scope.mjs 的 Binding；旧版: Babel traverse 的 Binding）
//        'M'        模块级绑定（导入、顶层声明；两边压缩程度不同，通配）
//        'G:<名>'   全局（process、Object……两边同名）
//      字面量带值（'s:<字符串>'、'n:<数字>'、'true'、'undefined'……），属性名 '.<名>'、对象键 'k:<名>'，
//      关键字与少量结构标点原样。
//   归一化（抵消 Bun 压缩器的改写）：!0/!1 → true/false，void 0 → undefined，无插值模板 → 字符串，
//   const/let/var → decl，箭头函数表达式体 → { return … }，?. → .。
//   旧版 TS：类型节点全部跳过（TSAsExpression 等只取表达式）；JSX 转成 Bun jsx 运行时调用形态
//   M(组件, {属性…, children: …}, key)。
//
// 用法：tokensOf(node, idTok, onFn?) → token[]；idTok(identifierNode) 由调用方按各自的作用域分析给出 {t, b, d}；
// onFn(fnNode, from, to) 在每个函数（含方法、箭头函数）的 token 区间生成完后回调（嵌套函数先于外层）。

const SKIP_KEYS = new Set(['loc', 'start', 'end', 'extra', 'range', 'leadingComments', 'trailingComments', 'innerComments', 'comments',
  'typeAnnotation', 'returnType', 'typeParameters', 'typeArguments', 'superTypeParameters', 'superTypeArguments', 'implements', 'decorators', 'predicate']);
const TS_EXPR = new Set(['TSAsExpression', 'TSSatisfiesExpression', 'TSNonNullExpression', 'TSTypeAssertion', 'TSInstantiationExpression']);

// JSX 文本按 React 规则清理（与 Babel/Bun 的 cleanJSXElementLiteralChild 一致）。
function cleanJsxText(value) {
  const lines = value.split(/\r\n|\n|\r/);
  let last = 0;
  for (let i = 0; i < lines.length; i++) if (/[^ \t]/.test(lines[i])) last = i;
  let str = '';
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].replace(/\t/g, ' ');
    if (i !== 0) line = line.replace(/^[ ]+/, '');
    if (i !== lines.length - 1) line = line.replace(/[ ]+$/, '');
    if (line) {
      if (i !== last) line += ' ';
      str += line;
    }
  }
  return str;
}

const keyName = (k, computed) => {
  if (computed) return null;
  if (!k) return null;
  if (k.type === 'Identifier') return k.name;
  if (k.type === 'StringLiteral') return k.value;
  if (k.type === 'NumericLiteral') return String(k.value);
  if (k.type === 'PrivateName') return '#' + k.id.name;
  return null;
};

export function tokensOf(root, idTok, onFn) {
  const out = [];
  const T = (t) => out.push({ t, b: null });
  const list = (arr, sep = ',') => {
    arr.forEach((x, i) => {
      if (i && sep) T(sep);
      v(x);
    });
  };
  const fn = (n) => {
    const from = out.length;
    if (n.async) T('async');
    T('fn');
    if (n.generator) T('*');
    if (n.id) v(n.id);
    T('(');
    list(n.params);
    T(')');
    if (n.body.type === 'BlockStatement') v(n.body);
    else {
      T('{');
      T('return');
      v(n.body);
      T('}');
    }
    onFn?.(n, from, out.length);
  };
  const key = (n) => {
    const k = keyName(n.key, n.computed);
    if (k !== null) T('k:' + k);
    else {
      T('[');
      v(n.key);
      T(']');
    }
  };
  // 对象属性 / 解构属性 / JSX 属性的值是局部绑定时，键名并进绑定 token：'L@<键>'（只与同键的局部绑定相等，
  // 避免 {a: x, b: y} 与 {b: y2, c: z} 这类串位；Bun 不改属性键，所以这是最可靠的对齐点）
  const keyed = (k, val) => {
    let id = val, dflt = null;
    if (val?.type === 'AssignmentPattern') { id = val.left; dflt = val.right; }
    if (id?.type === 'Identifier') {
      const tk = idTok(id);
      if (tk.t === 'L') {
        out.push({ ...tk, t: 'L@' + k });
        if (dflt) { T('='); v(dflt); }
        return;
      }
    }
    T(':');
    v(val);
  };
  // JSX → jsx(type, props, key)
  const jsxName = (n) => {
    if (n.type === 'JSXIdentifier') {
      if (/^[a-z]/.test(n.name) && !n.name.includes('.')) T('s:' + n.name);
      else out.push(idTok(n));
    } else if (n.type === 'JSXMemberExpression') {
      jsxName(n.object);
      T('.' + n.property.name);
    } else if (n.type === 'JSXNamespacedName') T('s:' + n.namespace.name + ':' + n.name.name);
  };
  const jsxChildren = (children) => {
    const kids = [];
    for (const c of children) {
      if (c.type === 'JSXText') {
        const s = cleanJsxText(c.value);
        if (s) kids.push({ text: s });
      } else if (c.type === 'JSXExpressionContainer') {
        if (c.expression.type !== 'JSXEmptyExpression') kids.push(c.expression);
      } else if (c.type === 'JSXSpreadChild') kids.push(c.expression);
      else kids.push(c);
    }
    if (!kids.length) return;
    T('k:children');
    T(':');
    const one = (k) => (k.text !== undefined ? T('s:' + k.text) : v(k));
    if (kids.length === 1) one(kids[0]);
    else {
      T('[');
      kids.forEach((k, i) => {
        if (i) T(',');
        one(k);
      });
      T(']');
    }
  };
  const jsx = (n) => {
    T('M'); // jsx / jsxs 运行时函数
    T('(');
    let keyAttr = null;
    if (n.type === 'JSXFragment') T('M');
    else jsxName(n.openingElement.name);
    T(',');
    T('{');
    if (n.type === 'JSXElement') {
      for (const a of n.openingElement.attributes) {
        if (a.type === 'JSXSpreadAttribute') {
          T('...');
          v(a.argument);
          continue;
        }
        const name = a.name.type === 'JSXNamespacedName' ? a.name.namespace.name + ':' + a.name.name.name : a.name.name;
        if (name === 'key') {
          keyAttr = a;
          continue;
        }
        T('k:' + name);
        if (!a.value) { T(':'); T('true'); }
        else if (a.value.type === 'StringLiteral') { T(':'); T('s:' + a.value.value); }
        else if (a.value.type === 'JSXExpressionContainer') keyed(name, a.value.expression);
        else { T(':'); v(a.value); }
      }
    }
    jsxChildren(n.children);
    T('}');
    if (keyAttr) {
      T(',');
      if (keyAttr.value?.type === 'StringLiteral') T('s:' + keyAttr.value.value);
      else if (keyAttr.value?.type === 'JSXExpressionContainer') v(keyAttr.value.expression);
    }
    T(')');
  };

  function v(n) {
    if (!n || typeof n.type !== 'string') return;
    if (TS_EXPR.has(n.type)) return v(n.expression);
    if (n.type === 'TSParameterProperty') return v(n.parameter);
    if (n.type.startsWith('TS')) return; // 接口、类型别名、declare、enum……
    if (n.declare) return;
    switch (n.type) {
      case 'Identifier': {
        const tk = idTok(n);
        if (tk.t === 'G:undefined') return T('undefined');
        return out.push(tk);
      }
      case 'JSXIdentifier':
        return out.push(idTok(n));
      case 'PrivateName':
        return T('#' + n.id.name);
      case 'StringLiteral':
        return T('s:' + n.value);
      case 'NumericLiteral':
        return T('n:' + n.value);
      case 'BigIntLiteral':
        return T('n:' + n.value);
      case 'BooleanLiteral':
        return T(String(n.value));
      case 'NullLiteral':
        return T('null');
      case 'RegExpLiteral':
        return T('r:' + n.pattern + '/' + n.flags);
      case 'TemplateLiteral':
        if (!n.expressions.length) return T('s:' + (n.quasis[0].value.cooked ?? n.quasis[0].value.raw));
        T('`');
        n.quasis.forEach((q, i) => {
          const s = q.value.cooked ?? q.value.raw;
          if (s) T('q:' + s);
          if (i < n.expressions.length) v(n.expressions[i]);
        });
        return T('`');
      case 'TaggedTemplateExpression':
        v(n.tag);
        return v(n.quasi);
      case 'ThisExpression':
        return T('this');
      case 'Super':
        return T('super');
      case 'Import':
        return T('import');
      case 'MetaProperty':
        return T(n.meta.name + '.' + n.property.name);
      case 'ImportExpression':
        T('import');
        T('(');
        v(n.source);
        if (n.options) {
          T(',');
          v(n.options);
        }
        return T(')');
      case 'UnaryExpression':
        if (n.operator === '!' && n.argument.type === 'NumericLiteral' && (n.argument.value === 0 || n.argument.value === 1)) return T(n.argument.value === 0 ? 'true' : 'false');
        if (n.operator === 'void' && n.argument.type === 'NumericLiteral') return T('undefined');
        T(n.operator);
        return v(n.argument);
      case 'UpdateExpression':
        if (n.prefix) {
          T(n.operator);
          return v(n.argument);
        }
        v(n.argument);
        return T(n.operator);
      case 'BinaryExpression':
      case 'LogicalExpression':
      case 'AssignmentExpression':
        v(n.left);
        T(n.operator);
        return v(n.right);
      case 'ConditionalExpression':
        v(n.test);
        T('?');
        v(n.consequent);
        T(':');
        return v(n.alternate);
      case 'SequenceExpression':
        return list(n.expressions);
      case 'ParenthesizedExpression':
        return v(n.expression);
      case 'AwaitExpression':
        T('await');
        return v(n.argument);
      case 'YieldExpression':
        T(n.delegate ? 'yield*' : 'yield');
        return v(n.argument);
      case 'SpreadElement':
      case 'RestElement':
        T('...');
        return v(n.argument);
      case 'MemberExpression':
      case 'OptionalMemberExpression':
        v(n.object);
        if (!n.computed) return T('.' + (n.property.type === 'PrivateName' ? '#' + n.property.id.name : n.property.name));
        if (n.property.type === 'StringLiteral') return T('.' + n.property.value);
        T('[');
        v(n.property);
        return T(']');
      case 'CallExpression':
      case 'OptionalCallExpression':
      case 'NewExpression':
        if (n.type === 'NewExpression') T('new');
        v(n.callee);
        T('(');
        list(n.arguments);
        return T(')');
      case 'ArrayExpression':
      case 'ArrayPattern':
        T('[');
        n.elements.forEach((e, i) => {
          if (i) T(',');
          if (e) v(e);
        });
        return T(']');
      case 'ObjectExpression':
      case 'ObjectPattern':
        T('{');
        n.properties.forEach((p, i) => {
          if (i) T(',');
          v(p);
        });
        return T('}');
      case 'ObjectProperty': {
        const k = keyName(n.key, n.computed);
        key(n);
        if (k === null) {
          T(':');
          return v(n.value);
        }
        return keyed(k, n.value);
      }
      case 'ObjectMethod':
      case 'ClassMethod':
      case 'ClassPrivateMethod':
        if (n.static) T('static');
        if (n.kind === 'get' || n.kind === 'set') T(n.kind);
        key(n);
        return fn({ ...n, id: null });
      case 'ClassProperty':
      case 'ClassPrivateProperty':
      case 'ClassAccessorProperty':
        if (n.static) T('static');
        key(n);
        if (n.value) {
          T('=');
          v(n.value);
        }
        return;
      case 'StaticBlock':
        T('static');
        T('{');
        list(n.body, null);
        return T('}');
      case 'AssignmentPattern':
        v(n.left);
        T('=');
        return v(n.right);
      case 'FunctionDeclaration':
      case 'FunctionExpression':
      case 'ArrowFunctionExpression':
        return fn(n);
      case 'ClassDeclaration':
      case 'ClassExpression':
        T('class');
        if (n.id) v(n.id);
        if (n.superClass) {
          T('extends');
          v(n.superClass);
        }
        T('{');
        list(n.body.body, null);
        return T('}');
      case 'VariableDeclaration':
        T('decl');
        n.declarations.forEach((d, i) => {
          if (i) T(',');
          v(d.id);
          if (d.init) {
            T('=');
            v(d.init);
          }
        });
        return;
      case 'BlockStatement':
      case 'Program':
        T('{');
        list(n.body, null);
        return T('}');
      case 'ExpressionStatement':
        return v(n.expression);
      case 'ReturnStatement':
        T('return');
        return v(n.argument);
      case 'ThrowStatement':
        T('throw');
        return v(n.argument);
      case 'IfStatement':
        T('if');
        v(n.test);
        v(n.consequent);
        if (n.alternate) {
          T('else');
          v(n.alternate);
        }
        return;
      case 'ForStatement':
        T('for');
        T('(');
        v(n.init);
        T(';');
        v(n.test);
        T(';');
        v(n.update);
        T(')');
        return v(n.body);
      case 'ForOfStatement':
      case 'ForInStatement':
        T('for');
        if (n.await) T('await');
        v(n.left);
        T(n.type === 'ForOfStatement' ? 'of' : 'in');
        v(n.right);
        return v(n.body);
      case 'WhileStatement':
        T('while');
        v(n.test);
        return v(n.body);
      case 'DoWhileStatement':
        T('do');
        v(n.body);
        T('while');
        return v(n.test);
      case 'SwitchStatement':
        T('switch');
        v(n.discriminant);
        T('{');
        for (const c of n.cases) {
          T(c.test ? 'case' : 'default');
          v(c.test);
          T(':');
          list(c.consequent, null);
        }
        return T('}');
      case 'TryStatement':
        T('try');
        v(n.block);
        if (n.handler) {
          T('catch');
          v(n.handler.param);
          v(n.handler.body);
        }
        if (n.finalizer) {
          T('finally');
          v(n.finalizer);
        }
        return;
      case 'LabeledStatement':
        return v(n.body);
      case 'BreakStatement':
        return T('break');
      case 'ContinueStatement':
        return T('continue');
      case 'EmptyStatement':
      case 'DebuggerStatement':
        return;
      case 'ExportNamedDeclaration':
      case 'ExportDefaultDeclaration':
        return v(n.declaration);
      case 'JSXElement':
      case 'JSXFragment':
        return jsx(n);
      case 'JSXExpressionContainer':
        return v(n.expression);
      case 'JSXText': {
        const s = cleanJsxText(n.value);
        return s ? T('s:' + s) : undefined;
      }
      case 'Directive':
        return T('s:' + n.value.value);
      default: {
        // 兜底：子节点按源码位置顺序访问
        const kids = [];
        for (const k in n) {
          if (SKIP_KEYS.has(k)) continue;
          const x = n[k];
          if (Array.isArray(x)) for (const y of x) { if (y && typeof y.type === 'string') kids.push(y); }
          else if (x && typeof x.type === 'string') kids.push(x);
        }
        kids.sort((a, b) => a.start - b.start);
        T(n.type);
        for (const k of kids) v(k);
      }
    }
  }
  v(root);
  return out;
}
