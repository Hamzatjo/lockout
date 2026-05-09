import { useState, useEffect } from 'react';
import { supabase, Database } from './supabase';

type Profile = Database['public']['Tables']['profiles']['Row'];
type Squad = Database['public']['Tables']['squads']['Row'];

// Hook to get current user profile
export function useCurrentUser() {
  const [user, setUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  const fetchCurrentUser = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        setUser(null);
        return;
      }

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (error) throw error;
      setUser(profile);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const refreshUser = () => {
    setLoading(true);
    setError(null);
    fetchCurrentUser();
  };

  return { user, loading, error, refreshUser };
}

// Hook to get user's squad information
export function useSquad() {
  const [squad, setSquad] = useState<Squad | null>(null);
  const [members, setMembers] = useState<Profile[]>([]);
  const [isLeader, setIsLeader] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSquad();
  }, []);

  const fetchSquad = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setSquad(null);
        return;
      }

      // Get user's squad membership
      const { data: membership } = await supabase
        .from('squad_members')
        .select('squad_id')
        .eq('user_id', user.id)
        .single();

      if (!membership) {
        setSquad(null);
        setMembers([]);
        setIsLeader(false);
        return;
      }

      // Get squad details
      const { data: squadData, error: squadError } = await supabase
        .from('squads')
        .select('*')
        .eq('id', membership.squad_id)
        .single();

      if (squadError) throw squadError;

      setSquad(squadData);
      setIsLeader(squadData.leader_id === user.id);

      // Get squad members
      const { data: membersData, error: membersError } = await supabase
        .from('squad_members')
        .select('profiles(*)')
        .eq('squad_id', membership.squad_id);

      if (membersError) throw membersError;

      const profiles = membersData
        .map((m: any) => m.profiles)
        .filter(Boolean) as Profile[];
      setMembers(profiles);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const refreshSquad = () => {
    setLoading(true);
    setError(null);
    fetchSquad();
  };

  return { squad, members, isLeader, loading, error, refreshSquad };
}

// Hook to get user's streak information
export function useStreak(userId?: string) {
  const [currentStreak, setCurrentStreak] = useState(0);
  const [longestStreak, setLongestStreak] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (userId) {
      fetchStreak(userId);
    } else {
      fetchCurrentUserStreak();
    }
  }, [userId]);

  const fetchCurrentUserStreak = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await fetchStreak(user.id);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const fetchStreak = async (targetUserId: string) => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('current_streak, longest_streak')
        .eq('id', targetUserId)
        .single();

      if (error) throw error;

      setCurrentStreak(profile.current_streak || 0);
      setLongestStreak(profile.longest_streak || 0);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const refreshStreak = () => {
    setLoading(true);
    setError(null);
    if (userId) {
      fetchStreak(userId);
    } else {
      fetchCurrentUserStreak();
    }
  };

  return { currentStreak, longestStreak, loading, error, refreshStreak };
}

// Hook for managing loading states
export function useLoading(initialState = false) {
  const [loading, setLoading] = useState(initialState);

  const withLoading = async <T>(asyncFn: () => Promise<T>): Promise<T> => {
    setLoading(true);
    try {
      const result = await asyncFn();
      return result;
    } finally {
      setLoading(false);
    }
  };

  return { loading, setLoading, withLoading };
}