# 剩余压缩名清单

由 `tools/verify/leftover.mjs` 生成（输入 `todo.jsonl`，来自 `tools/verify/readability.mjs`）。

| 树 | 原因 | 个数 |
|---|---|---|
| src | authored | 1 |
| vendor | authored | 2 |

原因：`frozen` 直接 eval 能看到的绑定（eval 代码静态可知时只冻结它读的名字，不可知时冻结整条作用域链）；`dead` 从不被读取（0 引用或成员核实的死槽位）；`authored` 模块本身没有压缩（随包脚本等），短名是作者原名；`bundler` Bun 打包器自己的包装参数；`unnamed` 命名缺口。

| 文件 | 绑定 | 压缩名 | 范围 | 引用 | 原因 | 说明 |
|---|---|---|---|---|---|---|
| src/skills/bundled/hillclimb/build-report-lite.js | `build-report-lite-jwtbvm49.mjs@7919` | `esc` | top | 19 | authored | module is not minified: the author's own short name |
| vendor/zod/v4/core/api.js | `chunk-m4y44r15.js@54816` | `ye` | top | 2 | authored | zod: vendor-ref/node_modules/zod/v4/core/api.js:512 export function _lt |
| vendor/axios/dist/esm/axios.js | `chunk-ww9agm6g.js@47490` | `sn` | top | 2 | authored | axios: vendor-ref/node_modules/axios/lib/utils.js:256 const G = getGlobal() |
