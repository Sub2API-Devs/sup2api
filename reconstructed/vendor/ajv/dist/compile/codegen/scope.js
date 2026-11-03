/**
 * ajv/dist/compile/codegen/scope.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: ajv@8.13.0
 * pieces: chunk-s82q9s4x.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../../runtime/bun-runtime.js";
import { require_code } from "./code.js";

//@ chunk-s82q9s4x.js:2859-5426 cjs-fingerprint
var require_scope = x(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.ValueScope =
    cjsExports.ValueScopeName =
    cjsExports.Scope =
    cjsExports.varKinds =
    cjsExports.UsedValueState =
      undefined;
  var code_1 = require_code();
  class ValueError extends Error {
    constructor(name) {
      super(`CodeGen: "code" for ${name} not defined`);
      this.value = name.value;
    }
  }
  var UsedValueState;
  (function (UsedValueState) {
    UsedValueState[(UsedValueState.Started = 0)] = "Started";
    UsedValueState[(UsedValueState.Completed = 1)] = "Completed";
  })(UsedValueState || (cjsExports.UsedValueState = UsedValueState = {}));
  cjsExports.varKinds = {
    const: new code_1.Name("const"),
    let: new code_1.Name("let"),
    var: new code_1.Name("var"),
  };
  class Scope {
    constructor({ prefixes, parent } = {}) {
      this._names = {};
      this._prefixes = prefixes;
      this._parent = parent;
    }
    toName(nameOrPrefix) {
      return nameOrPrefix instanceof code_1.Name ? nameOrPrefix : this.name(nameOrPrefix);
    }
    name(prefix) {
      return new code_1.Name(this._newName(prefix));
    }
    _newName(prefix) {
      let ng = this._names[prefix] || this._nameGroup(prefix);
      return `${prefix}${ng.index++}`;
    }
    _nameGroup(prefix) {
      var _a;
      var _b;
      if (
        ((_b = (_a = this._parent) === null || _a === undefined ? undefined : _a._prefixes) === null ||
        _b === undefined
          ? undefined
          : _b.has(prefix)) ||
        (this._prefixes && !this._prefixes.has(prefix))
      )
        throw Error(`CodeGen: prefix "${prefix}" is not allowed in this scope`);
      return (this._names[prefix] = {
        prefix,
        index: 0,
      });
    }
  }
  cjsExports.Scope = Scope;
  class ValueScopeName extends code_1.Name {
    constructor(prefix, nameStr) {
      super(nameStr);
      this.prefix = prefix;
    }
    setValue(value, { property, itemIndex }) {
      this.value = value;
      this.scopePath = code_1._`.${new code_1.Name(property)}[${itemIndex}]`;
    }
  }
  cjsExports.ValueScopeName = ValueScopeName;
  var line = code_1._`\n`;
  class ValueScope extends Scope {
    constructor(opts) {
      super(opts);
      this._values = {};
      this._scope = opts.scope;
      this.opts = {
        ...opts,
        _n: opts.lines ? line : code_1.nil,
      };
    }
    get() {
      return this._scope;
    }
    name(prefix) {
      return new ValueScopeName(prefix, this._newName(prefix));
    }
    value(nameOrPrefix, value) {
      var _a;
      if (value.ref === undefined) throw Error("CodeGen: ref must be passed in value");
      let name = this.toName(nameOrPrefix);
      let { prefix } = name;
      let valueKey = (_a = value.key) !== null && _a !== undefined ? _a : value.ref;
      let vs = this._values[prefix];
      if (vs) {
        let _name = vs.get(valueKey);
        if (_name) return _name;
      } else vs = this._values[prefix] = new Map();
      vs.set(valueKey, name);
      let s = this._scope[prefix] || (this._scope[prefix] = []);
      let itemIndex = s.length;
      s[itemIndex] = value.ref;
      name.setValue(value, {
        property: prefix,
        itemIndex,
      });
      return name;
    }
    getValue(prefix, keyOrRef) {
      let vs = this._values[prefix];
      if (!vs) return;
      return vs.get(keyOrRef);
    }
    scopeRefs(scopeName, values = this._values) {
      return this._reduceValues(values, (name) => {
        if (name.scopePath === undefined) throw Error(`CodeGen: name "${name}" has no value`);
        return code_1._`${scopeName}${name.scopePath}`;
      });
    }
    scopeCode(values = this._values, usedValues, getCode) {
      return this._reduceValues(
        values,
        (name) => {
          if (name.value === undefined) throw Error(`CodeGen: name "${name}" has no value`);
          return name.value.code;
        },
        usedValues,
        getCode,
      );
    }
    _reduceValues(values, valueCode, usedValues = {}, getCode) {
      let code = code_1.nil;
      for (let prefix in values) {
        let vs = values[prefix];
        if (!vs) continue;
        let nameSet = (usedValues[prefix] = usedValues[prefix] || new Map());
        vs.forEach((name) => {
          if (nameSet.has(name)) return;
          nameSet.set(name, UsedValueState.Started);
          let c = valueCode(name);
          if (c) {
            let def = this.opts.es5 ? cjsExports.varKinds.var : cjsExports.varKinds.const;
            code = code_1._`${code}${def} ${name} = ${c};${this.opts._n}`;
          } else if ((c = getCode === null || getCode === undefined ? undefined : getCode(name)))
            code = code_1._`${code}${c}${this.opts._n}`;
          else throw new ValueError(name);
          nameSet.set(name, UsedValueState.Completed);
        });
      }
      return code;
    }
  }
  cjsExports.ValueScope = ValueScope;
});
export { require_scope };
