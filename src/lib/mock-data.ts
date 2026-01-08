import type { Store, Message, Task, TaskStoreAssignment, TaskProof, StoreDailyPerformance, Goal, MessageStoreTarget, MessageReply } from '@/types';

// Mock Stores
export const mockStores: Store[] = [
  { id: '1', store_code: 'NYC-001', store_name: 'Manhattan Flagship', region: 'Northeast', store_type: 'Flagship', is_active: true, created_at: '2024-01-01', updated_at: '2024-01-01' },
  { id: '2', store_code: 'NYC-002', store_name: 'Brooklyn Heights', region: 'Northeast', store_type: 'Standard', is_active: true, created_at: '2024-01-01', updated_at: '2024-01-01' },
  { id: '3', store_code: 'LA-001', store_name: 'Beverly Hills', region: 'West', store_type: 'Premium', is_active: true, created_at: '2024-01-01', updated_at: '2024-01-01' },
  { id: '4', store_code: 'LA-002', store_name: 'Santa Monica', region: 'West', store_type: 'Standard', is_active: true, created_at: '2024-01-01', updated_at: '2024-01-01' },
  { id: '5', store_code: 'CHI-001', store_name: 'Magnificent Mile', region: 'Midwest', store_type: 'Flagship', is_active: true, created_at: '2024-01-01', updated_at: '2024-01-01' },
  { id: '6', store_code: 'MIA-001', store_name: 'Miami Beach', region: 'Southeast', store_type: 'Premium', is_active: true, created_at: '2024-01-01', updated_at: '2024-01-01' },
  { id: '7', store_code: 'DAL-001', store_name: 'Dallas Galleria', region: 'Southwest', store_type: 'Standard', is_active: true, created_at: '2024-01-01', updated_at: '2024-01-01' },
  { id: '8', store_code: 'SEA-001', store_name: 'Seattle Downtown', region: 'Northwest', store_type: 'Standard', is_active: true, created_at: '2024-01-01', updated_at: '2024-01-01' },
];

// Mock Messages
export const mockMessages: Message[] = [
  { id: '1', title: 'Holiday Hours Update', body: 'All stores will operate with extended hours from Dec 15-24. Please ensure adequate staffing.', message_type: 'announcement', require_acknowledgment: true, sender_id: 'admin1', created_at: '2024-12-01T09:00:00Z', updated_at: '2024-12-01T09:00:00Z' },
  { id: '2', title: 'New POS System Training', body: 'Please complete the new POS training module by end of week. Contact IT for any issues.', message_type: 'actionable', require_acknowledgment: true, sender_id: 'admin1', created_at: '2024-12-02T10:30:00Z', updated_at: '2024-12-02T10:30:00Z' },
  { id: '3', title: 'Q4 Promotional Guidelines', body: 'Attached are the Q4 promotional materials. Display setup must be completed by Dec 5.', message_type: 'announcement', require_acknowledgment: false, sender_id: 'admin2', created_at: '2024-12-03T08:00:00Z', updated_at: '2024-12-03T08:00:00Z' },
  { id: '4', title: 'Inventory Count Reminder', body: 'Monthly inventory count is due this Friday. Please confirm completion status.', message_type: 'actionable', require_acknowledgment: true, sender_id: 'admin1', created_at: '2024-12-04T14:00:00Z', updated_at: '2024-12-04T14:00:00Z' },
];

// Mock Message Store Targets
export const mockMessageTargets: MessageStoreTarget[] = [
  { id: '1', message_id: '1', store_id: '1', is_read: true, read_at: '2024-12-01T10:00:00Z', is_acknowledged: true, acknowledged_at: '2024-12-01T10:30:00Z' },
  { id: '2', message_id: '1', store_id: '2', is_read: true, read_at: '2024-12-01T11:00:00Z', is_acknowledged: true, acknowledged_at: '2024-12-01T11:15:00Z' },
  { id: '3', message_id: '1', store_id: '3', is_read: true, read_at: '2024-12-01T12:00:00Z', is_acknowledged: false, acknowledged_at: null },
  { id: '4', message_id: '1', store_id: '4', is_read: false, read_at: null, is_acknowledged: false, acknowledged_at: null },
  { id: '5', message_id: '2', store_id: '1', is_read: true, read_at: '2024-12-02T11:00:00Z', is_acknowledged: true, acknowledged_at: '2024-12-02T14:00:00Z' },
  { id: '6', message_id: '2', store_id: '2', is_read: true, read_at: '2024-12-02T12:00:00Z', is_acknowledged: false, acknowledged_at: null },
  { id: '7', message_id: '2', store_id: '3', is_read: false, read_at: null, is_acknowledged: false, acknowledged_at: null },
];

// Mock Message Replies
export const mockMessageReplies: MessageReply[] = [
  { id: '1', message_id: '2', store_id: '1', reply_text: 'Training completed for all team members.', created_at: '2024-12-02T14:30:00Z' },
  { id: '2', message_id: '4', store_id: '2', reply_text: 'We are on track for Friday completion.', created_at: '2024-12-04T15:00:00Z' },
];

