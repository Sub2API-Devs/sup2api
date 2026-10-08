# Cache TTL 本地组件视觉验收

2026-10-09。使用当前工作区真实 UsageDetail、CacheWriteFacts、UsageTokens、BillingBreakdown 与原 CSS，在独立无用户 profile 的 headless Edge 中实际渲染。**这是本地合成数据组件验收，不是线上管理页面验收。** 没有连接生产、访问登录态/密钥页或调用模型。首次脚本路径计算多回退一级导致 Vite module not found，已修正验收脚本；不是业务故障。

复用 .63 的 Vite + Playwright/Edge 路径：Vite 从项目 node_modules 加载，Playwright 从现有 Codex runtime 加载。fixture alias 仅替换宿主 API、auth 与 accountTypes，不改业务组件。所有 API 写操作拒绝，浏览器路由只允许 127.0.0.1；最终没有额外外域请求。页面顶部明确标注本地合成数据边界。

实际命令（仓库根目录）：

```powershell
node next/docs/ccgateway-feature-support/implementation/evidence/cache-ttl-ui-visual.mjs
```

浏览器和 Vite 在 finally 中关闭。本次仅新增验收脚本、截图、JSON和本文，没有改业务文件或提交/部署。render-result.json 保存当前 git HEAD 与实际渲染的主要源文件 SHA256；未提交代码以文件摘要为准确对应证据。

## 视觉与结构结果

1440×1000 与 390×1000 两个视口，各测三种场景，共六张 full-page 截图，均已用图像工具实际查看。

- partial：主用量 total2595/1h1376/unknown1219；additional total1441/1h222/unknown1219；replacement total1552/1h333/unknown1219。三个观测区独立展示，已报告5m=0与TTL未细分1219可读；不把残差标成实际5m。费用明细使用中性计费桶标签。
- legacy：没有 evidence。原计费桶及原金额保留，明确“没有可用的TTL来源证据”，没有捏造5m观测区。
- one-hour-only：HTTP502且只有1h1647，列表缓存合计显示1647而非空；详情完整细分是5m0/1h1647/unknown0。这里502与已结算是合成输入，组件没有改写状态。

六场景 document.body.scrollWidth 均等于 viewport；逐元素 bounds 检查没有超出左右边界；pageerror 和外域拦截列表均为空。partial 完整页高宽屏1580px、窄屏1983px；legacy分别1000/1049px；only1h分别1024/1247px。390px标签与提示正常换行，数值未遮挡。宽屏左收费卡跟随右侧较长内容拉伸产生留白，是现有布局，没有发现阻断。

## 证据

- [partial 1440px](evidence/cache-ttl-ui-local/partial-1440.png)
- [partial 390px](evidence/cache-ttl-ui-local/partial-390.png)
- [legacy 1440px](evidence/cache-ttl-ui-local/legacy-1440.png)
- [legacy 390px](evidence/cache-ttl-ui-local/legacy-390.png)
- [only1h 1440px](evidence/cache-ttl-ui-local/one-hour-only-1440.png)
- [only1h 390px](evidence/cache-ttl-ui-local/one-hour-only-390.png)
- [源码摘要、尺寸和错误记录](evidence/cache-ttl-ui-local/render-result.json)
- [可复现脚本](evidence/cache-ttl-ui-visual.mjs)

未覆盖：生产完整应用外壳/侧栏、生产CSP/静态资源、真实登录态、线上新增metrics接口读回、暗色主题及其他视口。IAB连接超时不等于平台故障；这些本地截图不替代上述生产验证，也不替代核心用量与账务测试。
