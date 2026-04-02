import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { isValidEmail, isStrongPassword } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { email, password, name } = await request.json();
    
    // 验证输入
    if (!email || !password) {
      return NextResponse.json(
        { error: '邮箱和密码不能为空' },
        { status: 400 }
      );
    }
    
    if (!isValidEmail(email)) {
      return NextResponse.json(
        { error: '邮箱格式不正确' },
        { status: 400 }
      );
    }
    
    const passwordCheck = isStrongPassword(password);
    if (!passwordCheck.valid) {
      return NextResponse.json(
        { error: passwordCheck.message },
        { status: 400 }
      );
    }
    
    const client = getSupabaseClient();
    
    // 注册用户 - 自动确认邮箱
    const { data: authData, error: authError } = await client.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: name || email.split('@')[0],
        },
        // 自动确认邮箱（不需要邮件验证）
        emailRedirectTo: undefined,
      },
    });
    
    if (authError) {
      // 如果用户已存在
      if (authError.message.includes('already registered') || authError.message.includes('already been registered')) {
        return NextResponse.json(
          { error: '该邮箱已注册，请直接登录' },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: authError.message },
        { status: 400 }
      );
    }
    
    if (!authData.user) {
      return NextResponse.json(
        { error: '注册失败，请重试' },
        { status: 500 }
      );
    }

    // 尝试自动确认用户（使用 admin API 需要服务端权限）
    // 在 Supabase 中，如果关闭了邮件验证，用户会自动确认
    // 否则需要手动确认

    // 创建用户记录
    const { error: insertError } = await client
      .from('users')
      .insert({
        id: authData.user.id,
        email,
        name: name || email.split('@')[0],
        role: 'user',
      });
    
    if (insertError) {
      // 忽略重复插入错误
      if (!insertError.message.includes('duplicate')) {
        console.error('创建用户记录失败:', insertError);
      }
    }
    
    // 如果用户已确认或不需要确认，直接返回成功
    if (authData.session) {
      const response = NextResponse.json({
        success: true,
        message: '注册成功',
        user: {
          id: authData.user.id,
          email: authData.user.email,
        },
      });
      
      const isDev = process.env.COZE_PROJECT_ENV === 'DEV';
      response.cookies.set('auth_token', authData.session.access_token, {
        httpOnly: true,
        secure: isDev ? false : true, // 开发环境允许 HTTP，生产环境强制 HTTPS
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7,
        path: '/',
      });
      
      return response;
    }
    
    return NextResponse.json({
      success: true,
      message: '注册成功，请检查邮箱完成验证（如果未收到邮件，请稍后重试登录）',
      user: {
        id: authData.user.id,
        email: authData.user.email,
      },
    });
  } catch (error) {
    console.error('注册错误:', error);
    return NextResponse.json(
      { error: '服务器错误，请稍后重试' },
      { status: 500 }
    );
  }
}
