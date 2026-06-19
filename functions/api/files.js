function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  }
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: corsHeaders() })
}

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

    return Response.json(files.filter(Boolean), { headers: corsHeaders() })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500, headers: corsHeaders() })
  }
}

export async function onRequestPost({ env, request }) {
  try {
    const formData = await request.formData()
    const file = formData.get('file')
    const folderId = formData.get('folderId') || 'root'

    if (!file || typeof file === 'string') {
      return Response.json({ error: 'No file provided' }, { status: 400, headers: corsHeaders() })
    }

    const id = crypto.randomUUID()

    // Use arrayBuffer — more reliable than stream() in Workers
    const buffer = await file.arrayBuffer()
    const size = buffer.byteLength

    await env.GUDANG_BUCKET.put(`files/${id}`, buffer, {
      httpMetadata: {
        contentType: file.type || 'application/octet-stream'
      }
    })

    const metadata = {
      id,
      name: file.name,
      type: file.type || 'application/octet-stream',
      size,
      folderId,
      isStarred: false,
      isTrashed: false,
      uploadedAt: new Date().toISOString()
    }

    await env.GUDANG_BUCKET.put(`meta/${id}.json`, JSON.stringify(metadata), {
      httpMetadata: { contentType: 'application/json' }
    })

    return Response.json(metadata, { status: 201, headers: corsHeaders() })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500, headers: corsHeaders() })
  }
}
