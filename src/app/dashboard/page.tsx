"use client";

import { useRouter } from "next/navigation";
import withAuth from "@/components/providers/AuthWrapper";
import { useAuth } from "@/components/providers/AuthProvider";
import { Event } from "@/lib/types/event";
import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { API_BASE_URL, API_KEY } from "@/lib/config";
import { Search } from "lucide-react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import HeaderNav from "@/components/HeaderNav";
import { useToast } from "@/components/ui/use-toast";

interface User {
  name: string;
  communityId: string;
  phoneNumber: string;
  email: string;
  status: string;
  departmentName: string;
  coolName: string;
  createdAt: string;
  updatedAt: string;
  userTypes: string[];
}
import { Input } from "@/components/ui/input";

function EventsAdmin() {
  const [events, setEvents] = useState<any[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);
  const [isSmallScreen, setIsSmallScreen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false); // Add loading state
  const { isAuthenticated, handleExpiredToken, getValidAccessToken } =
    useAuth();
  const { toast } = useToast();
  const userData = isAuthenticated
    ? JSON.parse(localStorage.getItem("userData") || "{}")
    : null;
  const router = useRouter();

  if (userData.role === "user") {
    router.push("/home");
    return null;
  }

  function handleSession(code: any) {
    return router.push(`/dashboard/${code}`);
  }
  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };
  const fetchUsers = async (
    cursor: string | null = null,
    direction: string | null = null,
    name: string | null = null
  ) => {
    const accessToken = await getValidAccessToken();
    if (!accessToken) {
      handleExpiredToken();
      return;
    }

    try {
      setIsLoading(true);
      const url = new URL(`${API_BASE_URL}/api/v2/internal/users`);
      url.searchParams.append("limit", "10");
      if (cursor) {
        url.searchParams.append("cursor", cursor);
      }
      if (direction) {
        url.searchParams.append("direction", direction);
      }
      if (name) {
        url.searchParams.append("searchBy", "name");
        url.searchParams.append("search", name);
      }

      const response = await fetch(url.toString(), {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
          "X-API-Key": API_KEY || "",
        },
      });

      if (response.status === 401) {
        handleExpiredToken();
        return;
      }

      const data = await response.json();
      setUsers(data.data);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const upgradeUser = async (communityId: string) => {
    const accessToken = await getValidAccessToken();
    if (!accessToken) {
      handleExpiredToken();
      return;
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/v2/users/roles-types/update`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
            "X-API-Key": API_KEY || "",
          },
          body: JSON.stringify({
            field: "userType",
            communityIds: [communityId],
            changes: ["volunteer"],
          }),
        }
      );

      if (response.status === 401) {
        handleExpiredToken();
        return;
      }

      if (!response.ok) {
        throw new Error("Failed to upgrade user");
      }

      toast({
        title: "Success",
        description: "User upgraded to worker successfully.",
        className: "bg-green-400",
        duration: 3000,
      });

      // Optionally, refetch users to update the list
      fetchUsers(null, null, searchQuery);
    } catch (error) {
      console.error("Error upgrading user:", error);
      toast({
        title: "Error",
        description: "Failed to upgrade user. Please try again later.",
        className: "bg-red-400",
        duration: 3000,
      });
    }
  };

  useEffect(() => {
    async function fetchEvents() {
      const accessToken = await getValidAccessToken();
      if (!accessToken) {
        handleExpiredToken();
        return;
      }

      setIsLoading(true); // Set loading to true before fetching

      try {
        const response = await fetch(`${API_BASE_URL}/api/v2/internal/events`, {
          headers: {
            "X-API-KEY": API_KEY || "",
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
        });
        if (response.status === 401) {
          handleExpiredToken();
          return;
        }
        const data = await response.json();
        setEvents(data.data);
      } catch (error) {
        console.error("Failed to fetch events:", error);
      } finally {
        setIsLoading(false); // Set loading to false after fetching
      }
    }

    fetchEvents();
  }, []);

  // Detect screen size
  useEffect(() => {
    const handleResize = () => {
      setIsSmallScreen(window.innerWidth <= 640); // Adjust the width as needed
    };

    handleResize(); // Initial check
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const handleEventClick = (event: Event) => {
    setSelectedEvent(event);
    setIsDialogOpen(true);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setSelectedEvent(null);
  };

  const mainSpacing = isSmallScreen ? "space-y-6" : "space-y-8";

  return (
    <div className="relative min-h-screen w-full bg-gradient-to-br from-slate-50 via-white to-slate-100 text-slate-900">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-16 top-16 h-40 w-40 rounded-full bg-indigo-200/60 blur-3xl" />
        <div className="absolute right-10 top-10 h-56 w-56 rounded-full bg-emerald-200/60 blur-3xl" />
        <div className="absolute bottom-10 left-1/3 h-48 w-48 rounded-full bg-sky-200/50 blur-3xl" />
      </div>
      <HeaderNav name="Admin Dashboard" link="home" />
      <main
        className={`container relative z-10 mx-auto ${mainSpacing} px-4 pb-12 pt-6`}
      >
        <div className="grid gap-6 lg:grid-cols-[3fr,2fr]">
          <Card className="border-slate-200 bg-white shadow-xl">
            <CardHeader className="space-y-1">
              <div className="flex items-center gap-2">
                <Badge
                  variant="secondary"
                  className="bg-indigo-100 text-indigo-700"
                >
                  Admin tools
                </Badge>
                <Badge
                  variant="outline"
                  className="border-slate-200 text-slate-700"
                >
                  Users
                </Badge>
              </div>
              <CardTitle className="text-2xl text-slate-900">
                Manage community members
              </CardTitle>
              <CardDescription className="text-slate-600">
                Search for members and quickly upgrade them to workers without
                leaving the dashboard.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-3 md:flex-row">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    type="search"
                    placeholder="Search a user by name"
                    className="w-full rounded-xl border-slate-200 bg-white pl-10 text-slate-900 shadow-sm placeholder:text-slate-400"
                    onChange={(e) => {
                      const value = e.target.value;
                      setSearchQuery(value);
                      if (value === "") {
                        setSearchQuery(null);
                        setUsers([]); // Clear users when search query is empty
                      }
                    }}
                  />
                </div>
                <div className="flex gap-2 md:w-auto">
                  <Button
                    type="submit"
                    className="flex-1 rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-200 transition hover:-translate-y-0.5 hover:bg-indigo-500"
                    onClick={() => {
                      fetchUsers(null, null, searchQuery);
                    }}
                  >
                    Search
                  </Button>
                  <Button
                    variant="outline"
                    type="reset"
                    className="flex-1 rounded-xl border-slate-200 bg-slate-50 text-slate-800 transition hover:-translate-y-0.5 hover:border-red-300 hover:bg-red-50"
                    onClick={() => {
                      setSearchQuery(null);
                      setUsers([]); // Clear users when search query is empty
                    }}
                  >
                    Clear
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-gradient-to-b from-white via-slate-50 to-white shadow-lg">
            <CardHeader className="space-y-2">
              <CardTitle className="flex items-center justify-between text-lg text-slate-900">
                Quick links
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link
                href={"dashboard/new-joiners"}
                className="group flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-left text-slate-900 transition hover:-translate-y-0.5 hover:border-emerald-300 hover:bg-emerald-50"
              >
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    View COOL New Joiners
                  </p>
                  <p className="text-xs text-slate-600">
                    See the latest members joining your community.
                  </p>
                </div>
              </Link>
              <Link
                href={"dashboard/create-event"}
                className="group flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-left text-slate-900 transition hover:-translate-y-0.5 hover:border-emerald-300 hover:bg-emerald-50"
              >
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    Create Event
                  </p>
                  <p className="text-xs text-slate-600">
                    Create a new event for Grow Community.
                  </p>
                </div>
              </Link>{" "}
              <Link
                href={"dashboard/create-instance"}
                className="group flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-left text-slate-900 transition hover:-translate-y-0.5 hover:border-emerald-300 hover:bg-emerald-50"
              >
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    Create Instance
                  </p>
                  <p className="text-xs text-slate-600">
                    Create a new instance for from existing event.
                  </p>
                </div>
              </Link>
            </CardContent>
          </Card>
        </div>

        {users && users.length > 0 && (
          <Card className="border-slate-200 bg-white shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-xl text-slate-900">
                Search Results
                <Badge
                  variant="outline"
                  className="border-slate-200 text-slate-700"
                >
                  {users.length} found
                </Badge>
              </CardTitle>
              <CardDescription className="text-slate-600">
                Upgrade qualified members to workers directly from the list.
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-hidden rounded-xl border border-slate-200">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-200">
                      <TableHead className="text-slate-700">Name</TableHead>
                      <TableHead className="text-slate-700">Email</TableHead>
                      <TableHead className="text-slate-700">
                        Community ID
                      </TableHead>
                      <TableHead className="text-slate-700">
                        User Type
                      </TableHead>
                      <TableHead className="text-slate-700">Upgrade</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow
                        key={user.email}
                        className="border-slate-100 hover:bg-slate-50"
                      >
                        <TableCell className="font-medium text-slate-900">
                          {user.name}
                        </TableCell>
                        <TableCell className="text-slate-700">
                          {user.email}
                        </TableCell>
                        <TableCell className="text-slate-700">
                          {user.communityId}
                        </TableCell>
                        <TableCell className="text-slate-700">
                          <div className="flex flex-wrap gap-1">
                            {user.userTypes.map((type) => (
                              <Badge
                                key={type}
                                variant="outline"
                                className="border-slate-200 bg-slate-50 text-slate-700"
                              >
                                {type}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          {user.userTypes.includes("user") && (
                            <Button
                              className="rounded-lg bg-emerald-500 text-white shadow-md shadow-emerald-200 transition hover:-translate-y-0.5 hover:bg-emerald-400"
                              onClick={() => upgradeUser(user.communityId)}
                            >
                              Upgrade
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="border-slate-200 bg-white shadow-xl">
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <CardTitle className="text-xl text-slate-900">
                Events List
              </CardTitle>
              <CardDescription className="text-slate-600">
                Track event status, topics, and registration windows.
              </CardDescription>
            </div>
            <Badge variant="secondary" className="bg-sky-100 text-sky-700">
              {events.length} total
            </Badge>
          </CardHeader>
          <CardContent className="overflow-hidden rounded-xl border border-slate-200">
            {isLoading ? (
              <div className="flex items-center justify-center gap-3 py-10 text-slate-600">
                <LoadingSpinner />
                <span>Loading events...</span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-200">
                      <TableHead className="text-slate-700">Title</TableHead>
                      {/* <TableHead className="text-slate-700">Status</TableHead>
                      <TableHead className="hidden text-slate-700 sm:table-cell">
                        Topics
                      </TableHead>
                      <TableHead className="hidden text-slate-700 sm:table-cell">
                        Registration
                      </TableHead> */}
                      <TableHead className="text-slate-700">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {events.map((event) => (
                      <TableRow
                        key={event.code}
                        className="border-slate-100 hover:bg-slate-50"
                      >
                        <TableCell className="font-medium text-slate-900">
                          {event.title}
                        </TableCell>
                        {/* <TableCell>
                          <Badge
                            variant="outline"
                            className="border-slate-200 bg-slate-50 text-slate-700"
                          >
                            {event.availabilityStatus}
                          </Badge>
                        </TableCell> */}
                        {/* <TableCell className="hidden text-slate-700 sm:table-cell">
                            {event.topics.join(", ")}
                          </TableCell> */}
                        {/* <TableCell className="hidden text-slate-700 sm:table-cell">
                          {formatDate(event.registerStartAt)} -{" "}
                          {formatDate(event.registerEndAt)}
                        </TableCell> */}
                        <TableCell>
                          {
                            <Button
                              className="rounded-lg bg-blue-600 text-white shadow-md shadow-blue-200 transition hover:-translate-y-0.5 hover:bg-blue-500"
                              onClick={() => handleSession(event.code)}
                            >
                              View Details
                            </Button>
                          }
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

export default withAuth(EventsAdmin);
