import { AppLayout } from '@/components/layout';
import DashboardContent from './DashboardContent';

// 完全使用客户端渲染，避免服务端 cookie 同步问题
export default function DashboardPage() {
  return <DashboardContent />;
}
