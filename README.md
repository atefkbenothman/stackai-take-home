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
   DEMO_EMAIL="email"
   DEMO_PASSWORD="password"

   # Stack AI API configuration
   STACK_AI_API_URL="stack_ai_api_url"
   STACK_AI_AUTH_URL="stack_ai_auth_url"
   SUPABASE_ANON_KEY="stack_ai_supabase_anon_key"
   ```

4. **Start the development server**

   ```bash
   npm run dev
   ```

5. **Open your browser**

   Visit [http://localhost:3000](http://localhost:3000)

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Data Fetching**: Tanstack Query
- **Authentication**: JWT with cookie caching
- **Deployment**: Vercel
