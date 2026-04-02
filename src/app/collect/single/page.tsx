'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, Link2, Package, CheckCircle, AlertCircle, ArrowRight } from 'lucide-react';

interface CollectResult {
  id: string;
  title: string;
  price: number | null;
  images: string[];
  skus: any[];
}

export default function SingleCollectPage() {
  const router = useRouter();
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<CollectResult | null>(null);

  const handleCollect = async () => {
    if (!url.trim()) {
      setError('请输入商品链接');
      return;
    }

    // 验证1688链接
    if (!url.includes('1688.com') && !url.includes('detail.1688.com')) {
      setError('请输入有效的1688商品链接');
      return;
    }

    setError('');
    setIsLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/collect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || '采集失败');
        return;
      }

      setResult(data.product);
    } catch (err: any) {
      setError(err.message || '网络错误，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  const handleContinue = () => {
    if (result) {
      router.push(`/products/${result.id}/localize`);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">单链接采集</h1>
        <p className="text-slate-500 mt-1">输入1688商品链接，一键采集商品信息</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            商品链接
          </CardTitle>
          <CardDescription>
            支持1688.com商品详情页链接
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Input
              placeholder="https://detail.1688.com/offer/xxx.html"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={isLoading}
              className="flex-1"
            />
            <Button onClick={handleCollect} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  采集中...
                </>
              ) : (
                '开始采集'
              )}
            </Button>
          </div>
          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* 采集结果 */}
      {result && (
        <Card className="border-green-200 bg-green-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-700">
              <CheckCircle className="h-5 w-5" />
              采集成功
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* 商品图片 */}
              {result.images && result.images.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {result.images.slice(0, 5).map((img, index) => (
                    <img
                      key={index}
                      src={img}
                      alt={`商品图片 ${index + 1}`}
                      className="h-24 w-24 rounded-lg object-cover border"
                    />
                  ))}
                  {result.images.length > 5 && (
                    <div className="h-24 w-24 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 text-sm">
                      +{result.images.length - 5}
                    </div>
                  )}
                </div>
              )}

              {/* 商品信息 */}
              <div className="grid gap-2">
                <div>
                  <span className="text-sm text-slate-500">商品标题</span>
                  <p className="font-medium">{result.title}</p>
                </div>
                {result.price && (
                  <div>
                    <span className="text-sm text-slate-500">成本价</span>
                    <p className="text-xl font-bold text-red-600">¥{result.price}</p>
                  </div>
                )}
                {result.skus && result.skus.length > 0 && (
                  <div>
                    <span className="text-sm text-slate-500">SKU数量</span>
                    <p className="font-medium">{result.skus.length} 个规格</p>
                  </div>
                )}
              </div>

              {/* 操作按钮 */}
              <div className="flex gap-3 pt-2">
                <Button onClick={handleContinue}>
                  继续处理
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button variant="outline" onClick={() => {
                  setUrl('');
                  setResult(null);
                }}>
                  继续采集
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 使用说明 */}
      <Card>
        <CardHeader>
          <CardTitle>使用说明</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal list-inside space-y-2 text-sm text-slate-600">
            <li>打开1688网站，找到您想要采集的商品</li>
            <li>复制商品详情页的URL链接</li>
            <li>将链接粘贴到上方输入框中</li>
            <li>点击"开始采集"按钮，等待采集完成</li>
            <li>采集成功后，可继续进行本地化处理和发布</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
