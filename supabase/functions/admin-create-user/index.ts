

// supabase/functions/admin-create-user/index.ts
// deno-lint-ignore-file no-explicit-any
import { createClient } from 'npm:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
}
function withCors(res: Response) {
  const h = new Headers(res.headers)
  Object.entries(corsHeaders).forEach(([k, v]) => h.set(k, v))
  return new Response(res.body, { status: res.status, headers: h })
}

export default Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return withCors(new Response(null, { status: 204 }))
  try {
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
      global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } }
    })

    // JWT del caller (desde navegador, via functions.invoke)
    const { data: userData } = await supabase.auth.getUser()
    if (!userData?.user) {
      return withCors(new Response(JSON.stringify({ code: 401, message: 'Invalid JWT' }), { status: 401 }))
    }

    // Caller debe ser admin
    const { data: prof, error: pErr } =
      await supabase.from('profiles').select('*').eq('user_id', userData.user.id).single()
    if (pErr) return withCors(new Response(pErr.message, { status: 400 }))
    if (!prof || prof.role !== 'admin') return withCors(new Response('Forbidden', { status: 403 }))

    const body = await req.json().catch(() => null) as { email:string, password:string, role?:'editor'|'lector'|'admin' }
    if (!body?.email || !body?.password) return withCors(new Response('Bad Request', { status: 400 }))
    const newRole = (body.role==='admin')? 'admin' : (body.role || 'editor')

    const { data: created, error: cErr } =
      await supabase.auth.admin.createUser({ email: body.email, password: body.password, email_confirm: true })
    if (cErr) return withCors(new Response(cErr.message, { status: 400 }))

    const { error: iErr } =
      await supabase.from('profiles').insert({ user_id: created.user!.id, email: body.email, role: newRole })
    if (iErr) return withCors(new Response(iErr.message, { status: 400 }))

    return withCors(new Response(JSON.stringify({ ok: true, user_id: created.user!.id }), {
      headers: { 'Content-Type':'application/json' }, status: 200
    }))
  } catch (e) {
    console.error(e)
    return withCors(new Response('Internal Server Error', { status: 500 }))
  }
})
