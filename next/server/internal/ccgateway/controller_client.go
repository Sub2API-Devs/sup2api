package ccgateway

import (
	"context"
	"crypto/tls"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/remotedocker"
)

// ControllerClient 管理与控制面板的 HTTP 连接
type ControllerClient struct {
	BaseURL string
	Key     string
	client  *http.Client
	closer  func() error
}

// ControllerHealth 控制面板健康状态
type ControllerHealth struct {
	Version              string `json:"version"`
	AppImage             string `json:"app_image"`
	EgressImage          string `json:"egress_image"`
	NetworkPolicyVersion int    `json:"network_policy_version"`
}

// ControllerStatus 控制面板连接状态
type ControllerStatus struct {
	Connected bool              `json:"connected"`
	Healthy   bool              `json:"healthy"`
	Health    *ControllerHealth `json:"health,omitempty"`
	Error     string            `json:"error,omitempty"`
}

// openControllerHTTP 打开到控制面板的 HTTP 连接（通过 SSH 隧道或直接连接）
func openControllerHTTP(ctx context.Context, cfg Config) (*ControllerClient, error) {
	if cfg.AdminKey == "" {
		return nil, errors.New("no controller key configured")
	}

	var client *http.Client
	var baseURL string
	var closer func() error

	if cfg.Mode == "ssh" {
		// 通过 SSH 隧道连接（使用现有的 remotedocker.NewHTTPClient）
		client, closer, err := remotedocker.NewHTTPClient(ctx, cfg.SSH(), "127.0.0.1:8787")
		if err != nil {
			return nil, fmt.Errorf("failed to open SSH tunnel: %w", err)
		}

		baseURL = "http://127.0.0.1:8787"

		return &ControllerClient{
			BaseURL: baseURL,
			Key:     cfg.AdminKey,
			client:  client,
			closer:  closer,
		}, nil
	} else if cfg.Mode == "http" {
		// 直接 HTTP 连接（新模式）
		if cfg.Host == "" {
			return nil, errors.New("controller host not configured")
		}

		port := cfg.Port
		if port == 0 {
			port = 8787
		}

		baseURL = fmt.Sprintf("https://%s:%d", cfg.Host, port)

		client = &http.Client{
			Transport: &http.Transport{
				TLSClientConfig: &tls.Config{
					InsecureSkipVerify: false, // 生产环境应验证证书
				},
			},
			Timeout: 30 * time.Second,
		}

		closer = func() error { return nil }

		return &ControllerClient{
			BaseURL: baseURL,
			Key:     cfg.AdminKey,
			client:  client,
			closer:  closer,
		}, nil
	}

	return nil, fmt.Errorf("unsupported mode: %s", cfg.Mode)
}

// Close 关闭连接
func (c *ControllerClient) Close() error {
	if c.closer != nil {
		return c.closer()
	}
	return nil
}

// request 发送 HTTP 请求
func (c *ControllerClient) request(ctx context.Context, method, path string, body io.Reader) (*http.Response, error) {
	req, err := http.NewRequestWithContext(ctx, method, c.BaseURL+path, body)
	if err != nil {
		return nil, err
	}

	req.Header.Set("Authorization", "Bearer "+c.Key)
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}

	return c.client.Do(req)
}

// Health 检查控制面板健康状态
func (c *ControllerClient) Health(ctx context.Context) (*ControllerHealth, error) {
	resp, err := c.request(ctx, "GET", "/health", nil)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("health check failed: %d %s", resp.StatusCode, string(body))
	}

	var health ControllerHealth
	if err := json.NewDecoder(resp.Body).Decode(&health); err != nil {
		return nil, fmt.Errorf("failed to decode health response: %w", err)
	}

	return &health, nil
}

// CheckConnection 检查控制面板连接状态
func CheckControllerConnection(ctx context.Context, cfg Config) ControllerStatus {
	status := ControllerStatus{
		Connected: false,
		Healthy:   false,
	}

	// 检查是否配置了控制面板连接
	if cfg.AdminKey == "" {
		status.Error = "controller key not configured"
		return status
	}

	if cfg.Mode != "ssh" && cfg.Mode != "http" {
		status.Error = fmt.Sprintf("unsupported mode: %s", cfg.Mode)
		return status
	}

	// 尝试连接
	client, err := openControllerHTTP(ctx, cfg)
	if err != nil {
		status.Error = fmt.Sprintf("connection failed: %v", err)
		return status
	}
	defer client.Close()

	status.Connected = true

	// 检查健康状态
	health, err := client.Health(ctx)
	if err != nil {
		status.Error = fmt.Sprintf("health check failed: %v", err)
		return status
	}

	status.Healthy = true
	status.Health = health
	status.Error = ""

	return status
}

// UploadImage 上传镜像到控制面板
func (c *ControllerClient) UploadImage(ctx context.Context, imageName string, imageData io.Reader) error {
	// TODO: 实现镜像上传逻辑
	// 这需要控制面板实现 POST /images/upload 端点
	return errors.New("image upload not yet implemented")
}

// UploadImageWithVerification 上传镜像并验证 SHA256
func (c *ControllerClient) UploadImageWithVerification(ctx context.Context, imageName string, imageData io.Reader, expectedSHA256 string) (string, error) {
	// 创建请求
	req, err := http.NewRequestWithContext(ctx, "POST", c.BaseURL+"/images/upload", imageData)
	if err != nil {
		return "", fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Authorization", "Bearer "+c.Key)
	req.Header.Set("X-Image-Name", imageName)
	if expectedSHA256 != "" {
		req.Header.Set("X-Image-SHA256", expectedSHA256)
	}

	// 发送请求
	resp, err := c.client.Do(req)
	if err != nil {
		return "", fmt.Errorf("upload request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(io.LimitReader(resp.Body, 4096))
		return "", fmt.Errorf("upload failed: %d %s", resp.StatusCode, string(body))
	}

	// 解析响应
	var result struct {
		UploadID string `json:"upload_id"`
		SHA256   string `json:"sha256"`
		Size     int64  `json:"size"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", fmt.Errorf("failed to decode upload response: %w", err)
	}

	return result.UploadID, nil
}

// LoadImage 加载已上传的镜像到 Docker
func (c *ControllerClient) LoadImage(ctx context.Context, uploadID string) (*ImageLoadResult, error) {
	path := fmt.Sprintf("/images/load/%s", uploadID)
	resp, err := c.request(ctx, "POST", path, nil)
	if err != nil {
		return nil, fmt.Errorf("load request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(io.LimitReader(resp.Body, 4096))
		return nil, fmt.Errorf("load failed: %d %s", resp.StatusCode, string(body))
	}

	var result ImageLoadResult
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("failed to decode load response: %w", err)
	}

	return &result, nil
}

// ImageLoadResult 镜像加载结果
type ImageLoadResult struct {
	ImageID string   `json:"image_id"`
	Tags    []string `json:"tags"`
	ShortID string   `json:"short_id"`
}

// UploadAndLoadImage 上传并立即加载镜像（组合操作）
func (c *ControllerClient) UploadAndLoadImage(ctx context.Context, imageName string, imageData io.Reader, expectedSHA256 string) (*ImageLoadResult, error) {
	// 上传
	uploadID, err := c.UploadImageWithVerification(ctx, imageName, imageData, expectedSHA256)
	if err != nil {
		return nil, fmt.Errorf("upload failed: %w", err)
	}

	// 加载
	result, err := c.LoadImage(ctx, uploadID)
	if err != nil {
		return nil, fmt.Errorf("load failed: %w", err)
	}

	return result, nil
}
