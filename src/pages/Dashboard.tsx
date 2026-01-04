
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import type { Profile, Transaction } from '../lib/types'
import { isAdmin, fmtMoney } from '../lib/utils'
import KPIChips from '../components/KPIChips'
import { Pie } from 'react-chartjs-2'
import { Chart, ArcElement, Tooltip, Legend } from 'chart.js'
Chart.register(ArcElement, Tooltip, Legend)

export default function Dashboard({ profile }:{ profile: Profile }){
  const [scope, setScope] = useState<'general'|'month'>('general')
  const [month, setMonth] = useState<string>('01')
  const [year, setYear] = useState<string>(new Date().getFullYear().toString())
  const [txs, setTxs] = useState<Transaction[]>([])

  useEffect(()=>{ (async()=>{
    let q = supabase.from('transactions').select('*')
    if(scope==='month'){
      const ym = `${year}-${month}`
      q = q.gte('date', `${ym}-01`).lte('date', `${ym}-31`)
    }
    if(!isAdmin(profile.role)){
      q = q.eq('user_id', (await supabase.auth.getSession()).data.session!.user.id)
    }
    const { data, error } = await q.order('date', { ascending: false })
    if(error) console.error(error)
    setTxs(data || [])
  })() }, [scope, month, year, profile.role])

  const ingresos = useMemo(()=>txs.filter(t=>t.type==='Ingreso'), [txs])
  const egresos  = useMemo(()=>txs.filter(t=>t.type==='Egreso'), [txs])
  const sum = (arr: Transaction[]) => arr.reduce((a,b)=> a + Number(b.amount), 0)

  const group = (arr: Transaction[]) => {
    const m = new Map<string, number>()
    for(const t of arr){ m.set(t.account, (m.get(t.account)||0) + Number(t.amount)) }
    return Array.from(m.entries()).map(([account, total])=>({ account, total }))
  }

  return (
    <div>
      <div className="card" style={{display:'flex', gap:12, alignItems:'center'}}>
        <div className="label">Alcance</div>
        <select value={scope} onChange={e=>setScope(e.target.value as any)}>
          <option value="general">General</option>
          <option value="month">Por Mes y Año</option>
        </select>
        {scope==='month' && (
          <>
            <select value={month} onChange={e=>setMonth(e.target.value)}>
              {Array.from({length:12},(_,i)=> String(i+1).padStart(2,'0')).map(m=> <option key={m} value={m}>{m}</option>)}
            </select>
            <input className="input" style={{width:120}} value={year} onChange={e=>setYear(e.target.value)} />
          </>
        )}
      </div>

      <KPIChips ingresos={sum(ingresos)} egresos={sum(egresos)} />

      <div className="card">
        <div className="section-title">Ingresos vs Egresos</div>
        <div style={{maxWidth:300, margin:'0 auto'}}>
          <Pie data={{
            labels: ['Ingresos','Egresos'],
            datasets: [{ data: [sum(ingresos), sum(egresos)], backgroundColor: ['#48bb78','#f56565'] }]
          }} />
        </div>
      </div>

      <div className="card">
        <div className="section-title">Ingresos por Subconcepto</div>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Subconcepto</th><th>Total</th></tr></thead>
            <tbody>
              {group(ingresos).map(row=> (
                <tr key={row.account}><td>{row.account}</td><td>{fmtMoney(row.total)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <div className="section-title">Egresos por Subconcepto</div>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Subconcepto</th><th>Total</th></tr></thead>
            <tbody>
              {group(egresos).map(row=> (
                <tr key={row.account}><td>{row.account}</td><td>{fmtMoney(row.total)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
