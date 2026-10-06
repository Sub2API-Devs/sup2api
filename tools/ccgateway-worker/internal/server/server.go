package server

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/yourusername/ccgateway-worker/internal/worker"
	"github.com/yourusername/ccgateway-worker/pkg/types"
)

// Server HTTP 服务器
type Server struct {
	worker worker.Worker
	port   int
	engine *gin.Engine
	srv    *http.Server
}

// New 创建新的 Server
func New(w worker.Worker, port int) *Server {
	gin.SetMode(gin.ReleaseMode)

	s := &Server{
		worker: w,
		port:   port,
		engine: gin.New(),
	}

	// 中间件
	s.engine.Use(gin.Recovery())
	s.engine.Use(s.loggerMiddleware())

	// 路由
	s.setupRoutes()

	return s
}

// setupRoutes 配置路由
func (s *Server) setupRoutes() {
	s.engine.POST("/v1/messages", s.handleMessages)
	s.engine.GET("/health", s.handleHealth)
}

// handleMessages 处理 /v1/messages 请求
func (s *Server) handleMessages(c *gin.Context) {
	ctx := c.Request.Context()

	// 解析请求
	var req types.Request
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// 提取头部
	req.SessionID = c.GetHeader("X-CCGateway-Session-ID")
	req.RequestPolicy = c.GetHeader("X-CCGateway-Request-Policy")
	req.NativeTools = c.GetHeader("X-CCGateway-Native-Tools")

	// 执行请求
	resp, err := s.worker.Execute(ctx, &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// 流式响应
	s.streamResponse(c, resp)
}

// streamResponse 流式响应
func (s *Server) streamResponse(c *gin.Context, resp *types.Response) {
	c.Writer.Header().Set("Content-Type", "text/event-stream")
	c.Writer.Header().Set("Cache-Control", "no-cache")
	c.Writer.Header().Set("Connection", "keep-alive")
	c.Writer.Header().Set("X-Accel-Buffering", "no")

	flusher, ok := c.Writer.(http.Flusher)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "streaming not supported"})
		return
	}

	for {
		select {
		case event, ok := <-resp.Body:
			if !ok {
				return
			}

			// 写入 SSE 事件
			fmt.Fprintf(c.Writer, "event: %s\ndata: %s\n\n", event.Type, event.Data)
			flusher.Flush()

		case err := <-resp.Err:
			if err != nil {
				// 写入错误事件
				errData, _ := json.Marshal(map[string]string{"error": err.Error()})
				fmt.Fprintf(c.Writer, "event: error\ndata: %s\n\n", errData)
				flusher.Flush()
			}
			return

		case <-c.Request.Context().Done():
			return
		}
	}
}

// handleHealth 处理健康检查
func (s *Server) handleHealth(c *gin.Context) {
	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	status, err := s.worker.Health(ctx)
	if err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"status": "unhealthy",
			"error":  err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, status)
}

// loggerMiddleware 日志中间件
func (s *Server) loggerMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		path := c.Request.URL.Path

		c.Next()

		latency := time.Since(start)
		statusCode := c.Writer.Status()

		// 简单日志
		if statusCode >= 400 {
			fmt.Printf("[ERROR] %s %s %d %v\n", c.Request.Method, path, statusCode, latency)
		} else {
			fmt.Printf("[INFO] %s %s %d %v\n", c.Request.Method, path, statusCode, latency)
		}
	}
}

// Run 启动服务器
func (s *Server) Run() error {
	s.srv = &http.Server{
		Addr:         fmt.Sprintf(":%d", s.port),
		Handler:      s.engine,
		ReadTimeout:  30 * time.Second,
		WriteTimeout: 15 * time.Minute, // 长超时支持流式响应
	}

	fmt.Printf("Worker server starting on port %d\n", s.port)
	return s.srv.ListenAndServe()
}

// Shutdown 优雅关闭
func (s *Server) Shutdown(ctx context.Context) error {
	if s.srv != nil {
		return s.srv.Shutdown(ctx)
	}
	return nil
}
