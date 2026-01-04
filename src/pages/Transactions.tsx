
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import type { Profile, Transaction, TxType, Account } from '../lib/types'
import { fmtMoney, todayISO, isAdmin, parseNumber } from '../lib/utils'
import ConfirmDialog from '../components/ConfirmDialog'

interface Filters { from?: string; to?: string; account?: string; month?: string; q?: string; }

export default function Transactions({ profile }: { profile: Profile }) {
  const [txs, setTxs] = useState<Transaction[]>([])
  const [filters, setFilters] = useState<Filters>({})
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Transaction | null>(null)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [confirm, setConfirm] = useState<{ text:string, onOk:()=>void }|null>(null)

  // === Cargar cuentas propias del usuario logueado (dueño) ===
  const loadAccounts = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    const uid = session?.user?.id
    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .eq('owner_user_id', uid)   // <-- cuenta propia
      .order('type')
      .order('name')
    if (error) console.error(error)
    setAccounts(data || [])
  }

  // Cargar transacciones con filtros (admin ve todas; otros solo propias)
  const loadTxs = async () => {
    let q = supabase.from('transactions').select('*')
    if (!isAdmin(profile.role)) {
      const { data: { session } } = await supabase.auth.getSession()
      q = q.eq('user_id', session!.user.id)
    }
    if (filters.from)  q = q.gte('date', filters.from)
    if (filters.to)    q = q.lte('date', filters.to)
    if (filters.account) q = q.eq('account', filters.account)
    if (filters.month) q = q.gte('date', `${new Date().getFullYear()}-${filters.month}-01`)
                         .lte('date', `${new Date().getFullYear()}-${filters.month}-31`)
    if (filters.q)     q = q.or(`description.ilike.%${filters.q}%,cedula.ilike.%${filters.q}%,nombres.ilike.%${filters.q}%`)
    const { data, error } = await q.order('date', { ascending: false })
    if (error) console.error(error)
    setTxs(data || [])
  }

  useEffect(() => { loadAccounts() }, [])
  useEffect(() => { loadTxs() }, [JSON.stringify(filters), profile.role])

  const ingresos = useMemo(() => txs.filter(t => t.type === 'Ingreso'), [txs])
  const egresos  = useMemo(() => txs.filter(t => t.type === 'Egreso'),  [txs])

  const openNew = () => { setEditing(null); setShowModal(true) }
  const askEdit = (t: Transaction) => setConfirm({ text: '¿Editar este registro?', onOk: () => { setConfirm(null); setEditing(t); setShowModal(true) } })
  const askDelete = (t: Transaction) => setConfirm({ text: '¿Eliminar este registro?', onOk: async () => { setConfirm(null); await remove(t) } })

  const remove = async (t: Transaction) => {
    const { error } = await supabase.from('transactions').delete().eq('id', t.id)
    if (error) alert(error.message)
    await loadTxs()
  }

  const accountOptions = [...new Set(accounts.map(a => a.name))]

  return (
    <div>
      {/* Filtros / acciones */}
      <div className="card" style={{ display:'flex', gap:8, alignItems:'end', flexWrap:'wrap' }}>
        <div style={{ minWidth:150 }}>
          <div className="label">Fecha desde</div>
          <input className="input" type="date" value={filters.from || ''} onChange={e => setFilters(f => ({ ...f, from: e.target.value || undefined }))} />
        </div>
        <div style={{ minWidth:150 }}>
          <div className="label">Fecha hasta</div>
          <input className="input" type="date" value={filters.to || ''} onChange={e => setFilters(f => ({ ...f, to: e.target.value || undefined }))} />
        </div>
        <div style={{ minWidth:180 }}>
          <div className="label">Cuenta</div>
          <select value={filters.account || ''} onChange={e => setFilters(f => ({ ...f, account: e.target.value || undefined }))}>
            <option value="">Todas</option>
            {accountOptions.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <div style={{ minWidth:120 }}>
          <div className="label">Mes</div>
          <select value={filters.month || ''} onChange={e => setFilters(f => ({ ...f, month: e.target.value || undefined }))}>
            <option value="">—</option>
            {Array.from({ length:12 }, (_, i) => String(i + 1).padStart(2, '0')).map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div style={{ flex:1, minWidth:200 }}>
          <div className="label">Búsqueda</div>
          <input className="input" placeholder="cédula / nombres / descripción" value={filters.q || ''} onChange={e => setFilters(f => ({ ...f, q: e.target.value || undefined }))} />
        </div>
        <button className="btn outline" onClick={() => setFilters({})}>Limpiar</button>
        <button className="btn blue" onClick={loadTxs}>Buscar</button>
        <div style={{ flex:1 }} />
        <button className="btn green" onClick={openNew}>Añadir</button>
      </div>

      {/* Modales de edición y confirmación */}
      {showModal && (
        <TxModal
          profile={profile}
          accounts={accounts}
          onClose={() => setShowModal(false)}
          onSaved={async () => { setShowModal(false); await loadTxs() }}
          editing={editing}
        />
      )}
      {confirm && <ConfirmDialog text={confirm.text} onConfirm={confirm.onOk} onCancel={() => setConfirm(null)} />}

      {/* Listado Ingresos */}
      <div className="card">
        <div className="section-title">Ingresos — Listado</div>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>Fecha</th><th>Descripción</th><th>Cuenta</th><th>Cédula</th><th>Nombres y Apellidos</th><th>Valor</th><th></th></tr>
            </thead>
            <tbody>
              {ingresos.map(t => (
                <tr key={t.id}>
                  <td>{t.date}</td>
                  <td>{t.description}</td>
                  <td>{t.account}</td>
                  <td>{t.cedula}</td>
                  <td>{t.nombres}</td>
                  <td>{fmtMoney(Number(t.amount))}</td>
                  <td>
                    <button className="btn blue small" onClick={() => askEdit(t)}>Editar</button>
                    <button className="btn red small" onClick={() => askDelete(t)} style={{ marginLeft: 6 }}>Eliminar</button>
                  </td>
                </tr>
              ))}
              {(!ingresos || ingresos.length === 0) && (
                <tr><td colSpan={7} style={{ opacity: .7, fontStyle: 'italic' }}>Sin ingresos</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Listado Egresos */}
      <div className="card">
        <div className="section-title">Egresos — Listado</div>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>Fecha</th><th>Descripción</th><th>Cuenta</th><th>Valor</th><th></th></tr>
            </thead>
            <tbody>
              {egresos.map(t => (
                <tr key={t.id}>
                  <td>{t.date}</td>
                  <td>{t.description}</td>
                  <td>{t.account}</td>
                  <td>{fmtMoney(Number(t.amount))}</td>
                  <td>
                    <button className="btn blue small" onClick={() => askEdit(t)}>Editar</button>
                    <button className="btn red small" onClick={() => askDelete(t)} style={{ marginLeft: 6 }}>Eliminar</button>
                  </td>
                </tr>
              ))}
              {(!egresos || egresos.length === 0) && (
                <tr><td colSpan={5} style={{ opacity: .7, fontStyle: 'italic' }}>Sin egresos</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

/** ===== Helpers ===== */

function formatThousandsInput(v: string) {
  const cleaned = v.replace(/[^0-9]/g, '')
  if (!cleaned) return ''
  const n = Number(cleaned)
  return '$ ' + n.toLocaleString('es-ES', { maximumFractionDigits: 0 })
}

function TxModal({
  profile, accounts, editing, onClose, onSaved
}: { profile: Profile, accounts: Account[], editing: Transaction | null, onClose: ()=>void, onSaved: ()=>void }) {
  const [type, setType] = useState<TxType>(editing?.type || 'Ingreso')
  const [date, setDate] = useState<string>(editing?.date || todayISO())
  const [account, setAccount] = useState<string>(editing?.account || '')
  const [amount, setAmount] = useState<string>(String(editing?.amount ?? ''))
  const [amountDisplay, setAmountDisplay] = useState<string>(editing ? ('$ ' + Number(editing.amount).toLocaleString('es-ES', { maximumFractionDigits: 0 })) : '')
  const [description, setDescription] = useState<string>(editing?.description || '')
  const [cedula, setCedula] = useState<string>(editing?.cedula || '')
  const [nombres, setNombres] = useState<string>(editing?.nombres || '')
  const [toast, setToast] = useState<string | null>(null)

  const typeAccounts = accounts.filter(a => a.type === type)
  const existsInType = typeAccounts.some(a => a.name === account)

  const onCedulaBlur = async () => {
    if (type !== 'Ingreso' || !cedula) return
    const { data } = await supabase
      .from('transactions')
      .select('*')
      .eq('type', 'Ingreso')
      .eq('cedula', cedula)
      .order('date', { ascending: false })
      .limit(1)
    if (data && data[0]?.nombres) setNombres(data[0].nombres)
  }

  const save = async () => {
    if (!existsInType) { alert('La cuenta no pertenece al tipo seleccionado.'); return }
    if (parseNumber(amount) <= 0) { alert('El valor debe ser > 0'); return }
    if (date > todayISO()) { alert('La fecha no puede ser futura'); return }

    const payload: any = {
      type, date, account, amount: parseNumber(amount), description: description || null,
      cedula: type === 'Ingreso' ? (cedula || null) : null,
      nombres: type === 'Ingreso' ? (nombres || null) : null,
    }

    if (type === 'Ingreso') {
      if (!cedula || !nombres) { alert('Cédula y Nombres son obligatorios'); return }
    }

    if (editing) {
      const { error } = await supabase.from('transactions').update(payload).eq('id', editing.id)
      if (error) { alert(error.message); return }
      setToast('Actualizado')
    } else {
      const { data: { session } } = await supabase.auth.getSession()
      const { error } = await supabase.from('transactions').insert({ ...payload, user_id: session!.user.id })
      if (error) { alert(error.message); return }
      setToast('Guardado')
    }
    setTimeout(() => setToast(null), 1600)
    onSaved()
  }

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <button className={`btn ${type === 'Ingreso' ? 'green'  : 'outline'}`} onClick={() => setType('Ingreso')}>Ingreso</button>
          <button className={`btn ${type === 'Egreso'  ? 'yellow' : 'outline'}`} onClick={() => setType('Egreso')}>Egreso</button>
        </div>

        {type === 'Ingreso' ? (
          <div className="row" style={{ marginTop: 12 }}>
            <div className="col-6"><div className="label">Fecha</div><input className="input" type="date" max={todayISO()} value={date} onChange={e => setDate(e.target.value)} required /></div>
            <div className="col-6"><div className="label">Cuenta contable</div>
              <select value={account} onChange={e => setAccount(e.target.value)} required>
                <option value="">Seleccione</option>
                {typeAccounts.map(a => <option key={a.id} value={a.name}>{a.name}</option>)}
              </select>
            </div>
            <div className="col-6"><div className="label">Cédula</div><input className="input" value={cedula} onChange={e => setCedula(e.target.value)} onBlur={onCedulaBlur} required /></div>
            <div className="col-6"><div className="label">Nombres y Apellidos</div><input className="input" value={nombres} onChange={e => setNombres(e.target.value)} required /></div>
            <div className="col-6"><div className="label">Valor</div><input className="input" value={amountDisplay} onChange={e => { setAmountDisplay(formatThousandsInput(e.target.value)); setAmount(e.target.value) }} placeholder="$ X.XXX.XXX" required /></div>
            <div className="col-12"><div className="label">Descripción (opcional)</div><textarea className="input" value={description} onChange={e => setDescription(e.target.value)} /></div>
          </div>
        ) : (
          <div className="row" style={{ marginTop: 12 }}>
            <div className="col-6"><div className="label">Fecha</div><input className="input" type="date" max={todayISO()} value={date} onChange={e => setDate(e.target.value)} required /></div>
            <div className="col-6"><div className="label">Cuenta contable</div>
              <select value={account} onChange={e => setAccount(e.target.value)} required>
                <option value="">Seleccione</option>
                {typeAccounts.map(a => <option key={a.id} value={a.name}>{a.name}</option>)}
              </select>
            </div>
            <div className="col-6"><div className="label">Valor</div><input className="input" value={amountDisplay} onChange={e => { setAmountDisplay(formatThousandsInput(e.target.value)); setAmount(e.target.value) }} placeholder="$ X.XXX.XXX" required /></div>
            <div className="col-12"><div className="label">Descripción (opcional)</div><textarea className="input" value={description} onChange={e => setDescription(e.target.value)} /></div>
          </div>
        )}

        <div className="actions">
          <button className="btn outline" onClick={onClose}>Cerrar</button>
          <button className="btn blue" onClick={save}>Guardar</button>
        </div>

        {toast && <div className="toast">{toast}</div>}
      </div>
    </div>
  )
}
