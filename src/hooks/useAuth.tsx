import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { syncAdminRole } from "@/lib/admin.functions";

export type Profile = {
  id: string;
  display_name: string;
  avatar: string;
  games: number;
  wins: number;
  losses: number;
  points: number;
  gold: number;
  diamonds: number;
  xp: number;
  level: number;
  banner: string;
  frame: string;
  banned?: boolean;
  banned_reason?: string | null;
  updated_at: string;
};

type AuthValue = {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  isAdmin: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthValue>({
  user: null,
  session: null,
  profile: null,
  loading: true,
  isAdmin: false,
  refreshProfile: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const user = session?.user ?? null;

  /** تحميل الملف الشخصي، وإنشاؤه إن لم يكن موجودًا (حتى لا يبقى مستخدم بلا Profile) */
  const loadProfile = useCallback(async (u: User) => {
    const { data } = await supabase.from("profiles").select("*").eq("id", u.id).maybeSingle();
    if (data) {
      setProfile(data as Profile);
      return;
    }
    const fallbackName =
      (u.user_metadata?.["display_name"] as string | undefined)?.trim() ||
      u.email?.split("@")[0] ||
      "لاعب جديد";
    const { data: created } = await supabase
      .from("profiles")
      .insert({ id: u.id, display_name: fallbackName.slice(0, 40) })
      .select("*")
      .maybeSingle();
    if (created) setProfile(created as Profile);
  }, []);

  /** التحقق من صلاحية الأدمن في السيرفر (لا يوجد أي بيانات سرية في الواجهة) */
  const syncRole = useCallback(async () => {
    try {
      const res = await syncAdminRole();
      setIsAdmin(Boolean(res?.isAdmin));
    } catch {
      setIsAdmin(false);
    }
  }, []);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next);
      setLoading(false);
      if (next?.user) {
        void loadProfile(next.user);
        if (event === "SIGNED_IN" || event === "INITIAL_SESSION" || event === "USER_UPDATED") void syncRole();
      } else {
        setProfile(null);
        setIsAdmin(false);
      }
    });

    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
      if (data.session?.user) {
        void loadProfile(data.session.user);
        void syncRole();
      }
    });

    return () => sub.subscription.unsubscribe();
  }, [loadProfile, syncRole]);

  /** تحديث فوري للمحفظة (ذهب/جواهر/خبرة) عند أي تغيير في الملف — بدون تحديث يدوي */
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`profile-${user.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${user.id}` },
        (payload) => setProfile(payload.new as Profile),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user]);



  const value: AuthValue = {
    user,
    session,
    profile,
    loading,
    isAdmin,
    refreshProfile: async () => {
      if (user) await loadProfile(user);
    },
    signOut: async () => {
      await supabase.auth.signOut();
      setProfile(null);
      setIsAdmin(false);
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
