package bootstrap

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/Sub2API-Devs/sup2api/ai-gateway/internal/config"
)

// CaddyConfig emits Caddy's native JSON configuration. Keeping generation in
// one place makes route order and the authority boundary reviewable.
func CaddyConfig(cfg config.Config) ([]byte, error) {
	persist := false
	leaseRenewInterval := cfg.LeaseRenewInterval
	if leaseRenewInterval <= 0 {
		leaseRenewInterval = 30 * time.Second
	}
	document := map[string]any{
		"admin": map[string]any{
			"disabled": true,
			"config":   map[string]any{"persist": persist},
		},
		"apps": map[string]any{
			"sup2api": map[string]any{
				"node_id":                  cfg.NodeID,
				"control_plane_target":     cfg.ControlPlaneTarget,
				"control_plane_insecure":   cfg.ControlPlaneInsecure,
				"startup_required":         cfg.StartupRequired,
				"dial_timeout":             cfg.DialTimeout.String(),
				"request_timeout":          cfg.RequestTimeout.String(),
				"settlement_wal_path":      cfg.SettlementWALPath,
				"settlement_wal_max_bytes": cfg.SettlementWALMaxBytes,
				"auth_cache_ttl":           cfg.AuthCacheTTL.String(),
				"auth_cache_size":          cfg.AuthCacheSize,
				"tls_ca_file":              cfg.TLSCAFile,
				"tls_cert_file":            cfg.TLSCertFile,
				"tls_key_file":             cfg.TLSKeyFile,
				"tls_server_name":          cfg.TLSServerName,
				"worker_id":                cfg.WorkerID,
				"worker_instance_id":       cfg.WorkerInstanceID,
				"worker_management_key":    cfg.WorkerManagementKey,
				"worker_vault_path":        cfg.WorkerVaultPath,
				"worker_vault_key":         cfg.WorkerVaultKey,
				"worker_version":           cfg.WorkerVersion,
			},
			"http": map[string]any{
				"grace_period": cfg.GracePeriod.String(),
				"servers": map[string]any{
					"ai": map[string]any{
						"listen":              []string{cfg.ListenAddress},
						"max_header_bytes":    64 * 1024,
						"read_header_timeout": "10s",
						"idle_timeout":        "2m",
						"routes": append(workerManagementRoutes(cfg), []any{
							map[string]any{
								"match": []any{map[string]any{"path": []string{"/healthz"}}},
								"handle": []any{map[string]any{
									"handler":     "static_response",
									"status_code": 200,
									"headers":     map[string][]string{"Content-Type": {"application/json"}},
									"body":        `{"status":"ok"}`,
								}},
								"terminal": true,
							},
							map[string]any{
								"match":    []any{map[string]any{"path": []string{"/readyz"}}},
								"handle":   []any{map[string]any{"handler": "sup2api_readiness"}},
								"terminal": true,
							},
							map[string]any{
								"match": []any{map[string]any{
									"method": []string{"GET"},
									"path":   []string{"/v1/responses", "/responses", "/openai/v1/responses", "/backend-api/codex/responses"},
									"header": map[string][]string{"Upgrade": {"websocket"}},
								}},
								"handle": []any{
									map[string]any{"handler": "sup2api_request_id"},
									map[string]any{"handler": "sup2api_auth"},
									map[string]any{
										"handler": "sup2api_responses_websocket", "renew_interval": leaseRenewInterval.String(),
										"transports": map[string]any{
											"standard":    map[string]any{"response_header_timeout": "10m"},
											"proxy":       map[string]any{"response_header_timeout": "10m", "max_profiles": 1024},
											"fingerprint": map[string]any{"response_header_timeout": "10m", "max_profiles": 1024},
										},
										"protocols": map[string]any{
											"antigravity": map[string]any{}, "anthropic_oauth": map[string]any{},
											"anthropic_upstream": map[string]any{}, "bedrock": map[string]any{},
											"grok": map[string]any{}, "gemini_oauth": map[string]any{},
											"openai_codex": map[string]any{}, "passthrough": map[string]any{},
											"vertex_anthropic": map[string]any{},
										},
									},
								},
								"terminal": true,
							},
							map[string]any{
								"match": []any{map[string]any{"path": aiDataPlanePaths()}},
								"handle": []any{
									map[string]any{"handler": "sup2api_request_id"},
									map[string]any{"handler": "sup2api_auth"},
									map[string]any{"handler": "sup2api_admission"},
									map[string]any{"handler": "sup2api_lease", "renew_interval": leaseRenewInterval.String()},
									map[string]any{"handler": "sup2api_settlement"},
									map[string]any{
										"handler": "sup2api_gateway",
										"transports": map[string]any{
											"standard":    map[string]any{"response_header_timeout": "10m"},
											"proxy":       map[string]any{"response_header_timeout": "10m", "max_profiles": 1024},
											"fingerprint": map[string]any{"response_header_timeout": "10m", "max_profiles": 1024},
										},
										"protocols": map[string]any{
											"antigravity":        map[string]any{},
											"anthropic_oauth":    map[string]any{},
											"anthropic_upstream": map[string]any{},
											"bedrock":            map[string]any{},
											"grok":               map[string]any{},
											"gemini_oauth":       map[string]any{},
											"openai_codex":       map[string]any{},
											"passthrough":        map[string]any{},
											"vertex_anthropic":   map[string]any{},
										},
									},
								},
								"terminal": true,
							},
							map[string]any{
								"handle": []any{map[string]any{
									"handler":     "static_response",
									"status_code": 404,
									"headers": map[string][]string{
										"Content-Type": {"application/json"},
									},
									"body": `{"error":{"type":"not_found","message":"Route is not served by the AI data plane"}}`,
								}},
							},
						}...),
					},
				},
			},
		},
	}

	encoded, err := json.Marshal(document)
	if err != nil {
		return nil, fmt.Errorf("marshal Caddy config: %w", err)
	}
	return encoded, nil
}

func workerManagementRoutes(cfg config.Config) []any {
	if cfg.WorkerManagementKey == "" {
		return nil
	}
	return []any{map[string]any{
		"match":    []any{map[string]any{"path": []string{"/worker/v1/*"}}},
		"handle":   []any{map[string]any{"handler": "sup2api_worker_management"}},
		"terminal": true,
	}}
}

func aiDataPlanePaths() []string {
	return []string{
		"/v1/messages",
		"/v1/chat/completions",
		"/chat/completions",
		"/v1/responses",
		"/v1/responses/*",
		"/responses",
		"/responses/*",
		"/v1/embeddings",
		"/embeddings",
		"/v1beta/models/*",
		"/backend-api/codex/*",
	}
}
