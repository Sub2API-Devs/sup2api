package ccgateway

import (
	"context"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/httpapi"
	"github.com/gin-gonic/gin"
)

// controllerStatusGet 处理 GET /system/ccgateway/controller-status
// 检查控制面板连接状态
func (s *Service) controllerStatusGet(c *gin.Context) {
	c.Header("Cache-Control", "no-store")
	ctx, cancel := context.WithTimeout(c.Request.Context(), 30*time.Second)
	defer cancel()

	cfg, err := s.Load(ctx)
	if err != nil {
		httpapi.OK(c, ControllerStatus{
			Connected: false,
			Healthy:   false,
			Error:     "configuration unavailable",
		})
		return
	}

	status := CheckControllerConnection(ctx, cfg)
	httpapi.OK(c, status)
}
