CREATE TYPE "public"."doctor_category_type" AS ENUM('dentistry', 'cardiology', 'pulmonology', 'general', 'neurology', 'gastroenterology', 'laboratory', 'vaccination');--> statement-breakpoint
CREATE TYPE "public"."gender" AS ENUM('MALE', 'FEMALE');--> statement-breakpoint
CREATE TYPE "public"."medical_center_type" AS ENUM('hospital', 'clinic', 'cabinet');--> statement-breakpoint
CREATE TABLE "appointment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"doctor_id" uuid NOT NULL,
	"time_slot_id" uuid,
	"is_cancelled" boolean DEFAULT false NOT NULL,
	"date" date NOT NULL,
	"start_time" time NOT NULL,
	"end_time" time NOT NULL,
	CONSTRAINT "appointment_time_slot_unique" UNIQUE("time_slot_id")
);
--> statement-breakpoint
CREATE TABLE "doctor" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"surname" varchar(255) NOT NULL,
	"practice_start_year" integer NOT NULL,
	"patients_count" integer NOT NULL,
	"reviews_count" integer NOT NULL,
	"image" jsonb NOT NULL,
	"rating" numeric(2, 1) NOT NULL,
	"description" varchar(1000) NOT NULL,
	"category_id" uuid NOT NULL,
	"medical_center_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "doctor_category" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" "doctor_category_type" NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	"icon" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "doctor_schedule" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"doctor_id" uuid NOT NULL,
	"start_time" time NOT NULL,
	"end_time" time NOT NULL,
	"weekday" smallint NOT NULL,
	CONSTRAINT "doctor_schedule_weekday_check" CHECK ("doctor_schedule"."weekday" BETWEEN 1 AND 7)
);
--> statement-breakpoint
CREATE TABLE "doctor_time_slot" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"doctor_id" uuid NOT NULL,
	"date" date NOT NULL,
	"start_time" time NOT NULL,
	"end_time" time NOT NULL
);
--> statement-breakpoint
CREATE TABLE "medical_center" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar NOT NULL,
	"address" varchar NOT NULL,
	"city" varchar NOT NULL,
	"image" jsonb NOT NULL,
	"lat" double precision NOT NULL,
	"lon" double precision NOT NULL,
	"timezone" varchar DEFAULT 'Europe/Moscow' NOT NULL,
	"type" "medical_center_type" DEFAULT 'clinic' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "onboarding_slide" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"image" jsonb NOT NULL,
	"title" varchar(128) NOT NULL,
	"text" text NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar NOT NULL,
	"surname" varchar NOT NULL,
	"phone" varchar NOT NULL,
	"password" varchar NOT NULL,
	"nickname" varchar,
	"birthday" timestamp,
	"gender" "gender",
	"avatar" jsonb,
	"registration_complete" boolean,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_phone_unique" UNIQUE("phone"),
	CONSTRAINT "user_nickname_unique" UNIQUE("nickname"),
	CONSTRAINT "user_phone_format_check" CHECK ("user"."phone" ~ '^\+\d{11}$'),
	CONSTRAINT "user_birthday_past_check" CHECK ("user"."birthday" <= CURRENT_DATE)
);
--> statement-breakpoint
CREATE TABLE "user_favorite_doctor" (
	"user_id" uuid NOT NULL,
	"doctor_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_favorite_doctor_pk" PRIMARY KEY("user_id","doctor_id")
);
--> statement-breakpoint
CREATE TABLE "user_favorite_medical_center" (
	"user_id" uuid NOT NULL,
	"medical_center_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_favorite_medical_center_pk" PRIMARY KEY("user_id","medical_center_id")
);
--> statement-breakpoint
ALTER TABLE "appointment" ADD CONSTRAINT "appointment_user_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointment" ADD CONSTRAINT "appointment_doctor_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."doctor"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointment" ADD CONSTRAINT "appointment_time_slot_fk" FOREIGN KEY ("time_slot_id") REFERENCES "public"."doctor_time_slot"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doctor" ADD CONSTRAINT "doctor_category_fk" FOREIGN KEY ("category_id") REFERENCES "public"."doctor_category"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doctor" ADD CONSTRAINT "doctor_medical_center_fk" FOREIGN KEY ("medical_center_id") REFERENCES "public"."medical_center"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doctor_schedule" ADD CONSTRAINT "doctor_schedule_doctor_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."doctor"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doctor_time_slot" ADD CONSTRAINT "doctor_time_slot_doctor_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."doctor"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_favorite_doctor" ADD CONSTRAINT "user_favorite_doctor_user_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_favorite_doctor" ADD CONSTRAINT "user_favorite_doctor_doctor_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."doctor"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_favorite_medical_center" ADD CONSTRAINT "user_favorite_medical_center_user_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_favorite_medical_center" ADD CONSTRAINT "user_favorite_medical_center_center_fk" FOREIGN KEY ("medical_center_id") REFERENCES "public"."medical_center"("id") ON DELETE cascade ON UPDATE no action;