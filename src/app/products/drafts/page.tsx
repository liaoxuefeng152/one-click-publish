'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Package, Search, ArrowRight, Trash2, Zap } from 'lucide-react';
import OneClickPublish from '@/components/one-click-publish';

interface Product {
  id: string;
  original_title: string;
  translated_title: string;
  status: string;
  created_at: string;
  original_images: string[];
  original_price: number;
  selling_price: number;
}

export default function DraftsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [isBatchDialogOpen, setIsBatchDialogOpen] = useState(false);
  const [oneClickProductId, setOneClickProductId] = useState<string | null>(null);

  useEffect(() => {
    fetchProducts();
  }, [statusFilter]);

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }
      
      const response = await fetch(`/api/products?${params.toString()}`);
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

  const handleDelete = async (productId: string) => {
    if (!confirm('确定要删除此商品吗？')) return;

    try {
      const response = await fetch(`/api/products/${productId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setProducts(products.filter((p) => p.id !== productId));
      }
    } catch (error) {
      console.error('删除失败:', error);
    }
  };

  const toggleSelectAll = () => {
    if (selectedProducts.size === products.length) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(products.map(p => p.id)));
    }
  };

  const toggleSelect = (productId: string) => {
    const newSelected = new Set(selectedProducts);
    if (newSelected.has(productId)) {
      newSelected.delete(productId);
    } else {
      newSelected.add(productId);
    }
    setSelectedProducts(newSelected);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      draft: { label: '草稿', className: 'bg-slate-100 text-slate-600' },
      processing: { label: '处理中', className: 'bg-blue-100 text-blue-600' },
      ready: { label: '待发布', className: 'bg-yellow-100 text-yellow-600' },
      published: { label: '已发布', className: 'bg-green-100 text-green-600' },
      failed: { label: '失败', className: 'bg-red-100 text-red-600' },
      needs_review: { label: '需审核', className: 'bg-orange-100 text-orange-600' },
    };
    const config = statusConfig[status] || { label: status, className: 'bg-slate-100 text-slate-600' };
    return (
      <Badge className={config.className}>
        {config.label}
      </Badge>
    );
  };

  const getNextStep = (product: Product) => {
    switch (product.status) {
      case 'draft':
        return { label: '本地化处理', href: `/products/${product.id}/localize` };
      case 'processing':
        return { label: '查看进度', href: `/products/${product.id}` };
      case 'ready':
        return { label: '发布商品', href: `/products/${product.id}/publish` };
      case 'published':
        return { label: '查看详情', href: `/products/${product.id}` };
      case 'needs_review':
        return { label: '审核商品', href: `/products/${product.id}/localize` };
      default:
        return { label: '处理', href: `/products/${product.id}/localize` };
    }
  };

  const filteredProducts = products.filter((product) => {
    const title = product.translated_title || product.original_title || '';
    return title.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">商品管理</h1>
          <p className="text-slate-500 mt-1">管理待处理的商品</p>
        </div>
        {selectedProducts.size > 0 && (
          <Button
            onClick={() => setIsBatchDialogOpen(true)}
            className="bg-gradient-to-r from-purple-600 to-pink-600"
          >
            <Zap className="mr-2 h-4 w-4" />
            批量一键上架 ({selectedProducts.size})
          </Button>
        )}
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
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                <SelectItem value="draft">草稿</SelectItem>
                <SelectItem value="processing">处理中</SelectItem>
                <SelectItem value="ready">待发布</SelectItem>
                <SelectItem value="needs_review">需审核</SelectItem>
                <SelectItem value="published">已发布</SelectItem>
                <SelectItem value="failed">失败</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* 商品列表 */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      ) : filteredProducts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="h-16 w-16 text-slate-300 mb-4" />
            <p className="text-slate-500 mb-4">暂无商品</p>
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
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedProducts.size === products.length}
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead>商品</TableHead>
                <TableHead>成本价</TableHead>
                <TableHead>售价</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>创建时间</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.map((product) => {
                const nextStep = getNextStep(product);
                return (
                  <TableRow key={product.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedProducts.has(product.id)}
                        onCheckedChange={() => toggleSelect(product.id)}
                      />
                    </TableCell>
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
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {product.original_price ? `¥${product.original_price}` : '-'}
                    </TableCell>
                    <TableCell>
                      {product.selling_price ? `${product.selling_price}` : '-'}
                    </TableCell>
                    <TableCell>{getStatusBadge(product.status)}</TableCell>
                    <TableCell>
                      {new Date(product.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setOneClickProductId(product.id)}
                          className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200 hover:from-blue-100 hover:to-purple-100"
                        >
                          <Zap className="mr-1 h-3 w-3" />
                          一键上架
                        </Button>
                        <Link href={nextStep.href}>
                          <Button size="sm">
                            {nextStep.label}
                            <ArrowRight className="ml-1 h-3 w-3" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(product.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* 一键上架对话框 */}
      {oneClickProductId && (
        <Dialog open={!!oneClickProductId} onOpenChange={() => setOneClickProductId(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>一键自动化上架</DialogTitle>
              <DialogDescription>
                全自动完成翻译、图片处理、定价、发布流程
              </DialogDescription>
            </DialogHeader>
            <OneClickPublish
              productId={oneClickProductId}
              productTitle={products.find(p => p.id === oneClickProductId)?.original_title || ''}
              onComplete={() => {
                setOneClickProductId(null);
                fetchProducts();
              }}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* 批量处理对话框 */}
      <Dialog open={isBatchDialogOpen} onOpenChange={setIsBatchDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>批量一键上架</DialogTitle>
            <DialogDescription>
              将为选中的 {selectedProducts.size} 个商品执行自动化流程
            </DialogDescription>
          </DialogHeader>
          <BatchProcessDialog
            productIds={Array.from(selectedProducts)}
            onComplete={() => {
              setIsBatchDialogOpen(false);
              setSelectedProducts(new Set());
              fetchProducts();
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

// 批量处理对话框组件
function BatchProcessDialog({ productIds, onComplete }: { productIds: string[], onComplete: () => void }) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [config, setConfig] = useState({
    shopId: '',
    targetLanguage: 'en',
    autoPublish: false,
  });
  const [shops, setShops] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/shops')
      .then(res => res.json())
      .then(data => {
        setShops(data.shops || []);
        if (data.shops?.length > 0) {
          setConfig(prev => ({ ...prev, shopId: data.shops[0].id }));
        }
      });
  }, []);

  const executeBatch = async () => {
    setIsProcessing(true);
    try {
      const response = await fetch('/api/automation/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productIds,
          ...config,
          processImages: false, // 批量处理默认不处理图片以提升速度
        }),
      });

      const data = await response.json();
      setResult(data);

      if (data.success) {
        setTimeout(onComplete, 2000);
      }
    } catch (error: any) {
      console.error('批量处理失败:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  if (isProcessing) {
    return (
      <div className="flex flex-col items-center justify-center py-8">
        <Loader2 className="h-12 w-12 animate-spin text-purple-600 mb-4" />
        <p className="font-medium">批量处理中...</p>
        <p className="text-sm text-slate-500 mt-2">
          正在处理 {productIds.length} 个商品
        </p>
      </div>
    );
  }

  if (result) {
    return (
      <div className="text-center py-8">
        <p className="text-lg font-medium text-green-600 mb-2">批量任务已提交</p>
        <p className="text-sm text-slate-500">{result.message}</p>
        <Button onClick={onComplete} className="mt-4">完成</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium">目标店铺</label>
        <Select 
          value={config.shopId} 
          onValueChange={(value) => setConfig(prev => ({ ...prev, shopId: value }))}
        >
          <SelectTrigger className="mt-1">
            <SelectValue placeholder="选择店铺" />
          </SelectTrigger>
          <SelectContent>
            {shops.map((shop) => (
              <SelectItem key={shop.id} value={shop.id}>
                <div className="flex items-center gap-2">
                  <span>{shop.shop_name}</span>
                  <Badge variant="outline">{shop.platform}</Badge>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <label className="text-sm font-medium">目标语言</label>
        <Select 
          value={config.targetLanguage} 
          onValueChange={(value) => setConfig(prev => ({ ...prev, targetLanguage: value }))}
        >
          <SelectTrigger className="mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="en">英语 (English)</SelectItem>
            <SelectItem value="th">泰语 (ไทย)</SelectItem>
            <SelectItem value="vi">越南语 (Tiếng Việt)</SelectItem>
            <SelectItem value="id">印尼语 (Bahasa Indonesia)</SelectItem>
            <SelectItem value="ms">马来语 (Bahasa Melayu)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <label className="text-sm font-medium">自动发布</label>
          <p className="text-xs text-slate-500">处理完成后自动发布到平台</p>
        </div>
        <input
          type="checkbox"
          checked={config.autoPublish}
          onChange={(e) => setConfig(prev => ({ ...prev, autoPublish: e.target.checked }))}
          className="h-4 w-4"
        />
      </div>

      <div className="bg-blue-50 p-3 rounded-lg">
        <p className="text-sm text-blue-800">
          <strong>提示：</strong>批量处理将在后台异步执行，预计耗时约 {Math.ceil(productIds.length * 30 / 3)} 秒
        </p>
      </div>

      <Button
        onClick={executeBatch}
        disabled={!config.shopId}
        className="w-full bg-gradient-to-r from-purple-600 to-pink-600"
      >
        <Zap className="mr-2 h-4 w-4" />
        开始批量处理
      </Button>
    </div>
  );
}
