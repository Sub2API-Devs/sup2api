# CCGateway 控制面板 HTTP 模式设计

## 概述

将 CCGateway 从纯 SSH 管理模式扩展为支持 HTTP 直接连接模式，实现首次通过 SSH 安装控制面板，后续通过 HTTP API 管理的两阶段架构。

## 架构演进

### 原有架构（SSH Only）
```
插件核心 --SSH--> Docker 主机
              └─> 直接管理容器
```

### 新架构（SSH + HTTP）
```
阶段 1（初始化）：
插件核心 --SSH--> Docker 主机
              └─> 安装控制面板
              └─> 上传镜像

阶段 2（日常使用）：
插件核心 --HTTP--> 控制面板 (Port 8787)
                └─> 管理账号容器
                └─> 接收镜像更新
```

## 核心变更

### 1. 配置模式扩展

**Config 新增字段**：
```go
type Config struct {
    Mode                string `json:"mode"` // "local" | "ssh" | "http"
    ControllerInstalled bool   `json:"controller_installed,omitempty"`
    ControllerURL       string `json:"controller_url,omitempty"`
    // ... 其他字段
}
```

**模式说明**：
- `local`: 本地开发模式，连接 localhost:8787
- `ssh`: SSH 隧道模式，用于初始安装和运维
- `http`: HTTP 直连模式，日常生产使用

### 2. 控制面板 HTTP API

**新增端点**：

#### 镜像管理
```
POST /images/upload
  Headers:
    - X-Image-Name: 镜像名称
    - X-Image-SHA256: 预期哈希（可选）
  Body: 镜像 tar 数据流
  Response: { upload_id, sha256, size }

POST /images/load/<upload_id>
  Response: { image_id, tags, short_id }
```

#### 控制面板健康检查
```
GET /health
  Response: { version, app_image, egress_image, network_policy_version }
```

### 3. 安装流程

**installControllerViaSSH**：
1. 检查 Docker 是否安装和运行
2. 生成控制面板密钥
3. 通过 SSH 执行安装脚本
4. 等待控制面板健康检查通过
5. 返回连接信息（URL + Key）

**关键时序**：
```
1. 用户提供 SSH 凭据
2. 后端执行 installControllerViaSSH
3. 安装成功后自动切换到 http 模式
4. 保存 controller_url 和密钥
5. 后续操作使用 HTTP 连接
```

### 4. 镜像上传实现

**Python 端（images.py）**：
```python
class ImageManager:
    def upload_image_data(image_name, image_data, expected_sha256)
        → {upload_id, sha256, size}
    
    def load_image(upload_id)
        → {image_id, tags, short_id}
    
    def upload_and_load(...)  # 组合操作
```

**Go 端（controller_client.go）**：
```go
func (c *ControllerClient) UploadImageWithVerification(
    ctx, imageName string, imageData io.Reader, expectedSHA256 string
) (string, error)

func (c *ControllerClient) LoadImage(
    ctx context.Context, uploadID string
) (*ImageLoadResult, error)
```

### 5. HTTP 路由

**新增管理端点**：
```
GET  /system/ccgateway/controller/status     - 检查控制面板状态
POST /system/ccgateway/controller/install    - 安装控制面板
```

### 6. 前端适配

**RemoteSettings.vue**：
- 扩展 `mode` 类型支持 `'http'`
- 添加 `controller_installed` 和 `controller_url` 字段
- 显示控制面板连接状态
- 提供"安装控制面板"按钮（SSH 模式）
- 提供"切换到 HTTP 模式"选项

## 关键实现

### client.go - open 函数
```go
func (s *Service) open(ctx, c Config) (*http.Client, string, func() error, error) {
    switch c.Mode {
    case "ssh":
        // SSH 隧道到 127.0.0.1:8787
    case "http":
        // 直接 HTTPS 连接到 controller_url
    case "local":
        // 环境变量或默认 localhost
    }
}
```

### config.go - 模式验证
```go
// 验证 http 模式需要的字段
if c.Mode == "http" {
    if c.Host == "" {
        return c, errors.New("controller host is required")
    }
    if c.Port == 0 {
        c.Port = 8787
    }
    // 清除 SSH 字段
}
```

### manager.py - 镜像路由
```python
IMAGE_ROUTE = re.compile(r'/images(?:/(upload|load/([a-zA-Z0-9_-]{22})))?')

# 在 Handler.handle_request 中：
image_match = IMAGE_ROUTE.fullmatch(self.path)
if image_match:
    action, upload_id = image_match[1], image_match[2]
    if action == 'upload':
        return self.handle_image_upload()
    elif action and action.startswith('load/'):
        return self.handle_image_load(upload_id)
```

## 安全考虑

1. **密钥管理**：
   - 控制面板密钥随机生成（ensureControllerKey）
   - 存储在加密配置中
   - HTTP 请求通过 Bearer 认证

2. **镜像验证**：
   - 支持 SHA256 哈希校验
   - 限制上传大小（2GB）
   - 上传后立即验证并清理

3. **连接安全**：
   - 默认使用 HTTPS（可配置为 HTTP 用于测试）
   - 支持自签名证书（生产环境应使用有效证书）

4. **权限控制**：
   - 所有端点需要 `settings:manage` 权限
   - 镜像上传需要控制面板密钥

## 迁移路径

### 现有部署
1. SSH 模式继续正常工作
2. 可选升级：执行"安装控制面板"
3. 安装后自动切换到 HTTP 模式
4. SSH 凭据保留，便于运维

### 新部署
1. 配置 SSH 信息
2. 执行"安装控制面板"
3. 自动切换到 HTTP 模式

## 测试要点

1. **安装流程**：
   - Docker 未安装时的错误处理
   - Docker 未运行时的错误处理
   - 安装超时处理
   - 健康检查重试机制

2. **镜像上传**：
   - 大文件上传
   - SHA256 校验失败
   - 上传中断恢复
   - 并发上传

3. **模式切换**：
   - SSH → HTTP 切换
   - HTTP 连接失败时回退到 SSH
   - 配置保存和加载

4. **兼容性**：
   - 旧配置升级
   - 前端向后兼容

## 未来扩展

1. **镜像缓存**：在控制面板缓存常用镜像，加速部署
2. **批量操作**：支持一次上传多个镜像
3. **增量更新**：使用镜像层diff减少传输
4. **健康监控**：定期检查控制面板状态
5. **故障转移**：HTTP 失败时自动回退 SSH

## 文件清单

### 新增文件
- `next/plugins/ccgateway/companions/controller/images.py` - 镜像管理
- `next/server/internal/ccgateway/controller_client.go` - HTTP 客户端
- `next/server/internal/ccgateway/controller_install.go` - 安装逻辑

### 修改文件
- `next/plugins/ccgateway/companions/controller/manager.py` - 添加镜像路由
- `next/server/internal/ccgateway/config.go` - 扩展配置
- `next/server/internal/ccgateway/client.go` - 支持 HTTP 模式
- `next/server/internal/ccgateway/http.go` - 新增端点
- `next/web/src/views/ccgateway/RemoteSettings.vue` - 前端适配

## 部署注意事项

1. **Docker 要求**：目标主机必须已安装 Docker
2. **端口开放**：确保 8787 端口可访问
3. **证书配置**：生产环境使用有效 TLS 证书
4. **防火墙规则**：允许核心服务器到控制面板的连接
5. **备份策略**：保留 SSH 访问以便紧急恢复

## CONTRACTS 章节

建议新增：
- §XX.1: 控制面板 HTTP API 规范
- §XX.2: 镜像上传协议
- §XX.3: 模式切换约定
- §XX.4: 安装脚本要求