// Mock Tasks
export const mockTasks: Task[] = [
  { id: '1', title: 'Morning Store Opening Checklist', description: 'Complete daily opening procedures including cash drawer, lights, and signage.', priority: 'high', due_date: '2024-12-05', due_time: '09:00:00', recurrence: 'daily', require_photo: false, require_checklist: true, require_numeric_input: false, require_comments: false, is_campaign: false, campaign_name: null, created_by: 'admin1', created_at: '2024-01-01', updated_at: '2024-01-01' },
  { id: '2', title: 'Holiday Display Setup', description: 'Set up holiday promotional displays according to planogram.', priority: 'critical', due_date: '2024-12-06', due_time: '18:00:00', recurrence: 'none', require_photo: true, require_checklist: true, require_numeric_input: false, require_comments: true, is_campaign: true, campaign_name: 'Holiday 2024', created_by: 'admin1', created_at: '2024-12-01', updated_at: '2024-12-01' },
  { id: '3', title: 'Weekly Inventory Audit', description: 'Complete full store inventory count and reconciliation.', priority: 'medium', due_date: '2024-12-07', due_time: '17:00:00', recurrence: 'weekly', require_photo: false, require_checklist: false, require_numeric_input: true, require_comments: true, is_campaign: false, campaign_name: null, created_by: 'admin2', created_at: '2024-01-01', updated_at: '2024-01-01' },
  { id: '4', title: 'Customer Service Excellence Training', description: 'Complete online training module for customer service standards.', priority: 'low', due_date: '2024-12-10', due_time: '12:00:00', recurrence: 'none', require_photo: false, require_checklist: false, require_numeric_input: false, require_comments: true, is_campaign: false, campaign_name: null, created_by: 'admin1', created_at: '2024-12-03', updated_at: '2024-12-03' },
  { id: '5', title: 'Product Knowledge Assessment', description: 'Complete Q4 product knowledge quiz for all team members.', priority: 'medium', due_date: '2024-12-08', due_time: '16:00:00', recurrence: 'none', require_photo: false, require_checklist: false, require_numeric_input: true, require_comments: false, is_campaign: true, campaign_name: 'Holiday 2024', created_by: 'admin1', created_at: '2024-12-02', updated_at: '2024-12-02' },
];

// Mock Task Assignments
export const mockTaskAssignments: TaskStoreAssignment[] = [
  // Task 1 - Daily Opening (all stores)
  { id: '1', task_id: '1', store_id: '1', status: 'completed', completed_at: '2024-12-05T08:45:00Z', is_on_time: true },
  { id: '2', task_id: '1', store_id: '2', status: 'completed', completed_at: '2024-12-05T09:15:00Z', is_on_time: false },
  { id: '3', task_id: '1', store_id: '3', status: 'completed', completed_at: '2024-12-05T08:30:00Z', is_on_time: true },
  { id: '4', task_id: '1', store_id: '4', status: 'pending', completed_at: null, is_on_time: null },
  { id: '5', task_id: '1', store_id: '5', status: 'completed', completed_at: '2024-12-05T08:50:00Z', is_on_time: true },
  { id: '6', task_id: '1', store_id: '6', status: 'in_progress', completed_at: null, is_on_time: null },
  { id: '7', task_id: '1', store_id: '7', status: 'overdue', completed_at: null, is_on_time: null },
  { id: '8', task_id: '1', store_id: '8', status: 'completed', completed_at: '2024-12-05T08:55:00Z', is_on_time: true },
  // Task 2 - Holiday Display (selected stores)
  { id: '9', task_id: '2', store_id: '1', status: 'completed', completed_at: '2024-12-05T14:00:00Z', is_on_time: true },
  { id: '10', task_id: '2', store_id: '3', status: 'pending', completed_at: null, is_on_time: null },
  { id: '11', task_id: '2', store_id: '5', status: 'in_progress', completed_at: null, is_on_time: null },
  { id: '12', task_id: '2', store_id: '6', status: 'pending', completed_at: null, is_on_time: null },
  // Task 3 - Inventory Audit
  { id: '13', task_id: '3', store_id: '1', status: 'pending', completed_at: null, is_on_time: null },
  { id: '14', task_id: '3', store_id: '2', status: 'pending', completed_at: null, is_on_time: null },
  { id: '15', task_id: '3', store_id: '3', status: 'pending', completed_at: null, is_on_time: null },
  { id: '16', task_id: '3', store_id: '4', status: 'pending', completed_at: null, is_on_time: null },
];

