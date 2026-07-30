"use client";
import React, { useEffect, useState } from "react";
import HeaderNav from "@/components/HeaderNav";
import { Separator } from "@/components/ui/separator";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useParams } from "next/navigation";
import { API_BASE_URL, API_KEY } from "@/lib/config";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useAuth } from "@/components/providers/AuthProvider";
import withAuth from "@/components/providers/AuthWrapper";
import { useRouter } from "next/navigation";
import { formatDate } from "@/lib/utils";
import VerifyTicketDialog from "@/components/VerifyTicketDialog";

const EventInternal = () => {
  const { eventCode } = useParams(); // Retrieve eventCode from the route params
  const [instances, setInstances] = useState<any[]>([]); // State to hold instances
  const [details, setDetails] = useState<any>({}); // State to hold details
  const [isLoading, setIsLoading] = useState<boolean>(false); // State for loading
  const [error, setError] = useState<string | null>(null); // State for errors
  const { getValidAccessToken, handleExpiredToken } = useAuth();
  const router = useRouter();

  // Fetch instances when the component mounts or when eventCode changes
  useEffect(() => {
    async function fetchInstances() {
      const accessToken = await getValidAccessToken();
      if (!accessToken) {
        handleExpiredToken();
        return;
      }

      try {
        setIsLoading(true); // Set loading state

        const response = await fetch(
          `${API_BASE_URL}/api/v2/events/${eventCode}`,
          {
            headers: {
              "X-API-KEY": API_KEY || "",
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );

        if (!response.ok) {
          if (response.status === 401) {
            handleExpiredToken();
            console.error("Unauthorized - Token expired or invalid");
            return;
          }
          throw new Error("Failed to fetch instances");
        }

        const data = await response.json();
        setDetails(data.details);
        setInstances(data.data); // Update instances state
      } catch (error) {
        console.error("Failed to fetch instances:", error);
        setError("Failed to load instances. Please try again later.");
      } finally {
        setIsLoading(false); // Stop loading state
      }
    }

    fetchInstances();
  }, [getValidAccessToken, handleExpiredToken, eventCode]);

  function handleRegistration(
    eventCode: string | string[],
    instanceCode: string
  ) {
    return router.push(`/events/${eventCode}/${instanceCode}/registration`);
  }

  return (
    <>
      <HeaderNav name="Event Instances" link="events" />
      <main>
        {/* Loading and Error States */}
        {isLoading ? (
          <LoadingSpinner />
        ) : error ? (
          <p className="text-center text-red-500">{error}</p>
        ) : instances.length === 0 ? (
          <p className="text-center">No instances available for this event.</p>
        ) : (
          // Display fetched instances (only show cards for available instances)
          instances
            .filter((instance) => instance.availabilityStatus === "available")
            .map((instance) => (
              <Card
                key={instance.code}
                className="rounded-xl mx-2 my-5 md:w-1/2 md:mx-auto"
              >
                <div className="flex flex-col">
                  <CardHeader>
                    <CardTitle>{instance.title}</CardTitle>{" "}
                    {/* Instance Title */}
                  </CardHeader>
                  <CardContent className="flex flex-col">
                    <Badge
                      className={`flex w-fit p-2 text-center justify-center items-center mb-2 ${
                        instance.availabilityStatus === "available"
                          ? "bg-green-700"
                          : instance.availabilityStatus === "unavailable"
                          ? "bg-red-500"
                          : "bg-gray-400" // Default color for other statuses
                      }`}
                    >
                      <span className="mx-auto">
                        {instance.availabilityStatus}
                      </span>
                    </Badge>

                    <p className="text-base font-light my-2 pb-2">
                      {instance.LocationName}
                    </p>
                    <Separator />
                    {/* <div className="mt-2 pt-4">
                    <p className="font-semibold text-gray-700">Event Time:</p>
                    <p className="text-sm text-gray-500 my-3">
                      <span className="font-medium text-gray-700">
                        {formatDate(new Date(instance.time))}
                      </span>
                    </p>
                  </div> */}

                    <Separator />
                  </CardContent>
                  <CardFooter>
                    {/* Link to register instances page */}
                    {instance.availabilityStatus === "available" ? (
                      <VerifyTicketDialog
                        eventName={details.title ?? "Homebase"}
                        eventCode={
                          Array.isArray(eventCode) ? eventCode[0] : eventCode
                        }
                        sessionCode={instance.code}
                        sessionName={instance.title}
                        onlineEvent={true}
                      />
                    ) : (
                      <Button disabled>Registration Closed</Button>
                    )}
                  </CardFooter>
                </div>
              </Card>
            ))
        )}
      </main>
    </>
  );
};

export default withAuth(EventInternal);
