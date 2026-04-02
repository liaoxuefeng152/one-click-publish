# Link2Global 一键上架实现方案

## 📋 目录
1. [调研结论](#调研结论)
2. [核心痛点](#核心痛点)
3. [完整解决方案](#完整解决方案)
4. [技术实现细节](#技术实现细节)
5. [部署清单](#部署清单)

---

## 🔍 调研结论

### 妙手ERP的实现方式
通过调研，妙手ERP实现一键上架的核心在于：

1. **平台官方API对接**
   - TikTok Shop Open Platform: OAuth 2.0 + RESTful API
   - Shopee Open Platform: Partner API v2 + HMAC签名
   - 1688开放平台: API密钥 + OAuth授权

2. **自动化流程**
   - 商品采集（1688/淘宝）→ 翻译 → 图片处理 → 定价 → 发布
   - 全流程自动化，无需人工干预

3. **关键技术点**
   - 签名算法（HMAC-SHA256）
   - OAuth授权流程
   - 图片上传和格式转换
   - 分类和属性自动匹配

---

## ❗ 核心痛点

### 当前系统的问题

| 问题 | 现状 | 影响 |
|------|------|------|
| 平台API未真实对接 | 使用占位符代码 | 无法真正发布商品 |
| 缺少OAuth授权流程 | 只有模拟代码 | 无法获取店铺授权 |
| 1688采集未实现 | 使用假数据 | 无法采集真实商品 |
| 签名算法未实现 | TODO注释 | API调用会失败 |

---

## ✅ 完整解决方案

### 方案架构图
```
┌─────────────────────────────────────────────────────────────────┐
│                        用户界面层                                │
│  [商品采集] → [商品管理] → [一键上架] → [订单管理]              │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                        业务逻辑层                                │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │采集服务  │→ │翻译服务  │→ │图片服务  │→ │发布服务  │       │
│  │(1688 API)│  │(LLM)     │  │(Sharp)   │  │(平台API) │       │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘       │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                        第三方平台                                │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                      │
│  │1688 API  │  │TikTok API│  │Shopee API│                      │
│  └──────────┘  └──────────┘  └──────────┘                      │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔧 技术实现细节

### 1️⃣ Shopee平台对接（推荐优先实现）

#### 为什么优先Shopee？
- API文档完善：https://partner.shopeemobile.com/doccenter
- 中文支持好
- 东南亚市场大，门槛相对较低

#### 实现步骤

**步骤1：注册Shopee开放平台**
```bash
1. 访问 https://partner.shopeemobile.com/
2. 注册开发者账号
3. 创建应用，获取：
   - Partner ID
   - Partner Key
4. 申请API权限：
   - product.add_item (添加商品)
   - product.get_category (获取分类)
   - product.get_attribute (获取属性)
   - media_space.upload_image (上传图片)
```

**步骤2：配置环境变量**
```bash
# .env 或 环境变量
SHOPEE_PARTNER_ID=你的PartnerID
SHOPEE_PARTNER_KEY=你的PartnerKey
SHOPEE_REDIRECT_URI=https://你的域名/api/platforms/shopee/callback
```

**步骤3：实现OAuth授权**
```typescript
// src/app/api/platforms/shopee/auth/route.ts
import crypto from 'crypto';

export async function GET(request: NextRequest) {
  const partnerId = process.env.SHOPEE_PARTNER_ID!;
  const partnerKey = process.env.SHOPEE_PARTNER_KEY!;
  const redirectUri = process.env.SHOPEE_REDIRECT_URI!;
  
  // 生成授权URL
  const path = '/api/v2/shop/auth_partner';
  const timestamp = Math.floor(Date.now() / 1000);
  const baseString = `${partnerId}${path}${timestamp}`;
  const sign = crypto
    .createHmac('sha256', partnerKey)
    .update(baseString)
    .digest('hex');
  
  const authUrl = `https://partner.shopeemobile.com${path}?` + 
    `partner_id=${partnerId}&` +
    `timestamp=${timestamp}&` +
    `sign=${sign}&` +
    `redirect=${redirectUri}`;
  
  return NextResponse.redirect(authUrl);
}
```

**步骤4：处理授权回调**
```typescript
// src/app/api/platforms/shopee/callback/route.ts
export async function GET(request: NextRequest) {
  const { code, shop_id } = request.nextUrl.searchParams;
  
  // 用code换取access_token
  const tokenResponse = await fetch(
    'https://partner.shopeemobile.com/api/v2/auth/token/get',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        partner_id: process.env.SHOPEE_PARTNER_ID,
        code: code,
        shop_id: parseInt(shop_id!),
      }),
    }
  );
  
  const { access_token, refresh_token, expire_in } = await tokenResponse.json();
  
  // 保存到数据库
  await supabase.from('shop_authorizations').insert({
    user_id: userId,
    platform: 'shopee',
    shop_id: shop_id,
    access_token: access_token,
    refresh_token: refresh_token,
    expires_at: new Date(Date.now() + expire_in * 1000),
  });
  
  return NextResponse.redirect('/dashboard?auth=success');
}
```

**步骤5：发布商品**
```typescript
// src/lib/shopee-publisher.ts
import crypto from 'crypto';

export class ShopeePublisher {
  private partnerId: string;
  private partnerKey: string;
  private accessToken: string;
  private shopId: number;

  constructor(accessToken: string, shopId: number) {
    this.partnerId = process.env.SHOPEE_PARTNER_ID!;
    this.partnerKey = process.env.SHOPEE_PARTNER_KEY!;
    this.accessToken = accessToken;
    this.shopId = shopId;
  }

  // 生成签名
  private generateSign(path: string, timestamp: number): string {
    const baseString = `${this.partnerId}${path}${timestamp}${this.accessToken}${this.shopId}`;
    return crypto
      .createHmac('sha256', this.partnerKey)
      .update(baseString)
      .digest('hex');
  }

  // 上传图片
  async uploadImage(imageUrl: string): Promise<string> {
    const path = '/api/v2/media_space/upload_image';
    const timestamp = Math.floor(Date.now() / 1000);
    const sign = this.generateSign(path, timestamp);

    const response = await fetch(
      `https://partner.shopeemobile.com${path}?` +
      `partner_id=${this.partnerId}&` +
      `timestamp=${timestamp}&` +
      `access_token=${this.accessToken}&` +
      `shop_id=${this.shopId}&` +
      `sign=${sign}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_url: imageUrl }),
      }
    );

    const result = await response.json();
    return result.response.image_url;
  }

  // 发布商品
  async createProduct(product: {
    name: string;
    description: string;
    categoryId: number;
    images: string[];
    price: number;
    stock: number;
    attributes: Array<{ attribute_id: number; value: string }>;
  }) {
    const path = '/api/v2/product/add_item';
    const timestamp = Math.floor(Date.now() / 1000);
    const sign = this.generateSign(path, timestamp);

    // 先上传图片
    const uploadedImages = await Promise.all(
      product.images.map(img => this.uploadImage(img))
    );

    const response = await fetch(
      `https://partner.shopeemobile.com${path}?` +
      `partner_id=${this.partnerId}&` +
      `timestamp=${timestamp}&` +
      `access_token=${this.accessToken}&` +
      `shop_id=${this.shopId}&` +
      `sign=${sign}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category_id: product.categoryId,
          name: product.name,
          description: product.description,
          image: uploadedImages, // 最多9张
          price: product.price,
          stock: product.stock,
          attribute: product.attributes,
          logistic: {
            // 物流设置
          },
        }),
      }
    );

    const result = await response.json();
    
    if (result.error) {
      throw new Error(result.message || result.error_msg);
    }

    return result.response.item_id;
  }
}
```

---

### 2️⃣ TikTok Shop平台对接

#### 注册流程
```bash
1. 访问 https://partner.tiktokshop.com/
2. 注册开发者账号
3. 创建应用，获取：
   - App ID
   - App Secret
4. 申请权限：
   - product.create (创建商品)
   - product.upload_image (上传图片)
```

#### 关键代码
```typescript
// src/lib/tiktok-publisher.ts
export class TikTokPublisher {
  private appId: string;
  private appSecret: string;
  private accessToken: string;
  private shopId: string;

  // TikTok签名算法
  private generateSign(timestamp: number, path: string, body: string = ''): string {
    const baseString = `${this.appSecret}${path}${timestamp}${body}${this.appSecret}`;
    return crypto
      .createHash('sha256')
      .update(baseString)
      .digest('hex');
  }

  // 发布商品
  async createProduct(product: ProductData) {
    const path = '/api/products/create';
    const timestamp = Math.floor(Date.now() / 1000);
    const body = JSON.stringify({
      product_name: product.name,
      description: product.description,
      category_id: product.categoryId,
      images: product.images,
      price: product.price,
      stock: product.stock,
    });
    
    const sign = this.generateSign(timestamp, path, body);

    const response = await fetch(
      `https://open-api.tiktokglobalshop.com${path}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tts-access-token': this.accessToken,
          'x-tts-appkey': this.appId,
          'x-tts-timestamp': timestamp.toString(),
          'x-tts-sign': sign,
        },
        body: body,
      }
    );

    return await response.json();
  }
}
```

---

### 3️⃣ 1688商品采集

#### 两种方案对比

| 方案 | 优点 | 缺点 |
|------|------|------|
| **官方API** | 稳定、合规 | 需要企业资质、审核慢 |
| **爬虫采集** | 快速、无门槛 | 不稳定、有风险 |

#### 推荐：官方API方式

**步骤1：注册1688开放平台**
```bash
1. 访问 https://open.1688.com/
2. 企业认证（需要营业执照）
3. 创建应用，获取：
   - App Key
   - App Secret
