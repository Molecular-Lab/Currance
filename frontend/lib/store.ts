import { create } from "zustand";
import { persist } from "zustand/middleware";

// Registration flow state
interface RegistrationState {
  template_id: string | null;
  record_id: string | null;
  package_id: string | null;
  verified: boolean;
  attestation: string | null;
}

// Claim flow state
interface ClaimState {
  template_id: string | null;
  invoice_id: string | null;
  verified: boolean;
}

// Complete store interface
interface AppStore {
  // Registration flow
  registration: RegistrationState;

  // Claim flow
  claim: ClaimState;

  // Registration actions
  setRegistration: (data: Partial<RegistrationState>) => void;
  resetRegistration: () => void;

  // Claim actions
  setClaim: (data: Partial<ClaimState>) => void;
  resetClaim: () => void;

  // Reset all
  resetAll: () => void;
}

// Initial states
const initialRegistration: RegistrationState = {
  template_id: null,
  record_id: null,
  package_id: null,
  verified: false,
  attestation: null,
};

const initialClaim: ClaimState = {
  template_id: null,
  invoice_id: null,
  verified: false,
};

// Create the store with persistence
export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      // Initial state
      registration: initialRegistration,
      claim: initialClaim,

      // Registration actions
      setRegistration: (data) =>
        set((state) => ({
          registration: { ...state.registration, ...data },
        })),

      resetRegistration: () =>
        set({
          registration: initialRegistration,
        }),

      // Claim actions
      setClaim: (data) =>
        set((state) => ({
          claim: { ...state.claim, ...data },
        })),

      resetClaim: () =>
        set({
          claim: initialClaim,
        }),

      // Reset all
      resetAll: () =>
        set({
          registration: initialRegistration,
          claim: initialClaim,
        }),
    }),
    {
      name: "curance-storage",
      partialize: (state) => ({
        registration: state.registration,
        claim: state.claim,
      }),
    }
  )
);
