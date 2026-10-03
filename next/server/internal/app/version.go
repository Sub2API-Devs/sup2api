package app

import (
	"github.com/Sub2API-Devs/sup2api/next/server/internal/httpapi"
	"github.com/gin-gonic/gin"
)

// Identity comes from the serving process, never forwarding/request headers.
// The public gateway separately stamps its ingress identity on the response.
func systemVersionHandler(version string, managed bool, node, boot string) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("Cache-Control", "no-store")
		httpapi.OK(c, gin.H{"version": version, "managed": managed, "core_node_id": node, "core_boot_id": boot})
	}
}
