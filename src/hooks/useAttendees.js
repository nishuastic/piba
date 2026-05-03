import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export function useAttendees(eventId) {
  const [attendees, setAttendees] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAttendees = useCallback(async () => {
    if (!eventId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('attendees')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching attendees:', error);
    } else {
      setAttendees(data || []);
    }
    setLoading(false);
  }, [eventId]);

  useEffect(() => {
    fetchAttendees();
  }, [fetchAttendees]);

  const addAttendee = async (attendeeData) => {
    const { data, error } = await supabase
      .from('attendees')
      .insert([{ ...attendeeData, event_id: eventId }])
      .select()
      .single();
    if (error) throw error;
    await fetchAttendees();
    return data;
  };

  const updateAttendee = async (id, updates) => {
    const { data, error } = await supabase
      .from('attendees')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    await fetchAttendees();
    return data;
  };

  const deleteAttendee = async (id) => {
    const { error } = await supabase.from('attendees').delete().eq('id', id);
    if (error) throw error;
    await fetchAttendees();
  };

  return { attendees, loading, fetchAttendees, addAttendee, updateAttendee, deleteAttendee };
}
