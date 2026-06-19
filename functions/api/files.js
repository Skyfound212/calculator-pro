export async function onRequestGet({ env }) {
  try {
    const list = await env.GUDANG_BUCKET.list({ prefix: 'meta/' })

    const files = await Promise.all(
      list.objects.map(async (obj) => {
        const item = await env.GUDANG_BUCKET.get(obj.key)
        if (!item) return null
        return item.json()
      })
    )

    return Response.json(files.filter(Boolean))
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}

export async function onRequestPost({ env, request }) {
  try {
    const formData = await request.formData()
    const file = formData.get('file')
    const folderId = formData.get('folderId') || 'root'

    if (!file) {
      return Response.json({ error: 'No file provided' }, { status: 400 })
    }

    const id = crypto.randomUUID()

    await env.GUDANG_BUCKET.put(`files/${id}`, file.stream(), {
      httpMetadata: { contentType: file.type || 'application/octet-stream' }
    })

    const metadata = {
      id,
      name: file.name,
      type: file.type || 'application/octet-stream',
      size: file.size,
      folderId,
      isStarred: false,
      isTrashed: false,
      uploadedAt: new Date().toISOString()
    }

    await env.GUDANG_BUCKET.put(`meta/${id}.json`, JSON.stringify(metadata), {
      httpMetadata: { contentType: 'application/json' }
    })

    return Response.json(metadata, { status: 201 })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
