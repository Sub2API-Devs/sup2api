# 领域 commands 过程记录（dom-commands）

## 做了什么

**范围。** `analysis/segments/domains.json` 的 `commands` 键。按 lead 重新切分后的当前结果是 169 个模块、719 个声明（`commands.ts` 与 `commands/**`，含新出现的 `commands/clear/caches.ts`）。domains.json 列出的模块里，有 7 个在重新切分后已不存在（`agents/agents.tsx`、`extra-usage/extra-usage.tsx`、`init-verifiers.ts`、`remote-setup/index.ts`、`rename/rename.ts`、`review/ultrareviewCommand.tsx`、`upgrade/upgrade.tsx`）。

**步骤。**

1. 找出全部命令对象，并把它们和实现关联起来。
   - `artifacts/tmp/commands/find-cmds.mjs` 在全部 chunk 里找命令对象（对象字面量里有 `type: local|local-jsx|prompt` 和 `name`），得到 148 个，输出 `cmds.json`。
   - `registry.mjs` 解析 `Z3s`（buildBuiltinCommandTable）的条目顺序与运行时门控组。
   - `table.mjs` 把每个命令的 `load()` 关联到实现 chunk 与导出函数；没有 `load` 的 local-jsx 查 `chunk-18hwfzwa.js` 的 `nre` 懒加载表。输出 `table.json`。
2. 读代码，判断名字和归属。
   - `overview.mjs` 列出领域内全部绑定，以及每个绑定的当前名字与来源，输出 `bindings.tsv`。
   - `def.mjs`、`impl.mjs`、`fq.mjs` 用来跨 chunk 解析定义、看实现、查调用方。
   - `facade.mjs` 生成绑定级的门面原名表。按 lead 通知，有门面原名的绑定不再给语义名。
3. 生成交付物。
   - `gen-naming.mjs` 按规则生成名字：命令对象 `<camel>Command` 或 `<camel>NonInteractiveCommand`；`别名=对象` 时对象加 `Definition` 后缀；选择器 `selectXY`；`call` 参数按类型命名；`immediate`、`getPromptForCommand` 的参数也按固定含义命名。规则之外是人工表 `spec.mjs`（TOP 与 LOCALS，每条带依据）。生成器会跳过门面键，丢弃置信度低于 0.45 的条目，其余置信度收进 0.6–0.95。
   - `gen-docs.mjs` 生成声明说明：命令对象与实现入口的说明由 `table.json` 自动生成；`spec.mjs` 里带依据的条目转成说明；人工说明来自 `docs-spec.mjs`（注册表与派发相关的函数）。
   - `gen-modules.mjs` 写每个模块的一行说明。
   - `dupcheck.mjs` 检查同一 chunk 顶层是否重名。只发现门面表自身的重复键，我写的名字没有冲突。
4. 写手册 `docs/handbook/commands.md`。

**316 与 2.1.88 的对照。** 逐项对比 `references/claude-code-analysis/src/commands.ts` 和 `commands/` 目录，结论写在手册第 9 节。

## 数字

- **`naming/semantic-commands.jsonl`：1025 条。** 按来源分：

  | 来源 | 条数 | 说明 |
  |---|---|---|
  | 命令对象 | 217 | |
  | 人工顶层 | 273 | 注册表、谓词、命令辅助、各实现 chunk 的常量与组件 |
  | call 参数 | 270 | |
  | 命令方法参数 | 37 | |
  | 人工局部 | 228 | 注册表函数的局部变量 |

  另有 49 条证据不足（原定置信度低于 0.45）的没有写入。
- **顶层绑定覆盖。** 领域 169 个模块共 887 个顶层绑定。加上门面名、final 与本表后，仍是压缩名的有 232 个，大多是 `_unattributed` 之外的小组件、memo 缓存、外来误归代码。局部绑定 6451 个，仍是压缩名的有 4008 个，主要是 React 组件内部变量和 `$`/`w()` 编译缓存槽，没有逐一命名。
- **`naming/docs-commands.jsonl`：412 条。**
  - 全部 148 个命令对象和 106 个实现入口都有说明。
  - 注册表、过滤、派发相关函数有 46 条人工说明。
  - 182 条人工命名依据转成了说明（与上面部分重叠）。
  - 领域内 719 个声明中，有说明的是 229 个；其余说明落在 `_unattributed` 里属于命令的部分，以及各实现 chunk。
