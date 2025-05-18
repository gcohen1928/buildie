create table "public"."commit_files" (
    "id" uuid not null default uuid_generate_v4(),
    "commit_id" uuid not null,
    "file_path" text not null,
    "status" text not null,
    "created_at" timestamp with time zone default now()
);


create table "public"."commits" (
    "id" uuid not null default uuid_generate_v4(),
    "project_id" uuid not null,
    "commit_sha" text not null,
    "message" text,
    "commit_timestamp" timestamp with time zone,
    "compare_url" text,
    "author_name" text,
    "author_email" text,
    "author_github_username" text,
    "committer_name" text,
    "committer_email" text,
    "committer_github_username" text,
    "pusher_name" text,
    "pusher_email" text,
    "diff_text" text,
    "change_summary" text,
    "is_feature_shipped" boolean,
    "raw_commit_payload" jsonb,
    "raw_push_event_payload" jsonb,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
);


create table "public"."projects" (
    "id" uuid not null default uuid_generate_v4(),
    "user_id" uuid,
    "name" text not null,
    "full_name" text not null,
    "github_repo_id" bigint not null,
    "html_url" text,
    "description" text,
    "private" boolean default false,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
);


create table "public"."users" (
    "id" uuid not null default uuid_generate_v4(),
    "github_user_id" bigint,
    "github_username" text,
    "email" text,
    "name" text,
    "avatar_url" text,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
);


CREATE UNIQUE INDEX commit_files_pkey ON public.commit_files USING btree (id);

CREATE UNIQUE INDEX commits_pkey ON public.commits USING btree (id);

CREATE UNIQUE INDEX commits_project_id_commit_sha_key ON public.commits USING btree (project_id, commit_sha);

CREATE UNIQUE INDEX projects_full_name_key ON public.projects USING btree (full_name);

CREATE UNIQUE INDEX projects_github_repo_id_key ON public.projects USING btree (github_repo_id);

CREATE UNIQUE INDEX projects_pkey ON public.projects USING btree (id);

CREATE UNIQUE INDEX users_github_user_id_key ON public.users USING btree (github_user_id);

CREATE UNIQUE INDEX users_github_username_key ON public.users USING btree (github_username);

CREATE UNIQUE INDEX users_pkey ON public.users USING btree (id);

alter table "public"."commit_files" add constraint "commit_files_pkey" PRIMARY KEY using index "commit_files_pkey";

alter table "public"."commits" add constraint "commits_pkey" PRIMARY KEY using index "commits_pkey";

alter table "public"."projects" add constraint "projects_pkey" PRIMARY KEY using index "projects_pkey";

alter table "public"."users" add constraint "users_pkey" PRIMARY KEY using index "users_pkey";

alter table "public"."commit_files" add constraint "commit_files_commit_id_fkey" FOREIGN KEY (commit_id) REFERENCES commits(id) ON DELETE CASCADE not valid;

alter table "public"."commit_files" validate constraint "commit_files_commit_id_fkey";

alter table "public"."commits" add constraint "commits_project_id_commit_sha_key" UNIQUE using index "commits_project_id_commit_sha_key";

alter table "public"."commits" add constraint "commits_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE not valid;

alter table "public"."commits" validate constraint "commits_project_id_fkey";

alter table "public"."projects" add constraint "projects_full_name_key" UNIQUE using index "projects_full_name_key";

alter table "public"."projects" add constraint "projects_github_repo_id_key" UNIQUE using index "projects_github_repo_id_key";

alter table "public"."projects" add constraint "projects_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL not valid;

alter table "public"."projects" validate constraint "projects_user_id_fkey";

alter table "public"."users" add constraint "users_github_user_id_key" UNIQUE using index "users_github_user_id_key";

alter table "public"."users" add constraint "users_github_username_key" UNIQUE using index "users_github_username_key";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.trigger_set_timestamp()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$
;

grant delete on table "public"."commit_files" to "anon";

grant insert on table "public"."commit_files" to "anon";

grant references on table "public"."commit_files" to "anon";

grant select on table "public"."commit_files" to "anon";

grant trigger on table "public"."commit_files" to "anon";

