# 定价系统设计方案

## 📊 参考妙手ERP定价模板

### 妙手ERP定价逻辑

```
最终售价 = (采购价格 × 折扣率 + 物流成本 + 包装成本) × (1 + 利润率) / (1 - 平台佣金率) × 汇率
```

### 核心定价因素

| 类别 | 因素 | 说明 | 默认值 |
|------|------|------|--------|
| **基础成本** | 采购价格 | 1688商品采购价 | ¥20 |
| | 采购折扣 | 批量采购优惠 | **60%** |
| | 商品重量 | 影响国际物流费用 | 0.3kg |
| | 包装重量 | 外包装重量 | 0.1kg |
| | 包装成本 | 包装材料成本 | ¥0 |
| **物流费用** | 国内运费 | 采购地到仓库运费 | ¥0 |
| | 国际运费 | 按重量计算（首重+续重） | - |
| | 尾程运费 | 目标国家本地配送 | - |
| **平台费用** | 平台佣金 | TikTok 5-10%, Shopee 3-5% | - |
| | 交易手续费 | 约2-3% | - |
| | 支付手续费 | 约1-2% | - |
| **利润设置** | **利润率** | 期望利润百分比 | **30%** |
| **汇率换算** | CNY → USD/THB/MYR等 | 实时汇率 | - |

---

## 🗄️ 数据库设计

### 1. 定价模板表 (pricing_templates)

```sql
CREATE TABLE pricing_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) NOT NULL,
  name VARCHAR(100) NOT NULL,                    -- 模板名称
  platform VARCHAR(20) NOT NULL,                 -- shopee / tiktok
  target_currency VARCHAR(10) NOT NULL,          -- 目标货币: USD, THB, MYR
  
  -- 基础成本设置
  default_packaging_cost DECIMAL(10,2) DEFAULT 0,    -- 默认包装成本
  default_packaging_weight DECIMAL(10,3) DEFAULT 0,  -- 默认包装重量(kg)
  
  -- 物流设置
  domestic_shipping_cost DECIMAL(10,2) DEFAULT 0,    -- 国内运费
  shipping_mode VARCHAR(20) DEFAULT 'weight',        -- weight/flat/range
  first_weight DECIMAL(10,3) DEFAULT 0.5,            -- 首重(kg)
  first_weight_price DECIMAL(10,2) DEFAULT 0,        -- 首重费用
  additional_weight_price DECIMAL(10,2) DEFAULT 0,   -- 续重单价(每kg)
  
  -- 平台费用
  platform_commission_rate DECIMAL(5,4) DEFAULT 0.05, -- 平台佣金率 5%
  transaction_fee_rate DECIMAL(5,4) DEFAULT 0.02,     -- 交易手续费率 2%
  payment_fee_rate DECIMAL(5,4) DEFAULT 0.01,         -- 支付手续费率 1%
  
  -- 利润设置
  profit_mode VARCHAR(20) DEFAULT 'percentage',       -- percentage/fixed/mixed
  profit_rate DECIMAL(5,4) DEFAULT 0.15,              -- 利润率 15%
  fixed_profit DECIMAL(10,2) DEFAULT 0,               -- 固定利润
  
  -- 汇率设置
  exchange_rate_mode VARCHAR(20) DEFAULT 'auto',      -- auto/manual
  manual_exchange_rate DECIMAL(10,4),                 -- 手动汇率
  
  -- 价格调整
  price_rounding VARCHAR(20) DEFAULT 'nearest_9',     -- none/nearest_9/nearest_99/nearest_00
  price_adjustment DECIMAL(10,2) DEFAULT 0,           -- 价格微调
  
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### 2. 物流规则表 (shipping_rules)

```sql
CREATE TABLE shipping_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) NOT NULL,
  template_id UUID REFERENCES pricing_templates(id),
  
  -- 目标地区
  country_code VARCHAR(10) NOT NULL,              -- 国家代码: TH, MY, VN, PH
  region_name VARCHAR(100),                       -- 地区名称
  
  -- 物流费用
  shipping_provider VARCHAR(100),                 -- 物流商
  first_weight DECIMAL(10,3) DEFAULT 0.5,         -- 首重(kg)
  first_weight_price DECIMAL(10,2),               -- 首重费用
  additional_weight_price DECIMAL(10,2),          -- 续重单价
  
  -- 时效
  estimated_days_min INTEGER,                     -- 最小天数
  estimated_days_max INTEGER,                     -- 最大天数
  
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 3. 平台费用配置表 (platform_fee_configs)

