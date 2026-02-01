"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Check,
  Loader2,
  Shield,
  Star,
  Crown,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Coins,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import { selectPackage, formatCurrency } from "@/lib/api";

// Crypto options with mock exchange rates and icons
const cryptoOptions = [
  {
    id: "usdc",
    name: "USDC",
    symbol: "USDC",
    rate: 1,
    icon: "https://cryptologos.cc/logos/usd-coin-usdc-logo.png"
  },
  {
    id: "eth",
    name: "Ethereum",
    symbol: "ETH",
    rate: 0.00031,
    icon: "https://cryptologos.cc/logos/ethereum-eth-logo.png"
  },
  {
    id: "btc",
    name: "Bitcoin",
    symbol: "BTC",
    rate: 0.000012,
    icon: "https://cryptologos.cc/logos/bitcoin-btc-logo.png"
  },
  {
    id: "sol",
    name: "Solana",
    symbol: "SOL",
    rate: 0.0042,
    icon: "https://cryptologos.cc/logos/solana-sol-logo.png"
  },
];

// Coverage packages with 10-year coverage
const coveragePackages = [
  {
    id: "basic",
    name: "Basic",
    monthlyUSD: 50,
    coverage: 50000,
    years: 10,
    description: "Essential coverage for everyday health needs",
    features: [
      "General consultations",
      "Basic lab tests",
      "Emergency care (limited)",
      "10-year coverage guarantee",
    ],
    color: "neutral",
  },
  {
    id: "standard",
    name: "Standard",
    monthlyUSD: 100,
    coverage: 100000,
    years: 10,
    description: "Comprehensive coverage for individuals and families",
    features: [
      "All Basic features",
      "Specialist consultations",
      "Surgery coverage",
      "Hospitalization",
      "10-year coverage guarantee",
    ],
    color: "blue",
    popular: true,
  },
  {
    id: "premium",
    name: "Premium",
    monthlyUSD: 200,
    coverage: 200000,
    years: 10,
    description: "Maximum protection with premium benefits",
    features: [
      "All Standard features",
      "International coverage",
      "Dental & vision",
      "Mental health support",
      "Wellness programs",
      "10-year coverage guarantee",
    ],
    color: "amber",
  },
];

