import { createPromotionsWorkflow } from '@medusajs/medusa/core-flows'
import { generateCouponsWorkflow } from "./generate-coupons-workflow"

createPromotionsWorkflow.hooks.promotionsCreated(
  async ({ promotions, additional_data }, { container }) => {
    for (const promotion of promotions) {
      await generateCouponsWorkflow.run({ 
        input: { promotionId: promotion.id },
        container 
      })
    }
  },
)
