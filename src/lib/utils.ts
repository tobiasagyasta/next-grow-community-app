import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const userRolesDataset = [
  {
    id: 1,
    type: "volunteer",
    roles: [
      "event-volunteer-register",
      "event-volunteer-view",
      "event-user-register",
      "event-user-view",
    ],
  },
  {
    id: 2,
    type: "user",
    roles: ["event-user-register", "event-user-view"],
  },
  {
    id: 3,
    type: "admin",
    roles: [
      "event-user-register",
      "event-user-view",
      "event-volunteer-view",
      "event-volunteer-register",
      "event-internal-view",
      "event-internal-edit",
      "event-internal-create",
      "user-dashboard-view",
      "user-dashboard-edit",
    ],
  },
  {
    id: 4,
    type: "usher",
    roles: [
      "event-user-register",
      "event-user-view",
      "event-volunteer-view",
      "event-volunteer-register",
      "event-internal-view",
      "event-internal-edit",
    ],
  },
];

export const hasType = (userData: any, type: string) => {
  const roleSet = new Set(userData?.roles || []);
  const requiredRoles =
    userRolesDataset.find((role) => role.type === type)?.roles || [];
  return requiredRoles.every((role) => roleSet.has(role));
};

// Utility to check token expiration
export const isTokenExpired = (token: string): boolean => {
  try {
    const decodedToken = JSON.parse(atob(token.split(".")[1])); // Decoding JWT payload
    const expirationTime = decodedToken.exp * 1000; // `exp` is usually in seconds, convert to milliseconds
    return Date.now() >= expirationTime;
  } catch (error) {
    return true; // Return expired if token is invalid
  }
};

export const formatDate = (date: Date): string => {
  // Format the date with weekday, day, month, and year
  const dateOptions: Intl.DateTimeFormatOptions = {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  };

  // Format the time with hours, minutes, and AM/PM
  const timeOptions: Intl.DateTimeFormatOptions = {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true, // 12-hour format with AM/PM
  };

  // Format the date and time
  const formattedDate = new Intl.DateTimeFormat("en-GB", dateOptions).format(
    date
  );
  const formattedTime = new Intl.DateTimeFormat("en-GB", timeOptions).format(
    date
  );

  // Manually insert the comma after the weekday
  const dateParts = formattedDate.split(" ");
  // Reconstruct date with comma
  const formattedDateWithComma = `${dateParts[0]} ${dateParts
    .slice(1)
    .join(" ")}`;

  // Combine formatted date and time
  return `${formattedDateWithComma}, ${formattedTime}`;
};
