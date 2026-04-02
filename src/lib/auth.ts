import { getSupabaseClient } from '@/storage/database/supabase-client';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
  role: string;
}

// 获取当前登录用户
export async function getCurrentUser(request?: NextRequest): Promise<AuthUser | null> {
  try {
    // 优先从 Authorization header 获取 token
    let token: string | undefined;
    
    if (request) {
      const authHeader = request.headers.get('authorization');
      if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }
    
    // 如果没有从 header 获取到，尝试从 cookie 获取
    if (!token) {
      const cookieStore = await cookies();
      token = cookieStore.get('auth_token')?.value;
    }
    
    if (!token) {
      return null;
    }
    
    const client = getSupabaseClient(token);
    const { data: { user }, error } = await client.auth.getUser();
    
    if (error || !user) {
      return null;
    }
    
    // 获取用户详细信息
    const { data: userData, error: userError } = await client
      .from('users')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();
    
    if (userError || !userData) {
      return {
        id: user.id,
        email: user.email || '',
        name: user.user_metadata?.name,
        avatar: user.user_metadata?.avatar,
        role: 'user',
      };
    }
    
    return {
      id: userData.id,
      email: userData.email,
      name: userData.name || undefined,
      avatar: userData.avatar || undefined,
      role: userData.role,
    };
  } catch {
    return null;
  }
}

// 检查用户是否已登录
export async function requireAuth(): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Unauthorized');
  }
  return user;
}

// 验证邮箱格式
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// 密码强度验证
export function isStrongPassword(password: string): { valid: boolean; message: string } {
  if (password.length < 8) {
    return { valid: false, message: '密码至少需要8个字符' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: '密码需要包含至少一个大写字母' };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, message: '密码需要包含至少一个小写字母' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: '密码需要包含至少一个数字' };
  }
  return { valid: true, message: '' };
}
