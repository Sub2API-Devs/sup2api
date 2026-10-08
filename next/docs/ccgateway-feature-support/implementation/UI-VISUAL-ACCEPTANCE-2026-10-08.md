# 0.1.63特性界面验收

## 证据级别与限制

这是**线上API数据核对 + 精确部署提交的本地组件实际浏览器渲染**，不是线上管理页面的视觉验收。

CUA浏览器清单中Chrome/Edge均返回 `nodeRepl.fetch request failed`，无法取得现有已登录tab；IAB返回 `Browser is not available: iab`。没有绕过原浏览器安全设置、读取浏览器session或要求用户重登。按root授权fallback，在独立临时目录提取部署源码 `b786448a80930802aeaf4130c7987350f39fece6` 的 `next/web`，通过本地Vite及独立无用户profile的headless Edge渲染真实 `RemoteSettings` / `RequestPolicySettings` / `FeatureSupport` / `WorkerCapabilities` 和原CSS。未改这些业务组件。

线上 `/api/v1/system/ccgateway/features` 经已授权管理员只读查询，凭据仅在OVH进程内存使用，未输出或写入本地。确认目录版本 `2026-10-08.7`，37条：36个API特性、1个CC特性。此目录JSON作为本地渲染数据。连接配置为空的合成数据；旧Worker错误使用合成账号999和本地失败fixture，不是对线上账号报错的观察。

所有截图顶部明确标注“本地精确部署 SHA 组件渲染 · 线上目录2026-10-08.7 · 非线上页面截图”。没有真实密钥、账户邮箱或请求payload。临时宿主API mock拒绝写操作，未保存任何全局配置。

## 已核实的呈现

- 子菜单在设置卡片之前单排展示；实际名称为“通用 API 特性”和“CC 特性”，旧“请求与工具”分类已拆开。
- API目录按feature聚合，每页8项，36项共5页；展开F-FALLBACK后，请求body字段与anthropic-beta相邻，局限、状态、Worker能力查询、机制/证据都在同一条目内。没有再出现独立平铺的beta/body冗余大列表。
- CC页包含工具/错误行为、附件默认来源和独立workingDirectory/platform；没有再次出现environment整体重复选择。已知附件的覆盖项为跟随默认/客户端/网关，未知附件单独放行/忽略。
- CC目录里F-SAFEGUARDS将 safeguards、safeguard_results、tool_use_id 与对应beta并列显示；没有关闭安全审查的开关。
- 目录明确注明“代码适配目录，不代表当前账号、模型或Worker已通过运行时验证”。合成旧Worker失败状态明确区分旧版本、权限及连接失败，不展示虚假的支持结论。
- 1440×1000和900×900渲染无JS pageerror；900px下实际body scrollWidth=900，未发现横向溢出。CC默认折叠页面高1232px（约1.37个900px视口），机制主动展开会更长。
- 保存按钮保持底部sticky。完整长页截图中它会覆盖截图中间的原视口底部区域；另补滚到底部的真实视口截图，确认日期和未知附件等字段可正常滚动查看，不将截图拼接表现误报为永久缺字段。

## 截图

以下均为本地组件截图，非生产页面截图：

- [API宽屏](evidence/ui-0.1.63/api-wide.png)
- [回退/信用展开宽屏](evidence/ui-0.1.63/fallback-wide.png)
- [900px窄布局及合成旧Worker提示](evidence/ui-0.1.63/fallback-narrow-old-worker.png)
- [CC宽屏](evidence/ui-0.1.63/cc-wide.png)
- [CC窄布局](evidence/ui-0.1.63/cc-narrow.png)
- [CC safeguards展开](evidence/ui-0.1.63/cc-safeguards-wide.png)
- [CC窄布局滚到底部](evidence/ui-0.1.63/cc-narrow-bottom.png)
- [渲染尺寸与错误计数](evidence/ui-0.1.63/render-result.json)

## 验证与未覆盖

对独立部署源码目录执行 FeatureSupport、RequestPolicySettings、WorkerCapabilities 三个spec：**21测试通过，2.99s**。覆盖API/CC分离、分页过滤、beta/body/机制聚合、旧目录失败、Worker查询显示与只读设置保持等。本地渲染最终pageerror为空；首次harness依赖预扫描误扫原完整app而缺mock导出，调整仅扫描review入口并补宿主导出后通过，这是测试harness问题，未修改生产组件。

本轮未发现需要直接修改前端业务代码的阻断。线上真实浏览器的登录态、完整应用外壳/侧栏、CSP和资源加载表现仍未通过浏览器验证；900px不是手机窄屏验收，也没有暗示所有屏幕宽度都验证过。公开功能可用性由root真实API测试另行记录，不能用这些截图替代模型、Tools、Files或credit端到端成功证据。
