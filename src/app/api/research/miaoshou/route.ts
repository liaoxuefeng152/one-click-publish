import { NextRequest, NextResponse } from 'next/server';
import { SearchClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';

export async function POST(request: NextRequest) {
  try {
    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const config = new Config();
    const client = new SearchClient(config, customHeaders);
    
    // 搜索妙手ERP相关信息
    const response = await client.advancedSearch('妙手ERP 跨境电商 商品采集 一键发布 API对接 Shopee TikTok', {
      searchType: 'web',
      count: 10,
      needContent: true,
      timeRange: '1y',
    });
    
    return NextResponse.json({
      summary: response.summary,
      results: response.web_items.map(item => ({
        title: item.title,
        url: item.url,
        site: item.site_name,
        snippet: item.snippet,
        content: item.content?.substring(0, 500),
      })),
    });
  } catch (error) {
    console.error('搜索错误:', error);
    return NextResponse.json(
      { error: '搜索失败' },
      { status: 500 }
    );
  }
}
