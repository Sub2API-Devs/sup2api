/**
 * react/cjs/react.production.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: react@19.3.0..19.3.1
 * pieces: chunk-p86mcgbc.js (15)
 * attribution: esm-fingerprint 10, esm-layout 5
 */
import { Xa } from "../../../runtime/bun-runtime.js";

//@ chunk-p86mcgbc.js:227-349 esm-fingerprint
function getIteratorFn(t) {
  if (t === null || typeof t !== "object") return null;
  t = (MAYBE_ITERATOR_SYMBOL && t[MAYBE_ITERATOR_SYMBOL]) || t["@@iterator"];
  return typeof t === "function" ? t : null;
}
//@ chunk-p86mcgbc.js:349-425 esm-fingerprint
function Component(props, context, updater) {
  this.props = props;
  this.context = context;
  this.refs = emptyObject;
  this.updater = updater || ReactNoopUpdateQueue;
}
//@ chunk-p86mcgbc.js:425-439 esm-layout
function ComponentDummy() {}
//@ chunk-p86mcgbc.js:439-515 esm-fingerprint
function PureComponent(props, context, updater) {
  this.props = props;
  this.context = context;
  this.refs = emptyObject;
  this.updater = updater || ReactNoopUpdateQueue;
}
//@ chunk-p86mcgbc.js:515-529 esm-layout
function noop() {}
//@ chunk-p86mcgbc.js:529-621 esm-fingerprint
function ReactElement(type, key, props) {
  var refProp = props.ref;
  return {
    $$typeof: REACT_ELEMENT_TYPE,
    type,
    key,
    ref: refProp !== undefined ? refProp : null,
    props,
  };
}
//@ chunk-p86mcgbc.js:621-664 esm-fingerprint
function cloneAndReplaceKey(oldElement, newKey) {
  return ReactElement(oldElement.type, newKey, oldElement.props);
}
//@ chunk-p86mcgbc.js:664-731 esm-fingerprint
function isValidElement(object) {
  return typeof object === "object" && object !== null && object.$$typeof === REACT_ELEMENT_TYPE;
}
//@ chunk-p86mcgbc.js:731-825 esm-fingerprint
function K(key) {
  var escaperLookup = {
    "=": "=0",
    ":": "=2",
  };
  return (
    "$" +
    key.replace(/[=:]/g, function (match) {
      return escaperLookup[match];
    })
  );
}
//@ chunk-p86mcgbc.js:825-918 esm-fingerprint
function getElementKey(element, index) {
  return typeof element === "object" && element !== null && element.key != null
    ? K("" + element.key)
    : index.toString(36);
}
//@ chunk-p86mcgbc.js:918-1309 esm-fingerprint
function resolveThenable(thenable) {
  switch (thenable.status) {
    case "fulfilled":
      return thenable.value;
    case "rejected":
      throw thenable.reason;
    default:
      switch (
        (typeof thenable.status === "string"
          ? thenable.then(noop, noop)
          : ((thenable.status = "pending"),
            thenable.then(
              function (fulfilledValue) {
                if (thenable.status === "pending") {
                  thenable.status = "fulfilled";
                  thenable.value = fulfilledValue;
                }
              },
              function (error) {
                if (thenable.status === "pending") {
                  thenable.status = "rejected";
                  thenable.reason = error;
                }
              },
            )),
        thenable.status)
      ) {
        case "fulfilled":
          return thenable.value;
        case "rejected":
          throw thenable.reason;
      }
  }
  throw thenable;
}
//@ chunk-p86mcgbc.js:1309-2341 esm-fingerprint
function mapIntoArray(children, array, escapedPrefix, nameSoFar, callback) {
  var type = typeof children;
  if (type === "undefined" || type === "boolean") children = null;
  var invokeCallback = false;
  if (children === null) invokeCallback = true;
  else
    switch (type) {
      case "bigint":
      case "string":
      case "number":
        invokeCallback = true;
        break;
      case "object":
        switch (children.$$typeof) {
          case REACT_ELEMENT_TYPE:
          case REACT_PORTAL_TYPE:
            invokeCallback = true;
            break;
          case REACT_LAZY_TYPE:
            invokeCallback = children._init;
            return mapIntoArray(invokeCallback(children._payload), array, escapedPrefix, nameSoFar, callback);
        }
    }
  if (invokeCallback) {
    callback = callback(children);
    invokeCallback = nameSoFar === "" ? "." + getElementKey(children, 0) : nameSoFar;
    if (isArrayImpl(callback)) {
      escapedPrefix = "";
      if (invokeCallback != null)
        escapedPrefix = invokeCallback.replace(userProvidedKeyEscapeRegex, "$&/") + "/";
      mapIntoArray(callback, array, escapedPrefix, "", function (c) {
        return c;
      });
    } else if (callback != null) {
      if (isValidElement(callback))
        callback = cloneAndReplaceKey(
          callback,
          escapedPrefix +
            (callback.key == null || (children && children.key === callback.key)
              ? ""
              : ("" + callback.key).replace(userProvidedKeyEscapeRegex, "$&/") + "/") +
            invokeCallback,
        );
      array.push(callback);
    }
    return 1;
  }
  invokeCallback = 0;
  var nextNamePrefix = nameSoFar === "" ? "." : nameSoFar + ":";
  if (isArrayImpl(children))
    for (var i = 0; i < children.length; i++) {
      nameSoFar = children[i];
      type = nextNamePrefix + getElementKey(nameSoFar, i);
      invokeCallback += mapIntoArray(nameSoFar, array, escapedPrefix, type, callback);
    }
  else {
    i = getIteratorFn(children);
    if (typeof i === "function")
      for (children = i.call(children), i = 0; !(nameSoFar = children.next()).done;) {
        nameSoFar = nameSoFar.value;
        type = nextNamePrefix + getElementKey(nameSoFar, i++);
        invokeCallback += mapIntoArray(nameSoFar, array, escapedPrefix, type, callback);
      }
    else if (type === "object") {
      if (typeof children.then === "function")
        return mapIntoArray(resolveThenable(children), array, escapedPrefix, nameSoFar, callback);
      array = String(children);
      throw Error(
        "Objects are not valid as a React child (found: " +
          (array === "[object Object]"
            ? "object with keys {" + Object.keys(children).join(", ") + "}"
            : array) +
          "). If you meant to render a collection of children, use an array instead.",
      );
    }
  }
  return invokeCallback;
}
//@ chunk-p86mcgbc.js:2341-2450 esm-layout
function mapChildren(children, func, context) {
  if (children == null) return children;
  var result = [];
  var count = 0;
  mapIntoArray(children, result, "", "", function (child) {
    return func.call(context, child, count++);
  });
  return result;
}
//@ chunk-p86mcgbc.js:2450-4107 esm-layout
var REACT_ELEMENT_TYPE;
var REACT_PORTAL_TYPE;
var Y;
var I;
var REACT_CONTEXT_TYPE;
var L;
var k;
var REACT_LAZY_TYPE;
var b;
var MAYBE_ITERATOR_SYMBOL;
var ReactNoopUpdateQueue;
var assign;
var emptyObject;
var pureComponentPrototype;
var isArrayImpl;
var ReactSharedInternals;
var hasOwnProperty;
var userProvidedKeyEscapeRegex;
var reportGlobalError;
var W;
var g5r;
var Fy;
var REACT_PROFILER_TYPE;
var Kc;
var PureComponent_default;
var fo;
var addTransitionType;
var qt = function (defaultValue) {
  defaultValue = {
    $$typeof: REACT_CONTEXT_TYPE,
    _currentValue: defaultValue,
    _currentValue2: defaultValue,
    _threadCount: 0,
    Provider: null,
    Consumer: null,
  };
  defaultValue.Provider = defaultValue;
  defaultValue.Consumer = {
    $$typeof: I,
    _context: defaultValue,
  };
  return defaultValue;
};
var Vc = function (type, config, children) {
  var propName;
  var props = {};
  var key = null;
  if (config != null)
    for (propName in (config.key !== undefined && (key = "" + config.key), config))
      if (
        hasOwnProperty.call(config, propName) &&
        propName !== "key" &&
        propName !== "__self" &&
        propName !== "__source"
      )
        props[propName] = config[propName];
  var childrenLength = arguments.length - 2;
  if (childrenLength === 1) props.children = children;
  else if (1 < childrenLength) {
    for (var childArray = Array(childrenLength), i = 0; i < childrenLength; i++)
      childArray[i] = arguments[i + 2];
    props.children = childArray;
  }
  if (type && type.defaultProps)
    for (propName in ((childrenLength = type.defaultProps), childrenLength))
      if (props[propName] === undefined) props[propName] = childrenLength[propName];
  return ReactElement(type, key, props);
};
var a5o = function () {
  return {
    current: null,
  };
};
var isValidElement_default;
var Rh = function (type, e) {
  return {
    $$typeof: k,
    type,
    compare: e === undefined ? null : e,
  };
};
var h5r = function (t) {
  var prevTransition = ReactSharedInternals.T;
  var currentTransition = {};
  ReactSharedInternals.T = currentTransition;
  try {
    var returnValue = t();
    var onStartTransitionFinish = ReactSharedInternals.S;
    if (onStartTransitionFinish !== null) onStartTransitionFinish(currentTransition, returnValue);
    if (typeof returnValue === "object" && returnValue !== null && typeof returnValue.then === "function")
      returnValue.then(noop, reportGlobalError);
  } catch (error) {
    reportGlobalError(error);
  } finally {
    if (prevTransition !== null && currentTransition.types !== null)
      prevTransition.types = currentTransition.types;
    ReactSharedInternals.T = prevTransition;
  }
};
var Qr = function (t) {
  return ReactSharedInternals.H.use(t);
};
var ce = function (callback, deps) {
  return ReactSharedInternals.H.useCallback(callback, deps);
};
var Se = function (Context) {
  return ReactSharedInternals.H.useContext(Context);
};
var eJ = function (value, initialValue) {
  return ReactSharedInternals.H.useDeferredValue(value, initialValue);
};
var P = function (create, deps) {
  return ReactSharedInternals.H.useEffect(create, deps);
};
var Oo = function (callback) {
  return ReactSharedInternals.H.useEffectEvent(callback);
};
var l5o = function () {
  return ReactSharedInternals.H.useId();
};
var vxe = function (ref, create, deps) {
  return ReactSharedInternals.H.useImperativeHandle(ref, create, deps);
};
var NSe = function (create, deps) {
  return ReactSharedInternals.H.useInsertionEffect(create, deps);
};
var zt = function (create, deps) {
  return ReactSharedInternals.H.useLayoutEffect(create, deps);
};
var Q = function (create, deps) {
  return ReactSharedInternals.H.useMemo(create, deps);
};
var Uy = function (t, e, init) {
  return ReactSharedInternals.H.useReducer(t, e, init);
};
var R = function (initialValue) {
  return ReactSharedInternals.H.useRef(initialValue);
};
var y = function (initialState) {
  return ReactSharedInternals.H.useState(initialState);
};
var yt = function (subscribe, getSnapshot, getServerSnapshot) {
  return ReactSharedInternals.H.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
};
var y5r = function () {
  return ReactSharedInternals.H.useTransition();
};
//@ chunk-p86mcgbc.js:4107-5964 esm-layout
var init_react_production = Xa(() => {
  REACT_ELEMENT_TYPE = Symbol.for("react.transitional.element");
  REACT_PORTAL_TYPE = Symbol.for("react.portal");
  Y = Symbol.for("react.fragment");
  I = Symbol.for("react.consumer");
  REACT_CONTEXT_TYPE = Symbol.for("react.context");
  L = Symbol.for("react.suspense");
  k = Symbol.for("react.memo");
  REACT_LAZY_TYPE = Symbol.for("react.lazy");
  b = Symbol.for("react.activity");
  MAYBE_ITERATOR_SYMBOL = Symbol.iterator;
  ReactNoopUpdateQueue = {
    isMounted: function () {
      return false;
    },
    enqueueForceUpdate: function () {},
    enqueueReplaceState: function () {},
    enqueueSetState: function () {},
  };
  assign = Object.assign;
  emptyObject = {};
  Component.prototype.isReactComponent = {};
  Component.prototype.setState = function (partialState, callback) {
    if (typeof partialState !== "object" && typeof partialState !== "function" && partialState != null)
      throw Error(
        "takes an object of state variables to update or a function which returns an object of state variables.",
      );
    this.updater.enqueueSetState(this, partialState, callback, "setState");
  };
  Component.prototype.forceUpdate = function (callback) {
    this.updater.enqueueForceUpdate(this, callback, "forceUpdate");
  };
  ComponentDummy.prototype = Component.prototype;
  pureComponentPrototype = PureComponent.prototype = new ComponentDummy();
  pureComponentPrototype.constructor = PureComponent;
  assign(pureComponentPrototype, Component.prototype);
  pureComponentPrototype.isPureReactComponent = true;
  isArrayImpl = Array.isArray;
  ReactSharedInternals = {
    H: null,
    A: null,
    T: null,
    S: null,
  };
  hasOwnProperty = Object.prototype.hasOwnProperty;
  userProvidedKeyEscapeRegex = /\/+/g;
  reportGlobalError =
    typeof reportError === "function"
      ? reportError
      : function (error) {
          if (typeof window === "object" && typeof window.ErrorEvent === "function") {
            var event = new window.ErrorEvent("error", {
              bubbles: true,
              cancelable: true,
              message:
                typeof error === "object" && error !== null && typeof error.message === "string"
                  ? String(error.message)
                  : String(error),
              error,
            });
            if (!window.dispatchEvent(event)) return;
          } else if (typeof process === "object" && typeof process.emit === "function") {
            process.emit("uncaughtException", error);
            return;
          }
          console.error(error);
        };
  W = {
    map: mapChildren,
    forEach: function (children, forEachFunc, forEachContext) {
      mapChildren(
        children,
        function () {
          forEachFunc.apply(this, arguments);
        },
        forEachContext,
      );
    },
    count: function (children) {
      var n = 0;
      mapChildren(children, function () {
        n++;
      });
      return n;
    },
    toArray: function (children) {
      return (
        mapChildren(children, function (child) {
          return child;
        }) || []
      );
    },
    only: function (children) {
      if (!isValidElement(children))
        throw Error("React.Children.only expected to receive a single React element child.");
      return children;
    },
  };
  g5r = b;
  Fy = W;
  REACT_PROFILER_TYPE = Component;
  Kc = Y;
  PureComponent_default = PureComponent;
  fo = L;
  addTransitionType = ReactSharedInternals;
  isValidElement_default = isValidElement;
});
export {
  qt,
  Se,
  Fy,
  isValidElement_default,
  init_react_production,
  y,
  R,
  vxe,
  zt,
  P,
  Q,
  ce,
  yt,
  Rh,
  fo,
  Oo,
  Kc,
  Uy,
  Vc,
  eJ,
  Qr,
  h5r,
  NSe,
  g5r,
  y5r,
  REACT_PROFILER_TYPE,
  addTransitionType,
  PureComponent_default,
  a5o,
  l5o,
};
