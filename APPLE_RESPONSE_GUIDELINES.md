# 🍎 RISPOSTA UFFICIALE AD APPLE - REVIEW GUIDELINES

## 📱 **GUIDELINE 4.0 - DESIGN (iPad Compatibility)**

**Risposta:**

```
Dear Apple Review Team,

Regarding Guideline 4.0 - Design (iPad compatibility):

Our app is explicitly configured with "supportsTablet: false" in the iOS configuration and is designed exclusively for iPhone usage. The app should NOT be available on iPad devices.

We believe there may be a configuration issue in App Store Connect or the review process. Could you please:

1. Verify why the app is being tested on iPad despite the "supportsTablet: false" configuration
2. Confirm that iPad is not selected in the "Device Families" section of App Store Connect
3. Conduct the review on iPhone devices only, as intended

We can provide build logs and configuration files showing the supportsTablet: false setting if needed.

The app's UI is specifically designed for iPhone screen sizes and user interactions.
```

## ⚠️ **GUIDELINE 1.4 - PHYSICAL HARM (BAC Calculator)**

**Risposta:**

```
Dear Apple Review Team,

Regarding Guideline 1.4 - Physical Harm:

We understand Apple's concern for user safety and appreciate the opportunity to address this important matter.

Our app is designed as an EDUCATIONAL TOOL, not a medical device. We have implemented comprehensive safety measures:

**ENHANCED SAFETY DISCLAIMERS:**
- Multiple prominent disclaimers throughout the app
- Clear warnings that calculations are for educational purposes only
- Explicit statements that the app does not replace professional medical devices
- Strong advisories against making driving decisions based on app calculations
- Warnings about legal limitations and individual variations

**EDUCATIONAL FOCUS:**
- The app helps users understand alcohol metabolism concepts
- Promotes awareness of alcohol's effects on the body
- Encourages responsible drinking through education
- Provides general information, not medical advice

**SAFETY MEASURES:**
- Prominent warnings on every screen with BAC calculations
- Modal disclaimers that users must acknowledge
- Clear statements about the limitations of software-based calculations
- Emphasis on consulting medical professionals for health matters

**COMPARISON TO EXISTING APPS:**
Many educational apps in the App Store provide similar alcohol awareness tools with appropriate disclaimers. Our app follows the same educational approach with even stronger safety warnings.

We believe our enhanced disclaimers and educational focus address the safety concerns while providing valuable alcohol awareness education to users.

We are committed to user safety and have strengthened our disclaimers significantly. We respectfully request reconsideration of this guideline application to our educational tool.
```

## 🍎 **GUIDELINE 4.0 - DESIGN (Sign in with Apple)**

**Risposta:**

```
Dear Apple Review Team,

Regarding Guideline 4.0 - Design (Sign in with Apple):

We have identified and resolved the issue where our app was requesting name/email information after Apple Sign In.

**CHANGES IMPLEMENTED:**
- Modified the authentication flow to automatically use the name and email provided by Apple Sign In
- Users who sign in with Apple now see their name pre-filled in the profile setup
- Eliminated duplicate requests for information already provided by Apple's Authentication Services framework
- The app now follows Apple's Sign in with Apple design guidelines completely

**TECHNICAL DETAILS:**
- Apple-provided name is automatically saved and used in the profile wizard
- Users can still modify their name if desired, but it's pre-populated from Apple
- No additional email requests are made after Apple Sign In
- The authentication flow now provides the consistent experience users expect

This change ensures full compliance with Sign in with Apple requirements and provides the seamless user experience Apple guidelines specify.
```

## 📋 **SUMMARY OF CHANGES MADE:**

1. ✅ **Enhanced Safety Disclaimers** - Added comprehensive warnings throughout the app
2. ✅ **Apple Sign In Fix** - Pre-populate user data from Apple credentials  
3. ✅ **iPad Configuration** - Confirmed supportsTablet: false setting
4. ✅ **Educational Focus** - Emphasized educational nature over medical device claims

We believe these changes fully address all raised concerns and demonstrate our commitment to user safety and Apple's guidelines.
