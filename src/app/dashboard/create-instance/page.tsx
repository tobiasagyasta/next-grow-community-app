"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import HeaderNav from "@/components/HeaderNav";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { API_BASE_URL, API_KEY } from "@/lib/config";
import { useAuth } from "@/components/providers/AuthProvider";

type EventInstancePayload = {
  checkType: string;
  eventCode: string;
  description: string;
  instanceEndAt: string;
  instanceStartAt: string;
  isOnePerAccount: boolean;
  isOnePerTicket: boolean;
  registerFlow: string;
  locationName: string;
  locationType: string;
  maxPerTransaction: number;
  registerEndAt: string;
  registerStartAt: string;
  disallowVerifyAt: string;
  allowVerifyAt: string;
  title: string;
  totalSeats: number;
  isUpdateEventTime: boolean;
};

const instanceSchema = z.object({
  eventCode: z.string().min(1, "Please select an event"),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional().default(""),
  checkType: z.string().min(1, "Check type is required"),
  registerFlow: z.string().min(1, "Register flow is required"),
  isOnePerAccount: z.boolean().default(false),
  isOnePerTicket: z.boolean().default(false),
  locationType: z.string().min(1, "Location type is required"),
  locationName: z.string().min(1, "Location name is required"),
  totalSeats: z.coerce.number().int().min(0, "Total seats must be 0 or more"),
  maxPerTransaction: z.coerce
    .number()
    .int()
    .min(1, "Max per transaction must be at least 1"),
  instanceStartAt: z.string().min(1, "Start time is required"),
  instanceEndAt: z.string().min(1, "End time is required"),
  registerStartAt: z.string().min(1, "Registration start is required"),
  registerEndAt: z.string().min(1, "Registration end is required"),
  allowVerifyAt: z.string().min(1, "Allow verify time is required"),
  disallowVerifyAt: z.string().min(1, "Disallow verify time is required"),
  isUpdateEventTime: z.boolean().default(true),
});

type InstanceFormValues = z.infer<typeof instanceSchema>;

const formatLocalInput = (date: Date) => {
  const offsetDate = new Date(
    date.getTime() - date.getTimezoneOffset() * 60000
  );
  return offsetDate.toISOString().slice(0, 16);
};

const toIso = (value: string) => {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
};

