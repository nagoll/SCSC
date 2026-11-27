-- Each game links back to the team schedule page it was read from
-- (shown as "Official schedule" on the game page). Nullable: manual events
-- and rows written before this column existed have none.
alter table events add column "scheduleUrl" text;
