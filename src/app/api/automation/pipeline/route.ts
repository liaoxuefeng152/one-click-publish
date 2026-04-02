import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { LLMClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';
import { createPlatformAPI } from '@/lib/platform-api';

/**
 * 全自动化工作流API
 * 
 * 一键式端到端处理：采集 → 翻译 → 图片处理 → 定价 → 发布
 * 单商品处理耗时目标：≤90秒
 */

interface PipelineConfig {
  productId: string;
  shopId: string;
  targetLanguage: string;
  processImages?: boolean;
  autoPublish?: boolean;
  pricingRuleId?: string;
}

interface PipelineResult {
  step: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'skipped';
  startTime: number;
  endTime?: number;
  duration?: number;
  result?: any;
  error?: string;
}

/**
 * 执行全自动化工作流
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let pipelineResults: PipelineResult[] = [];
  
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const config: PipelineConfig = await request.json();
    const { 
      productId, 
      shopId, 
      targetLanguage = 'en',
      processImages = true,
      autoPublish = false,
      pricingRuleId
    } = config;

    if (!productId || !shopId) {
      return NextResponse.json(
        { error: '缺少必要参数' },
        { status: 400 }
      );
    }

    const client = getSupabaseClient();
    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const llmClient = new LLMClient(new Config(), customHeaders);

    // 创建自动化任务
    const { data: task } = await client
      .from('tasks')
      .insert({
        user_id: user.id,
        type: 'automation_pipeline',
        status: 'processing',
        product_id: productId,
        details: {
          shopId,
          targetLanguage,
          processImages,
          autoPublish,
          pricingRuleId,
        },
      })
      .select()
      .single();

    // pipelineResults 已移到函数开头
    let totalDuration = 0;

    try {
      // ==================== 步骤1: 翻译（含违禁词检测） ====================
      const step1Start = Date.now();
      pipelineResults.push({
        step: 'translate',
        status: 'processing',
        startTime: step1Start,
      });

      try {
        const translateResponse = await fetch(
          `${process.env.COZE_PROJECT_DOMAIN_DEFAULT}/api/translate`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...customHeaders },
            body: JSON.stringify({
              productId,
              targetLanguage,
              skipProhibitedCheck: false,
            }),
          }
        );

        const translateData = await translateResponse.json();
        
        if (!translateResponse.ok) {
          throw new Error(translateData.error || '翻译失败');
        }

        pipelineResults[0].status = 'completed';
        pipelineResults[0].endTime = Date.now();
        pipelineResults[0].duration = pipelineResults[0].endTime - step1Start;
        pipelineResults[0].result = {
          translatedTitle: translateData.translatedTitle,
          prohibitedWordsFound: translateData.prohibitedWords?.translated?.length || 0,
        };
      } catch (error: any) {
        pipelineResults[0].status = 'failed';
        pipelineResults[0].error = error.message;
        throw error;
      }

      // ==================== 步骤2: 图片处理（可选） ====================
      if (processImages) {
        const step2Start = Date.now();
        pipelineResults.push({
          step: 'image_processing',
          status: 'processing',
          startTime: step2Start,
        });

        try {
          // 获取商品图片
          const { data: product } = await client
            .from('products')
            .select('original_images')
            .eq('id', productId)
            .single();

          if (product?.original_images && product.original_images.length > 0) {
            // 批量处理图片（只处理前3张以控制时间）
            const processedImages: string[] = [];
            
            for (let i = 0; i < Math.min(3, product.original_images.length); i++) {
              const imageUrl = product.original_images[i];
              
              // 综合处理：OCR + 翻译 + 水印检测
              const processResponse = await fetch(
                `${process.env.COZE_PROJECT_DOMAIN_DEFAULT}/api/image-process`,
                {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    action: 'process-all',
                    imageUrl,
                    targetLanguage,
                  }),
                }
              );

              if (processResponse.ok) {
                const processData = await processResponse.json();
                processedImages.push(imageUrl);
              }
            }

            pipelineResults[1].status = 'completed';
            pipelineResults[1].endTime = Date.now();
            pipelineResults[1].duration = pipelineResults[1].endTime - step2Start;
            pipelineResults[1].result = {
              processedCount: processedImages.length,
            };
          } else {
            pipelineResults[1].status = 'skipped';
            pipelineResults[1].endTime = Date.now();
            pipelineResults[1].duration = 0;
            pipelineResults[1].result = { reason: '无图片需要处理' };
          }
        } catch (error: any) {
          pipelineResults[1].status = 'failed';
          pipelineResults[1].error = error.message;
          // 图片处理失败不中断流程
          console.warn('图片处理失败，继续后续步骤:', error.message);
        }
      }

      // ==================== 步骤3: 智能定价 ====================
      const step3Start = Date.now();
      pipelineResults.push({
        step: 'pricing',
        status: 'processing',
        startTime: step3Start,
      });

      try {
        // 如果提供了定价规则ID，使用规则计算
        if (pricingRuleId) {
          const pricingResponse = await fetch(
            `${process.env.COZE_PROJECT_DOMAIN_DEFAULT}/api/pricing/calculate`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                productId,
                ruleId: pricingRuleId,
              }),
            }
          );

          if (pricingResponse.ok) {
            const pricingData = await pricingResponse.json();
            
            pipelineResults[2].status = 'completed';
            pipelineResults[2].endTime = Date.now();
            pipelineResults[2].duration = pipelineResults[2].endTime - step3Start;
            pipelineResults[2].result = {
              sellingPrice: pricingData.sellingPrice,
              profitMargin: pricingData.profitMargin,
            };
          } else {
            throw new Error('定价计算失败');
          }
        } else {
          // 使用默认定价策略（成本价 * 1.5）
          const { data: product } = await client
            .from('products')
            .select('original_price')
            .eq('id', productId)
            .single();

          if (product?.original_price) {
            const sellingPrice = Math.ceil(product.original_price * 1.5 * 100) / 100;
            
            await client
              .from('products')
              .update({ selling_price: sellingPrice })
              .eq('id', productId);

            pipelineResults[2].status = 'completed';
            pipelineResults[2].endTime = Date.now();
            pipelineResults[2].duration = pipelineResults[2].endTime - step3Start;
            pipelineResults[2].result = {
              sellingPrice: sellingPrice,
              strategy: '默认定价（成本价 × 1.5）',
            };
          } else {
            throw new Error('缺少商品成本价');
          }
        }
      } catch (error: any) {
        pipelineResults[2].status = 'failed';
        pipelineResults[2].error = error.message;
        throw error;
      }

      // ==================== 步骤4: 自动发布（可选） ====================
      if (autoPublish) {
        const step4Start = Date.now();
        pipelineResults.push({
          step: 'publish',
          status: 'processing',
          startTime: step4Start,
        });

        try {
          const publishResponse = await fetch(
            `${process.env.COZE_PROJECT_DOMAIN_DEFAULT}/api/publish`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                productId,
                shopId,
                autoMatch: true,
              }),
            }
          );

          const publishData = await publishResponse.json();

          if (!publishResponse.ok) {
            throw new Error(publishData.error || '发布失败');
          }

          pipelineResults[3].status = 'completed';
          pipelineResults[3].endTime = Date.now();
          pipelineResults[3].duration = pipelineResults[3].endTime - step4Start;
          pipelineResults[3].result = {
            platformProductId: publishData.platformProductId,
            platform: publishData.details?.platform,
          };
        } catch (error: any) {
          pipelineResults[3].status = 'failed';
          pipelineResults[3].error = error.message;
          // 发布失败不抛出异常，允许用户手动发布
        }
      }

      // ==================== 完成 ====================
      totalDuration = Date.now() - startTime;

      // 更新任务状态
      await client
        .from('tasks')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          result: {
            totalDuration,
            pipelineResults,
            successRate: pipelineResults.filter(r => r.status === 'completed').length / pipelineResults.length,
          },
        })
        .eq('id', task?.id);

      return NextResponse.json({
        success: true,
        productId,
        totalDuration: `${(totalDuration / 1000).toFixed(1)}秒`,
        pipelineResults,
        summary: {
          totalSteps: pipelineResults.length,
          completedSteps: pipelineResults.filter(r => r.status === 'completed').length,
          failedSteps: pipelineResults.filter(r => r.status === 'failed').length,
          successRate: `${Math.round((pipelineResults.filter(r => r.status === 'completed').length / pipelineResults.length) * 100)}%`,
        },
        meetsPerformanceTarget: totalDuration <= 90000, // 是否满足≤90秒要求
      });
    } catch (error: any) {
      // 更新任务失败状态
      await client
        .from('tasks')
        .update({
          status: 'failed',
          error_message: error.message,
          result: {
            totalDuration: Date.now() - startTime,
            pipelineResults,
          },
        })
        .eq('id', task?.id);

      throw error;
    }
  } catch (error: any) {
    console.error('自动化流程错误:', error);
    return NextResponse.json(
      { 
        error: error.message || '自动化流程失败',
        pipelineResults: pipelineResults || [],
      },
      { status: 500 }
    );
  }
}

/**
 * 获取工作流状态
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const taskId = searchParams.get('taskId');

    if (!taskId) {
      return NextResponse.json(
        { error: '缺少任务ID' },
        { status: 400 }
      );
    }

    const client = getSupabaseClient();
    const { data: task, error } = await client
      .from('tasks')
      .select('*')
      .eq('id', taskId)
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