```sql
CREATE TABLE platform_fee_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform VARCHAR(20) NOT NULL,                  -- shopee / tiktok
  country_code VARCHAR(10) NOT NULL,              -- 国家
  
  -- 费用配置
  commission_rate DECIMAL(5,4),                   -- 佣金率
  transaction_fee_rate DECIMAL(5,4),              -- 交易手续费
  payment_fee_rate DECIMAL(5,4),                  -- 支付手续费
  
  -- 其他费用
  other_fees JSONB,                               -- 其他费用JSON
  
  effective_date DATE,                            -- 生效日期
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 4. 商品定价记录表 (product_pricings)

```sql
CREATE TABLE product_pricings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) NOT NULL,
  template_id UUID REFERENCES pricing_templates(id),
  
  -- 成本明细
  purchase_price DECIMAL(10,2),                   -- 采购价格(CNY)
  product_weight DECIMAL(10,3),                   -- 商品重量(kg)
  packaging_cost DECIMAL(10,2),                   -- 包装成本
  domestic_shipping DECIMAL(10,2),                -- 国内运费
  international_shipping DECIMAL(10,2),           -- 国际运费
  
  -- 平台费用
  platform_fee DECIMAL(10,2),                     -- 平台费用总计
  commission_amount DECIMAL(10,2),                -- 佣金金额
  transaction_fee DECIMAL(10,2),                  -- 交易手续费
  
  -- 利润
  profit_amount DECIMAL(10,2),                    -- 利润金额
  profit_rate DECIMAL(5,4),                       -- 利润率
  
  -- 最终价格
  cost_price DECIMAL(10,2),                       -- 总成本(CNY)
  selling_price DECIMAL(10,2),                    -- 售价(目标货币)
  selling_price_cny DECIMAL(10,2),                -- 售价折合人民币
  
  -- 汇率
  exchange_rate DECIMAL(10,4),                    -- 使用的汇率
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## 🧮 定价计算逻辑

### 核心公式

```typescript
/**
 * 定价计算器
 */
class PricingCalculator {
  /**
   * 计算完整定价
   */
  calculate(params: {
    // 商品信息
    purchasePrice: number;      // 采购价格 (CNY)
    productWeight: number;      // 商品重量 (kg)
    
    // 定价模板
    template: PricingTemplate;
    
    // 物流规则
    shippingRule?: ShippingRule;
    
    // 汇率
    exchangeRate: number;
  }): PricingResult {
    
    const { purchasePrice, productWeight, template, shippingRule, exchangeRate } = params;
    
    // 1. 计算基础成本
    const basicCost = purchasePrice + (template.defaultPackagingCost || 0);
    
    // 2. 计算物流费用
    const totalWeight = productWeight + (template.defaultPackagingWeight || 0);
    const shippingCost = this.calculateShipping(totalWeight, template, shippingRule);
    
    // 3. 计算总成本 (CNY)
    const totalCost = basicCost + shippingCost + (template.domesticShippingCost || 0);
    
    // 4. 计算售价 (CNY)
    const priceBeforeFees = this.calculatePriceBeforeFees(totalCost, template);
    
    // 5. 转换为目标货币
    let finalPrice = priceBeforeFees * exchangeRate;
    
    // 6. 价格调整 (如.99结尾)
    finalPrice = this.adjustPrice(finalPrice, template.priceRounding);
    
    // 7. 计算各项费用
    const commission = finalPrice * template.platformCommissionRate;
    const transactionFee = finalPrice * template.transactionFeeRate;
    const paymentFee = finalPrice * template.paymentFeeRate;
    
    // 8. 计算实际利润
    const totalFees = commission + transactionFee + paymentFee;
    const actualProfit = finalPrice - totalCost / exchangeRate - totalFees;
    
    return {
      costBreakdown: {
        purchasePrice,
        packagingCost: template.defaultPackagingCost || 0,
        domesticShipping: template.domesticShippingCost || 0,
        internationalShipping: shippingCost,
        totalCost,
      },
      feeBreakdown: {
        commission,
        transactionFee,
        paymentFee,
        totalFees,
      },
      profit: {
        amount: actualProfit,
        rate: actualProfit / (finalPrice - totalFees),
      },
      finalPrice,
      exchangeRate,
    };
  }
  
  /**
   * 计算物流费用
   */
  private calculateShipping(
    weight: number,
    template: PricingTemplate,
    rule?: ShippingRule
  ): number {
    const r = rule || template;
    
    if (weight <= r.firstWeight) {
      return r.firstWeightPrice;
    }
    
    const additionalWeight = Math.ceil(weight - r.firstWeight);
    return r.firstWeightPrice + additionalWeight * r.additionalWeightPrice;
  }
  
  /**
   * 计算税前售价
   */
  private calculatePriceBeforeFees(
    totalCost: number,
    template: PricingTemplate
  ): number {
    // 基础售价 = 成本 × (1 + 利润率) 或 成本 + 固定利润
    let basePrice: number;
    
    switch (template.profitMode) {
      case 'percentage':
        basePrice = totalCost * (1 + template.profitRate);
        break;
      case 'fixed':
        basePrice = totalCost + template.fixedProfit;
        break;
      case 'mixed':
        basePrice = totalCost * (1 + template.profitRate) + template.fixedProfit;
        break;
      default:
        basePrice = totalCost * 1.15; // 默认15%利润
    }
    
    // 考虑平台费用
    const feeRate = template.platformCommissionRate + 
                    template.transactionFeeRate + 
                    template.paymentFeeRate;
    
    // 售价 = 基础售价 / (1 - 平台费用率)
    return basePrice / (1 - feeRate);
  }
  
  /**
   * 价格调整 (心理学定价)
   */
  private adjustPrice(price: number, mode: string): number {
    switch (mode) {
      case 'nearest_9':
        // 19.9, 29.9, 99.9
        return Math.floor(price) + 0.9;
      case 'nearest_99':
        // 19.99, 29.99, 99.99
        return Math.floor(price) + 0.99;
      case 'nearest_00':
        // 20, 30, 100
        return Math.ceil(price / 10) * 10;
      default:
        return Math.round(price * 100) / 100;
    }
  }
}
```

