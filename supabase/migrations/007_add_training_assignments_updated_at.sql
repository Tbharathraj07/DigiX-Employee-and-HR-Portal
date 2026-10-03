-- DigiX Technologies - Add missing updated_at column to training_assignments
-- Fixes trigger trg_training_assignments_updated_at error: record "new" has no field "updated_at"
ALTER TABLE public.training_assignments 
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now() NOT NULL;
