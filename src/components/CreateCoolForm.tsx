"use client";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { FormEvent, useEffect, useRef, useState } from "react";
import { UserMultiSelectCombobox } from "./UserMultiSelectCombobox";
import SearchUserDialog from "./SearchUser";
import withAuth from "@/components/providers/AuthWrapper";
import { useAuth } from "@/components/providers/AuthProvider";
import { useRouter } from "next/navigation";
import SearchUserTagsInput, { UserLite } from "./SearchUserTagsInput";
import { API_BASE_URL, API_KEY } from "@/lib/config";
import { useToast } from "@/components/ui/use-toast";

type City = { code: string; name: string };
type District = { code: string; name: string };

export default function CreateCoolForm() {
  const [facilitatorCommunityIds, setFacilitatorCommunityIds] = useState<
    UserLite[]
  >([]);
  const [leaderCommunityIds, setLeaderCommunityIds] = useState<UserLite[]>([]);
  const [coreCommunityIds, setCoreCommunityIds] = useState<UserLite[]>([]);
  const { handleExpiredToken, getValidAccessToken } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const formSchema = z.object({
    "text-input-coolname": z
      .string()
      .min(1, { message: "This field is required" }),
    "text-input-cooldesc": z.string(),
    "select-area": z.string().min(1, { message: "This field is required" }),
    "select-locationtype": z
      .string()
      .min(1, { message: "This field is required" }),
    "select-category": z.string().min(1, { message: "This field is required" }),
    "select-gender": z.string(),
    "checkbox-recurrence": z.boolean().default(false).optional(),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      "text-input-coolname": "",
      "text-input-cooldesc": "",
      "select-area": "",
      "select-locationtype": "onsite",
      "select-category": "",
      "select-gender": "all",

      "checkbox-recurrence": false,
    },
  });

  const [locationType, setLocationType] = useState<string>("onsite");
  const [cities, setCities] = useState<City[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [selectedCityCode, setSelectedCityCode] = useState<string>("");
  const [selectedDistrictCode, setSelectedDistrictCode] = useState<string>("");

  const [loadingCities, setLoadingCities] = useState(false);
  const [loadingDistricts, setLoadingDistricts] = useState(false);
  const [citiesError, setCitiesError] = useState<string | null>(null);
  const [districtsError, setDistrictsError] = useState<string | null>(null);

  const normalizeCode = (s: string) => s.replace(/\D/g, "");

  const selectedCampus = form.watch("select-area");

  useEffect(() => {
    if (!selectedCampus) {
      setCities([]);
      setSelectedCityCode("");
      setSelectedDistrictCode("");
      setDistricts([]);
      setCitiesError(null);
      setDistrictsError(null);
      setLoadingCities(false);
      setLoadingDistricts(false);
      return;
    }

    let ignore = false;
    const areaCode = selectedCampus.toLowerCase();

    (async () => {
      setLoadingCities(true);
      setCities([]);
      setCitiesError(null);
      setSelectedCityCode("");
      setSelectedDistrictCode("");
      setDistricts([]);
      setDistrictsError(null);
      try {
        const accessToken = await getValidAccessToken();
        if (!accessToken) {
          handleExpiredToken();
          return;
        }

        const response = await fetch(
          `${API_BASE_URL}/api/v2/locations/${areaCode}/cities`,
          {
            headers: {
              "Content-Type": "application/json",
              "X-API-Key": API_KEY || "",
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error("Failed to load cities.");
        }

        const json = await response.json();
        const items: City[] = Array.isArray(json?.data)
          ? json.data
              .map((item: { code?: string; name?: string }) => ({
                code: item?.code ?? "",
                name: item?.name ?? "",
              }))
              .filter((item: City) => item.code && item.name)
          : [];

        if (!ignore) {
          setCities(items);
        }
      } catch (error) {
        if (!ignore) {
          setCities([]);
          setCitiesError(
            error instanceof Error ? error.message : "Failed to load cities."
          );
        }
      } finally {
        if (!ignore) {
          setLoadingCities(false);
        }
      }
    })();

    return () => {
      ignore = true;
    };
  }, [getValidAccessToken, handleExpiredToken, selectedCampus]);

  useEffect(() => {
    if (!selectedCityCode) {
      setDistricts([]);
      setSelectedDistrictCode("");
      setDistrictsError(null);
      setLoadingDistricts(false);
      return;
    }

    let ignore = false;
    (async () => {
      setLoadingDistricts(true);
      setDistricts([]);
      setDistrictsError(null);
      try {
        const accessToken = await getValidAccessToken();
        if (!accessToken) {
          handleExpiredToken();
          return;
        }

        const response = await fetch(
          `${API_BASE_URL}/api/v2/locations/${selectedCityCode}/districts`,
          {
            headers: {
              "Content-Type": "application/json",
              "X-API-Key": API_KEY || "",
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error("Failed to load districts.");
        }

        const json = await response.json();
        const items: District[] = Array.isArray(json?.data)
          ? json.data
              .map((item: { code?: string; name?: string }) => ({
                code: item?.code ?? "",
                name: item?.name ?? "",
              }))
              .filter((item: District) => item.code && item.name)
          : [];

        if (!ignore) {
          setDistricts(items);
        }
      } catch (error) {
        if (!ignore) {
          setDistricts([]);
          setDistrictsError(
            error instanceof Error ? error.message : "Failed to load districts."
          );
        }
      } finally {
        if (!ignore) {
          setLoadingDistricts(false);
        }
      }
    })();

    return () => {
      ignore = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getValidAccessToken, handleExpiredToken, selectedCityCode]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;

    const formElement = formRef.current;
    if (!formElement) {
      toast({
        variant: "destructive",
        title: "Unable to create COOL",
        description: "Form is not ready. Please refresh and try again.",
      });
      return;
    }

    const isValid = await form.trigger();
    if (!isValid) return;
    if (!selectedCityCode || !selectedDistrictCode) {
      toast({
        variant: "destructive",
        title: "Incomplete location",
        description: "Please select both city and district.",
      });
      return;
    }

    setSubmitting(true);

    try {
      const accessToken = await getValidAccessToken();
      if (!accessToken) {
        handleExpiredToken();
        return;
      }

      const formData = new FormData(formElement);
      const getValue = (key: string, fallback: string) =>
        formData.get(key)?.toString() ?? fallback;

      const payload = {
        name: getValue(
          "name",
          form.getValues("text-input-coolname")?.toString() ?? ""
        ),
        description: getValue(
          "description",
          form.getValues("text-input-cooldesc")?.toString() ?? ""
        ),
        campusCode: selectedCampus ?? "",
        facilitatorCommunityIds: facilitatorCommunityIds.map((item) => item.id),
        leaderCommunityIds: leaderCommunityIds.map((item) => item.id),
        coreCommunityIds: coreCommunityIds.map((item) => item.id),
        category: getValue(
          "category",
          form.getValues("select-category")?.toString() ?? ""
        ),
        gender: getValue(
          "gender",
          form.getValues("select-gender")?.toString() ?? "all"
        ),
        recurrence: getValue(
          "recurrence",
          form.getValues("checkbox-recurrence") ? "weekly" : "one-time"
        ),
        location: {
          type: locationType,
          areaCode: normalizeCode(selectedCityCode),
          districtCode: normalizeCode(selectedDistrictCode),
        },
      };

      const response = await fetch(`${API_BASE_URL}/api/v2/internal/cools`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": API_KEY || "",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        let message = "Failed to create COOL.";
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
          title: "Unable to create COOL",
          description: message,
        });
        return;
      }

      toast({
        className:
          "bg-green-500 text-white border-green-500 hover:bg-green-600",
        title: "Cool created",
        description: "The COOL has been created successfully.",
      });
      router.push("/dashboard/cools");
    } catch (error) {
      console.error("Failed to create COOL:", error);
      toast({
        variant: "destructive",
        title: "Unable to create COOL",
        description:
          error instanceof Error ? error.message : "Unexpected error.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  function onReset() {
    form.reset();
    form.clearErrors();
    setFacilitatorCommunityIds([]);
    setLeaderCommunityIds([]);
    setCoreCommunityIds([]);
    setLocationType("onsite");
    setSelectedCityCode("");
    setSelectedDistrictCode("");
    setDistricts([]);
    setCitiesError(null);
    setDistrictsError(null);
    setLoadingCities(false);
    setLoadingDistricts(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-8 px-2">
      <div className="w-full max-w-3xl bg-white rounded-xl shadow-lg p-6 sm:p-10">
        <h2 className="text-2xl font-bold text-center mb-8">Create New COOL</h2>
        <Form {...form}>
          <form
            ref={formRef}
            onSubmit={handleSubmit}
            onReset={onReset}
            className="space-y-8"
          >
            <div className="grid grid-cols-12 gap-6">
              <FormField
                control={form.control}
                name="text-input-coolname"
                render={({ field }) => (
                  <FormItem className="col-span-12 col-start-auto flex self-end flex-col gap-2 space-y-0 items-start">
                    <FormLabel className="flex @5xl:flex shrink-0">
                      Cool Name
                    </FormLabel>

                    <div className="w-full">
                      <FormControl>
                        <div className="relative w-full">
                          <Input
                            key="text-input-coolname"
                            placeholder=""
                            type="text"
                            id="text-input-coolname"
                            className=" "
                            {...field}
                          />
                        </div>
                      </FormControl>

                      <FormMessage />
                    </div>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="text-input-cooldesc"
                render={({ field }) => (
                  <FormItem className="col-span-12 @5xl:col-span-12 col-start-auto flex self-end flex-col gap-2 space-y-0 items-start">
                    <FormLabel className="flex @5xl:flex shrink-0">
                      Cool Description
                    </FormLabel>

                    <div className="w-full">
                      <FormControl>
                        <div className="relative w-full">
                          <Input
                            key="text-input-cooldesc"
                            placeholder=""
                            type="text"
                            id="text-input-cooldesc"
                            className=" "
                            {...field}
                          />
                        </div>
                      </FormControl>

                      <FormMessage />
                    </div>
                  </FormItem>
                )}
              />
              {/* Area, City, District, Location Type */}
              <div className="col-span-12 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="w-full">
                  <FormField
                    control={form.control}
                    name="select-area"
                    render={({ field }) => (
                      <FormItem className="flex flex-col gap-2 items-start">
                        <FormLabel>Area</FormLabel>
                        <div className="w-full">
                          <FormControl>
                            <Select
                              key="select-area"
                              value={field.value || undefined}
                              onValueChange={(value) => {
                                setCities([]);
                                setDistricts([]);
                                setSelectedCityCode("");
                                setSelectedDistrictCode("");
                                setCitiesError(null);
                                setDistrictsError(null);
                                setLoadingCities(false);
                                setLoadingDistricts(false);
                                field.onChange(value);
                              }}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select campus" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem key="JKT" value="JKT">
                                  Jakarta
                                </SelectItem>
                                <SelectItem key="BKS" value="BKS">
                                  Bekasi
                                </SelectItem>
                                <SelectItem key="MDO" value="MDO">
                                  Manado
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </div>
                      </FormItem>
                    )}
                  />
                </div>
                <div className="w-full">
                  <div className="flex flex-col gap-2 items-start">
                    <FormLabel>City</FormLabel>
                    <div className="w-full">
                      <Select
                        value={selectedCityCode}
                        onValueChange={(value) => {
                          setSelectedCityCode(value);
                          setSelectedDistrictCode("");
                        }}
                        disabled={!selectedCampus}
                      >
                        <SelectTrigger
                          className="w-full mt-2"
                          disabled={!selectedCampus}
                        >
                          <SelectValue
                            placeholder={
                              !selectedCampus
                                ? "Select area first"
                                : loadingCities
                                ? "Loading cities..."
                                : "Select city"
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {loadingCities && (
                            <div className="px-3 py-2 text-sm text-muted-foreground">
                              Loading...
                            </div>
                          )}
                          {citiesError && (
                            <div className="px-3 py-2 text-sm text-destructive">
                              {citiesError}
                            </div>
                          )}
                          {!loadingCities &&
                            !citiesError &&
                            cities.length === 0 && (
                              <div className="px-3 py-2 text-sm text-muted-foreground">
                                No cities available.
                              </div>
                            )}
                          {cities.map((city) => (
                            <SelectItem key={city.code} value={city.code}>
                              {city.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {citiesError && (
                        <p className="mt-2 text-sm text-destructive">
                          {citiesError}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="w-full">
                  <div className="flex flex-col gap-2 items-start">
                    <FormLabel>District</FormLabel>
                    <div className="w-full">
                      <Select
                        value={selectedDistrictCode}
                        onValueChange={(value) =>
                          setSelectedDistrictCode(value)
                        }
                        disabled={!selectedCityCode}
                      >
                        <SelectTrigger className="w-full mt-2">
                          <SelectValue
                            placeholder={
                              !selectedCityCode
                                ? "Select city first"
                                : loadingDistricts
                                ? "Loading districts..."
                                : "Select district"
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {loadingDistricts && (
                            <div className="px-3 py-2 text-sm text-muted-foreground">
                              Loading...
                            </div>
                          )}
                          {districtsError && (
                            <div className="px-3 py-2 text-sm text-destructive">
                              {districtsError}
                            </div>
                          )}
                          {!loadingDistricts &&
                            !districtsError &&
                            selectedCityCode &&
                            districts.length === 0 && (
                              <div className="px-3 py-2 text-sm text-muted-foreground">
                                No districts available.
                              </div>
                            )}
                          {districts.map((district) => (
                            <SelectItem
                              key={district.code}
                              value={district.code}
                            >
                              {district.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {districtsError && (
                        <p className="mt-2 text-sm text-destructive">
                          {districtsError}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="w-full">
                  <FormField
                    control={form.control}
                    name="select-locationtype"
                    render={({ field }) => (
                      <FormItem className="flex flex-col gap-2 items-start">
                        <FormLabel>Location Type</FormLabel>
                        <div className="w-full">
                          <FormControl>
                            <Select
                              key="select-locationtype"
                              value={locationType}
                              onValueChange={(value) => {
                                setLocationType(value);
                                field.onChange(value);
                              }}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select location type" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem key="online" value="online">
                                  Online
                                </SelectItem>
                                <SelectItem key="offline" value="offline">
                                  Offline
                                </SelectItem>
                                <SelectItem key="hybrid" value="hybrid">
                                  Hybrid
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </div>
                      </FormItem>
                    )}
                  />
                </div>
              </div>
              <FormField
                control={form.control}
                name="select-category"
                render={({ field }) => (
                  <FormItem className="col-span-12 @5xl:col-span-6 col-start-auto flex self-end flex-col gap-2 space-y-0 items-start">
                    <FormLabel className="flex @5xl:flex shrink-0">
                      Category
                    </FormLabel>

                    <div className="w-full">
                      <FormControl>
                        <Select
                          key="select-category"
                          {...field}
                          onValueChange={field.onChange}
                        >
                          <SelectTrigger className="w-full ">
                            <SelectValue placeholder="" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem key="general" value="General">
                              General
                            </SelectItem>

                            <SelectItem key="youth" value="Youth">
                              Youth
                            </SelectItem>

                            <SelectItem key="college" value="College">
                              College
                            </SelectItem>
                            <SelectItem key="professional" value="Professional">
                              Professional
                            </SelectItem>
                            <SelectItem key="newlywed" value="Newlywed">
                              Newlywed
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>

                      <FormMessage />
                    </div>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="select-gender"
                render={({ field }) => (
                  <FormItem className="col-span-12 @5xl:col-span-6 col-start-auto flex self-end flex-col gap-2 space-y-0 items-start">
                    <FormLabel className="flex @5xl:flex shrink-0">
                      Gender
                    </FormLabel>

                    <div className="w-full">
                      <FormControl>
                        <Select
                          key="select-gender"
                          {...field}
                          onValueChange={field.onChange}
                        >
                          <SelectTrigger className="w-full ">
                            <SelectValue placeholder="" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem key="male" value="male">
                              Male
                            </SelectItem>

                            <SelectItem key="female" value="female">
                              Female
                            </SelectItem>
                            <SelectItem key="all" value="all">
                              All
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>

                      <FormMessage />
                    </div>
                  </FormItem>
                )}
              />

              <section className="col-span-12 w-full space-y-3">
                <div>
                  <h3 className="text-lg font-semibold">Facilitators:</h3>
                  <p className="text-sm text-muted-foreground">
                    {facilitatorCommunityIds.length} selected
                  </p>
                </div>

                <SearchUserTagsInput
                  label="Facilitators"
                  value={facilitatorCommunityIds}
                  onChange={setFacilitatorCommunityIds}
                  className="w-full"
                />
                {/* <p>{JSON.stringify(facilitatorCommunityIds)}</p> */}
              </section>

              <section className="col-span-12 w-full space-y-3">
                <div>
                  <h3 className="text-lg font-semibold">Leader:</h3>
                  <p className="text-sm text-muted-foreground">
                    {leaderCommunityIds.length} selected
                  </p>
                </div>

                <SearchUserTagsInput
                  label="Leaders"
                  value={leaderCommunityIds}
                  onChange={setLeaderCommunityIds}
                  className="w-full"
                />
                {/* <p>{JSON.stringify(leaderCommunityIds)}</p> */}
              </section>

              <section className="col-span-12 w-full space-y-3">
                <div>
                  <h3 className="text-lg font-semibold">Core:</h3>
                  <p className="text-sm text-muted-foreground">
                    {coreCommunityIds.length} selected
                  </p>
                </div>

                <SearchUserTagsInput
                  label="Core"
                  value={coreCommunityIds}
                  onChange={setCoreCommunityIds}
                  className="w-full"
                />
                {/* <p>{JSON.stringify(coreCommunityIds)}</p> */}
              </section>

              <FormField
                control={form.control}
                name="checkbox-recurrence"
                render={({ field }) => (
                  <FormItem className="col-span-12 col-start-auto flex self-end flex-col gap-2 space-y-0 items-start">
                    <FormLabel className="hidden shrink-0">
                      Recurrence
                    </FormLabel>

                    <div className="w-full">
                      <FormControl>
                        <FormLabel
                          key="checkbox-recurrence"
                          className="border-0 space-x-3 w-full flex items-start has-[[data-state=checked]]:border-primary"
                          htmlFor="checkbox-recurrence"
                        >
                          <Checkbox
                            id="checkbox-recurrence"
                            className=""
                            name={field.name}
                            ref={field.ref}
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            onBlur={field.onBlur}
                            disabled={field.disabled}
                          />
                          <div className="grid gap-1.5 leading-none">
                            <FormLabel>Recurrence</FormLabel>
                            <p className="text-sm text-muted-foreground">
                              Check if COOL is weekly
                            </p>
                          </div>
                        </FormLabel>
                      </FormControl>

                      <FormMessage />
                    </div>
                  </FormItem>
                )}
              />
              {/* Remove the FormField wrapper for the submit button, as it does not need to be a form field */}
              <div className="col-span-12 @5xl:col-span-12 col-start-auto flex self-end flex-col gap-2 space-y-0 items-start">
                <FormLabel className="hidden shrink-0">Submit</FormLabel>
                <div className="w-full">
                  <Button
                    key="submit-button-0"
                    id="submit-button-0"
                    name=""
                    className="w-full"
                    type="submit"
                    variant="default"
                    disabled={submitting}
                  >
                    {submitting ? "Submitting..." : "Submit"}
                  </Button>
                </div>
              </div>
              <div className="col-span-12 @5xl:col-span-12 col-start-auto flex self-end flex-col gap-2 space-y-0 items-start">
                <FormLabel className="hidden shrink-0">Reset</FormLabel>
                <div className="w-full">
                  <Button
                    key="reset-button-0"
                    id="reset-button-0"
                    name=""
                    className="w-full"
                    type="reset"
                    variant="outline"
                  >
                    Reset
                  </Button>
                </div>
              </div>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
