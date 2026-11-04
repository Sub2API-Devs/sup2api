// 诊断用 Bun --preload：把 process.exit 调用栈、未捕获异常、未处理的 rejection 打到 stderr。
// 只在 run.mjs --trace 时注入；默认不加载，不影响对拍。
const origExit = process.exit;
process.exit = function (code) {
  process.stderr.write(`[verify-trace] process.exit(${code})\n${new Error().stack}\n`);
  return origExit.call(process, code);
};
process.on('uncaughtException', (e) => process.stderr.write(`[verify-trace] uncaughtException ${e?.stack || e}\n`));
process.on('unhandledRejection', (e) => process.stderr.write(`[verify-trace] unhandledRejection ${e?.stack || e}\n`));
