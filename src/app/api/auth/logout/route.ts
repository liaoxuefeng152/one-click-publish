import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { cookies } from 'next/headers';

export async function POST() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    
    if (token) {
      const client = getSupabaseClient(token);
      await client.auth.signOut();
    }
    
    const response = NextResponse.json({ success: true });
    response.cookies.delete('auth_token');
    
    return response;
  } catch (error) {
    console.error('登出错误:', error);
    const response = NextResponse.json({ success: true });
    response.cookies.delete('auth_token');
    return response;
  }
}
