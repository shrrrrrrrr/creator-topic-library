"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { User } from "@supabase/supabase-js";
import {
  DeviceLimitError,
  registerCurrentDevice,
  removeCurrentDevice,
} from "@/lib/auth/devices";
import {
  normalizeUsername,
  usernameToVirtualEmail,
  validatePassword,
  validateUsername,
} from "@/lib/auth/username";
import { setActiveStorageUserId } from "@/lib/storage/app-storage";
import {
  getSupabaseClient,
  isSupabaseConfigured,
  setRememberLoginPreference,
} from "@/lib/supabase";

export type UserProfile = {
  id: string;
  user_id: string;
  username: string;
  nickname: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
};

type AuthContextValue = {
  user: User | null;
  profile: UserProfile | null;
  isLoading: boolean;
  errorMessage: string | null;
  signIn: (input: {
    username: string;
    password: string;
    rememberLogin: boolean;
  }) => Promise<void>;
  signUp: (input: {
    username: string;
    password: string;
    confirmPassword: string;
    rememberLogin: boolean;
  }) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function getAuthErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);

  if (error instanceof DeviceLimitError) {
    return error.message;
  }

  if (/invalid login credentials/i.test(message)) {
    return "用户名或密码不正确。";
  }

  if (/already registered|already exists|duplicate key/i.test(message)) {
    return "用户名已被使用，请换一个用户名。";
  }

  if (/supabase environment variables/i.test(message)) {
    return "Supabase 环境变量尚未配置，请先配置项目 URL 和 anon key。";
  }

  return message || "登录状态处理失败，请稍后重试。";
}

