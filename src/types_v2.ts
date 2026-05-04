export interface Subscription {
  id: string;
  user_id: string;
  service_name: string;
  status: string;
  proxima_fecha?: string | null;
  created_at: string;
  updated_at: string;
  credential_email?: string | null;
  credential_password?: string | null;
  profile_name?: string | null;
  profile_pin?: string | null;
}

export interface SubscriptionUpdatePayload {
  credential_email?: string | null;
  credential_password?: string | null;
  profile_name?: string | null;
  profile_pin?: string | null;
  proxima_fecha?: string | null;
  status?: string;
}

export interface CredentialRecord {
  service_name?: string;
  credential_email?: string | null;
  credential_password?: string | null;
  profile_name?: string | null;
  profile_pin?: string | null;
}

export interface OrderApprovalResult {
  id: string;
  status: string;
}
