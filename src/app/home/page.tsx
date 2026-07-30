"use client";
import React from "react";
import Link from "next/link";
import { LogOut } from "lucide-react";
import { QrCode } from "lucide-react";
import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChevronRight } from "lucide-react";
import IconButton from "@/components/IconButton";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import withAuth from "@/components/providers/AuthWrapper";
import { Badge } from "@/components/ui/badge";
import { hasType } from "@/lib/utils";
import {
  Dialog,
  DialogOverlay,
  DialogContent,
  DialogHeader,
  DialogFooter,
} from "@/components/ui/dialog"; // Import ShadCN Dialog components
import { useQRCode } from "next-qrcode";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import Image from "next/image";
import { useEffect, useState } from "react";
import Announcement from "@/components/Announcement";
// import SnowfallComponent from "@/components/SnowfallComponent";

const Home = () => {
  const router = useRouter();
  const IMAGE_URL =
    "https://images.unsplash.com/photo-1555817128-342e1c8b3101?q=80&w=1470&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D";
  const { isAuthenticated, logout, handleExpiredToken, getValidAccessToken } =
    useAuth();

  const [isAnnouncementVisible, setIsAnnouncementVisible] = useState(false);

  /* Announcement useEffect */

  // useEffect(() => {
  //   const hasSeenAnnouncement = localStorage.getItem("hasSeenAnnouncement");
  //   const timestamp = localStorage.getItem("announcementTimestamp");

  //   // Show announcement if user hasn't seen it or timestamp expired (more than 3 hours)
  //   if (
  //     !hasSeenAnnouncement ||
  //     !timestamp ||
  //     Date.now() - parseInt(timestamp) > 3 * 60 * 60 * 1000
  //   ) {
  //     setIsAnnouncementVisible(true);
  //     localStorage.setItem("hasSeenAnnouncement", "true");
  //     localStorage.setItem("announcementTimestamp", Date.now().toString());
  //   }
  // }, []);

  // Programmatic trigger for announcement
  const showAnnouncement = () => {
    setIsAnnouncementVisible(true);
  };

  const hideAnnouncement = () => {
    setIsAnnouncementVisible(false);
  };

  const handleLogout = () => {
    logout();
    router.push("/");
  };
  const userData = isAuthenticated
    ? JSON.parse(localStorage.getItem("userData") || "{}")
    : null;
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [registrationsCount, setRegistrationsCount] = useState<number>(0);
  const fetchRegistrations = async () => {
    const accessToken = await getValidAccessToken();
    if (!accessToken) {
      handleExpiredToken();
      return;
    }

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/v2/events/registers`,
        {
          headers: {
            "X-API-KEY": process.env.NEXT_PUBLIC_API_KEY || "",
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      if (response.status === 401) {
        // Handle expired token
        handleExpiredToken();
        return;
      }

      const data = await response.json();
      const registeredCount = data.data.flatMap((event: any) =>
        event.instances.flatMap((instance: any) =>
          instance.registrants.filter(
            (registrant: any) => registrant.registrationStatus === "pending",
          ),
        ),
      ).length;
      setRegistrationsCount(registeredCount);
    } catch (error) {
      console.error("Failed to fetch registrations:", error);
    }
  };

  useEffect(() => {
    fetchRegistrations();
  }, []);
  const { SVG } = useQRCode();
  const [selectedImage, setSelectedImage] = useState<string | null>(null); // State for the selected image

  const openModal = (image: string) => {
    setSelectedImage(image);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedImage(null);
  };

  return (
    <>
      {/* <SnowfallComponent /> */}
      <main className="h-max min-w-full overflow-auto">
        {/* Header */}
        <div className="relative flex flex-row border bg-primary border-x-primary border-t-primary border-b-black/20 p-2 justify-between items-center overflow-hidden">
          {/* <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[6px] opacity-80 bg-[repeating-linear-gradient(135deg,#ef4444_0,#ef4444_12px,#ffffff_12px,#ffffff_24px,#10b981_24px,#10b981_36px)]" /> */}
          <Image
            className="py-1"
            src="/images/gc-logo.jpg" // Adjust the path to your logo in the public folder
            alt="Logo"
            width={60} // Adjust the width of the logo
            height={60} // Adjust the height of the logo
          />
          <div className="flex flex-row gap-x-3 items-center">
            <Button onClick={handleLogout}>
              <span className="text-white text-sm mr-5">Sign Out</span>
              <LogOut className="md:w-8 md:h-8 mr-2 text-white" />
            </Button>
          </div>
        </div>

        <div className="flex flex-row bg-white  p-8 justify-between items-center">
          <span className="text-black text-base font-bold">
            Hi, {userData?.name} !
          </span>

          <div className="flex flex-row gap-x-8">
            {/* Button to Trigger Announcement Programmatically */}

            {/* <Popover>
              <PopoverTrigger asChild>
                <div className="relative inline-block cursor-pointer">
                  <i className="fi fi-rs-file-invoice text-2xl mt-1"></i>
                  <Badge className="absolute -top-2 right-1 inline-flex items-center justify-center w-5 h-5 text-xs font-bold leading-none hover:bg-red-600 text-white bg-red-600 rounded-full transform translate-x-1/2 -translate-y-1/2">
                    {hasType(userData, "volunteer") ? 1 : 0}
                  </Badge>
                </div>
              </PopoverTrigger>
              <PopoverContent>
                <div className="flex flex-col gap-2 text-center">
                  <p>
                    You currently have{" "}
                    <span className="font-bold text-lg">
                      {hasType(userData, "volunteer") ? 1 : 0}
                    </span>{" "}
                    announcement!
                  </p>
                  {hasType(userData, "volunteer") && (
                    <Button
                      onClick={showAnnouncement}
                      className="bg-red-600 mt-1"
                    >
                      Informasi Homebase Onsite
                    </Button>
                  )}
                </div>
              </PopoverContent>
            </Popover> */}
            <Popover>
              <PopoverTrigger asChild>
                <div className="relative inline-block cursor-pointer">
                  <i className="fi fi-rs-ticket text-2xl mt-1"></i>
                  <Badge className="absolute -top-2 right-1 inline-flex items-center justify-center w-5 h-5 text-xs font-bold leading-none hover:bg-red-600 text-white bg-red-600 rounded-full transform translate-x-1/2 -translate-y-1/2">
                    {registrationsCount}
                  </Badge>
                </div>
              </PopoverTrigger>
              <PopoverContent>
                <div className="flex flex-col">
                  <p>
                    You currently have{" "}
                    <span className="font-bold text-lg">
                      {registrationsCount}
                    </span>{" "}
                    active event tickets!
                  </p>
                  <Button className="mt-1">
                    <Link href="/tickets">View your QR codes</Link>
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
            {/* QR Code Dialog */}
            {(hasType(userData, "volunteer") || hasType(userData, "admin")) && (
              <>
                {" "}
                <Popover>
                  <PopoverTrigger asChild>
                    <div
                      onClick={() => setSelectedImage(userData?.communityId)}
                      className="relative inline-block cursor-pointer"
                    >
                      <i className="fi fi-rs-qrcode text-2xl mt-1"></i>
                    </div>
                  </PopoverTrigger>
                  <PopoverContent>
                    <Dialog>
                      <DialogHeader>
                        <div className="flex flex-col items-center">
                          <b>{userData?.name}</b>
                          <span>{userData?.email}</span>
                        </div>
                      </DialogHeader>
                      {selectedImage && (
                        <div
                          className="flex justify-center cursor-pointer"
                          onClick={() => openModal(selectedImage)}
                        >
                          <SVG
                            text={selectedImage}
                            options={{
                              type: "image/jpeg",
                              quality: 0.8,
                              errorCorrectionLevel: "M",
                              margin: 3,
                              scale: 10,
                              width: 200, // Larger width for display
                              color: {
                                dark: "#000000",
                                light: "#FFFFFF",
                              },
                            }}
                          />
                        </div>
                      )}
                      {isModalOpen && (
                        <Dialog
                          open={isModalOpen}
                          onOpenChange={setIsModalOpen}
                        >
                          <DialogOverlay />
                          <DialogContent>
                            <DialogHeader>
                              <div className="flex flex-col items-center">
                                <b>{userData?.name}</b>
                                <span>{userData?.email}</span>
                              </div>
                            </DialogHeader>
                            {selectedImage && (
                              <div className="flex justify-center">
                                <SVG
                                  text={selectedImage}
                                  options={{
                                    type: "image/jpeg",
                                    quality: 0.8,
                                    errorCorrectionLevel: "M",
                                    margin: 3,
                                    scale: 10,
                                    width: 300, // Even larger width for modal display
                                    color: {
                                      dark: "#000000",
                                      light: "#FFFFFF",
                                    },
                                  }}
                                />
                              </div>
                            )}
                            <DialogFooter>
                              <Button
                                className="w-1/2 mx-auto"
                                onClick={closeModal}
                              >
                                Close
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      )}
                      <DialogFooter>
                        <span className="text-xs text-gray-500 mx-auto text-center">
                          This is your homebase QR Code! Use it to enter
                          homebase events.
                        </span>
                      </DialogFooter>
                    </Dialog>
                  </PopoverContent>
                </Popover>
              </>
            )}
          </div>
        </div>
        {/* Hero Banner */}
        <div className="relative w-screen h-[45vw] md:h-96">
          <div className="-z-10">
            <Image
              priority
              src={IMAGE_URL}
              fill={true}
              className="object-cover object-center"
              alt="hero image example"
            />
          </div>
          <div className="relative flex flex-col items-center justify-center h-[45vw] md:h-96">
            <h1 className="text-white text-4xl font-bold outline-black drop-shadow-sm">
              Come and Join us!
            </h1>
            <p className="text-white italic font-normal outline-black drop-shadow-sm">
              Register to your nearest COOL community now!
            </p>
          </div>
        </div>
        {/* Dashboard Icons */}

        {/* Announcement Component */}
        {hasType(userData, "volunteer") && (
          <Announcement
            title="Informasi Homebase"
            message="We're excited to have you here. Check out the latest features and upcoming events!"
            isVisible={isAnnouncementVisible}
            onClose={hideAnnouncement}
          />
        )}

        <div className="mt-8 flex justify-center">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-6 p-3 justify-items-center w-full">
            <IconButton
              href="/events"
              iconName="fi fi-tr-calendar-star"
              name="Events"
              iconColor="text-sky-500"
              openInNewTab={false}
            />
            <IconButton
              href="https://docs.google.com/forms/d/e/1FAIpQLSeoI9uokd3sBj6GsJL69348EGxh8x5bE8Ozw4cm-C8iR253zg/viewform?usp=sf_link"
              iconName="fi fi-tr-praying-hands"
              name="Prayer and Grateful Form"
              iconColor="text-amber-600"
              openInNewTab={true}
            />
            <IconButton
              href="https://growcommunity.church/index.php/give/"
              iconName="fi fi-tr-hands-heart"
              name="Giving"
              iconColor="text-rose-400"
              openInNewTab={true}
            />
            <IconButton
              href="https://www.youtube.com/c/GrowCenterChurch"
              iconName="fi fi-brands-youtube"
              name="Sermons"
              iconColor="text-red-600"
              openInNewTab={true}
            />
            <IconButton
              href="https://open.spotify.com/show/3Uawgjvfdw3KnHTlrl5GLJ?si=890c04f909654e1c&nd=1&dlsi=e04e2d46b9084aa5"
              iconName="fi fi-brands-spotify"
              name="Grow in Words"
              iconColor="text-green-500"
              openInNewTab={true}
            />
            <IconButton
              href="/profile"
              iconName="fi fi-rr-user"
              name="Profile"
              iconColor="text-blue-500"
              openInNewTab={false}
            />
            {hasType(userData, "admin") ? (
              <IconButton
                href="/dashboard"
                iconName="fi fi-tr-dashboard-monitor"
                name="Admin"
                iconColor="text-black-500"
              />
            ) : null}
          </div>
        </div>
        {/* Upcoming Events */}
        <div className="mt-4 p-3 mb-20">
          <Link href="/tickets">
            <Card className="p-4 md:w-1/2 md:mx-auto">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-medium mb-2">Your Events</h3>
                  <p className="text-sm text-muted-foreground">
                    {registrationsCount > 0 ? (
                      <>
                        You have currently registered for
                        <span className="text-black font-bold">
                          {" "}
                          {registrationsCount}{" "}
                        </span>
                        tickets!
                      </>
                    ) : (
                      <>You currently have no registrations.</>
                    )}
                  </p>
                </div>

                <ChevronRight className="h-8 w-8"></ChevronRight>
              </div>
            </Card>
          </Link>
        </div>
      </main>
    </>
  );
};

export default withAuth(Home);
