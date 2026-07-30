"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { API_BASE_URL, API_KEY } from "@/lib/config";
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
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Download, Loader2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Button } from "@/components/ui/button";
import withAuth from "@/components/providers/AuthWrapper";
import { useAuth } from "@/components/providers/AuthProvider";
import HeaderNav from "@/components/HeaderNav";
import VerifyTicketDialog from "@/components/VerifyTicketDialog";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import QRDownloader from "@/components/QRDownloader";

interface EventDetails {
  type: string;
  code: string;
  title: string;
  allowedFor: string;
  allowedRoles: string[];
  allowedUsers: string[];
  allowedCampuses: string[];
  status: string;
}

interface EventSession {
  type: string;
  eventCode: string;
  code: string;
  title: string;
  registerFlow: string;
  checkType: string;
  totalSeats: number;
  bookedSeats: number;
  scannedSeats: number;
  totalRemainingSeats: number;
  status: string;
}

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
}

interface Pagination {
  previous: string | null;
  next: string | null;
  totalData: number;
}

type EventReportDownload = "csv" | "xlsx" | null;

function EventSessionsAdmin({ params }: { params: { eventCode: string } }) {
  const router = useRouter();
  const [eventDetails, setEventDetails] = useState<EventDetails | null>(null);
  const [sessions, setSessions] = useState<EventSession[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState<string | null>(null);
  const { handleExpiredToken, getValidAccessToken } = useAuth();
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [reportDownload, setReportDownload] =
    useState<EventReportDownload>(null);
  const { toast } = useToast();

  const fetchEventDetails = async () => {
    const accessToken = await getValidAccessToken();
    if (!accessToken) {
      router.push("/login/v2");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/v2/internal/events/${params.eventCode}/summary`,
        {
          headers: {
            "X-API-KEY": API_KEY || "",
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
      if (response.status === 401) {
        router.push("/login/v2");
        return;
      }
      const data = await response.json();
      setEventDetails(data.details);
      setSessions(data.data || []); // Ensure sessions is an array
    } catch (error) {
      console.error("Error fetching event details:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEventDetails();
  }, [params.eventCode]);

  const fetchUsers = async (
    cursor: string | null = null,
    direction: string | null = null,
    name: string | null = null
  ) => {
    const accessToken = await getValidAccessToken();
    if (!accessToken) {
      router.push("/login/v2");
      return;
    }

    try {
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
        router.push("/login/v2");
        return;
      }

      const data = await response.json();
      setUsers(data.data);
      setPagination(data.pagination);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (sessions.length > 0 && !selectedSession) {
      setSelectedSession(sessions[0].code);
    }
  }, [sessions, selectedSession]);

  const registerUser = async (user: User) => {
    if (!selectedSession) {
      toast({
        title: "Error",
        description: "Please select a session first.",
        variant: "destructive",
      });
      return;
    }

    const accessToken = await getValidAccessToken();
    if (!accessToken) {
      router.push("/login/v2");
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/v2/events/registers`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
          "X-API-Key": API_KEY || "",
        },
        body: JSON.stringify({
          communityId: user.communityId,
          eventCode: params.eventCode,
          instanceCode: selectedSession,
          identifier: "",
          isPersonalQR: true,
          name: user.name,
          registerAt: new Date().toISOString(),
        }),
      });

      if (response.status === 401) {
        handleExpiredToken();
        return;
      }

      if (response.ok) {
        toast({
          title: "Success",
          description: `${user.name} has been registered successfully.`,
          variant: "default",
        });
      } else {
        const errorData = await response.json();
        toast({
          title: "Error",
          description: errorData.message || "Failed to register user.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error registering user:", error);
      toast({
        title: "Error",
        description: "An error occurred while registering the user.",
        variant: "default",
      });
    }
  };

  const getDownloadFilename = (
    response: Response,
    fallbackFilename: string,
  ) => {
    const contentDisposition = response.headers.get("content-disposition");
    const filenameMatch = contentDisposition?.match(
      /filename\*?=(?:UTF-8'')?["']?([^"';]+)["']?/i,
    );

    return filenameMatch?.[1]
      ? decodeURIComponent(filenameMatch[1])
      : fallbackFilename;
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const downloadEventReport = async (
    format: Exclude<EventReportDownload, null>,
  ) => {
    if (!selectedSession) {
      toast({
        title: "Error",
        description: "Please select an instance before downloading a report.",
        variant: "destructive",
      });
      return;
    }

    const accessToken = await getValidAccessToken();
    if (!accessToken) {
      router.push("/login/v2");
      return;
    }

    const searchParams = new URLSearchParams({
      format,
      eventCode: params.eventCode,
      instanceCode: selectedSession,
    });

    const fallbackFilename = `${params.eventCode}-${selectedSession}-registrations.${format}`;

    setReportDownload(format);
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/v2/internal/events/registers/download?${searchParams.toString()}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "X-API-Key": API_KEY || "",
          },
        },
      );

      if (response.status === 401) {
        handleExpiredToken();
        return;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.message || "Failed to download report.");
      }

      const blob = await response.blob();
      downloadBlob(blob, getDownloadFilename(response, fallbackFilename));

      toast({
        title: "Report downloaded",
        description: `${eventDetails?.title ?? params.eventCode} registrations ${format.toUpperCase()} export is ready.`,
      });
    } catch (error) {
      console.error("Error downloading event report:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "An error occurred while downloading the report.",
        variant: "destructive",
      });
    } finally {
      setReportDownload(null);
    }
  };

  const selectedSessionDetails = sessions.find(
    (session) => session.code === selectedSession
  );

  return (
    <>
      <HeaderNav
        name={`Admin Dashboard Event-${params.eventCode}`}
        link="dashboard"
      />
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">Event Details</h1>
        {loading ? (
          <p>Loading...</p>
        ) : (
          <>
            {eventDetails && (
              <>
                <div className="mb-4">
                  <h2 className="text-xl font-bold">{eventDetails.title}</h2>
                  <p className="text-sm">
                    <strong>Allowed For:</strong> {eventDetails.allowedFor}
                  </p>
                  <p className="text-sm">
                    <strong>Status:</strong> {eventDetails.status}
                  </p>
                  <Badge className="mt-2">{eventDetails.status}</Badge>
                </div>
                <Button
                  className="my-4"
                  onClick={() => {
                    router.push(`/dashboard/${params.eventCode}/report`);
                  }}
                >
                  View Report
                </Button>
              </>
            )}
            <h2 className="text-xl font-bold my-4">Sessions</h2>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden sm:table-cell">
                    Total Seats
                  </TableHead>
                  <TableHead className="hidden sm:table-cell">
                    Booked Seats
                  </TableHead>
                  <TableHead className="hidden sm:table-cell">
                    Remaining Seats
                  </TableHead>
                  <TableHead>Camera Scan</TableHead>
                  <TableHead className="hidden sm:table-cell">
                    Hardware Scan
                  </TableHead>
                  <TableHead className="hidden sm:table-cell">
                    QR Code
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.length > 0 ? (
                  sessions.map((session) => (
                    <TableRow key={session.code}>
                      <TableCell>{session.title}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{session.status}</Badge>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {session.totalSeats}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {session.bookedSeats}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {session.totalRemainingSeats}
                      </TableCell>
                      <TableCell>
                        <VerifyTicketDialog
                          eventCode={params.eventCode}
                          eventName={eventDetails ? eventDetails.title : ""}
                          sessionCode={session.code}
                          sessionName={session.title}
                          onlineEvent={false}
                        ></VerifyTicketDialog>
                      </TableCell>
                      <TableCell>
                        <Button
                          onClick={() => {
                            router.push(
                              `/qrscan/${params.eventCode}/${session.code}`
                            );
                          }}
                        >
                          QR Scanner (Hardware)
                        </Button>
                      </TableCell>
                      <TableCell>
                        <QRDownloader
                          text={`${params.eventCode}+${session.code}`}
                          title={`${eventDetails?.title}`}
                          subheading={`${session.title}`}
                          filename={`QR-${eventDetails?.title} ${session.title}`}
                        />
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center">
                      No sessions available.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </>
        )}
      </div>
      <section className="container mx-auto space-y-4 px-4 pb-10">
        <div className="space-y-1 text-center">
          <h2 className="text-xl font-bold">Manual Registration</h2>
          <p className="text-sm text-muted-foreground">
            Select an instance and register attendees without scanning.
          </p>
        </div>

        <Card>
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Choose an instance</CardTitle>
              <CardDescription>
                Pick where these registrations should land.
              </CardDescription>
            </div>
            {selectedSessionDetails && (
              <Badge variant="secondary" className="w-fit">
                {selectedSessionDetails.status}
              </Badge>
            )}
          </CardHeader>
          <CardContent>
            <div className="mb-6 space-y-3 rounded-lg border bg-muted/20 p-4">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-base font-semibold">Event reports</h3>
                  <p className="text-sm text-muted-foreground">
                    Download registrations for the selected instance.
                  </p>
                </div>
                <div className="grid w-full gap-2 sm:w-auto sm:grid-cols-2">
                  <Button
                    type="button"
                    onClick={() => downloadEventReport("csv")}
                    disabled={reportDownload !== null}
                    className="w-full sm:w-auto"
                  >
                    {reportDownload === "csv" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4" />
                    )}
                    Export CSV
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => downloadEventReport("xlsx")}
                    disabled={reportDownload !== null}
                    className="w-full sm:w-auto"
                  >
                    {reportDownload === "xlsx" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4" />
                    )}
                    Export XLSX
                  </Button>
                </div>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {sessions.map((session) => (
                <button
                  key={session.code}
                  onClick={() => setSelectedSession(session.code)}
                  className={cn(
                    "rounded-xl border bg-background p-4 text-left transition hover:border-primary/50 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
                    selectedSession === session.code
                      ? "border-primary ring-2 ring-primary/30"
                      : "border-muted"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <p className="text-xs uppercase text-muted-foreground">
                        Instance
                      </p>
                      <h3 className="text-base font-semibold">
                        {session.title}
                      </h3>
                    </div>
                    <Badge variant="outline">{session.status}</Badge>
                  </div>
                  <dl className="mt-4 grid grid-cols-2 gap-2 text-xs sm:text-sm">
                    <div className="rounded-lg bg-muted/50 px-3 py-2">
                      <dt className="text-muted-foreground">Total</dt>
                      <dd className="font-semibold">{session.totalSeats}</dd>
                    </div>
                    <div className="rounded-lg bg-muted/50 px-3 py-2">
                      <dt className="text-muted-foreground">Booked</dt>
                      <dd className="font-semibold">{session.bookedSeats}</dd>
                    </div>
                    <div className="col-span-2 rounded-lg bg-muted/50 px-3 py-2">
                      <dt className="text-muted-foreground">Remaining</dt>
                      <dd className="font-semibold">
                        {session.totalRemainingSeats}
                      </dd>
                    </div>
                  </dl>
                </button>
              ))}
            </div>
            {sessions.length === 0 && (
              <p className="text-center text-sm text-muted-foreground">
                No sessions available for manual registration.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Find a user to register</CardTitle>
            <CardDescription>
              {selectedSessionDetails
                ? `Adding people to ${selectedSessionDetails.title}`
                : "Select an instance to enable registration."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative w-full sm:max-w-sm">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search a user"
                  className="w-full rounded-lg bg-background pl-8"
                  value={searchQuery ?? ""}
                  onChange={(e) => {
                    const value = e.target.value;
                    setSearchQuery(value);
                    if (value === "") {
                      setSearchQuery(null);
                      fetchUsers();
                    }
                  }}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  onClick={() => {
                    fetchUsers(null, null, searchQuery);
                  }}
                >
                  Search
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setSearchQuery(null);
                    fetchUsers();
                  }}
                >
                  Reset
                </Button>
              </div>
            </div>
            <div className="overflow-hidden rounded-lg border">
              <Table>
                {!searchQuery && (
                  <TableCaption>
                    Total Users: {pagination?.totalData}
                  </TableCaption>
                )}
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Community ID</TableHead>
                    <TableHead>Phone Number</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Department Name</TableHead>
                    <TableHead>Cool Name</TableHead>
                    <TableHead>Register</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users &&
                    users.map((user) => (
                      <TableRow key={user.communityId}>
                        <TableCell className="font-medium">
                          {user.name}
                        </TableCell>
                        <TableCell>{user.communityId}</TableCell>
                        <TableCell>{user.phoneNumber}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>{user.departmentName ?? null}</TableCell>
                        <TableCell>{user.coolName ?? null}</TableCell>
                        <TableCell>
                          <Button
                            disabled={!selectedSession}
                            onClick={() => registerUser(user)}
                          >
                            Register
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
            <div className="flex justify-center">
              <Pagination>
                <PaginationContent>
                  {pagination?.previous && (
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={() => {
                          if (searchQuery) {
                            fetchUsers(
                              pagination.previous,
                              "prev",
                              searchQuery
                            );
                          } else {
                            fetchUsers(pagination.previous, "prev");
                          }
                        }}
                      />
                    </PaginationItem>
                  )}
                  {pagination?.next && (
                    <PaginationItem>
                      <PaginationNext
                        onClick={() => {
                          if (searchQuery) {
                            fetchUsers(pagination.next, "next", searchQuery);
                          } else {
                            fetchUsers(pagination.next, "next");
                          }
                        }}
                      />
                    </PaginationItem>
                  )}
                </PaginationContent>
              </Pagination>
            </div>
          </CardContent>
        </Card>
      </section>
    </>
  );
}

export default withAuth(EventSessionsAdmin);
