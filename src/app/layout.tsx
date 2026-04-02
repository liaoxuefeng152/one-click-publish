import type { Metadata } from 'next';
import { Inspector } from 'react-dev-inspector';
import { AuthProvider } from '@/components/auth-provider';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Link2Global | 跨境电商自动化上架系统',
    template: '%s | Link2Global',
  },
  description:
    '跨境电商自动化上架平台，实现从1688采集到TikTok/Shopee发布的全流程自动化',
  keywords: [
    '跨境电商',
    '自动化上架',
    'TikTok Shop',
    'Shopee',
    '1688采集',
    '商品翻译',
    'ERP',
  ],
  authors: [{ name: 'Link2Global Team' }],
  generator: 'Coze Code',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const isDev = process.env.COZE_PROJECT_ENV === 'DEV';

  return (
    <html lang="zh-CN">
      <body className={`antialiased`}>
        <AuthProvider>
          {isDev && <Inspector />}
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
