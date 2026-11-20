export type UserRole = 'super_admin' | 'admin' | 'employee';

export interface Profile {
  id: string;
  full_name: string;
  phone: string | null;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ModulePermission {
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
}

export type CrmModule =
  | 'leads'
  | 'properties'
  | 'follow_ups'
  | 'site_visits'
  | 'documents'
  | 'calls'
  | 'accounts'
  | 'reports'
  | 'employees'
  | 'settings';

export interface EmployeePermissions {
  leads?: ModulePermission;
  properties?: ModulePermission;
  follow_ups?: ModulePermission;
  site_visits?: ModulePermission;
  documents?: ModulePermission;
  calls?: ModulePermission;
  accounts?: ModulePermission;
  reports?: ModulePermission;
  employees?: ModulePermission;
  settings?: ModulePermission;
  [key: string]: ModulePermission | undefined;
}

export interface Employee {
  id: string;
  user_id: string;
  designation: string;
  joining_date: string;
  permissions: EmployeePermissions;
  manager_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Joined relation fields:
  profile?: Profile;
}

export interface RolePermission {
  id: string;
  role: UserRole;
  module: string;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
  created_at: string;
}

export interface CompanySettings {
  id: string;
  company_name: string;
  logo_url: string | null;
  phone: string | null;
  whatsapp_number: string | null;
  address: string | null;
  email: string | null;
  website: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  actor_id: string | null;
  action: 'INSERT' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT';
  entity_type: string;
  entity_id: string | null;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  created_at: string;
  actor_profile?: Profile | null;
}

export interface Lead {
  id: string;
  lead_number: number;
  full_name: string;
  email: string | null;
  phone: string;
  alternate_phone: string | null;
  status: 'new' | 'contacted' | 'interested' | 'site_visit_scheduled' | 'negotiation' | 'closed_won' | 'closed_lost';
  source: 'website' | 'referral' | 'whatsapp' | 'direct_call' | 'portal' | 'walk_in';
  budget_min: number | null;
  budget_max: number | null;
  property_type: string | null;
  preferred_location: string | null;
  requirement: string | null;
  assigned_to: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Property {
  id: string;
  property_code: string | null;
  title: string;
  description: string | null;
  property_type: 'apartment' | 'villa' | 'commercial' | 'land' | 'penthouse';
  listing_type: 'sale' | 'rent' | 'lease';
  price: number;
  size_sqft: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  address: string;
  city: string;
  state: string;
  pincode: string | null;
  status: 'available' | 'under_offer' | 'sold' | 'rented' | 'off_market';
  assigned_agent_id: string | null;
  photos: string[];
  amenities: string[];
  created_at: string;
  updated_at: string;
}

export interface FollowUp {
  id: string;
  lead_id: string;
  assigned_to: string;
  scheduled_at: string;
  status: 'pending' | 'completed' | 'rescheduled' | 'cancelled';
  remarks: string | null;
  outcome: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SiteVisit {
  id: string;
  lead_id: string;
  property_id: string;
  assigned_to: string;
  visit_date: string;
  status: 'scheduled' | 'completed' | 'cancelled' | 'no_show';
  feedback: string | null;
  client_interest_level: 'hot' | 'warm' | 'cold' | null;
  created_at: string;
  updated_at: string;
}

export interface DocumentItem {
  id: string;
  title: string;
  file_url: string;
  file_type: string | null;
  file_size: number | null;
  bucket_name: string;
  lead_id: string | null;
  property_id: string | null;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CallRecord {
  id: string;
  lead_id: string;
  employee_id: string;
  call_type: 'incoming' | 'outgoing' | 'missed';
  duration_seconds: number;
  recording_url: string | null;
  notes: string | null;
  call_time: string;
  created_at: string;
}

export interface Deal {
  id: string;
  lead_id: string;
  property_id: string;
  employee_id: string;
  deal_value: number;
  commission_amount: number;
  deal_date: string;
  status: 'in_progress' | 'closed_won' | 'cancelled';
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface BrokerageRecord {
  id: string;
  deal_id: string;
  agent_id: string;
  total_brokerage: number;
  paid_brokerage: number;
  pending_brokerage: number;
  payment_status: 'unpaid' | 'partially_paid' | 'fully_paid';
  payment_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExpenseRecord {
  id: string;
  title: string;
  category: 'marketing' | 'office' | 'travel' | 'legal' | 'maintenance' | 'other';
  amount: number;
  expense_date: string;
  paid_to: string | null;
  approved_by: string | null;
  receipt_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface AttendanceRecord {
  id: string;
  employee_id: string;
  date: string;
  check_in: string | null;
  check_out: string | null;
  status: 'present' | 'absent' | 'half_day' | 'on_leave';
  notes: string | null;
  created_at: string;
}

export interface DashboardStats {
  totalLeads: number;
  newLeads: number;
  pendingFollowUps: number;
  siteVisitsToday: number;
  closedDeals: number;
  availableProperties: number;
}
