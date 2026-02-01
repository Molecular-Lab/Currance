# CURANCE
## Privacy-Preserving Crypto Health Insurance

*ETH Chiang Mai Hackathon 2024*

---

# 3-MINUTE PITCH STRUCTURE

| Section | Time | Slides |
|---------|------|--------|
| Hook + What is it | 20s | 1-2 |
| Problem | 40s | 3-4 |
| Why it matters | 30s | 5 |
| Solution | 40s | 6-7 |
| Architecture | 20s | 8 |
| Demo (video) | 40s | 9 |
| Team + Ask | 10s | 10 |

---

## Slide 1: Title (5s)

# CURANCE

**Crypto Health Insurance Where You Stay Anonymous**

*Your hospital knows you. Your insurance doesn't have to.*

---

## Slide 2: What Is It (15s)

### Health Insurance on Crypto Rails

- Pay premiums in **USDC**
- Receive claim payouts in **USDC**
- Verify claims with **zkTLS** (no identity needed)
- Policy stored as **NFT** in your wallet

**First privacy-preserving health insurance for the crypto-native world.**

---

## Slide 3: Problem - The Data Breach Epidemic (20s)

# 276 Million

**Patient records exposed in 2024 alone**

- Change Healthcare breach: **190 million** people
- **+63%** increase from 2023
- Healthcare = #1 target for hackers

> *Source: HIPAA Journal, HHS Office for Civil Rights*

---

## Slide 4: Problem - Insurance Knows Too Much (20s)

### What insurance NEEDS vs what they COLLECT

| Actually Needed | Currently Collected |
|-----------------|---------------------|
| Claim is valid | ✓ Your full name |
| Amount to pay | ✓ Your address |
| Where to send money | ✓ Your SSN |
| | ✓ Your bank account |
| | ✓ Your ENTIRE medical history |

**Why does paying a claim require knowing who you are?**

---

## Slide 5: Why This Matters (30s)

### The Privacy Boundary

```
┌─────────────────┐          ┌─────────────────┐
│    HOSPITAL     │          │   INSURANCE     │
│                 │          │                 │
│  MUST know you  │          │  Only needs     │
│  (treats you)   │          │  PROOF          │
│                 │          │                 │
│  ✓ Name         │          │  ✓ Valid policy │
│  ✓ Medical data │          │  ✓ Valid claim  │
│  ✓ Identity     │          │  ✓ Amount       │
└─────────────────┘          └─────────────────┘
         │                           │
         │     YOUR CONTROL          │
         └───────────┬───────────────┘
                     │
              zkTLS BRIDGE
           (proves without revealing)
```

**Hospital-patient: identity required (unavoidable)**
**Insurance-patient: identity NOT required (our innovation)**

---

## Slide 6: Solution - CURANCE (20s)

### Pseudonymous Health Insurance

| Traditional | CURANCE |
|-------------|---------|
| Full KYC required | Wallet address only |
| Bank transfers | USDC payments |
| Manual claim review | zkTLS verification |
| Data honeypot | Nothing to leak |

**We verify your claim is real without knowing who you are.**

---

## Slide 7: How zkTLS Works (20s)

### Primus zkTLS = Cryptographic Proof of Web Data

1. You visit hospital website (logged in as yourself)
2. Primus observes: *"Invoice exists, amount = $1,500"*
3. Creates cryptographic proof
4. Proof sent to Curance (no identity attached)

**Proves the data is real. Hides who it belongs to.**

---

## Slide 8: Architecture (20s)

```
┌─────────────────────────────────────────────────────────┐
│                  IDENTITY ZONE                          │
│                                                         │
│    Hospital ◄────► You (logged in)                     │
│    (knows you)     + Primus Extension                  │
│                                                         │
└────────────────────────┬────────────────────────────────┘
                         │
                    zkTLS Proof
                   (strips identity)
                         │
┌────────────────────────┼────────────────────────────────┐
│                        ▼          PSEUDONYMOUS ZONE     │
│                                                         │
│    Curance Platform ────► Insurance Pool (USDC)        │
│    (wallet + proof)       (premiums in, claims out)    │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Slide 9: Demo (40s)

### [PLAY VIDEO CLIP]

**Demo Flow:**

1. **Hospital Portal** → View health records & invoices
2. **Register** → Create zkTLS proof → Select plan → Pay USDC
3. **Claim** → Create invoice proof → Receive USDC payout

**Live Demo:** curance.vercel.app

---

## Slide 10: Team + Ask (10s)

### Team

*[Your team members here]*

### Built With

- Next.js + React
- Primus zkTLS
- Zustand + TailwindCSS

### Ask

- Feedback on privacy model
- Hospital partnership intros (Thailand)
- Primus Labs collaboration

---

# SPEAKER NOTES

## Slide 1-2 (20s)
> "Curance is crypto-native health insurance where you stay anonymous. Pay in USDC, get claims in USDC, and your insurance never learns your identity."

## Slide 3-4 (40s)
> "276 million patient records were exposed in 2024. Healthcare is the #1 hacking target. Why? Because insurers collect everything - your name, SSN, address, entire medical history. But to pay a claim, they only NEED to know the claim is valid and where to send money."

## Slide 5 (30s)
> "Here's the key insight: Hospitals MUST know your identity - they physically treat you. But insurance? They only need PROOF. Proof the policy exists, proof the claim is legitimate. zkTLS lets us prove these things without revealing who you are."

## Slide 6-7 (40s)
> "Curance uses Primus zkTLS. You visit the hospital portal logged in as yourself. Primus creates a cryptographic proof that the invoice exists and the amount is correct. That proof goes to us - but your name never does. We verify claims are real without knowing whose claims they are."

## Slide 8 (20s)
> "The architecture has two zones. Identity zone - you and the hospital, unavoidable. Pseudonymous zone - us and the insurance pool, only wallets and proofs. zkTLS is the bridge that strips identity."

## Slide 9 (40s)
> "[Play demo video showing the flows]"

## Slide 10 (10s)
> "We're looking for feedback on the privacy model and hospital partnership intros in Thailand. Thank you!"

---

# BACKUP SLIDES (if asked)

## Why Thailand?

- **$2.5B+ medical tourism market**
- High crypto adoption in SEA
- Medical tourists need coverage without local bank accounts
- Strong hospital infrastructure

## Why Not Just Use Nexus Mutual?

Nexus Mutual covers **smart contract risk** (hacks, bugs).
We cover **real-world health expenses** (doctor visits, surgery).

Different products entirely.

## What If Hospital Is Hacked?

Hospital breach = patient data exposed (unavoidable - they must have it)
BUT attacker cannot link to Curance policies (we only have wallets)

Privacy preserved from insurance side even in breach scenario.

## Revenue Model?

- Premium spread (industry standard 15-25%)
- Claims processing efficiency (no manual review)
- Future: Reinsurance partnerships

---

*Last updated: ETH Chiang Mai Hackathon 2024*
