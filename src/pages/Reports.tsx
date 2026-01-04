
// src/pages/Reports.tsx
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import type { Profile, Transaction } from '../lib/types'
import KPIChips from '../components/KPIChips'
import { fmtMoney, isAdmin } from '../lib/utils'

export default function Reports({ profile }:{ profile: Profile }){
  const [mode, setMode] = useState<'general'|'month'>('general')
  const [concept, setConcept] = useState('')
  const [month, setMonth] = useState<string>(String(new Date().getMonth()+1).padStart(2,'0'))
  const [year, setYear] = useState<string>(new Date().getFullYear().toString())
  const [txs, setTxs] = useState<Transaction[]>([])

  useEffect(()=>{ (async()=>{
    let q = supabase.from('transactions').select('*')
    if(mode==='month') q = q.gte('date', `${year}-${month}-01`).lte('date', `${year}-${month}-31`)
    if(concept) q = q.ilike('description', `%${concept}%`)

    // 🔐 Filtro por usuario si NO es admin
    if(!isAdmin(profile.role)){
      const { data: { session } } = await supabase.auth.getSession()
      q = q.eq('user_id', session!.user.id)
    }

    const { data, error } = await q.order('date', { ascending: true })
    if(error) console.error(error)
    setTxs(data || [])
  })() }, [mode, concept, month, year, profile.role])

  const ingresos = useMemo(()=> txs.filter(x=>x.type==='Ingreso'), [txs])
  const egresos  = useMemo(()=> txs.filter(x=>x.type==='Egreso'), [txs])
  const sum = (arr: Transaction[]) => arr.reduce((a,b)=> a + Number(b.amount), 0)
  const groupByAccount = (rows: Transaction[]) => { const m = new Map<string, number>(); rows.forEach(r=> m.set(r.account, (m.get(r.account)||0) + Number(r.amount))); return Array.from(m.entries()).map(([account,total])=>({account,total})) }

  const printPDF = ()=>{
    const code = 'CUR-' + Math.random().toString(36).slice(2,8).toUpperCase()
    const now = new Date(); const header = `REPORTE GENERAL`
    const perfil = profile.username || profile.email || '—'
    const periodo = mode==='general'? 'General' : `${year}-${month}`
    const totIng = sum(ingresos), totEgr = sum(egresos), saldo = totIng - totEgr
    const gi = groupByAccount(ingresos), ge = groupByAccount(egresos)
    const css = `*{font-family: Arial, sans-serif} body{padding:16px;color:#1a202c} h1{font-size:22px;text-align:center;margin:0 0 4px} .meta{text-align:center;font-size:12px;opacity:.8} .box{border:2px solid #e2e8f0;border-radius:12px;padding:12px;margin:16px 0} .orange{background:#ed8936;color:#fff;padding:8px 12px;font-weight:bold} .tbl{width:100%;border-collapse:collapse} .tbl th,.tbl td{border:1px solid #e2e8f0;padding:8px} .tbl th{background:#e6fffa} .row-total{font-weight:bold} .green-text{color:#2f855a} .red-text{color:#e53e3e} .center{text-align:center} .signature{margin-top:24px;text-align:center} .signature .line{width:60%;height:1px;background:#cbd5e0;margin:12px auto}`
    const section = (title: string, subtitle: string, rows: {account:string,total:number}[])=>{ const head = `<div class="orange">${title}</div>`; const sub = `<table class="tbl"><thead><tr><th>${subtitle}</th><th>Valor</th></tr></thead><tbody>`; const trs = rows.map(r=> `<tr><td>${r.account}</td><td class="center">${fmtMoney(r.total)}</td></tr>`).join(''); const subtotal = fmtMoney(rows.reduce((a,b)=> a + b.total, 0)); const foot = `<tr class="row-total"><td>Subtotal</td><td class="center">${subtotal}</td></tr></tbody></table>`; return head + sub + trs + foot }
    const doc = `<!DOCTYPE html><html><head><title>Reporte</title><meta charset="utf-8"/><style>${css}</style></head><body><h1>${header}</h1><div class="meta">Perfil: ${perfil}<br/>Código Único de Reporte: ${code}<br/>Generado el: ${now.toLocaleString('es-CO')}</div><div class="box"><div><strong>Periodo:</strong> ${periodo}</div><div class="green-text">Ingresos: ${fmtMoney(totIng)}</div><div class="red-text">Egresos: ${fmtMoney(totEgr)}</div></div>${section('Reporte General — Ingresos','Cuenta Contable (Ingresos)',gi)}${section('Reporte General — Egresos','Cuenta Contable (Egresos)',ge)}<div class="box center"><strong>Total General (Saldo Neto): ${fmtMoney(saldo)}</strong></div><div class="signature">Firma del Encargado<div class="line"></div></div></body></html>`
    const w = window.open('', '', 'width=900,height=700')!; w.document.write(doc); w.document.close(); w.focus(); w.print(); w.close()
  }

  const downloadXLS = ()=>{
    const ingresosRows = ingresos.map(r=> [r.date, r.description||'', r.account, r.cedula||'', r.nombres||'', Number(r.amount)])
    const egresosRows  = egresos.map(r=> [r.date, r.description||'', r.account, Number(r.amount)])
    const esc = (s:string)=> String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    const rowIng = ingresosRows.map(r=> `<Row>${r.map((c,i)=> `<Cell><Data ss:Type="${(i===5)?'Number':'String'}">${esc(String(c))}</Data></Cell>`).join('')}</Row>`).join('')
    const rowEgr = egresosRows.map(r=> `<Row>${r.map((c,i)=> `<Cell><Data ss:Type="${(i===3)?'Number':'String'}">${esc(String(c))}</Data></Cell>`).join('')}</Row>`).join('')
    const totalIng = ingresosRows.reduce((a,b)=> a + (b[5] as number), 0)
    const totalEgr = egresosRows.reduce((a,b)=> a + (b[3] as number), 0)
    const saldo = totalIng - totalEgr
    const periodo = mode==='general'? 'General' : `${year}-${month}`
    const totalSheet = `<Row><Cell><Data ss:Type="String">Periodo</Data></Cell><Cell><Data ss:Type="String">${esc(periodo)}</Data></Cell></Row><Row><Cell><Data ss:Type="String">Ingresos</Data></Cell><Cell><Data ss:Type="Number">${totalIng}</Data></Cell></Row><Row><Cell><Data ss:Type="String">Egresos</Data></Cell><Cell><Data ss:Type="Number">${totalEgr}</Data></Cell></Row><Row><Cell><Data ss:Type="String">Saldo Neto</Data></Cell><Cell><Data ss:Type="Number">${saldo}</Data></Cell></Row>`
    const xml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet" xmlns:html="http://www.w3.org/TR/REC-html40"><Worksheet ss:Name="Ingresos"><Table><Row><Cell><Data ss:Type="String">Fecha</Data></Cell><Cell><Data ss:Type="String">Descripción</Data></Cell><Cell><Data ss:Type="String">Cuenta</Data></Cell><Cell><Data ss:Type="String">Cédula</Data></Cell><Cell><Data ss:Type="String">Nombres y Apellidos</Data></Cell><Cell><Data ss:Type="String">Valor</Data></Cell></Row>${rowIng}</Table></Worksheet><Worksheet ss:Name="Egresos"><Table><Row><Cell><Data ss:Type="String">Fecha</Data></Cell><Cell><Data ss:Type="String">Descripción</Data></Cell><Cell><Data ss:Type="String">Cuenta</Data></Cell><Cell><Data ss:Type="String">Valor</Data></Cell></Row>${rowEgr}</Table></Worksheet><Worksheet ss:Name="Total"><Table>${totalSheet}</Table></Worksheet></Workbook>`
    const blob = new Blob([xml], { type: 'application/vnd.ms-excel' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `reporte_${mode}_${year}${mode==='month'? '_'+month:''}.xls`; a.click(); URL.revokeObjectURL(a.href)
  }

  return (
    <div>
      <div className="card" style={{display:'flex', gap:12, alignItems:'center', flexWrap:'wrap'}}>
        <div>
          <div className="label">Filtro</div>
          <select value={mode} onChange={e=>setMode(e.target.value as any)}>
            <option value="general">General</option>
            <option value="month">Por Mes y Año</option>
          </select>
        </div>
        <div style={{flex:1}}>
          <div className="label">Concepto</div>
          <input className="input" placeholder="Texto" value={concept} onChange={e=>setConcept(e.target.value)} />
        </div>
        <button className="btn blue" onClick={printPDF}>Descargar PDF</button>
        <button className="btn green" onClick={downloadXLS}>Descargar Excel (.xls)</button>
      </div>
      <KPIChips ingresos={sum(ingresos)} egresos={sum(egresos)} />
      <div className="card"><div className="section-title">Ingresos — Listado ({mode==='general'? 'General': 'Mes'})</div><div className="table-wrap"><table className="table"><thead><tr><th>Fecha</th><th>Descripción</th><th>Cuenta</th><th>Cédula</th><th>Nombres y Apellidos</th><th>Valor</th></tr></thead><tbody>{ingresos.map(t=> (<tr key={t.id}><td>{t.date}</td><td>{t.description}</td><td>{t.account}</td><td>{t.cedula}</td><td>{t.nombres}</td><td>{fmtMoney(Number(t.amount))}</td></tr>))}</tbody></table></div></div>
      <div className="card"><div className="section-title">Egresos — Listado ({mode==='general'? 'General': 'Mes'})</div><div className="table-wrap"><table className="table"><thead><tr><th>Fecha</th><th>Descripción</th><th>Cuenta</th><th>Valor</th></tr></thead><tbody>{egresos.map(t=> (<tr key={t.id}><td>{t.date}</td><td>{t.description}</td><td>{t.account}</td><td>{fmtMoney(Number(t.amount))}</td></tr>))}</tbody></table></div></div>
    </div>
  )
}
