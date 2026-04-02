import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { HeaderUtils, FetchClient, Config, LLMClient } from 'coze-coding-dev-sdk';
import { getCurrentUser } from '@/lib/auth';

/**
 * 采集1688商品信息
 * 
 * 使用 FetchClient 获取页面 + LLM 智能解析提取商品信息
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const { url } = await request.json();
    if (!url) {
      return NextResponse.json({ error: '请提供商品链接' }, { status: 400 });
    }

    // 验证URL格式
    if (!url.includes('1688.com') && !url.includes('alibaba.com')) {
      return NextResponse.json({ error: '请提供有效的1688或阿里巴巴商品链接' }, { status: 400 });
    }

    // 检查是否已经采集过
    const client = getSupabaseClient();
    const { data: existingProduct } = await client
      .from('products')
      .select('id')
      .eq('user_id', user.id)
      .eq('source_url', url)
      .maybeSingle();

    if (existingProduct) {
      return NextResponse.json({ 
        error: '该商品已采集过', 
        productId: existingProduct.id 
      }, { status: 400 });
    }

    // 创建采集任务
    const { data: task, error: taskError } = await client
      .from('tasks')
      .insert({
        user_id: user.id,
        type: 'collect',
        status: 'processing',
        source_url: url,
      })
      .select()
      .single();

    if (taskError || !task) {
      return NextResponse.json({ error: '创建任务失败' }, { status: 500 });
    }

    try {
      const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
      
      // 步骤1: 使用 FetchClient 获取页面内容
      console.log('[采集] 开始获取页面:', url);
      const fetchClient = new FetchClient(new Config(), customHeaders);
      const fetchResponse = await fetchClient.fetch(url);

      if (fetchResponse.status_code !== 0) {
        throw new Error(`获取页面失败: ${fetchResponse.status_message || '未知错误'}`);
      }

      // 提取文本内容
      const textContent = fetchResponse.content
        .filter((item: any) => item.type === 'text')
        .map((item: any) => item.text)
        .join('\n');

      // 提取图片URL
      const imageUrls = fetchResponse.content
        .filter((item: any) => item.type === 'image' && item.image?.display_url)
        .map((item: any) => item.image.display_url);

      console.log('[采集] 获取到文本长度:', textContent.length);
      console.log('[采集] 获取到图片数量:', imageUrls.length);

      // 步骤2: 使用 LLM 智能解析商品信息
      console.log('[采集] 开始LLM解析');
      const llmClient = new LLMClient(new Config(), customHeaders);
      
      const parsePrompt = `你是一个专业的电商数据提取专家。请从以下网页内容中提取商品信息。

网页内容：
${textContent.substring(0, 8000)}

请提取以下信息，并以JSON格式返回（只返回JSON，不要其他内容）：
{
  "title": "商品标题",
  "price": 价格数字（如：29.9），
  "priceUnit": "价格单位（元/件等）",
  "description": "商品描述（简短描述，不超过200字）",
  "minOrderQuantity": 最小起订量数字,
  "supplier": "供应商名称",
  "category": "商品类目"
}

注意：
1. 如果找不到某个字段，设为 null
2. 价格提取数字部分即可
3. 只返回JSON，不要其他文字`;

      const llmResponse = await llmClient.invoke([
        { role: 'user', content: parsePrompt }
      ], { temperature: 0.1 });

      // 解析LLM返回的JSON
      let productInfo: any = {};
      try {
        // 提取JSON部分
        const jsonMatch = llmResponse.content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          productInfo = JSON.parse(jsonMatch[0]);
        }
      } catch (parseError) {
        console.error('[采集] JSON解析失败:', parseError);
      }

      console.log('[采集] LLM解析结果:', productInfo);

      // 从URL提取商品ID
      const sourceIdMatch = url.match(/offer\/(\d+)\.html/);
      const sourceId = sourceIdMatch ? sourceIdMatch[1] : null;

      // 如果没有标题，使用页面标题
      if (!productInfo.title && fetchResponse.title) {
        productInfo.title = fetchResponse.title;
      }

      // 如果还是没有标题，使用默认值
      if (!productInfo.title) {
        productInfo.title = `商品 ${sourceId || '未知'}`;
      }

      // 创建商品记录
      const { data: product, error: productError } = await client
        .from('products')
        .insert({
          user_id: user.id,
          source_url: url,
          source_id: sourceId,
          original_title: productInfo.title,
          original_description: productInfo.description || '',
          original_price: productInfo.price ? parseFloat(productInfo.price) : null,
          original_images: imageUrls.slice(0, 10), // 最多保存10张图片
          status: 'draft',
          weight: productInfo.weight || null,
        })
        .select()
        .single();

      if (productError || !product) {
        throw new Error('创建商品记录失败');
      }

      // 更新任务状态
      await client
        .from('tasks')
        .update({
          status: 'completed',
          product_id: product.id,
          completed_at: new Date().toISOString(),
        })
        .eq('id', task.id);

      console.log('[采集] 采集成功, 商品ID:', product.id);

      return NextResponse.json({
        success: true,
        product: {
          id: product.id,
          title: productInfo.title,
          price: productInfo.price,
          priceUnit: productInfo.priceUnit,
          description: productInfo.description,
          minOrderQuantity: productInfo.minOrderQuantity,
          supplier: productInfo.supplier,
          category: productInfo.category,
          images: imageUrls.slice(0, 5),
          imageCount: imageUrls.length,
        },
      });
    } catch (collectError: any) {
      console.error('[采集] 采集失败:', collectError);
      
      // 更新任务失败状态
      await client
        .from('tasks')
        .update({
          status: 'failed',
          error_message: collectError.message,
        })
        .eq('id', task.id);

      throw collectError;
    }
  } catch (error: any) {
    console.error('采集错误:', error);
    return NextResponse.json(
      { error: error.message || '采集失败，请重试' },
      { status: 500 }
    );
  }
}

// 批量采集
export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const { urls } = await request.json();
    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json({ error: '请提供商品链接列表' }, { status: 400 });
    }

    const client = getSupabaseClient();
    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const fetchClient = new FetchClient(new Config(), customHeaders);
    const llmClient = new LLMClient(new Config(), customHeaders);

    const results: any[] = [];

    for (const url of urls) {
      try {
        // 检查是否已采集
        const { data: existing } = await client
          .from('products')
          .select('id')
          .eq('user_id', user.id)
          .eq('source_url', url)
          .maybeSingle();

        if (existing) {
          results.push({ url, status: 'skipped', reason: '已采集过' });
          continue;
        }

        // 创建任务
        const { data: task } = await client
          .from('tasks')
          .insert({
            user_id: user.id,
            type: 'collect',
            status: 'processing',
            source_url: url,
          })
          .select()
          .single();

        // 获取页面内容
        const fetchResponse = await fetchClient.fetch(url);
        
        if (fetchResponse.status_code !== 0) {
          throw new Error(fetchResponse.status_message || '获取页面失败');
        }

        // 提取内容
        const textContent = fetchResponse.content
          .filter((item: any) => item.type === 'text')
          .map((item: any) => item.text)
          .join('\n');

        const imageUrls = fetchResponse.content
          .filter((item: any) => item.type === 'image' && item.image?.display_url)
          .map((item: any) => item.image.display_url);

        // LLM解析
        const parsePrompt = `提取商品信息，只返回JSON格式：
{"title":"标题","price":价格数字,"description":"描述"}
内容：${textContent.substring(0, 5000)}`;

        const llmResponse = await llmClient.invoke([
          { role: 'user', content: parsePrompt }
        ], { temperature: 0.1 });

        let productInfo: any = {};
        try {
          const jsonMatch = llmResponse.content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            productInfo = JSON.parse(jsonMatch[0]);
          }
        } catch (e) {}

        if (!productInfo.title) {
          productInfo.title = fetchResponse.title || '未知商品';
        }

        // 创建商品
        const { data: product } = await client
          .from('products')
          .insert({
            user_id: user.id,
            source_url: url,
            source_id: url.match(/offer\/(\d+)\.html/)?.[1] || null,
            original_title: productInfo.title,
            original_description: productInfo.description || '',
            original_price: productInfo.price ? parseFloat(productInfo.price) : null,
            original_images: imageUrls.slice(0, 10),
            status: 'draft',
          })
          .select()
          .single();

        // 更新任务
        await client
          .from('tasks')
          .update({
            status: 'completed',
            product_id: product?.id,
            completed_at: new Date().toISOString(),
          })
          .eq('id', task?.id);

        results.push({ 
          url, 
          status: 'success', 
          productId: product?.id,
          title: productInfo.title 
        });
      } catch (error: any) {
        results.push({ url, status: 'failed', error: error.message });
      }
    }

    return NextResponse.json({ results });
  } catch (error: any) {
    console.error('批量采集错误:', error);
    return NextResponse.json(
      { error: error.message || '批量采集失败' },
      { status: 500 }
    );
  }
}
