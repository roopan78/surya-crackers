Act as a senior Angular enterprise architect. Build the complete, mobile-responsive frontend workspace for a Firecrackers / Fireworks retail e-commerce application using Angular (latest stable version with standalone components), Tailwind CSS, and Lucide Angular icons. 

We are focusing exclusively on the frontend architecture, local state management, and client-side view routing. Do not include API integrations or backend logic yet. Use local state and localStorage.

### Core Architecture & State Requirements

1. Architecture Layout & Mock Assets (`src/app/core/models/` & `mock-data.ts`)
- Setup explicit TypeScript interfaces and a mock data asset file containing populated structures for:
  * Category: id, name, slug, image.
  * Product: id, name, categorySlug, price, boxQuantity (e.g., "10 Pcs per box"), imageUrl, videoUrl (YouTube watch link format), safetyInstructions (string), isFeatured.
  * CarouselBanner: id, title, subtitle, imageUrl, sortOrder.
  * FooterConfig: shopName, address, licenseNumber, phone, whatsappNumber, safetyDisclaimer.

2. Global Cart State Manager (`src/app/core/services/cart.service.ts`)
- Implement a centralized service using Angular Signals (`signal`, `computed`) to track cart array modifications, line-item quantity box calculations, and cart totals.
- Ensure the state synchronizes automatically with `localStorage` so items persist across application reloads.

3. Statutory 18+ Age Gate Guard & Component (`src/app/core/guards/age.guard.ts`)
- Implement a functional route guard (`CanActivateFn`) that checks a user's local verification state.
- If unverified, redirect users to a high-urgency, full-screen interstitial view (`/age-verification`) that blocks access until they confirm they are 18+ (caching approval in localStorage) or exits out to Google.

### Core View Routing & Interface Components

4. Customer Storefront Interfaces
- Homepage (`/`): A standalone view rendering a managed Hero Carousel component, horizontal category navigation pill components, an inventory item grid featuring a custom ProductCard component, and a prominent safety notice area.
- Product Detail View (`/product/:id`): Split layout displaying gallery spaces on the left, and pricing data, box packing specifics, and safety matrices on the right. 
  * CRUCIAL: Include a custom component or pipe that processes standard YouTube watch links, sanitizes them via Angular's `DomSanitizer`, and renders an un-throttled embedded iframe to display the firecracker effect safely.
- Cart & Checkout Page (`/checkout`): Itemized ledger review with granular quantity counters. Implements an Angular Reactive Form collecting delivery criteria (Name, Full Address, Phone, Target Date).

5. The WhatsApp Payload Utility
- In the checkout component, clicking "Confirm Order via WhatsApp" must process the form parameters and cart signals through a dedicated utility method.
- It must generate a clean, double-spaced plain text invoice payload, encode it safely, and trigger a `window.open(https://wa.me/...)` instance launching the order directly to the admin.

6. Admin Dashboard Modules (`/admin/*`)
- Establish an admin workspace parent shell containing a persistent modular navigation sidebar.
- Build clean Reactive Form validation layouts (with input fields, boolean switches, and empty image file placeholders) representing layout control for:
  * Category Management Dashboard
  * Product Addition Panel
  * Carousel Management Slider
  * Footer Configuration Matrix

### Execution Output Requirement
Generate the modular folder structure layout (`src/app/core/`, `src/app/shared/`, `src/app/features/`) and the complete TypeScript code blocks for these views, components, services, and routing rules. Apply a dark-slate aesthetic with intense amber/red utility button configurations suited for a fireworks marketplace.