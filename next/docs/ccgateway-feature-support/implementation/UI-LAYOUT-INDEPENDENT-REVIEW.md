# 展开表格与保存栏独立复核

2026-10-09，仅本地候选。业务diff仅STable可选fitExpandedToContainer、UsageTable启用、RemoteSettings移除sticky保存栏。没有新增配置字段、网络写入逻辑、后端或Worker变更。

新增独立 `STableExpand.independent.spec.ts`：默认未传属性时不启用query container/额外wrapper，expand slot仍直接在td；opt-in只包展开内容，原row身份/行数和collapse行为保持；运行时撤销opt-in仍保留已展开slot。最初独立fixture忘装i18n造成2个测试初始化失败，补实际i18n后通过，不作为业务RED。

`npm test -- src/views/usage src/views/ccgateway` 18files/98tests PASS2.62s；`npm run typecheck` PASS。

独立复跑作者真实组件布局脚本，仅将输出目录改为`evidence/ui-layout-independent-after`，使用实际UsageTable/UsageDetail/RemoteSettings/STable和CSS；认证/API数据为明确本地synthetic，不冒充生产。原实验不是只查body宽度：实际读取detail与closest scrollport rect、scrollLeft，以及内部section/dt/dd边界。1440横滚0/110时detail274..1406均在273..1407内；900横滚0/650时detail274..866均在273..867内；390详情33..357无内部溢出。三宽度保存栏position static，初始/滚底footerTop等于previousBottom，无覆盖。所有pageErrors为空。

实际查看独立`usage-900-right.png`与`features-390-bottom.png`：展开详情内容完整、最右横滚仍位于可视区，分页及保存按钮分开显示。保留截图与render-result.json；临时同内容脚本副本已移除，避免重复维护两个实验runner。

实现为共享组件opt-in，未影响其它STable默认DOM，也没有为usage复制表格实现。新增一层可选wrapper和固定CSS，未增加业务嵌套。未发现发布阻断。该证据不代替发布后的真实应用视觉复验，未发模型或访问PG/生产账户。