---

## 🎯 定价示例

### 示例1：Shopee泰国站

**输入：**
- 采购价格：¥20 CNY
- 商品重量：0.3 kg
- 包装重量：0.1 kg
- 总重量：0.4 kg

**模板设置：**
- 平台佣金：5%
- 交易手续费：2%
- 支付手续费：1%
- 利润率：20%
- 汇率：1 CNY = 5 THB
- 物流：首重0.5kg = 15 THB, 续重 10 THB/kg

**计算过程：**
```
1. 物流费用 = 15 THB (未超首重)
2. 成本(CNY) = 20 + 0 + 0 + 15/5 = 23 CNY
3. 平台费用率 = 5% + 2% + 1% = 8%
4. 基础售价 = 23 × 1.2 = 27.6 CNY
5. 含费用售价 = 27.6 / (1 - 0.08) = 30 CNY
6. 转换泰铢 = 30 × 5 = 150 THB
7. 心理定价 = 149 THB (.9结尾)
```

**结果：**
- 售价：149 THB
- 成本：23 CNY (约115 THB)
- 利润：34 THB (约22%)

---

## 📱 前端页面设计

### 定价模板管理页面

```
┌─────────────────────────────────────────────────────────────┐
│  定价模板管理                              [+ 创建新模板]   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────┐  ┌─────────────────┐                  │
│  │ Shopee泰国模板  │  │ TikTok马来模板  │                  │
│  │ 默认模板 ⭐     │  │                 │                  │
│  │                 │  │                 │                  │
│  │ 佣金: 5%        │  │ 佣金: 8%        │                  │
│  │ 利润: 20%       │  │ 利润: 25%       │                  │
│  │ 汇率: 自动      │  │ 汇率: 手动      │                  │
│  │                 │  │                 │                  │
│  │ [编辑] [删除]   │  │ [编辑] [删除]   │                  │
│  └─────────────────┘  └─────────────────┘                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 定价计算器页面

```
┌─────────────────────────────────────────────────────────────┐
│  定价计算器                                                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  商品信息                                                    │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 采购价格 (CNY): [____20____]                         │   │
│  │ 商品重量 (kg):  [____0.3___]                         │   │
│  │ 包装重量 (kg):  [____0.1___]                         │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  定价模板: [Shopee泰国模板 ▼]                               │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 计算结果                                            │   │
│  │                                                     │   │
│  │ 成本明细 (CNY)          费用明细 (THB)              │   │
│  │ ├─ 采购价格: ¥20       ├─ 平台佣金: ₸7.5           │   │
│  │ ├─ 包装成本: ¥0        ├─ 交易费: ₸3.0             │   │
│  │ ├─ 国内运费: ¥0        └─ 支付费: ₸1.5             │   │
│  │ └─ 国际运费: ¥3                                     │   │
│  │    总成本: ¥23              总费用: ₸12             │   │
│  │                                                     │   │
│  │ ═══════════════════════════════════════════════   │   │
│  │                                                     │   │
│  │ 建议售价: ₸149                                      │   │
│  │ 预计利润: ₸34 (22.8%)                               │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  [应用到商品]  [批量计算]                                    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```
