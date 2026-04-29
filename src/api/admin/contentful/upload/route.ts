import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import ContentfulService from "../../../../modules/contentful/service"

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const files = (req as any).files as Express.Multer.File[]

  if (!files?.length) {
    return res.status(400).json({ error: "Nenhum arquivo enviado." })
  }

  try {
    const contentfulService: ContentfulService = req.scope.resolve("contentful")

    const results = await Promise.all(
      files.map((file) =>
        contentfulService.uploadAsset(file.buffer, file.originalname, file.mimetype)
      )
    )

    res.json({ assets: results })
  } catch (error) {
    console.error("[POST /admin/contentful/upload] Error:", error.message)
    res.status(500).json({ error: error.message || "Erro ao fazer upload da imagem." })
  }
}
