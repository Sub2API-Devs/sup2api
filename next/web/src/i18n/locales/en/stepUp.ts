// The step-up verification dialog (CONTRACTS §80.2). scope keys are the
// server's scopes with "." written as "_".
export default {
  title: 'Verify it’s you',
  intro: '“{action}” is a sensitive operation. Verify it’s you first.',
  passwordToo: 'This operation also needs your sign-in password.',
  method: {
    passkey: 'Passkey',
    totp: 'Code',
    password: 'Password'
  },
  methodLabel: 'Verify with',
  password: 'Sign-in password',
  code: 'Verification code',
  passkeyHint: 'Select “Verify” and follow your browser to use your passkey.',
  submit: 'Verify',
  none: 'No way to verify is available.',
  passkeyUnsupported: 'You only have passkeys, and this browser or address cannot use them (it needs an HTTPS domain). Try another browser, or turn on two-factor authentication first.',
  scope: {
    credential_reveal: 'View account credentials',
    apikey_reveal: 'View API key',
    proxy_reveal: 'View proxy address',
    superadmin_transfer: 'Transfer super admin',
    self_password_change: 'Change password',
    self_email_change: 'Change email',
    self_2fa_enable: 'Turn on two-factor authentication',
    self_2fa_disable: 'Turn off two-factor authentication',
    self_2fa_backup_codes: 'Regenerate backup codes',
    self_passkey_add: 'Add a passkey',
    self_passkey_delete: 'Remove a passkey',
    user_password_reset: 'Reset a user’s password',
    user_security_reset: 'Clear a user’s security settings',
    user_delete: 'Delete user',
    plugin_install: 'Install plugin',
    plugin_grant: 'Grant plugin permissions',
    publisher_manage: 'Manage publishers',
    system_update: 'Core upgrade',
    host_install: 'Install or connect a remote host',
    superadmin_identity: 'Change the super admin account'
  }
}
