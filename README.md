# Stack AI Take Home

[**View Live Demo**](https://stackai-take-home-kai.vercel.app)

## 📹 Demo Video

[Screen recording]

## ️Local Development Setup

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/atefkbenothman/stackai-take-home.git
   cd stackai-take-home
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**

   Create a `.env` file in the root directory:

   ```bash
   # Credentials
   EMAIL="email"
   PASSWORD="password"

   # Stack AI API configuration
   STACK_AI_API_URL="stack_ai_api_url"
   STACK_AI_AUTH_URL="stack_ai_auth_url"
   SUPABASE_ANON_KEY="stack_ai_supabase_anon_key"

   NEXT_PUBLIC_STACK_AI_API_URL="stack_ai_api_url"
   ```

4. **Start the development server**

```bash
npm run dev
```

5. **Open your browser**

   Visit [http://localhost:3000](http://localhost:3000)

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui components
- **Data Fetching / Caching**: TanStack Query
- **Icons**: Lucide React
- **State Management**: Zustand

## Technical Choices

### API Architecture

- **Security**: Credentials stay server-side, client receives JWT tokens
- **Direct API calls**: Client calls Stack AI directly after initial auth

### Data Fetching & Performance

- **Lazy loading**: Load folder contents only when user opens them
- **Hover prefetch**: Prefetch folder contents on mouse hover
- **Cross-cache search**: Search across all cached folder data, not just current folder
- **Parent/child deduplication**: Only indexes parent folders when both folder and child files are selected
- **3-second polling**: Poll indexing status every 3 seconds, timeout after 5 minutes
- **Zustand selection state**: Minimizes re-renders with selective subscriptions per component
- **Optimistic UI**: Show immediate updates, rollback on errors
- **Skeleton loading**: Show content placeholders instead of spinners
