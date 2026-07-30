"use client";
import { useState } from "react";
import { IDetectedBarcode, Scanner } from "@yudiel/react-qr-scanner";
import { useAuth } from "./providers/AuthProvider";
import { API_BASE_URL, API_KEY } from "@/lib/config";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
} from "./ui/alert-dialog";

interface QrCodeScannerProps {
  sessionCode: string;
  eventCode: string;
  onlineEvent?: boolean;
  irNumber?: string;
}

function QrCodeScanner({
  sessionCode,
  eventCode,
  onlineEvent = false,
  irNumber,
}: QrCodeScannerProps) {
  const { isAuthenticated, handleExpiredToken, getValidAccessToken } =
    useAuth();
  const userData = isAuthenticated
    ? JSON.parse(localStorage.getItem("userData") || "{}")
    : null;

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogTitle, setDialogTitle] = useState("");
  const [dialogDescription, setDialogDescription] = useState("");
  const [dialogVariant, setDialogVariant] = useState("info"); // You can set variants based on the type of alert
  const [loading, setLoading] = useState<boolean>(false);

  const handleScanPublic = async (result: IDetectedBarcode[]) => {
    const accessToken = await getValidAccessToken();
    if (!accessToken) {
      handleExpiredToken();
      return;
    }

    if (result && result.length > 0) {
      const rawValue = result[0]?.rawValue;

      try {
        setLoading(true);

        // Run the PATCH request to update the status
        const patchResponse = await fetch(
          `${API_BASE_URL}/api/v2/events/registers/${rawValue}/status`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
              "X-API-Key": API_KEY || "",
            },
            body: JSON.stringify({
              status: "success",
              updatedAt: new Date().toISOString(),
            }),
          }
        );

        // Handle the response
        if (patchResponse.ok) {
          setDialogTitle("Success!");
          setDialogDescription(`Status updated.`);
          setDialogVariant("success");
        } else {
          if (patchResponse.status === 401) {
            handleExpiredToken();
            return; // Exit function after handling expired token
          } else {
            const errorData = await patchResponse.json();
            setDialogTitle(errorData.status || "Error");
            setDialogDescription(errorData.message || "Something went wrong.");
            setDialogVariant("error");
          }
        }
      } catch (error) {
        setDialogTitle("Error");
        setDialogDescription("Error while connecting to the API.");
        setDialogVariant("error");
        console.error("Error while connecting to the API", error);
      } finally {
        setLoading(false);
      }
      setDialogOpen(true);
    }
  };

  const handleScan = async (result: IDetectedBarcode[]) => {
    const accessToken = await getValidAccessToken();
    if (!accessToken) {
      handleExpiredToken();
      return;
    }

    if (result && result.length > 0) {
      const rawValue = result[0]?.rawValue;

      try {
        setLoading(true);

        let communityId, eventCodeToUse, sessionCodeToUse;

        if (onlineEvent) {
          // Split the rawValue to get eventCode and sessionCode
          [eventCodeToUse, sessionCodeToUse] = rawValue.split("+");
          communityId = userData.communityId; // Assuming communityId is available in userData
        } else {
          communityId = rawValue;
          eventCodeToUse = eventCode;
          sessionCodeToUse = sessionCode;
        }

        const registrationDescriptionBase = onlineEvent ? "online" : "offline";
        const registrationDescription = irNumber
          ? `offline - ${irNumber}`
          : registrationDescriptionBase;

        // Run the POST request to register the user
        const postResponse = await fetch(
          `${API_BASE_URL}/api/v2/events/registers`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
              "X-API-Key": API_KEY || "",
            },
            body: JSON.stringify({
              communityId: communityId,
              eventCode: eventCodeToUse,
              instanceCode: sessionCodeToUse,
              isPersonalQR: true,
              name: userData.name,
              registerAt: new Date().toISOString(),
              description: irNumber
                ? registrationDescription
                : registrationDescriptionBase,
            }),
          }
        );
        // description : onlineEvent ? "online" : "offline"

        // Handle the response
        if (postResponse.ok) {
          const responseData = await postResponse.json();
          setDialogTitle("Success!");
          setDialogDescription(
            `User ${responseData.name} registered${
              irNumber ? ` for ${irNumber}` : ""
            }.`
          );
          setDialogVariant("success");
        } else {
          if (postResponse.status === 401) {
            handleExpiredToken();
            return; // Exit function after handling expired token
          } else {
            const errorData = await postResponse.json();
            setDialogTitle(errorData.status || "Error");
            setDialogDescription(errorData.message || "Something went wrong.");
            setDialogVariant("error");
          }
        }
      } catch (error) {
        setDialogTitle("Error");
        setDialogDescription("Error while connecting to the API.");
        setDialogVariant("error");
        console.error("Error while connecting to the API", error);
      } finally {
        setLoading(false);
      }
      setDialogOpen(true);
    }
  };

  return (
    <>
      <Scanner
        scanDelay={5000}
        allowMultiple={true}
        onScan={handleScan}
        paused={loading || dialogOpen} // Pause scanning when the dialog is open
      />

      <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <AlertDialogTrigger />
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle
              className={
                dialogVariant === "success" ? "text-green-500" : "text-red-500"
              }
            >
              {dialogTitle}
            </AlertDialogTitle>
            <AlertDialogDescription>{dialogDescription}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogAction onClick={() => setDialogOpen(false)}>
            OK
          </AlertDialogAction>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default QrCodeScanner;
