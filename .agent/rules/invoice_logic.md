---
trigger: always_on
---

# Invoicing & Tax Logic
- [cite_start]Template Layout: Follow the A4 structure from [cite: 1-15].
- Tax Strategy: Use inclusive back-calculation. Base = Total / (1 + tax_rate).
- Numbering: Auto-increment invoice numbers globally. Handle financial year resets automatically but maintain uniqueness.
- Currencies: Default to INR. Support USD/EUR via Frankfurter API.
- Formatting: 
    - [cite_start]Implement "Rupees in Words" for INR totals[cite: 15].
    - [cite_start]Display Bank Details clearly in the footer.
    - [cite_start]Highlight 'Authorised Signatory' with an overlay area for digitized signatures[cite: 12, 13].