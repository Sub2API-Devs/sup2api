/**
 * @babel/runtime/helpers/esm/importDeferProxy.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @babel/runtime@7.29.10
 * pieces: chunk-qq5knpkd.js (4)
 * attribution: esm-layout 2, esm-fingerprint 2
 */

//@ chunk-qq5knpkd.js:1585-1670 esm-layout
function materializeSchema(target) {
  if (target.build !== undefined) {
    target.schema = target.build();
    target.build = undefined;
  }
  return target.schema;
}
//@ chunk-qq5knpkd.js:1670-2109 esm-fingerprint
var schemaProxyHandlers = {
  get: (target, prop, receiver) => Reflect.get(materializeSchema(target), prop, receiver),
  has: (target, prop) => prop in materializeSchema(target),
  set: (target, prop, value) => Reflect.set(materializeSchema(target), prop, value),
  defineProperty: (target, prop, descriptor) =>
    Reflect.defineProperty(materializeSchema(target), prop, descriptor),
  deleteProperty: (target, prop) => Reflect.deleteProperty(materializeSchema(target), prop),
  getPrototypeOf: (target) => Object.getPrototypeOf(materializeSchema(target)),
  ownKeys: (target) => Reflect.ownKeys(materializeSchema(target)),
  preventExtensions: () => false,
  getOwnPropertyDescriptor(target, prop) {
    let ownPropertyDescriptor = Reflect.getOwnPropertyDescriptor(materializeSchema(target), prop);
    return (
      ownPropertyDescriptor && {
        ...ownPropertyDescriptor,
        configurable: true,
      }
    );
  },
};
//@ chunk-qq5knpkd.js:24397-24482 esm-layout
function materializeDeferredSchema(target) {
  if (target.build !== undefined) {
    target.schema = target.build();
    target.build = undefined;
  }
  return target.schema;
}
//@ chunk-qq5knpkd.js:24482-24921 esm-fingerprint
var deferredSchemaHandlers = {
  get: (target, prop, receiver) => Reflect.get(materializeDeferredSchema(target), prop, receiver),
  has: (target, prop) => prop in materializeDeferredSchema(target),
  set: (target, prop, value) => Reflect.set(materializeDeferredSchema(target), prop, value),
  defineProperty: (target, prop, descriptor) =>
    Reflect.defineProperty(materializeDeferredSchema(target), prop, descriptor),
  deleteProperty: (target, prop) => Reflect.deleteProperty(materializeDeferredSchema(target), prop),
  getPrototypeOf: (target) => Object.getPrototypeOf(materializeDeferredSchema(target)),
  ownKeys: (target) => Reflect.ownKeys(materializeDeferredSchema(target)),
  preventExtensions: () => false,
  getOwnPropertyDescriptor(target, prop) {
    let ownPropertyDescriptor = Reflect.getOwnPropertyDescriptor(materializeDeferredSchema(target), prop);
    return (
      ownPropertyDescriptor && {
        ...ownPropertyDescriptor,
        configurable: true,
      }
    );
  },
};
export { schemaProxyHandlers, deferredSchemaHandlers };
