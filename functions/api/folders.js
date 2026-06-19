const DEFAULT_FOLDERS = [{ id: 'root', name: 'Semua File', parentId: null }]

export async function onRequestGet({ env }) {
  try {
    const obj = await env.GUDANG_BUCKET.get('_folders.json')
    if (!obj) return Response.json(DEFAULT_FOLDERS)
    return Response.json(await obj.json())
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}

export async function onRequestPost({ env, request }) {
  try {
    const { name } = await request.json()

    const obj = await env.GUDANG_BUCKET.get('_folders.json')
    const folders = obj ? await obj.json() : [...DEFAULT_FOLDERS]

    const newFolder = {
      id: crypto.randomUUID(),
      name: name || 'Folder Baru',
      parentId: null,
      createdAt: new Date().toISOString()
    }

    folders.push(newFolder)

    await env.GUDANG_BUCKET.put('_folders.json', JSON.stringify(folders), {
      httpMetadata: { contentType: 'application/json' }
    })

    return Response.json(newFolder, { status: 201 })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
