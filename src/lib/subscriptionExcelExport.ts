import ExcelJS from 'exceljs';
import { getDaysUntilExpiry } from './trafficLightUtils';

export interface SubscriptionReportRow {
  cliente: string;
  servicio: string;
  cuenta: string;
  precio: number;
  fechaInicio: string;
  fechaVencimiento: string;
  diasRestantes: number;
  estadoVisual: string;
  color: 'green' | 'yellow' | 'red';
  _sortDate: number;
}

export interface SubscriptionExportItem {
  id?: string;
  client_label?: string | null;
  user_id?: string | null;
  service_name?: string | null;
  credential_email?: string | null;
  credential_password?: string | null;
  profile_name?: string | null;
  next_renewal?: string | null;
  created_at?: string | null;
  status?: string | null;
  price?: number | null;
}

const formatDate = (value?: string | null) => {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().split('T')[0];
};

const getCustomerLabel = (item: SubscriptionExportItem) => {
  return item.client_label || item.profile_name || item.user_id || 'Cliente sin nombre';
};

const getTrafficLightColor = (daysLeft: number): 'green' | 'yellow' | 'red' => {
  if (daysLeft < 0) return 'red';
  if (daysLeft <= 3) return 'yellow';
  return 'green';
};

const getTrafficLightLabel = (daysLeft: number) => {
  if (daysLeft < 0) return 'Vencido';
  if (daysLeft <= 3) return 'Alerta';
  return 'Activo';
};

export function buildSubscriptionReportRows(rows: SubscriptionExportItem[]): SubscriptionReportRow[] {
  const normalized = rows.map((item) => {
    const daysLeft = getDaysUntilExpiry(item.next_renewal ?? null);
    const color = getTrafficLightColor(daysLeft);

    return {
      cliente: getCustomerLabel(item),
      servicio: item.service_name || 'Sin servicio',
      cuenta: [item.credential_email, item.profile_name].filter(Boolean).join(' / ') || 'Sin credenciales',
      precio: Number(item.price ?? 0),
      fechaInicio: formatDate(item.created_at),
      fechaVencimiento: formatDate(item.next_renewal),
      diasRestantes: Number.isFinite(daysLeft) ? daysLeft : 0,
      estadoVisual: getTrafficLightLabel(daysLeft),
      color,
      _sortDate: item.next_renewal ? new Date(item.next_renewal).getTime() : Number.MAX_SAFE_INTEGER,
    };
  });

  const groups = new Map<string, SubscriptionReportRow[]>();

  normalized.forEach((row) => {
    if (!groups.has(row.cliente)) {
      groups.set(row.cliente, []);
    }
    groups.get(row.cliente)!.push(row);
  });

  const groupedRows: SubscriptionReportRow[] = [];
  groups.forEach((items) => {
    items.sort((a, b) => a._sortDate - b._sortDate);
    groupedRows.push(...items);
  });

  return groupedRows;
}

export function getTrafficLightStatusForExport(expiryDate?: string | null) {
  const daysLeft = getDaysUntilExpiry(expiryDate ?? null);
  const color = getTrafficLightColor(daysLeft);
  const label = getTrafficLightLabel(daysLeft);

  return {
    daysLeft,
    color,
    label,
    daysFormula: `DIAS RESTANTES: =SI(F2>=HOY();F2-HOY();0)`,
  };
}

export function getDaysRemainingFormulaForCell(rowNumber: number) {
  return `=SI(F${rowNumber}>=HOY();F${rowNumber}-HOY();0)`;
}

export function exportSubscriptionsToExcel(rows: SubscriptionExportItem[], fileName = 'suscripciones-streaming.xlsx') {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Vortex Streaming';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet('Suscripciones');
  worksheet.columns = [
    { header: 'Cliente / Usuario', key: 'cliente', width: 24 },
    { header: 'Servicio', key: 'servicio', width: 18 },
    { header: 'Cuenta / Perfil', key: 'cuenta', width: 28 },
    { header: 'Precio ($)', key: 'precio', width: 14 },
    { header: 'Fecha de Inicio', key: 'fechaInicio', width: 16 },
    { header: 'Fecha de Vencimiento / Renovación', key: 'fechaVencimiento', width: 22 },
    { header: 'Días Restantes', key: 'diasRestantes', width: 16 },
    { header: 'Estado Visual', key: 'estadoVisual', width: 16 },
  ];

  const reportRows = buildSubscriptionReportRows(rows);

  worksheet.addRow({
    cliente: 'Cliente / Usuario',
    servicio: 'Servicio',
    cuenta: 'Cuenta / Perfil',
    precio: 'Precio ($)',
    fechaInicio: 'Fecha de Inicio',
    fechaVencimiento: 'Fecha de Vencimiento / Renovación',
    diasRestantes: 'Días Restantes',
    estadoVisual: 'Estado Visual',
  });

  reportRows.forEach((row, index) => {
    const r = worksheet.addRow({
      cliente: row.cliente,
      servicio: row.servicio,
      cuenta: row.cuenta,
      precio: row.precio,
      fechaInicio: row.fechaInicio ? new Date(row.fechaInicio) : null,
      fechaVencimiento: row.fechaVencimiento ? new Date(row.fechaVencimiento) : null,
      diasRestantes: row.diasRestantes,
      estadoVisual: row.estadoVisual,
    });

    const dataRowNumber = index + 2;
    const daysFormula = getDaysRemainingFormulaForCell(dataRowNumber);
    const daysCell = r.getCell(7);
    daysCell.value = { formula: daysFormula };
    daysCell.numFmt = '0';

    const statusCell = r.getCell(8);
    statusCell.font = { bold: true };
    statusCell.alignment = { horizontal: 'center' };

    if (row.color === 'green') {
      statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'C6EFCE' } };
      statusCell.value = '🟢 Activo';
    } else if (row.color === 'yellow') {
      statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2CC' } };
      statusCell.value = '🟡 Alerta';
    } else {
      statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F4CCCC' } };
      statusCell.value = '🔴 Vencido';
    }

    r.getCell(4).numFmt = '$#,##0.00';
    r.getCell(5).numFmt = 'dd/mm/yyyy';
    r.getCell(6).numFmt = 'dd/mm/yyyy';
  });

  const header = worksheet.getRow(1);
  header.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1F2937' } };
    cell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  worksheet.autoFilter = {
    from: 'A1',
    to: 'H' + worksheet.rowCount,
  };
  worksheet.views = [{ state: 'normal', showGridLines: true }];
  worksheet.columns.forEach((column) => {
    if (typeof column.width === 'number' && column.width < 10) {
      column.width = 10;
    }
  });

  return workbook.xlsx.writeBuffer().then((buffer) => {
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    window.URL.revokeObjectURL(url);
    return { ok: true };
  });
}
