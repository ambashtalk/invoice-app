# Skill: Digitized Signature Processor
- Description: Converts signature photos into transparent PNGs using alpha-channel masking.
- Implementation: Use the `sharp` library.
- logic: 
    1. Input: Image buffer (JPG/PNG).
    2. Operation: Threshold-based background removal (White -> Alpha).
    3. Output: Transparent PNG buffer for overlay on PDF.