4. 申请API权限：
   - alibaba.product.get (获取商品详情)
   - alibaba.product.search (搜索商品)
```

**步骤2：实现采集**
```typescript
// src/lib/1688-collector.ts
import crypto from 'crypto';

export class Alibaba1688Collector {
  private appKey: string;
  private appSecret: string;
  private accessToken: string;

  // 生成签名
  private generateSign(params: Record<string, any>): string {
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}${params[key]}`)
      .join('');
    
    return crypto
      .createHmac('sha256', this.appSecret)
      .update(sortedParams)
      .digest('hex')
      .toUpperCase();
  }

  // 获取商品详情
  async getProductDetail(offerId: string) {
    const params = {
      method: 'alibaba.product.get',
      app_key: this.appKey,
      access_token: this.accessToken,
      offer_id: offerId,
      timestamp: Date.now(),
      format: 'json',
      v: '2.0',
    };

    const sign = this.generateSign(params);
    
    const response = await fetch(
      `https://api.1688.com/router/rest?${new URLSearchParams({
        ...params,
        sign: sign,
      })}`
    );

    const result = await response.json();
    
    return {
      title: result.product.subject,
      price: result.product.price_range,
      images: result.product.image_urls,
      description: result.product.description,
      skus: result.product.sku_infos,
      attributes: result.product.attributes,
    };
  }

  // 批量采集店铺商品
  async getShopProducts(sellerId: string, page: number = 1) {
    const params = {
      method: 'alibaba.product.getSellerProductList',
      app_key: this.appKey,
      access_token: this.accessToken,
      seller_id: sellerId,
      page_no: page,
      page_size: 50,
      timestamp: Date.now(),
      format: 'json',
      v: '2.0',
    };

    const sign = this.generateSign(params);
    
    const response = await fetch(
      `https://api.1688.com/router/rest?${new URLSearchParams({
        ...params,
        sign: sign,
      })}`
    );

    return await response.json();
  }
}
```

