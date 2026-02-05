import {
  computeDraftOrderAdjustmentsWorkflow,
  beginDraftOrderEditWorkflow,
  confirmDraftOrderEditWorkflow,
  createOrderWorkflow,
} from '@medusajs/medusa/core-flows'

// Hook para aplicar promoções/descontos automaticamente em Draft Orders
// CONFIRMAMOS para aplicar os descontos de verdade.
// A Payment Collection criada será reaproveitada pelo complete-purchase.
createOrderWorkflow.hooks.orderCreated(async ({ order }, { container }) => {
  console.log(`[DraftOrderHook] Aplicando ajustes/promoções para pedido ${order.id}`)

  const orderId = order.id

  if (!orderId) {
    console.log(`[DraftOrderHook] ID do pedido não encontrado. Abortando.`)
    return
  }

  try {
    await beginDraftOrderEditWorkflow(container).run({
      input: {
        order_id: orderId,
      },
    })

    await computeDraftOrderAdjustmentsWorkflow(container).run({
      input: {
        order_id: orderId,
      },
    })

    // CONFIRMAMOS para aplicar descontos de verdade
    // Isso cria uma Payment Collection que será usada pelo complete-purchase
    await confirmDraftOrderEditWorkflow(container).run({
      input: {
        order_id: orderId,
        confirmed_by: 'system',
      },
    })

    console.log(`[DraftOrderHook] Ajustes confirmados para ${orderId}`)
  } catch (error) {
    console.error(`[DraftOrderHook] Erro ao processar pedido ${orderId}:`, error)
  }
})
