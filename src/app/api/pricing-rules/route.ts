import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// 获取定价规则列表
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const client = getSupabaseClient();
    const { data: rules, error } = await client
      .from('pricing_rules')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: '查询失败' }, { status: 500 });
    }

    return NextResponse.json({ rules: rules || [] });
  } catch (error) {
    console.error('获取定价规则错误:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}

// 创建定价规则
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      exchange_rate,
      currency,
      platform_fee_rate,
      shipping_cost,
      cross_border_shipping,
      profit_margin,
      tier_pricing,
      is_default,
    } = body;

    if (!name || !exchange_rate || !currency) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
    }

    const client = getSupabaseClient();

    // 如果设置为默认，取消其他默认规则
    if (is_default) {
      await client
        .from('pricing_rules')
        .update({ is_default: false })
        .eq('user_id', user.id)
        .eq('is_default', true);
    }

    const { data: rule, error } = await client
      .from('pricing_rules')
      .insert({
        user_id: user.id,
        name,
        exchange_rate,
        currency,
        platform_fee_rate: platform_fee_rate || 5,
        shipping_cost: shipping_cost || 0,
        cross_border_shipping: cross_border_shipping || 0,
        profit_margin: profit_margin || 20,
        tier_pricing,
        is_default: is_default || false,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: '创建失败' }, { status: 500 });
    }

    return NextResponse.json({ rule });
  } catch (error) {
    console.error('创建定价规则错误:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
