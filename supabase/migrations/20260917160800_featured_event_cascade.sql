-- Pruning past events was failing with a foreign key violation whenever a
-- pruned event was still referenced by a row in `featured`. The `featured`
-- table is fully regenerated on every refresh run (see
-- scripts/generate-featured.js), immediately after pruning, so a stale
-- featured row pointing at a just-deleted event is never meant to survive —
-- cascade the delete instead of blocking it.
alter table featured drop constraint "featured_eventId_fkey";
alter table featured add constraint "featured_eventId_fkey"
  foreign key ("eventId") references events(id) on delete cascade;
