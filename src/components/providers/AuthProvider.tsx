"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { useToast } from "../ui/use-toast";
import { API_KEY } from "@/lib/config";

interface AuthContextType {
  isAuthenticated: boolean;
  login: (data: any) => void;
  logout: () => void;
  handleExpiredToken: () => void;
  getValidAccessToken: () => Promise<string | null>;
  loading: boolean;
  checkAndRedirectUser: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true); // Loading state
  const router = useRouter();
  const { toast } = useToast();

  const checkAndRedirectUser = async () => {
    const rawUserData =
      typeof window !== "undefined" ? localStorage.getItem("userData") : null;
    const userData =
      rawUserData && rawUserData !== "null" && rawUserData !== ""
        ? JSON.parse(rawUserData)
        : null;

    if (!userData) {
      router.push("/login/v2");
      return;
    }

    const accessToken = await getValidAccessToken();
    if (accessToken) {
      router.push("/home");
      return;
    }

    // Try to refresh token if expired
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      router.push("/home");
    } else {
      router.push("/login/v2");
    }
  };

  useEffect(() => {
    const userData = localStorage.getItem("userData");
    if (userData) {
      setIsAuthenticated(true);
    }
    setLoading(false); // Done checking authentication
  }, []);

  const login = (data: any) => {
    localStorage.setItem("userData", JSON.stringify(data));
    setIsAuthenticated(true);
  };

  const logout = () => {
    localStorage.removeItem("userData");
    setIsAuthenticated(false);
    router.push("/");
    router.refresh();
  };

  const refreshAccessToken = async (): Promise<boolean> => {
    const userData = JSON.parse(localStorage.getItem("userData") || "{}");
    const refreshToken = userData?.tokens?.find(
      (token: any) => token.type === "refreshToken"
    )?.token;

    if (!refreshToken) {
      console.error("No refresh token found.");
      return false;
    }
    console.log(refreshToken);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/v2/tokens`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Refresh-Token": `${refreshToken}`,
          },
          credentials: "include", // ensures browser cookies are also sent
        }
      );
      if (response.ok) {
        const result = await response.json();
        if (result?.data) {
          // Replace only the tokens in userData
          userData.tokens = result.data;
          localStorage.setItem("userData", JSON.stringify(userData));
          return true;
        }
        return false;
      } else {
        console.error("Failed to refresh token:", response.statusText);
        return false;
      }
    } catch (error) {
      console.error("An error occurred while refreshing token:", error);
      return false;
    }
  };

  const handleExpiredToken = async () => {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      toast({
        title: "Session refreshed!",
        description: "Your session has been refreshed.",
        className: "bg-green-400",
        duration: 3000,
      });
    } else {
      toast({
        title: "Session expired!",
        description: "Your session has expired. Please log in again.",
        className: "bg-red-400",
        duration: 3000,
      });
      logout();

      router.refresh();
    }
  };

  const getValidAccessToken = async (): Promise<string | null> => {
    const userData = JSON.parse(localStorage.getItem("userData") || "{}");
    const accessToken = userData?.tokens?.find(
      (token: any) => token.type === "accessToken"
    )?.token;
    const accessTokenExpiresAt = userData?.tokens?.find(
      (token: any) => token.type === "accessToken"
    )?.expiresAt;

    // Check if access token is expired
    if (accessToken && accessTokenExpiresAt) {
      const now = new Date();
      const expirationDate = new Date(accessTokenExpiresAt);
      if (expirationDate > now) {
        return accessToken; // Return valid access token
      }
    }

    // If access token is expired, refresh it
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      const newAccessToken = userData.tokens.find(
        (token: any) => token.type === "accessToken"
      )?.token;
      return newAccessToken;
    }

    return null; // Return null if no valid tokens are available
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        login,
        logout,
        handleExpiredToken,
        getValidAccessToken,
        loading,
        checkAndRedirectUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
