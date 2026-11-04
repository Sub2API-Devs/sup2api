# 剩余压缩名清单

由 `tools/verify/leftover.mjs` 生成（输入 `todo.jsonl`，来自 `tools/verify/readability.mjs`）。

| 树 | 原因 | 个数 |
|---|---|---|
| src | authored | 98 |
| src | dead | 32 |
| vendor | dead | 3 |
| vendor | authored | 2 |
| vendor | frozen | 111 |

原因：`frozen` 所在 chunk 有直接 eval，改名器冻结整个 chunk；`dead` 从不被读取（0 引用或成员核实的死槽位）；`authored` 模块本身没有压缩（随包脚本等），短名是作者原名；`bundler` Bun 打包器自己的包装参数；`unnamed` 命名缺口。

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
| vendor/@opentelemetry/otlp-grpc-exporter-base/build/src/version.js | `chunk-pwh5dx3n.js@344` | `gl` | top | 1 | frozen | direct-eval |
| vendor/@grpc/grpc-js/build/src/constants.js | `chunk-pwh5dx3n.js@457` | `k` | top | 38 | frozen | direct-eval |
| vendor/@grpc/grpc-js/package.json.js | `chunk-pwh5dx3n.js@1756` | `ia` | top | 2 | frozen | direct-eval |
| vendor/@grpc/grpc-js/build/src/logging.js | `chunk-pwh5dx3n.js@4537` | `K` | top | 26 | frozen | direct-eval |
| vendor/@grpc/grpc-js/build/src/error.js | `chunk-pwh5dx3n.js@5989` | `Qi` | top | 3 | frozen | direct-eval |
| vendor/@grpc/grpc-js/build/src/metadata.js | `chunk-pwh5dx3n.js@6298` | `ue` | top | 17 | frozen | direct-eval |
| vendor/@grpc/grpc-js/build/src/call-credentials.js | `chunk-pwh5dx3n.js@8826` | `rs` | top | 3 | frozen | direct-eval |
| vendor/@grpc/grpc-js/build/src/tls-helpers.js | `chunk-pwh5dx3n.js@10384` | `fa` | top | 2 | frozen | direct-eval |
| vendor/@grpc/grpc-js/build/src/uri-parser.js | `chunk-pwh5dx3n.js@10716` | `we` | top | 14 | frozen | direct-eval |
| vendor/@grpc/grpc-js/build/src/resolver.js | `chunk-pwh5dx3n.js@11716` | `rt` | top | 10 | frozen | direct-eval |
| vendor/@grpc/grpc-js/build/src/channel-credentials.js | `chunk-pwh5dx3n.js@12572` | `Mr` | top | 5 | frozen | direct-eval |
| vendor/@grpc/grpc-js/build/src/load-balancer.js | `chunk-pwh5dx3n.js@19815` | `Gt` | top | 7 | frozen | direct-eval |
| vendor/@grpc/grpc-js/build/src/service-config.js | `chunk-pwh5dx3n.js@21752` | `va` | top | 2 | frozen | direct-eval |
| vendor/@grpc/grpc-js/build/src/connectivity-state.js | `chunk-pwh5dx3n.js@30269` | `Ae` | top | 14 | frozen | direct-eval |
| vendor/@grpc/grpc-js/build/src/picker.js | `chunk-pwh5dx3n.js@30570` | `kt` | top | 8 | frozen | direct-eval |
| vendor/@grpc/grpc-js/build/src/backoff-timeout.js | `chunk-pwh5dx3n.js@31544` | `Ir` | top | 5 | frozen | direct-eval |
| vendor/@grpc/grpc-js/build/src/load-balancer-child-handler.js | `chunk-pwh5dx3n.js@33646` | `cs` | top | 3 | frozen | direct-eval |
| vendor/@grpc/grpc-js/build/src/resolving-load-balancer.js | `chunk-pwh5dx3n.js@36003` | `Dc` | top | 1 | frozen | direct-eval |
| vendor/@grpc/grpc-js/build/src/channel-options.js | `chunk-pwh5dx3n.js@41011` | `qc` | top | 1 | frozen | direct-eval |
| vendor/@grpc/grpc-js/build/src/subchannel-address.js | `chunk-pwh5dx3n.js@42371` | `Pe` | top | 13 | frozen | direct-eval |
| vendor/@js-sdsl/ordered-map/dist/cjs/index.js | `chunk-pwh5dx3n.js@44336` | `Qc` | top | 1 | frozen | direct-eval |
| vendor/@grpc/grpc-js/build/src/admin.js | `chunk-pwh5dx3n.js@52027` | `fs` | top | 3 | frozen | direct-eval |
| vendor/@grpc/grpc-js/build/src/call.js | `chunk-pwh5dx3n.js@52323` | `lu` | top | 1 | frozen | direct-eval |
| vendor/@grpc/grpc-js/build/src/call-interface.js | `chunk-pwh5dx3n.js@55099` | `vr` | top | 6 | frozen | direct-eval |
| vendor/@grpc/grpc-js/build/src/client-interceptors.js | `chunk-pwh5dx3n.js@56654` | `Ca` | top | 2 | frozen | direct-eval |
| vendor/@grpc/grpc-js/build/src/client.js | `chunk-pwh5dx3n.js@63399` | `Ta` | top | 2 | frozen | direct-eval |
| vendor/@grpc/grpc-js/build/src/make-client.js | `chunk-pwh5dx3n.js@69761` | `vs` | top | 3 | frozen | direct-eval |
| vendor/lodash.camelcase/index.js | `chunk-pwh5dx3n.js@71136` | `Qu` | top | 1 | frozen | direct-eval |
| vendor/@protobufjs/codegen/index.js | `chunk-pwh5dx3n.js@76764` | `ed` | top | 1 | frozen | direct-eval |
| vendor/unresolved-cjs/index.js | `chunk-pwh5dx3n.js@78095` | `td` | top | 1 | frozen | direct-eval |
| vendor/unresolved-cjs/index.js | `chunk-pwh5dx3n.js@78185` | `mod` | local | 4 | frozen | direct-eval |
| vendor/protobufjs/src/util/fetch.js | `chunk-pwh5dx3n.js@78407` | `id` | top | 1 | frozen | direct-eval |
| vendor/@protobufjs/path/index.js | `chunk-pwh5dx3n.js@79296` | `ad` | top | 1 | frozen | direct-eval |
| vendor/protobufjs/src/util/patterns.js | `chunk-pwh5dx3n.js@79824` | `ld` | top | 1 | frozen | direct-eval |
| vendor/protobufjs/src/namespace.js | `chunk-pwh5dx3n.js@80383` | `zr` | top | 5 | frozen | direct-eval |
| vendor/protobufjs/src/mapfield.js | `chunk-pwh5dx3n.js@85944` | `Ts` | top | 3 | frozen | direct-eval |
| vendor/protobufjs/src/method.js | `chunk-pwh5dx3n.js@86970` | `Rs` | top | 3 | frozen | direct-eval |
| vendor/protobufjs/src/service.js | `chunk-pwh5dx3n.js@88403` | `bs` | top | 3 | frozen | direct-eval |
| vendor/protobufjs/src/message.js | `chunk-pwh5dx3n.js@90854` | `Os` | top | 3 | frozen | direct-eval |
| vendor/protobufjs/src/decoder.js | `chunk-pwh5dx3n.js@91576` | `qa` | top | 2 | frozen | direct-eval |
| vendor/protobufjs/src/verifier.js | `chunk-pwh5dx3n.js@93806` | `za` | top | 2 | frozen | direct-eval |
| vendor/protobufjs/src/converter.js | `chunk-pwh5dx3n.js@96431` | `ja` | top | 2 | frozen | direct-eval |
| vendor/protobufjs/src/wrappers.js | `chunk-pwh5dx3n.js@101572` | `Ga` | top | 2 | frozen | direct-eval |
| vendor/protobufjs/src/type.js | `chunk-pwh5dx3n.js@102459` | `Ps` | top | 3 | frozen | direct-eval |
| vendor/protobufjs/src/root.js | `chunk-pwh5dx3n.js@109309` | `xs` | top | 3 | frozen | direct-eval |
| vendor/protobufjs/src/util.js | `chunk-pwh5dx3n.js@112811` | `de` | top | 17 | frozen | direct-eval |
| vendor/protobufjs/src/types.js | `chunk-pwh5dx3n.js@114757` | `Cr` | top | 6 | frozen | direct-eval |
| vendor/protobufjs/src/field.js | `chunk-pwh5dx3n.js@115257` | `Yt` | top | 7 | frozen | direct-eval |
| vendor/protobufjs/src/oneof.js | `chunk-pwh5dx3n.js@119868` | `Sr` | top | 6 | frozen | direct-eval |
| vendor/protobufjs/src/object.js | `chunk-pwh5dx3n.js@121937` | `Kt` | top | 7 | frozen | direct-eval |
| vendor/protobufjs/src/enum.js | `chunk-pwh5dx3n.js@125758` | `nt` | top | 10 | frozen | direct-eval |
| vendor/protobufjs/src/encoder.js | `chunk-pwh5dx3n.js@128338` | `Ka` | top | 2 | frozen | direct-eval |
| vendor/protobufjs/src/index-light.js | `chunk-pwh5dx3n.js@129800` | `Wd` | top | 1 | frozen | direct-eval |
| vendor/protobufjs/src/tokenize.js | `chunk-pwh5dx3n.js@130457` | `ao` | top | 2 | frozen | direct-eval |
| vendor/protobufjs/src/parse.js | `chunk-pwh5dx3n.js@132941` | `Qd` | top | 1 | frozen | direct-eval |
| vendor/protobufjs/src/common.js | `chunk-pwh5dx3n.js@141309` | `th` | top | 1 | frozen | direct-eval |
| vendor/protobufjs/src/index.js | `chunk-pwh5dx3n.js@142802` | `qs` | top | 3 | frozen | direct-eval |
| vendor/protobufjs/google/protobuf/descriptor.json.js | `chunk-pwh5dx3n.js@142961` | `oo` | top | 2 | frozen | direct-eval |
| vendor/protobufjs/ext/descriptor/index.js | `chunk-pwh5dx3n.js@156552` | `uh` | top | 1 | frozen | direct-eval |
| vendor/protobufjs/google/protobuf/api.json.js | `chunk-pwh5dx3n.js@168468` | `dh` | top | 1 | frozen | direct-eval |
| vendor/protobufjs/google/protobuf/source_context.json.js | `chunk-pwh5dx3n.js@169333` | `hh` | top | 1 | frozen | direct-eval |
| vendor/protobufjs/google/protobuf/type.json.js | `chunk-pwh5dx3n.js@169475` | `fh` | top | 1 | frozen | direct-eval |
| vendor/@grpc/proto-loader/build/src/util.js | `chunk-pwh5dx3n.js@171118` | `vh` | top | 1 | frozen | direct-eval |
| vendor/@grpc/proto-loader/build/src/index.js | `chunk-pwh5dx3n.js@172412` | `fo` | top | 2 | frozen | direct-eval |
| vendor/@grpc/grpc-js/build/src/channelz.js | `chunk-pwh5dx3n.js@175806` | `Zt` | top | 7 | frozen | direct-eval |
| vendor/@grpc/grpc-js/build/src/call-number.js | `chunk-pwh5dx3n.js@185439` | `Ys` | top | 3 | frozen | direct-eval |
| vendor/@grpc/grpc-js/build/src/compression-algorithms.js | `chunk-pwh5dx3n.js@185573` | `_o` | top | 2 | frozen | direct-eval |
| vendor/@grpc/grpc-js/build/src/filter.js | `chunk-pwh5dx3n.js@185810` | `So` | top | 2 | frozen | direct-eval |
| vendor/@grpc/grpc-js/build/src/compression-filter.js | `chunk-pwh5dx3n.js@186082` | `Eo` | top | 2 | frozen | direct-eval |
| vendor/@grpc/grpc-js/build/src/control-plane-status.js | `chunk-pwh5dx3n.js@190997` | `Ui` | top | 4 | frozen | direct-eval |
| vendor/@grpc/grpc-js/build/src/deadline.js | `chunk-pwh5dx3n.js@191469` | `Kr` | top | 5 | frozen | direct-eval |
| vendor/@grpc/grpc-js/build/src/filter-stack.js | `chunk-pwh5dx3n.js@192416` | `Js` | top | 3 | frozen | direct-eval |
| vendor/@grpc/grpc-js/build/src/single-subchannel-channel.js | `chunk-pwh5dx3n.js@193427` | `Cf` | top | 1 | frozen | direct-eval |
| vendor/@grpc/grpc-js/build/src/subchannel.js | `chunk-pwh5dx3n.js@198196` | `Pf` | top | 1 | frozen | direct-eval |
| vendor/@grpc/grpc-js/build/src/environment.js | `chunk-pwh5dx3n.js@205121` | `If` | top | 1 | frozen | direct-eval |
| vendor/@grpc/grpc-js/build/src/resolver-dns.js | `chunk-pwh5dx3n.js@205379` | `Oo` | top | 2 | frozen | direct-eval |
| vendor/@grpc/grpc-js/build/src/http_proxy.js | `chunk-pwh5dx3n.js@211559` | `wo` | top | 2 | frozen | direct-eval |
| vendor/@grpc/grpc-js/build/src/stream-decoder.js | `chunk-pwh5dx3n.js@215076` | `Ao` | top | 2 | frozen | direct-eval |
| vendor/@grpc/grpc-js/build/src/subchannel-call.js | `chunk-pwh5dx3n.js@216948` | `ip` | top | 1 | frozen | direct-eval |
| vendor/@grpc/grpc-js/build/src/transport.js | `chunk-pwh5dx3n.js@224820` | `pp` | top | 1 | frozen | direct-eval |
| vendor/@grpc/grpc-js/build/src/subchannel-pool.js | `chunk-pwh5dx3n.js@236318` | `Ep` | top | 1 | frozen | direct-eval |
| vendor/@grpc/grpc-js/build/src/load-balancing-call.js | `chunk-pwh5dx3n.js@237583` | `Pp` | top | 1 | frozen | direct-eval |
| vendor/@grpc/grpc-js/build/src/resolving-call.js | `chunk-pwh5dx3n.js@243581` | `Lp` | top | 1 | frozen | direct-eval |
| vendor/@grpc/grpc-js/build/src/retrying-call.js | `chunk-pwh5dx3n.js@250041` | `Gp` | top | 1 | frozen | direct-eval |
| vendor/@grpc/grpc-js/build/src/subchannel-interface.js | `chunk-pwh5dx3n.js@263234` | `Bi` | top | 4 | frozen | direct-eval |
| vendor/@grpc/grpc-js/build/src/internal-channel.js | `chunk-pwh5dx3n.js@264838` | `Io` | top | 2 | frozen | direct-eval |
| vendor/@grpc/grpc-js/build/src/channel.js | `chunk-pwh5dx3n.js@277422` | `Ra` | top | 2 | frozen | direct-eval |
| vendor/@grpc/grpc-js/build/src/server-call.js | `chunk-pwh5dx3n.js@278512` | `Og` | top | 1 | frozen | direct-eval |
| vendor/@grpc/grpc-js/build/src/server-credentials.js | `chunk-pwh5dx3n.js@281878` | `dn` | top | 3 | frozen | direct-eval |
| vendor/@grpc/grpc-js/build/src/duration.js | `chunk-pwh5dx3n.js@287455` | `zi` | top | 4 | frozen | direct-eval |
| vendor/@grpc/grpc-js/build/src/orca.js | `chunk-pwh5dx3n.js@288353` | `pn` | top | 3 | frozen | direct-eval |
| vendor/@grpc/grpc-js/build/src/server-interceptors.js | `chunk-pwh5dx3n.js@293538` | `zo` | top | 2 | frozen | direct-eval |
| vendor/@grpc/grpc-js/build/src/server.js | `chunk-pwh5dx3n.js@308149` | `dm` | top | 1 | frozen | direct-eval |
| vendor/@grpc/grpc-js/build/src/status-builder.js | `chunk-pwh5dx3n.js@336720` | `gm` | top | 1 | frozen | direct-eval |
| vendor/@grpc/grpc-js/build/src/load-balancer-pick-first.js | `chunk-pwh5dx3n.js@337194` | `ji` | top | 4 | frozen | direct-eval |
| vendor/@grpc/grpc-js/build/src/certificate-provider.js | `chunk-pwh5dx3n.js@346342` | `Im` | top | 1 | frozen | direct-eval |
| vendor/@grpc/grpc-js/build/src/experimental.js | `chunk-pwh5dx3n.js@349347` | `Vo` | top | 2 | frozen | direct-eval |
| vendor/@grpc/grpc-js/build/src/resolver-uds.js | `chunk-pwh5dx3n.js@354358` | `Hm` | top | 1 | frozen | direct-eval |
| vendor/@grpc/grpc-js/build/src/resolver-ip.js | `chunk-pwh5dx3n.js@354928` | `Vm` | top | 1 | frozen | direct-eval |
| vendor/@grpc/grpc-js/build/src/load-balancer-round-robin.js | `chunk-pwh5dx3n.js@356508` | `rv` | top | 1 | frozen | direct-eval |
| vendor/@grpc/grpc-js/build/src/load-balancer-outlier-detection.js | `chunk-pwh5dx3n.js@360048` | `pv` | top | 1 | frozen | direct-eval |
| vendor/@grpc/grpc-js/build/src/priority-queue.js | `chunk-pwh5dx3n.js@371594` | `yv` | top | 1 | frozen | direct-eval |
| vendor/@grpc/grpc-js/build/src/load-balancer-weighted-round-robin.js | `chunk-pwh5dx3n.js@372598` | `Av` | top | 1 | frozen | direct-eval |
| vendor/@grpc/grpc-js/build/src/index.js | `chunk-pwh5dx3n.js@380542` | `Ki` | top | 4 | frozen | direct-eval |
| vendor/@opentelemetry/otlp-grpc-exporter-base/build/src/create-service-client-constructor.js | `chunk-pwh5dx3n.js@385565` | `Kv` | top | 1 | frozen | direct-eval |
| vendor/@opentelemetry/otlp-grpc-exporter-base/build/src/grpc-exporter-transport.js | `chunk-pwh5dx3n.js@385943` | `Ji` | top | 4 | frozen | direct-eval |
| vendor/@opentelemetry/otlp-grpc-exporter-base/build/src/configuration/otlp-grpc-configuration.js | `chunk-pwh5dx3n.js@387590` | `ny` | top | 1 | frozen | direct-eval |
| vendor/@opentelemetry/otlp-grpc-exporter-base/build/src/configuration/otlp-grpc-env-configuration.js | `chunk-pwh5dx3n.js@389020` | `fy` | top | 1 | frozen | direct-eval |
| vendor/@opentelemetry/otlp-grpc-exporter-base/build/src/configuration/convert-legacy-otlp-grpc-options.js | `chunk-pwh5dx3n.js@391315` | `_y` | top | 1 | frozen | direct-eval |
| vendor/@opentelemetry/otlp-grpc-exporter-base/build/src/otlp-grpc-export-delegate.js | `chunk-pwh5dx3n.js@391937` | `Ry` | top | 1 | frozen | direct-eval |
| vendor/@opentelemetry/otlp-grpc-exporter-base/build/src/index.js | `chunk-pwh5dx3n.js@392341` | `Ian` | top | 1 | frozen | direct-eval |
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
