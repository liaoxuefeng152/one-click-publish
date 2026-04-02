import { NextRequest, NextResponse } from 'next/server';
import { platformConfig } from '@/lib/platform-api';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { shops } from '@/storage/database/shared/schema';

/**
 * TikTok Shop OAuth回调处理
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    if (error) {
      return NextResponse.redirect(
        `${process.env.COZE_PROJECT_DOMAIN_DEFAULT}/platforms/tiktok?error=${encodeURIComponent(error)}`
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        `${process.env.COZE_PROJECT_DOMAIN_DEFAULT}/platforms/tiktok?error=invalid_callback`
      );
    }

    // 解析state
    const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
    const { userId } = stateData;

    // 使用授权码换取访问令牌
    const tokenResponse = await fetch(`${platformConfig.tiktok.baseUrl}/api/token/get`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        app_id: platformConfig.tiktok.appId,
        app_secret: platformConfig.tiktok.appSecret,
        auth_code: code,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok || tokenData.code !== 0) {
      throw new Error(tokenData.message || '获取访问令牌失败');
    }

    const { access_token, refresh_token, expires_in, shop_id } = tokenData.data;

    // 获取店铺信息
    const shopResponse = await fetch(`${platformConfig.tiktok.baseUrl}/api/shop/get`, {
      headers: {
        'x-tts-access-token': access_token,
      },
    });

    const shopData = await shopResponse.json();
    const shopInfo = shopData.data?.shop || {};

    // 保存店铺信息到数据库
    const client = getSupabaseClient();
    await client.from('shops').insert({
      user_id: userId,
      platform: 'tiktok',
      shop_id: shop_id || shopInfo.shop_id,
      shop_name: shopInfo.shop_name || 'TikTok Shop',
      region: shopInfo.region || 'TH',
      access_token: access_token,
      refresh_token: refresh_token,
      token_expires_at: new Date(Date.now() + expires_in * 1000).toISOString(),
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    // 重定向到成功页面
    return NextResponse.redirect(
      `${process.env.COZE_PROJECT_DOMAIN_DEFAULT}/platforms/tiktok?success=true&shop_name=${encodeURIComponent(shopInfo.shop_name || 'TikTok Shop')}`
    );
  } catch (error: any) {
    console.error('TikTok授权回调失败:', error);
    return NextResponse.redirect(
      `${process.env.COZE_PROJECT_DOMAIN_DEFAULT}/platforms/tiktok?error=${encodeURIComponent(error.message)}`
    );
  }
}
