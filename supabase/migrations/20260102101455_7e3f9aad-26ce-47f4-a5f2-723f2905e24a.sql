-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('hq_admin', 'hq_staff', 'area_manager', 'performance_viewer');

-- Create enum for message types
CREATE TYPE public.message_type AS ENUM ('announcement', 'actionable');

-- Create enum for task status
CREATE TYPE public.task_status AS ENUM ('pending', 'in_progress', 'completed', 'overdue');

-- Create enum for proof status
CREATE TYPE public.proof_status AS ENUM ('pending_approval', 'approved', 'rejected');

-- Create enum for task recurrence
CREATE TYPE public.task_recurrence AS ENUM ('none', 'daily', 'weekly', 'monthly');

-- Create enum for task priority
CREATE TYPE public.task_priority AS ENUM ('low', 'medium', 'high', 'critical');

-- Create stores table
CREATE TABLE public.stores (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    store_code VARCHAR(20) NOT NULL UNIQUE,
    store_name VARCHAR(100) NOT NULL,
    region VARCHAR(50),
    store_type VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create profiles table for HQ users
CREATE TABLE public.profiles (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL,
    full_name VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    UNIQUE (user_id, role)
);

-- Create user_store_access table (which stores a user can access)
CREATE TABLE public.user_store_access (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE NOT NULL,
    can_access_all_stores BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, store_id)
);

-- Create messages table for communications
CREATE TABLE public.messages (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    body TEXT NOT NULL,
    message_type message_type NOT NULL DEFAULT 'announcement',
    require_acknowledgment BOOLEAN DEFAULT false,
    sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create message_store_targets (which stores receive a message)
CREATE TABLE public.message_store_targets (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    message_id UUID REFERENCES public.messages(id) ON DELETE CASCADE NOT NULL,
    store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE NOT NULL,
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP WITH TIME ZONE,
    is_acknowledged BOOLEAN DEFAULT false,
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    UNIQUE (message_id, store_id)
);

-- Create message_attachments table
CREATE TABLE public.message_attachments (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    message_id UUID REFERENCES public.messages(id) ON DELETE CASCADE NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    file_type VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create message_replies table
CREATE TABLE public.message_replies (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    message_id UUID REFERENCES public.messages(id) ON DELETE CASCADE NOT NULL,
    store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE NOT NULL,
    reply_text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create tasks table
CREATE TABLE public.tasks (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    priority task_priority DEFAULT 'medium',
    due_date DATE,
    due_time TIME,
    recurrence task_recurrence DEFAULT 'none',
    require_photo BOOLEAN DEFAULT false,
    require_checklist BOOLEAN DEFAULT false,
    require_numeric_input BOOLEAN DEFAULT false,
    require_comments BOOLEAN DEFAULT false,
    is_campaign BOOLEAN DEFAULT false,
    campaign_name VARCHAR(100),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create task_store_assignments (which stores are assigned a task)
CREATE TABLE public.task_store_assignments (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
    store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE NOT NULL,
    status task_status DEFAULT 'pending',
    completed_at TIMESTAMP WITH TIME ZONE,
    is_on_time BOOLEAN,
    UNIQUE (task_id, store_id)
);

-- Create task_proofs table
CREATE TABLE public.task_proofs (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    task_assignment_id UUID REFERENCES public.task_store_assignments(id) ON DELETE CASCADE NOT NULL,
    proof_type VARCHAR(50) NOT NULL,
    proof_url TEXT,
    proof_value TEXT,
    status proof_status DEFAULT 'pending_approval',
    reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create task_checklist_items table
CREATE TABLE public.task_checklist_items (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
    item_text VARCHAR(200) NOT NULL,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create store_daily_performance table
CREATE TABLE public.store_daily_performance (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    target_sales DECIMAL(12, 2) DEFAULT 0,
    actual_sales DECIMAL(12, 2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (store_id, date)
);

-- Create goals table
CREATE TABLE public.goals (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    goal_type VARCHAR(50) NOT NULL,
    target_value DECIMAL(12, 2) NOT NULL,
    current_value DECIMAL(12, 2) DEFAULT 0,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create goal_store_targets table
CREATE TABLE public.goal_store_targets (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    goal_id UUID REFERENCES public.goals(id) ON DELETE CASCADE NOT NULL,
    store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE NOT NULL,
    target_value DECIMAL(12, 2) NOT NULL,
    current_value DECIMAL(12, 2) DEFAULT 0,
    UNIQUE (goal_id, store_id)
);

-- Enable RLS on all tables
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_store_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_store_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_store_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_proofs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_daily_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goal_store_targets ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to check if user can access a store
CREATE OR REPLACE FUNCTION public.can_access_store(_user_id UUID, _store_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_store_access
    WHERE user_id = _user_id
      AND (can_access_all_stores = true OR store_id = _store_id)
  )
$$;

-- Create function to get user's accessible store IDs
CREATE OR REPLACE FUNCTION public.get_user_store_ids(_user_id UUID)
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE 
    WHEN EXISTS (SELECT 1 FROM user_store_access WHERE user_id = _user_id AND can_access_all_stores = true)
    THEN (SELECT id FROM stores WHERE is_active = true)
    ELSE (SELECT store_id FROM user_store_access WHERE user_id = _user_id)
  END
$$;

-- RLS Policies for stores
CREATE POLICY "Authenticated users can view stores they have access to"
ON public.stores FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_store_access 
    WHERE user_id = auth.uid() 
    AND (can_access_all_stores = true OR store_id = stores.id)
  )
);

CREATE POLICY "HQ Admins can manage stores"
ON public.stores FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'hq_admin'))
WITH CHECK (public.has_role(auth.uid(), 'hq_admin'));

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "HQ Admins can view all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'hq_admin'));

CREATE POLICY "HQ Admins can manage profiles"
ON public.profiles FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'hq_admin'))
WITH CHECK (public.has_role(auth.uid(), 'hq_admin'));

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "HQ Admins can manage roles"
ON public.user_roles FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'hq_admin'))
WITH CHECK (public.has_role(auth.uid(), 'hq_admin'));

