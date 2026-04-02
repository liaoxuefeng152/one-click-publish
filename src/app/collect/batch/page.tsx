'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, Upload, CheckCircle, AlertCircle, Package } from 'lucide-react';

interface BatchResult {
  url: string;
  status: 'success' | 'failed' | 'skipped';
  productId?: string;
  reason?: string;
  error?: string;
}

export default function BatchCollectPage() {
  const router = useRouter();
  const [urls, setUrls] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<BatchResult[]>([]);
  const [stats, setStats] = useState({ total: 0, success: 0, failed: 0, skipped: 0 });

  const handleBatchCollect = async () => {
    const urlList = urls
      .split('\n')
      .map((url) => url.trim())
      .filter((url) => url.length > 0);

    if (urlList.length === 0) {
      return;
    }

    setIsLoading(true);
    setResults([]);
    setStats({ total: urlList.length, success: 0, failed: 0, skipped: 0 });

    try {
      const response = await fetch('/api/collect', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls: urlList }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '批量采集失败');
      }

      setResults(data.results);
      
      const newStats = {
        total: data.results.length,
        success: data.results.filter((r: BatchResult) => r.status === 'success').length,
        failed: data.results.filter((r: BatchResult) => r.status === 'failed').length,
        skipped: data.results.filter((r: BatchResult) => r.status === 'skipped').length,
      };
      setStats(newStats);
    } catch (error: any) {
      console.error('批量采集错误:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-100 text-green-700">成功</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-700">失败</Badge>;
      case 'skipped':
        return <Badge className="bg-yellow-100 text-yellow-700">已跳过</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">批量采集</h1>
        <p className="text-slate-500 mt-1">粘贴多个1688商品链接，批量采集商品信息</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            商品链接列表
          </CardTitle>
          <CardDescription>
            每行一个链接，支持批量采集多个商品
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder={`https://detail.1688.com/offer/xxx.html
https://detail.1688.com/offer/yyy.html
https://detail.1688.com/offer/zzz.html`}
            value={urls}
            onChange={(e) => setUrls(e.target.value)}
            disabled={isLoading}
            className="min-h-[200px] font-mono text-sm"
          />
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-slate-500">
              已输入 {urls.split('\n').filter((url) => url.trim().length > 0).length} 个链接
            </p>
            <Button onClick={handleBatchCollect} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  采集中...
                </>
              ) : (
                '开始批量采集'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 采集结果 */}
      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              采集结果
            </CardTitle>
            <div className="flex gap-4 mt-2">
              <div className="text-sm">
                <span className="text-slate-500">总计：</span>
                <span className="font-medium">{stats.total}</span>
              </div>
              <div className="text-sm">
                <span className="text-slate-500">成功：</span>
                <span className="font-medium text-green-600">{stats.success}</span>
              </div>
              <div className="text-sm">
                <span className="text-slate-500">失败：</span>
                <span className="font-medium text-red-600">{stats.failed}</span>
              </div>
              <div className="text-sm">
                <span className="text-slate-500">跳过：</span>
                <span className="font-medium text-yellow-600">{stats.skipped}</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {results.map((result, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 rounded-lg bg-slate-50"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-mono truncate">{result.url}</p>
                    {result.reason && (
                      <p className="text-xs text-yellow-600 mt-1">{result.reason}</p>
                    )}
                    {result.error && (
                      <p className="text-xs text-red-600 mt-1">{result.error}</p>
                    )}
                  </div>
                  {getStatusBadge(result.status)}
                </div>
              ))}
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
            <li>准备要采集的1688商品链接列表</li>
            <li>将链接粘贴到上方文本框中，每行一个链接</li>
            <li>点击"开始批量采集"按钮</li>
            <li>等待采集完成，查看采集结果</li>
            <li>已采集的商品可在"商品管理"中继续处理</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
