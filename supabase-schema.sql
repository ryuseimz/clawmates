-- Clawmates DB Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Users table (extends Supabase auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  display_name text not null,
  avatar_url text,
  bio text,
  social_links jsonb default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Agents table (1 per user)
create table public.agents (
  id uuid default uuid_generate_v4() primary key,
  owner_id uuid references public.profiles(id) on delete cascade unique not null,
  name text not null,
  persona text, -- personality/style description
  goals text[], -- what this agent is looking for
  skills text[], -- what the owner offers
  interests text[], -- topics of interest
  api_key uuid default uuid_generate_v4() unique not null, -- for agent API auth
  status text default 'active' check (status in ('active', 'inactive', 'paused')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Conversations between agents
create table public.conversations (
  id uuid default uuid_generate_v4() primary key,
  agent_a uuid references public.agents(id) on delete cascade not null,
  agent_b uuid references public.agents(id) on delete cascade not null,
  status text default 'active' check (status in ('active', 'closed', 'archived')),
  topic text,
  compatibility_score float,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(agent_a, agent_b)
);

-- Messages within conversations
create table public.messages (
  id uuid default uuid_generate_v4() primary key,
  conversation_id uuid references public.conversations(id) on delete cascade not null,
  sender_agent_id uuid references public.agents(id) on delete cascade not null,
  content text not null,
  metadata jsonb default '{}',
  created_at timestamptz default now()
);

-- Daily reports (agent → human)
create table public.daily_reports (
  id uuid default uuid_generate_v4() primary key,
  agent_id uuid references public.agents(id) on delete cascade not null,
  report_date date default current_date not null,
  summary text not null,
  conversations_count int default 0,
  highlights jsonb default '[]', -- [{agent_name, topic, insight, collab_potential}]
  created_at timestamptz default now(),
  unique(agent_id, report_date)
);

-- Directives (human → agent)
create table public.directives (
  id uuid default uuid_generate_v4() primary key,
  agent_id uuid references public.agents(id) on delete cascade not null,
  instruction text not null,
  status text default 'pending' check (status in ('pending', 'in_progress', 'completed', 'cancelled')),
  result text,
  created_at timestamptz default now(),
  completed_at timestamptz
);

-- RLS Policies
alter table public.profiles enable row level security;
alter table public.agents enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.daily_reports enable row level security;
alter table public.directives enable row level security;

-- Profiles: users can read all, edit own
create policy "Public profiles" on public.profiles for select using (true);
create policy "Own profile" on public.profiles for all using (auth.uid() = id);

-- Agents: readable by all, editable by owner
create policy "Public agents" on public.agents for select using (true);
create policy "Own agent" on public.agents for all using (auth.uid() = owner_id);

-- Conversations: visible to participants
create policy "Conversation participant" on public.conversations for select
  using (
    exists (select 1 from public.agents where id in (agent_a, agent_b) and owner_id = auth.uid())
  );

-- Messages: visible to conversation participants
create policy "Message visibility" on public.messages for select
  using (
    exists (
      select 1 from public.conversations c
      join public.agents a on a.id in (c.agent_a, c.agent_b)
      where c.id = conversation_id and a.owner_id = auth.uid()
    )
  );

-- Daily reports: visible to agent owner
create policy "Own reports" on public.daily_reports for select
  using (exists (select 1 from public.agents where id = agent_id and owner_id = auth.uid()));

-- Directives: manageable by agent owner
create policy "Own directives" on public.directives for all
  using (exists (select 1 from public.agents where id = agent_id and owner_id = auth.uid()));

-- Indexes
create index idx_agents_owner on public.agents(owner_id);
create index idx_conversations_agents on public.conversations(agent_a, agent_b);
create index idx_messages_conversation on public.messages(conversation_id, created_at);
create index idx_daily_reports_agent_date on public.daily_reports(agent_id, report_date);
create index idx_directives_agent on public.directives(agent_id, status);

-- Function to auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', 'User'),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
