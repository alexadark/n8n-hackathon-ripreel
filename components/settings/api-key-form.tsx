"use client";

import { useState } from "react";
import { useApiKeys, type ApiKeyProvider } from "@/hooks/use-api-keys";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, X, Eye, EyeOff, ExternalLink, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ApiKeyInputProps {
  provider: ApiKeyProvider;
  label: string;
  description: string;
  placeholder: string;
  helpUrl: string;
  helpText: string;
}

function ApiKeyInput({
  provider,
  label,
  description,
  placeholder,
  helpUrl,
  helpText,
}: ApiKeyInputProps) {
  const { hasKey, setKey, clearKey, getMaskedKey } = useApiKeys();
  const [inputValue, setInputValue] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const isConfigured = hasKey(provider);
  const maskedKey = getMaskedKey(provider);

  const handleSave = () => {
    if (inputValue.trim()) {
      setKey(provider, inputValue);
      setInputValue("");
      setIsEditing(false);
    }
  };

  const handleClear = () => {
    clearKey(provider);
    setInputValue("");
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave();
    }
    if (e.key === "Escape") {
      setInputValue("");
      setIsEditing(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-white font-oswald uppercase tracking-wide">{label}</Label>
          <p className="text-xs text-[#666] font-courier mt-1">{description}</p>
        </div>
        <div className="flex items-center gap-2">
          {isConfigured ? (
            <div className="flex items-center gap-1.5 text-green-500">
              <Check size={14} />
              <span className="text-xs font-courier">Configured</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-[#888]">
              <X size={14} />
              <span className="text-xs font-courier">Not configured</span>
            </div>
          )}
        </div>
      </div>

      {isConfigured && !isEditing ? (
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-[#1c1c1f] border border-[#333] rounded px-3 py-2 font-courier text-sm text-[#888]">
            {maskedKey}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsEditing(true)}
            className="text-[#888] hover:text-[#f5c518] hover:bg-[#1c1c1f]"
          >
            Change
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClear}
            className="text-[#888] hover:text-red-500 hover:bg-[#1c1c1f]"
          >
            <Trash2 size={16} />
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Input
              type={showKey ? "text" : "password"}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              className="bg-[#1c1c1f] border-[#333] text-white font-courier pr-10 focus:border-[#f5c518] focus:ring-[#f5c518]"
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#666] hover:text-white"
            >
              {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <Button
            onClick={handleSave}
            disabled={!inputValue.trim()}
            className="bg-[#f5c518] text-black hover:bg-[#d4a617] font-oswald uppercase"
          >
            Save
          </Button>
          {isEditing && (
            <Button
              variant="ghost"
              onClick={() => {
                setInputValue("");
                setIsEditing(false);
              }}
              className="text-[#888] hover:text-white hover:bg-[#1c1c1f]"
            >
              Cancel
            </Button>
          )}
        </div>
      )}

      <a
        href={helpUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-xs text-[#f5c518] hover:underline font-courier"
      >
        <ExternalLink size={12} />
        {helpText}
      </a>
    </div>
  );
}

export function ApiKeyForm() {
  const { hasAllKeys, isLoading } = useApiKeys();

  if (isLoading) {
    return (
      <Card className="bg-[#1c1c1f] border-[#333]">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-[#333] rounded w-1/4" />
            <div className="h-10 bg-[#333] rounded" />
            <div className="h-4 bg-[#333] rounded w-1/4" />
            <div className="h-10 bg-[#333] rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-[#1c1c1f] border-[#333]">
      <CardHeader className="border-b border-[#333]">
        <CardTitle className="font-oswald text-xl uppercase text-white tracking-wide">
          API Keys
        </CardTitle>
        <CardDescription className="font-courier text-[#888]">
          Configure your API keys to use RipReel. Keys are stored locally in your browser.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6 space-y-8">
        {/* Status Banner */}
        <div
          className={cn(
            "p-4 rounded border",
            hasAllKeys
              ? "bg-green-500/10 border-green-500/30"
              : "bg-yellow-500/10 border-yellow-500/30"
          )}
        >
          <p className="font-courier text-sm">
            {hasAllKeys ? (
              <span className="text-green-400">
                All API keys configured. You&apos;re ready to create!
              </span>
            ) : (
              <span className="text-yellow-400">
                Please configure both API keys to use RipReel features.
              </span>
            )}
          </p>
        </div>

        {/* Anthropic API Key */}
        <ApiKeyInput
          provider="anthropic"
          label="Anthropic API Key"
          description="Used for screenplay parsing, scene generation, and AI prompts"
          placeholder="sk-ant-..."
          helpUrl="https://console.anthropic.com/settings/keys"
          helpText="Get your Anthropic API key"
        />

        <div className="border-t border-[#333]" />

        {/* Kie.ai API Key */}
        <ApiKeyInput
          provider="kie"
          label="Kie.ai API Key"
          description="Used for image generation (SeeDream, Flux) and video generation (Veo 3)"
          placeholder="kie_..."
          helpUrl="https://kie.ai/account/api-keys"
          helpText="Get your Kie.ai API key"
        />
      </CardContent>
    </Card>
  );
}
