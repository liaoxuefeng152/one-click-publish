import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

/**
 * 开发环境专用：手动确认用户邮箱
 * 生产环境应该删除此API或添加严格权限控制
 */
export async function POST(request: NextRequest) {
  try {
    // 仅在开发环境允许
    if (process.env.COZE_PROJECT_ENV === 'PROD') {
      return NextResponse.json(
        { error: '此接口仅在开发环境可用' },
        { status: 403 }
      );
    }

    const { email } = await request.json();
    
    if (!email) {
      return NextResponse.json(
        { error: '请提供邮箱地址' },
        { status: 400 }
      );
    }
    
    const client = getSupabaseClient();
    
    // 查询用户
    const { data: users, error: queryError } = await client
      .from('users')
      .select('id, email')
      .eq('email', email.toLowerCase().trim())
      .maybeSingle();
    
    if (queryError || !users) {
      return NextResponse.json(
        { error: '用户不存在，请先注册' },
        { status: 404 }
      );
    }
    
    // 尝试使用 RPC 函数确认用户（需要在 Supabase 中创建该函数）
    // 如果没有 RPC 函数，则返回提示信息
    const { error: rpcError } = await client.rpc('confirm_user_email', {
      user_email: email.toLowerCase().trim()
    });
    
    if (rpcError) {
      // RPC 函数不存在，使用备用方案
      console.log('RPC函数不存在，尝试备用方案:', rpcError.message);
      
      // 方案2：尝试直接使用 SQL（需要相应权限）
      const { error: sqlError } = await client
        .from('auth.users')
        .update({ 
          email_confirmed_at: new Date().toISOString(),
          confirmed_at: new Date().toISOString()
        })
        .eq('email', email.toLowerCase().trim());
      
      if (sqlError) {
        console.error('SQL更新失败:', sqlError);
        
        // 返回手动确认指引
        return NextResponse.json({
          success: false,
          message: '无法自动确认用户',
          solution: `
            请在 Supabase Dashboard 中手动确认用户：
            1. 登录 Supabase Dashboard
            2. 进入 Authentication > Users
            3. 找到用户 ${email}
            4. 点击用户行右侧的 "..." 按钮
            5. 选择 "Confirm user" 或 "Send confirmation email"
          `,
          user: users
        });
      }
    }
    
    return NextResponse.json({
      success: true,
      message: '用户邮箱已确认',
      user: users
    });
  } catch (error) {
    console.error('确认用户错误:', error);
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    );
  }
}
