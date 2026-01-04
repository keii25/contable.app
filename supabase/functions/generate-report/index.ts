
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
    const url = new URL(req.url)
    const format = (url.searchParams.get('format') || 'csv') as 'csv'|'pdf'|'xlsx'
    const scope = (url.searchParams.get('scope') || 'general') as 'general'|'month'
    const year = url.searchParams.get('year') || new Date().getFullYear().toString()
    const month = url.searchParams.get('month') || '01'
    const concept = url.searchParams.get('concept') || ''

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
      global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } }
    })

    const { data: userData } = await supabase.auth.getUser()
    if (!userData?.user) return withCors(new Response('Unauthorized', { status: 401 }))

    const { data: prof } = await supabase.from('profiles').select('*').eq('user_id', userData.user.id).single()

    let q = supabase.from('transactions').select('*')
    if (scope === 'month') {
      q = q.gte('date', `${year}-${month}-01`).lte('date', `${year}-${month}-31`)
    }
    if (concept) { q = q.ilike('description', `%${concept}%`) }
    if (!prof || prof.role !== 'admin') { q = q.eq('user_id', userData.user.id) }

    const { data, error } = await q.order('date', { ascending: true })
    if (error) return withCors(new Response(error.message, { status: 400 }))

    const txs = (data || [])
    const ingresos = txs.filter((t:any) => t.type === 'Ingreso')
    const egresos  = txs.filter((t:any) => t.type === 'Egreso')

    if (format === 'csv') {
      const headerIng = 'INGRESOS' + ['date','description','account','cedula','nombres','amount'].join(',')
      const rowsIng = ingresos.map((t:any) => [t.date, t.description||'', t.account, t.cedula||'', t.nombres||'', t.amount].join(','))
      const headerEgr = 'EGRESOS' + ['date','description','account','amount'].join(',')
      const rowsEgr = egresos.map((t:any) => [t.date, t.description||'', t.account, t.amount].join(','))
      const csv = [headerIng, ...rowsIng, headerEgr, ...rowsEgr].join('')
      return withCors(new Response(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename=report_${scope}_${year}${scope==='month'? '_'+month:''}.csv`
        }
      }))
    }

    const placeholder = (format==='pdf')
      ? `PDF placeholder for scope=${scope}, year=${year}, month=${month}, concept=${concept}. Add real PDF generator here.`
      : `XLSX placeholder for scope=${scope}, year=${year}, month=${month}, concept=${concept}. Add real XLSX generator here.`

    return withCors(new Response(placeholder, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': `attachment; filename=report_${scope}_${year}${scope==='month'? '_'+month:''}.${format}`
      }
    }))
  } catch (e) {
    console.error('Unhandled error:', e)
    return withCors(new Response('Internal Server Error', { status: 500 }))
  }
})
