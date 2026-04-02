import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// 获取店铺列表
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const client = getSupabaseClient();
    const { data: shops, error } = await client
      .from('shops')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: '查询失败' }, { status: 500 });
    }

    return NextResponse.json({ shops: shops || [] });
  } catch (error) {
    console.error('获取店铺列表错误:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}

// 添加店铺
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const { platform, shop_name, shop_id, region, access_token, refresh_token, token_expires_at } = await request.json();
    
    if (!platform || !shop_name || !shop_id || !region) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
    }

    const client = getSupabaseClient();

    // 检查是否已添加
    const { data: existing } = await client
      .from('shops')
      .select('id')
      .eq('user_id', user.id)
      .eq('platform', platform)
      .eq('shop_id', shop_id)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: '该店铺已添加' }, { status: 400 });
    }

    const { data: shop, error } = await client
      .from('shops')
      .insert({
        user_id: user.id,
        platform,
        shop_name,
        shop_id,
        region,
        access_token,
        refresh_token,
        token_expires_at,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: '添加失败' }, { status: 500 });
    }

    return NextResponse.json({ shop });
  } catch (error) {
    console.error('添加店铺错误:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
