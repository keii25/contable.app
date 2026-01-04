
export const fmtMoney = (n: number) => {
  const r = Math.round(n);
  return '$' + new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 }).format(r);
};
export const todayISO = () => new Date().toISOString().slice(0,10);
export const isAdmin = (role?: string | null) => role === 'admin';
export const parseNumber = (v: string) => {
  const cleaned = v.replace(/[^0-9.,-]/g, '').replace(/\./g, '').replace(/,/g, '.');
  const num = Number(cleaned);
  return isNaN(num) ? 0 : num;
};
