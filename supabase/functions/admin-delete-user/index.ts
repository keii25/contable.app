
// deno-lint-ignore-file no-explicit-any
import { createClient } from 'npm:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!


function withCors(res: Response) {
  const h = new Headers(res.headers)
  h.set('Access-Control-Allow-Origin', '*')
  h.set('Access-Control-Allow-Headers', 'authorization, content-type')
  h.set('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  return new Response(res.body, { status: res.status, headers: h })
}


export default Deno.serve(async (req) => {
  // Preflight
  if (req.method === 'OPTIONS') {
    return withCors(new Response(null, { status: 204 }))
  }

  try {
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
      global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } }
    })

    const { data: userData } = await supabase.auth.getUser()
    if (!userData?.user) return withCors(new Response('Unauthorized', { status: 401 }))

    const { data: prof, error: profErr } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userData.user.id)
      .single()
    if (profErr) {
      console.error('profiles fetch error:', profErr)
      return withCors(new Response(profErr.message, { status: 400 }))
    }
    if (!prof || prof.role !== 'admin') return withCors(new Response('Forbidden', { status: 403 }))

    const body = await req.json().catch(() => null) as { user_id: string }
    if (!body?.user_id) return withCors(new Response('Bad Request', { status: 400 }))

    const { data: target, error: tErr } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', body.user_id)
      .single()
    if (tErr) return withCors(new Response(tErr.message, { status: 400 }))
    if (!target) return withCors(new Response('Not Found', { status: 404 }))
    if (target.role === 'admin') return withCors(new Response('No se puede eliminar un admin', { status: 400 }))

    const { error: dErr } = await supabase.auth.admin.deleteUser(body.user_id)
    if (dErr) {
      console.error('deleteUser error:', dErr)
      return withCors(new Response(dErr.message, { status: 400 }))
    }

    await supabase.from('profiles').delete().eq('user_id', body.user_id)

    return withCors(new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json' }
    }))
  } catch (e) {
    console.error('Unhandled error:', e)
    return withCors(new Response('Internal Server Error', { status: 500 }))
  }
})
