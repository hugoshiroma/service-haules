import { defineMiddlewares } from "@medusajs/framework/http"
import multer from "multer"

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
})

export default defineMiddlewares({
  routes: [
    {
      matcher: "/admin/contentful/upload",
      bodyParser: false,
      middlewares: [
        (req, res, next) => {
          upload.array("files", 20)(req as any, res as any, next)
        },
      ],
    },
  ],
})
