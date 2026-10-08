# Core .78 生产 UI 复验

部署稳定后，句柄16315运行精确提交内增强生产runner，复用usage744与clientRID `cache-ttl-77-039d57ff045f4f73`，expected_core_version=0.1.78。真实服务器页面通过SSH loopback45478→3130，无mock。没有新增模型调用或更改用量记录。

正常管理login只在远端进程内存，access token由受控SSH stdout进入本地Python内存，再经Node stdin匿名管道；不进文件/env/argv/工具输出。新Edge非persistent context，实际/me、version、精确usage接口均200、唯一记录匹配。只允许GET，四个无关受限路径被阻断；没有401续期或写配置。runner exit0/completed=true/pageErrors0；finally关闭context/browser与SSH隧道。

证据目录 `evidence/cache-ttl-ui-production-0.1.78/`，7张截图和安全render-result.json。余额/身份文本已mask，保留此前 .77 失败布局截图作对比。

- 1440详情在横向表格左右端（scrollLeft0和110）均保持detailLeft274/detailRight1406，位于可见容器273..1407内；内部contentOverflow=false。
- 390详情范围33..357，位于390 viewport内，无内容溢出。
- Features1440/390初始与滚动底部四状态均footerPosition=static，footerTop等于previousBottom；保存栏不再覆盖前方内容。
- 七次bounds.pass全部true；实际查看usage-1440-right与features-390-bottom截图确认原右缘裁切及保存栏遮挡已修。自动化覆盖所有七状态，人工没有声称逐项点击所有功能。

原真实缓存证据仍2595总量、reported5m0、1h1376、未分桶1219/partial；收费展示独立保留默认计费桶，并明确不把未分桶推断为5m。此次复验没有产生新账单或修改账务。
