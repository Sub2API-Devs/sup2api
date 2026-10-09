export type FeatureStatus = 'supported' | 'partial' | 'unsupported' | 'unverified'
export interface GatewayFeature {
  id: string
  title: string
  category: string
  scope: 'api' | 'cc'
  status: FeatureStatus
  body_paths: string[]
  beta_headers: string[]
  mechanisms: string[]
  reason: string
  requirements?: string[]
  evidence?: string[]
}
export interface FeatureCatalog {
  catalog_version: string
  policy_schema_version: number
  runtime_verified: false
  features: GatewayFeature[]
}

// An old core or unrelated response must never render as a verified capability list.
export function isFeatureCatalog(value: unknown): value is FeatureCatalog {
  if (!value || typeof value !== 'object') return false
  const data = value as Partial<FeatureCatalog>
  const strings = (items: unknown): items is string[] => Array.isArray(items) && items.every(item => typeof item === 'string')
  return typeof data.catalog_version === 'string' && Number.isInteger(data.policy_schema_version) && data.runtime_verified === false &&
    Array.isArray(data.features) && data.features.every(feature => feature &&
      typeof feature.id === 'string' && typeof feature.title === 'string' && typeof feature.category === 'string' &&
      ['api', 'cc'].includes(feature.scope) && ['supported', 'partial', 'unsupported', 'unverified'].includes(feature.status) &&
      strings(feature.body_paths) && strings(feature.beta_headers) && strings(feature.mechanisms) && typeof feature.reason === 'string' &&
      (feature.requirements === undefined || strings(feature.requirements)) && (feature.evidence === undefined || strings(feature.evidence)))
}
