"use client";
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import Image from "next/image";
import Link from "next/link";
import { API_BASE_URL, API_KEY } from "@/lib/config";
import { useAuth } from "@/components/providers/AuthProvider";
import { useRouter } from "next/navigation";
import { UserNotRegisteredDialog } from "@/components/UserNotRegisteredDialog";
import { useToast } from "@/components/ui/use-toast";
// import SnowfallComponent from "@/components/SnowfallComponent";
// import LogoCarousel from "@/components/LogoCarousel";

const LoginV2 = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [userExists, setUserExists] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const [showDialog, setShowDialog] = useState(false);
  const { toast } = useToast();

  const checkUserExistence = async (e: any) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/v2/users/check/${email}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "X-API-Key": API_KEY,
          },
        }
      );

      if (response.ok) {
        const result = await response.json();
        if (result.user) {
          setUserExists(true);
        } else {
          setShowDialog(true);
        }
      } else {
        alert("Failed to check user existence. Please try again.");
      }
    } catch (error) {
      console.error("An error occurred:", error);
      alert("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: any) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/v2/users/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": API_KEY,
        },
        body: JSON.stringify({ identifier: email, password: password }),
      });

      if (response.ok) {
        const result = await response.json();
        // Use the login function from the AuthProvider to handle successful login
        login(result);
        toast({
          title: "Log In Successful",
          description: `Redirecting to the home page...`,
          className: "bg-green-400",
          duration: 1500,
        });
        setTimeout(() => {
          router.push("/home");
        }, 1000);
      } else {
        toast({
          title: "Failed to Log In",
          description: "Please check your password and try again.",
          className: "bg-red-400",
          duration: 1500,
        });
      }
    } catch (error) {
      console.error("An error occurred:", error);
      toast({
        title: "An Error Occurred",
        description:
          error instanceof Error ? error.message : "An unknown error occurred",
        className: "bg-red-400",
        duration: 1500,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* <SnowfallComponent /> */}
      <div className="flex flex-row md:self-start bg-muted"></div>
      <div className="flex min-h-svh flex-col items-center justify-center bg-muted p-6 md:p-10">
        <div className="w-full max-w-sm md:max-w-3xl">
          <div className="flex flex-col gap-6">
            <Card className="overflow-hidden">
              <CardContent className="grid p-0 md:grid-cols-2">
                <form
                  onSubmit={userExists ? handleLogin : checkUserExistence}
                  className="p-6 md:p-8"
                >
                  <div className="flex flex-col gap-6">
                    <div className="flex flex-col items-center text-center">
                      <h1 className="text-2xl font-bold">Welcome back</h1>
                      <p className="text-balance text-muted-foreground">
                        Login to your Grow Community Account
                      </p>
                    </div>
                    {!userExists && (
                      <div className="grid gap-2">
                        <Label htmlFor="identifier">Identifier</Label>

                        <Input
                          id="identifier"
                          type="text"
                          placeholder="Enter your email or phone number"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                        />
                        <Label
                          htmlFor="identifier"
                          className="text-sm text-muted-foreground"
                        >
                          Phone Number format: 0812345678
                        </Label>
                      </div>
                    )}

                    {userExists && (
                      <div className="grid gap-2">
                        <Label htmlFor="password">Password</Label>
                        <Input
                          id="password"
                          type="password"
                          placeholder="Enter your password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                        />
                      </div>
                    )}
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? "Loading..." : userExists ? "Login" : "Next"}
                    </Button>
                    <div className="flex flex-col gap-y-3 justify-between text-sm">
                      {" "}
                      <Link
                        href="/register"
                        className="text-primary text-center text-sm hover:underline"
                      >
                        Don't have an account? Sign Up
                      </Link>
                      <Link
                        href="/forget"
                        className="text-primary text-center text-sm hover:underline"
                      >
                        Forgot Password?
                      </Link>
                    </div>
                  </div>
                </form>
                <div className="relative hidden bg-white md:block">
                  <Image
                    className="bg-white"
                    src="/images/gc-logo-2.png" // Adjust the path to your logo in the public folder
                    alt="Logo"
                    width={0}
                    height={0}
                    sizes="100vw"
                    style={{ width: "100%", height: "auto" }}
                  />
                </div>
                <UserNotRegisteredDialog
                  isVisible={showDialog}
                  onClose={() => setShowDialog(false)}
                />
              </CardContent>
            </Card>
            {/* <LogoCarousel /> */}
          </div>
        </div>
      </div>
    </>
  );
};

export default LoginV2;
