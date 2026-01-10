-- ============================================================================
-- Migration 056: Proposals Pages Only (No Sections)
-- Simplify structure: pages with direct TipTap content
-- ============================================================================

-- Add content column to proposal_pages (TipTap JSON)
ALTER TABLE proposal_pages
  ADD COLUMN IF NOT EXISTS content JSONB NOT NULL DEFAULT '{"type":"doc","content":[{"type":"paragraph"}]}';

-- Add is_visible column to proposal_pages
ALTER TABLE proposal_pages
  ADD COLUMN IF NOT EXISTS is_visible BOOLEAN NOT NULL DEFAULT true;

-- Add is_cover column to proposal_pages (special cover page)
ALTER TABLE proposal_pages
  ADD COLUMN IF NOT EXISTS is_cover BOOLEAN NOT NULL DEFAULT false;

-- Migrate existing block content to page content
-- For each page, concatenate all section/block content into page content
UPDATE proposal_pages pp
SET content = COALESCE(
  (
    SELECT jsonb_build_object(
      'type', 'doc',
      'content', jsonb_agg(
        CASE
          WHEN pb.type = 'text' THEN
            jsonb_build_object('type', 'paragraph', 'content',
              ARRAY[jsonb_build_object('type', 'text', 'text', COALESCE(pb.content->>'html', ''))])
          WHEN pb.type = 'separator' THEN
            jsonb_build_object('type', 'horizontalRule')
          ELSE
            jsonb_build_object('type', 'paragraph')
        END
        ORDER BY pps.sort_order, pb.sort_order
      )
    )
    FROM proposal_page_sections pps
    JOIN proposal_blocks pb ON pb.section_id = pps.id
    WHERE pps.page_id = pp.id
  ),
  '{"type":"doc","content":[{"type":"paragraph"}]}'::jsonb
);

COMMENT ON COLUMN proposal_pages.content IS 'TipTap JSON content for the page';
COMMENT ON COLUMN proposal_pages.is_visible IS 'Whether the page is visible in the proposal';
COMMENT ON COLUMN proposal_pages.is_cover IS 'Whether this is the cover page (special rendering)';

-- Note: We keep proposal_page_sections and proposal_blocks tables for backward compatibility
-- They can be dropped in a future migration after confirming everything works
