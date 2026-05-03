import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export function useTransfers() {
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchTransfers = useCallback(async () => {
    setLoading(true);
    const { data, error: err } = await supabase
      .from('transfers')
      .select('*')
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });

    if (err) {
      setError(err);
    } else {
      setTransfers(data || []);
      setError(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchTransfers();
  }, [fetchTransfers]);

  const addTransfer = async (transfer) => {
    const { data, error: err } = await supabase
      .from('transfers')
      .insert([transfer])
      .select()
      .single();

    if (err) throw err;
    setTransfers((prev) => [data, ...prev].sort((a, b) => new Date(b.date) - new Date(a.date)));
    return data;
  };

  const deleteTransfer = async (id) => {
    const { error: err } = await supabase.from('transfers').delete().eq('id', id);
    if (err) throw err;
    setTransfers((prev) => prev.filter((t) => t.id !== id));
  };

  return {
    transfers,
    loading,
    error,
    addTransfer,
    deleteTransfer,
    refresh: fetchTransfers,
  };
}
