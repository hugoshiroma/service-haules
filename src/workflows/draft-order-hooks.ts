import {
  computeDraftOrderAdjustmentsWorkflow,
  beginDraftOrderEditWorkflow,
  confirmDraftOrderEditWorkflow,
  createOrderWorkflow,
} from '@medusajs/medusa/core-flows'

createOrderWorkflow.hooks.orderCreated(async ({ order }, { container }) => {
  console.log(`[DraftOrderHook] Evento recebido`, order.id)

  const orderId = order.id

  if (!orderId) {
    console.log(`[DraftOrderHook] ID do pedido não encontrado no evento. Abortando.`)
    return
  }

  console.log(
    `[DraftOrderHook] Iniciando computeDraftOrderAdjustmentsWorkflow para o pedido: ${orderId}`,
  )

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
  await confirmDraftOrderEditWorkflow(container).run({
    input: {
      order_id: orderId,
      confirmed_by: 'system',
    },
  })
})
