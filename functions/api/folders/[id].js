function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  }
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: corsHeaders() })
}

export async function onRequestPatch({ env, request, params }) {
  if (!env.GUDANG_BUCKET) {
    return Response.json({ error: 'R2 bucket belum terkonfigurasi.' }, { status: 503, headers: corsHeaders() })
  }
  try {
    const { id } = params
    const body = await request.json()
    const name = body.name?.trim()
    if (!name) return Response.json({ error: 'Nama tidak boleh kosong' }, { status: 400, headers: corsHeaders() })

    const obj = await env.GUDANG_BUCKET.get('_folders.json')
    const folders = obj ? await obj.json() : []
    const idx = folders.findIndex(f => f.id === id)
    if (idx === -1) return Response.json({ error: 'Folder tidak ditemukan' }, { status: 404, headers: corsHeaders() })

    folders[idx] = { ...folders[idx], name, updatedAt: new Date().toISOString() }
    await env.GUDANG_BUCKET.put('_folders.json', JSON.stringify(folders), {
      httpMetadata: { contentType: 'application/json' }
    })

    return Response.json(folders[idx], { headers: corsHeaders() })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500, headers: corsHeaders() })
  }
}

export async function onRequestDelete({ env, params }) {
  if (!env.GUDANG_BUCKET) {
    return Response.json({ error: 'R2 bucket belum terkonfigurasi.' }, { status: 503, headers: corsHeaders() })
  }
  try {
    const { id } = params

    const obj = await env.GUDANG_BUCKET.get('_folders.json')
    const folders = obj ? await obj.json() : []
    const filtered = folders.filter(f => f.id !== id)
    if (filtered.length === folders.length) {
      return Response.json({ error: 'Folder tidak ditemukan' }, { status: 404, headers: corsHeaders() })
    }

    await env.GUDANG_BUCKET.put('_folders.json', JSON.stringify(filtered), {
      httpMetadata: { contentType: 'application/json' }
    })

    return Response.json({ ok: true }, { headers: corsHeaders() })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500, headers: corsHeaders() })
  }
}
