import { createClient, ClientAPI, Environment, PlainClientAPI } from 'contentful-management'
import { Logger } from '@medusajs/framework/types'

type InjectedDependencies = {
  logger: Logger
}

type ResolvedAsset = {
  _type: 'Asset'
  id: string
  url: string | null
  title: string
}

class ContentfulService {
  private client: ClientAPI
  private plainClient: PlainClientAPI
  private config: {
    spaceId: string
    managementToken: string
    environment: string
  }
  private logger: Logger

  constructor({ logger }: InjectedDependencies) {
    this.logger = logger
    this.config = {
      spaceId: process.env.CONTENTFUL_SPACE_ID as string,
      managementToken: process.env.CONTENTFUL_MANAGEMENT_TOKEN as string,
      environment: process.env.CONTENTFUL_ENVIRONMENT as string,
    }

    this.logger.info(`[ContentfulService] Module initialized with Space ID: ${this.config.spaceId}`)

    this.plainClient = createClient({ accessToken: this.config.managementToken }, { type: 'plain' })

    this.client = createClient({
      accessToken: this.config.managementToken,
    })
  }

  private async getEnv(): Promise<Environment> {
    try {
      const space = await this.client.getSpace(this.config.spaceId)
      return await space.getEnvironment(this.config.environment)
    } catch (error) {
      this.logger.error(`[ContentfulService] Error getting Environment: ${error.message}`)
      throw error
    }
  }

  private getAssetUrl(asset: any): string | null {
    const fileField = asset.fields?.file
    if (!fileField) return null
    // Try 'en-US' first, then fall back to any available locale
    const fileData = fileField['en-US'] ?? Object.values(fileField)[0]
    const url = (fileData as any)?.url
    if (!url) return null
    return url.startsWith('http') ? url : `https:${url}`
  }

  private async resolveFields(
    env: Environment,
    fields: Record<string, any>,
  ): Promise<Record<string, any>> {
    const resolved: Record<string, any> = {}

    for (const [key, localeObj] of Object.entries(fields)) {
      const val = (localeObj as any)['en-US']

      // Resolve arrays of Asset links sequentially to avoid rate limiting
      if (Array.isArray(val) && val.length > 0 && val[0]?.sys?.linkType === 'Asset') {
        const resolvedAssets: ResolvedAsset[] = []
        for (const link of val) {
          try {
            const asset = await env.getAsset(link.sys.id)
            resolvedAssets.push({
              _type: 'Asset',
              id: link.sys.id,
              url: this.getAssetUrl(asset),
              title: (asset.fields.title?.['en-US'] as string) || '',
            })
          } catch (e) {
            this.logger.warn(
              `[ContentfulService] Could not resolve asset ${link.sys.id}: ${e.message}`,
            )
            resolvedAssets.push({ _type: 'Asset', id: link.sys.id, url: null, title: '' })
          }
        }
        resolved[key] = { 'en-US': resolvedAssets }
      } else {
        resolved[key] = localeObj
      }
    }

    return resolved
  }

  async getHomeContent(entryId: string = '6ZkmYWnKMLtG1YnIxgqfg2') {
    try {
      this.logger.info(`[ContentfulService] Fetching Home Content for Entry: ${entryId}`)
      const env = await this.getEnv()
      const entry = await env.getEntry(entryId)

      this.logger.info('[ContentfulService] Entry fetched successfully. Resolving sections...')

      const secoesRefs = entry.fields.secoes?.['en-US'] || []
      const secoes = await Promise.all(
        secoesRefs.map(async (ref: any) => {
          try {
            const subEntry = await env.getEntry(ref.sys.id)
            const resolvedFields = await this.resolveFields(env, subEntry.fields)
            return {
              id: subEntry.sys.id,
              type: subEntry.sys.contentType.sys.id,
              fields: resolvedFields,
            }
          } catch (e) {
            this.logger.warn(
              `[ContentfulService] Could not fetch section ${ref.sys.id}: ${e.message}`,
            )
            return { id: ref.sys.id, error: 'Could not fetch section' }
          }
        }),
      )

      return {
        id: entry.sys.id,
        fields: entry.fields,
        secoes,
      }
    } catch (error) {
      this.logger.error(`[ContentfulService] Error in getHomeContent: ${error.message}`)
      throw error
    }
  }

  async uploadAsset(
    buffer: Buffer,
    filename: string,
    mimeType: string,
  ): Promise<{ url: string; id: string }> {
    try {
      const spaceParams = { spaceId: this.config.spaceId, environmentId: this.config.environment }

      this.logger.info(`[ContentfulService] Uploading asset: ${filename}`)

      // 1. Create upload (Buffer → ArrayBuffer for the type signature)
      const arrayBuffer = buffer.buffer.slice(
        buffer.byteOffset,
        buffer.byteOffset + buffer.byteLength,
      ) as ArrayBuffer
      const upload = await this.plainClient.upload.create(spaceParams, { file: arrayBuffer })

      // 2. Create asset linked to the upload
      const asset = await this.plainClient.asset.create(spaceParams, {
        fields: {
          title: { 'en-US': filename },
          file: {
            'en-US': {
              contentType: mimeType,
              fileName: filename,
              uploadFrom: { sys: { type: 'Link', linkType: 'Upload', id: upload.sys.id } },
            },
          },
        },
      })

      // 3. Process (waits until done) — params cast needed due to type definition mismatch
      const processed = await this.plainClient.asset.processForAllLocales(
        { ...spaceParams, assetId: asset.sys.id } as Parameters<
          typeof this.plainClient.asset.processForAllLocales
        >[0],
        asset,
      )

      // 4. Publish
      const published = await this.plainClient.asset.publish(
        { ...spaceParams, assetId: processed.sys.id } as Parameters<
          typeof this.plainClient.asset.publish
        >[0],
        processed,
      )

      const rawUrl = published.fields.file['en-US'].url as string
      const url = rawUrl.startsWith('http') ? rawUrl : `https:${rawUrl}`

      this.logger.info(
        `[ContentfulService] Asset uploaded and published: ${url} (id: ${published.sys.id})`,
      )
      return { url, id: published.sys.id }
    } catch (error) {
      this.logger.error(`[ContentfulService] Error uploading asset: ${error.message}`)
      throw error
    }
  }

  async updateEntry(entryId: string, fields: any) {
    try {
      const env = await this.getEnv()
      const entry = await env.getEntry(entryId)

      this.logger.info(`[ContentfulService] Updating entry: ${entryId}`)

      Object.keys(fields).forEach((key) => {
        let value = fields[key]

        // Convert resolved asset arrays back to Contentful link format
        if (Array.isArray(value) && value.length > 0 && value[0]?._type === 'Asset') {
          value = value.map((item: ResolvedAsset) => ({
            sys: { type: 'Link', linkType: 'Asset', id: item.id },
          }))
        }

        if (entry.fields[key]) {
          entry.fields[key]['en-US'] = value
        } else {
          entry.fields[key] = { 'en-US': value }
        }
      })

      const updatedEntry = await entry.update()
      await updatedEntry.publish()

      this.logger.info(`[ContentfulService] Entry ${entryId} updated and published.`)

      return updatedEntry
    } catch (error) {
      this.logger.error(`[ContentfulService] Error updating entry: ${error.message}`)
      throw error
    }
  }
}

export default ContentfulService
