
import { fmtMoney } from '../lib/utils'
export default function KPIChips({ ingresos, egresos }:{ ingresos:number, egresos:number }){
  const saldo = ingresos - egresos
  return (
    <div className="card" style={{display:'flex', gap:12, alignItems:'center'}}>
      <span className="badge green">Ingresos: {fmtMoney(ingresos)}</span>
      <span className="badge red">Egresos: {fmtMoney(egresos)}</span>
      <span className={`badge ${saldo>=0? 'green':'red'}`}>Saldo Neto: {fmtMoney(saldo)}</span>
    </div>
  )
}
