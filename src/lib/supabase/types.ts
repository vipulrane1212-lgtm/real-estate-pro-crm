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

export type LeadStatus =
  | 'new'
  | 'contacted'
  | 'follow_up'
  | 'site_visit'
  | 'negotiation'
  | 'closed_won'
  | 'closed_lost';

export type LeadType = 'buy' | 'sell' | 'rent' | 'commercial';

export type LeadSource =
  | 'walk_in'
  | 'reference'
  | 'instagram'
  | 'google'
  | 'website'
  | 'other';

export interface Lead {
  id: string;
  lead_number: number;
  full_name: string;
  email: string | null;
  phone: string;
  alternate_phone: string | null;
  status: LeadStatus;
  source: LeadSource;
  lead_type: LeadType;
  budget_min: number | null;
  budget_max: number | null;
  property_type: string | null;
  location: string | null;
  preferred_location: string | null;
  requirement: string | null;
  remarks: string | null;
  assigned_to: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  assigned_employee?: {
    id: string;
    designation: string;
    profile?: {
      full_name: string;
      phone: string | null;
    };
  } | null;
}

export interface LeadHistoryItem {
  id: string;
  lead_id: string;
  actor_id: string | null;
  actor_name: string | null;
  action_type: 'created' | 'status_change' | 'note' | 'call' | 'visit' | 'follow_up' | 'assignment' | 'updated';
  title: string;
  description: string | null;
  details: Record<string, unknown>;
  created_at: string;
}

export type PropertyType =
  | 'new_project'
  | 'resale'
  | 'rental'
  | 'commercial'
  | 'plot_land';

export type PropertyStatus = 'available' | 'hold' | 'sold' | 'rented';

export interface Property {
  id: string;
  property_code: string | null;
  title: string;
  description: string | null;
  property_type: PropertyType;
  listing_type: 'sale' | 'rent' | 'lease';
  price: number;
  size_sqft: number | null;
  bhk: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  location: string | null;
  address: string;
  city: string;
  state: string;
  pincode: string | null;
  status: PropertyStatus;
  assigned_agent_id: string | null;
  photos: string[];
  video_url: string | null;
  document_url: string | null;
  view_360_url: string | null;
  owner_name: string | null;
  owner_phone: string | null;
  amenities: string[];
  created_at: string;
  updated_at: string;
  assigned_agent?: {
    id: string;
    designation: string;
    profile?: {
      full_name: string;
      phone: string | null;
    };
  } | null;
}

export type FollowUpType = 'call' | 'visit' | 'whatsapp' | 'meeting';
export type FollowUpStatus = 'pending' | 'completed' | 'rescheduled' | 'cancelled';

export interface FollowUp {
  id: string;
  lead_id: string;
  assigned_to: string;
  scheduled_at: string;
  status: FollowUpStatus;
  follow_up_type: FollowUpType;
  remarks: string | null;
  outcome: string | null;
  reminder_at: string | null;
  snoozed_until: string | null;
  acknowledged_at: string | null;
  repeat_count: number;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  lead?: {
    id: string;
    full_name: string;
    phone: string;
    status: string;
    location: string | null;
    requirement: string | null;
    lead_type: string | null;
  } | null;
  employee?: {
    id: string;
    designation: string;
    profile?: {
      full_name: string;
    };
  } | null;
}

export type CallOutcome = 'connected' | 'not_answered' | 'busy' | 'wrong_number';

export interface CallRecord {
  id: string;
  lead_id: string;
  employee_id: string;
  call_type: 'incoming' | 'outgoing' | 'missed';
  outcome: CallOutcome;
  duration_seconds: number;
  client_phone: string | null;
  recording_url: string | null;
  notes: string | null;
  call_time: string;
  provider_call_id: string | null;
  created_at: string;
  lead?: {
    id: string;
    full_name: string;
    phone: string;
  } | null;
  employee?: {
    id: string;
    designation: string;
    profile?: {
      full_name: string;
    };
  } | null;
}

export type WhatsAppTemplateName =
  | 'intro'
  | 'property_share'
  | 'site_visit_reminder'
  | 'follow_up'
  | 'festival_greeting'
  | 'custom';

export interface WhatsAppMessage {
  id: string;
  lead_id: string;
  employee_id: string;
  recipient_phone: string;
  template_name: WhatsAppTemplateName;
  message_text: string;
  status: 'sent_via_wa_me' | 'queued' | 'sent' | 'delivered' | 'read' | 'failed';
  provider_message_id: string | null;
  created_at: string;
  lead?: {
    id: string;
    full_name: string;
    phone: string;
  } | null;
  employee?: {
    id: string;
    designation: string;
    profile?: {
      full_name: string;
    };
  } | null;
}

