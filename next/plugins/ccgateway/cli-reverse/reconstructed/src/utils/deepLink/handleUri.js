/**
 * utils/deepLink/handleUri.ts
 *
 * 2.1.316 新增：校验 --handle-uri 深链调用的参数
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-23jq4b96.js (1)
 * attribution: placement 1
 */

//@ chunk-23jq4b96.js:191-572 placement
function validateHandleUriArgs(argv) {
  let index = argv.indexOf("--handle-uri");
  if (index === -1 || !argv[index + 1]) return null;
  if (argv.length > index + 2)
    return (
      `claude: rejected deep-link invocation \u2014 unexpected arguments after the URI.
` +
      "The OS protocol handler passes exactly `--handle-uri <uri>`; extra arguments indicate argument injection via the URL. If invoking --handle-uri manually, place other flags before it."
    );
  return null;
}
export { validateHandleUriArgs };
