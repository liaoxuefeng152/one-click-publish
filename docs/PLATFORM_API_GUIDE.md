# TikTok Shop & Shopee 开发者账号申请指南

> 本指南将详细指导你完成开发者账号申请和API密钥获取的每一个步骤

---

## 目录

1. [TikTok Shop 开发者账号申请](#一tiktok-shop-开发者账号申请)
2. [Shopee 开发者账号申请](#二shopee-开发者账号申请)
3. [配置API密钥到系统](#三配置api密钥到系统)
4. [常见问题](#四常见问题)

---

## 一、TikTok Shop 开发者账号申请

### 1.1 准备工作

在开始之前，你需要准备：

| 材料 | 说明 |
|------|------|
| 营业执照 | 企业/个体工商户营业执照（照片或扫描件） |
| 法人身份证 | 身份证正反面照片 |
| 手机号 | 用于接收验证码 |
| 邮箱 | 用于接收通知和验证 |
| 店铺信息 | 如果已有TikTok Shop店铺，准备好店铺名称和ID |

### 1.2 注册步骤

#### 步骤1：访问开发者平台

1. 打开浏览器，访问：**https://partner.tiktokshop.com**
2. 点击右上角 **"Sign up"** 或 **"注册"** 按钮

![TikTok注册入口](https://via.placeholder.com/800x400?text=点击右上角Sign+up按钮)

#### 步骤2：选择账号类型

1. 选择 **"Developer"**（开发者）身份
2. 选择注册地区（建议选择与你目标市场一致的地区）
   - 🇹🇭 泰国 (Thailand)
   - 🇲🇾 马来西亚 (Malaysia)
   - 🇻🇳 越南 (Vietnam)
   - 🇵🇭 菲律宾 (Philippines)
   - 🇬🇧 英国 (UK)
   - 🇺🇸 美国 (US)

#### 步骤3：填写基本信息

填写以下信息：

```
┌─────────────────────────────────────────────────────┐
│  基本信息                                            │
├─────────────────────────────────────────────────────┤
│  公司名称: [你的公司名称，需与营业执照一致]            │
│  公司英文名: [公司英文名称]                          │
│  营业执照号: [营业执照上的统一社会信用代码]           │
│  公司地址: [营业执照上的注册地址]                    │
│  联系人姓名: [你的姓名]                              │
│  联系人邮箱: [你的邮箱]                              │
│  联系人电话: [你的手机号，需加区号如+86]             │
└─────────────────────────────────────────────────────┘
```

#### 步骤4：上传证件材料

1. **营业执照上传**
   - 格式：JPG、PNG、PDF
   - 大小：不超过 5MB
   - 要求：清晰、完整、无遮挡

2. **法人身份证上传**
   - 正面和反面各一张
   - 格式：JPG、PNG
   - 要求：清晰可辨认

3. 点击 **"Next"** 或 **"下一步"**

#### 步骤5：邮箱验证

1. 系统会发送验证邮件到你填写的邮箱
2. 打开邮箱，找到来自 TikTok Shop 的邮件
3. 点击邮件中的 **"Verify Email"** 链接
4. 页面跳转后显示验证成功

#### 步骤6：等待审核

1. 提交后进入审核状态
2. 审核时间：通常 **3-7个工作日**
3. 审核结果会通过邮件通知

> 💡 **提示**：审核期间可以先浏览开发者文档，了解API接口

### 1.3 创建应用并获取API密钥

#### 步骤1：登录开发者中心

审核通过后：

1. 访问 https://partner.tiktokshop.com
2. 点击 **"Log in"** 登录
3. 进入 **"Developer Center"**（开发者中心）

#### 步骤2：创建应用

1. 点击左侧菜单 **"Apps"** → **"Create App"**
2. 填写应用信息：

```
┌─────────────────────────────────────────────────────┐
│  应用信息                                            │
├─────────────────────────────────────────────────────┤
│  App Name: Link2Global                              │
│  App Description: 跨境电商自动化上架系统              │
│  App Type: 选择 "Seller App"（商家应用）             │
│  Category: 选择 "E-commerce Tools"（电商工具）       │
└─────────────────────────────────────────────────────┘
```

3. 点击 **"Submit"** 提交

#### 步骤3：配置回调地址

创建应用后，需要配置授权回调地址：

1. 在应用详情页，找到 **"Redirect URL"** 设置
2. 填写回调地址：

```
https://你的域名/api/platforms/tiktok/callback
```

> 例如：`https://2e072a65-763b-4be9-942c-33a9da2fef32.dev.coze.site/api/platforms/tiktok/callback`

3. 点击 **"Save"** 保存

#### 步骤4：获取API密钥

1. 在应用详情页，找到 **"App Credentials"** 区域
2. 可以看到以下信息：

```
┌─────────────────────────────────────────────────────┐
│  App Credentials（请妥善保管）                        │
├─────────────────────────────────────────────────────┤
│  App ID:      1234567890123456789                   │
│  App Secret:  abcdefghijklmnopqrstuvwxyz123456     │
└─────────────────────────────────────────────────────┘
```

3. 点击 **"Copy"** 复制 App ID 和 App Secret
4. **重要**：App Secret 只显示一次，请立即保存！

### 1.4 申请API权限

创建应用后，还需要申请API权限：

#### 步骤1：申请权限

1. 在应用详情页，找到 **"API Permissions"**
2. 点击 **"Apply for Permission"**
3. 选择需要的权限：

| 权限名称 | 用途 | 必要性 |
|----------|------|--------|
| `product.list` | 获取商品列表 | 可选 |
| `product.create` | 创建商品 | **必须** |
| `product.update` | 更新商品 | **必须** |
| `product.image.upload` | 上传商品图片 | **必须** |
| `category.list` | 获取类目列表 | **必须** |
| `shop.info` | 获取店铺信息 | **必须** |

4. 填写权限申请理由（英文）：

```
We are developing a cross-border e-commerce automation tool that helps 
sellers list products from Chinese suppliers (1688) to TikTok Shop. 
We need these APIs to:
1. Create and update products
2. Upload product images
3. Get category information for proper product classification
4. Verify shop information during authorization
```

5. 点击 **"Submit"** 提交申请

#### 步骤2：等待权限审核

- 审核时间：**1-3个工作日**
- 审核通过后，权限状态会变为 **"Approved"**

---

## 二、Shopee 开发者账号申请

### 2.1 准备工作

| 材料 | 说明 |
|------|------|
| 营业执照 | 企业/个体工商户营业执照 |
| 法人身份证 | 身份证正反面 |
| 手机号 | 接收验证码 |
| 邮箱 | 接收通知 |
| Shopee店铺 | 如果已有店铺，准备好店铺名称 |

### 2.2 注册步骤

#### 步骤1：访问开发者平台

1. 打开浏览器，访问：**https://partner.shopeemobile.com**
2. 点击 **"Sign Up"** 按钮

![Shopee注册入口](https://via.placeholder.com/800x400?text=点击Sign+Up按钮)

#### 步骤2：选择注册类型

1. 选择 **"Partner"** 类型
2. 选择合作伙伴类型：
   - **ERP Partner** - 如果你开发ERP系统
   - **Tool Provider** - 如果你提供电商工具（推荐）
   - **Logistics Partner** - 物流服务商

#### 步骤3：填写公司信息

```
┌─────────────────────────────────────────────────────┐
│  公司信息                                            │
├─────────────────────────────────────────────────────┤
│  Company Name: [公司名称]                            │
│  Company Name (EN): [英文名称]                       │
│  Business Registration No: [营业执照号]              │
│  Company Address: [公司地址]                         │
│  Country: China                                     │
│  Province: [省份]                                   │
│  City: [城市]                                       │
└─────────────────────────────────────────────────────┘
```

#### 步骤4：填写联系人信息

```
┌─────────────────────────────────────────────────────┐
│  联系人信息                                          │
├─────────────────────────────────────────────────────┤
│  Contact Name: [联系人姓名]                          │
│  Email: [邮箱地址]                                   │
│  Phone Number: [手机号，格式：+86xxxxxxxxxxx]        │
│  Position: [职位，如：Developer / Manager]          │
└─────────────────────────────────────────────────────┘
```

#### 步骤5：上传文件

1. 上传营业执照（Business License）
2. 上传联系人身份证（ID Card）
3. 勾选同意条款
4. 点击 **"Submit"** 提交

#### 步骤6：邮箱验证

1. 检查邮箱，找到 Shopee 的验证邮件
2. 点击验证链接完成验证
3. 等待审核（**3-7个工作日**）

### 2.3 创建应用并获取API密钥

#### 步骤1：登录合作伙伴中心

审核通过后：

1. 访问 https://partner.shopeemobile.com
2. 使用注册邮箱登录
3. 进入 **"Partner Center"**

#### 步骤2：创建应用

1. 点击左侧菜单 **"Apps"** → **"Create New App"**
2. 填写应用信息：

```
┌─────────────────────────────────────────────────────┐
│  应用配置                                            │
├─────────────────────────────────────────────────────┤
│  App Name: Link2Global                              │
│  App Description: Cross-border e-commerce tool      │
│  App Type: Seller Tool                              │
│  Redirect URL: https://你的域名/api/platforms/shopee/callback │
│  Callback URL: https://你的域名/api/platforms/shopee/callback │
└─────────────────────────────────────────────────────┘
```

> ⚠️ **注意**：Redirect URL 必须是 HTTPS 协议

3. 点击 **"Create"** 创建应用

#### 步骤3：获取API密钥

创建成功后，在应用详情页可以看到：

```
┌─────────────────────────────────────────────────────┐
│  API Credentials（请妥善保管）                        │
├─────────────────────────────────────────────────────┤
│  Partner ID:    123456                              │
│  Partner Key:   abcdefghijklmnopqrstuvwxyz123456   │
└─────────────────────────────────────────────────────┘
```

1. **Partner ID**：相当于 App ID
2. **Partner Key**：相当于 App Secret（只显示一次，请保存！）

#### 步骤4：申请API权限

1. 在应用详情页，找到 **"API Permission"**
2. 申请以下权限：

| 权限 | 用途 | 必要性 |
|------|------|--------|
| `shop.get_shop_info` | 获取店铺信息 | **必须** |
| `product.get_item_list` | 获取商品列表 | 可选 |
| `product.add_item` | 添加商品 | **必须** |
| `product.update_item` | 更新商品 | **必须** |
| `product.upload_img` | 上传图片 | **必须** |
| `category.get_category_list` | 获取类目 | **必须** |

3. 填写申请理由
4. 等待审核（**1-3个工作日**）

### 2.4 选择API环境

Shopee 提供两种环境：

| 环境 | URL | 用途 |
|------|-----|------|
| **Sandbox（沙箱）** | `https://partner.test-stable.shopeemobile.com` | 开发测试 |
| **Production（生产）** | `https://partner.shopeemobile.com` | 正式使用 |

> 💡 **建议**：先用沙箱环境测试，确认无误后再切换到生产环境

---

## 三、配置API密钥到系统

### 3.1 收集到的密钥信息

完成上述步骤后，你应该有以下信息：

#### TikTok Shop
```
TIKTOK_APP_ID=1234567890123456789
TIKTOK_APP_SECRET=abcdefghijklmnopqrstuvwxyz123456
```

#### Shopee
```
SHOPEE_PARTNER_ID=123456
SHOPEE_PARTNER_KEY=abcdefghijklmnopqrstuvwxyz123456
```

### 3.2 配置方式

将密钥信息提供给我，我会帮你配置到系统中。

**需要提供的信息格式**：

```
=== TikTok Shop 配置 ===
App ID: [你的App ID]
App Secret: [你的App Secret]
目标市场: [TH/MY/VN/PH 等]

=== Shopee 配置 ===
Partner ID: [你的Partner ID]
Partner Key: [你的Partner Key]
目标市场: [TH/MY/VN/ID/PH/SG 等]
```

### 3.3 配置后的流程

配置完成后，你需要：

1. **授权店铺**
   - 登录系统
   - 进入「平台授权」页面
   - 点击「授权TikTok Shop」或「授权Shopee」
   - 跳转到平台授权页面
   - 登录你的店铺账号并授权
   - 授权成功后自动返回

2. **开始使用**
   - 采集1688商品
   - 点击「一键上架」
   - 选择目标店铺和语言
   - 系统自动完成翻译→定价→发布

---

## 四、常见问题

### Q1：个人可以申请开发者账号吗？

**A**：可以申请 Shopee 个人开发者账号，但 TikTok Shop 目前需要企业资质。

### Q2：审核需要多长时间？

**A**：
- TikTok Shop：账号审核 3-7 天，API权限审核 1-3 天
- Shopee：账号审核 3-7 天，API权限审核 1-3 天

### Q3：没有营业执照怎么办？

**A**：建议注册一个个体工商户营业执照，流程简单，通常 3-5 天可完成：
1. 准备身份证和经营场所证明
2. 到当地市场监督管理局或网上申请
3. 也可以找代理机构代办

### Q4：可以同时申请多个平台吗？

**A**：可以，建议同时申请 TikTok Shop 和 Shopee，扩展销售渠道。

### Q5：API密钥泄露了怎么办？

**A**：
- TikTok Shop：在开发者中心重置 App Secret
- Shopee：在合作伙伴中心重新生成 Partner Key

### Q6：沙箱环境怎么测试？

**A**：
1. TikTok Shop：申请开通 Sandbox 权限
2. Shopee：使用 `https://partner.test-stable.shopeemobile.com`
3. 创建测试店铺和测试商品

---

## 五、申请进度跟踪表

打印此表格，跟踪你的申请进度：

### TikTok Shop

| 步骤 | 状态 | 日期 | 备注 |
|------|------|------|------|
| 注册开发者账号 | ⬜ 待完成 | | |
| 提交审核资料 | ⬜ 待完成 | | |
| 账号审核通过 | ⬜ 待完成 | | |
| 创建应用 | ⬜ 待完成 | | |
| 配置回调地址 | ⬜ 待完成 | | |
| 获取App ID/Secret | ⬜ 待完成 | | |
| 申请API权限 | ⬜ 待完成 | | |
| 权限审核通过 | ⬜ 待完成 | | |

### Shopee

| 步骤 | 状态 | 日期 | 备注 |
|------|------|------|------|
| 注册合作伙伴账号 | ⬜ 待完成 | | |
| 提交审核资料 | ⬜ 待完成 | | |
| 账号审核通过 | ⬜ 待完成 | | |
| 创建应用 | ⬜ 待完成 | | |
| 配置回调地址 | ⬜ 待完成 | | |
| 获取Partner ID/Key | ⬜ 待完成 | | |
| 申请API权限 | ⬜ 待完成 | | |
| 权限审核通过 | ⬜ 待完成 | | |

---

## 六、联系支持

如果申请过程中遇到问题，可以联系平台客服：

### TikTok Shop
- 开发者文档：https://partner.tiktokshop.com/docv2/page/
- 开发者论坛：https://seller.tiktok.com/forum
- 邮件支持：developer-support@tiktok.com

### Shopee
- 开发者文档：https://partner.shopeemobile.com/doccenter
- 工单系统：登录合作伙伴中心提交工单
- 邮件支持：shopee.partner@shopee.com

---

> 📅 **文档版本**：v1.0  
> 📝 **最后更新**：2024年

祝你申请顺利！如有问题随时问我。