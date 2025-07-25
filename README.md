# Stack AI Take Home

[**View Live Demo**](https://stackai-take-home-kai.vercel.app)

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
- **State Management**: React state + Zustand (selection only)

## Features

• **Google Drive-style File Picker** – browse folders, view files, and navigate just like Finder.
• **Search, Sort & Filter** – instant search by name, sort by name/date, and filter by file extension.
• **Optimistic Indexing Workflow** – select files/folders and trigger indexing into Stack AI Knowledge Bases with immediate UI feedback.
• **Real-time Status Badges** – clear “Indexed / Pending / Error / Not Indexed” labels for every file.
• **Skeleton Loading** – smooth, spinner-free loading states for a snappy UX.
• **Secure Token Management** – server-side HTTP-only cookies keep the Stack AI token off the client; a lightweight API route exposes a short-lived token to the browser on demand.

## Technical Choices

### API Architecture

- **Security**: Long-lived credentials (email, password, Supabase anon key) stay server-side; the client only ever sees a **short-lived, Stack AI-scoped JWT**.
- **Scoped Token Exposure**: `/api/auth/token` hands the browser just the JWT plus `org_id` / `connection_id`
- **Simplicity & Performance**: After that single proxy call, the browser talks directly to Stack AI, avoiding extra network hops while still keeping secrets safe.

### Data Fetching & Prefetching Strategy

- **TanStack Query** handles caching, loading states, and background refetching.
- **Lazy Loading of Folders**: child folders aren’t queried until the user expands them, so we never fetch the entire Google-Drive tree up-front.
- **Hover Prefetch**: when you hover a closed folder, we call `queryClient.prefetchQuery` (see `useFolderOperations`) so the data is already in cache by the time you click—no visible spinner.
- **Cache Re-use**: each folder is cached under `['files', folderId]`; navigating back to a folder re-uses that cached response instantly.
- **StaleTime = 5 min** strikes a balance between responsiveness and freshness, reducing network chatter during a session.
- **Optimistic UI updates** provide instant feedback with error rollback for better UX.
