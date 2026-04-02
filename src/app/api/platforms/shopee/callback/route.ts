import { NextRequest, NextResponse } from 'next/server';
import { platformConfig } from '@/lib/platform-api';
import { getSupabaseClient } from '@/storage/database/supabase-client';

/**
 * Shopee OAuth回调处理
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const shopId = searchParams.get('shop_id');
    const error = searchParams.get('error');

    if (error) {
      return NextResponse.redirect(
        `${process.env.COZE_PROJECT_DOMAIN_DEFAULT}/platforms/shopee?error=${encodeURIComponent(error)}`
      );
    }

    if (!code || !shopId || !state) {
      return NextResponse.redirect(
        `${process.env.COZE_PROJECT_DOMAIN_DEFAULT}/platforms/shopee?error=invalid_callback`
      );
    }

    // 解析state
    const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
    const { userId } = stateData;

    // 使用授权码换取访问令牌
    const timestamp = Math.floor(Date.now() / 1000);
    const basePath = '/api/v2/auth/token/get';
    const baseString = `${platformConfig.shopee.partnerId}${basePath}${timestamp}`;
    
    // 生成签名 (TODO: 使用HMAC-SHA256)
    const sign = 'GENERATE_SIGN_HERE';

    const tokenResponse = await fetch(
      `${platformConfig.shopee.baseUrl}${basePath}?partner_id=${platformConfig.shopee.partnerId}&timestamp=${timestamp}&sign=${sign}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: code,
          shop_id: parseInt(shopId),
          partner_id: parseInt(platformConfig.shopee.partnerId),
        }),
      }
    );

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok || tokenData.error) {
      throw new Error(tokenData.message || tokenData.error_msg || '获取访问令牌失败');
    }

    const { access_token, refresh_token, expire_in } = tokenData;

    // 获取店铺信息
    const shopInfoPath = '/api/v2/shop/get_shop_info';
    const shopInfoString = `${platformConfig.shopee.partnerId}${shopInfoPath}${timestamp}${access_token}${shopId}`;
    const shopInfoSign = 'GENERATE_SIGN_HERE';

    const shopInfoResponse = await fetch(
      `${platformConfig.shopee.baseUrl}${shopInfoPath}?partner_id=${platformConfig.shopee.partnerId}&shop_id=${shopId}&timestamp=${timestamp}&access_token=${access_token}&sign=${shopInfoSign}`
    );

    const shopInfoData = await shopInfoResponse.json();
    const shopInfo = shopInfoData.response || {};

    // 保存店铺信息到数据库
    const client = getSupabaseClient();
    await client.from('shops').insert({
      user_id: userId,
      platform: 'shopee',
      shop_id: shopId,
      shop_name: shopInfo.shop_name || 'Shopee Shop',
      region: shopInfo.region || 'TH',
      access_token: access_token,
      refresh_token: refresh_token,
      token_expires_at: new Date(Date.now() + expire_in * 1000).toISOString(),
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    // 重定向到成功页面
    return NextResponse.redirect(
      `${process.env.COZE_PROJECT_DOMAIN_DEFAULT}/platforms/shopee?success=true&shop_name=${encodeURIComponent(shopInfo.shop_name || 'Shopee Shop')}`
    );
  } catch (error: any) {
    console.error('Shopee授权回调失败:', error);
    return NextResponse.redirect(
      `${process.env.COZE_PROJECT_DOMAIN_DEFAULT}/platforms/shopee?error=${encodeURIComponent(error.message)}`
    );
  }
}
