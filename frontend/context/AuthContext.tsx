import { createContext, useContext, useState, useEffect } from "react";
import { User } from "@/types/user";
import { getSavedToken } from "@/lib/auth";
import { API_BASE } from "@/lib/api";

type AuthContextType = {
  user: User | null;
  setUser: (user: User | null) => void;
  profile: any | null;
  setProfile: (profile: any | null) => void;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any | null>(null);

  // A global function to fetch/refresh the profile
  const refreshProfile = async () => {
    try {
      const token = await getSavedToken();
      if (!token) return;

      const response = await fetch(`${API_BASE}/profile/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (data.ok) {
        setProfile(data.profile);
      }
    } catch (error) {
      console.error("Error fetching global profile:", error);
    }
  };

  // Automatically fetch the profile whenever a user logs in
  useEffect(() => {
    if (user) {
      refreshProfile();
    } else {
      // If user logs out, clear the profile
      setProfile(null); 
    }
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, setUser, profile, setProfile, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}