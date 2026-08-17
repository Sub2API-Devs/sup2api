// Package antigravityprotocol contains the pure request and response protocol
// conversion shared semantically with backend/internal/pkg/antigravity. It has
// no database, credential refresh, HTTP client, or control-plane dependency.
// Keeping the data-plane copy in its own module prevents Caddy dependencies
// from entering the backend module; parity tests guard the public behavior.
package antigravityprotocol
