import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();
    
    if (!email || !password) {
      return NextResponse.json(
        { error: '邮箱和密码不能为空' },
        { status: 400 }
      );
    }
    
    const client = getSupabaseClient();
    
    // 登录
    const { data: authData, error: authError } = await client.auth.signInWithPassword({
      email: email.toLowerCase().trim(),
      password,
    });
    
    if (authError) {
      console.error('登录错误:', authError.message, authError.status);
      
      // 提供更详细的错误信息
      let errorMessage = '登录失败';
      
      if (authError.message.includes('Invalid login credentials')) {
        errorMessage = '邮箱或密码错误，请检查输入';
      } else if (authError.message.includes('Email not confirmed')) {
        errorMessage = '邮箱未验证，请检查邮箱中的验证链接';
      } else if (authError.message.includes('Too many requests')) {
        errorMessage = '登录尝试次数过多，请稍后再试';
      } else if (authError.message.includes('User not found')) {
        errorMessage = '该邮箱未注册';
      } else {
        errorMessage = authError.message;
      }
      
      return NextResponse.json(
        { error: errorMessage },
        { status: 401 }
      );
    }
    
    if (!authData.session) {
      return NextResponse.json(
        { error: '登录失败，请重试' },
        { status: 500 }
      );
    }
    
    // 获取用户信息
    const { data: userData } = await client
      .from('users')
      .select('*')
      .eq('id', authData.user.id)
      .maybeSingle();
    
    const response = NextResponse.json({
      success: true,
      token: authData.session.access_token, // 返回 token 用于 localStorage
      user: {
        id: authData.user.id,
        email: authData.user.email,
        name: userData?.name || authData.user.user_metadata?.name,
        avatar: userData?.avatar,
        role: userData?.role || 'user',
      },
    });
    
    // 设置 cookie - 开发环境使用 auto（根据协议自动选择），生产环境强制 HTTPS
    const isDev = process.env.COZE_PROJECT_ENV === 'DEV';
    response.cookies.set('auth_token', authData.session.access_token, {
      httpOnly: true,
      secure: isDev ? false : true, // 开发环境允许 HTTP，生产环境强制 HTTPS
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7天
      path: '/',
    });
    
    return response;
  } catch (error) {
    console.error('登录错误:', error);
    return NextResponse.json(
      { error: '服务器错误，请稍后重试' },
      { status: 500 }
    );
  }
}
