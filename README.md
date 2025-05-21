# MA Dashboard (Multi-Asset Dashboard)

A comprehensive portfolio risk management system with support for multi-layer fund structures.

## Features
- ✅ Multi-layer portfolio tracking (ETF → underlying ETFs → individual stocks)
- ✅ DHHF structure support with complete lookthrough
- ✅ Multiple security identifiers (ISIN, SEDOL, CUSIP, FIGI)
- ✅ Real-time portfolio risk analytics
- 🔄 Bloomberg/BARRA integration (coming soon)

## Current Status: Phase 1A - Database Foundation
- [x] Enhanced database schema with multi-layer support
- [x] DHHF sample portfolio with 3-layer structure
- [x] Complete lookthrough views and analytics
- [ ] API development
- [ ] Frontend dashboard

## Quick Start
1. Install PostgreSQL
2. Run: `psql -d madashboard -U ma_user -f database/schema/01_mvp_schema.sql`
3. Test: `python database/test_dhhf.py`