// Mock Task Proofs
export const mockTaskProofs: TaskProof[] = [
  { id: '1', task_assignment_id: '9', proof_type: 'photo', proof_url: '/placeholder.svg', proof_value: null, status: 'pending_approval', reviewed_by: null, reviewed_at: null, rejection_reason: null, created_at: '2024-12-05T14:00:00Z' },
  { id: '2', task_assignment_id: '1', proof_type: 'checklist', proof_url: null, proof_value: '5/5 items completed', status: 'approved', reviewed_by: 'admin1', reviewed_at: '2024-12-05T09:30:00Z', rejection_reason: null, created_at: '2024-12-05T08:45:00Z' },
  { id: '3', task_assignment_id: '3', proof_type: 'photo', proof_url: '/placeholder.svg', proof_value: null, status: 'approved', reviewed_by: 'admin1', reviewed_at: '2024-12-05T10:00:00Z', rejection_reason: null, created_at: '2024-12-05T08:30:00Z' },
];

// Mock Performance Data
export const mockPerformance: StoreDailyPerformance[] = [
  { id: '1', store_id: '1', date: '2024-12-05', target_sales: 15000, actual_sales: 14750, created_at: '2024-12-05', updated_at: '2024-12-05' },
  { id: '2', store_id: '2', date: '2024-12-05', target_sales: 12000, actual_sales: 10200, created_at: '2024-12-05', updated_at: '2024-12-05' },
  { id: '3', store_id: '3', date: '2024-12-05', target_sales: 18000, actual_sales: 19500, created_at: '2024-12-05', updated_at: '2024-12-05' },
  { id: '4', store_id: '4', date: '2024-12-05', target_sales: 10000, actual_sales: 8500, created_at: '2024-12-05', updated_at: '2024-12-05' },
  { id: '5', store_id: '5', date: '2024-12-05', target_sales: 16000, actual_sales: 15800, created_at: '2024-12-05', updated_at: '2024-12-05' },
  { id: '6', store_id: '6', date: '2024-12-05', target_sales: 14000, actual_sales: 13200, created_at: '2024-12-05', updated_at: '2024-12-05' },
  { id: '7', store_id: '7', date: '2024-12-05', target_sales: 11000, actual_sales: 11500, created_at: '2024-12-05', updated_at: '2024-12-05' },
  { id: '8', store_id: '8', date: '2024-12-05', target_sales: 13000, actual_sales: 12100, created_at: '2024-12-05', updated_at: '2024-12-05' },
];

// Mock Goals
export const mockGoals: Goal[] = [
  { id: '1', title: 'Holiday Sales Push', description: 'Achieve 10% increase in sales during holiday season', goal_type: 'chain', target_value: 1000000, current_value: 875000, start_date: '2024-12-01', end_date: '2024-12-31', is_active: true, created_by: 'admin1', created_at: '2024-11-25' },
  { id: '2', title: 'Boot Collection Launch', description: 'Sell 10,000 boots this week across all stores', goal_type: 'product', target_value: 10000, current_value: 6540, start_date: '2024-12-01', end_date: '2024-12-07', is_active: true, created_by: 'admin1', created_at: '2024-12-01' },
  { id: '3', title: 'Customer Satisfaction', description: 'Maintain 4.5+ star rating on customer surveys', goal_type: 'experience', target_value: 4.5, current_value: 4.3, start_date: '2024-12-01', end_date: '2024-12-31', is_active: true, created_by: 'admin2', created_at: '2024-12-01' },
];

// Helper functions
export function getStoreById(id: string): Store | undefined {
  return mockStores.find(s => s.id === id);
}

export function getTodayStats() {
  const completedToday = mockTaskAssignments.filter(a => a.status === 'completed').length;
  const totalToday = mockTaskAssignments.filter(a => a.task_id === '1' || a.task_id === '2').length;
  const onTimeCount = mockTaskAssignments.filter(a => a.is_on_time === true).length;
  const lateCount = mockTaskAssignments.filter(a => a.is_on_time === false).length;
  const overdueCount = mockTaskAssignments.filter(a => a.status === 'overdue').length;

  const readMessages = mockMessageTargets.filter(t => t.is_read).length;
  const totalMessageTargets = mockMessageTargets.length;

  const totalSales = mockPerformance.reduce((sum, p) => sum + p.actual_sales, 0);
  const totalTarget = mockPerformance.reduce((sum, p) => sum + p.target_sales, 0);

  return {
    tasks: {
      completed: completedToday,
      total: totalToday,
      onTime: onTimeCount,
      late: lateCount,
      overdue: overdueCount,
    },
    communications: {
      read: readMessages,
      total: totalMessageTargets,
      percentage: Math.round((readMessages / totalMessageTargets) * 100),
    },
    performance: {
      totalSales,
      totalTarget,
      percentage: Math.round((totalSales / totalTarget) * 100),
    },
  };
}

export function getStoreLeaderboard() {
  return mockPerformance
    .map(p => {
      const store = getStoreById(p.store_id);
      return {
        store_id: p.store_id,
        store_name: store?.store_name || 'Unknown Store',
        store_code: store?.store_code || '',
        target: p.target_sales,
        actual: p.actual_sales,
        percentage: Math.round((p.actual_sales / p.target_sales) * 100),
      };
    })
    .sort((a, b) => b.percentage - a.percentage);
}

export function getPendingProofs() {
  return mockTaskProofs.filter(p => p.status === 'pending_approval');
}
