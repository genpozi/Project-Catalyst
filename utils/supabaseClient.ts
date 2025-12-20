
import { createClient } from '@supabase/supabase-js';

// Credentials provided for the project
const SUPABASE_URL = "https://auvhwrrluhmumqygdhnr.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF1dmh3cnJsdWhtdW1xeWdkaG5yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYyMjQ1NDgsImV4cCI6MjA4MTgwMDU0OH0.uQEGpWmEVVMHYSnj8K0hJEJn13DllylTlNpF-2l5gdg";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
};

export const signInWithOtp = async (email: string) => {
  const { error } = await supabase.auth.signInWithOtp({ email });
  return { error };
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  return { error };
};
