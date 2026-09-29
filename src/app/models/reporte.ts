export interface FilaReporte {
  fecha: string;
  compras: number;
  entradas: number;
  entradasCombos: number;
  candy: number;
  total: number;
}
export interface ReporteVentas {
  desde: string;
  hasta: string;
  generado: string;
  comprasSinButacas: number;
  filas: FilaReporte[];
  totales: FilaReporte;
}
