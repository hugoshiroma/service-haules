import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Heading, Button, Text, Input, FocusModal, Switch, Label, toast, Skeleton } from "@medusajs/ui"
import { useState, useEffect, useRef } from "react"

const COLORS_PALETTE = ["#FFFFFF", "#FCB010", "#51793A", "#5A3F8C", "#000000"]

const fieldLabels: Record<string, string> = {
  nomeDaPagina: "Nome da página",
  ehPrimeiraSecao: "É primeira seção",
  titulo: "Título",
  tituloColor: "Cor do título",
  tituloBackgroundColor: "Cor do background do título",
  descricao: "Descrição",
  subtitulo: "Subtítulo",
  subtituloColor: "Cor do subtítulo",
  subtituloBackgroundColor: "Cor do background do subtítulo",
  ehSecaoPlaylist: "É seção de playlist",
  background: "Background (URL ou Cor)",
  backgroundMobile: "Background celular (URL ou Cor)",
  cta: "CTA (Texto do Botão)",
  cardapio: "Cardápio",
  comentarios: "Comentários",
  posts: "Posts (Arraste para reordenar)",
  perguntas: "Perguntas",
  backgroundColor: "Cor de fundo da seção"
}

const formatLabel = (key: string) => fieldLabels[key] || key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase())

