import { describe, expect, it } from 'vitest';
import { buildSubscriptionReportRows, getTrafficLightStatusForExport } from '../lib/subscriptionExcelExport';

describe('buildSubscriptionReportRows', () => {
  it('agrupa por cliente y ordena por fecha de renovación ascendente', () => {
    const rows = [
      { id: '1', client_label: 'Ana', service_name: 'Netflix', credential_email: 'ana@x.com', credential_password: 'x', next_renewal: '2026-06-10', last_renewal: '2026-05-10', status: 'active' },
      { id: '2', client_label: 'Ana', service_name: 'Disney+', credential_email: 'ana@x.com', credential_password: 'x', next_renewal: '2026-06-05', last_renewal: '2026-05-01', status: 'active' },
      { id: '3', client_label: 'Luis', service_name: 'Prime Video', credential_email: 'luis@x.com', credential_password: 'x', next_renewal: '2026-06-08', last_renewal: '2026-05-15', status: 'active' },
    ] as any;

    const result = buildSubscriptionReportRows(rows);

    expect(result.map((item) => item.cliente)).toEqual(['Ana', 'Ana', 'Luis']);
    expect(result.filter((item) => item.cliente === 'Ana').map((item) => item.servicio)).toEqual(['Disney+', 'Netflix']);
  });

  it('calcula el estado visual y la fórmula de días restantes', () => {
    const futureDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const status = getTrafficLightStatusForExport(futureDate);

    expect(status.label).toBe('Activo');
    expect(status.color).toBe('green');
    expect(status.daysFormula).toContain('=SI');
    expect(status.daysFormula).toContain('HOY');
  });
});
