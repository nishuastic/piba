import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export function useExpenses() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('expenses')
      .select('*, expense_splits(*, members:member_id(id, name))')
      .order('date', { ascending: false });

    if (error) {
      console.error('Error fetching expenses:', error);
    } else {
      setExpenses(data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  const createExpense = async ({ description, total_amount, date, paid_by, notes, member_ids }) => {
    // 1. Insert the expense
    const { data: expense, error: expError } = await supabase
      .from('expenses')
      .insert([{ description, total_amount, date, paid_by: paid_by || '', notes: notes || '' }])
      .select()
      .single();
    if (expError) throw expError;

    // 2. Create splits for selected members
    if (member_ids && member_ids.length > 0) {
      const shareAmount = Math.round((total_amount / member_ids.length) * 100) / 100;
      const splits = member_ids.map((member_id) => ({
        expense_id: expense.id,
        member_id,
        share_amount: shareAmount,
        settled: false,
      }));
      const { error: splitError } = await supabase.from('expense_splits').insert(splits);
      if (splitError) throw splitError;
    }

    await fetchExpenses();
    return expense;
  };

  const updateExpense = async (id, { description, total_amount, date, paid_by, notes, member_ids }) => {
    // 1. Update the expense record
    const { error: expError } = await supabase
      .from('expenses')
      .update({ description, total_amount, date, paid_by: paid_by || '', notes: notes || '' })
      .eq('id', id);
    if (expError) throw expError;

    // 2. If member_ids provided, recreate the splits
    if (member_ids !== undefined) {
      // Delete existing splits
      await supabase.from('expense_splits').delete().eq('expense_id', id);

      if (member_ids.length > 0) {
        const shareAmount = Math.round((total_amount / member_ids.length) * 100) / 100;
        const splits = member_ids.map((member_id) => ({
          expense_id: id,
          member_id,
          share_amount: shareAmount,
          settled: false,
        }));
        const { error: splitError } = await supabase.from('expense_splits').insert(splits);
        if (splitError) throw splitError;
      }
    }

    await fetchExpenses();
  };

  const deleteExpense = async (id) => {
    // Splits cascade-delete via FK
    const { error } = await supabase.from('expenses').delete().eq('id', id);
    if (error) throw error;
    await fetchExpenses();
  };

  const toggleSettled = async (splitId, settled) => {
    const { error } = await supabase
      .from('expense_splits')
      .update({ settled })
      .eq('id', splitId);
    if (error) throw error;
    await fetchExpenses();
  };

  return { expenses, loading, fetchExpenses, createExpense, updateExpense, deleteExpense, toggleSettled };
}

/**
 * Hook to get a member's total expense share (unsettled) for use on the Members page.
 */
export function useMemberExpenseTotals() {
  const [totals, setTotals] = useState({});
  const [loading, setLoading] = useState(true);

  const fetchTotals = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('expense_splits')
      .select('member_id, share_amount, settled');

    if (error) {
      console.error('Error fetching expense totals:', error);
      setLoading(false);
      return;
    }

    // Aggregate by member_id
    const map = {};
    for (const row of (data || [])) {
      if (!map[row.member_id]) {
        map[row.member_id] = { total: 0, unsettled: 0 };
      }
      map[row.member_id].total += Number(row.share_amount) || 0;
      if (!row.settled) {
        map[row.member_id].unsettled += Number(row.share_amount) || 0;
      }
    }
    setTotals(map);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchTotals();
  }, [fetchTotals]);

  return { totals, loading, fetchTotals };
}
