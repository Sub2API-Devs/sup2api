# 剩余压缩名清单

由 `tools/verify/leftover.mjs` 生成（输入 `todo.jsonl`，来自 `tools/verify/readability.mjs`）。

| 树 | 原因 | 个数 |
|---|---|---|
| src | authored | 98 |
| src | dead | 32 |
| vendor | dead | 3 |
| vendor | authored | 3 |

原因：`frozen` 直接 eval 能看到的绑定（eval 代码静态可知时只冻结它读的名字，不可知时冻结整条作用域链）；`dead` 从不被读取（0 引用或成员核实的死槽位）；`authored` 模块本身没有压缩（随包脚本等），短名是作者原名；`bundler` Bun 打包器自己的包装参数；`unnamed` 命名缺口。

| 文件 | 绑定 | 压缩名 | 范围 | 引用 | 原因 | 说明 |
|---|---|---|---|---|---|---|
| src/skills/bundled/hillclimb/build-report-lite.js | `build-report-lite-jwtbvm49.mjs@2414` | `p` | param | 1 | authored | module is not minified: the author's own short name |
| src/skills/bundled/hillclimb/build-report-lite.js | `build-report-lite-jwtbvm49.mjs@2701` | `p` | param | 3 | authored | module is not minified: the author's own short name |
| src/skills/bundled/hillclimb/build-report-lite.js | `build-report-lite-jwtbvm49.mjs@2822` | `st` | local | 2 | authored | module is not minified: the author's own short name |
| src/skills/bundled/hillclimb/build-report-lite.js | `build-report-lite-jwtbvm49.mjs@5500` | `seg` | param | 2 | authored | module is not minified: the author's own short name |
| src/skills/bundled/hillclimb/build-report-lite.js | `build-report-lite-jwtbvm49.mjs@6054` | `p` | param | 8 | authored | module is not minified: the author's own short name |
| src/skills/bundled/hillclimb/build-report-lite.js | `build-report-lite-jwtbvm49.mjs@6498` | `st` | local | 2 | authored | module is not minified: the author's own short name |
| src/skills/bundled/hillclimb/build-report-lite.js | `build-report-lite-jwtbvm49.mjs@7315` | `p` | param | 1 | authored | module is not minified: the author's own short name |
| src/skills/bundled/hillclimb/build-report-lite.js | `build-report-lite-jwtbvm49.mjs@7795` | `s` | param | 1 | authored | module is not minified: the author's own short name |
| src/skills/bundled/hillclimb/build-report-lite.js | `build-report-lite-jwtbvm49.mjs@7872` | `a` | param | 1 | authored | module is not minified: the author's own short name |
| src/skills/bundled/hillclimb/build-report-lite.js | `build-report-lite-jwtbvm49.mjs@7919` | `esc` | top | 19 | authored | module is not minified: the author's own short name |
| src/skills/bundled/hillclimb/build-report-lite.js | `build-report-lite-jwtbvm49.mjs@7925` | `s` | param | 1 | authored | module is not minified: the author's own short name |
| src/skills/bundled/hillclimb/build-report-lite.js | `build-report-lite-jwtbvm49.mjs@7966` | `c` | param | 1 | authored | module is not minified: the author's own short name |
| src/skills/bundled/hillclimb/build-report-lite.js | `build-report-lite-jwtbvm49.mjs@8448` | `s` | param | 1 | authored | module is not minified: the author's own short name |
| src/skills/bundled/hillclimb/build-report-lite.js | `build-report-lite-jwtbvm49.mjs@8898` | `a` | param | 1 | authored | module is not minified: the author's own short name |
| src/skills/bundled/hillclimb/build-report-lite.js | `build-report-lite-jwtbvm49.mjs@8901` | `b` | param | 1 | authored | module is not minified: the author's own short name |
| src/skills/bundled/hillclimb/build-report-lite.js | `build-report-lite-jwtbvm49.mjs@9068` | `g` | param | 8 | authored | module is not minified: the author's own short name |
| src/skills/bundled/hillclimb/build-report-lite.js | `build-report-lite-jwtbvm49.mjs@9397` | `p` | param | 1 | authored | module is not minified: the author's own short name |
| src/skills/bundled/hillclimb/build-report-lite.js | `build-report-lite-jwtbvm49.mjs@9643` | `r` | local | 5 | authored | module is not minified: the author's own short name |
| src/skills/bundled/hillclimb/build-report-lite.js | `build-report-lite-jwtbvm49.mjs@10276` | `c` | local | 2 | authored | module is not minified: the author's own short name |
| src/skills/bundled/hillclimb/build-report-lite.js | `build-report-lite-jwtbvm49.mjs@10703` | `r` | local | 4 | authored | module is not minified: the author's own short name |
| src/skills/bundled/hillclimb/build-report-lite.js | `build-report-lite-jwtbvm49.mjs@11097` | `s` | param | 2 | authored | module is not minified: the author's own short name |
| src/skills/bundled/hillclimb/build-report-lite.js | `build-report-lite-jwtbvm49.mjs@12452` | `sp` | local | 3 | authored | module is not minified: the author's own short name |
| src/skills/bundled/hillclimb/build-report-lite.js | `build-report-lite-jwtbvm49.mjs@12496` | `ids` | local | 3 | authored | module is not minified: the author's own short name |
| src/skills/bundled/hillclimb/build-report-lite.js | `build-report-lite-jwtbvm49.mjs@14443` | `p` | param | 1 | authored | module is not minified: the author's own short name |
| src/skills/bundled/hillclimb/build-report-lite.js | `build-report-lite-jwtbvm49.mjs@14716` | `l` | param | 1 | authored | module is not minified: the author's own short name |
| src/skills/bundled/hillclimb/build-report-lite.js | `build-report-lite-jwtbvm49.mjs@14990` | `r` | local | 3 | authored | module is not minified: the author's own short name |
| src/skills/bundled/hillclimb/build-report-lite.js | `build-report-lite-jwtbvm49.mjs@15127` | `a` | param | 1 | authored | module is not minified: the author's own short name |
| src/skills/bundled/hillclimb/build-report-lite.js | `build-report-lite-jwtbvm49.mjs@15130` | `b` | param | 1 | authored | module is not minified: the author's own short name |
| src/skills/bundled/hillclimb/build-report-lite.js | `build-report-lite-jwtbvm49.mjs@16165` | `ids` | local | 2 | authored | module is not minified: the author's own short name |
| src/skills/bundled/hillclimb/build-report-lite.js | `build-report-lite-jwtbvm49.mjs@16367` | `r` | param | 2 | authored | module is not minified: the author's own short name |
| src/skills/bundled/hillclimb/build-report-lite.js | `build-report-lite-jwtbvm49.mjs@16480` | `r` | param | 1 | authored | module is not minified: the author's own short name |
| src/skills/bundled/hillclimb/build-report-lite.js | `build-report-lite-jwtbvm49.mjs@16564` | `s` | param | 1 | authored | module is not minified: the author's own short name |
| src/skills/bundled/hillclimb/build-report-lite.js | `build-report-lite-jwtbvm49.mjs@16803` | `per` | local | 2 | authored | module is not minified: the author's own short name |
| src/skills/bundled/hillclimb/build-report-lite.js | `build-report-lite-jwtbvm49.mjs@16998` | `r` | param | 1 | authored | module is not minified: the author's own short name |
| src/skills/bundled/hillclimb/build-report-lite.js | `build-report-lite-jwtbvm49.mjs@17063` | `r` | param | 1 | authored | module is not minified: the author's own short name |
| src/skills/bundled/hillclimb/build-report-lite.js | `build-report-lite-jwtbvm49.mjs@18422` | `abs` | local | 2 | authored | module is not minified: the author's own short name |
| src/skills/bundled/hillclimb/build-report-lite.js | `build-report-lite-jwtbvm49.mjs@18610` | `ls` | local | 2 | authored | module is not minified: the author's own short name |
| src/skills/bundled/hillclimb/build-report-lite.js | `build-report-lite-jwtbvm49.mjs@18993` | `agg` | local | 2 | authored | module is not minified: the author's own short name |
| src/skills/bundled/hillclimb/build-report-lite.js | `build-report-lite-jwtbvm49.mjs@19059` | `c` | param | 1 | authored | module is not minified: the author's own short name |
| src/skills/bundled/hillclimb/build-report-lite.js | `build-report-lite-jwtbvm49.mjs@19124` | `c` | param | 1 | authored | module is not minified: the author's own short name |
| src/skills/bundled/hillclimb/build-report-lite.js | `build-report-lite-jwtbvm49.mjs@19153` | `c` | param | 1 | authored | module is not minified: the author's own short name |
| src/skills/bundled/hillclimb/build-report-lite.js | `build-report-lite-jwtbvm49.mjs@19202` | `xs` | param | 3 | authored | module is not minified: the author's own short name |
| src/skills/bundled/hillclimb/build-report-lite.js | `build-report-lite-jwtbvm49.mjs@19232` | `s` | param | 1 | authored | module is not minified: the author's own short name |
| src/skills/bundled/hillclimb/build-report-lite.js | `build-report-lite-jwtbvm49.mjs@19381` | `s` | param | 1 | authored | module is not minified: the author's own short name |
| src/skills/bundled/hillclimb/build-report-lite.js | `build-report-lite-jwtbvm49.mjs@19384` | `c` | param | 1 | authored | module is not minified: the author's own short name |
| src/skills/bundled/hillclimb/build-report-lite.js | `build-report-lite-jwtbvm49.mjs@19547` | `tsv` | local | 2 | authored | module is not minified: the author's own short name |
| src/skills/bundled/hillclimb/build-report-lite.js | `build-report-lite-jwtbvm49.mjs@19609` | `c` | local | 3 | authored | module is not minified: the author's own short name |
| src/skills/bundled/hillclimb/build-report-lite.js | `build-report-lite-jwtbvm49.mjs@20209` | `p` | local | 1 | authored | module is not minified: the author's own short name |
| src/skills/bundled/hillclimb/build-report-lite.js | `build-report-lite-jwtbvm49.mjs@20667` | `agg` | param | 2 | authored | module is not minified: the author's own short name |
| src/skills/bundled/hillclimb/build-report-lite.js | `build-report-lite-jwtbvm49.mjs@20747` | `c` | param | 1 | authored | module is not minified: the author's own short name |
| src/skills/bundled/hillclimb/build-report-lite.js | `build-report-lite-jwtbvm49.mjs@20826` | `th` | local | 14 | authored | module is not minified: the author's own short name |
| src/skills/bundled/hillclimb/build-report-lite.js | `build-report-lite-jwtbvm49.mjs@20957` | `h` | local | 5 | authored | module is not minified: the author's own short name |
| src/skills/bundled/hillclimb/build-report-lite.js | `build-report-lite-jwtbvm49.mjs@20972` | `a` | local | 5 | authored | module is not minified: the author's own short name |
| src/skills/bundled/hillclimb/build-report-lite.js | `build-report-lite-jwtbvm49.mjs@21664` | `c` | param | 7 | authored | module is not minified: the author's own short name |
| src/skills/bundled/hillclimb/build-report-lite.js | `build-report-lite-jwtbvm49.mjs@21721` | `p` | local | 5 | authored | module is not minified: the author's own short name |
| src/skills/bundled/hillclimb/build-report-lite.js | `build-report-lite-jwtbvm49.mjs@22692` | `w` | param | 1 | authored | module is not minified: the author's own short name |
| src/skills/bundled/hillclimb/build-report-lite.js | `build-report-lite-jwtbvm49.mjs@24439` | `CSS` | top | 1 | authored | module is not minified: the author's own short name |
| src/skills/bundled/hillclimb/build-report-lite.js | `build-report-lite-jwtbvm49.mjs@27065` | `w` | local | 1 | authored | module is not minified: the author's own short name |
| src/tools/RefreshMcpToolsTool/RefreshMcpToolsTool.js | `chunk-22r83hv0.js@29473` | `e` | param | 0 | dead | no references |
| vendor/tslib/tslib.es6.mjs | `chunk-6r5wanw7.js@313` | `r` | top | 0 | dead | no references |
| vendor/tslib/tslib.es6.mjs | `chunk-6r5wanw7.js@501` | `m` | top | 0 | dead | no references |
| vendor/zod/v4/core/api.js | `chunk-7vp249v4.js@54816` | `ye` | top | 2 | authored | zod: vendor-ref/node_modules/zod/v4/core/api.js:512 export function _lt |
| src/utils/permissions/filesystem.js | `chunk-82kqcve8.js@264286` | `e` | param | 0 | dead | no references |
| src/components/fleet/FleetViewInput.js | `chunk-93kwxas0.js@135264` | `Bt` | local | 0 | dead | 死局部（同文件后面另有同名的另一个 `Bt`，与本绑定无关）（naming-left-s0.md） |
| src/components/fleet/FleetViewInput.js | `chunk-93kwxas0.js@135270` | `lt` | local | 0 | dead | 同上（naming-left-s0.md） |
| src/components/fleet/FleetView.js | `chunk-93kwxas0.js@180012` | `le` | local | 0 | dead | 只在声明处出现，React 组件里的死局部（同一文件其它 `le` 是别的局部）（naming-left-s0.md） |
| src/components/fleet/FleetView.js | `chunk-93kwxas0.js@180510` | `Yt` | local | 0 | dead | 声明后从未读取（`view` 由 `ensureFleetViewStore` 另给）（naming-left-s0.md） |
| src/components/fleet/FleetView.js | `chunk-93kwxas0.js@188931` | `et` | local | 0 | dead | 死局部（naming-left-s0.md） |
| src/components/fleet/FleetView.js | `chunk-93kwxas0.js@196770` | `jE` | local | 0 | dead | 死局部（naming-left-s0.md） |
| src/components/LogSelector.js | `chunk-b79vwm1h.js@8947` | `ee` | local | 0 | dead | 死局部（naming-left-s0.md） |
| src/components/LogSelector.js | `chunk-b79vwm1h.js@9009` | `Te` | local | 0 | dead | 死局部（naming-left-s0.md） |
| vendor/eventsource-parser/dist/index.js | `chunk-ccwj2pkk.js@365` | `n` | param | 0 | dead | no references |
| src/utils/teleport.js | `chunk-e6aww6q8.js@1973303` | `h` | local | 0 | dead | 死局部（naming-left-s0.md） |
| src/utils/teleport.js | `chunk-e6aww6q8.js@1973308` | `y` | local | 0 | dead | 死局部（naming-left-s0.md） |
| src/utils/teleport.js | `chunk-e6aww6q8.js@1973511` | `we` | local | 0 | dead | 只声明（naming-left-s0.md） |
| src/utils/teleport.js | `chunk-e6aww6q8.js@1974298` | `gt` | local | 0 | dead | 赋值一次、从不读取（naming-left-s0.md） |
| src/utils/teleport.js | `chunk-e6aww6q8.js@1974306` | `At` | local | 0 | dead | 赋空数组、从不读取（naming-left-s0.md） |
| src/utils/teleport.js | `chunk-e6aww6q8.js@1974594` | `hn` | local | 0 | dead | 死局部（naming-left-s0.md） |
| src/utils/teleport.js | `chunk-e6aww6q8.js@1986484` | `Hi` | local | 0 | dead | 死局部（naming-left-s0.md） |
| src/utils/teleport.js | `chunk-e6aww6q8.js@2004309` | `Ah` | local | 0 | dead | 死局部（naming-left-s0.md） |
| src/services/api/claude.js | `chunk-e6aww6q8.js@2677189` | `Io` | local | 0 | dead | 只声明、从不赋值也从不读取（主请求函数里的遗留位）（naming-left-s0.md） |
| src/services/api/claude.js | `chunk-e6aww6q8.js@2703574` | `FT` | local | 0 | dead | 只声明（`let FT;`），无赋值无读取（naming-left-s0.md） |
| src/services/api/claude.js | `chunk-e6aww6q8.js@2714919` | `NMs` | local | 0 | dead | 赋值一次、从不读取（naming-left-s0.md） |
| src/services/api/claude.js | `chunk-e6aww6q8.js@2715014` | `$Ms` | local | 0 | dead | 赋值一次、从不读取（naming-left-s0.md） |
| src/services/api/claude.js | `chunk-e6aww6q8.js@2721080` | `HMs` | local | 0 | dead | 赋值一次、从不读取（状态机状态没接上）（naming-left-s0.md） |
| src/services/api/claude.js | `chunk-e6aww6q8.js@2738315` | `BMs` | local | 0 | dead | 空异步生成器，从未被 `yield*`（同处的 `uht` 被用了两次，已命名 `emptyYieldStream`）（naming-left-s0.md） |
| src/utils/worktree.js | `chunk-e6aww6q8.js@3650398` | `r` | param | 0 | dead | no references |
| src/utils/worktree.js | `chunk-e6aww6q8.js@3651238` | `s` | param | 0 | dead | no references |
| src/utils/worktree.js | `chunk-e6aww6q8.js@3682907` | `It` | local | 2 | dead | 死局部（`let It = null`，refs=2 但两处只用于拼 `watchPath`，恒为 null，结果恒 null）（naming-gap-b.md） |
| src/services/api/errors.js | `chunk-gr2vfhah.js@3184` | `e` | param | 0 | dead | no references |
| vendor/axios/dist/esm/axios.js | `chunk-h6b7mazd.js@47490` | `sn` | top | 2 | authored | axios: vendor-ref/node_modules/axios/lib/utils.js:256 const G = getGlobal() |
| src/utils/windowsStdin.js | `chunk-j66yxmsq.js@372` | `t` | param | 0 | dead | no references |
| vendor/unresolved-cjs/index.js | `chunk-pwh5dx3n.js@78185` | `mod` | local | 4 | authored | @protobufjs/inquire: npm @protobufjs/inquire@1.1.0 index.js:12 var mod = eval(...)(moduleName) |
| src/components/ConsoleOAuthFlow.js | `chunk-s5p7fp0c.js@14022` | `Y` | local | 0 | dead | 死局部（naming-left-s0.md） |
| src/services/homeSeed/notices.js | `chunk-twq47pff.js@58931` | `P` | local | 0 | dead | 死局部（naming-left-s0.md） |
| src/services/extractMemories/extractMemories.js | `chunk-xr4xc2mq.js@16167` | `r` | param | 0 | dead | 参数从不读取（调用点传 `undefined`）（naming-left-s0.md） |
| src/skills/bundled/hillclimb/runnerScaffold.js | `runner-scaffold-q2rf9gg9.mjs@2883` | `p` | param | 1 | authored | module is not minified: the author's own short name |
| src/skills/bundled/hillclimb/runnerScaffold.js | `runner-scaffold-q2rf9gg9.mjs@3002` | `p` | param | 1 | authored | module is not minified: the author's own short name |
| src/skills/bundled/hillclimb/runnerScaffold.js | `runner-scaffold-q2rf9gg9.mjs@3488` | `s` | param | 1 | authored | module is not minified: the author's own short name |
| src/skills/bundled/hillclimb/runnerScaffold.js | `runner-scaffold-q2rf9gg9.mjs@3565` | `a` | param | 1 | authored | module is not minified: the author's own short name |
| src/skills/bundled/hillclimb/runnerScaffold.js | `runner-scaffold-q2rf9gg9.mjs@4623` | `p` | param | 8 | authored | module is not minified: the author's own short name |
| src/skills/bundled/hillclimb/runnerScaffold.js | `runner-scaffold-q2rf9gg9.mjs@4935` | `st` | local | 2 | authored | module is not minified: the author's own short name |
| src/skills/bundled/hillclimb/runnerScaffold.js | `runner-scaffold-q2rf9gg9.mjs@5798` | `p` | param | 1 | authored | module is not minified: the author's own short name |
| src/skills/bundled/hillclimb/runnerScaffold.js | `runner-scaffold-q2rf9gg9.mjs@6202` | `p` | param | 2 | authored | module is not minified: the author's own short name |
| src/skills/bundled/hillclimb/runnerScaffold.js | `runner-scaffold-q2rf9gg9.mjs@6428` | `off` | local | 5 | authored | module is not minified: the author's own short name |
| src/skills/bundled/hillclimb/runnerScaffold.js | `runner-scaffold-q2rf9gg9.mjs@7051` | `p` | param | 1 | authored | module is not minified: the author's own short name |
| src/skills/bundled/hillclimb/runnerScaffold.js | `runner-scaffold-q2rf9gg9.mjs@7106` | `p` | param | 1 | authored | module is not minified: the author's own short name |
| src/skills/bundled/hillclimb/runnerScaffold.js | `runner-scaffold-q2rf9gg9.mjs@7334` | `p` | param | 1 | authored | module is not minified: the author's own short name |
| src/skills/bundled/hillclimb/runnerScaffold.js | `runner-scaffold-q2rf9gg9.mjs@9984` | `a` | local | 17 | authored | module is not minified: the author's own short name |
| src/skills/bundled/hillclimb/runnerScaffold.js | `runner-scaffold-q2rf9gg9.mjs@13492` | `st` | param | 7 | authored | module is not minified: the author's own short name |
| src/skills/bundled/hillclimb/runnerScaffold.js | `runner-scaffold-q2rf9gg9.mjs@13711` | `d` | param | 1 | authored | module is not minified: the author's own short name |
| src/skills/bundled/hillclimb/runnerScaffold.js | `runner-scaffold-q2rf9gg9.mjs@13802` | `f` | param | 1 | authored | module is not minified: the author's own short name |
| src/skills/bundled/hillclimb/runnerScaffold.js | `runner-scaffold-q2rf9gg9.mjs@13834` | `f` | param | 1 | authored | module is not minified: the author's own short name |
| src/skills/bundled/hillclimb/runnerScaffold.js | `runner-scaffold-q2rf9gg9.mjs@13918` | `p` | param | 1 | authored | module is not minified: the author's own short name |
| src/skills/bundled/hillclimb/runnerScaffold.js | `runner-scaffold-q2rf9gg9.mjs@13954` | `h` | local | 2 | authored | module is not minified: the author's own short name |
| src/skills/bundled/hillclimb/runnerScaffold.js | `runner-scaffold-q2rf9gg9.mjs@14014` | `p` | local | 5 | authored | module is not minified: the author's own short name |
| src/skills/bundled/hillclimb/runnerScaffold.js | `runner-scaffold-q2rf9gg9.mjs@16955` | `r` | param | 1 | authored | module is not minified: the author's own short name |
| src/skills/bundled/hillclimb/runnerScaffold.js | `runner-scaffold-q2rf9gg9.mjs@19476` | `seg` | param | 2 | authored | module is not minified: the author's own short name |
| src/skills/bundled/hillclimb/runnerScaffold.js | `runner-scaffold-q2rf9gg9.mjs@19836` | `p` | local | 2 | authored | module is not minified: the author's own short name |
| src/skills/bundled/hillclimb/runnerScaffold.js | `runner-scaffold-q2rf9gg9.mjs@21663` | `st` | local | 8 | authored | module is not minified: the author's own short name |
| src/skills/bundled/hillclimb/runnerScaffold.js | `runner-scaffold-q2rf9gg9.mjs@22294` | `ln` | local | 2 | authored | module is not minified: the author's own short name |
| src/skills/bundled/hillclimb/runnerScaffold.js | `runner-scaffold-q2rf9gg9.mjs@22396` | `r` | local | 2 | authored | module is not minified: the author's own short name |
| src/skills/bundled/hillclimb/runnerScaffold.js | `runner-scaffold-q2rf9gg9.mjs@22932` | `c` | local | 3 | authored | module is not minified: the author's own short name |
| src/skills/bundled/hillclimb/runnerScaffold.js | `runner-scaffold-q2rf9gg9.mjs@23203` | `c` | param | 1 | authored | module is not minified: the author's own short name |
| src/skills/bundled/hillclimb/runnerScaffold.js | `runner-scaffold-q2rf9gg9.mjs@23416` | `sid` | local | 1 | authored | module is not minified: the author's own short name |
| src/skills/bundled/hillclimb/runnerScaffold.js | `runner-scaffold-q2rf9gg9.mjs@23509` | `s` | local | 5 | authored | module is not minified: the author's own short name |
| src/skills/bundled/hillclimb/runnerScaffold.js | `runner-scaffold-q2rf9gg9.mjs@24305` | `c` | local | 2 | authored | module is not minified: the author's own short name |
| src/skills/bundled/hillclimb/runnerScaffold.js | `runner-scaffold-q2rf9gg9.mjs@24867` | `p` | local | 2 | authored | module is not minified: the author's own short name |
| src/skills/bundled/hillclimb/runnerScaffold.js | `runner-scaffold-q2rf9gg9.mjs@25080` | `c` | local | 18 | authored | module is not minified: the author's own short name |
| src/skills/bundled/hillclimb/runnerScaffold.js | `runner-scaffold-q2rf9gg9.mjs@25154` | `t0` | local | 3 | authored | module is not minified: the author's own short name |
| src/skills/bundled/hillclimb/runnerScaffold.js | `runner-scaffold-q2rf9gg9.mjs@25676` | `g` | local | 4 | authored | module is not minified: the author's own short name |
| src/skills/bundled/hillclimb/runnerScaffold.js | `runner-scaffold-q2rf9gg9.mjs@27501` | `p` | local | 1 | authored | module is not minified: the author's own short name |
| src/skills/bundled/hillclimb/runnerScaffold.js | `runner-scaffold-q2rf9gg9.mjs@27888` | `g` | local | 1 | authored | module is not minified: the author's own short name |
| src/skills/bundled/hillclimb/runnerScaffold.js | `runner-scaffold-q2rf9gg9.mjs@31678` | `t0` | local | 1 | authored | module is not minified: the author's own short name |
| src/skills/bundled/hillclimb/runnerScaffold.js | `runner-scaffold-q2rf9gg9.mjs@31782` | `el` | local | 2 | authored | module is not minified: the author's own short name |
| src/skills/bundled/hillclimb/runnerScaffold.js | `runner-scaffold-q2rf9gg9.mjs@31823` | `eta` | local | 2 | authored | module is not minified: the author's own short name |