export default function PackagesPage() {
  const router = useRouter();
  const { registration, setRegistration } = useAppStore();
  const [currentIndex, setCurrentIndex] = useState(1); // Start with Standard (middle)
  const [selectedCrypto, setSelectedCrypto] = useState(cryptoOptions[0]);
  const [isLoading, setIsLoading] = useState(false);
  const [showFeatures, setShowFeatures] = useState(false);

  // Check if user came from registration flow
  useEffect(() => {
    if (!registration.verified && !registration.record_id) {
      router.push("/curance/register");
    }
  }, [registration, router]);

  const currentPackage = coveragePackages[currentIndex];

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : prev));
    setShowFeatures(false); // Collapse when switching
  };

  const handleNext = () => {
    setCurrentIndex((prev) =>
      prev < coveragePackages.length - 1 ? prev + 1 : prev
    );
    setShowFeatures(false); // Collapse when switching
  };

  const handleSelectPackage = async () => {
    if (!registration.record_id) return;

    setIsLoading(true);

    try {
      const result = await selectPackage(
        currentPackage.id,
        registration.record_id
      );
      if (result.success) {
        setRegistration({ package_id: currentPackage.id });
        router.push("/packages/success");
      }
    } catch (error) {
      console.error("Failed to select package:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getPackageIcon = (id: string) => {
    switch (id) {
      case "basic":
        return <Shield className="h-6 w-6" />;
      case "standard":
        return <Star className="h-6 w-6" />;
      case "premium":
        return <Crown className="h-6 w-6" />;
      default:
        return <Shield className="h-6 w-6" />;
    }
  };

  const getIconBgColor = (color: string) => {
    switch (color) {
      case "blue":
        return "bg-blue-100 text-blue-600";
      case "amber":
        return "bg-amber-100 text-amber-600";
      default:
        return "bg-neutral-100 text-neutral-600";
    }
  };

  const getCryptoAmount = (usdAmount: number) => {
    return (usdAmount * selectedCrypto.rate).toFixed(
      selectedCrypto.id === "usdc" ? 2 : 6
    );
  };

  const handleCryptoChange = (value: string) => {
    const crypto = cryptoOptions.find((c) => c.id === value);
    if (crypto) {
      setSelectedCrypto(crypto);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mobile-container py-6">
        {/* Header */}
        <div className="mb-6">
          <Link href="/curance/register">
            <Button variant="ghost" size="sm" className="mb-4 -ml-2">
              <ArrowLeft className="mr-1 h-4 w-4" />
              Back
            </Button>
          </Link>
          <h1 className="text-2xl font-bold mb-1">Select Your Plan</h1>
          <p className="text-sm text-muted-foreground">
            10-year coverage with crypto payments
          </p>
        </div>

        {/* Verified record info */}
        {registration.record_id && (
          <div className="mb-6 p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-600" />
              <span className="text-sm text-green-800">
                Health record verified:{" "}
                <span className="font-mono">{registration.record_id}</span>
              </span>
            </div>
          </div>
        )}

        {/* Carousel */}
        <div className="relative mb-6">
          {/* Navigation buttons */}
          <button
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 z-10 w-8 h-8 bg-white border border-neutral-200 rounded-full flex items-center justify-center shadow-sm disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={handleNext}
            disabled={currentIndex === coveragePackages.length - 1}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-3 z-10 w-8 h-8 bg-white border border-neutral-200 rounded-full flex items-center justify-center shadow-sm disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight className="h-4 w-4" />
          </button>

          {/* Package Card */}
          <Card className="overflow-hidden">
            <CardContent className="p-5">
              {/* Badge for popular */}
              {currentPackage.popular && (
                <div className="mb-3">
                  <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                    Most Popular
                  </span>
                </div>
              )}

              {/* Package header */}
              <div className="flex items-center gap-3 mb-4">
                <div
                  className={`w-11 h-11 rounded-xl flex items-center justify-center ${getIconBgColor(
                    currentPackage.color
                  )}`}
                >
                  {getPackageIcon(currentPackage.id)}
                </div>
                <div>
                  <h3 className="text-xl font-bold">{currentPackage.name}</h3>
                  <p className="text-xs text-muted-foreground">
                    {currentPackage.description}
                  </p>
                </div>
              </div>

              {/* Pricing in selected crypto */}
              <div className="p-4 bg-neutral-50 rounded-xl mb-4">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold">
                    {getCryptoAmount(currentPackage.monthlyUSD)}
                  </span>
                  <span className="text-lg font-medium text-muted-foreground">
                    {selectedCrypto.symbol}
                  </span>
                  <span className="text-sm text-muted-foreground">/month</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  ≈ {formatCurrency(currentPackage.monthlyUSD)} USD
                </p>
              </div>

              {/* Coverage info */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="p-3 bg-green-50 rounded-lg text-center">
                  <p className="text-xs text-muted-foreground">Max Coverage</p>
                  <p className="text-lg font-bold text-green-700">
                    {formatCurrency(currentPackage.coverage)}
                  </p>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg text-center">
                  <p className="text-xs text-muted-foreground">Duration</p>
                  <p className="text-lg font-bold text-blue-700">
                    {currentPackage.years} Years
                  </p>
                </div>
              </div>

              {/* Expandable Features */}
              <button
                onClick={() => setShowFeatures(!showFeatures)}
                className="w-full flex items-center justify-between py-3 border-t text-sm font-medium"
              >
                <span>What&apos;s included</span>
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${
                    showFeatures ? "rotate-180" : ""
                  }`}
                />
              </button>

              {showFeatures && (
                <ul className="space-y-2 pb-2">
                  {currentPackage.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Carousel indicators */}
          <div className="flex justify-center gap-2 mt-4">
            {coveragePackages.map((pkg, index) => (
              <button
                key={index}
                onClick={() => {
                  setCurrentIndex(index);
                  setShowFeatures(false);
                }}
                className={`h-2 rounded-full transition-all ${
                  index === currentIndex
                    ? "bg-neutral-900 w-6"
                    : "bg-neutral-300 w-2"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Crypto selector using shadcn Select */}
        <div className="mb-6">
          <label className="text-sm font-medium mb-2 flex items-center gap-2">
            <Coins className="h-4 w-4" />
            Pay with
          </label>
          <Select
            value={selectedCrypto.id}
            onValueChange={handleCryptoChange}
          >
            <SelectTrigger className="w-full mt-2">
              <div className="flex items-center gap-2">
                <img
                  src={selectedCrypto.icon}
                  alt={selectedCrypto.name}
                  className="w-5 h-5 rounded-full"
                />
                <span className="font-medium">{selectedCrypto.symbol}</span>
                <span className="text-muted-foreground">({selectedCrypto.name})</span>
              </div>
            </SelectTrigger>
            <SelectContent>
              {cryptoOptions.map((crypto) => (
                <SelectItem key={crypto.id} value={crypto.id}>
                  <span className="flex items-center gap-2">
                    <img
                      src={crypto.icon}
                      alt={crypto.name}
                      className="w-5 h-5 rounded-full"
                    />
                    <span className="font-medium">{crypto.symbol}</span>
                    <span className="text-muted-foreground">
                      ({crypto.name})
                    </span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Total calculation */}
        <div className="mb-6 p-4 bg-neutral-100 rounded-xl">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-muted-foreground">Monthly</span>
            <span className="font-mono">
              {getCryptoAmount(currentPackage.monthlyUSD)} {selectedCrypto.symbol}
            </span>
          </div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-muted-foreground">
              Total ({currentPackage.years} years)
            </span>
            <span className="font-mono">
              {getCryptoAmount(currentPackage.monthlyUSD * 12 * currentPackage.years)}{" "}
              {selectedCrypto.symbol}
            </span>
          </div>
          <div className="pt-2 border-t border-neutral-200">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Coverage</span>
              <span className="font-bold text-green-600">
                {formatCurrency(currentPackage.coverage)}
              </span>
            </div>
          </div>
        </div>

        {/* Confirm button */}
        <div className="space-y-3">
          <Button
            onClick={handleSelectPackage}
            disabled={isLoading}
            className="w-full h-12"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                Select {currentPackage.name} Plan
              </>
            )}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            Pay monthly in {selectedCrypto.name}. Cancel anytime.
          </p>
        </div>
      </div>
    </div>
  );
}
