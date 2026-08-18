-- Remove the custom-lists feature.
--
-- Lists were dropped from navigation in 088344e and the routes, API and public
-- share page are gone as of this change. This tears down the storage and the
-- token-bound read function behind them.
--
-- Destructive: `lists` and `list_items` rows are not recoverable after this
-- runs. Export anything worth keeping before applying.

DROP FUNCTION IF EXISTS public.shared_list(uuid);

DROP INDEX IF EXISTS idx_list_items_list_added_at;
DROP INDEX IF EXISTS idx_list_items_media_id;
DROP INDEX IF EXISTS idx_lists_share_token;

-- list_items first: it FKs to lists.
DROP TABLE IF EXISTS list_items;
DROP TABLE IF EXISTS lists;