---

### 4️⃣ 完整的一键发布流程

```typescript
// src/app/api/publish/one-click/route.ts
export async function POST(request: NextRequest) {
  const { productId, platform, shopId } = await request.json();
  
  // 1. 获取商品数据
  const product = await supabase
    .from('products')
    .select('*')
    .eq('id', productId)
    .single();

  // 2. 获取店铺授权
  const auth = await supabase
    .from('shop_authorizations')
    .select('*')
    .eq('platform', platform)
    .eq('shop_id', shopId)
    .single();

  if (!auth) {
    return NextResponse.json(
      { error: '请先授权店铺' },
      { status: 400 }
    );
  }

  // 3. 根据平台选择发布器
  let publisher;
  let platformProductId;
  
  if (platform === 'shopee') {
    publisher = new ShopeePublisher(auth.access_token, shopId);
    
    // 3.1 获取或匹配分类
    const categoryId = await matchCategory(product.category, platform);
    
    // 3.2 获取分类属性
    const attributes = await getCategoryAttributes(categoryId, platform);
    
    // 3.3 发布商品
    platformProductId = await publisher.createProduct({
      name: product.translated_title,
      description: product.translated_description,
      categoryId: categoryId,
      images: product.processed_images || product.original_images,
      price: product.selling_price,
      stock: product.stock,
      attributes: attributes,
    });
  } else if (platform === 'tiktok') {
    publisher = new TikTokPublisher(auth.access_token, shopId);
    // ... 类似流程
  }

  // 4. 保存发布记录
  await supabase.from('published_products').insert({
    product_id: productId,
    platform: platform,
    shop_id: shopId,
    platform_product_id: platformProductId,
    status: 'active',
  });

  return NextResponse.json({
    success: true,
    platformProductId,
    platform,
    shopId,
  });
}

// 分类自动匹配
async function matchCategory(
  sourceCategory: string,
  targetPlatform: string
): Promise<number> {
  // 使用LLM匹配最合适的分类
  const llmClient = new LLMClient(new Config());
  
  const response = await llmClient.chat({
    messages: [{
      role: 'user',
      content: `商品原始分类：${sourceCategory}
