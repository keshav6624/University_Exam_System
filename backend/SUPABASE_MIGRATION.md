# Supabase Migration Guide

This project has been migrated from PostgreSQL to **Supabase** - a Firebase alternative with PostgreSQL as the backend.

## What Changed

- **Database Layer**: Replaced local PostgreSQL with Supabase PostgreSQL
- **Dependencies**: Removed `pg` and added `@supabase/supabase-js`
- **Configuration**: Updated [config/database.js](config/database.js) to use Supabase connection string
- **Environment Variables**: Updated `.env` to use Supabase credentials

## Setup Instructions

### Step 1: Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Sign up or log in
3. Click "New Project"
4. Fill in project details:
   - **Project Name**: `university-exam-system` (or your preferred name)
   - **Database Password**: Create a strong password
   - **Region**: Choose your region
   - Click "Create new project"

### Step 2: Get Your Credentials

Once your project is created, go to **Project Settings** > **API** to find:

1. **SUPABASE_URL**: Your project's URL (e.g., `https://your-project.supabase.co`)
2. **SUPABASE_ANON_KEY**: The anonymous key
3. **SUPABASE_SERVICE_ROLE_KEY**: The service role key (keep this secret!)

Also get your **PostgreSQL Connection String**:
- Go to **Project Settings** > **Database**
- Look for the **Connection string** section
- Select the **Connection pooler** option
- Copy the connection string (format: `postgresql://postgres.xxxxx:password@aws-0-region.pooler.supabase.com:5432/postgres`)

### Step 3: Update .env File

Edit `backend/.env` and fill in:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
DATABASE_URL=postgresql://postgres.xxxxx:YOUR_PASSWORD@aws-0-region.pooler.supabase.com:5432/postgres
```

**Important**: Replace `YOUR_PASSWORD` with the database password you set during project creation.

### Step 4: Install Dependencies

```bash
cd backend
npm install
```

### Step 5: Create Database Schema

You have two options:

#### Option A: Using Supabase SQL Editor (Recommended)

1. Go to your Supabase project
2. Click on **SQL Editor** in the left sidebar
3. Click **New query**
4. Copy the entire content from [schema.sql](schema.sql)
5. Paste it into the SQL editor
6. Click **Run** to create all tables

#### Option B: Using Database Setup Script

```bash
npm run db:setup
```

### Step 6: Seed Sample Data (Optional)

```bash
npm run db:seed
```

### Step 7: Start the Server

```bash
npm run dev
```

The server should now connect to Supabase!

## Key Differences from Local PostgreSQL

| Aspect | Local PostgreSQL | Supabase |
|--------|------------------|----------|
| **Cost** | Free (self-hosted) | Free tier available |
| **Maintenance** | Manual | Managed |
| **Backups** | Manual | Automatic |
| **Scaling** | Manual | Automatic |
| **Connection** | Local network | HTTPS |
| **Security** | Manual SSL | Built-in SSL |

## Troubleshooting

### Connection Issues

**Error**: `"Supabase credentials not found in environment variables"`

- Make sure `.env` file has `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
- Verify credentials are correct

**Error**: `"Supabase PostgreSQL connection error"`

- Check `DATABASE_URL` in `.env`
- Ensure password is correctly escaped if it contains special characters
- Try using the pooler connection string instead of standard connection

### Database Not Found

- Verify you've run the schema creation (Step 5)
- Check that you're using the correct database name in the connection string

### Timeout Errors

- If using a free tier Supabase project, connection might be slower
- Try increasing the connection timeout in [config/database.js](config/database.js)

## Deploying to Production

When deploying your app:

1. Create a new Supabase project for production
2. Get production credentials and connection string
3. Set environment variables in your hosting platform
4. Run database setup script on production database
5. Deploy your application

## Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Supabase Pricing](https://supabase.com/pricing)

## Rolling Back to PostgreSQL

If you need to revert to local PostgreSQL:

1. Install `pg` package again: `npm install pg`
2. Use the original [config/database.js.bak](config/database.js.bak) configuration
3. Update `.env` with local database credentials
4. Run `npm run db:setup`

## Migration Notes

- All SQL queries remain unchanged - they work the same way with Supabase
- The API (controller endpoints) requires no changes
- Authentication flow works the same way
- All features are identical between local and Supabase PostgreSQL
