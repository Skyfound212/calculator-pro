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

export async function onRequestGet({ env, params }) {
  const id = params.id

  const obj = await env.GUDANG_BUCKET.get(`files/${id}`)
  if (!obj) return new Response('Not found', { status: 404 })

  const metaObj = await env.GUDANG_BUCKET.get(`meta/${id}.json`)
  let filename = id
  let contentType = 'application/octet-stream'

  if (metaObj) {
    const meta = await metaObj.json()
    filename = meta.name || id
    contentType = meta.type || obj.httpMetadata?.contentType || contentType
  }

  return new Response(obj.body, {
    headers: {
      ...corsHeaders(),
      'Content-Type': contentType,
      'Content-Disposition': `inline; filename="${encodeURIComponent(filename)}"`,
      'Cache-Control': 'private, max-age=3600',
      'Accept-Ranges': 'bytes'
    }
  })
}

export async function onRequestDelete({ env, params }) {
  const id = params.id
  await Promise.all([
    env.GUDANG_BUCKET.delete(`files/${id}`),
    env.GUDANG_BUCKET.delete(`meta/${id}.json`)
  ])
  return Response.json({ ok: true }, { headers: corsHeaders() })
}

export async function onRequestPatch({ env, params, request }) {
  const id = params.id

  let updates
  try {
    updates = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400, headers: corsHeaders() })
  }

  const metaObj = await env.GUDANG_BUCKET.get(`meta/${id}.json`)
  if (!metaObj) {
    return Response.json({ error: 'Not found' }, { status: 404, headers: corsHeaders() })
  }

  const current = await metaObj.json()
  const updated = { ...current, ...updates }

  await env.GUDANG_BUCKET.put(`meta/${id}.json`, JSON.stringify(updated), {
    httpMetadata: { contentType: 'application/json' }
  })

  return Response.json(updated, { headers: corsHeaders() })
}
