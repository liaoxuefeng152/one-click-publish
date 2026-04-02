# Link2Global - 跨境电商自动化上架系统

## 项目概述

Link2Global 是一个跨境电商自动化上架平台，支持从1688采集商品，自动翻译本地化，智能定价，一键发布到TikTok Shop/Shopee。

### 核心功能

- **1688智能采集**：单链接/批量采集商品信息
- **图片智能处理**：OCR文字识别、翻译、去水印、尺寸调整
- **多语种本地化**：自动翻译标题和描述（支持英/泰/越/印尼/马来语）
- **违禁词检测**：自动检测和过滤敏感词、违禁词
- **智能定价引擎**：根据汇率、运费、利润率自动计算售价
- **全自动化工作流**：一键式端到端处理（采集→翻译→图片→定价→发布）
- **批量自动化**：支持批量商品的并发自动化处理
- **平台真实API对接**：TikTok Shop和Shopee官方API发布商品
- **商品管理**：草稿箱、已采集、已发布商品管理

### 版本技术栈

- **Framework**: Next.js 16 (App Router)
- **Core**: React 19
- **Language**: TypeScript 5
- **UI 组件**: shadcn/ui (基于 Radix UI)
- **Styling**: Tailwind CSS 4
- **Database**: PostgreSQL (Supabase)
- **ORM**: Drizzle ORM
- **AI**: LLM (coze-coding-dev-sdk) 用于翻译和OCR
- **Image Processing**: Sharp 用于图片编辑
- **Storage**: S3兼容对象存储

## 目录结构

```
├── public/                     # 静态资源
├── scripts/                    # 构建与启动脚本
├── src/
│   ├── app/                    # 页面路由与API
│   │   ├── api/                # API Routes
│   │   │   ├── auth/           # 认证API (登录/注册/登出)
│   │   │   ├── automation/     # 全自动化工作流API
│   │   │   │   ├── pipeline/   # 单商品一键式端到端处理
│   │   │   │   └── batch/      # 批量自动化处理
│   │   │   ├── collect/        # 商品采集API
│   │   │   ├── image-process/  # 图片智能处理API (OCR/翻译)
│   │   │   ├── image-edit/     # 图片编辑API (去水印/裁剪/优化)
│   │   │   ├── platforms/      # 平台OAuth授权API
│   │   │   │   ├── tiktok/     # TikTok Shop授权
│   │   │   │   └── shopee/     # Shopee授权
│   │   │   ├── products/       # 商品管理API
│   │   │   ├── prohibited-detect/ # 违禁词检测API
│   │   │   ├── pricing/        # 定价计算API
│   │   │   ├── pricing-rules/  # 定价规则API
│   │   │   ├── publish/        # 商品发布API (真实平台API)
│   │   │   ├── shops/          # 店铺管理API
│   │   │   ├── translate/      # 翻译API (集成违禁词检测)
│   │   │   └── user/           # 用户API
│   │   ├── collect/            # 采集页面
│   │   ├── dashboard/          # 首页仪表盘
│   │   ├── login/              # 登录页
│   │   ├── platforms/          # 平台授权页
│   │   ├── pricing/            # 定价规则页
│   │   ├── products/           # 商品管理页
│   │   │   ├── drafts/         # 草稿箱（支持一键上架）
│   │   │   └── [id]/localize/  # 本地化页面 (集成图片处理)
│   │   ├── register/           # 注册页
│   │   └── settings/           # 系统设置页
│   ├── components/             # 组件
│   │   ├── layout/             # 布局组件
│   │   ├── one-click-publish.tsx # 一键上架组件
│   │   └── ui/                 # Shadcn UI组件
│   ├── hooks/                  # 自定义Hooks
│   ├── lib/                    # 工具库
│   │   ├── auth.ts             # 认证工具
│   │   ├── platform-api.ts     # 平台API封装 (TikTok/Shopee)
│   │   ├── prohibited-words.ts # 违禁词库
│   │   └── utils.ts            # 通用工具
│   └── storage/                # 数据存储
│       └── database/           # 数据库
│           ├── shared/         # Schema定义
│           └── supabase-client.ts # Supabase客户端
├── next.config.ts
├── package.json
└── tsconfig.json
```

