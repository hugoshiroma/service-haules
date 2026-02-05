import {
  createWorkflow,
  createStep,
  StepResponse,
  WorkflowResponse,
  WorkflowData,
} from '@medusajs/framework/workflows-sdk'
import { MedusaContainer } from '@medusajs/medusa'
import { Modules } from '@medusajs/framework/utils'
import { createClient } from '@supabase/supabase-js'

const generateCouponsStep = createStep(
  'generate-coupons-step',
  async (promotionId: string, { container }: { container: MedusaContainer }) => {
    const customerService_: any = container.resolve(Modules.CUSTOMER)

    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error(
        'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be defined in environment variables.',
      )
    }
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

    try {
      console.log(`[GenerateCouponsStep] Gerando cupons para a promoção: ${promotionId}`)

      const [customers] = await customerService_.listAndCountCustomers({})

      if (!customers || customers.length === 0) {
        console.log('[GenerateCouponsStep] Nenhum cliente encontrado.')
        return new StepResponse(null)
      }

      console.log(`[GenerateCouponsStep] Encontrados ${customers.length} clientes.`)

      // Verificar quais clientes JÁ TÊM cupons dessa promoção
      const { data: existingCoupons, error: checkError } = await supabase
        .from('user_coupons')
        .select('customer_id')
        .eq('promotion_id', promotionId)

      if (checkError) {
        console.error(`[GenerateCouponsStep] Erro ao verificar cupons existentes:`, checkError)
        throw new Error(`Erro no Supabase: ${checkError.message}`)
      }

      const existingCustomerIds = new Set(
        existingCoupons?.map((coupon) => coupon.customer_id) || [],
      )

      console.log(
        `[GenerateCouponsStep] ${existingCustomerIds.size} clientes já possuem cupons desta promoção.`,
      )

      // Filtrar apenas clientes que NÃO têm cupons dessa promoção
      const newCustomers = customers.filter((customer) => !existingCustomerIds.has(customer.id))

      if (newCustomers.length === 0) {
        console.log(
          '[GenerateCouponsStep] Todos os clientes já possuem cupons desta promoção. Nada a fazer.',
        )
        return new StepResponse(null)
      }

      console.log(
        `[GenerateCouponsStep] Gerando cupons para ${newCustomers.length} novos clientes...`,
      )

      const userCouponsToInsert = newCustomers.map((customer) => ({
        customer_id: customer.id,
        promotion_id: promotionId,
        created_at: new Date().toISOString(),
      }))

      const { data, error } = await supabase.from('user_coupons').insert(userCouponsToInsert)

      if (error) {
        console.error(`[GenerateCouponsStep] Erro ao inserir cupons no Supabase:`, error)
        throw new Error(`Erro no Supabase: ${error.message}`)
      }

      console.log(
        `[GenerateCouponsStep] ${userCouponsToInsert.length} cupons gerados e inseridos com sucesso para a promoção ${promotionId}.`,
      )
      return new StepResponse(null)
    } catch (error) {
      console.error(
        `[GenerateCouponsStep] Erro na geração de cupons para a promoção ${promotionId}:`,
        error,
      )
      throw error
    }
  },
)

export const generateCouponsWorkflow = createWorkflow(
  'generate-coupons-workflow',
  (input: WorkflowData<{ promotionId: string }>) => {
    generateCouponsStep(input.promotionId)

    return new WorkflowResponse(null)
  },
)
