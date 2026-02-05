import { createCustomersWorkflow } from '@medusajs/medusa/core-flows'
import { MedusaContainer } from '@medusajs/medusa'
import { createClient } from '@supabase/supabase-js'
import { Modules } from '@medusajs/framework/utils'

// Hook para o evento de criação de clientes
createCustomersWorkflow.hooks.customersCreated(
  async ({ customers }, { container }: { container: MedusaContainer }) => {
    console.log('[CustomerHooks] Hook customersCreated acionado.')

    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error(
        'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be defined in environment variables.',
      )
    }
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

    // 1. Buscar todas as promoções ativas que NÃO atingiram o limite
    const promotionService: any = container.resolve(Modules.PROMOTION)

    // Lista todas as promoções ativas usando o método correto
    const activePromotions = await promotionService.listActivePromotions({}, {})

    if (!activePromotions || activePromotions.length === 0) {
      console.log('[CustomerHooks] Nenhuma promoção ativa encontrada.')
      return
    }

    // Filtra promoções que ainda não atingiram o limite
    const availablePromotions = activePromotions.filter((promo) => {
      // Se não tem limite definido, está disponível
      if (typeof promo.limit !== 'number') {
        return true
      }
      // Se tem limite, verifica se ainda não atingiu
      const used = promo.used ?? 0
      return used < promo.limit
    })

    if (availablePromotions.length === 0) {
      console.log('[CustomerHooks] Nenhuma promoção disponível (todas atingiram o limite).')
      return
    }

    console.log(
      `[CustomerHooks] Encontradas ${activePromotions.length} promoções ativas, ${availablePromotions.length} disponíveis (não esgotadas).`,
    )

    for (const customer of customers) {
      console.log(`[CustomerHooks] Processando cliente recém-criado: ${customer.id}`)

      const userCouponsToInsert = availablePromotions.map((promo) => ({
        customer_id: customer.id,
        promotion_id: promo.id,
        created_at: new Date().toISOString(),
      }))

      if (userCouponsToInsert.length === 0) {
        console.log(`[CustomerHooks] Nenhum cupom para associar ao cliente ${customer.id}.`)
        continue
      }

      // 2. Inserir as associações no Supabase
      const { data, error } = await supabase.from('user_coupons').insert(userCouponsToInsert)

      if (error) {
        console.error(
          `[CustomerHooks] Erro ao inserir cupons para o cliente ${customer.id}:`,
          error,
        )
        // Não vamos parar o processo inteiro, apenas logar o erro.
        continue
      }

      console.log(
        `[CustomerHooks] ${userCouponsToInsert.length} cupons associados com sucesso ao cliente ${customer.id}.`,
      )
    }
  },
)
