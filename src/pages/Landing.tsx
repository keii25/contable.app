
// src/pages/Landing.tsx
import { Link } from 'react-router-dom'

export default function Landing() {
  return (
    <div>
      {/* NAVBAR STICKY */}
      <header className="landing-nav">
        <div className="container nav-inner">
          {/* Logo izquierda */}
          <Link to="/landing" className="logo" aria-label="Inicio">
            <span className="logo-text">App Contable</span>
          </Link>         
        </div>
      </header>

      {/* HERO */}
      <section className="hero">
        <div className="container">
          <h1 className="gradient-text hero-title">
            Gestión Clara de Ingresos y Egresos
          </h1>

          <p className="hero-subtitle">
            Centraliza tus transacciones, visualiza KPIs y genera reportes al instante.
            Seguridad con RLS y administración de cuentas por perfil.
          </p>

          <div className="hero-ctas">
            <Link to="/login" className="btn green hover-grow" aria-label="Comenzar ahora">
              Iniciar Sesión
            </Link>
          </div>
        </div>
      </section>

      {/* FEATURE GRID */}
      <section id="features" className="features">
        <div className="container">
          <div className="features-grid">
            <FeatureCard
              iconBg="#C6F6D5"
              icon="📈"
              title="KPIs en tiempo real"
              desc="Visualiza ingresos, egresos y saldo neto con gráficos compactos y tablas agrupadas."
            />
            <FeatureCard
              iconBg="#FEEBC8"
              icon="🧾"
              title="Reportes PDF/Excel"
              desc="Descarga reportes con el formato solicitado (PDF) y planillas Excel (.xls) por periodo."
            />
            <FeatureCard
              iconBg="#BEE3F8"
              icon="🔐"
              title="Seguridad con RLS"
              desc="Acceso por perfil y cuentas contables propias; administración desde el panel de Admin."
            />
          </div>
        </div>
      </section>

     

      {/* CTA FINAL */}
      <section id="cta-final" className="cta-final">
        <div className="container cta-inner">
          <div className="cta-content">
            <h3 className="cta-title">¿Listo para ordenar tus finanzas?</h3>
            <p className="cta-subtitle">Empieza a registrar hoy mismo y genera tus reportes en minutos.</p>
            <div className="cta-actions">
              <Link to="/login" className="btn blue hover-grow" aria-label="Crear cuenta">
                Comenzar ahora!
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

/** ===== Subcomponentes ===== */
function FeatureCard({
  iconBg,
  icon,
  title,
  desc
}: {
  iconBg: string
  icon: string
  title: string
  desc: string
}) {
  return (
    <div className="feature-card card hover-raise">
      <div className="feature-icon" style={{ background: iconBg }}>
        <span aria-hidden="true" style={{ fontSize: 22 }}>{icon}</span>
      </div>
      <div className="feature-body">
        <h4 className="feature-title">{title}</h4>
        <p className="feature-desc">{desc}</p>
      </div>
    </div>
  )
}

function LogoBox({ label }: { label: string }) {
  return (
    <div className="logo-box" role="img" aria-label={label} title={label}>
      <div className="logo-dot" />
    </div>
  )
}
