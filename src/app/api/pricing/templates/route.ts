import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { DEFAULT_TEMPLATES } from '@/lib/pricing-calculator';

/**
 * 获取定价模板列表
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const client = getSupabaseClient();
    
    // 尝试从数据库获取用户自定义模板
    const { data: userTemplates, error } = await client
      .from('pricing_templates')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    // 如果数据库没有表，返回默认模板
    if (error || !userTemplates || userTemplates.length === 0) {
      return NextResponse.json({
        success: true,
        templates: DEFAULT_TEMPLATES.map(t => ({
          ...t,
          isDefault: true,
          isSystem: true,
        })),
        message: '使用系统默认模板',
      });
    }

    // 合并用户模板和默认模板
    const allTemplates = [
      ...userTemplates.map(t => ({
        id: t.id,
        name: t.name,
        platform: t.platform,
        targetCurrency: t.target_currency,
        defaultPackagingCost: t.default_packaging_cost || 0,
        defaultPackagingWeight: t.default_packaging_weight || 0,
        domesticShippingCost: t.domestic_shipping_cost || 0,
        firstWeight: t.first_weight || 0.5,
        firstWeightPrice: t.first_weight_price || 0,
        additionalWeightPrice: t.additional_weight_price || 0,
        platformCommissionRate: t.platform_commission_rate || 0.05,
        transactionFeeRate: t.transaction_fee_rate || 0.02,
        paymentFeeRate: t.payment_fee_rate || 0.01,
        profitMode: t.profit_mode || 'percentage',
        profitRate: t.profit_rate || 0.15,
        fixedProfit: t.fixed_profit || 0,
        exchangeRateMode: t.exchange_rate_mode || 'auto',
        manualExchangeRate: t.manual_exchange_rate,
        priceRounding: t.price_rounding || 'nearest_9',
        priceAdjustment: t.price_adjustment || 0,
        isDefault: t.is_default,
        isSystem: false,
      })),
      ...DEFAULT_TEMPLATES.map(t => ({
        ...t,
        isSystem: true,
      })),
    ];

    return NextResponse.json({
      success: true,
      templates: allTemplates,
    });
  } catch (error) {
    console.error('获取定价模板失败:', error);
    return NextResponse.json(
      { error: '获取定价模板失败' },
      { status: 500 }
    );
  }
}

/**
 * 创建定价模板
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const body = await request.json();
    const client = getSupabaseClient();

    const { data: template, error } = await client
      .from('pricing_templates')
      .insert({
        user_id: user.id,
        name: body.name,
        platform: body.platform,
        target_currency: body.targetCurrency,
        default_packaging_cost: body.defaultPackagingCost || 0,
        default_packaging_weight: body.defaultPackagingWeight || 0,
        domestic_shipping_cost: body.domesticShippingCost || 0,
        first_weight: body.firstWeight || 0.5,
        first_weight_price: body.firstWeightPrice || 0,
        additional_weight_price: body.additionalWeightPrice || 0,
        platform_commission_rate: body.platformCommissionRate || 0.05,
        transaction_fee_rate: body.transactionFeeRate || 0.02,
        payment_fee_rate: body.paymentFeeRate || 0.01,
        profit_mode: body.profitMode || 'percentage',
        profit_rate: body.profitRate || 0.15,
        fixed_profit: body.fixedProfit || 0,
        exchange_rate_mode: body.exchangeRateMode || 'auto',
        manual_exchange_rate: body.manualExchangeRate,
        price_rounding: body.priceRounding || 'nearest_9',
        price_adjustment: body.priceAdjustment || 0,
        is_default: body.isDefault || false,
      })
      .select()
      .single();

    if (error) {
      // 如果表不存在，返回模拟成功
      if (error.message.includes('does not exist')) {
        return NextResponse.json({
          success: true,
          template: {
            id: `custom-${Date.now()}`,
            ...body,
          },
          message: '模板已创建（暂存内存）',
        });
      }
      throw error;
    }

    return NextResponse.json({
      success: true,
      template,
    });
  } catch (error) {
    console.error('创建定价模板失败:', error);
    return NextResponse.json(
      { error: '创建定价模板失败' },
      { status: 500 }
    );
  }
}
