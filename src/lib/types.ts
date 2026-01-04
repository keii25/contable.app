
export type Role = 'admin' | 'editor' | 'lector';

export interface Profile {
  id: string;
  user_id: string;
  email: string | null;
  username: string | null;
  role: Role;
  created_at: string;
}

export type TxType = 'Ingreso' | 'Egreso';

export interface Transaction {
  id: string;
  user_id: string;
  type: TxType;
  date: string; // YYYY-MM-DD
  account: string;
  amount: number;
  description?: string | null;
  cedula?: string | null;
  nombres?: string | null;
  created_at: string;
}

export interface Account {
  id: string;
  type: TxType;
  name: string;
  created_at: string;
}
