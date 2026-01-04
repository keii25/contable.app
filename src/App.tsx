
import { useEffect, useState } from 'react'
import { Routes, Route, NavLink, useNavigate } from 'react-router-dom'
import { supabase } from './lib/supabaseClient'
import type { Profile } from './lib/types'
import { isAdmin } from './lib/utils'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Transactions from './pages/Transactions'
import Reports from './pages/Reports'
import Admin from './pages/Admin'
import Landing from './pages/Landing'

function Navbar({ profile, onLogout }: { profile: Profile | null, onLogout: ()=>void }){
  const [open, setOpen] = useState(false)
  return (
    <div className="navbar">
      <div className="container inner">
        <button className="btn outline menu-btn" onClick={()=>setOpen(o=>!o)} aria-label="Menu">☰</button>
        <div className={`links ${open ? 'open' : ''}`}> 
          <NavLink to="/" className={({isActive})=> isActive? 'active' : ''}>Dashboard</NavLink>
          <NavLink to="/transactions" className={({isActive})=> isActive? 'active' : ''}>Transacciones</NavLink>
          <NavLink to="/reports" className={({isActive})=> isActive? 'active' : ''}>Reportes</NavLink>
          {isAdmin(profile?.role) && (
            <NavLink to="/admin" className={({isActive})=> isActive? 'active' : ''}>Admin</NavLink>
          )}
          {/* Nota: ocultamos 'Inicio' (landing) cuando hay perfil autenticado */}
          {!profile && (
            <NavLink to="/landing" className={({isActive})=> isActive? 'active' : ''}>Inicio</NavLink>
          )}
        </div>
        <div className="spacer" />
        <div className="user">{profile?.username || profile?.email || '—'}</div>
        <button className="logout" onClick={onLogout}>Salir</button>
      </div>
    </div>
  )
}

export default function App(){
  const [profile, setProfile] = useState<Profile | null>(null)
  const [ready, setReady] = useState(false)
  const navigate = useNavigate()

  useEffect(()=>{
    const run = async ()=>{
      const { data: { session } } = await supabase.auth.getSession()
      if(!session){ setReady(true); navigate('/landing'); return }
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', session.user.id)
        .single()
      if(error){ console.error(error); }
      setProfile(data ?? null)
      setReady(true)
    }
    run()
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, sess)=>{
      if(!sess){ setProfile(null); navigate('/landing') }
    })
    return ()=>{ sub.subscription.unsubscribe() }
  },[])

  const logout = async ()=>{
    localStorage.clear()
    await supabase.auth.signOut()
    navigate('/landing')
  }

  if(!ready) return null

  if(!profile) return (
    <div>
      <div className="container" style={{paddingTop: 16, paddingBottom: 40}}>
        <Routes>
          <Route path="/landing" element={<Landing />} />
          <Route path="/login" element={<Login onLogged={()=>window.location.href='/'} />} />
          <Route path="*" element={<Landing />} />
        </Routes>
      </div>
    </div>
  )

  return (
    <div>
      <Navbar profile={profile} onLogout={logout} />
      <div className="container" style={{paddingTop: 16, paddingBottom: 40}}>
        <Routes>
          <Route path="/" element={<Dashboard profile={profile} />} />
          <Route path="/transactions" element={<Transactions profile={profile} />} />
          <Route path="/reports" element={<Reports profile={profile} />} />
          {isAdmin(profile.role) && <Route path="/admin" element={<Admin profile={profile} />} />}
          <Route path="/login" element={<Login onLogged={()=>window.location.href='/'} />} />
          <Route path="/landing" element={<Landing />} />
        </Routes>
      </div>
    </div>
  )
}
