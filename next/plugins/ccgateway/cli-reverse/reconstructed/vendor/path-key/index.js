/**
 * path-key/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: path-key@3.1.1..4.0.0
 * pieces: chunk-m4p5zn6n.js (1)
 * attribution: esm-fingerprint 1
 */

//@ chunk-m4p5zn6n.js:7494-7660 esm-fingerprint
function pathKey(options = {}) {
  let { env = process.env, platform = "linux" } = options;
  if (platform !== "win32") return "PATH";
  return (
    Object.keys(env)
      .reverse()
      .find((key) => key.toUpperCase() === "PATH") || "Path"
  );
}
export { pathKey };
