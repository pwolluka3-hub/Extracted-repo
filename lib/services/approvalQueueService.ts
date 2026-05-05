import { createClient } from '@/lib/supabase/server';
import { type ApprovalItem } from '@/lib/types';

export async function addToApprovalQueue(
  content: string,
  metadata: Partial<ApprovalItem>
): Promise<string> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('approval_queue')
    .insert({
      content,
      metadata: metadata as any,
    })
    .select()
    .single();

  if (error) throw error;
  return data.id;
}

export async function getPendingApprovals(): Promise<ApprovalItem[]> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('approval_queue')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as ApprovalItem[];
}

export async function resolveApproval(
  id: string,
  status: 'approved' | 'rejected',
  reason?: string
): Promise<void> {
  const supabase = await createClient();
  
  const { error } = await supabase
    .from('approval_queue')
    .update({ status, decision_reason: reason })
    .eq('id', id);

  if (error) throw error;
}

export const getApprovalQueue = getPendingApprovals;
export const updateApprovalStatus = resolveApproval;
