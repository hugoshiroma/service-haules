import ContentfulService from "./service"
import { Module } from "@medusajs/framework/utils"

export const CONTENTFUL_MODULE = "contentful"

export default Module(CONTENTFUL_MODULE, {
  service: ContentfulService,
})
