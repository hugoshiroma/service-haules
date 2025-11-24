import {
  createWorkflow,
  createStep,
  StepResponse,
  WorkflowResponse,
  WorkflowData,
} from '@medusajs/framework/workflows-sdk'
import { MedusaContainer } from '@medusajs/medusa'
import { createClient } from '@supabase/supabase-js'

const removeCouponsStep = createStep(
  'remove-coupons-step',
  async (promotionId: string, { container }: { container: MedusaContainer }) => {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error(
        'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be defined in environment variables.',
      )
    }
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

    console.log(`[RemoveCouponsStep] Removendo cupons para a promoção: ${promotionId}`)

    try {
      const { error } = await supabase
        .from('user_coupons')
        .delete()
        .eq('promotion_id', promotionId)

      if (error) {
        console.error(`[RemoveCouponsStep] Erro ao remover cupons no Supabase para a promoção ${promotionId}:`, error)
        throw new Error(`Erro no Supabase: ${error.message}`)
      }

      console.log(`[RemoveCouponsStep] Operação de remoção de cupons para a promoção ${promotionId} executada com sucesso.`)
      return new StepResponse({ success: true })
    } catch (error) {
      console.error(`[RemoveCouponsStep] Erro na remoção de cupons para a promoção ${promotionId}:`, error)
      throw error
    }
  },
)

export const removeCouponsWorkflow = createWorkflow(
  'remove-coupons-workflow',
  (input: WorkflowData<{ promotionId: string }>) => {
    removeCouponsStep(input.promotionId)

    return new WorkflowResponse(null)
  },
)
