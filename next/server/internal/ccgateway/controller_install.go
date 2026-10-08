package ccgateway

import (
	"context"
	"errors"
	"fmt"
	"time"
)

// InstallControllerResult 控制面板安装结果
type InstallControllerResult struct {
	Installed      bool   `json:"installed"`
	ControllerURL  string `json:"controller_url"`
	ControllerKey  string `json:"controller_key"`
	Version        string `json:"version"`
	Error          string `json:"error,omitempty"`
}

// installControllerViaSSH 通过 SSH 安装控制面板
// 这是首次设置时的流程：
// 1. 检查 Docker 是否已安装
// 2. 上传控制面板镜像
// 3. 启动控制面板容器
// 4. 验证控制面板健康状态
func (s *Service) installControllerViaSSH(ctx context.Context, cfg Config) (*InstallControllerResult, error) {
	result := &InstallControllerResult{
		Installed: false,
	}

	if cfg.Mode != "ssh" {
		return result, errors.New("SSH mode required for initial installation")
	}

	// 1. 检查 Docker
	checkDockerScript := `if ! command -v docker >/dev/null 2>&1; then
  echo CCG_RESULT=docker_not_installed
  exit 1
fi
if ! docker version >/dev/null 2>&1; then
  echo CCG_RESULT=docker_not_running
  exit 1
fi
echo CCG_RESULT=docker_ok`

	res, err := s.run(ctx, cfg, checkDockerScript, nil, 30*time.Second)
	if err != nil || res.ExitStatus != 0 {
		result.Error = "docker check failed"
		return result, errors.New(result.Error)
	}

	scriptRes := scriptResult(res.Output)
	if scriptRes != "docker_ok" {
		result.Error = scriptRes
		return result, fmt.Errorf("docker check failed: %s", scriptRes)
	}

	// 2. 确保控制面板密钥存在
	key, err := s.ensureControllerKey(ctx, cfg, 0)
	if err != nil {
		result.Error = "failed to generate controller key"
		return result, err
	}

	// 3. 安装控制面板
	img := cfg.EffectiveImages()
	script, err := installScript(img)
	if err != nil {
		result.Error = "invalid image references"
		return result, err
	}

	env := controllerEnv(key, img)
	res, err = s.run(ctx, cfg, script, env, installScriptLimit)
	if err != nil {
		result.Error = fmt.Sprintf("install script failed: %v", err)
		return result, err
	}

	scriptRes = scriptResult(res.Output)
	if scriptRes != "started" {
		result.Error = fmt.Sprintf("install failed: %s", scriptRes)
		return result, fmt.Errorf(result.Error)
	}

	// 4. 等待控制面板健康
	healthCtx, cancel := context.WithTimeout(ctx, healthWait)
	defer cancel()

	ticker := time.NewTicker(healthEvery)
	defer ticker.Stop()

	var lastErr error
	for {
		select {
		case <-healthCtx.Done():
			result.Error = fmt.Sprintf("controller not healthy: %v", lastErr)
			// 回滚
			_, _ = s.run(ctx, cfg, rollbackScript, nil, time.Minute)
			return result, errors.New(result.Error)
		case <-ticker.C:
			// 更新配置中的 AdminKey
			tempCfg := cfg
			tempCfg.AdminKey = key

			h, err := s.health(healthCtx, tempCfg)
			if err == nil {
				// 健康检查成功
				result.Installed = true
				result.ControllerKey = key
				result.Version = h.Version

				// 构建控制面板 URL
				port := cfg.Port
				if port == 0 {
					port = 8787
				}
				result.ControllerURL = fmt.Sprintf("https://%s:%d", cfg.Host, port)

				// 清理旧控制面板
				_, _ = s.run(ctx, cfg, finishScript, nil, time.Minute)

				return result, nil
			}
			lastErr = err
		}
	}
}

// SwitchToHTTPMode 从 SSH 模式切换到 HTTP 模式
// 安装成功后调用此函数更新配置
func (s *Service) SwitchToHTTPMode(ctx context.Context, installResult *InstallControllerResult) error {
	if !installResult.Installed {
		return errors.New("controller not installed")
	}

	// 加载当前配置
	cfg, err := s.Load(ctx)
	if err != nil {
		return err
	}

	// 更新为 HTTP 模式
	cfg.Mode = "http"
	cfg.ControllerInstalled = true
	cfg.ControllerURL = installResult.ControllerURL
	cfg.AdminKey = installResult.ControllerKey

	// 清除 SSH 凭据（可选，保留以便后续维护）
	// cfg.Password = ""
	// cfg.PrivateKey = ""
	// cfg.Passphrase = ""

	// 保存配置
	// TODO: 这里需要调用 save 逻辑保存到数据库
	// 暂时返回 nil，实际需要实现完整的保存逻辑

	return nil
}

// CheckOrInstallController 检查控制面板状态，如需要则安装
func (s *Service) CheckOrInstallController(ctx context.Context, cfg Config) (*InstallControllerResult, error) {
	// 如果已经是 HTTP 模式且标记为已安装，检查健康状态
	if cfg.Mode == "http" && cfg.ControllerInstalled {
		status := CheckControllerConnection(ctx, cfg)
		if status.Healthy {
			return &InstallControllerResult{
				Installed:     true,
				ControllerURL: cfg.ControllerURL,
				Version:       status.Health.Version,
			}, nil
		}
		// 不健康，可能需要重新安装或切回 SSH
		return &InstallControllerResult{
			Installed: false,
			Error:     "controller not healthy: " + status.Error,
		}, errors.New(status.Error)
	}

	// 如果是 SSH 模式，尝试安装
	if cfg.Mode == "ssh" {
		return s.installControllerViaSSH(ctx, cfg)
	}

	return &InstallControllerResult{
		Installed: false,
		Error:     "unsupported mode or not configured",
	}, errors.New("unsupported mode")
}
