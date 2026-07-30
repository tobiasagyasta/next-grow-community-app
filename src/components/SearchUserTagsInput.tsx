"use client";

import React, {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { Loader2, User, Check, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/providers/AuthProvider";
import { API_BASE_URL, API_KEY } from "@/lib/config";

type ApiSearchUser = {
  name: string;
  communityId: string;
  userTypes?: string[];
  [key: string]: unknown;
};

export type UserLite = { name: string; id: string };

export type SearchUserTagsInputProps = {
  label?: string;
  placeholder?: string;
  value: UserLite[];
  onChange: (users: UserLite[]) => void;
  maxTags?: number;
  disabled?: boolean;
  inputName?: string;
  ariaLabel?: string;
  fetchLimit?: number;
  className?: string;
};

type InputBoxProps = {
  id: string;
  name?: string;
  value: string;
  placeholder: string;
  disabled: boolean;
  ariaControls: string;
  ariaLabel?: string;
  ariaLabelledBy?: string;
  ariaActivedescendant?: string;
  onChange: (value: string) => void;
  onKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  onFocus: () => void;
  onBlur: () => void;
  onPaste: (event: React.ClipboardEvent<HTMLInputElement>) => void;
};

const InputBox = React.forwardRef<HTMLInputElement, InputBoxProps>(
  (
    {
      id,
      name,
      value,
      placeholder,
      disabled,
      ariaControls,
      ariaLabel,
      ariaLabelledBy,
      ariaActivedescendant,
      onChange,
      onKeyDown,
      onFocus,
      onBlur,
      onPaste,
    },
    ref
  ) => (
    <Input
      id={id}
      name={name}
      ref={ref}
      value={value}
      placeholder={placeholder}
      disabled={disabled}
      autoComplete="off"
      aria-autocomplete="list"
      aria-controls={ariaControls}
      aria-activedescendant={ariaActivedescendant}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabel ? undefined : ariaLabelledBy}
      onChange={(event) => onChange(event.target.value)}
      onKeyDown={onKeyDown}
      onFocus={onFocus}
      onBlur={onBlur}
      onPaste={onPaste}
      className="pr-10"
    />
  )
);
InputBox.displayName = "InputBox";

type ResultsListProps = {
  id: string;
  ariaLabel?: string;
  results: ApiSearchUser[];
  highlightedIndex: number;
  selectedIds: Set<string>;
  loading: boolean;
  error: string | null;
  sessionExpired: boolean;
  showEmpty: boolean;
  onRetry: () => void;
  onSelect: (user: ApiSearchUser) => void;
  getOptionId: (user: ApiSearchUser) => string;
};

const ResultsList = ({
  id,
  ariaLabel,
  results,
  highlightedIndex,
  selectedIds,
  loading,
  error,
  sessionExpired,
  showEmpty,
  onRetry,
  onSelect,
  getOptionId,
}: ResultsListProps) => {
  return (
    <div
      id={id}
      role="listbox"
      aria-label={ariaLabel}
      className="absolute left-0 right-0 z-20 mt-1 max-h-64 w-full overflow-auto rounded-md border border-input bg-popover text-popover-foreground shadow-lg focus-visible:outline-none"
    >
      {loading && (
        <div className="flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          Searching...
        </div>
      )}
      {!loading && sessionExpired && (
        <div className="px-4 py-3 text-sm text-destructive">
          Session expired.
        </div>
      )}
      {!loading && error && (
        <div className="flex items-center justify-between px-4 py-3 text-sm text-destructive">
          <span>{error}</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onMouseDown={(event) => event.preventDefault()}
            onPointerDown={(event) => event.preventDefault()}
            onClick={(event) => {
              event.preventDefault();
              onRetry();
            }}
          >
            Retry
          </Button>
        </div>
      )}
      {!loading &&
        !error &&
        !sessionExpired &&
        results.length === 0 &&
        showEmpty && (
          <div className="px-4 py-3 text-sm text-muted-foreground">
            No matches.
          </div>
        )}
      {!loading &&
        !sessionExpired &&
        results.map((user, index) => {
          const optionId = getOptionId(user);
          const alreadySelected = selectedIds.has(user.communityId);
          return (
            <button
              key={user.communityId}
              id={optionId}
              role="option"
              type="button"
              aria-selected={alreadySelected}
              aria-disabled={alreadySelected}
              onMouseDown={(event) => event.preventDefault()}
              onPointerDown={(event) => event.preventDefault()}
              onClick={(event) => {
                event.preventDefault();
                if (!alreadySelected) onSelect(user);
              }}
              className={cn(
                "flex w-full items-center gap-3 px-4 py-3 text-left text-sm transition",
                "min-h-10",
                alreadySelected
                  ? "cursor-not-allowed bg-muted text-muted-foreground"
                  : "cursor-pointer hover:bg-accent",
                index === highlightedIndex && !alreadySelected
                  ? "bg-accent"
                  : null
              )}
            >
              <User className="h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="flex flex-1 flex-col">
                <span className="font-medium text-foreground">{user.name}</span>
                <span className="text-xs text-muted-foreground">
                  {user.communityId}
                </span>
                {user.userTypes?.length ? (
                  <span className="text-xs text-muted-foreground">
                    {user.userTypes.join(", ")}
                  </span>
                ) : null}
              </div>
              {alreadySelected && (
                <Check
                  className="h-4 w-4 text-muted-foreground"
                  aria-hidden="true"
                />
              )}
            </button>
          );
        })}
    </div>
  );
};

type TagChipProps = {
  user: UserLite;
  onRemove: (id: string) => void;
  disabled?: boolean;
};

const TagChip = ({ user, onRemove, disabled }: TagChipProps) => (
  <Badge
    variant="secondary"
    className="flex min-h-10 items-center gap-2 rounded-full bg-secondary/60 px-3 py-1 text-sm"
  >
    <span className="truncate">{user.name}</span>

    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={`Remove ${user.name}`}
      disabled={disabled}
      className="h-10 w-10 rounded-full"
      onClick={() => onRemove(user.id)}
    >
      <X className="h-4 w-4" aria-hidden="true" />
    </Button>
  </Badge>
);

const DEFAULT_PLACEHOLDER = "Type a name to search...";

export function SearchUserTagsInput({
  label,
  placeholder = DEFAULT_PLACEHOLDER,
  value,
  onChange,
  maxTags,
  disabled = false,
  inputName,
  ariaLabel,
  fetchLimit = 5,
  className,
}: SearchUserTagsInputProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ApiSearchUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [statusMessage, setStatusMessage] = useState("");
  const [queuedTokens, setQueuedTokens] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const blurTimeoutRef = useRef<number>();
  const lastQueryRef = useRef("");
  const listboxId = useId();
  const labelId = useId();
  const inputId = useId();
  const { getValidAccessToken, handleExpiredToken } = useAuth();

  const selectedIds = useMemo(
    () => new Set(value.map((user) => user.id)),
    [value]
  );

  const limitReached = Boolean(
    typeof maxTags === "number" && value.length >= maxTags
  );
  const inputDisabled = disabled || limitReached;

  const resetStatus = useCallback(() => {
    setStatusMessage("");
    setHighlightedIndex(-1);
    setResults([]);
    setError(null);
    setSessionExpired(false);
  }, []);

  const fetchUsers = useCallback(
    async (searchTerm: string) => {
      const trimmed = searchTerm.trim();
      if (!trimmed) {
        resetStatus();
        return;
      }
      setLoading(true);
      setError(null);
      setSessionExpired(false);
      lastQueryRef.current = trimmed;
      const accessToken = await getValidAccessToken();
      if (!accessToken) {
        setLoading(false);
        setResults([]);
        setSessionExpired(true);
        setStatusMessage("Session expired.");
        handleExpiredToken();
        return;
      }
      try {
        const url = new URL(`${API_BASE_URL}/api/v2/internal/users`);
        url.searchParams.append("search", trimmed);
        url.searchParams.append("searchBy", "name");
        url.searchParams.append("limit", String(fetchLimit));
        const response = await fetch(url.toString(), {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
        });
        if (!response.ok) {
          throw new Error("Failed to fetch users.");
        }
        const data = await response.json();
        const list: ApiSearchUser[] = Array.isArray(data?.data)
          ? data.data
          : [];
        setResults(list);
        setHighlightedIndex(list.length ? 0 : -1);
        setStatusMessage(
          `${list.length} result${list.length === 1 ? "" : "s"}`
        );
      } catch (err) {
        console.error(err);
        setError("Failed to fetch users.");
        setStatusMessage("Failed to fetch users.");
      } finally {
        setLoading(false);
      }
    },
    [fetchLimit]
  );

  useEffect(() => {
    if (inputDisabled) {
      setIsOpen(false);
      return;
    }
    if (!query.trim()) {
      resetStatus();
      return;
    }
    const handle = window.setTimeout(() => {
      void fetchUsers(query);
    }, 300);
    return () => window.clearTimeout(handle);
  }, [fetchUsers, inputDisabled, query, resetStatus]);

  useEffect(() => {
    return () => {
      if (blurTimeoutRef.current) {
        window.clearTimeout(blurTimeoutRef.current);
      }
    };
  }, []);

  const handleSelectUser = useCallback(
    (user: ApiSearchUser) => {
      if (value.some((existing) => existing.id === user.communityId)) {
        return;
      }
      const next = [...value, { name: user.name, id: user.communityId }];
      onChange(next);
      if (queuedTokens.length) {
        setQuery(queuedTokens[0] ?? "");
        setQueuedTokens((prev) => prev.slice(1));
        setIsOpen(true);
      } else {
        setQuery("");
        setIsOpen(false);
      }
    },
    [onChange, queuedTokens, value]
  );

  const handleRemoveTag = (id: string) => {
    const next = value.filter((user) => user.id !== id);
    onChange(next);
  };

  const handleInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    // if (event.key === "Backspace" && !query && value.length) {
    //   event.preventDefault();
    //   handleRemoveTag(value[value.length - 1].id);
    //   return;
    // }

    if (event.key === "ArrowDown" && results.length) {
      event.preventDefault();
      setIsOpen(true);
      setHighlightedIndex((prev) => {
        const nextIndex = prev + 1;
        return nextIndex >= results.length ? 0 : nextIndex;
      });
      return;
    }

    if (event.key === "ArrowUp" && results.length) {
      event.preventDefault();
      setHighlightedIndex((prev) => {
        const nextIndex = prev - 1;
        if (nextIndex < 0) {
          return results.length - 1;
        }
        return nextIndex;
      });
      return;
    }

    if (event.key === "Enter") {
      if (isOpen && highlightedIndex >= 0 && results[highlightedIndex]) {
        event.preventDefault();
        handleSelectUser(results[highlightedIndex]);
      }
      return;
    }

    if (event.key === "Escape") {
      setIsOpen(false);
      return;
    }
  };

  const handleInputChange = (nextValue: string) => {
    if (queuedTokens.length) {
      setQueuedTokens([]);
    }
    setQuery(nextValue);
    setIsOpen(true);
  };

  const handleInputFocus = () => {
    if (!inputDisabled) {
      setIsOpen(true);
    }
  };

  const handleInputBlur = () => {
    blurTimeoutRef.current = window.setTimeout(() => {
      setIsOpen(false);
    }, 150);
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
    const data = event.clipboardData.getData("text");
    if (!data) return;
    const tokens = data
      .split(/[\n,]+/)
      .map((token) => token.trim())
      .filter(Boolean);
    if (!tokens.length) return;
    event.preventDefault();
    setQueuedTokens(tokens.slice(1));
    setQuery(tokens[0] ?? "");
    setIsOpen(true);
  };

  const retryFetch = () => {
    if (lastQueryRef.current) {
      void fetchUsers(lastQueryRef.current);
    } else if (query.trim()) {
      void fetchUsers(query);
    }
  };

  const getOptionId = (user: ApiSearchUser) =>
    `${listboxId}-option-${user.communityId}`;

  const listboxLabel = ariaLabel
    ? `${ariaLabel} results`
    : label
    ? `${label} results`
    : "User search results";

  return (
    <div className={cn("w-full", className)}>
      {label ? (
        <Label htmlFor={inputId} id={labelId} className="mb-1 block text-sm">
          {label}
        </Label>
      ) : null}
      <div
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-controls={listboxId}
        aria-owns={listboxId}
        aria-disabled={inputDisabled}
        className="relative"
      >
        <InputBox
          id={inputId}
          name={inputName}
          ref={inputRef}
          value={query}
          placeholder={placeholder}
          disabled={inputDisabled}
          ariaControls={listboxId}
          ariaLabel={ariaLabel}
          ariaLabelledBy={label ? labelId : undefined}
          ariaActivedescendant={
            highlightedIndex >= 0 && results[highlightedIndex]
              ? getOptionId(results[highlightedIndex])
              : undefined
          }
          onChange={handleInputChange}
          onKeyDown={handleInputKeyDown}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          onPaste={handlePaste}
        />
        {isOpen && !inputDisabled && (
          <ResultsList
            id={listboxId}
            ariaLabel={listboxLabel}
            results={results}
            highlightedIndex={highlightedIndex}
            selectedIds={selectedIds}
            loading={loading}
            error={error}
            sessionExpired={sessionExpired}
            showEmpty={Boolean(query.trim())}
            onRetry={retryFetch}
            onSelect={handleSelectUser}
            getOptionId={getOptionId}
          />
        )}
      </div>
      {limitReached && (
        <p className="mt-2 text-sm text-muted-foreground">Limit reached.</p>
      )}
      {!limitReached && error && (
        <p className="mt-2 text-sm text-destructive">{error}</p>
      )}
      {sessionExpired && (
        <p className="mt-2 text-sm text-destructive">Session expired.</p>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        {value.map((user) => (
          <TagChip
            key={user.id}
            user={user}
            onRemove={handleRemoveTag}
            disabled={disabled}
          />
        ))}
      </div>
      <div className="sr-only" aria-live="polite">
        {statusMessage}
      </div>
    </div>
  );
}

export default SearchUserTagsInput;
