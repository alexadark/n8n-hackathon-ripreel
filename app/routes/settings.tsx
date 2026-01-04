import { Link } from "react-router";
import { ArrowLeft, Key, Shield, Eye, EyeOff, Save, Check } from "lucide-react";
import { useState, useEffect } from "react";
import type { Route } from "./+types/settings";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Settings - RipReel" },
    { name: "description", content: "Configure your API keys and preferences." },
  ];
}

// Client-only loader - runs in the browser
export async function clientLoader({}: Route.ClientLoaderArgs) {
  // Get API keys from localStorage
  const anthropicKey = localStorage.getItem("ripreel_anthropic_key") || "";
  const kieKey = localStorage.getItem("ripreel_kie_key") || "";

  return {
    anthropicKey,
    kieKey,
  };
}

// Mark as client-only (no server loader)
clientLoader.hydrate = true;

interface ApiKeyInputProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  description: string;
}

function ApiKeyInput({
  id,
  label,
  value,
  onChange,
  placeholder,
  description,
}: ApiKeyInputProps) {
  const [showKey, setShowKey] = useState(false);

  return (
    <div className="bg-[#1c1c1f] border border-[#333] rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <label
          htmlFor={id}
          className="font-oswald text-sm uppercase tracking-wider"
        >
          {label}
        </label>
        <button
          type="button"
          onClick={() => setShowKey(!showKey)}
          className="text-[#888] hover:text-[#f5c518] transition-colors"
        >
          {showKey ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
      <input
        type={showKey ? "text" : "password"}
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-[#0a0a0b] border border-[#333] rounded-lg px-4 py-3 font-courier text-white placeholder:text-[#666] focus:outline-none focus:border-[#f5c518] transition-colors"
      />
      <p className="font-courier text-xs text-[#666] mt-2">{description}</p>
    </div>
  );
}

export default function SettingsPage({ loaderData }: Route.ComponentProps) {
  const [anthropicKey, setAnthropicKey] = useState(loaderData?.anthropicKey || "");
  const [kieKey, setKieKey] = useState(loaderData?.kieKey || "");
  const [saved, setSaved] = useState(false);

  // Update state when loaderData changes (client-side hydration)
  useEffect(() => {
    if (loaderData) {
      setAnthropicKey(loaderData.anthropicKey || "");
      setKieKey(loaderData.kieKey || "");
    }
  }, [loaderData]);

  const handleSave = () => {
    // Save to localStorage
    localStorage.setItem("ripreel_anthropic_key", anthropicKey);
    localStorage.setItem("ripreel_kie_key", kieKey);

    // Show saved indicator
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="min-h-screen w-full bg-[#0a0a0b] text-white">
      {/* Header */}
      <header className="border-b border-[#333] py-6">
        <div className="container mx-auto px-4 flex items-center gap-4">
          <Link
            to="/"
            className="text-[#888] hover:text-[#f5c518] transition-colors"
          >
            <ArrowLeft size={24} />
          </Link>
          <div className="font-oswald text-2xl font-bold tracking-widest">
            ripreel<span className="text-[#f5c518]">.io</span>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-3xl">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Key className="text-[#f5c518]" size={28} />
            <h1 className="font-oswald text-3xl font-bold uppercase tracking-wider text-white">
              Settings
            </h1>
          </div>
          <p className="font-courier text-[#888]">
            Configure your API keys to use RipReel&apos;s AI features
          </p>
        </div>

        {/* API Keys Form */}
        <div className="space-y-6">
          <ApiKeyInput
            id="anthropicKey"
            label="Anthropic API Key"
            value={anthropicKey}
            onChange={setAnthropicKey}
            placeholder="sk-ant-..."
            description="Used for Claude AI models in screenplay parsing and prompt refinement."
          />

          <ApiKeyInput
            id="kieKey"
            label="Kie.ai API Key"
            value={kieKey}
            onChange={setKieKey}
            placeholder="kie_..."
            description="Used for Veo 3.1 video generation with audio."
          />

          {/* Save Button */}
          <button
            onClick={handleSave}
            className={`w-full inline-flex items-center justify-center gap-2 font-oswald text-lg uppercase tracking-widest px-6 py-4 transition-all rounded-lg ${
              saved
                ? "bg-green-600 text-white"
                : "bg-[#f5c518] hover:bg-white text-black"
            }`}
          >
            {saved ? (
              <>
                <Check size={20} />
                Saved!
              </>
            ) : (
              <>
                <Save size={20} />
                Save Settings
              </>
            )}
          </button>
        </div>

        {/* Security Note */}
        <div className="mt-8 p-4 bg-[#0a0a0b] border border-[#333] rounded-lg">
          <div className="flex items-start gap-3">
            <Shield className="text-[#00f2ea] mt-0.5 flex-shrink-0" size={18} />
            <div>
              <h3 className="font-oswald text-sm uppercase text-white mb-1">
                Security Note
              </h3>
              <p className="font-courier text-xs text-[#666] leading-relaxed">
                Your API keys are stored locally in your browser&apos;s
                localStorage and are never sent to our servers for storage. Keys
                are only transmitted directly to the respective API providers
                (Anthropic, Kie.ai) when you use RipReel features.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Skeleton loading state for initial client-side load
export function HydrateFallback() {
  return (
    <div className="min-h-screen w-full bg-[#0a0a0b] text-white">
      {/* Header */}
      <header className="border-b border-[#333] py-6">
        <div className="container mx-auto px-4 flex items-center gap-4">
          <div className="w-6 h-6 bg-[#333] rounded animate-pulse" />
          <div className="font-oswald text-2xl font-bold tracking-widest">
            ripreel<span className="text-[#f5c518]">.io</span>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-3xl">
        {/* Page Header Skeleton */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-7 h-7 bg-[#333] rounded animate-pulse" />
            <div className="w-32 h-8 bg-[#333] rounded animate-pulse" />
          </div>
          <div className="w-64 h-4 bg-[#333] rounded animate-pulse mt-2" />
        </div>

        {/* Form Skeleton */}
        <div className="space-y-6">
          <div className="bg-[#1c1c1f] border border-[#333] rounded-lg p-6">
            <div className="w-40 h-4 bg-[#333] rounded animate-pulse mb-4" />
            <div className="w-full h-12 bg-[#333] rounded animate-pulse" />
          </div>
          <div className="bg-[#1c1c1f] border border-[#333] rounded-lg p-6">
            <div className="w-32 h-4 bg-[#333] rounded animate-pulse mb-4" />
            <div className="w-full h-12 bg-[#333] rounded animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}
