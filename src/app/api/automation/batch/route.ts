import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getSupabaseClient } from '@/storage/database/supabase-client';

/**
 * 批量自动化工作流API
 * 
 * 支持批量商品的自动化处理
 */

interface BatchConfig {
  productIds: string[];
  shopId: string;
  targetLanguage: string;
  processImages?: boolean;
  autoPublish?: boolean;
  pricingRuleId?: string;
  concurrency?: number; // 并发数
}

/**
 * 执行批量自动化
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const config: BatchConfig = await request.json();
    const { 
      productIds, 
      shopId, 
      targetLanguage = 'en',
      processImages = false, // 批量处理默认不处理图片以提升速度
      autoPublish = false,
      pricingRuleId,
      concurrency = 3 // 默认并发数为3
    } = config;

    if (!productIds || productIds.length === 0) {
      return NextResponse.json(
        { error: '请选择要处理的商品' },
        { status: 400 }
      );
    }

    if (!shopId) {
      return NextResponse.json(
        { error: '请选择目标店铺' },
        { status: 400 }
      );
    }

    const client = getSupabaseClient();

    // 创建批量任务
    const { data: batchTask } = await client
      .from('tasks')
      .insert({
        user_id: user.id,
        type: 'batch_automation',
        status: 'processing',
        details: {
          productIds,
          shopId,
          targetLanguage,
          processImages,
          autoPublish,
          pricingRuleId,
          concurrency,
        },
      })
      .select()
      .single();

    // 异步执行批量处理（不阻塞响应）
    executeBatchPipeline(config, user.id, batchTask?.id);

    return NextResponse.json({
      success: true,
      batchTaskId: batchTask?.id,
      message: `已开始处理 ${productIds.length} 个商品`,
      estimatedTime: `${Math.ceil(productIds.length * 60 / concurrency)}秒`,
      tip: '您可以在"任务管理"中查看处理进度',
    });
  } catch (error: any) {
    console.error('批量自动化错误:', error);
    return NextResponse.json(
      { error: error.message || '批量处理失败' },
      { status: 500 }
    );
  }
}

/**
 * 异步执行批量处理
 */
async function executeBatchPipeline(
  config: BatchConfig, 
  userId: string, 
  batchTaskId: string
) {
  const { productIds, shopId, targetLanguage, processImages, autoPublish, pricingRuleId, concurrency = 3 } = config;
  const client = getSupabaseClient();
  
  const results: any[] = [];
  const startTime = Date.now();

  try {
    // 分批并发处理
    for (let i = 0; i < productIds.length; i += concurrency) {
      const batch = productIds.slice(i, i + concurrency);
      
      // 并发执行当前批次
      const batchPromises = batch.map(async (productId) => {
        try {
          // 调用单个商品的工作流API
          const response = await fetch(
            `${process.env.COZE_PROJECT_DOMAIN_DEFAULT}/api/automation/pipeline`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                productId,
                shopId,
                targetLanguage,
                processImages,
                autoPublish,
                pricingRuleId,
              }),
            }
          );

          const result = await response.json();
          
          return {
            productId,
            success: result.success,
            duration: result.totalDuration,
            error: result.error,
          };
        } catch (error: any) {
          return {
            productId,
            success: false,
            error: error.message,
          };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // 更新进度
      const progress = Math.round(((i + batch.length) / productIds.length) * 100);
      await client
        .from('tasks')
        .update({
          details: {
            productIds,
            shopId,
            targetLanguage,
            processImages,
            autoPublish,
            pricingRuleId,
            concurrency,
            progress,
            processedCount: i + batch.length,
            totalCount: productIds.length,
          },
        })
        .eq('id', batchTaskId);
    }

    // 完成
    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    await client
      .from('tasks')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        result: {
          totalDuration: Date.now() - startTime,
          successCount,
          failCount,
          results,
        },
      })
      .eq('id', batchTaskId);
  } catch (error: any) {
    await client
      .from('tasks')
      .update({
        status: 'failed',
        error_message: error.message,
        result: {
          totalDuration: Date.now() - startTime,
          processedCount: results.length,
          results,
        },
      })
      .eq('id', batchTaskId);
  }
}

/**
 * 获取批量任务状态
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const batchTaskId = searchParams.get('batchTaskId');

    if (!batchTaskId) {
      return NextResponse.json(
        { error: '缺少任务ID' },
        { status: 400 }
      );
    }

    const client = getSupabaseClient();
    const { data: task, error } = await client
      .from('tasks')
      .select('*')
      .eq('id', batchTaskId)
      .eq('user_id', user.id)
      .single();

    if (error || !task) {
      return NextResponse.json(
        { error: '任务不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      task: {
        id: task.id,
        status: task.status,
        progress: task.details?.progress || 0,
        processedCount: task.details?.processedCount || 0,
        totalCount: task.details?.totalCount || 0,
        createdAt: task.created_at,
        completedAt: task.completed_at,
        result: task.result,
        error: task.error_message,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || '获取任务失败' },
      { status: 500 }
    );
  }
}
