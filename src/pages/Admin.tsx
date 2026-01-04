
import { useEffect, useState } from 'react'
import type { Profile, Account } from '../lib/types'
import { supabase, functionsUrl } from '../lib/supabaseClient'

export default function Admin({ profile }: { profile: Profile }) {
  // Perfiles y selección del perfil a administrar (propietario de las cuentas)
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [selectedUserId, setSelectedUserId] = useState<string>('')

  // Crear usuario (igual que antes)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'editor'|'lector'>('editor')

  // Cuentas contables (propias del perfil seleccionado)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [accType, setAccType] = useState<'Ingreso'|'Egreso'>('Ingreso')
  const [accName, setAccName] = useState('')

  // Cargar perfiles
  const loadProfiles = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) console.error(error)
    setProfiles(data || [])
    // Prefijar selección al primer perfil si no hay una seleccionada
    if (!selectedUserId && data && data.length) setSelectedUserId(data[0].user_id)
  }

  // Cargar cuentas del perfil seleccionado
  const loadAccounts = async () => {
    if (!selectedUserId) { setAccounts([]); return }
    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .eq('owner_user_id', selectedUserId)
      .order('type')
      .order('name')
    if (error) console.error(error)
    setAccounts(data || [])
  }

  useEffect(() => { loadProfiles() }, [])
  useEffect(() => { loadAccounts() }, [selectedUserId])

  // Crear usuario vía Edge Function (mantiene tu flujo actual)
  

const createUser = async () => {
  try {
    if (!email || !password) { alert('Email y password requeridos'); return }
    const { data, error } = await supabase.functions.invoke('admin-create-user', {
      body: { email, password, role }
    })
    if (error) { alert('Error al crear usuario: ' + (error.message || JSON.stringify(error))); return }
    await loadProfiles()
    setEmail(''); setPassword(''); setRole('editor')
  } catch (e: any) {
    alert('Error al crear usuario: ' + (e?.message || String(e)))
  }
}


  // Añadir cuenta para el perfil seleccionado (inserta owner_user_id)
  const addAccount = async () => {
    if (!selectedUserId) return alert('Selecciona un perfil')
    if (!accName.trim()) return alert('Nombre requerido')
    const { error } = await supabase
      .from('accounts')
      .insert({ type: accType, name: accName.trim(), owner_user_id: selectedUserId })
    if (error) { alert(error.message); return }
    setAccName('')
    await loadAccounts()
  }

  // Editar cuenta (del perfil seleccionado)
  const updateAccount = async (acc: Account) => {
    const name = prompt('Nuevo nombre de cuenta', acc.name)
    if (!name || !name.trim()) return
    const type = prompt('Tipo (Ingreso/Egreso)', acc.type) as 'Ingreso'|'Egreso'
    if (type !== 'Ingreso' && type !== 'Egreso') return alert('Tipo inválido')
    const { error } = await supabase
      .from('accounts')
      .update({ name: name.trim(), type })
      .eq('id', acc.id)
      .eq('owner_user_id', selectedUserId)
    if (error) { alert(error.message); return }
    await loadAccounts()
  }

  // Eliminar cuenta (del perfil seleccionado)
  const deleteAccount = async (acc: Account) => {
    if (!confirm(`¿Eliminar cuenta "${acc.name}" (${acc.type})?`)) return
    const { error } = await supabase
      .from('accounts')
      .delete()
      .eq('id', acc.id)
      .eq('owner_user_id', selectedUserId)
    if (error) { alert(error.message); return }
    await loadAccounts()
  }

  // Helper para mostrar texto del propietario (email/username)
  const ownerLabel = (uid: string) => {
    const p = profiles.find(px => px.user_id === uid)
    return p?.email || p?.username || uid
  }

  return (
    <div>
      {/* Selector de perfil a administrar */}
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Selecciona perfil para administrar sus cuentas</h3>
        <div className="row">
          <div className="col-6">
            <div className="label">Perfil (usuario)</div>
            <select value={selectedUserId} onChange={e => setSelectedUserId(e.target.value)}>
              {profiles.map(p => (
                <option key={p.id} value={p.user_id}>
                  {p.email || p.username || p.user_id}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Crear usuario (igual que antes) */}
      <div className="card" style={{ marginTop: 16 }}>
        <h3 style={{ marginTop: 0 }}>Crear usuario</h3>
        <div className="row">
          <div className="col-6"><div className="label">Email</div><input className="input" value={email} onChange={e => setEmail(e.target.value)} /></div>
          <div className="col-6"><div className="label">Password</div><input className="input" value={password} onChange={e => setPassword(e.target.value)} /></div>
          <div className="col-6">
            <div className="label">Rol</div>
            <select value={role} onChange={e => setRole(e.target.value as any)}>
              <option value="editor">editor</option>
              <option value="lector">lector</option>
            </select>
          </div>
          <div className="col-6" style={{ display: 'flex', alignItems: 'end' }}>
            <button className="btn green" onClick={createUser}>Crear</button>
          </div>
        </div>
      </div>

      {/* ABM de cuentas por perfil */}
      <div className="card" style={{ marginTop: 16 }}>
        <h3 style={{ marginTop: 0 }}>Cuentas contables del perfil seleccionado</h3>
        <div className="row">
          <div className="col-6">
            <div className="label">Tipo</div>
            <select value={accType} onChange={e => setAccType(e.target.value as any)}>
              <option value="Ingreso">Ingreso</option>
              <option value="Egreso">Egreso</option>
            </select>
          </div>
          <div className="col-6">
            <div className="label">Nombre</div>
            <input className="input" value={accName} onChange={e => setAccName(e.target.value)} placeholder="p.ej. Diezmos" />
          </div>
          <div className="col-12" style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn green" onClick={addAccount}>Añadir cuenta</button>
          </div>
        </div>

        <div className="table-wrap" style={{ marginTop: 12 }}>
          <table className="table">
            <thead>
              <tr><th>Tipo</th><th>Nombre</th><th>Propietario</th><th>Creado</th><th></th></tr>
            </thead>
            <tbody>
              {accounts.map(a => (
                <tr key={a.id}>
                  <td>{a.type}</td>
                  <td>{a.name}</td>
                  <td>{ownerLabel(a.owner_user_id as any)}</td>
                  <td>{new Date(a.created_at).toISOString().slice(0, 10)}</td>
                  <td>
                    <button className="btn blue" onClick={() => updateAccount(a)}>Editar</button>
                    <button className="btn red" onClick={() => deleteAccount(a)} style={{ marginLeft: 6 }}>Eliminar</button>
                  </td>
                </tr>
              ))}
              {(!accounts || accounts.length === 0) && (
                <tr><td colSpan={5} style={{ opacity: .7, fontStyle: 'italic' }}>Sin cuentas para este perfil</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
