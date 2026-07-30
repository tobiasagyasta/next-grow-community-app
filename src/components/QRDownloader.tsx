"use client";

import React from "react";
import QRCode from "qrcode";
import { Button } from "./ui/button";

type QRDownloaderProps = {
  /** The text or URL to encode as a QR code */
  text: string;
  /** Optional title displayed above the QR in the exported image */
  title?: string;
  /** Optional subheading displayed below the title */
  subheading?: string;
  /** Optional subheading displayed below the title */
  filename?: string;
};

function QRDownloader({
  text,
  title,
  subheading,
  filename,
}: QRDownloaderProps) {
  const handleDownload = async () => {
    // Build a higher-res QR offscreen.
    const qrCanvas = document.createElement("canvas");
    await QRCode.toCanvas(qrCanvas, text, {
      errorCorrectionLevel: "M",
      margin: 3,
      scale: 12,
      width: 900,
      color: {
        dark: "#3c3463",
        light: "#ffffff",
      },
    });

    // Compose heading/subheading + QR into a single image for download.
    const padding = 32;
    const titleLineHeight = title ? 36 : 0;
    const subLineHeight = subheading ? 32 : 0;
    const textSpacing = title && subheading ? 10 : 0;
    const textBlockHeight = titleLineHeight + subLineHeight + textSpacing;

    const outputCanvas = document.createElement("canvas");
    outputCanvas.width = qrCanvas.width + padding * 2;
    outputCanvas.height = qrCanvas.height + textBlockHeight + padding * 2;

    const ctx = outputCanvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, outputCanvas.width, outputCanvas.height);

    const centerX = outputCanvas.width / 2;
    let currentY = padding;

    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillStyle = "#000000";

    if (title) {
      ctx.font = "bold 32px 'Inter', Arial, sans-serif";
      ctx.fillText(title, centerX, currentY);
      currentY += titleLineHeight;
    }

    if (title && subheading) {
      currentY += textSpacing;
    }

    if (subheading) {
      ctx.font = "26px 'Inter', Arial, sans-serif";
      ctx.fillText(subheading, centerX, currentY);
      currentY += subLineHeight;
    }

    currentY += padding / 2;

    ctx.drawImage(
      qrCanvas,
      (outputCanvas.width - qrCanvas.width) / 2,
      currentY
    );

    const dataURL = outputCanvas.toDataURL("image/png");

    const link = document.createElement("a");
    link.href = dataURL;
    link.download = filename ? `${filename}.png` : `qr-${Date.now()}.png`;
    link.click();
  };

  return (
    <div className="flex flex-col gap-4">
      <Button
        type="button"
        onClick={handleDownload}
        className="px-4 py-2 text-white font-semibold"
      >
        Download QR
      </Button>
    </div>
  );
}

export default QRDownloader;
