CREATE TYPE "public"."region" AS ENUM('RU', 'EU');--> statement-breakpoint
ALTER TABLE "user" DROP CONSTRAINT "user_phone_format_check";--> statement-breakpoint
ALTER TABLE "doctor" ALTER COLUMN "name" SET DATA TYPE jsonb USING jsonb_build_object('ru', "name", 'en', "name");--> statement-breakpoint
ALTER TABLE "doctor" ALTER COLUMN "surname" SET DATA TYPE jsonb USING jsonb_build_object('ru', "surname", 'en', "surname");--> statement-breakpoint
ALTER TABLE "doctor" ALTER COLUMN "description" SET DATA TYPE jsonb USING jsonb_build_object('ru', "description", 'en', "description");--> statement-breakpoint
ALTER TABLE "medical_center" ALTER COLUMN "name" SET DATA TYPE jsonb USING jsonb_build_object('ru', "name", 'en', "name");--> statement-breakpoint
ALTER TABLE "medical_center" ALTER COLUMN "address" SET DATA TYPE jsonb USING jsonb_build_object('ru', "address", 'en', "address");--> statement-breakpoint
ALTER TABLE "medical_center" ALTER COLUMN "city" SET DATA TYPE jsonb USING jsonb_build_object('ru', "city", 'en', "city");--> statement-breakpoint
ALTER TABLE "onboarding_slide" ALTER COLUMN "title" SET DATA TYPE jsonb USING jsonb_build_object('ru', "title", 'en', "title");--> statement-breakpoint
ALTER TABLE "onboarding_slide" ALTER COLUMN "text" SET DATA TYPE jsonb USING jsonb_build_object('ru', "text", 'en', "text");--> statement-breakpoint
ALTER TABLE "medical_center" ADD COLUMN "region" "region" DEFAULT 'RU' NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_phone_format_check" CHECK ("user"."phone" ~ '^\+[1-9]\d{6,14}$');