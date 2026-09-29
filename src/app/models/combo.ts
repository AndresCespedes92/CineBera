export interface Combo {
  id: number;
  nombre: string;
  precio: number;
  pochoclo_id: number;
  bebida_id: number;
  activo: boolean;
}

export interface SeleccionCombo {
  combo: Combo;
  cantidad: number;
}
