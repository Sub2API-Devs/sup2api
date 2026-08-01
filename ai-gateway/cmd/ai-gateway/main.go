package main

import (
	"errors"
	"fmt"
	"log"
	"os"
	"os/signal"
	"syscall"

	"github.com/Sub2API-Devs/sup2api/ai-gateway/internal/bootstrap"
	"github.com/Sub2API-Devs/sup2api/ai-gateway/internal/config"
	"github.com/caddyserver/caddy/v2"

	_ "github.com/Sub2API-Devs/sup2api/ai-gateway/internal/caddymodules/admission"
	_ "github.com/Sub2API-Devs/sup2api/ai-gateway/internal/caddymodules/auth"
	_ "github.com/Sub2API-Devs/sup2api/ai-gateway/internal/caddymodules/gateway"
	_ "github.com/Sub2API-Devs/sup2api/ai-gateway/internal/caddymodules/lease"
	_ "github.com/Sub2API-Devs/sup2api/ai-gateway/internal/caddymodules/protocols/anthropicoauth"
	_ "github.com/Sub2API-Devs/sup2api/ai-gateway/internal/caddymodules/protocols/anthropicupstream"
	_ "github.com/Sub2API-Devs/sup2api/ai-gateway/internal/caddymodules/protocols/antigravity"
	_ "github.com/Sub2API-Devs/sup2api/ai-gateway/internal/caddymodules/protocols/bedrock"
	_ "github.com/Sub2API-Devs/sup2api/ai-gateway/internal/caddymodules/protocols/geminioauth"
	_ "github.com/Sub2API-Devs/sup2api/ai-gateway/internal/caddymodules/protocols/grok"
	_ "github.com/Sub2API-Devs/sup2api/ai-gateway/internal/caddymodules/protocols/openaicodex"
	_ "github.com/Sub2API-Devs/sup2api/ai-gateway/internal/caddymodules/protocols/passthrough"
	_ "github.com/Sub2API-Devs/sup2api/ai-gateway/internal/caddymodules/protocols/vertexanthropic"
	_ "github.com/Sub2API-Devs/sup2api/ai-gateway/internal/caddymodules/readiness"
	_ "github.com/Sub2API-Devs/sup2api/ai-gateway/internal/caddymodules/requestid"
	_ "github.com/Sub2API-Devs/sup2api/ai-gateway/internal/caddymodules/responsesws"
	_ "github.com/Sub2API-Devs/sup2api/ai-gateway/internal/caddymodules/runtimeapp"
	_ "github.com/Sub2API-Devs/sup2api/ai-gateway/internal/caddymodules/settlement"
	_ "github.com/Sub2API-Devs/sup2api/ai-gateway/internal/caddymodules/transports/fingerprint"
	_ "github.com/Sub2API-Devs/sup2api/ai-gateway/internal/caddymodules/transports/proxy"
	_ "github.com/Sub2API-Devs/sup2api/ai-gateway/internal/caddymodules/transports/standard"
	_ "github.com/caddyserver/caddy/v2/modules/caddyhttp"
)

func main() {
	if err := run(); err != nil {
		log.Fatal(err)
	}
}

func run() error {
	cfg, err := config.FromEnv()
	if err != nil {
		return fmt.Errorf("load configuration: %w", err)
	}
	caddyJSON, err := bootstrap.CaddyConfig(cfg)
	if err != nil {
		return err
	}
	if err := caddy.Load(caddyJSON, false); err != nil {
		return fmt.Errorf("start Caddy data plane: %w", err)
	}

	log.Printf("Sup2API AI data plane started on %s (node=%s)", cfg.ListenAddress, cfg.NodeID)
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	signal.Stop(quit)

	if err := caddy.Stop(); err != nil && !errors.Is(err, os.ErrClosed) {
		return fmt.Errorf("stop Caddy data plane: %w", err)
	}
	return nil
}
