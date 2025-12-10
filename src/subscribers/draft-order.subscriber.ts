import { SubscriberArgs, type SubscriberConfig } from '@medusajs/framework'
import { computeDraftOrderAdjustmentsWorkflow } from '@medusajs/core-flows'

export default async function handleDraftOrderConverted(args: SubscriberArgs<{ id: string }>) {
  const { event, container } = args

  console.log(`[DraftOrderSubscriber] Evento recebido`, event)

  const orderId = event.data.id

  if (!orderId) {
    console.log(`[DraftOrderSubscriber] ID do pedido não encontrado no evento. Abortando.`)
    return
  }

  const workflowEngineService: any = container.resolve('workflowEngineService')

  console.log(
    `[DraftOrderSubscriber] Iniciando computeDraftOrderAdjustmentsWorkflow para o pedido: ${orderId}`,
  )

  await workflowEngineService.run({
    input: {
      order_id: orderId,
    },
    workflow: computeDraftOrderAdjustmentsWorkflow,
  })
}

export const config: SubscriberConfig = {
  event: 'order.placed',
}