-- RLS Policies for user_store_access
CREATE POLICY "Users can view their own store access"
ON public.user_store_access FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "HQ Admins can manage store access"
ON public.user_store_access FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'hq_admin'))
WITH CHECK (public.has_role(auth.uid(), 'hq_admin'));

-- RLS Policies for messages
CREATE POLICY "Authenticated users can view messages for their stores"
ON public.messages FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM message_store_targets mst
    JOIN user_store_access usa ON usa.store_id = mst.store_id OR usa.can_access_all_stores = true
    WHERE mst.message_id = messages.id AND usa.user_id = auth.uid()
  )
);

CREATE POLICY "HQ Staff and Admins can create messages"
ON public.messages FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'hq_admin') OR public.has_role(auth.uid(), 'hq_staff')
);

CREATE POLICY "HQ Staff and Admins can update messages"
ON public.messages FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'hq_admin') OR public.has_role(auth.uid(), 'hq_staff')
);

-- RLS Policies for message_store_targets
CREATE POLICY "Users can view message targets for their stores"
ON public.message_store_targets FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_store_access 
    WHERE user_id = auth.uid() 
    AND (can_access_all_stores = true OR store_id = message_store_targets.store_id)
  )
);

CREATE POLICY "HQ Staff and Admins can manage message targets"
ON public.message_store_targets FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'hq_admin') OR public.has_role(auth.uid(), 'hq_staff')
)
WITH CHECK (
  public.has_role(auth.uid(), 'hq_admin') OR public.has_role(auth.uid(), 'hq_staff')
);

-- RLS Policies for message_attachments
CREATE POLICY "Users can view attachments for messages they can see"
ON public.message_attachments FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM messages m
    JOIN message_store_targets mst ON mst.message_id = m.id
    JOIN user_store_access usa ON usa.store_id = mst.store_id OR usa.can_access_all_stores = true
    WHERE m.id = message_attachments.message_id AND usa.user_id = auth.uid()
  )
);

CREATE POLICY "HQ Staff and Admins can manage attachments"
ON public.message_attachments FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'hq_admin') OR public.has_role(auth.uid(), 'hq_staff')
)
WITH CHECK (
  public.has_role(auth.uid(), 'hq_admin') OR public.has_role(auth.uid(), 'hq_staff')
);

-- RLS Policies for message_replies
CREATE POLICY "Users can view replies for their stores"
ON public.message_replies FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_store_access 
    WHERE user_id = auth.uid() 
    AND (can_access_all_stores = true OR store_id = message_replies.store_id)
  )
);

CREATE POLICY "HQ Staff and Admins can manage replies"
ON public.message_replies FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'hq_admin') OR public.has_role(auth.uid(), 'hq_staff')
)
WITH CHECK (
  public.has_role(auth.uid(), 'hq_admin') OR public.has_role(auth.uid(), 'hq_staff')
);

