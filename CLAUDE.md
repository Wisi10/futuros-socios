# futuros-socios

Dashboard de inversion para los socios de Futuros Sports Complex.
Stack: Next.js + Supabase + Google Sheets (dividendos y ROI) + Vercel.

## Reglas

- Tildes/ñ: la restriccion aplica SOLO a identificadores de codigo (variables, funciones, columnas, keys, nombres de archivo). Todo texto visible al usuario (labels, titulos, botones, mensajes, tooltips) SIEMPRE va en español bien escrito, con tildes y ñ.
- No cambies valores que vienen de la base o del Sheet aunque no tengan tilde: `activity_type === 'cumpleanos'` y el nombre de hoja `Totales Historicos` son keys, no texto.
- Dividendos: los pagos en Bs se miden en EUR (monto en Bs entre la tasa euro del dia). Los pagos cash USD y la inversion (en USD) se convierten a EUR para el ROI. No cambies ese calculo sin aprobacion de Sam.
- Nada de servidor local. Build, commit, push a main y Vercel despliega a produccion.
- Plan con lineas exactas y aprobacion de Sam antes de implementar.
