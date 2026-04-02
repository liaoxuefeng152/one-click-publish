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
import { Loader2, Package, Search, ExternalLink, RefreshCw, Archive, Trash2 } from 'lucide-react';

interface Product {
  id: string;
  original_title: string;
  translated_title: string;
  status: string;
  created_at: string;
  published_at: string;
  original_images: string[];
  selling_price: number;
  platform: string;
  platform_site: string;
  platform_product_id: string;
  platform_url: string;
}

interface User {
  id: string;
  email: string;
  name?: string;
  role: string;
}

export default function PublishedProductsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [platformFilter, setPlatformFilter] = useState('all');

  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        if (data.user) {
          setUser(data.user);
          fetchProducts();
        }
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    if (user) fetchProducts();
  }, [platformFilter]);

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('status', 'published');
      if (platformFilter !== 'all') {
        params.append('platform', platformFilter);
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

  const handleSyncStock = async (productId: string) => {
    try {
      const response = await fetch(`/api/products/${productId}/sync-stock`, {
        method: 'POST',
        credentials: 'include',
      });
      if (response.ok) {
        alert('库存同步成功');
      }
    } catch (error) {
      console.error('同步失败:', error);
    }
  };

  const handleUnpublish = async (productId: string) => {
    if (!confirm('确定要下架此商品吗？')) return;
    
    try {
      const response = await fetch(`/api/products/${productId}/unpublish`, {
        method: 'POST',
        credentials: 'include',
      });
      if (response.ok) {
        fetchProducts();
      }
    } catch (error) {
      console.error('下架失败:', error);
    }
  };

  const handleDelete = async (productId: string) => {
    if (!confirm('确定要删除此商品记录吗？（不会影响平台商品）')) return;
    
    try {
      const response = await fetch(`/api/products/${productId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (response.ok) {
        setProducts(products.filter((p) => p.id !== productId));
      }
    } catch (error) {
      console.error('删除失败:', error);
    }
  };

  const getPlatformBadge = (platform: string, site: string) => {
    const isTikTok = platform?.toLowerCase().includes('tiktok');
    return (
      <Badge className={isTikTok ? 'bg-pink-100 text-pink-600' : 'bg-orange-100 text-orange-600'}>
        {platform || 'TikTok Shop'} - {site || '泰国站'}
      </Badge>
    );
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      published: { label: '上架中', className: 'bg-green-100 text-green-600' },
      unpublished: { label: '已下架', className: 'bg-slate-100 text-slate-600' },
      suspended: { label: '已暂停', className: 'bg-red-100 text-red-600' },
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
          <h1 className="text-3xl font-bold">已发布商品</h1>
          <p className="text-slate-500 mt-1">管理已发布到 TikTok Shop / Shopee 的商品</p>
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
              <Select value={platformFilter} onValueChange={setPlatformFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部平台</SelectItem>
                  <SelectItem value="tiktok">TikTok Shop</SelectItem>
                  <SelectItem value="shopee">Shopee</SelectItem>
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
              <p className="text-slate-500 mb-4">暂无已发布商品</p>
              <Link href="/products/drafts">
                <Button>前往发布商品</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>商品</TableHead>
                  <TableHead>平台</TableHead>
                  <TableHead>售价</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>发布时间</TableHead>
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
                          {product.platform_url && (
                            <a 
                              href={product.platform_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-xs text-blue-500 hover:underline flex items-center gap-1"
                            >
                              <ExternalLink className="h-3 w-3" />
                              查看平台商品
                            </a>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{getPlatformBadge(product.platform, product.platform_site)}</TableCell>
                    <TableCell>
                      {product.selling_price ? `฿${product.selling_price}` : '-'}
                    </TableCell>
                    <TableCell>{getStatusBadge(product.status)}</TableCell>
                    <TableCell>
                      {product.published_at 
                        ? new Date(product.published_at).toLocaleDateString()
                        : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleSyncStock(product.id)}
                          title="同步库存"
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleUnpublish(product.id)}
                          title="下架"
                        >
                          <Archive className="h-4 w-4 text-orange-500" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleDelete(product.id)}
                          title="删除记录"
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
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
