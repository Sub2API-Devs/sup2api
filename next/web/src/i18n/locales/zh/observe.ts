export default {
  topology: '节点拓扑', gateway: '网关', core: '核心', plugins: '插件',
  forwarding: '转发至主节点', offload: 'CPU 转移候选', legend: '实线：转发至主节点；虚线：按当前心跳与 CPU 阈值推算的可接收节点，不代表实际请求路径。',
  partial: '网关信息不可用，展示核心与插件。', unavailable: '暂时无法读取数据，保留上次快照。', empty: '暂无节点',
  fallback: '仍以旧版本服务', standby: '准备版本', instances: '实例', restarts: '重启次数',
  noReport: '当前核心尚无插件报告', unknown: '未知', running: '运行', stopped: '停止',
  progress: '总进度', lanes: '节点步骤', reconnect: '升级期间连接暂时中断，正在自动重连；保留上次进度。',
  related: '计划创建后的插件发布', relatedHint: '按时间列出，可能包含管理员手动发布；每个插件独立推进。',
  history: '发布历史', timeline: '节点与发布事件', cluster: '集群', noHistory: '暂无历史记录',
  previous: '上一页', next: '下一页', allEvents: '全部事件', latest: '最新发布', page: '第 {page} 页，共 {total} 条',
  audit: '审计日志', auditHint: '管理员操作与系统自动变更。', time: '时间', action: '操作', actor: '操作者', target: '对象', detail: '详情', system: '系统', filter: '操作名（精确匹配）', search: '查询',
  offloading: '转移中', notOffloading: '未转移', offloadState: 'CPU 转移', local: '本地处理', seconds: '{n} 秒', unknownDuration: '暂无完整计时', boot: '启动标识',
}