const ContentfulHome = () => {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [editingSection, setEditingSection] = useState<any>(null)
  const [draggedPostIndex, setDraggedPostIndex] = useState<number | null>(null)
  const [draggedAsset, setDraggedAsset] = useState<{ field: string; index: number } | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const textAreaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const currentUploadFieldRef = useRef<string | null>(null)

  const fetchData = async () => {
    setLoading(true)
    try {
      const response = await fetch("/admin/contentful/home")
      const result = await response.json()
      setData(result)
    } catch (e) {
      console.error("Erro ao buscar dados:", e)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleSave = async (entryId: string, fields: any) => {
    try {
      const response = await fetch("/admin/contentful/home", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entryId, fields }),
      })

      if (response.ok) {
        toast.success("Conteúdo atualizado e publicado com sucesso!")
        fetchData()
        setEditingSection(null)
      }
    } catch (e) {
      toast.error("Erro ao salvar no Contentful.")
    }
  }

  const applyFormatting = (prefix: string, suffix: string) => {
    const textarea = textAreaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = textarea.value.substring(start, end)
    const replacement = prefix + selectedText + suffix

    textarea.focus()
    textarea.setSelectionRange(start, end)
    document.execCommand('insertText', false, replacement)
  }

  const handleImageClick = (key: string) => {
    currentUploadFieldRef.current = key
    fileInputRef.current?.click()
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const field = currentUploadFieldRef.current
    if (!e.target.files?.length || !field) return

    const files = Array.from(e.target.files)
    const formData = new FormData()
    files.forEach((file) => formData.append("files", file))

    setIsUploading(true)
    try {
      const response = await fetch("/admin/contentful/upload", {
        method: "POST",
        body: formData,
      })
      const result = await response.json()
      if (result.assets?.length) {
        const newAssets = result.assets.map((a: any, i: number) => ({
          _type: "Asset",
          id: a.id,
          url: a.url,
          title: files[i]?.name ?? a.id,
        }))
        setEditingSection((prev: any) => {
          const current = prev.fields[field]?.["en-US"]
          const currentArray = Array.isArray(current) ? current : []
          return {
            ...prev,
            fields: { ...prev.fields, [field]: { "en-US": [...currentArray, ...newAssets] } },
          }
        })
        toast.success(`${newAssets.length} imagem(ns) enviada(s) com sucesso!`)
      } else {
        toast.error(`Erro no upload: ${result.error || "resposta inesperada do servidor"}`)
      }
    } catch {
      toast.error("Erro ao fazer upload da imagem.")
    }

    setIsUploading(false)
    currentUploadFieldRef.current = null
    e.target.value = ""
  }

  const handleRemoveAsset = (key: string, assetId: string) => {
    setEditingSection((prev: any) => ({
      ...prev,
      fields: {
        ...prev.fields,
        [key]: { "en-US": prev.fields[key]["en-US"].filter((a: any) => a.id !== assetId) },
      },
    }))
  }

  // Drag-and-drop for posts
  const onPostDragStart = (e: React.DragEvent, index: number) => {
    setDraggedPostIndex(index)
    e.dataTransfer.effectAllowed = "move"
  }

  const onPostDrop = (e: React.DragEvent, index: number) => {
    if (draggedPostIndex === null || draggedPostIndex === index) return
    const posts = [...editingSection.fields.posts['en-US']]
    const item = posts.splice(draggedPostIndex, 1)[0]
    posts.splice(index, 0, item)
    setEditingSection({
      ...editingSection,
      fields: { ...editingSection.fields, posts: { 'en-US': posts } }
    })
    setDraggedPostIndex(null)
  }

  // Drag-and-drop for assets (images)
  const onAssetDragStart = (e: React.DragEvent, field: string, index: number) => {
    setDraggedAsset({ field, index })
    e.dataTransfer.effectAllowed = "move"
  }

  const onAssetDrop = (e: React.DragEvent, field: string, index: number) => {
    e.preventDefault()
    if (!draggedAsset || draggedAsset.field !== field || draggedAsset.index === index) return
    const assets = [...editingSection.fields[field]['en-US']]
    const item = assets.splice(draggedAsset.index, 1)[0]
    assets.splice(index, 0, item)
    setEditingSection((prev: any) => ({
      ...prev,
      fields: { ...prev.fields, [field]: { 'en-US': assets } }
    }))
    setDraggedAsset(null)
  }

  if (loading) return (
    <div className="flex flex-col gap-4 p-4">
      <div className="bg-ui-bg-base border border-ui-border-base rounded-xl p-6">
        <div className="grid gap-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bg-ui-bg-base border border-ui-border-base rounded-xl px-4 py-3 flex items-center gap-3">
            <div className="grid gap-2 flex-1" style={{ overflow: 'hidden' }}>
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-28" />
            </div>
            <Skeleton className="h-7 w-16 shrink-0" />
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <div className="flex flex-col gap-4 p-4">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleImageUpload}
      />

      <div className="bg-ui-bg-base border border-ui-border-base rounded-xl p-6">
        <Heading level="h1">Home Content Manager</Heading>
        <Text className="text-ui-fg-subtle">Gerencie o conteúdo do site em tempo real.</Text>
      </div>

      <div className="flex flex-col gap-2">
        {data?.secoes?.map((section: any, index: number) => (
          <div
            key={section.id}
            className="bg-ui-bg-base border border-ui-border-base rounded-xl px-4 py-3 flex items-center gap-3 hover:border-ui-border-strong transition-colors"
          >
            <div style={{ overflow: 'hidden', flex: 1 }}>
              <Heading level="h3" className="truncate">Seção {index + 1}: {section.type}</Heading>
              <Text className="text-ui-fg-subtle truncate">{section.fields.titulo?.['en-US'] || "Sem título"}</Text>
            </div>
            <Button size="small" variant="secondary" style={{ flexShrink: 0, whiteSpace: 'nowrap' }} onClick={() => setEditingSection({...section})}>Editar</Button>
          </div>
        ))}
      </div>

      {editingSection && (
        <FocusModal open={!!editingSection} onOpenChange={() => setEditingSection(null)}>
          <FocusModal.Content>
            <FocusModal.Header />
            <FocusModal.Body className="p-8">
              <div className="grid gap-8 overflow-y-auto max-h-[75vh] px-4">
                {Object.keys(editingSection.fields).map((key) => {
                  const val = editingSection.fields[key]?.['en-US']
                  const label = formatLabel(key)

                  if (typeof val === 'boolean' || key.startsWith('eh')) {
                    return (
                      <div key={key} className="flex items-center justify-between border-b pb-4">
                        <div>
                          <Text weight="plus">{label}</Text>
                        </div>
                        <Switch
                          checked={val || false}
                          onCheckedChange={(checked) => {
                            setEditingSection({
                                ...editingSection,
                                fields: { ...editingSection.fields, [key]: { 'en-US': checked } }
                            })
                          }}
                        />
                      </div>
                    )
                  }

                  if (key === 'descricao') {
                    return (
                      <div key={key} className="grid gap-3 border-b pb-6">
                        <Label weight="plus">{label}</Label>
                        <div className="flex gap-2 mb-1">
                          <Button size="small" variant="secondary" onClick={() => applyFormatting('__', '__')}><b>B</b></Button>
                          <Button size="small" variant="secondary" onClick={() => applyFormatting('*', '*')}><i>I</i></Button>
                          <Button size="small" variant="secondary" onClick={() => applyFormatting('*__', '__*')}><b><i>BI</i></b></Button>
                        </div>
                        <textarea
                          ref={textAreaRef}
                          className="flex min-h-[120px] w-full rounded-md border border-ui-border-base bg-ui-bg-field px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ui-border-interactive"
                          value={val || ""}
                          onChange={(e) => {
                            setEditingSection({
                                ...editingSection,
                                fields: { ...editingSection.fields, [key]: { 'en-US': e.target.value } }
                            })
                          }}
                        />
                      </div>
                    )
                  }

                  if (key.toLowerCase().includes('color')) {
                    const normalizedVal = (val || '').trim().toUpperCase()
                    const selectedPaletteColor = COLORS_PALETTE.find(c => c.toUpperCase() === normalizedVal) ?? null
                    return (
                      <div key={key} className="grid gap-3 border-b pb-6">
                        <Label weight="plus">{label}</Label>
                        <div className="flex gap-3 mb-2 py-2 items-center">
                          {COLORS_PALETTE.map(color => {
                            const isSelected = selectedPaletteColor?.toUpperCase() === color.toUpperCase()
                            return (
                              <button
                                key={color}
                                type="button"
                                onClick={() => {
                                  setEditingSection({
                                      ...editingSection,
                                      fields: { ...editingSection.fields, [key]: { 'en-US': color } }
                                  })
                                }}
                                className={`relative w-8 h-8 rounded-full shadow-sm hover:scale-110 transition-transform focus:outline-none ${isSelected ? 'ring-2 ring-offset-2 ring-ui-border-interactive scale-110' : 'border border-ui-border-base'}`}
                                style={{ backgroundColor: color }}
                                title={color}
                              >
                                {isSelected && (
                                  <span
                                    className="absolute inset-0 flex items-center justify-center text-xs font-bold leading-none"
                                    style={{ color: color === '#FFFFFF' || color === '#FCB010' ? '#000' : '#fff' }}
                                  >
                                    ✓
                                  </span>
                                )}
                              </button>
                            )
                          })}
                          {val && !selectedPaletteColor && (
                            <div
                              className="w-8 h-8 rounded-full border-2 border-ui-border-interactive shadow-sm flex-shrink-0"
                              style={{ backgroundColor: val }}
                              title={`Cor personalizada: ${val}`}
                            />
                          )}
                        </div>
                        <Input
                          value={val || ""}
                          onChange={(e) => {
                            setEditingSection({
                                ...editingSection,
                                fields: { ...editingSection.fields, [key]: { 'en-US': e.target.value } }
                            })
                          }}
                          placeholder="#000000"
                        />
                      </div>
                    )
                  }

                  if (key === 'posts' && Array.isArray(val)) {
                    return (
                      <div key={key} className="grid gap-4 border-b pb-6">
                        <Label weight="plus">{label}</Label>
                        <div className="grid gap-2 border border-ui-border-base rounded-lg p-2 bg-ui-bg-subtle">
                          {val.map((post: string, pIndex: number) => (
                            <div
                              key={pIndex} draggable
                              onDragStart={(e) => onPostDragStart(e, pIndex)}
                              onDragOver={(e) => e.preventDefault()}
                              onDrop={(e) => onPostDrop(e, pIndex)}
                              className={`flex items-center gap-3 bg-ui-bg-base p-4 rounded border shadow-sm cursor-grab active:cursor-grabbing transition-all ${draggedPostIndex === pIndex ? 'opacity-50 border-ui-border-interactive' : ''}`}
                            >
                              <span className="text-ui-fg-muted font-mono">⠿</span>
                              <div className="flex-1"><Text>{post}</Text></div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  }

                  if (Array.isArray(val) && (val.length === 0 || val[0]?._type === 'Asset')) {
                    const isThisFieldUploading = isUploading && currentUploadFieldRef.current === key
                    return (
                      <div key={key} className="grid gap-3 border-b pb-6">
                        <Label weight="plus">{label}</Label>
                        <Text className="text-ui-fg-subtle text-xs">Arraste para reordenar</Text>
                        <div className="flex flex-wrap gap-3">
                          {val.map((asset: any, aIndex: number) => (
                            <div
                              key={asset.id}
                              draggable
                              onDragStart={(e) => onAssetDragStart(e, key, aIndex)}
                              onDragOver={(e) => e.preventDefault()}
                              onDrop={(e) => onAssetDrop(e, key, aIndex)}
                              className={`relative group flex-shrink-0 cursor-grab active:cursor-grabbing transition-all ${draggedAsset?.field === key && draggedAsset?.index === aIndex ? 'opacity-40 scale-95' : ''}`}
                            >
                              {asset.url ? (
                                <img
                                  src={asset.url}
                                  alt={asset.title || label}
                                  className="w-20 h-20 object-cover rounded-md border border-ui-border-base shadow-sm pointer-events-none"
                                />
                              ) : (
                                <div className="w-20 h-20 rounded-md border border-ui-border-base bg-ui-bg-subtle flex items-center justify-center text-ui-fg-muted text-xs">
                                  Erro
                                </div>
                              )}
                              <button
                                type="button"
                                onClick={() => handleRemoveAsset(key, asset.id)}
                                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-ui-bg-base border border-ui-border-base shadow-sm text-ui-fg-subtle text-xs hidden group-hover:flex items-center justify-center hover:bg-ui-bg-base-hover"
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                          <button
                            type="button"
                            disabled={isUploading}
                            onClick={() => handleImageClick(key)}
                            className="w-20 h-20 rounded-md border-2 border-dashed border-ui-border-base bg-ui-bg-subtle hover:bg-ui-bg-base-hover transition-colors flex flex-col items-center justify-center gap-1 text-ui-fg-muted text-xs disabled:opacity-50"
                          >
                            <span className="text-lg leading-none">+</span>
                            <span>{isThisFieldUploading ? "Enviando..." : "Adicionar"}</span>
                          </button>
                        </div>
                      </div>
                    )
                  }

                  if (typeof val === 'string') {
                    return (
                      <div key={key} className="grid gap-2 border-b pb-6">
                        <Label weight="plus">{label}</Label>
                        <Input
                          value={val || ""}
                          onChange={(e) => {
                            setEditingSection({
                                ...editingSection,
                                fields: { ...editingSection.fields, [key]: { 'en-US': e.target.value } }
                            })
                          }}
                        />
                      </div>
                    )
                  }

                  return null
                })}
              </div>
            </FocusModal.Body>
            <FocusModal.Footer>
              <Button variant="secondary" onClick={() => setEditingSection(null)}>Cancelar</Button>
              <Button
                onClick={() => {
                  const fieldsToUpdate: any = {}
                  Object.keys(editingSection.fields).forEach(k => {
                    fieldsToUpdate[k] = editingSection.fields[k]['en-US']
                  })
                  handleSave(editingSection.id, fieldsToUpdate)
                }}
              >
                Salvar e Publicar
              </Button>
            </FocusModal.Footer>
          </FocusModal.Content>
        </FocusModal>
      )}
    </div>
  )
}

export const config = defineRouteConfig({
  label: "Conteúdo",
})

export default ContentfulHome
