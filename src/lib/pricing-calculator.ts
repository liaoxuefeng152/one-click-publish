/**
 * 定价计算器
 * 
 * 参考妙手ERP定价模板实现
 */

export interface PricingTemplate {
  id: string;
  name: string;
  platform: 'shopee' | 'tiktok';
  targetCurrency: string;
  
  // 基础成本
  defaultPackagingCost: number;
  defaultPackagingWeight: number;
  
  // 物流
  domesticShippingCost: number;
  firstWeight: number;
  firstWeightPrice: number;
  additionalWeightPrice: number;
  
  // 平台费用
  platformCommissionRate: number;
  transactionFeeRate: number;
  paymentFeeRate: number;
  
  // 利润
  profitMode: 'percentage' | 'fixed' | 'mixed';
  profitRate: number;
  fixedProfit: number;
  
  // 汇率
  exchangeRateMode: 'auto' | 'manual';
  manualExchangeRate?: number;
  
  // 价格调整
  priceRounding: 'none' | 'nearest_9' | 'nearest_99' | 'nearest_00';
  priceAdjustment: number;
}

export interface PricingInput {
  purchasePrice: number;     // 采购价格 (CNY)
  productWeight: number;     // 商品重量 (kg)
  packagingWeight?: number;  // 包装重量 (kg)
  packagingCost?: number;    // 包装成本 (CNY)
  discountRate?: number;     // 采购折扣率 (默认0.6，即60%)
  profitRate?: number;       // 利润率 (默认0.3，即30%)
}

export interface PricingResult {
  // 成本明细
  costBreakdown: {
    purchasePrice: number;        // 原采购价格
    actualPurchasePrice: number;  // 实际采购价格（折扣后）
    discountRate: number;         // 折扣率
    packagingCost: number;
    domesticShipping: number;
    internationalShipping: number;
    totalCostCNY: number;
    totalCostTarget: number;
  };
  
  // 费用明细
  feeBreakdown: {
    commission: number;
    transactionFee: number;
    paymentFee: number;
    totalFees: number;
  };
  
  // 利润
  profit: {
    amount: number;
    rate: number;
    profitRateSetting: number;  // 用户设置的利润率
  };
  
  // 最终价格
  finalPrice: number;
  exchangeRate: number;
  
  // 计算过程（用于展示）
  calculationSteps: string[];
}

// 默认模板
export const DEFAULT_TEMPLATES: PricingTemplate[] = [
  {
    id: 'shopee-th-default',
    name: 'Shopee泰国默认模板',
    platform: 'shopee',
    targetCurrency: 'THB',
    defaultPackagingCost: 0,
    defaultPackagingWeight: 0.1,
    domesticShippingCost: 0,
    firstWeight: 0.5,
    firstWeightPrice: 15, // THB
    additionalWeightPrice: 10, // THB/kg
    platformCommissionRate: 0.05,
    transactionFeeRate: 0.02,
    paymentFeeRate: 0.01,
    profitMode: 'percentage',
    profitRate: 0.20,
    fixedProfit: 0,
    exchangeRateMode: 'auto',
    priceRounding: 'nearest_9',
    priceAdjustment: 0,
  },
  {
    id: 'shopee-my-default',
    name: 'Shopee马来西亚默认模板',
    platform: 'shopee',
    targetCurrency: 'MYR',
    defaultPackagingCost: 0,
    defaultPackagingWeight: 0.1,
    domesticShippingCost: 0,
    firstWeight: 0.5,
    firstWeightPrice: 5, // MYR
    additionalWeightPrice: 3, // MYR/kg
    platformCommissionRate: 0.045,
    transactionFeeRate: 0.02,
    paymentFeeRate: 0.01,
    profitMode: 'percentage',
    profitRate: 0.20,
    fixedProfit: 0,
    exchangeRateMode: 'auto',
    priceRounding: 'nearest_9',
    priceAdjustment: 0,
  },
  {
    id: 'tiktok-th-default',
    name: 'TikTok Shop泰国默认模板',
    platform: 'tiktok',
    targetCurrency: 'THB',
    defaultPackagingCost: 0,
    defaultPackagingWeight: 0.1,
    domesticShippingCost: 0,
    firstWeight: 0.5,
    firstWeightPrice: 18, // THB
    additionalWeightPrice: 12, // THB/kg
    platformCommissionRate: 0.08,
    transactionFeeRate: 0.02,
    paymentFeeRate: 0.01,
    profitMode: 'percentage',
    profitRate: 0.25,
    fixedProfit: 0,
    exchangeRateMode: 'auto',
    priceRounding: 'nearest_9',
    priceAdjustment: 0,
  },
  {
    id: 'tiktok-my-default',
    name: 'TikTok Shop马来西亚默认模板',
    platform: 'tiktok',
    targetCurrency: 'MYR',
    defaultPackagingCost: 0,
    defaultPackagingWeight: 0.1,
    domesticShippingCost: 0,
    firstWeight: 0.5,
    firstWeightPrice: 6, // MYR
    additionalWeightPrice: 4, // MYR/kg
    platformCommissionRate: 0.08,
    transactionFeeRate: 0.02,
    paymentFeeRate: 0.01,
    profitMode: 'percentage',
    profitRate: 0.25,
    fixedProfit: 0,
    exchangeRateMode: 'auto',
    priceRounding: 'nearest_9',
    priceAdjustment: 0,
  },
];

