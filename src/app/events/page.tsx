"use client";
import React, { useEffect, useState } from "react";
import HeaderNav from "@/components/HeaderNav";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { API_BASE_URL, API_KEY } from "@/lib/config";
import { useRouter } from "next/navigation";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import withAuth from "@/components/providers/AuthWrapper";
import { useAuth } from "@/components/providers/AuthProvider";
import { formatDate } from "@/lib/utils";
import homebaseDatasets from "../../lib/datasets/homebase_dataset.json";

const EventsPage = () => {
  const [events, setEvents] = useState<any[]>([]); // State to hold fetched events
  const [isLoading, setIsLoading] = useState<boolean>(true); // Loading state
  const EVENT_EXAMPLE_IMAGE_URL =
    "https://utfs.io/f/OiRxrZt1JqQ4CQoHxw3RfX59ZPjs6OUdGVqBiH0rFAY34Ltm";
  const router = useRouter();
  const { isAuthenticated, handleExpiredToken, getValidAccessToken } =
    useAuth();

  // Fetch events on component mount
  useEffect(() => {
    async function fetchEvents() {
      const accessToken = await getValidAccessToken();
      if (!accessToken) {
        handleExpiredToken();
        return;
      }

      try {
        setIsLoading(true); // Set loading state

        const response = await fetch(`${API_BASE_URL}/api/v2/events`, {
          headers: {
            "X-API-KEY": API_KEY,
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`, // Include token in Authorization header
          },
        });

        if (!response.ok) {
          if (response.status === 401) {
            handleExpiredToken();
            console.error("Unauthorized - Token expired or invalid");
            return;
          }
          throw new Error("Failed to fetch events");
        }

        const data = await response.json();

        setEvents(data.data); // Store events data
      } catch (error) {
        console.error("Error fetching events:", error);
      } finally {
        setIsLoading(false); // Stop loading state
      }
    }

    fetchEvents();
  }, [getValidAccessToken, handleExpiredToken]);

  function handleSession(code: string) {
    return router.push(`/events/${code}`);
  }
  function handleInternalSession(code: string) {
    return router.push(`/events/${code}/internal`);
  }
  const getHomebaseFromCodes = (codes: string[]) => {
    return codes
      .map((code: string) => {
        const homebase = homebaseDatasets.find(
          (dataset) => dataset.code === code
        );
        return homebase ? homebase.homebase : "Unknown";
      })
      .join(", ");
  };

  return (
    <>
      <HeaderNav name="Events" link="home"></HeaderNav>
      <main>
        <div className="my-4 mx-2 flex relative flex-1 md:grow-0">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search an event"
            className="w-full justify-center rounded-lg bg-background pl-8 md:w-[200px] lg:w-[336px]"
          />
        </div>
        <Separator />
        <div className="my-4 mx-2 p-3">
          {isLoading ? (
            <p>
              <LoadingSpinner />
            </p>
          ) : events && events.length > 0 ? (
            events.map((event) => (
              <Card key={event.id} className="rounded-xl mb-4">
                <div className="flex flex-col md:flex-row">
                  {/* Left Half / Top Half: Image */}
                  <div className="relative md:w-1/2 h-60 md:h-96 overflow-hidden rounded-t-lg md:rounded-l-lg">
                    <Image
                      src={EVENT_EXAMPLE_IMAGE_URL}
                      alt="Event Image"
                      layout="fill"
                      className="object-cover"
                      priority
                    />
                  </div>
                  {/* Right Half / Bottom Half: Event Information */}
                  <div className="md:w-1/2">
                    <CardHeader>
                      <CardTitle className="mx-auto md:mx-0">
                        {event.title}
                      </CardTitle>{" "}
                      {/* Event name */}
                    </CardHeader>
                    <CardContent className="flex flex-col items-center md:items-start">
                      <Badge
                        className={`flex w-fit p-2 text-center justify-center items-center mb-2 ${
                          event.availabilityStatus === "available"
                            ? "bg-green-700"
                            : "bg-primary" // Default color for other statuses
                        }`}
                      >
                        <span className="mx-auto">
                          {event.availabilityStatus}
                        </span>
                      </Badge>
                      <p className="text-base font-light">
                        {`This is a ${
                          event.allowedFor
                        } event allowed for ${getHomebaseFromCodes(
                          event.allowedCampuses
                        )}.`}
                      </p>
                      <div className="">
                        {event.topics.includes("internal") && (
                          <>
                            {" "}
                            <p className="font-semibold text-gray-700">
                              Registration Times:
                            </p>
                            <div className="flex flex-col">
                              <p className="text-sm text-gray-500 my-3">
                                <span className="font-medium text-gray-700">
                                  Open:{" "}
                                  {formatDate(new Date(event.registerStartAt))}
                                </span>
                              </p>
                              <p className="text-sm text-gray-500">
                                <span className="font-medium text-gray-700">
                                  Closed:{" "}
                                  {formatDate(new Date(event.registerEndAt))}
                                </span>
                              </p>
                            </div>
                          </>
                        )}
                      </div>
                    </CardContent>
                    <CardFooter>
                      <Button
                        className="w-fit mx-auto md:mx-0"
                        onClick={() => handleInternalSession(event.code)}
                        disabled={event.availabilityStatus === "soon"}
                      >
                        Register for Homebase
                      </Button>
                      {/* Link to event sessions page */}
                      {event.status === "active" ? (
                        <Button onClick={() => handleSession(event.code)}>
                          Register Now!
                        </Button>
                      ) : event.status === "walkin" ? (
                        <Button disabled>Walk-in : Register On Site</Button>
                      ) : (
                        <></>
                      )}
                    </CardFooter>
                  </div>
                </div>
              </Card>
            ))
          ) : events && events.length === 0 ? (
            <p>No events found.</p>
          ) : (
            <p>No events found.</p>
          )}
        </div>
      </main>
    </>
  );
};

export default withAuth(EventsPage);
