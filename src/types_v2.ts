export interface Subscription {
  id: string;
  user_id: string;
  service_name: string;
  status: string;
  proxima_fecha?: string | null;
  created_at: string;
  updated_at: string;
  email_cuenta?: string | null;
  password_cuenta?: string | null;
  perfil?: string | null;
  pin?: string | null;
}

export interface SubscriptionUpdatePayload {
  email_cuenta?: string | null;
  password_cuenta?: string | null;
  perfil?: string | null;
  pin?: string | null;
  proxima_fecha?: string | null;
  status?: string;
}

export interface CredentialRecord {
  service_name?: string;
  email_cuenta?: string | null;
  password_cuenta?: string | null;
  perfil?: string | null;
  pin?: string | null;
}

export interface OrderApprovalResult {
  id: string;
  status: string;
}
