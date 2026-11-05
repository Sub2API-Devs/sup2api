# 命名表格式（naming/）

命名表是"压缩名 → 可读名"的映射，由多个来源（旧版源码对照、npm 第三方包、领域语义命名、自动兜底）分别产出，
放在 `naming/` 下的任意子目录。改名引擎 `tools/rename/apply.mjs` 读取全部命名表、合并、做作用域安全的改名，
生成与 `original/` 布局一致的 `runnable/`；`tools/emit`（阅读树）通过 `tools/rename/lib/rename.mjs` 复用同一套逻辑。

## 1. 文件与加载

- 递归读取 `naming/` 下所有 `*.json` 和 `*.jsonl`，按路径排序依次加载；文件名以 `_` 开头的跳过（草稿、备注）。
- JSON 顶层键必须是模块路径（相对 `original/`，`/` 分隔，例如 `chunk-0089hrfm.js`、`src/plugins/functionHooks/hooks-worker/hooks-worker.js`）。
  以 `$` 开头的键（`$schema`、`$meta`）和不是 `*.js/*.mjs/*.cjs` 的键（例如 `summary.json` 里的统计数字）忽略，记入报告的 `namingWarnings`。
- 命名表不是代码生成物的唯一真值：改名结果以引擎报告为准（冲突加后缀、冻结的绑定不改）。

## 2. JSON 形式

```json
{
  "build-report-lite-jwtbvm49.mjs": {
    "@2159":  { "name": "getUname", "source": "reference", "confidence": 0.99, "note": "按偏移命名顶层绑定 WIN" },
    "top":     { "CSS": { "name": "reportCss", "source": "semantic", "confidence": 0.6 } },
    "locals":  { "@2476": { "name": "error", "source": "auto", "confidence": 0.4, "note": "catch 参数" } }
  },
  "chunk-cgr0tezp.js": {
    "exports": { "_": { "name": "jsonStringify", "source": "reference", "confidence": 0.9, "note": "export{…,_,…}；所有导入方 import{_} 同步改" } }
  }
}
```

| 段 | 键 | 含义 |
|---|---|---|
| `"@N"`（直接写在模块对象里）| 绑定声明标识符在 original 文件里的起始偏移 | 等同于 `locals`；顶层绑定和局部绑定都可以用偏移键 |
| `locals` | `"@N"` | 同上 |
| `top` | 顶层绑定的当前压缩名 | 只能指模块作用域的绑定（含 import 绑定） |
| `exports` | 当前导出名（`export {x as 导出名}` 里的导出名） | 改导出名；所有导入方的 `import {导出名}` 同步改 |

条目值（spec）可以是字符串（等价于 `{"name": "...", "source": "auto"}`）或对象，字段：

| 字段 | 必填 | 说明 |
|---|---|---|
| `name` | 是 | 新名字。必须是 ASCII 标识符 `[A-Za-z_$][A-Za-z0-9_$]*`，且不是保留字 / 严格模式保留字 / `await` / `arguments` / `eval`；否则拒绝并记入报告 |
| `source` | 否（默认 `auto`） | 名字来源：`vendor`（npm 包原名）、`reference`（旧版源码 2.1.88 对照）、`semantic`（领域成员根据行为命名）、`auto`（规则兜底）。其他取值也接受（例如 `import`、`minified`），合并时排在最后 |
| `confidence` | 否（默认 0.5） | 0–1，命名者对"这个名字就是原名 / 正确描述"的把握。只用于多来源合并时取舍，不影响改名安全性 |
| `note` | 否 | 依据（旧版文件、npm 文件、证据），会原样带进报告 |
| 其他字段 | 否 | 忽略（例如 `min`、`kind`、`via`、`declId`），可以自由记录 |

`name` 与当前名相同表示"明确保持"：该绑定不再接受任何默认改名（例如导入别名跟随导出方）。

## 3. JSONL 形式

大表（例如几十万条局部名）用 JSONL，每行一条：

```json
{"file":"build-report-lite-jwtbvm49.mjs","key":"@2476","name":"error","source":"auto","confidence":0.4}
{"file":"build-report-lite-jwtbvm49.mjs","top":"WIN","name":"getUname","source":"reference","confidence":0.99}
{"file":"chunk-cgr0tezp.js","export":"_","name":"jsonStringify","source":"reference","confidence":0.9}
```

每行必须有 `file`，以及 `key`（偏移）、`top`（压缩名）、`export`（导出名）三者之一。

注意：`naming/semantic-*.jsonl` 是由 `tools/naming/resolve.mjs` 读取的，它**只认 `key`**。写语义名时一律用偏移键；`top`、`export` 只适用于直接交给改名器（`tools/rename/lib/naming.mjs`）的表。

## 4. 偏移键 `@N`

- `N` 是绑定**声明标识符**在 `original/<file>` 里的起始位置：Babel `node.start`（UTF-16 下标），与 `tools/ast/scan.mjs`、
  `analysis/` 里的 start/end 同一坐标。所有能解析的模块都是纯 ASCII，所以它也等于字节偏移。
- 一个绑定有多个声明（`var a=1;var a=2;`、函数体内与参数同名的 `var`）时，任一声明的偏移都指向同一个绑定；
  `bindingsOf` 给出的规范键是最小的那个偏移。
- `original/` 永不改变，所以偏移键稳定；给局部变量命名前用 `bindingsOf` 列出绑定：

