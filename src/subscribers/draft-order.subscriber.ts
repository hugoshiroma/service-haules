import { SubscriberArgs, type SubscriberConfig } from '@medusajs/framework'
import { computeDraftOrderAdjustmentsWorkflow } from '@medusajs/medusa/core-flows'

export default async function handleDraftOrderConverted(args: SubscriberArgs<{ id: string }>) {
  const { event, container } = args

  console.log(`[DraftOrderSubscriber] Evento recebido`, event)

  const orderId = event.data.id

  if (!orderId) {
    console.log(`[DraftOrderSubscriber] ID do pedido não encontrado no evento. Abortando.`)
    return
  }

  console.log(
    `[DraftOrderSubscriber] Iniciando computeDraftOrderAdjustmentsWorkflow para o pedido: ${orderId}`,
  )

  await computeDraftOrderAdjustmentsWorkflow(container).run({
    input: {
      order_id: orderId,
    },
  })
}

export const config: SubscriberConfig = {
  event: 'order.placed',
}
