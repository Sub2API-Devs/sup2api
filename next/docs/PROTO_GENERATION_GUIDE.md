# Proto 代码生成指南

## 当前状态
订阅限额功能已实现 90%，但缺少 proto 生成的 Go 代码，导致编译失败。

## 需要安装的工具

### 方案 1：使用 buf（推荐）

#### 步骤 1：安装 buf
```powershell
# 使用国内镜像
$env:GOPROXY = "https://goproxy.cn,direct"
go install github.com/bufbuild/buf/cmd/buf@latest
```

#### 步骤 2：安装 protoc-gen-go 插件
```powershell
go install google.golang.org/protobuf/cmd/protoc-gen-go@latest
go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@latest
```

#### 步骤 3：验证安装
```powershell
buf --version
protoc-gen-go --version
protoc-gen-go-grpc --version
```

如果提示找不到命令，确保 `$env:GOPATH\bin` 在你的 PATH 中：
```powershell
echo $env:GOPATH
# 应该是 C:\Users\16790\go

# 查看 PATH
echo $env:PATH

# 如果不在 PATH 中，临时添加：
$env:PATH += ";$env:GOPATH\bin"
```

#### 步骤 4：生成代码
```powershell
cd D:\projects\golang\sup2api\next\sdk
buf generate
```

#### 步骤 5：验证生成的文件
```powershell
ls gen/sub2api/plugin/v1/platform.pb.go
ls gen/sub2api/plugin/v1/platform_grpc.pb.go
```

---

### 方案 2：使用 protoc（备选）

#### 步骤 1：下载 protoc
1. 访问：https://github.com/protocolbuffers/protobuf/releases
2. 下载最新的 `protoc-XX.X-win64.zip`（例如 protoc-28.3-win64.zip）
3. 解压到某个目录，例如 `C:\tools\protoc`
4. 将 `C:\tools\protoc\bin` 添加到 PATH

#### 步骤 2：安装 Go 插件（同方案 1）
```powershell
$env:GOPROXY = "https://goproxy.cn,direct"
go install google.golang.org/protobuf/cmd/protoc-gen-go@latest
go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@latest
```

#### 步骤 3：生成代码
```powershell
cd D:\projects\golang\sup2api\next\sdk

protoc `
  --proto_path=proto `
  --go_out=gen `
  --go_opt=paths=source_relative `
  --go-grpc_out=gen `
  --go-grpc_opt=paths=source_relative `
  proto/sub2api/plugin/v1/platform.proto
```

---

## 生成后的验证步骤

### 1. 编译验证
```powershell
cd D:\projects\golang\sup2api\next\server
go build ./internal/account
```

应该没有编译错误。

### 2. 运行测试
```powershell
cd D:\projects\golang\sup2api\next\server\internal\store
go test -v -run TestAccountLimits
```

### 3. 完整构建
```powershell
cd D:\projects\golang\sup2api\next\server
go build ./...
```

---

## 常见问题

### Q1: `buf: command not found` 或 `protoc-gen-go: command not found`
**A**: 确保 `$env:GOPATH\bin` 在 PATH 中。临时添加：
```powershell
$env:PATH += ";$env:GOPATH\bin"
```

永久添加需要在系统环境变量中设置。

### Q2: 网络连接失败
**A**: 使用国内镜像：
```powershell
$env:GOPROXY = "https://goproxy.cn,direct"
```

或使用代理（如果你有）：
```powershell
$env:HTTPS_PROXY = "http://your-proxy:port"
```

### Q3: buf generate 报错
**A**: 检查 buf.gen.yaml 配置文件是否正确，确保插件路径正确。

---

## 文件说明

生成后会创建以下文件：
- `gen/sub2api/plugin/v1/platform.pb.go` - protobuf 消息定义
- `gen/sub2api/plugin/v1/platform_grpc.pb.go` - gRPC 服务定义

这些文件包含：
- `QuerySubscriptionLimitsRequest` 消息
- `QuerySubscriptionLimitsResponse` 消息  
- `SubscriptionWindow` 消息
- `PlatformServiceClient.QuerySubscriptionLimits` 方法

---

## 下一步

生成代码后：
1. ✅ 编译通过
2. ✅ 运行测试
3. ✅ 运行迁移 `0029_account_subscription_limits.sql`
4. ✅ 手工测试 HTTP API
5. 🔜 实现插件（Kimi 插件支持 QuerySubscriptionLimits）
6. 🔜 前端集成（可选）

---

**预计时间**: 安装工具 5-10 分钟，生成代码 1 分钟，验证 5 分钟
