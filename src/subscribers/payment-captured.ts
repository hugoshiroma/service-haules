import { type SubscriberArgs, type SubscriberConfig } from '@medusajs/framework'
import { Modules } from '@medusajs/framework/utils'
import { removeCouponsWorkflow } from '../workflows/remove-coupons-workflow'

// Subscriber que escuta quando um payment é captured
// e incrementa o contador de uso (used) das promoções aplicadas.
// Se a promoção atingir o limite de uso, deleta os cupons associados.
export default async function handlePaymentCaptured({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  console.log(`[payment-captured] Pagamento ${data.id} capturado, buscando promoções aplicadas...`)

  const query = container.resolve('query')
  const promotionModuleService = container.resolve(Modules.PROMOTION)

  try {
    // Buscar payment com payment_collection
    const { data: payments } = await query.graph({
      entity: 'payment',
      fields: ['id', 'payment_collection_id'],
      filters: { id: data.id },
    })

    if (!payments || payments.length === 0) {
      console.log(`[payment-captured] Payment ${data.id} não encontrado`)
      return
    }

    const payment = payments[0]
    const paymentCollectionId = payment.payment_collection_id

    console.log(`[payment-captured] Payment Collection ID: ${paymentCollectionId}`)

    // Buscar order associado à payment collection
    const { data: orderPaymentCollections } = await query.graph({
      entity: 'order_payment_collection',
      fields: ['order_id'],
      filters: { payment_collection_id: paymentCollectionId },
    })

    if (!orderPaymentCollections || orderPaymentCollections.length === 0) {
      console.log(
        `[payment-captured] Order não encontrado para Payment Collection ${paymentCollectionId}`,
      )
      return
    }

    const orderId = orderPaymentCollections[0].order_id
    console.log(`[payment-captured] Order ID: ${orderId}`)

    // Buscar order com items e adjustments
    const { data: orders } = await query.graph({
      entity: 'order',
      fields: ['id', 'items.adjustments.promotion_id'],
      filters: { id: orderId },
    })

    if (!orders || orders.length === 0) {
      console.log(`[payment-captured] Order ${orderId} não encontrado`)
      return
    }

    const order = orders[0]
    const promotionIds = new Set<string>()

    // Extrair IDs únicos de promoções dos adjustments
    order.items?.forEach((item: any) => {
      item.adjustments?.forEach((adjustment: any) => {
        if (adjustment.promotion_id) {
          promotionIds.add(adjustment.promotion_id)
        }
      })
    })

    if (promotionIds.size === 0) {
      console.log(`[payment-captured] Nenhuma promoção aplicada no pedido ${orderId}`)
      return
    }

    console.log(`[payment-captured] Promoções encontradas: ${Array.from(promotionIds).join(', ')}`)

    // Buscar códigos das promoções
    const promotions = await Promise.all(
      Array.from(promotionIds).map((id) => promotionModuleService.retrievePromotion(id)),
    )

    // Registrar uso das promoções usando o método nativo do MedusaJS
    try {
      const usageActions = promotions.map((promotion) => ({
        code: promotion.code!,
        amount: 1, // Incrementa em 1 uso
      }))

      await promotionModuleService.registerUsage(usageActions, {
        customer_id: null,
        customer_email: null,
      })

      console.log(`[payment-captured] ✅ Uso registrado para ${usageActions.length} promoção(ões)`)

      // Verificar se alguma promoção atingiu o limite após o registro
      for (const promotion of promotions) {
        // Re-fetch para pegar o `used` atualizado
        const updatedPromotion = await promotionModuleService.retrievePromotion(promotion.id)

        // Verificar se tem limite e se foi atingido
        if (
          typeof updatedPromotion.limit === 'number' &&
          (updatedPromotion.used ?? 0) >= updatedPromotion.limit
        ) {
          console.log(
            `[payment-captured] 🚨 Promoção ${promotion.code} (ID: ${promotion.id}) atingiu o limite de uso (${updatedPromotion.used}/${updatedPromotion.limit})`,
          )
          console.log(
            `[payment-captured] Iniciando remoção de cupons para promoção ${promotion.id}...`,
          )

          try {
            await removeCouponsWorkflow(container).run({
              input: { promotionId: promotion.id },
            })
            console.log(
              `[payment-captured] ✅ Cupons removidos com sucesso para promoção ${promotion.id}`,
            )
          } catch (workflowError) {
            console.error(
              `[payment-captured] ⚠️ Erro ao executar removeCouponsWorkflow para promoção ${promotion.id}:`,
              workflowError,
            )
          }
        }
      }
    } catch (error) {
      console.error(`[payment-captured] ⚠️ Erro ao registrar uso das promoções:`, error)
    }
  } catch (error) {
    console.error(`[payment-captured] Erro ao processar pagamento ${data.id}:`, error)
  }
}

export const config: SubscriberConfig = {
  event: 'payment.captured',
}
