export default {
  title: '用户组',
  description: '每个用户只属于一个用户组。用户组决定他能用哪些私有分组、按什么倍率和价格计费。',
  create: '新建用户组',
  editTitle: '编辑用户组 {name}',
  viewTitle: '用户组 {name}',
  searchPlaceholder: '搜索名称或说明…',
  default: '默认',
  defaultHint: '新用户自动加入这个用户组，它不能删除。',
  defaultName: '默认用户组不能改名。',
  note: '说明',
  publicOnly: '只有公开分组',
  customRates: '{n} 个专属倍率',
  customPrices: '{n} 条专属价',
  deleteTitle: '删除用户组「{name}」',
  deleteConfirm: '{n} 位成员将回到默认用户组，这个用户组的授权、专属倍率和专属价一并删除。此操作无法撤销。',
  created: '已创建，可以继续设置分组与倍率、添加成员。',
  columns: {
    name: '用户组',
    members: '成员数',
    granted: '可用的私有分组',
    custom: '单独设置'
  },
  tabs: {
    basic: '基本信息',
    groups: '分组与倍率',
    members: '成员'
  },
  discount: {
    label: '全场折扣',
    hint: '乘在每个分组的默认倍率上；已设专属倍率的分组不受影响。填 1 表示没有折扣。',
    example: '例如：分组默认 {group} → 实际 {rate}',
    invalid: '请输入大于 0 的数字，最多 4 位小数；没有折扣填 1。'
  },
  groups: {
    hint: '「{name}」在每个分组能不能用、按几倍计费。授权和倍率的改动在点“保存”后生效；模型专属价在各自的弹窗里保存。',
    emptyNew: '保存后再设置分组与倍率。',
    private: '私有'
  },
  prices: {
    title: '「{segment}」在 {group} 的模型专属价',
    hint: '这里定的是标价，实付 = 标价 × 倍率（现为 {rate}）。在这个弹窗里保存，不跟随用户组的“保存”。',
    readonlyHint: '实付 = 标价 × 倍率（现为 {rate}）。'
  },
  members: {
    notice: '添加和移出成员立即生效，不跟随下方的“保存”。',
    emptyNew: '保存后再添加成员。',
    add: '添加成员',
    addHint: '每个用户只属于一个用户组：加入「{segment}」就是把他从原来的用户组移过来。',
    addPlaceholder: '按邮箱或昵称搜索要加入的用户',
    search: '搜索成员',
    inUsers: '在用户列表中查看',
    empty: '这个用户组还没有成员',
    already: '{name} 已经在这个用户组里',
    dropPersonal: '{name} 现在是个人专属。加入「{segment}」后，他的个人专属设置（授权、专属倍率、专属价）会被删除，之后按「{segment}」计费。',
    dropPersonalConfirm: '加入并删除个人专属设置',
    movedFrom: '已把 {name} 从「{from}」移到「{to}」',
    remove: '移出',
    removeConfirm: '把 {name} 移出「{segment}」？他会回到「{to}」，之后按「{to}」计费。',
    movedTo: '已把 {name} 移到「{to}」',
    defaultHint: '默认用户组的成员不能直接移出：到目标用户组里添加他即可。'
  },
  personal: {
    summary: '个人专属 · {n} 位用户',
    summaryHint: '被单独定价的用户，各自是一个只有自己的用户组。',
    title: '个人专属',
    description: '被单独定价的用户。每人是一个只有自己的用户组，由系统自动建立，不用起名。',
    pick: '指定用户单独定价',
    pickHint: '选中的用户会离开原来的用户组，成为个人专属；已经是个人专属的直接打开他的设置。',
    origin: '来自',
    empty: '还没有个人专属的用户',
    edit: '分组与定价',
    remove: '移回用户组',
    notice: '以下设置只对他一人生效。',
    noticeOrigin: '以下设置只对他一人生效。他原来在「{origin}」，之后「{origin}」的改动不再影响他。'
  }
}