## 数据库表结构

- **users**: 用户表
- **shops**: 店铺授权表 (TikTok Shop/Shopee)
- **products**: 商品表
- **tasks**: 任务表 (采集/翻译/发布/自动化任务)
- **pricing_rules**: 定价规则表
- **notifications**: 通知表

## API 端点

### 认证
- `POST /api/auth/register` - 注册
- `POST /api/auth/login` - 登录
- `POST /api/auth/logout` - 登出
- `GET /api/auth/me` - 获取当前用户

### 全自动化工作流（核心）
- `POST /api/automation/pipeline` - 一键式端到端处理（翻译→图片→定价→发布）
- `GET /api/automation/pipeline?taskId=xxx` - 查询工作流状态
- `POST /api/automation/batch` - 批量自动化处理
- `GET /api/automation/batch?batchTaskId=xxx` - 查询批量任务状态

### 商品采集
- `POST /api/collect` - 单链接采集
- `PUT /api/collect` - 批量采集

### 商品管理
- `GET /api/products` - 获取商品列表
- `GET /api/products/[id]` - 获取单个商品
- `PUT /api/products/[id]` - 更新商品
- `DELETE /api/products/[id]` - 删除商品

### 图片智能处理
- `POST /api/image-process` - 图片处理（OCR识别、翻译、水印检测）
  - `action: 'ocr'` - OCR文字识别
  - `action: 'translate-image'` - 图片文字翻译
  - `action: 'process-all'` - 综合处理（OCR+翻译+水印检测）
  
### 图片编辑
- `POST /api/image-edit` - 图片编辑
  - `action: 'remove-watermark'` - 去水印
  - `action: 'resize'` - 调整尺寸
  - `action: 'crop'` - 裁剪
  - `action: 'add-watermark'` - 添加水印
  - `action: 'optimize'` - 优化图片

### 违禁词检测
- `POST /api/prohibited-detect` - 检测文本中的违禁词
- `GET /api/prohibited-detect` - 快速检测（URL参数）

### 翻译
- `POST /api/translate` - 翻译商品标题和描述（自动检测违禁词）

### 定价
- `POST /api/pricing/calculate` - 计算售价
- `GET /api/pricing-rules` - 获取定价规则
- `POST /api/pricing-rules` - 创建定价规则

### 平台授权
- `GET /api/platforms/tiktok/auth` - TikTok Shop授权
- `GET /api/platforms/tiktok/callback` - TikTok Shop授权回调
- `GET /api/platforms/shopee/auth` - Shopee授权
- `GET /api/platforms/shopee/callback` - Shopee授权回调

### 发布
- `POST /api/publish` - 发布商品到平台（真实API调用）

### 店铺管理
- `GET /api/shops` - 获取店铺列表
- `POST /api/shops` - 添加店铺

## 核心功能说明

### 1. 全自动化工作流（核心功能）

**一键式端到端处理**，无需手动操作每个步骤：

```
采集 → 翻译 → 图片处理 → 定价 → 发布
```

**API调用示例：**
```typescript
POST /api/automation/pipeline
{
  "productId": "xxx",
  "shopId": "xxx",
  "targetLanguage": "en",
  "processImages": true,
  "autoPublish": false
}
```

**性能目标：** 单商品处理耗时 ≤90秒

**工作流步骤：**
1. **翻译商品信息** - 自动翻译标题和描述，检测违禁词
2. **图片智能处理** - OCR识别、翻译图片文字、检测水印
3. **智能定价** - 使用定价规则或默认策略（成本价×1.5）
4. **自动发布**（可选）- 自动调用平台API发布商品

### 2. 批量自动化处理

支持批量商品的并发处理，自动管理队列：

```typescript
POST /api/automation/batch
{
  "productIds": ["id1", "id2", "id3"],
  "shopId": "xxx",
  "targetLanguage": "en",
  "concurrency": 3,  // 并发数
  "autoPublish": false
}
```

