// Package types holds the Worker health answer shared by its server and runtime.
package types

// HealthStatus 健康状态
type HealthStatus struct {
	Status          string   `json:"status"`
	WorkerID        string   `json:"worker_id"`
	CLIVersion      string   `json:"cli_version"`
	Uptime          int64    `json:"uptime"`
	CLIPatch        string   `json:"cli_patch,omitempty"`
	CLISHA256       string   `json:"cli_sha256,omitempty"`
	Capabilities    []string `json:"capabilities,omitempty"`
	MaintenanceOnly bool     `json:"maintenance_only,omitempty"`
}
