export default function NotFound() {
  return (
    <main style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#fafafa',
      fontFamily: 'system-ui, sans-serif',
      padding: '1rem',
    }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: '3rem', fontWeight: 700, color: '#F59E0B', margin: 0 }}>
          404
        </h1>
        <p style={{ color: '#525252', marginTop: '0.5rem' }}>
          La pagina que buscas no existe.
        </p>
        <a href="/" style={{
          display: 'inline-block',
          marginTop: '1.5rem',
          color: '#D97706',
          textDecoration: 'none',
          fontWeight: 500,
        }}>
          Volver al inicio
        </a>
      </div>
    </main>
  );
}
