# CCGateway 出口代理

独立的 sing-box 出口容器，只包含 Dockerfile 和 egress.sh。控制器源码位于 ../controller，账号 Worker 位于 ../worker；代理不处理 Anthropic 请求或 Claude Code 会话。

仓库根目录构建：

    docker build -f next/plugins/ccgateway/companions/egress/Dockerfile -t ccgateway-egress:dev next/plugins/ccgateway/companions/egress

配置和防火墙由控制器管理；目录整理不变更生产镜像名称、运行参数或账号网络规则。
