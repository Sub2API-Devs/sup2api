/**
 * execa/lib/promise.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: execa@8.0.1
 * pieces: chunk-m4p5zn6n.js (1)
 * attribution: esm-layout 1
 */
//@ chunk-m4p5zn6n.js:25888-26318 esm-layout
var nativePromisePrototype = (async () => {})().constructor.prototype;
var descriptors = ["then", "catch", "finally"].map((property) => [
  property,
  Reflect.getOwnPropertyDescriptor(nativePromisePrototype, property),
]);
var mergePromise = (spawned, promise) => {
  for (let [property, descriptor] of descriptors) {
    let value =
      typeof promise === "function"
        ? (...args) => Reflect.apply(descriptor.value, promise(), args)
        : descriptor.value.bind(promise);
    Reflect.defineProperty(spawned, property, {
      ...descriptor,
      value,
    });
  }
};
var getSpawnedPromise = (spawned) =>
  new Promise((resolve, reject) => {
    spawned.on("exit", (exitCode, signal) => {
      resolve({
        exitCode,
        signal,
      });
    });
    spawned.on("error", (error) => {
      reject(error);
    });
    if (spawned.stdin)
      spawned.stdin.on("error", (error) => {
        reject(error);
      });
  });
export { mergePromise, getSpawnedPromise };