// 汇率配置（实际应该从API获取）
const EXCHANGE_RATES: Record<string, number> = {
  'CNY_THB': 5.0,
  'CNY_MYR': 0.65,
  'CNY_VND': 3400,
  'CNY_PHP': 8.0,
  'CNY_USD': 0.14,
  'CNY_SGD': 0.19,
};

/**
 * 获取汇率
 */
export function getExchangeRate(fromCurrency: string, toCurrency: string): number {
  if (fromCurrency === toCurrency) return 1;
  const key = `${fromCurrency}_${toCurrency}`;
  return EXCHANGE_RATES[key] || 1;
}

/**
 * 定价计算器类
 */
export class PricingCalculator {
  private template: PricingTemplate;
  private exchangeRate: number;

  constructor(template: PricingTemplate) {
    this.template = template;
    this.exchangeRate = template.exchangeRateMode === 'manual' && template.manualExchangeRate
      ? template.manualExchangeRate
      : getExchangeRate('CNY', template.targetCurrency);
  }

  /**
   * 计算完整定价
   */
  calculate(input: PricingInput): PricingResult {
    const steps: string[] = [];
    
    // 获取折扣率（默认60%）和利润率（默认30%）
    const discountRate = input.discountRate ?? 0.6;
    const customProfitRate = input.profitRate ?? 0.3;
    
    // 1. 计算实际采购价格（应用折扣）
    const actualPurchasePrice = input.purchasePrice * discountRate;
    steps.push(`📦 商品原价: ¥${input.purchasePrice.toFixed(2)}`);
    steps.push(`🎫 采购折扣: ${(discountRate * 100).toFixed(0)}%`);
    steps.push(`📦 实际采购价: ¥${actualPurchasePrice.toFixed(2)}`);
    
    // 2. 计算包装成本
    const packagingCost = input.packagingCost ?? this.template.defaultPackagingCost;
    const packagingWeight = input.packagingWeight ?? this.template.defaultPackagingWeight;
    steps.push(`📦 包装成本: ¥${packagingCost.toFixed(2)}`);
    
    // 3. 计算总重量
    const totalWeight = input.productWeight + packagingWeight;
    steps.push(`⚖️ 商品重量: ${input.productWeight.toFixed(3)} kg`);
    steps.push(`⚖️ 包装重量: ${packagingWeight.toFixed(3)} kg`);
    steps.push(`⚖️ 总重量: ${totalWeight.toFixed(3)} kg`);
    
    // 4. 计算物流费用 (目标货币)
    const shippingCostTarget = this.calculateShipping(totalWeight);
    const shippingCostCNY = shippingCostTarget / this.exchangeRate;
    steps.push(`🚚 国际运费: ${shippingCostTarget.toFixed(2)} ${this.template.targetCurrency} (≈¥${shippingCostCNY.toFixed(2)})`);
    
    // 5. 计算国内运费 (CNY)
    const domesticShippingCNY = this.template.domesticShippingCost;
    steps.push(`🚚 国内运费: ¥${domesticShippingCNY.toFixed(2)}`);
    
    // 6. 计算总成本 (CNY) - 使用实际采购价格
    const totalCostCNY = actualPurchasePrice + packagingCost + shippingCostCNY + domesticShippingCNY;
    const totalCostTarget = totalCostCNY * this.exchangeRate;
    steps.push(`💰 总成本: ¥${totalCostCNY.toFixed(2)} (≈${totalCostTarget.toFixed(2)} ${this.template.targetCurrency})`);
    
    // 7. 计算基础售价 (使用自定义利润率)
    const feeRate = this.template.platformCommissionRate + 
                    this.template.transactionFeeRate + 
                    this.template.paymentFeeRate;
    
    // 使用传入的利润率，如果没有则使用模板的利润率
    const effectiveProfitRate = customProfitRate;
    const basePriceCNY = totalCostCNY * (1 + effectiveProfitRate);
    steps.push(`📈 利润率: ${(effectiveProfitRate * 100).toFixed(0)}%`);
    steps.push(`📈 利润计算: 成本 × (1 + ${(effectiveProfitRate * 100).toFixed(0)}%) = ¥${basePriceCNY.toFixed(2)}`);
    
    // 8. 考虑平台费用
    const priceBeforeFeesCNY = basePriceCNY / (1 - feeRate);
    steps.push(`🏪 扣除平台费用前: ¥${priceBeforeFeesCNY.toFixed(2)} (费用率: ${(feeRate * 100).toFixed(1)}%)`);
    
    // 9. 转换为目标货币
    let finalPrice = priceBeforeFeesCNY * this.exchangeRate;
    steps.push(`💱 转换为${this.template.targetCurrency}: ${finalPrice.toFixed(2)} (汇率: ${this.exchangeRate.toFixed(4)})`);
    
    // 10. 价格调整
    const originalPrice = finalPrice;
    finalPrice = this.adjustPrice(finalPrice);
    if (originalPrice !== finalPrice) {
      steps.push(`✨ 心理定价: ${finalPrice.toFixed(2)} ${this.template.targetCurrency}`);
    }
    
    // 11. 计算各项费用
    const commission = finalPrice * this.template.platformCommissionRate;
    const transactionFee = finalPrice * this.template.transactionFeeRate;
    const paymentFee = finalPrice * this.template.paymentFeeRate;
    const totalFees = commission + transactionFee + paymentFee;
    
    // 12. 计算实际利润
    const revenueCNY = finalPrice / this.exchangeRate;
    const profitCNY = revenueCNY - totalCostCNY - totalFees / this.exchangeRate;
    const profitAmount = profitCNY * this.exchangeRate;
    const profitRate = profitAmount / (finalPrice - totalFees);
    
    steps.push(`💵 最终售价: ${finalPrice.toFixed(2)} ${this.template.targetCurrency}`);
    steps.push(`💵 预计利润: ${profitAmount.toFixed(2)} ${this.template.targetCurrency} (${(profitRate * 100).toFixed(1)}%)`);
    
    return {
      costBreakdown: {
        purchasePrice: input.purchasePrice,
        actualPurchasePrice, // 实际采购价（折扣后）
        discountRate, // 折扣率
        packagingCost,
        domesticShipping: domesticShippingCNY,
        internationalShipping: shippingCostCNY,
        totalCostCNY,
        totalCostTarget,
      },
      feeBreakdown: {
        commission,
        transactionFee,
        paymentFee,
        totalFees,
      },
      profit: {
        amount: profitAmount,
        rate: profitRate,
        profitRateSetting: customProfitRate, // 用户设置的利润率
      },
      finalPrice,
      exchangeRate: this.exchangeRate,
      calculationSteps: steps,
    };
  }

