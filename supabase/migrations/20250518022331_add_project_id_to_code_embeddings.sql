ALTER TABLE "public"."code_embeddings"
ADD COLUMN "project_id" uuid;

-- Optional: If you want to enforce that all existing and new embeddings must have a project_id.
-- If you have existing embeddings without a project_id, this will fail unless you update them first or make the column nullable.
-- For now, let's assume we want it to be NOT NULL for future embeddings.
-- You might need to handle existing data separately.
ALTER TABLE "public"."code_embeddings"
ALTER COLUMN "project_id" SET NOT NULL;

ALTER TABLE "public"."code_embeddings"
ADD CONSTRAINT "code_embeddings_project_id_fkey"
FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;

CREATE INDEX "idx_code_embeddings_project_id" ON "public"."code_embeddings"("project_id"); 