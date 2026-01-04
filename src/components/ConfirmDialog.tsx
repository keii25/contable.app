
import { useEffect } from 'react'

export default function ConfirmDialog({ text, onConfirm, onCancel }:{ text:string, onConfirm:()=>void, onCancel:()=>void }){
  useEffect(()=>{
    const onKey = (e: KeyboardEvent)=>{ if(e.key==='Escape') onCancel() }
    window.addEventListener('keydown', onKey)
    return ()=> window.removeEventListener('keydown', onKey)
  },[onCancel])
  return (
    <div className="modal-backdrop">
      <div className="modal">
        <h3 style={{marginTop:0}}>Confirmación</h3>
        <p>{text}</p>
        <div className="actions">
          <button className="btn outline" onClick={onCancel}>Cancelar</button>
          <button className="btn red" onClick={onConfirm}>Confirmar</button>
        </div>
      </div>
    </div>
  )
}
