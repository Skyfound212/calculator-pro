function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  }
}

function bucketError() {
  return Response.json(
    { error: 'R2 bucket belum terkonfigurasi. Pastikan binding GUDANG_BUCKET sudah aktif.' },
    { status: 503, headers: corsHeaders() }
  )
}

const DEFAULT_FOLDERS = [{ id: 'root', name: 'Semua File', parentId: null }]

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: corsHeaders() })
}

export async function onRequestGet({ env }) {
  if (!env.GUDANG_BUCKET) return bucketError()
  try {
    const obj = await env.GUDANG_BUCKET.get('_folders.json')
    if (!obj) return Response.json(DEFAULT_FOLDERS, { headers: corsHeaders() })
    return Response.json(await obj.json(), { headers: corsHeaders() })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500, headers: corsHeaders() })
  }
}

export async function onRequestPost({ env, request }) {
  if (!env.GUDANG_BUCKET) return bucketError()
  try {
    const body = await request.json()
    const name = body.name || 'Folder Baru'
    const obj = await env.GUDANG_BUCKET.get('_folders.json')
    const folders = obj ? await obj.json() : [...DEFAULT_FOLDERS]

    const newFolder = {
      id: crypto.randomUUID(),
      name,
      parentId: null,
      createdAt: new Date().toISOString()
    }
    folders.push(newFolder)

    await env.GUDANG_BUCKET.put('_folders.json', JSON.stringify(folders), {
      httpMetadata: { contentType: 'application/json' }
    })

    return Response.json(newFolder, { status: 201, headers: corsHeaders() })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500, headers: corsHeaders() })
  }
}
