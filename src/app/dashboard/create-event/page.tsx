"use client";

import { useFieldArray, useForm, ControllerRenderProps } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormEvent, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, X } from "lucide-react";

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
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/components/providers/AuthProvider";
import { API_BASE_URL, API_KEY } from "@/lib/config";
import HeaderNav from "@/components/HeaderNav";

type EventInstance = {
  checkType: string;
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
};

type EventPayload = {
  name: string;
  topics: string[];
  description: string;
  termsAndConditions: string;
  allowedCampuses: string[];
  allowedFor: string;
  allowedRoles: string[];
  allowedUsers: string[];
  isRecurring: boolean;
  recurrence: string | null;
  locationType: string;
  locationName: string;
  eventEndAt: string;
  eventStartAt: string;
  registerEndAt: string;
  registerStartAt: string;
  instances: EventInstance[];
};

const instanceSchema = z.object({
  title: z.string().min(1, "Title is required"),
  checkType: z.string().min(1, "Check type is required"),
  description: z.string().optional().default(""),
  locationType: z.string().min(1, "Location type is required"),
  locationName: z.string().min(1, "Location name is required"),
  totalSeats: z.coerce.number().int().min(0, "Total seats must be 0 or more"),
  maxPerTransaction: z.coerce
    .number()
    .int()
    .min(1, "Max per transaction must be at least 1"),
  isOnePerAccount: z.boolean(),
  isOnePerTicket: z.boolean(),
  registerFlow: z.string().min(1, "Register flow is required"),
  instanceStartAt: z.string().min(1, "Start time is required"),
  instanceEndAt: z.string().min(1, "End time is required"),
  allowVerifyAt: z.string().min(1, "Allow verify time is required"),
  disallowVerifyAt: z.string().min(1, "Disallow verify time is required"),
  registerStartAt: z.string().min(1, "Register start is required"),
  registerEndAt: z.string().min(1, "Register end is required"),
});

const eventSchema = z
  .object({
    name: z.string().min(1, "Event name is required"),
    topics: z.array(z.string()).default([]),
    description: z.string().optional().default(""),
    termsAndConditions: z.string().optional().default(""),
    allowedCampuses: z.array(z.string()).default([]),
    allowedFor: z.string().min(1, "Visibility is required"),
    allowedRoles: z.array(z.string()).default([]),
    allowedUsers: z.array(z.string()).default([]),
    isRecurring: z.boolean(),
    recurrence: z.string().nullable(),
    locationType: z.string().min(1, "Location type is required"),
    locationName: z.string().min(1, "Location name is required"),
    eventEndAt: z.string().min(1, "Event end time is required"),
    eventStartAt: z.string().min(1, "Event start time is required"),
    registerEndAt: z.string().min(1, "Registration end time is required"),
    registerStartAt: z.string().min(1, "Registration start time is required"),
    instances: z.array(instanceSchema).min(1, "At least one instance"),
  })
  .superRefine((values, ctx) => {
    if (values.isRecurring && !values.recurrence) {
      ctx.addIssue({
        path: ["recurrence"],
        code: z.ZodIssueCode.custom,
        message: "Recurrence is required for recurring events.",
      });
    }

    const compareDates = (
      start: string,
      end: string,
      startPath: (string | number)[],
      endPath: (string | number)[],
      message: string
    ) => {
      const startDate = Date.parse(start);
      const endDate = Date.parse(end);
      if (
        !Number.isNaN(startDate) &&
        !Number.isNaN(endDate) &&
        endDate < startDate
      ) {
        ctx.addIssue({
          path: endPath,
          code: z.ZodIssueCode.custom,
          message,
        });
      }
    };

    compareDates(
      values.eventStartAt,
      values.eventEndAt,
      ["eventStartAt"],
      ["eventEndAt"],
      "Event end must be after start."
    );

    compareDates(
      values.registerStartAt,
      values.registerEndAt,
      ["registerStartAt"],
      ["registerEndAt"],
      "Registration end must be after start."
    );

    values.instances.forEach((instance, index) => {
      compareDates(
        instance.instanceStartAt,
        instance.instanceEndAt,
        ["instances", index, "instanceStartAt"],
        ["instances", index, "instanceEndAt"],
        "Instance end must be after start."
      );
      compareDates(
        instance.registerStartAt,
        instance.registerEndAt,
        ["instances", index, "registerStartAt"],
        ["instances", index, "registerEndAt"],
        "Instance registration end must be after start."
      );
    });
  });

