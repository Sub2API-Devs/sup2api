/**
 * tslib/tslib.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: tslib@2.6.3..2.7.0
 * pieces: chunk-xw24zrg8.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../runtime/bun-runtime.js";

//@ chunk-xw24zrg8.js:226-11423 cjs-fingerprint
var require_tslib = __commonJS(function (cjsExports, cjsModule) {
  var __extends;
  var __assign;
  var __rest;
  var __decorate;
  var __param;
  var __esDecorate;
  var __runInitializers;
  var __propKey;
  var __setFunctionName;
  var __metadata;
  var __awaiter;
  var __generator;
  var __exportStar;
  var __values;
  var __read;
  var __spread;
  var __spreadArrays;
  var __spreadArray;
  var __await;
  var __asyncGenerator;
  var __asyncDelegator;
  var __asyncValues;
  var __makeTemplateObject;
  var __importStar;
  var __importDefault;
  var __classPrivateFieldGet;
  var __classPrivateFieldSet;
  var __classPrivateFieldIn;
  var __createBinding;
  var __addDisposableResource;
  var __disposeResources;
  var __rewriteRelativeImportExtension;
  (function (factory) {
    var root =
      typeof global === "object"
        ? global
        : typeof self === "object"
          ? self
          : typeof this === "object"
            ? this
            : {};
    if (typeof define === "function" && define.amd)
      define("tslib", ["exports"], function (exportsObject) {
        factory(createExporter(root, createExporter(exportsObject)));
      });
    else if (typeof cjsModule === "object" && typeof cjsExports === "object")
      factory(createExporter(root, createExporter(cjsExports)));
    else factory(createExporter(root));
    function createExporter(target, previous) {
      if (target !== root)
        if (typeof Object.create === "function")
          Object.defineProperty(target, "__esModule", {
            value: true,
          });
        else target.__esModule = true;
      return function (id, v) {
        return (target[id] = previous ? previous(id, v) : v);
      };
    }
  })(function (exporter) {
    var extendStatics =
      Object.setPrototypeOf ||
      ({
        __proto__: [],
      } instanceof Array &&
        function (d, b) {
          d.__proto__ = b;
        }) ||
      function (d, b) {
        for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p];
      };
    __extends = function (d, b) {
      if (typeof b !== "function" && b !== null)
        throw TypeError("Class extends value " + String(b) + " is not a constructor or null");
      extendStatics(d, b);
      function __() {
        this.constructor = d;
      }
      d.prototype = b === null ? Object.create(b) : ((__.prototype = b.prototype), new __());
    };
    __assign =
      Object.assign ||
      function (t_2) {
        for (var s, i = 1, argCount = arguments.length; i < argCount; i++) {
          s = arguments[i];
          for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p)) t_2[p] = s[p];
        }
        return t_2;
      };
    __rest = function (s, e) {
      var t = {};
      for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0) t[p] = s[p];
      if (s != null && typeof Object.getOwnPropertySymbols === "function") {
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++)
          if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i])) t[p[i]] = s[p[i]];
      }
      return t;
    };
    __decorate = function (decorators, target, key, desc) {
      var c = arguments.length;
      var r = c < 3 ? target : desc === null ? (desc = Object.getOwnPropertyDescriptor(target, key)) : desc;
      var d;
      if (typeof Reflect === "object" && typeof Reflect.decorate === "function")
        r = Reflect.decorate(decorators, target, key, desc);
      else
        for (var i = decorators.length - 1; i >= 0; i--)
          if ((d = decorators[i])) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
      if (c > 3 && r) Object.defineProperty(target, key, r);
      return r;
    };
    __param = function (paramIndex, decorator) {
      return function (target, key) {
        decorator(target, key, paramIndex);
      };
    };
    __esDecorate = function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
      function accept(f) {
        if (f !== undefined && typeof f !== "function") throw TypeError("Function expected");
        return f;
      }
      var kind = contextIn.kind;
      var key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
      var target = !descriptorIn && ctor ? (contextIn.static ? ctor : ctor.prototype) : null;
      var descriptor =
        descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
      var _;
      var done = false;
      for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) {
          if (done) throw TypeError("Cannot add initializers after decoration has completed");
          extraInitializers.push(accept(f || null));
        };
        var result = (0, decorators[i])(
          kind === "accessor"
            ? {
                get: descriptor.get,
                set: descriptor.set,
              }
            : descriptor[key],
          context,
        );
        if (kind === "accessor") {
          if (result === undefined) continue;
          if (result === null || typeof result !== "object") throw TypeError("Object expected");
          if ((_ = accept(result.get))) descriptor.get = _;
          if ((_ = accept(result.set))) descriptor.set = _;
          if ((_ = accept(result.init))) initializers.unshift(_);
        } else if ((_ = accept(result)))
          if (kind === "field") initializers.unshift(_);
          else descriptor[key] = _;
      }
      if (target) Object.defineProperty(target, contextIn.name, descriptor);
      done = true;
    };
    __runInitializers = function (thisArg, initializers, value) {
      var useValue = arguments.length > 2;
      for (var i = 0; i < initializers.length; i++)
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
      return useValue ? value : undefined;
    };
    __propKey = function (x) {
      return typeof x === "symbol" ? x : "".concat(x);
    };
    __setFunctionName = function (f, name, prefix) {
      if (typeof name === "symbol") name = name.description ? "[".concat(name.description, "]") : "";
      return Object.defineProperty(f, "name", {
        configurable: true,
        value: prefix ? "".concat(prefix, " ", name) : name,
      });
    };
    __metadata = function (metadataKey, metadataValue) {
      if (typeof Reflect === "object" && typeof Reflect.metadata === "function")
        return Reflect.metadata(metadataKey, metadataValue);
    };
    __awaiter = function (thisArg, _arguments, P, generator) {
      function adopt(value) {
        return value instanceof P
          ? value
          : new P(function (resolve) {
              resolve(value);
            });
      }
      return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) {
          try {
            step(generator.next(value));
          } catch (e) {
            reject(e);
          }
        }
        function rejected(value) {
          try {
            step(generator.throw(value));
          } catch (e) {
            reject(e);
          }
        }
        function step(result) {
          if (result.done) resolve(result.value);
          else adopt(result.value).then(fulfilled, rejected);
        }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
      });
    };
    __generator = function (thisArg, body) {
      var _ = {
        label: 0,
        sent: function () {
          if (t[0] & 1) throw t[1];
          return t[1];
        },
        trys: [],
        ops: [],
      };
      var f;
      var y_2;
      var t;
      var g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
      g.next = verb(0);
      g.throw = verb(1);
      g.return = verb(2);
      if (typeof Symbol === "function")
        g[Symbol.iterator] = function () {
          return this;
        };
      return g;
      function verb(n) {
        return function (v) {
          return step([n, v]);
        };
      }
      function step(op) {
        if (f) throw TypeError("Generator is already executing.");
        while ((g && ((g = 0), op[0] && (_ = 0)), _))
          try {
            f = 1;
            if (
              y_2 &&
              (t =
                op[0] & 2
                  ? y_2.return
                  : op[0]
                    ? y_2.throw || ((t = y_2.return) && t.call(y_2), 0)
                    : y_2.next) &&
              !(t = t.call(y_2, op[1])).done
            )
              return t;
            y_2 = 0;
            if (t) op = [op[0] & 2, t.value];
            switch (op[0]) {
              case 0:
              case 1:
                t = op;
                break;
              case 4:
                _.label++;
                return {
                  value: op[1],
                  done: false,
                };
              case 5:
                _.label++;
                y_2 = op[1];
                op = [0];
                continue;
              case 7:
                op = _.ops.pop();
                _.trys.pop();
                continue;
              default:
                if (((t = _.trys), !(t = t.length > 0 && t[t.length - 1])) && (op[0] === 6 || op[0] === 2)) {
                  _ = 0;
                  continue;
                }
                if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) {
                  _.label = op[1];
                  break;
                }
                if (op[0] === 6 && _.label < t[1]) {
                  _.label = t[1];
                  t = op;
                  break;
                }
                if (t && _.label < t[2]) {
                  _.label = t[2];
                  _.ops.push(op);
                  break;
                }
                if (t[2]) _.ops.pop();
                _.trys.pop();
                continue;
            }
            op = body.call(thisArg, _);
          } catch (e) {
            op = [6, e];
            y_2 = 0;
          } finally {
            f = t = 0;
          }
        if (op[0] & 5) throw op[1];
        return {
          value: op[0] ? op[1] : undefined,
          done: true,
        };
      }
    };
    __exportStar = function (m, o) {
      for (var p in m)
        if (p !== "default" && !Object.prototype.hasOwnProperty.call(o, p)) __createBinding(o, m, p);
    };
    __createBinding = Object.create
      ? function (o, m, k, k2) {
          if (k2 === undefined) k2 = k;
          var desc = Object.getOwnPropertyDescriptor(m, k);
          if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable))
            desc = {
              enumerable: true,
              get: function () {
                return m[k];
              },
            };
          Object.defineProperty(o, k2, desc);
        }
      : function (o, m, k, k2) {
          if (k2 === undefined) k2 = k;
          o[k2] = m[k];
        };
    __values = function (o) {
      var s = typeof Symbol === "function" && Symbol.iterator;
      var m = s && o[s];
      var i = 0;
      if (m) return m.call(o);
      if (o && typeof o.length === "number")
        return {
          next: function () {
            if (o && i >= o.length) o = undefined;
            return {
              value: o && o[i++],
              done: !o,
            };
          },
        };
      throw TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
    };
    __read = function (o_2, n_2) {
      var m = typeof Symbol === "function" && o_2[Symbol.iterator];
      if (!m) return o_2;
      var i_2 = m.call(o_2);
      var r;
      var ar = [];
      var e;
      try {
        while ((n_2 === undefined || n_2-- > 0) && !(r = i_2.next()).done) ar.push(r.value);
      } catch (error) {
        e = {
          error,
        };
      } finally {
        try {
          if (r && !r.done && (m = i_2.return)) m.call(i_2);
        } finally {
          if (e) throw e.error;
        }
      }
      return ar;
    };
    __spread = function () {
      for (var ar = [], i = 0; i < arguments.length; i++) ar = ar.concat(__read(arguments[i]));
      return ar;
    };
    __spreadArrays = function () {
      for (var s = 0, i_2 = 0, il = arguments.length; i_2 < il; i_2++) s += arguments[i_2].length;
      for (var r = Array(s), k = 0, i_2 = 0; i_2 < il; i_2++)
        for (var a = arguments[i_2], j = 0, jl = a.length; j < jl; j++, k++) r[k] = a[j];
      return r;
    };
    __spreadArray = function (to, from, pack) {
      if (pack || arguments.length === 2) {
        for (var i = 0, l = from.length, ar; i < l; i++)
          if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
          }
      }
      return to.concat(ar || Array.prototype.slice.call(from));
    };
    __await = function (v) {
      return this instanceof __await ? ((this.v = v), this) : new __await(v);
    };
    __asyncGenerator = function (thisArg, _arguments, generator) {
      if (!Symbol.asyncIterator) throw TypeError("Symbol.asyncIterator is not defined.");
      var g = generator.apply(thisArg, _arguments || []);
      var i_2;
      var q = [];
      i_2 = Object.create((typeof AsyncIterator === "function" ? AsyncIterator : Object).prototype);
      verb("next");
      verb("throw");
      verb("return", awaitReturn);
      i_2[Symbol.asyncIterator] = function () {
        return this;
      };
      return i_2;
      function awaitReturn(fulfilled) {
        return function (v) {
          return Promise.resolve(v).then(fulfilled, reject);
        };
      }
      function verb(n, f) {
        if (g[n]) {
          i_2[n] = function (v) {
            return new Promise(function (a, b) {
              if (!(q.push([n, v, a, b]) > 1)) resume(n, v);
            });
          };
          if (f) i_2[n] = f(i_2[n]);
        }
      }
      function resume(n, v) {
        try {
          step(g[n](v));
        } catch (e) {
          settle(q[0][3], e);
        }
      }
      function step(r) {
        if (r.value instanceof __await) Promise.resolve(r.value.v).then(fulfill, reject);
        else settle(q[0][2], r);
      }
      function fulfill(value) {
        resume("next", value);
      }
      function reject(value) {
        resume("throw", value);
      }
      function settle(settle, v) {
        settle(v);
        q.shift();
        if (q.length) resume(q[0][0], q[0][1]);
      }
    };
    __asyncDelegator = function (o_2) {
      var i;
      var p;
      i = {};
      verb("next");
      verb("throw", function (e) {
        throw e;
      });
      verb("return");
      i[Symbol.iterator] = function () {
        return this;
      };
      return i;
      function verb(n, f) {
        i[n] = o_2[n]
          ? function (v) {
              return (p = !p)
                ? {
                    value: __await(o_2[n](v)),
                    done: false,
                  }
                : f
                  ? f(v)
                  : v;
            }
          : f;
      }
    };
    __asyncValues = function (o_2) {
      if (!Symbol.asyncIterator) throw TypeError("Symbol.asyncIterator is not defined.");
      var m = o_2[Symbol.asyncIterator];
      var i;
      return m
        ? m.call(o_2)
        : ((o_2 = typeof __values === "function" ? __values(o_2) : o_2[Symbol.iterator]()),
          (i = {}),
          verb("next"),
          verb("throw"),
          verb("return"),
          (i[Symbol.asyncIterator] = function () {
            return this;
          }),
          i);
      function verb(n) {
        i[n] =
          o_2[n] &&
          function (v) {
            return new Promise(function (resolve, reject) {
              v = o_2[n](v);
              settle(resolve, reject, v.done, v.value);
            });
          };
      }
      function settle(resolve, reject, d, v) {
        Promise.resolve(v).then(function (v) {
          resolve({
            value: v,
            done: d,
          });
        }, reject);
      }
    };
    __makeTemplateObject = function (cooked, raw) {
      if (Object.defineProperty)
        Object.defineProperty(cooked, "raw", {
          value: raw,
        });
      else cooked.raw = raw;
      return cooked;
    };
    var __setModuleDefault = Object.create
      ? function (o, v) {
          Object.defineProperty(o, "default", {
            enumerable: true,
            value: v,
          });
        }
      : function (o, v) {
          o.default = v;
        };
    var getOwnPropertyNames = function (object) {
      getOwnPropertyNames =
        Object.getOwnPropertyNames ||
        function (object) {
          var keys = [];
          for (var key in object)
            if (Object.prototype.hasOwnProperty.call(object, key)) keys[keys.length] = key;
          return keys;
        };
      return getOwnPropertyNames(object);
    };
    __importStar = function (mod) {
      if (mod && mod.__esModule) return mod;
      var result = {};
      if (mod != null) {
        for (var keys = getOwnPropertyNames(mod), i = 0; i < keys.length; i++)
          if (keys[i] !== "default") __createBinding(result, mod, keys[i]);
      }
      __setModuleDefault(result, mod);
      return result;
    };
    __importDefault = function (mod) {
      return mod && mod.__esModule
        ? mod
        : {
            default: mod,
          };
    };
    __classPrivateFieldGet = function (receiver, state, kind, f) {
      if (kind === "a" && !f) throw TypeError("Private accessor was defined without a getter");
      if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver))
        throw TypeError("Cannot read private member from an object whose class did not declare it");
      return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
    };
    __classPrivateFieldSet = function (receiver, state, value, kind, f) {
      if (kind === "m") throw TypeError("Private method is not writable");
      if (kind === "a" && !f) throw TypeError("Private accessor was defined without a setter");
      if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver))
        throw TypeError("Cannot write private member to an object whose class did not declare it");
      if (kind === "a") f.call(receiver, value);
      else if (f) f.value = value;
      else state.set(receiver, value);
      return value;
    };
    __classPrivateFieldIn = function (state, receiver) {
      if (receiver === null || (typeof receiver !== "object" && typeof receiver !== "function"))
        throw TypeError("Cannot use 'in' operator on non-object");
      return typeof state === "function" ? receiver === state : state.has(receiver);
    };
    __addDisposableResource = function (env, value, async) {
      if (value !== null && value !== undefined) {
        if (typeof value !== "object" && typeof value !== "function") throw TypeError("Object expected.");
        var dispose;
        var inner;
        if (async) {
          if (!Symbol.asyncDispose) throw TypeError("Symbol.asyncDispose is not defined.");
          dispose = value[Symbol.asyncDispose];
        }
        if (dispose === undefined) {
          if (!Symbol.dispose) throw TypeError("Symbol.dispose is not defined.");
          dispose = value[Symbol.dispose];
          if (async) inner = dispose;
        }
        if (typeof dispose !== "function") throw TypeError("Object not disposable.");
        if (inner)
          dispose = function () {
            try {
              inner.call(this);
            } catch (e) {
              return Promise.reject(e);
            }
          };
        env.stack.push({
          value,
          dispose,
          async,
        });
      } else if (async)
        env.stack.push({
          async: true,
        });
      return value;
    };
    var _SuppressedError =
      typeof SuppressedError === "function"
        ? SuppressedError
        : function (error, suppressed, message) {
            var e = Error(message);
            e.name = "SuppressedError";
            e.error = error;
            e.suppressed = suppressed;
            return e;
          };
    __disposeResources = function (env) {
      function fail(e) {
        env.error = env.hasError
          ? new _SuppressedError(e, env.error, "An error was suppressed during disposal.")
          : e;
        env.hasError = true;
      }
      var resource;
      var s = 0;
      function next() {
        while ((resource = env.stack.pop()))
          try {
            if (!resource.async && s === 1) {
              s = 0;
              env.stack.push(resource);
              return Promise.resolve().then(next);
            }
            if (resource.dispose) {
              var result = resource.dispose.call(resource.value);
              if (resource.async) {
                s |= 2;
                return Promise.resolve(result).then(next, function (e) {
                  fail(e);
                  return next();
                });
              }
            } else s |= 1;
          } catch (e) {
            fail(e);
          }
        if (s === 1) return env.hasError ? Promise.reject(env.error) : Promise.resolve();
        if (env.hasError) throw env.error;
      }
      return next();
    };
    __rewriteRelativeImportExtension = function (path, jsx) {
      if (typeof path === "string" && /^\.\.?\//.test(path))
        return path.replace(
          /\.(tsx)$|((?:\.d)?)((?:\.[^./]+?)?)\.([cm]?)ts$/i,
          function (match, tsx, declaration, suffix, moduleKind) {
            return tsx
              ? jsx
                ? ".jsx"
                : ".js"
              : declaration && (!suffix || !moduleKind)
                ? match
                : declaration + suffix + "." + moduleKind.toLowerCase() + "js";
          },
        );
      return path;
    };
    exporter("__extends", __extends);
    exporter("__assign", __assign);
    exporter("__rest", __rest);
    exporter("__decorate", __decorate);
    exporter("__param", __param);
    exporter("__esDecorate", __esDecorate);
    exporter("__runInitializers", __runInitializers);
    exporter("__propKey", __propKey);
    exporter("__setFunctionName", __setFunctionName);
    exporter("__metadata", __metadata);
    exporter("__awaiter", __awaiter);
    exporter("__generator", __generator);
    exporter("__exportStar", __exportStar);
    exporter("__createBinding", __createBinding);
    exporter("__values", __values);
    exporter("__read", __read);
    exporter("__spread", __spread);
    exporter("__spreadArrays", __spreadArrays);
    exporter("__spreadArray", __spreadArray);
    exporter("__await", __await);
    exporter("__asyncGenerator", __asyncGenerator);
    exporter("__asyncDelegator", __asyncDelegator);
    exporter("__asyncValues", __asyncValues);
    exporter("__makeTemplateObject", __makeTemplateObject);
    exporter("__importStar", __importStar);
    exporter("__importDefault", __importDefault);
    exporter("__classPrivateFieldGet", __classPrivateFieldGet);
    exporter("__classPrivateFieldSet", __classPrivateFieldSet);
    exporter("__classPrivateFieldIn", __classPrivateFieldIn);
    exporter("__addDisposableResource", __addDisposableResource);
    exporter("__disposeResources", __disposeResources);
    exporter("__rewriteRelativeImportExtension", __rewriteRelativeImportExtension);
  });
});
export { require_tslib };
