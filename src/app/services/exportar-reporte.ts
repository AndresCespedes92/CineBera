import { ReporteVentas } from '../models/reporte';

export const criterioReporte = 'Compras actualmente pagadas; día de pago en Buenos Aires. Incluye crédito y descuentos aplicados. Excluye canceladas. No representa caja ni factura fiscal.';
export const advertenciaReporte = (r: ReporteVentas) => 'Advertencia: ' + r.comprasSinButacas + ' compras sin butacas confirmadas. Requiere revisión.';
export const columnasReporte = ['Fecha', 'Compras', 'Entradas', 'Entradas/combos ARS', 'Candy extra ARS', 'Total ARS'];
export function filasExportacion(reporte: ReporteVentas): (string | number)[][] {
  return [...reporte.filas, reporte.totales].map(f => [f.fecha, f.compras, f.entradas, f.entradasCombos, f.candy, f.total]);
}
const escaparXml = (s: string): string => s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;');
/** SpreadsheetML 2003: documento XML nativo de Excel, sin renombrarlo a XLS/XLSX. */
export function generarExcelXml(reporte: ReporteVentas): string {
  const texto = (s: string) => '<Row><Cell><Data ss:Type="String">' + escaparXml(s) + '</Data></Cell></Row>';
  const encabezado = '<Row>' + columnasReporte.map(c => '<Cell ss:StyleID="Cabecera"><Data ss:Type="String">' + escaparXml(c) + '</Data></Cell>').join('') + '</Row>';
  const filas = filasExportacion(reporte).map(f => '<Row>' + f.map((valor, i) =>
    '<Cell' + (i >= 3 ? ' ss:StyleID="Dinero"' : '') + '><Data ss:Type="' + (typeof valor === 'number' ? 'Number' : 'String') + '">' + escaparXml(String(valor)) + '</Data></Cell>').join('') + '</Row>').join('');
  return '<?xml version="1.0" encoding="UTF-8"?><?mso-application progid="Excel.Sheet"?>' +
    '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">' +
    '<Styles><Style ss:ID="Cabecera"><Font ss:Bold="1"/></Style><Style ss:ID="Dinero"><NumberFormat ss:Format="0.00"/></Style></Styles>' +
    '<Worksheet ss:Name="Ventas"><Table><Column ss:Width="90"/><Column ss:Span="1" ss:Width="65"/><Column ss:Span="2" ss:Width="125"/>' +
    texto('CineBera - Ventas del ' + reporte.desde + ' al ' + reporte.hasta) + texto('Generado (UTC): ' + reporte.generado) +
    texto(criterioReporte) + (reporte.comprasSinButacas ? texto(advertenciaReporte(reporte)) : '') + encabezado + filas + '</Table></Worksheet></Workbook>';
}
export function descargarExcel(reporte: ReporteVentas): void {
  const url = URL.createObjectURL(new Blob([generarExcelXml(reporte)], {type: 'application/xml;charset=utf-8'}));
  const enlace = document.createElement('a');
  enlace.href = url; enlace.download = 'cinebera-ventas-' + reporte.desde + '-' + reporte.hasta + '.xml';
  document.body.appendChild(enlace); enlace.click(); enlace.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export async function generarPdf(reporte: ReporteVentas) {
  const { jsPDF } = await import('jspdf');
  const pdf = new jsPDF();
  const columnas = [14, 58, 80, 124, 158, 196];
  const titulos = ['Fecha', 'Compras', 'Entradas', 'Entradas/combos', 'Candy extra', 'Total ARS'];
  let pagina = 0;
  const cabecera = () => {
    pagina++;
    pdf.setFontSize(16); pdf.text('CineBera - Reporte de ventas', 14, 18);
    pdf.setFontSize(9); pdf.text('Período: ' + reporte.desde + ' al ' + reporte.hasta + ' | Importes en ARS', 14, 26);
    pdf.text('Generado (UTC): ' + reporte.generado, 14, 32);
    pdf.text(pdf.splitTextToSize(criterioReporte, 182), 14, 39);
    if (reporte.comprasSinButacas) pdf.text(advertenciaReporte(reporte), 14, 51);
    pdf.setFontSize(8);
    titulos.forEach((t, i) => pdf.text(t, columnas[i], 57, {align: i === 0 ? 'left' : 'right'}));
    pdf.line(14, 60, 196, 60); pdf.text('Página ' + pagina, 196, 287, {align: 'right'});
  };
  cabecera(); let y = 67;
  for (const fila of filasExportacion(reporte)) {
    if (y > 275) { pdf.addPage(); cabecera(); y = 67; }
    fila.forEach((valor, i) => pdf.text(typeof valor === 'number' && i >= 3 ? valor.toFixed(2) : String(valor), columnas[i], y, {align: i === 0 ? 'left' : 'right'}));
    y += 7;
  }
  return pdf;
}
