import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SiraControl — Gestión de empleados',
  description: 'Sistema integral de control de asistencia, GPS, nómina y productividad',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-CL">
      <body>{children}</body>
    </html>
  );
}
