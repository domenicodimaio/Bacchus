# Blood Alcohol Concentration (BAC) Calculator App Specification

## Table of Contents
- [1. App Overview](#1-app-overview)
- [2. User Flow](#2-user-flow)
  - [2.1. Welcome & Onboarding](#21-welcome--onboarding)
  - [2.2. Main Dashboard](#22-main-dashboard)
  - [2.3. Logging Consumption Events](#23-logging-consumption-events)
  - [2.4. Results & Alerts](#24-results--alerts)
- [3. Detailed Features](#3-detailed-features)
  - [3.1. User Profiles](#31-user-profiles)
  - [3.2. Modes of Operation](#32-modes-of-operation)
  - [3.3. Consumption Logging](#33-consumption-logging)
  - [3.4. BAC Calculation Module](#34-bac-calculation-module)
  - [3.5. Dashboard & History](#35-dashboard--history)
  - [3.6. Notifications & Safety](#36-notifications--safety)
- [4. Technical Architecture](#4-technical-architecture)
  - [4.1. Frontend (Mobile App)](#41-frontend-mobile-app)
  - [4.2. Backend & API](#42-backend--api)
- [5. Additional Considerations](#5-additional-considerations)
- [6. Conclusion](#6-conclusion)
- [7. Database Schema](#7-database-schema)
- [8. App Folder Structure](#8-app-folder-structure)

This document details the app flow, features, and requirements for a mobile app that calculates a user's blood alcohol level (in g/L) based on their personal data and consumption history. The app is designed for both iOS and Android platforms and includes two modes—Advanced and Simple—as well as multi-profile support.

## Tech Stack
- Frontend: React Native with TypeScript, Expo, and Expo Router
- Backend/Database: Supabase
- UI Framework: React Native Paper
- AI Processing: DeepSeek

## 1. App Overview

### App Purpose
- Provide users with an accurate estimation of their blood alcohol concentration (BAC) in g/L
- Allow users to log their food and alcohol consumption in detail (Advanced Mode) or via approximate entries (Simple Mode)

### Key Selling Points
- Clean, modern, and intuitive design
- Multi-profile management to personalize calculations
- Real-time BAC updates with safety notifications
- Cross-platform compatibility (iOS & Android)

## 2. User Flow

### 2.1. Welcome & Onboarding

#### Welcome Screen
- A clean and minimalistic welcome screen with the app logo and tagline
- Option to view a brief introduction or tutorial on how the app works

#### User Registration / Login
- **Sign Up Options:** Users can sign up using:
  - Apple ID
  - Google Account
  - Email and password
- **Onboarding Process:**  
  - Brief walkthrough of key features
  - Option to create a user profile (enter name, weight, age, typical drinking frequency)

### 2.2. Main Dashboard

#### Dashboard Overview
- Displays current estimated BAC in g/L
- Shows a timeline or graph of BAC changes over the session
- Quick-access buttons for logging food and drink events

#### Profile Selection
- Users can select a previously created profile or create a new one
- Profiles store parameters such as:
  - Name
  - Weight
  - Age
  - Drinking frequency (to help calibrate metabolism and absorption rates)

#### Mode Selection
- **Advanced Mode:** For users who want precise BAC estimates
- **Simple Mode:** For quick estimates when exact details are unavailable

### 2.3. Logging Consumption Events

#### Advanced Mode
- **Alcohol Logging:**
  - Input fields for exact time of consumption
  - Quantity (in milliliters or standard drink units)
  - Type of beverage (with alcohol percentage)
- **Food Logging:**
  - Input fields for exact time and quantity of food consumed
  - Option to specify food type (if it affects alcohol absorption)
- These detailed logs are used in the BAC calculation algorithm for high precision

#### Simple Mode
- **Quick Entry:**
  - Users can input approximate details like "3 drinks at 8 PM" or "ate dinner" without precise quantities or timestamps
  - The app uses default parameters from the selected profile to estimate BAC
- Designed for fast input when users may not remember all details

#### Session Logging
- During an active drinking session, users can continuously add new events (food or drink)
- The app updates the BAC estimate in real-time without requiring re-entry of profile data

### 2.4. Results & Alerts

#### Real-Time BAC Calculation
- The dashboard continuously updates the BAC based on new log entries
- Uses an enhanced version of the Widmark formula, adjusted by factors such as food intake and personal profile data

#### Visual Feedback
- Graphs or progress bars showing the evolution of BAC over time
- Color-coded alerts (e.g., green for safe, yellow for caution, red for dangerous levels)

#### Safety Notifications
- When BAC exceeds safe thresholds (e.g., legal driving limits), the app sends push notifications advising the user to avoid driving or seek medical help if necessary

## 3. Detailed Features

### 3.1. User Profiles

#### Creation & Management
- Users can create multiple profiles
- Each profile includes:
  - Name
  - Weight (in kilograms)
  - Age
  - Typical drinking frequency (e.g., rarely, occasionally, frequently)

#### Benefits
- Saves users from re-entering personal parameters each session
- Allows the app to tailor BAC calculations based on long-term habits and physiological differences

### 3.2. Modes of Operation

#### Advanced Mode
- Requires detailed inputs (exact times, quantities, beverage details, food intake)
- Provides precise BAC estimations
- Best for users who wish to monitor their consumption closely

#### Simple Mode
- Requires minimal inputs (approximate number of drinks, approximate time)
- Uses profile defaults to estimate BAC
- Best for casual users or quick checks

### 3.3. Consumption Logging

#### Alcohol Logging Form
- Time picker for the exact consumption time
- Input for volume (e.g., ml) and alcohol percentage
- Dropdown for beverage type (optional, for additional precision)

#### Food Logging Form
- Time picker and input for quantity
- Optionally, a dropdown for food type to adjust absorption rates

### 3.4. BAC Calculation Module

#### Algorithm
- Based on the Widmark formula with modifications:

  ```
  BAC = (Alcohol in grams) / (Body Weight in grams × r) - (Metabolism rate × Time elapsed)
  ```

- **r:** The alcohol distribution ratio (different for males and females, customizable per profile)
- **Metabolism rate:** Can be personalized based on typical drinking frequency or defaults
- Adjustments for food intake to simulate slowed absorption

#### Real-Time Update
- The algorithm recalculates BAC dynamically as new events are logged

### 3.5. Dashboard & History

#### Main Dashboard
- Displays current BAC, session timeline, and safety alerts
- Quick action buttons for adding consumption logs

#### Session History
- Users can view past sessions
- Graphs or charts show trends over time
- Option to export data (e.g., CSV) for personal tracking

### 3.6. Notifications & Safety

#### Push Notifications
- Alerts when BAC reaches or exceeds critical thresholds
- Reminders to log additional consumption or food intake

#### Educational Tips
- Information on safe drinking practices
- Disclaimers that the BAC estimate is approximate and not a substitute for professional advice

## 4. Technical Architecture

### 4.1. Frontend (Mobile App)

#### Framework
- Use **Flutter** or **React Native** for a single codebase that works on both iOS and Android
  
#### UI/UX
- Dark mode design with neon accents (e.g., blue and green)
- Smooth animations, fast refresh, and responsive design

### 4.2. Backend & API

#### Cloud Backend
- Options like **Firebase** or **AWS Amplify** for user authentication, data storage, and real-time updates
- Alternatively, a custom RESTful API built with Node.js or Python
  
#### Database
- Use a cloud-based database (e.g., Firestore, MongoDB, or SQL) to store user profiles, consumption logs, and session histories

#### Calculation Service
- A dedicated module (or microservice) that handles BAC calculations
- Can be implemented in the backend or as part of the mobile app code if computationally light

## 5. Additional Considerations

### User Privacy & Data Security
- Ensure all personal and consumption data is securely transmitted and stored
- Compliance with data protection regulations (e.g., GDPR)

### Regulatory Disclaimers
- Clearly state that the BAC calculation is an estimate
- Advise users to seek professional advice for health-related concerns

### Scalability & Future Enhancements
- Plan for additional features such as integration with wearable devices or personalized health recommendations
- Consider A/B testing different calculation parameters to refine accuracy over time

## 6. Conclusion

This app provides a dual-mode approach to estimating BAC, tailored to both detailed and quick input scenarios. With multi-profile support and real-time updates, it aims to offer a user-friendly experience for both casual users and those who need precise monitoring. The architecture leverages modern cross-platform development frameworks and cloud-based backends to ensure scalability, security, and a high-quality user experience on both iOS and Android.

## 7. Database Schema

### Supabase Tables

#### users
| Column       | Type         | Description                               |
|--------------|--------------|-------------------------------------------|
| id           | uuid         | Primary key, generated by Supabase Auth   |
| email        | text         | User's email                              |
| created_at   | timestamp    | Account creation timestamp                |
| updated_at   | timestamp    | Last account update timestamp             |
| last_sign_in | timestamp    | Last authentication timestamp             |

#### profiles
| Column             | Type        | Description                                  |
|--------------------|-------------|----------------------------------------------|
| id                 | uuid        | Primary key                                  |
| user_id            | uuid        | Foreign key to users.id                      |
| name               | text        | Profile name                                 |
| weight             | numeric     | Weight in kg                                 |
| height             | numeric     | Height in cm (optional)                      |
| age                | integer     | Age in years                                 |
| gender             | text        | Gender (affects alcohol distribution ratio)  |
| drinking_frequency | text        | Rarely, occasionally, frequently             |
| is_default         | boolean     | Whether this is the user's default profile   |
| created_at         | timestamp   | Profile creation timestamp                   |
| updated_at         | timestamp   | Last profile update timestamp                |

#### sessions
| Column       | Type         | Description                                |
|--------------|--------------|-------------------------------------------|
| id           | uuid         | Primary key                               |
| user_id      | uuid         | Foreign key to users.id                   |
| profile_id   | uuid         | Foreign key to profiles.id                |
| name         | text         | Optional session name                     |
| start_time   | timestamp    | Session start timestamp                   |
| end_time     | timestamp    | Session end timestamp (nullable)          |
| mode         | text         | 'advanced' or 'simple'                    |
| max_bac      | numeric      | Maximum BAC reached during the session    |
| created_at   | timestamp    | Session creation timestamp                |
| updated_at   | timestamp    | Last session update timestamp             |

#### drinks
| Column       | Type         | Description                                |
|--------------|--------------|-------------------------------------------|
| id           | uuid         | Primary key                               |
| session_id   | uuid         | Foreign key to sessions.id                |
| beverage_id  | uuid         | Foreign key to beverages.id (nullable)    |
| consumption_time | timestamp | Time when drink was consumed             |
| volume_ml    | numeric      | Volume in milliliters                     |
| alcohol_percentage | numeric | Alcohol percentage                       |
| created_at   | timestamp    | Entry creation timestamp                  |
| updated_at   | timestamp    | Last entry update timestamp               |

#### foods
| Column       | Type         | Description                                |
|--------------|--------------|-------------------------------------------|
| id           | uuid         | Primary key                               |
| session_id   | uuid         | Foreign key to sessions.id                |
| consumption_time | timestamp | Time when food was consumed             |
| food_type    | text         | Type of food consumed                    |
| amount       | text         | Amount of food (e.g. "small", "large")   |
| absorption_factor | numeric | Factor to adjust BAC calculation (0-1)   |
| created_at   | timestamp    | Entry creation timestamp                 |
| updated_at   | timestamp    | Last entry update timestamp              |

#### beverages
| Column           | Type        | Description                            |
|------------------|-------------|----------------------------------------|
| id               | uuid        | Primary key                           |
| name             | text        | Beverage name                         |
| category         | text        | Category (beer, wine, spirits, etc.)  |
| default_percentage | numeric   | Default alcohol percentage            |
| created_at       | timestamp   | Entry creation timestamp              |
| updated_at       | timestamp   | Last entry update timestamp           |

#### bac_history
| Column           | Type        | Description                            |
|------------------|-------------|----------------------------------------|
| id               | uuid        | Primary key                           |
| session_id       | uuid        | Foreign key to sessions.id            |
| timestamp        | timestamp   | Calculation timestamp                 |
| bac_value        | numeric     | Calculated BAC value                  |
| alcohol_grams    | numeric     | Total alcohol grams in bloodstream    |
| created_at       | timestamp   | Entry creation timestamp              |

## 8. App Folder Structure

```
/app
  ├── assets/                  # Images, fonts, etc.
  │   ├── images/              # App images and icons
  │   ├── fonts/               # Custom fonts
  │   └── animations/          # Lottie animations
  │
  ├── components/              # Reusable UI components
  │   ├── common/              # Buttons, inputs, cards, etc.
  │   ├── forms/               # Form components
  │   ├── charts/              # BAC visualization components
  │   ├── modals/              # Modal components
  │   └── layout/              # Layout components
  │
  ├── hooks/                   # Custom React hooks
  │   ├── useAuth.ts           # Authentication hook
  │   ├── useProfiles.ts       # Profiles management hook
  │   ├── useSession.ts        # Active session hook
  │   └── useBAC.ts            # BAC calculation hook
  │
  ├── lib/                     # Utility functions and services
  │   ├── supabase.ts          # Supabase client setup
  │   ├── bac/                 # BAC calculation logic
  │   │   ├── calculator.ts    # BAC calculation algorithm
  │   │   ├── factors.ts       # Adjustment factors
  │   │   └── utils.ts         # Helper utilities
  │   └── ai/                  # DeepSeek AI integration
  │       ├── client.ts        # AI client configuration
  │       └── helpers.ts       # AI processing helpers
  │
  ├── screens/                 # App screens
  │   ├── auth/                # Auth screens
  │   │   ├── Login.tsx        # Login screen
  │   │   └── SignUp.tsx       # Sign up screen
  │   ├── onboarding/          # Onboarding screens
  │   ├── dashboard/           # Main dashboard
  │   ├── profiles/            # Profile management
  │   └── logging/             # Consumption logging screens
  │       ├── advanced/        # Advanced mode screens
  │       └── simple/          # Simple mode screens
  │
  ├── store/                   # State management 
  │   ├── slices/              # Redux slices or context
  │   │   ├── authSlice.ts     # Authentication state
  │   │   ├── profileSlice.ts  # Profiles state
  │   │   └── sessionSlice.ts  # Session state
  │   └── index.ts             # Store configuration
  │
  ├── types/                   # TypeScript type definitions
  │   ├── supabase.ts          # Database types
  │   ├── navigation.ts        # Navigation types
  │   └── bac.ts               # BAC calculation types
  │
  ├── constants/               # App constants
  │   ├── theme.ts             # UI theme constants
  │   ├── routes.ts            # Route names
  │   └── limits.ts            # BAC limit constants
  │
  └── app/                     # Expo Router pages
      ├── index.tsx            # Home/entry screen
      ├── auth/                # Auth routes
      │   ├── login.tsx        # Login route
      │   └── signup.tsx       # Signup route
      ├── dashboard/           # Dashboard routes
      │   ├── index.tsx        # Main dashboard
      │   └── history.tsx      # Session history
      ├── profiles/            # Profile routes
      │   ├── index.tsx        # Profile list
      │   ├── [id].tsx         # Profile details
      │   └── create.tsx       # Create profile
      ├── session/             # Active session routes
      │   ├── index.tsx        # Session overview
      │   ├── add-drink.tsx    # Add drink
      │   └── add-food.tsx     # Add food
      └── _layout.tsx          # Root layout component
```

---

*End of Specification*

This detailed specification should provide a clear blueprint for app developers to understand and implement the solution. If you have any further questions or require additional details, please let me know!
