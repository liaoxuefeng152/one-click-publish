import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSupabaseClient } from '@/storage/database/supabase-client';

async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;
  
  if (!token) return null;
  
  const supabase = getSupabaseClient(token);
  
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return null;
    return {
      id: user.id,
      email: user.email || '',
      name: user.user_metadata?.name || user.email?.split('@')[0],
      avatar: user.user_metadata?.avatar_url,
      role: user.user_metadata?.role || 'user',
    };
  } catch {
    return null;
  }
}

export async function GET() {
  const user = await getCurrentUser();
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabaseClient();

  // 获取商品统计
  const { count: totalProducts } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id);

  const { count: publishedProducts } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('status', 'published');

  const { count: draftProducts } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('status', 'draft');

  // 获取店铺数量
  const { count: totalShops } = await supabase
    .from('shops')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id);

  // 获取最近商品
  const { data: recentProducts } = await supabase
    .from('products')
    .select('id, original_title, translated_title, original_images, status, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(5);

  // 获取最近任务
  const { data: recentTasks } = await supabase
    .from('tasks')
    .select('id, type, status, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(5);

  return NextResponse.json({
    stats: {
      totalProducts: totalProducts || 0,
      publishedProducts: publishedProducts || 0,
      draftProducts: draftProducts || 0,
      totalShops: totalShops || 0,
    },
    recentProducts: recentProducts || [],
    recentTasks: recentTasks || [],
  });
}
