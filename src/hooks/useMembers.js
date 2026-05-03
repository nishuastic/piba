import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export function useMembers() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('members')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching members:', error);
    } else {
      setMembers(data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const addMember = async (memberData) => {
    const { data, error } = await supabase
      .from('members')
      .insert([memberData])
      .select()
      .single();
    if (error) throw error;
    await fetchMembers();
    return data;
  };

  const updateMember = async (id, updates) => {
    const { data, error } = await supabase
      .from('members')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    await fetchMembers();
    return data;
  };

  const deleteMember = async (id) => {
    const { error } = await supabase.from('members').delete().eq('id', id);
    if (error) throw error;
    await fetchMembers();
  };

  const bulkAddMembers = async (membersData) => {
    const { data, error } = await supabase
      .from('members')
      .insert(membersData)
      .select();
    if (error) throw error;
    await fetchMembers();
    return data;
  };

  return { members, loading, fetchMembers, addMember, updateMember, deleteMember, bulkAddMembers };
}