- **`naming/modules-commands.json`：169/169 个模块。** 其中 21 个模块标注了"（切分有误）"。

## 遇到的问题

- **跑不动的工具。**
  - `tools/q.mjs callers` 在 `chunk-e6aww6q8.js` 上运行超过 10 分钟，我先改用自己的 `fq.mjs`（lead 后来修好了）。
  - `node -e` 里的正则在 bash 引号里转义出错，后来改成先写脚本文件再运行。
- **切分中途更新。** lead 中途更新了切分（门面导出的声明强制归同一模块，fingerprint 克隆不再决定归属），模块列表因此变化，我改为以当前 `modules.json` 为准（`curmods.txt`）。
- **一个源模块散落多处。** 命令对象集中在注册表 chunk（`chunk-e6aww6q8.js` part-179…225），实现散在约 100 个懒加载 chunk。实现 chunk 大多切在 `_unattributed/<chunk>/part-NNN.js`，我只给入口命名，没有深入实现内部（多属 ui、agents、extensions 等领域）。
- **旧路径配错代码。** 旧版路径名被大量按"旧文件名 + 形状"配到不相干的代码上（例如 thinkback、tag、files、doctor），模块说明里已经标出来。

## 给 lead 的建议

格式：`声明 id（我给的名字） → 应归属路径/应叫什么，证据（现归模块）`。

### 误归（现在归在 commands/ 下，但不是该命令的代码）