  /**
   * 计算物流费用
   */
  private calculateShipping(weight: number): number {
    const { firstWeight, firstWeightPrice, additionalWeightPrice } = this.template;
    
    if (weight <= firstWeight) {
      return firstWeightPrice;
    }
    
    const additionalWeight = Math.ceil(weight - firstWeight);
    return firstWeightPrice + additionalWeight * additionalWeightPrice;
  }

  /**
   * 价格调整（心理学定价）
   */
  private adjustPrice(price: number): number {
    const { priceRounding, priceAdjustment } = this.template;
    
    let adjusted: number;
    switch (priceRounding) {
      case 'nearest_9':
        // 19.9, 29.9, 99.9
        adjusted = Math.floor(price) + 0.9;
        break;
      case 'nearest_99':
        // 19.99, 29.99, 99.99
        adjusted = Math.floor(price) + 0.99;
        break;
      case 'nearest_00':
        // 20, 30, 100
        adjusted = Math.ceil(price / 10) * 10;
        break;
      default:
        adjusted = Math.round(price * 100) / 100;
    }
    
    return Math.max(0, adjusted + priceAdjustment);
  }
}

/**
 * 快速计算定价
 */
export function quickCalculate(
  template: PricingTemplate,
  purchasePrice: number,
  productWeight: number
): PricingResult {
  const calculator = new PricingCalculator(template);
  return calculator.calculate({ purchasePrice, productWeight });
}
