// User and Auth Types
export type AppRole = "hq_admin" | "store_manager";

export interface UserProfile {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
}

export interface UserStoreAccess {
  id: string;
  user_id: string;
  store_id: string;
  can_access_all_stores: boolean;
  created_at: string;
}

export interface AppUser {
  id: string;                 // public.users.id
  auth_user_id: string;       // links to auth.users.id
  name: string;
  role: AppRole;
}

// Store Types
export interface Store {
  id: string;
  code: string;
  name: string;
  region: string | null;
}

// Message Types
export type MessageType = 'announcement' | 'actionable';

export interface Message {
  id: string;
  title: string;
  body: string;
  message_type: MessageType;
  require_acknowledgment: boolean;
  sender_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface MessageStoreTarget {
  id: string;
  message_id: string;
  store_id: string;
  is_read: boolean;
  read_at: string | null;
  is_acknowledged: boolean;
  acknowledged_at: string | null;
}

export interface MessageAttachment {
  id: string;
  message_id: string;
  file_name: string;
  file_url: string;
  file_type: string | null;
  created_at: string;
}

export interface MessageReply {
  id: string;
  message_id: string;
  store_id: string;
  reply_text: string;
  created_at: string;
}

// Task Types
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'overdue';
export type ProofStatus = 'pending_approval' | 'approved' | 'rejected';
export type TaskRecurrence = 'none' | 'daily' | 'weekly' | 'monthly';
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';

export interface Task {
  id: string;
  title: string;
  description: string | null;
  priority: TaskPriority;
  due_date: string | null;
  due_time: string | null;
  recurrence: TaskRecurrence;
  require_photo: boolean;
  require_checklist: boolean;
  require_numeric_input: boolean;
  require_comments: boolean;
  is_campaign: boolean;
  campaign_name: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface TaskStoreAssignment {
  id: string;
  task_id: string;
  store_id: string;
  status: TaskStatus;
  completed_at: string | null;
  is_on_time: boolean | null;
}

export interface TaskProof {
  id: string;
  task_assignment_id: string;
  proof_type: string;
  proof_url: string | null;
  proof_value: string | null;
  status: ProofStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  created_at: string;
}

export interface TaskChecklistItem {
  id: string;
  task_id: string;
  item_text: string;
  order_index: number;
  created_at: string;
}

// Performance Types
export interface StoreDailyPerformance {
  id: string;
  store_id: string;
  date: string;
  target_sales: number;
  actual_sales: number;
  created_at: string;
  updated_at: string;
}

export interface Goal {
  id: string;
  title: string;
  description: string | null;
  goal_type: string;
  target_value: number;
  current_value: number;
  start_date: string;
  end_date: string;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
}

export interface GoalStoreTarget {
  id: string;
  goal_id: string;
  store_id: string;
  target_value: number;
  current_value: number;
}

// UI Types
export interface StoreFilterOption {
  value: string;
  label: string;
}

export interface StatCard {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  icon?: React.ReactNode;
}