- `chunk-s61vbvea.js#VA`（GLOB_PATTERN_REGEX）、`#Aqr`（getGlobBaseDirectory）→ `utils/permissions/pathValidation.ts`。证据：与旧版 getGlobBaseDirectory 逐行一致（现归 `commands.ts`，旧版名 getCommands 配错）。
- `chunk-e6aww6q8.js#osn`（compactCommandList）只是 `filter(Boolean)`，不是 filterCommandsForRemoteMode；真正的 filterCommandsForRemoteMode 是门面名所在的 `#gjo`。
- `chunk-e6aww6q8.js#hjo`（门面名 withWorkerOnlyCommands）→ `commands.ts`。证据：门面导出；它不属于已删除的 `commands/init-verifiers.ts`（该模块在新切分里已消失，确认一下即可）。
- `chunk-s61vbvea.js#DU` → 不是 cost。它是"非 cost 对象"判断（`typeof e==="object" && !("cost" in e)`），按调用方应归用量/计费相关模块（现归 `commands/cost/index.ts`）。
- `chunk-29ccbp5f.js#s`（Set["update","install","doctor"]）→ 版本检查或自动更新模块（现归 `commands/doctor/index.ts`；/doctor 在 316 已是内建技能）。
- `chunk-m8aeec95.js#TTs` → readFileState 取值器（`A7.of(e).readFileState / subagentReadFileStates`），应归 `utils/fileStateCache` 一类（现归 `commands/files/files.ts`；/files 已删除）。
- `chunk-18hwfzwa.js#wJ`（确认对话框）、`chunk-9tgt55am.js#kt`（tagName 判断）、`chunk-ak1qv1dp.js#d`（主题设置组件）→ 各自的 UI 组件模块（现归 `commands/tag/tag.tsx`；/tag 已删除）。
- `chunk-rbe666af.js#M`（Symbol("skip")）→ 所在 chunk 的使用方模块（现归 `commands/rewind/rewind.ts`）。
- `chunk-ha3km179.js#Hr`（钩子触发辅助）→ hooks 相关模块（现归 `commands/tasks/tasks.tsx`）。/tasks 的真正实现 `chunk-pw933apk.js#i` 被归到了 `components/permissions/BashPermissionRequest/BashPermissionRequest.tsx`，应归 `commands/tasks/tasks.tsx`。
- `chunk-18hwfzwa.js#_P`（resolveCommandDialog）、`#nre`（COMMAND_DIALOG_LOADERS）→ 应归一个命令派发模块（例如 `commands/dialogs.ts` 或 `utils/processUserInput` 一侧）。证据：`_P` 只对 local-jsx 按 `dialogKey ?? name` 查 `nre`（现归 `commands/thinkback/index.ts`）。
- `chunk-tx2s9zpa.js#q`（AdvisorPicker）、`#N`（ADVISOR_BLOG_URL）→ `commands/advisor.ts` 或其实现模块（现归 `commands/thinkback/thinkback.tsx`）。
- `chunk-fxpvgzqn.js#l` → /powerup 的 call，应归 `commands/powerup/*`（现归 `commands/output-style/output-style.tsx`）。`chunk-19dk83fw.js#Le`（powerup 课程组件）同样应归 powerup（现归 `commands/mobile/mobile.tsx`）。
- `chunk-e6aww6q8.js#wrr`（lowPriorityCommand）→ `commands/low-priority/index.ts`（现归 `commands/thinkback-play/index.ts`）。
- `chunk-vrrvwm85.js#se`（/compact 的 call，门面原名 call）→ `commands/compact/compact.ts`（现归 `services/MagicDocs/prompts.ts`，旧版名 buildMagicDocsUpdatePrompt 配错）。同 chunk 的 `#O`（compactManually）、`#b`、`#A` 也应在 compact.ts。
- `chunk-thjvqmbc.js#Wt`（确认快捷键提示）→ 通用 UI 组件（现归 `commands/login/login.tsx`）。
- `chunk-s5p7fp0c.js#Gt` → AWS 认证刷新组件（awsAuthRefresh），应归 `components/` 下（现归 `commands/plugin/plugin.tsx`）。
- `chunk-p2qwpk2k.js#Dt` → "在编辑器查看全文"对话框（现归 `commands/review/UltrareviewOverageDialog.tsx`）。
- `chunk-18hwfzwa.js#Hqo`（tengu_cancel 遥测）→ 查询取消相关模块（现归 `commands/context/context.tsx`）。
- `chunk-hm0ce8vc.js#Zo`、`#cs`（远程会话来源判断）→ 远程会话模块（现归 `commands/review.ts`）。
- `chunk-3nztfxrw.js` 的 autoMode 规则声明 → auto 模式模块（现混在 `commands/remote-setup/api.ts`）。
- `chunk-fnmk6x3n.js`（/pro-trial-expired 的实现）被归到 `commands/bridge/bridge.tsx`，应归 `commands/pro-trial-expired/*`。
- `chunk-pemtjbn7.js#_`（/web-setup 命令对象）现归 `_new/githubNotConnectedMessage.ts`，应归 `commands/remote-setup/index.ts`。

### 未归属（`_unattributed/chunk-e6aww6q8/part-NNN.js`，应新建 commands 模块）

这些都是命令对象与它们的启用谓词，按命令名分别放进 `commands/<name>/index.ts`：