-- RLS Policies for tasks
CREATE POLICY "Users can view tasks for their stores"
ON public.tasks FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM task_store_assignments tsa
    JOIN user_store_access usa ON usa.store_id = tsa.store_id OR usa.can_access_all_stores = true
    WHERE tsa.task_id = tasks.id AND usa.user_id = auth.uid()
  )
);

CREATE POLICY "HQ Staff and Admins can manage tasks"
ON public.tasks FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'hq_admin') OR public.has_role(auth.uid(), 'hq_staff')
)
WITH CHECK (
  public.has_role(auth.uid(), 'hq_admin') OR public.has_role(auth.uid(), 'hq_staff')
);

-- RLS Policies for task_store_assignments
CREATE POLICY "Users can view task assignments for their stores"
ON public.task_store_assignments FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_store_access 
    WHERE user_id = auth.uid() 
    AND (can_access_all_stores = true OR store_id = task_store_assignments.store_id)
  )
);

CREATE POLICY "HQ Staff and Admins can manage task assignments"
ON public.task_store_assignments FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'hq_admin') OR public.has_role(auth.uid(), 'hq_staff')
)
WITH CHECK (
  public.has_role(auth.uid(), 'hq_admin') OR public.has_role(auth.uid(), 'hq_staff')
);

-- RLS Policies for task_proofs
CREATE POLICY "Users can view proofs for their stores"
ON public.task_proofs FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM task_store_assignments tsa
    JOIN user_store_access usa ON usa.store_id = tsa.store_id OR usa.can_access_all_stores = true
    WHERE tsa.id = task_proofs.task_assignment_id AND usa.user_id = auth.uid()
  )
);

CREATE POLICY "HQ Staff and Admins can manage proofs"
ON public.task_proofs FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'hq_admin') OR public.has_role(auth.uid(), 'hq_staff')
)
WITH CHECK (
  public.has_role(auth.uid(), 'hq_admin') OR public.has_role(auth.uid(), 'hq_staff')
);

-- RLS Policies for task_checklist_items
CREATE POLICY "Users can view checklist items for tasks they can see"
ON public.task_checklist_items FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM tasks t
    JOIN task_store_assignments tsa ON tsa.task_id = t.id
    JOIN user_store_access usa ON usa.store_id = tsa.store_id OR usa.can_access_all_stores = true
    WHERE t.id = task_checklist_items.task_id AND usa.user_id = auth.uid()
  )
);

CREATE POLICY "HQ Staff and Admins can manage checklist items"
ON public.task_checklist_items FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'hq_admin') OR public.has_role(auth.uid(), 'hq_staff')
)
WITH CHECK (
  public.has_role(auth.uid(), 'hq_admin') OR public.has_role(auth.uid(), 'hq_staff')
);

-- RLS Policies for store_daily_performance
CREATE POLICY "Users can view performance for their stores"
ON public.store_daily_performance FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_store_access 
    WHERE user_id = auth.uid() 
    AND (can_access_all_stores = true OR store_id = store_daily_performance.store_id)
  )
);

CREATE POLICY "HQ Staff and Admins can manage performance data"
ON public.store_daily_performance FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'hq_admin') OR public.has_role(auth.uid(), 'hq_staff')
)
WITH CHECK (
  public.has_role(auth.uid(), 'hq_admin') OR public.has_role(auth.uid(), 'hq_staff')
);

-- RLS Policies for goals
CREATE POLICY "Users can view goals"
ON public.goals FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "HQ Staff and Admins can manage goals"
ON public.goals FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'hq_admin') OR public.has_role(auth.uid(), 'hq_staff')
)
WITH CHECK (
  public.has_role(auth.uid(), 'hq_admin') OR public.has_role(auth.uid(), 'hq_staff')
);

-- RLS Policies for goal_store_targets
CREATE POLICY "Users can view goal targets for their stores"
ON public.goal_store_targets FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_store_access 
    WHERE user_id = auth.uid() 
    AND (can_access_all_stores = true OR store_id = goal_store_targets.store_id)
  )
);

CREATE POLICY "HQ Staff and Admins can manage goal targets"
ON public.goal_store_targets FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'hq_admin') OR public.has_role(auth.uid(), 'hq_staff')
)
WITH CHECK (
  public.has_role(auth.uid(), 'hq_admin') OR public.has_role(auth.uid(), 'hq_staff')
);

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data ->> 'full_name');
  RETURN NEW;
END;
$$;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Add updated_at triggers to relevant tables
CREATE TRIGGER update_stores_updated_at BEFORE UPDATE ON public.stores FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON public.messages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_performance_updated_at BEFORE UPDATE ON public.store_daily_performance FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();