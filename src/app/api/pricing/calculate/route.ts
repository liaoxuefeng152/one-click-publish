import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { 
  PricingCalculator, 
  DEFAULT_TEMPLATES, 
  PricingTemplate,
  getExchangeRate,
  PricingInput 
} from '@/lib/pricing-calculator';

/**
 * 定价计算API
 * 
 * GET: 获取实时汇率
 * POST: 计算定价
 */

// 默认值配置
const DEFAULT_VALUES = {
  productWeight: 0.3,      // 默认商品重量 0.3kg
  packagingWeight: 0.1,    // 默认包装重量 0.1kg
  packagingCost: 0,        // 默认包装成本 0
  purchasePrice: 20,       // 默认采购价格 ¥20
  discountRate: 0.6,       // 默认折扣率 60%
  profitRate: 0.3,         // 默认利润率 30%
};

/**
 * 获取实时汇率
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const from = searchParams.get('from') || 'CNY';
    const to = searchParams.get('to') || 'THB';
    
    const rate = getExchangeRate(from, to);
    
    return NextResponse.json({
      success: true,
      from,
      to,
      rate,
      timestamp: new Date().toISOString(),
      note: '汇率仅供参考，实际以平台为准',
    });
  } catch (error) {
    return NextResponse.json(
      { error: '获取汇率失败' },
      { status: 500 }
    );
  }
}

/**
 * 计算定价
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      productId,       // 商品ID（可选，如果提供则从商品数据获取）
      templateId,
      purchasePrice,
      productWeight,
      packagingWeight,
      packagingCost,
      discountRate,    // 折扣率，默认60%
      profitRate,      // 利润率，默认30%
    } = body;

    // 如果提供了商品ID，从数据库获取商品数据
    let productData: any = null;
    if (productId) {
      const client = getSupabaseClient();
      const { data, error } = await client
        .from('products')
        .select('*')
        .eq('id', productId)
        .single();
      
      if (!error && data) {
        productData = data;
      }
    }

    // 合并参数：优先使用传入参数 > 商品数据 > 默认值
    const pricingInput: PricingInput = {
      purchasePrice: purchasePrice ?? 
                      productData?.original_price ?? 
                      DEFAULT_VALUES.purchasePrice,
      productWeight: productWeight ?? 
                      productData?.weight ?? 
                      DEFAULT_VALUES.productWeight,
      packagingWeight: packagingWeight ?? 
                       productData?.packaging_weight ?? 
                       DEFAULT_VALUES.packagingWeight,
      packagingCost: packagingCost ?? 
                     productData?.packaging_cost ?? 
                     DEFAULT_VALUES.packagingCost,
      discountRate: discountRate ?? DEFAULT_VALUES.discountRate,
      profitRate: profitRate ?? DEFAULT_VALUES.profitRate,
    };

    // 获取模板
    let template: PricingTemplate | undefined;
    
    if (templateId) {
      // 先从默认模板查找
      template = DEFAULT_TEMPLATES.find(t => t.id === templateId);
      
      // 如果不是默认模板，从数据库查找
      if (!template) {
        const client = getSupabaseClient();
        const { data } = await client
          .from('pricing_templates')
          .select('*')
          .eq('id', templateId)
          .single();
        
        if (data) {
          template = {
            id: data.id,
            name: data.name,
            platform: data.platform,
            targetCurrency: data.target_currency,
            defaultPackagingCost: data.default_packaging_cost || 0,
            defaultPackagingWeight: data.default_packaging_weight || 0,
            domesticShippingCost: data.domestic_shipping_cost || 0,
            firstWeight: data.first_weight || 0.5,
            firstWeightPrice: data.first_weight_price || 0,
            additionalWeightPrice: data.additional_weight_price || 0,
            platformCommissionRate: data.platform_commission_rate || 0.05,
            transactionFeeRate: data.transaction_fee_rate || 0.02,
            paymentFeeRate: data.payment_fee_rate || 0.01,
            profitMode: data.profit_mode || 'percentage',
            profitRate: data.profit_rate || 0.15,
            fixedProfit: data.fixed_profit || 0,
            exchangeRateMode: data.exchange_rate_mode || 'auto',
            manualExchangeRate: data.manual_exchange_rate,
            priceRounding: data.price_rounding || 'nearest_9',
            priceAdjustment: data.price_adjustment || 0,
          };
        }
      }
    }

    // 如果没有找到模板，使用第一个默认模板
    if (!template) {
      template = DEFAULT_TEMPLATES[0];
    }

    // 计算定价
    const calculator = new PricingCalculator(template);
    const result = calculator.calculate(pricingInput);

    return NextResponse.json({
      success: true,
      template: {
        id: template.id,
        name: template.name,
        platform: template.platform,
        targetCurrency: template.targetCurrency,
      },
      input: {
        ...pricingInput,
        source: productId ? 'product' : 'manual',
        productId: productId || null,
      },
      result,
    });
  } catch (error) {
    console.error('定价计算失败:', error);
    return NextResponse.json(
      { error: '定价计算失败' },
      { status: 500 }
    );
  }
}
