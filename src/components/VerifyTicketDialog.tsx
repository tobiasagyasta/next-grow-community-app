"use client";
import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Button } from "./ui/button";
import QrCodeScanner from "./QRScanner";

const VerifyTicketDialog = ({
  eventCode,
  eventName,
  sessionCode,
  sessionName,
  onlineEvent = false,
  triggerLabel = "QR Scanner (Camera)",
  irNumber,
  disabled = false,
}: {
  eventCode: string;
  eventName: string;
  sessionCode: string;
  sessionName: string;
  onlineEvent?: boolean;
  triggerLabel?: string;
  irNumber?: string;
  disabled?: boolean;
}) => {
  return (
    <>
      <Dialog>
        <DialogTrigger asChild>
          <Button className="w-FIT h-10" disabled={disabled}>
            {triggerLabel}
          </Button>
        </DialogTrigger>
        <DialogContent className="w-full max-w-lg md:max-w-xl mx-auto my-auto flex flex-col justify-center items-center">
          <DialogHeader>
            <DialogTitle>
              Current Session: {sessionName} ({sessionCode})
            </DialogTitle>
          </DialogHeader>
          {sessionCode ? (
            <QrCodeScanner
              eventCode={eventCode}
              sessionCode={sessionCode}
              onlineEvent={onlineEvent}
              irNumber={irNumber}
            />
          ) : (
            <div className="text-red-500">Error: Please select a session.</div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default VerifyTicketDialog;