async function fetchProfile(userId: string) {
  const supabaseClient = getSupabaseClient();
  const { data, error } = await supabaseClient
    .from("profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as UserProfile | null;
}

async function createProfileForUser(user: User) {
  const fallbackUsername = normalizeUsername(
    String(user.user_metadata?.username ?? user.email ?? "user")
  );
  const supabaseClient = getSupabaseClient();
  const { data, error } = await supabaseClient
    .from("profiles")
    .insert({
      user_id: user.id,
      username: fallbackUsername,
      nickname: fallbackUsername,
      avatar_url: null,
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data as UserProfile;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadProfile = useCallback(async (nextUser: User | null) => {
    if (!nextUser || !isSupabaseConfigured()) {
      setProfile(null);
      setActiveStorageUserId(null);
      return;
    }

    await registerCurrentDevice(nextUser.id);

    const existingProfile = await fetchProfile(nextUser.id);
    const nextProfile = existingProfile ?? (await createProfileForUser(nextUser));

    setProfile(nextProfile);
    setActiveStorageUserId(nextUser.id);
  }, []);

  const refreshProfile = useCallback(async () => {
    await loadProfile(user);
  }, [loadProfile, user]);

  const clearAuthState = useCallback(() => {
    setUser(null);
    setProfile(null);
    setActiveStorageUserId(null);
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function initializeAuth() {
      if (!isSupabaseConfigured()) {
        if (isMounted) {
          setIsLoading(false);
        }
        return;
      }

      try {
        const supabaseClient = getSupabaseClient();
        const { data, error } = await supabaseClient.auth.getSession();

        if (error) {
          throw error;
        }

        const sessionUser = data.session?.user ?? null;

        if (!isMounted) {
          return;
        }

        if (sessionUser) {
          await loadProfile(sessionUser);
        }

        setUser(sessionUser);
      } catch (error) {
        if (isMounted) {
          if (error instanceof DeviceLimitError) {
            await getSupabaseClient().auth.signOut();
          }

          setErrorMessage(getAuthErrorMessage(error));
          clearAuthState();
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    initializeAuth();

    if (!isSupabaseConfigured()) {
      return () => {
        isMounted = false;
      };
    }

    const supabaseClient = getSupabaseClient();
    const {
      data: { subscription },
    } = supabaseClient.auth.onAuthStateChange((_event, session) => {
      const nextUser = session?.user ?? null;

      if (!nextUser) {
        clearAuthState();
        return;
      }

      loadProfile(nextUser)
        .then(() => setUser(nextUser))
        .catch(async (error) => {
          if (error instanceof DeviceLimitError) {
            await supabaseClient.auth.signOut();
          }

          setErrorMessage(getAuthErrorMessage(error));
          clearAuthState();
        });
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [clearAuthState, loadProfile]);

  const signIn = useCallback(
    async ({
      username,
      password,
      rememberLogin,
    }: {
      username: string;
      password: string;
      rememberLogin: boolean;
    }) => {
      setErrorMessage(null);

      const usernameError = validateUsername(username);
      const passwordError = validatePassword(password);

      if (usernameError || passwordError) {
        throw new Error(usernameError ?? passwordError ?? "请检查登录信息。");
      }

      setRememberLoginPreference(rememberLogin);

      const supabaseClient = getSupabaseClient();
      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email: usernameToVirtualEmail(username),
        password,
      });

      if (error) {
        throw error;
      }

      try {
        await loadProfile(data.user);
      } catch (error) {
        if (error instanceof DeviceLimitError) {
          await supabaseClient.auth.signOut();
        }

        throw error;
      }

      setUser(data.user);
    },
    [loadProfile]
  );

  const signUp = useCallback(
    async ({
      username,
      password,
      confirmPassword,
      rememberLogin,
    }: {
      username: string;
      password: string;
      confirmPassword: string;
      rememberLogin: boolean;
    }) => {
      setErrorMessage(null);

      const usernameError = validateUsername(username);
      const passwordError = validatePassword(password);

      if (usernameError || passwordError) {
        throw new Error(usernameError ?? passwordError ?? "请检查注册信息。");
      }

      if (password !== confirmPassword) {
        throw new Error("两次输入的密码不一致。");
      }

      const normalizedUsername = normalizeUsername(username);
      setRememberLoginPreference(rememberLogin);

      const supabaseClient = getSupabaseClient();
      const { data, error } = await supabaseClient.auth.signUp({
        email: usernameToVirtualEmail(normalizedUsername),
        password,
        options: {
          data: {
            username: normalizedUsername,
          },
        },
      });

      if (error) {
        throw error;
      }

      let signedUpUser = data.user;

      if (!data.session) {
        const signInResult = await supabaseClient.auth.signInWithPassword({
          email: usernameToVirtualEmail(normalizedUsername),
          password,
        });

        if (signInResult.error) {
          throw new Error(
            "注册成功，但登录失败。请确认 Supabase 已关闭邮箱确认，或稍后再登录。"
          );
        }

        signedUpUser = signInResult.data.user;
      }

      if (!signedUpUser) {
        throw new Error("注册失败，请稍后重试。");
      }

      await registerCurrentDevice(signedUpUser.id);

      const { data: createdProfile, error: profileError } = await supabaseClient
        .from("profiles")
        .upsert(
          {
            user_id: signedUpUser.id,
            username: normalizedUsername,
            nickname: normalizedUsername,
            avatar_url: null,
          },
          { onConflict: "user_id" }
        )
        .select("*")
        .single();

      if (profileError) {
        throw profileError;
      }

      setUser(signedUpUser);
      setProfile(createdProfile as UserProfile);
      setActiveStorageUserId(signedUpUser.id);
    },
    []
  );

  const signOut = useCallback(async () => {
    if (isSupabaseConfigured()) {
      const currentUserId = user?.id;

      if (currentUserId) {
        await removeCurrentDevice(currentUserId);
      }

      const supabaseClient = getSupabaseClient();
      const { error } = await supabaseClient.auth.signOut();

      if (error) {
        throw error;
      }
    }

    clearAuthState();
  }, [clearAuthState, user?.id]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      profile,
      isLoading,
      errorMessage,
      signIn: async (input) => {
        try {
          await signIn(input);
        } catch (error) {
          const message = getAuthErrorMessage(error);
          setErrorMessage(message);
          throw new Error(message);
        }
      },
      signUp: async (input) => {
        try {
          await signUp(input);
        } catch (error) {
          const message = getAuthErrorMessage(error);
          setErrorMessage(message);
          throw new Error(message);
        }
      },
      signOut,
      refreshProfile,
    }),
    [errorMessage, isLoading, profile, refreshProfile, signIn, signOut, signUp, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider.");
  }

  return context;
}
