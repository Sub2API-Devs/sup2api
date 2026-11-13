// The step-up verification dialog (CONTRACTS §80.2). scope keys are the
// server's scopes with "." written as "_".
export default {
  title: '验证身份',
  intro: '“{action}”是敏感操作，请先验证是你本人。',
  passwordToo: '这项操作还需要你的登录密码。',
  method: {
    passkey: '通行密钥',
    totp: '验证码',
    password: '登录密码'
  },
  methodLabel: '验证方式',
  password: '登录密码',
  code: '验证码',
  passkeyHint: '点击“验证”后，按浏览器提示使用你的通行密钥。',
  submit: '验证',
  none: '没有可用的验证方式。',
  passkeyUnsupported: '你只设置了通行密钥，但当前浏览器或网址不能使用它（需要 HTTPS 域名）。请换一个浏览器，或先开启两步验证。',
  scope: {
    credential_reveal: '查看账号凭证',
    apikey_reveal: '查看 API 密钥',
    proxy_reveal: '查看代理地址',
    superadmin_transfer: '移交超级管理员',
    self_password_change: '修改登录密码',
    self_email_change: '修改邮箱',
    self_2fa_enable: '开启两步验证',
    self_2fa_disable: '关闭两步验证',
    self_2fa_backup_codes: '重新生成备用码',
    self_passkey_add: '添加通行密钥',
    self_passkey_delete: '删除通行密钥',
    user_password_reset: '重置用户密码',
    user_security_reset: '清除用户的安全设置',
    user_delete: '删除用户',
    plugin_install: '安装插件',
    plugin_grant: '授予插件权限',
    publisher_manage: '管理发布者',
    system_update: '核心升级',
    host_install: '安装或连接远程主机',
    superadmin_identity: '修改超级管理员账号'
  }
}
