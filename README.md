# Public Notion Editor (Vercel)

Ten projekt udostępnia prosty edytor osadzany (iframe) i funkcję serwerową do zapisu treści do Notion między nagłówkami:
- `BEGIN PUBLIC EDIT`
- `END PUBLIC EDIT`

## Szybki start (Vercel, bez CLI)
1) Zrób nowy repozytorium na GitHub i wrzuć tu pliki.
2) Na https://vercel.com → **Add New… → Project** → Importuj repozytorium.
3) W **Environment Variables** dodaj:
   - `NOTION_TOKEN` = (Internal Integration Token)
   - `NOTION_PAGE_ID` = ID strony (32 znaki bez myślników)
   - `PUBLIC_EDIT_TOKEN` = np. `supersekret` (będzie w URL z edytora)
   - `MAX_CHARS` = np. `5000`
4) Deploy.

## Struktura
- `/api/public-edit.ts` — funkcja serwerowa (POST JSON: `{ token, content }`).
- `/public/index.html` — prosty edytor; podmień `ENDPOINT` i `TOKEN`.

## Uwaga
- Nigdy nie ujawniaj `NOTION_TOKEN` w kliencie (pozostaje w env Vercel).
- `PUBLIC_EDIT_TOKEN` jest „sekretem linku” — jeśli ktoś go pozna, może edytować sekcję.
- Najprościej trzymaj stronę Notion z trzema blokami: `BEGIN`, (treść), `END`.
