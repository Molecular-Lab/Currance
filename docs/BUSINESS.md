# Business Model

## Problem Statement

Current health insurance has three core problems:

1. **Privacy Violation** - Insurers know everything about you (identity, health history, lifestyle)
2. **Slow Claims** - Settlement takes 7-30 days due to manual verification
3. **Data Silos** - Hospitals and insurers don't share data efficiently

## Solution

Curance separates identity from health data using cryptographic proofs:

| Party | Knows | Doesn't Know |
|-------|-------|--------------|
| Hospital | Patient identity, health details | Patient's insurance status/balance |
| Insurance | Health metrics for pricing | Patient's real identity |
| Blockchain | Commitment hashes only | Any personal data |

## Value Proposition

### For Users
- **Privacy** - Insurance can't discriminate based on name, ethnicity, location
- **Fast Claims** - Settlement in minutes, not weeks
- **Control** - User holds secret key, decides when to claim

### For Hospitals
- **Instant Payment** - Get paid immediately on claim approval
- **Reduced Admin** - No paper forms, automated verification
- **No Bad Debt** - Smart contract guarantees payment

### For Insurers
- **Fraud Reduction** - Cryptographic proofs prevent fake claims
- **Lower OpEx** - Automated verification, no manual review
- **New Market** - Access crypto-native users

## Revenue Model

### Option A: Premium Share
- Take 5-10% of premium as protocol fee
- Aligned with policy volume growth

### Option B: Per-Claim Fee
- Charge fixed fee per claim processed
- Aligned with usage

### Option C: B2B SaaS
- License technology to existing insurers
- Monthly/annual subscription

## Target Market

### Phase 1: Thailand (POC)
- Private hospitals with patient portals (Bangkok Hospital, Bumrungrad)
- Crypto-native users (~600K overlap with insurance holders)
- Simple products (accident, OPD)

### Phase 2: Southeast Asia
- Singapore, Vietnam, Indonesia
- Partner with regional insurers
- Expand product lines

### Phase 3: Global
- Medical tourism markets
- Cross-border claims
- CBDC integration

## Go-to-Market Strategy

### B2B2C (Recommended)
1. Partner with Tier 2 insurer (Dhipaya, Navakij)
2. They provide: License, capital, distribution
3. We provide: zkTLS verification, settlement tech
4. Revenue: Per-claim fee or premium share

### Why B2B2C over B2C?
- No OIC license needed (partner has it)
- No actuarial team needed
- No claims reserve capital needed
- Faster time to market (6 months vs 2+ years)

## Competitive Landscape

### Direct Competitors
| Company | Model | Health Insurance? |
|---------|-------|-------------------|
| Nexus Mutual | DeFi coverage | No |
| Etherisc | Parametric | No |
| InsurAce | Protocol coverage | No |

**No direct competitor in ZK health insurance.**

### Indirect Competitors (Thailand)
| Company | Threat | Our Advantage |
|---------|--------|---------------|
| Sunday Insurance | High | Privacy + instant settlement |
| Roojai | High | Privacy + crypto-native |
| Traditional insurers | Medium | Speed + innovation |

## Key Metrics

### POC Success Criteria
- 100+ registered policies
- 10+ claims processed
- <5 minute claim settlement time
- 1 hospital partner integrated

### Series A Targets
- 5,000+ active policies
- 500+ claims/month
- 3+ hospital partners
- 1 insurance partner signed

## Risk Factors

| Risk | Severity | Mitigation |
|------|----------|------------|
| Regulatory (OIC) | High | B2B partnership, proactive engagement |
| Hospital integration | High | Start with patient-side proofs |
| User adoption | Medium | Hide crypto complexity, fiat on-ramp |
| zkTLS reliability | Medium | Multi-provider fallback |

## Financial Projections (Conservative)

### Year 1
- Users: 1,000-5,000
- Avg Premium: 8,000 THB
- Premium Volume: 8-40M THB
- Revenue (10% take): 0.8-4M THB

### Year 2
- Users: 10,000-20,000
- Premium Volume: 80-160M THB
- Revenue: 8-16M THB

### Year 3
- Users: 50,000+
- Premium Volume: 400M+ THB
- Revenue: 40M+ THB