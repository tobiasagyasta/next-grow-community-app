"use client";
import React, { useEffect, useState } from "react";
import HeaderNav from "@/components/HeaderNav";
import { useAuth } from "@/components/providers/AuthProvider";
import withAuth from "@/components/providers/AuthWrapper";
import ReactMarkdown from "react-markdown";
import { useQRCode } from "next-qrcode";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"; // Ensure you have a Card component
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { LoadingSpinner } from "@/components/ui/loading-spinner"; // Ensure you have a LoadingSpinner component
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
} from "@/components/ui/dialog"; // Import ShadCN Dialog components
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";

const TicketsPage = () => {
  const convertLinksToAnchors = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.split(urlRegex).map((part, i) => {
      if (part.match(urlRegex)) {
        return (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:text-blue-700 underline"
          >
            {part}
          </a>
        );
      }
      return part;
    });
  };
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [filter, setFilter] = useState<string>("pending"); // Default filter
  const [loading, setLoading] = useState<boolean>(true); // Add loading state
  const [selectedImage, setSelectedImage] = useState<string | null>(null); // State for the selected image
  const { isAuthenticated, handleExpiredToken, getValidAccessToken } =
    useAuth();
  const userData = isAuthenticated
    ? JSON.parse(localStorage.getItem("userData") || "{}")
    : null;
  const { toast } = useToast();
  const fetchRegistrations = async () => {
    const accessToken = await getValidAccessToken();
    if (!accessToken) {
      handleExpiredToken();
      return;
    }

    setLoading(true); // Start loading

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/v2/events/registers`,
        {
          headers: {
            "X-API-KEY": process.env.NEXT_PUBLIC_API_KEY || "",
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (response.status === 401) {
        // Handle expired token
        handleExpiredToken();
        return;
      }

      const data = await response.json();
      const mappedRegistrations = data.data.flatMap((event: any) =>
        event.instances.flatMap((instance: any) =>
          instance.registrants.map((registrant: any) => ({
            ...registrant,
            eventName: event.title,
            sessionName: instance.title,
            sessionCode: instance.code,
            sessionDescription: instance.description,
          }))
        )
      );
      setRegistrations(mappedRegistrations);
    } catch (error) {
      console.error("Failed to fetch registrations:", error);
    } finally {
      setLoading(false); // End loading
    }
  };

  useEffect(() => {
    fetchRegistrations();
  }, [userData?.token]);

  const handleDelete = async (id: string) => {
    const confirm = window.confirm(
      "Are you sure you want to delete this registration?"
    );
    if (!confirm) return;

    const accessToken = await getValidAccessToken();
    if (!accessToken) {
      handleExpiredToken();
      return;
    }

    const payload = {
      status: "cancelled",
      updatedAt: new Date().toISOString(),
    };

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/v2/events/registers/${id}/status`,
        {
          method: "PATCH",
          headers: {
            "X-API-KEY": process.env.NEXT_PUBLIC_API_KEY || "",
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify(payload),
        }
      );

      if (response.status === 401) {
        handleExpiredToken();
        return;
      }

      if (response.ok) {
        setRegistrations((prev) => prev.filter((reg) => reg.id !== id));
        toast({
          title: "Deletion Successful",
          description: `You have cancelled your registration.`,
          className: "bg-green-400",
          duration: 1500,
        });
      } else {
        const errorResult = await response.json();
        toast({
          title: "Deletion Failed!",
          description: `Error : ${errorResult.message} `,
          className: "bg-red-400",
          duration: 2000,
        });
        throw errorResult;
      }
    } catch (error) {
      alert("An error occurred. Please try again.");
      console.error("An error occurred:", error);
    }
  };

  // Filter registrations based on selected status
  const filteredRegistrations = registrations.filter(
    (registration) => registration.registrationStatus === filter
  );
  const { Image } = useQRCode();

  return (
    <>
      <HeaderNav name="Your Event Tickets" link="home" />
      <main className="p-8">
        <div className="flex flex-col mt-4 gap-y-4">
          {/* Filter buttons */}
          <div className="flex justify-center mb-4 gap-4">
            <button
              onClick={() => setFilter("pending")}
              className={`px-4 py-2 rounded ${
                filter === "pending" ? "bg-blue-500 text-white" : "bg-gray-200"
              }`}
            >
              Registered
            </button>
            <button
              onClick={() => setFilter("success")}
              className={`px-4 py-2 rounded ${
                filter === "success" ? "bg-green-700 text-white" : "bg-gray-200"
              }`}
            >
              Scanned
            </button>
          </div>

          {/* Display loading spinner if loading */}
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <LoadingSpinner />
            </div>
          ) : (
            /* Display filtered registrations */
            <div className="flex flex-col mt-4 gap-y-8">
              {filteredRegistrations.length === 0 ? (
                <p className="text-center text-gray-500">
                  No tickets available
                </p>
              ) : (
                filteredRegistrations.map((registration) => (
                  <Card
                    key={registration.id}
                    className="p-4 shadow-lg flex flex-col justify-center items-center gap-y-3 w-2/3 md:w-4/12 mx-auto text-center"
                  >
                    <CardTitle>{registration.name}</CardTitle>
                    <CardDescription>{registration.eventName}</CardDescription>
                    <Badge
                      className={`flex w-17 p-2 text-center justify-center items-center mb-2 ${
                        registration.registrationStatus === "pending"
                          ? "bg-blue-500"
                          : registration.registrationStatus === "success"
                          ? "bg-green-700"
                          : "bg-gray-400" // Default color for other statuses
                      }`}
                    >
                      <span className="mx-auto">
                        {registration.registrationStatus === "pending"
                          ? "Registered"
                          : registration.registrationStatus === "success"
                          ? "Scanned"
                          : "Unknown"}
                      </span>
                    </Badge>
                    <Dialog>
                      <DialogTrigger asChild>
                        <div onClick={() => setSelectedImage(registration.id)}>
                          <Image
                            text={registration.id}
                            options={{
                              type: "image/jpeg",
                              quality: 0.8,
                              errorCorrectionLevel: "M",
                              margin: 3,
                              scale: 10,
                              width: 200,
                              color: {
                                dark: "#000000",
                                light: "#FFFFFF",
                              },
                            }}
                          />
                        </div>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <div className="flex flex-col items-center">
                            <b>{registration.name}</b>
                            <span>{registration.eventName}</span>
                            <span className="text-gray-400">
                              {registration.sessionName}
                            </span>
                          </div>
                        </DialogHeader>

                        {selectedImage && (
                          <div className="flex justify-center">
                            <Image
                              text={selectedImage}
                              options={{
                                type: "image/jpeg",
                                quality: 0.8,
                                errorCorrectionLevel: "M",
                                margin: 3,
                                scale: 10,
                                width: 600, // Larger width for display
                                color: {
                                  dark: "#000000",
                                  light: "#FFFFFF",
                                },
                              }}
                            />
                          </div>
                        )}
                        <DialogFooter>
                          <span className="text-xs text-gray-500 mx-auto">
                            {registration.id}
                          </span>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                    <span className="text-xs font-light text-center">
                      Click / tap the QR Code image above to expand it.
                    </span>
                    <Separator></Separator>
                    <CardContent className="flex flex-col justify-center items-center w-full">
                      <p className="text-sm text-gray-700 w-full">
                        <b>Session:</b> {registration.sessionName} (
                        {registration.sessionCode})
                      </p>
                      <p className="text-sm  text-gray-700 w-full break-words overflow-auto max-h-32 mt-3">
                        <b className="">Description:</b>{" "}
                        <ReactMarkdown>
                          {registration.sessionDescription}
                        </ReactMarkdown>
                      </p>
                    </CardContent>
                    <CardFooter>
                      {registration.registrationStatus === "pending" ? (
                        <Button
                          className="bg-red-500"
                          onClick={() => {
                            handleDelete(registration.id);
                          }}
                        >
                          Delete
                        </Button>
                      ) : null}
                    </CardFooter>
                  </Card>
                ))
              )}
            </div>
          )}
        </div>
      </main>
    </>
  );
};

export default withAuth(TicketsPage);
