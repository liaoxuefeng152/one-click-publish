'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Package, ShoppingCart, Clock, ArrowRight, CheckCircle, AlertCircle, Loader2, 
  Send, TrendingUp, Bell, ExternalLink, Calendar
} from 'lucide-react';
import Link from 'next/link';
import { AppLayout } from '@/components/layout';
import { useAuth, authFetch } from '@/components/auth-provider';

interface Stats {
  totalProducts: number;
  publishedProducts: number;
  draftProducts: number;
  totalShops: number;
  todayTasks: number;
}

interface Task {
  id: string;
  type: string;
  productName: string;
  status: string;
  createdAt: string;
  error?: string;
}

interface Announcement {
  id: string;
  title: string;
  content: string;
  date: string;
  type: 'info' | 'warning' | 'update';
}

export default function DashboardContent() {
  const { user, loading: authLoading } = useAuth();
  const [stats, setStats] = useState<Stats>({
    totalProducts: 0,
    publishedProducts: 0,
    draftProducts: 0,
    totalShops: 0,
    todayTasks: 0,
  });
  const [recentProducts, setRecentProducts] = useState<any[]>([]);
  const [recentTasks, setRecentTasks] = useState<Task[]>([]);
  const [announcements] = useState<Announcement[]>([
    {
      id: '1',
      title: '系统升级通知',
      content: '系统将于本周六凌晨2:00-4:00进行升级维护，届时将暂停服务。',
      date: '2024-01-15',
      type: 'warning',
    },
    {
      id: '2',
      title: '新增 Shopee 菲律宾站支持',
      content: '现已支持 Shopee 菲律宾站商品发布，欢迎体验！',
      date: '2024-01-10',
      type: 'update',
    },
    {
      id: '3',
      title: '定价算法优化',
      content: '智能定价算法已升级，定价更精准，利润更可控。',
      date: '2024-01-05',
      type: 'info',
    },
  ]);

  useEffect(() => {
    if (user) {
      authFetch('/api/dashboard/stats')
        .then(res => res.json())
        .then(data => {
          if (data.stats) setStats(data.stats);
          if (data.recentProducts) setRecentProducts(data.recentProducts);
          if (data.recentTasks) setRecentTasks(data.recentTasks);
        })
        .catch(console.error);
    }
  }, [user]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto" />
          <p className="mt-4 text-slate-500">加载中...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; className: string }> = {
      draft: { label: '草稿', className: 'bg-slate-100 text-slate-600' },
      processing: { label: '处理中', className: 'bg-blue-100 text-blue-600' },
      ready: { label: '待发布', className: 'bg-yellow-100 text-yellow-600' },
      published: { label: '已发布', className: 'bg-green-100 text-green-600' },
      failed: { label: '失败', className: 'bg-red-100 text-red-600' },
      pending: { label: '等待中', className: 'bg-slate-100 text-slate-600' },
      completed: { label: '完成', className: 'bg-green-100 text-green-600' },
    };
    const config = statusMap[status] || { label: status, className: 'bg-slate-100 text-slate-600' };
    return (
      <Badge className={config.className}>
        {config.label}
      </Badge>
    );
  };

  const getAnnouncementBadge = (type: string) => {
    const typeMap: Record<string, { label: string; className: string }> = {
      info: { label: '通知', className: 'bg-blue-100 text-blue-600' },
      warning: { label: '警告', className: 'bg-yellow-100 text-yellow-600' },
      update: { label: '更新', className: 'bg-green-100 text-green-600' },
    };
    const config = typeMap[type] || typeMap.info;
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const getTaskIcon = (type: string, status: string) => {
    if (status === 'completed') return <CheckCircle className="h-5 w-5 text-green-500" />;
    if (status === 'failed') return <AlertCircle className="h-5 w-5 text-red-500" />;
    return <Clock className="h-5 w-5 text-blue-500" />;
  };

  return (
    <AppLayout user={user}>
      <div className="space-y-6">
        {/* 欢迎信息 */}
        <div>
          <h1 className="text-3xl font-bold">欢迎回来，{user.name || '用户'}！</h1>
          <p className="text-slate-500 mt-1">管理您的跨境电商业务</p>
        </div>

        {/* 统计卡片 */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">已采集商品</CardTitle>
              <Package className="h-4 w-4 text-slate-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalProducts}</div>
              <div className="flex items-center justify-between mt-2">
                <p className="text-xs text-slate-500">已采集商品总数</p>
                <Link href="/products/collected" className="text-xs text-blue-600 hover:underline">
                  查看全部 →
                </Link>
              </div>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">待发布商品</CardTitle>
              <Clock className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.draftProducts}</div>
              <div className="flex items-center justify-between mt-2">
                <p className="text-xs text-slate-500">草稿箱商品</p>
                <Link href="/products/drafts" className="text-xs text-blue-600 hover:underline">
                  去发布 →
                </Link>
              </div>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">已发布商品</CardTitle>
              <Send className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.publishedProducts}</div>
              <div className="flex items-center justify-between mt-2">
                <p className="text-xs text-slate-500">成功上架商品</p>
                <Link href="/products/published" className="text-xs text-blue-600 hover:underline">
                  查看全部 →
                </Link>
              </div>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">今日任务</CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.todayTasks}</div>
              <div className="flex items-center justify-between mt-2">
                <p className="text-xs text-slate-500">采集/发布任务</p>
                <span className="text-xs text-blue-600 hover:underline cursor-pointer">
                  查看任务 →
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 快速操作 */}
        <Card>
          <CardHeader>
            <CardTitle>快速操作</CardTitle>
            <CardDescription>常用功能入口</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <Link href="/collect/single">
                <Button className="w-full h-20 flex flex-col gap-1" variant="outline">
                  <Package className="h-5 w-5" />
                  <span>单链接采集</span>
                </Button>
              </Link>
              <Link href="/collect/batch">
                <Button className="w-full h-20 flex flex-col gap-1" variant="outline">
                  <ShoppingCart className="h-5 w-5" />
                  <span>批量采集</span>
                </Button>
              </Link>
              <Link href="/products/drafts">
                <Button className="w-full h-20 flex flex-col gap-1" variant="outline">
                  <Send className="h-5 w-5" />
                  <span>一键发布</span>
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* 左侧：近期任务 */}
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>近期任务状态</CardTitle>
                <CardDescription>近7天的采集与发布任务</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              {recentTasks.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>暂无任务记录</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentTasks.map((task) => (
                    <div 
                      key={task.id} 
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 border"
                    >
                      <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center">
                        {getTaskIcon(task.type, task.status)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">
                          {task.type === 'collect' ? '采集任务' : 
                           task.type === 'translate' ? '翻译任务' :
                           task.type === 'publish' ? '发布任务' : task.type}
                        </p>
                        <p className="text-xs text-slate-500 truncate">
                          {task.productName || '未知商品'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(task.status)}
                        {task.status === 'failed' && (
                          <Button variant="ghost" size="sm">
                            重试
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 右侧：公告栏 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                公告栏
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {announcements.map((announcement) => (
                  <div 
                    key={announcement.id}
                    className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-medium text-sm">{announcement.title}</h4>
                      {getAnnouncementBadge(announcement.type)}
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      {announcement.content}
                    </p>
                    <p className="text-xs text-slate-400 flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {announcement.date}
                    </p>
                  </div>
                ))}
              </div>
              
              {/* 常见问题链接 */}
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm font-medium mb-2">常见问题</p>
                <ul className="space-y-1">
                  <li>
                    <Link href="/help" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                      <ExternalLink className="h-3 w-3" />
                      如何采集1688商品？
                    </Link>
                  </li>
                  <li>
                    <Link href="/help" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                      <ExternalLink className="h-3 w-3" />
                      如何授权店铺？
                    </Link>
                  </li>
                  <li>
                    <Link href="/help" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                      <ExternalLink className="h-3 w-3" />
                      定价公式说明
                    </Link>
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 最近商品 */}
        {recentProducts.length > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>最近商品</CardTitle>
                <CardDescription>最新采集的商品</CardDescription>
              </div>
              <Link href="/products/drafts">
                <Button variant="ghost" size="sm">
                  查看全部 <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentProducts.map((product: any) => (
                  <div key={product.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50">
                    <div className="h-12 w-12 rounded bg-slate-100 flex items-center justify-center overflow-hidden">
                      {product.original_images?.[0] ? (
                        <img src={product.original_images[0]} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <Package className="h-6 w-6 text-slate-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{product.translated_title || product.original_title || '未命名商品'}</p>
                      <p className="text-xs text-slate-500">
                        {new Date(product.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    {getStatusBadge(product.status)}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
