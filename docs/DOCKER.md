# 🐳 Docker 部署指南

Link2Global 支持 Docker 容器化部署，包含 PostgreSQL 数据库。

## 快速开始

### 1. 配置环境变量

```bash
# 复制环境变量模板
cp .env.example .env

# 编辑 .env 文件，填入你的配置
nano .env
```

必需配置项：
- `COZE_API_KEY` - Coze API 密钥
- `COZE_PROJECT_DOMAIN_DEFAULT` - 项目域名（用于 OAuth 回调）

### 2. 启动服务

```bash
# 构建并启动所有服务
docker-compose up -d --build

# 查看日志
docker-compose logs -f app
```

### 3. 访问应用

- 应用地址: http://localhost:5000
- pgAdmin (可选): http://localhost:5050

## 常用命令

```bash
# 启动服务
docker-compose up -d

# 停止服务
docker-compose down

# 停止并删除数据卷（重置数据库）
docker-compose down -v

# 重新构建
docker-compose up -d --build

# 查看运行状态
docker-compose ps

# 查看日志
docker-compose logs -f

# 进入容器
docker-compose exec app sh
docker-compose exec postgres psql -U postgres
```

## 生产环境部署

### 1. 使用 Nginx 反向代理

```nginx
# /etc/nginx/sites-available/link2global
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 2. 配置 HTTPS

```bash
# 安装 Certbot
sudo apt install certbot python3-certbot-nginx

# 获取 SSL 证书
sudo certbot --nginx -d your-domain.com
```

### 3. 生产环境变量

```bash
# 生产环境 .env.production
NODE_ENV=production
PORT=5000
DATABASE_URL=postgresql://user:password@host:5432/link2global
COZE_API_KEY=your_real_api_key
COZE_PROJECT_DOMAIN_DEFAULT=https://your-domain.com
# ... 其他配置
```

## Docker 命令参考

| 命令 | 说明 |
|------|------|
| `docker-compose up -d` | 后台启动 |
| `docker-compose down` | 停止服务 |
| `docker-compose down -v` | 停止并删除数据卷 |
| `docker-compose restart` | 重启服务 |
| `docker-compose logs -f app` | 查看应用日志 |
| `docker-compose exec app pnpm next build` | 重新构建 |

## 数据持久化

- `postgres-data` - PostgreSQL 数据
- `app-data` - 应用上传文件

数据存储在 Docker volume 中，不会因容器重启丢失。

## 故障排查

### 数据库连接失败

```bash
# 检查 PostgreSQL 状态
docker-compose ps postgres

# 检查数据库日志
docker-compose logs postgres

# 重置数据库
docker-compose down -v
docker-compose up -d
```

### 端口冲突

如果 5000 或 5432 端口被占用：

```bash
# 修改 docker-compose.yml 中的端口映射
ports:
  - "5001:5000"  # 改为 5001
  - "5433:5432"  # 改为 5433
```

### 内存不足

构建时内存不足可能导致失败，尝试：

```bash
# 增加 Docker 内存限制到 4GB+
# 或使用 docker build 时限制并发
DOCKER_BUILDKIT=0 docker-compose build
```

## 启用调试工具

```bash
# 启动包含 pgAdmin 的完整环境
docker-compose --profile debug up -d

# 访问 pgAdmin
# URL: http://localhost:5050
# Email: admin@link2global.com
# Password: admin123
```
