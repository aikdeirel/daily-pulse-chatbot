CREATE TABLE "OAuthConnection" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL,
	"provider" varchar(32) NOT NULL,
	"accessToken" text NOT NULL,
	"refreshToken" text,
	"expiresAt" timestamp,
	"scopes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "OAuthConnection_userId_provider_unique" UNIQUE("userId","provider")
);
--> statement-breakpoint
ALTER TABLE "OAuthConnection" ADD CONSTRAINT "OAuthConnection_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;