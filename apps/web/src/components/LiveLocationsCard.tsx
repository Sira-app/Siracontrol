import { LiveMap } from './LiveMap';

export function LiveLocationsCard({ organizationId }: { organizationId: string }) {
  return (
    <div className="card overflow-hidden">
      <div className="px-5 py-4 border-b border-neutral-100">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
          Empleados en campo
        </h3>
        <p className="text-xs text-neutral-400 mt-1">
          Actualización en tiempo real · últimas 4 horas
        </p>
      </div>
      <LiveMap organizationId={organizationId} />
    </div>
  );
}