type EventFormValues = z.infer<typeof eventSchema>;

const formatLocalInput = (date: Date) => {
  const offsetDate = new Date(
    date.getTime() - date.getTimezoneOffset() * 60000
  );
  return offsetDate.toISOString().slice(0, 16);
};

const createDefaultInstance = (label?: string) => {
  const now = new Date();
  const inOneHour = new Date(now.getTime() + 60 * 60 * 1000);
  return {
    title: label ?? "Instance",
    checkType: "check-in",
    description: "",
    locationType: "onsite",
    locationName: "",
    totalSeats: 100,
    maxPerTransaction: 1,
    isOnePerAccount: false,
    isOnePerTicket: false,
    registerFlow: "both-qr",
    instanceStartAt: formatLocalInput(now),
    instanceEndAt: formatLocalInput(inOneHour),
    allowVerifyAt: formatLocalInput(now),
    disallowVerifyAt: formatLocalInput(inOneHour),
    registerStartAt: formatLocalInput(now),
    registerEndAt: formatLocalInput(inOneHour),
  };
};

const toIsoString = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? new Date().toISOString()
    : date.toISOString();
};

const chipInput = (
  label: string,
  placeholder: string,
  field: ControllerRenderProps<EventFormValues, any>,
  inputValue: string,
  setInputValue: (value: string) => void
) => {
  const current = field.value ?? [];

  return (
    <FormItem className="space-y-2">
      <FormLabel>{label}</FormLabel>
      <div className="flex flex-wrap gap-2">
        {current.length === 0 && (
          <span className="text-sm text-muted-foreground">No items added.</span>
        )}
        {current.map((item: string) => (
          <Badge key={`${label}-${item}`} variant="secondary" className="gap-1">
            {item}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 px-1"
              onClick={() =>
                field.onChange(
                  current.filter((value: string) => value !== item)
                )
              }
            >
              <X className="h-3 w-3" />
            </Button>
          </Badge>
        ))}
      </div>
      <div className="flex gap-2">
        <FormControl>
          <Input
            value={inputValue}
            placeholder={placeholder}
            onChange={(event) => setInputValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                const value = inputValue.trim();
                if (value && !current.includes(value)) {
                  field.onChange([...current, value]);
                  setInputValue("");
                }
              }
            }}
          />
        </FormControl>
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            const value = inputValue.trim();
            if (value && !current.includes(value)) {
              field.onChange([...current, value]);
              setInputValue("");
            }
          }}
        >
          Add
        </Button>
      </div>
      <FormMessage />
    </FormItem>
  );
};

