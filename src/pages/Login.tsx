
import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function Login({ onLogged }:{ onLogged: ()=>void }){
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: React.FormEvent)=>{
    e.preventDefault()
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if(error){ setError(error.message); return }
    onLogged()
  }

  return (
    <div style={{display:'grid', placeItems:'center', height:'calc(100vh - 60px)'}}>
      <form onSubmit={submit} className="card" style={{width:320}}>
        <h2 style={{marginTop:0}}>Login</h2>
        <div className="label">Email</div>
        <input className="input" value={email} onChange={e=>setEmail(e.target.value)} type="email" required />
        <div className="label">Password</div>
        <div style={{display:'flex', gap:8}}>
          <input className="input" style={{flex:1}} value={password} onChange={e=>setPassword(e.target.value)} type={show? 'text':'password'} required />
          <button type="button" className="btn outline" onClick={()=>setShow(s=>!s)}>{show? 'Ocultar':'Mostrar'}</button>
        </div>
        {error && <div style={{color:'red', marginTop:8}}>{error}</div>}
        <button className="btn blue" style={{width:'100%', marginTop:12}}>Ingresar</button>
      </form>
    </div>
  )
}
