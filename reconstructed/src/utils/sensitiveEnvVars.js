/**
 * utils/sensitiveEnvVars.ts
 *
 * 2.1.316 新增：判断环境变量名是否像连接串（CONN_STR/CONNECTION_STRING 等，含驼峰）与驼峰转蛇形的工具。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-q8cqcff6.js (4)
 * attribution: placement 4
 */

//@ chunk-q8cqcff6.js:32807-32859 placement
var CONNECTION_STRING_NAME_REGEX = /CONN(ECT(ION)?)?_?STR(ING)?S?(?=$|[_0-9])/i;
//@ chunk-q8cqcff6.js:32859-32909 placement
/**
 * 变量名是否像连接串（CONN_STR、CONNECTION_STRING 等，含驼峰形式）。
 */
function isConnectionStringName(name) {
  return (
    CONNECTION_STRING_NAME_REGEX.test(name) || CONNECTION_STRING_NAME_REGEX.test(camelToSnakeEnvName(name))
  );
}
//@ chunk-q8cqcff6.js:32909-32937 placement
/**
 * 拆驼峰前需归一的混合大小写词（OAuth、NextAuth）。
 */
var MIXED_CASE_AUTH_WORDS = ["OAuth", "NextAuth"];
//@ chunk-q8cqcff6.js:32937-33103 placement = normalize (1)
function camelToSnakeEnvName(name) {
  return MIXED_CASE_AUTH_WORDS.reduce(
    (acc, word) => acc.replaceAll(word, word[0] + word.slice(1).toLowerCase()),
    name,
  )
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1_$2");
}
export { CONNECTION_STRING_NAME_REGEX, camelToSnakeEnvName, isConnectionStringName, MIXED_CASE_AUTH_WORDS };
