export default {
  title: '核心升级', description: '先停止从节点，更新主节点，再逐个恢复从节点。',
  maintenanceWindow: '主节点更新期间整个集群将暂时不可用。主节点就绪后恢复服务，从节点完成更新和插件同步后再恢复本地服务。',
  sequence: '先将所有从节点转发到主节点并停止其核心，再停止并更新主节点；主节点就绪后异步更新从节点。',
  recovery: '修复原因后可继续当前任务。涉及数据库或协议变更时不允许直接恢复旧版本；需要修复迁移或按备份恢复。',
  manageNode: '节点管理', disableNode: '停用节点', enableNode: '允许节点重新加入', disabled: '已停用', stopped: '核心已停止',
  nodes: '集群状态', node: '节点', version: '核心版本', mode: '流量模式', ready: '就绪', lastSeen: '最近上报', reason: '原因', primary: '升级主节点',
  serving: '已就绪', waiting: '未就绪', stale: '连接暂时中断，以下为上次读取的状态。恢复连接后将继续刷新。', unavailable: '无法连接升级服务。请确认节点以外壳托管模式运行，并配置了升级控制接口。',
  newPlan: '创建升级任务', independentPlugins: '核心计划结束后自动升级包内已启用的内置插件。各节点独立切换；已停用或手动安装的更新版本会保留。', target: '目标版本', choose: '选择已验证的发布版本',
  noReleases: '尚无发布版本。请先通过受信发布源导入签名发布包。', activePlan: '集群已有未完成的升级，请先处理当前任务。', preflight: '检查升级条件', start: '开始升级', order: '升级顺序', preflightOK: '当前升级条件通过。开始时会再次检查集群状态。',
  history: '升级任务', noPlans: '暂无升级任务。', status: '状态', step: '步骤', pause: '暂停', resume: '继续', rollback: '恢复到升级前版本', cancel: '取消未执行任务',
  states: { running: '进行中', paused: '已暂停', failed: '失败', completed: '已完成', cancelled: '已取消', superseded: '已由恢复任务接替', pending: '等待执行', done: '已完成' },
  actions: { prepare: '下载并验证发布包', redirect: '转发到主节点', stop: '排空并停止核心', maintenance: '进入集群维护窗口', 'start-primary': '更新主节点并迁移数据库', start: '启动从节点目标核心', admit: '检查插件与服务准入', local: '恢复本地服务' },
  modes: { local: '本地服务', 'local-serving': '本地服务', forward: '转发到其他节点', 'forward-only': '转发到其他节点', candidate: '候选版本', maintenance: '维护', stopped: '已停止' }
}
