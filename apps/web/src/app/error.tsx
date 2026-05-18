'use client';

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
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
          Error
        </h1>
        <p style={{ color: '#525252', marginTop: '0.5rem' }}>
          Ocurrio un problema inesperado.
        </p>
        <button
          onClick={() => reset()}
          style={{
            marginTop: '1.5rem',
            padding: '0.5rem 1.5rem',
            background: '#F59E0B',
            color: '#fff',
            border: 'none',
            borderRadius: '0.5rem',
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          Reintentar
        </button>
      </div>
    </main>
  );
}
