-- ============================================================================
-- LIFELENS COMMAND - Push Notifications & Subscriptions Schema
-- ============================================================================

-- 1. NOTIFICATION SUBSCRIPTIONS (Web Push Subscriptions per user)
CREATE TABLE IF NOT EXISTS public.notification_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL UNIQUE,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 2. NOTIFICATIONS (In-app + Sent push notification records)
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('TASK_DEADLINE', 'PROJECT_DEADLINE', 'TASK_OVERDUE', 'DAILY_SUMMARY', 'REMINDER', 'SYSTEM')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
    project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
    reminder_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
    scheduled_for TIMESTAMPTZ NOT NULL,
    sent_at TIMESTAMPTZ,
    read_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'sent', 'failed', 'cancelled')),
    payload JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 3. NOTIFICATION PREFERENCES (Per user configurable controls)
CREATE TABLE IF NOT EXISTS public.notification_preferences (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    push_enabled BOOLEAN DEFAULT FALSE NOT NULL,
    task_deadlines_enabled BOOLEAN DEFAULT TRUE NOT NULL,
    project_deadlines_enabled BOOLEAN DEFAULT TRUE NOT NULL,
    reminders_enabled BOOLEAN DEFAULT TRUE NOT NULL,
    overdue_enabled BOOLEAN DEFAULT TRUE NOT NULL,
    daily_summary_enabled BOOLEAN DEFAULT FALSE NOT NULL,
    daily_summary_time TEXT DEFAULT '09:00' NOT NULL,
    task_reminder_timings JSONB DEFAULT '["24h", "2h", "at_deadline"]'::jsonb NOT NULL,
    project_reminder_timings JSONB DEFAULT '["24h", "at_deadline"]'::jsonb NOT NULL,
    timezone TEXT DEFAULT 'UTC' NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_notification_subs_user ON public.notification_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_status ON public.notifications(user_id, status);
CREATE INDEX IF NOT EXISTS idx_notifications_scheduled ON public.notifications(scheduled_for, status);
CREATE INDEX IF NOT EXISTS idx_notifications_read_at ON public.notifications(read_at);

-- ROW LEVEL SECURITY (RLS)
ALTER TABLE public.notification_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- Subscriptions RLS
CREATE POLICY "Users can view own subscriptions" ON public.notification_subscriptions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own subscriptions" ON public.notification_subscriptions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own subscriptions" ON public.notification_subscriptions
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own subscriptions" ON public.notification_subscriptions
    FOR DELETE USING (auth.uid() = user_id);

-- Notifications RLS
CREATE POLICY "Users can view own notifications" ON public.notifications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notifications" ON public.notifications
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON public.notifications
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own notifications" ON public.notifications
    FOR DELETE USING (auth.uid() = user_id);

-- Preferences RLS
CREATE POLICY "Users can view own preferences" ON public.notification_preferences
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences" ON public.notification_preferences
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences" ON public.notification_preferences
    FOR UPDATE USING (auth.uid() = user_id);
