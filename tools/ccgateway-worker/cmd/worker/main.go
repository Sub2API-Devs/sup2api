package main

import (
	"context"
	"fmt"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/yourusername/ccgateway-worker/internal/config"
	"github.com/yourusername/ccgateway-worker/internal/server"
	"github.com/yourusername/ccgateway-worker/internal/worker"
)

func main() {
	// 加载配置
	cfg, err := config.Load()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to load config: %v\n", err)
		os.Exit(1)
	}

	// 创建 Worker
	w, err := worker.New(cfg)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to create worker: %v\n", err)
		os.Exit(1)
	}
	defer w.Close()

	// 创建 HTTP Server
	srv := server.New(w, cfg.Port)

	// 启动服务器
	go func() {
		fmt.Printf("Worker %s starting on port %d\n", cfg.WorkerID, cfg.Port)
		fmt.Printf("CLI version: %s\n", cfg.CLIVersion)
		fmt.Printf("History dir: %s\n", cfg.HistoryDir)
		if err := srv.Run(); err != nil {
			fmt.Fprintf(os.Stderr, "Server error: %v\n", err)
			os.Exit(1)
		}
	}()

	// 等待信号
	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
	<-sigCh

	// 优雅关闭
	fmt.Println("\nShutting down gracefully...")
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		fmt.Fprintf(os.Stderr, "Shutdown error: %v\n", err)
		os.Exit(1)
	}

	fmt.Println("Server stopped")
}
