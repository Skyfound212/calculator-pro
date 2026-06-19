export async function onRequestGet({ env, params }) {
  const id = params.id
  const obj = await env.GUDANG_BUCKET.get(`files/${id}`)
  if (!obj) return new Response('Not found', { status: 404 })

  const metaObj = await env.GUDANG_BUCKET.get(`meta/${id}.json`)
  const filename = metaObj ? (await metaObj.json()).name : id

  return new Response(obj.body, {
    headers: {
      'Content-Type': obj.httpMetadata?.contentType || 'application/octet-stream',
      'Content-Disposition': `inline; filename="${encodeURIComponent(filename)}"`,
      'Cache-Control': 'private, max-age=3600'
    }
  })
}

export async function onRequestDelete({ env, params }) {
  const id = params.id
  await Promise.all([
    env.GUDANG_BUCKET.delete(`files/${id}`),
    env.GUDANG_BUCKET.delete(`meta/${id}.json`)
  ])
  return Response.json({ ok: true })
}

export async function onRequestPatch({ env, params, request }) {
  const id = params.id
  const updates = await request.json()

  const metaObj = await env.GUDANG_BUCKET.get(`meta/${id}.json`)
  if (!metaObj) return Response.json({ error: 'Not found' }, { status: 404 })

  const current = await metaObj.json()
  const updated = { ...current, ...updates }

  await env.GUDANG_BUCKET.put(`meta/${id}.json`, JSON.stringify(updated), {
    httpMetadata: { contentType: 'application/json' }
  })

  return Response.json(updated)
}