**特性：**
- 异步后台执行，不阻塞响应
- 支持并发控制（默认3个并发）
- 实时进度查询
- 失败自动记录

### 3. 图片智能处理
使用LLM Vision模型实现：
- **OCR文字识别**：自动识别图片中的中文文字
- **智能翻译**：将识别的文字翻译成目标语言
- **水印检测**：检测图片中是否有水印、Logo等
- **质量评估**：评估图片清晰度、建议尺寸等

### 4. 图片编辑
使用Sharp库实现：
- **去水印**：通过模糊和修复算法淡化水印
- **尺寸调整**：适配TikTok Shop/Shopee平台要求（800x800）
- **裁剪**：自定义区域裁剪
- **添加水印**：支持文字和Logo水印
- **图片优化**：压缩和格式转换

### 5. 违禁词检测
内置50+常见违禁词，包括：
- 高风险：成人用品、毒品、武器、处方药
- 中风险：夸大宣传、医疗宣传、品牌侵权
- 低风险：广告词、敏感营销词
- 平台特定：TikTok/Shopee特殊要求

### 6. 平台真实API对接
- **TikTok Shop API**：完整的OAuth授权流程和商品发布接口
- **Shopee API**：支持多地区授权和商品管理
- **自动类目匹配**：使用LLM智能匹配商品类目
- **图片上传**：自动上传到平台CDN

## 开发规范

- **包管理**: 仅使用 pnpm
- **UI组件**: 默认使用 shadcn/ui
- **数据库操作**: 使用 Supabase SDK
- **LLM调用**: 使用 coze-coding-dev-sdk 的 LLMClient
- **图片处理**: 使用 Sharp 库
- **对象存储**: 使用 coze-coding-dev-sdk 的 S3Storage
- **字段命名**: 数据库使用 snake_case

## 业务流程

### 方式一：全自动化（推荐）
1. 采集商品 → 点击"一键上架" → 自动完成所有步骤 → 完成
2. 批量选择商品 → 点击"批量一键上架" → 后台自动处理

### 方式二：分步操作
1. 粘贴1688商品链接 → 自动采集信息
2. 图片智能处理 → OCR识别+翻译+去水印+调整尺寸
3. 选择目标语言 → 自动翻译标题+描述（自动检测违禁词）
4. 选择定价规则 → 自动计算售价
5. 选择目标店铺 → 一键发布（真实API）

## 环境变量

必需的环境变量：
```bash
# 数据库
DATABASE_URL=your_database_url

# LLM API
COZE_API_KEY=your_api_key

# 对象存储
COZE_BUCKET_ENDPOINT_URL=your_endpoint
COZE_BUCKET_NAME=your_bucket_name

# TikTok Shop API
TIKTOK_APP_ID=your_app_id
TIKTOK_APP_SECRET=your_app_secret

# Shopee API
SHOPEE_PARTNER_ID=your_partner_id
SHOPEE_PARTNER_KEY=your_partner_key

# 项目域名
COZE_PROJECT_DOMAIN_DEFAULT=https://your-domain.com
```

## 部署

项目运行在端口 5000，支持热更新。使用 `coze dev` 启动开发环境。

## 更新日志

### v3.0.0 (2026-03-30) - 全自动化版本
- ✅ 新增全自动化工作流API（一键式端到端处理）
- ✅ 新增批量自动化处理（支持并发控制）
- ✅ 新增一键上架组件（前端集成）
- ✅ 更新商品管理页面，支持批量选择和一键上架
- ✅ 达成性能目标：单商品处理耗时 ≤90秒

### v2.0.0 (2026-03-30)
- ✅ 新增图片智能处理功能（OCR + 翻译 + 去水印）
- ✅ 实现TikTok Shop/Shopee真实API对接
- ✅ 新增违禁词自动检测和过滤
- ✅ 优化本地化页面，支持批量图片处理
- ✅ 集成对象存储，处理后的图片自动上传
