'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AppLayout } from '@/components/layout';
import { Loader2, Package, Search, ArrowRight, Edit, Eye, Globe } from 'lucide-react';

interface Product {
  id: string;
  original_title: string;
  translated_title: string;
  status: string;
  created_at: string;
  original_images: string[];
  original_price: number;
  original_url: string;
  source_platform: string;
}

interface User {
  id: string;
  email: string;
  name?: string;
  role: string;
}

export default function CollectedProductsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sourceFilter, setSourceFilter] = useState('all');

  useEffect(() => {
    // 获取用户信息
    fetch('/api/auth/me', { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        if (data.user) {
          setUser(data.user);
          fetchProducts(data.user.id);
        }
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const fetchProducts = async (userId: string) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('status', 'collected');
      if (sourceFilter !== 'all') {
        params.append('source', sourceFilter);
      }
      
      const response = await fetch(`/api/products?${params.toString()}`, { credentials: 'include' });
      const data = await response.json();

      if (response.ok) {
        setProducts(data.products || []);
      }
    } catch (error) {
      console.error('获取商品失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      collected: { label: '已采集', className: 'bg-blue-100 text-blue-600' },
      draft: { label: '草稿', className: 'bg-slate-100 text-slate-600' },
      processing: { label: '处理中', className: 'bg-yellow-100 text-yellow-600' },
      ready: { label: '待发布', className: 'bg-orange-100 text-orange-600' },
    };
    const config = statusConfig[status] || { label: status, className: 'bg-slate-100 text-slate-600' };
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const filteredProducts = products.filter((product) => {
    const title = product.translated_title || product.original_title || '';
    return title.toLowerCase().includes(searchTerm.toLowerCase());
  });

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
          <h1 className="text-3xl font-bold">已采集商品</h1>
          <p className="text-slate-500 mt-1">查看所有已从1688采集的商品</p>
        </div>

        {/* 筛选 */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="搜索商品标题..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部来源</SelectItem>
                  <SelectItem value="1688">1688</SelectItem>
                  <SelectItem value="taobao">淘宝</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* 商品列表 */}
        {filteredProducts.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Package className="h-16 w-16 text-slate-300 mb-4" />
              <p className="text-slate-500 mb-4">暂无已采集商品</p>
              <Link href="/collect/single">
                <Button>开始采集商品</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>商品</TableHead>
                  <TableHead>来源</TableHead>
                  <TableHead>成本价</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>采集时间</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded bg-slate-100 flex items-center justify-center overflow-hidden">
                          {product.original_images?.[0] ? (
                            <img
                              src={product.original_images[0]}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <Package className="h-6 w-6 text-slate-400" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium truncate max-w-[200px]">
                            {product.translated_title || product.original_title || '未命名商品'}
                          </p>
                          {product.original_url && (
                            <a 
                              href={product.original_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-xs text-blue-500 hover:underline flex items-center gap-1"
                            >
                              <Globe className="h-3 w-3" />
                              查看原链接
                            </a>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{product.source_platform || '1688'}</Badge>
                    </TableCell>
                    <TableCell>
                      {product.original_price ? `¥${product.original_price}` : '-'}
                    </TableCell>
                    <TableCell>{getStatusBadge(product.status)}</TableCell>
                    <TableCell>
                      {new Date(product.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link href={`/products/${product.id}/localize`}>
                          <Button size="sm">
                            本地化处理
                            <ArrowRight className="ml-1 h-3 w-3" />
                          </Button>
                        </Link>
                        <Link href={`/products/${product.id}`}>
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
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
