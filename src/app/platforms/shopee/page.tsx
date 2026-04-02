'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { AppLayout } from '@/components/layout';
import { Loader2, Store, Plus, Link2, Unlink, CheckCircle, XCircle, RefreshCw, AlertCircle } from 'lucide-react';

interface Shop {
  id: string;
  name: string;
  site: string;
  status: string;
  authorized_at: string;
  expires_at: string;
}

interface User {
  id: string;
  email: string;
  name?: string;
  role: string;
}

export default function ShopeeAuthPage() {
  const [user, setUser] = useState<User | null>(null);
  const [shops, setShops] = useState<Shop[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [authForm, setAuthForm] = useState({
    partnerId: '',
    apiKey: '',
    secretKey: '',
  });

  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        if (data.user) {
          setUser(data.user);
          fetchShops();
        }
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const fetchShops = async () => {
    try {
      const response = await fetch('/api/platforms/shopee/shops', { credentials: 'include' });
      const data = await response.json();
      if (response.ok) {
        setShops(data.shops || []);
      }
    } catch (error) {
      console.error('获取店铺失败:', error);
    }
  };

  const handleAuthorize = async () => {
    if (!authForm.partnerId || !authForm.apiKey || !authForm.secretKey) {
      alert('请填写完整的授权信息');
      return;
    }

    setIsAuthorizing(true);
    try {
      const response = await fetch('/api/platforms/shopee/authorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(authForm),
      });

      const data = await response.json();
      if (response.ok) {
        setShowAuthDialog(false);
        fetchShops();
        alert('授权成功！');
      } else {
        alert(data.error || '授权失败');
      }
    } catch (error) {
      console.error('授权失败:', error);
      alert('授权失败，请重试');
    } finally {
      setIsAuthorizing(false);
    }
  };

  const handleUnbind = async (shopId: string) => {
    if (!confirm('确定要解绑此店铺吗？解绑后将无法发布商品到该店铺。')) return;

    try {
      const response = await fetch(`/api/platforms/shopee/shops/${shopId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        setShops(shops.filter(s => s.id !== shopId));
        alert('解绑成功');
      }
    } catch (error) {
      console.error('解绑失败:', error);
    }
  };

  const handleTestConnection = async (shopId: string) => {
    try {
      const response = await fetch(`/api/platforms/shopee/shops/${shopId}/test`, {
        method: 'POST',
        credentials: 'include',
      });

      const data = await response.json();
      if (response.ok && data.success) {
        alert('连接成功！');
      } else {
        alert(data.error || '连接失败，请检查API密钥');
      }
    } catch (error) {
      console.error('测试失败:', error);
      alert('连接失败');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      active: { label: '正常', className: 'bg-green-100 text-green-600' },
      expired: { label: '已过期', className: 'bg-red-100 text-red-600' },
      pending: { label: '待验证', className: 'bg-yellow-100 text-yellow-600' },
    };
    const config = statusConfig[status] || { label: status, className: 'bg-slate-100 text-slate-600' };
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <AppLayout user={user}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Shopee 店铺授权</h1>
          <p className="text-slate-500 mt-1">管理您的 Shopee 店铺授权，支持多站点店铺绑定</p>
        </div>

        {/* 授权说明 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-500" />
              授权说明
            </CardTitle>
            <CardDescription>在开始授权之前，请确保您已准备好以下材料</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-slate-600">
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                <span>已注册 Shopee 卖家账号并完成企业认证</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                <span>已开通 Shopee 开放平台 API 权限</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                <span>获取 Partner ID、API Key 和 Secret Key</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                <span>配置授权回调地址：https://your-domain.com/api/platforms/shopee/callback</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* 添加店铺按钮 */}
        <div className="flex justify-end">
          <Dialog open={showAuthDialog} onOpenChange={setShowAuthDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                添加店铺授权
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Shopee 店铺授权</DialogTitle>
                <DialogDescription>
                  请输入您的 Shopee 开放平台 API 信息
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="partnerId">Partner ID</Label>
                  <Input
                    id="partnerId"
                    placeholder="请输入 Partner ID"
                    value={authForm.partnerId}
                    onChange={(e) => setAuthForm({ ...authForm, partnerId: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="apiKey">API Key</Label>
                  <Input
                    id="apiKey"
                    placeholder="请输入 API Key"
                    value={authForm.apiKey}
                    onChange={(e) => setAuthForm({ ...authForm, apiKey: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="secretKey">Secret Key</Label>
                  <Input
                    id="secretKey"
                    type="password"
                    placeholder="请输入 Secret Key"
                    value={authForm.secretKey}
                    onChange={(e) => setAuthForm({ ...authForm, secretKey: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowAuthDialog(false)}>
                  取消
                </Button>
                <Button onClick={handleAuthorize} disabled={isAuthorizing}>
                  {isAuthorizing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      授权中...
                    </>
                  ) : (
                    '确认授权'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* 已授权店铺列表 */}
        {shops.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Store className="h-16 w-16 text-slate-300 mb-4" />
              <p className="text-slate-500 mb-4">暂无已授权的 Shopee 店铺</p>
              <Button onClick={() => setShowAuthDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                添加店铺
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>店铺名称</TableHead>
                  <TableHead>站点</TableHead>
                  <TableHead>授权状态</TableHead>
                  <TableHead>授权时间</TableHead>
                  <TableHead>到期时间</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shops.map((shop) => (
                  <TableRow key={shop.id}>
                    <TableCell className="font-medium">{shop.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{shop.site}</Badge>
                    </TableCell>
                    <TableCell>{getStatusBadge(shop.status)}</TableCell>
                    <TableCell>
                      {new Date(shop.authorized_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {new Date(shop.expires_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleTestConnection(shop.id)}
                        >
                          <RefreshCw className="h-4 w-4 mr-1" />
                          测试连接
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleUnbind(shop.id)}
                        >
                          <Unlink className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