目标平台：${targetPlatform}
请从以下分类中选择最合适的一个：
- 服装类：1001
- 数码类：1002
- 家居类：1003
...

只返回分类ID数字。`
    }],
  });

  return parseInt(response.choices[0].message.content);
}
```

---

## 📦 部署清单

### 环境变量配置
```bash
# Shopee
SHOPEE_PARTNER_ID=你的PartnerID
SHOPEE_PARTNER_KEY=你的PartnerKey
SHOPEE_REDIRECT_URI=https://你的域名/api/platforms/shopee/callback

# TikTok Shop
TIKTOK_APP_ID=你的AppID
TIKTOK_APP_SECRET=你的AppSecret
TIKTOK_REDIRECT_URI=https://你的域名/api/platforms/tiktok/callback

# 1688
ALIBABA_APP_KEY=你的AppKey
ALIBABA_APP_SECRET=你的AppSecret
```

### 数据库表结构
```sql
-- 店铺授权表
CREATE TABLE shop_authorizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  platform VARCHAR(20) NOT NULL, -- 'shopee', 'tiktok'
  shop_id VARCHAR(50) NOT NULL,
  shop_name VARCHAR(200),
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at TIMESTAMP,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 发布记录表
CREATE TABLE published_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id),
  platform VARCHAR(20) NOT NULL,
  shop_id VARCHAR(50) NOT NULL,
  platform_product_id VARCHAR(100),
  platform_category_id INTEGER,
  status VARCHAR(20) DEFAULT 'active',
  published_at TIMESTAMP DEFAULT NOW(),
  error_message TEXT
);

-- 分类映射表
CREATE TABLE category_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_category VARCHAR(200),
  shopee_category_id INTEGER,
  tiktok_category_id INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 🚀 实施路线图

### 第一阶段（1-2周）：Shopee对接
- [ ] 注册Shopee开放平台
- [ ] 实现OAuth授权
- [ ] 实现商品发布API
- [ ] 测试真实发布

### 第二阶段（1周）：1688采集
- [ ] 注册1688开放平台
- [ ] 实现商品采集API
- [ ] 建立商品数据库

### 第三阶段（1-2周）：TikTok Shop对接
- [ ] 注册TikTok开放平台
- [ ] 实现OAuth授权
- [ ] 实现商品发布API

### 第四阶段（优化）
- [ ] 分类智能匹配
- [ ] 属性自动填充
- [ ] 批量发布优化
- [ ] 错误处理完善

---

## ⚠️ 重要提示

### 1. 企业资质要求
- Shopee：需要企业营业执照
- TikTok Shop：需要企业资质
- 1688：需要企业认证

### 2. API限制
- Shopee：每分钟最多1000次请求
- TikTok Shop：根据套餐不同限制不同
- 1688：需要申请更高权限

### 3. 违规风险
- 不要采集有版权的商品
- 注意违禁词检测
- 遵守平台规则

---

## 📚 参考文档

- [Shopee Open Platform](https://partner.shopeemobile.com/doccenter)
- [TikTok Shop Open Platform](https://partner.tiktokshop.com/docv2/page/)
- [1688开放平台](https://open.1688.com/)
- [妙手ERP官网](https://www.erp321.com/)