export default function EventCreatePage() {
  const { toast } = useToast();
  const router = useRouter();
  const { getValidAccessToken, handleExpiredToken } = useAuth();
  const formRef = useRef<HTMLFormElement>(null);
  const [submitting, setSubmitting] = useState(false);

  const initialValues = useMemo<EventFormValues>(() => {
    const now = new Date();
    const inTwoHours = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    const defaultInstance = createDefaultInstance("Instance 1");
    return {
      name: "",
      topics: [],
      description: "",
      termsAndConditions: "",
      allowedCampuses: [],
      allowedFor: "private",
      allowedRoles: [],
      allowedUsers: [],
      isRecurring: false,
      recurrence: null,
      locationType: "onsite",
      locationName: "",
      eventStartAt: formatLocalInput(now),
      eventEndAt: formatLocalInput(inTwoHours),
      registerStartAt: formatLocalInput(now),
      registerEndAt: formatLocalInput(inTwoHours),
      instances: [defaultInstance],
    };
  }, []);

  const [topicInput, setTopicInput] = useState("");
  const [campusInput, setCampusInput] = useState("");
  const [roleInput, setRoleInput] = useState("");
  const [userInput, setUserInput] = useState("");

  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventSchema),
    defaultValues: initialValues,
  });

  const {
    fields: instanceFields,
    append,
    remove,
  } = useFieldArray({
    control: form.control,
    name: "instances",
  });

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;

    const formElement = formRef.current;
    if (!formElement) {
      toast({
        variant: "destructive",
        title: "Unable to create event",
        description: "Form is not ready. Please refresh and try again.",
      });
      return;
    }

    const isValid = await form.trigger();
    if (!isValid) return;

    setSubmitting(true);

    try {
      const accessToken = await getValidAccessToken();
      if (!accessToken) {
        handleExpiredToken();
        return;
      }

      const values = form.getValues();

      const payload: EventPayload = {
        ...values,
        recurrence: values.isRecurring ? values.recurrence : null,
        eventStartAt: toIsoString(values.eventStartAt),
        eventEndAt: toIsoString(values.eventEndAt),
        registerStartAt: toIsoString(values.registerStartAt),
        registerEndAt: toIsoString(values.registerEndAt),
        instances: values.instances.map((instance) => ({
          ...instance,
          instanceStartAt: toIsoString(instance.instanceStartAt),
          instanceEndAt: toIsoString(instance.instanceEndAt),
          allowVerifyAt: toIsoString(instance.allowVerifyAt),
          disallowVerifyAt: toIsoString(instance.disallowVerifyAt),
          registerStartAt: toIsoString(instance.registerStartAt),
          registerEndAt: toIsoString(instance.registerEndAt),
        })),
      };

      const response = await fetch(`${API_BASE_URL}/api/v2/internal/events`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": API_KEY || "",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        let message = "Failed to create event.";
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
          title: "Unable to create event",
          description: message,
        });
        return;
      }

      toast({
        className:
          "bg-green-500 text-white border-green-500 hover:bg-green-600",
        title: "Event created",
        description: "The event has been created successfully.",
      });
      router.push("/dashboard");
    } catch (error) {
      console.error("Failed to create event:", error);
      toast({
        variant: "destructive",
        title: "Unable to create event",
        description:
          error instanceof Error ? error.message : "Unexpected error.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    form.reset(initialValues);
    form.clearErrors();
    setTopicInput("");
    setCampusInput("");
    setRoleInput("");
    setUserInput("");
  };

  return (
    <>
      <HeaderNav name="Create Event" link="dashboard" />

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 md:p-6">
        <Card>
          <CardHeader className="space-y-1">
            <CardTitle>Create Event</CardTitle>
            <CardDescription>
              Configure event details and instances, then submit to create the
              event.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form
                ref={formRef}
                onSubmit={handleSubmit}
                onReset={handleReset}
                className="space-y-6"
              >
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
                  <div className="space-y-6">
                    <Card className="shadow-none border">
                      <CardHeader className="pb-4">
                        <CardTitle className="text-lg">Event details</CardTitle>
                        <CardDescription>
                          Define the core information and visibility for the
                          event.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <FormField
                          control={form.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Event name</FormLabel>
                              <FormControl>
                                <Input placeholder="Pre Service" {...field} />
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
                                  placeholder="Brief description for the event"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="termsAndConditions"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Terms and conditions</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="Add any terms attendees must accept"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="topics"
                          render={({ field }) =>
                            chipInput(
                              "Topics",
                              "Add a topic then press Add",
                              field,
                              topicInput,
                              setTopicInput
                            )
                          }
                        />
                        <FormField
                          control={form.control}
                          name="allowedCampuses"
                          render={({ field }) =>
                            chipInput(
                              "Allowed campuses",
                              "e.g. JKT",
                              field,
                              campusInput,
                              setCampusInput
                            )
                          }
                        />
                        <FormField
                          control={form.control}
                          name="allowedFor"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Visible to</FormLabel>
                              <Select
                                value={field.value}
                                onValueChange={field.onChange}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select visibility" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="public">Public</SelectItem>
                                  <SelectItem value="private">
                                    Private
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="allowedRoles"
                          render={({ field }) =>
                            chipInput(
                              "Allowed roles",
                              "Add role key (e.g. event-volunteer-view)",
                              field,
                              roleInput,
                              setRoleInput
                            )
                          }
                        />
                        <FormField
                          control={form.control}
                          name="allowedUsers"
                          render={({ field }) =>
                            chipInput(
                              "Allowed users",
                              "Add username or type",
                              field,
                              userInput,
                              setUserInput
                            )
                          }
                        />
                        <div className="rounded-lg border p-4 space-y-4">
                          <div className="flex items-center justify-between">
                            <FormField
                              control={form.control}
                              name="isRecurring"
                              render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border border-input p-3 shadow-sm">
                                  <div className="space-y-0.5">
                                    <FormLabel className="text-base">
                                      Recurring event
                                    </FormLabel>
                                    <p className="text-sm text-muted-foreground">
                                      Toggle if this event repeats on a
                                      schedule.
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
                          <FormField
                            control={form.control}
                            name="recurrence"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Recurrence pattern</FormLabel>
                                <Select
                                  value={field.value ?? ""}
                                  onValueChange={field.onChange}
                                  disabled={!form.watch("isRecurring")}
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select recurrence" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="daily">Daily</SelectItem>
                                    <SelectItem value="weekly">
                                      Weekly
                                    </SelectItem>
                                    <SelectItem value="monthly">
                                      Monthly
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
                                    <SelectItem value="onsite">
                                      Onsite
                                    </SelectItem>
                                    <SelectItem value="online">
                                      Online
                                    </SelectItem>
                                    <SelectItem value="hybrid">
                                      Hybrid
                                    </SelectItem>
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
                                  <Input
                                    placeholder="Pondok Indah Office Tower 6"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                          <FormField
                            control={form.control}
                            name="eventStartAt"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Event start</FormLabel>
                                <FormControl>
                                  <Input type="datetime-local" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="eventEndAt"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Event end</FormLabel>
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
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="space-y-6">
                    <Card className="shadow-none border">
                      <CardHeader className="pb-4 flex flex-row items-center justify-between">
                        <div>
                          <CardTitle className="text-lg">Instances</CardTitle>
                          <CardDescription>
                            Add sessions or check-in blocks for this event.
                          </CardDescription>
                        </div>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() =>
                            append(
                              createDefaultInstance(
                                `Instance ${instanceFields.length + 1}`
                              )
                            )
                          }
                        >
                          <Plus className="h-4 w-4" />
                          Add Instance
                        </Button>
                      </CardHeader>
                      <CardContent>
                        <ScrollArea className="max-h-full pr-3">
                          <div className="space-y-4">
                            {instanceFields.map((field, index) => (
                              <div
                                key={field.id}
                                className="rounded-lg border bg-card p-4 shadow-sm space-y-4"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <div className="text-sm font-medium text-muted-foreground">
                                    Instance #{index + 1} —{" "}
                                    {form.watch(`instances.${index}.title`) ||
                                      `Instance ${index + 1}`}
                                  </div>
                                  {instanceFields.length > 1 && (
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => remove(index)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                      Remove
                                    </Button>
                                  )}
                                </div>
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                  <FormField
                                    control={form.control}
                                    name={`instances.${index}.title`}
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Title</FormLabel>
                                        <FormControl>
                                          <Input
                                            placeholder="IR 1"
                                            {...field}
                                          />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                  <FormField
                                    control={form.control}
                                    name={`instances.${index}.checkType`}
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
                                            <SelectItem value="check-in">
                                              Check-in
                                            </SelectItem>
                                            <SelectItem value="check-out">
                                              Check-out
                                            </SelectItem>
                                            <SelectItem value="both">
                                              Both
                                            </SelectItem>
                                            <SelectItem value="none">
                                              None
                                            </SelectItem>
                                          </SelectContent>
                                        </Select>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                </div>
                                <FormField
                                  control={form.control}
                                  name={`instances.${index}.description`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Description</FormLabel>
                                      <FormControl>
                                        <Textarea
                                          placeholder="Details about this instance"
                                          {...field}
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                  <FormField
                                    control={form.control}
                                    name={`instances.${index}.locationType`}
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
                                            <SelectItem value="onsite">
                                              Onsite
                                            </SelectItem>
                                            <SelectItem value="online">
                                              Online
                                            </SelectItem>
                                            <SelectItem value="hybrid">
                                              Hybrid
                                            </SelectItem>
                                          </SelectContent>
                                        </Select>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                  <FormField
                                    control={form.control}
                                    name={`instances.${index}.locationName`}
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Location name</FormLabel>
                                        <FormControl>
                                          <Input
                                            placeholder="PIOT 6 Lantai 3"
                                            {...field}
                                          />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                </div>
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                  <FormField
                                    control={form.control}
                                    name={`instances.${index}.totalSeats`}
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Total seats</FormLabel>
                                        <FormControl>
                                          <Input
                                            type="number"
                                            min={0}
                                            {...field}
                                            onChange={(event) =>
                                              field.onChange(
                                                Number(event.target.value)
                                              )
                                            }
                                          />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                  <FormField
                                    control={form.control}
                                    name={`instances.${index}.maxPerTransaction`}
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>
                                          Max per transaction
                                        </FormLabel>
                                        <FormControl>
                                          <Input
                                            type="number"
                                            min={1}
                                            {...field}
                                            onChange={(event) =>
                                              field.onChange(
                                                Number(event.target.value)
                                              )
                                            }
                                          />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                </div>
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                  <FormField
                                    control={form.control}
                                    name={`instances.${index}.isOnePerAccount`}
                                    render={({ field }) => (
                                      <FormItem className="flex flex-row items-center justify-between rounded-lg border border-input p-3 shadow-sm">
                                        <div className="space-y-0.5">
                                          <FormLabel className="text-base">
                                            One per account
                                          </FormLabel>
                                          <p className="text-sm text-muted-foreground">
                                            Limit each account to a single
                                            ticket.
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
                                    name={`instances.${index}.isOnePerTicket`}
                                    render={({ field }) => (
                                      <FormItem className="flex flex-row items-center justify-between rounded-lg border border-input p-3 shadow-sm">
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
                                <FormField
                                  control={form.control}
                                  name={`instances.${index}.registerFlow`}
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
                                          <SelectItem value="both-qr">
                                            Both QR
                                          </SelectItem>
                                          <SelectItem value="personal-qr">
                                            Personal QR
                                          </SelectItem>
                                          <SelectItem value="event-qr">
                                            Event QR
                                          </SelectItem>
                                          <SelectItem value="none">
                                            None
                                          </SelectItem>
                                        </SelectContent>
                                      </Select>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                  <FormField
                                    control={form.control}
                                    name={`instances.${index}.instanceStartAt`}
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Instance start</FormLabel>
                                        <FormControl>
                                          <Input
                                            type="datetime-local"
                                            {...field}
                                          />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                  <FormField
                                    control={form.control}
                                    name={`instances.${index}.instanceEndAt`}
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Instance end</FormLabel>
                                        <FormControl>
                                          <Input
                                            type="datetime-local"
                                            {...field}
                                          />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                  <FormField
                                    control={form.control}
                                    name={`instances.${index}.registerStartAt`}
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>
                                          Instance registration opens
                                        </FormLabel>
                                        <FormControl>
                                          <Input
                                            type="datetime-local"
                                            {...field}
                                          />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                  <FormField
                                    control={form.control}
                                    name={`instances.${index}.registerEndAt`}
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>
                                          Instance registration closes
                                        </FormLabel>
                                        <FormControl>
                                          <Input
                                            type="datetime-local"
                                            {...field}
                                          />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                  <FormField
                                    control={form.control}
                                    name={`instances.${index}.allowVerifyAt`}
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Allow verify at</FormLabel>
                                        <FormControl>
                                          <Input
                                            type="datetime-local"
                                            {...field}
                                          />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                  <FormField
                                    control={form.control}
                                    name={`instances.${index}.disallowVerifyAt`}
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>
                                          Disallow verify at
                                        </FormLabel>
                                        <FormControl>
                                          <Input
                                            type="datetime-local"
                                            {...field}
                                          />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      </CardContent>
                    </Card>
                  </div>
                </div>
                <CardFooter className="justify-end gap-3 pt-0">
                  <Button type="reset" variant="ghost" disabled={submitting}>
                    Reset
                  </Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting ? "Creating..." : "Create Event"}
                  </Button>
                </CardFooter>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
