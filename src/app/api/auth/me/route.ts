import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export async function GET(request: NextRequest) {
  try {
    // 优先从 Cookie 获取，如果没有则从 Authorization header 获取
    const cookieStore = await cookies();
    let token = cookieStore.get('auth_token')?.value;
    
    // 如果 Cookie 中没有，尝试从 Authorization header 获取
    if (!token) {
      const authHeader = request.headers.get('authorization');
      if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }
    
    if (!token) {
      return NextResponse.json(
        { error: '未登录', user: null },
        { status: 401 }
      );
    }
    
    const client = getSupabaseClient(token);
    const { data: { user }, error } = await client.auth.getUser();
    
    if (error || !user) {
      return NextResponse.json(
        { error: '登录已过期，请重新登录', user: null },
        { status: 401 }
      );
    }
    
    // 获取用户详细信息
    const { data: userData } = await client
      .from('users')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();
    
    return NextResponse.json({ 
      user: {
        id: user.id,
        email: user.email,
        name: userData?.name || user.user_metadata?.name,
        avatar: userData?.avatar,
        role: userData?.role || 'user',
      }
    });
  } catch (error) {
    console.error('获取用户信息错误:', error);
    return NextResponse.json(
      { error: '服务器错误', user: null },
      { status: 500 }
    );
  }
}