export type SiteVisitStatus = 'scheduled' | 'completed' | 'cancelled' | 'no_show';
export type SiteVisitFeedback = 'interested' | 'not_interested' | 'negotiating' | null;

export interface SiteVisit {
  id: string;
  lead_id: string;
  property_id: string;
  assigned_to: string;
  visit_date: string;
  status: SiteVisitStatus;
  feedback: SiteVisitFeedback;
  outcome_note: string | null;
  cancellation_reason: string | null;
  client_interest_level: 'hot' | 'warm' | 'cold' | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  lead?: {
    id: string;
    full_name: string;
    phone: string;
    location: string | null;
  } | null;
  property?: {
    id: string;
    title: string;
    location: string | null;
    price: number;
    bhk: string | null;
  } | null;
  assigned_employee?: {
    id: string;
    designation: string;
    profile?: {
      full_name: string;
      phone: string | null;
    };
  } | null;
}

export interface Deal {
  id: string;
  deal_number: number;
  lead_id: string;
  property_id: string;
  employee_id: string;
  deal_value: number;
  commission_amount: number;
  brokerage_percentage: number;
  deal_date: string;
  closed_date: string;
  agreement_end_date?: string | null;
  status: 'in_progress' | 'closed_won' | 'cancelled';
  notes: string | null;
  created_at: string;
  updated_at: string;
  lead?: {
    id: string;
    full_name: string;
    phone: string;
  } | null;
  property?: {
    id: string;
    title: string;
    location: string | null;
    price: number;
  } | null;
  employee?: {
    id: string;
    designation: string;
    profile?: {
      full_name: string;
    };
  } | null;
}

export interface BrokerageRecord {
  id: string;
  deal_id: string;
  agent_id: string;
  total_brokerage: number;
  paid_brokerage: number;
  pending_brokerage: number;
  brokerage_percentage: number;
  payment_status: 'unpaid' | 'partially_paid' | 'fully_paid';
  payment_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  deal?: Deal | null;
  agent?: {
    id: string;
    designation: string;
    profile?: {
      full_name: string;
    };
  } | null;
}

export type DocumentType =
  | 'aadhaar'
  | 'pan'
  | 'agreement'
  | 'index_2'
  | 'oc'
  | 'cc'
  | 'rera'
  | 'other';

export interface DocumentRecord {
  id: string;
  title: string;
  document_type: DocumentType;
  file_url: string;
  file_type?: string | null;
  file_size?: number | null;
  bucket_name: string;
  lead_id?: string | null;
  property_id?: string | null;
  deal_id?: string | null;
  uploaded_by?: string | null;
  expiry_date?: string | null;
  created_at: string;
  updated_at: string;
  uploader?: {
    id: string;
    full_name: string;
  } | null;
  lead?: {
    id: string;
    full_name: string;
    phone: string;
  } | null;
  property?: {
    id: string;
    title: string;
  } | null;
  deal?: {
    id: string;
    deal_number: number;
  } | null;
}

export type ExpenseCategory =
  | 'rent'
  | 'electricity'
  | 'tea_coffee'
  | 'travel'
  | 'marketing'
  | 'stationery'
  | 'salary_advance'
  | 'other';

export interface ExpenseRecord {
  id: string;
  headline?: string;
  title?: string;
  category?: ExpenseCategory | string;
  amount: number;
  expense_date: string;
  paid_to: string | null;
  employee_id?: string | null;
  approved_by?: string | null;
  receipt_url: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  employee?: {
    id: string;
    designation: string;
    profile?: {
      full_name: string;
    };
  } | null;
}

export type AttendanceStatus = 'present' | 'late' | 'absent' | 'half_day';

export interface AttendanceRecord {
  id: string;
  employee_id: string;
  date: string;
  check_in: string | null;
  check_out: string | null;
  check_in_selfie_url?: string | null;
  check_in_latitude?: number | null;
  check_in_longitude?: number | null;
  check_in_address?: string | null;
  check_out_selfie_url?: string | null;
  check_out_latitude?: number | null;
  check_out_longitude?: number | null;
  check_out_address?: string | null;
  status: AttendanceStatus | string;
  is_late: boolean;
  notes: string | null;
  created_at: string;
  employee?: {
    id: string;
    designation: string;
    profile?: {
      full_name: string;
      phone?: string | null;
    };
  } | null;
}

export interface DashboardStats {
  totalLeads: number;
  newLeads: number;
  pendingFollowUps: number;
  siteVisitsToday: number;
  closedDeals: number;
  availableProperties: number;
}
