import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export function useEventTransfers(eventId) {
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchTransfers = useCallback(async () => {
    if (!eventId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('transfers')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: true });

    if (error) console.error('Error fetching event transfers:', error);
    else setTransfers(data || []);
    setLoading(false);
  }, [eventId]);

  useEffect(() => {
    fetchTransfers();
  }, [fetchTransfers]);

  const addTransfer = async (transfer) => {
    const { data, error } = await supabase
      .from('transfers')
      .insert([{ ...transfer, event_id: eventId }])
      .select()
      .single();
    if (error) throw error;
    await fetchTransfers();
    return data;
  };

  const deleteTransfer = async (id) => {
    const { error } = await supabase.from('transfers').delete().eq('id', id);
    if (error) throw error;
    await fetchTransfers();
  };

  return { transfers, loading, addTransfer, deleteTransfer };
}
