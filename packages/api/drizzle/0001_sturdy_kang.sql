CREATE TYPE "public"."body_position" AS ENUM('standing', 'seated', 'lying', 'incline', 'decline', 'kneeling', 'bent-over', 'hanging');--> statement-breakpoint
CREATE TYPE "public"."grip_orientation" AS ENUM('pronated', 'supinated', 'neutral', 'mixed');--> statement-breakpoint
CREATE TYPE "public"."grip_width" AS ENUM('close', 'shoulder', 'wide');--> statement-breakpoint
CREATE TYPE "public"."laterality" AS ENUM('bilateral', 'unilateral', 'alternating');--> statement-breakpoint
CREATE TYPE "public"."range_of_motion" AS ENUM('full', 'partial', 'deficit', 'pin');--> statement-breakpoint
ALTER TABLE "template_exercises" ADD COLUMN "grip_width" "grip_width";--> statement-breakpoint
ALTER TABLE "template_exercises" ADD COLUMN "grip_orientation" "grip_orientation";--> statement-breakpoint
ALTER TABLE "template_exercises" ADD COLUMN "body_position" "body_position";--> statement-breakpoint
ALTER TABLE "template_exercises" ADD COLUMN "laterality" "laterality";--> statement-breakpoint
ALTER TABLE "template_exercises" ADD COLUMN "range_of_motion" "range_of_motion";