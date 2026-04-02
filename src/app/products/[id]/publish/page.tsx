'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Send, Store, CheckCircle, AlertCircle, Package, DollarSign } from 'lucide-react';

interface Product {
  id: string;
  original_title: string;
  translated_title: string;
  original_images: string[];
  selling_price: number;
  target_language: string;
  status: string;
}

interface Shop {
  id: string;
  shop_name: string;
  platform: string;
  region: string;
  is_active: boolean;
}

export default function PublishPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params.id as string;

  const [product, setProduct] = useState<Product | null>(null);
  const [shops, setShops] = useState<Shop[]>([]);
  const [selectedShop, setSelectedShop] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isPublishing, setIsPublishing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetchData();
  }, [productId]);

  const fetchData = async () => {
    try {
      const [productRes, shopsRes] = await Promise.all([
        fetch(`/api/products/${productId}`),
        fetch('/api/shops'),
      ]);

      const productData = await productRes.json();
      const shopsData = await shopsRes.json();

      if (!productRes.ok) {
        throw new Error(productData.error || '获取商品失败');
      }

      setProduct(productData.product);
      setShops((shopsData.shops || []).filter((s: Shop) => s.is_active));

      if (shopsData.shops?.length > 0) {
        setSelectedShop(shopsData.shops[0].id);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePublish = async () => {
    if (!selectedShop) {
      setError('请选择目标店铺');
      return;
    }

    setIsPublishing(true);
    setError('');

    try {
      const response = await fetch('/api/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, shopId: selectedShop }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '发布失败');
      }

      setSuccess(true);
      setTimeout(() => {
        router.push('/products/drafts');
      }, 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsPublishing(false);
    }
  };

  const getRegionName = (code: string) => {
    const regions: Record<string, string> = {
      TH: '泰国',
      MY: '马来西亚',
      VN: '越南',
      ID: '印尼',
      PH: '菲律宾',
      UK: '英国',
      US: '美国',
    };
    return regions[code] || code;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!product) {
    return (
      <Alert variant="destructive">
        <AlertDescription>商品不存在</AlertDescription>
      </Alert>
    );
  }

  if (success) {
    return (
      <Card className="max-w-lg mx-auto">
        <CardContent className="flex flex-col items-center py-12">
          <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
          <h2 className="text-xl font-bold text-green-700">发布成功！</h2>
          <p className="text-slate-500 mt-2">商品已成功发布到目标平台</p>
          <Button className="mt-4" onClick={() => router.push('/products/drafts')}>
            返回商品列表
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">发布商品</h1>
        <p className="text-slate-500 mt-1">选择目标店铺并发布商品</p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* 商品信息 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              商品信息
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 商品图片 */}
            {product.original_images && product.original_images.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {product.original_images.slice(0, 5).map((img, index) => (
                  <img
                    key={index}
                    src={img}
                    alt={`商品图片 ${index + 1}`}
                    className="h-20 w-20 rounded-lg object-cover border"
                  />
                ))}
              </div>
            )}

            <div>
              <label className="text-sm font-medium text-slate-500">商品标题</label>
              <p className="mt-1 font-medium">
                {product.translated_title || product.original_title}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-500">售价</label>
                <p className="mt-1 text-xl font-bold text-green-600">
                  {product.selling_price || '未设置'}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-500">目标语言</label>
                <p className="mt-1 font-medium">
                  {product.target_language?.toUpperCase() || '未设置'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 发布设置 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Store className="h-5 w-5" />
              发布设置
            </CardTitle>
            <CardDescription>选择目标店铺进行发布</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {shops.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <Store className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>暂无授权店铺</p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => router.push('/platforms/tiktok')}
                >
                  前往添加店铺
                </Button>
              </div>
            ) : (
              <>
                <div>
                  <label className="text-sm font-medium">选择店铺</label>
                  <Select value={selectedShop} onValueChange={setSelectedShop}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="选择目标店铺" />
                    </SelectTrigger>
                    <SelectContent>
                      {shops.map((shop) => (
                        <SelectItem key={shop.id} value={shop.id}>
                          <div className="flex items-center gap-2">
                            <span>{shop.shop_name}</span>
                            <Badge variant="outline">{shop.platform}</Badge>
                            <span className="text-xs text-slate-500">
                              {getRegionName(shop.region)}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="pt-4">
                  <Button
                    onClick={handlePublish}
                    disabled={isPublishing || !product.selling_price}
                    className="w-full"
                  >
                    {isPublishing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        发布中...
                      </>
                    ) : (
                      <>
                        <Send className="mr-2 h-4 w-4" />
                        立即发布
                      </>
                    )}
                  </Button>
                  {!product.selling_price && (
                    <p className="text-sm text-yellow-600 mt-2 text-center">
                      请先设置商品售价
                    </p>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 发布说明 */}
      <Card>
        <CardHeader>
          <CardTitle>发布说明</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal list-inside space-y-2 text-sm text-slate-600">
            <li>选择要发布的目标店铺（TikTok Shop / Shopee）</li>
            <li>确认商品信息已正确翻译和定价</li>
            <li>点击"立即发布"按钮开始发布</li>
            <li>等待发布完成，可在商品管理中查看发布状态</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
