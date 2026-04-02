import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// 更新用户资料
export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const { name, avatar } = await request.json();
    const client = getSupabaseClient();

    const { data: updatedUser, error } = await client
      .from('users')
      .update({
        name,
        avatar,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)
      .select()
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: '更新失败' }, { status: 500 });
    }

    return NextResponse.json({ user: updatedUser });
  } catch (error) {
    console.error('更新用户资料错误:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
