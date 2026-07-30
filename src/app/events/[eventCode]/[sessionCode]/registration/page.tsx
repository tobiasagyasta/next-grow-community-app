"use client";
import React, { useState } from "react";
import { useParams } from "next/navigation";
import HeaderNav from "../../../../../components/HeaderNav";
import { Button } from "../../../../../components/ui/button";
import { UserMinus, Loader2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../../../../../components/ui/card";
import { Input } from "../../../../../components/ui/input";
import { API_BASE_URL, API_KEY } from "../../../../../lib/config";
import { useAuth } from "../../../../../components/providers/AuthProvider";
import withAuth from "../../../../../components/providers/AuthWrapper";
import { useRouter } from "next/navigation";
import { useToast } from "../../../../../components/ui/use-toast";

const EventRegistration = () => {
  const { eventCode, sessionCode } = useParams();
  const [numberOfRegistrants, setNumberOfRegistrants] = useState<number>(1);
  const [confirmed, setConfirmed] = useState<boolean>(false);
  const [registrantData, setRegistrantData] = useState<{ name: string }[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const { isAuthenticated, handleExpiredToken, getValidAccessToken } =
    useAuth();
  const userData = isAuthenticated
    ? JSON.parse(localStorage.getItem("userData") || "{}")
    : null;
  const [identifier, setIdentifier] = useState<string>(userData.email); // New state for identifier
  const router = useRouter();
  const { toast } = useToast();
  const [availableSlots, setAvailableSlots] = useState<number | null>(null);

  const incrementRegistrants = () => {
    const maxAllowed = availableSlots === null ? 4 : Math.min(4, availableSlots);
    if (maxAllowed <= 0) {
      return;
    }
    if (numberOfRegistrants < maxAllowed) {
      setNumberOfRegistrants((prev) => prev + 1);
    }
  };

  const decrementRegistrants = () => {
    if (numberOfRegistrants > 1) {
      setNumberOfRegistrants((prev) => prev - 1);
    }
  };

  const handleConfirm = () => {
    if (availableSlots !== null && availableSlots <= 0) {
      toast({
        title: "Registration Limit Reached",
        description: "No slots remaining for this instance.",
        className: "bg-red-400",
        duration: 2500,
      });
      return;
    }
    if (numberOfRegistrants < 1) {
      toast({
        title: "Registration Limit Reached",
        description: "No slots remaining for this instance.",
        className: "bg-red-400",
        duration: 2500,
      });
      return;
    }
    setConfirmed(true);
    const newRegistrantData = Array.from(
      { length: numberOfRegistrants },
      (_, index) => ({
        name: registrantData[index]?.name || "",
      })
    );
    setRegistrantData(newRegistrantData);
  };

  const handleInputChange = (index: number, field: string, value: string) => {
    if (field === "identifier") {
      setIdentifier(value);
      return;
    }

    const updatedRegistrantData = registrantData.map((data, i) =>
      i === index ? { ...data, [field]: value } : data
    );
    setRegistrantData(updatedRegistrantData);
  };

  const handleDeleteRegistrant = (index: number) => {
    const updatedRegistrantData = registrantData.filter((_, i) => i !== index);
    setRegistrantData(updatedRegistrantData);
    if (numberOfRegistrants === 1) {
      handleReset();
    } else {
      setNumberOfRegistrants((prev) => prev - 1);
    }
  };

  const fetchAvailableSlots = async () => {
    const token = await getValidAccessToken();
    if (!token) {
      handleExpiredToken();
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/v2/events/registers`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "X-API-Key": API_KEY,
        },
      });

      if (response.status === 401) {
        handleExpiredToken();
        return;
      }

      const data = await response.json();
      const targetEvent = data?.data?.find(
        (event: any) => event.code === eventCode
      );

      if (!targetEvent) {
        setAvailableSlots(4);
        if (numberOfRegistrants > 4) {
          setNumberOfRegistrants(4);
        }
        return;
      }

      const targetInstance = (targetEvent?.instances ?? []).find(
        (instance: any) => instance.code === sessionCode
      );

      if (!targetInstance) {
        setAvailableSlots(4);
        if (numberOfRegistrants > 4) {
          setNumberOfRegistrants(4);
        }
        return;
      }

      const existingRegistrations = (targetInstance?.registrants ?? []).filter(
        (registrant: any) => registrant.registrationStatus !== "cancelled"
      ).length;

      const remaining = Math.max(0, 4 - existingRegistrations);
      setAvailableSlots(Math.min(4, remaining));

      if (remaining <= 0) {
        setNumberOfRegistrants(0);
      } else if (numberOfRegistrants > remaining) {
        setNumberOfRegistrants(remaining);
      }
    } catch (error) {
      console.error("Failed to fetch event registration count:", error);
      toast({
        title: "Registration Failed!",
        description:
          "Could not verify existing registrations. Please try again.",
        className: "bg-red-400",
        duration: 2000,
      });
    }
  };

  React.useEffect(() => {
    fetchAvailableSlots();
    // We intentionally do not add dependencies to avoid refetch loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const accessToken = await getValidAccessToken();
    if (!accessToken) {
      handleExpiredToken();
      setIsSubmitting(false);
      return;
    }

    if (
      availableSlots !== null &&
      (availableSlots <= 0 ||
        registrantData.length > availableSlots ||
        numberOfRegistrants < 1)
    ) {
      toast({
        title: "Registration Limit Reached",
        description: "No slots remaining for this instance.",
        className: "bg-red-400",
        duration: 2500,
      });
      setIsSubmitting(false);
      return;
    }

    const payload = {
      communityId: userData.communityId,
      eventCode: eventCode,
      instanceCode: sessionCode,
      identifier: identifier.trim(),
      isPersonalQR: false,
      name: registrantData[0]?.name.trim(),
      registerAt: new Date().toISOString(),
      registrants: registrantData.slice(1).map((input) => ({
        name: input.name.trim(),
      })),
    };

    try {
      const response = await fetch(`${API_BASE_URL}/api/v2/events/registers`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          "X-API-Key": API_KEY,
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        toast({
          title: "Registration Successful",
          description: `You have successfully registered for the event! Redirecting to home page....`,
          className: "bg-green-400",
          duration: 3000,
        });

        // Redirect to home page after a delay
        setTimeout(() => {
          router.push("/home");
        }, 3000); // Adjust the delay as needed (3000ms = 3 seconds)
      } else {
        if (response.status === 401) {
          handleExpiredToken();
          return; // Exit function after handling expired token
        }
        // Handle other statuses or errors if needed
        else {
          const errorResult = await response.json();
          toast({
            title: "Registration Failed!",
            description: `Error : ${errorResult.message} `,
            className: "bg-red-400",
            duration: 2000,
          });
          throw errorResult;
        }
      }
    } catch (error) {
      console.error("An error occurred:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setNumberOfRegistrants(1);
    setConfirmed(false);
    setRegistrantData([]);
    setIdentifier(userData.email); // Reset identifier
  };

  return (
    <>
      <HeaderNav name="Register" link={`events/${eventCode}`} />
      <main className="my-4">
        {!confirmed && (
          <div className="flex flex-col items-center space-y-10">
            <label className="text-lg font-semibold text-gray-700">
              Select Number of Registrants
            </label>
            <div className="flex items-center justify-center gap-x-8 my-4">
              <Button
                className="w-10 h-10 bg-primary-light hover:bg-primary-light/70 text-white font-bold transition duration-150 ease-in-out focus:outline-none focus:bg-primary"
                onClick={decrementRegistrants}
              >
                <span className="text-xl">-</span>
              </Button>
              <span className="text-xl font-medium text-gray-900 w-12 text-center">
                {numberOfRegistrants}
              </span>
              <Button
                className="w-10 h-10 bg-primary-light hover:bg-primary-light/70 text-white font-bold transition duration-150 ease-in-out focus:outline-none focus:bg-primary"
                onClick={incrementRegistrants}
              >
                <span className="text-xl md:text-2xl">+</span>
              </Button>
            </div>
            <Button
              onClick={handleConfirm}
              className="bg-primary text-white px-6 py-3 rounded-lg hover:bg-primary-dark transition duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-opacity-50"
            >
              Confirm
            </Button>
          </div>
        )}

        {confirmed && (
          <>
            <form onSubmit={handleSubmit} className="m-4">
              <Card className="my-4 relative md:w-5/12 md:mx-auto">
                <CardHeader>
                  <CardTitle>Identifier</CardTitle>
                  <CardDescription>
                    You can change with another email address or phone number.
                    <br /> Phone number format : 087800001234
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="mb-6">
                    <Input
                      type="text"
                      id="identifier"
                      value={identifier}
                      className="shadow-md focus-visible:ring-primary-light"
                      onChange={(e) =>
                        handleInputChange(-1, "identifier", e.target.value)
                      }
                      required
                    />
                  </div>
                </CardContent>
                <CardFooter></CardFooter>
              </Card>

              {registrantData.map((registrant, index) => (
                <Card
                  key={index}
                  className="my-4 relative md:w-5/12 md:mx-auto"
                >
                  <CardHeader>
                    <CardTitle>
                      <div className="flex flex-row items-center justify-between">
                        <h1>Registrant {index + 1}</h1>
                        <Button
                          type="button"
                          onClick={() => handleDeleteRegistrant(index)}
                          className="bg-red-500 text-white p-2 rounded mt-4 w-9 h-9"
                        >
                          <UserMinus />
                        </Button>
                      </div>
                    </CardTitle>
                    <CardDescription>
                      Please fill out the details below:
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-6">
                      <label htmlFor={`name-${index}`} className="block mb-1">
                        Full Name*
                      </label>
                      <Input
                        type="text"
                        id={`name-${index}`}
                        value={registrant.name}
                        className="shadow-md focus-visible:ring-primary-light"
                        onChange={(e) =>
                          handleInputChange(index, "name", e.target.value)
                        }
                        required
                      />
                    </div>
                  </CardContent>
                  <CardFooter>
                    <span className="text-sm"></span>
                  </CardFooter>
                </Card>
              ))}
            </form>
            <div className="flex flex-row items-center justify-center gap-x-10">
              <Button
                type="submit"
                className="w-1/3 md:w-1/5"
                onClick={handleSubmit}
                disabled={isSubmitting} // Disable button while loading
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit"
                )}
              </Button>
              <Button
                type="button"
                onClick={handleReset}
                className="bg-red-500 text-white p-2 rounded w-1/3 md:w-1/5 "
              >
                Reset
              </Button>
            </div>
          </>
        )}
      </main>
    </>
  );
};

export default withAuth(EventRegistration);