| 片段 | 内容 | 应归 |
|---|---|---|
| part-078（`LCe`、`Q5`、`kxo` 等） | 技能覆盖与命令基础谓词 | `types/command.ts` 或 `commands.ts` 附近的 `utils/commandPredicates.ts` |
| part-079（`JBr`、`BUt`、`f4s`、`NCe`、`aGe`、`fSt`、`MB`、`tN`、`lX`） | 同上 | 同上 |
| part-179 | cloud-plugins、auto-mode-setup（两版）、artifacts、autofix-pr 及谓词 `p5e`、`m5e`、`GZt`、`EXo` | 各自的 `commands/<name>/index.ts` |
| part-180 | `xXo` feedback | `commands/feedback/index.ts` |
| part-181 | `MXo` cd | `commands/cd/index.ts` |
| part-183 | `oen` autocompact | `commands/autocompact/index.ts` |
| part-184 | `ren` createMovedToConfigCommand、vim/output-style 存根、`C5e` | `commands/output-style/index.ts` 与 `commands/vim/index.ts` |
| part-185 | pause-memory | `commands/pause-memory/index.ts` |
| part-186 | import 两版及 argv 改写（`J6s`、`X6s`、`p9o`） | `commands/import/index.ts` |
| part-187 | design-login、design-consent、design-revoke | `commands/design/*` |
| part-191 | powerup | `commands/powerup/index.ts` |
| part-192 | setup-bedrock、setup-vertex | `commands/setup-bedrock/*`、`commands/setup-vertex/*` |
| part-193 | scroll-speed | `commands/scroll-speed/index.ts` |
| part-195 | team-onboarding（`Nen`、`y8o`、`S8o` 等）与 teleport | `commands/team-onboarding/*`、`commands/teleport/index.ts` |
| part-196 | terminal-setup 对象及终端判定 | `commands/terminalSetup/index.ts` |
| part-209 | `f6` isUltraplanEnabled | `commands/ultraplan.tsx` |
| part-210 | usage 两版、skill-doctor | `commands/usage/index.ts`、`commands/skill-doctor/index.ts` |
| part-211…217 | tui、loops、fork/subtask/agents、reload-skills、radio | 各自的 `commands/<name>/index.ts` |
| part-218 | 企业版提示存根（`A2`、`Rrn`、`qor`）与 `Arn` getExitDescription | `commands/c4eUpsell.ts`、`commands/exit/index.ts` |
| part-220 | restart（`Mrn`、`Irn`） | `commands/restart/index.ts` |
| part-221 | __remote-workflow、workflow-launch-exec | `commands/workflow/*` |
| part-222 | pro-trial-expired | `commands/pro-trial-expired/*` |
| part-223 | limit-reset、claim-credit 及其配置读取（`kTe`、`STe`、`FB`） | 各自模块 |
| part-225 | wellbeing、focus（`Wrn`）、`mjo` WORKER_ONLY_SKILL_NAMES | 各自模块；`mjo`、`ezr` 归 `commands.ts` |

**其他未归属的命令片段。**

- `_unattributed/chunk-e6aww6q8/part-324..329`、`part-134..136`：属于 `commands.ts`（注册表尾部与名字保留）。
- 独立 chunk 的命令对象应建模块：
  - `chunk-0e9ty0k2`（daemon）、`chunk-3m7t4vj8`（background）、`chunk-66drwgm7`（recap）、`chunk-adzz9hc5`（stop）
  - `chunk-nn4xbsmj`（goal）、`chunk-g8tswn69`（workflows）、`chunk-yxzqxbzv`（list-agents）
  - `chunk-gv7qjj2t`（brief，已归）

### 匹配名配错（旧版名套到了不同行为的代码上）

- `chunk-e6aww6q8.js#EA`：旧版名 findCommand 配错。实际是 addCommandSpellings（把 name、显示名、aliases 加进集合）；真正的 findCommand 是门面的 `chunk-s61vbvea.js#Zs`。
- `chunk-e6aww6q8.js#q_e`：旧版名 getMcpSkillCommands 配错。实际是 dropShadowedFallbackSkills。
- `chunk-e6aww6q8.js#lsr`：真正的 getSlashCommandToolSkills 过滤逻辑；门面名给的是缓存层 `#G0e`，两者不要混。
- `chunk-hm0ce8vc.js#cs`：旧版名 review 配错，实际是远程会话来源判断。
- `chunk-tx2s9zpa.js#q`：旧版名 ThinkbackMenu 配错，实际是 AdvisorPicker。
- `chunk-18hwfzwa.js#_P`：旧版名 thinkback 配错，实际是 resolveCommandDialog。
- `chunk-vrrvwm85.js#se`：旧版名 buildMagicDocsUpdatePrompt 配错，实际是 /compact 的 call。
- `commands/extra-usage/extra-usage.tsx` 旧匹配的 `uHi` 实为 buildLoginDoneMessage；`commands/review/ultrareviewCommand.tsx` 旧匹配的 `aHi` 实为 loginAutoContinueOptions。这两个模块在新切分里已消失，确认它们没有被带到别处即可。
