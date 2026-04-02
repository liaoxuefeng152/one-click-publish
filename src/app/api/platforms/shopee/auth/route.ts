import { NextRequest, NextResponse } from 'next/server';
import { generateShopeeAuthUrl } from '@/lib/platform-api';

/**
 * Shopee OAuth授权启动
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json(
        { error: '缺少用户ID' },
        { status: 400 }
      );
    }

    // 生成state参数用于防CSRF攻击
    const state = Buffer.from(JSON.stringify({
      userId,
      timestamp: Date.now(),
    })).toString('base64');

    // 生成授权URL
    const authUrl = generateShopeeAuthUrl(state);

    return NextResponse.json({
      success: true,
      authUrl,
    });
  } catch (error: any) {
    console.error('Shopee授权失败:', error);
    return NextResponse.json(
      { error: error.message || '授权失败' },
      { status: 500 }
    );
  }
}
