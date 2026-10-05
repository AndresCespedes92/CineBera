import { SelectorFecha } from './selector-fecha';
describe('SelectorFecha', () => {
  it('conserva fecha inicial y formato ISO', () => {
    const c = new SelectorFecha();
    c.fecha = '2026-10-05';
    c.ngOnChanges();
    const emitir = vi.spyOn(c.fechaChange, 'emit');
    c.actualizar();
    expect([c.dia, c.mes, c.anio]).toEqual([5, 10, 2026]);
    expect(emitir).toHaveBeenCalledWith('2026-10-05');
  });
  it('rechaza fechas inexistentes y acepta año bisiesto', () => {
    const c = new SelectorFecha();
    c.dia = 29;
    c.mes = 2;
    c.anio = 2025;
    const emitir = vi.spyOn(c.fechaChange, 'emit');
    c.actualizar();
    expect(c.invalida).toBe(true);
    expect(emitir).toHaveBeenLastCalledWith('');
    c.anio = 2024;
    c.actualizar();
    expect(c.invalida).toBe(false);
    expect(emitir).toHaveBeenLastCalledWith('2024-02-29');
  });
  it('mantiene las otras partes al limpiar un selector', () => {
    const c = new SelectorFecha();
    c.fecha = '2026-10-05';
    c.ngOnChanges();
    c.dia = null;
    c.actualizar();
    c.fecha = '';
    c.ngOnChanges();
    expect([c.dia, c.mes, c.anio]).toEqual([null, 10, 2026]);
  });
});