grant truncate on table "public"."commit_files" to "anon";

grant update on table "public"."commit_files" to "anon";

grant delete on table "public"."commit_files" to "authenticated";

grant insert on table "public"."commit_files" to "authenticated";

grant references on table "public"."commit_files" to "authenticated";

grant select on table "public"."commit_files" to "authenticated";

grant trigger on table "public"."commit_files" to "authenticated";

grant truncate on table "public"."commit_files" to "authenticated";

grant update on table "public"."commit_files" to "authenticated";

grant delete on table "public"."commit_files" to "service_role";

grant insert on table "public"."commit_files" to "service_role";

grant references on table "public"."commit_files" to "service_role";

grant select on table "public"."commit_files" to "service_role";

grant trigger on table "public"."commit_files" to "service_role";

grant truncate on table "public"."commit_files" to "service_role";

grant update on table "public"."commit_files" to "service_role";

grant delete on table "public"."commits" to "anon";

grant insert on table "public"."commits" to "anon";

grant references on table "public"."commits" to "anon";

grant select on table "public"."commits" to "anon";

grant trigger on table "public"."commits" to "anon";

grant truncate on table "public"."commits" to "anon";

grant update on table "public"."commits" to "anon";

grant delete on table "public"."commits" to "authenticated";

grant insert on table "public"."commits" to "authenticated";

grant references on table "public"."commits" to "authenticated";

grant select on table "public"."commits" to "authenticated";

grant trigger on table "public"."commits" to "authenticated";

grant truncate on table "public"."commits" to "authenticated";

grant update on table "public"."commits" to "authenticated";

grant delete on table "public"."commits" to "service_role";

grant insert on table "public"."commits" to "service_role";

grant references on table "public"."commits" to "service_role";

grant select on table "public"."commits" to "service_role";

grant trigger on table "public"."commits" to "service_role";

grant truncate on table "public"."commits" to "service_role";

grant update on table "public"."commits" to "service_role";

grant delete on table "public"."projects" to "anon";

grant insert on table "public"."projects" to "anon";

grant references on table "public"."projects" to "anon";

grant select on table "public"."projects" to "anon";

grant trigger on table "public"."projects" to "anon";

grant truncate on table "public"."projects" to "anon";

grant update on table "public"."projects" to "anon";

grant delete on table "public"."projects" to "authenticated";

grant insert on table "public"."projects" to "authenticated";

grant references on table "public"."projects" to "authenticated";

grant select on table "public"."projects" to "authenticated";

grant trigger on table "public"."projects" to "authenticated";

grant truncate on table "public"."projects" to "authenticated";

grant update on table "public"."projects" to "authenticated";

grant delete on table "public"."projects" to "service_role";

grant insert on table "public"."projects" to "service_role";

grant references on table "public"."projects" to "service_role";

grant select on table "public"."projects" to "service_role";

grant trigger on table "public"."projects" to "service_role";

grant truncate on table "public"."projects" to "service_role";

grant update on table "public"."projects" to "service_role";

grant delete on table "public"."users" to "anon";

grant insert on table "public"."users" to "anon";

grant references on table "public"."users" to "anon";

grant select on table "public"."users" to "anon";

grant trigger on table "public"."users" to "anon";

grant truncate on table "public"."users" to "anon";

grant update on table "public"."users" to "anon";

grant delete on table "public"."users" to "authenticated";

grant insert on table "public"."users" to "authenticated";

grant references on table "public"."users" to "authenticated";

grant select on table "public"."users" to "authenticated";

grant trigger on table "public"."users" to "authenticated";

grant truncate on table "public"."users" to "authenticated";

grant update on table "public"."users" to "authenticated";

grant delete on table "public"."users" to "service_role";

grant insert on table "public"."users" to "service_role";

grant references on table "public"."users" to "service_role";

grant select on table "public"."users" to "service_role";

grant trigger on table "public"."users" to "service_role";

grant truncate on table "public"."users" to "service_role";

grant update on table "public"."users" to "service_role";

CREATE TRIGGER set_timestamp_commits BEFORE UPDATE ON public.commits FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_timestamp_projects BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_timestamp_users BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();


