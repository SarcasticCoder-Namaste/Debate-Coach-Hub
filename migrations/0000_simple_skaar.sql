CREATE TABLE "assignment_completions" (
	"id" serial PRIMARY KEY NOT NULL,
	"assignment_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"round_id" integer,
	"completed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "coach_referrals" (
	"id" serial PRIMARY KEY NOT NULL,
	"share_id" text NOT NULL,
	"coach_email" text NOT NULL,
	"student_email" text,
	"student_name" text,
	"note" text,
	"share_url" text NOT NULL,
	"topic" text NOT NULL,
	"side" text NOT NULL,
	"format" text NOT NULL,
	"email_status" text NOT NULL,
	"email_error" text,
	"ip_address" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "coaches" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"photo_url" text NOT NULL,
	"bio" text NOT NULL,
	"specialties" text[] NOT NULL,
	"formats" text[] NOT NULL,
	"price_per_hour" integer NOT NULL,
	"availability" text[] NOT NULL,
	CONSTRAINT "coaches_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "inquiries" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"message" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "judge_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_email" text NOT NULL,
	"topic" text NOT NULL,
	"side" text NOT NULL,
	"format" text NOT NULL,
	"persona" text NOT NULL,
	"transcript" jsonb NOT NULL,
	"feedback" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leads" (
	"id" serial PRIMARY KEY NOT NULL,
	"coach_id" integer NOT NULL,
	"student_name" text NOT NULL,
	"email" text NOT NULL,
	"format" text NOT NULL,
	"slot" text NOT NULL,
	"duration_min" integer NOT NULL,
	"goals" text NOT NULL,
	"session_link" text,
	"status" text DEFAULT 'New' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "practice_clips" (
	"id" text PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"user_email" text NOT NULL,
	"topic" text NOT NULL,
	"side" text NOT NULL,
	"format" text NOT NULL,
	"start_sec" integer NOT NULL,
	"end_sec" integer NOT NULL,
	"duration_sec" integer NOT NULL,
	"overlay_name" text,
	"overlay_topic" boolean DEFAULT true NOT NULL,
	"overlay_score" integer,
	"overlay_watermark" boolean DEFAULT true NOT NULL,
	"object_path" text NOT NULL,
	"poster_path" text,
	"mime_type" text DEFAULT 'video/mp4' NOT NULL,
	"size_bytes" integer DEFAULT 0 NOT NULL,
	"view_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "practice_rounds" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"topic" text NOT NULL,
	"side" text NOT NULL,
	"format" text NOT NULL,
	"transcript" jsonb NOT NULL,
	"feedback" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "practice_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_email" text NOT NULL,
	"title" text,
	"topic" text NOT NULL,
	"side" text NOT NULL,
	"format" text NOT NULL,
	"duration_sec" integer DEFAULT 0 NOT NULL,
	"object_path" text,
	"mime_type" text,
	"size_bytes" integer,
	"has_media" boolean DEFAULT false NOT NULL,
	"transcript" jsonb NOT NULL,
	"feedback" jsonb,
	"overall_score" integer,
	"is_favorite" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "practice_share_comments" (
	"id" serial PRIMARY KEY NOT NULL,
	"share_id" text NOT NULL,
	"coach_name" text NOT NULL,
	"comment" text NOT NULL,
	"timestamp_sec" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "practice_shares" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" integer,
	"object_path" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"topic" text NOT NULL,
	"side" text NOT NULL,
	"format" text NOT NULL,
	"transcript" jsonb NOT NULL,
	"feedback" jsonb,
	"owner_user_id" integer,
	"owner_session_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp,
	"last_comment_notified_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "research_bundles" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text,
	"topic" text NOT NULL,
	"side" text NOT NULL,
	"format" text NOT NULL,
	"depth" text NOT NULL,
	"bundle" jsonb NOT NULL,
	"safety" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "saved_topics" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"topic_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session_comments" (
	"id" serial PRIMARY KEY NOT NULL,
	"round_id" integer NOT NULL,
	"author_id" integer NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"subscriber_id" text NOT NULL,
	"plan_id" text DEFAULT 'free' NOT NULL,
	"interval" text DEFAULT 'monthly' NOT NULL,
	"seats" integer DEFAULT 1 NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"current_period_end" timestamp NOT NULL,
	"stripe_customer_id" text,
	"stripe_subscription_id" text,
	"practice_minutes_used" integer DEFAULT 0 NOT NULL,
	"minutes_period_start" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "subscriptions_subscriber_id_unique" UNIQUE("subscriber_id")
);
--> statement-breakpoint
CREATE TABLE "team_assignments" (
	"id" serial PRIMARY KEY NOT NULL,
	"team_id" integer NOT NULL,
	"kind" text DEFAULT 'topic' NOT NULL,
	"title" text NOT NULL,
	"topic" text,
	"format" text,
	"side" text,
	"description" text,
	"due_date" timestamp,
	"target_user_ids" integer[],
	"created_by" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "team_invites" (
	"id" serial PRIMARY KEY NOT NULL,
	"team_id" integer NOT NULL,
	"email" text NOT NULL,
	"invited_by" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "team_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"team_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"role" text DEFAULT 'student' NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "teams" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"owner_id" integer NOT NULL,
	"join_code" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "teams_join_code_unique" UNIQUE("join_code")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"password_hash" text NOT NULL,
	"role" text DEFAULT 'student' NOT NULL,
	"email_comment_notifications" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "assignment_completions" ADD CONSTRAINT "assignment_completions_assignment_id_team_assignments_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."team_assignments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignment_completions" ADD CONSTRAINT "assignment_completions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignment_completions" ADD CONSTRAINT "assignment_completions_round_id_practice_rounds_id_fk" FOREIGN KEY ("round_id") REFERENCES "public"."practice_rounds"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "practice_rounds" ADD CONSTRAINT "practice_rounds_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "practice_share_comments" ADD CONSTRAINT "practice_share_comments_share_id_practice_shares_id_fk" FOREIGN KEY ("share_id") REFERENCES "public"."practice_shares"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "practice_shares" ADD CONSTRAINT "practice_shares_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_comments" ADD CONSTRAINT "session_comments_round_id_practice_rounds_id_fk" FOREIGN KEY ("round_id") REFERENCES "public"."practice_rounds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_comments" ADD CONSTRAINT "session_comments_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_assignments" ADD CONSTRAINT "team_assignments_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_assignments" ADD CONSTRAINT "team_assignments_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_invites" ADD CONSTRAINT "team_invites_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_invites" ADD CONSTRAINT "team_invites_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "saved_topics_user_topic_unique" ON "saved_topics" USING btree ("user_id","topic_id");