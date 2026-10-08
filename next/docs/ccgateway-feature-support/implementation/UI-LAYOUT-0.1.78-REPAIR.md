# 宽表详情与特性保存栏布局修复

2026-10-09。先实际查看 Core.77 生产截图 `cache-ttl-ui-production/usage-1440.png` 与 `features-390.png`。确认两个可见问题：用量展开详情继承宽表宽度，右侧请求卡超出内部滚动容器；底部 sticky 保存栏在初始视口覆盖特性分页和末项。body.scrollWidth 正常不能排除这些内部问题。

## 改动范围

仅三个 host UI 文件：

- `next/web/packages/ui/src/STable.vue`：新增可选 `fitExpandedToContainer`。启用时展开内容以 inline query container 的实际可视宽度布局（100cqw），并 sticky left:0；表本身继续横向滚动。未启用时沿用原展开slot布局。
- `next/web/src/views/usage/UsageTable.vue`：为用量表启用该选项。移动卡片分支保持原样。
- `next/web/src/views/ccgateway/RemoteSettings.vue`：保存栏回归正常文档流，位于表单内容之后，避免覆盖最后几项。配置对象、保存参数、事件和权限不变。

这些文件都属于核心控制台/共享host UI，不在CCGateway插件封装目录。本次未改插件manifest、worker或后端；不要求覆盖不可变Plugin.14。实际发布构建仍需root核验插件包哈希，不能以源码范围替代二进制一致性校验。

## 浏览器 RED → GREEN

新增 `evidence/ui-layout-scroll-review.mjs`。使用当前真实STable、UsageTable/UsageDetail、RemoteSettings及原CSS；合成240px侧栏和顶部过滤区域、无秘密usage/catalog/config数据。本地独立Edge profile，只有loopback请求，没有连接生产或改动真实配置。

实际命令：

```powershell
node next/docs/ccgateway-feature-support/implementation/evidence/ui-layout-scroll-review.mjs before
# 修改三处UI后：
node next/docs/ccgateway-feature-support/implementation/evidence/ui-layout-scroll-review.mjs after
```

before记录：1440px下详情right=1516，而scrollport right=1407；滚到最右后详情left=164，小于scrollport left=273。900px也复现。保存栏initial top=935，前一内容bottom=1013/1029/1037（1440/900/390），实际重叠。不是单看body宽度推论。

after记录：

- 1440px，scrollport273..1407，详情274..1406；横向滚动到右侧后详情边界不变。
- 900px，scrollport273..867，详情274..866；左右滚动均完整可见。
- 390px移动卡片详情33..357，无内部内容溢出。
- 三宽度保存栏均static，initial与滚到底部时 `footerTop == previousBottom`，没有遮挡。
- 所有14项布局/错误检查PASS；pageerror为空。已实际查看修后宽表1440、900右滚及390特性初始/底部截图；文字、TTL事实和分页末项可读。

证据目录 [before](evidence/ui-layout-before/render-result.json)、[after](evidence/ui-layout-after/render-result.json)。对应PNG记录左右横滚与初始/滚底状态。新增 after 脚本断言失败会exit1，包含详情在scrollport内的左右边界和后代section/dt/dd边界；不只检测body.scrollWidth。

## 验证与边界

工作目录 `next/web`：

- `npm test -- src/views/usage src/views/ccgateway`：17 files / 96 tests PASS，3.27s。
- `npm run build`：vue-tsc与Vite PASS，1060 modules，构建6.55s。该命令产生的tracked `next/server/web/dist/index.html`仅为本地构建输出，已恢复，业务冻结仍是上述三处。
- `git diff --check`：PASS。

当前CSS实现使用现代浏览器container query units，已在本机实际Edge验证。此处是含真实组件和内部横滚的本地布局验收，不是新版本生产复测。生产.77原截图保留为缺陷证据；新核心上线后仍需用真实只GET runner核验展开详情内部bounds和保存栏遮挡，不能重用旧截图宣布通过。已通知CC独立审查，不提交、不部署。

增强 `cache-ttl-production-ui.mjs`：使用nearest table scrollport检查展开详情及内部section/dt/dd，桌面拍left/right两个横滚位置；features拍initial和滚底，检测保存栏与前一内容是否重叠。新输出按expected_core_version分目录，不覆盖.77红例；失败bounds记录后exit1。保留session、双RID唯一性、401即时关闭与隐私遮罩原边界。只做node --check通过，未启动生产；root将复用usage744，不发新模型请求。