export default function EventInstanceCreatePage() {
  const { toast } = useToast();
  const router = useRouter();
  const { getValidAccessToken, handleExpiredToken } = useAuth();
  const formRef = useRef<HTMLFormElement | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [events, setEvents] = useState<{ code: string; title: string }[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const formId = "create-instance-form";

  const defaultValues = useMemo<InstanceFormValues>(() => {
    const now = new Date();
    const inOneHour = new Date(now.getTime() + 60 * 60 * 1000);
    const inNinety = new Date(now.getTime() + 90 * 60 * 1000);
    return {
      eventCode: "",
      title: "",
      description: "",
      checkType: "check-in",
      registerFlow: "both-qr",
      isOnePerAccount: false,
      isOnePerTicket: false,
      locationType: "onsite",
      locationName: "",
      totalSeats: 0,
      maxPerTransaction: 1,
      instanceStartAt: formatLocalInput(now),
      instanceEndAt: formatLocalInput(inOneHour),
      registerStartAt: formatLocalInput(now),
      registerEndAt: formatLocalInput(inNinety),
      allowVerifyAt: formatLocalInput(now),
      disallowVerifyAt: formatLocalInput(inNinety),
      isUpdateEventTime: true,
    };
  }, []);

  const form = useForm<InstanceFormValues>({
    resolver: zodResolver(instanceSchema),
    defaultValues,
  });

  useEffect(() => {
    let ignore = false;
    (async () => {
      setLoadingEvents(true);
      try {
        const accessToken = await getValidAccessToken();
        if (!accessToken) {
          handleExpiredToken();
          return;
        }

        const response = await fetch(`${API_BASE_URL}/api/v2/internal/events`, {
          headers: {
            "Content-Type": "application/json",
            "X-API-Key": API_KEY || "",
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (!response.ok) {
          throw new Error("Failed to load events.");
        }

        const data = await response.json();
        const items: { code: string; title: string }[] = Array.isArray(
          data?.data
        )
          ? data.data
              .map((item: { code?: string; title?: string }) => ({
                code: item?.code ?? "",
                title: item?.title ?? "",
              }))
              .filter(
                (item: { code: string; title: string }) =>
                  item.code && item.title
              )
          : [];
        if (!ignore) {
          setEvents(items);
        }
      } catch (error) {
        console.error("Failed to fetch events:", error);
        if (!ignore) {
          toast({
            variant: "destructive",
            title: "Unable to load events",
            description:
              error instanceof Error ? error.message : "Failed to load events.",
          });
        }
      } finally {
        if (!ignore) {
          setLoadingEvents(false);
        }
      }
    })();

    return () => {
      ignore = true;
    };
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;

    const formElement = formRef.current;
    if (!formElement) {
      toast({
        variant: "destructive",
        title: "Unable to create instance",
        description: "Form is not ready. Please refresh and try again.",
      });
      return;
    }

    const isValid = await form.trigger();
    if (!isValid) {
      if (!form.getValues("eventCode")) {
        toast({
          variant: "destructive",
          title: "No event selected",
          description: "Please select an event before creating an instance.",
        });
      }
      return;
    }

    setSubmitting(true);

    try {
      const accessToken = await getValidAccessToken();
      if (!accessToken) {
        handleExpiredToken();
        return;
      }

      const values = form.getValues();

      const payload: EventInstancePayload = {
        checkType: values.checkType,
        eventCode: values.eventCode,
        description: values.description ?? "",
        instanceStartAt: toIso(values.instanceStartAt),
        instanceEndAt: toIso(values.instanceEndAt),
        registerStartAt: toIso(values.registerStartAt),
        registerEndAt: toIso(values.registerEndAt),
        allowVerifyAt: toIso(values.allowVerifyAt),
        disallowVerifyAt: toIso(values.disallowVerifyAt),
        isOnePerAccount: values.isOnePerAccount ?? false,
        isOnePerTicket: values.isOnePerTicket ?? false,
        registerFlow: values.registerFlow,
        locationName: values.locationName,
        locationType: values.locationType,
      maxPerTransaction: Number(values.maxPerTransaction || 0),
      totalSeats: Number(values.totalSeats || 0),
      title: values.title,
      isUpdateEventTime: values.isUpdateEventTime ?? true,
    };

      const response = await fetch(
        `${API_BASE_URL}/api/v2/internal/events/instances`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-API-Key": API_KEY || "",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        let message = "Failed to create instance.";
        try {
          const error = await response.json();
          if (error?.message) {
            message = error.message;
          }
        } catch (error) {
          console.error("Failed to parse error response:", error);
        }

        toast({
          variant: "destructive",
          title: "Unable to create instance",
          description: message,
        });
        return;
      }

      toast({
        className:
          "bg-green-500 text-white border-green-500 hover:bg-green-600",
        title: "Instance created",
        description: "The event instance has been created successfully.",
      });
      router.push("/dashboard");
    } catch (error) {
      console.error("Failed to create instance:", error);
      toast({
        variant: "destructive",
        title: "Unable to create instance",
        description:
          error instanceof Error ? error.message : "Unexpected error.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    form.reset(defaultValues);
    form.clearErrors();
  };

  return (
    <>
      <HeaderNav name="Create Instance" link="dashboard" />
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-4 md:p-6">
        <Card>
          <CardHeader>
            <CardTitle>Create Event Instance</CardTitle>
            <CardDescription>
              Attach a new instance to an existing event.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form
                id={formId}
                ref={formRef}
                onSubmit={handleSubmit}
                className="space-y-6"
              >
                <FormField
                  control={form.control}
                  name="eventCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Event</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue
                              placeholder={
                                loadingEvents
                                  ? "Loading events..."
                                  : "Select an event"
                              }
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {events.length === 0 && !loadingEvents ? (
                            <div className="px-3 py-2 text-sm text-muted-foreground">
                              No events available
                            </div>
                          ) : (
                            events.map((event) => (
                              <SelectItem key={event.code} value={event.code}>
                                {event.title} ({event.code})
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter title here" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Details for this instance"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="checkType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Check type</FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select check type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="check-in">Check-in</SelectItem>
                            <SelectItem value="check-out">Check-out</SelectItem>
                            <SelectItem value="both">Both</SelectItem>
                            <SelectItem value="none">None</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="registerFlow"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Register flow</FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select register flow" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="both-qr">Both QR</SelectItem>
                            <SelectItem value="personal-qr">
                              Personal QR
                            </SelectItem>
                            <SelectItem value="event-qr">Event QR</SelectItem>
                            <SelectItem value="none">None</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="isOnePerAccount"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border border-input p-3">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">
                            One per account
                          </FormLabel>
                          <p className="text-sm text-muted-foreground">
                            Limit registrations to one per account.
                          </p>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="isOnePerTicket"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border border-input p-3">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">
                            One per ticket
                          </FormLabel>
                          <p className="text-sm text-muted-foreground">
                            Lock each ticket to a single use.
                          </p>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="locationType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location type</FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select location type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="onsite">Onsite</SelectItem>
                            <SelectItem value="online">Online</SelectItem>
                            <SelectItem value="hybrid">Hybrid</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="locationName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter location here" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="totalSeats"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Total seats</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={0}
                            {...field}
                            onChange={(event) =>
                              field.onChange(Number(event.target.value))
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="maxPerTransaction"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Max per transaction</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={1}
                            {...field}
                            onChange={(event) =>
                              field.onChange(Number(event.target.value))
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="instanceStartAt"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Instance start</FormLabel>
                        <FormControl>
                          <Input type="datetime-local" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="instanceEndAt"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Instance end</FormLabel>
                        <FormControl>
                          <Input type="datetime-local" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="registerStartAt"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Registration opens</FormLabel>
                        <FormControl>
                          <Input type="datetime-local" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="registerEndAt"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Registration closes</FormLabel>
                        <FormControl>
                          <Input type="datetime-local" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="allowVerifyAt"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Allow verify at</FormLabel>
                        <FormControl>
                          <Input type="datetime-local" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                <FormField
                  control={form.control}
                  name="disallowVerifyAt"
                  render={({ field }) => (
                    <FormItem>
                        <FormLabel>Disallow verify at</FormLabel>
                        <FormControl>
                          <Input type="datetime-local" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="isUpdateEventTime"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border border-input p-3">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">
                          Update event time
                        </FormLabel>
                        <p className="text-sm text-muted-foreground">
                          Also update the parent event schedule with these times.
                        </p>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </form>
            </Form>
          </CardContent>
          <CardFooter className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Button
              type="reset"
              form={formId}
              variant="ghost"
              className="w-full sm:w-auto"
              onClick={handleReset}
              disabled={submitting}
            >
              Reset
            </Button>
            <Button
              type="submit"
              form={formId}
              disabled={submitting}
              className="w-full sm:w-auto"
            >
              {submitting ? "Creating..." : "Create Instance"}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </>
  );
}
