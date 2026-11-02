// Feature extraction shared by the 2.1.316 scan and the reference-source
// scan. Minification renames bindings but keeps string literals, template
// text and property names, so those are what a declaration is fingerprinted
// by. `refs` are the identifiers read in value positions; the scans keep the
// ones that resolve to module-level bindings (call/use edges).
const SKIP = new Set(['loc', 'start', 'end', 'extra', 'leadingComments', 'trailingComments', 'innerComments', 'range', 'typeAnnotation', 'returnType', 'typeParameters', 'superTypeParameters', 'typeArguments']);
const TS_ONLY = /^TS|^(TypeAlias|InterfaceDeclaration|DeclareFunction)/;
const TS_VALUE = new Set(['TSAsExpression', 'TSNonNullExpression', 'TSSatisfiesExpression', 'TSEnumDeclaration', 'TSEnumMember', 'TSParameterProperty', 'TSInstantiationExpression']);

export function walk(node, visit, parent = null, key = null) {
  if (!node || typeof node.type !== 'string') return;
  if (TS_ONLY.test(node.type) && !TS_VALUE.has(node.type)) return;
  visit(node, parent, key);
  for (const k in node) {
    if (SKIP.has(k)) continue;
    const v = node[k];
    if (Array.isArray(v)) for (const c of v) walk(c, visit, node, k);
    else if (v && typeof v.type === 'string') walk(v, visit, node, k);
  }
}

// Identifiers read in a value position (not property names, not object keys).
function isReference(parent, key) {
  if (!parent) return true;
  if ((parent.type === 'MemberExpression' || parent.type === 'OptionalMemberExpression') && key === 'property' && !parent.computed) return false;
  if (/^(ObjectProperty|ObjectMethod|ClassMethod|ClassProperty|ClassPrivateMethod|TSEnumMember)$/.test(parent.type) && key === 'key' && !parent.computed) return false;
  if (/^(LabeledStatement|BreakStatement|ContinueStatement|JSXAttribute|JSXClosingElement)$/.test(parent.type)) return false;
  if (/^(Import|Export)/.test(parent.type)) return false;
  return true;
}

export function features(node) {
  const strings = new Set();
  const props = new Set();
  const refs = new Set();
  let jsx = false;
  walk(node, (n, parent, key) => {
    if ((n.type === 'Identifier' || n.type === 'JSXIdentifier') && isReference(parent, key)) refs.add(n.name);
    switch (n.type) {
      case 'StringLiteral':
        if (n.value.length >= 3 && n.value.length <= 400) strings.add(n.value);
        break;
      case 'TemplateElement': {
        const v = (n.value.cooked ?? n.value.raw).trim();
        if (v.length >= 3 && v.length <= 400) strings.add(v);
        break;
      }
      case 'MemberExpression':
      case 'OptionalMemberExpression':
        if (!n.computed && n.property.type === 'Identifier') props.add(n.property.name);
        else if (n.computed && n.property.type === 'StringLiteral') props.add(n.property.value);
        break;
      case 'ObjectProperty':
      case 'ObjectMethod':
      case 'ClassMethod':
      case 'ClassProperty':
      case 'ClassPrivateMethod':
        if (!n.computed && n.key.type === 'Identifier') props.add(n.key.name);
        else if (n.key.type === 'StringLiteral') props.add(n.key.value);
        break;
      case 'JSXElement':
      case 'JSXFragment':
        jsx = true;
        break;
      case 'JSXAttribute':
        if (n.name.type === 'JSXIdentifier') props.add(n.name.name);
        break;
      case 'TSEnumMember':
        if (n.id.type === 'Identifier') props.add(n.id.name);
        break;
    }
  });
  return { strings: [...strings].slice(0, 400), props: [...props].slice(0, 400), refs, jsx };
}
