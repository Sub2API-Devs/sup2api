/**
 * @modelcontextprotocol/core/(bundler runtime of a pre-bundled dist file)
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @modelcontextprotocol/core@2.0.0
 * pieces: chunk-r1g76qsy.js (1)
 * attribution: embedded-runtime 1
 */
//@ chunk-r1g76qsy.js:516-1173 embedded-runtime
var { create, defineProperty, getOwnPropertyDescriptor, getOwnPropertyNames, getPrototypeOf } = Object;
var hasOwnProperty = Object.prototype.hasOwnProperty;
var initModule = (initModule, moduleRef) => () => {
  if (!moduleRef)
    initModule(
      (moduleRef = {
        exports: {},
      }).exports,
      moduleRef,
    );
  return moduleRef.exports;
};
var toESModule = (from, isModule) => {
  let target = {};
  for (var key in from)
    defineProperty(target, key, {
      get: from[key],
      enumerable: true,
    });
  if (isModule)
    defineProperty(target, Symbol.toStringTag, {
      value: "Module",
    });
  return target;
};
var reExport = (target, from, excluded, descriptor) => {
  if ((from && typeof from === "object") || typeof from === "function") {
    for (
      var ownPropertyNames = getOwnPropertyNames(from), keyIndex = 0, len = ownPropertyNames.length, propKey;
      keyIndex < len;
      keyIndex++
    ) {
      propKey = ownPropertyNames[keyIndex];
      if (!hasOwnProperty.call(target, propKey) && propKey !== excluded)
        defineProperty(target, propKey, {
          get: ((key) => from[key]).bind(null, propKey),
          enumerable: !(descriptor = getOwnPropertyDescriptor(from, propKey)) || descriptor.enumerable,
        });
    }
  }
  return target;
};
var interopDefault = (mod, exporter, target) => {
  target = mod != null ? create(getPrototypeOf(mod)) : {};
  return reExport(
    exporter || !mod || !mod.__esModule
      ? defineProperty(target, "default", {
          value: mod,
          enumerable: true,
        })
      : target,
    mod,
  );
};
export { toESModule, initModule, interopDefault };
