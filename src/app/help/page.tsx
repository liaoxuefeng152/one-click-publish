'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AppLayout } from '@/components/layout';
import { Loader2, Search, Book, Package, Globe, DollarSign, Send, Key, HelpCircle, MessageCircle } from 'lucide-react';

interface User {
  id: string;
  email: string;
  name?: string;
  role: string;
}

const faqData = {
  beginner: [
    {
      question: '如何开始使用 Link2Global？',
      answer: '1. 注册账号并登录系统\n2. 在"平台管理"中授权您的 TikTok Shop 或 Shopee 店铺\n3. 使用"商品采集"功能从1688采集商品\n4. 完成本地化处理和定价后，一键发布到平台',
    },
    {
      question: '支持哪些采集来源？',
      answer: '目前支持从1688采集商品信息，包括商品标题、主图、详情图、SKU规格等。后续将支持淘宝、拼多多等平台。',
    },
    {
      question: '支持哪些目标平台？',
      answer: '目前支持 TikTok Shop（泰国、越南、马来西亚、菲律宾、印尼站）和 Shopee（各东南亚站点）。',
    },
    {
      question: '如何授权店铺？',
      answer: '进入"平台管理"→选择对应平台→点击"添加店铺授权"→按照提示完成API授权配置即可。',
    },
  ],
  collect: [
    {
      question: '采集失败怎么办？',
      answer: '常见原因：\n1. 链接格式不正确，请检查是否为1688商品详情页链接\n2. 被反爬拦截，请稍后重试或更换IP\n3. 商品已下架或链接失效\n\n如持续失败，请联系客服。',
    },
    {
      question: '为什么采集的图片不完整？',
      answer: '部分商品图片可能被防盗链保护，建议：\n1. 检查采集选项是否勾选了"采集详情图"\n2. 尝试重新采集\n3. 手动下载图片后上传',
    },
    {
      question: '批量采集支持多少个链接？',
      answer: '单次批量采集支持最多100个链接，建议分批进行以确保采集质量。',
    },
  ],
  localize: [
    {
      question: '支持哪些目标语言？',
      answer: '支持翻译为：泰语、越南语、印尼语、马来语、英语。可在"系统设置→翻译设置"中修改默认语言。',
    },
    {
      question: '翻译不准确怎么办？',
      answer: '系统支持手动编辑翻译结果。建议：\n1. 使用"标题优化"功能自动调整\n2. 手动修改关键信息\n3. 在翻译设置中更换翻译API',
    },
    {
      question: '图片中的文字能翻译吗？',
      answer: '支持。在"图片设置"中开启"OCR翻译图片文字"选项，系统会自动识别图片中的中文并翻译替换。',
    },
  ],
  pricing: [
    {
      question: '定价公式是什么？',
      answer: '售价 = (1688成本 + 国内运费) × 汇率 × 利润率 + 跨境物流 + 平台佣金 + 安全边际\n\n各参数可在"定价设置"中自定义配置。',
    },
    {
      question: '如何设置利润率？',
      answer: '进入"定价规则"页面，可设置默认利润率（1.0x-3.0x）。单商品定价时也可手动调整。',
    },
    {
      question: '汇率如何获取？',
      answer: '系统默认使用实时汇率，您也可以在"定价设置"中手动设置固定汇率。',
    },
  ],
  publish: [
    {
      question: '发布失败常见原因？',
      answer: '1. 店铺授权已过期，请重新授权\n2. 商品类目不匹配，请手动选择正确类目\n3. 图片不符合平台规范\n4. 价格超出平台限制范围\n5. SKU数量超过平台限制',
    },
    {
      question: '如何查看已发布商品？',
      answer: '进入"商品管理→已发布商品"页面，可查看所有已发布商品的链接和状态。',
    },
    {
      question: '发布后可以修改吗？',
      answer: '可以。在"已发布商品"页面找到对应商品，点击"同步库存"或跳转平台编辑。',
    },
  ],
  api: [
    {
      question: '如何获取 TikTok Shop API 授权？',
      answer: '1. 登录 TikTok 卖家中心\n2. 进入"设置→开发者选项"\n3. 创建应用并获取 App ID 和 App Secret\n4. 配置回调地址后完成授权',
    },
    {
      question: 'Shopee 授权需要什么材料？',
      answer: '需要准备：\n1. Shopee 卖家账号（企业认证）\n2. Partner ID\n3. API Key 和 Secret Key\n\n获取方式：登录 Shopee 开放平台创建应用。',
    },
    {
      question: '授权过期了怎么办？',
      answer: '进入"平台管理"找到对应店铺，点击"测试连接"检查状态。如已过期，请重新授权。',
    },
  ],
};

export default function HelpPage() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('beginner');

  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        if (data.user) {
          setUser(data.user);
        }
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const getFilteredFaqs = () => {
    const faqs = faqData[activeTab as keyof typeof faqData] || [];
    if (!searchTerm) return faqs;
    return faqs.filter(
      faq => 
        faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
        faq.answer.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, React.ReactNode> = {
      beginner: <Book className="h-4 w-4" />,
      collect: <Package className="h-4 w-4" />,
      localize: <Globe className="h-4 w-4" />,
      pricing: <DollarSign className="h-4 w-4" />,
      publish: <Send className="h-4 w-4" />,
      api: <Key className="h-4 w-4" />,
    };
    return icons[category] || <HelpCircle className="h-4 w-4" />;
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      beginner: '新手引导',
      collect: '采集相关',
      localize: '本地化处理',
      pricing: '定价相关',
      publish: '发布相关',
      api: 'API授权',
    };
    return labels[category] || category;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <AppLayout user={user}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">帮助中心</h1>
          <p className="text-slate-500 mt-1">查找常见问题解答和使用指南</p>
        </div>

        {/* 搜索 */}
        <Card>
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <Input
                placeholder="搜索问题..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-12 text-lg"
              />
            </div>
          </CardContent>
        </Card>

        {/* 分类和FAQ */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-3 lg:grid-cols-6 gap-2 h-auto">
            {Object.keys(faqData).map((category) => (
              <TabsTrigger
                key={category}
                value={category}
                className="flex items-center gap-2 py-2"
              >
                {getCategoryIcon(category)}
                <span className="hidden sm:inline">{getCategoryLabel(category)}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {Object.keys(faqData).map((category) => (
            <TabsContent key={category} value={category}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {getCategoryIcon(category)}
                    {getCategoryLabel(category)}
                  </CardTitle>
                  <CardDescription>
                    {getFilteredFaqs().length} 个问题
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Accordion type="single" collapsible className="space-y-2">
                    {getFilteredFaqs().map((faq, index) => (
                      <AccordionItem
                        key={index}
                        value={`item-${index}`}
                        className="border rounded-lg px-4"
                      >
                        <AccordionTrigger className="text-left font-medium hover:no-underline">
                          {faq.question}
                        </AccordionTrigger>
                        <AccordionContent className="text-slate-600 whitespace-pre-line">
                          {faq.answer}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                    {getFilteredFaqs().length === 0 && (
                      <div className="text-center py-8 text-slate-500">
                        <HelpCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>未找到相关问题</p>
                      </div>
                    )}
                  </Accordion>
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>

        {/* 联系支持 */}
        <Card>
          <CardHeader>
            <CardTitle>需要更多帮助？</CardTitle>
            <CardDescription>如果您没有找到答案，可以联系我们的客服团队</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row gap-4">
            <Button variant="outline" className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4" />
              在线客服
            </Button>
            <Button variant="outline" className="flex items-center gap-2">
              <HelpCircle className="h-4 w-4" />
              提交工单
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
