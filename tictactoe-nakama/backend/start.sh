#!/bin/sh
set -e
/nakama/nakama migrate up --database.address postgres:password@postgres:5432/nakama
exec /nakama/nakama --config /nakama/data/config.yml --database.address postgres:password@postgres:5432/nakama