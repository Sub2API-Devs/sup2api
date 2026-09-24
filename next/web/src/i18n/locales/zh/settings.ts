export default {
  title: '系统设置',
  description: '全局的计费与调度设置。',
  tabs: {
    billing: '计费',
    sticky: '粘性会话'
  },
  billing: {
    title: '计费',
    missingPolicy: '模型没有配置价格时',
    policy: {
      reject: '拒绝请求',
      free: '免费放行'
    },
    policyHint: {
      reject: '返回 403 model_price_not_configured。推荐：没有价格的模型不对外提供。',
      free: '照常转发，使用记录的结算状态为"免费"。'
    },
    minBalance: '最低余额',
    minBalanceHint: '余额不高于该值时，请求返回 402 余额不足（默认 0）。',
    bigCost: '高额费用警告阈值',
    bigCostHint: '保存价格时，若 100 万输入 token 的费用超过该值，需要二次确认。',
    decimalInvalid: '请输入数字，最多 8 位小数'
  }
}
