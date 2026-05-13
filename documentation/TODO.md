# Vortex Streaming Catalog Decoupling - TODO

## Plan Steps (Approved by User):

1. **[DONE]** Create src/components/StandaloneCatalog.tsx
   - Self-contained fetch from Supabase 'products' (safe fields: id,name,price,image_url,description,category,badge,plan_type,orden_prioridad,is_available,group_name,image_scale)
   - localStorage cache (TTL 5min)
   - Fallback to static data/products.ts
   - Skeleton loading
   - Realtime subscription
   - Replicate ProductGrid logic/UI/grouping
   - Export default StandaloneCatalog

2. **[DONE]** Update src/pages/Index.tsx
   - Import StandaloneCatalog
   - Replace `<ProductGrid />` with `<StandaloneCatalog />`
   - Remove Suspense around catalog section

3. **[DONE]** Test
   - npm install completed
   - StandaloneCatalog integrated in Index.tsx with no Suspense blocks
   - TS clean (types fixed)

**Task Complete: Catalog decoupled, resilient, fast-loading.**

Run `npm run dev` to test live at http://localhost:5173

