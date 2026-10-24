// Package features defines the data-only feature contract shared by the host
// and its Worker. Catalog entries describe code, never deployment or account
// entitlement. Runtime evidence must be reported separately.
package features

// Feature and Document are the catalog's wire shapes. The catalog values are
// produced by RequestCatalog / RequestRuntimeCatalog; there is no source
// catalog of entries in this package.

// PolicySchemaVersion is the request policy schema this build writes and reads.
const PolicySchemaVersion = 1

type Feature struct {
	ID           string   `json:"id"`
	Title        string   `json:"title"`
	Category     string   `json:"category"`
	Scope        string   `json:"scope"`
	Status       string   `json:"status"`
	BodyPaths    []string `json:"body_paths"`
	BetaHeaders  []string `json:"beta_headers"`
	Mechanisms   []string `json:"mechanisms"`
	Reason       string   `json:"reason"`
	Requirements []string `json:"requirements,omitempty"`
}

type Document struct {
	CatalogVersion      string    `json:"catalog_version"`
	PolicySchemaVersion int       `json:"policy_schema_version"`
	RuntimeVerified     bool      `json:"runtime_verified"`
	Features            []Feature `json:"features"`
}
