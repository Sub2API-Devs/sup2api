export default {
  title: 'Publishers',
  description: 'Plugin publishers and their ed25519 signing keys. Plugin packages are verified against these keys.',
  create: 'New publisher',
  trustLevel: 'Trust level',
  trust_: {
    official: 'Official',
    verified: 'Verified',
    community: 'Community'
  },
  trustHint_: {
    official: 'Official publisher anchored in the built-in root key: may request every permission and ship native UI.',
    verified: 'Confirmed by an administrator: may request every permission (critical ones still confirmed one by one) and ship native UI.',
    community: 'Registered but not verified: cannot request critical permissions or ship native UI.'
  },
  keys: 'Active keys',
  signingKeys: 'Signing keys',
  keysUnavailable: 'Keys are not included in the publisher list.',
  noKeys: 'No signing keys yet.',
  addKey: 'Add key',
  addKeyTitle: 'Add signing key to {name}',
  keyId: 'Key ID',
  keyIdHint: 'Identifier referenced by plugin signatures; must be unique.',
  publicKey: 'Public key',
  publicKeyHint: 'Base64-encoded ed25519 public key (32 bytes).',
  publicKeyInvalid: 'Not a valid base64 ed25519 public key (32 bytes)',
  notBefore: 'Valid from',
  notAfter: 'Valid until',
  rangeInvalid: 'Must be later than "Valid from"',
  keyAdded: 'Key added',
  expired: 'Expired',
  notYetValid: 'Not yet valid',
  revoke: 'Revoke',
  revokeKey: 'Revoke key',
  revoked: 'Revoked',
  confirmRevoke: 'Revoke publisher "{name}"? All of its keys become invalid and plugins signed by it are marked as revoked (disabled by default).',
  confirmRevokeKey: 'Revoke key "{key}" of {name}? Plugins signed with it are marked as revoked (disabled by default).'
}