```js
import { bindingsOf } from './tools/rename/lib/rename.mjs'
bindingsOf('chunk-0089hrfm.js', source)
// → [{ key:'@636', name:'R', scope:'top', kind:'var', declStart:636, topDeclStart:632, refs:1, frozen:null },
//    { key:'@780', name:'e', scope:'local', kind:'param', declStart:780, topDeclStart:767, refs:4, frozen:null }, …]
```

`kind`：`import` `var` `let` `const` `using` `await using` `function` `class` `param` `catch` `fnname`（函数表达式名）`classname`（类表达式名）。
`topDeclStart` 是绑定所在顶层语句的起点（对应 `analysis/scan` 的 `start`）。`frozen` 非空表示该绑定不能改名（见第 6 节）。

## 5. 合并与优先级

同一个绑定（或导出）在多处给了不同名字时：

1. `confidence` 高者胜；
2. 相同则按 `source`：`vendor` > `reference` > `semantic` > `auto` > 其他；
3. 再相同取先加载者（文件路径排序靠前、文件内靠前）。

所有分歧记入报告 `namingClashes`（候选、来源文件、最终选择）。同一模块里，`top`（按名字）条目先于偏移条目处理；
同一绑定既有名字条目又有偏移条目且名字不同时，名字条目生效并记 `duplicate-request` 警告。

## 6. 冲突与冻结规则（引擎保证，命名者不必手工避让）

给作用域 S 里的绑定 b 起新名 X，下列任一情况视为冲突，自动改用 `X_2`、`X_3`……并记入报告 `conflicts`：

| 原因（报告里的 reason） | 含义 |
|---|---|
| `same-scope` | S 里已有别的绑定（按当前最终名）叫 X |
| `param-body-or-catch-clash` | 参数与函数体、catch 参数与 catch 块是同一名字空间（`function f(x){let x}` 是语法错误，`var x` 会与参数合并） |
| `shadowed-by-inner` | b 的某个引用与 S 之间的内层作用域里有绑定叫 X（改名后该引用会被内层遮蔽） |
| `captures-outer-or-global` | S 子树里有名为 X 的引用解析到 S 之外：外层绑定或全局变量（`process`、`Buffer`、`require`、`module`、`exports`、`console`、`undefined`……），改名后会被 b 捕获 |
| `name taken in this scope (earlier request)` | 同一作用域里先处理的请求已经用了 X（后缀序号从上次用到的继续） |
| `babel-module-block` | 只针对新名 `module`：`module{`（如 `class A extends module{…}`）会被 Babel 当成提案语法拒绝解析 |

不改名（记入报告 `rejected`）的情况：

- 名字非法（第 2 节）；
- 绑定冻结：从直接 `eval(...)` 调用处到模块作用域链上所有作用域里的绑定（original 里只有 `chunk-pwh5dx3n.js` 的 protobufjs `inquire` 一处，冻结 129 个绑定）；
  Annex B `catch(e){var e}`（original 里 0 处）；`export var/function/class` 声明（original 里 0 处）；隐式 `arguments`；
- 导出名冻结的模块（见第 7 节）上的 `exports` 条目。

## 7. 导出名与导入方

- `exports` 条目改导出名；没有 `exports` 条目但导出是 `export {a}`（导出名 = 本地名）且 `a` 有命名条目时，导出名跟随 `a` 的请求名。
- 导出名在模块内必须唯一，重名加后缀（记入 `exportPlan.conflicts`）。`default` 不改。
- 所有导入方的 `import {旧导出名 as 本地名}` 同步改成新导出名。导入方本地名（导入方没有显式条目时）依次取：
  导出方给该导出本地绑定的请求名 → 新导出名（导出名变了时）→ 保持。`apply.mjs --auto-import-names` 时，
  外部模块的别名导入（`import {extname as Qo} from "path"`）本地名也改成导入名 `extname`。
- **导出名冻结**（只改本地名，导出处写成 `export {新本地名 as 原导出名}`）的模块：
  被 `import("./x.js")` 动态加载；被 `import * as ns` 引用；参与 `export … from` 重导出；
  文件名在任何模块源码里出现（`require("./x.js")`、Worker 路径 `import.meta.dir+"/…/hooks-worker.js"` 等，按文件名匹配）；
  没有被任何模块静态导入（入口、Worker 脚本）。原因：这些模块的命名空间对象按属性名使用。
  在 2.1.316 里共 1,041 个模块（2.1.318 见 `artifacts/tmp/rename-report.json` 的 `exportPlan.frozenExports`）（报告 `exportPlan.frozenExports` 列出每个模块的原因）。

## 8. 阅读树（tools/emit）注意

引擎只保证 **chunk 级**正确：每个 chunk 内无捕获、无遮蔽，跨 chunk 的导入导出一致。Bun 按顶层语句拆 chunk，
同一源文件的声明会分散在多个 chunk；阅读树把它们重新聚合到一个文件时，同名可能来自不同 chunk 的绑定，
需要生成器在聚合后的模块级再做一次冲突检测。

## 9. 示例：最小命名表

`naming/semantic/startup.json`：

```json
{
  "cli.js": {
    "top": { "me": { "name": "checkCwdExists", "source": "semantic", "confidence": 0.8, "note": "process.cwd() 抛 ENOENT 时报错退出" } }
  },
  "chunk-0089hrfm.js": {
    "top": { "R": { "name": "TRANQUIL_FERN_GATE", "source": "auto", "confidence": 0.3 } },
    "@780": { "name": "state", "source": "semantic", "confidence": 0.5 }
  }
}
```

应用与校验：

```bash
node tools/rename/apply.mjs original naming runnable --force --report artifacts/tmp/rename-report.json --check
```
